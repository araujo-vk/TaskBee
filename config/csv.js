function normalizarCabecalho(valor) {
  return String(valor || '')
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function lerCsv(conteudo, separador = ';') {
  if (typeof conteudo !== 'string' || conteudo.trim() === '') {
    return [];
  }

  const linhas = [];
  let linha = [];
  let campo = '';
  let entreAspas = false;

  for (let indice = 0; indice < conteudo.length; indice += 1) {
    const caractere = conteudo[indice];
    const proximo = conteudo[indice + 1];

    if (caractere === '"') {
      if (entreAspas && proximo === '"') {
        campo += '"';
        indice += 1;
      } else {
        entreAspas = !entreAspas;
      }
    } else if (caractere === separador && !entreAspas) {
      linha.push(campo.trim());
      campo = '';
    } else if ((caractere === '\n' || caractere === '\r') && !entreAspas) {
      if (caractere === '\r' && proximo === '\n') indice += 1;
      linha.push(campo.trim());
      if (linha.some(valor => valor !== '')) linhas.push(linha);
      linha = [];
      campo = '';
    } else {
      campo += caractere;
    }
  }

  linha.push(campo.trim());
  if (linha.some(valor => valor !== '')) linhas.push(linha);

  if (entreAspas || linhas.length < 2) {
    return [];
  }

  const cabecalhos = linhas[0].map(normalizarCabecalho);
  return linhas.slice(1).map((valores, indice) => {
    const registro = { linha: indice + 2 };
    cabecalhos.forEach((cabecalho, coluna) => {
      registro[cabecalho] = valores[coluna] || '';
    });
    return registro;
  });
}

function escaparCampoCsv(valor, separador = ';') {
  let texto = valor === null || valor === undefined ? '' : String(valor);
  if (/^[=+\-@]/.test(texto.trim())) texto = `'${texto}`;

  if (texto.includes('"') || texto.includes(separador) || /[\r\n]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }

  return texto;
}

function enviarCsv(resposta, nomeArquivo, cabecalhos, linhas, separador = ';') {
  const conteudo = [
    cabecalhos.map(campo => escaparCampoCsv(campo, separador)).join(separador),
    ...linhas.map(linha => linha.map(campo => escaparCampoCsv(campo, separador)).join(separador))
  ].join('\r\n');

  resposta.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${nomeArquivo}"`,
    'Cache-Control': 'no-store'
  });

  return resposta.send(`\uFEFF${conteudo}`);
}

module.exports = {
  lerCsv,
  enviarCsv
};
