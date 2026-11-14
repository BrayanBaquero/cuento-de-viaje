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
 *  Sonido (Web Audio). La música y el ambiente llegan en la fase 4.
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
    if (this.ctx.state === 'suspended') this.ctx.resume();
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
      case 'pisar': this.barrido(520, 140, 0.18, 'square', 0.06); break;
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
      const destino = etapa >= 1 && etapa <= 4 ? 'Etapa' + etapa : ['Mapa', 'Cofre'].includes(q.get('escena')) ? q.get('escena') : 'Intro';
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
 *    obj: S inicio · m página del diario (recuerdo) · h luz · x zarza
 *         e sombra del olvido · f farol de piedra (control) · c cofre (meta)
 *  Salto máximo ≈ 3,5 filas de alto y 4,5 columnas de largo.
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
  { // 2 · Primera cita — más huecos y la primera plataforma móvil
    ancho: 78,
    suelo: [[0, 14], [17, 28], [32, 44], [52, 60], [63, 78]],
    bloques: [[55, 13, 2]],
    plataformas: [[6, 12, 3], [20, 12, 3], [24, 9, 3], [29, 13, 2], [36, 12, 4], [66, 12, 3], [70, 9, 2]],
    moviles: [[45, 14, 4]],
    obj: [['S', 2, 14], ['h', 7, 11], ['h', 8, 11], ['m', 11, 14], ['e', 22, 14], ['h', 25, 8],
      ['h', 26, 8], ['m', 34, 14], ['x', 37, 14], ['e', 40, 14], ['f', 42, 14], ['m', 58, 14],
      ['x', 65, 14], ['h', 67, 11], ['h', 68, 11], ['h', 71, 8], ['c', 75, 14]],
  },
  { // 3 · Nuestro lugar — bosque con plataformas móviles
    ancho: 80,
    suelo: [[0, 12], [15, 26], [34, 42], [47, 58], [66, 80]],
    bloques: [[37, 12, 3], [74, 13, 2]],
    plataformas: [[5, 12, 3], [17, 11, 3], [21, 8, 3], [43, 12, 2], [50, 12, 3], [54, 9, 3], [70, 12, 3]],
    moviles: [[27, 14, 4], [59, 14, 4]],
    obj: [['S', 2, 14], ['h', 6, 11], ['h', 7, 11], ['m', 8, 14], ['e', 19, 14], ['h', 22, 7],
      ['h', 23, 7], ['f', 25, 14], ['m', 35, 14], ['h', 44, 11], ['e', 52, 14], ['h', 55, 8],
      ['h', 56, 8], ['f', 57, 14], ['m', 68, 14], ['x', 72, 14], ['c', 77, 14]],
  },
  { // 4 · Nuestro futuro — el reto final (sin pasarse)
    ancho: 84,
    suelo: [[0, 10], [13, 22], [26, 30], [34, 46], [52, 61], [68, 84]],
    bloques: [[54, 13, 2], [56, 12, 2]],
    plataformas: [[4, 12, 3], [15, 12, 2], [18, 9, 3], [23, 13, 2], [31, 12, 2], [38, 12, 3],
      [42, 9, 3], [71, 12, 3], [75, 9, 3]],
    moviles: [[47, 14, 3], [62, 14, 4]],
    obj: [['S', 2, 14], ['h', 5, 11], ['h', 6, 11], ['m', 8, 14], ['e', 17, 14], ['h', 19, 8],
      ['h', 20, 8], ['m', 36, 14], ['e', 40, 14], ['h', 43, 8], ['h', 44, 8],
      ['f', 45, 14], ['f', 52, 14], ['m', 59, 14], ['e', 72, 14], ['h', 72, 11],
      ['h', 76, 8], ['h', 77, 8], ['x', 79, 14], ['c', 81, 14]],
  },
];

const FRASES_CAIDA = ['¡Uy! Aquí te atrapo', 'No pasa nada, otra vez', '¡Casi! Tú puedes'];

class Nivel extends Phaser.Scene {
  constructor(i) {
    super('Etapa' + (i + 1));
    this.i = i;
  }

  create() {
    entrar(this);
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
    this.recuerdos.getChildren().sort((a, b) => a.x - b.x).forEach((m, k) => { m.idx = k; });

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

    // --- Angie ---
    this.jug = this.physics.add.sprite(inicio.x, inicio.y - 40, 'angie', 0).setScale(ESCALA_NIVEL).setDepth(20);
    this.jug.body.setSize(48, 130).setOffset(56, 54);
    this.jug.setCollideWorldBounds(true);
    this.control = { x: inicio.x, y: inicio.y - 40 };

    this.physics.world.setBounds(0, 0, anchoPx, H + 400);
    this.physics.world.setBoundsCollision(true, true, false, false);
    this.physics.add.collider(this.jug, this.capa);
    this.physics.add.collider(this.jug, this.moviles);
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
    const lineas = [
      texto(this, W / 2, 200, `${ROMANOS[i]} · ${CFG.etapas[i].titulo}`, 36, tinta, { serif: true, peso: '700', sombra, desenfoque: 12 }),
      texto(this, W / 2, 248, CFG.etapas[i].frase, 19, tinta, { serif: true, peso: 'italic 600', ancho: 340, sombra, desenfoque: 10 }),
      texto(this, W / 2, 300, TACTIL ? 'Encuentra las 3 páginas del diario y llega al cofre'
        : 'Encuentra las 3 páginas del diario y llega al cofre\n← →  o  A D para moverte · Espacio para saltar', 15, tinta,
      { peso: '700', sombra, desenfoque: 8, interlineado: 4, ancho: 340 }),
    ];
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
    if (this.buffer > 0 && this.coyote > 0) {
      b.setVelocityY(-660);
      this.buffer = 0;
      this.coyote = 0;
      Sonido.sfx('salto');
    }
    // Salto más corto si se suelta el botón antes
    if (!ctl.salto && this.saltoPrevio && b.velocity.y < -200) b.setVelocityY(b.velocity.y * 0.45);
    this.saltoPrevio = ctl.salto;

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
      const estado = !enSuelo ? (b.velocity.y < 0 ? 'sube' : 'cae') : Math.abs(b.velocity.x) > 25 ? 'camina' : 'quieta';
      if (estado !== this.estado) {
        this.estado = estado;
        if (estado === 'camina') this.jug.play('angie_correr', true);
        else if (estado === 'quieta') this.jug.play('angie_quieta', true);
        else {
          this.jug.stop();
          this.jug.setFrame(estado === 'sube' ? 8 : 9);
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
    const hoja = this.add.container(W / 2, 410).setScrollFactor(0).setDepth(81);
    hoja.add(this.add.image(0, 0, 'pagina_diario'));
    const imagen = foto(this, 0, -66, 236, 186, r.foto, PALETAS[this.i]).setAngle(-2);
    hoja.add(imagen);
    hoja.add(this.add.image(-108, -152, 'cinta').setAngle(-32));
    hoja.add(this.add.image(108, -152, 'cinta').setAngle(30));
    hoja.add(texto(this, 0, 96, r.texto, 26, hex(TINTA), { serif: true, peso: 'italic 700', ancho: 250 }));
    hoja.add(texto(this, 0, 142, r.fecha, 18, '#B0485F', { serif: true, peso: 'italic 600' }));
    hoja.add(texto(this, 122, 172, `${idx + 1} / 3`, 14, '#8C6A48', { serif: true, peso: '700' }));
    hoja.setScale(0.05, 1).setAngle(-6);
    const sigue = texto(this, W / 2, 640, TACTIL ? 'Toca para seguir' : 'Clic o Espacio para seguir', 18, hex(CREMA))
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

  // Farol de piedra: punto de control
  encenderFarol(f) {
    if (f.encendido) return;
    f.encendido = true;
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

    // Fases 2–3: aquí se abrirá el minijuego de la etapa antes de dar la llave.
    this.time.delayedCall(900, () => {
      Guardado.darLlave(this.i);
      const cam = this.cameras.main;
      hud(this).volarLlave(this.i, this.cofre.x - cam.scrollX, this.cofre.y - 50, () => irA(this, 'Mapa'));
    });
  }
}

/* =====================================================================
 *  Cofre final (provisional hasta la fase 4)
 * ===================================================================== */
class CofrePendiente extends Phaser.Scene {
  constructor() { super('Cofre'); }

  create() {
    entrar(this);
    hud(this).mostrarLlaves(true);
    this.add.image(W / 2, H / 2, 'mapa_fondo');
    motasDeLuz(this, 30);
    this.add.image(W / 2, 400, 'brillo').setTint(ORO).setScale(3).setBlendMode('ADD');
    this.add.image(W / 2, 400, 'cofre_mapa').setScale(1.6);
    texto(this, W / 2, 230, 'El tesoro', 44, hex(ORO), { serif: true, peso: '700' });
    texto(this, W / 2, 540, 'El cofre final y la sorpresa llegan en la fase 4', 17, hex(CREMA), { ancho: 320 });
    boton(this, W / 2, 680, 'Volver al mapa', () => irA(this, 'Mapa'), { ancho: 250, tam: 24, teclas: ['ESC', 'ENTER'] });
  }
}

/* =====================================================================
 *  Arranque
 * ===================================================================== */
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
    CofrePendiente, HUD,
  ],
});
