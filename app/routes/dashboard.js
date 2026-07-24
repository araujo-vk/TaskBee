module.exports = function (app) {
  app.get("/dashboard", function (request, response) {
    response.render("dashboard");
  });
};