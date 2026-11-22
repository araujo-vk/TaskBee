module.exports = function (app) {
  // Listagem de ativos
  app.get("/gestao-ativos", async function (request, response) {
    try {
      const userId = request.session.usuarioLogado && request.session.usuarioLogado.id;
      const tenantId = request.session.usuarioLogado && request.session.usuarioLogado.tenantId;

      if (!userId) return response.redirect("/login");

      const [[ativos], [tipos], [usuarios]] = await Promise.all([
        request.db.query(`
        SELECT a.id, a.name, a.category, a.status, a.serial_number, a.acquired_at,
               at.name AS tipo, u.name AS responsavel
        FROM assets a
        LEFT JOIN asset_types at ON at.id = a.asset_type_id AND at.tenant_id = a.tenant_id
        LEFT JOIN users u ON u.id = a.assigned_to AND u.tenant_id = a.tenant_id
        WHERE a.tenant_id = ?
        ORDER BY a.id DESC
      `, [tenantId]),
        request.db.query('SELECT id, name FROM asset_types WHERE tenant_id = ? ORDER BY name', [tenantId]),
        request.db.query('SELECT id, name FROM users WHERE tenant_id = ? AND is_active = TRUE ORDER BY name', [tenantId])
      ]);

      const erro = request.query.erro || null;
      const sucesso = request.query.sucesso || null;

      response.render("gestao-ativos", { ativos, tipos, usuarios, erro, sucesso });
    } catch (error) {
      console.error("Erro ao carregar ativos:", error);
      return response.status(500).send("Erro ao carregar Gestão de Ativos.");
    }
  });

  // Cadastro de novo ativo
  app.post("/gestao-ativos/cadastrar", async function (request, response) {
    try {
      const userId = request.session.usuarioLogado && request.session.usuarioLogado.id;
      const tenantId = request.session.usuarioLogado && request.session.usuarioLogado.tenantId;

      if (!userId) return response.redirect("/login");

      const { nome, categoria, status, numero_serie, tipo_id, responsavel_id, data_aquisicao } = request.body;
      if (!String(nome || '').trim() || !['ativo', 'disponivel', 'manutencao', 'descartado'].includes(status)) {
        return response.redirect('/gestao-ativos?erro=Dados do ativo inválidos.');
      }
      const tipoId = Number(tipo_id) || null;
      const responsavelId = Number(responsavel_id) || null;
      if (tipoId) {
        const [tipo] = await request.db.query('SELECT id FROM asset_types WHERE id = ? AND tenant_id = ?', [tipoId, tenantId]);
        if (!tipo.length) return response.redirect('/gestao-ativos?erro=Tipo de ativo inválido.');
      }
      if (responsavelId) {
        const [responsavel] = await request.db.query('SELECT id FROM users WHERE id = ? AND tenant_id = ? AND is_active = TRUE', [responsavelId, tenantId]);
        if (!responsavel.length) return response.redirect('/gestao-ativos?erro=Responsável inválido.');
      }

      await request.db.query(`
        INSERT INTO assets (tenant_id, name, category, asset_type_id, status, serial_number, assigned_to, acquired_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [tenantId, String(nome).trim(), categoria, tipoId, status, String(numero_serie || '').trim() || null, responsavelId, data_aquisicao || null]);

      response.redirect("/gestao-ativos?sucesso=Ativo cadastrado com sucesso!");
    } catch (error) {
      console.error("Erro ao cadastrar ativo:", error);
      response.redirect("/gestao-ativos?erro=Erro ao cadastrar ativo.");
    }
  });

  app.post('/gestao-ativos/tipos', async function (request, response) {
    const usuario = request.session.usuarioLogado;
    if (!usuario) return response.redirect('/login');
    const nome = String(request.body.nome || '').trim();
    if (!nome || nome.length > 100) return response.redirect('/gestao-ativos?erro=Nome de tipo inválido.');
    try {
      await request.db.query('INSERT INTO asset_types (tenant_id, name) VALUES (?, ?)', [usuario.tenantId, nome]);
      return response.redirect('/gestao-ativos?sucesso=Tipo de ativo cadastrado.');
    } catch (erro) {
      return response.redirect('/gestao-ativos?erro=Não foi possível cadastrar o tipo.');
    }
  });
};
