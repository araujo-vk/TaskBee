const { registrarLog } = require('../../config/logger');
const { enviarNotificacao } = require('../../config/notificador');

module.exports = function (app) {

  // 1. Exibir formulário de novo chamado
  app.get('/chamados/novo', (req, res) => {
    res.render('novo-chamado', { erro: null });
  });

  // 2. Processar a criação do chamado
  app.post('/chamados/novo', async (req, res) => {
    const { titulo, descricao, tipo } = req.body;
    const usuario = req.session.usuarioLogado;

    if (!usuario) {
      return res.redirect('/login');
    }

    try {
      const [resultado] = await req.db.query(
        `INSERT INTO tickets (tenant_id, requester_id, title, description, type, status_id) 
         VALUES (?, ?, ?, ?, ?, 1)`,
        [usuario.tenantId, usuario.id, titulo, descricao, tipo]
      );

      // REGISTO DE LOG DE AUDITORIA
      await registrarLog(
        req.db,
        usuario.tenantId,
        usuario.id,
        'Criar',
        'Chamado',
        resultado.insertId,
        `Novo chamado aberto: "${titulo}"`
      );

      res.redirect('/chamados');
    } catch (error) {
      console.error('Erro ao criar chamado:', error);
      res.render('novo-chamado', { erro: 'Ocorreu um erro ao registar o chamado.' });
    }
  });

  // 3. Listar chamados do Tenant com Ordenação
  app.get('/chamados', async (req, res) => {
    const usuario = req.session.usuarioLogado;

    if (!usuario) {
      return res.redirect('/login');
    }

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
        LEFT JOIN statuses s ON s.id = t.status_id
        LEFT JOIN priorities p ON p.id = t.priority_id
        LEFT JOIN ticket_categories c ON c.id = t.category_id
        LEFT JOIN users u ON u.id = t.requester_id
        WHERE t.tenant_id = ?
      `;

      const params = [usuario.tenantId];

      if (usuario.roleId === 4 || usuario.role === 4) {
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

    try {
      const [resultados] = await req.db.query(
        `SELECT 
           t.*, 
           s.name AS status,
           p.name AS prioridade,
           c.name AS categoria,
           u.name AS solicitante, 
           u.email AS email_solicitante
         FROM tickets t
         LEFT JOIN statuses s ON s.id = t.status_id
         LEFT JOIN priorities p ON p.id = t.priority_id
         LEFT JOIN ticket_categories c ON c.id = t.category_id
         LEFT JOIN users u ON u.id = t.requester_id
         WHERE t.id = ? AND t.tenant_id = ?`,
        [chamadoId, usuario.tenantId]
      );

      if (resultados.length === 0) {
        return res.status(404).send('Chamado não encontrado.');
      }

      res.render('detalhes-chamado', { chamado: resultados[0] });
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
      res.status(500).send('Erro interno do servidor');
    }
  });

  // 5. Atualizar o estado do chamado (para Técnicos/Gestores)
  app.post('/chamados/:id/status', async (req, res) => {
    const usuario = req.session.usuarioLogado;
    const chamadoId = req.params.id;
    const { status_id } = req.body;

    if (!usuario) {
      return res.redirect('/login');
    }

    try {
      // Busca dados do ticket para identificar o solicitante e título
      const [ticketInfo] = await req.db.query(
        `SELECT requester_id, title FROM tickets WHERE id = ? AND tenant_id = ?`,
        [chamadoId, usuario.tenantId]
      );

      await req.db.query(
        `UPDATE tickets SET status_id = ? WHERE id = ? AND tenant_id = ?`,
        [status_id, chamadoId, usuario.tenantId]
      );

      // REGISTO DE LOG DE AUDITORIA
      await registrarLog(
        req.db,
        usuario.tenantId,
        usuario.id,
        'Atualizar',
        'Chamado',
        chamadoId,
        `Status alterado para ID: ${status_id}`
      );

      // DISPARO DE NOTIFICAÇÃO AO SOLICITANTE
      if (ticketInfo.length > 0 && ticketInfo[0].requester_id !== usuario.id) {
        const requesterId = ticketInfo[0].requester_id;
        const tituloTicket = ticketInfo[0].title;

        // ID 3 = Resolvido na tabela statuses
        if (parseInt(status_id) === 3) {
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

    if (!usuario || (usuario.roleId !== 1 && usuario.roleId !== 2)) {
      return res.status(403).send('Acesso negado.');
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