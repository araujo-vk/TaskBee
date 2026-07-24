module.exports = function (app) {
  app.get("/catalogo-servicos", function (request, response) {
    response.render("catalogo-servicos");
  });
};