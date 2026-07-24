/*
Páginas contidas aqui:

Chatbot: /IA (Técnico/Gestor/Solicitante)
Relatorios de IA: /IA/relatorios (Gestor)

*/

module.exports = function (app) {
  app.get("/IA", function (request, response) {
    response.render("IA");
  });

  app.get("/IA/relatorios", function (request, response) {
    response.render("IA-relatorio");
  });
};