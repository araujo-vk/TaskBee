const tentativas = new Map();
const JANELA_MS = 15 * 60 * 1000;
const LIMITE = 5;

function chave(req, identificador = '') {
  return `${req.ip || req.socket.remoteAddress || 'ip'}:${String(identificador).toLowerCase()}`;
}

function estaBloqueado(req, identificador) {
  const item = tentativas.get(chave(req, identificador));
  if (!item) return false;
  if (Date.now() - item.inicio > JANELA_MS) {
    tentativas.delete(chave(req, identificador));
    return false;
  }
  return item.total >= LIMITE;
}

function registrarFalha(req, identificador) {
  const id = chave(req, identificador);
  const atual = tentativas.get(id);
  if (!atual || Date.now() - atual.inicio > JANELA_MS) {
    tentativas.set(id, { total: 1, inicio: Date.now() });
  } else {
    atual.total += 1;
  }
}

function limpar(req, identificador) {
  tentativas.delete(chave(req, identificador));
}

module.exports = { estaBloqueado, registrarFalha, limpar };
