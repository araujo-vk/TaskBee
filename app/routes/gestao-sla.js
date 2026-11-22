module.exports = function (app) {
  // Exibição e leitura das políticas de SLA
  app.get("/gestao-sla", async function (request, response) {
    try {
      const userId = request.session.usuarioLogado && request.session.usuarioLogado.id;
      const tenantId = request.session.usuarioLogado && request.session.usuarioLogado.tenantId;

      if (!userId) return response.redirect("/login");

      const [politicasSla] = await request.db.query(`
        SELECT sp.id, sp.name AS policy_name, p.name AS priority_name,
               sp.response_time_minutes,
               sp.resolution_time_minutes,
               ROUND(sp.response_time_minutes / 60, 2) AS response_time_hours,
               ROUND(sp.resolution_time_minutes / 60, 2) AS resolution_time_hours
        FROM sla_policies sp
        LEFT JOIN priorities p ON sp.priority_id = p.id AND p.tenant_id = sp.tenant_id
        WHERE sp.tenant_id = ?
        ORDER BY sp.id ASC
      `, [tenantId]);

      const [prioridades] = await request.db.query(`
        SELECT id, name
        FROM priorities
        WHERE tenant_id = ?
        ORDER BY weight ASC, name ASC
      `, [tenantId]);

      const erro = request.query.erro || null;
      const sucesso = request.query.sucesso || null;

      response.render("gestao-sla", { politicasSla, prioridades, erro, sucesso });
    } catch (error) {
      console.error("Erro ao carregar SLA:", error);
      return response.status(500).send("Erro ao carregar a Gestão de SLA.");
    }
  });

  // Atualização ou adição de regras de SLA
  app.post("/gestao-sla/salvar", async function (request, response) {
    try {
      const userId = request.session.usuarioLogado && request.session.usuarioLogado.id;
      const tenantId = request.session.usuarioLogado && request.session.usuarioLogado.tenantId;

      if (!userId) return response.redirect("/login");
      
      const { nome_politica, prioridade, tempo_resposta, tempo_resolucao } = request.body;
      const priorityId = Number(prioridade);
      const responseHours = Number(tempo_resposta);
      const resolutionHours = Number(tempo_resolucao);

      if (!Number.isInteger(priorityId)
        || !Number.isFinite(responseHours)
        || !Number.isFinite(resolutionHours)
        || responseHours <= 0
        || resolutionHours <= 0) {
        return response.redirect('/gestao-sla?erro=Informe uma prioridade e prazos válidos.');
      }

      const [prioridadeValida] = await request.db.query(`
        SELECT id, name
        FROM priorities
        WHERE id = ? AND tenant_id = ?
        LIMIT 1
      `, [priorityId, tenantId]);

      if (prioridadeValida.length === 0) {
        return response.redirect('/gestao-sla?erro=Prioridade inválida para esta empresa.');
      }

      const responseMinutes = Math.round(responseHours * 60);
      const resolutionMinutes = Math.round(resolutionHours * 60);
      const policyName = String(nome_politica || `SLA - ${prioridadeValida[0].name}`).trim();

      const [politicaExistente] = await request.db.query(`
        SELECT id
        FROM sla_policies
        WHERE tenant_id = ? AND priority_id = ?
        ORDER BY id ASC
        LIMIT 1
      `, [tenantId, priorityId]);

      if (politicaExistente.length > 0) {
        await request.db.query(`
          UPDATE sla_policies
          SET name = ?, response_time_minutes = ?, resolution_time_minutes = ?
          WHERE id = ? AND tenant_id = ?
        `, [policyName, responseMinutes, resolutionMinutes, politicaExistente[0].id, tenantId]);
      } else {
        await request.db.query(`
          INSERT INTO sla_policies (tenant_id, name, priority_id, response_time_minutes, resolution_time_minutes)
          VALUES (?, ?, ?, ?, ?)
        `, [tenantId, policyName, priorityId, responseMinutes, resolutionMinutes]);
      }

      response.redirect("/gestao-sla?sucesso=Regra de SLA salva com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar SLA:", error);
      response.redirect("/gestao-sla?erro=Erro ao salvar regra de SLA.");
    }
  });
};
