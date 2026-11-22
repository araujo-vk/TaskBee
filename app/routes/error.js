module.exports = function (app) {
  const errosPermitidos = [
    "400", "401", "402", "403", "404", "405", "406", "407", "408",
    "409", "410", "411", "412", "413", "414", "415", "416", "417", "418",
    "421", "422", "423", "424", "425", "426", "428", "429", "431", "451",
    "500", "501", "502", "503", "504", "505", "506", "507", "508", "510",
    "511", "777"
  ];

  // Rotas de páginas permitidas (sem barra inicial, suportando subcaminhos)
  const paginasPermitidas = [
    "admin",
    "base-de-conhecimento",
    "cadastro",
    "catalogo-servicos",
    "chamados",
    "chamados/novo",
    "config-sistema",
    "configuracoes-user",
    "dashboard",
    "gestao-ativos",
    "gestao-sla",
    "gestao-usuarios",
    "IA",
    "IA/relatorios",
    "login",
    "logs",
    "notificoes",
    "portal-solicitante",
    "sobre"
  ];

  // Normaliza o caminho para aceitar com ou sem barra no final (ex: "/chamados/novo/" -> "chamados/novo")
  function normalizarCaminho(valor) {
    if (!valor) return "";
    const texto = Array.isArray(valor) ? valor.join("/") : String(valor);
    return texto.replace(/^\/+|\/+$/g, "");
  }

  // 1. Rota direta para páginas de erro (Ex: /erro/404, /erro/500)
  app.get("/erro/:codigo", function (request, response) {
    const codigo = request.params.codigo;

    if (errosPermitidos.includes(codigo)) {
      return response.status(Number(codigo)).render(`error/${codigo}`, {
        usuario: request.session?.usuarioLogado || null,
        mensagem: request.query.msg || null
      });
    }

    return response.status(404).render("error/404", {
      usuario: request.session?.usuarioLogado || null,
      mensagem: "Página de erro não encontrada."
    });
  });

  // 2. Resolução de páginas cadastradas em paginasPermitidas (Express 5.2.1)
  app.get("/{*caminho}", function (request, response, next) {
    const caminho = normalizarCaminho(request.params.caminho);

    // Deixa o middleware de 404 tratar rotas /erro/... não casadas acima
    if (caminho === "erro" || caminho.startsWith("erro/")) {
      return next();
    }

    if (paginasPermitidas.includes(caminho)) {
      return response.render(caminho, {
        usuario: request.session?.usuarioLogado || null
      });
    }

    return next();
  });

  // 3. Captura qualquer rota não cadastrada ou inexistente -> 404
  app.use(function (request, response, next) {
    response.status(404).render("error/404", {
      usuario: request.session?.usuarioLogado || null,
      mensagem: "A página que você tentou acessar não existe."
    });
  });

  // 4. Middleware global de tratamento de erros (sempre por último e com 4 argumentos)
  app.use(function (err, request, response, next) {
    console.error("❌ Erro capturado pelo sistema:", err.stack || err);

    const statusCode = err.status || 500;
    const viewName = errosPermitidos.includes(String(statusCode))
      ? `error/${statusCode}`
      : "error/500";

    response.status(statusCode).render(viewName, {
      usuario: request.session?.usuarioLogado || null,
      mensagem: err.message || "Ocorreu um erro interno no servidor."
    });
  });
};