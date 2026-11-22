const { registrarLog } = require('../../config/logger');
const { enviarNotificacao } = require('../../config/notificador');
const { possuiPerfil } = require('../../config/roleMiddleware');

const TIPOS_CHAMADO = ['incidente', 'requisicao', 'problema', 'mudanca', 'outro'];

async function carregarOpcoesChamado(db, tenantId) {
  const [categorias, prioridades, servicos] = await Promise.all([
    db.query(
      `SELECT id, name
       FROM ticket_categories
       WHERE tenant_id = ?
       ORDER BY name ASC`,
      [tenantId]
    ),
    db.query(
      `SELECT id, name, weight
       FROM priorities
       WHERE tenant_id = ?
       ORDER BY weight ASC, name ASC`,
      [tenantId]
    ),
    db.query(
      `SELECT id, name, description, service_category_id
       FROM services
       WHERE tenant_id = ? AND is_active = TRUE
       ORDER BY name ASC`,
      [tenantId]
    )
  ]);

  return {
    categorias: categorias[0],
    prioridades: prioridades[0],
    servicos: servicos[0]
  };
}

async function buscarTicketAcessivel(db, ticketId, usuario) {
  let consulta = `
    SELECT id, requester_id, assigned_to, title, status_id
    FROM tickets
    WHERE id = ? AND tenant_id = ?`;
  const parametros = [ticketId, usuario.tenantId];

  if (Number(usuario.roleId) === 4) {
    consulta += ' AND requester_id = ?';
    parametros.push(usuario.id);
  }

  const [tickets] = await db.query(consulta, parametros);
  return tickets[0] || null;
}

module.exports = function (app) {

  // 1. Exibir formulário de novo chamado
  app.get('/chamados/novo', async (req, res) => {
    try {
      const opcoes = await carregarOpcoesChamado(req.db, req.session.usuarioLogado.tenantId);
      res.render('novo-chamado', { erro: null, ...opcoes });
    } catch (error) {
      console.error('Erro ao carregar opções do chamado:', error);
      res.status(500).send('Erro ao carregar o formulário de chamado.');
    }
  });

  // 2. Processar a criação do chamado
  app.post('/chamados/novo', async (req, res) => {
    const { titulo, descricao, tipo, category_id, priority_id, service_id } = req.body;
    const usuario = req.session.usuarioLogado;

    if (!usuario) {
      return res.redirect('/login');
    }

    const dados = {
      titulo: String(titulo || '').trim(),
      descricao: String(descricao || '').trim(),
      tipo,
      categoryId: Number(category_id),
      priorityId: Number(priority_id),
      serviceId: service_id ? Number(service_id) : null
    };

    let opcoes;

    try {
      opcoes = await carregarOpcoesChamado(req.db, usuario.tenantId);

      if (!dados.titulo || dados.titulo.length > 200 || !dados.descricao || !TIPOS_CHAMADO.includes(dados.tipo)) {
        return res.status(400).render('novo-chamado', {
          erro: 'Preencha o título, a descrição e um tipo válido. O título deve ter até 200 caracteres.',
          ...opcoes,
          valores: dados
        });
      }

      const categoriaValida = opcoes.categorias.some(item => item.id === dados.categoryId);
      const prioridadeValida = opcoes.prioridades.some(item => item.id === dados.priorityId);
      const servicoValido = !dados.serviceId || opcoes.servicos.some(item => item.id === dados.serviceId);

      if (!categoriaValida || !prioridadeValida || !servicoValido) {
        return res.status(400).render('novo-chamado', {
          erro: 'Categoria, prioridade ou serviço inválido para esta empresa.',
          ...opcoes,
          valores: dados
        });
      }

      const conexao = await req.db.getConnection();
      let resultado;

      try {
        await conexao.beginTransaction();

        const [statusAberto] = await conexao.query(
          `SELECT id, name
           FROM statuses
           WHERE tenant_id = ? AND LOWER(name) = 'aberto'
           ORDER BY id ASC
           LIMIT 1`,
          [usuario.tenantId]
        );

        if (statusAberto.length === 0) {
          throw new Error('Nenhum status Aberto foi configurado para esta empresa.');
        }

        const [ticket] = await conexao.query(
          `INSERT INTO tickets
             (tenant_id, requester_id, title, description, type, category_id, priority_id, service_id, status_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            usuario.tenantId,
            usuario.id,
            dados.titulo,
            dados.descricao,
            dados.tipo,
            dados.categoryId,
            dados.priorityId,
            dados.serviceId,
            statusAberto[0].id
          ]
        );

        resultado = ticket;

        await conexao.query(
          `INSERT INTO ticket_history (tenant_id, ticket_id, field_changed, old_value, new_value, changed_by)
           VALUES (?, ?, 'status', ?, ?, ?)`,
          [usuario.tenantId, resultado.insertId, '—', statusAberto[0].name, usuario.id]
        );

        let [politicas] = await conexao.query(
          `SELECT id, response_time_minutes, resolution_time_minutes
           FROM sla_policies
           WHERE tenant_id = ? AND priority_id = ?
           ORDER BY id ASC
           LIMIT 1`,
          [usuario.tenantId, dados.priorityId]
        );

        if (dados.serviceId) {
          const [slaDoServico] = await conexao.query(
            `SELECT sp.id, sp.response_time_minutes, sp.resolution_time_minutes
             FROM services srv
             INNER JOIN sla_policies sp ON sp.id = srv.default_sla_id AND sp.tenant_id = srv.tenant_id
             WHERE srv.id = ? AND srv.tenant_id = ? AND srv.is_active = TRUE
             LIMIT 1`,
            [dados.serviceId, usuario.tenantId]
          );

          if (slaDoServico.length > 0) {
            politicas = slaDoServico;
          }
        }

        if (politicas.length > 0) {
          const politica = politicas[0];
          const criadoEm = new Date();
          const respostaAte = new Date(criadoEm.getTime() + Number(politica.response_time_minutes) * 60000);
          const resolucaoAte = new Date(criadoEm.getTime() + Number(politica.resolution_time_minutes) * 60000);

          await conexao.query(
            `INSERT INTO sla_tracking
               (tenant_id, ticket_id, sla_policy_id, response_due_at, resolution_due_at)
             VALUES (?, ?, ?, ?, ?)`,
            [usuario.tenantId, resultado.insertId, politica.id, respostaAte, resolucaoAte]
          );
        }

        await conexao.commit();
      } catch (error) {
        await conexao.rollback();
        throw error;
      } finally {
        conexao.release();
      }

      // REGISTO DE LOG DE AUDITORIA
      await registrarLog(
        req.db,
        usuario.tenantId,
        usuario.id,
        'Criar',
        'Chamado',
        resultado.insertId,
        `Novo chamado aberto: "${dados.titulo}"`
      );

      res.redirect('/chamados');
    } catch (error) {
      console.error('Erro ao criar chamado:', error);
      res.status(500).render('novo-chamado', {
        erro: 'Ocorreu um erro ao registar o chamado.',
        ...(opcoes || { categorias: [], prioridades: [], servicos: [] }),
        valores: dados
      });
    }
  });

  // 3. Listar chamados do Tenant com Ordenação
  app.get('/chamados', async (req, res) => {
    const usuario = req.session.usuarioLogado;

    if (!usuario) {
      return res.redirect('/login');
    }

    // Identifica e padroniza o nível de acesso
    const userRole = Number(usuario.roleId);

    const colunasPermitidas = {
      id: 't.id',
      nome: 't.title',
      solicitante: 'u.name',
      tipo: 't.type',
      status: 's.name',
      prioridade: 'p.name',
      categoria: 'c.name',
      data: 't.created_at'
    };

    const sort = req.query.sort || 'data';
    const order = req.query.order === 'asc' ? 'ASC' : 'DESC';
    const colunaOrdenacao = colunasPermitidas[sort] || 't.created_at';

    try {
      let query = `
        SELECT 
          t.id,
          t.title AS titulo,
          t.description AS descricao,
          t.type AS tipo,
          s.name AS status,
          p.name AS prioridade,
          c.name AS categoria,
          u.name AS solicitante,
          t.created_at AS dataCriacao
        FROM tickets t
        LEFT JOIN statuses s ON s.id = t.status_id AND s.tenant_id = t.tenant_id
        LEFT JOIN priorities p ON p.id = t.priority_id AND p.tenant_id = t.tenant_id
        LEFT JOIN ticket_categories c ON c.id = t.category_id AND c.tenant_id = t.tenant_id
        LEFT JOIN users u ON u.id = t.requester_id AND u.tenant_id = t.tenant_id
        WHERE t.tenant_id = ?
      `;

      const params = [usuario.tenantId];

      // Se for Solicitante (nível 4), filtra apenas os chamados criados por ele
      // Se for Técnico (3), Gestor (2) ou Admin (1), a query traz todos da empresa
      if (userRole === 4) {
        query += ` AND t.requester_id = ?`;
        params.push(usuario.id);
      }

      query += ` ORDER BY ${colunaOrdenacao} ${order}`;

      const [chamados] = await req.db.query(query, params);

      res.render('chamados', { chamados, sortAtual: sort, ordemAtual: order });
    } catch (error) {
      console.error('Erro ao listar chamados:', error);
      res.status(500).send('Erro interno do servidor ao carregar chamados.');
    }
  });

  // 4. Detalhes de um chamado específico
  app.get('/chamados/:id', async (req, res) => {
    const usuario = req.session.usuarioLogado;
    const chamadoId = req.params.id;

    if (!usuario) {
      return res.redirect('/login');
    }

    const userRole = Number(usuario.roleId);

    try {
      let query = `SELECT 
           t.*, 
           s.name AS status,
           p.name AS prioridade,
           c.name AS categoria,
           u.name AS solicitante, 
           u.email AS email_solicitante,
           srv.name AS servico,
           tecnico.name AS tecnico,
           st.response_due_at,
           st.resolution_due_at,
           st.responded_at,
           st.resolved_at,
           st.breached
         FROM tickets t
         LEFT JOIN statuses s ON s.id = t.status_id AND s.tenant_id = t.tenant_id
         LEFT JOIN priorities p ON p.id = t.priority_id AND p.tenant_id = t.tenant_id
         LEFT JOIN ticket_categories c ON c.id = t.category_id AND c.tenant_id = t.tenant_id
         LEFT JOIN users u ON u.id = t.requester_id AND u.tenant_id = t.tenant_id
         LEFT JOIN services srv ON srv.id = t.service_id AND srv.tenant_id = t.tenant_id
         LEFT JOIN users tecnico ON tecnico.id = t.assigned_to AND tecnico.tenant_id = t.tenant_id
         LEFT JOIN sla_tracking st ON st.ticket_id = t.id AND st.tenant_id = t.tenant_id
         WHERE t.id = ? AND t.tenant_id = ?`;

      const params = [chamadoId, usuario.tenantId];

      // Se for Solicitante (nível 4), só permite visualizar se ele for o criador do chamado
      if (userRole === 4) {
        query += ` AND t.requester_id = ?`;
        params.push(usuario.id);
      }

      const [resultados] = await req.db.query(query, params);

      if (resultados.length === 0) {
        return res.redirect('/erro/404');
      }

      const consultasComplementares = [
        req.db.query(
          `SELECT id, name
           FROM statuses
           WHERE tenant_id = ?
           ORDER BY id ASC`,
          [usuario.tenantId]
        ),
        req.db.query(
          `SELECT tc.id, tc.comment, tc.is_internal, tc.created_at, u.name AS autor
           FROM ticket_comments tc
           INNER JOIN users u ON u.id = tc.user_id AND u.tenant_id = tc.tenant_id
           WHERE tc.ticket_id = ? AND tc.tenant_id = ?${userRole === 4 ? ' AND tc.is_internal = FALSE' : ''}
           ORDER BY tc.created_at ASC`,
          [chamadoId, usuario.tenantId]
        ),
        req.db.query(
          `SELECT th.id, th.field_changed, th.old_value, th.new_value, th.changed_at, u.name AS autor
           FROM ticket_history th
           LEFT JOIN users u ON u.id = th.changed_by AND u.tenant_id = th.tenant_id
           WHERE th.ticket_id = ? AND th.tenant_id = ?${userRole === 4 ? " AND th.field_changed = 'status'" : ''}
           ORDER BY th.changed_at DESC`,
          [chamadoId, usuario.tenantId]
        ),
        req.db.query(
          `SELECT ta.id, ta.file_path, ta.uploaded_at, u.name AS enviado_por
           FROM ticket_attachments ta
           LEFT JOIN users u ON u.id = ta.uploaded_by AND u.tenant_id = ta.tenant_id
           WHERE ta.ticket_id = ? AND ta.tenant_id = ?
           ORDER BY ta.uploaded_at DESC`,
          [chamadoId, usuario.tenantId]
        )
      ];

      if (possuiPerfil(usuario, 1, 2, 3)) {
        consultasComplementares.push(req.db.query(
          `SELECT id, name
           FROM users
           WHERE tenant_id = ? AND is_active = TRUE AND role_id IN (1, 2, 3)
           ORDER BY name ASC`,
          [usuario.tenantId]
        ));
      }

      const resultadosComplementares = await Promise.all(consultasComplementares);
      const [status] = resultadosComplementares[0];
      const [comentarios] = resultadosComplementares[1];
      const [historico] = resultadosComplementares[2];
      const [anexos] = resultadosComplementares[3];
      const tecnicos = resultadosComplementares[4] ? resultadosComplementares[4][0] : [];

      res.render('detalhes-chamado', {
        chamado: resultados[0],
        status,
        comentarios,
        historico,
        anexos,
        tecnicos
      });
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
      res.status(500).send('Erro interno do servidor');
    }
  });

  // 5. Registrar comentário público ou interno no chamado
  app.post('/chamados/:id/comentarios', async (req, res) => {
    const usuario = req.session.usuarioLogado;
    const chamadoId = Number(req.params.id);
    const comentario = String(req.body.comentario || '').trim();

    if (!usuario) return res.redirect('/login');
    if (!Number.isInteger(chamadoId) || !comentario || comentario.length > 4000) {
      return res.status(400).send('Comentário inválido. Use até 4.000 caracteres.');
    }

    try {
      const ticket = await buscarTicketAcessivel(req.db, chamadoId, usuario);
      if (!ticket) return res.redirect('/erro/404');

      const interno = possuiPerfil(usuario, 1, 2, 3) && req.body.interno === '1';
      await req.db.query(`
        INSERT INTO ticket_comments (tenant_id, ticket_id, user_id, comment, is_internal)
        VALUES (?, ?, ?, ?, ?)
      `, [usuario.tenantId, chamadoId, usuario.id, comentario, interno]);

      return res.redirect(`/chamados/${chamadoId}#comentarios`);
    } catch (error) {
      console.error('Erro ao registrar comentário:', error);
      return res.status(500).send('Não foi possível registrar o comentário.');
    }
  });

  // 6. Atribuir ou remover o responsável técnico
  app.post('/chamados/:id/responsavel', async (req, res) => {
    const usuario = req.session.usuarioLogado;
    const chamadoId = Number(req.params.id);
    const tecnicoId = req.body.tecnico_id ? Number(req.body.tecnico_id) : null;

    if (!usuario) return res.redirect('/login');
    if (!possuiPerfil(usuario, 1, 2, 3)) return res.redirect('/erro/403');
    if (!Number.isInteger(chamadoId) || (tecnicoId !== null && !Number.isInteger(tecnicoId))) {
      return res.status(400).send('Responsável inválido.');
    }

    try {
      const [tickets] = await req.db.query(`
        SELECT t.id, t.assigned_to, atual.name AS responsavel_atual
        FROM tickets t
        LEFT JOIN users atual ON atual.id = t.assigned_to AND atual.tenant_id = t.tenant_id
        WHERE t.id = ? AND t.tenant_id = ?
      `, [chamadoId, usuario.tenantId]);
      if (!tickets.length) return res.redirect('/erro/404');

      let novoResponsavel = null;
      if (tecnicoId !== null) {
        const [tecnicos] = await req.db.query(`
          SELECT id, name
          FROM users
          WHERE id = ? AND tenant_id = ? AND is_active = TRUE AND role_id IN (1, 2, 3)
        `, [tecnicoId, usuario.tenantId]);
        if (!tecnicos.length) return res.status(400).send('Responsável inválido para esta empresa.');
        novoResponsavel = tecnicos[0];
      }

      await req.db.query(
        'UPDATE tickets SET assigned_to = ? WHERE id = ? AND tenant_id = ?',
        [novoResponsavel ? novoResponsavel.id : null, chamadoId, usuario.tenantId]
      );
      await req.db.query(`
        INSERT INTO ticket_history (tenant_id, ticket_id, field_changed, old_value, new_value, changed_by)
        VALUES (?, ?, 'responsavel', ?, ?, ?)
      `, [
        usuario.tenantId,
        chamadoId,
        tickets[0].responsavel_atual || 'Não atribuído',
        novoResponsavel ? novoResponsavel.name : 'Não atribuído',
        usuario.id
      ]);
      await registrarLog(req.db, usuario.tenantId, usuario.id, 'Atualizar', 'Chamado', chamadoId, 'Responsável do chamado atualizado.');

      return res.redirect(`/chamados/${chamadoId}`);
    } catch (error) {
      console.error('Erro ao atribuir responsável:', error);
      return res.status(500).send('Não foi possível atualizar o responsável.');
    }
  });

  // 7. Atualizar o estado do chamado (para Técnicos/Gestores)
  app.post('/chamados/:id/status', async (req, res) => {
    const usuario = req.session.usuarioLogado;
    const chamadoId = req.params.id;
    const statusId = Number(req.body.status_id);

    if (!usuario) {
      return res.redirect('/login');
    }

    if (!possuiPerfil(usuario, 1, 2, 3)) {
      return res.redirect('/erro/403');
    }

    if (!Number.isInteger(statusId)) {
      return res.status(400).send('Status inválido.');
    }

    try {
      // Busca dados do ticket para identificar o solicitante e título
      const [ticketInfo] = await req.db.query(
        `SELECT t.requester_id, t.title, t.status_id, s.name AS status_atual
         FROM tickets t
         LEFT JOIN statuses s ON s.id = t.status_id AND s.tenant_id = t.tenant_id
         WHERE t.id = ? AND t.tenant_id = ?`,
        [chamadoId, usuario.tenantId]
      );

      if (ticketInfo.length === 0) {
        return res.redirect('/erro/404');
      }

      const [statusValido] = await req.db.query(
        'SELECT id, name FROM statuses WHERE id = ? AND tenant_id = ?',
        [statusId, usuario.tenantId]
      );

      if (statusValido.length === 0) {
        return res.status(400).send('Status inválido para esta empresa.');
      }

      const nomeStatus = String(statusValido[0].name || '').toLowerCase();
      const resolvido = ['resolvido', 'fechado', 'concluído', 'concluido'].includes(nomeStatus);
      const emAtendimento = !['aberto', 'novo'].includes(nomeStatus);

      await req.db.query(
        `UPDATE tickets
         SET status_id = ?, closed_at = CASE WHEN ? = 1 THEN COALESCE(closed_at, NOW()) ELSE NULL END
         WHERE id = ? AND tenant_id = ?`,
        [statusId, resolvido ? 1 : 0, chamadoId, usuario.tenantId]
      );

      await req.db.query(`
        INSERT INTO ticket_history (tenant_id, ticket_id, field_changed, old_value, new_value, changed_by)
        VALUES (?, ?, 'status', ?, ?, ?)
      `, [
        usuario.tenantId,
        chamadoId,
        ticketInfo[0].status_atual || `Status #${ticketInfo[0].status_id}`,
        statusValido[0].name,
        usuario.id
      ]);

      if (emAtendimento) {
        await req.db.query(
          `UPDATE sla_tracking
           SET responded_at = COALESCE(responded_at, NOW())
           WHERE ticket_id = ? AND tenant_id = ?`,
          [chamadoId, usuario.tenantId]
        );
      }

      if (resolvido) {
        await req.db.query(
          `UPDATE sla_tracking
           SET resolved_at = COALESCE(resolved_at, NOW())
           WHERE ticket_id = ? AND tenant_id = ?`,
          [chamadoId, usuario.tenantId]
        );
      }

      // REGISTO DE LOG DE AUDITORIA
      await registrarLog(
        req.db,
        usuario.tenantId,
        usuario.id,
        'Atualizar',
        'Chamado',
        chamadoId,
        `Status alterado de ID ${ticketInfo[0].status_id} para ID ${statusId}`
      );

      // DISPARO DE NOTIFICAÇÃO AO SOLICITANTE
      if (ticketInfo.length > 0 && ticketInfo[0].requester_id !== usuario.id) {
        const requesterId = ticketInfo[0].requester_id;
        const tituloTicket = ticketInfo[0].title;

        // A notificação acompanha o nome configurado para o status do tenant.
        if (resolvido) {
          await enviarNotificacao(
            req.db,
            usuario.tenantId,
            requesterId,
            'Chamado Resolvido',
            `O seu chamado #${chamadoId} ("${tituloTicket}") foi marcado como resolvido.`
          );
        } else {
          await enviarNotificacao(
            req.db,
            usuario.tenantId,
            requesterId,
            'Atualização de Chamado',
            `O estado do seu chamado #${chamadoId} ("${tituloTicket}") foi alterado.`
          );
        }
      }

      res.redirect(`/chamados/${chamadoId}`);
    } catch (error) {
      console.error('Erro ao atualizar estado:', error);
      res.status(500).send('Erro interno do servidor');
    }
  });

  // 6. Excluir um chamado (Apenas Gestores/Admins)
  app.post('/chamados/:id/excluir', async (req, res) => {
    const usuario = req.session.usuarioLogado;
    const chamadoId = req.params.id;

    if (!usuario) {
      return res.redirect('/login');
    }

    if (!possuiPerfil(usuario, 1, 2)) {
      return res.redirect('/erro/403');
    }

    try {
      await req.db.query(
        `DELETE FROM tickets WHERE id = ? AND tenant_id = ?`,
        [chamadoId, usuario.tenantId]
      );

      // REGISTO DE LOG DE AUDITORIA
      await registrarLog(
        req.db,
        usuario.tenantId,
        usuario.id,
        'Excluir',
        'Chamado',
        chamadoId,
        `Chamado #${chamadoId} excluído permanentemente.`
      );

      res.redirect('/chamados');
    } catch (error) {
      console.error('Erro ao excluir chamado:', error);
      res.status(500).send('Erro ao tentar excluir chamado.');
    }
  });

};
