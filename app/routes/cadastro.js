module.exports = function (app) {
  app.get("/cadastro", function (request, response) {
    response.render("cadastro", { mensagem: null });
  });

  app.get("/cadastro-empresa", function (request, response) {
    response.render("cadastro-empresa");
  });

  app.post("/cadastro", async function (request, response) {
    const { empresa, nome, email, senha } = request.body;

    try {
      const defaultRoleId = 4; // Exemplo: Usuário comum/solicitante

      // Inserimos sem o departamento (ele fica NULL no banco)
      await request.db.query(
        `INSERT INTO pending_users (tenant_id, name, email, password_hash, role_id, status) 
         VALUES (?, ?, ?, ?, ?, 'pendente')`,
        [empresa, nome, email, senha, defaultRoleId]
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
};