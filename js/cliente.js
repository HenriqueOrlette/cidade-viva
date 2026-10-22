/* ==========================================================================
   Cidade Viva — Cliente Supabase e sessão (compartilhado entre telas)

   Usado pelas telas que dependem de login (entrar e registrar).
   Carregue DEPOIS da biblioteca supabase-js e do js/config.js.

   A sessão fica guardada pelo próprio supabase-js no localStorage do
   navegador. Por isso, entrar numa tela vale para todas as outras.
   ========================================================================== */

/* Cliente único desta página. Fica null se o config.js não foi preenchido
   ou se a biblioteca não carregou: as telas checam isso antes de usar. */
var cvDb = null;

(function () {
  var c = window.CV_CONFIG || {};
  var configurado = /^https:\/\/.+/.test(c.SUPABASE_URL || '') &&
    !!c.SUPABASE_CHAVE && c.SUPABASE_CHAVE.indexOf('COLE_AQUI') === -1;

  if (configurado && window.supabase) {
    cvDb = window.supabase.createClient(c.SUPABASE_URL, c.SUPABASE_CHAVE);
  }
})();


/* Telas para onde é permitido voltar depois do login. A lista fixa evita
   que alguém monte um link "entrar.html?voltar=https://site-falso.com" e
   leve a pessoa para fora do app (redirecionamento aberto). */
var CV_PAGINAS_VALIDAS = ['index.html', 'registrar.html', 'aprender.html'];

function cvDestino() {
  var pedido = new URLSearchParams(window.location.search).get('voltar');
  return CV_PAGINAS_VALIDAS.indexOf(pedido) === -1 ? 'index.html' : pedido;
}


/* Garante que existe uma linha em "perfil" para este usuário e devolve o
   nome de usuário dela.

   Por que aqui e não só no cadastro: se a confirmação de e-mail estiver
   LIGADA no Supabase, o cadastro não gera sessão, e o RLS da tabela perfil
   (auth.uid() = id) recusaria o insert. Por isso o nome escolhido também
   viaja em user_metadata, e o perfil é criado no primeiro login.

   Devolve { nome } em caso de sucesso, ou { erro } com um destes valores:
     'sem-perfil'   - não há perfil nem nome guardado (conta criada à mão
                      no painel, por exemplo);
     'nome-em-uso'  - outra pessoa ficou com o nome antes;
     'falha'        - rede ou servidor. */
async function cvGarantirPerfil(user) {
  var busca = await cvDb.from('perfil').select('nome_usuario').eq('id', user.id).limit(1);
  if (busca.error) { return { erro: 'falha' }; }
  if (busca.data.length > 0) { return { nome: busca.data[0].nome_usuario }; }

  var nome = user.user_metadata && user.user_metadata.nome_usuario;
  if (!nome) { return { erro: 'sem-perfil' }; }

  var insercao = await cvDb.from('perfil').insert({ id: user.id, nome_usuario: nome });
  if (insercao.error) {
    /* 23505 é o código do PostgreSQL para violação de UNIQUE. */
    return { erro: insercao.error.code === '23505' ? 'nome-em-uso' : 'falha' };
  }
  return { nome: nome };
}


/* Quem está logado agora: { id, nome } ou null.
   Contas sem perfil utilizável são desconectadas, para a pessoa não ficar
   presa numa sessão que não consegue publicar. Falha de rede NÃO
   desconecta: apenas devolve null. */
async function cvUsuarioAtual() {
  if (!cvDb) { return null; }

  try {
    var sessao = await cvDb.auth.getSession();
    if (!sessao.data || !sessao.data.session) { return null; }

    var user = sessao.data.session.user;
    var perfil = await cvGarantirPerfil(user);

    if (perfil.nome) { return { id: user.id, nome: perfil.nome }; }
    if (perfil.erro !== 'falha') { await cvDb.auth.signOut(); }
    return null;
  } catch (erro) {
    console.error('Falha ao ler a sessão:', erro);
    return null;
  }
}


/* Para telas que exigem login: se não houver usuário, manda para
   entrar.html e, depois do login, a pessoa volta para cá. */
async function cvExigirLogin(paginaAtual) {
  var usuario = await cvUsuarioAtual();
  if (!usuario) {
    window.location.replace('entrar.html?voltar=' + encodeURIComponent(paginaAtual));
  }
  return usuario;
}


async function cvSair() {
  if (cvDb) { await cvDb.auth.signOut(); }
  window.location.replace('index.html');
}