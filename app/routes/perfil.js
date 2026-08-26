const { registrarLog } = require('../../config/logger');

module.exports = function (app) {
  app.post("/perfil/atualizar", async function (req, res) {
    const usuario = req.session.usuarioLogado;
    const { novoNome } = req.body;

    if (!usuario) return res.redirect('/login');

    try {
      await req.db.query(
        "UPDATE users SET name = ? WHERE id = ? AND tenant_id = ?",
        [novoNome, usuario.id, usuario.tenantId]
      );

      // GRAVA O LOG AQUI
      await registrarLog(req.db, usuario.tenantId, usuario.id, 'Atualizar', 'Perfil', usuario.id, `Alterou o nome de perfil para: ${novoNome}`);

      // Atualiza o nome na sessão também
      req.session.usuarioLogado.name = novoNome;
      
      res.redirect("/perfil");
    } catch (error) { /* ... */ }
  });
};