// config/bancoMiddleware.js
const db = require('../db'); // Caminho para o seu arquivo db.js com a conexão mysql2

module.exports = function (request, response, next) {
  // Injeta o pool/conexão do banco no objeto 'request'
  request.db = db;
  
  // Chama o 'next()' para permitir que o Express continue para a rota
  next();
};