module.exports = function (app) {
  app.get("/sobre", function (request, response) {
    response.render("sobre");
  });
};