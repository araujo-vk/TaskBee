module.exports = function (app) {
  app.get('/notificacoes', async (req, res) => {
    const usuario = req.session.usuarioLogado;
    if (!usuario) return res.redirect('/login');

    try {
      const [notificacoes] = await req.db.query(`
        SELECT id, title, message, type, link_url, is_read, created_at
        FROM notifications
        WHERE tenant_id = ? AND user_id = ?
        ORDER BY created_at DESC
        LIMIT 100
      `, [usuario.tenantId, usuario.id]);
      return res.render('notificacoes', { notificacoes });
    } catch (erro) {
      console.error('Erro ao carregar notificações:', erro);
      return res.status(500).send('Não foi possível carregar as notificações.');
    }
  });

  app.post('/notificacoes/:id/ler', async (req, res) => {
    const usuario = req.session.usuarioLogado;
    if (!usuario) return res.redirect('/login');

    await req.db.query(`
      UPDATE notifications SET is_read = TRUE
      WHERE id = ? AND tenant_id = ? AND user_id = ?
    `, [req.params.id, usuario.tenantId, usuario.id]);
    return res.redirect(req.body.destino || '/notificacoes');
  });

  app.post('/notificacoes/ler-todas', async (req, res) => {
    const usuario = req.session.usuarioLogado;
    if (!usuario) return res.redirect('/login');
    await req.db.query('UPDATE notifications SET is_read = TRUE WHERE tenant_id = ? AND user_id = ?', [usuario.tenantId, usuario.id]);
    return res.redirect('/notificacoes');
  });
};
