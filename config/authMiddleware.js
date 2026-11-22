const { obterRoleId } = require('./roleMiddleware');

// Páginas de visitante; /admin continua exigindo sessão de qualquer perfil.
const rotasPublicas = new Set([
  '/login',
  '/cadastro',
  '/cadastro-empresa',
  '/index',
  '/',
  '/sobre'
]);


// As chaves mais específicas devem ser avaliadas primeiro.
const restricoes = [
  { prefixo: '/IA/relatorios', perfis: [1, 2] },
  { prefixo: '/gestao-usuarios', perfis: [1, 2] },
  { prefixo: '/gestao-cadastros', perfis: [1, 2] },
  { prefixo: '/gestao-sla', perfis: [1, 2] },
  { prefixo: '/config-sistema', perfis: [1, 2] },
  { prefixo: '/gestao-ativos', perfis: [1, 2, 3] },
  { prefixo: '/logs', perfis: [1, 2] },
  { prefixo: '/dashboard', perfis: [1, 2, 3] },
  { prefixo: '/relatorios', perfis: [1, 2, 3] }
].sort((a, b) => b.prefixo.length - a.prefixo.length);

function pertenceAoPrefixo(caminho, prefixo) {
  return caminho === prefixo || caminho.startsWith(`${prefixo}/`);
}

module.exports = async function (req, res, next) {
  const caminho = (req.path.replace(/\/+$/, '') || '/').toLowerCase();
  const publica = rotasPublicas.has(caminho) || caminho.startsWith('/erro/');
  res.locals.usuario = null;
  res.locals.usuarioLogado = null;
  res.locals.notificacoesNaoLidas = 0;
  function sessaoInvalida() {
    delete req.session.usuarioLogado;
    return publica ? next() : res.redirect('/login');
  }
  const usuario = req.session && req.session.usuarioLogado;

  if (usuario) {
    // Normaliza sessões antigas sem quebrar uma sessão criada antes desta correção.
    usuario.roleId = obterRoleId(usuario);
    usuario.tenantId = Number(usuario.tenantId ?? usuario.tenant_id);
    usuario.nome = usuario.nome || usuario.name;

    if (!Number.isInteger(usuario.roleId) || ![1, 2, 3, 4].includes(usuario.roleId)
      || !Number.isInteger(usuario.tenantId) || usuario.tenantId <= 0) {
      return sessaoInvalida();
    }

    try {
      const [usuariosAtivos] = await req.db.query(
        `SELECT name, role_id, tenant_id, tema
         FROM users
         WHERE id = ? AND tenant_id = ? AND is_active = TRUE
         LIMIT 1`,
        [usuario.id, usuario.tenantId]
      );

      if (usuariosAtivos.length === 0) {
        return sessaoInvalida();
      }

      // Atualiza o papel e o nome caso um gestor tenha alterado a conta.
      usuario.nome = usuariosAtivos[0].name;
      usuario.roleId = Number(usuariosAtivos[0].role_id);
      usuario.tenantId = Number(usuariosAtivos[0].tenant_id);
      usuario.tema = usuariosAtivos[0].tema;

      const [contagemNotificacoes] = await req.db.query(`
        SELECT COUNT(*) AS total
        FROM notifications
        WHERE tenant_id = ? AND user_id = ? AND is_read = FALSE
      `, [usuario.tenantId, usuario.id]);
      res.locals.notificacoesNaoLidas = Number(contagemNotificacoes[0].total || 0);
    } catch (erro) {
      return next(erro);
    }

    req.usuario = usuario;
  }

  res.locals.usuario = usuario || null;
  res.locals.usuarioLogado = usuario || null;

  if (publica) {
    return next();
  }

  if (!usuario) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ erro: 'Usuário não autenticado.' });
    }

    return res.redirect('/login');
  }

  const restricao = restricoes.find(item => pertenceAoPrefixo(caminho, item.prefixo.toLowerCase()));

  if (restricao && !restricao.perfis.includes(usuario.roleId)) {
    return res.redirect('/erro/403');
  }

  return next();
};
