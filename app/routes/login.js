const bcrypt = require('bcrypt');
const { estaBloqueado, registrarFalha, limpar } = require('../../config/loginRateLimiter');

module.exports = function (app) {
  
  app.get("/login", function (req, res) {
    res.render("login", { erro: null });
  });

  app.post("/login", async function (req, res) {
    const { cnpj_empresa, email, senha } = req.body;
    const identificador = `${cnpj_empresa}:${email}`;

    if (estaBloqueado(req, identificador)) {
      return res.status(429).render('login', { erro: 'Muitas tentativas. Aguarde 15 minutos e tente novamente.' });
    }

    try {
      // 1. Busca a empresa pelo CNPJ
      const [empresa] = await req.db.query("SELECT id FROM tenants WHERE cnpj = ?", [cnpj_empresa]);
      
      if (empresa.length === 0) {
        registrarFalha(req, identificador);
        return res.render("login", { erro: "Empresa não encontrada." });
      }

      // 2. Busca o usuário pelo email E pelo ID da empresa
      const tenantId = empresa[0].id;
      const [usuario] = await req.db.query(
        "SELECT * FROM users WHERE email = ? AND tenant_id = ? AND is_active = TRUE", 
        [email, tenantId]
      );

      if (usuario.length === 0) {
        registrarFalha(req, identificador);
        return res.render("login", { erro: "Email ou senha incorretos." });
      }

      // 3. Compara a senha digitada com o hash criptografado salvo no banco
      const senhaValida = await bcrypt.compare(senha, usuario[0].password_hash);

      if (!senhaValida) {
        registrarFalha(req, identificador);
        await req.db.query(
          'INSERT INTO login_logs (user_id, ip_address, success) VALUES (?, ?, FALSE)',
          [usuario[0].id, req.ip]
        );
        return res.render("login", { erro: "Email ou senha incorretos." });
      }

      limpar(req, identificador);
      await req.db.query(
        'INSERT INTO login_logs (user_id, ip_address, success) VALUES (?, ?, TRUE)',
        [usuario[0].id, req.ip]
      );

      // Regenera o identificador da sessão após o login e usa um formato único.
      req.session.regenerate((erroSessao) => {
        if (erroSessao) {
          console.error("Erro ao criar sessão:", erroSessao);
          return res.render("login", { erro: "Erro ao criar sessão." });
        }

        req.session.usuarioLogado = {
          id: usuario[0].id,
          nome: usuario[0].name,
          roleId: Number(usuario[0].role_id),
          tenantId: Number(usuario[0].tenant_id),
          tema: usuario[0].tema
        };

        req.session.save((erroSalvar) => {
          if (erroSalvar) {
            console.error("Erro ao salvar sessão:", erroSalvar);
            return res.render("login", { erro: "Erro ao criar sessão." });
          }

          const destinos = {
            1: "/dashboard",
            2: "/dashboard",
            3: "/chamados",
            4: "/chamados"
          };

          return res.redirect(destinos[Number(usuario[0].role_id)] || "/chamados");
        });
      });

    } catch (error) {
      console.error(error);
      res.render("login", { erro: "Erro interno ao tentar fazer login." });
    }
  });

  // Rota para sair do sistema (Logout)
  function logout(req, res) {
    req.session.destroy((erro) => {
      if (erro) {
        console.error("Erro ao encerrar sessão:", erro);
      }

      res.clearCookie('connect.sid');
      res.redirect("/login");
    });
  }

  app.post('/logout', logout);
  app.get('/logout', logout);
};
