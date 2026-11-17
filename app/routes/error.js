module.exports = function (app) {
  // Lista de códigos de erro que possuem arquivos .ejs na pasta views/error/
  const errosPermitidos = ["400", "401", "402", "403", "404",  "405",  "406",  "407",  "408",
    "409",  "410",  "411",  "412",  "413",  "414",  "415",  "416",  "417",  "418",
    "421",  "422",  "423",  "424",  "425",  "426",  "428",  "429",  "431",  "451",
    "500",  "501",  "502",  "503",  "504",  "505",  "506",  "507",  "508",  "510",
    "511", "777"
  ];
  app.get("/erro/:codigo", function (request, response) {
    const codigo = request.params.codigo;

    if (errosPermitidos.includes(codigo)) {
      return response.status(Number(codigo)).render(`error/${codigo}`, {
        usuario: request.session.usuarioLogado || null,
        mensagem: request.query.msg || null
      });
    }
  });
  app.use(function (err, request, response, next) {
    console.error("❌ Erro capturado pelo sistema:", err.stack || err);

    const statusCode = err.status || 500;
    const viewName = errosPermitidos.includes(String(statusCode))
      ? `error/${statusCode}`
      : "error/500";

    response.status(statusCode).render(viewName, {
      usuario: request.session.usuarioLogado || null,
      mensagem: err.message || "Ocorreu um erro interno no servidor."
    });
  });
  
};