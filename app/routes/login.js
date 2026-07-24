module.exports = function (app) {
  app.get("/login", function (request, response) {
    response.render("login");
  });
};