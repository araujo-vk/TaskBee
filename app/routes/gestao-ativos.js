module.exports = function (app) {
  // Listagem de ativos
  app.get("/gestao-ativos", async function (request, response) {
    try {
      const userId = request.session.usuarioLogado && request.session.usuarioLogado.id;
      const tenantId = request.session.usuarioLogado && request.session.usuarioLogado.tenant_id;

      if (!userId) return response.redirect("/login");

      const [ativos] = await request.db.query(`
        SELECT id, name, category, status, serial_number, acquired_at
        FROM assets
        WHERE tenant_id = ?
        ORDER BY id DESC
      `, [tenantId]);

      const erro = request.query.erro || null;
      const sucesso = request.query.sucesso || null;

      response.render("gestao-ativos", { ativos, erro, sucesso });
    } catch (error) {
      console.error("Erro ao carregar ativos:", error);
      return response.status(500).send("Erro ao carregar Gestão de Ativos.");
    }
  });

  // Cadastro de novo ativo
  app.post("/gestao-ativos/cadastrar", async function (request, response) {
    try {
      const userId = request.session.usuarioLogado && request.session.usuarioLogado.id;
      const tenantId = request.session.usuarioLogado && request.session.usuarioLogado.tenant_id;

      if (!userId) return response.redirect("/login");

      const { nome, categoria, status, numero_serie } = request.body;

      await request.db.query(`
        INSERT INTO assets (tenant_id, name, category, status, serial_number, acquired_at)
        VALUES (?, ?, ?, ?, ?, NOW())
      `, [tenantId, nome, categoria, status, numero_serie]);

      response.redirect("/gestao-ativos?sucesso=Ativo cadastrado com sucesso!");
    } catch (error) {
      console.error("Erro ao cadastrar ativo:", error);
      response.redirect("/gestao-ativos?erro=Erro ao cadastrar ativo.");
    }
  });
};