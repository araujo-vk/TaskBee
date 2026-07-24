module.exports = function (app) {
  app.get("/base-de-conhecimento", function (request, response) {
    response.render("base-de-conhecimento");
  });
};