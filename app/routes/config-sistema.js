module.exports = function (app) {
  app.get("/config-sistema", function (request, response) {
    response.render("config-sistema");
  });
};