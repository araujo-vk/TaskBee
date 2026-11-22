const { possuiPerfil } = require('../../config/roleMiddleware');
const { registrarLog } = require('../../config/logger');

function validarGestor(req, res) {
  const usuario = req.session.usuarioLogado;
  if (!usuario) { res.redirect('/login'); return null; }
  if (!possuiPerfil(usuario, 1, 2)) { res.redirect('/erro/403'); return null; }
  return usuario;
}

function nomeValido(valor, limite = 100) {
  const nome = String(valor || '').trim();
  return nome && nome.length <= limite ? nome : null;
}

function voltar(res, tipo, mensagem) {
  return res.redirect(`/gestao-cadastros?${tipo}=${encodeURIComponent(mensagem)}`);
}

module.exports = function (app) {
  app.get('/gestao-cadastros', async (req, res) => {
    const usuario = validarGestor(req, res);
    if (!usuario) return;

    try {
      const resultados = await Promise.all([
        req.db.query('SELECT id, name FROM departments WHERE tenant_id = ? ORDER BY name', [usuario.tenantId]),
        req.db.query('SELECT id, name FROM ticket_categories WHERE tenant_id = ? ORDER BY name', [usuario.tenantId]),
        req.db.query('SELECT id, name, weight FROM priorities WHERE tenant_id = ? ORDER BY weight', [usuario.tenantId]),
        req.db.query('SELECT id, name FROM statuses WHERE tenant_id = ? ORDER BY id', [usuario.tenantId]),
        req.db.query('SELECT id, name FROM service_categories WHERE tenant_id = ? ORDER BY name', [usuario.tenantId]),
        req.db.query(`
          SELECT srv.id, srv.name, srv.description, srv.is_active,
                 sc.name AS categoria, sp.name AS sla
          FROM services srv
          LEFT JOIN service_categories sc ON sc.id = srv.service_category_id AND sc.tenant_id = srv.tenant_id
          LEFT JOIN sla_policies sp ON sp.id = srv.default_sla_id AND sp.tenant_id = srv.tenant_id
          WHERE srv.tenant_id = ? ORDER BY srv.name
        `, [usuario.tenantId]),
        req.db.query('SELECT id, name FROM sla_policies WHERE tenant_id = ? ORDER BY name', [usuario.tenantId])
      ]);

      return res.render('gestao-cadastros', {
        departamentos: resultados[0][0], categorias: resultados[1][0], prioridades: resultados[2][0],
        status: resultados[3][0], categoriasServico: resultados[4][0], servicos: resultados[5][0],
        politicasSla: resultados[6][0], sucesso: req.query.sucesso || null, erro: req.query.erro || null
      });
    } catch (erro) {
      console.error('Erro ao carregar cadastros:', erro);
      return res.status(500).send('Não foi possível carregar os cadastros.');
    }
  });

  const cadastrosSimples = {
    departamentos: { tabela: 'departments', limite: 100 },
    categorias: { tabela: 'ticket_categories', limite: 100 },
    'categorias-servico': { tabela: 'service_categories', limite: 100 },
    status: { tabela: 'statuses', limite: 50 }
  };

  Object.entries(cadastrosSimples).forEach(([rota, configuracao]) => {
    app.post(`/gestao-cadastros/${rota}`, async (req, res) => {
      const usuario = validarGestor(req, res);
      if (!usuario) return;
      const nome = nomeValido(req.body.nome, configuracao.limite);
      if (!nome) return voltar(res, 'erro', 'Nome inválido.');
      try {
        const [existentes] = await req.db.query(
          `SELECT id FROM ${configuracao.tabela} WHERE tenant_id = ? AND LOWER(name) = LOWER(?) LIMIT 1`,
          [usuario.tenantId, nome]
        );
        if (existentes.length) return voltar(res, 'erro', 'Já existe um registro com esse nome.');
        await req.db.query(`INSERT INTO ${configuracao.tabela} (tenant_id, name) VALUES (?, ?)`, [usuario.tenantId, nome]);
        await registrarLog(req.db, usuario.tenantId, usuario.id, 'Criar', configuracao.tabela, null, `Cadastro criado: ${nome}`);
        return voltar(res, 'sucesso', `${nome} cadastrado com sucesso.`);
      } catch (erro) {
        return voltar(res, 'erro', erro.code === 'ER_DUP_ENTRY' ? 'Já existe um registro com esse nome.' : 'Não foi possível salvar o registro.');
      }
    });

    app.post(`/gestao-cadastros/${rota}/:id/renomear`, async (req, res) => {
      const usuario = validarGestor(req, res);
      if (!usuario) return;
      const nome = nomeValido(req.body.nome, configuracao.limite);
      if (!nome) return voltar(res, 'erro', 'Nome inválido.');
      try {
        const [resultado] = await req.db.query(
          `UPDATE ${configuracao.tabela} SET name = ? WHERE id = ? AND tenant_id = ?`,
          [nome, req.params.id, usuario.tenantId]
        );
        if (!resultado.affectedRows) return res.redirect('/erro/404');
        return voltar(res, 'sucesso', 'Nome atualizado.');
      } catch (erro) {
        return voltar(res, 'erro', 'Não foi possível atualizar o nome.');
      }
    });
  });

  app.post('/gestao-cadastros/prioridades', async (req, res) => {
    const usuario = validarGestor(req, res);
    if (!usuario) return;
    const nome = nomeValido(req.body.nome, 50);
    const peso = Number(req.body.peso);
    if (!nome || !Number.isInteger(peso) || peso < 1 || peso > 10) return voltar(res, 'erro', 'Prioridade inválida.');
    try {
      const [existentes] = await req.db.query('SELECT id FROM priorities WHERE tenant_id = ? AND LOWER(name) = LOWER(?)', [usuario.tenantId, nome]);
      if (existentes.length) return voltar(res, 'erro', 'Já existe uma prioridade com esse nome.');
      await req.db.query('INSERT INTO priorities (tenant_id, name, weight) VALUES (?, ?, ?)', [usuario.tenantId, nome, peso]);
      return voltar(res, 'sucesso', 'Prioridade cadastrada.');
    } catch (erro) {
      return voltar(res, 'erro', 'Não foi possível cadastrar a prioridade.');
    }
  });

  app.post('/gestao-cadastros/servicos', async (req, res) => {
    const usuario = validarGestor(req, res);
    if (!usuario) return;
    const nome = nomeValido(req.body.nome, 150);
    const categoriaId = Number(req.body.categoria_id) || null;
    const slaId = Number(req.body.sla_id) || null;
    if (!nome) return voltar(res, 'erro', 'Nome do serviço inválido.');

    try {
      if (categoriaId) {
        const [categoria] = await req.db.query('SELECT id FROM service_categories WHERE id = ? AND tenant_id = ?', [categoriaId, usuario.tenantId]);
        if (!categoria.length) return voltar(res, 'erro', 'Categoria de serviço inválida.');
      }
      if (slaId) {
        const [sla] = await req.db.query('SELECT id FROM sla_policies WHERE id = ? AND tenant_id = ?', [slaId, usuario.tenantId]);
        if (!sla.length) return voltar(res, 'erro', 'Política de SLA inválida.');
      }
      await req.db.query(`
        INSERT INTO services (tenant_id, name, description, service_category_id, default_sla_id, is_active)
        VALUES (?, ?, ?, ?, ?, TRUE)
      `, [usuario.tenantId, nome, String(req.body.descricao || '').trim(), categoriaId, slaId]);
      return voltar(res, 'sucesso', 'Serviço cadastrado.');
    } catch (erro) {
      return voltar(res, 'erro', 'Não foi possível cadastrar o serviço.');
    }
  });

  app.post('/gestao-cadastros/servicos/:id/alternar', async (req, res) => {
    const usuario = validarGestor(req, res);
    if (!usuario) return;
    const [resultado] = await req.db.query(
      'UPDATE services SET is_active = NOT is_active WHERE id = ? AND tenant_id = ?',
      [req.params.id, usuario.tenantId]
    );
    if (!resultado.affectedRows) return res.redirect('/erro/404');
    return voltar(res, 'sucesso', 'Disponibilidade do serviço atualizada.');
  });
};
