/* ==========================================================================
   Cidade Viva — Tela do mapa

   Nesta etapa o mapa funciona com pontos de exemplo escritos aqui
   mesmo. A busca no banco entra depois, quando ligarmos o Supabase.
   ========================================================================== */

/* Centro inicial: região da Praça Costa Pereira, centro de Vitória. */
var CENTRO = [-20.3195, -40.3380];
var ZOOM = 15;

/* Pontos de exemplo, apenas para a tela ter o que desenhar. */
var EXEMPLOS = [
  {
    lat: -20.3188, lng: -40.3372,
    categoria: 'HOSTIL',
    tipo: 'Espeto',
    endereco: 'Av. Jerônimo Monteiro, Centro'
  },
  {
    lat: -20.3210, lng: -40.3401,
    categoria: 'HOSPITALEIRO',
    tipo: 'Banco de descanso',
    endereco: 'Parque Moscoso, Centro'
  },
  {
    lat: -20.3172, lng: -40.3355,
    categoria: 'HOSTIL',
    tipo: 'Pino metálico',
    endereco: 'Rua Sete de Setembro, Centro'
  }
];

/* Cria o mapa.
   zoomControl:false remove os botões padrão do Leaflet, que ficam no
   canto superior esquerdo e cobririam a legenda. */
var mapa = L.map('mapa', { zoomControl: false }).setView(CENTRO, ZOOM);

/* Camada de imagens do OpenStreetMap. A atribuição é obrigatória pela
   licença de uso dos dados. */
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(mapa);

/* Controles de zoom no canto inferior direito: perto do polegar e
   longe da legenda. */
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

/* Desenha os pontos no mapa. */
EXEMPLOS.forEach(function (ponto) {
  var rotulo = ponto.categoria === 'HOSTIL' ? 'Hostil' : 'Acolhedor';

  L.marker([ponto.lat, ponto.lng], { icon: criarIcone(ponto.categoria) })
    .bindPopup('<strong>' + rotulo + '</strong><br>' + ponto.tipo + '<br>' + ponto.endereco)
    .addTo(mapa);
});
