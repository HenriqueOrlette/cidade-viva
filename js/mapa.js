/* ==========================================================================
   Cidade Viva — Tela do mapa

   Os pontos agora vêm do banco (Supabase). A função registros_do_mapa(),
   criada no schema.sql, devolve cada registro já com latitude e longitude
   como números, prontos para o Leaflet.
   ========================================================================== */

/* Centro inicial: região da Praça Costa Pereira, centro de Vitória. */
var CENTRO = [-20.3195, -40.3380];
var ZOOM = 15;

/* ---------- Mapa ---------- */

/* zoomControl:false remove os botões padrão do Leaflet, que ficam no
   canto superior esquerdo e cobririam a legenda. */
var mapa = L.map('mapa', { zoomControl: false }).setView(CENTRO, ZOOM);

/* A atribuição é obrigatória pela licença de uso dos dados do OSM. */
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(mapa);

/* Zoom no canto inferior direito: perto do polegar, longe da legenda. */
L.control.zoom({ position: 'bottomright' }).addTo(mapa);

/* Um divIcon é um marcador feito de HTML, e não de imagem. Assim o
   marcador usa as mesmas classes e cores do CSS do app. */
function criarIcone(categoria) {
  var classe = categoria === 'HOSTIL' ? 'marcador--hostil' : 'marcador--hospitaleiro';
  return L.divIcon({
    className: '',
    html: '<div class="marcador ' + classe + '"></div>',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -16]
  });
}

/* ---------- Faixa de status ---------- */

/* Mostra uma mensagem sobre o mapa (carregando, vazio, erro).
   Passar texto vazio esconde a faixa. */
function mostrarStatus(texto) {
  var faixa = document.getElementById('status');
  faixa.textContent = texto;
  faixa.hidden = !texto;
}

/* ---------- Popup ---------- */

/* O texto da descrição é escrito por qualquer usuário. Por isso o popup
   é montado com textContent (que trata tudo como texto puro) e NUNCA com
   innerHTML ou concatenação de string: assim, um "<script>" digitado na
   descrição apareceria como texto, sem executar. */
function criarLinha(tag, texto) {
  var el = document.createElement(tag);
  el.textContent = texto;
  return el;
}

function montarPopup(r) {
  var caixa = document.createElement('div');

  var rotulo = r.categoria === 'HOSTIL' ? 'Hostil' : 'Acolhedor';
  caixa.appendChild(criarLinha('strong', rotulo));
  caixa.appendChild(document.createElement('br'));
  caixa.appendChild(document.createTextNode(r.subcategoria_nome));

  if (r.descricao) {
    caixa.appendChild(criarLinha('p', r.descricao));
  }

  /* O endereço pode estar vazio (a busca no Nominatim é opcional). */
  var partes = [r.endereco_rua, r.endereco_bairro].filter(Boolean);
  if (partes.length) {
    caixa.appendChild(criarLinha('p', partes.join(', ')));
  }

  /* Só aceita foto cujo endereço comece com http(s), e esconde a imagem
     se ela não carregar, em vez de mostrar o ícone de imagem quebrada. */
  if (/^https?:\/\//i.test(r.foto_url || '')) {
    var foto = document.createElement('img');
    foto.src = r.foto_url;
    foto.alt = 'Foto do registro: ' + r.subcategoria_nome;
    foto.width = 200;
    foto.style.maxWidth = '100%';
    foto.style.height = 'auto';
    /* style.display em vez de "hidden": o base.css define display:block
       para img, e isso venceria o atributo hidden. */
    foto.onerror = function () { foto.style.display = 'none'; };
    caixa.appendChild(foto);
  }

  caixa.appendChild(criarLinha('small', 'por ' + r.autor_nome));
  return caixa;
}

/* ---------- Banco de dados ---------- */

function configurado() {
  var c = window.CV_CONFIG || {};
  return /^https:\/\/.+/.test(c.SUPABASE_URL || '') && !!c.SUPABASE_CHAVE
    && c.SUPABASE_CHAVE.indexOf('COLE_AQUI') === -1;
}

function desenharRegistros(registros) {
  registros.forEach(function (r) {
    L.marker([r.latitude, r.longitude], {
      icon: criarIcone(r.categoria),
      /* "title" vira o nome acessível do marcador para leitor de tela. */
      title: (r.categoria === 'HOSTIL' ? 'Hostil: ' : 'Acolhedor: ') + r.subcategoria_nome
    })
      .bindPopup(montarPopup(r))
      .addTo(mapa);
  });
}

async function carregarRegistros() {
  /* Sem configuração, avisa claramente. Não mostramos pontos falsos:
     um mapa com dados inventados passaria a impressão de que o banco
     está funcionando. */
  if (!configurado()) {
    mostrarStatus('Banco não configurado. Preencha js/config.js.');
    return;
  }

  mostrarStatus('Carregando registros…');

  try {
    /* "supabase" é a variável global criada pelo script da biblioteca. */
    var db = supabase.createClient(window.CV_CONFIG.SUPABASE_URL, window.CV_CONFIG.SUPABASE_CHAVE);
    var resposta = await db.rpc('registros_do_mapa');

    /* O supabase-js não lança exceção em erro do servidor: ele devolve
       o erro dentro do objeto. Por isso precisa ser checado aqui. */
    if (resposta.error) { throw resposta.error; }

    var registros = resposta.data || [];
    if (registros.length === 0) {
      mostrarStatus('Ninguém mapeou seu bairro ainda. Seja o primeiro!');
      return;
    }

    desenharRegistros(registros);
    mostrarStatus('');
  } catch (erro) {
    console.error('Falha ao carregar registros:', erro);
    mostrarStatus('Não foi possível carregar os registros. Tente de novo mais tarde.');
  }
}

carregarRegistros();