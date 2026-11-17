// config/authMiddleware.js
module.exports = function (req, res, next) {
  // 1. Repassa o usuário para o EJS
  if (req.session && req.session.usuarioLogado) {
    res.locals.usuario = req.session.usuarioLogado;
  } else {
    res.locals.usuario = null;
  }

  // 2. Lista de rotas públicas
  const rotasPublicas = ['/login', '/cadastro', '/cadastro-empresa', '/index', '/', '/admin', '/sobre'];

  if (rotasPublicas.includes(req.path)) {
    return next();
  }

  // 3. Se não estiver logado, redireciona
  if (!req.session || !req.session.usuarioLogado) {
    return res.redirect('/login');
  }

  // 4. Lista de Restrições por Nível de Acesso
  const restricoes = {
    '/gestao-usuarios': [1, 2], // Apenas Admin (1) e Gestor (2)
    '/logs': [1, 2],            
    '/relatorios': [1, 2, 3],     
  };

  const usuario = req.session.usuarioLogado;

  // CORREÇÃO 1: Identifica a propriedade correta e garante a conversão para Número
  const userRole = Number(usuario.roleId || usuario.role || usuario.role_id);

  // 5. Verifica se a rota atual possui restrição
  const rotaRestrita = Object.keys(restricoes).find(rota => req.path.startsWith(rota));

  if (rotaRestrita) {
    // CORREÇÃO 2: Garante que todos os elementos da lista permitida também sejam Números
    const perfisPermitidos = restricoes[rotaRestrita].map(Number);

    // Se o perfil do usuário não estiver na lista, bloqueia o acesso
    if (!perfisPermitidos.includes(userRole)) {
      return res.status(403).res.redirect('/error/403');
    }
  }

  return next();
};