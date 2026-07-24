module.exports = function (app) {
  app.get("/gestao-usuarios", function (request, response) {
    response.render("gestao-usuarios");
  });
};