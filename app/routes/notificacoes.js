module.exports = function (app) {
  app.get("/notificacoes", async function (req, res) {
    const usuario = req.session.usuarioLogado;
    if (!usuario) return res.redirect('/login');

    try {
      const [notificacoes] = await req.db.query(
        `SELECT title, message, is_read, created_at 
         FROM notifications 
         WHERE tenant_id = ? AND user_id = ? 
         ORDER BY created_at DESC`,
        [usuario.tenantId, usuario.id]
      );
      res.render("notificacoes", { notificacoes });
    } catch (error) {
      console.error(error);
      res.status(500).send("Erro ao carregar notificações.");
    }
  });
};