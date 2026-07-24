module.exports = function (app) {
  app.get("/logs", function (request, response) {
    response.render("logs");
  });
};