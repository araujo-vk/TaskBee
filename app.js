require('./config/env');
var app = require('./config/express')();
app.locals.themeCatalog = [...require('./config/themes').defaults, ...require('./config/themes').themes];
const express = require('express');
const db = require('./db');
const bancoMiddleware = require('./config/bancoMiddleware');
const authMiddleware = require('./config/authMiddleware');
const session = require('express-session');
const MySqlSessionStore = require('./config/mysqlSessionStore');
const { cabecalhosSeguranca, protegerRequisicoes } = require('./config/securityMiddleware');
const sessionSecret = process.env.SESSION_SECRET
  || (process.env.NODE_ENV === 'production' ? null : 'taskbee-local-development-secret');

if (!sessionSecret) {
  throw new Error('SESSION_SECRET precisa ser configurada em produção.');
}

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// 1. Middlewares de requisição
app.use(express.urlencoded({ extended: true, limit: '4mb' }));
app.use(express.json());
app.use(cabecalhosSeguranca);

// 2. SESSÃO VEM ANTES DA AUTENTICAÇÃO!
app.use(session({
  store: new MySqlSessionStore(db),
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  }
}));
app.use(protegerRequisicoes);

// ... (Seus outros imports e configurações iniciais)

// 3. O banco precisa estar disponível antes da autenticação para validar
// sessões antigas e contas que foram desativadas.
app.use(bancoMiddleware);
app.use(authMiddleware);
app.use(require('./config/themeProgress'));

// REMOVIDO: A linha require('./app/routes/index')(app); foi apagada 
// para evitar que a rota index seja carregada duas vezes, já que o loop fará isso.

const fs = require('fs');
const path = require('path');

// Caminho absoluto para a pasta de rotas
const routesPath = path.join(__dirname, 'app/routes');

// Lê todos os arquivos dentro da pasta
fs.readdirSync(routesPath)
  .filter(file => file.endsWith('.js') && file !== 'error.js')
  .sort()
  .forEach((file) => {
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
  });

// Rotas de fallback e tratamento de erros precisam ser registradas após as rotas da aplicação.
require(path.join(routesPath, 'error.js'))(app);

const porta = Number(process.env.PORT || 3000);
const servidor = app.listen(porta, function () {
  console.log(`Servidor Rodando na porta ${porta}!`);
});

async function encerrarServidor() {
  servidor.close(async () => {
    await db.end();
    process.exit(0);
  });
}

process.on('SIGINT', encerrarServidor);
process.on('SIGTERM', encerrarServidor);
