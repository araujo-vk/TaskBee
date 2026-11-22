CREATE DATABASE IF NOT EXISTS banco;
USE banco;

-- Ambiente de demonstração: recria todas as tabelas do TaskBee e apaga os dados anteriores.
-- Faça backup antes de executar em um banco com informações que deseja preservar.
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS audit_logs, notifications, ai_insights, ai_messages,
  ai_conversations, ai_classifications, kb_feedback, kb_articles, kb_categories,
  asset_ticket_link, assets, asset_types, ticket_history, ticket_attachments,
  ticket_comments, sla_tracking, tickets, services, service_categories,
  sla_policies, statuses, priorities, ticket_categories, login_logs,
  user_sessions, password_reset_tokens, pending_users, user_themes,
  users, departments, roles, tenants;
SET FOREIGN_KEY_CHECKS = 1;

-- =================================================================
-- ESTRUTURA DO BANCO DE DADOS (COM MELHORIAS PARA TELAS FUTURAS)
-- =================================================================

CREATE TABLE IF NOT EXISTS tenants (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    cnpj VARCHAR(18) UNIQUE NOT NULL,
    email VARCHAR(150),
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL 
);

CREATE TABLE IF NOT EXISTS departments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    UNIQUE KEY uq_departments_tenant_name (tenant_id, name),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    department_id INT,
    tema VARCHAR(64) DEFAULT 'system',
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, email),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (role_id) REFERENCES roles(id),
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE TABLE IF NOT EXISTS user_themes (
    tenant_id INT NOT NULL,
    user_id INT NOT NULL,
    theme_id VARCHAR(64) NOT NULL,
    unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tenant_id, user_id, theme_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS pending_users (
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

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS login_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    ip_address VARCHAR(45),
    login_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_sessions (
    session_id VARCHAR(128) PRIMARY KEY,
    session_data MEDIUMTEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    INDEX idx_user_sessions_expires (expires_at)
);

CREATE TABLE IF NOT EXISTS ticket_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    parent_id INT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (parent_id) REFERENCES ticket_categories(id)
);

CREATE TABLE IF NOT EXISTS priorities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    name VARCHAR(50) NOT NULL, 
    weight INT NOT NULL,
    UNIQUE KEY uq_priorities_tenant_name (tenant_id, name),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS statuses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    UNIQUE KEY uq_statuses_tenant_name (tenant_id, name),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS sla_policies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    priority_id INT NOT NULL,
    response_time_minutes INT NOT NULL,
    resolution_time_minutes INT NOT NULL,
    UNIQUE KEY uq_sla_tenant_priority (tenant_id, priority_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (priority_id) REFERENCES priorities(id)
);

CREATE TABLE IF NOT EXISTS service_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50) DEFAULT 'box',
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS services (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'tool',
    is_active BOOLEAN DEFAULT TRUE,
    service_category_id INT,
    default_sla_id INT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (service_category_id) REFERENCES service_categories(id),
    FOREIGN KEY (default_sla_id) REFERENCES sla_policies(id)
);

CREATE TABLE IF NOT EXISTS tickets (
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
    deleted_at DATETIME NULL,
    INDEX idx_tickets_tenant_created (tenant_id, created_at),
    INDEX idx_tickets_tenant_status (tenant_id, status_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (category_id) REFERENCES ticket_categories(id),
    FOREIGN KEY (priority_id) REFERENCES priorities(id),
    FOREIGN KEY (status_id) REFERENCES statuses(id),
    FOREIGN KEY (service_id) REFERENCES services(id),
    FOREIGN KEY (requester_id) REFERENCES users(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS sla_tracking (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    ticket_id INT NOT NULL,
    sla_policy_id INT NOT NULL,
    response_due_at DATETIME,
    resolution_due_at DATETIME,
    responded_at DATETIME NULL,
    resolved_at DATETIME NULL,
    breached BOOLEAN DEFAULT FALSE,
    UNIQUE KEY uq_sla_tracking_ticket (tenant_id, ticket_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (ticket_id) REFERENCES tickets(id),
    FOREIGN KEY (sla_policy_id) REFERENCES sla_policies(id)
);

CREATE TABLE IF NOT EXISTS ticket_comments (
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

CREATE TABLE IF NOT EXISTS ticket_attachments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    ticket_id INT NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    mime_type VARCHAR(100),
    file_size INT,
    uploaded_by INT NOT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (ticket_id) REFERENCES tickets(id),
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS ticket_history (
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

CREATE TABLE IF NOT EXISTS asset_types (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS assets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(100) DEFAULT 'periferico',
    asset_type_id INT,
    serial_number VARCHAR(100),
    status ENUM('ativo', 'disponivel', 'manutencao', 'descartado') DEFAULT 'ativo',
    assigned_to INT NULL,
    acquired_at DATE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (asset_type_id) REFERENCES asset_types(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS asset_ticket_link (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    asset_id INT NOT NULL,
    ticket_id INT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (asset_id) REFERENCES assets(id),
    FOREIGN KEY (ticket_id) REFERENCES tickets(id)
);

CREATE TABLE IF NOT EXISTS kb_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS kb_articles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    kb_category_id INT,
    created_by INT,
    views_count INT DEFAULT 0,
    is_published BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (kb_category_id) REFERENCES kb_categories(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS kb_feedback (
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

CREATE TABLE IF NOT EXISTS ai_classifications (
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

CREATE TABLE IF NOT EXISTS ai_conversations (
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

CREATE TABLE IF NOT EXISTS ai_messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    conversation_id INT NOT NULL,
    sender ENUM('user','ai') NOT NULL,
    message TEXT NOT NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id)
);

CREATE TABLE IF NOT EXISTS ai_insights (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    insight_text TEXT NOT NULL,
    category VARCHAR(100),
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    user_id INT NOT NULL,
    title VARCHAR(150),
    message TEXT,
    type VARCHAR(30) DEFAULT 'info', -- 'info', 'warning', 'success', 'danger'
    link_url VARCHAR(255) NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
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

-- =================================================================
-- DADOS FICTÍCIOS DE DEMONSTRAÇÃO
-- =================================================================

-- 1. TENANTS
INSERT INTO tenants (id, name, cnpj, email, is_active) VALUES 
(1, 'Ignis Tech Solutions', '12.345.678/0001-90', 'contato@ignis.com', TRUE),
(2, 'Acme Corporation', '98.765.432/0001-10', 'contato@acme.com', TRUE);

-- 2. ROLES
INSERT INTO roles (id, name) VALUES 
(1, 'admin'),
(2, 'gestor'),
(3, 'tecnico'),
(4, 'usuario');

-- 3. DEPARTMENTS
INSERT INTO departments (id, tenant_id, name) VALUES 
(1, 1, 'Tecnologia da Informação'),
(2, 1, 'Recursos Humanos'),
(3, 1, 'Financeiro e Contabilidade'),
(4, 2, 'Suporte Técnico'),
(5, 2, 'Operações e Logística');

INSERT INTO departments (id, tenant_id, name) VALUES
(6, 1, 'Comercial'), (7, 1, 'Operações'), (8, 1, 'Diretoria'),
(9, 2, 'Financeiro'), (10, 2, 'Recursos Humanos'), (11, 2, 'Tecnologia');

-- 4. USERS (Senha de todos: 123456)
INSERT INTO users (id, tenant_id, name, email, password_hash, role_id, department_id, tema, is_active) VALUES 
(1, 1, 'Administrador Geral', 'admin@ignis.com', '$2b$10$Vn6sj2nk1YWqZahHSKx/7uSX3JmZFVmXDDHt9..JwvcxONa5v.Ec.', 1, 1, 'dark', TRUE),
(2, 1, 'Carlos Silva (Gestor TI)', 'gestor@ignis.com', '$2b$10$Vn6sj2nk1YWqZahHSKx/7uSX3JmZFVmXDDHt9..JwvcxONa5v.Ec.', 2, 1, 'light', TRUE),
(3, 1, 'Roberto Santos (Técnico)', 'tecnico@ignis.com', '$2b$10$Vn6sj2nk1YWqZahHSKx/7uSX3JmZFVmXDDHt9..JwvcxONa5v.Ec.', 3, 1, 'dark', TRUE),
(4, 1, 'Ana Souza (Solicitante)', 'ana.souza@ignis.com', '$2b$10$Vn6sj2nk1YWqZahHSKx/7uSX3JmZFVmXDDHt9..JwvcxONa5v.Ec.', 4, 2, 'system', TRUE),
(5, 2, 'Marcos Oliveira (Admin Acme)', 'admin@acme.com', '$2b$10$Vn6sj2nk1YWqZahHSKx/7uSX3JmZFVmXDDHt9..JwvcxONa5v.Ec.', 1, 4, 'light', TRUE),
(6, 2, 'Fernanda Costa (Usuário Acme)', 'fernanda@acme.com', '$2b$10$Vn6sj2nk1YWqZahHSKx/7uSX3JmZFVmXDDHt9..JwvcxONa5v.Ec.', 4, 5, 'system', TRUE);

INSERT INTO users (id, tenant_id, name, email, password_hash, role_id, department_id, tema, is_active, created_at) VALUES
(7, 1, 'Beatriz Lima', 'beatriz@ignis.com', '$2b$10$Vn6sj2nk1YWqZahHSKx/7uSX3JmZFVmXDDHt9..JwvcxONa5v.Ec.', 4, 3, 'system', TRUE, DATE_SUB(NOW(), INTERVAL 400 DAY)),
(8, 1, 'Juliana Rocha', 'juliana@ignis.com', '$2b$10$Vn6sj2nk1YWqZahHSKx/7uSX3JmZFVmXDDHt9..JwvcxONa5v.Ec.', 4, 6, 'light', TRUE, DATE_SUB(NOW(), INTERVAL 180 DAY)),
(9, 1, 'Diego Martins', 'diego@ignis.com', '$2b$10$Vn6sj2nk1YWqZahHSKx/7uSX3JmZFVmXDDHt9..JwvcxONa5v.Ec.', 3, 1, 'dark', TRUE, DATE_SUB(NOW(), INTERVAL 90 DAY)),
(10, 1, 'Patrícia Alves', 'patricia@ignis.com', '$2b$10$Vn6sj2nk1YWqZahHSKx/7uSX3JmZFVmXDDHt9..JwvcxONa5v.Ec.', 4, 7, 'system', TRUE, DATE_SUB(NOW(), INTERVAL 30 DAY)),
(11, 1, 'Eduardo Nunes', 'eduardo@ignis.com', '$2b$10$Vn6sj2nk1YWqZahHSKx/7uSX3JmZFVmXDDHt9..JwvcxONa5v.Ec.', 4, 8, 'light', FALSE, DATE_SUB(NOW(), INTERVAL 700 DAY)),
(12, 2, 'Camila Torres', 'camila@acme.com', '$2b$10$Vn6sj2nk1YWqZahHSKx/7uSX3JmZFVmXDDHt9..JwvcxONa5v.Ec.', 2, 4, 'system', TRUE, DATE_SUB(NOW(), INTERVAL 120 DAY)),
(13, 2, 'Rafael Pereira', 'rafael@acme.com', '$2b$10$Vn6sj2nk1YWqZahHSKx/7uSX3JmZFVmXDDHt9..JwvcxONa5v.Ec.', 3, 11, 'dark', TRUE, DATE_SUB(NOW(), INTERVAL 60 DAY)),
(14, 2, 'Larissa Melo', 'larissa@acme.com', '$2b$10$Vn6sj2nk1YWqZahHSKx/7uSX3JmZFVmXDDHt9..JwvcxONa5v.Ec.', 4, 9, 'light', TRUE, DATE_SUB(NOW(), INTERVAL 15 DAY));

-- 5. PENDING USERS
INSERT INTO pending_users (id, tenant_id, name, email, password_hash, role_id, department_id, status) VALUES 
(1, 1, 'Fernando Mendes', 'fernando.mendes@ignis.com', '$2b$10$Vn6sj2nk1YWqZahHSKx/7uSX3JmZFVmXDDHt9..JwvcxONa5v.Ec.', 4, 2, 'pendente'),
(2, 2, 'João Pedro', 'joao@acme.com', '$2b$10$Vn6sj2nk1YWqZahHSKx/7uSX3JmZFVmXDDHt9..JwvcxONa5v.Ec.', 4, 5, 'pendente');

INSERT INTO pending_users (id, tenant_id, name, email, password_hash, role_id, department_id, status) VALUES
(3, 1, 'Marina Ribeiro', 'marina@ignis.com', '$2b$10$Vn6sj2nk1YWqZahHSKx/7uSX3JmZFVmXDDHt9..JwvcxONa5v.Ec.', 4, 6, 'pendente'),
(4, 1, 'André Ferreira', 'andre@ignis.com', '$2b$10$Vn6sj2nk1YWqZahHSKx/7uSX3JmZFVmXDDHt9..JwvcxONa5v.Ec.', 4, 7, 'recusado'),
(5, 2, 'Gabriela Barros', 'gabriela@acme.com', '$2b$10$Vn6sj2nk1YWqZahHSKx/7uSX3JmZFVmXDDHt9..JwvcxONa5v.Ec.', 4, 10, 'pendente');

INSERT INTO user_themes (tenant_id, user_id, theme_id, unlocked_at) VALUES
(1, 1, 'first-ticket', DATE_SUB(NOW(), INTERVAL 30 DAY)),
(1, 1, 'first-article-read', DATE_SUB(NOW(), INTERVAL 20 DAY)),
(1, 3, 'first-closed', DATE_SUB(NOW(), INTERVAL 10 DAY)),
(1, 4, 'first-ticket', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(2, 6, 'first-article-read', DATE_SUB(NOW(), INTERVAL 3 DAY));

-- 6. SECURITY & LOGS
INSERT INTO password_reset_tokens (id, user_id, token, expires_at) VALUES 
(1, 4, 'tok_abc123xyz_reset_pass_key', DATE_ADD(NOW(), INTERVAL 2 HOUR));

INSERT INTO login_logs (id, user_id, ip_address, login_at, success) VALUES 
(1, 1, '192.168.1.10', DATE_SUB(NOW(), INTERVAL 2 HOUR), TRUE),
(2, 3, '192.168.1.15', DATE_SUB(NOW(), INTERVAL 1 HOUR), TRUE),
(3, 4, '177.20.10.5', DATE_SUB(NOW(), INTERVAL 30 MINUTE), TRUE);

-- 7. CLASSIFICATIONS (Categorias, Prioridades, Status)
INSERT INTO ticket_categories (id, tenant_id, name, parent_id) VALUES 
(1, 1, 'Hardware', NULL),
(2, 1, 'Software', NULL),
(3, 1, 'Redes e Conectividade', NULL),
(4, 1, 'Impressoras e Periféricos', 1),
(5, 2, 'Sistemas Globais', NULL),
(6, 1, 'Acesso e Identidade', NULL), (7, 1, 'E-mail e Colaboração', NULL),
(8, 2, 'Hardware', NULL), (9, 2, 'Redes e Conectividade', NULL);

INSERT INTO priorities (id, tenant_id, name, weight) VALUES 
(1, 1, 'Baixa', 1),
(2, 1, 'Média', 2),
(3, 1, 'Alta', 3),
(4, 1, 'Crítica', 4),
(5, 2, 'Padrão', 1), (6, 2, 'Média', 2), (7, 2, 'Alta', 3), (8, 2, 'Crítica', 4);

INSERT INTO statuses (id, tenant_id, name) VALUES 
(1, 1, 'Aberto'),
(2, 1, 'Em Andamento'),
(3, 1, 'Resolvido'),
(4, 1, 'Fechado'),
(5, 2, 'Aberto'), (6, 2, 'Em Andamento'), (7, 2, 'Resolvido'), (8, 2, 'Fechado');

-- 8. POLÍTICAS DE SLA
INSERT INTO sla_policies (id, tenant_id, name, priority_id, response_time_minutes, resolution_time_minutes) VALUES 
(1, 1, 'SLA Crítica - 15min / 2h', 4, 15, 120),
(2, 1, 'SLA Alta - 1h / 4h', 3, 60, 240),
(3, 1, 'SLA Média - 4h / 24h', 2, 240, 1440),
(4, 1, 'SLA Baixa - 8h / 48h', 1, 480, 2880),
(5, 2, 'SLA Padrão - 8h / 48h', 5, 480, 2880),
(6, 2, 'SLA Média - 4h / 24h', 6, 240, 1440),
(7, 2, 'SLA Alta - 1h / 4h', 7, 60, 240),
(8, 2, 'SLA Crítica - 15min / 2h', 8, 15, 120);

-- 9. CATÁLOGO DE SERVIÇOS
INSERT INTO service_categories (id, tenant_id, name, icon) VALUES 
(1, 1, 'Equipamentos e Periféricos', 'laptop'),
(2, 1, 'Acessos e Permissões', 'key'),
(3, 1, 'Sistemas e Aplicativos', 'code'),
(4, 1, 'Rede e Conectividade', 'wifi'), (5, 2, 'Suporte de Equipamentos', 'laptop'),
(6, 2, 'Acessos Corporativos', 'key');

INSERT INTO services (id, tenant_id, name, description, icon, is_active, service_category_id, default_sla_id) VALUES 
(1, 1, 'Solicitação de Novo Notebook', 'Entrega e preparação de computador de trabalho', 'laptop', TRUE, 1, 3),
(2, 1, 'Reset de Senha de Domínio', 'Restauração de acesso à conta de rede', 'key', TRUE, 2, 1),
(3, 1, 'Instalação de Software Homologado', 'Instalação de Pacote Office, ERP ou VPN', 'download', TRUE, 3, 4),
(4, 1, 'Configuração de VPN', 'Configuração de acesso remoto com autenticação corporativa', 'wifi', TRUE, 4, 2),
(5, 1, 'Acesso ao ERP', 'Concessão ou revisão de permissões no ERP', 'key', TRUE, 3, 3),
(6, 1, 'Manutenção de Impressora', 'Diagnóstico e reparo de impressoras e periféricos', 'tool', TRUE, 1, 3),
(7, 2, 'Preparação de Notebook', 'Instalação e entrega de notebook corporativo', 'laptop', TRUE, 5, 5),
(8, 2, 'Recuperação de Acesso', 'Redefinição de senha e recuperação de acesso', 'key', TRUE, 6, 7);

-- 10. TICKETS
INSERT INTO tickets (id, tenant_id, title, description, type, category_id, priority_id, status_id, service_id, requester_id, assigned_to, created_at) VALUES 
(1, 1, 'Impressora do RH travou papel', 'A impressora HP no 2º andar do RH não está imprimindo.', 'incidente', 4, 2, 1, NULL, 4, NULL, DATE_SUB(NOW(), INTERVAL 2 DAY)),
(2, 1, 'Solicitação de monitor adicional', 'Preciso de um segundo monitor para desenvolvimento.', 'requisicao', 1, 1, 2, 1, 4, 3, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(3, 1, 'ERP instável e gerando erro 500', 'Ao gerar relatórios mensais o sistema trava.', 'problema', 2, 4, 1, NULL, 4, 3, DATE_SUB(NOW(), INTERVAL 3 HOUR)),
(4, 1, 'Manutenção preventiva no Switch Core', 'Atualização do firmware dos switches de borda.', 'mudanca', 3, 3, 3, NULL, 1, 2, DATE_SUB(NOW(), INTERVAL 5 DAY));

-- Sessenta chamados adicionais, com períodos, equipes, prioridades e estados variados.
INSERT INTO tickets (id, tenant_id, title, description, type, category_id, priority_id, status_id, service_id, requester_id, assigned_to, created_at, closed_at)
SELECT n + 5,
  CASE WHEN n < 45 THEN 1 ELSE 2 END,
  CONCAT(CASE MOD(n, 8)
    WHEN 0 THEN 'VPN não conecta' WHEN 1 THEN 'Erro ao abrir relatório do ERP'
    WHEN 2 THEN 'Notebook com lentidão' WHEN 3 THEN 'Solicitação de acesso'
    WHEN 4 THEN 'Impressora fora de serviço' WHEN 5 THEN 'E-mail não sincroniza'
    WHEN 6 THEN 'Rede sem conexão' ELSE 'Atualização de aplicativo' END, ' — unidade ', 1 + MOD(n, 5)),
  CONCAT(CASE MOD(n, 8)
    WHEN 0 THEN 'O acesso remoto falha após a autenticação; o usuário informou a mensagem exibida pelo cliente VPN.'
    WHEN 1 THEN 'O relatório financeiro do ERP apresenta erro ao processar os dados do mês e interrompe o trabalho da equipe.'
    WHEN 2 THEN 'O equipamento demora a iniciar e trava ao abrir aplicativos de trabalho.'
    WHEN 3 THEN 'É necessário conceder acesso ao sistema utilizado pelo departamento, com autorização do gestor.'
    WHEN 4 THEN 'A impressora não responde à fila de impressão e o painel mostra uma falha intermitente.'
    WHEN 5 THEN 'Mensagens enviadas não aparecem na caixa de saída e a sincronização do correio parou.'
    WHEN 6 THEN 'A conexão cabeada caiu na unidade e vários usuários perderam acesso à rede.'
    ELSE 'A versão atual do aplicativo precisa ser atualizada para continuar compatível com o ambiente.' END,
    ' Chamado de demonstração #', n + 5, ', unidade ', 1 + MOD(n, 5), '.'),
  CASE MOD(n, 5) WHEN 0 THEN 'problema' WHEN 1 THEN 'requisicao' WHEN 2 THEN 'incidente' WHEN 3 THEN 'mudanca' ELSE 'outro' END,
  CASE WHEN n < 45 THEN CASE MOD(n, 6) WHEN 0 THEN 3 WHEN 1 THEN 2 WHEN 2 THEN 1 WHEN 3 THEN 6 WHEN 4 THEN 4 ELSE 7 END
    ELSE CASE MOD(n, 3) WHEN 0 THEN 5 WHEN 1 THEN 8 ELSE 9 END END,
  CASE WHEN n < 45 THEN 1 + MOD(n, 4) ELSE 5 + MOD(n, 4) END,
  CASE WHEN n < 45 THEN 1 + MOD(n, 4) ELSE 5 + MOD(n, 4) END,
  CASE WHEN n < 45 THEN 1 + MOD(n, 6) ELSE 7 + MOD(n, 2) END,
  CASE WHEN n < 45 THEN CASE MOD(n, 4) WHEN 0 THEN 4 WHEN 1 THEN 7 WHEN 2 THEN 8 ELSE 10 END
    ELSE CASE MOD(n, 3) WHEN 0 THEN 6 WHEN 1 THEN 14 ELSE 12 END END,
  CASE WHEN n < 45 THEN CASE WHEN MOD(n, 4) = 0 THEN NULL WHEN MOD(n, 2) = 0 THEN 9 ELSE 3 END
    ELSE CASE WHEN MOD(n, 4) = 0 THEN NULL ELSE 13 END END,
  DATE_SUB(NOW(), INTERVAL (MOD(n * 7, 90) + 1) DAY),
  CASE WHEN MOD(n, 4) >= 2 THEN DATE_SUB(NOW(), INTERVAL MOD(n * 7, 90) DAY) ELSE NULL END
FROM (
  SELECT tens.x * 10 + ones.x AS n
  FROM (SELECT 0 x UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5) tens
  CROSS JOIN (SELECT 0 x UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) ones
) numbers;
UPDATE tickets SET closed_at = DATE_SUB(NOW(), INTERVAL 3 DAY) WHERE id = 4;

-- 11. SLA TRACKING
INSERT INTO sla_tracking (id, tenant_id, ticket_id, sla_policy_id, response_due_at, resolution_due_at, responded_at, resolved_at, breached) VALUES 
(1, 1, 1, 3, DATE_ADD(NOW(), INTERVAL 2 HOUR), DATE_ADD(NOW(), INTERVAL 22 HOUR), NULL, NULL, FALSE),
(2, 1, 2, 4, DATE_SUB(NOW(), INTERVAL 18 HOUR), DATE_ADD(NOW(), INTERVAL 30 HOUR), DATE_SUB(NOW(), INTERVAL 20 HOUR), NULL, FALSE),
(3, 1, 3, 1, DATE_SUB(NOW(), INTERVAL 2 HOUR), DATE_SUB(NOW(), INTERVAL 1 HOUR), DATE_SUB(NOW(), INTERVAL 2 HOUR), NULL, TRUE),
(4, 1, 4, 2, DATE_SUB(NOW(), INTERVAL 4 DAY), DATE_SUB(NOW(), INTERVAL 4 DAY), DATE_SUB(NOW(), INTERVAL 4 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY), TRUE);

INSERT INTO sla_tracking (tenant_id, ticket_id, sla_policy_id, response_due_at, resolution_due_at, responded_at, resolved_at, breached)
SELECT t.tenant_id, t.id, sp.id,
  DATE_ADD(t.created_at, INTERVAL sp.response_time_minutes MINUTE),
  CASE WHEN MOD(t.id, 7) = 0 THEN DATE_SUB(NOW(), INTERVAL 1 DAY)
    ELSE DATE_ADD(t.created_at, INTERVAL sp.resolution_time_minutes MINUTE) END,
  CASE WHEN MOD(t.id, 4) = 0 THEN NULL ELSE DATE_ADD(t.created_at, INTERVAL 30 MINUTE) END,
  CASE WHEN t.closed_at IS NOT NULL THEN t.closed_at ELSE NULL END,
  CASE WHEN t.closed_at IS NULL AND (MOD(t.id, 7) = 0 OR DATE_ADD(t.created_at, INTERVAL sp.resolution_time_minutes MINUTE) < NOW()) THEN TRUE ELSE FALSE END
FROM tickets t JOIN sla_policies sp ON sp.tenant_id = t.tenant_id AND sp.priority_id = t.priority_id
WHERE t.id >= 5;

-- 12. TICKET COMMENTS & ATTACHMENTS & HISTORY
INSERT INTO ticket_comments (id, tenant_id, ticket_id, user_id, comment, is_internal, created_at) VALUES 
(1, 1, 2, 3, 'Verificando o estoque de monitores Dell no almoxarifado.', FALSE, DATE_SUB(NOW(), INTERVAL 20 HOUR)),
(2, 1, 2, 2, 'Aprovação financeira pendente para novo lote.', TRUE, DATE_SUB(NOW(), INTERVAL 18 HOUR));

INSERT INTO ticket_comments (tenant_id, ticket_id, user_id, comment, is_internal, created_at)
SELECT t.tenant_id, t.id,
  CASE WHEN t.tenant_id = 1 THEN CASE WHEN MOD(t.id, 2) = 0 THEN 3 ELSE 9 END ELSE 13 END,
  CASE WHEN MOD(t.id, 4) >= 2 THEN 'A equipe aplicou a correção e confirmou o resultado com o solicitante.'
    ELSE 'O chamado está em análise. A próxima atualização será registrada aqui.' END,
  MOD(t.id, 5) = 0, DATE_ADD(t.created_at, INTERVAL 45 MINUTE)
FROM tickets t WHERE t.id >= 5 AND MOD(t.id, 3) <> 0;

-- Não há anexos fictícios: cada registro de anexo precisa corresponder a um arquivo real em storage/tickets.

INSERT INTO ticket_history (id, tenant_id, ticket_id, field_changed, old_value, new_value, changed_by, changed_at) VALUES 
(1, 1, 4, 'status', 'Em Andamento', 'Resolvido', 2, DATE_SUB(NOW(), INTERVAL 3 DAY));

INSERT INTO ticket_history (tenant_id, ticket_id, field_changed, old_value, new_value, changed_by, changed_at)
SELECT t.tenant_id, t.id, 'status', 'Aberto', s.name,
  CASE WHEN t.tenant_id = 1 THEN 3 ELSE 13 END,
  DATE_ADD(t.created_at, INTERVAL 1 HOUR)
FROM tickets t JOIN statuses s ON s.id = t.status_id
WHERE t.id >= 5 AND MOD(t.id, 4) <> 0;

-- 13. ATIVOS (CMDB)
INSERT INTO asset_types (id, tenant_id, name) VALUES 
(1, 1, 'Notebooks e Desktops'),
(2, 1, 'Monitores'),
(3, 1, 'Equipamentos de Rede'), (4, 1, 'Impressoras'),
(5, 2, 'Notebooks e Desktops'), (6, 2, 'Equipamentos de Rede');

INSERT INTO assets (id, tenant_id, name, category, asset_type_id, serial_number, status, assigned_to, acquired_at) VALUES 
(1, 1, 'Notebook Dell Vostro 5490', 'computador', 1, 'SN-DELL-98213', 'ativo', 4, '2023-01-15'),
(2, 1, 'Monitor LG 29 Ultrawide', 'periferico', 2, 'SN-LG-88712', 'disponivel', NULL, '2023-05-10'),
(3, 1, 'Roteador Cisco Meraki MX64', 'rede', 3, 'SN-CSCO-00192', 'ativo', NULL, '2022-11-20'),
(4, 1, 'Impressora HP LaserJet RH', 'impressora', 4, 'SN-HP-22041', 'manutencao', 4, '2023-07-12'),
(5, 1, 'Notebook Lenovo ThinkPad T14', 'computador', 1, 'SN-LEN-14011', 'ativo', 7, '2024-02-19'),
(6, 1, 'Monitor Dell P2422H', 'periferico', 2, 'SN-DEL-24009', 'disponivel', NULL, '2024-03-21'),
(7, 2, 'Notebook Acer TravelMate', 'computador', 5, 'SN-ACM-77101', 'ativo', 6, '2024-01-10'),
(8, 2, 'Switch Cisco Catalyst', 'rede', 6, 'SN-ACM-88002', 'manutencao', NULL, '2023-09-04');

INSERT INTO asset_ticket_link (id, tenant_id, asset_id, ticket_id) VALUES 
(1, 1, 2, 2), (2, 1, 4, 1), (3, 1, 3, 4), (4, 2, 8, 51);

-- 14. BASE DE CONHECIMENTO (KB)
INSERT INTO kb_categories (id, tenant_id, name) VALUES 
(1, 1, 'Perguntas Frequentes (FAQ)'),
(2, 1, 'Rede e Acesso Remoto (VPN)'),
(3, 1, 'Sistemas Corporativos'), (4, 1, 'Equipamentos e Periféricos'),
(5, 2, 'Acesso e Identidade'), (6, 2, 'Equipamentos');

INSERT INTO kb_articles (id, tenant_id, title, content, kb_category_id, created_by, views_count, is_published) VALUES 
(1, 1, 'Como se conectar à VPN Corporativa', 'Para conectar à VPN, abra o FortiClient, insira o servidor vpn.ignis.com e suas credenciais de rede.', 2, 2, 142, TRUE),
(2, 1, 'Como solicitar reset de senha', 'Acesse o portal TaskBee e selecione o serviço Reset de Senha no Catálogo de Serviços.', 1, 1, 89, TRUE),
(3, 1, 'Impressora não imprime: verificações iniciais', 'Confira a fila de impressão, cabos, conexão de rede e mensagens no painel da impressora. Se o problema continuar, abra um chamado e informe o modelo.', 4, 3, 67, TRUE),
(4, 1, 'ERP: acesso e permissões', 'Confirme se a conta está ativa e se possui o perfil correto. Solicite a revisão de permissões pelo catálogo de serviços.', 3, 2, 103, TRUE),
(5, 1, 'Boas práticas para senhas corporativas', 'Use uma senha exclusiva, evite reutilização e nunca compartilhe credenciais. Em caso de suspeita de vazamento, solicite troca imediata.', 1, 1, 221, TRUE),
(6, 1, 'Notebook lento: passos antes do suporte', 'Reinicie o equipamento, confira o espaço em disco e anote quais aplicativos estão lentos. Inclua essas informações no chamado.', 4, 9, 43, TRUE),
(7, 2, 'Como recuperar o acesso à conta', 'Abra o catálogo e escolha Recuperação de Acesso. A equipe validará sua identidade antes de redefinir a senha.', 5, 12, 75, TRUE),
(8, 2, 'Preparação de notebook novo', 'Solicite a preparação pelo catálogo, informe o departamento, a data necessária e os aplicativos essenciais.', 6, 13, 29, TRUE);

INSERT INTO kb_feedback (id, tenant_id, kb_article_id, user_id, is_helpful) VALUES 
(1, 1, 1, 4, TRUE),
(2, 1, 2, 4, TRUE), (3, 1, 3, 7, TRUE), (4, 1, 4, 8, FALSE),
(5, 1, 5, 10, TRUE), (6, 2, 7, 6, TRUE), (7, 2, 8, 14, TRUE);

-- 15. CHATBOT E INTELIGÊNCIA ARTIFICIAL
INSERT INTO ai_classifications (id, tenant_id, ticket_id, suggested_category_id, suggested_priority_id, confidence_score, accepted) VALUES 
(1, 1, 3, 2, 4, 94.50, TRUE);

INSERT INTO ai_conversations (id, tenant_id, user_id, started_at, ended_at, resulted_in_ticket_id) VALUES 
(1, 1, 4, DATE_SUB(NOW(), INTERVAL 3 HOUR), DATE_SUB(NOW(), INTERVAL 2 HOUR), 3);

-- 15. CHATBOT E INTELIGÊNCIA ARTIFICIAL - AI MESSAGES
INSERT INTO ai_messages (id, tenant_id, conversation_id, sender, message, sent_at) VALUES 
(1, 1, 1, 'user', 'Olá, estou tentando usar o ERP mas está dando erro.', DATE_SUB(NOW(), INTERVAL 3 HOUR)),
(2, 1, 1, 'ai', 'Sinto muito pelo inconveniente! Qual é o código de erro exibido na tela?', DATE_SUB(NOW(), INTERVAL 179 MINUTE)),
(3, 1, 1, 'user', 'Aparece Erro 500 Internal Server Error.', DATE_SUB(NOW(), INTERVAL 178 MINUTE)),
(4, 1, 1, 'ai', 'Entendido. Abri um chamado de prioridade Alta para a equipe de TI analisar o servidor.', DATE_SUB(NOW(), INTERVAL 2 HOUR));

INSERT INTO ai_insights (id, tenant_id, insight_text, category) VALUES 
(1, 1, 'Houve um aumento de 25% nos chamados sobre estabilidade do ERP na última semana.', 'Tendência de Falhas'),
(2, 1, '85% das dúvidas sobre VPN são resolvidas diretamente pelo artigo #1 da Base de Conhecimento.', 'Eficiência de Autoatendimento');

-- 16. NOTIFICAÇÕES E POP-UPS
INSERT INTO notifications (id, tenant_id, user_id, title, message, type, link_url, is_read) VALUES 
(1, 1, 4, 'Atualização no Chamado #2', 'O técnico Roberto adicionou um comentário no seu chamado.', 'info', '/chamados/2', FALSE),
(2, 1, 3, 'Novo Chamado Atribuído', 'O chamado #3 foi atribuído a você.', 'warning', '/chamados/3', TRUE);

INSERT INTO notifications (tenant_id, user_id, title, message, type, link_url, is_read, created_at)
SELECT t.tenant_id, t.requester_id,
  CONCAT('Atualização no chamado #', t.id),
  CASE WHEN t.closed_at IS NULL THEN 'O suporte está acompanhando sua solicitação.' ELSE 'Seu chamado foi finalizado. Consulte os detalhes.' END,
  CASE WHEN t.closed_at IS NULL THEN 'info' ELSE 'success' END,
  CONCAT('/chamados/', t.id), MOD(t.id, 3) = 0,
  DATE_ADD(t.created_at, INTERVAL 2 HOUR)
FROM tickets t WHERE t.id >= 5 AND MOD(t.id, 4) = 0;

-- 17. AUDITORIA
INSERT INTO audit_logs (id, tenant_id, user_id, action, entity, entity_id, details) VALUES 
(1, 1, 1, 'CREATE_USER', 'users', 4, 'Usuário Ana Souza criado no departamento RH.'),
(2, 1, 2, 'UPDATE_TICKET_STATUS', 'tickets', 4, 'Status alterado para Resolvido por Carlos Silva.');

INSERT INTO audit_logs (tenant_id, user_id, action, entity, entity_id, details, created_at)
SELECT t.tenant_id, CASE WHEN t.tenant_id = 1 THEN 3 ELSE 13 END,
  'Criar', 'Chamado', t.id, CONCAT('Chamado de demonstração #', t.id, ' registrado.'),
  t.created_at
FROM tickets t WHERE t.id >= 5 AND MOD(t.id, 2) = 0;
