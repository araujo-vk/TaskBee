# 🚀 Sistema de Gestão de Serviços de TI (ITSM Multi-tenant)

Projeto desenvolvido para o **Trabalho de Conclusão de Curso (TCC) em Informática Para Internet**. 

Tema: ITSM + IA + BI

A aplicação consiste em uma plataforma de ITSM (Information Technology Service Management) voltada para o gerenciamento de chamados, suporte técnico, catálogo de serviços e controle de ativos de TI, construída sob uma arquitetura **multi-tenant** (suporte a múltiplas empresas de forma isolada).

---
## 🎓 Alunos Responsáveis

- **Anna Alice Alustau Siqueira**
- **Giovanni Oliveira Obata**
- **Victor Oliveira Araújo**

#### Alunos da turma de 2026 do 3° Infonet-AMS Grupo A da Etec Bartolomeu Bueno da Silva - Anhanguera

---
## 📌 Funcionalidades Principais 

- **Arquitetura Multi-Tenant:** Isolamento de dados por empresa via CNPJ.
- **Solicitação e Acesso:**
  - Cadastro de empresas (Tenants).
  - Fila de aprovação de novos usuários (`pending_users`) com moderação feita por administradores.
- **Autenticação e Permissões:**
  - Sistema de Login unificado.
  - Controle de acesso baseado em papéis (*Role-Based Access Control* - Admin, Gestor, Técnico, Usuário).
  - Gerenciamento de sessões de usuário no servidor.
- **Gestão de TI:**
  - Abertura e acompanhamento de tickets/chamados.
  - Vínculo de chamados a departamentos e serviços.
  - Gestão básica de ativos (CMDB) e base de conhecimento.
- **Integração com IA:**
  - Para o projeto temos como meta a implementação de um chatbot no site, e de um sistema de recomendações na hora de abrir chamados.
- **Integração com BI**
  - Sistema onde Gestores podem exportar as informações da plataforma diretamente para uma ferramenta de BI

---

## 🛠️ Tecnologias Utilizadas

- **Backend:** Node.js, Express.js
- **Frontend / Template Engine:** EJS (Embedded JavaScript), HTML5, CSS3
- **Banco de Dados:** MySQL
- **Controle de Versão:** Git & GitHub

---

## 📁 Estrutura do Projeto

```text
├── app/
│   ├── routes/          # Arquivos de rotas do Express (carregamento dinâmico)
│   └── views/           # Páginas e views renderizadas pelo EJS
├── config/
│   ├── express.js       # Configuração e inicialização do Express
│   ├── bancoMiddleware.js # Injeção da conexão MySQL na requisição
│   ├── authMiddleware.js  # Proteção de rotas e validação de sessão
│   └── roleMiddleware.js  # Restrição por nível de permissão
├── app.js               # Ponto de entrada da aplicação
├── db.js                # Configuração do Pool do MySQL
├── banco.sql            # Script SQL de criação da estrutura do banco de dados
└── .gitignore           # Ignora node_modules e arquivos sensíveis

```

---

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos

* [Node.js](https://nodejs.org/) instalado.
* Servidor [MySQL](https://www.mysql.com/) rodando localmente.

### Passo a Passo

1. **Clonar o Repositório:**
```
git clone [https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git](https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git)
cd SEU-REPOSITORIO

```


2. **Instalar as Dependências:**
```
npm install express
npm install ejs
npm install mysql2
npm install express-session

```


3. **Configurar o Banco de Dados:**
* Abra seu SGBD (Foi usado o MySQL Workbench nesse projeto).
* Execute o script contido no arquivo `banco.sql` para criar o banco de dados e as tabelas.
* Abra o arquivo `db.js` na raiz do projeto e ajuste as credenciais do seu MySQL (`host`, `user`, `password`).


4. **Iniciar o Servidor:**
```bash
node app.js

```


5. **Acessar no Navegador:**
Acesse `http://localhost:3000/` para utilizar o sistema.

---