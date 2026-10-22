/* ==========================================================================
   Cidade Viva — Tela Aprender

   Duas partes:
     1. as abas Entender / Notícias;
     2. o reforço do acordeão para navegadores antigos.

   A aba Entender funciona sem este arquivo. O acordeão é feito com
   <details> e <summary>, que o navegador já sabe abrir e fechar sozinho.
   ========================================================================== */


/* --------------------------------------------------------------------------
   1. ABAS

   Mesmo padrão ARIA da tela de entrar. A aba Notícias só busca os dados
   quando é aberta pela primeira vez: quem veio só ler os conceitos não
   gasta uma requisição ao banco.
   -------------------------------------------------------------------------- */

var abas = [
  { botao: document.getElementById('aba-entender'), painel: document.getElementById('painel-entender') },
  { botao: document.getElementById('aba-noticias'), painel: document.getElementById('painel-noticias') }
];

function selecionarAba(indice, moverFoco) {
  abas.forEach(function (aba, i) {
    var ativa = i === indice;
    aba.botao.setAttribute('aria-selected', ativa ? 'true' : 'false');
    /* Só a aba ativa entra na ordem do Tab; as outras se alcançam com setas. */
    aba.botao.tabIndex = ativa ? 0 : -1;
    aba.painel.hidden = !ativa;
  });
  if (moverFoco) { abas[indice].botao.focus(); }

  /* carregarNoticias vem do js/noticias.js, carregado logo depois deste. */
  if (indice === 1 && typeof carregarNoticias === 'function') { carregarNoticias(); }
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

/* aprender.html#noticias abre direto na aba Notícias. O carregamento fica
   para o fim da página, depois que o noticias.js existir. */
window.addEventListener('load', function () {
  if (window.location.hash === '#noticias') { selecionarAba(1, false); }
});


/* --------------------------------------------------------------------------
   2. ACORDEÃO EM NAVEGADORES ANTIGOS

   O atributo name="topico" repetido em todos os <details> faz com que
   apenas um fique aberto por vez. Esse atributo, porém, é recente.
   Navegadores antigos o ignoram e deixam vários tópicos abertos ao mesmo
   tempo — o que continua utilizável, mas não é o comportamento combinado.
   Este trecho existe só para cobrir esse caso.
   -------------------------------------------------------------------------- */

/* Testa se o navegador conhece o atributo. Elementos HTML expõem seus
   atributos como propriedades do objeto; se o navegador não implementa
   "name" em <details>, a propriedade simplesmente não existe. */
var suportaExclusivo = 'name' in document.createElement('details');

if (!suportaExclusivo) {
  var topicos = document.querySelectorAll('.topico');

  topicos.forEach(function (topico) {

    /* O evento "toggle" dispara tanto ao abrir quanto ao fechar, por
       isso a checagem: só fazemos algo quando este foi o aberto. */
    topico.addEventListener('toggle', function () {
      if (!topico.open) return;

      topicos.forEach(function (outro) {
        if (outro !== topico) outro.open = false;
      });
    });

  });
}