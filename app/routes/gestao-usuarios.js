const { apenasPerfis } = require('../../config/roleMiddleware');

module.exports = function (app) {

  // 1. ROTA PRINCIPAL: Listagem de Usuários (Ativos e Pendentes com Ordenação)
  app.get('/gestao-usuarios', async (req, res) => {
    const tenantId = req.session.usuarioLogado ? req.session.usuarioLogado.tenantId : null;

    if (!tenantId) {
      return res.redirect('/login');
    }

    // Mapeamento e validação de ordenação para Usuários Ativos
    const colunasAtivosValidas = {
      'nome': 'u.name',
      'departamento': 'd.name',
      'role': 'r.name',
      'email': 'u.email',
      'data': 'u.created_at'
    };
    const sortFieldAtivos = req.query.sortAtivos && colunasAtivosValidas[req.query.sortAtivos] 
                      ? colunasAtivosValidas[req.query.sortAtivos] 
                      : 'u.name';
    const sortOrderAtivos = req.query.orderAtivos === 'desc' ? 'DESC' : 'ASC';

    // Mapeamento e validação de ordenação para Usuários Pendentes
    const colunasPendentesValidas = {
      'nome': 'p.name',
      'departamento': 'd.name',
      'role': 'r.name',
      'email': 'p.email',
      'data': 'p.requested_at'
    };
    const sortFieldPendentes = req.query.sortPendentes && colunasPendentesValidas[req.query.sortPendentes] 
                      ? colunasPendentesValidas[req.query.sortPendentes] 
                      : 'p.requested_at';
    const sortOrderPendentes = req.query.orderPendentes === 'desc' ? 'DESC' : 'ASC';

    try {
      // Query Usuários Ativos
      const [usuariosAtivos] = await req.db.query(`
        SELECT
          u.id,
          u.name AS nome,
          d.name AS departamento,
          r.name AS role,
          u.email,
          u.created_at AS dataCriacao
        FROM users u
        LEFT JOIN departments d ON d.id = u.department_id
        LEFT JOIN roles r ON r.id = u.role_id
        WHERE u.tenant_id = ? AND u.is_active = 1
        ORDER BY ${sortFieldAtivos} ${sortOrderAtivos}
      `, [tenantId]);

      // Query Usuários Pendentes
      const [usuariosPendentes] = await req.db.query(`
        SELECT
          p.id,
          p.name AS nome,
          d.name AS departamento,
          r.name AS role,
          p.email,
          p.requested_at AS dataCriacao
        FROM pending_users p
        LEFT JOIN departments d ON d.id = p.department_id
        LEFT JOIN roles r ON r.id = p.role_id
        WHERE p.tenant_id = ? AND p.status = 'pendente'
        ORDER BY ${sortFieldPendentes} ${sortOrderPendentes}
      `, [tenantId]);

      res.render('gestao-usuarios', {
        tenantId,
        usuariosAtivos,
        usuariosPendentes,
        sortAtivosAtual: req.query.sortAtivos || 'nome',
        orderAtivosAtual: sortOrderAtivos.toLowerCase(),
        sortPendentesAtual: req.query.sortPendentes || 'data',
        orderPendentesAtual: sortOrderPendentes.toLowerCase()
      });
    } catch (erro) {
      console.error("Erro ao buscar gestão de usuários:", erro);
      res.status(500).send("Erro interno ao carregar a gestão de usuários.");
    }
  });

  // 2. ROTA: Processar Aceitação / Rejeição de Pendentes
  app.post('/gestao-usuarios/processar', async (req, res) => {
    const processadoPorId = req.session.usuarioLogado ? req.session.usuarioLogado.id : null;
    if (!processadoPorId) {
      return res.redirect('/login');
    }

    const { usuarioId, acao } = req.body;
    const db = req.db;

    try {
      await db.query('START TRANSACTION');

      if (acao === 'aceitar') {
        const [dadosPendente] = await db.query(
          'SELECT * FROM pending_users WHERE id = ?',
          [usuarioId]
        );

        if (dadosPendente.length === 0) {
          await db.query('ROLLBACK');
          return res.status(404).send('Usuário pendente não encontrado.');
        }

        const u = dadosPendente[0];

        await db.query(
          `INSERT INTO users (tenant_id, name, email, password_hash, role_id, department_id, is_active)
           VALUES (?, ?, ?, ?, ?, ?, 1)`,
          [u.tenant_id, u.name, u.email, u.password_hash, u.role_id, u.department_id]
        );

        await db.query(
          `UPDATE pending_users 
           SET status = 'aprovado', processed_at = CURRENT_TIMESTAMP, processed_by = ?
           WHERE id = ?`,
          [processadoPorId, usuarioId]
        );

      } else if (acao === 'rejeitar') {
        await db.query(
          `UPDATE pending_users 
           SET status = 'recusado', processed_at = CURRENT_TIMESTAMP, processed_by = ?
           WHERE id = ?`,
          [processadoPorId, usuarioId]
        );
      } else {
        await db.query('ROLLBACK');
        return res.status(400).send('Ação inválida.');
      }

      await db.query('COMMIT');
      res.redirect('/gestao-usuarios');

    } catch (erro) {
      if (db) await db.query('ROLLBACK');
      console.error("Erro ao processar usuário:", erro);
      res.status(500).send("Erro interno ao processar a solicitação.");
    }
  });

  // 3. ROTA (GET): Carregar Tela de Edição de Usuário
  app.get('/gestao-usuarios/editar/:id', async (req, res) => {
    const tenantId = req.session.usuarioLogado ? req.session.usuarioLogado.tenantId : null;
    if (!tenantId) {
      return res.redirect('/login');
    }

    const usuarioId = req.params.id;

    try {
      // Busca dados do usuário (filtra por tenant_id por segurança)
      const [usuarioResult] = await req.db.query(
        `SELECT id, name AS nome, email, role_id, department_id, is_active 
         FROM users 
         WHERE id = ? AND tenant_id = ?`,
        [usuarioId, tenantId]
      );

      if (usuarioResult.length === 0) {
        return res.status(404).send('Usuário não encontrado.');
      }

      // Busca departamentos cadastrados para a empresa
      const [departamentos] = await req.db.query(
        'SELECT id, name FROM departments WHERE tenant_id = ? ORDER BY name ASC',
        [tenantId]
      );

      // Busca os papéis/níveis de acesso disponíveis no sistema
      const [roles] = await req.db.query('SELECT id, name FROM roles ORDER BY id ASC');

      res.render('editar-usuario', {
        usuario: usuarioResult[0],
        departamentos,
        roles
      });
    } catch (erro) {
      console.error("Erro ao carregar edição de usuário:", erro);
      res.status(500).send("Erro interno ao carregar a tela de edição.");
    }
  });

  // 4. ROTA (POST): Salvar Alterações do Usuário
  app.post('/gestao-usuarios/editar/:id', async (req, res) => {
    const tenantId = req.session.usuarioLogado ? req.session.usuarioLogado.tenantId : null;
    if (!tenantId) {
      return res.redirect('/login');
    }

    const usuarioId = req.params.id;
    const { nome, email, department_id, role_id, is_active } = req.body;

    try {
      //Trata se o departamento selecionado foi nulo/vazio
      const depId = department_id && department_id !== '' ? department_id : null;

      await req.db.query(
        `UPDATE users 
         SET name = ?, email = ?, role_id = ?, department_id = ?, is_active = ?
         WHERE id = ? AND tenant_id = ?`,
        [nome, email, role_id, depId, is_active, usuarioId, tenantId]
      );

      res.redirect('/gestao-usuarios');
    } catch (erro) {
      console.error("Erro ao atualizar usuário:", erro);
      res.status(500).send("Erro ao salvar alterações do usuário.");
    }
  });

  // 5. ROTA (GET): Deletar Usuário
  app.get('/gestao-usuarios/deletar/:id', async (req, res) => {
    const tenantId = req.session.usuarioLogado ? req.session.usuarioLogado.tenantId : null;
    if (!tenantId) {
      return res.redirect('/login');
    }

    const usuarioId = req.params.id;

    try {
      await req.db.query(
        'DELETE FROM users WHERE id = ? AND tenant_id = ?',
        [usuarioId, tenantId]
      );

      res.redirect('/gestao-usuarios');
    } catch (erro) {
      console.error("Erro ao deletar usuário:", erro);
      res.status(500).send("Erro ao deletar usuário. Verifique se existem chamados ou registros vinculados a este usuário antes de deletar.");
    }
  });

};