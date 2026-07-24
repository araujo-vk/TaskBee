# Roadmap de Desenvolvimento — ITSM Multi-Tenant com IA e BI

Banco de dados pronto (`banco_multitenant.sql`). Este roadmap assume esse ponto de partida e organiza o desenvolvimento em fases sequenciais, cada uma com objetivo claro, tarefas e critério de "pronto".

---

## Fase 0 — Preparação do ambiente
**Objetivo:** ter o esqueleto do projeto rodando antes de escrever regra de negócio.

- [ ] Instalar Node.js LTS, MySQL (ou trocar para PostgreSQL, se decidir usar RLS depois)
- [ ] Criar repositório Git com `.gitignore` (node_modules, .env)
- [ ] Rodar `banco_multitenant.sql` localmente e validar que todas as tabelas foram criadas sem erro
- [ ] Iniciar projeto Node: `npm init`, instalar Express
- [ ] Escolher e configurar o ORM (recomendado: **Prisma** — rodar `prisma init` e apontar para o banco existente com `prisma db pull` para gerar o schema automaticamente a partir do SQL)
- [ ] Configurar variáveis de ambiente (`.env`): conexão do banco, segredo do JWT

**Critério de pronto:** `npm run dev` sobe um servidor Express que responde em uma rota de teste (`/health`) e o Prisma consegue ler as tabelas do banco.

---

## Fase 1 — Autenticação e Multi-Tenant
**Objetivo:** validar a arquitetura multi-tenant de ponta a ponta antes de construir qualquer outra funcionalidade.

- [ ] Endpoint de cadastro de tenant (`POST /tenants`) — cria a empresa e já popula `priorities`, `statuses`, `ticket_categories` padrão para aquele tenant
- [ ] Endpoint de cadastro de usuário dentro de um tenant (`POST /auth/register`)
- [ ] Endpoint de login (`POST /auth/login`) — gera JWT contendo `user_id`, `tenant_id` e `role`
- [ ] Middleware de autenticação — lê o JWT e injeta `req.tenantId` e `req.userId` em toda requisição
- [ ] Middleware de autorização por papel (ex: só admin pode acessar certas rotas)
- [ ] Testar manualmente: criar 2 tenants diferentes, criar usuários com o mesmo e-mail em cada um, confirmar que não há conflito

**Critério de pronto:** login funcionando, e uma consulta simples (ex: listar usuários) só retorna dados do tenant do usuário logado — nunca de outro tenant.

---

## Fase 2 — CRUD de Tickets (núcleo do sistema)
**Objetivo:** ter o fluxo principal do ITSM funcionando.

- [ ] `POST /tickets` — abrir chamado (sempre gravando `tenant_id` do usuário logado)
- [ ] `GET /tickets` — listar com filtros (status, prioridade, categoria)
- [ ] `GET /tickets/:id` — detalhe do chamado
- [ ] `PATCH /tickets/:id` — atualizar status/prioridade/responsável, gravando em `ticket_history`
- [ ] `POST /tickets/:id/comments` — comentários (internos e públicos)
- [ ] Upload de anexos (`ticket_attachments`) — pode usar armazenamento local no início, S3/equivalente depois
- [ ] Front-end básico: tela de lista e tela de detalhe (mesmo que só funcional, sem estilo refinado ainda)

**Critério de pronto:** um usuário consegue abrir um chamado, um técnico consegue vê-lo, comentar e mudar o status, tudo respeitando o isolamento por tenant.

---

## Fase 3 — SLA e Catálogo de Serviços
**Objetivo:** dar peso operacional ao chamado.

- [ ] `POST /sla-policies` — cadastro de políticas de SLA por prioridade
- [ ] Lógica que, ao criar um ticket, calcula automaticamente `response_due_at` e `resolution_due_at` em `sla_tracking`
- [ ] Job/rotina (pode ser um `setInterval` simples no início, ou um cron job) que verifica tickets com SLA estourado e marca `breached = true`
- [ ] Catálogo de serviços (`services`) com formulário de abertura de chamado vinculado a um serviço específico

**Critério de pronto:** ao abrir um chamado de prioridade "crítica", o sistema já mostra o prazo de resposta/resolução calculado, e chamados vencidos aparecem sinalizados.

---

## Fase 4 — Base de Conhecimento
**Objetivo:** funcionalidade mais isolada, boa para ganhar tração rápida no projeto.

- [ ] CRUD de artigos (`kb_articles`, `kb_categories`)
- [ ] Busca por palavra-chave (`LIKE` no SQL é suficiente nesse estágio)
- [ ] Botão de feedback (útil / não útil) gravando em `kb_feedback`

**Critério de pronto:** usuário consegue buscar e avaliar um artigo antes de abrir um chamado.

---

## Fase 5 — Integração com IA
**Objetivo:** o diferencial central do TCC. Só faça esta fase depois de ter tickets reais (ou simulados) no banco — a IA precisa de dado para classificar.

- [ ] Escolher a API de IA (ex: Anthropic API) e configurar a chave em variável de ambiente
- [ ] Endpoint que, ao abrir um chamado, envia título+descrição para a IA e recebe sugestão de categoria/prioridade → grava em `ai_classifications`
- [ ] Tela para o técnico aceitar ou corrigir a sugestão → atualiza o campo `accepted`
- [ ] Chatbot básico: endpoint que mantém uma `ai_conversations`/`ai_messages`, e ao final oferece "quer abrir um chamado com base nessa conversa?"
- [ ] Buscar na base de conhecimento antes de responder (RAG simples: pegar artigos relevantes e mandar como contexto para a IA)

**Critério de pronto:** você consegue abrir um chamado e ver, na tela, a sugestão de categoria feita pela IA — e esse dado fica salvo para você medir a taxa de acerto depois, no TCC.

---

## Fase 6 — BI / Dashboard
**Objetivo:** visualização dos dados operacionais.

- [ ] Queries agregadas: chamados por status, por categoria, tempo médio de resolução, % de SLA cumprido
- [ ] Endpoint de métricas (`GET /dashboard/metrics`)
- [ ] Front-end com gráficos (Recharts ou Chart.js)
- [ ] Geração de `ai_insights` periódica (ex: comparar volume da semana atual com a anterior e gerar um texto simples de observação)

**Critério de pronto:** o dashboard mostra pelo menos 3-4 indicadores visuais reais, puxados do banco populado nas fases anteriores.

---

## Fase 7 — Módulos complementares
**Objetivo:** completar o escopo, menor risco técnico, pode ser paralelizado se houver mais de uma pessoa no projeto.

- [ ] CMDB (`assets`, `asset_types`, vínculo com tickets)
- [ ] Notificações (in-app; e-mail é opcional/bônus)
- [ ] Auditoria (`audit_logs`) — logar ações administrativas relevantes
- [ ] Tela de configurações (categorias, prioridades, SLA por tenant)

---

## Fase 8 — Testes, deploy e fechamento do TCC
**Objetivo:** ter um sistema demonstrável e dados para a monografia.

- [ ] Testes automatizados para o isolamento entre tenants (o mais crítico de todos — um vazamento de dado entre empresas invalida o projeto)
- [ ] Popular o banco com dados simulados de 2-3 tenants para a demo
- [ ] Deploy (Railway, Render ou similar) com banco gerenciado
- [ ] Coletar métricas reais da IA (taxa de aceitação das sugestões, tempo médio de resolução antes/depois da IA) para os resultados do TCC
- [ ] Revisar documentação do projeto (README, diagrama ER, este roadmap) como anexos da monografia

---

## Ordem recomendada resumida

```
Fase 0 → Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5 → Fase 6 → Fase 7 → Fase 8
(setup)  (auth)   (tickets) (SLA)   (KB)     (IA)     (BI)    (extras) (fechamento)
```

**Regra prática:** não pule para a Fase 5 (IA) sem ter a Fase 2 (tickets) sólida — sem dado real de chamado, não tem o que classificar, e a demonstração da IA fica artificial.










## Observações para o TCC

- **IA:** as tabelas `ai_classifications`, `ai_conversations`, `ai_messages` e `ai_insights` permitem medir e justificar academicamente a eficácia da IA (taxa de aceitação de sugestões, acurácia de classificação, redução de tempo de abertura de chamado).
- **BI:** os dados de `tickets`, `sla_tracking` e `ai_insights` alimentam os dashboards; vale considerar uma tabela de "fatos" agregada (`ticket_metrics_daily`) se o volume de dados crescer, para não sobrecarregar consultas em tempo real.
- **Stack sugerida:** Node.js (Express) para API REST, um ORM como Sequelize ou Prisma para mapear essas tabelas, e uma lib de gráficos no front (Chart.js, Recharts) para o BI.
- Este modelo é relacional (3ª forma normal), adequado para MySQL/PostgreSQL. Ajustes de tipos (ex: `ENUM` não existe no PostgreSQL da mesma forma) podem ser necessários dependendo do SGBD escolhido.

Toda query no back-end precisa ser filtrada por tenant. Na prática, isso vira um **middleware** que roda antes de qualquer rota:

```javascript
// middleware/tenant.js
function resolveTenant(req, res, next) {
  const subdomain = req.hostname.split('.')[0]; // empresa1.itsm.com -> "empresa1"
  // ou, em APIs, ler de um header/JWT:
  // const tenantId = req.user.tenant_id;
  req.tenantId = /* buscar tenant pelo subdomain no banco */;
  next();
}
```

E toda consulta ao banco passa a incluir `WHERE tenant_id = ?`. Com um ORM (explicado na Parte 3), dá pra automatizar isso com um "escopo global" em vez de repetir manualmente em cada query.