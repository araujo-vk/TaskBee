# TaskBee — plataforma de ITSM

Projeto de Trabalho de Conclusão de Curso em Informática para Internet, desenvolvido para organizar o atendimento de TI de múltiplas empresas. Cada empresa possui seu próprio conjunto de usuários, chamados, serviços, ativos e artigos de conhecimento.

A proposta do TCC reúne **ITSM, inteligência artificial e Business Intelligence**. O gerenciamento de chamados e os recursos administrativos já estão implementados. O AskBee e a integração direta com uma ferramenta de BI são etapas futuras; a aplicação já exporta CSV para análise externa.

## Autoria

- Anna Alice Alustau Siqueira
- Giovanni Oliveira Obata
- Victor Oliveira Araújo

Turma de 2026, 3º Infonet-AMS, Grupo A, Etec Bartolomeu Bueno da Silva — Anhanguera.

## O que está disponível

- Cadastro de empresas e solicitação de cadastro de funcionários, com aprovação pela gestão.
- Login por CNPJ, e-mail e senha; senhas armazenadas com bcrypt e sessões persistidas no MySQL.
- Controle de acesso por empresa e por perfil: administrador, gestor, técnico e solicitante.
- Abertura, busca, filtros, ordenação, paginação e acompanhamento de chamados.
- Separação de chamados ativos e finalizados; atribuição de responsável, comentários públicos e internos, histórico e anexos protegidos.
- Categorias, prioridades, status, catálogo de serviços e políticas de SLA.
- Dashboard com período de análise, indicadores, gráficos e links para listas de chamados.
- Gestão de usuários, departamentos, ativos e registros de auditoria.
- Base de conhecimento com pesquisa, publicação de artigos e avaliação de utilidade.
- Notificações na aplicação e avisos temporários de notificações recentes e conquistas.
- Exportação CSV de chamados, SLA, usuários e departamentos; importação de departamentos e funcionários.
- Interface responsiva com fonte Lexend, identidade de abelhas/colmeia, modos claro e escuro e temas desbloqueáveis.

## Tecnologias

| Camada | Tecnologias |
| --- | --- |
| Servidor | Node.js, Express 5, JavaScript CommonJS |
| Interface | EJS, HTML, CSS e JavaScript |
| Dados | MySQL, driver `mysql2` |
| Autenticação | `bcrypt`, `express-session` e armazenamento de sessões no MySQL |
| Gráficos | Chart.js, carregado por CDN |
| Fonte | Google Fonts — Lexend |

Não existe etapa de compilação do frontend. As páginas são renderizadas no servidor.

## Preparar o ambiente

Tenha Node.js e npm instalados, um servidor MySQL em execução e um navegador atualizado. A revisão de desenvolvimento utilizou Node.js 24; as dependências atuais exigem pelo menos Node.js 18. Para o banco, utilize MySQL com suporte a InnoDB e chaves estrangeiras; compatibilidade com outros bancos não foi validada.

O Git é necessário para clonar o repositório. Se baixar o ZIP pelo GitHub, extraia-o antes de seguir os próximos passos. É necessária conexão com a internet para instalar dependências e carregar Chart.js e a fonte externa.

### 1. Baixar e instalar

```sh
git clone https://github.com/araujo-vk/IGNIS.git TaskBee
cd TaskBee
npm ci
```

`npm ci` instala todas as dependências usando o `package-lock.json`. Não é necessário instalar os pacotes individualmente. Execute os comandos a partir da raiz do projeto, onde está `app.js`.

### 2. Configurar o arquivo de ambiente

No PowerShell:

```powershell
Copy-Item .env.example .env
```

No Linux/macOS:

```sh
cp .env.example .env
```

Edite `.env` com as credenciais do seu MySQL e uma chave de sessão própria:

```dotenv
NODE_ENV=development
PORT=3000
SESSION_SECRET=substitua-por-uma-chave-longa-e-aleatoria
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua-senha-local
DB_NAME=banco
```

Para gerar uma chave, execute e copie o resultado para `SESSION_SECRET`:

```sh
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

| Variável | Uso |
| --- | --- |
| `NODE_ENV` | Use `development` para testar em HTTP local. Em `production`, o cookie de sessão exige HTTPS. |
| `PORT` | Porta HTTP da aplicação; padrão `3000`. |
| `SESSION_SECRET` | Chave usada pela sessão. Obrigatória em produção; configure também no ambiente local. |
| `DB_HOST`, `DB_PORT` | Endereço e porta do MySQL. |
| `DB_USER`, `DB_PASSWORD` | Credenciais do banco, independentes das contas de demonstração do site. |
| `DB_NAME` | Banco utilizado pela aplicação. O script fornecido cria `banco`. |
| `DB_CONNECTION_LIMIT` | Opcional; limite do pool de conexões, padrão `10`. |

O arquivo `.env` é carregado pelo próprio projeto e está ignorado pelo Git. Variáveis já definidas no ambiente têm precedência. A opção `ENABLE_DEV_ADMIN` ainda presente no exemplo é antiga e não controla mais o acesso: `/admin` exige uma sessão de qualquer perfil.

### 3. Criar o banco e carregar a demonstração

**O script [database/banco.sql](database/banco.sql) apaga e recria as tabelas do TaskBee, incluindo os dados e as sessões existentes. Faça backup se quiser preservar informações.** Use-o em um banco de desenvolvimento.

No MySQL Workbench, abra esse arquivo e execute o script completo em uma conexão com permissão para criar banco, tabelas e inserir registros. O arquivo já contém `CREATE DATABASE` e `USE banco`.

Alternativamente, abra o cliente MySQL no terminal:

```sh
mysql -u root -p --default-character-set=utf8mb4
```

Dentro do cliente, informe o caminho absoluto do arquivo, usando barras `/`:

```sql
SOURCE C:/caminho/TaskBee/database/banco.sql;
```

No Linux/macOS, adapte para um caminho como `/caminho/TaskBee/database/banco.sql`.

Se escolher outro nome de banco, ajuste tanto `CREATE DATABASE`/`USE` no SQL quanto `DB_NAME` no `.env`. Há um único script de instalação e demonstração; não é necessário executar migrações separadas.

A carga contém **2 empresas, 11 departamentos, 14 usuários, 5 solicitações de cadastro, 64 chamados, 8 ativos e 8 artigos**, além de serviços, prioridades, SLA, comentários, históricos, notificações e auditoria. As datas usam o momento de execução do SQL, com registros distribuídos ao longo dos últimos meses. Alguns usuários possuem tempo de conta maior para demonstrar conquistas; uma conta está inativa para testar a gestão de acesso.

Os anexos não são simulados: envie arquivos reais pela tela de detalhes do chamado. Eles ficam em `storage/tickets`, que precisa ter permissão de escrita. O conteúdo dessa pasta não é enviado ao Git; preserve-o junto com o banco se fizer backup.

### 4. Iniciar e acessar

```sh
npm start
```

Também é possível usar `node app.js`. Mantenha o terminal aberto e acesse [http://localhost:3000](http://localhost:3000). Se alterar `PORT`, adapte o endereço.

Use `Ctrl + C` para parar. O projeto não inclui recarga automática: alterações no servidor ou no `.env` exigem reiniciar o processo. Depois de mudanças em CSS/JavaScript, atualize o navegador com `Ctrl + F5`.

### 5. Conferir o painel de apresentação em um clone

**Limitação atual do repositório:** `.gitignore` exclui `app/views/admin.ejs`. Esse arquivo pode existir na cópia de desenvolvimento e não vir no clone/ZIP. A rota `/admin` está em `app/routes/index.js`; sem o template, ela apresenta erro de renderização. As demais páginas podem ser usadas normalmente.

Para habilitar uma versão mínima do painel, crie `app/views/admin.ejs` com este conteúdo:

```ejs
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Apresentação — TaskBee</title>
  <link rel="stylesheet" href="/css/global.css">
  <%- include('partials/appearance') %>
</head>
<body>
  <%- include('partials/header') %>
  <main id="conteudo-principal" class="pagina-pendente">
    <h1>Painel de apresentação</h1>
    <p><a href="/chamados">Chamados</a> · <a href="/configuracoes-user">Personalização</a></p>
    <section class="codigo-temas">
      <h2>Resgatar código</h2>
      <form action="/admin/codigo" method="POST">
        <input type="hidden" name="_csrf" value="<%= locals.csrfToken %>">
        <label for="codigo">Código</label>
        <input id="codigo" name="codigo" required maxlength="32">
        <button type="submit">Resgatar</button>
      </form>
      <% if (locals.codigo) { %>
        <p role="status"><%= codigo === 'aceito' ? 'Temas desbloqueados.' : 'Código inválido ou indisponível.' %></p>
      <% } %>
    </section>
  </main>
  <%- include('partials/footer') %>
</body>
</html>
```

## Primeiro acesso e contas de teste

Todas as contas da carga de demonstração usam a senha **`123456`**. Essa senha curta é exclusiva dos dados fictícios; novos cadastros, importações e alterações de senha exigem pelo menos 8 caracteres.

Informe o CNPJ com a mesma pontuação da tabela:

| Empresa | CNPJ | E-mail | Perfil |
| --- | --- | --- | --- |
| Ignis Tech Solutions | `12.345.678/0001-90` | `admin@ignis.com` | Administrador |
| Ignis Tech Solutions | `12.345.678/0001-90` | `gestor@ignis.com` | Gestor |
| Ignis Tech Solutions | `12.345.678/0001-90` | `tecnico@ignis.com` | Técnico |
| Ignis Tech Solutions | `12.345.678/0001-90` | `ana.souza@ignis.com` | Solicitante |
| Acme Corporation | `98.765.432/0001-10` | `admin@acme.com` | Administrador |
| Acme Corporation | `98.765.432/0001-10` | `camila@acme.com` | Gestor |
| Acme Corporation | `98.765.432/0001-10` | `rafael@acme.com` | Técnico |
| Acme Corporation | `98.765.432/0001-10` | `fernanda@acme.com` | Solicitante |

Após o login, administradores e gestores são encaminhados ao Dashboard; técnicos e solicitantes vão para Chamados. Também é possível cadastrar uma empresa nova em `/cadastro-empresa` ou solicitar vínculo a uma empresa em `/cadastro` e aprová-lo pela gestão.

## Páginas e permissões

| Área | Quem pode acessar |
| --- | --- |
| `/index`, `/sobre`, `/login`, `/cadastro`, `/cadastro-empresa`, `/erro/:codigo` | Visitantes e usuários autenticados |
| `/chamados`, `/chamados/novo`, `/chamados/:id`, `/portal-solicitante` | Todos os perfis autenticados; solicitantes consultam apenas seus próprios chamados |
| `/catalogo-servicos`, `/base-de-conhecimento`, `/notificacoes`, `/configuracoes-user` | Todos os perfis autenticados, dentro da própria empresa |
| `/dashboard`, `/gestao-ativos` | Administrador, gestor e técnico |
| `/gestao-usuarios`, `/gestao-cadastros`, `/gestao-sla`, `/logs`, `/config-sistema` | Administrador e gestor |
| `/admin` | Todos os perfis autenticados; é um índice de desenvolvimento/apresentação |
| `/IA` e `/IA/relatorios` | Página de preparação para todos os perfis autenticados; relatórios reservados a administrador e gestor |

Técnicos, gestores e administradores podem atribuir responsáveis, alterar status, publicar artigos e registrar comentários internos. A opção de arquivar chamados é reservada a administradores e gestores. Abrir `/admin` não concede acesso às áreas restritas listadas nele.

A rota `/` encaminha visitantes ao login e usuários autenticados aos chamados. `/index` é uma apresentação secundária, disponível por endereço direto e pelo logotipo para visitantes; ela não é a entrada padrão do sistema e envia a orientação `noindex, nofollow` aos mecanismos de busca.

Sem sessão, páginas internas redirecionam ao login e APIs retornam `401`. Perfis sem autorização são encaminhados à página de erro `403`; recursos não encontrados ou sem acesso podem retornar `404`. As sessões duram aproximadamente uma hora e as contas são revalidadas durante o uso. Após cinco falhas de login para a combinação de IP/identificação, novas tentativas ficam bloqueadas por até 15 minutos.

## Roteiro para explorar a aplicação

1. Entre como administrador da Ignis e observe os indicadores, períodos e gráficos do Dashboard.
2. Abra `/chamados`, use a busca e os filtros e alterne entre **Em aberto**, **Fechados** e **Todos**. A visualização inicial esconde os finalizados.
3. Crie um chamado pelo catálogo ou pelo botão de novo chamado. A prioridade e o serviço participam da definição do SLA.
4. Nos detalhes, atribua um responsável, adicione comentários, envie um anexo e altere o status. Compare com a mesma tela acessada como solicitante para conferir o escopo e os comentários internos.
5. Consulte a base de conhecimento, avalie um artigo e acompanhe as notificações.
6. Teste gestão de usuários, aprovação de cadastros, ativos, categorias e SLA com um perfil autorizado.
7. Saia e entre na Acme para observar o isolamento dos dados entre empresas.

Os anexos aceitam **PNG, JPG, PDF e TXT, com até 2 MB por arquivo**. O download exige sessão e permissão para acessar o chamado.

## CSV e análise de dados

As exportações ficam disponíveis pelos botões das telas ou pelas rotas:

| Exportação | Rota | Perfis |
| --- | --- | --- |
| Chamados | `/exportar/chamados.csv` | Administrador, gestor e técnico |
| SLA | `/exportar/sla.csv` | Administrador e gestor |
| Funcionários | `/gestao-usuarios/exportar/usuarios.csv` | Administrador e gestor |
| Departamentos | `/gestao-usuarios/exportar/departamentos.csv` | Administrador e gestor |

Os arquivos usam ponto e vírgula e dados da empresa da sessão. A exportação de chamados é uma listagem geral da empresa, sem aplicar automaticamente os filtros visuais do Dashboard. Os CSV podem ser usados em uma ferramenta de BI; não há uma conexão direta com um provedor de BI implementada.

Para importar, use a seção **Dados em lote** de `/gestao-usuarios`. Salve os arquivos em UTF-8, separados por `;`, com os cabeçalhos abaixo.

Departamentos:

```csv
Nome
Atendimento ao Cliente
Compras
```

Funcionários:

```csv
Nome;E-mail;Senha;Departamento;Perfil
Pessoa de Teste;pessoa.teste@example.com;Teste12345;Compras;usuario
```

Importe os departamentos primeiro: o nome informado para cada funcionário deve corresponder a um departamento já cadastrado na empresa. Perfis aceitos incluem `admin`, `gestor`, `tecnico` e `usuario`; o importador impede conceder um perfil superior ao de quem faz a importação.

O limite é de 1 MB por conteúdo CSV, até 500 departamentos ou 200 funcionários por importação. Linhas inválidas, duplicadas ou excedentes são ignoradas e contabilizadas no retorno. A exportação de funcionários não inclui senhas; portanto, para reimportá-la, prepare um arquivo com o formato acima e senhas iniciais válidas.

## Temas e personalização

Escolha a aparência em `/configuracoes-user`. O seletor mostra apenas as opções desbloqueadas, agrupadas no menu. Há dois padrões permanentes — claro e escuro — além da opção automática do dispositivo e **30 temas desbloqueáveis**:

- 13 sazonais, de dezembro de 2026 a dezembro de 2027. Acessar com sessão durante o mês correspondente concede o tema permanentemente.
- 15 temas de conquistas e tempo de conta. As missões ficam ocultas na interface; um aviso breve informa o desbloqueio. Conquistas de idade são conferidas ao abrir Configurações.
- 2 temas secretos: **Lucky Hive**, em `/erro/777`, e **Chaleira da Rainha**, em `/erro/418`. Atualmente, visitar essas rotas com sessão libera as aparências; as mecânicas de jogo ainda não foram implementadas.

O código de apresentação **`TCC2026`**, resgatado em `/admin`, libera os temas sazonais e de conquistas para a conta atual. Ele não libera os dois temas secretos. O tema associado à primeira pergunta ao AskBee está cadastrado, mas sua missão depende da futura integração do assistente.

Para alterar o visual no código:

- `config/themes.js`: IDs, cores, modo claro/escuro, padrão de fundo e tokens derivados. Preserve os IDs para manter os desbloqueios já salvos.
- `config/themePatterns.js`: motivos vetoriais de fundo, coloridos pela paleta, como abelhas, favos, flores e desenhos sazonais.
- `public/css/global.css`: base e variáveis de segurança; `public/css/interface.css`: componentes compartilhados e ajustes responsivos.
- `public/css/header.css` e `footer.css`: navegação e rodapé; os demais CSS organizam os layouts específicos.
- `public/js/appearance.js` e `app/views/partials/appearance.ejs`: aplicação da aparência, persistência e atualização dos componentes.

Os pares de cores verificados em `test/themePalette.test.js` devem manter contraste mínimo de 4,5:1. Isso é uma verificação dos tokens e não substitui uma revisão visual completa de acessibilidade.

## Estrutura do repositório

```text
TaskBee/
├── app/
│   ├── routes/                 # Rotas e operações da aplicação
│   └── views/                  # Templates EJS, erros e partials
├── config/                     # Ambiente, sessão, permissões, CSV e temas
├── database/
│   └── banco.sql               # Recriação da estrutura e carga de demonstração
├── public/
│   ├── css/                    # Base visual e layouts
│   └── js/                     # Comportamento da aparência
├── storage/tickets/            # Arquivos de anexos; conteúdo ignorado pelo Git
├── test/                       # Testes automatizados
├── .env.example                # Modelo de configuração
├── app.js                      # Inicialização, sessão e carregamento das rotas
├── db.js                       # Pool de conexões com o MySQL
├── package.json
└── package-lock.json
```

As rotas são carregadas automaticamente a partir de `app/routes`. O arquivo `error.js` é registrado por último para que o tratamento de páginas inexistentes não intercepte rotas válidas.

## Verificações disponíveis

```sh
npm test
npm run check
```

Os testes cobrem cenários de autenticação, permissões, segurança de requisições, CSV, notificações e contraste das paletas. Eles não substituem testes completos com um banco real e navegação no sistema. `npm run check` verifica somente a sintaxe de `app.js`.

## Problemas comuns

| Sintoma | O que conferir |
| --- | --- |
| `Cannot find module` | Execute `npm ci` na raiz e confira a instalação do Node.js. |
| `ECONNREFUSED` ou erro de conexão com o banco | Inicie o MySQL e confira `DB_HOST`, `DB_PORT` e o serviço escolhido. |
| `Access denied for user` | Revise `DB_USER`, `DB_PASSWORD` e as permissões da conta do MySQL. |
| `Unknown database` ou tabela inexistente | Execute o SQL completo e confira se `DB_NAME` corresponde ao banco criado. |
| Erro citando `user_sessions` ou `user_themes` | A estrutura do banco está ausente ou antiga; o script único contém essas tabelas. Lembre que reexecutá-lo apaga os dados anteriores. |
| Login sem persistência | Use `NODE_ENV=development` em HTTP local, confira a tabela de sessões e permita cookies no navegador. |
| Empresa ou senha incorreta | Use o CNPJ pontuado da tabela de demonstração, o e-mail da mesma empresa e a senha de teste; confirme que a conta está ativa. |
| `429` no login | Aguarde a janela de bloqueio de até 15 minutos após as tentativas inválidas. |
| `EADDRINUSE` | Pare o outro processo na porta ou ajuste `PORT` e reinicie o servidor. |
| Erro em `/admin` no clone | Confira a seção sobre o template ignorado pelo Git e crie a versão mínima indicada. |
| Erro ao salvar ou baixar anexo | Confira as permissões de `storage/tickets`, o limite e formato do arquivo e se os arquivos foram preservados junto com o banco. |
| Gráficos ou fonte não carregam | Confira o acesso à CDN do Chart.js e ao Google Fonts. |
| Visual antigo ou comportamento diferente após alterações | Reinicie o servidor quando necessário e atualize o navegador com `Ctrl + F5`. |
| `403` ao enviar formulário ou usar uma API | Confira a sessão e o token CSRF; formulários usam `_csrf` e chamadas JavaScript usam `x-csrf-token`. |

## Escopo acadêmico e evolução

O ambiente fornecido é de demonstração, com dados e credenciais públicos de teste. Não use dados pessoais reais nas apresentações. A instalação local não equivale a uma implantação pronta para produção: publicar exige revisar credenciais, conta de banco, HTTPS, armazenamento e backup dos anexos, proteção do painel/código de apresentação e a configuração do servidor.

As páginas AskBee, relatórios de IA e configuração geral do sistema ainda possuem áreas de preparação. Há tabelas e exemplos fictícios relacionados à IA na carga SQL; eles não representam um serviço de IA conectado. Não é necessário configurar chaves de API de IA ou conta de ferramenta de BI para executar a versão atual.

O campo `license` do `package.json` declara `ISC`.
