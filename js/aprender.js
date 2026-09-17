/* ==========================================================================
   Cidade Viva — Hub educativo

   A tela funciona sem este arquivo. O acordeão é feito com <details> e
   <summary>, que o navegador já sabe abrir e fechar sozinho, e o
   atributo name="topico" repetido em todos faz com que apenas um fique
   aberto por vez.

   Esse atributo, porém, é recente. Navegadores antigos o ignoram e
   deixam vários tópicos abertos ao mesmo tempo — o que continua
   utilizável, mas não é o comportamento combinado. Este arquivo existe
   só para cobrir esse caso.
   ========================================================================== */

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