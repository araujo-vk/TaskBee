module.exports = function (app) {
  app.get("/portal-solicitante", function (request, response) {
    response.render("portal-solicitante");
  });
};