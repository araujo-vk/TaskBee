// config/authMiddleware.js
module.exports = function (req, res, next) {
  // 1. Sempre que houver uma sessão ativa, repassa o usuário para o EJS (seja rota pública ou privada)
  if (req.session && req.session.usuarioLogado) {
    res.locals.usuario = req.session.usuarioLogado;
  } else {
    res.locals.usuario = null;
  }

  // 2. Lista de rotas públicas (que não exigem login obrigatório)
  const rotasPublicas = ['/login', '/cadastro', '/cadastro-empresa', '/index', '/'];

  // Se for rota pública, libera o acesso imediatamente
  if (rotasPublicas.includes(req.path)) {
    return next();
  }

  // 3. Se for rota privada e houver usuário logado, libera o acesso
  if (req.session && req.session.usuarioLogado) {
    return next();
  }

  // 4. Se for rota privada e não estiver logado, manda pro login
  res.redirect('/login');
};