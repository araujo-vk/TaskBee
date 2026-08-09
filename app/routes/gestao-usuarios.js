const { apenasPerfis } = require('../../config/roleMiddleware');

module.exports = function (app) {
  // ... código anterior (module.exports = function (app) { ...) ...

  app.get('/gestao-usuarios', async (req, res) => {
    // Busca o tenantId de dentro do objeto usuarioLogado da sessão
    const tenantId = req.session.usuarioLogado ? req.session.usuarioLogado.tenantId : null;

    if (!tenantId) {
      return res.redirect('/login');
    }

    // --- LÓGICA DE ORDENAÇÃO PARA ATIVOS (MANTIDA) ---
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

    // --- NOVA LÓGICA DE ORDENAÇÃO PARA PENDENTES ---
    // Mapeamento de colunas válidas da tabela pending_users
    const colunasPendentesValidas = {
        'nome': 'p.name',
        'departamento': 'd.name',
        'role': 'r.name',
        'email': 'p.email',
        'data': 'p.requested_at'
    };
    
    // Captura campos da URL para pendentes, padrão é ordenar por data da solicitação
    const sortFieldPendentes = req.query.sortPendentes && colunasPendentesValidas[req.query.sortPendentes] 
                      ? colunasPendentesValidas[req.query.sortPendentes] 
                      : 'p.requested_at';
    const sortOrderPendentes = req.query.orderPendentes === 'desc' ? 'DESC' : 'ASC';

    try {
      // Query para ativos (mantida com ORDER BY dinâmico)
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

      // QUERY ATUALIZADA para pendentes com ORDER BY dinâmico
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
        ORDER BY ${sortFieldPendentes} ${sortOrderPendentes} -- <--- Adição dinâmica
      `, [tenantId]);

      res.render('gestao-usuarios', {
        tenantId,
        usuariosAtivos,
        usuariosPendentes,
        // Passa os parâmetros de AMBAS as tabelas para a view
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

  app.get("/gestao-users", apenasPerfis([1, 2]), function (req, res) {
    res.render("gestao-users");
  });

  app.get("/gestao-usuarios/editar/:id", apenasPerfis([1, 2]), function (req, res) {
    res.render("editar-usuario");
  });

  // Nova rota para processar aceitação/rejeição
  app.post('/gestao-usuarios/processar', async (req, res) => {
    // Garante que o ID do processador venha da sessão
    const processadoPorId = req.session.usuarioLogado ? req.session.usuarioLogado.id : null;
    if (!processadoPorId) {
        return res.redirect('/login');
    }

    const { usuarioId, acao } = req.body;

    // Conexão do banco injetada pelo middleware
    const db = req.db;

    try {
        // Inicia uma transação para garantir consistência
        await db.query('START TRANSACTION');

        if (acao === 'aceitar') {
            // 1. Busca os dados do usuário pendente
            const [dadosPendente] = await db.query(
                'SELECT * FROM pending_users WHERE id = ?',
                [usuarioId]
            );

            if (dadosPendente.length === 0) {
                await db.query('ROLLBACK');
                return res.status(404).send('Usuário pendente não encontrado.');
            }

            const u = dadosPendente[0];

            // 2. Insere na tabela de usuários ativos
            await db.query(
                `INSERT INTO users (tenant_id, name, email, password_hash, role_id, department_id, is_active)
                 VALUES (?, ?, ?, ?, ?, ?, 1)`,
                [u.tenant_id, u.name, u.email, u.password_hash, u.role_id, u.department_id]
            );

            // 3. Atualiza o status do pedido para 'aprovado'
            await db.query(
                `UPDATE pending_users 
                 SET status = 'aprovado', processed_at = CURRENT_TIMESTAMP, processed_by = ?
                 WHERE id = ?`,
                [processadoPorId, usuarioId]
            );

        } else if (acao === 'rejeitar') {
            // Apenas atualiza o status para 'recusado'
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

        // Confirma as alterações
        await db.query('COMMIT');
        res.redirect('/gestao-usuarios');

    } catch (erro) {
        // Cancela as alterações em caso de erro
        if (db) await db.query('ROLLBACK');
        console.error("Erro ao processar usuário:", erro);
        res.status(500).send("Erro interno ao processar a solicitação.");
    }
  });
};