module.exports = function (app) {
  app.get('/admin', (request, response) => response.render('admin', { usuario: request.session.usuarioLogado, codigo: request.query.codigo }));
  app.post('/admin/codigo', async (request, response) => {
    const usuario = request.session.usuarioLogado;
    if (String(request.body.codigo || '').trim().toUpperCase() !== 'TCC2026') return response.redirect('/admin?codigo=invalido');
    const { monthly, achievements, unlock } = require('../../config/themes');
    try {
      await Promise.all([...monthly, ...achievements].map(theme => unlock(request.db, usuario, theme.id)));
      return response.redirect('/admin?codigo=aceito');
    } catch (error) {
      console.error('Erro ao resgatar código:',error);
      return response.redirect('/admin?codigo=erro');
    }
  });
  app.get("/", function (request, response) {
    response.redirect(request.session.usuarioLogado ? '/chamados' : '/login');
  });
  app.get("/index", function (request, response) {
    response.set('X-Robots-Tag', 'noindex, nofollow');
    response.render("index");
  });
};
