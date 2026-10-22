/* ==========================================================================
   Cidade Viva — Tela de entrar e criar conta (RF08)

   Autenticação simples, usada só para identificar a autoria dos registros.
   A senha nunca passa pelas nossas tabelas: quem a guarda (com hash) é o
   Supabase Auth.
   ========================================================================== */


/* --------------------------------------------------------------------------
   1. ELEMENTOS DA TELA
   -------------------------------------------------------------------------- */

var abas = [
  { botao: document.getElementById('aba-entrar'), painel: document.getElementById('painel-entrar') },
  { botao: document.getElementById('aba-criar'),  painel: document.getElementById('painel-criar') }
];

var formEntrar = document.getElementById('form-entrar');
var formCriar = document.getElementById('form-criar');
var faixaStatus = document.getElementById('status');


/* --------------------------------------------------------------------------
   2. ABAS
   -------------------------------------------------------------------------- */

function selecionarAba(indice, moverFoco) {
  abas.forEach(function (aba, i) {
    var ativa = i === indice;
    aba.botao.setAttribute('aria-selected', ativa ? 'true' : 'false');
    /* Só a aba ativa entra na ordem do Tab; as outras se alcançam com setas. */
    aba.botao.tabIndex = ativa ? 0 : -1;
    aba.painel.hidden = !ativa;
  });
  if (moverFoco) { abas[indice].botao.focus(); }
}

abas.forEach(function (aba, i) {
  aba.botao.addEventListener('click', function () { selecionarAba(i, false); });

  aba.botao.addEventListener('keydown', function (e) {
    var ultimo = abas.length - 1;
    if (e.key === 'ArrowRight') { selecionarAba(i === ultimo ? 0 : i + 1, true); }
    else if (e.key === 'ArrowLeft') { selecionarAba(i === 0 ? ultimo : i - 1, true); }
    else if (e.key === 'Home') { selecionarAba(0, true); }
    else if (e.key === 'End') { selecionarAba(ultimo, true); }
    else { return; }
    e.preventDefault();
  });
});


/* --------------------------------------------------------------------------
   3. MENSAGENS DE ERRO

   Erro de campo: borda vermelha + texto + aria-invalid. A cor sozinha
   nunca carrega a informação.
   -------------------------------------------------------------------------- */

function mostrarErroCampo(campo, mensagem) {
  var erro = document.getElementById(campo.id + '-erro');
  erro.textContent = mensagem;
  erro.hidden = false;
  campo.parentNode.classList.add('campo--erro');
  campo.setAttribute('aria-invalid', 'true');
}

function limparErros(form) {
  form.querySelectorAll('.campo--erro').forEach(function (c) { c.classList.remove('campo--erro'); });
  form.querySelectorAll('[aria-invalid]').forEach(function (c) { c.removeAttribute('aria-invalid'); });
  form.querySelectorAll('.campo__erro').forEach(function (e) { e.hidden = true; e.textContent = ''; });
}

function mostrarErroGeral(idErro, mensagem) {
  var erro = document.getElementById(idErro);
  erro.textContent = mensagem;
  erro.hidden = false;
}

function mostrarStatus(texto) {
  faixaStatus.textContent = texto;
  faixaStatus.hidden = !texto;
}


/* --------------------------------------------------------------------------
   4. VALIDAÇÃO NO CLIENTE

   Dá retorno rápido, mas quem manda é o servidor: o banco exige nome de
   usuário de 3 a 30 caracteres (CHECK nome_usuario_tamanho), e o Supabase
   Auth aplica as próprias regras de e-mail e senha.
   -------------------------------------------------------------------------- */

var PADRAO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* Cada função devolve o primeiro campo inválido, ou null se está tudo certo. */
function validarEntrar(email, senha) {
  if (!PADRAO_EMAIL.test(email.value.trim())) {
    mostrarErroCampo(email, 'Digite um e-mail válido.');
    return email;
  }
  if (senha.value === '') {
    mostrarErroCampo(senha, 'Digite a senha.');
    return senha;
  }
  return null;
}

function validarCriar(nome, email, senha) {
  var tamanho = nome.value.trim().length;
  if (tamanho < 3 || tamanho > 30) {
    mostrarErroCampo(nome, 'O nome de usuário precisa ter de 3 a 30 caracteres.');
    return nome;
  }
  if (!PADRAO_EMAIL.test(email.value.trim())) {
    mostrarErroCampo(email, 'Digite um e-mail válido.');
    return email;
  }
  if (senha.value.length < 8) {
    mostrarErroCampo(senha, 'A senha precisa ter pelo menos 8 caracteres.');
    return senha;
  }
  return null;
}


/* --------------------------------------------------------------------------
   5. TRADUÇÃO DOS ERROS DO SUPABASE AUTH

   O servidor responde em inglês. Cada erro é reconhecido pelo código e,
   como reserva, por um trecho da mensagem. Se algo novo aparecer, cai na
   mensagem genérica no fim.
   -------------------------------------------------------------------------- */

function traduzirErroAuth(erro) {
  var codigo = String(erro.code || '');
  var texto = String(erro.message || '').toLowerCase();

  if (codigo === 'invalid_credentials' || texto.indexOf('invalid login credentials') !== -1) {
    return 'E-mail ou senha incorretos.';
  }
  if (codigo === 'user_already_exists' || texto.indexOf('already registered') !== -1) {
    return 'Já existe uma conta com esse e-mail. Tente entrar.';
  }
  if (codigo === 'email_not_confirmed' || texto.indexOf('email not confirmed') !== -1) {
    return 'Confirme seu e-mail antes de entrar. Procure a mensagem na caixa de entrada.';
  }
  if (codigo === 'weak_password') {
    return 'Senha fraca demais. Escolha uma mais longa ou mais variada.';
  }
  if (erro.status === 429 || codigo.indexOf('rate_limit') !== -1) {
    return 'Muitas tentativas. Espere um pouco e tente de novo.';
  }
  return 'Não foi possível concluir. Verifique a conexão e tente de novo.';
}


/* --------------------------------------------------------------------------
   6. ENTRAR
   -------------------------------------------------------------------------- */

/* Mostra "Entrando…" no botão e impede toque duplo enquanto espera. */
function ocupar(botao, textoOcupado) {
  var textoOriginal = botao.textContent;
  botao.disabled = true;
  botao.textContent = textoOcupado;
  return function liberar() {
    botao.disabled = false;
    botao.textContent = textoOriginal;
  };
}

/* Depois de logar, garante o perfil e segue para a tela de destino. */
async function concluirLogin(user, idErro) {
  var perfil = await cvGarantirPerfil(user);

  if (perfil.nome) {
    window.location.replace(cvDestino());
    return true;
  }

  /* Sem perfil utilizável, a sessão não serve para publicar: desconecta. */
  await cvDb.auth.signOut();
  if (perfil.erro === 'nome-em-uso') {
    mostrarErroGeral(idErro, 'O nome de usuário dessa conta foi usado por outra pessoa. Crie uma nova conta com outro nome.');
  } else if (perfil.erro === 'sem-perfil') {
    mostrarErroGeral(idErro, 'Essa conta não tem nome de usuário. Crie uma nova conta.');
  } else {
    mostrarErroGeral(idErro, 'Não foi possível carregar seu perfil. Tente de novo.');
  }
  return false;
}

formEntrar.addEventListener('submit', async function (e) {
  e.preventDefault();
  limparErros(formEntrar);

  var email = document.getElementById('entrar-email');
  var senha = document.getElementById('entrar-senha');

  var invalido = validarEntrar(email, senha);
  if (invalido) { invalido.focus(); return; }

  var liberar = ocupar(document.getElementById('entrar-botao'), 'Entrando…');
  try {
    var r = await cvDb.auth.signInWithPassword({ email: email.value.trim(), password: senha.value });
    if (r.error) {
      mostrarErroGeral('entrar-erro', traduzirErroAuth(r.error));
    } else {
      await concluirLogin(r.data.user, 'entrar-erro');
    }
  } catch (erro) {
    console.error('Falha ao entrar:', erro);
    mostrarErroGeral('entrar-erro', 'Não foi possível concluir. Verifique a conexão e tente de novo.');
  } finally {
    liberar();
  }
});


/* --------------------------------------------------------------------------
   7. CRIAR CONTA

   Ordem das operações:
     1. confere se o nome de usuário está livre (antes de criar qualquer
        coisa, para não deixar uma conta sem perfil);
     2. cria a conta, levando o nome em user_metadata;
     3. se já veio com sessão, cria o perfil e entra. Se não veio (a
        confirmação de e-mail está ligada), pede para confirmar o e-mail:
        o perfil será criado no primeiro login.
   -------------------------------------------------------------------------- */

formCriar.addEventListener('submit', async function (e) {
  e.preventDefault();
  limparErros(formCriar);

  var nome = document.getElementById('criar-nome');
  var email = document.getElementById('criar-email');
  var senha = document.getElementById('criar-senha');

  var invalido = validarCriar(nome, email, senha);
  if (invalido) { invalido.focus(); return; }

  var nomeFinal = nome.value.trim();
  var liberar = ocupar(document.getElementById('criar-botao'), 'Criando…');

  try {
    /* 1. Nome livre? A tabela perfil é pública para leitura. */
    var busca = await cvDb.from('perfil').select('id').eq('nome_usuario', nomeFinal).limit(1);
    if (busca.error) { throw busca.error; }
    if (busca.data.length > 0) {
      mostrarErroCampo(nome, 'Esse nome de usuário já está em uso. Escolha outro.');
      nome.focus();
      return;
    }

    /* 2. Cria a conta. */
    var r = await cvDb.auth.signUp({
      email: email.value.trim(),
      password: senha.value,
      options: { data: { nome_usuario: nomeFinal } }
    });
    if (r.error) {
      mostrarErroGeral('criar-erro', traduzirErroAuth(r.error));
      return;
    }

    /* Com confirmação de e-mail ligada, o Supabase não avisa que o e-mail
       já existe; devolve um usuário "de fachada" sem identidades. Não
       tenho certeza desse comportamento em todas as versões: vale conferir
       na documentação atual do Supabase Auth. */
    if (r.data.user && r.data.user.identities && r.data.user.identities.length === 0) {
      mostrarErroGeral('criar-erro', 'Já existe uma conta com esse e-mail. Tente entrar.');
      return;
    }

    /* 3a. Sem sessão: falta confirmar o e-mail. */
    if (!r.data.session) {
      document.getElementById('entrar-email').value = email.value.trim();
      selecionarAba(0, false);
      mostrarStatus('Conta criada. Confirme seu e-mail e depois entre.');
      return;
    }

    /* 3b. Com sessão: cria o perfil e segue. */
    await concluirLogin(r.data.user, 'criar-erro');
  } catch (erro) {
    console.error('Falha ao criar conta:', erro);
    mostrarErroGeral('criar-erro', 'Não foi possível concluir. Verifique a conexão e tente de novo.');
  } finally {
    liberar();
  }
});


/* --------------------------------------------------------------------------
   8. INÍCIO
   -------------------------------------------------------------------------- */

async function iniciar() {
  if (!cvDb) {
    mostrarStatus('Banco não configurado. Preencha js/config.js.');
    document.getElementById('entrar-botao').disabled = true;
    document.getElementById('criar-botao').disabled = true;
    return;
  }

  /* Quem já está logado não precisa ver o formulário. */
  var usuario = await cvUsuarioAtual();
  if (usuario) { window.location.replace(cvDestino()); return; }

  /* ?aba=criar abre direto na criação de conta. */
  if (new URLSearchParams(window.location.search).get('aba') === 'criar') {
    selecionarAba(1, false);
  }
}

iniciar();