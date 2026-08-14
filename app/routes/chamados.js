/* Lista de páginas incluídas aqui: 

Lista de Chamados: /chamados (Técnico/Gestor/Solicitante)
Detalhes do Chamado: /chamados/:id (Técnico/Gestor/Solicitante)
Abertura de Chamado: /chamados/novo (Solicitante)
*/

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
      // Correção: usa requester_id e status_id (ID 1 = Aberto)
      await req.db.query(
        `INSERT INTO tickets (tenant_id, requester_id, title, description, type, status_id) 
         VALUES (?, ?, ?, ?, ?, 1)`,
        [usuario.tenantId, usuario.id, titulo, descricao, tipo]
      );

      res.redirect('/chamados');
    } catch (error) {
      console.error('Erro ao criar chamado:', error);
      res.render('novo-chamado', { erro: 'Ocorreu um erro ao registar o chamado.' });
    }
  });

  // 3. Listar chamados do Tenant
  app.get('/chamados', async (req, res) => {
    const usuario = req.session.usuarioLogado;

    if (!usuario) {
      return res.redirect('/login');
    }

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

      // Se for utilizador comum/solicitante (ex: Nível/Role 4), mostra apenas os seus próprios chamados
      if (usuario.roleId === 4 || usuario.role === 4) {
        query += ` AND t.requester_id = ?`;
        params.push(usuario.id);
      }

      query += ` ORDER BY t.created_at DESC`;

      const [chamados] = await req.db.query(query, params);

      res.render('chamados', { chamados });
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
      await req.db.query(
        `UPDATE tickets SET status_id = ? WHERE id = ? AND tenant_id = ?`,
        [status_id, chamadoId, usuario.tenantId]
      );

      res.redirect(`/chamados/${chamadoId}`);
    } catch (error) {
      console.error('Erro ao atualizar estado:', error);
      res.status(500).send('Erro interno do servidor');
    }
  });

};