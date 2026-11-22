const test = require('node:test');
const assert = require('node:assert/strict');

test('usuário sem sessão é enviado ao login em rota protegida', async () => {
  const auth = require('../config/authMiddleware');
  const req = { path: '/chamados', session: {}, db: {} };
  const res = { locals: {}, redirect(destino) { this.destino = destino; } };
  await auth(req, res, () => assert.fail('não deveria continuar'));
  assert.equal(res.destino, '/login');
});

test('validação da sessão sempre inclui usuário e tenant', async () => {
  const auth = require('../config/authMiddleware');
  const chamadas = [];
  const req = {
    path: '/chamados',
    session: { usuarioLogado: { id: 8, roleId: 3, tenantId: 4 } },
    db: { async query(sql, parametros) {
      chamadas.push({ sql, parametros });
      if (sql.includes('FROM users')) return [[{ name: 'Técnico', role_id: 3, tenant_id: 4, tema: 'system' }]];
      return [[{ total: 0 }]];
    } }
  };
  const res = { locals: {}, redirect(destino) { this.destino = destino; } };
  let continuou = false;
  await auth(req, res, () => { continuou = true; });
  assert.equal(continuou, true);
  assert.deepEqual(chamadas[0].parametros, [8, 4]);
  assert.equal(req.usuario.tenantId, 4);
});
