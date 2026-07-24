// config/authMiddleware.js
module.exports = function (req, res, next) {
  // 1. Defina as rotas que NÃO precisam de login (rotas públicas)
  const rotasPublicas = ['/login', '/cadastro', '/cadastro-empresa'];

  // Se a rota atual estiver na lista de públicas, deixa passar direto
  if (rotasPublicas.includes(req.path)) {
    return next();
  }

  // 2. Para todas as outras rotas, verifica se está logado
  if (req.session && req.session.usuarioLogado) {
    // Passa os dados para o EJS usar na tela
    res.locals.usuario = req.session.usuarioLogado; 
    return next();
  }
  
  // 3. Se não for rota pública e não estiver logado, manda pro login
  res.redirect('/login');
};