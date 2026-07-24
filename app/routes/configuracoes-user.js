module.exports = function (app) {
  app.get("/configuracoes-user", function (request, response) {
    response.render("configuracoes-user");
  });
};