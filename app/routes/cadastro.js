const { registrarLog } = require('../../config/logger');

module.exports = function (app) {
  app.get("/cadastro", function (request, response) {
    response.render("cadastro", { mensagem: null });
  });

  app.get("/cadastro-empresa", function (request, response) {
    response.render("cadastro-empresa");
  });

  app.post("/cadastro", async function (request, response) {
    const { cnpj_empresa, nome, email, senha } = request.body;

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

      // 2. Cadastra na tabela de pendentes usando o tenant_id encontrado
      const [resultPending] = await request.db.query(
        `INSERT INTO pending_users (tenant_id, name, email, password_hash, role_id, status) 
        VALUES (?, ?, ?, ?, ?, 'pendente')`,
        [tenantId, nome, email, senha, defaultRoleId]
      );

      // 3. Registo no Log de Auditoria (user_id vai null pois o utilizador ainda não existe)
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

    try {
      // 1. Cria a empresa na tabela tenants
      const [resultTenant] = await request.db.query(
        "INSERT INTO tenants (name, cnpj, email) VALUES (?, ?, ?)",
        [nome, cnpj, email]
      );

      const newTenantId = resultTenant.insertId;

      // 2. Cria automaticamente o primeiro Usuário Administrador dessa empresa
      const adminRoleId = 1; // ID 1 = Admin
      const [resultUser] = await request.db.query(
        `INSERT INTO users (tenant_id, name, email, password_hash, role_id, is_active) 
        VALUES (?, ?, ?, ?, ?, TRUE)`,
        [newTenantId, nome, email, senha, adminRoleId]
      );

      // 3. Registo no Log de Auditoria
      await registrarLog(
        request.db, 
        newTenantId, 
        resultUser.insertId, 
        'Criação', 
        'Empresa', 
        newTenantId, 
        `Empresa "${nome}" criada juntamente com o utilizador Administrador.`
      );

      response.render("cadastro-empresa", { 
        mensagem: "Empresa e Administrador cadastrados com sucesso! Agora você já pode fazer login." 
      });

    } catch (error) {
      console.error(error);
      response.render("cadastro-empresa", { 
        mensagem: "Erro ao cadastrar empresa. Verifique se o CNPJ já não está cadastrado." 
      });
    }
  });
};