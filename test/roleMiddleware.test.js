const test = require('node:test');
const assert = require('node:assert/strict');
const { obterRoleId, possuiPerfil, exigirPerfis } = require('../config/roleMiddleware');

test('normaliza roleId e impede perfil não autorizado', () => {
  assert.equal(obterRoleId({ role_id: '3' }), 3);
  assert.equal(possuiPerfil({ roleId: 3 }, 1, 2, 3), true);

  const req = { session: { usuarioLogado: { roleId: 4 } }, path: '/gestao-sla' };
  const res = { redirect(destino) { this.destino = destino; } };
  exigirPerfis(1, 2)(req, res, () => assert.fail('não deveria permitir'));
  assert.equal(res.destino, '/erro/403');
});
