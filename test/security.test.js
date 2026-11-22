const test = require('node:test');
const assert = require('node:assert/strict');
const { protegerRequisicoes } = require('../config/securityMiddleware');
const { enviarNotificacao } = require('../config/notificador');

test('bloqueia POST sem token nem origem válida', () => {
  const req = { method: 'POST', protocol: 'http', session: {}, body: {}, get(nome) { return nome === 'host' ? 'localhost:3000' : undefined; } };
  const res = { locals: {}, redirect(destino) { this.destino = destino; } };
  protegerRequisicoes(req, res, () => assert.fail('não deveria continuar'));
  assert.equal(res.destino, '/erro/403');
});

test('notificação valida usuário dentro do tenant antes de inserir', async () => {
  const chamadas = [];
  const db = { async query(sql, parametros) {
    chamadas.push({ sql, parametros });
    if (sql.includes('FROM users')) return [[{ id: 7 }]];
    return [{ insertId: 9 }];
  } };
  const id = await enviarNotificacao(db, 3, 7, 'Título', 'Mensagem');
  assert.equal(id, 9);
  assert.deepEqual(chamadas[0].parametros, [7, 3]);
  assert.match(chamadas[1].sql, /INSERT INTO notifications/);
});
