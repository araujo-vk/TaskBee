const { possuiPerfil } = require('../../config/roleMiddleware');

module.exports = function (app) {
  app.get("/logs", async function (req, res) {
    const usuario = req.session.usuarioLogado;
    
    // Restringe o acesso apenas para Admin (1) ou Gestor (2)
    if (!possuiPerfil(usuario, 1, 2)) {
        return res.redirect('/erro/403');
    }

    try {
      const [logs] = await req.db.query(
        `SELECT a.action, a.entity, a.details, a.created_at, u.name AS responsavel 
         FROM audit_logs a
         LEFT JOIN users u ON u.id = a.user_id AND u.tenant_id = a.tenant_id
         WHERE a.tenant_id = ? 
         ORDER BY a.created_at DESC`,
        [usuario.tenantId]
      );
      res.render("logs", { logs });
    } catch (error) {
      console.error(error);
      res.status(500).send("Erro ao carregar logs.");
    }
  });
};
