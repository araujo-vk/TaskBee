USE banco;

CREATE TABLE IF NOT EXISTS user_sessions (
    session_id VARCHAR(128) PRIMARY KEY,
    session_data MEDIUMTEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    INDEX idx_user_sessions_expires (expires_at)
);

ALTER TABLE tickets ADD COLUMN deleted_at DATETIME NULL AFTER closed_at;
ALTER TABLE ticket_attachments ADD COLUMN original_name VARCHAR(255) NULL AFTER file_path;
ALTER TABLE ticket_attachments ADD COLUMN mime_type VARCHAR(100) NULL AFTER original_name;
ALTER TABLE ticket_attachments ADD COLUMN file_size INT NULL AFTER mime_type;
CREATE INDEX idx_tickets_tenant_created ON tickets (tenant_id, created_at);
CREATE INDEX idx_tickets_tenant_status ON tickets (tenant_id, status_id);

UPDATE pending_users
SET password_hash = '$2b$10$Vn6sj2nk1YWqZahHSKx/7uSX3JmZFVmXDDHt9..JwvcxONa5v.Ec.'
WHERE password_hash = '123456';
