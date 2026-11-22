const test = require('node:test');
const assert = require('node:assert/strict');
const { themes, defaults, contrast } = require('../config/themes');

test('paletas mantêm contraste mínimo de 4.5 para texto, controles, links e navegação', () => {
  for (const theme of [...defaults,...themes]) {
    const t=theme.tokens;
    for (const [foreground,background] of [
      ['texto-principal','bg-cartao'],['texto-principal','bg-input'],['texto-principal','bg-site'],
      ['texto-secundario','bg-cartao'],['texto-secundario','bg-site'],['texto-secundario','bg-input'],
      ['texto-navegacao','bg-header'],['texto-nav-suave','bg-header'],['texto-botao','cor-amarelo'],
      ['cor-link','bg-cartao'],['cor-link','bg-site'],['cor-link-secundaria','bg-cartao'],
      ['estado-sucesso','bg-cartao'],['estado-alerta','bg-cartao'],['estado-erro','bg-cartao'],['estado-info','bg-cartao']
    ]) {
      const ratio=contrast(t[foreground],t[background]);
      assert.ok(ratio>=4.5,`${theme.id}: ${foreground}/${background} = ${ratio.toFixed(2)}`);
    }
  }
});
