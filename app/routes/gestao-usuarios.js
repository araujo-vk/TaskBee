const bcrypt = require('bcrypt');
const { possuiPerfil, obterRoleId } = require('../../config/roleMiddleware');
const { lerCsv, enviarCsv } = require('../../config/csv');

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizar(valor) {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function validarGestor(usuario, resposta) {
  if (!usuario) {
    resposta.redirect('/login');
    return false;
  }

  if (!possuiPerfil(usuario, 1, 2)) {
    resposta.redirect('/erro/403');
    return false;
  }

  return true;
}

function redirecionarComMensagem(resposta, tipo, mensagem) {
  return resposta.redirect(`/gestao-usuarios?${tipo}=${encodeURIComponent(mensagem)}`);
}

function resolverPerfil(valor, roles) {
  const texto = normalizar(valor);
  const aliases = { administrador: 'admin', solicitante: 'usuario', usuario: 'usuario', tecnico: 'tecnico', gestor: 'gestor' };
  const procurado = aliases[texto] || texto;
  return roles.find(role => String(role.id) === texto || normalizar(role.name) === procurado) || null;
}

module.exports = function (app) {
  app.get('/gestao-usuarios', async (req, res) => {
    const usuarioLogado = req.session.usuarioLogado;
    const tenantId = usuarioLogado && usuarioLogado.tenantId;
    if (!tenantId) return res.redirect('/login');

    const colunasAtivosValidas = { nome: 'u.name', departamento: 'd.name', role: 'r.name', email: 'u.email', data: 'u.created_at' };
    const colunasPendentesValidas = { nome: 'p.name', departamento: 'd.name', role: 'r.name', email: 'p.email', data: 'p.requested_at' };
    const sortFieldAtivos = colunasAtivosValidas[req.query.sortAtivos] || 'u.name';
    const sortFieldPendentes = colunasPendentesValidas[req.query.sortPendentes] || 'p.requested_at';
    const sortOrderAtivos = req.query.orderAtivos === 'desc' ? 'DESC' : 'ASC';
    const sortOrderPendentes = req.query.orderPendentes === 'asc' ? 'ASC' : 'DESC';

    try {
      const [usuariosAtivos, usuariosPendentes, usuariosInativos] = await Promise.all([
        req.db.query(`
          SELECT u.id, u.name AS nome, d.name AS departamento, r.name AS role, u.email, u.created_at AS dataCriacao
          FROM users u
          LEFT JOIN departments d ON d.id = u.department_id AND d.tenant_id = u.tenant_id
          LEFT JOIN roles r ON r.id = u.role_id
          WHERE u.tenant_id = ? AND u.is_active = TRUE
          ORDER BY ${sortFieldAtivos} ${sortOrderAtivos}
        `, [tenantId]),
        req.db.query(`
          SELECT p.id, p.name AS nome, d.name AS departamento, r.name AS role, p.email, p.requested_at AS dataCriacao
          FROM pending_users p
          LEFT JOIN departments d ON d.id = p.department_id AND d.tenant_id = p.tenant_id
          LEFT JOIN roles r ON r.id = p.role_id
          WHERE p.tenant_id = ? AND p.status = 'pendente'
          ORDER BY ${sortFieldPendentes} ${sortOrderPendentes}
        `, [tenantId]),
        req.db.query(`
          SELECT u.id, u.name AS nome, u.email, r.name AS role
          FROM users u LEFT JOIN roles r ON r.id = u.role_id
          WHERE u.tenant_id = ? AND u.is_active = FALSE
          ORDER BY u.name
        `, [tenantId])
      ]);

      res.render('gestao-usuarios', {
        tenantId,
        usuariosAtivos: usuariosAtivos[0],
        usuariosPendentes: usuariosPendentes[0],
        usuariosInativos: usuariosInativos[0],
        sortAtivosAtual: req.query.sortAtivos || 'nome',
        orderAtivosAtual: sortOrderAtivos.toLowerCase(),
        sortPendentesAtual: req.query.sortPendentes || 'data',
        orderPendentesAtual: sortOrderPendentes.toLowerCase(),
        sucesso: req.query.sucesso || null,
        erro: req.query.erro || null
      });
    } catch (erro) {
      console.error('Erro ao buscar gestão de usuários:', erro);
      res.status(500).send('Erro interno ao carregar a gestão de usuários.');
    }
  });

  app.get('/gestao-usuarios/exportar/departamentos.csv', async (req, res) => {
    const usuario = req.session.usuarioLogado;
    if (!validarGestor(usuario, res)) return;

    try {
      const [departamentos] = await req.db.query(
        'SELECT id, name FROM departments WHERE tenant_id = ? ORDER BY name ASC',
        [usuario.tenantId]
      );
      return enviarCsv(res, 'taskbee-departamentos.csv', ['ID', 'Nome'], departamentos.map(item => [item.id, item.name]));
    } catch (erro) {
      console.error('Erro ao exportar departamentos:', erro);
      return res.status(500).send('Não foi possível exportar os departamentos.');
    }
  });

  app.get('/gestao-usuarios/exportar/usuarios.csv', async (req, res) => {
    const usuario = req.session.usuarioLogado;
    if (!validarGestor(usuario, res)) return;

    try {
      const [usuarios] = await req.db.query(`
        SELECT u.id, u.name, u.email, d.name AS department, r.name AS role, u.is_active, u.created_at
        FROM users u
        LEFT JOIN departments d ON d.id = u.department_id AND d.tenant_id = u.tenant_id
        LEFT JOIN roles r ON r.id = u.role_id
        WHERE u.tenant_id = ?
        ORDER BY u.name ASC
      `, [usuario.tenantId]);
      return enviarCsv(res, 'taskbee-usuarios.csv', ['ID', 'Nome', 'E-mail', 'Departamento', 'Perfil', 'Ativo', 'Criado em'], usuarios.map(item => [
        item.id, item.name, item.email, item.department, item.role, item.is_active ? 'Sim' : 'Não', item.created_at
      ]));
    } catch (erro) {
      console.error('Erro ao exportar usuários:', erro);
      return res.status(500).send('Não foi possível exportar os usuários.');
    }
  });

  app.post('/gestao-usuarios/importar/departamentos', async (req, res) => {
    const usuario = req.session.usuarioLogado;
    if (!validarGestor(usuario, res)) return;

    if (String(req.body.csv_content || '').length > 1_000_000) {
      return redirecionarComMensagem(res, 'erro', 'O arquivo excede o limite de 1 MB.');
    }

    const registros = lerCsv(req.body.csv_content);
    if (!registros.length) {
      return redirecionarComMensagem(res, 'erro', 'CSV inválido. Use o cabeçalho Nome e o separador ponto e vírgula.');
    }

    const tenantId = usuario.tenantId;
    const conexao = await req.db.getConnection();
    let importados = 0;
    let ignorados = 0;

    try {
      const [existentes] = await conexao.query('SELECT name FROM departments WHERE tenant_id = ?', [tenantId]);
      const nomes = new Set(existentes.map(item => normalizar(item.name)));
      await conexao.beginTransaction();

      for (const registro of registros.slice(0, 500)) {
        const nome = String(registro.nome || registro.name || '').trim();
        if (!nome || nome.length > 100 || nomes.has(normalizar(nome))) {
          ignorados += 1;
          continue;
        }
        await conexao.query('INSERT INTO departments (tenant_id, name) VALUES (?, ?)', [tenantId, nome]);
        nomes.add(normalizar(nome));
        importados += 1;
      }

      ignorados += Math.max(registros.length - 500, 0);
      await conexao.commit();
      return redirecionarComMensagem(res, 'sucesso', `Departamentos importados: ${importados}. Linhas ignoradas: ${ignorados}.`);
    } catch (erro) {
      await conexao.rollback();
      console.error('Erro ao importar departamentos:', erro);
      return redirecionarComMensagem(res, 'erro', 'A importação de departamentos não foi concluída.');
    } finally {
      conexao.release();
    }
  });

  app.post('/gestao-usuarios/importar/usuarios', async (req, res) => {
    const usuario = req.session.usuarioLogado;
    if (!validarGestor(usuario, res)) return;

    if (String(req.body.csv_content || '').length > 1_000_000) {
      return redirecionarComMensagem(res, 'erro', 'O arquivo excede o limite de 1 MB.');
    }

    const registros = lerCsv(req.body.csv_content);
    if (!registros.length) {
      return redirecionarComMensagem(res, 'erro', 'CSV inválido. Use Nome;E-mail;Senha;Departamento;Perfil como cabeçalho.');
    }

    const tenantId = usuario.tenantId;
    const roleLogado = obterRoleId(usuario);
    const conexao = await req.db.getConnection();
    let importados = 0;
    let ignorados = 0;

    try {
      const [[departamentos], [roles], [usuariosExistentes]] = await Promise.all([
        conexao.query('SELECT id, name FROM departments WHERE tenant_id = ?', [tenantId]),
        conexao.query('SELECT id, name FROM roles'),
        conexao.query('SELECT email FROM users WHERE tenant_id = ?', [tenantId])
      ]);
      const departamentosPorNome = new Map(departamentos.map(item => [normalizar(item.name), item.id]));
      const emails = new Set(usuariosExistentes.map(item => normalizar(item.email)));
      await conexao.beginTransaction();

      for (const registro of registros.slice(0, 200)) {
        const nome = String(registro.nome || registro.name || '').trim();
        const email = String(registro.email || registro.e_mail || '').trim().toLowerCase();
        const senha = String(registro.senha || registro.password || '').trim();
        const departamentoNome = String(registro.departamento || registro.department || '').trim();
        const perfil = resolverPerfil(registro.perfil || registro.role || registro.papel, roles);
        const departmentId = departamentoNome ? departamentosPorNome.get(normalizar(departamentoNome)) : null;

        if (!nome || nome.length > 150 || !EMAIL_VALIDO.test(email) || emails.has(normalizar(email))
          || senha.length < 8 || !perfil || perfil.id < roleLogado || (departamentoNome && !departmentId)) {
          ignorados += 1;
          continue;
        }

        const senhaHash = await bcrypt.hash(senha, 10);
        await conexao.query(`
          INSERT INTO users (tenant_id, name, email, password_hash, role_id, department_id, is_active)
          VALUES (?, ?, ?, ?, ?, ?, TRUE)
        `, [tenantId, nome, email, senhaHash, perfil.id, departmentId]);
        emails.add(normalizar(email));
        importados += 1;
      }

      ignorados += Math.max(registros.length - 200, 0);
      await conexao.commit();
      return redirecionarComMensagem(res, 'sucesso', `Usuários importados: ${importados}. Linhas ignoradas: ${ignorados}.`);
    } catch (erro) {
      await conexao.rollback();
      console.error('Erro ao importar usuários:', erro);
      return redirecionarComMensagem(res, 'erro', 'A importação de usuários não foi concluída.');
    } finally {
      conexao.release();
    }
  });

  app.post('/gestao-usuarios/processar', async (req, res) => {
    const usuarioLogado = req.session.usuarioLogado;
    if (!validarGestor(usuarioLogado, res)) return;

    const tenantId = usuarioLogado.tenantId;
    const conexao = await req.db.getConnection();
    try {
      await conexao.beginTransaction();
      const [pendentes] = await conexao.query(
        "SELECT * FROM pending_users WHERE id = ? AND tenant_id = ? AND status = 'pendente'",
        [req.body.usuarioId, tenantId]
      );
      if (!pendentes.length) {
        await conexao.rollback();
        return res.redirect('/erro/404');
      }

      if (req.body.acao === 'aceitar') {
        const pendente = pendentes[0];
        await conexao.query(`
          INSERT INTO users (tenant_id, name, email, password_hash, role_id, department_id, is_active)
          VALUES (?, ?, ?, ?, ?, ?, TRUE)
        `, [pendente.tenant_id, pendente.name, pendente.email, pendente.password_hash, pendente.role_id, pendente.department_id]);
        await conexao.query("UPDATE pending_users SET status = 'aprovado', processed_at = NOW(), processed_by = ? WHERE id = ? AND tenant_id = ?", [usuarioLogado.id, pendente.id, tenantId]);
      } else if (req.body.acao === 'rejeitar') {
        await conexao.query("UPDATE pending_users SET status = 'recusado', processed_at = NOW(), processed_by = ? WHERE id = ? AND tenant_id = ?", [usuarioLogado.id, pendentes[0].id, tenantId]);
      } else {
        await conexao.rollback();
        return res.status(400).send('Ação inválida.');
      }

      await conexao.commit();
      return res.redirect('/gestao-usuarios');
    } catch (erro) {
      await conexao.rollback();
      console.error('Erro ao processar usuário:', erro);
      return res.status(500).send('Erro interno ao processar a solicitação.');
    } finally {
      conexao.release();
    }
  });

  app.get('/gestao-usuarios/editar/:id', async (req, res) => {
    const usuarioLogado = req.session.usuarioLogado;
    if (!validarGestor(usuarioLogado, res)) return;
    const tenantId = usuarioLogado.tenantId;

    try {
      const [[usuarios], [departamentos], [roles]] = await Promise.all([
        req.db.query('SELECT id, name AS nome, email, role_id, department_id, is_active FROM users WHERE id = ? AND tenant_id = ?', [req.params.id, tenantId]),
        req.db.query('SELECT id, name FROM departments WHERE tenant_id = ? ORDER BY name ASC', [tenantId]),
        req.db.query('SELECT id, name FROM roles ORDER BY id ASC')
      ]);
      if (!usuarios.length) return res.redirect('/erro/404');
      return res.render('editar-usuario', { usuario: usuarios[0], departamentos, roles });
    } catch (erro) {
      console.error('Erro ao carregar edição de usuário:', erro);
      return res.status(500).send('Erro interno ao carregar a tela de edição.');
    }
  });

  app.post('/gestao-usuarios/editar/:id', async (req, res) => {
    const usuarioLogado = req.session.usuarioLogado;
    if (!validarGestor(usuarioLogado, res)) return;
    const tenantId = usuarioLogado.tenantId;
    const { nome, email, department_id, role_id, is_active } = req.body;
    const novoRole = Number(role_id);

    try {
      const [[alvos], [departamentos]] = await Promise.all([
        req.db.query('SELECT role_id FROM users WHERE id = ? AND tenant_id = ?', [req.params.id, tenantId]),
        department_id ? req.db.query('SELECT id FROM departments WHERE id = ? AND tenant_id = ?', [department_id, tenantId]) : Promise.resolve([[]])
      ]);
      if (!alvos.length) return res.redirect('/erro/404');
      if (![1, 2, 3, 4].includes(novoRole) || obterRoleId(usuarioLogado) > Number(alvos[0].role_id) || obterRoleId(usuarioLogado) > novoRole) return res.redirect('/erro/403');
      if (department_id && !departamentos.length) return res.status(400).send('Departamento inválido para esta empresa.');
      if (!String(nome || '').trim() || !EMAIL_VALIDO.test(String(email || '').trim())) return res.status(400).send('Nome ou e-mail inválido.');

      await req.db.query(`
        UPDATE users SET name = ?, email = ?, role_id = ?, department_id = ?, is_active = ?
        WHERE id = ? AND tenant_id = ?
      `, [String(nome).trim(), String(email).trim().toLowerCase(), novoRole, department_id || null, is_active === '1' ? 1 : 0, req.params.id, tenantId]);
      return res.redirect('/gestao-usuarios');
    } catch (erro) {
      console.error('Erro ao atualizar usuário:', erro);
      return res.status(erro.code === 'ER_DUP_ENTRY' ? 400 : 500).send(erro.code === 'ER_DUP_ENTRY' ? 'Este e-mail já está em uso nesta empresa.' : 'Erro ao salvar alterações do usuário.');
    }
  });

  app.post('/gestao-usuarios/desativar/:id', async (req, res) => {
    const usuarioLogado = req.session.usuarioLogado;
    if (!usuarioLogado) return res.redirect('/login');
    if (!possuiPerfil(usuarioLogado, 1)) return res.redirect('/erro/403');
    if (Number(req.params.id) === Number(usuarioLogado.id)) return res.status(400).send('Você não pode desativar a própria conta.');

    try {
      await req.db.query('UPDATE users SET is_active = FALSE WHERE id = ? AND tenant_id = ?', [req.params.id, usuarioLogado.tenantId]);
      return res.redirect('/gestao-usuarios');
    } catch (erro) {
      console.error('Erro ao desativar usuário:', erro);
      return res.status(500).send('Erro ao desativar usuário.');
    }
  });

  app.post('/gestao-usuarios/reativar/:id', async (req, res) => {
    const usuarioLogado = req.session.usuarioLogado;
    if (!validarGestor(usuarioLogado, res)) return;
    try {
      const [resultado] = await req.db.query(
        'UPDATE users SET is_active = TRUE WHERE id = ? AND tenant_id = ? AND is_active = FALSE',
        [req.params.id, usuarioLogado.tenantId]
      );
      if (!resultado.affectedRows) return res.redirect('/erro/404');
      return redirecionarComMensagem(res, 'sucesso', 'Usuário reativado.');
    } catch (erro) {
      return redirecionarComMensagem(res, 'erro', 'Não foi possível reativar o usuário.');
    }
  });
};
