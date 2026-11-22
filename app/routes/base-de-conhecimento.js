const { possuiPerfil } = require('../../config/roleMiddleware');

module.exports = function (app) {
  app.get('/base-de-conhecimento', async (req, res) => {
    const usuario = req.session.usuarioLogado;
    if (!usuario) return res.redirect('/login');
    const busca = String(req.query.busca || '').trim().slice(0, 100);
    try {
      let sql = `
        SELECT a.id, a.title, a.content, a.views_count, a.created_at, c.name AS categoria, u.name AS autor
        FROM kb_articles a
        LEFT JOIN kb_categories c ON c.id = a.kb_category_id AND c.tenant_id = a.tenant_id
        LEFT JOIN users u ON u.id = a.created_by AND u.tenant_id = a.tenant_id
        WHERE a.tenant_id = ? AND a.is_published = TRUE`;
      const parametros = [usuario.tenantId];
      if (busca) {
        sql += ' AND (a.title LIKE ? OR a.content LIKE ? OR c.name LIKE ?)';
        parametros.push(`%${busca}%`, `%${busca}%`, `%${busca}%`);
      }
      sql += ' ORDER BY a.updated_at DESC, a.created_at DESC';
      const [[artigos], [categorias]] = await Promise.all([
        req.db.query(sql, parametros),
        req.db.query('SELECT id, name FROM kb_categories WHERE tenant_id = ? ORDER BY name', [usuario.tenantId])
      ]);
      return res.render('base-de-conhecimento', { artigos, categorias, busca, equipe: possuiPerfil(usuario, 1, 2, 3), erro: req.query.erro || null, sucesso: req.query.sucesso || null });
    } catch (erro) {
      console.error('Erro ao carregar base de conhecimento:', erro);
      return res.status(500).send('Não foi possível carregar a base de conhecimento.');
    }
  });

  app.post('/base-de-conhecimento/categorias', async (req, res) => {
    const usuario = req.session.usuarioLogado;
    if (!possuiPerfil(usuario, 1, 2, 3)) return res.redirect('/erro/403');
    const nome = String(req.body.nome || '').trim();
    if (!nome || nome.length > 100) return res.status(400).send('Categoria inválida.');
    await req.db.query('INSERT INTO kb_categories (tenant_id, name) VALUES (?, ?)', [usuario.tenantId, nome]);
    return res.redirect('/base-de-conhecimento?sucesso=Categoria criada.');
  });

  app.post('/base-de-conhecimento/artigos', async (req, res) => {
    const usuario = req.session.usuarioLogado;
    if (!possuiPerfil(usuario, 1, 2, 3)) return res.redirect('/erro/403');
    const titulo = String(req.body.titulo || '').trim();
    const conteudo = String(req.body.conteudo || '').trim();
    const categoriaId = Number(req.body.categoria_id) || null;
    if (!titulo || titulo.length > 200 || conteudo.length < 20) return res.status(400).send('Informe título e conteúdo com ao menos 20 caracteres.');
    if (categoriaId) {
      const [categoria] = await req.db.query('SELECT id FROM kb_categories WHERE id = ? AND tenant_id = ?', [categoriaId, usuario.tenantId]);
      if (!categoria.length) return res.status(400).send('Categoria inválida.');
    }
    const [resultado] = await req.db.query(`
      INSERT INTO kb_articles (tenant_id, title, content, kb_category_id, created_by, is_published)
      VALUES (?, ?, ?, ?, ?, TRUE)
    `, [usuario.tenantId, titulo, conteudo, categoriaId, usuario.id]);
    return res.redirect(`/base-de-conhecimento/${resultado.insertId}`);
  });

  app.get('/base-de-conhecimento/:id', async (req, res) => {
    const usuario = req.session.usuarioLogado;
    if (!usuario) return res.redirect('/login');
    const conexao = await req.db.getConnection();
    try {
      await conexao.beginTransaction();
      const [artigos] = await conexao.query(`
        SELECT a.id, a.title, a.content, a.views_count, a.created_at, c.name AS categoria, u.name AS autor
        FROM kb_articles a
        LEFT JOIN kb_categories c ON c.id = a.kb_category_id AND c.tenant_id = a.tenant_id
        LEFT JOIN users u ON u.id = a.created_by AND u.tenant_id = a.tenant_id
        WHERE a.id = ? AND a.tenant_id = ? AND a.is_published = TRUE
      `, [req.params.id, usuario.tenantId]);
      if (!artigos.length) { await conexao.rollback(); return res.redirect('/erro/404'); }
      await conexao.query('UPDATE kb_articles SET views_count = views_count + 1 WHERE id = ? AND tenant_id = ?', [req.params.id, usuario.tenantId]);
      await conexao.commit();
      return res.render('artigo-conhecimento', { artigo: artigos[0] });
    } catch (erro) {
      await conexao.rollback();
      return res.status(500).send('Não foi possível abrir o artigo.');
    } finally {
      conexao.release();
    }
  });

  app.post('/base-de-conhecimento/:id/feedback', async (req, res) => {
    const usuario = req.session.usuarioLogado;
    if (!usuario) return res.redirect('/login');
    const util = req.body.util === '1';
    const [artigo] = await req.db.query('SELECT id FROM kb_articles WHERE id = ? AND tenant_id = ? AND is_published = TRUE', [req.params.id, usuario.tenantId]);
    if (!artigo.length) return res.redirect('/erro/404');
    await req.db.query('DELETE FROM kb_feedback WHERE tenant_id = ? AND kb_article_id = ? AND user_id = ?', [usuario.tenantId, req.params.id, usuario.id]);
    await req.db.query('INSERT INTO kb_feedback (tenant_id, kb_article_id, user_id, is_helpful) VALUES (?, ?, ?, ?)', [usuario.tenantId, req.params.id, usuario.id, util]);
    return res.redirect(`/base-de-conhecimento/${req.params.id}?feedback=ok`);
  });
};
