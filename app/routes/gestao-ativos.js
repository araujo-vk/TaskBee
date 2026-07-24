module.exports = function (app) {
  app.get("/gestao-ativos", function (request, response) {
    response.render("gestao-ativos");
  });
};