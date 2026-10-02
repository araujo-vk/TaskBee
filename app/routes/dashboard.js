module.exports = function (app) {
  app.get("/dashboard", async function (request, response) {
    try {
      const userId = request.session.usuarioLogado && request.session.usuarioLogado.id;
      const tenantId = request.session.usuarioLogado && request.session.usuarioLogado.tenant_id;

      if (!userId) {
        return response.redirect("/login");
      }

// Consulta de métricas gerais do tenant (Mapeando os IDs: 1=Aberto, 2=Em Andamento, 3=Resolvido, 4=Fechado)
      const [estatisticas] = await request.db.query(`
        SELECT 
          COUNT(*) AS total_chamados,
          SUM(CASE WHEN status_id = 1 THEN 1 ELSE 0 END) AS chamados_abertos,
          SUM(CASE WHEN status_id = 2 THEN 1 ELSE 0 END) AS chamados_andamento,
          SUM(CASE WHEN status_id IN (3, 4) THEN 1 ELSE 0 END) AS chamados_concluidos
        FROM tickets
        WHERE tenant_id = ?
      `, [tenantId]);

      // Consulta dos 5 últimos chamados do tenant (Usando JOIN para obter o nome do status e da prioridade)
      const [ultimosChamados] = await request.db.query(`
        SELECT t.id, t.title, s.name AS status, p.name AS priority, t.created_at
        FROM tickets t
        LEFT JOIN statuses s ON t.status_id = s.id
        LEFT JOIN priorities p ON t.priority_id = p.id
        WHERE t.tenant_id = ?
        ORDER BY t.created_at DESC
        LIMIT 5
      `, [tenantId]);

      response.render("dashboard", {
        estatisticas: estatisticas[0] || {},
        ultimosChamados: ultimosChamados || []
      });

    } catch (error) {
      console.error("Erro ao carregar Dashboard:", error);
      return response.status(500).send("Erro ao carregar o Dashboard.");
    }
  });
};