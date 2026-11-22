const bcrypt = require('bcrypt');
const { registrarLog } = require('../../config/logger');

const SALT_ROUNDS = 10;

module.exports = function (app) {
  app.get("/cadastro", function (request, response) {
    response.render("cadastro", { mensagem: null });
  });

  app.get("/cadastro-empresa", function (request, response) {
    response.render("cadastro-empresa");
  });

  app.post("/cadastro", async function (request, response) {
    const { cnpj_empresa, nome, email, senha } = request.body;

    if (!String(nome || '').trim() || !/^\S+@\S+\.\S+$/.test(String(email || '')) || String(senha || '').length < 8) {
      return response.status(400).render('cadastro', { mensagem: 'Informe nome, e-mail válido e senha com pelo menos 8 caracteres.' });
    }

    try {
      // 1. Busca o ID da empresa através do CNPJ informado
      const [empresaEncontrada] = await request.db.query(
        "SELECT id FROM tenants WHERE cnpj = ? AND is_active = TRUE",
        [cnpj_empresa]
      );

      if (empresaEncontrada.length === 0) {
        return response.render("cadastro", { 
          mensagem: "Nenhuma empresa cadastrada com este CNPJ." 
        });
      }

      const tenantId = empresaEncontrada[0].id;
      const defaultRoleId = 4; // Solicitante / Usuário comum

      const [duplicados] = await request.db.query(`
        SELECT email FROM users WHERE tenant_id = ? AND email = ?
        UNION ALL
        SELECT email FROM pending_users WHERE tenant_id = ? AND email = ? AND status = 'pendente'
      `, [tenantId, String(email).trim().toLowerCase(), tenantId, String(email).trim().toLowerCase()]);
      if (duplicados.length) {
        return response.status(409).render('cadastro', { mensagem: 'Já existe uma conta ou solicitação pendente para este e-mail.' });
      }

      // 2. Gera o hash seguro da senha
      const passwordHash = await bcrypt.hash(senha, SALT_ROUNDS);

      // 3. Cadastra na tabela de pendentes com a senha criptografada
      const [resultPending] = await request.db.query(
        `INSERT INTO pending_users (tenant_id, name, email, password_hash, role_id, status) 
        VALUES (?, ?, ?, ?, ?, 'pendente')`,
        [tenantId, String(nome).trim(), String(email).trim().toLowerCase(), passwordHash, defaultRoleId]
      );

      // 4. Registo no Log de Auditoria
      await registrarLog(
        request.db, 
        tenantId, 
        null, 
        'Solicitação', 
        'Cadastro', 
        resultPending.insertId, 
        `Nova solicitação de acesso para o e-mail: ${email}`
      );

      response.render("cadastro", { 
        mensagem: "Solicitação enviada com sucesso! Aguarde a aprovação do operador." 
      });

    } catch (error) {
      console.error(error);
      response.render("cadastro", { 
        mensagem: "Erro ao realizar cadastro." 
      });
    }
  });

  app.post("/cadastro-empresa", async function (request, response) {
    const { nome, cnpj, email, senha } = request.body;

    if (!String(nome || '').trim() || !String(cnpj || '').trim() || !/^\S+@\S+\.\S+$/.test(String(email || '')) || String(senha || '').length < 8) {
      return response.status(400).render('cadastro-empresa', { mensagem: 'Informe empresa, CNPJ, e-mail válido e senha com pelo menos 8 caracteres.' });
    }

    const conexao = await request.db.getConnection();

    try {
      await conexao.beginTransaction();
      // 1. Cria a empresa na tabela tenants
      const [resultTenant] = await conexao.query(
        "INSERT INTO tenants (name, cnpj, email) VALUES (?, ?, ?)",
        [String(nome).trim(), String(cnpj).trim(), String(email).trim().toLowerCase()]
      );

      const newTenantId = resultTenant.insertId;

      // 2. Gera o hash seguro da senha
      const passwordHash = await bcrypt.hash(senha, SALT_ROUNDS);

      // 3. Cria o primeiro Usuário Administrador com senha criptografada
      const adminRoleId = 1; // ID 1 = Admin
      const [resultUser] = await conexao.query(
        `INSERT INTO users (tenant_id, name, email, password_hash, role_id, is_active) 
        VALUES (?, ?, ?, ?, ?, TRUE)`,
        [newTenantId, String(nome).trim(), String(email).trim().toLowerCase(), passwordHash, adminRoleId]
      );

      await conexao.query(`
        INSERT INTO statuses (tenant_id, name) VALUES (?, 'Aberto'), (?, 'Em Andamento'), (?, 'Resolvido'), (?, 'Fechado')
      `, [newTenantId, newTenantId, newTenantId, newTenantId]);
      await conexao.query(`
        INSERT INTO priorities (tenant_id, name, weight)
        VALUES (?, 'Baixa', 1), (?, 'Média', 2), (?, 'Alta', 3), (?, 'Crítica', 4)
      `, [newTenantId, newTenantId, newTenantId, newTenantId]);
      await conexao.query("INSERT INTO ticket_categories (tenant_id, name) VALUES (?, 'Geral')", [newTenantId]);
      await conexao.query("INSERT INTO service_categories (tenant_id, name) VALUES (?, 'Serviços Gerais')", [newTenantId]);

      const [prioridadesCriadas] = await conexao.query(
        'SELECT id, name FROM priorities WHERE tenant_id = ?',
        [newTenantId]
      );
      const prazos = {
        Baixa: [480, 2880], Média: [240, 1440], Alta: [60, 240], Crítica: [15, 120]
      };
      for (const prioridade of prioridadesCriadas) {
        const [resposta, resolucao] = prazos[prioridade.name];
        await conexao.query(`
          INSERT INTO sla_policies (tenant_id, name, priority_id, response_time_minutes, resolution_time_minutes)
          VALUES (?, ?, ?, ?, ?)
        `, [newTenantId, `SLA ${prioridade.name}`, prioridade.id, resposta, resolucao]);
      }

      // 4. Registo no Log de Auditoria
      await conexao.query(`
        INSERT INTO audit_logs (tenant_id, user_id, action, entity, entity_id, details)
        VALUES (?, ?, 'Criação', 'Empresa', ?, ?)
      `, [newTenantId, resultUser.insertId, newTenantId, `Empresa "${nome}" criada com o administrador inicial.`]);
      await conexao.commit();

      response.render("cadastro-empresa", { 
        mensagem: "Empresa e Administrador cadastrados com sucesso! Agora você já pode fazer login." 
      });

    } catch (error) {
      await conexao.rollback();
      console.error(error);
      response.render("cadastro-empresa", { 
        mensagem: "Erro ao cadastrar empresa. Verifique se o CNPJ já não está cadastrado." 
      });
    } finally {
      conexao.release();
    }
  });
};
