module.exports = function (app) {
  app.get("/portal-solicitante", async function (request, response) {
    const usuario = request.session.usuarioLogado;

    if (!usuario) {
      return response.redirect('/login');
    }

    try {
      // Busca apenas os chamados criados por este solicitante
      const [chamados] = await request.db.query(`
        SELECT 
          t.id,
          t.title AS titulo,
          t.type AS tipo,
          s.name AS status,
          t.created_at AS dataCriacao
        FROM tickets t
        LEFT JOIN statuses s ON s.id = t.status_id
        WHERE t.tenant_id = ? AND t.requester_id = ?
        ORDER BY t.created_at DESC
      `, [usuario.tenantId, usuario.id]);

      response.render("portal-solicitante", { chamados });
    } catch (error) {
      console.error("Erro ao carregar chamados do solicitante:", error);
      response.status(500).send("Erro interno ao carregar a página.");
    }
  });
};