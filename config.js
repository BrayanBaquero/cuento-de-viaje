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
   *  recuerdos: exactamente 3, cada uno con { foto, texto, fecha }.   */
  etapas: [
    {
      titulo: 'Nos conocimos',
      frase: 'Todo empezó con un "hola" que cambió mi año.',
      recuerdos: [
        { foto: 'assets/fotos/conocimos-1.jpg', texto: 'La primera vez que te vi', fecha: '14 feb 2025' },
        { foto: 'assets/fotos/conocimos-2.jpg', texto: 'Nuestro primer mensaje', fecha: '15 feb 2025' },
        { foto: 'assets/fotos/conocimos-3.jpg', texto: 'Esa risa que no olvido', fecha: '20 feb 2025' },
      ],
    },
    {
      titulo: 'Primera cita',
      frase: 'Llegué nervioso y me fui enamorado.',
      recuerdos: [
        { foto: 'assets/fotos/cita-1.jpg', texto: 'El café que se enfrió', fecha: '1 mar 2025' },
        { foto: 'assets/fotos/cita-2.jpg', texto: 'Caminamos sin rumbo', fecha: '1 mar 2025' },
        { foto: 'assets/fotos/cita-3.jpg', texto: 'No quería que terminara', fecha: '1 mar 2025' },
      ],
    },
    {
      titulo: 'Nuestro lugar',
      frase: 'Hay un rincón del mundo que ya es solo nuestro.',
      recuerdos: [
        { foto: 'assets/fotos/lugar-1.jpg', texto: 'Nuestro banquito', fecha: 'abr 2025' },
        { foto: 'assets/fotos/lugar-2.jpg', texto: 'Tardes de ajedrez', fecha: 'may 2025' },
        { foto: 'assets/fotos/lugar-3.jpg', texto: 'Aquí me reí como nunca', fecha: 'jun 2025' },
      ],
    },
    {
      titulo: 'Nuestro futuro',
      frase: 'Lo mejor todavía no ha pasado.',
      recuerdos: [
        { foto: 'assets/fotos/futuro-1.jpg', texto: 'Viajes por hacer', fecha: 'pronto' },
        { foto: 'assets/fotos/futuro-2.jpg', texto: 'Más días como hoy', fecha: 'siempre' },
        { foto: 'assets/fotos/futuro-3.jpg', texto: 'Tú y yo', fecha: 'para siempre' },
      ],
    },
  ],

  /* ---------------- Minijuego 2: Memoria (6 fotos = 6 parejas) ---------------- */
  memoria: {
    fotos: [
      'assets/fotos/memoria-1.jpg',
      'assets/fotos/memoria-2.jpg',
      'assets/fotos/memoria-3.jpg',
      'assets/fotos/memoria-4.jpg',
      'assets/fotos/memoria-5.jpg',
      'assets/fotos/memoria-6.jpg',
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
    foto: 'assets/fotos/rompecabezas.jpg',   // ideal: foto cuadrada
  },

  /* ---------------- Trivia (cerradura extra del cofre) ----------------
   *  correcta: índice de la opción correcta (0, 1 o 2).               */
  trivia: [
    {
      pregunta: '¿Dónde fue nuestra primera cita?',
      opciones: ['En un café', 'En el cine', 'En el parque'],
      correcta: 0,
    },
    {
      pregunta: '¿Qué comida pedimos siempre?',
      opciones: ['Sushi', 'Hamburguesas', 'Pizza'],
      correcta: 2,
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
    foto: 'assets/fotos/final.jpg',
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
