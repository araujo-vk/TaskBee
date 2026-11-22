const fs = require('fs');
const path = require('path');

function carregarArquivoEnv() {
  const caminho = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(caminho)) return;

  const conteudo = fs.readFileSync(caminho, 'utf8');
  conteudo.split(/\r?\n/).forEach(linha => {
    const texto = linha.trim();
    if (!texto || texto.startsWith('#')) return;
    const separador = texto.indexOf('=');
    if (separador < 1) return;

    const chave = texto.slice(0, separador).trim();
    let valor = texto.slice(separador + 1).trim();
    if ((valor.startsWith('"') && valor.endsWith('"')) || (valor.startsWith("'") && valor.endsWith("'"))) {
      valor = valor.slice(1, -1);
    }
    if (process.env[chave] === undefined) process.env[chave] = valor;
  });
}

carregarArquivoEnv();

module.exports = process.env;
