// config/roleMiddleware.js

// Criamos uma função que recebe quais cargos têm permissão
function apenasPerfis(perfisPermitidos) {
  return function (req, res, next) {
    const usuario = req.session.usuarioLogado;

    // Se o cargo do usuário estiver na lista de permitidos, deixa passar
    if (usuario && perfisPermitidos.includes(usuario.role)) {
      return next();
    }

    // Se não tiver permissão, renderiza uma tela de erro ou redireciona
    res.status(403).send("Acesso Negado: Você não tem permissão para acessar esta página.");
  };
}

module.exports = { apenasPerfis };