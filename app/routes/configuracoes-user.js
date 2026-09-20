module.exports = function (app) { 
  app.get("/configuracoes-user", async function (request, response) {
    try {
      const userId = request.session.usuarioLogado && request.session.usuarioLogado.id;

      if (!userId) {
        return response.redirect("/login");
      }

      const sql = `
        SELECT 
          u.name AS nome, 
          u.email, 
          u.role_id, 
          u.created_at,
          d.name AS departamento,
          t.cnpj AS cnpj_tenant
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        LEFT JOIN tenants t ON u.tenant_id = t.id
        WHERE u.id = ?
      `;

      const [results] = await request.db.query(sql, [userId]);

      if (results.length === 0) {
        return response.status(404).send("Usuário não encontrado.");
      }

      const usuario = results[0];
      
      // Captura possíveis mensagens vindas do redirecionamento
      const erro = request.query.erro || null;
      const sucesso = request.query.sucesso || null;
      
      // Envia as variáveis erro e sucesso para o EJS
      response.render("configuracoes-user", { usuario, erro, sucesso });

    } catch (error) {
      console.error("Erro na consulta de usuário:", error);
      return response.status(500).send("Erro ao carregar dados do usuário.");
    }
  });

  app.post("/configuracoes-user/update", async function (request, response) {
    try {
      const userId = request.session.usuarioLogado && request.session.usuarioLogado.id;
      if (!userId) return response.redirect("/login");

      // Pega os campos de senha também
      const { nome, email, senha, 'confirmar-senha': confirmarSenha } = request.body;

      let sql = `UPDATE users SET name = ?, email = ? WHERE id = ?`;
      let params = [nome, email, userId];

      // Se o usuário digitou algo em qualquer um dos campos de senha
      if (senha || confirmarSenha) {
        if (senha !== confirmarSenha) {
          // Retorna erro se não forem iguais
          return response.redirect("/configuracoes-user?erro=As senhas não coincidem. Nenhuma alteração foi salva.");
        }
        
        // Se baterem e não for vazia, atualiza também a senha
        if (senha.trim() !== "") {
          sql = `UPDATE users SET name = ?, email = ?, password_hash = ? WHERE id = ?`;
          params = [nome, email, senha, userId];
        }
      }

      await request.db.query(sql, params);
      
      // Redireciona com mensagem de sucesso
      response.redirect("/configuracoes-user?sucesso=Dados atualizados com sucesso!");
      
    } catch (error) {
      console.error("Erro na atualização do usuário:", error);
      return response.redirect("/configuracoes-user?erro=Erro ao atualizar dados.");
    }
  });
};