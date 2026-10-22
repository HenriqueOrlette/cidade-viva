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
var marcaDescricao = document.getElementById('descricao-marca');
var ajudaDescricao = document.getElementById('descricao-ajuda');
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

/* A descrição aparece sempre. O que muda é a exigência: em "Outro" ela
   passa a ser obrigatória, e o rótulo avisa disso. */
function atualizarDescricao() {
  var obrigatoria = subcategoriaExigeDescricao();

  marcaDescricao.textContent = obrigatoria ? '(obrigatória)' : '(opcional)';

  ajudaDescricao.textContent = obrigatoria
    ? 'Descreva o que você encontrou, já que o tipo escolhido é genérico.'
    : 'Acrescente algo que ajude quem for ver o registro.';
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

   Três etapas, nesta ordem:
     1. reduz a foto no próprio celular (fotos de câmera têm vários MB);
     2. envia a foto ao Storage (bucket "fotos") e pega o endereço público;
     3. insere a linha na tabela "registro".

   Se a etapa 2 funcionar e a 3 falhar, sobra uma foto sem registro no
   Storage. É um desperdício pequeno e aceito no MVP: o RLS não permite
   apagar arquivos, e o registro nunca aparece pela metade no mapa.
   -------------------------------------------------------------------------- */

/* Maior lado da foto depois de reduzida, em pixels. */
var LADO_MAXIMO = 1600;

/* Carrega a foto como imagem que o canvas consegue desenhar.
   createImageBitmap com imageOrientation:'from-image' respeita a rotação
   gravada pela câmera (EXIF); sem ela, fotos tiradas em pé podem ficar
   deitadas. Navegadores que não aceitam essa opção caem no <img>. */
function carregarImagem(arquivo) {
  if (window.createImageBitmap) {
    return createImageBitmap(arquivo, { imageOrientation: 'from-image' })
      .catch(function () { return carregarPorTagImg(arquivo); });
  }
  return carregarPorTagImg(arquivo);
}

function carregarPorTagImg(arquivo) {
  return new Promise(function (resolve, reject) {
    var url = URL.createObjectURL(arquivo);
    var img = new Image();
    img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('imagem ilegível')); };
    img.src = url;
  });
}

/* Devolve uma Promise com um Blob JPEG de no máximo LADO_MAXIMO pixels no
   lado maior. Nunca amplia fotos pequenas. */
function reduzirFoto(arquivo) {
  return carregarImagem(arquivo).then(function (imagem) {
    var escala = Math.min(1, LADO_MAXIMO / Math.max(imagem.width, imagem.height));
    var canvas = document.createElement('canvas');
    canvas.width = Math.round(imagem.width * escala);
    canvas.height = Math.round(imagem.height * escala);
    canvas.getContext('2d').drawImage(imagem, 0, 0, canvas.width, canvas.height);

    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        blob ? resolve(blob) : reject(new Error('falha ao gerar o JPEG'));
      }, 'image/jpeg', 0.82);
    });
  });
}

/* Nome único dentro da pasta da pessoa. A pasta com o id do usuário é o
   que a política do Storage confere (ver storage-fotos.sql). */
function caminhoDaFoto(usuarioId) {
  var unico = (window.crypto && crypto.randomUUID)
    ? crypto.randomUUID()
    : Date.now() + '-' + Math.random().toString(36).slice(2);
  return usuarioId + '/' + unico + '.jpg';
}

function mostrarStatus(texto) {
  faixaStatus.textContent = texto;
  faixaStatus.hidden = !texto;
}

/* Guarda quem está logado; preenchido na seção 8. */
var usuarioAtual = null;

async function publicar() {
  /* Impede toque duplo: dois toques seguidos criariam dois registros. */
  botaoPublicar.disabled = true;
  botaoPublicar.textContent = 'Publicando…';
  mostrarStatus('');

  try {
    /* 1. Reduz a foto. */
    var foto = await reduzirFoto(campoFoto.files[0]);

    /* 2. Envia ao Storage. */
    var caminho = caminhoDaFoto(usuarioAtual.id);
    var envio = await cvDb.storage.from('fotos').upload(caminho, foto, { contentType: 'image/jpeg' });
    if (envio.error) { throw envio.error; }

    var fotoUrl = cvDb.storage.from('fotos').getPublicUrl(caminho).data.publicUrl;

    /* 3. Insere o registro.
       A localização vai como texto no formato EWKT: "SRID=4326;POINT(lng lat)".
       ATENÇÃO à ordem: no PostGIS o X (longitude) vem antes do Y (latitude). */
    var e = estado.endereco || {};
    var insercao = await cvDb.from('registro').insert({
      autor_id: usuarioAtual.id,
      categoria: categoriaEscolhida(),
      subcategoria_id: Number(campoSubcat.value),
      descricao: campoDescricao.value.trim() || null,
      foto_url: fotoUrl,
      localizacao: 'SRID=4326;POINT(' + estado.longitude + ' ' + estado.latitude + ')',
      endereco_rua: e.rua || null,
      endereco_numero: e.numero || null,
      endereco_bairro: e.bairro || null,
      endereco_cidade: e.cidade || null
    });
    if (insercao.error) { throw insercao.error; }

    /* Sucesso: volta ao mapa, que já busca o ponto novo ao carregar. */
    mostrarStatus('Publicado!');
    window.location.href = 'index.html';
  } catch (erro) {
    console.error('Falha ao publicar:', erro);

    /* 42501 é o código do PostgreSQL para "RLS negou". No Storage o
       equivalente costuma vir com status 403 ou 401. Na prática, é sessão
       vencida. */
    var semPermissao = erro && (erro.code === '42501' || erro.statusCode === '403' ||
      erro.statusCode === '401' || /row-level security|unauthorized/i.test(erro.message || ''));

    mostrarStatus(semPermissao
      ? 'Sua sessão expirou. Saia e entre de novo.'
      : 'Não foi possível publicar. Verifique a conexão e tente de novo.');

    botaoPublicar.textContent = 'Publicar no mapa';
    validar();
  }
}

botaoPublicar.addEventListener('click', publicar);


/* --------------------------------------------------------------------------
   8. INÍCIO

   Registrar exige login (o RLS do banco só aceita inserção de usuário
   autenticado). Sem login, cvExigirLogin manda para entrar.html e a
   pessoa volta para cá depois. A localização só é pedida depois de
   confirmado o login, para não pedir permissão de GPS a quem vai ser
   redirecionado.
   -------------------------------------------------------------------------- */

document.getElementById('sair').addEventListener('click', cvSair);

cvExigirLogin('registrar.html').then(function (usuario) {
  if (!usuario) { return; }

  usuarioAtual = usuario;
  document.getElementById('sessao-nome').textContent = usuario.nome;
  document.getElementById('sessao').hidden = false;

  capturarLocalizacao();
  validar();
});
