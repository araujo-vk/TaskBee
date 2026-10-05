module.exports = function (app) {
  app.get("/dashboard", async function (request, response) {
    try {
      const userId = request.session.usuarioLogado && request.session.usuarioLogado.id;
      const tenantId = request.session.usuarioLogado && request.session.usuarioLogado.tenant_id;

      if (!userId) {
        return response.redirect("/login");
      }

      const filtro = request.query.filtro || "todos";

      // 1. Consulta de estatísticas gerais baseada no nome do status/prioridade e SLA do tenant
      const [estatisticas] = await request.db.query(`
        SELECT 
          COUNT(t.id) AS total_chamados,
          SUM(CASE WHEN LOWER(s.name) = 'aberto' THEN 1 ELSE 0 END) AS chamados_abertos,
          SUM(CASE WHEN LOWER(s.name) = 'em andamento' THEN 1 ELSE 0 END) AS chamados_andamento,
          SUM(CASE WHEN LOWER(s.name) IN ('resolvido', 'fechado', 'concluído', 'concluido') THEN 1 ELSE 0 END) AS chamados_concluidos,
          SUM(CASE WHEN st.resolution_due_at < NOW() AND LOWER(s.name) NOT IN ('resolvido', 'fechado', 'concluído', 'concluido') THEN 1 ELSE 0 END) AS chamados_atrasados,
          SUM(CASE WHEN p.weight >= 3 OR LOWER(p.name) IN ('crítica', 'critica', 'alta') THEN 1 ELSE 0 END) AS chamados_urgentes
        FROM tickets t
        LEFT JOIN statuses s ON t.status_id = s.id
        LEFT JOIN priorities p ON t.priority_id = p.id
        LEFT JOIN sla_tracking st ON st.ticket_id = t.id AND st.tenant_id = t.tenant_id
        WHERE t.tenant_id = ?
      `, [tenantId]);

      // 2. Cláusula WHERE dinâmica de acordo com o filtro selecionado na interface
      let whereClause = "WHERE t.tenant_id = ?";
      const queryParams = [tenantId];

      if (filtro === "abertos") {
        whereClause += " AND LOWER(s.name) = 'aberto'";
      } else if (filtro === "andamento") {
        whereClause += " AND LOWER(s.name) = 'em andamento'";
      } else if (filtro === "concluidos") {
        whereClause += " AND LOWER(s.name) IN ('resolvido', 'fechado', 'concluído', 'concluido')";
      } else if (filtro === "urgentes") {
        whereClause += " AND (p.weight >= 3 OR LOWER(p.name) IN ('crítica', 'critica', 'alta'))";
      } else if (filtro === "atrasados") {
        whereClause += " AND st.resolution_due_at < NOW() AND LOWER(s.name) NOT IN ('resolvido', 'fechado', 'concluído', 'concluido')";
      }

      // 3. Consulta de chamados com horário de vencimento SLA e flag de atraso
      const [ultimosChamados] = await request.db.query(`
        SELECT 
          t.id, 
          t.title, 
          s.name AS status, 
          p.name AS priority, 
          t.created_at,
          st.resolution_due_at,
          CASE 
            WHEN st.resolution_due_at < NOW() AND LOWER(s.name) NOT IN ('resolvido', 'fechado', 'concluído', 'concluido') THEN 1 
            ELSE 0 
          END AS is_atrasado
        FROM tickets t
        LEFT JOIN statuses s ON t.status_id = s.id
        LEFT JOIN priorities p ON t.priority_id = p.id
        LEFT JOIN sla_tracking st ON st.ticket_id = t.id AND st.tenant_id = t.tenant_id
        ${whereClause}
        ORDER BY t.created_at DESC
        LIMIT 15
      `, queryParams);

      response.render("dashboard", {
        estatisticas: estatisticas[0] || {},
        ultimosChamados: ultimosChamados || [],
        filtroAtivo: filtro
      });

    } catch (error) {
      console.error("Erro ao carregar Dashboard:", error);
      return response.status(500).send("Erro ao carregar o Dashboard.");
    }
  });
};