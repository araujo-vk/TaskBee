// Middleware centralizado para autenticação e autorização.

function obterUsuario(req) {
  return req.session && req.session.usuarioLogado
    ? req.session.usuarioLogado
    : null;
}

function obterRoleId(usuario) {
  return Number(usuario && (usuario.roleId ?? usuario.role ?? usuario.role_id));
}

function responderNaoAutenticado(req, res) {
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ erro: 'Usuário não autenticado.' });
  }

  return res.redirect('/login');
}

function exigirAutenticacao(req, res, next) {
  const usuario = obterUsuario(req);

  if (!usuario) {
    return responderNaoAutenticado(req, res);
  }

  req.usuario = usuario;
  return next();
}

function exigirPerfis(...perfisPermitidos) {
  const perfis = perfisPermitidos.map(Number);

  return function (req, res, next) {
    const usuario = obterUsuario(req);

    if (!usuario) {
      return responderNaoAutenticado(req, res);
    }

    const roleId = obterRoleId(usuario);

    if (!perfis.includes(roleId)) {
      return res.redirect('/erro/403');
    }

    req.usuario = usuario;
    return next();
  };
}

function possuiPerfil(usuario, ...perfisPermitidos) {
  return perfisPermitidos.map(Number).includes(obterRoleId(usuario));
}

module.exports = {
  obterUsuario,
  obterRoleId,
  exigirAutenticacao,
  exigirPerfis,
  possuiPerfil
};
