module.exports = function (app) {
  app.get("/", function (request, response) {
    response.render("index");
  });
  app.get("/index", function (request, response) {
    response.render("index");
  });
};