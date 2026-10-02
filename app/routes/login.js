const bcrypt = require('bcrypt');

module.exports = function (app) {
  
  app.get("/login", function (req, res) {
    res.render("login", { erro: null });
  });

  app.post("/login", async function (req, res) {
    const { cnpj_empresa, email, senha } = req.body;

    try {
      // 1. Busca a empresa pelo CNPJ
      const [empresa] = await req.db.query("SELECT id FROM tenants WHERE cnpj = ?", [cnpj_empresa]);
      
      if (empresa.length === 0) {
        return res.render("login", { erro: "Empresa não encontrada." });
      }

      // 2. Busca o usuário pelo email E pelo ID da empresa
      const tenantId = empresa[0].id;
      const [usuario] = await req.db.query(
        "SELECT * FROM users WHERE email = ? AND tenant_id = ? AND is_active = TRUE", 
        [email, tenantId]
      );

      if (usuario.length === 0) {
        return res.render("login", { erro: "Email ou senha incorretos." });
      }

      // 3. Compara a senha digitada com o hash criptografado salvo no banco
      const senhaValida = await bcrypt.compare(senha, usuario[0].password_hash);

      if (!senhaValida) {
        return res.render("login", { erro: "Email ou senha incorretos." });
      }

      // 4. Salva os dados na sessão
      req.session.usuarioLogado = {
        id: usuario[0].id,
        nome: usuario[0].name,
        role: usuario[0].role_id,
        tenantId: usuario[0].tenant_id,
        tema: usuario[0].tema
      };

      // 5. Garante que a sessão foi salva antes de redirecionar
      req.session.save((err) => {
        if (err) {
          console.error("Erro ao salvar sessão:", err);
          return res.render("login", { erro: "Erro ao criar sessão." });
        }
        res.redirect("/index");
      });

    } catch (error) {
      console.error(error);
      res.render("login", { erro: "Erro interno ao tentar fazer login." });
    }
  });

  // Rota para sair do sistema (Logout)
  app.get("/logout", function (req, res) {
    req.session.destroy(() => {
      res.redirect("/login");
    });
  });
};