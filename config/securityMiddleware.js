const crypto = require('crypto');

function cabecalhosSeguranca(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  return next();
}

function protegerRequisicoes(req, res, next) {
  if (!req.session) return next();
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  res.locals.csrfToken = req.session.csrfToken;

  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();

  const token = req.body && req.body._csrf;
  const tokenCabecalho = req.get('x-csrf-token');
  const origem = req.get('origin');
  const origemEsperada = `${req.protocol}://${req.get('host')}`;
  const origemValida = origem && origem === origemEsperada;

  if (token === req.session.csrfToken || tokenCabecalho === req.session.csrfToken || origemValida) {
    return next();
  }

  return res.redirect('/erro/403');
}

module.exports = {
  cabecalhosSeguranca,
  protegerRequisicoes
};
