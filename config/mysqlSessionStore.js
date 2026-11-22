const session = require('express-session');

class MySqlSessionStore extends session.Store {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  get(sid, callback) {
    this.pool.query(
      'SELECT session_data FROM user_sessions WHERE session_id = ? AND expires_at > NOW() LIMIT 1',
      [sid]
    ).then(([rows]) => {
      if (!rows.length) return callback(null, null);
      try {
        return callback(null, JSON.parse(rows[0].session_data));
      } catch (erro) {
        return callback(erro);
      }
    }).catch(callback);
  }

  set(sid, sessao, callback = () => {}) {
    const expiracao = sessao.cookie && sessao.cookie.expires
      ? new Date(sessao.cookie.expires)
      : new Date(Date.now() + 60 * 60 * 1000);
    this.pool.query(`
      INSERT INTO user_sessions (session_id, session_data, expires_at)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE session_data = VALUES(session_data), expires_at = VALUES(expires_at)
    `, [sid, JSON.stringify(sessao), expiracao]).then(() => callback()).catch(callback);
  }

  destroy(sid, callback = () => {}) {
    this.pool.query('DELETE FROM user_sessions WHERE session_id = ?', [sid])
      .then(() => callback())
      .catch(callback);
  }

  touch(sid, sessao, callback = () => {}) {
    const expiracao = sessao.cookie && sessao.cookie.expires
      ? new Date(sessao.cookie.expires)
      : new Date(Date.now() + 60 * 60 * 1000);
    this.pool.query('UPDATE user_sessions SET expires_at = ? WHERE session_id = ?', [expiracao, sid])
      .then(() => callback())
      .catch(callback);
  }
}

module.exports = MySqlSessionStore;
