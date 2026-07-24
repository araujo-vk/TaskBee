/* 
Lista de páginas inclusas aqui: 

Lista de Chamados: /chamados (Técnico/Gestor)
Detalhes do Chamado: /chamados/:id (Técnico/Gestor/Solicitante)
Abertura de Chamado: /chamados/novo (Solicitante)

*/

module.exports = function (app) {
  app.get("/chamados", function (request, response) {
    response.render("chamados");
  });

  app.get("/chamados/:id", function (request, response) {
    response.render("detalhes-chamado");
  });

  app.get("/chamados/novo", function (request, response) {
    response.render("novo-chamado");
  });   

};