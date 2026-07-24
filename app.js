// app.js
var app = require('./config/express')();
const express = require('express');
const bancoMiddleware = require('./config/bancoMiddleware');
const authMiddleware = require('./config/authMiddleware');
const session = require('express-session');

// 1. Middlewares de requisição
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 2. SESSÃO VEM ANTES DA AUTENTICAÇÃO!
app.use(session({
  secret: 'macaco-cola-5-2-0', // Uma chave de segurança para assinar os cookies
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 } // Mantém logado por 1 hora
}));

// 3. Agora sim, aplicamos o bloqueio de autenticação e o banco
app.use(authMiddleware);
app.use(bancoMiddleware);

// ... (O resto do seu código com require('./app/routes/index')(app) continua igual daqui para baixo)
require('./app/routes/index')(app);

//Outras rotas
const fs = require('fs');
const path = require('path');

// Caminho absoluto para a pasta de rotas
const routesPath = path.join(__dirname, 'app/routes');

// Lê todos os arquivos dentro da pasta
fs.readdirSync(routesPath).forEach((file) => {
  // Garante que só vai carregar arquivos JavaScript e ignorar arquivos ocultos/testes
  if (file.endsWith('.js')) {
    const route = require(path.join(routesPath, file));

    // Se o seu arquivo de rota exporta uma função que recebe (app):
    if (typeof route === 'function') {
      route(app);
    } 
    // Se o seu arquivo de rota exporta um express.Router():
    else {
      app.use('/', route);
    }
  }
});


app.listen(3000, function () {
  console.log("Servidor Rodando!");
});
