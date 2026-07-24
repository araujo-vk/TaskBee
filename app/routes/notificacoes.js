module.exports = function (app) {
  app.get("/notificacoes", function (request, response) {
    response.render("notificacoes");
  });
};