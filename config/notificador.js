async function enviarNotificacao(db, tenantId, userId, titulo, mensagem, tipo = 'info', linkUrl = null) {
  if (!tenantId || !userId || !titulo || !mensagem) return null;
  try {
    const [usuario] = await db.query(
      'SELECT id FROM users WHERE id = ? AND tenant_id = ? AND is_active = TRUE LIMIT 1',
      [userId, tenantId]
    );
    if (!usuario.length) return null;

    const [resultado] = await db.query(`
      INSERT INTO notifications (tenant_id, user_id, title, message, type, link_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [tenantId, userId, String(titulo).slice(0, 150), mensagem, tipo, linkUrl]);
    return resultado.insertId;
  } catch (erro) {
    console.error('Falha ao criar notificação:', erro);
    return null;
  }
}

module.exports = { enviarNotificacao };
