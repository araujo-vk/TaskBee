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

// ... (Seus outros imports e configurações iniciais)

// 3. Agora sim, aplicamos o bloqueio de autenticação e o banco
app.use(authMiddleware);
app.use(bancoMiddleware);

// REMOVIDO: A linha require('./app/routes/index')(app); foi apagada 
// para evitar que a rota index seja carregada duas vezes, já que o loop fará isso.

const fs = require('fs');
const path = require('path');

// Caminho absoluto para a pasta de rotas
const routesPath = path.join(__dirname, 'app/routes');

// Lê todos os arquivos dentro da pasta
fs.readdirSync(routesPath).forEach((file) => {
  if (file.endsWith('.js')) {
    const route = require(path.join(routesPath, file));

    // Verifica se o que foi exportado é de fato uma função
    if (typeof route === 'function') {
      // O Express.Router() internamente é uma função com o nome 'router'
      if (route.name === 'router') {
        app.use('/', route);
      } else {
        // Rotas no padrão antigo que recebem a instância do (app) [ex: index_2.js]
        route(app);
      }
    } else {
      // Ignora arquivos que não exportam funções válidas, prevenindo o erro
      console.warn(`[Aviso] O arquivo ${file} não exporta uma função ou Router válido e foi ignorado.`);
    }
  }
});

app.listen(3000, function () {
  console.log("Servidor Rodando!");
});