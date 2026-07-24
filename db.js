// db.js
const mysql = require('mysql2/promise');

// Cria um "pool" de conexões (mais eficiente que abrir e fechar a conexão toda hora)
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root', // Substitua pelo seu usuário do MySQL local
  password: 'sua_senha_aqui', // Substitua pela sua senha do MySQL local
  database: 'banco', // O nome do banco que você criou no seu arquivo .sql
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;