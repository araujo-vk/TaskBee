//Eu bolei isso aqui p criar Logs
module.exports = {
  registrarLog: async function (db, tenantId, userId, action, entity, entityId, details) {
    try {
      // O user_id pode ser nulo (ex: quando alguém pede para se cadastrar e ainda não tem ID)
      await db.query(
        `INSERT INTO audit_logs (tenant_id, user_id, action, entity, entity_id, details) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [tenantId, userId || null, action, entity, entityId, details]
      );
    } catch (error) {
      console.error("Falha ao gravar log de auditoria:", error);
    }
  }
};