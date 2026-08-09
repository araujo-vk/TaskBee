const { apenasPerfis } = require('../../config/roleMiddleware');

module.exports = function (app) {
  app.get('/gestao-usuarios', async (req, res) => {
    // Busca o tenantId de dentro do objeto usuarioLogado da sessão
    const tenantId = req.session.usuarioLogado ? req.session.usuarioLogado.tenantId : null;

    if (!tenantId) {
      return res.redirect('/login');
    }

    try {
      const [usuariosAtivos] = await req.db.query(`
        SELECT
          u.id,
          u.name AS nome,
          d.name AS departamento,
          r.name AS role,
          u.email,
          u.created_at AS dataCriacao
        FROM users u
        LEFT JOIN departments d ON d.id = u.department_id
        LEFT JOIN roles r ON r.id = u.role_id
        WHERE u.tenant_id = ? AND u.is_active = 1
      `, [tenantId]);

      const [usuariosPendentes] = await req.db.query(`
        SELECT
          p.id,
          p.name AS nome,
          d.name AS departamento,
          r.name AS role,
          p.email,
          p.requested_at AS dataCriacao
        FROM pending_users p
        LEFT JOIN departments d ON d.id = p.department_id
        LEFT JOIN roles r ON r.id = p.role_id
        WHERE p.tenant_id = ? AND p.status = 'pendente'
      `, [tenantId]);

      res.render('gestao-usuarios', {
        tenantId,
        usuariosAtivos,
        usuariosPendentes
      });
    } catch (erro) {
      console.error("Erro ao buscar gestão de usuários:", erro);
      res.status(500).send("Erro interno ao carregar a gestão de usuários.");
    }
  });

  app.get("/gestao-users", apenasPerfis([1, 2]), function (req, res) {
    res.render("gestao-users");
  });

  app.get("/gestao-usuarios/editar/:id", apenasPerfis([1, 2]), function (req, res) {
    res.render("editar-usuario");
  });
};