const { monthly, unlock } = require('./themes');
module.exports = function themeProgress(req, res, next) {
  const user = req.session?.usuarioLogado;
  if (!user) return next();
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const current = monthly.find(theme => theme.month === month);
  const sessionKey = `themeMonth_${month}`;
  if (current && !req.session[sessionKey]) {
    req.session[sessionKey] = true;
    unlock(req.db,user,current.id).catch(error => console.error('Tema mensal:',error));
  }
  res.on('finish', () => {
    if ((res.statusCode >= 400 && !['/erro/777','/erro/418'].includes(req.path)) || res.statusCode < 200) return;
    const path = req.path;
    let id;
    if (req.method === 'GET' && /^\/base-de-conhecimento\/\d+$/.test(path)) id = 'first-article-read';
    if (req.method === 'GET' && path === '/IA') id = 'askbee-visit';
    if (req.method === 'GET' && path === '/erro/777') id = 'lucky-hive';
    if (req.method === 'GET' && path === '/erro/418') id = 'chaleira-da-rainha';
    if (req.method === 'POST' && /^\/base-de-conhecimento\/\d+\/feedback$/.test(path)) id = 'first-feedback';
    if (req.method === 'POST' && path === '/base-de-conhecimento/artigos') id = 'first-article-created';
    if (req.method === 'POST' && path === '/configuracoes-user/update') id = 'profile-update';
    if (req.method === 'POST' && path === '/chamados/novo') id = 'first-ticket';
    if (req.method === 'POST' && /^\/chamados\/\d+\/status$/.test(path) && req.body.status_id) {
      req.db.query('SELECT name FROM statuses WHERE id = ? AND tenant_id = ?',[req.body.status_id,user.tenantId]).then(([rows]) => {
        if (/^(resolvido|fechado|conclu[ií]do)$/i.test(rows[0]?.name || '')) {
          unlock(req.db,user,'first-closed');
          req.db.query(`SELECT COUNT(*) AS total FROM tickets t JOIN statuses s ON s.id=t.status_id AND s.tenant_id=t.tenant_id WHERE t.tenant_id=? AND t.assigned_to=? AND t.deleted_at IS NULL AND LOWER(s.name) IN ('resolvido','fechado','concluído','concluido')`,[user.tenantId,user.id]).then(([count]) => {
            if (count[0].total >= 10) unlock(req.db,user,'ten-resolved');
            if (count[0].total >= 50) unlock(req.db,user,'fifty-resolved');
          }).catch(console.error);
        }
      }).catch(console.error);
    }
    if (id) unlock(req.db,user,id).catch(console.error);
  });
  next();
};
