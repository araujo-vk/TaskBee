// app.js
var app = require('./config/express')();
const express = require('express');
const bancoMiddleware = require('./config/bancoMiddleware'); // 1. Importa o middleware

// Middlewares globais
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 2. Aplica o middleware do banco em TODAS as rotas
app.use(bancoMiddleware);

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
