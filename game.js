/* =====================================================================
 *  La aventura de Angie — Phaser 3
 *  Fase 1 (rediseño): estilo "cuento de viaje pintado a tinta",
 *  Angie nueva con animaciones, Intro y Mapa nuevos, HUD y controles
 *  nuevos, y soporte para celular (vertical) y PC (horizontal + teclado).
 *  Niveles ilustrados por capas (paralaje, niebla, terreno orgánico) con
 *  zarzas, sombras del olvido, faroles y páginas de diario.
 * ===================================================================== */
'use strict';

const CFG = window.CONFIG;
const FUNDIDO = 400;                 // ms entre escenas
const COLOR_FUNDIDO = [20, 12, 18];  // tinta casi negra
const SERIF = '"Cormorant Garamond", Georgia, serif';
const SANS = 'Nunito, "Segoe UI", sans-serif';
const TINTA = 0x2A1B23;
const CREMA = 0xFFF1D6;
const ORO = 0xF5C26B;
const SEPIA = '#4A3324';

/* =====================================================================
 *  Tamaño adaptable: alto fijo de 844 y ancho según la pantalla.
 *  Celular vertical ≈ 390–480 · PC horizontal hasta 1560.
 * ===================================================================== */
const H = 844;
const ANCHO_MIN = 390;
const ANCHO_MAX = 1560;
function anchoIdeal() {
  const vw = window.innerWidth || ANCHO_MIN;
  const vh = window.innerHeight || H;
  return Math.max(ANCHO_MIN, Math.min(ANCHO_MAX, Math.round((H * vw) / vh)));
}
let W = anchoIdeal();
let anchoPendiente = W;

// Controles táctiles solo en pantallas táctiles; en PC se juega con teclado y mouse.
const TACTIL = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

// Aplica el nuevo ancho (solo entre escenas, nunca a mitad de un nivel).
function aplicarTamano(juego) {
  if (Math.abs(anchoPendiente - W) < 12) return false;
  W = anchoPendiente;
  juego.scale.setGameSize(W, H);
  const h = juego.scene.getScene('HUD');
  if (h && h.sys.isActive()) h.scene.restart();
  return true;
}

let temporizadorTamano = null;
window.addEventListener('resize', () => {
  clearTimeout(temporizadorTamano);
  temporizadorTamano = setTimeout(() => {
    anchoPendiente = anchoIdeal();
    const juego = window.juego;
    if (!juego) return;
    // Intro y Mapa se reacomodan al instante; los niveles esperan al cambio de escena.
    const activa = juego.scene.getScenes(true).find((s) => s.reacomodable);
    if (activa && !activa._saliendo && !activa.ocupado && aplicarTamano(juego)) activa.scene.restart();
  }, 250);
});

/* Paletas de los niveles (se rediseñan en las fases 2 y 3) */
const PALETAS = [
  { fondo: 0xFFD6C2, medio: 0xFF9E80, acento: 0xF2637E, oscuro: 0x7A3E65, particula: 'petalo' },
  { fondo: 0xE8DFF5, medio: 0xB8A1E3, acento: 0x7D5BA6, oscuro: 0x3E2F5B, particula: 'mota' },
  { fondo: 0xDFF5EA, medio: 0x8FD9B6, acento: 0x3FA37C, oscuro: 0x1F4F45, particula: 'luciernaga' },
  { fondo: 0x1B1F3B, medio: 0x3A3F7A, acento: 0xF5C26B, oscuro: 0xFFF1D6, particula: 'estrella' },
];
const TESORO = { oro: 0xFFD166, rosa: 0xEF476F, crema: 0xFFF1D6 };
const ROMANOS = ['I', 'II', 'III', 'IV'];

const hex = (n) => '#' + n.toString(16).padStart(6, '0');

/* =====================================================================
 *  Progreso guardado (localStorage)
 * ===================================================================== */
const Guardado = {
  CLAVE: 'aventuraAngie.v1',
  datos: { llaves: [false, false, false, false], silencio: false },

  cargar() {
    try {
      if (new URLSearchParams(location.search).has('reset')) localStorage.removeItem(this.CLAVE);
      const d = JSON.parse(localStorage.getItem(this.CLAVE));
      if (d && Array.isArray(d.llaves)) {
        this.datos.llaves = [0, 1, 2, 3].map((i) => !!d.llaves[i]);
        this.datos.silencio = !!d.silencio;
      }
    } catch (e) { /* almacenamiento no disponible: se juega sin guardar */ }
  },
  guardar() {
    try { localStorage.setItem(this.CLAVE, JSON.stringify(this.datos)); } catch (e) { /* sin almacenamiento */ }
  },
  tiene(i) { return this.datos.llaves[i]; },
  darLlave(i) { this.datos.llaves[i] = true; this.guardar(); },
  total() { return this.datos.llaves.filter(Boolean).length; },
  desbloqueada(i) { return i === 0 || this.datos.llaves[i - 1]; },
};

/* =====================================================================
 *  Sonido (Web Audio): efectos. La música y el ambiente están en Musica.
 * ===================================================================== */
const Sonido = {
  ctx: null,
  master: null,
  silencio: false,

  // Debe llamarse desde un toque o clic del usuario (requisito de los navegadores).
  iniciar() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.silencio ? 0 : 1;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().then(() => Musica.arrancar());
    else Musica.arrancar();
  },

  setSilencio(s) {
    this.silencio = s;
    Guardado.datos.silencio = s;
    Guardado.guardar();
    if (this.master) this.master.gain.setTargetAtTime(s ? 0 : 1, this.ctx.currentTime, 0.03);
  },

  tono(freq, dur, tipo = 'sine', vol = 0.15, retraso = 0) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime + retraso;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = tipo;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  },

  barrido(f0, f1, dur, tipo = 'sine', vol = 0.12) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = tipo;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  },

  sfx(nombre) {
    switch (nombre) {
      case 'tap': this.tono(880, 0.07, 'triangle', 0.1); break;
      case 'salto': this.barrido(380, 760, 0.16, 'triangle', 0.1); break;
      case 'salto2':
        this.barrido(560, 1120, 0.18, 'triangle', 0.09);
        this.tono(1760, 0.2, 'sine', 0.06, 0.06);
        break;
      case 'planear': this.barrido(900, 520, 0.35, 'sine', 0.05); break;
      case 'mover': this.barrido(260, 180, 0.12, 'triangle', 0.08); break;
      case 'corazon':
        this.tono(1568, 0.08, 'triangle', 0.1);
        this.tono(2093, 0.14, 'triangle', 0.1, 0.06);
        break;
      case 'bandera':
        [659, 784, 988].forEach((f, i) => this.tono(f, 0.18, 'triangle', 0.12, i * 0.07));
        break;
      case 'recoger':
        this.tono(988, 0.1, 'triangle', 0.14);
        this.tono(1319, 0.18, 'triangle', 0.14, 0.07);
        break;
      case 'acierto':
        this.tono(784, 0.12, 'sine', 0.16);
        this.tono(1047, 0.22, 'sine', 0.16, 0.09);
        break;
      case 'error':
        this.tono(330, 0.14, 'sine', 0.14);
        this.tono(262, 0.22, 'sine', 0.14, 0.11);
        break;
      case 'llave':
        [1047, 1319, 1568, 2093].forEach((f, i) => this.tono(f, 0.3, 'triangle', 0.12, i * 0.08));
        this.tono(2637, 0.5, 'sine', 0.06, 0.34);
        break;
    }
  },
};

/* =====================================================================
 *  Música y ambiente generados por código (timbres de cuento).
 *  Cada escena pide un tema con Musica.tocar(clave). Si CFG.musica[clave]
 *  tiene un mp3, se usa ese archivo en su lugar.
 * ===================================================================== */
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

// acordes: notas MIDI (se repiten por compás). melodia: 8 corcheas por compás (null = silencio).
const TEMAS_MUSICA = {
  intro: { bpm: 72, inst: 'caja', densidad: 0.45, acordes: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], amb: ['viento', 'pajaros'] },
  mapa: { bpm: 68, inst: 'arpa', densidad: 0.5, acordes: [[48, 52, 55], [55, 59, 62], [57, 60, 64], [53, 57, 60]], amb: ['brillos'] },
  etapa1: { bpm: 80, inst: 'arpa', densidad: 0.5, acordes: [[50, 54, 57], [55, 59, 62], [59, 62, 66], [57, 61, 64]], amb: ['viento', 'pajaros'] },
  etapa2: { bpm: 76, inst: 'caja', densidad: 0.45, acordes: [[53, 57, 60], [48, 52, 55], [50, 53, 57], [46, 50, 53]], amb: ['rio'] },
  etapa3: { bpm: 70, inst: 'flauta', densidad: 0.3, acordes: [[52, 55, 59], [48, 52, 55], [55, 59, 62], [50, 54, 57]], amb: ['brisa', 'insectos'] },
  etapa4: { bpm: 64, inst: 'campana', densidad: 0.3, acordes: [[57, 60, 64], [52, 55, 59], [53, 57, 60], [55, 59, 62]], amb: ['vientoNoche', 'brillos'] },
  cofre: { bpm: 58, inst: 'campana', densidad: 0.22, acordes: [[50, 53, 57], [46, 50, 53], [53, 57, 60], [48, 52, 55]], amb: ['vientoNoche'] },
  // Tema de la propuesta: melodía fija con caja de música
  propuesta: {
    bpm: 66, inst: 'caja', acordes: [[48, 52, 55], [55, 59, 62], [57, 60, 64], [53, 57, 60]], amb: ['vientoNoche'],
    melodia: [
      [72, null, 76, 79, 77, 76, 74, null], [74, null, 71, 74, 79, null, 77, 76],
      [76, null, 72, 76, 81, null, 79, 77], [77, 76, 74, 72, 74, null, null, null],
    ],
  },
  final: { bpm: 92, inst: 'caja', inst2: 'arpa', densidad: 0.6, acordes: [[48, 52, 55], [53, 57, 60], [57, 60, 64], [55, 59, 62]], amb: ['brillos'] },
};

const Musica = {
  bus: null,
  actual: null,      // { clave, gain, intervalo, ambiente: [], audio }
  pendiente: null,
  ruido: null,

  tocar(clave) {
    if (this.actual && this.actual.clave === clave) return;
    this.pendiente = clave;
    if (Sonido.ctx && Sonido.ctx.state === 'running') this.arrancar();
  },

  // Se llama al crear o reanudar el contexto de audio.
  arrancar() {
    const clave = this.pendiente;
    if (!clave || (this.actual && this.actual.clave === clave)) return;
    const ctx = Sonido.ctx;
    if (!this.bus) {
      this.bus = ctx.createGain();
      this.bus.gain.value = 0.55;
      this.bus.connect(Sonido.master);
    }
    this.detener();
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 1.6);
    gain.connect(this.bus);
    const pista = { clave, gain, ambiente: [] };
    this.actual = pista;

    const mp3 = CFG.musica && CFG.musica[clave];
    if (mp3) {
      const audio = new Audio(mp3);
      audio.loop = true;
      audio.addEventListener('error', () => { if (this.actual === pista) this.generar(pista); }, { once: true });
      try { ctx.createMediaElementSource(audio).connect(gain); } catch (e) { /* sin ruteo: suena directo */ }
      audio.play().catch(() => this.generar(pista));
      pista.audio = audio;
    } else {
      this.generar(pista);
    }
  },

  detener() {
    const a = this.actual;
    if (!a) return;
    this.actual = null;
    const t = Sonido.ctx.currentTime;
    a.gain.gain.cancelScheduledValues(t);
    a.gain.gain.setValueAtTime(Math.max(0.0001, a.gain.gain.value), t);
    a.gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    clearInterval(a.intervalo);
    setTimeout(() => {
      a.ambiente.forEach((n) => { try { n.stop(); } catch (e) { /* ya detenido */ } });
      if (a.audio) a.audio.pause();
      a.gain.disconnect();
    }, 1400);
  },

  generar(pista) {
    const tema = TEMAS_MUSICA[pista.clave] || TEMAS_MUSICA.mapa;
    const ctx = Sonido.ctx;
    const corchea = 30 / tema.bpm;
    let paso = 0;
    let siguiente = ctx.currentTime + 0.1;
    (tema.amb || []).forEach((tipo) => this.ambienteContinuo(pista, tipo));
    pista.intervalo = setInterval(() => {
      if (this.actual !== pista || ctx.state !== 'running') return;
      while (siguiente < ctx.currentTime + 0.35) {
        this.paso(pista, tema, paso, siguiente, corchea);
        paso++;
        siguiente += corchea;
      }
      // Si la pestaña estuvo en segundo plano, no intenta "ponerse al día"
      if (siguiente < ctx.currentTime) siguiente = ctx.currentTime + 0.05;
    }, 90);
  },

  paso(pista, tema, paso, t, corchea) {
    const compas = Math.floor(paso / 8) % tema.acordes.length;
    const acorde = tema.acordes[compas];
    const dest = pista.gain;
    const r = Math.random();
    if (paso % 8 === 0) {
      this.colchon(acorde, t, corchea * 8, dest);
      this.instrumento('arpa', midi(acorde[0] - 12), t, 0.09, dest);
    }
    if (tema.melodia) {
      const n = tema.melodia[compas][paso % 8];
      if (n) this.instrumento(tema.inst, midi(n), t, 0.13, dest);
    } else if (r < tema.densidad * (paso % 2 === 0 ? 1.3 : 0.7)) {
      const nota = acorde[Math.floor(Math.random() * acorde.length)] + (Math.random() < 0.35 ? 24 : 12);
      this.instrumento(paso % 4 === 2 && tema.inst2 ? tema.inst2 : tema.inst, midi(nota), t, 0.1, dest);
    }
    // Ambiente puntual
    (tema.amb || []).forEach((tipo) => {
      if (tipo === 'pajaros' && Math.random() < 0.05) this.pajaro(t, dest);
      if (tipo === 'insectos' && Math.random() < 0.12) this.grillo(t, dest);
      if (tipo === 'brillos' && Math.random() < 0.08) this.instrumento('campana', midi(84 + [0, 2, 4, 7, 9, 12][Math.floor(Math.random() * 6)]), t, 0.035, dest);
    });
  },

  instrumento(tipo, f, t, vol, dest) {
    const ctx = Sonido.ctx;
    const env = ctx.createGain();
    env.connect(dest);
    const osc = (forma, frec, g = 1, dur = 2) => {
      const o = ctx.createOscillator();
      o.type = forma;
      o.frequency.setValueAtTime(frec, t);
      if (g === 1) { o.connect(env); } else {
        const gg = ctx.createGain();
        gg.gain.setValueAtTime(g, t);
        gg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(gg).connect(env);
      }
      o.start(t);
      o.stop(t + dur + 0.1);
      return o;
    };
    if (tipo === 'caja') {
      env.gain.setValueAtTime(0.0001, t);
      env.gain.exponentialRampToValueAtTime(vol, t + 0.006);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
      osc('sine', f, 1, 1.5);
      osc('sine', f * 4.02, 0.22, 0.35);
    } else if (tipo === 'arpa') {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(4200, t);
      lp.frequency.exponentialRampToValueAtTime(700, t + 0.4);
      env.disconnect();
      env.connect(lp).connect(dest);
      env.gain.setValueAtTime(0.0001, t);
      env.gain.exponentialRampToValueAtTime(vol, t + 0.004);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
      osc('triangle', f, 1, 1.8);
    } else if (tipo === 'campana') {
      env.gain.setValueAtTime(0.0001, t);
      env.gain.exponentialRampToValueAtTime(vol, t + 0.004);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
      osc('sine', f, 1, 2.6);
      osc('sine', f * 2.76, 0.4, 1.2);
      osc('sine', f * 5.4, 0.18, 0.6);
    } else { // flauta
      env.gain.setValueAtTime(0.0001, t);
      env.gain.exponentialRampToValueAtTime(vol * 0.8, t + 0.09);
      env.gain.setValueAtTime(vol * 0.8, t + 0.5);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
      const o = osc('sine', f, 1, 1.1);
      const vib = ctx.createOscillator();
      const prof = ctx.createGain();
      vib.frequency.value = 5;
      prof.gain.value = f * 0.006;
      vib.connect(prof).connect(o.frequency);
      vib.start(t);
      vib.stop(t + 1.2);
    }
  },

  // Acorde suave sostenido durante el compás
  colchon(acorde, t, dur, dest) {
    const ctx = Sonido.ctx;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1100;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.035, t + dur * 0.35);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.15);
    lp.connect(env).connect(dest);
    acorde.forEach((n) => [-4, 4].forEach((cents) => {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = midi(n);
      o.detune.value = cents;
      o.connect(lp);
      o.start(t);
      o.stop(t + dur * 1.2);
    }));
  },

  pajaro(t, dest) {
    const ctx = Sonido.ctx;
    const base = 2400 + Math.random() * 1200;
    for (let k = 0; k < 2 + Math.floor(Math.random() * 3); k++) {
      const t0 = t + k * 0.11;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.setValueAtTime(base, t0);
      o.frequency.exponentialRampToValueAtTime(base * 1.35, t0 + 0.06);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.025, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);
      o.connect(g).connect(dest);
      o.start(t0);
      o.stop(t0 + 0.1);
    }
  },

  grillo(t, dest) {
    const ctx = Sonido.ctx;
    for (let k = 0; k < 3; k++) {
      const t0 = t + k * 0.055;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 4300;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.012, t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.035);
      o.connect(g).connect(dest);
      o.start(t0);
      o.stop(t0 + 0.05);
    }
  },

  // Viento, río y brisa: ruido filtrado en bucle, con una ondulación lenta
  ambienteContinuo(pista, tipo) {
    const cfg = {
      viento: { f: 500, q: 0.6, tipoF: 'bandpass', vol: 0.05, lfo: 0.08 },
      vientoNoche: { f: 320, q: 0.8, tipoF: 'bandpass', vol: 0.05, lfo: 0.06 },
      brisa: { f: 900, q: 0.5, tipoF: 'bandpass', vol: 0.025, lfo: 0.12 },
      rio: { f: 750, q: 0.3, tipoF: 'lowpass', vol: 0.045, lfo: 0.3 },
    }[tipo];
    if (!cfg) return;
    const ctx = Sonido.ctx;
    if (!this.ruido) {
      this.ruido = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = this.ruido.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = this.ruido;
    src.loop = true;
    const filtro = ctx.createBiquadFilter();
    filtro.type = cfg.tipoF;
    filtro.frequency.value = cfg.f;
    filtro.Q.value = cfg.q;
    const g = ctx.createGain();
    g.gain.value = cfg.vol;
    const lfo = ctx.createOscillator();
    const prof = ctx.createGain();
    lfo.frequency.value = cfg.lfo;
    prof.gain.value = cfg.vol * 0.6;
    lfo.connect(prof).connect(g.gain);
    src.connect(filtro).connect(g).connect(pista.gain);
    src.start();
    lfo.start();
    pista.ambiente.push(src, lfo);
  },
};

/* =====================================================================
 *  Utilidades de escena
 * ===================================================================== */
function texto(escena, x, y, str, tam, color, op = {}) {
  const t = escena.add.text(x, y, str, {
    fontFamily: op.serif ? SERIF : SANS,
    fontSize: tam + 'px',
    fontStyle: op.peso || (op.serif ? '600' : '600'),
    color,
    align: op.align || 'center',
    stroke: op.borde || undefined,
    strokeThickness: op.grosorBorde || 0,
    lineSpacing: op.interlineado || 0,
    wordWrap: op.ancho ? { width: op.ancho, useAdvancedWrap: true } : undefined,
  });
  if (op.sombra) t.setShadow(0, 2, op.sombra, op.desenfoque ?? 8, false, true);
  t.setOrigin(op.origenX ?? 0.5, op.origenY ?? 0.5);
  t.setResolution(2);
  return t;
}

// Botón de tinta: "primario" dorado o "secundario" translúcido. Mínimo 48 px de alto.
function boton(escena, x, y, etiqueta, alTocar, op = {}) {
  const w = op.ancho || 220;
  const h = Math.max(48, op.alto || 58);
  const primario = op.estilo !== 'secundario';
  const c = escena.add.container(x, y);
  const g = escena.add.graphics();
  if (primario) {
    g.fillStyle(0x000000, 0.3).fillRoundedRect(-w / 2, -h / 2 + 5, w, h, h / 2);
    g.fillStyle(ORO, 1).fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    g.fillStyle(0xFFFFFF, 0.3).fillRoundedRect(-w / 2 + 14, -h / 2 + 5, w - 28, h * 0.28, h * 0.14);
    g.lineStyle(2.5, 0x1A0F14, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  } else {
    g.fillStyle(0x140C12, 0.4).fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    g.lineStyle(1.6, CREMA, 0.75).strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  }
  const t = texto(escena, 0, -2, etiqueta, op.tam || 28, primario ? hex(TINTA) : hex(CREMA), { serif: true, peso: '700' });
  c.add([g, t]);
  c.setSize(w, h + 6);
  c.setInteractive({ useHandCursor: true });
  const activar = () => { if (alTocar) alTocar(); };
  c.on('pointerdown', () => {
    Sonido.iniciar();
    Sonido.sfx('tap');
    escena.tweens.add({ targets: c, scale: 0.94, duration: 80, yoyo: true });
  });
  c.on('pointerup', activar);
  c.on('pointerover', () => { if (!TACTIL) g.setAlpha(0.88); });
  c.on('pointerout', () => g.setAlpha(1));
  (op.teclas || []).forEach((tecla) => {
    if (escena.input.keyboard) escena.input.keyboard.on('keydown-' + tecla, () => { Sonido.iniciar(); activar(); });
  });
  c.etiqueta = t;
  return c;
}

// Fondo con degradado vertical: anclas = [[y, color], ...]
function fondoDegradado(escena, anclas) {
  const g = escena.add.graphics();
  for (let i = 0; i < anclas.length - 1; i++) {
    const [y0, c0] = anclas[i];
    const [y1, c1] = anclas[i + 1];
    if (y1 <= y0) continue;
    g.fillGradientStyle(c0, c0, c1, c1, 1);
    g.fillRect(0, y0, W, y1 - y0 + 1);
  }
  return g;
}

// Todas las escenas entran con fundido.
const SIN_FUNDIDO = new URLSearchParams(location.search).has('captura'); // para capturas de prueba
function entrar(escena) {
  escena._saliendo = false;
  escena.input.enabled = true;
  if (!SIN_FUNDIDO) escena.cameras.main.fadeIn(FUNDIDO, ...COLOR_FUNDIDO);
}

// Cambia de escena con fundido de salida (ignora toques repetidos).
function irA(escena, clave, datos) {
  if (escena._saliendo) return;
  escena._saliendo = true;
  escena.input.enabled = false;
  escena.cameras.main.fadeOut(FUNDIDO, ...COLOR_FUNDIDO);
  escena.cameras.main.once('camerafadeoutcomplete', () => {
    aplicarTamano(escena.game);
    escena.scene.start(clave, datos);
  });
}

function hud(escena) { return escena.scene.get('HUD'); }

// Nota tipo "papel" que aparece y desaparece sola.
function aviso(escena, x, y, str, op = {}) {
  const t = texto(escena, 0, 0, str, op.tam || 17, hex(TINTA), { peso: '700', ancho: 300 });
  const w = t.width + 34;
  const h = t.height + 18;
  const g = escena.add.graphics();
  g.fillStyle(0x000000, 0.25).fillRoundedRect(-w / 2, -h / 2 + 4, w, h, h / 2);
  g.fillStyle(0xFBF3E2, 0.97).fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  g.lineStyle(2, TINTA, 0.9).strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  const cx = Math.max(w / 2 + 8, Math.min(W - w / 2 - 8, x));
  const c = escena.add.container(cx, y, [g, t]).setDepth(100).setScale(0.6).setAlpha(0).setScrollFactor(0);
  escena.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 180, ease: 'Back.easeOut' });
  escena.tweens.add({
    targets: c, alpha: 0, y: y - 16, delay: op.duracion || 1700, duration: 300,
    onComplete: () => c.destroy(),
  });
  return c;
}

// Foto ajustada (recorte tipo "cover") o marco placeholder si no existe.
function foto(escena, x, y, w, h, ruta, paleta = PALETAS[0]) {
  const clave = 'foto:' + ruta;
  if (ruta && escena.textures.exists(clave)) {
    const img = escena.add.image(x, y, clave);
    const s = Math.max(w / img.width, h / img.height);
    const cw = w / s;
    const ch = h / s;
    img.setCrop((img.width - cw) / 2, (img.height - ch) / 2, cw, ch);
    img.setScale(s);
    return img;
  }
  const c = escena.add.container(x, y);
  const g = escena.add.graphics();
  g.fillStyle(paleta.fondo, 1).fillRect(-w / 2, -h / 2, w, h);
  g.lineStyle(3, paleta.medio, 1).strokeRect(-w / 2 + 6, -h / 2 + 6, w - 12, h - 12);
  const corazon = escena.add.image(0, -8, 'corazon').setScale(Math.min(w, h) / 90);
  const t = texto(escena, 0, Math.min(h / 2 - 18, 34), 'foto', 14, hex(paleta.oscuro));
  c.add([g, corazon, t]);
  return c;
}

// Página del diario (320×500): foto vertical pegada con cinta, título, texto a mano y pie.
// datos = { foto, titulo, texto, pie, contador }
function paginaRecuerdo(escena, x, y, datos, paleta) {
  const c = escena.add.container(x, y);
  c.add(escena.add.image(0, 0, 'pagina_diario'));
  c.add(foto(escena, 0, -114, 210, 236, datos.foto, paleta).setAngle(-2));
  c.add(escena.add.image(-98, -228, 'cinta').setAngle(-32));
  c.add(escena.add.image(98, -228, 'cinta').setAngle(30));
  let yTexto = 22;
  if (datos.titulo) {
    const t = texto(escena, 0, 22, datos.titulo, 23, hex(TINTA), { serif: true, peso: '700', ancho: 270, interlineado: -4, origenY: 0 });
    c.add(t);
    yTexto = 22 + t.height + 8;
  }
  const largo = (datos.texto || '').length;
  c.add(texto(escena, 0, yTexto, datos.texto || '', largo > 130 ? 15 : 17, hex(TINTA),
    { serif: true, peso: 'italic 600', ancho: 266, interlineado: 1, origenY: 0 }));
  if (datos.pie) c.add(texto(escena, 0, 210, datos.pie, 16, '#B0485F', { serif: true, peso: 'italic 700', ancho: 260 }));
  if (datos.contador) c.add(texto(escena, 124, 234, datos.contador, 13, '#8C6A48', { serif: true, peso: '700' }));
  return c;
}

// Partículas sutiles (pétalos, chispas de farol, luciérnagas, estrellas).
function particulasEtapa(escena, i) {
  const brilloSuave = (p, k, t) => Math.sin(t * Math.PI);
  const cfg = [
    {
      x: { min: -20, max: W + 20 }, y: -20, lifespan: 13000,
      speedY: { min: 35, max: 65 }, speedX: { min: -25, max: 25 },
      rotate: { start: 0, end: 360 }, scale: { min: 0.7, max: 1.2 },
      alpha: 0.85, frequency: Math.round(650 * 390 / W), maxAliveParticles: Math.round(22 * W / 390),
    },
    {
      x: { min: 0, max: W }, y: H + 20, lifespan: 14000,
      speedY: { min: -60, max: -30 }, speedX: { min: -10, max: 10 },
      scale: { min: 0.5, max: 1.3 }, alpha: 0.8, frequency: 700, maxAliveParticles: 20,
    },
    {
      x: { min: 0, max: W }, y: { min: 120, max: H - 40 }, lifespan: 4000,
      speed: { min: 6, max: 20 }, scale: { min: 0.6, max: 1.1 },
      alpha: { start: 0, end: 1, onUpdate: brilloSuave }, frequency: 260, maxAliveParticles: 18,
    },
    {
      x: { min: 0, max: W }, y: { min: 0, max: H * 0.7 }, lifespan: 3200,
      speed: 0, scale: { min: 0.4, max: 1 },
      alpha: { start: 0, end: 1, onUpdate: brilloSuave }, frequency: 180, maxAliveParticles: 22,
    },
  ][i];
  return escena.add.particles(0, 0, PALETAS[i].particula, cfg);
}

// Motas de luz que flotan (portada y mapa)
function motasDeLuz(escena, cantidad) {
  return escena.add.particles(0, 0, 'mota', {
    x: { min: 0, max: W }, y: { min: 100, max: H - 60 }, lifespan: 6000,
    speedY: { min: -14, max: -4 }, speedX: { min: -6, max: 6 }, scale: { min: 0.4, max: 1 },
    alpha: { start: 0, end: 1, onUpdate: (p, k, t) => Math.sin(t * Math.PI) * 0.9 },
    frequency: Math.max(60, Math.round(9000 / cantidad)), maxAliveParticles: cantidad,
    blendMode: 'ADD',
  });
}

/* =====================================================================
 *  Texturas
 * ===================================================================== */
// Convierte un SVG (string) en textura de Phaser. Si falla, no rompe el juego.
function svgATextura(escena, clave, arte) {
  return new Promise((resolver) => {
    const img = new Image();
    const url = URL.createObjectURL(new Blob([arte.svg], { type: 'image/svg+xml' }));
    img.onload = () => {
      escena.textures.addImage(clave, img);
      if (arte.cuadros) {
        const tex = escena.textures.get(clave);
        for (let i = 0; i < arte.cuadros.n; i++) tex.add(i, 0, i * arte.cuadros.w, 0, arte.cuadros.w, arte.cuadros.h);
      }
      URL.revokeObjectURL(url);
      resolver(true);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolver(false); };
    img.width = arte.w;
    img.height = arte.h;
    img.src = url;
  });
}

function puntosCorazon(cx, cy, s) {
  const pts = [];
  for (let i = 0; i < 48; i++) {
    const t = (i / 48) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    pts.push({ x: cx + (x * s) / 34, y: cy + ((y - 2.5) * s) / 34 });
  }
  return pts;
}

function puntosEstrella(cx, cy, puntas, rExt, rInt) {
  const pts = [];
  for (let i = 0; i < puntas * 2; i++) {
    const r = i % 2 === 0 ? rExt : rInt;
    const a = -Math.PI / 2 + (i * Math.PI) / puntas;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

// Texturas pequeñas dibujadas con Graphics (efectos y piezas de los niveles actuales).
function generarTexturas(escena) {
  const hacer = (clave, w, h, dibujo) => {
    if (escena.textures.exists(clave)) return;
    const g = escena.make.graphics({ x: 0, y: 0 }, false);
    dibujo(g);
    g.generateTexture(clave, w, h);
    g.destroy();
  };

  hacer('brillo', 96, 96, (g) => {
    for (let r = 48; r > 2; r -= 4) g.fillStyle(0xFFFFFF, 0.07).fillCircle(48, 48, r);
  });
  hacer('mota', 16, 16, (g) => {
    for (let r = 8; r > 1; r -= 1.5) g.fillStyle(0xFFE7A8, 0.16).fillCircle(8, 8, r);
    g.fillStyle(0xFFF6E2, 1).fillCircle(8, 8, 1.5);
  });
  hacer('polvo', 16, 16, (g) => {
    for (let r = 8; r > 1; r -= 2) g.fillStyle(0xF3E2C6, 0.22).fillCircle(8, 8, r);
  });
  hacer('chispa', 18, 18, (g) => {
    g.fillStyle(TESORO.oro, 1).fillPoints(puntosEstrella(9, 9, 4, 9, 2.5), true);
    g.fillStyle(0xFFFFFF, 1).fillCircle(9, 9, 2);
  });
  hacer('corazon', 40, 36, (g) => {
    const pts = puntosCorazon(20, 19, 34);
    g.fillStyle(TESORO.rosa, 1).fillPoints(pts, true);
    g.lineStyle(2.5, TINTA, 1).strokePoints(pts, true);
    g.fillStyle(0xFFFFFF, 0.6).fillEllipse(12, 11, 6, 4);
  });
  hacer('petalo', 16, 12, (g) => {
    g.fillStyle(0xFF9EB0, 1).fillEllipse(8, 6, 14, 9);
    g.fillStyle(0xFFFFFF, 0.5).fillEllipse(6, 5, 5, 3);
  });
  hacer('luciernaga', 20, 20, (g) => {
    for (let r = 10; r > 2; r -= 2) g.fillStyle(0xF3FF9A, 0.18).fillCircle(10, 10, r);
    g.fillStyle(0xFFFFE0, 1).fillCircle(10, 10, 2.5);
  });
  hacer('estrella', 20, 20, (g) => {
    g.fillStyle(TESORO.crema, 1).fillPoints(puntosEstrella(10, 10, 5, 9, 4), true);
  });

  // Cuadrícula de colisión de los niveles (invisible: el terreno se ve ilustrado)
  hacer("tiles", 120, 40, (g) => g.fillStyle(0xFFFFFF, 1).fillRect(0, 0, 120, 40));
}

function crearAnimaciones(escena) {
  if (!escena.textures.exists('angie') || escena.anims.exists('angie_correr')) return;
  const c = (frame, duration) => ({ key: 'angie', frame, duration });
  escena.anims.create({
    key: 'angie_quieta', frameRate: 1000, repeat: -1,
    frames: [c(0, 650), c(1, 650), c(0, 650), c(1, 520), c(12, 110), c(1, 420)],
  });
  escena.anims.create({
    key: 'angie_correr', frameRate: 12, repeat: -1,
    frames: [2, 3, 4, 5, 6, 7].map((n) => ({ key: 'angie', frame: n })),
  });
}

/* =====================================================================
 *  Angie fuera de los niveles (portada y mapa)
 * ===================================================================== */
const ANGIE_PIES = 184 / 192; // origen vertical en los pies

class Heroina extends Phaser.GameObjects.Sprite {
  constructor(escena, x, y, escala = 1) {
    super(escena, x, y, 'angie', 0);
    this.setOrigin(0.5, ANGIE_PIES).setScale(escala);
    escena.add.existing(this);
    this.quieta();
  }
  quieta() { this.play('angie_quieta', true); }
  caminar() { this.play('angie_correr', true); }
  celebrar() { this.stop(); this.setFrame(11); }
  mirar(dx) { if (Math.abs(dx) > 0.4) this.setFlipX(dx < 0); }
}

/* =====================================================================
 *  Boot: carga fotos, dibuja el arte y espera las fuentes
 * ===================================================================== */
function listaFotos() {
  const rutas = [];
  CFG.etapas.forEach((e) => e.recuerdos.forEach((r) => rutas.push(r.foto)));
  rutas.push(...CFG.memoria.fotos, CFG.rompecabezas.foto, CFG.final.foto);
  return [...new Set(rutas.filter(Boolean))];
}

class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    this.barra = this.add.graphics();
    this.pintarBarra(0);
    this.load.on('progress', (p) => this.pintarBarra(p * 0.4));
    // Si falta una foto no pasa nada: se dibuja un marco placeholder.
    this.load.on('loaderror', () => {});
    listaFotos().forEach((ruta) => this.load.image('foto:' + ruta, ruta));
  }

  pintarBarra(p) {
    const b = this.barra;
    b.clear();
    b.fillStyle(CREMA, 0.18).fillRoundedRect(W / 2 - 100, H / 2 - 4, 200, 8, 4);
    b.fillStyle(ORO, 1).fillRoundedRect(W / 2 - 100, H / 2 - 4, Math.max(8, 200 * p), 8, 4);
  }

  create() {
    Guardado.cargar();
    Sonido.silencio = Guardado.datos.silencio;
    generarTexturas(this);

    const fuentes = document.fonts && document.fonts.load
      ? Promise.race([
        Promise.all([
          document.fonts.load('600 20px "Cormorant Garamond"'),
          document.fonts.load('italic 600 20px "Cormorant Garamond"'),
          document.fonts.load('700 20px "Cormorant Garamond"'),
          document.fonts.load('600 20px Nunito'),
          document.fonts.load('700 20px Nunito'),
        ]),
        new Promise((r) => setTimeout(r, 3000)),
      ]).catch(() => {})
      : Promise.resolve();

    const piezas = Object.entries(Arte.catalogo());
    let hechas = 0;
    const arte = Promise.all(piezas.map(([clave, a]) => svgATextura(this, clave, a).then(() => {
      hechas++;
      this.pintarBarra(0.4 + 0.6 * (hechas / piezas.length));
    })));

    Promise.all([arte, fuentes]).then(() => {
      crearAnimaciones(this);
      this.scene.launch('HUD');
      this.scene.bringToTop('HUD');
      // Atajo de prueba: ?etapa=1..4 o ?escena=Mapa abre esa escena directamente
      const q = new URLSearchParams(location.search);
      const etapa = parseInt(q.get('etapa'), 10);
      const destino = etapa >= 1 && etapa <= 4 ? 'Etapa' + etapa
        : ['Mapa', 'Cofre', 'Mini1', 'Mini2', 'Mini3', 'Mini4'].includes(q.get('escena')) ? q.get('escena') : 'Intro';
      this.scene.start(destino);
    });
  }
}

/* =====================================================================
 *  HUD: 4 llaves al centro + botón de silencio (siempre encima)
 * ===================================================================== */
function disco(escena, x, y, r) {
  const g = escena.add.graphics();
  g.fillStyle(0x140C12, 0.4).fillCircle(x, y, r);
  g.lineStyle(1.5, CREMA, 0.75).strokeCircle(x, y, r);
  return g;
}

class HUD extends Phaser.Scene {
  constructor() {
    super('HUD');
    this.verLlaves = false;
  }

  create() {
    this.slots = [];
    this.llaves = [];
    this.panel = this.add.container(0, 0);
    for (let i = 0; i < 4; i++) {
      const x = W / 2 + (i - 1.5) * 46;
      const y = 42;
      const silueta = this.add.image(x, y, 'llave').setScale(0.3).setAngle(-35).setTintFill(CREMA).setAlpha(0.3);
      const brillo = this.add.image(x, y, 'brillo').setTint(ORO).setScale(0.5).setAlpha(0.6).setBlendMode('ADD');
      const llave = this.add.image(x, y, 'llave').setScale(0.3).setAngle(-35);
      const tiene = Guardado.tiene(i);
      brillo.setVisible(tiene);
      llave.setVisible(tiene);
      this.panel.add([disco(this, x, y, 18), silueta, brillo, llave]);
      this.slots.push({ x, y, brillo });
      this.llaves.push(llave);
    }
    this.panel.setVisible(this.verLlaves);

    // Botón de silencio (56×56 de área táctil) + tecla M
    const bx = W - 34;
    const by = 42;
    disco(this, bx, by, 22);
    this.icono = this.add.image(bx, by, Sonido.silencio ? 'ico_mudo' : 'ico_sonido').setScale(0.5);
    const zona = this.add.zone(bx, by, 56, 56).setInteractive({ useHandCursor: true });
    const alternar = () => {
      Sonido.iniciar();
      Sonido.setSilencio(!Sonido.silencio);
      this.icono.setTexture(Sonido.silencio ? 'ico_mudo' : 'ico_sonido');
      this.tweens.add({ targets: this.icono, scale: 0.42, duration: 80, yoyo: true });
      Sonido.sfx('tap');
    };
    zona.on('pointerdown', alternar);
    if (this.input.keyboard) this.input.keyboard.on('keydown-M', alternar);
  }

  mostrarLlaves(v) {
    this.verLlaves = v;
    if (this.panel) this.panel.setVisible(v);
  }

  refrescar() {
    if (!this.llaves) return;
    this.llaves.forEach((l, i) => {
      l.setVisible(Guardado.tiene(i));
      this.slots[i].brillo.setVisible(Guardado.tiene(i));
    });
  }

  // La llave aparece en (x, y), brilla y vuela a su ranura.
  volarLlave(i, x, y, alTerminar) {
    this.mostrarLlaves(true);
    const destino = this.slots[i];
    const brillo = this.add.image(x, y, 'brillo').setTint(ORO).setScale(0.4).setBlendMode('ADD');
    const llave = this.add.image(x, y, 'llave').setScale(0.1);
    Sonido.sfx('llave');

    this.tweens.add({ targets: llave, scale: 0.9, angle: 325, duration: 600, ease: 'Back.easeOut' });
    this.tweens.add({ targets: brillo, scale: 2.4, duration: 600, ease: 'Sine.easeOut' });

    this.time.delayedCall(1100, () => {
      this.tweens.add({ targets: [llave, brillo], x: destino.x, y: destino.y, duration: 800, ease: 'Cubic.easeInOut' });
      this.tweens.add({ targets: llave, scale: 0.3, duration: 800, ease: 'Cubic.easeInOut' });
      this.tweens.add({
        targets: brillo, scale: 0.6, alpha: 0.6, duration: 800, ease: 'Cubic.easeInOut',
        onComplete: () => {
          llave.destroy();
          this.llaves[i].setVisible(true).setScale(0.5);
          destino.brillo.setVisible(true);
          this.tweens.add({ targets: this.llaves[i], scale: 0.3, duration: 350, ease: 'Back.easeOut' });
          this.tweens.add({ targets: brillo, scale: 1.8, alpha: 0, duration: 500, onComplete: () => brillo.destroy() });
          const chispas = this.add.particles(destino.x, destino.y, 'chispa', {
            speed: { min: 60, max: 170 }, lifespan: 650, scale: { start: 1, end: 0 }, emitting: false,
          });
          chispas.explode(14);
          Sonido.sfx('acierto');
          this.time.delayedCall(800, () => chispas.destroy());
          if (alTerminar) this.time.delayedCall(550, alTerminar);
        },
      });
    });
  }
}

/* =====================================================================
 *  Intro: el prado del amanecer
 * ===================================================================== */
// Primer plano oscuro en los bordes de la pantalla (hierba y rama)
function primerPlano(escena) {
  const escala = Math.min(1.2, 0.8 + W / 2000);
  escena.add.image(-30, H + 30, 'mata').setOrigin(0, 1).setScale(escala).setDepth(40);
  escena.add.image(W + 30, H + 30, 'mata').setOrigin(0, 1).setScale(escala).setFlipX(true).setOrigin(1, 1).setDepth(40);
  escena.add.image(-20, 120, 'rama').setOrigin(0, 0.5).setScale(escala).setDepth(40);
  escena.add.image(W / 2, H / 2, 'vineta').setDisplaySize(W, H).setDepth(41);
}

class Intro extends Phaser.Scene {
  constructor() {
    super('Intro');
    this.reacomodable = true;
  }

  create() {
    entrar(this);
    Musica.tocar('intro');
    hud(this).mostrarLlaves(false);
    this.ocupado = false;

    this.add.image(W / 2, H / 2, 'intro_fondo');
    particulasEtapa(this, 0).setDepth(30);
    motasDeLuz(this, Math.round(18 * W / 390)).setDepth(31);

    const heroina = new Heroina(this, W / 2, Arte.SUELO_INTRO, 0.95).setDepth(20);
    this.time.addEvent({
      delay: 4200, loop: true,
      callback: () => {
        heroina.celebrar();
        this.time.delayedCall(900, () => heroina.quieta());
      },
    });
    primerPlano(this);

    const titulo = texto(this, W / 2, 190, CFG.intro.titulo, 58, '#3A2330', {
      serif: true, peso: '700', interlineado: -14, sombra: '#FFF6E2', desenfoque: 14,
    }).setDepth(50);
    this.tweens.add({ targets: titulo, alpha: { from: 0, to: 1 }, y: { from: 205, to: 190 }, duration: 1200, ease: 'Sine.easeOut' });

    texto(this, W / 2, 712, CFG.intro.frase, 17, hex(CREMA), {
      ancho: 330, interlineado: 4, sombra: '#000000', desenfoque: 6,
    }).setDepth(50);

    const etiqueta = Guardado.total() > 0 ? CFG.intro.botonContinuar : CFG.intro.botonEmpezar;
    const brillo = this.add.image(W / 2, 784, 'brillo').setTint(ORO).setScale(3.2, 1.3).setAlpha(0.5).setBlendMode('ADD').setDepth(50);
    this.tweens.add({ targets: brillo, alpha: 0.15, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    boton(this, W / 2, 784, etiqueta, () => {
      Sonido.iniciar();
      irA(this, 'Mapa');
    }, { ancho: 230, alto: 58, tam: 30, teclas: ['ENTER', 'SPACE'] }).setDepth(51);

    if (!TACTIL) texto(this, W / 2, 826, 'Enter para empezar · M para silenciar', 13, hex(CREMA)).setAlpha(0.6).setDepth(51);
  }
}

/* =====================================================================
 *  Mapa: pergamino con el viaje dibujado a tinta
 * ===================================================================== */
class Mapa extends Phaser.Scene {
  constructor() {
    super('Mapa');
    this.reacomodable = true;
  }

  create() {
    entrar(this);
    Musica.tocar('mapa');
    const h = hud(this);
    h.mostrarLlaves(true);
    h.refrescar();
    this.ocupado = false;

    this.add.image(W / 2, H / 2, 'mapa_fondo');
    motasDeLuz(this, Math.round(14 * W / 390));

    // Pergamino centrado (380×740) debajo del HUD
    const ox = Math.round(W / 2 - Arte.PAPEL.w / 2);
    const oy = 98;
    this.add.image(ox - Arte.PAPEL.margen, oy - Arte.PAPEL.margen, 'pergamino').setOrigin(0);
    const P = ([x, y]) => [ox + x, oy + y];

    // Los lugares completados se "colorean" con acuarela
    Arte.ZONAS.forEach((z, i) => {
      if (!Guardado.tiene(i)) return;
      this.add.image(ox + z.x, oy + z.y, 'mapa_color_' + i).setBlendMode(Phaser.BlendModes.MULTIPLY).setAlpha(0.9);
    });

    this.puntos = Arte.RUTA.map(P);
    this.ruta = new Phaser.Curves.Spline(this.puntos.map(([x, y]) => new Phaser.Math.Vector2(x, y)));

    // Cofre en la cima
    const total = Guardado.total();
    const [cx, cy] = this.puntos[5];
    const brillo = this.add.image(cx, cy - 22, 'brillo').setTint(ORO).setScale(1.3)
      .setAlpha(total === 4 ? 0.9 : 0.25).setBlendMode('ADD');
    this.cofre = this.add.image(cx, cy - 22, 'cofre_mapa').setScale(0.45).setDepth(5);
    texto(this, cx + 40, cy - 20, `${total}/4`, 17, SEPIA, { serif: true, peso: '700', origenX: 0 }).setDepth(5);
    if (total === 4) {
      this.tweens.add({ targets: brillo, scale: 1.8, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: this.cofre, angle: { from: -5, to: 5 }, duration: 260, yoyo: true, repeat: -1 });
    }
    const zonaCofre = this.add.zone(cx, cy - 20, 90, 80).setInteractive({ useHandCursor: true });
    zonaCofre.on('pointerup', () => this.tocarCofre());

    // Paradas
    this.paradas = [];
    for (let i = 0; i < 4; i++) this.crearParada(i);

    // Angie en la última parada completada
    this.tActual = total === 0 ? 0 : total / (this.puntos.length - 1);
    const inicio = this.ruta.getPoint(this.tActual);
    this.heroina = new Heroina(this, inicio.x, inicio.y, 0.32).setDepth(10);

    // Pista al pie del pergamino
    const siguiente = Guardado.datos.llaves.indexOf(false);
    const pista = total === 0 ? (TACTIL ? 'Toca la primera parada para empezar' : 'Haz clic en la primera parada (o Enter)')
      : total < 4 ? `Sigue tu viaje: etapa ${ROMANOS[siguiente]}`
        : 'Tienes las cuatro llaves. Ve al cofre…';
    texto(this, W / 2, oy + 718, pista, 18, SEPIA, { serif: true, peso: 'italic 600' });

    if (W >= 900) this.costadosAnchos(ox);

    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-ENTER', () => {
        if (Guardado.total() === 4) this.tocarCofre();
        else this.tocarParada(Guardado.datos.llaves.indexOf(false));
      });
    }
  }

  // En pantallas anchas (PC): título del viaje a la izquierda y lista de etapas a la derecha.
  costadosAnchos(ox) {
    const izq = ox / 2;
    const der = W - ox / 2;
    texto(this, izq, 330, 'Nuestro viaje', 52, hex(CREMA), { serif: true, peso: 'italic 700', sombra: '#000000' });
    texto(this, izq, 400, CFG.intro.frase, 18, hex(CREMA), { ancho: Math.min(360, ox - 60), interlineado: 4 }).setAlpha(0.8);

    texto(this, der, 250, 'Etapas', 30, hex(ORO), { serif: true, peso: '700' });
    for (let i = 0; i < 4; i++) {
      const y = 320 + i * 82;
      const completa = Guardado.tiene(i);
      const abierta = Guardado.desbloqueada(i);
      const clave = completa ? 'sello_hecho' : abierta ? 'sello_' + i : 'sello_bloq';
      const x0 = der - 150;
      this.add.image(x0, y, clave).setScale(0.42).setAlpha(abierta ? 1 : 0.6);
      const t = texto(this, x0 + 34, y - 10, `${ROMANOS[i]} · ${CFG.etapas[i].titulo}`, 24, hex(CREMA), { serif: true, peso: '700', origenX: 0 });
      const estado = completa ? 'Llave conseguida' : abierta ? 'Disponible' : 'Bloqueada';
      texto(this, x0 + 34, y + 16, estado, 14, completa ? hex(ORO) : hex(CREMA), { origenX: 0 }).setAlpha(abierta ? 0.85 : 0.5);
      if (!abierta) t.setAlpha(0.5);
      const zona = this.add.zone(der, y, 320, 70).setInteractive({ useHandCursor: abierta });
      zona.on('pointerup', () => this.tocarParada(i));
    }
  }

  crearParada(i) {
    const [x, y] = this.puntos[i + 1];
    const completa = Guardado.tiene(i);
    const abierta = Guardado.desbloqueada(i);
    const actual = abierta && !completa;
    const c = this.add.container(x, y).setDepth(5);

    if (actual) {
      const brillo = this.add.image(0, 0, 'brillo').setTint(ORO).setScale(1.1).setBlendMode('ADD');
      c.add(brillo);
      this.tweens.add({ targets: brillo, scale: 1.5, alpha: 0.4, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    const clave = completa ? 'sello_hecho' : abierta ? 'sello_' + i : 'sello_bloq';
    c.add(this.add.image(0, 0, clave).setScale(0.5));
    if (actual) c.add(texto(this, 0, -1, ROMANOS[i], 22, hex(CREMA), { serif: true, peso: '700' }));

    // Nombre del lugar, al costado
    const izquierda = x > W / 2;
    const lx = izquierda ? x - 34 : x + 34;
    const t = texto(this, lx, y, CFG.etapas[i].titulo, 21, SEPIA, {
      serif: true, peso: 'italic 700', origenX: izquierda ? 1 : 0,
    });
    if (!abierta) t.setAlpha(0.5);

    if (actual) this.tweens.add({ targets: c, scale: 1.08, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const zona = this.add.zone(x, y, 76, 76).setInteractive({ useHandCursor: true });
    zona.on('pointerup', () => this.tocarParada(i));
    this.paradas.push(c);
  }

  tocarParada(i) {
    if (this.ocupado || this._saliendo || i < 0) return;
    const c = this.paradas[i];
    if (!Guardado.desbloqueada(i)) {
      Sonido.sfx('error');
      this.tweens.add({ targets: c, x: c.x + 5, duration: 50, yoyo: true, repeat: 3 });
      aviso(this, c.x, c.y - 52, `Primero completa «${CFG.etapas[i - 1].titulo}»`);
      return;
    }
    Sonido.iniciar();
    Sonido.sfx('tap');
    this.caminarA((i + 1) / (this.puntos.length - 1), () => irA(this, 'Etapa' + (i + 1)));
  }

  tocarCofre() {
    if (this.ocupado || this._saliendo) return;
    if (Guardado.total() < 4) {
      Sonido.sfx('error');
      this.tweens.add({ targets: this.cofre, angle: 8, duration: 60, yoyo: true, repeat: 3 });
      aviso(this, this.cofre.x, this.cofre.y + 56, 'Necesitas las cuatro llaves');
      return;
    }
    this.caminarA(1, () => irA(this, 'Cofre'));
  }

  caminarA(tDestino, alLlegar) {
    this.ocupado = true;
    const desde = this.tActual;
    const dur = Math.max(250, Math.abs(tDestino - desde) * (this.puntos.length - 1) * 1100);
    const obj = { t: desde };
    this.heroina.caminar();
    this.tweens.add({
      targets: obj, t: tDestino, duration: dur, ease: 'Sine.easeInOut',
      onUpdate: () => {
        const pt = this.ruta.getPoint(obj.t);
        this.heroina.mirar(pt.x - this.heroina.x);
        this.heroina.setPosition(pt.x, pt.y);
      },
      onComplete: () => {
        this.tActual = tDestino;
        this.heroina.quieta();
        this.time.delayedCall(250, alLlegar);
      },
    });
  }
}

/* =====================================================================
 *  Niveles de plataformas
 *
 *  Cuadrícula de 40 px: columnas hacia la derecha, filas 0–16 hacia abajo.
 *  El suelo ocupa las filas 15 y 16 (se pisa en y = 600). Debajo (y > 680)
 *  van los controles táctiles.
 *    suelo:       [desde, hasta)  tramos de suelo (los huecos son caídas)
 *    bloques:     [col, filaSuperior, ancho]  muros sólidos hasta el suelo
 *    plataformas: [col, fila, ancho]  plataformas que se atraviesan desde abajo
 *    moviles:     [col, fila, rango]  plataforma que va y viene `rango` columnas
 *    luz:         [col, fila, desfase]  plataforma de luz (2 columnas) que se enciende y se apaga
 *    avisoFarol:  texto que aparece al encender el primer farol
 *    obj: S inicio · m página del diario (recuerdo) · h luz · x zarza
 *         e sombra del olvido · f farol de piedra (control) · c cofre (meta)
 *  Salto máximo ≈ 3,5 filas de alto y 4,5 columnas de largo; con el salto de
 *  pétalo ≈ 6 filas y 10 columnas. Planeando se cruzan huecos de 14 columnas.
 * ===================================================================== */
const TILE = 40;
const FILAS = 17;
const CONTROLES_Y = 680;
const ESCALA_NIVEL = 0.47; // Angie mide ≈ 66 px en los niveles

const NIVELES = [
  { // 1 · Nos conocimos — aprender a correr y saltar
    ancho: 74,
    suelo: [[0, 22], [24, 46], [49, 74]],
    bloques: [[30, 13, 2], [60, 12, 2]],
    plataformas: [[14, 12, 3], [36, 12, 3], [40, 10, 3]],
    moviles: [],
    obj: [['S', 2, 14], ['h', 5, 13], ['h', 6, 13], ['h', 7, 13], ['m', 10, 14], ['x', 17, 14],
      ['h', 15, 11], ['e', 20, 14], ['m', 28, 14], ['e', 38, 14], ['h', 41, 9], ['h', 42, 9],
      ['f', 44, 14], ['m', 52, 14], ['x', 55, 14], ['x', 56, 14], ['h', 63, 13], ['h', 64, 13],
      ['h', 65, 13], ['c', 70, 14]],
  },
  { // 2 · Primera cita — estrena el salto de pétalo (doble salto) y la primera plataforma móvil
    ancho: 78,
    suelo: [[0, 14], [17, 28], [32, 44], [52, 60], [63, 78]],
    bloques: [[55, 13, 2]],
    plataformas: [[6, 12, 3], [20, 12, 3], [24, 9, 3], [36, 12, 4], [66, 12, 3], [70, 9, 2]],
    moviles: [[45, 14, 4]],
    obj: [['S', 2, 14], ['h', 7, 11], ['h', 8, 11], ['m', 11, 14], ['e', 22, 14], ['h', 25, 8],
      ['h', 26, 8], ['h', 25, 3], ['h', 26, 3], ['f', 26, 14], ['m', 34, 14], ['x', 37, 14], ['e', 40, 14], ['f', 42, 14], ['m', 58, 14],
      ['x', 65, 14], ['h', 67, 11], ['h', 68, 11], ['h', 71, 8], ['c', 75, 14]],
  },
  { // 3 · Nuestro lugar — estrena el planeo: desde lo alto de los troncos se cruzan claros anchos
    ancho: 90,
    suelo: [[0, 12], [15, 27], [41, 52], [60, 68], [80, 90]],
    bloques: [[25, 9, 2], [66, 8, 2]],
    plataformas: [[5, 12, 3], [17, 11, 3], [22, 12, 2], [44, 12, 3], [62, 12, 2]],
    moviles: [[53, 14, 4]],
    avisoFarol: 'Mantén el salto mientras caes para planear',
    obj: [['S', 2, 14], ['h', 6, 11], ['h', 7, 11], ['m', 8, 14], ['h', 18, 10], ['h', 19, 10],
      ['f', 20, 14], ['e', 16, 14], ['h', 29, 9], ['h', 32, 10], ['h', 35, 11], ['h', 38, 12],
      ['m', 45, 14], ['e', 49, 14], ['x', 51, 14], ['f', 61, 14], ['h', 63, 11],
      ['h', 70, 8], ['h', 72, 9], ['m', 74, 11], ['h', 76, 11], ['x', 83, 14], ['c', 87, 14]],
  },
  { // 4 · Nuestro futuro — combina todo: plataformas de luz, salto de pétalo y planeo
    ancho: 92,
    suelo: [[0, 10], [13, 22], [30, 40], [47, 56], [70, 80], [85, 92]],
    bloques: [[34, 12, 2], [52, 8, 2]],
    plataformas: [[4, 12, 3], [15, 12, 2], [18, 9, 3], [49, 12, 2], [72, 12, 3], [76, 9, 3]],
    moviles: [[41, 14, 3]],
    luz: [[23, 13, 0], [26, 12, 0.5], [62, 12, 0], [81, 12, 0.3]],
    obj: [['S', 2, 14], ['h', 5, 11], ['h', 6, 11], ['m', 7, 14], ['e', 17, 14], ['h', 19, 8],
      ['h', 20, 8], ['h', 24, 12], ['h', 27, 11], ['f', 31, 14], ['m', 38, 14], ['e', 33, 14],
      ['f', 48, 14], ['x', 50, 14], ['h', 57, 8], ['h', 60, 9], ['m', 63, 10], ['h', 66, 11],
      ['e', 74, 14], ['h', 73, 11], ['h', 77, 8], ['h', 78, 8], ['h', 82, 11], ['x', 87, 14], ['c', 89, 14]],
  },
];

const VEL_PLANEO = 115;   // caída máxima al planear (px/s)
const CICLO_LUZ = 3600;   // ms de un ciclo de las plataformas de luz
const FRASES_CAIDA =['¡Uy! Aquí te atrapo', 'No pasa nada, otra vez', '¡Casi! Tú puedes'];

class Nivel extends Phaser.Scene {
  constructor(i) {
    super('Etapa' + (i + 1));
    this.i = i;
  }

  create() {
    entrar(this);
    Musica.tocar('etapa' + (this.i + 1));
    hud(this).mostrarLlaves(true);
    const i = this.i;
    const def = NIVELES[i];
    const anchoPx = def.ancho * TILE;
    this.anchoPx = anchoPx;

    this.listo = false;
    this.pausa = false;
    this.ganado = false;
    this.cayendo = false;
    this.invuln = 0;
    this.bloqueo = 0;
    this.coyote = 0;
    this.buffer = 0;
    this.aterrizaje = 0;
    this.saltoPrevio = false;
    this.dobleSalto = i >= 1; // habilidad que se gana en la etapa II
    this.planear = i >= 2;    // habilidad que se gana en la etapa III
    this.planeando = false;
    this.avisoMostrado = false;
    this.reloj = 0;
    this.saltosAire = 0;
    this.enSueloPrevio = true;
    this.vyPrevia = 0;
    this.estado = '';
    this.recogidos = 0;

    // --- Colisiones: cuadrícula invisible (el dibujo lo pone el terreno ilustrado) ---
    const datos = Array.from({ length: FILAS }, () => Array(def.ancho).fill(-1));
    const solido = (c, r) => { if (c >= 0 && c < def.ancho && r >= 0 && r < FILAS) datos[r][c] = 1; };
    def.suelo.forEach(([a, b]) => { for (let c = a; c < b; c++) { solido(c, 15); solido(c, 16); } });
    def.bloques.forEach(([c0, r0, w]) => {
      for (let c = c0; c < c0 + w; c++) for (let r = r0; r < 15; r++) solido(c, r);
    });
    def.plataformas.forEach(([c0, r, w]) => {
      for (let c = c0; c < c0 + w; c++) if (datos[r][c] === -1) datos[r][c] = 2;
    });
    const mapa = this.make.tilemap({ data: datos, tileWidth: TILE, tileHeight: TILE });
    const tileset = mapa.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0);
    this.capa = mapa.createLayer(0, tileset, 0, 0).setVisible(false);
    this.capa.setCollision([1, 2]);
    this.capa.forEachTile((t) => { if (t.index === 2) t.setCollision(false, false, true, false); });

    // --- Objetos ---
    const quietos = { allowGravity: false, immovable: true };
    this.luces = this.physics.add.group(quietos);
    this.recuerdos = this.physics.add.group(quietos);
    this.zarzas = this.physics.add.group(quietos);
    this.faroles = this.physics.add.group(quietos);
    this.moviles = this.physics.add.group(quietos);
    this.sombras = this.physics.add.group({ allowGravity: false });

    let inicio = { x: 80, y: 600 };
    def.obj.forEach(([tipo, c, r]) => {
      const x = c * TILE + TILE / 2;
      const y = (r + 1) * TILE; // base de la celda
      if (tipo === 'S') {
        inicio = { x, y };
      } else if (tipo === 'h') {
        const l = this.luces.create(x, y - 24, 'luz').setDepth(15).setBlendMode('ADD');
        this.tweens.add({ targets: l, y: y - 30, scale: 1.15, duration: 900 + Math.random() * 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      } else if (tipo === 'm') {
        const m = this.recuerdos.create(x, y - 30, 'pagina').setDepth(15);
        m.body.setSize(30, 220, false).setOffset(7, -170); // se toma aunque pase saltando
        this.tweens.add({ targets: m, y: y - 38, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.tweens.add({ targets: m, angle: { from: -7, to: 7 }, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      } else if (tipo === 'x') {
        const z = this.zarzas.create(x, y - 18, 'zarza').setDepth(15);
        z.body.setSize(44, 20).setOffset(10, 18);
      } else if (tipo === 'e') {
        const e = this.sombras.create(x, y - 34, 'sombra').setDepth(16);
        e.body.setSize(32, 30).setOffset(19, 10);
        e.base = { x, y: y - 34 };
        e.dir = -1;
        e.fase = Math.random() * 6;
      } else if (tipo === 'f') {
        const f = this.faroles.create(x, y - 46, 'faro').setDepth(14);
        // Zona alta: se enciende aunque ella pase saltando por encima
        f.body.setSize(40, 280, false).setOffset(-2, -188);
      } else if (tipo === 'c') {
        this.brilloCofre = this.add.image(x, y - 38, 'brillo').setTint(ORO).setScale(1.8).setBlendMode('ADD').setDepth(14).setAlpha(0.75);
        this.tweens.add({ targets: this.brilloCofre, scale: 2.3, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.cofre = this.physics.add.image(x, y - 38, 'cofre_nivel').setDepth(15);
        this.cofre.body.allowGravity = false;
        // Zona alta: cuenta aunque llegue cayendo desde una plataforma
        this.cofre.body.setSize(100, 420, false).setOffset(0, -344);
        this.cofre.setImmovable(true);
      }
    });
    // Los recuerdos se muestran en el orden en que aparecen en el camino
    const totalRecuerdos = CFG.etapas[i].recuerdos.length;
    this.recuerdos.getChildren().slice().sort((a, b) => a.x - b.x).forEach((m, k) => {
      if (k >= totalRecuerdos) { this.tweens.killTweensOf(m); m.destroy(); } else m.idx = k;
    });

    def.moviles.forEach(([c, r, rango]) => {
      const m = this.moviles.create(c * TILE + TILE, r * TILE + 13, 'losa_' + i).setDepth(13);
      m.body.setSize(80, 18).setOffset(0, 0);
      m.body.checkCollision.down = false;
      m.body.checkCollision.left = false;
      m.body.checkCollision.right = false;
      m.min = m.x;
      m.max = m.x + rango * TILE;
      m.setVelocityX(55);
    });

    // Plataformas de luz: se encienden y se apagan en ciclo (se atraviesan desde abajo)
    this.lucesPlat = this.physics.add.group(quietos);
    (def.luz || []).forEach(([c, r, desfase]) => {
      const p = this.lucesPlat.create(c * TILE + TILE, r * TILE + 13, 'losa_luz').setDepth(13);
      p.halo = this.add.image(p.x, p.y, 'brillo').setTint(ORO).setScale(1.5, 0.8).setBlendMode('ADD').setDepth(12);
      p.body.setSize(80, 18).setOffset(4, 2);
      p.body.checkCollision.down = false;
      p.body.checkCollision.left = false;
      p.body.checkCollision.right = false;
      p.desfase = desfase;
      p.solida = true;
    });

    // --- Angie ---
    this.jug = this.physics.add.sprite(inicio.x, inicio.y - 40, 'angie', 0).setScale(ESCALA_NIVEL).setDepth(20);
    this.jug.body.setSize(48, 130).setOffset(56, 54);
    this.jug.setCollideWorldBounds(true);
    this.control = { x: inicio.x, y: inicio.y - 40 };

    this.physics.world.setBounds(0, 0, anchoPx, H + 400);
    this.physics.world.setBoundsCollision(true, true, false, false);
    this.physics.add.collider(this.jug, this.capa);
    this.physics.add.collider(this.jug, this.moviles);
    this.physics.add.collider(this.jug, this.lucesPlat);
    this.physics.add.overlap(this.jug, this.sombras, (j, e) => this.herir(e.x));
    this.physics.add.overlap(this.jug, this.zarzas, (j, z) => this.herir(z.x));
    this.physics.add.overlap(this.jug, this.luces, (j, l) => this.tomarLuz(l));
    this.physics.add.overlap(this.jug, this.recuerdos, (j, m) => this.tomarRecuerdo(m));
    this.physics.add.overlap(this.jug, this.faroles, (j, f) => this.encenderFarol(f));
    if (this.cofre) this.physics.add.overlap(this.jug, this.cofre, () => this.llegarCofre());

    const cam = this.cameras.main;
    cam.setBounds(0, 0, anchoPx, H);
    cam.startFollow(this.jug, true, 0.12, 0.12);
    cam.setFollowOffset(-Math.min(160, W * 0.12), 0);

    this.petalos = this.add.particles(0, 0, 'petalo', {
      speed: { min: 60, max: 150 }, angle: { min: 20, max: 160 }, lifespan: 700,
      rotate: { start: 0, end: 360 }, scale: { start: 1.1, end: 0.3 }, alpha: { start: 1, end: 0 }, emitting: false,
    }).setDepth(19);
    this.polvo = this.add.particles(0, 0, 'polvo', {
      speedX: { min: -60, max: 60 }, speedY: { min: -30, max: -5 }, lifespan: 380,
      scale: { start: 1, end: 0.2 }, alpha: { start: 0.8, end: 0 }, emitting: false,
    }).setDepth(19);
    particulasEtapa(this, i).setScrollFactor(0).setDepth(30);

    this.crearControles();
    this.crearInterfaz();
    this.crearTeclado();
    this.cartelInicial(i);

    // --- Escenario ilustrado: se dibuja al entrar y se libera al salir ---
    this.physics.pause();
    const sesion = (this.sesion = (this.sesion || 0) + 1);
    const piezas = Object.entries(Arte.nivelArte(i, def));
    Promise.all(piezas.map(([clave, arte]) => {
      if (this.textures.exists(clave)) this.textures.remove(clave);
      return svgATextura(this, clave, arte);
    })).then(() => {
      if (sesion !== this.sesion || !this.sys.isActive()) return;
      arteEtapaCargada = i;
      this.pintarEscenario(i);
      this.physics.resume();
      this.listo = true;
      // Atajo de prueba: ?diario muestra la primera página del diario
      if (new URLSearchParams(location.search).has('diario')) this.mostrarRecuerdo(0);
    });
  }

  /* ---------- Escenario por capas ---------- */
  pintarEscenario(i) {
    fondoDegradado(this, Arte.CIELOS[i]).setScrollFactor(0).setDepth(-10);
    const astro = [[0.72, 300], [0.25, 300], [0.7, 360], [0.78, 150]][i];
    this.add.image(W * astro[0], astro[1], 'n_astro').setScrollFactor(0.02).setDepth(-9);

    // Mosaicos de paralaje: se repiten hasta cubrir todo el recorrido de la cámara
    const capa = (clave, factor, prof) => {
      const ancho = this.textures.get(clave).getSourceImage().width;
      const necesario = (this.anchoPx - W) * factor + W;
      for (let x = 0; x < necesario + ancho; x += ancho) {
        this.add.image(x, 0, clave).setOrigin(0).setScrollFactor(factor).setDepth(prof);
      }
    };
    capa('n_lejos', 0.12, -8);
    capa('n_medio', 0.3, -7);
    capa('n_campo', 0.55, -6);
    this.add.image(0, Arte.TERRENO_Y, 'n_terreno').setOrigin(0).setDepth(-5);

    // Primer plano oscuro (hierba y ramas) que pasa más rápido que la cámara
    const factor = 1.25;
    const fin = this.anchoPx * factor + W;
    let k = 0;
    for (let x = 260; x < fin; x += 520 + (k % 3) * 90, k++) {
      this.add.image(x, H + 50, 'mata').setOrigin(0.5, 1).setScale(0.75 + (k % 2) * 0.2).setFlipX(k % 2 === 1)
        .setScrollFactor(factor).setDepth(35);
    }
    this.add.image(W / 2, H / 2, 'vineta').setDisplaySize(W, H).setScrollFactor(0).setDepth(36);
  }

  // Botones translúcidos de tinta (solo en pantallas táctiles)
  crearControles() {
    this.botones = null;
    if (!TACTIL) return;
    const crear = (x, y, r, dibujo) => {
      const c = this.add.container(x, y).setScrollFactor(0).setDepth(41);
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.25).fillCircle(0, 4, r);
      g.fillStyle(0x140C12, 0.38).fillCircle(0, 0, r);
      g.lineStyle(1.6, CREMA, 0.7).strokeCircle(0, 0, r);
      g.lineStyle(1, CREMA, 0.2).strokeCircle(0, 0, r - 6);
      g.fillStyle(CREMA, 0.92);
      dibujo(g);
      c.add(g);
      c.presionado = false;
      return c;
    };
    this.botones = {
      izq: crear(62, 768, 38, (g) => g.fillTriangle(-12, 0, 8, -12, 8, 12)),
      der: crear(164, 768, 38, (g) => g.fillTriangle(12, 0, -8, -12, -8, 12)),
      salto: crear(W - 70, 760, 48, (g) => {
        g.fillTriangle(0, -20, -18, 2, 18, 2);
        g.fillRect(-8, 0, 16, 16);
      }),
    };
  }

  crearInterfaz() {
    // Botón para volver al mapa (y tecla Esc)
    disco(this, 34, 42, 22).setScrollFactor(0).setDepth(60);
    this.add.image(34, 42, 'ico_casa').setScale(0.5).setScrollFactor(0).setDepth(60);
    const zona = this.add.zone(34, 42, 56, 56).setScrollFactor(0).setInteractive({ useHandCursor: true });
    zona.on('pointerup', () => this.volverAlMapa());

    // Contador de páginas del diario
    const fondo = this.add.graphics().setScrollFactor(0).setDepth(60);
    fondo.fillStyle(0x140C12, 0.4).fillRoundedRect(12, 76, 86, 32, 16);
    fondo.lineStyle(1.5, CREMA, 0.7).strokeRoundedRect(12, 76, 86, 32, 16);
    this.add.image(32, 92, 'pagina').setScale(0.55).setScrollFactor(0).setDepth(61);
    this.contador = texto(this, 50, 92, `0/${this.recuerdos.getLength()}`, 19, hex(CREMA),
      { serif: true, peso: '700', origenX: 0 }).setScrollFactor(0).setDepth(61);
  }

  crearTeclado() {
    const kb = this.input.keyboard;
    this.teclas = kb ? kb.addKeys({ izq: 'LEFT', der: 'RIGHT', arriba: 'UP', a: 'A', d: 'D', w: 'W', espacio: 'SPACE' }) : null;
    if (kb) kb.on('keydown-ESC', () => this.volverAlMapa());
  }

  volverAlMapa() {
    if (this.pausa || this.ganado) return;
    Sonido.sfx('tap');
    irA(this, 'Mapa');
  }

  cartelInicial(i) {
    const tinta = i === 3 ? hex(CREMA) : hex(TINTA);
    const sombra = i === 3 ? '#000000' : '#FFF6E2';
    const n = CFG.etapas[i].recuerdos.length;
    const objetivo = n === 1 ? 'Encuentra la página del diario y llega al cofre' : `Encuentra las ${n} páginas del diario y llega al cofre`;
    const lineas = [
      texto(this, W / 2, 200, `${ROMANOS[i]} · ${CFG.etapas[i].titulo}`, 36, tinta, { serif: true, peso: '700', sombra, desenfoque: 12 }),
      texto(this, W / 2, 248, CFG.etapas[i].frase, 19, tinta, { serif: true, peso: 'italic 600', ancho: 340, sombra, desenfoque: 10 }),
      texto(this, W / 2, 300, TACTIL ? objetivo : objetivo + '\n← →  o  A D para moverte · Espacio para saltar', 15, tinta,
      { peso: '700', sombra, desenfoque: 8, interlineado: 4, ancho: 340 }),
    ];
    const novedad = [null,
      'Nueva habilidad: salto de pétalo\nEn el aire, salta otra vez',
      TACTIL ? 'Nueva habilidad: planear con la capa\nMantén el botón de salto mientras caes'
        : 'Nueva habilidad: planear con la capa\nMantén el salto mientras caes',
      'Las plataformas de luz se apagan un momento:\nespera a que brillen y cruza'][i];
    if (novedad) {
      lineas.push(texto(this, W / 2, 372, novedad, 18, tinta,
        { serif: true, peso: 'italic 700', sombra, desenfoque: 10, interlineado: 2, ancho: 360 }));
    }
    lineas.forEach((t) => t.setScrollFactor(0).setDepth(70).setAlpha(0));
    this.tweens.add({ targets: lineas, alpha: 1, duration: 500, delay: 300 });
    this.tweens.add({ targets: lineas, alpha: 0, duration: 600, delay: 3800, onComplete: () => lineas.forEach((t) => t.destroy()) });
  }

  /* ---------- Bucle ---------- */
  leerControles() {
    let izq = false;
    let der = false;
    let salto = false;
    if (!this.pausa) {
      if (this.botones) {
        for (const ptr of this.input.manager.pointers) {
          if (!ptr || !ptr.isDown || ptr.y < CONTROLES_Y) continue;
          if (ptr.x < 113) izq = true;
          else if (ptr.x < 235) der = true;
          else if (ptr.x > W - 170) salto = true;
        }
      }
      const k = this.teclas;
      if (k) {
        izq = izq || k.izq.isDown || k.a.isDown;
        der = der || k.der.isDown || k.d.isDown;
        salto = salto || k.arriba.isDown || k.w.isDown || k.espacio.isDown;
      }
    }
    if (this.botones) {
      const pintar = (b, on) => {
        if (b.presionado === on) return;
        b.presionado = on;
        b.setScale(on ? 0.9 : 1).setAlpha(on ? 0.75 : 1);
      };
      pintar(this.botones.izq, izq);
      pintar(this.botones.der, der);
      pintar(this.botones.salto, salto);
    }
    return { izq, der, salto };
  }

  update(time, delta) {
    if (!this.listo) return;
    const dt = Math.min(delta, 50);
    const ctl = this.leerControles();

    // Plataformas móviles: van y vienen y llevan consigo a Angie si está parada encima
    const bj = this.jug.body;
    this.moviles.getChildren().forEach((m) => {
      if (m.x >= m.max) m.setVelocityX(-55);
      else if (m.x <= m.min) m.setVelocityX(55);
      const dx = m.x - (m.xPrevia ?? m.x);
      m.xPrevia = m.x;
      const encima = Math.abs(bj.bottom - m.body.top) <= 4 && bj.right > m.body.left && bj.left < m.body.right && bj.velocity.y >= 0;
      if (dx && encima && !this.pausa && !this.cayendo) this.jug.x += dx;
    });
    // Sombras del olvido: flotan y patrullan; la luz del farol las adormece (van lentas y se desvanecen)
    this.sombras.getChildren().forEach((e) => {
      const cerca = Math.abs(this.jug.x - e.x) < 130 && Math.abs(this.jug.y - e.y) < 130;
      if (e.x < e.base.x - 90) e.dir = 1;
      else if (e.x > e.base.x + 90) e.dir = -1;
      e.fase += dt * 0.003;
      if (!this.pausa) e.setVelocity(e.dir * (cerca ? 16 : 46), Math.cos(e.fase) * 14);
      e.setFlipX(e.dir > 0);
      e.setAlpha(e.alpha + ((cerca ? 0.55 : 0.95) - e.alpha) * 0.1);
    });
    this.cicloLuces(dt);

    if (this.pausa || this.ganado || this.cayendo) return;

    const b = this.jug.body;
    const enSuelo = b.blocked.down || b.touching.down;
    this.coyote = enSuelo ? 110 : this.coyote - dt;
    this.buffer = ctl.salto && !this.saltoPrevio ? 140 : this.buffer - dt;
    this.invuln -= dt;
    this.bloqueo -= dt;

    if (this.bloqueo <= 0) {
      const dir = (ctl.der ? 1 : 0) - (ctl.izq ? 1 : 0);
      b.setVelocityX(Phaser.Math.Linear(b.velocity.x, dir * 215, enSuelo ? 0.3 : 0.15));
      if (dir) this.jug.setFlipX(dir < 0);
    }
    if (enSuelo) this.saltosAire = 0;
    if (this.buffer > 0 && this.coyote > 0) {
      b.setVelocityY(-660);
      this.buffer = 0;
      this.coyote = 0;
      Sonido.sfx('salto');
    } else if (this.dobleSalto && ctl.salto && !this.saltoPrevio && !enSuelo && this.coyote <= 0 && this.saltosAire === 0) {
      // Salto de pétalo: un segundo salto en el aire (desde la etapa II)
      b.setVelocityY(-580);
      this.buffer = 0;
      this.saltosAire = 1;
      Sonido.sfx('salto2');
      this.petalos.explode(12, this.jug.x, b.bottom - 6);
      this.estado = '';
    }
    // Salto más corto si se suelta el botón antes
    if (!ctl.salto && this.saltoPrevio && b.velocity.y < -200) b.setVelocityY(b.velocity.y * 0.45);
    this.saltoPrevio = ctl.salto;

    // Planear con la capa: mantener el salto mientras cae frena la caída (desde la etapa III)
    const planea = this.planear && ctl.salto && !enSuelo && b.velocity.y > 0;
    if (planea && !this.planeando) {
      Sonido.sfx('planear');
      this.petalos.explode(5, this.jug.x, this.jug.y - 20);
    }
    this.planeando = planea;
    b.setMaxVelocityY(planea ? VEL_PLANEO : 10000);

    // Aterrizaje: polvo y cuadro "aplastado"
    if (enSuelo && !this.enSueloPrevio && this.vyPrevia > 260) {
      this.aterrizaje = 90;
      this.estado = 'aterriza';
      this.jug.stop();
      this.jug.setFrame(10);
      this.polvo.explode(6, this.jug.x, b.bottom);
    }
    this.enSueloPrevio = enSuelo;
    this.vyPrevia = b.velocity.y;

    if (this.aterrizaje > 0) {
      this.aterrizaje -= dt;
    } else {
      const estado = !enSuelo ? (planea ? 'planea' : b.velocity.y < 0 ? 'sube' : 'cae')
        : Math.abs(b.velocity.x) > 25 ? 'camina' : 'quieta';
      if (estado !== this.estado) {
        this.estado = estado;
        if (estado === 'camina') this.jug.play('angie_correr', true);
        else if (estado === 'quieta') this.jug.play('angie_quieta', true);
        else {
          this.jug.stop();
          this.jug.setFrame({ sube: 8, cae: 9, planea: 13 }[estado]);
        }
      }
    }

    if (this.jug.y > H + 60) this.reaparecer();
  }

  /* ---------- Eventos ---------- */
  // Un golpe solo empuja y hace parpadear: no hay vidas ni castigo.
  herir(desdeX) {
    if (this.invuln > 0 || this.ganado || this.pausa) return;
    this.invuln = 1300;
    this.bloqueo = 280;
    const dir = this.jug.x < desdeX ? -1 : 1;
    this.jug.body.setVelocity(dir * 260, -380);
    Sonido.sfx('error');
    this.cameras.main.shake(120, 0.004);
    this.tweens.add({ targets: this.jug, alpha: 0.3, duration: 100, yoyo: true, repeat: 5, onComplete: () => this.jug.setAlpha(1) });
  }

  tomarLuz(l) {
    l.disableBody(true, true);
    Sonido.sfx('corazon');
    const ch = this.add.particles(l.x, l.y, 'chispa', {
      speed: { min: 40, max: 110 }, lifespan: 420, scale: { start: 0.8, end: 0 }, emitting: false, blendMode: 'ADD',
    }).setDepth(17);
    ch.explode(7);
    this.time.delayedCall(500, () => ch.destroy());
  }

  tomarRecuerdo(m) {
    if (this.pausa) return;
    m.disableBody(true, true);
    this.recogidos++;
    this.contador.setText(`${this.recogidos}/${this.recuerdos.getLength()}`);
    Sonido.sfx('recoger');
    this.mostrarRecuerdo(m.idx);
  }

  // Página del diario de viaje: foto pegada con cinta, texto a mano y fecha.
  mostrarRecuerdo(idx) {
    const r = CFG.etapas[this.i].recuerdos[idx];
    if (!r) return;
    this.pausa = true;
    this.physics.pause();
    this.jug.anims.pause();

    const velo = this.add.rectangle(W / 2, H / 2, W, H, 0x0A0608, 0.6).setScrollFactor(0).setDepth(80).setAlpha(0);
    const total = CFG.etapas[this.i].recuerdos.length;
    const pie = [r.lugar, r.fecha].filter(Boolean).join(' · ');
    const hoja = paginaRecuerdo(this, W / 2, 400, { foto: r.foto, titulo: r.titulo, texto: r.texto, pie, contador: `${idx + 1} / ${total}` }, PALETAS[this.i])
      .setScrollFactor(0).setDepth(81);
    hoja.setScale(0.05, 1).setAngle(-6);
    const sigue = texto(this, W / 2, 690, TACTIL ? 'Toca para seguir' : 'Clic o Espacio para seguir', 18, hex(CREMA))
      .setScrollFactor(0).setDepth(81).setAlpha(0);

    if (SIN_FUNDIDO) {
      velo.setAlpha(1);
      hoja.setScale(1).setAngle(-2);
      sigue.setAlpha(1);
    } else {
      this.tweens.add({ targets: velo, alpha: 1, duration: 250 });
      this.tweens.add({ targets: hoja, scaleX: 1, angle: -2, duration: 480, ease: 'Back.easeOut' });
      this.tweens.add({ targets: sigue, alpha: 1, duration: 300, delay: 700 });
    }

    this.time.delayedCall(600, () => {
      let cerrado = false;
      const cerrar = () => {
        if (cerrado) return;
        cerrado = true;
        this.input.off('pointerdown', cerrar);
        if (this.input.keyboard) this.input.keyboard.off('keydown', cerrar);
        Sonido.sfx('tap');
        this.tweens.add({
          targets: hoja, scaleX: 0.05, angle: 4, duration: 260, ease: 'Sine.easeIn',
        });
        this.tweens.add({
          targets: [velo, sigue], alpha: 0, duration: 260,
          onComplete: () => {
            velo.destroy();
            hoja.destroy();
            sigue.destroy();
            this.physics.resume();
            this.jug.anims.resume();
            this.pausa = false;
            this.saltoPrevio = true; // evita un salto accidental al cerrar
          },
        });
      };
      this.input.on('pointerdown', cerrar);
      if (this.input.keyboard) this.input.keyboard.on('keydown', cerrar);
    });
  }

  // Plataformas de luz: encendidas 2,4 s (las últimas 0,6 s parpadean) y apagadas 1,2 s.
  cicloLuces(dt) {
    if (!this.pausa) this.reloj += dt;
    const bj = this.jug.body;
    this.lucesPlat.getChildren().forEach((p) => {
      const t = ((this.reloj / CICLO_LUZ + p.desfase) % 1) * CICLO_LUZ;
      let solida = t < 2400;
      if (solida && !p.solida) {
        // No se enciende con Angie atravesándola: espera a que salga
        const pb = p.body;
        const dentro = bj.right > pb.left && bj.left < pb.right && bj.bottom > pb.top + 2 && bj.top < pb.bottom;
        if (dentro) solida = false;
      }
      if (solida !== p.solida) {
        p.solida = solida;
        p.body.enable = solida;
        if (solida) this.tweens.add({ targets: p, scaleX: { from: 0.6, to: 1 }, duration: 200, ease: 'Back.easeOut' });
      }
      const alfa = !solida ? 0.15 : t > 1800 ? (Math.floor(t / 90) % 2 ? 0.4 : 1) : 1;
      p.setAlpha(alfa);
      p.halo.setAlpha(alfa * 0.9);
    });
  }

  // Farol de piedra: punto de control
  encenderFarol(f) {
    if (f.encendido) return;
    f.encendido = true;
    const def = NIVELES[this.i];
    if (def.avisoFarol && !this.avisoMostrado) {
      this.avisoMostrado = true;
      aviso(this, W / 2, 250, def.avisoFarol, { duracion: 3600, tam: 18 });
    }
    f.setTexture('faro_on');
    this.control = { x: f.x, y: f.y };
    Sonido.sfx('bandera');
    const brillo = this.add.image(f.x, f.y - 24, 'brillo').setTint(ORO).setScale(0.3).setBlendMode('ADD').setDepth(13);
    this.tweens.add({ targets: brillo, scale: 1.4, duration: 400, ease: 'Back.easeOut' });
    this.tweens.add({ targets: brillo, alpha: 0.55, duration: 1200, yoyo: true, repeat: -1, delay: 400 });
  }

  reaparecer() {
    this.cayendo = true;
    this.jug.body.setVelocity(0, 0);
    this.jug.setVisible(false);
    Sonido.sfx('error');
    this.time.delayedCall(450, () => {
      this.jug.body.reset(this.control.x, this.control.y);
      this.jug.setVisible(true).setAlpha(1);
      this.invuln = 1000;
      this.cayendo = false;
      aviso(this, W / 2, 300, Phaser.Utils.Array.GetRandom(FRASES_CAIDA));
    });
  }

  llegarCofre() {
    if (this.ganado || this.pausa) return;
    this.ganado = true;
    this.jug.body.setVelocity(0, this.jug.body.velocity.y);
    this.jug.stop();
    this.jug.setFrame(11);
    this.tweens.add({ targets: this.cofre, scale: 1.15, duration: 160, yoyo: true, repeat: 2 });
    this.tweens.add({ targets: this.brilloCofre, scale: 3.4, alpha: 1, duration: 500 });
    aviso(this, W / 2, 260, '¡Encontraste el cofre!', { duracion: 1400 });

    // El cofre guarda el minijuego de la etapa; la llave se gana al superarlo.
    if (this.sys.game.scene.keys['Mini' + (this.i + 1)]) {
      this.time.delayedCall(1300, () => irA(this, 'Mini' + (this.i + 1)));
      return;
    }
    this.time.delayedCall(900, () => {
      Guardado.darLlave(this.i);
      const cam = this.cameras.main;
      hud(this).volarLlave(this.i, this.cofre.x - cam.scrollX, this.cofre.y - 50, () => irA(this, 'Mapa'));
    });
  }
}

/* =====================================================================
 *  Minijuegos (dentro de los cofres de cada etapa)
 * ===================================================================== */
let arteEtapaCargada = -1; // etapa cuyas texturas n_* están en memoria

// Fondo estático de la etapa (reutiliza el arte del nivel recién jugado o lo genera).
function fondoEtapa(escena, i) {
  const pintar = () => {
    fondoDegradado(escena, Arte.CIELOS[i]).setDepth(-10);
    const astro = [[0.72, 300], [0.25, 300], [0.7, 360], [0.78, 150]][i];
    escena.add.image(W * astro[0], astro[1], 'n_astro').setDepth(-9);
    const n = Math.ceil(W / 1024) + 1;
    ['n_lejos', 'n_medio', 'n_campo'].forEach((clave, j) => {
      for (let k = 0; k < n; k++) escena.add.image(W / 2 - (n * 1024) / 2 + k * 1024, 0, clave).setOrigin(0).setDepth(-8 + j);
    });
    const suelo = escena.add.graphics().setDepth(-4);
    suelo.fillGradientStyle(0x2A1B23, 0x2A1B23, 0x0E080C, 0x0E080C, 0.92).fillRect(0, 612, W, H - 612);
    suelo.lineStyle(2, CREMA, 0.35).lineBetween(0, 612, W, 612);
    escena.add.image(W / 2, H / 2, 'vineta').setDisplaySize(W, H).setDepth(-3);
  };
  if (arteEtapaCargada === i && escena.textures.exists('n_lejos')) {
    pintar();
    return Promise.resolve();
  }
  const piezas = Object.entries(Arte.nivelArte(i, NIVELES[i])).filter(([k]) => k !== 'n_terreno');
  return Promise.all(piezas.map(([clave, arte]) => {
    if (escena.textures.exists(clave)) escena.textures.remove(clave);
    return svgATextura(escena, clave, arte);
  })).then(() => {
    arteEtapaCargada = i;
    if (escena.sys.isActive()) pintar();
  });
}

// Tarjeta de papel con título, texto y un botón (para instrucciones, derrota, etc.)
function tarjetaMensaje(escena, titulo, cuerpo, etiqueta, alTocar) {
  // Atajo de prueba: ?auto salta las tarjetas de instrucciones
  if (new URLSearchParams(location.search).has('auto')) {
    escena.time.delayedCall(0, alTocar);
    return () => {};
  }
  const velo = escena.add.rectangle(W / 2, H / 2, W, H, 0x0A0608, 0.55).setDepth(89).setScrollFactor(0);
  const w = Math.min(350, W - 32);
  const cuerpoTxt = texto(escena, 0, 0, cuerpo, 17, hex(TINTA), { ancho: w - 56, interlineado: 5, peso: '600' });
  const h = cuerpoTxt.height + 190;
  const c = escena.add.container(W / 2, 430).setDepth(90).setScrollFactor(0);
  const g = escena.add.graphics();
  g.fillStyle(0x000000, 0.35).fillRoundedRect(-w / 2 + 4, -h / 2 + 8, w, h, 14);
  g.fillStyle(0xFBF3E2, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 14);
  g.lineStyle(2.5, TINTA, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
  g.lineStyle(1.2, 0xD9A23E, 0.8).strokeRoundedRect(-w / 2 + 8, -h / 2 + 8, w - 16, h - 16, 9);
  const tituloTxt = texto(escena, 0, -h / 2 + 52, titulo, 32, hex(TINTA), { serif: true, peso: '700', ancho: w - 40 });
  cuerpoTxt.setY(-h / 2 + 92 + cuerpoTxt.height / 2);
  let hecho = false;
  const cerrar = () => {
    if (hecho) return;
    hecho = true;
    if (escena.input.keyboard) escena.input.keyboard.off('keydown-ENTER', cerrar).off('keydown-SPACE', cerrar);
    escena.tweens.add({
      targets: [c, velo], alpha: 0, duration: 200,
      onComplete: () => { c.destroy(); velo.destroy(); alTocar(); },
    });
  };
  const b = boton(escena, 0, h / 2 - 50, etiqueta, cerrar, { ancho: 210, alto: 56, tam: 26 });
  c.add([g, tituloTxt, cuerpoTxt, b]);
  if (escena.input.keyboard) escena.input.keyboard.on('keydown-ENTER', cerrar).on('keydown-SPACE', cerrar);
  if (!SIN_FUNDIDO) {
    c.setScale(0.85).setAlpha(0);
    velo.setAlpha(0);
    escena.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
    escena.tweens.add({ targets: velo, alpha: 1, duration: 200 });
  }
  return cerrar;
}

// Botón de casa para salir al mapa sin la llave (y tecla Esc)
function botonCasa(escena, puedeSalir) {
  disco(escena, 34, 42, 22).setDepth(60);
  escena.add.image(34, 42, 'ico_casa').setScale(0.5).setDepth(60);
  const salir = () => { if (puedeSalir()) { Sonido.sfx('tap'); irA(escena, 'Mapa'); } };
  escena.add.zone(34, 42, 56, 56).setInteractive({ useHandCursor: true }).on('pointerup', salir);
  if (escena.input.keyboard) escena.input.keyboard.on('keydown-ESC', salir);
}

// Al ganar: la llave sale del centro, vuela al HUD y se vuelve al mapa
function ganarLlave(escena, i, x, y, titulo) {
  Guardado.darLlave(i);
  const t = texto(escena, W / 2, 300, titulo, 44, hex(CREMA), { serif: true, peso: '700', sombra: '#000000', desenfoque: 14 }).setDepth(70).setAlpha(0);
  escena.tweens.add({ targets: t, alpha: 1, y: 280, duration: 500, ease: 'Back.easeOut' });
  escena.time.delayedCall(700, () => hud(escena).volarLlave(i, x, y, () => irA(escena, 'Mapa')));
}

/* ---------- Minijuego 1 · El frasco de los recuerdos ---------- */
const META_FRASCO = 15;
const TIEMPO_FRASCO = 45000;

class Mini1 extends Phaser.Scene {
  constructor() { super('Mini1'); }

  create() {
    entrar(this);
    Musica.tocar('etapa1');
    hud(this).mostrarLlaves(true);
    this.estado = 'intro';
    this.objetos = [];
    fondoEtapa(this, 0);
    particulasEtapa(this, 0).setDepth(5);

    const ancho = Math.min(W, 560);
    this.zona = { x0: W / 2 - ancho / 2 + 46, x1: W / 2 + ancho / 2 - 46 };
    this.brilloFrasco = this.add.image(W / 2, 660, 'brillo').setTint(ORO).setScale(1.6).setAlpha(0.5).setBlendMode('ADD').setDepth(9);
    this.frasco = this.add.image(W / 2, 680, 'frasco').setDepth(10);
    this.objetivoX = W / 2;

    // Marcadores
    const marco = (x, ancho2) => {
      const g = this.add.graphics().setDepth(60);
      g.fillStyle(0x140C12, 0.45).fillRoundedRect(x - ancho2 / 2, 96, ancho2, 44, 22);
      g.lineStyle(1.5, CREMA, 0.7).strokeRoundedRect(x - ancho2 / 2, 96, ancho2, 44, 22);
    };
    marco(W / 2 - 78, 140);
    marco(W / 2 + 78, 140);
    this.add.image(W / 2 - 124, 118, 'petalo_g').setDepth(61);
    this.txtPuntos = texto(this, W / 2 - 70, 118, `0 / ${META_FRASCO}`, 24, hex(CREMA), { serif: true, peso: '700' }).setDepth(61);
    this.barraTiempo = this.add.graphics().setDepth(61);
    this.txtTiempo = texto(this, W / 2 + 92, 118, '45', 24, hex(CREMA), { serif: true, peso: '700' }).setDepth(61);
    texto(this, W / 2, 168, 'El frasco de los recuerdos', 24, hex(TINTA), { serif: true, peso: 'italic 700', sombra: '#FFF6E2', desenfoque: 10 }).setDepth(61);

    botonCasa(this, () => this.estado !== 'fin');

    this.input.on('pointerdown', (p) => { if (this.estado === 'juego') this.objetivoX = p.x; });
    this.input.on('pointermove', (p) => { if (this.estado === 'juego' && (p.isDown || !TACTIL)) this.objetivoX = p.x; });
    this.teclas = this.input.keyboard ? this.input.keyboard.addKeys({ izq: 'LEFT', der: 'RIGHT', a: 'A', d: 'D' }) : null;

    tarjetaMensaje(this, 'El frasco de los recuerdos',
      `Atrapa pétalos (+1) y estrellas fugaces (+2). Las sombras te quitan 2. Junta ${META_FRASCO} en 45 segundos.\n\n` +
      (TACTIL ? 'Arrastra el frasco con el dedo.' : 'Mueve el frasco con el mouse o con ← →.'),
      'Empezar', () => this.iniciar());
  }

  iniciar() {
    this.objetos.forEach((o) => o.destroy());
    this.objetos = [];
    this.puntos = 0;
    this.tiempo = TIEMPO_FRASCO;
    this.proximo = 400;
    this.estado = 'juego';
    this.actualizarMarcadores();
  }

  actualizarMarcadores() {
    this.txtPuntos.setText(`${this.puntos} / ${META_FRASCO}`);
    this.txtTiempo.setText(String(Math.ceil(this.tiempo / 1000)));
    const frac = Math.max(0, this.tiempo / TIEMPO_FRASCO);
    const x = W / 2 + 26;
    this.barraTiempo.clear();
    this.barraTiempo.fillStyle(CREMA, 0.2).fillRoundedRect(x, 129, 98, 4, 2);
    this.barraTiempo.fillStyle(frac < 0.25 ? 0xF2A7B5 : ORO, 1).fillRoundedRect(x, 129, Math.max(4, 98 * frac), 4, 2);
  }

  soltar(avance) {
    const r = Math.random();
    const tipo = r < 0.58 ? 'petalo' : r < 0.71 ? 'estrella' : 'sombra';
    const clave = { petalo: 'petalo_g', estrella: 'fugaz', sombra: 'sombra' }[tipo];
    const x = Phaser.Math.Between(this.zona.x0, this.zona.x1);
    const o = this.add.image(x, -40, clave).setDepth(8);
    o.tipo = tipo;
    o.vel = (150 + 170 * avance) * Phaser.Math.FloatBetween(0.85, 1.15);
    o.giro = tipo === 'petalo' ? Phaser.Math.FloatBetween(-2, 2) : 0;
    o.vaiven = tipo === 'petalo' ? Phaser.Math.FloatBetween(0.6, 1.4) : 0;
    o.x0 = x;
    o.t = Math.random() * 6;
    if (tipo === 'sombra') o.setScale(0.85);
    if (tipo === 'petalo') o.setScale(1.3);
    this.objetos.push(o);
  }

  update(time, delta) {
    if (this.estado !== 'juego') return;
    const dt = Math.min(delta, 50);
    this.tiempo -= dt;
    const avance = 1 - Math.max(0, this.tiempo) / TIEMPO_FRASCO;

    this.proximo -= dt;
    if (this.proximo <= 0) {
      this.soltar(avance);
      this.proximo = (1150 - 500 * avance) * Phaser.Math.FloatBetween(0.8, 1.2);
    }

    // Frasco: sigue al dedo/mouse o a las flechas
    const k = this.teclas;
    if (k) {
      const dir = (k.der.isDown || k.d.isDown ? 1 : 0) - (k.izq.isDown || k.a.isDown ? 1 : 0);
      if (dir) this.objetivoX = this.frasco.x + dir * 40;
    }
    this.objetivoX = Phaser.Math.Clamp(this.objetivoX, this.zona.x0, this.zona.x1);
    this.frasco.x += (this.objetivoX - this.frasco.x) * Math.min(1, dt / 60);
    this.frasco.setAngle((this.objetivoX - this.frasco.x) * 0.08);
    this.brilloFrasco.x = this.frasco.x;

    const boca = this.frasco.y - 46;
    this.objetos = this.objetos.filter((o) => {
      o.t += dt / 1000;
      o.y += (o.vel * dt) / 1000;
      if (o.vaiven) o.x = o.x0 + Math.sin(o.t * 2.2) * 18 * o.vaiven;
      if (o.giro) o.angle += o.giro;
      if (o.y > boca - 12 && o.y < boca + 26 && Math.abs(o.x - this.frasco.x) < 44) {
        this.atrapar(o);
        return false;
      }
      if (o.y > H + 40) { o.destroy(); return false; }
      return true;
    });

    this.actualizarMarcadores();
    if (this.puntos >= META_FRASCO) this.ganar();
    else if (this.tiempo <= 0) this.perder();
  }

  atrapar(o) {
    const valor = { petalo: 1, estrella: 2, sombra: -2 }[o.tipo];
    this.puntos = Math.max(0, this.puntos + valor);
    const x = this.frasco.x;
    const y = this.frasco.y - 70;
    const t = texto(this, x, y, valor > 0 ? `+${valor}` : String(valor), 24, valor > 0 ? hex(ORO) : '#B9A2FF',
      { serif: true, peso: '700', sombra: '#000000' }).setDepth(20);
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 650, onComplete: () => t.destroy() });
    if (valor > 0) {
      Sonido.sfx(o.tipo === 'estrella' ? 'corazon' : 'recoger');
      this.tweens.add({ targets: this.frasco, scaleY: 0.9, scaleX: 1.08, duration: 80, yoyo: true });
      this.tweens.add({ targets: this.brilloFrasco, alpha: 0.9, duration: 120, yoyo: true });
    } else {
      Sonido.sfx('error');
      this.cameras.main.shake(140, 0.005);
    }
    o.destroy();
  }

  ganar() {
    this.estado = 'fin';
    this.objetos.forEach((o) => this.tweens.add({ targets: o, alpha: 0, duration: 300, onComplete: () => o.destroy() }));
    this.objetos = [];
    ganarLlave(this, 0, this.frasco.x, this.frasco.y - 80, '¡Frasco lleno!');
  }

  perder() {
    this.estado = 'pausa';
    this.objetos.forEach((o) => o.destroy());
    this.objetos = [];
    tarjetaMensaje(this, '¡Casi!',
      `Juntaste ${this.puntos} de ${META_FRASCO}. Los recuerdos no se van a ninguna parte: inténtalo otra vez.`,
      'Otra vez', () => this.iniciar());
  }
}

/* ---------- Minijuego 2 · Los naipes del farol (memoria) ---------- */
const MAX_INTENTOS = 20;
const ICONOS_PAREJA = ['corazon', 'llave', 'luz', 'pagina', 'cofre_mapa', 'faro_on'];
const COLORES_PAREJA = [0xF2A7B5, 0xF5C26B, 0xB9A0E6, 0x9ACFB6, 0xF2C6A0, 0x9EC5F2];

class Mini2 extends Phaser.Scene {
  constructor() { super('Mini2'); }

  create() {
    entrar(this);
    Musica.tocar('etapa2');
    hud(this).mostrarLlaves(true);
    this.estado = 'intro';
    this.cartas = [];
    fondoEtapa(this, 1);
    particulasEtapa(this, 1).setDepth(5);

    texto(this, W / 2, 112, 'Los naipes del farol', 28, hex(TINTA), { serif: true, peso: 'italic 700', sombra: '#FFF6E2', desenfoque: 10 }).setDepth(61);
    this.txtIntentos = texto(this, W / 2, 146, '', 17, hex(TINTA), { peso: '700', sombra: '#FFF6E2', desenfoque: 8 }).setDepth(61);
    botonCasa(this, () => this.estado !== 'fin');

    tarjetaMensaje(this, 'Los naipes del farol',
      `Encuentra las 6 parejas de fotos. Tienes ${MAX_INTENTOS} intentos: cada intento es voltear dos naipes.`,
      'Empezar', () => this.iniciar());
  }

  iniciar() {
    this.cartas.forEach((c) => c.destroy());
    this.cartas = [];
    this.intentos = 0;
    this.pares = 0;
    this.primera = null;
    this.bloqueado = false;
    this.estado = 'juego';
    this.actualizarIntentos();

    const cols = W >= 700 ? 4 : 3;
    const filas = 12 / cols;
    const hueco = 12;
    const anchoDisp = Math.min(W - 40, 640);
    const altoDisp = H - 60 - 176;
    const cw = Math.floor(Math.min((anchoDisp - (cols - 1) * hueco) / cols, ((altoDisp - (filas - 1) * hueco) / filas) / 1.32));
    const ch = Math.round(cw * 1.32);
    const x0 = W / 2 - ((cols - 1) * (cw + hueco)) / 2;
    const y0 = 176 + ch / 2 + (altoDisp - (filas * ch + (filas - 1) * hueco)) / 2;

    const mazo = Phaser.Utils.Array.Shuffle([0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5]);
    mazo.forEach((par, n) => {
      const x = x0 + (n % cols) * (cw + hueco);
      const y = y0 + Math.floor(n / cols) * (ch + hueco);
      this.cartas.push(this.crearCarta(x, y, cw, ch, par, n));
    });
  }

  crearCarta(x, y, cw, ch, par, n) {
    const c = this.add.container(x, y).setDepth(10);
    const dorso = this.add.image(0, 0, 'carta_dorso').setDisplaySize(cw, ch);
    const frente = this.add.container(0, 0).setVisible(false);
    frente.add(this.add.image(0, 0, 'carta_frente').setDisplaySize(cw, ch));
    const ruta = CFG.memoria.fotos[par];
    if (ruta && this.textures.exists('foto:' + ruta)) {
      frente.add(foto(this, 0, 0, cw - 18, ch - 18, ruta));
    } else {
      // Sin foto: cada pareja tiene su propio color e ícono para poder jugar igual
      const g = this.add.graphics();
      g.fillStyle(COLORES_PAREJA[par], 0.85).fillRoundedRect(-cw / 2 + 9, -ch / 2 + 9, cw - 18, ch - 18, 6);
      const icono = this.add.image(0, 0, ICONOS_PAREJA[par]);
      icono.setScale(Math.min((cw * 0.55) / icono.width, (ch * 0.5) / icono.height));
      frente.add([g, icono]);
    }
    c.add([dorso, frente]);
    c.dorso = dorso;
    c.frente = frente;
    c.par = par;
    c.boca = false;
    c.hecha = false;
    // Atajo de prueba: ?caras muestra los naipes boca arriba
    if (new URLSearchParams(location.search).has('caras')) { dorso.setVisible(false); frente.setVisible(true); }
    c.setSize(cw, ch).setInteractive({ useHandCursor: true });
    c.on('pointerup', () => this.tocar(c));
    c.on('pointerover', () => { if (!TACTIL && !c.boca) c.dorso.setTint(0xFFF1D6); });
    c.on('pointerout', () => c.dorso.clearTint());
    // Reparto con un pequeño vuelo
    if (!SIN_FUNDIDO) {
      c.setScale(0.2).setAlpha(0);
      this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 300, delay: n * 45, ease: 'Back.easeOut' });
    }
    return c;
  }

  voltear(c, bocaArriba, alTerminar) {
    c.boca = bocaArriba;
    Sonido.sfx('tap');
    this.tweens.add({
      targets: c, scaleX: 0, duration: 110, ease: 'Sine.easeIn',
      onComplete: () => {
        c.dorso.setVisible(!bocaArriba);
        c.frente.setVisible(bocaArriba);
        this.tweens.add({ targets: c, scaleX: 1, duration: 110, ease: 'Sine.easeOut', onComplete: alTerminar });
      },
    });
  }

  actualizarIntentos() {
    this.txtIntentos.setText(`Intentos: ${this.intentos} / ${MAX_INTENTOS}  ·  Parejas: ${this.pares} / 6`);
  }

  tocar(c) {
    if (this.estado !== 'juego' || this.bloqueado || c.boca || c.hecha) return;
    this.voltear(c, true);
    if (!this.primera) {
      this.primera = c;
      return;
    }
    const a = this.primera;
    this.primera = null;
    this.bloqueado = true;
    this.intentos++;
    this.actualizarIntentos();
    this.time.delayedCall(260, () => {
      if (a.par === c.par) {
        a.hecha = true;
        c.hecha = true;
        this.pares++;
        this.actualizarIntentos();
        Sonido.sfx('acierto');
        [a, c].forEach((carta) => {
          const brillo = this.add.image(carta.x, carta.y, 'brillo').setTint(ORO).setScale(0.5).setBlendMode('ADD').setDepth(9);
          this.tweens.add({ targets: brillo, scale: 1.8, alpha: 0, duration: 600, onComplete: () => brillo.destroy() });
          this.tweens.add({ targets: carta, scale: 1.08, duration: 140, yoyo: true });
        });
        this.bloqueado = false;
        if (this.pares === 6) this.ganar();
        else if (this.intentos >= MAX_INTENTOS) this.perder();
      } else {
        Sonido.sfx('error');
        this.tweens.add({ targets: [a, c], angle: { from: -4, to: 4 }, duration: 60, yoyo: true, repeat: 2, onComplete: () => { a.setAngle(0); c.setAngle(0); } });
        this.time.delayedCall(650, () => {
          this.voltear(a, false);
          this.voltear(c, false, () => {
            this.bloqueado = false;
            if (this.intentos >= MAX_INTENTOS) this.perder();
          });
        });
      }
    });
  }

  ganar() {
    this.estado = 'fin';
    ganarLlave(this, 1, W / 2, 470, '¡Todas las parejas!');
  }

  perder() {
    this.estado = 'pausa';
    tarjetaMensaje(this, '¡Casi!',
      `Encontraste ${this.pares} de 6 parejas. Se acabaron los intentos, pero no los recuerdos: volvamos a barajar.`,
      'Otra vez', () => this.iniciar());
  }
}

/* ---------- Minijuego 3 · El tablero del claro (ajedrez, mate en 2) ---------- */
// Reglas mínimas para resaltar jugadas legales y validar la solución (sin enroque ni al paso).
const Ajedrez = {
  leer(fen) {
    return fen.split(' ')[0].split('/').map((fila) => {
      const casillas = [];
      for (const ch of fila) {
        if (/\d/.test(ch)) for (let k = 0; k < +ch; k++) casillas.push(null);
        else casillas.push(ch);
      }
      return casillas;
    });
  },
  blanca: (p) => !!p && p === p.toUpperCase(),
  dentro: (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8,
  uci(m) { return [8 - +m[1], m.charCodeAt(0) - 97, 8 - +m[3], m.charCodeAt(2) - 97]; },
  aUci(r0, c0, r1, c1) { return String.fromCharCode(97 + c0) + (8 - r0) + String.fromCharCode(97 + c1) + (8 - r1); },

  // Casillas a las que llega la pieza de (r, c). Con soloAtaques, los peones solo cuentan en diagonal.
  destinos(t, r, c, soloAtaques = false) {
    const p = t[r][c];
    if (!p) return [];
    const bl = this.blanca(p);
    const tipo = p.toLowerCase();
    const res = [];
    const rival = (r2, c2) => this.dentro(r2, c2) && t[r2][c2] && this.blanca(t[r2][c2]) !== bl;
    const libre = (r2, c2) => this.dentro(r2, c2) && !t[r2][c2];
    const agregar = (r2, c2) => { if (libre(r2, c2) || rival(r2, c2)) res.push([r2, c2]); };
    if (tipo === 'p') {
      const d = bl ? -1 : 1;
      [-1, 1].forEach((dc) => {
        if (soloAtaques ? this.dentro(r + d, c + dc) : rival(r + d, c + dc)) res.push([r + d, c + dc]);
      });
      if (!soloAtaques && libre(r + d, c)) {
        res.push([r + d, c]);
        if (r === (bl ? 6 : 1) && libre(r + 2 * d, c)) res.push([r + 2 * d, c]);
      }
    } else if (tipo === 'n') {
      [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]].forEach(([a, b]) => agregar(r + a, c + b));
    } else if (tipo === 'k') {
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (a || b) agregar(r + a, c + b);
    } else {
      const rectas = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      const diagonales = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
      const dirs = tipo === 'r' ? rectas : tipo === 'b' ? diagonales : rectas.concat(diagonales);
      dirs.forEach(([a, b]) => {
        for (let r2 = r + a, c2 = c + b; this.dentro(r2, c2); r2 += a, c2 += b) {
          if (!t[r2][c2]) { res.push([r2, c2]); continue; }
          if (rival(r2, c2)) res.push([r2, c2]);
          break;
        }
      });
    }
    return res;
  },

  atacada(t, r, c, porBlancas) {
    for (let r0 = 0; r0 < 8; r0++) {
      for (let c0 = 0; c0 < 8; c0++) {
        const p = t[r0][c0];
        if (p && this.blanca(p) === porBlancas && this.destinos(t, r0, c0, true).some(([a, b]) => a === r && b === c)) return true;
      }
    }
    return false;
  },

  enJaque(t, blancas) {
    const rey = blancas ? 'K' : 'k';
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (t[r][c] === rey) return this.atacada(t, r, c, !blancas);
    return false;
  },

  mover(t, r0, c0, r1, c1) {
    const n = t.map((fila) => fila.slice());
    let p = n[r0][c0];
    if (p.toLowerCase() === 'p' && (r1 === 0 || r1 === 7)) p = this.blanca(p) ? 'Q' : 'q'; // coronación
    n[r1][c1] = p;
    n[r0][c0] = null;
    return n;
  },

  legales(t, r, c) {
    const bl = this.blanca(t[r][c]);
    return this.destinos(t, r, c).filter(([r1, c1]) => !this.enJaque(this.mover(t, r, c, r1, c1), bl));
  },

  esMate(t, blancas) {
    if (!this.enJaque(t, blancas)) return false;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = t[r][c];
        if (p && this.blanca(p) === blancas && this.legales(t, r, c).length) return false;
      }
    }
    return true;
  },
};

class Mini3 extends Phaser.Scene {
  constructor() { super('Mini3'); }

  create() {
    entrar(this);
    Musica.tocar('etapa3');
    hud(this).mostrarLlaves(true);
    this.estado = 'intro';
    fondoEtapa(this, 2);
    particulasEtapa(this, 2).setDepth(5);

    texto(this, W / 2, 112, 'El tablero del claro', 28, hex(TINTA), { serif: true, peso: 'italic 700', sombra: '#FFF6E2', desenfoque: 10 }).setDepth(61);
    this.txtEstado = texto(this, W / 2, 146, 'Mate en 2 · juegan las piezas claras', 17, hex(TINTA), { peso: '700', sombra: '#FFF6E2', desenfoque: 8 }).setDepth(61);
    botonCasa(this, () => this.estado !== 'fin');

    // Tablero
    this.lado = Math.min(W - 24, 560);
    this.izq = W / 2 - this.lado / 2;
    this.arriba = 180;
    const tex = Arte.TABLERO;
    const escala = this.lado / (tex.casilla * 8 + tex.borde * 2);
    this.casilla = tex.casilla * escala;
    this.margen = tex.borde * escala;
    this.add.image(W / 2, this.arriba + this.lado / 2, 'tablero').setDisplaySize(this.lado, this.lado).setDepth(8);
    this.marcas = this.add.graphics().setDepth(9);
    this.puntos = this.add.graphics().setDepth(12);
    this.piezas = [];
    this.txtPista = texto(this, W / 2, this.arriba + this.lado + 34, '', 17, hex(CREMA),
      { serif: true, peso: 'italic 700', ancho: Math.min(W - 40, 520), sombra: '#000000', desenfoque: 8 }).setDepth(61);

    this.add.zone(this.izq + this.margen, this.arriba + this.margen, this.casilla * 8, this.casilla * 8)
      .setOrigin(0).setDepth(13).setInteractive({ useHandCursor: true })
      .on('pointerup', (p) => {
        const c = Math.floor((p.x - this.izq - this.margen) / this.casilla);
        const r = Math.floor((p.y - this.arriba - this.margen) / this.casilla);
        if (Ajedrez.dentro(r, c)) this.tocar(r, c);
      });

    this.reiniciar();
    tarjetaMensaje(this, 'El tablero del claro',
      'Juegas con las piezas claras. Da jaque mate en 2 jugadas: toca una pieza para ver a dónde puede ir y luego toca su destino. Las oscuras responden solas.',
      'Empezar', () => { this.estado = 'juego'; });
  }

  centro(r, c) {
    return [this.izq + this.margen + (c + 0.5) * this.casilla, this.arriba + this.margen + (r + 0.5) * this.casilla];
  }

  reiniciar() {
    this.t = Ajedrez.leer(CFG.ajedrez.fen);
    this.paso = 0;
    this.sel = null;
    this.bloqueado = false;
    this.pintarPiezas();
    this.pintarMarcas();
  }

  pintarPiezas() {
    this.piezas.forEach((p) => p.destroy());
    this.piezas = [];
    const escala = (this.casilla * 0.92) / 128;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.t[r][c];
        if (!p) continue;
        const [x, y] = this.centro(r, c);
        const img = this.add.image(x, y, 'pieza_' + (Ajedrez.blanca(p) ? 'w' : 'b') + p.toLowerCase()).setScale(escala).setDepth(11);
        img.casilla = [r, c];
        this.piezas.push(img);
      }
    }
  }

  pintarMarcas() {
    const q = this.casilla;
    this.marcas.clear();
    this.puntos.clear();
    if (!this.sel) return;
    const [r, c] = this.sel;
    const [x, y] = this.centro(r, c);
    this.marcas.fillStyle(ORO, 0.45).fillRect(x - q / 2, y - q / 2, q, q);
    this.marcas.lineStyle(3, ORO, 1).strokeRect(x - q / 2 + 1.5, y - q / 2 + 1.5, q - 3, q - 3);
    this.legales.forEach(([r1, c1]) => {
      const [x1, y1] = this.centro(r1, c1);
      if (this.t[r1][c1]) {
        this.puntos.lineStyle(3.5, ORO, 1).strokeCircle(x1, y1, q * 0.44);
      } else {
        this.puntos.fillStyle(0x140C12, 0.35).fillCircle(x1, y1 + 2, q * 0.15);
        this.puntos.fillStyle(ORO, 1).fillCircle(x1, y1, q * 0.14);
      }
    });
  }

  tocar(r, c) {
    if (this.estado !== 'juego' || this.bloqueado) return;
    const p = this.t[r][c];
    if (this.sel && this.legales.some(([a, b]) => a === r && b === c)) {
      this.jugar(this.sel[0], this.sel[1], r, c);
      return;
    }
    if (p && Ajedrez.blanca(p) && !(this.sel && this.sel[0] === r && this.sel[1] === c)) {
      this.sel = [r, c];
      this.legales = Ajedrez.legales(this.t, r, c);
      Sonido.sfx('tap');
    } else {
      this.sel = null;
    }
    this.pintarMarcas();
  }

  // Desliza la pieza y actualiza el tablero; alTerminar se llama al acabar la animación.
  animar(r0, c0, r1, c1, alTerminar) {
    const img = this.piezas.find((p) => p.casilla[0] === r0 && p.casilla[1] === c0);
    const victima = this.piezas.find((p) => p.casilla[0] === r1 && p.casilla[1] === c1);
    this.t = Ajedrez.mover(this.t, r0, c0, r1, c1);
    const [x, y] = this.centro(r1, c1);
    if (victima) this.tweens.add({ targets: victima, alpha: 0, scale: victima.scale * 0.6, duration: 220 });
    img.setDepth(14);
    this.tweens.add({
      targets: img, x, y, duration: 260, ease: 'Sine.easeInOut',
      onComplete: () => {
        Sonido.sfx('mover');
        this.pintarPiezas();
        alTerminar();
      },
    });
  }

  jugar(r0, c0, r1, c1) {
    const jugada = Ajedrez.aUci(r0, c0, r1, c1);
    const sol = CFG.ajedrez.solucion;
    this.sel = null;
    this.pintarMarcas();
    this.bloqueado = true;
    this.animar(r0, c0, r1, c1, () => {
      const ultima = this.paso + 2 >= sol.length;
      const mate = Ajedrez.esMate(this.t, false);
      if (mate || (!ultima && jugada === sol[this.paso])) {
        if (mate) { this.ganar(); return; }
        // Respuesta automática de las oscuras
        this.time.delayedCall(450, () => {
          const [a, b, c, d] = Ajedrez.uci(sol[this.paso + 1]);
          this.animar(a, b, c, d, () => {
            this.paso += 2;
            this.bloqueado = false;
            this.txtEstado.setText('¡Bien! Ahora da el jaque mate');
          });
        });
        return;
      }
      Sonido.sfx('error');
      this.cameras.main.shake(140, 0.004);
      this.time.delayedCall(500, () => {
        this.estado = 'pausa';
        tarjetaMensaje(this, '¡Casi!', 'Esa jugada no lleva al mate.\n\n' + CFG.ajedrez.pista, 'Otra vez', () => {
          this.reiniciar();
          this.txtEstado.setText('Mate en 2 · juegan las piezas claras');
          this.txtPista.setText(CFG.ajedrez.pista);
          this.estado = 'juego';
        });
      });
    });
  }

  ganar() {
    this.estado = 'fin';
    Sonido.sfx('acierto');
    this.txtEstado.setText('¡Jaque mate!');
    const rey = this.piezas.find((p) => this.t[p.casilla[0]][p.casilla[1]] === 'k');
    if (rey) {
      const brillo = this.add.image(rey.x, rey.y, 'brillo').setTint(0xF2A7B5).setScale(0.6).setBlendMode('ADD').setDepth(10);
      this.tweens.add({ targets: brillo, scale: 1.6, alpha: 0.4, duration: 500, yoyo: true, repeat: 1 });
      this.tweens.add({ targets: rey, angle: 80, alpha: 0.5, duration: 700, delay: 300, ease: 'Sine.easeIn' });
    }
    this.time.delayedCall(900, () => ganarLlave(this, 2, W / 2, this.arriba + this.lado / 2, '¡Jaque mate!'));
  }
}

/* ---------- Minijuego 4 · El vitral de las ruinas (rompecabezas deslizante 3×3) ---------- */
const MEZCLA_VITRAL = 30;

class Mini4 extends Phaser.Scene {
  constructor() { super('Mini4'); }

  create() {
    entrar(this);
    Musica.tocar('etapa4');
    hud(this).mostrarLlaves(true);
    this.estado = 'intro';
    fondoEtapa(this, 3);
    particulasEtapa(this, 3).setDepth(5);

    texto(this, W / 2, 112, 'El vitral de las ruinas', 28, hex(CREMA), { serif: true, peso: 'italic 700', sombra: '#000000', desenfoque: 10 }).setDepth(61);
    this.txtMov = texto(this, W / 2, 146, '', 17, hex(CREMA), { peso: '700', sombra: '#000000', desenfoque: 8 }).setDepth(61);
    botonCasa(this, () => this.estado !== 'fin');

    // Ventana de piedra
    const V = Arte.VITRAL;
    const e = Math.min(1, (W - 24) / V.w, 580 / V.h);
    const arriba = 172;
    this.add.image(W / 2, arriba, 'ventana').setOrigin(0.5, 0).setScale(e).setDepth(8);
    this.lado = V.lado * e;
    this.izq = W / 2 - (V.w * e) / 2 + V.x * e;
    this.arriba = arriba + V.y * e;
    this.T = this.lado / 3;

    // Imagen: la foto (recortada al centro, cuadrada) o el vitral de reemplazo
    const ruta = CFG.rompecabezas.foto;
    if (ruta && this.textures.exists('foto:' + ruta)) {
      const src = this.textures.get('foto:' + ruta).getSourceImage();
      const lado = Math.min(src.width, src.height);
      this.fuente = { clave: 'foto:' + ruta, sx: (src.width - lado) / 2, sy: (src.height - lado) / 2, lado };
    } else {
      this.fuente = { clave: 'vitral', sx: 0, sy: 0, lado: V.lado };
    }

    this.vidrios = [];
    for (let id = 0; id < 9; id++) this.vidrios.push(this.crearVidrio(id));
    this.vidrios[8].setVisible(false); // el hueco

    this.btnVer = boton(this, W / 2, arriba + V.h * e + 46, 'Ver vitral', () => this.verReferencia(),
      { estilo: 'secundario', ancho: 200, alto: 52, tam: 24 }).setDepth(60);

    if (this.input.keyboard) {
      // Las flechas mueven hacia el hueco el vidrio que está del lado opuesto
      [['LEFT', 0, 1], ['RIGHT', 0, -1], ['UP', 1, 0], ['DOWN', -1, 0]].forEach(([tecla, dr, dc]) => {
        this.input.keyboard.on('keydown-' + tecla, () => {
          const h = this.orden.indexOf(8);
          const r = Math.floor(h / 3) + dr;
          const c = (h % 3) + dc;
          if (r >= 0 && r < 3 && c >= 0 && c < 3) this.tocar(this.orden[r * 3 + c]);
        });
      });
    }

    this.mezclar();
    tarjetaMensaje(this, 'El vitral de las ruinas',
      'Los vidrios de la ventana se desordenaron. Toca un vidrio junto al hueco para deslizarlo y recompón la imagen.' +
      (TACTIL ? '' : ' También puedes usar las flechas.') + '\n\n"Ver vitral" te muestra la imagen completa 3 segundos.',
      'Empezar', () => { this.estado = 'juego'; });
  }

  posicion(k) {
    return [this.izq + (k % 3 + 0.5) * this.T, this.arriba + (Math.floor(k / 3) + 0.5) * this.T];
  }

  crearVidrio(id) {
    const T = this.T;
    const f = this.fuente;
    const cw = f.lado / 3;
    const cx = f.sx + (id % 3) * cw;
    const cy = f.sy + Math.floor(id / 3) * cw;
    const s = T / cw;
    const c = this.add.container(0, 0).setDepth(10);
    const img = this.add.image(-T / 2 - cx * s, -T / 2 - cy * s, f.clave).setOrigin(0).setScale(s).setCrop(cx, cy, cw, cw);
    const plomo = this.add.graphics();
    plomo.lineStyle(4, 0x141833, 1).strokeRect(-T / 2, -T / 2, T, T);
    plomo.lineStyle(1.2, ORO, 0.45).strokeRect(-T / 2 + 4, -T / 2 + 4, T - 8, T - 8);
    c.add([img, plomo]);
    c.setSize(T, T).setInteractive({ useHandCursor: true });
    c.on('pointerup', () => this.tocar(id));
    c.id = id;
    return c;
  }

  // Mezcla con movimientos válidos desde la posición resuelta: siempre tiene solución.
  mezclar() {
    do {
      this.orden = [0, 1, 2, 3, 4, 5, 6, 7, 8];
      let previo = -1;
      for (let n = 0; n < MEZCLA_VITRAL; n++) {
        const h = this.orden.indexOf(8);
        const vecinos = this.vecinos(h).filter((k) => k !== previo);
        const k = Phaser.Utils.Array.GetRandom(vecinos);
        [this.orden[h], this.orden[k]] = [this.orden[k], this.orden[h]];
        previo = h;
      }
    } while (this.resuelto());
    this.movimientos = 0;
    this.actualizar();
    this.orden.forEach((id, k) => this.vidrios[id].setPosition(...this.posicion(k)));
  }

  vecinos(k) {
    const r = Math.floor(k / 3);
    const c = k % 3;
    return [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]
      .filter(([a, b]) => a >= 0 && a < 3 && b >= 0 && b < 3).map(([a, b]) => a * 3 + b);
  }

  resuelto() { return this.orden.every((id, k) => id === k); }

  actualizar() { this.txtMov.setText(`Movimientos: ${this.movimientos}`); }

  tocar(id) {
    if (this.estado !== 'juego' || this.viendo) return;
    const k = this.orden.indexOf(id);
    const h = this.orden.indexOf(8);
    if (!this.vecinos(h).includes(k)) {
      this.tweens.add({ targets: this.vidrios[id], angle: { from: -3, to: 3 }, duration: 50, yoyo: true, repeat: 1, onComplete: () => this.vidrios[id].setAngle(0) });
      return;
    }
    [this.orden[h], this.orden[k]] = [this.orden[k], this.orden[h]];
    this.movimientos++;
    this.actualizar();
    Sonido.sfx('mover');
    const [x, y] = this.posicion(h);
    this.tweens.add({ targets: this.vidrios[id], x, y, duration: 130, ease: 'Sine.easeOut' });
    this.vidrios[8].setPosition(...this.posicion(k));
    if (this.resuelto()) this.ganar();
  }

  verReferencia() {
    if (this.estado !== 'juego' || this.viendo) return;
    this.viendo = true;
    const cx = this.izq + this.lado / 2;
    const cy = this.arriba + this.lado / 2;
    const ruta = CFG.rompecabezas.foto;
    const ref = this.fuente.clave === 'vitral'
      ? this.add.image(cx, cy, 'vitral').setDisplaySize(this.lado, this.lado)
      : foto(this, cx, cy, this.lado, this.lado, ruta);
    ref.setDepth(20).setAlpha(0);
    this.tweens.add({ targets: ref, alpha: 1, duration: 200 });
    this.tweens.add({
      targets: ref, alpha: 0, duration: 300, delay: 3000,
      onComplete: () => { ref.destroy(); this.viendo = false; },
    });
  }

  ganar() {
    this.estado = 'fin';
    this.btnVer.setVisible(false);
    const hueco = this.vidrios[8];
    hueco.setVisible(true).setAlpha(0);
    this.tweens.add({ targets: hueco, alpha: 1, duration: 500, delay: 200 });
    const cx = this.izq + this.lado / 2;
    const cy = this.arriba + this.lado / 2;
    // El vitral se ilumina
    const luz = this.add.image(cx, cy, 'brillo').setTint(0xFFE7A8).setScale(1).setAlpha(0).setBlendMode('ADD').setDepth(15);
    this.tweens.add({ targets: luz, scale: this.lado / 40, alpha: 0.85, duration: 900, ease: 'Sine.easeOut' });
    this.tweens.add({ targets: luz, alpha: 0.45, duration: 900, delay: 900, yoyo: true, repeat: -1 });
    Sonido.sfx('acierto');
    this.time.delayedCall(1000, () => ganarLlave(this, 3, cx, cy, '¡El vitral se ilumina!'));
  }
}

/* =====================================================================
 *  Tesoro final: el campo de flores bajo la luna
 *  Cerraduras → trivia → pergamino → "¿Quieres ser mi novia?" → final
 * ===================================================================== */
const INTENTOS_NO_ANTES_DE_ENCOGER = 5;

class Tesoro extends Phaser.Scene {
  constructor() { super('Cofre'); }

  create() {
    entrar(this);
    Musica.tocar('cofre');
    const h = hud(this);
    h.mostrarLlaves(true);
    h.refrescar();
    this.estado = 'llaves';
    const suelo = Arte.SUELO_TESORO;

    this.add.image(W / 2, H / 2, 'tesoro_fondo');
    this.luciernagas = this.add.particles(0, 0, 'luciernaga', {
      x: { min: 0, max: W }, y: { min: 420, max: suelo + 40 }, lifespan: 5000,
      speedY: { min: -18, max: -6 }, speedX: { min: -8, max: 8 }, scale: { min: 0.5, max: 1 },
      alpha: { start: 0, end: 1, onUpdate: (p, k, t) => Math.sin(t * Math.PI) }, frequency: 420, maxAliveParticles: 14,
      blendMode: 'ADD',
    }).setDepth(4);

    // Cofre y Angie
    this.cx = W / 2 + 44;
    this.cofre = this.add.image(this.cx, suelo + 16, 'cofre_grande').setOrigin(0.5, 1).setScale(0.44).setDepth(10);
    this.brilloCofre = this.add.image(this.cx, suelo - 40, 'brillo').setTint(ORO).setScale(1.6).setAlpha(0.35).setBlendMode('ADD').setDepth(9);
    this.heroina = new Heroina(this, W / 2 - 64, suelo + 14, 0.62).setDepth(11);

    // Campo de flores (se abren en ola al decir que sí)
    this.flores = [];
    const n = Math.round(80 * W / 390);
    for (let k = 0; k < n; k++) {
      const x = Phaser.Math.Between(-10, W + 10);
      const y = Phaser.Math.Between(suelo + 4, H - 6);
      const base = 0.35 + ((y - suelo) / (H - suelo)) * 0.45;
      const f = this.add.image(x, y, 'flor_' + (k % 4)).setScale(base * 0.55).setAlpha(0.45).setDepth(y > suelo + 30 ? 12 : 8);
      f.base = base;
      f.dist = Phaser.Math.Distance.Between(x, y, this.cx, suelo);
      this.flores.push(f);
    }
    this.add.image(W / 2, H / 2, 'vineta').setDisplaySize(W, H).setDepth(30);

    const titulo = texto(this, W / 2, 210, 'El tesoro', 52, hex(CREMA), { serif: true, peso: 'italic 700', sombra: '#000000', desenfoque: 14 }).setDepth(40).setAlpha(0);
    this.tweens.add({ targets: titulo, alpha: 1, duration: 900 });
    this.tweens.add({ targets: titulo, alpha: 0, duration: 700, delay: 2600, onComplete: () => titulo.destroy() });

    this.time.delayedCall(1300, () => this.abrirCerraduras());
  }

  /* ---------- 1. Las cuatro cerraduras ---------- */
  abrirCerraduras() {
    const h = hud(this);
    Sonido.sfx('error');
    this.tweens.add({ targets: this.cofre, angle: { from: -4, to: 4 }, duration: 70, yoyo: true, repeat: 5, onComplete: () => this.cofre.setAngle(0) });
    const arriba = this.cofre.y - this.cofre.displayHeight;
    const cerraduras = [0, 1, 2, 3].map((k) => {
      const x = this.cx + (k - 1.5) * 60;
      const y = arriba - 46 - (k === 1 || k === 2 ? 14 : 0);
      const c = this.add.image(x, y, 'cerradura').setScale(0).setDepth(20);
      this.tweens.add({ targets: c, scale: 0.55, duration: 380, delay: 500 + k * 120, ease: 'Back.easeOut' });
      return c;
    });
    [0, 1, 2, 3].forEach((k) => {
      this.time.delayedCall(1500 + k * 750, () => {
        const desde = h.slots[k];
        if (h.llaves[k]) h.llaves[k].setVisible(false);
        h.slots[k].brillo.setVisible(false);
        const llave = this.add.image(desde.x, desde.y, 'llave').setScale(0.3).setAngle(-35).setDepth(21);
        const c = cerraduras[k];
        this.tweens.add({
          targets: llave, x: c.x, y: c.y + 4, scale: 0.42, angle: 0, duration: 650, ease: 'Cubic.easeInOut',
          onComplete: () => {
            Sonido.sfx('acierto');
            c.setTexture('cerradura_abierta');
            this.tweens.add({ targets: c, scale: 0.7, duration: 120, yoyo: true });
            this.tweens.add({ targets: llave, alpha: 0, duration: 300, onComplete: () => llave.destroy() });
            const chispas = this.add.particles(c.x, c.y, 'chispa', {
              speed: { min: 50, max: 140 }, lifespan: 550, scale: { start: 0.9, end: 0 }, emitting: false, blendMode: 'ADD',
            }).setDepth(22);
            chispas.explode(10);
            this.time.delayedCall(700, () => chispas.destroy());
            if (k === 3) {
              this.time.delayedCall(700, () => {
                h.mostrarLlaves(false);
                this.tweens.add({ targets: cerraduras, alpha: 0, y: '-=20', duration: 500, onComplete: () => cerraduras.forEach((x) => x.destroy()) });
                this.time.delayedCall(600, () => this.trivia(0));
              });
            }
          },
        });
      });
    });
  }

  /* ---------- 2. Trivia (cerradura extra) ---------- */
  trivia(idx) {
    const preguntas = CFG.trivia || [];
    if (idx >= preguntas.length) { this.abrirCofre(); return; }
    this.estado = 'trivia';
    const q = preguntas[idx];
    const w = Math.min(360, W - 28);
    const c = this.add.container(W / 2, 360).setDepth(50);
    const cuerpo = texto(this, 0, 0, q.pregunta, 25, hex(TINTA), { serif: true, peso: '700', ancho: w - 48 });
    const altoOp = 56;
    const h = 96 + cuerpo.height + q.opciones.length * (altoOp + 12) + 30;
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.35).fillRoundedRect(-w / 2 + 4, -h / 2 + 8, w, h, 14);
    g.fillStyle(0xFBF3E2, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    g.lineStyle(2.5, TINTA, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
    g.lineStyle(1.2, 0xD9A23E, 0.8).strokeRoundedRect(-w / 2 + 8, -h / 2 + 8, w - 16, h - 16, 9);
    const encabezado = texto(this, 0, -h / 2 + 36, `La última cerradura · ${idx + 1} de ${preguntas.length}`, 15, '#8C6A48', { peso: '800' });
    cuerpo.setY(-h / 2 + 66 + cuerpo.height / 2);
    c.add([g, encabezado, cuerpo]);

    let resuelta = false;
    const opciones = q.opciones.map((op, k) => {
      const y = -h / 2 + 90 + cuerpo.height + k * (altoOp + 12) + altoOp / 2;
      const b = this.add.container(0, y);
      const fondo = this.add.graphics();
      const pintar = (relleno) => {
        fondo.clear();
        fondo.fillStyle(relleno, 1).fillRoundedRect(-(w - 48) / 2, -altoOp / 2, w - 48, altoOp, altoOp / 2);
        fondo.lineStyle(2, TINTA, 1).strokeRoundedRect(-(w - 48) / 2, -altoOp / 2, w - 48, altoOp, altoOp / 2);
      };
      pintar(0xF1E2C4);
      const t = texto(this, 0, -1, op, 20, hex(TINTA), { peso: '700', ancho: w - 80 });
      b.add([fondo, t]);
      b.setSize(w - 48, altoOp).setInteractive({ useHandCursor: true });
      const elegir = () => {
        if (resuelta || this.estado !== 'trivia') return;
        Sonido.iniciar();
        if (k === q.correcta) {
          resuelta = true;
          pintar(ORO);
          Sonido.sfx('acierto');
          this.tweens.add({ targets: b, scale: 1.05, duration: 120, yoyo: true });
          this.time.delayedCall(750, () => {
            if (this.input.keyboard) this.input.keyboard.off('keydown', teclado);
            this.tweens.add({ targets: c, alpha: 0, scale: 0.9, duration: 250, onComplete: () => { c.destroy(); this.trivia(idx + 1); } });
          });
        } else {
          pintar(0xF2C6CF);
          Sonido.sfx('error');
          this.tweens.add({ targets: b, x: { from: -6, to: 6 }, duration: 50, yoyo: true, repeat: 3, onComplete: () => b.setX(0) });
          aviso(this, W / 2, c.y - h / 2 - 30, '¡Casi! Inténtalo otra vez', { duracion: 1400 });
        }
      };
      b.on('pointerup', elegir);
      b.on('pointerover', () => { if (!TACTIL && !resuelta) t.setColor('#B0485F'); });
      b.on('pointerout', () => t.setColor(hex(TINTA)));
      b.elegir = elegir;
      c.add(b);
      return b;
    });
    // Teclas 1, 2, 3 en PC
    const teclado = (ev) => {
      const n = parseInt(ev.key, 10);
      if (n >= 1 && n <= opciones.length) opciones[n - 1].elegir();
    };
    if (this.input.keyboard) this.input.keyboard.on('keydown', teclado);

    c.setScale(0.85).setAlpha(0);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 280, ease: 'Back.easeOut' });
  }

  /* ---------- 3. El cofre se abre y sale el pergamino ---------- */
  abrirCofre() {
    this.estado = 'pergamino';
    const suelo = Arte.SUELO_TESORO;
    this.cofre.setTexture('cofre_abierto');
    Sonido.sfx('llave');
    this.cameras.main.flash(500, 255, 231, 168);
    const tapa = this.cofre.y - this.cofre.displayHeight * 0.6;
    const columna = this.columna = this.add.image(this.cx, tapa, 'columna_luz').setOrigin(0.5, 1).setBlendMode('ADD').setDepth(9).setScale(0.9, 0);
    this.tweens.add({ targets: columna, scaleY: 1, duration: 1100, ease: 'Sine.easeOut' });
    this.tweens.add({ targets: columna, alpha: 0.65, duration: 1600, delay: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: this.brilloCofre, scale: 3, alpha: 0.8, duration: 900 });
    this.add.particles(this.cx, tapa, 'chispa', {
      x: { min: -26, max: 26 }, speedY: { min: -120, max: -50 }, speedX: { min: -14, max: 14 }, lifespan: 2600,
      scale: { start: 0.7, end: 0 }, alpha: { start: 1, end: 0 }, frequency: 120, blendMode: 'ADD',
    }).setDepth(9);
    this.heroina.celebrar();
    this.time.delayedCall(900, () => this.heroina.quieta());

    // El pergamino sube desde el cofre
    this.rollo = this.add.image(this.cx, tapa, 'pergamino_mini').setScale(0.1).setDepth(25);
    this.tweens.add({
      targets: this.rollo, y: suelo - 190, scale: 0.45, duration: 1300, delay: 600, ease: 'Sine.easeOut',
      onComplete: () => this.leerPergamino(),
    });
  }

  leerPergamino() {
    const escala = Math.min(1, (W - 28) / 340, 600 / 470);
    const cy = 400;
    const carta = this.add.container(W / 2, cy).setDepth(50);
    const hoja = this.add.image(0, 0, 'pergamino_carta').setScale(0.5 * escala);
    const anchoTxt = (340 - 110) * escala;
    const txt = texto(this, 0, -470 * escala / 2 + 66 * escala, '', Math.round(20 * Math.max(0.85, escala)), hex(TINTA),
      { serif: true, peso: 'italic 600', ancho: anchoTxt, interlineado: 6, align: 'left', origenX: 0.5, origenY: 0 });
    carta.add([hoja, txt]);
    carta.setScale(0.2).setAlpha(0);
    this.tweens.add({ targets: this.rollo, alpha: 0, duration: 300 });
    this.tweens.add({ targets: carta, scale: 1, alpha: 1, duration: 500, ease: 'Back.easeOut' });

    // Efecto máquina de escribir (un toque lo completa)
    const leyenda = CFG.final.leyenda;
    let n = 0;
    let listo = false;
    const terminar = () => {
      if (listo) return;
      listo = true;
      reloj.remove();
      this.input.off('pointerdown', saltar);
      txt.setText(leyenda);
      const sigue = boton(this, 0, 470 * escala / 2 - 70 * escala, 'Continuar', () => cerrar(), { ancho: 200, alto: 52, tam: 24, teclas: ['ENTER', 'SPACE'] });
      sigue.setScale(escala < 0.9 ? 0.9 : 1);
      carta.add(sigue);
    };
    const reloj = this.time.addEvent({
      delay: 42, repeat: leyenda.length - 1,
      callback: () => {
        n++;
        txt.setText(leyenda.slice(0, n));
        if (n % 3 === 0 && leyenda[n - 1] !== ' ') Sonido.tono(1400 + Math.random() * 300, 0.03, 'triangle', 0.025);
        if (n >= leyenda.length) this.time.delayedCall(300, terminar);
      },
    });
    const saltar = () => { if (n > 4) terminar(); };
    this.time.delayedCall(400, () => { if (!listo) this.input.on('pointerdown', saltar); });

    let cerrada = false;
    const cerrar = () => {
      if (cerrada) return;
      cerrada = true;
      this.tweens.add({
        targets: carta, scale: 0.15, alpha: 0, x: this.cx, y: Arte.SUELO_TESORO - 190, duration: 500, ease: 'Sine.easeIn',
        onComplete: () => {
          carta.destroy();
          this.rollo.setAlpha(1).setScale(0.45);
          this.tweens.add({ targets: this.rollo, y: this.rollo.y - 10, angle: { from: -3, to: 3 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
          this.preguntar();
        },
      });
    };
  }

  /* ---------- 4. La pregunta ---------- */
  preguntar() {
    this.estado = 'pregunta';
    Musica.tocar('propuesta');
    const nombre = texto(this, W / 2, 250, CFG.nombres.ella + ',', 34, hex(ORO), { serif: true, peso: 'italic 600', sombra: '#000000', desenfoque: 12 }).setDepth(40).setAlpha(0);
    const pregunta = texto(this, W / 2, 350, CFG.final.pregunta, W < 500 ? 50 : 60, hex(CREMA),
      { serif: true, peso: '700', ancho: W < 500 ? 300 : 640, interlineado: -6, sombra: '#120A1E', desenfoque: 18 }).setDepth(40).setAlpha(0);
    // La columna de luz se atenúa para que la pregunta se lea bien
    this.tweens.killTweensOf(this.columna);
    this.tweens.add({ targets: this.columna, alpha: 0.3, duration: 1200 });
    this.textosPregunta = [nombre, pregunta];
    this.tweens.add({ targets: nombre, alpha: 1, y: 240, duration: 900 });
    this.tweens.add({ targets: pregunta, alpha: 1, duration: 1400, delay: 900 });

    this.time.delayedCall(2300, () => {
      const ancho = Math.min(170, (W - 60) / 2);
      const y = 784;
      this.botonSi = boton(this, W / 2 - ancho / 2 - 12, y, CFG.final.botonSi, () => this.decirSi(), { ancho, alto: 64, tam: 32 }).setDepth(45);
      this.botonNo = boton(this, W / 2 + ancho / 2 + 12, y, CFG.final.botonNo, () => this.huir(), { estilo: 'secundario', ancho, alto: 64, tam: 32 }).setDepth(45);
      this.intentosNo = 0;
      this.botonNo.on('pointerdown', () => this.huir());
      if (!TACTIL) this.botonNo.on('pointerover', () => this.huir());
      [this.botonSi, this.botonNo].forEach((b, k) => {
        b.setAlpha(0);
        this.tweens.add({ targets: b, alpha: 1, duration: 500, delay: k * 150 });
      });
    });
  }

  // El "No" se escapa; tras 5 intentos se encoge y cambia de texto, y al final se vuelve otro "Sí".
  huir() {
    const no = this.botonNo;
    if (this.estado !== 'pregunta' || !no || no.convertido || no.huyendo) return;
    this.intentosNo++;
    const extra = this.intentosNo - INTENTOS_NO_ANTES_DE_ENCOGER;
    const textos = CFG.final.textosNo || [];
    if (extra > textos.length) {
      this.convertirEnSi();
      return;
    }
    if (extra > 0) {
      no.etiqueta.setText(textos[extra - 1]);
      no.etiqueta.setFontSize(Math.max(16, 30 - extra * 3));
      no.escalaNo = (no.escalaNo || 1) * 0.86;
    }
    const s = no.escalaNo || 1;
    const medio = (no.width * s) / 2 + 16;
    const si = this.botonSi;
    let x;
    let y;
    for (let k = 0; k < 30; k++) {
      x = Phaser.Math.Between(medio, W - medio);
      y = Phaser.Math.Between(140, H - 40);
      const lejosSi = Math.abs(x - si.x) > (si.width + no.width * s) / 2 + 10 || Math.abs(y - si.y) > 70;
      const lejosTexto = y < 190 || y > 470;
      const lejosAhora = Phaser.Math.Distance.Between(x, y, no.x, no.y) > 140;
      if (lejosSi && lejosTexto && lejosAhora) break;
    }
    Sonido.sfx('salto');
    no.huyendo = true;
    this.tweens.add({ targets: no, x, y, scale: s, duration: 170, ease: 'Sine.easeOut', onComplete: () => { no.huyendo = false; } });
  }

  convertirEnSi() {
    const no = this.botonNo;
    no.convertido = true;
    const x = no.x;
    const y = no.y;
    this.tweens.add({
      targets: no, scale: 0, duration: 200, onComplete: () => {
        no.destroy();
        const otro = boton(this, x, y, CFG.final.botonSi, () => this.decirSi(), { ancho: 150, alto: 60, tam: 30 }).setDepth(45).setScale(0);
        this.tweens.add({ targets: otro, scale: 1, duration: 420, ease: 'Back.easeOut' });
        this.botonNo = otro;
        otro.convertido = true;
        Sonido.sfx('corazon');
        aviso(this, x, y - 64, 'Ahora sí 💖', { duracion: 1600 });
      },
    });
  }

  /* ---------- 5. ¡Sí! El campo florece ---------- */
  decirSi() {
    if (this.estado !== 'pregunta') return;
    this.estado = 'si';
    Musica.tocar('final');
    Sonido.sfx('llave');
    [this.botonSi, this.botonNo].forEach((b) => this.tweens.add({ targets: b, alpha: 0, scale: 0.8, duration: 300, onComplete: () => b.destroy() }));
    this.tweens.add({ targets: this.textosPregunta, alpha: 0, duration: 800, delay: 1200 });
    this.heroina.celebrar();
    this.tweens.add({ targets: this.heroina, y: this.heroina.y - 16, duration: 260, yoyo: true, repeat: 3, ease: 'Sine.easeOut' });

    // Ola de flores desde el cofre
    this.flores.forEach((f) => {
      this.tweens.add({ targets: f, scale: f.base * 1.35, alpha: 1, duration: 500, delay: f.dist * 1.6, ease: 'Back.easeOut' });
    });
    for (let k = 0; k < Math.round(50 * W / 390); k++) {
      const x = Phaser.Math.Between(-10, W + 10);
      const y = Phaser.Math.Between(Arte.SUELO_TESORO - 6, H - 4);
      const base = 0.4 + ((y - Arte.SUELO_TESORO) / (H - Arte.SUELO_TESORO)) * 0.5;
      const f = this.add.image(x, y, 'flor_' + (k % 4)).setScale(0).setDepth(12);
      this.tweens.add({ targets: f, scale: base * 1.2, duration: 500, delay: Phaser.Math.Distance.Between(x, y, this.cx, Arte.SUELO_TESORO) * 1.6 + 150, ease: 'Back.easeOut' });
    }
    this.luciernagas.setFrequency(90);
    this.add.particles(0, 0, 'corazon', {
      x: { min: 0, max: W }, y: H + 20, lifespan: 6000, speedY: { min: -120, max: -60 }, speedX: { min: -20, max: 20 },
      scale: { min: 0.35, max: 0.7 }, rotate: { min: -20, max: 20 }, alpha: { start: 1, end: 0 }, frequency: 260, maxAliveParticles: 26,
    }).setDepth(28);

    this.time.delayedCall(4200, () => this.pantallaFinal());
  }

  pantallaFinal() {
    this.estado = 'final';
    const velo = this.add.rectangle(W / 2, H / 2, W, H, 0x0A0608, 0.5).setDepth(60).setAlpha(0);
    this.tweens.add({ targets: velo, alpha: 1, duration: 600 });
    const hoja = paginaRecuerdo(this, W / 2, 390, { foto: CFG.final.foto, texto: CFG.final.mensajeFinal }, PALETAS[3]).setDepth(61);
    hoja.setScale(0.05, 1).setAngle(-6);
    this.tweens.add({ targets: hoja, scaleX: Math.min(1, (W - 30) / 320), scaleY: Math.min(1, (W - 30) / 320), angle: -2, duration: 600, ease: 'Back.easeOut', delay: 300 });
    const otraVez = boton(this, W / 2, 700, 'Volver al inicio', () => irA(this, 'Intro'),
      { estilo: 'secundario', ancho: 240, alto: 52, tam: 24 }).setDepth(61).setAlpha(0);
    this.tweens.add({ targets: otraVez, alpha: 1, duration: 600, delay: 2500 });
  }
}

/* =====================================================================
 *  Arranque
 * ===================================================================== */
// Los navegadores solo permiten sonar tras un gesto del usuario: cualquier toque o tecla sirve.
['pointerdown', 'keydown', 'touchstart'].forEach((ev) => window.addEventListener(ev, () => Sonido.iniciar(), { passive: true }));
document.addEventListener('visibilitychange', () => {
  if (!Sonido.ctx) return;
  if (document.hidden) Sonido.ctx.suspend();
  else Sonido.ctx.resume();
});

window.juego = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'juego',
  width: W,
  height: H,
  backgroundColor: '#140C12',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { activePointers: 3 },
  physics: { default: 'arcade', arcade: { gravity: { y: 1500 }, debug: false } },
  render: { antialias: true, powerPreference: 'high-performance' },
  fps: { target: 60 },
  // El HUD va al final para dibujarse siempre encima.
  scene: [
    Boot, Intro, Mapa,
    new Nivel(0), new Nivel(1), new Nivel(2), new Nivel(3),
    Mini1, Mini2, Mini3, Mini4,
    Tesoro, HUD,
  ],
});
