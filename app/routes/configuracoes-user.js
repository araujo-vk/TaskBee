// public/js/routes/configuracoes-user_6.js (ou o caminho equivalente no seu projeto)

module.exports = function (app) { 
  app.get("/configuracoes-user", async function (request, response) {
    try {
      const userId = request.session.usuarioLogado && request.session.usuarioLogado.id;

      if (!userId) {
        return response.redirect("/login");
      }

      // ADICIONADO: u.tema na query SQL
      const sql = `
        SELECT 
          u.name AS nome, 
          u.email, 
          u.role_id, 
          u.created_at,
          u.tema,
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
      
      const erro = request.query.erro || null;
      const sucesso = request.query.sucesso || null;
      
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

      const { nome, email, senha, 'confirmar-senha': confirmarSenha } = request.body;

      let sql = `UPDATE users SET name = ?, email = ? WHERE id = ?`;
      let params = [nome, email, userId];

      if (senha || confirmarSenha) {
        if (senha !== confirmarSenha) {
          return response.redirect("/configuracoes-user?erro=As senhas não coincidem. Nenhuma alteração foi salva.");
        }
        
        if (senha.trim() !== "") {
          sql = `UPDATE users SET name = ?, email = ?, password_hash = ? WHERE id = ?`;
          params = [nome, email, senha, userId];
        }
      }

      await request.db.query(sql, params);
      response.redirect("/configuracoes-user?sucesso=Dados atualizados com sucesso!");
      
    } catch (error) {
      console.error("Erro na atualização do usuário:", error);
      return response.redirect("/configuracoes-user?erro=Erro ao atualizar dados.");
    }
  });

  // =======================================================
  // NOVO ENDPOINT: Salvar o tema do usuário via AJAX (Fetch)
  // =======================================================
  app.post("/api/atualizar-tema", async function (request, response) {
    try {
      const userId = request.session.usuarioLogado && request.session.usuarioLogado.id;
      if (!userId) {
        return response.status(401).json({ erro: "Usuário não autenticado." });
      }

      const { tema } = request.body;

      // Valida os valores aceitos
      if (!['light', 'dark', 'system'].includes(tema)) {
        return response.status(400).json({ erro: "Tema inválido." });
      }

      // Atualiza o banco de dados
      await request.db.query(`UPDATE users SET tema = ? WHERE id = ?`, [tema, userId]);

      // Atualiza na sessão se estiver guardando lá
      if (request.session.usuarioLogado) {
        request.session.usuarioLogado.tema = tema;
      }

      return response.json({ sucesso: true });
    } catch (error) {
      console.error("Erro ao atualizar tema:", error);
      return response.status(500).json({ erro: "Erro ao salvar a preferência no servidor." });
    }
  });
};