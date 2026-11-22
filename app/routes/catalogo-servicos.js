module.exports = function (app) {
  app.get("/catalogo-servicos", async function (request, response) {
    const usuario = request.session.usuarioLogado;
    if (!usuario) return response.redirect('/login');
    const busca = String(request.query.busca || '').trim().slice(0, 100);
    try {
      let sql = `
        SELECT srv.id, srv.name, srv.description, sc.name AS categoria,
               sp.response_time_minutes, sp.resolution_time_minutes
        FROM services srv
        LEFT JOIN service_categories sc ON sc.id = srv.service_category_id AND sc.tenant_id = srv.tenant_id
        LEFT JOIN sla_policies sp ON sp.id = srv.default_sla_id AND sp.tenant_id = srv.tenant_id
        WHERE srv.tenant_id = ? AND srv.is_active = TRUE`;
      const parametros = [usuario.tenantId];
      if (busca) {
        sql += ' AND (srv.name LIKE ? OR srv.description LIKE ? OR sc.name LIKE ?)';
        parametros.push(`%${busca}%`, `%${busca}%`, `%${busca}%`);
      }
      sql += ' ORDER BY sc.name, srv.name';
      const [servicos] = await request.db.query(sql, parametros);
      return response.render('catalogo-servicos', { servicos, busca });
    } catch (erro) {
      console.error('Erro ao carregar catálogo:', erro);
      return response.status(500).send('Não foi possível carregar o catálogo.');
    }
  });
};
