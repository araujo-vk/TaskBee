const { possuiPerfil } = require('../../config/roleMiddleware');
const { enviarCsv } = require('../../config/csv');

function validarAcesso(usuario, resposta, perfis) {
  if (!usuario) {
    resposta.redirect('/login');
    return false;
  }

  if (!possuiPerfil(usuario, ...perfis)) {
    resposta.redirect('/erro/403');
    return false;
  }

  return true;
}

module.exports = function (app) {
  app.get('/exportar/chamados.csv', async (req, res) => {
    const usuario = req.session.usuarioLogado;
    if (!validarAcesso(usuario, res, [1, 2, 3])) return;

    try {
      const [chamados] = await req.db.query(`
        SELECT t.id, t.title, t.description, t.type, t.created_at, t.closed_at,
               solicitante.name AS solicitante, responsavel.name AS responsavel,
               s.name AS status, p.name AS prioridade, c.name AS categoria,
               srv.name AS servico, st.response_due_at, st.resolution_due_at,
               st.responded_at, st.resolved_at,
               CASE
                 WHEN st.resolution_due_at < NOW()
                      AND LOWER(COALESCE(s.name, '')) NOT IN ('resolvido', 'fechado', 'concluido', 'concluído')
                 THEN 'Sim'
                 ELSE 'Não'
               END AS sla_atrasado
        FROM tickets t
        LEFT JOIN users solicitante ON solicitante.id = t.requester_id AND solicitante.tenant_id = t.tenant_id
        LEFT JOIN users responsavel ON responsavel.id = t.assigned_to AND responsavel.tenant_id = t.tenant_id
        LEFT JOIN statuses s ON s.id = t.status_id AND s.tenant_id = t.tenant_id
        LEFT JOIN priorities p ON p.id = t.priority_id AND p.tenant_id = t.tenant_id
        LEFT JOIN ticket_categories c ON c.id = t.category_id AND c.tenant_id = t.tenant_id
        LEFT JOIN services srv ON srv.id = t.service_id AND srv.tenant_id = t.tenant_id
        LEFT JOIN sla_tracking st ON st.ticket_id = t.id AND st.tenant_id = t.tenant_id
        WHERE t.tenant_id = ?
        ORDER BY t.created_at DESC
      `, [usuario.tenantId]);

      return enviarCsv(res, 'taskbee-chamados.csv', [
        'ID', 'Título', 'Descrição', 'Tipo', 'Categoria', 'Prioridade', 'Status', 'Serviço',
        'Solicitante', 'Responsável', 'Aberto em', 'Fechado em', 'Resposta até', 'Resolução até',
        'Respondido em', 'Resolvido em', 'SLA atrasado'
      ], chamados.map(item => [
        item.id, item.title, item.description, item.type, item.categoria, item.prioridade, item.status,
        item.servico, item.solicitante, item.responsavel, item.created_at, item.closed_at,
        item.response_due_at, item.resolution_due_at, item.responded_at, item.resolved_at, item.sla_atrasado
      ]));
    } catch (erro) {
      console.error('Erro ao exportar chamados:', erro);
      return res.status(500).send('Não foi possível exportar os chamados.');
    }
  });

  app.get('/exportar/sla.csv', async (req, res) => {
    const usuario = req.session.usuarioLogado;
    if (!validarAcesso(usuario, res, [1, 2])) return;

    try {
      const [registros] = await req.db.query(`
        SELECT t.id AS ticket_id, t.title, p.name AS prioridade, s.name AS status,
               st.response_due_at, st.resolution_due_at, st.responded_at, st.resolved_at,
               CASE WHEN st.response_due_at < NOW() AND st.responded_at IS NULL THEN 'Sim' ELSE 'Não' END AS resposta_atrasada,
               CASE
                 WHEN st.resolution_due_at < NOW()
                      AND LOWER(COALESCE(s.name, '')) NOT IN ('resolvido', 'fechado', 'concluido', 'concluído')
                 THEN 'Sim'
                 ELSE 'Não'
               END AS resolucao_atrasada
        FROM sla_tracking st
        INNER JOIN tickets t ON t.id = st.ticket_id AND t.tenant_id = st.tenant_id
        LEFT JOIN priorities p ON p.id = t.priority_id AND p.tenant_id = t.tenant_id
        LEFT JOIN statuses s ON s.id = t.status_id AND s.tenant_id = t.tenant_id
        WHERE st.tenant_id = ?
        ORDER BY st.resolution_due_at ASC
      `, [usuario.tenantId]);

      return enviarCsv(res, 'taskbee-sla.csv', [
        'Chamado', 'Título', 'Prioridade', 'Status', 'Resposta até', 'Resolução até',
        'Respondido em', 'Resolvido em', 'Resposta atrasada', 'Resolução atrasada'
      ], registros.map(item => [
        item.ticket_id, item.title, item.prioridade, item.status, item.response_due_at,
        item.resolution_due_at, item.responded_at, item.resolved_at,
        item.resposta_atrasada, item.resolucao_atrasada
      ]));
    } catch (erro) {
      console.error('Erro ao exportar SLA:', erro);
      return res.status(500).send('Não foi possível exportar o relatório de SLA.');
    }
  });
};
