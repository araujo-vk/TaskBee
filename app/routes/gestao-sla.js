module.exports = function (app) {
  // Exibição e leitura das políticas de SLA
  app.get("/gestao-sla", async function (request, response) {
    try {
      const userId = request.session.usuarioLogado && request.session.usuarioLogado.id;
      const tenantId = request.session.usuarioLogado && request.session.usuarioLogado.tenant_id;

      if (!userId) return response.redirect("/login");

      const [politicasSla] = await request.db.query(`
        SELECT sp.id, sp.name AS policy_name, p.name AS priority_name, sp.response_time_minutes, sp.resolution_time_minutes
        FROM sla_policies sp
        LEFT JOIN priorities p ON sp.priority_id = p.id
        WHERE sp.tenant_id = ?
        ORDER BY sp.id ASC
      `, [tenantId]);

      const erro = request.query.erro || null;
      const sucesso = request.query.sucesso || null;

      response.render("gestao-sla", { politicasSla, erro, sucesso });
    } catch (error) {
      console.error("Erro ao carregar SLA:", error);
      return response.status(500).send("Erro ao carregar a Gestão de SLA.");
    }
  });

  // Atualização ou adição de regras de SLA
  app.post("/gestao-sla/salvar", async function (request, response) {
    try {
      const userId = request.session.usuarioLogado && request.session.usuarioLogado.id;
      const tenantId = request.session.usuarioLogado && request.session.usuarioLogado.tenant_id;

      if (!userId) return response.redirect("/login");
      
      const { nome_politica, prioridade, tempo_resposta, tempo_resolucao } = request.body;

      await request.db.query(`
        INSERT INTO sla_policies (tenant_id, name, priority_id, response_time_minutes, resolution_time_minutes)
        VALUES (?, ?, ?, ?, ?)
      `, [tenantId, nome_politica || 'Nova Política', prioridade, tempo_resposta, tempo_resolucao]);

      response.redirect("/gestao-sla?sucesso=Regra de SLA salva com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar SLA:", error);
      response.redirect("/gestao-sla?erro=Erro ao salvar regra de SLA.");
    }
  });
};