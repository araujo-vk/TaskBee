const PERIODOS_VALIDOS = {
  '7': 7,
  '30': 30,
  '90': 90,
  todos: null
};

function filtroPeriodo(periodo) {
  const dias = PERIODOS_VALIDOS[periodo];
  return dias
    ? { clausula: ' AND t.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)', parametros: [dias] }
    : { clausula: '', parametros: [] };
}

module.exports = function (app) {
  app.get('/dashboard', async function (request, response) {
    try {
      const usuario = request.session.usuarioLogado;
      const tenantId = usuario && usuario.tenantId;

      if (!usuario || !tenantId) return response.redirect('/login');

      const filtro = ['todos', 'abertos', 'andamento', 'concluidos', 'urgentes', 'atrasados'].includes(request.query.filtro)
        ? request.query.filtro
        : 'todos';
      const periodo = Object.prototype.hasOwnProperty.call(PERIODOS_VALIDOS, request.query.periodo)
        ? request.query.periodo
        : '30';
      const periodoSql = filtroPeriodo(periodo);
      const baseParametros = [tenantId, ...periodoSql.parametros];
      const joins = `
        FROM tickets t
        LEFT JOIN statuses s ON t.status_id = s.id AND s.tenant_id = t.tenant_id
        LEFT JOIN priorities p ON t.priority_id = p.id AND p.tenant_id = t.tenant_id
        LEFT JOIN ticket_categories c ON t.category_id = c.id AND c.tenant_id = t.tenant_id
        LEFT JOIN (
          SELECT ticket_id, tenant_id,
                 MIN(response_due_at) AS response_due_at,
                 MIN(resolution_due_at) AS resolution_due_at,
                 MIN(responded_at) AS responded_at,
                 MIN(resolved_at) AS resolved_at
          FROM sla_tracking
          GROUP BY ticket_id, tenant_id
        ) st ON st.ticket_id = t.id AND st.tenant_id = t.tenant_id
        WHERE t.tenant_id = ? AND t.deleted_at IS NULL${periodoSql.clausula}
      `;

      const [estatisticasResultado, porCategoriaResultado, porPrioridadeResultado] = await Promise.all([
        request.db.query(`
          SELECT
            COUNT(DISTINCT t.id) AS total_chamados,
            SUM(CASE WHEN LOWER(s.name) = 'aberto' THEN 1 ELSE 0 END) AS chamados_abertos,
            SUM(CASE WHEN LOWER(s.name) = 'em andamento' THEN 1 ELSE 0 END) AS chamados_andamento,
            SUM(CASE WHEN LOWER(s.name) IN ('resolvido', 'fechado', 'concluído', 'concluido') THEN 1 ELSE 0 END) AS chamados_concluidos,
            SUM(CASE WHEN st.resolution_due_at < NOW() AND LOWER(COALESCE(s.name, '')) NOT IN ('resolvido', 'fechado', 'concluído', 'concluido') THEN 1 ELSE 0 END) AS chamados_atrasados,
            SUM(CASE WHEN p.weight >= 3 OR LOWER(COALESCE(p.name, '')) IN ('crítica', 'critica', 'alta') THEN 1 ELSE 0 END) AS chamados_urgentes,
            ROUND(AVG(CASE WHEN st.responded_at IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, t.created_at, st.responded_at) END) / 60, 1) AS tempo_medio_resposta_horas,
            ROUND(AVG(CASE WHEN st.resolved_at IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, t.created_at, st.resolved_at) END) / 60, 1) AS tempo_medio_resolucao_horas,
            ROUND(100 * AVG(CASE
              WHEN st.resolved_at IS NOT NULL AND st.resolution_due_at IS NOT NULL
              THEN st.resolved_at <= st.resolution_due_at
              ELSE NULL
            END), 1) AS cumprimento_sla_percentual
          ${joins}
        `, baseParametros),
        request.db.query(`
          SELECT COALESCE(c.name, 'Sem categoria') AS nome, COUNT(*) AS quantidade
          ${joins}
          GROUP BY c.id, c.name
          ORDER BY quantidade DESC, nome ASC
          LIMIT 8
        `, baseParametros),
        request.db.query(`
          SELECT COALESCE(p.name, 'Sem prioridade') AS nome, COUNT(*) AS quantidade
          ${joins}
          GROUP BY p.id, p.name
          ORDER BY MAX(COALESCE(p.weight, 0)) DESC, nome ASC
        `, baseParametros)
      ]);

      let filtroDeLista = '';
      if (filtro === 'abertos') {
        filtroDeLista = " AND LOWER(s.name) = 'aberto'";
      } else if (filtro === 'andamento') {
        filtroDeLista = " AND LOWER(s.name) = 'em andamento'";
      } else if (filtro === 'concluidos') {
        filtroDeLista = " AND LOWER(s.name) IN ('resolvido', 'fechado', 'concluído', 'concluido')";
      } else if (filtro === 'urgentes') {
        filtroDeLista = " AND (p.weight >= 3 OR LOWER(COALESCE(p.name, '')) IN ('crítica', 'critica', 'alta'))";
      } else if (filtro === 'atrasados') {
        filtroDeLista = " AND st.resolution_due_at < NOW() AND LOWER(COALESCE(s.name, '')) NOT IN ('resolvido', 'fechado', 'concluído', 'concluido')";
      }

      const [ultimosChamados] = await request.db.query(`
        SELECT t.id, t.title, s.name AS status, p.name AS priority, t.created_at,
               st.resolution_due_at,
               CASE
                 WHEN st.resolution_due_at < NOW()
                      AND LOWER(COALESCE(s.name, '')) NOT IN ('resolvido', 'fechado', 'concluído', 'concluido')
                 THEN 1 ELSE 0
               END AS is_atrasado
        ${joins}${filtroDeLista}
        ORDER BY t.created_at DESC
        LIMIT 15
      `, baseParametros);

      response.render('dashboard', {
        estatisticas: estatisticasResultado[0][0] || {},
        ultimosChamados,
        porCategoria: porCategoriaResultado[0],
        porPrioridade: porPrioridadeResultado[0],
        filtroAtivo: filtro,
        periodoAtivo: periodo
      });
    } catch (error) {
      console.error('Erro ao carregar Dashboard:', error);
      return response.status(500).send('Erro ao carregar o Dashboard.');
    }
  });
};
