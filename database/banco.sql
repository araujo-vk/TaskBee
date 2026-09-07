CREATE DATABASE IF NOT EXISTS banco;
USE banco;

-- =========================
-- TENANTS (Empresas/Clientes)
-- =========================
CREATE TABLE tenants (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    cnpj VARCHAR(18) UNIQUE NOT NULL, -- Permite buscar pelo CNPJ no Login/Cadastro
    email VARCHAR(150),
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- =========================
-- ACESSOS E ESTRUTURA ORGANIZACIONAL
-- =========================
CREATE TABLE roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL 
);

CREATE TABLE departments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    department_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, email),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (role_id) REFERENCES roles(id),
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- =========================
-- CADASTROS PENDENTES (Aprovação)
-- =========================
CREATE TABLE pending_users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    department_id INT NULL,
    status ENUM('pendente', 'aprovado', 'recusado') DEFAULT 'pendente',
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME NULL,
    processed_by INT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (role_id) REFERENCES roles(id),
    FOREIGN KEY (department_id) REFERENCES departments(id),
    FOREIGN KEY (processed_by) REFERENCES users(id)
);

-- =========================
-- SEGURANÇA E LOGS DE ACESSO
-- =========================
CREATE TABLE password_reset_tokens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE login_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    ip_address VARCHAR(45),
    login_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- =========================
-- CLASSIFICAÇÕES DO ITSM
-- =========================
CREATE TABLE ticket_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    parent_id INT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (parent_id) REFERENCES ticket_categories(id)
);

CREATE TABLE priorities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    name VARCHAR(50) NOT NULL, 
    weight INT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE statuses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    name VARCHAR(50) NOT NULL, 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- =========================
-- CATÁLOGO DE SERVIÇOS
-- =========================
CREATE TABLE service_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE services (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    service_category_id INT,
    default_sla_id INT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (service_category_id) REFERENCES service_categories(id)
);

-- =========================
-- POLÍTICAS DE SLA
-- =========================
CREATE TABLE sla_policies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    priority_id INT NOT NULL,
    response_time_minutes INT NOT NULL,
    resolution_time_minutes INT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (priority_id) REFERENCES priorities(id)
);

-- =========================
-- GESTÃO DE TICKETS (Núcleo)
-- =========================
CREATE TABLE tickets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    type ENUM('incidente','requisicao','problema','mudanca','outro') NOT NULL,
    category_id INT,
    priority_id INT,
    status_id INT NOT NULL DEFAULT 1, 
    service_id INT NULL,
    requester_id INT NOT NULL,
    assigned_to INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
    closed_at DATETIME NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (category_id) REFERENCES ticket_categories(id),
    FOREIGN KEY (priority_id) REFERENCES priorities(id),
    FOREIGN KEY (status_id) REFERENCES statuses(id),
    FOREIGN KEY (service_id) REFERENCES services(id),
    FOREIGN KEY (requester_id) REFERENCES users(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
);

CREATE TABLE sla_tracking (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    ticket_id INT NOT NULL,
    sla_policy_id INT NOT NULL,
    response_due_at DATETIME,
    resolution_due_at DATETIME,
    responded_at DATETIME NULL,
    resolved_at DATETIME NULL,
    breached BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (ticket_id) REFERENCES tickets(id),
    FOREIGN KEY (sla_policy_id) REFERENCES sla_policies(id)
);

CREATE TABLE ticket_comments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    ticket_id INT NOT NULL,
    user_id INT NOT NULL,
    comment TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (ticket_id) REFERENCES tickets(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE ticket_attachments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    ticket_id INT NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    uploaded_by INT NOT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (ticket_id) REFERENCES tickets(id),
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

CREATE TABLE ticket_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    ticket_id INT NOT NULL,
    field_changed VARCHAR(50),
    old_value VARCHAR(255),
    new_value VARCHAR(255),
    changed_by INT,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (ticket_id) REFERENCES tickets(id),
    FOREIGN KEY (changed_by) REFERENCES users(id)
);

-- =========================
-- GESTÃO DE ATIVOS (CMDB)
-- =========================
CREATE TABLE asset_types (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE assets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    asset_type_id INT,
    serial_number VARCHAR(100),
    status ENUM('ativo','manutencao','descartado') DEFAULT 'ativo',
    assigned_to INT NULL,
    acquired_at DATE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (asset_type_id) REFERENCES asset_types(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
);

CREATE TABLE asset_ticket_link (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    asset_id INT NOT NULL,
    ticket_id INT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (asset_id) REFERENCES assets(id),
    FOREIGN KEY (ticket_id) REFERENCES tickets(id)
);

-- =========================
-- BASE DE CONHECIMENTO
-- =========================
CREATE TABLE kb_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE kb_articles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    kb_category_id INT,
    created_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (kb_category_id) REFERENCES kb_categories(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE kb_feedback (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    kb_article_id INT NOT NULL,
    user_id INT NOT NULL,
    is_helpful BOOLEAN,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (kb_article_id) REFERENCES kb_articles(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- =========================
-- INTELIGÊNCIA ARTIFICIAL
-- =========================
CREATE TABLE ai_classifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    ticket_id INT NOT NULL,
    suggested_category_id INT,
    suggested_priority_id INT,
    confidence_score DECIMAL(5,2),
    accepted BOOLEAN DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (ticket_id) REFERENCES tickets(id),
    FOREIGN KEY (suggested_category_id) REFERENCES ticket_categories(id),
    FOREIGN KEY (suggested_priority_id) REFERENCES priorities(id)
);

CREATE TABLE ai_conversations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    user_id INT NOT NULL,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME NULL,
    resulted_in_ticket_id INT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (resulted_in_ticket_id) REFERENCES tickets(id)
);

CREATE TABLE ai_messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    conversation_id INT NOT NULL,
    sender ENUM('user','ai') NOT NULL,
    message TEXT NOT NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id)
);

CREATE TABLE ai_insights (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    insight_text TEXT NOT NULL,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    category VARCHAR(100),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- =========================
-- NOTIFICAÇÕES E AUDITORIA
-- =========================
CREATE TABLE notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    user_id INT NOT NULL,
    title VARCHAR(150),
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    user_id INT,
    action VARCHAR(150) NOT NULL,
    entity VARCHAR(100),
    entity_id INT,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Disable foreign key checks temporarily for a clean insert process
SET FOREIGN_KEY_CHECKS = 0;

-- 1. CLEAR TABLES (Optional - Run these if you need a fresh start)
TRUNCATE TABLE ai_classifications;
TRUNCATE TABLE ticket_history;
TRUNCATE TABLE ticket_comments;
TRUNCATE TABLE sla_tracking;
TRUNCATE TABLE tickets;
TRUNCATE TABLE services;
TRUNCATE TABLE service_categories;
TRUNCATE TABLE sla_policies;
TRUNCATE TABLE statuses;
TRUNCATE TABLE priorities;
TRUNCATE TABLE ticket_categories;
TRUNCATE TABLE pending_users;
TRUNCATE TABLE users;
TRUNCATE TABLE departments;
TRUNCATE TABLE roles;
TRUNCATE TABLE tenants;

SET FOREIGN_KEY_CHECKS = 1;

-- =================================================================
-- 2. TENANTS (Empresas/Clientes)
-- =================================================================
INSERT INTO tenants (id, name, cnpj, email, is_active) VALUES 
(1, 'Ignis Tech Solutions', '12.345.678/0001-90', 'contato@ignis.com', TRUE),
(2, 'Acme Corporation', '98.765.432/0001-10', 'contato@acme.com', TRUE);

-- =================================================================
-- 3. ROLES (Perfis de Acesso)
-- =================================================================
-- Assuming you already have these from your provided snippet, ensuring they exist:
INSERT IGNORE INTO roles (id, name) VALUES 
(1, 'admin'),
(2, 'gestor'),
(3, 'tecnico'),
(4, 'usuario');

-- =================================================================
-- 4. DEPARTMENTS (Departamentos)
-- =================================================================
INSERT INTO departments (id, tenant_id, name) VALUES 
(1, 1, 'Tecnologia da Informação'),
(2, 1, 'Recursos Humanos'),
(3, 1, 'Financeiro e Contabilidade'),
(4, 2, 'Suporte Técnico'),
(5, 2, 'Operações');

-- =================================================================
-- 5. USERS (Usuários)
-- Password for all is '123456' (Use secure hashes in production)
-- =================================================================
-- Tenant 1 (Ignis Tech)
INSERT INTO users (id, tenant_id, name, email, password_hash, role_id, department_id, is_active) VALUES 
(1, 1, 'Administrador Geral', 'admin@ignis.com', '123456', 1, 1, TRUE),
(2, 1, 'Carlos Silva (Gestor TI)', 'gestor@ignis.com', '123456', 2, 1, TRUE),
(3, 1, 'Roberto Santos (Técnico)', 'tecnico@ignis.com', '123456', 3, 1, TRUE),
(4, 1, 'Ana Souza (Solicitante)', 'ana.souza@ignis.com', '123456', 4, 2, TRUE);

-- Tenant 2 (Acme Corp)
INSERT INTO users (id, tenant_id, name, email, password_hash, role_id, department_id, is_active) VALUES 
(5, 2, 'Marcos Oliveira (Admin)', 'admin@acme.com', '123456', 1, 4, TRUE),
(6, 2, 'Fernanda Costa (User)', 'fernanda@acme.com', '123456', 4, 5, TRUE);

-- =================================================================
-- 6. PENDING USERS (Usuários Pendentes)
-- =================================================================
INSERT INTO pending_users (id, tenant_id, name, email, password_hash, role_id, department_id, status) VALUES 
(1, 1, 'Fernando Mendes', 'fernando.mendes@ignis.com', '123456', 4, 2, 'pendente'),
(2, 2, 'João Pedro', 'joao@acme.com', '123456', 4, 5, 'pendente');

-- =================================================================
-- 7. CLASSIFICATIONS (Categorias, Prioridades e Status)
-- =================================================================
INSERT INTO ticket_categories (id, tenant_id, name, parent_id) VALUES 
(1, 1, 'Hardware', NULL),
(2, 1, 'Software', NULL),
(3, 1, 'Redes', NULL),
(4, 1, 'Impressoras', 1);

INSERT INTO priorities (id, tenant_id, name, weight) VALUES 
(1, 1, 'Baixa', 1),
(2, 1, 'Média', 2),
(3, 1, 'Alta', 3),
(4, 1, 'Crítica', 4);

-- Core Statuses expected by the application logic
INSERT INTO statuses (id, tenant_id, name) VALUES 
(1, 1, 'Aberto'),
(2, 1, 'Em Andamento'),
(3, 1, 'Resolvido'),
(4, 1, 'Fechado');

-- =================================================================
-- 8. TICKETS (Chamados de Teste)
-- =================================================================
-- Assuming status_id corresponds to the statuses inserted above
INSERT INTO tickets (id, tenant_id, title, description, type, category_id, priority_id, status_id, requester_id, assigned_to, created_at) VALUES 
(1, 1, 'Impressora do RH não conecta', 'A impressora HP parou de responder.', 'incidente', 4, 2, 1, 4, NULL, DATE_SUB(NOW(), INTERVAL 2 DAY)),
(2, 1, 'Solicitação de monitor extra', 'Preciso de um segundo monitor.', 'requisicao', 1, 1, 2, 4, 3, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(3, 1, 'Sistema ERP lento', 'Demora para gerar relatórios.', 'problema', 2, 3, 1, 4, NULL, DATE_SUB(NOW(), INTERVAL 3 HOUR)),
(4, 1, 'Atualização de Firewall', 'Manutenção programada.', 'mudanca', 3, 4, 3, 1, 2, DATE_SUB(NOW(), INTERVAL 5 DAY));

-- =================================================================
-- 9. TICKET COMMENTS (Comentários em Chamados)
-- =================================================================
INSERT INTO ticket_comments (tenant_id, ticket_id, user_id, comment, is_internal) VALUES
(1, 2, 3, 'O monitor foi solicitado ao fornecedor.', FALSE),
(1, 2, 2, 'Aprovação de orçamento pendente.', TRUE);

select*from users;
