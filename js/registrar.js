/* ==========================================================================
   Cidade Viva — Tela de registro

   Nesta etapa a tela funciona sozinha: valida o formulário, captura a
   localização e busca o endereço. O envio ao banco entra depois, quando
   ligarmos o Supabase.
   ========================================================================== */


/* --------------------------------------------------------------------------
   1. LISTA FIXA DE SUBCATEGORIAS (RF04)

   Espelha a tabela "subcategoria" do banco. Os ids são os mesmos gerados
   pelos inserts do schema.sql, para que a integração futura não precise
   traduzir nada. "exigeDescricao" reproduz a coluna de mesmo nome, que no
   banco é checada pelo gatilho valida_descricao_registro().
   -------------------------------------------------------------------------- */

var SUBCATEGORIAS = {
  HOSTIL: [
    { id: 1, nome: 'Pino Metálico',   exigeDescricao: false },
    { id: 2, nome: 'Espeto',          exigeDescricao: false },
    { id: 3, nome: 'Plano Inclinado', exigeDescricao: false },
    { id: 4, nome: 'Muro de Vidro',   exigeDescricao: false },
    { id: 5, nome: 'Arranjo Vegetal', exigeDescricao: false },
    { id: 6, nome: 'Outro',           exigeDescricao: true  }
  ],
  HOSPITALEIRO: [
    { id: 7,  nome: 'Banco de Descanso',   exigeDescricao: false },
    { id: 8,  nome: 'Arborização Viária',  exigeDescricao: false },
    { id: 9,  nome: 'Iluminação Adequada', exigeDescricao: false },
    { id: 10, nome: 'Bebedouro Público',   exigeDescricao: false },
    { id: 11, nome: 'Área Sombreada',      exigeDescricao: false },
    { id: 12, nome: 'Outro',               exigeDescricao: true  }
  ]
};


/* --------------------------------------------------------------------------
   2. ELEMENTOS DA TELA
   -------------------------------------------------------------------------- */

var campoFoto      = document.getElementById('foto');
var areaFoto       = document.getElementById('foto-area');
var previaFoto     = document.getElementById('foto-previa');
var radiosCategoria = document.querySelectorAll('input[name="categoria"]');
var campoSubcat    = document.getElementById('subcategoria');
var blocoDescricao = document.getElementById('bloco-descricao');
var campoDescricao = document.getElementById('descricao');
var textoLocal     = document.getElementById('local-texto');
var botaoPublicar  = document.getElementById('publicar');
var faixaStatus    = document.getElementById('status');

/* Guarda o que a pessoa já preencheu. A validação da RN04 lê daqui. */
var estado = {
  temFoto: false,
  latitude: null,
  longitude: null,
  endereco: null
};


/* --------------------------------------------------------------------------
   3. FOTOGRAFIA (RF01)

   URL.createObjectURL cria um endereço temporário para o arquivo que a
   pessoa escolheu, sem precisar carregá-lo inteiro na memória.
   -------------------------------------------------------------------------- */

campoFoto.addEventListener('change', function () {
  var arquivo = campoFoto.files[0];

  if (!arquivo) {
    estado.temFoto = false;
    previaFoto.hidden = true;
    areaFoto.hidden = false;
    validar();
    return;
  }

  previaFoto.src = URL.createObjectURL(arquivo);
  previaFoto.hidden = false;
  areaFoto.hidden = true;
  estado.temFoto = true;
  validar();
});


/* --------------------------------------------------------------------------
   4. CATEGORIA E SUBCATEGORIA (RF03, RF04, RN03)

   A lista de subcategorias é trocada conforme a categoria escolhida.
   É isto que garante a RN03 na interface: não existe como selecionar uma
   subcategoria que não pertença à categoria marcada.
   -------------------------------------------------------------------------- */

function preencherSubcategorias(categoria) {
  var lista = SUBCATEGORIAS[categoria] || [];

  /* Limpa as opções anteriores antes de montar as novas. */
  campoSubcat.innerHTML = '';

  var vazia = document.createElement('option');
  vazia.value = '';
  vazia.textContent = 'Escolha uma opção';
  campoSubcat.appendChild(vazia);

  lista.forEach(function (item) {
    var opcao = document.createElement('option');
    opcao.value = item.id;
    opcao.textContent = item.nome;

    /* Marca a opção genérica, para sabermos quando exigir a descrição. */
    opcao.dataset.exigeDescricao = item.exigeDescricao ? 'sim' : 'nao';

    campoSubcat.appendChild(opcao);
  });

  campoSubcat.disabled = false;
}

radiosCategoria.forEach(function (radio) {
  radio.addEventListener('change', function () {
    preencherSubcategorias(radio.value);
    atualizarDescricao();
    validar();
  });
});


/* A descrição é opcional em geral, mas obrigatória quando a subcategoria
   escolhida é "Outro" — mesma regra do gatilho no banco. */
function subcategoriaExigeDescricao() {
  var opcao = campoSubcat.selectedOptions[0];
  return !!opcao && opcao.dataset.exigeDescricao === 'sim';
}

function atualizarDescricao() {
  blocoDescricao.hidden = !subcategoriaExigeDescricao();
}

campoSubcat.addEventListener('change', function () {
  atualizarDescricao();
  validar();
});

campoDescricao.addEventListener('input', validar);


/* --------------------------------------------------------------------------
   5. LOCALIZAÇÃO (RF02) E ENDEREÇO (RF07)

   A captura começa sozinha ao abrir a tela. Se a pessoa negar a permissão
   ou o sinal falhar, a mensagem explica o que aconteceu e o botão continua
   bloqueado — sem localização não há registro (RN04).
   -------------------------------------------------------------------------- */

function capturarLocalizacao() {
  if (!navigator.geolocation) {
    textoLocal.textContent = 'Este aparelho não informa a localização.';
    return;
  }

  textoLocal.textContent = 'Procurando sua localização…';

  navigator.geolocation.getCurrentPosition(
    function (posicao) {
      estado.latitude = posicao.coords.latitude;
      estado.longitude = posicao.coords.longitude;

      /* Mostra as coordenadas de imediato: o endereço vem depois, e a
         pessoa não precisa esperar a resposta do serviço externo. */
      textoLocal.textContent = 'Localização capturada.';
      validar();

      buscarEndereco(estado.latitude, estado.longitude);
    },
    function () {
      textoLocal.textContent =
        'Não foi possível obter a localização. Verifique a permissão do navegador.';
    },
    { enableHighAccuracy: true, timeout: 15000 }
  );
}

/* Geocodificação reversa pelo Nominatim (OpenStreetMap). O endereço é
   apenas informativo: se o serviço falhar, o registro continua válido,
   porque as coordenadas já foram capturadas. */
function buscarEndereco(lat, lon) {
  var url = 'https://nominatim.openstreetmap.org/reverse' +
            '?format=jsonv2&lat=' + lat + '&lon=' + lon;

  fetch(url)
    .then(function (resposta) {
      return resposta.json();
    })
    .then(function (dados) {
      var a = dados.address || {};

      estado.endereco = {
        rua: a.road || null,
        numero: a.house_number || null,
        bairro: a.suburb || a.neighbourhood || null,
        cidade: a.city || a.town || a.municipality || null
      };

      /* Monta só com o que veio preenchido, para não gerar vírgulas soltas. */
      var partes = [
        estado.endereco.rua,
        estado.endereco.bairro,
        estado.endereco.cidade
      ].filter(Boolean);

      if (partes.length) {
        textoLocal.textContent = partes.join(', ');
      }
    })
    .catch(function () {
      /* Silencioso de propósito: a localização já está garantida. */
    });
}


/* --------------------------------------------------------------------------
   6. VALIDAÇÃO (RN04)

   O botão só libera com fotografia, localização e categoria. A
   subcategoria entra junto porque é obrigatória no banco, e a descrição
   só quando a opção genérica estiver escolhida.
   -------------------------------------------------------------------------- */

function categoriaEscolhida() {
  var marcado = document.querySelector('input[name="categoria"]:checked');
  return marcado ? marcado.value : null;
}

function validar() {
  var completo =
    estado.temFoto &&
    estado.latitude !== null &&
    !!categoriaEscolhida() &&
    campoSubcat.value !== '';

  /* Quando a subcategoria é "Outro", a descrição passa a ser exigida. */
  if (completo && subcategoriaExigeDescricao()) {
    completo = campoDescricao.value.trim() !== '';
  }

  botaoPublicar.disabled = !completo;
}


/* --------------------------------------------------------------------------
   7. PUBLICAR

   Por enquanto apenas confirma na tela. O envio ao Supabase — upload da
   foto para o Storage e inserção na tabela "registro" — entra aqui depois.
   -------------------------------------------------------------------------- */

botaoPublicar.addEventListener('click', function () {
  var dados = {
    categoria: categoriaEscolhida(),
    subcategoria_id: Number(campoSubcat.value),
    descricao: campoDescricao.value.trim() || null,
    latitude: estado.latitude,
    longitude: estado.longitude,
    endereco: estado.endereco
  };

  console.log('Pronto para enviar:', dados);

  faixaStatus.textContent = 'Está no mapa.';
  faixaStatus.hidden = false;
});


/* --------------------------------------------------------------------------
   8. INÍCIO
   -------------------------------------------------------------------------- */

capturarLocalizacao();
validar();