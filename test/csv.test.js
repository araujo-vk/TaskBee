const test = require('node:test');
const assert = require('node:assert/strict');
const { lerCsv, enviarCsv } = require('../config/csv');

test('lê CSV com campos entre aspas e ponto e vírgula', () => {
  const linhas = lerCsv('Nome;E-mail\n"Ana; Souza";ana@example.com');
  assert.equal(linhas.length, 1);
  assert.equal(linhas[0].nome, 'Ana; Souza');
  assert.equal(linhas[0].e_mail, 'ana@example.com');
});

test('protege campos exportados contra fórmulas de planilha', () => {
  const resposta = {
    set(cabecalhos) { this.cabecalhos = cabecalhos; },
    send(conteudo) { this.conteudo = conteudo; return conteudo; }
  };
  enviarCsv(resposta, 'teste.csv', ['Nome'], [['=CMD()']]);
  assert.match(resposta.conteudo, /'=CMD\(\)/);
  assert.equal(resposta.cabecalhos['Cache-Control'], 'no-store');
});
