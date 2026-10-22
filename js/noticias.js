/* ==========================================================================
   Cidade Viva — Aba Notícias

   Busca as notícias na tabela "noticia" (cadastradas à mão no painel do
   Supabase) e desenha a lista, com filtro por tipo.

   Depende do js/cliente.js, que cria o acesso ao banco (cvDb).
   ========================================================================== */


/* Rótulo de cada valor do enum "tipo_noticia" do banco. */
var ROTULOS_TIPO = {
  POLITICA_LEIS: 'Política e leis',
  CULTURA_DEBATE: 'Cultura e debate',
  ACAO_CONTRA: 'Ação contra a arquitetura hostil'
};

var listaNoticias = document.getElementById('lista-noticias');
var statusNoticias = document.getElementById('noticias-status');
var botoesFiltro = document.querySelectorAll('.filtro');

var todasNoticias = [];
var filtroAtual = 'TODOS';
var jaCarregou = false;
var carregando = false;


/* --------------------------------------------------------------------------
   1. DESENHO DA LISTA

   Os textos vêm do banco, então os cartões são montados com textContent
   (que trata tudo como texto puro) e nunca com innerHTML. Assim, um
   "<script>" digitado por engano num título aparece como texto, sem rodar.
   -------------------------------------------------------------------------- */

function mostrarStatusNoticias(texto) {
  statusNoticias.textContent = texto;
  statusNoticias.hidden = !texto;
}

/* "2026-09-14" -> "14 de setembro de 2026". Montamos a data com ano, mês e
   dia separados porque new Date("2026-09-14") é lida como meia-noite UTC
   e, no fuso do Brasil, apareceria como o dia anterior. */
function formatarData(iso) {
  var p = String(iso).split('-');
  if (p.length !== 3) { return ''; }
  var data = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  return data.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function criarElemento(tag, classe, texto) {
  var el = document.createElement(tag);
  el.className = classe;
  if (texto) { el.textContent = texto; }
  return el;
}

/* Ícone "abrir em nova aba" (Feather, licença MIT). */
function criarIconeExterno() {
  var ns = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'noticia__icone');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('aria-hidden', 'true');

  var caminho = document.createElementNS(ns, 'path');
  caminho.setAttribute('d', 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6');
  var seta = document.createElementNS(ns, 'polyline');
  seta.setAttribute('points', '15 3 21 3 21 9');
  var linha = document.createElementNS(ns, 'line');
  linha.setAttribute('x1', '10');
  linha.setAttribute('y1', '14');
  linha.setAttribute('x2', '21');
  linha.setAttribute('y2', '3');

  svg.appendChild(caminho);
  svg.appendChild(seta);
  svg.appendChild(linha);
  return svg;
}

function criarCartao(n) {
  var item = document.createElement('li');
  item.className = 'noticia';

  item.appendChild(criarElemento('p', 'noticia__tipo', ROTULOS_TIPO[n.tipo] || ''));

  var titulo = criarElemento('h2', 'noticia__h');

  /* Só vira link se o endereço começar com http(s): "javascript:" e
     parecidos nunca viram href. Sem link válido, o título fica como texto. */
  if (/^https?:\/\//i.test(n.url || '')) {
    var link = criarElemento('a', 'noticia__link', n.titulo);
    link.href = n.url;
    link.target = '_blank';
    /* noopener: a página aberta não ganha acesso à nossa. */
    link.rel = 'noopener noreferrer';
    link.appendChild(criarIconeExterno());
    link.appendChild(criarElemento('span', 'oculto-visual', ' (abre em nova aba)'));
    titulo.appendChild(link);
  } else {
    titulo.textContent = n.titulo;
  }
  item.appendChild(titulo);

  var meta = criarElemento('p', 'noticia__meta');
  meta.appendChild(document.createTextNode(n.fonte + ' · '));
  var tempo = document.createElement('time');
  tempo.dateTime = n.data_publicacao;
  tempo.textContent = formatarData(n.data_publicacao);
  meta.appendChild(tempo);
  item.appendChild(meta);

  item.appendChild(criarElemento('p', 'noticia__resumo', n.resumo));
  return item;
}

function desenharLista() {
  listaNoticias.innerHTML = '';

  var visiveis = todasNoticias.filter(function (n) {
    return filtroAtual === 'TODOS' || n.tipo === filtroAtual;
  });

  if (todasNoticias.length === 0) {
    mostrarStatusNoticias('Ainda não há notícias cadastradas.');
    return;
  }
  if (visiveis.length === 0) {
    mostrarStatusNoticias('Nenhuma notícia desse tipo por enquanto.');
    return;
  }

  mostrarStatusNoticias('');
  visiveis.forEach(function (n) { listaNoticias.appendChild(criarCartao(n)); });
}


/* --------------------------------------------------------------------------
   2. FILTRO
   -------------------------------------------------------------------------- */

botoesFiltro.forEach(function (botao) {
  botao.addEventListener('click', function () {
    filtroAtual = botao.dataset.tipo;
    botoesFiltro.forEach(function (b) {
      b.setAttribute('aria-pressed', b === botao ? 'true' : 'false');
    });
    desenharLista();
  });
});


/* --------------------------------------------------------------------------
   3. BUSCA NO BANCO

   A lista é pequena (curadoria manual), então vem inteira de uma vez, já
   ordenada da mais recente para a mais antiga, e o filtro roda no próprio
   aparelho, sem nova consulta. O limite de 100 protege contra uma lista
   que cresça demais sem ninguém perceber.
   -------------------------------------------------------------------------- */

async function carregarNoticias() {
  if (jaCarregou || carregando) { return; }

  if (!cvDb) {
    mostrarStatusNoticias('Banco não configurado. Preencha js/config.js.');
    return;
  }

  carregando = true;
  mostrarStatusNoticias('Carregando notícias…');

  try {
    var resposta = await cvDb
      .from('noticia')
      .select('id, titulo, fonte, url, data_publicacao, resumo, tipo')
      .order('data_publicacao', { ascending: false })
      .limit(100);

    /* O supabase-js não lança exceção em erro do servidor: devolve o erro
       dentro do objeto. Por isso é preciso checar aqui. */
    if (resposta.error) { throw resposta.error; }

    todasNoticias = resposta.data || [];
    jaCarregou = true;
    desenharLista();
  } catch (erro) {
    console.error('Falha ao carregar notícias:', erro);
    mostrarStatusNoticias('Não foi possível carregar as notícias. Troque de aba e volte para tentar de novo.');
  } finally {
    carregando = false;
  }
}