module.exports = function (app) {
  app.get("/gestao-sla", function (request, response) {
    response.render("gestao-sla");
  });
};