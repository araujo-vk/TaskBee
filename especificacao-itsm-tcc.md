# Especificação de Sistema ITSM com IA e BI
### Base tecnológica: Node.js + SQL

Este documento apresenta a estrutura de páginas do sistema, o conteúdo funcional de cada uma, e o modelo de dados SQL correspondente.

---

## 1. Visão Geral da Arquitetura de Páginas

| # | Página | Perfil de acesso |
|---|--------|-------------------|
| 1 | Login / Autenticação | Todos |
| 2 | Dashboard (BI) | Técnico / Gestor / Admin |
| 3 | Portal do Solicitante (self-service) | Usuário final |
| 4 | Lista de Chamados/Tickets | Técnico / Gestor |
| 5 | Detalhe do Chamado | Técnico / Gestor / Solicitante |
| 6 | Abertura de Chamado | Usuário final |
| 7 | Base de Conhecimento | Todos |
| 8 | Catálogo de Serviços | Todos |
| 9 | Gestão de Ativos (CMDB) | Técnico / Admin |
| 10 | Gestão de SLA | Gestor / Admin |
| 11 | Assistente de IA (Chatbot) | Todos |
| 12 | Relatórios e BI Avançado | Gestor / Admin |
| 13 | Gestão de Usuários e Permissões | Admin |
| 14 | Configurações do Sistema | Admin |
| 15 | Notificações | Todos |
| 16 | Auditoria e Logs | Admin |

---

## 2. Detalhamento das Páginas

### 2.1 Login / Autenticação
**Conteúdo:**
- Campos: e-mail, senha
- Opção "esqueci minha senha"
- Autenticação em duas etapas (opcional, diferencial para o TCC)
- Redirecionamento por perfil (usuário, técnico, gestor, admin)

**Relacionado ao banco:** tabela `users`, `password_reset_tokens`, `login_logs`

---

### 2.2 Dashboard (BI)
**Conteúdo:**
- Cards com KPIs: chamados abertos, em andamento, resolvidos, SLA estourado
- Gráfico de chamados por categoria/prioridade
- Gráfico de tempo médio de resolução (MTTR)
- Ranking de técnicos por produtividade
- Insights gerados por IA (ex: "Aumento de 30% em chamados de rede esta semana")
- Filtros por período, departamento, categoria

**Relacionado ao banco:** consultas agregadas sobre `tickets`, `sla_tracking`, tabela `ai_insights` para armazenar insights gerados

---

### 2.3 Portal do Solicitante (Self-Service)
**Conteúdo:**
- Meus chamados (abertos/fechados)
- Botão "Abrir novo chamado"
- Busca rápida na base de conhecimento (sugestão de artigos antes de abrir chamado — via IA)
- Status de serviços (indisponibilidades)

---

### 2.4 Lista de Chamados/Tickets
**Conteúdo:**
- Tabela com filtros (status, prioridade, categoria, técnico responsável, SLA)
- Busca textual
- Indicador visual de SLA (verde/amarelo/vermelho)
- Ação em massa (reatribuir, fechar, categorizar)
- Sugestão de priorização automática via IA

**Relacionado ao banco:** tabela `tickets`

---

### 2.5 Detalhe do Chamado
**Conteúdo:**
- Descrição, categoria, prioridade, status
- Histórico de interações (linha do tempo)
- Campo de comentários (interno/público)
- Anexos
- Sugestão automática de solução (IA busca artigos similares na base de conhecimento)
- Classificação automática de categoria/prioridade via IA (com opção de correção manual)
- SLA: tempo restante, tempo decorrido
- Botões: reatribuir, escalar, fechar, reabrir

**Relacionado ao banco:** `tickets`, `ticket_comments`, `ticket_attachments`, `ticket_history`, `ai_classifications`

---

### 2.6 Abertura de Chamado
**Conteúdo:**
- Formulário: título, descrição, categoria, serviço relacionado, anexos
- Sugestão de categoria automática conforme o texto digitado (IA/NLP)
- Sugestão de artigos da base de conhecimento em tempo real

---

### 2.7 Base de Conhecimento
**Conteúdo:**
- Lista de artigos por categoria
- Busca semântica (IA) além da busca por palavra-chave
- Avaliação de utilidade do artigo (útil / não útil)
- Botão "sugerir artigo com IA" a partir de chamados resolvidos (geração assistida de conteúdo)

**Relacionado ao banco:** `kb_articles`, `kb_categories`, `kb_feedback`

---

### 2.8 Catálogo de Serviços
**Conteúdo:**
- Lista de serviços oferecidos pela TI (ex: criação de e-mail, acesso a sistema, troca de equipamento)
- SLA padrão de cada serviço
- Formulário específico por tipo de serviço

**Relacionado ao banco:** `services`, `service_categories`

---

### 2.9 Gestão de Ativos (CMDB)
**Conteúdo:**
- Lista de ativos de TI (computadores, servidores, licenças, periféricos)
- Vínculo do ativo com o usuário e com chamados relacionados
- Histórico de manutenção
- Status (ativo, em manutenção, descartado)

**Relacionado ao banco:** `assets`, `asset_types`, `asset_ticket_link`

---

### 2.10 Gestão de SLA
**Conteúdo:**
- Cadastro de políticas de SLA (tempo de resposta e resolução por prioridade/categoria)
- Relatório de cumprimento de SLA
- Alertas configuráveis (ex: notificar em 80% do tempo consumido)

**Relacionado ao banco:** `sla_policies`, `sla_tracking`

---

### 2.11 Assistente de IA (Chatbot)
**Conteúdo:**
- Interface de chat para o usuário final tirar dúvidas ou abrir chamados por linguagem natural
- Histórico de conversas
- Encaminhamento automático para abertura de chamado quando a IA não resolve
- Registro de acurácia das respostas (para métricas do TCC)

**Relacionado ao banco:** `ai_conversations`, `ai_messages`

---

### 2.12 Relatórios e BI Avançado
**Conteúdo:**
- Relatórios customizáveis (por técnico, categoria, período, SLA)
- Exportação em PDF/Excel
- Painéis comparativos (mês a mês)
- Previsão de demanda futura via IA (ex: modelo simples de séries temporais)

---

### 2.13 Gestão de Usuários e Permissões
**Conteúdo:**
- CRUD de usuários
- Perfis de acesso (RBAC): Admin, Gestor, Técnico, Usuário final
- Departamentos

**Relacionado ao banco:** `users`, `roles`, `permissions`, `departments`

---

### 2.14 Configurações do Sistema
**Conteúdo:**
- Categorias e subcategorias de chamados
- Prioridades
- Parametrização de e-mails/notificações
- Integrações (ex: chave de API da IA)

---

### 2.15 Notificações
**Conteúdo:**
- Central de notificações (chamado atualizado, SLA próximo do vencimento, menção em comentário)
- Configuração de canais (e-mail, sistema)

**Relacionado ao banco:** `notifications`

---

### 2.16 Auditoria e Logs
**Conteúdo:**
- Logs de ações administrativas
- Logs de acesso
- Trilha de auditoria por chamado

**Relacionado ao banco:** `audit_logs`, `login_logs`

