// public/js/routes/configuracoes-user_6.js (ou o caminho equivalente no seu projeto)

const bcrypt = require('bcrypt');
const { themes, byId, unlock } = require('../../config/themes');

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
          WHERE u.id = ? AND u.tenant_id = ?
      `;

      const [results] = await request.db.query(sql, [userId, request.session.usuarioLogado.tenantId]);

      if (results.length === 0) {
        return response.redirect('/erro/404');
      }

      const usuario = results[0];
      
      const erro = request.query.erro || null;
      const sucesso = request.query.sucesso || null;
      
      const months = Math.max(0, (Date.now() - new Date(usuario.created_at).getTime()) / (86400000 * 30.4375));
      for (const [threshold, id] of [[1,'age-1'],[3,'age-3'],[6,'age-6'],[12,'age-12'],[24,'age-24']]) {
        if (months >= threshold) await unlock(request.db, request.session.usuarioLogado, id);
      }
      const [allOwned] = await request.db.query('SELECT theme_id FROM user_themes WHERE tenant_id = ? AND user_id = ?', [request.session.usuarioLogado.tenantId, userId]);
      response.render("configuracoes-user", { usuario, erro, sucesso, themes, unlockedThemes: new Set(allOwned.map(row => row.theme_id)) });

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
      const tenantId = request.session.usuarioLogado.tenantId;

      if (!String(nome || '').trim() || !/^\S+@\S+\.\S+$/.test(String(email || '').trim())) {
        return response.redirect('/configuracoes-user?erro=Nome ou e-mail inválido.');
      }

      let sql = `UPDATE users SET name = ?, email = ? WHERE id = ? AND tenant_id = ?`;
      let params = [String(nome).trim(), String(email).trim().toLowerCase(), userId, tenantId];

      if (senha || confirmarSenha) {
        if (senha !== confirmarSenha) {
          return response.redirect("/configuracoes-user?erro=As senhas não coincidem. Nenhuma alteração foi salva.");
        }
        if (senha && senha.length < 8) {
          return response.redirect('/configuracoes-user?erro=A senha deve ter pelo menos 8 caracteres.');
        }
        
        if (senha.trim() !== "") {
          const passwordHash = await bcrypt.hash(senha, 10);
          sql = `UPDATE users SET name = ?, email = ?, password_hash = ? WHERE id = ? AND tenant_id = ?`;
          params = [String(nome).trim(), String(email).trim().toLowerCase(), passwordHash, userId, tenantId];
        }
      }

      await request.db.query(sql, params);
      request.session.usuarioLogado.nome = String(nome).trim();
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
      if (!['light', 'dark', 'system'].includes(tema) && !byId.has(tema)) {
        return response.status(400).json({ erro: "Tema inválido." });
      }
      if (byId.has(tema) && !['light','dark','system'].includes(tema)) {
        const [owned] = await request.db.query('SELECT 1 FROM user_themes WHERE tenant_id = ? AND user_id = ? AND theme_id = ?', [request.session.usuarioLogado.tenantId,userId,tema]);
        if (!owned.length) return response.status(403).json({ erro: 'Tema ainda não desbloqueado.' });
      }

      // Atualiza o banco de dados
      await request.db.query(
        `UPDATE users SET tema = ? WHERE id = ? AND tenant_id = ?`,
        [tema, userId, request.session.usuarioLogado.tenantId]
      );

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
  app.get('/api/avisos', async (request, response) => {
    const user = request.session.usuarioLogado;
    if (!user) return response.status(401).json({ erro: 'Login necessário.' });
    try {
      const [[unlocks], [notifications]] = await Promise.all([
        request.db.query('SELECT theme_id, unlocked_at FROM user_themes WHERE tenant_id=? AND user_id=? AND unlocked_at > DATE_SUB(NOW(), INTERVAL 2 MINUTE) ORDER BY unlocked_at DESC LIMIT 10',[user.tenantId,user.id]),
        request.db.query('SELECT id,title,message,link_url,created_at FROM notifications WHERE tenant_id=? AND user_id=? AND is_read=FALSE AND created_at > DATE_SUB(NOW(), INTERVAL 2 MINUTE) ORDER BY created_at DESC LIMIT 10',[user.tenantId,user.id])
      ]);
      return response.json({ themes: unlocks.filter(row => byId.has(row.theme_id)).map(row => ({ id: row.theme_id, name: byId.get(row.theme_id).name, at: row.unlocked_at })), notifications });
    } catch (error) { console.error('Avisos:',error); return response.status(500).json({erro:'Avisos indisponíveis.'}); }
  });
};
