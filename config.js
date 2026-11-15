/* =====================================================================
 *  CONFIGURACIÓN DEL JUEGO — edita aquí todo el contenido personal.
 *
 *  · Las fotos van en la carpeta assets/fotos/. Escribe la ruta completa,
 *    por ejemplo 'assets/fotos/conocimos-1.jpg'.
 *  · Si una foto no existe (o pones null), el juego dibuja un marco
 *    con un corazón en su lugar y sigue funcionando.
 *  · Usa fotos .jpg de ~800 px de lado para que cargue rápido en el celular.
 * ===================================================================== */
window.CONFIG = {

  /* ---------------- Nombres y apodos ---------------- */
  nombres: {
    ella: 'Angie',            // protagonista
    apodoElla: 'mi niña',     // cómo le dices de cariño
    el: 'Brayan',             // tu nombre
    apodoEl: 'tu bobito',     // cómo te dice ella
  },

  /* ---------------- Textos de la portada ---------------- */
  intro: {
    titulo: 'La aventura\nde Angie',
    frase: 'Cuatro recuerdos, cuatro llaves\ny un tesoro que te está esperando.',
    botonEmpezar: 'Empezar',
    botonContinuar: 'Continuar',
  },

  /* ---------------- Las 4 etapas de nuestra historia ----------------
   *  titulo: nombre corto que se ve en el mapa (máx. ~16 letras).
   *  frase:  frase que aparece al entrar a la etapa.
   *  recuerdos: de 1 a 3 páginas del diario, cada una con
   *    { foto, titulo, texto, lugar, fecha }. El nivel pone tantas páginas como recuerdos haya. */
  etapas: [
    {
      titulo: 'El comienzo',
      frase: 'Todo gran viaje empieza con un primer paso.',
      recuerdos: [
        {
          foto: 'assets/fotos/guatavita.jpg', titulo: 'Nuestra primera salida a pueblear',
          texto: 'Descubrimos Guatavita juntos, pero lo mejor de todo no fue el paisaje, sino compartir cada sonrisa y cada paso a tu lado.',
          lugar: 'Guatavita', fecha: '7 jun 2026',
        },
        {
          foto: 'assets/fotos/chorrera-1.jpg', titulo: 'Luz entre la montaña',
          texto: 'Dicen que La Chorrera es la cascada más alta, pero no hay altura que se compare con lo alto que me haces sentir cuando estoy contigo.',
          lugar: 'Cascada La Chorrera', fecha: '20 jun 2026',
        },
      ],
    },
    {
      titulo: 'Caminos juntos',
      frase: 'Cada camino es más bonito si es contigo.',
      recuerdos: [
        {
          foto: 'assets/fotos/chorrera-2.jpg', titulo: 'Donde el tiempo se detiene',
          texto: 'Llegamos hasta la gran caída de agua sin aliento, pero valió cada paso solo por sostenerte así y tomarnos esta foto.',
          lugar: 'Cascada La Chorrera', fecha: '20 jun 2026',
        },
        {
          foto: 'assets/fotos/catmania-1.jpg', titulo: 'Tarde de michis y arte',
          texto: 'Entre maullidos y pinceladas, esa tarde quedó grabada en mi corazón. Definitivamente, cualquier plan contigo se vuelve mágico.',
          lugar: 'Catmania', fecha: '2 ago 2026',
        },
      ],
    },
    {
      titulo: 'Momentos mágicos',
      frase: 'Hay instantes que se quedan para siempre.',
      recuerdos: [
        {
          foto: 'assets/fotos/catmania-2.jpg', titulo: 'Arte en concentración',
          texto: 'Tú toda concentrada dando las últimas pinceladas, mientras los michis peleaban atrás.',
          lugar: 'Catmania', fecha: '2 ago 2026',
        },
        {
          foto: 'assets/fotos/catmania-3.jpg', titulo: 'Nuestras obras de arte',
          texto: 'El resultado oficial de nuestros dotes artísticos. Entre pintura, gatitos y risas, logramos estas dos obras maestras. Gracias por un detalle tan inolvidable.',
          lugar: 'Catmania', fecha: '2 ago 2026',
        },
      ],
    },
    {
      titulo: 'Nuestro mañana',
      frase: 'Lo mejor todavía no ha pasado.',
      recuerdos: [
        {
          foto: 'assets/fotos/minigolf.jpg', titulo: 'Tarde de minigolf y risas',
          texto: 'Contemplando tu swing al darle a la pelota, princesa.',
          lugar: 'Putt Colombia', fecha: '23 ago 2026',
        },
        {
          foto: 'assets/fotos/juntos.jpg', titulo: 'Tarde de museo',
          texto: 'La obra de arte más bella que vi ese día fuiste tú, princesa.',
          lugar: 'Museo Nacional', fecha: '6 sep 2026',
        },
        {
          foto: 'assets/fotos/selfie-morada.jpg', titulo: 'Tarde mágica en el planetario',
          texto: 'Un show de astronomía al buen ritmo del rock.',
          lugar: 'Planetario', fecha: '17 oct 2026',
        },
      ],
    },
  ],

  /* ---------------- Minijuego 2: Memoria (6 fotos = 6 parejas) ---------------- */
  memoria: {
    fotos: [
      'assets/fotos/pies.jpg',
      'assets/fotos/fuente.jpg',
      'assets/fotos/planetario.jpg',
      'assets/fotos/juntos.jpg',
      'assets/fotos/catmania-2.jpg',
      'assets/fotos/minigolf.jpg',
    ],
  },

  /* ---------------- Minijuego 3: Ajedrez (mate en 2) ----------------
   *  fen: posición inicial (juegan las blancas).
   *  solucion: jugadas en formato "origen+destino":
   *    [tu jugada 1, respuesta automática del rival, tu jugada 2 (mate)].
   *  Ejemplo: mate del pasillo con torres dobladas.                  */
  ajedrez: {
    fen: '2r3k1/5ppp/8/8/8/8/3R1PPP/3R2K1 w - - 0 1',
    solucion: ['d2d8', 'c8d8', 'd1d8'],
    pista: 'Pista: el rey negro no tiene por dónde escapar en la última fila…',
  },

  /* ---------------- Minijuego 4: Rompecabezas deslizante ---------------- */
  rompecabezas: {
    foto: 'assets/fotos/ascensor.jpg',   // se recorta al centro en un cuadrado
  },

  /* ---------------- Trivia (cerradura extra del cofre) ----------------
   *  correcta: índice de la opción correcta (0, 1 o 2), o una lista
   *  de índices si hay varias respuestas válidas, por ejemplo [0, 1].   */
  trivia: [
    {
      pregunta: '¿Dónde fue nuestra primera cita?',
      opciones: ['En un café', 'En el Parque Soratama', 'En el cine'],
      correcta: 1,
    },
    {
      pregunta: 'Uno de nuestros juegos favoritos para jugar juntos',
      opciones: ['Ajedrez', 'Mario Kart', 'UNO'],
      correcta: [0, 1],
    },
    {
      pregunta: '¿Quién se ríe más de los chistes malos?',
      opciones: ['Yo', 'Tú', 'Los dos, obvio'],
      correcta: 2,
    },
  ],

  /* ---------------- Final: pergamino, pregunta y mensaje ---------------- */
  final: {
    leyenda:
      'Angie:\n' +
      'Cada etapa de este camino fue un pedacito de nosotros. ' +
      'Me hiciste reír, me hiciste soñar y me enseñaste que lo mejor ' +
      'llega cuando uno menos lo espera.\n' +
      'Hoy solo quiero preguntarte algo…',
    pregunta: '¿Quieres ser mi novia?',
    botonSi: 'Sí',
    botonNo: 'No',
    // Textos que va tomando el botón "No" a medida que se encoge:
    textosNo: ['¿Segura?', 'Piénsalo bien…', '¿De verdad?', 'Última oportunidad'],
    foto: 'assets/fotos/selfie-morada.jpg',
    mensajeFinal: '¡Gracias por decir que sí!\nTe quiero muchísimo. 💖',
  },

  /* ---------------- Música propia (opcional) ----------------
   *  Deja null para usar la música generada por el juego, o pon la ruta
   *  a un mp3 propio, por ejemplo 'assets/musica/nuestra-cancion.mp3'.  */
  musica: {
    intro: null,
    mapa: null,
    etapa1: null,
    etapa2: null,
    etapa3: null,
    etapa4: null,
    cofre: null,
    propuesta: null,
    final: null,
  },
};
