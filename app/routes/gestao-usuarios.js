const { apenasPerfis } = require('../../config/roleMiddleware');

module.exports = function (app) {
  
  // Apenas role 1 (Admin) e 2 (Gestor) podem entrar aqui
  app.get("/gestao-users", apenasPerfis([1, 2]), function (req, res) {
    res.render("gestao-users");
  });

};