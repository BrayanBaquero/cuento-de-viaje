/* =====================================================================
 *  La aventura de Angie — Phaser 3
 *  Fase 1: estructura, Boot, Intro, Mapa, HUD y los 4 niveles de plataformas.
 *  (El cofre de cada nivel entrega la llave directo hasta que lleguen los
 *   minijuegos en las fases 2–3; el cofre final llega en la fase 4.)
 * ===================================================================== */
'use strict';

const W = 390;
const H = 844;
const CFG = window.CONFIG;
const FUENTE = 'Fredoka, sans-serif';
const FUNDIDO = 400;                 // ms entre escenas
const COLOR_FUNDIDO = [27, 31, 59];  // #1B1F3B

/* Paletas por etapa: fondo / medio / acento / oscuro (contornos y texto) */
const PALETAS = [
  { fondo: 0xFFD6C2, medio: 0xFF9E80, acento: 0xF2637E, oscuro: 0x7A3E65, particula: 'petalo' },     // amanecer
  { fondo: 0xE8DFF5, medio: 0xB8A1E3, acento: 0x7D5BA6, oscuro: 0x3E2F5B, particula: 'burbuja' },    // atardecer lila
  { fondo: 0xDFF5EA, medio: 0x8FD9B6, acento: 0x3FA37C, oscuro: 0x1F4F45, particula: 'luciernaga' }, // bosque menta
  { fondo: 0x1B1F3B, medio: 0x3A3F7A, acento: 0xF5C26B, oscuro: 0xFFF1D6, particula: 'estrella' },   // noche estrellada
];
const TESORO = { oro: 0xFFD166, rosa: 0xEF476F, crema: 0xFFF1D6 };
const TINTA = 0x3B2430; // contorno de personajes y objetos

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
 *  Sonido (Web Audio). La música por escena llega en la fase 4.
 * ===================================================================== */
const Sonido = {
  ctx: null,
  master: null,
  silencio: false,

  // Debe llamarse desde un toque del usuario (requisito de iOS/Android).
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
      case 'salto':
        this.barrido(380, 760, 0.16, 'triangle', 0.1);
        break;
      case 'pisar':
        this.barrido(520, 140, 0.18, 'square', 0.06);
        break;
      case 'corazon':
        this.tono(1568, 0.08, 'triangle', 0.1);
        this.tono(2093, 0.14, 'triangle', 0.1, 0.06);
        break;
      case 'bandera':
        [659, 784, 988].forEach((f, i) => this.tono(f, 0.18, 'triangle', 0.12, i * 0.07));
        break;
      case 'tap':
        this.tono(880, 0.07, 'triangle', 0.1);
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
    fontFamily: FUENTE,
    fontSize: tam + 'px',
    fontStyle: op.peso || '500',
    color,
    align: op.align || 'center',
    stroke: op.borde || undefined,
    strokeThickness: op.grosorBorde || 0,
    lineSpacing: op.interlineado || 0,
    wordWrap: op.ancho ? { width: op.ancho, useAdvancedWrap: true } : undefined,
  });
  t.setOrigin(op.origenX ?? 0.5, op.origenY ?? 0.5);
  t.setResolution(2);
  return t;
}

// Botón redondeado con sombra; mínimo 48 px de alto.
function boton(escena, x, y, etiqueta, alTocar, op = {}) {
  const w = op.ancho || 220;
  const h = Math.max(48, op.alto || 60);
  const relleno = op.relleno ?? TESORO.rosa;
  const borde = op.borde ?? TINTA;
  const colorTexto = op.colorTexto || '#FFFFFF';

  const c = escena.add.container(x, y);
  const g = escena.add.graphics();
  g.fillStyle(borde, 1).fillRoundedRect(-w / 2, -h / 2 + 5, w, h, h / 2);
  g.fillStyle(relleno, 1).fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  g.fillStyle(0xFFFFFF, 0.25).fillRoundedRect(-w / 2 + 10, -h / 2 + 6, w - 20, h * 0.32, h * 0.16);
  g.lineStyle(3, borde, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  const t = texto(escena, 0, -1, etiqueta, op.tam || 26, colorTexto, { peso: '600' });
  c.add([g, t]);
  c.setSize(w, h + 6);
  c.setInteractive({ useHandCursor: true });
  c.on('pointerdown', () => {
    Sonido.iniciar();
    Sonido.sfx('tap');
    escena.tweens.add({ targets: c, scale: 0.93, duration: 80, yoyo: true });
  });
  c.on('pointerup', () => { if (alTocar) alTocar(); });
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
function entrar(escena) {
  escena._saliendo = false;
  escena.input.enabled = true;
  escena.cameras.main.fadeIn(FUNDIDO, ...COLOR_FUNDIDO);
}

// Cambia de escena con fundido de salida (ignora toques repetidos).
function irA(escena, clave, datos) {
  if (escena._saliendo) return;
  escena._saliendo = true;
  escena.input.enabled = false;
  escena.cameras.main.fadeOut(FUNDIDO, ...COLOR_FUNDIDO);
  escena.cameras.main.once('camerafadeoutcomplete', () => escena.scene.start(clave, datos));
}

function hud(escena) { return escena.scene.get('HUD'); }

// Mensaje flotante tipo "pastilla" que desaparece solo.
function aviso(escena, x, y, str, op = {}) {
  const t = texto(escena, 0, 0, str, op.tam || 18, op.color || hex(0x3E2F5B), { peso: '600', ancho: 300 });
  const w = t.width + 32;
  const h = t.height + 18;
  const g = escena.add.graphics();
  g.fillStyle(0xFFFFFF, 0.95).fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  g.lineStyle(2.5, op.borde ?? 0x3E2F5B, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  const cx = Phaser.Math.Clamp(x, w / 2 + 8, W - w / 2 - 8);
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

// Partículas sutiles de cada etapa (pétalos, burbujas, luciérnagas, estrellas).
function particulasEtapa(escena, i) {
  const brilloSuave = (p, k, t) => Math.sin(t * Math.PI);
  const cfg = [
    { // pétalos que caen
      x: { min: -20, max: W + 20 }, y: -20, lifespan: 13000,
      speedY: { min: 35, max: 65 }, speedX: { min: -25, max: 25 },
      rotate: { start: 0, end: 360 }, scale: { min: 0.7, max: 1.2 },
      alpha: 0.85, frequency: 650, maxAliveParticles: 22,
    },
    { // burbujas que suben
      x: { min: 0, max: W }, y: H + 20, lifespan: 14000,
      speedY: { min: -60, max: -30 }, speedX: { min: -10, max: 10 },
      scale: { min: 0.5, max: 1.3 }, alpha: 0.8, frequency: 700, maxAliveParticles: 20,
    },
    { // luciérnagas
      x: { min: 0, max: W }, y: { min: 120, max: H - 40 }, lifespan: 4000,
      speed: { min: 6, max: 20 }, scale: { min: 0.6, max: 1.1 },
      alpha: { start: 0, end: 1, onUpdate: brilloSuave }, frequency: 260, maxAliveParticles: 18,
    },
    { // estrellas que titilan
      x: { min: 0, max: W }, y: { min: 0, max: H * 0.7 }, lifespan: 3200,
      speed: 0, scale: { min: 0.4, max: 1 },
      alpha: { start: 0, end: 1, onUpdate: brilloSuave }, frequency: 180, maxAliveParticles: 22,
    },
  ][i];
  return escena.add.particles(0, 0, PALETAS[i].particula, cfg);
}

/* =====================================================================
 *  Texturas dibujadas por código
 * ===================================================================== */
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

// paso: 0 = quieta, 1 / -1 = piernas alternadas al caminar, 2 = saltando.
// Lienzo 80x120, pies abajo.
function dibujarHeroina(g, paso) {
  const salto = paso === 2;
  const PIEL = 0xFFE0CC;
  const PELO = 0x7B4A2E;
  const VESTIDO = 0xF2637E;
  const ZAPATO = 0x7A3E65;
  g.lineStyle(2.5, TINTA, 1);

  // Cabello largo (detrás)
  g.fillStyle(PELO, 1).fillRoundedRect(15, 24, 50, 54, { tl: 24, tr: 24, bl: 14, br: 14 });
  g.strokeRoundedRect(15, 24, 50, 54, { tl: 24, tr: 24, bl: 14, br: 14 });

  // Piernas y zapatos
  const piernas = paso === 0 ? [[32, 0], [41, 0]] : paso === 1 ? [[29, -5], [44, 0]]
    : paso === -1 ? [[29, 0], [44, -5]] : [[28, -8], [45, -3]];
  piernas.forEach(([x, alza]) => {
    const fondo = 110 + alza;
    g.fillStyle(PIEL, 1).fillRoundedRect(x, 88, 7, fondo - 88, 3);
    g.strokeRoundedRect(x, 88, 7, fondo - 88, 3);
    g.fillStyle(ZAPATO, 1).fillEllipse(x + 4, fondo + 3, 13, 8);
    g.strokeEllipse(x + 4, fondo + 3, 13, 8);
  });

  // Brazos (arriba al saltar)
  g.fillStyle(PIEL, 1);
  if (salto) {
    g.fillRoundedRect(17, 44, 7, 23, 3.5).strokeRoundedRect(17, 44, 7, 23, 3.5);
    g.fillRoundedRect(56, 44, 7, 23, 3.5).strokeRoundedRect(56, 44, 7, 23, 3.5);
  } else {
    g.fillRoundedRect(20, 63, 7, 23, 3.5).strokeRoundedRect(20, 63, 7, 23, 3.5);
    g.fillRoundedRect(53, 63, 7, 23, 3.5).strokeRoundedRect(53, 63, 7, 23, 3.5);
  }

  // Vestido
  const vestido = [{ x: 29, y: 58 }, { x: 51, y: 58 }, { x: 61, y: 96 }, { x: 19, y: 96 }];
  g.fillStyle(VESTIDO, 1).fillPoints(vestido, true);
  g.strokePoints(vestido, true);
  g.fillCircle(29, 63, 6).strokeCircle(29, 63, 6);
  g.fillCircle(51, 63, 6).strokeCircle(51, 63, 6);
  g.fillStyle(0xFFFFFF, 0.35).fillCircle(40, 80, 3);

  // Cabeza
  g.fillStyle(PIEL, 1).fillCircle(40, 38, 22);
  g.strokeCircle(40, 38, 22);

  // Mechones laterales
  g.fillStyle(PELO, 1);
  g.fillEllipse(20, 46, 9, 26).strokeEllipse(20, 46, 9, 26);
  g.fillEllipse(60, 46, 9, 26).strokeEllipse(60, 46, 9, 26);

  // Flequillo
  g.beginPath();
  g.arc(40, 38, 23.5, Phaser.Math.DegToRad(195), Phaser.Math.DegToRad(345), false);
  g.closePath();
  g.fillPath();
  g.strokePath();

  // Moño
  g.fillStyle(VESTIDO, 1);
  g.fillTriangle(56, 18, 47, 12, 49, 25).strokeTriangle(56, 18, 47, 12, 49, 25);
  g.fillTriangle(56, 18, 65, 12, 63, 25).strokeTriangle(56, 18, 65, 12, 63, 25);
  g.fillCircle(56, 18, 3.5).strokeCircle(56, 18, 3.5);

  // Ojos grandes con brillo
  g.fillStyle(TINTA, 1);
  g.fillEllipse(32, 43, 8, 11);
  g.fillEllipse(48, 43, 8, 11);
  g.fillStyle(0xFFFFFF, 1);
  g.fillCircle(33.5, 40.5, 2.2);
  g.fillCircle(49.5, 40.5, 2.2);
  g.fillCircle(31, 45.5, 1);
  g.fillCircle(47, 45.5, 1);

  // Mejillas sonrosadas
  g.fillStyle(0xFF8FA3, 0.75);
  g.fillCircle(25, 50, 4.5);
  g.fillCircle(55, 50, 4.5);

  // Sonrisa
  g.lineStyle(2, TINTA, 1);
  g.beginPath();
  g.arc(40, 48.5, 4, Phaser.Math.DegToRad(25), Phaser.Math.DegToRad(155), false);
  g.strokePath();
}

function generarTexturas(escena) {
  const hacer = (clave, w, h, dibujo) => {
    if (escena.textures.exists(clave)) return;
    const g = escena.make.graphics({ x: 0, y: 0 }, false);
    dibujo(g);
    g.generateTexture(clave, w, h);
    g.destroy();
  };

  // Protagonista
  hacer('heroina_0', 80, 120, (g) => dibujarHeroina(g, 0));
  hacer('heroina_1', 80, 120, (g) => dibujarHeroina(g, 1));
  hacer('heroina_2', 80, 120, (g) => dibujarHeroina(g, -1));
  hacer('heroina_salto', 80, 120, (g) => dibujarHeroina(g, 2));

  // Suelo y plataformas de cada etapa: tiles = [superficie, relleno, plataforma]
  PALETAS.forEach((p, i) => {
    const borde = i === 3 ? 0x0E1024 : p.oscuro;
    const tierra = Phaser.Display.Color.IntegerToColor(p.medio).darken(i === 3 ? 4 : 16).color;
    hacer('tiles_' + i, 120, 40, (g) => {
      g.fillStyle(tierra, 1).fillRect(0, 0, 40, 40);
      g.fillStyle(p.acento, 1).fillRect(0, 0, 40, 10);
      g.fillCircle(7, 10, 5).fillCircle(21, 11, 5).fillCircle(35, 10, 5);
      g.fillStyle(0xFFFFFF, 0.28).fillRect(0, 3, 40, 3);
      g.lineStyle(3, borde, 1).lineBetween(0, 1.5, 40, 1.5);
      g.fillStyle(0x000000, 0.08).fillCircle(12, 27, 3).fillCircle(29, 33, 2.5);
      g.fillStyle(tierra, 1).fillRect(40, 0, 40, 40);
      g.fillStyle(0x000000, 0.08).fillCircle(52, 10, 3).fillCircle(70, 24, 2.5).fillCircle(47, 33, 2);
      g.fillStyle(p.acento, 1).fillRoundedRect(81, 1, 38, 16, 6);
      g.fillStyle(0xFFFFFF, 0.3).fillRoundedRect(85, 4, 30, 4, 2);
      g.lineStyle(2.5, borde, 1).strokeRoundedRect(81, 1.5, 38, 15, 6);
    });
    hacer('plat_' + i, 80, 20, (g) => {
      g.fillStyle(TESORO.crema, 1).fillRoundedRect(1, 1, 78, 17, 8);
      g.fillStyle(p.acento, 0.8).fillCircle(20, 9.5, 3).fillCircle(40, 9.5, 3).fillCircle(60, 9.5, 3);
      g.lineStyle(2.5, borde, 1).strokeRoundedRect(1.5, 1.5, 77, 16, 8);
    });
  });

  // Nubarrón gruñón (enemigo): se le puede saltar encima
  hacer('nubarron', 60, 44, (g) => {
    const bolas = [[18, 26, 13], [32, 19, 16], [46, 27, 12]];
    g.fillStyle(TINTA, 1);
    bolas.forEach(([x, y, r]) => g.fillCircle(x, y, r + 2.5));
    g.fillRoundedRect(5.5, 21.5, 51, 21, 10);
    g.fillStyle(0xB3AEC4, 1);
    bolas.forEach(([x, y, r]) => g.fillCircle(x, y, r));
    g.fillRoundedRect(8, 24, 46, 16, 8);
    g.fillStyle(0xFFFFFF, 0.35).fillEllipse(28, 12, 14, 6);
    g.fillStyle(TINTA, 1).fillEllipse(24, 28, 5, 7).fillEllipse(38, 28, 5, 7);
    g.lineStyle(2, TINTA, 1).lineBetween(19, 21, 27, 24).lineBetween(43, 21, 35, 24);
    g.beginPath();
    g.arc(31, 37, 4, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340), false);
    g.strokePath();
  });

  // Espinas (obstáculo)
  hacer('espinas', 40, 40, (g) => {
    const tri = [[2, 10, 18, 18], [12, 20, 28, 10], [22, 30, 38, 18]];
    tri.forEach(([a, m, b, alto]) => {
      g.fillStyle(0x8C7FA3, 1).fillTriangle(a, 40, m, alto, b, 40);
      g.lineStyle(2.5, TINTA, 1).strokeTriangle(a, 40, m, alto, b, 40);
    });
    g.fillStyle(0xFFFFFF, 0.35).fillTriangle(19, 18, 20, 13, 22, 24);
  });

  // Bandera de control (gris = sin activar, rosa = guardada)
  const bandera = (g, activa) => {
    g.fillStyle(0x6E6580, 1).fillRoundedRect(7, 6, 5, 74, 2);
    g.lineStyle(2, TINTA, 1).strokeRoundedRect(7, 6, 5, 74, 2);
    const pts = puntosCorazon(26, 18, 26);
    g.fillStyle(activa ? TESORO.rosa : 0xCFC8D6, 1).fillPoints(pts, true);
    g.lineStyle(2.5, TINTA, 1).strokePoints(pts, true);
    g.fillStyle(TINTA, 1).fillCircle(9.5, 6, 4);
  };
  hacer('bandera', 42, 80, (g) => bandera(g, false));
  hacer('bandera_on', 42, 80, (g) => bandera(g, true));

  // Recuerdo (mini polaroid)
  hacer('recuerdo', 36, 42, (g) => {
    g.fillStyle(0xFFFFFF, 1).fillRoundedRect(2, 2, 32, 38, 4);
    g.lineStyle(2.5, TINTA, 1).strokeRoundedRect(2, 2, 32, 38, 4);
    g.fillStyle(0xFFD6C2, 1).fillRect(7, 7, 22, 21);
    g.fillStyle(TESORO.rosa, 1).fillPoints(puntosCorazon(18, 18, 13), true);
  });

  // Llave dorada con corazón
  hacer('llave', 62, 32, (g) => {
    const borde = 0x8A5A00;
    g.lineStyle(2.5, borde, 1);
    g.fillStyle(TESORO.oro, 1);
    g.fillRoundedRect(24, 12, 32, 8, 3).strokeRoundedRect(24, 12, 32, 8, 3);
    g.fillRect(45, 19, 5, 8).strokeRect(45, 19, 5, 8);
    g.fillRect(52, 19, 4, 10).strokeRect(52, 19, 4, 10);
    g.fillCircle(15, 16, 12).strokeCircle(15, 16, 12);
    g.fillStyle(TESORO.rosa, 1).fillPoints(puntosCorazon(15, 16, 13), true);
    g.fillStyle(0xFFFFFF, 0.5).fillCircle(10, 10, 3);
  });

  // Brillo radial
  hacer('brillo', 96, 96, (g) => {
    for (let r = 48; r > 2; r -= 4) g.fillStyle(0xFFFFFF, 0.07).fillCircle(48, 48, r);
  });

  // Chispa de 4 puntas
  hacer('chispa', 18, 18, (g) => {
    g.fillStyle(TESORO.oro, 1).fillPoints(puntosEstrella(9, 9, 4, 9, 2.5), true);
    g.fillStyle(0xFFFFFF, 1).fillCircle(9, 9, 2);
  });

  // Corazón
  hacer('corazon', 40, 36, (g) => {
    const pts = puntosCorazon(20, 19, 34);
    g.fillStyle(TESORO.rosa, 1).fillPoints(pts, true);
    g.lineStyle(2.5, TINTA, 1).strokePoints(pts, true);
    g.fillStyle(0xFFFFFF, 0.6).fillEllipse(12, 11, 6, 4);
  });

  // Partículas por etapa
  hacer('petalo', 16, 12, (g) => {
    g.fillStyle(0xFF9EB0, 1).fillEllipse(8, 6, 14, 9);
    g.fillStyle(0xFFFFFF, 0.5).fillEllipse(6, 5, 5, 3);
  });
  hacer('burbuja', 20, 20, (g) => {
    g.fillStyle(0xFFFFFF, 0.18).fillCircle(10, 10, 8);
    g.lineStyle(2, 0xFFFFFF, 0.9).strokeCircle(10, 10, 8);
    g.fillStyle(0xFFFFFF, 0.9).fillCircle(7, 7, 2);
  });
  hacer('luciernaga', 20, 20, (g) => {
    for (let r = 10; r > 2; r -= 2) g.fillStyle(0xF3FF9A, 0.18).fillCircle(10, 10, r);
    g.fillStyle(0xFFFFE0, 1).fillCircle(10, 10, 2.5);
  });
  hacer('estrella', 20, 20, (g) => {
    g.fillStyle(TESORO.crema, 1).fillPoints(puntosEstrella(10, 10, 5, 9, 4), true);
  });

  // Candado
  hacer('candado', 32, 38, (g) => {
    g.lineStyle(4, 0x6E6580, 1);
    g.beginPath();
    g.arc(16, 15, 8, Math.PI, 0, false);
    g.strokePath();
    g.lineBetween(8, 15, 8, 19);
    g.lineBetween(24, 15, 24, 19);
    g.fillStyle(0x9A8FA8, 1).fillRoundedRect(3, 17, 26, 19, 5);
    g.lineStyle(2.5, 0x4A4258, 1).strokeRoundedRect(3, 17, 26, 19, 5);
    g.fillStyle(0x4A4258, 1).fillCircle(16, 25, 3).fillRect(15, 25, 2, 6);
  });

  // Cofre del tesoro
  hacer('cofre', 120, 100, (g) => {
    const madera = 0x9C5B2E;
    const tapa = 0xB86B35;
    const linea = 0x4A2A14;
    g.lineStyle(3, linea, 1);
    g.fillStyle(madera, 1).fillRoundedRect(10, 46, 100, 50, 10).strokeRoundedRect(10, 46, 100, 50, 10);
    g.fillStyle(tapa, 1).fillRoundedRect(8, 18, 104, 34, { tl: 26, tr: 26, bl: 6, br: 6 });
    g.strokeRoundedRect(8, 18, 104, 34, { tl: 26, tr: 26, bl: 6, br: 6 });
    g.fillStyle(TESORO.oro, 1);
    g.fillRect(24, 20, 10, 75).strokeRect(24, 20, 10, 75);
    g.fillRect(86, 20, 10, 75).strokeRect(86, 20, 10, 75);
    g.fillRoundedRect(48, 38, 24, 28, 5).strokeRoundedRect(48, 38, 24, 28, 5);
    g.fillStyle(linea, 1).fillCircle(60, 49, 3.5).fillRect(58.5, 49, 3, 9);
    g.fillStyle(0xFFFFFF, 0.25).fillRoundedRect(16, 24, 60, 7, 3.5);
  });

  // Iconos de sonido
  const altavoz = (g) => {
    g.fillStyle(0x3E2F5B, 1).fillPoints(
      [{ x: 3, y: 11 }, { x: 9, y: 11 }, { x: 16, y: 5 }, { x: 16, y: 25 }, { x: 9, y: 19 }, { x: 3, y: 19 }], true);
    g.lineStyle(2.5, 0x3E2F5B, 1);
  };
  hacer('sonido_on', 30, 30, (g) => {
    altavoz(g);
    g.beginPath(); g.arc(17, 15, 5, -0.9, 0.9, false); g.strokePath();
    g.beginPath(); g.arc(17, 15, 10, -0.9, 0.9, false); g.strokePath();
  });
  hacer('sonido_off', 30, 30, (g) => {
    altavoz(g);
    g.lineBetween(20, 10, 28, 20);
    g.lineBetween(28, 10, 20, 20);
  });

  // Animación de caminar
  if (!escena.anims.exists('caminar')) {
    escena.anims.create({
      key: 'caminar',
      frames: [{ key: 'heroina_1' }, { key: 'heroina_0' }, { key: 'heroina_2' }, { key: 'heroina_0' }],
      frameRate: 8,
      repeat: -1,
    });
  }
}

/* =====================================================================
 *  Protagonista: contenedor con sombra y sprite (respirar / caminar)
 * ===================================================================== */
class Heroina extends Phaser.GameObjects.Container {
  constructor(escena, x, y, escala = 1) {
    super(escena, x, y);
    this.sombra = escena.add.ellipse(0, 0, 46, 10, 0x000000, 0.18);
    this.spr = escena.add.sprite(0, 2, 'heroina_0').setOrigin(0.5, 1);
    this.add([this.sombra, this.spr]);
    this.setScale(escala);
    escena.add.existing(this);
    this.andando = null;
    this.quieta();
  }

  quieta() {
    if (this.andando === false) return;
    this.andando = false;
    if (this.tw) this.tw.stop();
    this.spr.stop();
    this.spr.setTexture('heroina_0').setScale(1).setY(2);
    this.tw = this.scene.tweens.add({
      targets: this.spr, scaleY: 1.035, scaleX: 0.985,
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  caminar() {
    if (this.andando === true) return;
    this.andando = true;
    if (this.tw) this.tw.stop();
    this.spr.setScale(1).setY(2);
    this.spr.play('caminar');
    this.tw = this.scene.tweens.add({
      targets: this.spr, y: -4, duration: 125, yoyo: true, repeat: -1, ease: 'Sine.easeOut',
    });
  }

  mirar(dx) {
    if (Math.abs(dx) > 0.4) this.spr.setFlipX(dx < 0);
  }
}

/* =====================================================================
 *  Boot: genera texturas, carga fotos y espera la fuente
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
    const barra = this.add.graphics();
    this.load.on('progress', (p) => {
      barra.clear();
      barra.fillStyle(0xFFFFFF, 0.2).fillRoundedRect(95, H / 2 - 6, 200, 12, 6);
      barra.fillStyle(TESORO.oro, 1).fillRoundedRect(95, H / 2 - 6, Math.max(12, 200 * p), 12, 6);
    });
    // Si falta una foto no pasa nada: se dibuja un marco placeholder.
    this.load.on('loaderror', () => {});
    listaFotos().forEach((ruta) => this.load.image('foto:' + ruta, ruta));
  }

  create() {
    Guardado.cargar();
    Sonido.silencio = Guardado.datos.silencio;
    generarTexturas(this);

    const listo = () => {
      this.scene.launch('HUD');
      this.scene.bringToTop('HUD');
      this.scene.start('Intro');
    };
    const espera = new Promise((r) => setTimeout(r, 2500));
    if (document.fonts && document.fonts.load) {
      Promise.race([
        Promise.all([document.fonts.load('500 20px Fredoka'), document.fonts.load('600 20px Fredoka')]),
        espera,
      ]).then(listo, listo);
    } else {
      listo();
    }
  }
}

/* =====================================================================
 *  HUD: 4 ranuras de llave + botón de silencio (siempre encima)
 * ===================================================================== */
class HUD extends Phaser.Scene {
  constructor() { super('HUD'); }

  create() {
    this.slots = [];
    this.llaves = [];

    this.panel = this.add.container(0, 0);
    const g = this.add.graphics();
    g.fillStyle(0xFFFFFF, 0.88).fillRoundedRect(66, 14, 258, 56, 28);
    g.lineStyle(2.5, 0x3E2F5B, 0.35).strokeRoundedRect(66, 14, 258, 56, 28);
    this.panel.add(g);

    for (let i = 0; i < 4; i++) {
      const x = 105 + i * 60;
      const y = 42;
      const anillo = this.add.graphics();
      anillo.fillStyle(PALETAS[i].fondo, i === 3 ? 0.9 : 1).fillCircle(x, y, 21);
      anillo.lineStyle(3, PALETAS[i].acento, 1).strokeCircle(x, y, 21);
      const silueta = this.add.image(x, y, 'llave').setScale(0.55).setAngle(-30)
        .setTint(i === 3 ? 0xFFFFFF : 0x3E2F5B).setAlpha(0.18);
      const llave = this.add.image(x, y, 'llave').setScale(0.55).setAngle(-30).setVisible(Guardado.tiene(i));
      this.panel.add([anillo, silueta, llave]);
      this.slots.push({ x, y });
      this.llaves.push(llave);
    }

    // Botón de silencio (56x56 de área táctil)
    const bx = 356;
    const by = 42;
    const fondo = this.add.circle(bx, by, 24, 0xFFFFFF, 0.92).setStrokeStyle(2.5, 0x3E2F5B, 0.35);
    this.icono = this.add.image(bx, by, Sonido.silencio ? 'sonido_off' : 'sonido_on');
    const zona = this.add.zone(bx, by, 56, 56).setInteractive({ useHandCursor: true });
    zona.on('pointerdown', () => {
      Sonido.iniciar();
      Sonido.setSilencio(!Sonido.silencio);
      this.icono.setTexture(Sonido.silencio ? 'sonido_off' : 'sonido_on');
      this.tweens.add({ targets: [fondo, this.icono], scale: 0.88, duration: 80, yoyo: true });
      Sonido.sfx('tap');
    });

    this.mostrarLlaves(false);
  }

  mostrarLlaves(v) { this.panel.setVisible(v); }

  refrescar() { this.llaves.forEach((l, i) => l.setVisible(Guardado.tiene(i))); }

  // La llave aparece en (x, y), brilla y vuela a su ranura.
  volarLlave(i, x, y, alTerminar) {
    this.mostrarLlaves(true);
    const destino = this.slots[i];
    const brillo = this.add.image(x, y, 'brillo').setTint(TESORO.oro).setScale(0.4).setBlendMode('ADD');
    const llave = this.add.image(x, y, 'llave').setScale(0.2);
    Sonido.sfx('llave');

    this.tweens.add({ targets: llave, scale: 1.8, angle: 360, duration: 600, ease: 'Back.easeOut' });
    this.tweens.add({ targets: brillo, scale: 2.4, duration: 600, ease: 'Sine.easeOut' });

    this.time.delayedCall(1100, () => {
      this.tweens.add({
        targets: [llave, brillo], x: destino.x, y: destino.y, duration: 800, ease: 'Cubic.easeInOut',
      });
      this.tweens.add({ targets: llave, scale: 0.55, angle: 330, duration: 800, ease: 'Cubic.easeInOut' });
      this.tweens.add({
        targets: brillo, scale: 0.6, alpha: 0.6, duration: 800, ease: 'Cubic.easeInOut',
        onComplete: () => {
          llave.destroy();
          this.llaves[i].setVisible(true).setScale(0.9);
          this.tweens.add({ targets: this.llaves[i], scale: 0.55, duration: 350, ease: 'Back.easeOut' });
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
 *  Intro
 * ===================================================================== */
class Intro extends Phaser.Scene {
  constructor() { super('Intro'); }

  create() {
    entrar(this);
    hud(this).mostrarLlaves(false);
    const p = PALETAS[0];

    fondoDegradado(this, [[0, 0xFFF3EA], [H * 0.55, p.fondo], [H, p.medio]]);
    this.add.circle(W / 2, 410, 150, 0xFFFFFF, 0.3);
    this.add.circle(W / 2, 410, 100, 0xFFF4D6, 0.55);

    const colinas = this.add.graphics();
    colinas.fillStyle(p.medio, 0.7).fillEllipse(60, H - 40, 460, 300);
    colinas.fillStyle(p.acento, 0.35).fillEllipse(360, H - 10, 420, 260);

    particulasEtapa(this, 0);

    texto(this, W / 2, 168, CFG.intro.titulo, 48, hex(p.oscuro), {
      peso: '700', borde: '#FFFFFF', grosorBorde: 10, interlineado: -6,
    });

    const heroina = new Heroina(this, W / 2, 545, 1.5);
    this.add.particles(heroina.x, heroina.y - 120, 'corazon', {
      x: { min: -70, max: 70 }, speedY: { min: -45, max: -25 }, speedX: { min: -12, max: 12 },
      scale: { start: 0.45, end: 0.2 }, alpha: { start: 0.9, end: 0 }, lifespan: 2600,
      frequency: 850, maxAliveParticles: 4,
    });

    texto(this, W / 2, 620, CFG.intro.frase, 19, hex(p.oscuro), { ancho: 330, interlineado: 4 });

    const etiqueta = Guardado.total() > 0 ? CFG.intro.botonContinuar : CFG.intro.botonEmpezar;
    const b = boton(this, W / 2, 730, etiqueta, () => {
      Sonido.iniciar();
      irA(this, 'Mapa');
    }, { ancho: 230, alto: 64, tam: 28 });
    this.tweens.add({ targets: b, scale: 1.05, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
}

/* =====================================================================
 *  Mapa: camino serpenteante con 4 paradas y el cofre
 * ===================================================================== */
const PUNTOS_RUTA = [[195, 800], [110, 680], [280, 540], [110, 410], [280, 285], [195, 175]];

class Mapa extends Phaser.Scene {
  constructor() { super('Mapa'); }

  create() {
    entrar(this);
    const h = hud(this);
    h.mostrarLlaves(true);
    h.refrescar();
    this.ocupado = false;

    // Del amanecer (abajo) a la noche estrellada (arriba)
    fondoDegradado(this, [
      [0, PALETAS[3].fondo], [285, PALETAS[3].fondo], [410, PALETAS[2].fondo],
      [540, PALETAS[1].fondo], [680, PALETAS[0].fondo], [H, PALETAS[0].medio],
    ]);
    for (let i = 0; i < 28; i++) {
      const e = this.add.image(Phaser.Math.Between(8, W - 8), Phaser.Math.Between(80, 300), 'estrella')
        .setScale(Phaser.Math.FloatBetween(0.25, 0.6)).setAlpha(0.3);
      this.tweens.add({
        targets: e, alpha: 1, duration: Phaser.Math.Between(900, 2000),
        yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 2000), ease: 'Sine.easeInOut',
      });
    }

    // Camino
    this.ruta = new Phaser.Curves.Spline(PUNTOS_RUTA.map(([x, y]) => new Phaser.Math.Vector2(x, y)));
    const pts = this.ruta.getSpacedPoints(160);
    const base = this.add.graphics().setAlpha(0.55);
    base.fillStyle(0xFFFFFF, 1);
    pts.forEach((pt) => base.fillCircle(pt.x, pt.y, 13));
    const huellas = this.add.graphics();
    pts.forEach((pt, i) => {
      if (i % 5 !== 0) return;
      const etapa = Phaser.Math.Clamp(3 - Math.floor((pt.y - 230) / 130), 0, 3);
      huellas.fillStyle(PALETAS[etapa].medio, 0.9).fillCircle(pt.x, pt.y, 3.5);
    });

    // Cofre al final
    const total = Guardado.total();
    const cofreX = PUNTOS_RUTA[5][0];
    const cofreY = PUNTOS_RUTA[5][1];
    const brillo = this.add.image(cofreX, cofreY, 'brillo').setTint(TESORO.oro).setScale(1.8)
      .setAlpha(total === 4 ? 0.9 : 0.35).setBlendMode('ADD');
    this.cofre = this.add.image(cofreX, cofreY, 'cofre').setScale(0.8).setDepth(5);
    texto(this, cofreX + 78, cofreY + 4, `${total}/4`, 18, hex(TESORO.crema), { peso: '600' })
      .setDepth(5);
    this.add.image(cofreX + 52, cofreY + 4, 'llave').setScale(0.4).setAngle(-30).setDepth(5);
    if (total === 4) {
      this.tweens.add({ targets: brillo, scale: 2.3, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: this.cofre, angle: { from: -4, to: 4 }, duration: 260, yoyo: true, repeat: -1 });
    }
    const zonaCofre = this.add.zone(cofreX, cofreY, 110, 90).setInteractive({ useHandCursor: true });
    zonaCofre.on('pointerup', () => this.tocarCofre());

    // Paradas
    this.paradas = [];
    for (let i = 0; i < 4; i++) this.crearParada(i);

    // Protagonista en la última parada completada
    this.tActual = total === 0 ? 0 : total / (PUNTOS_RUTA.length - 1);
    const inicio = this.ruta.getPoint(this.tActual);
    this.heroina = new Heroina(this, inicio.x, inicio.y + 6, 0.55).setDepth(10);

    // Pista superior
    const siguiente = Guardado.datos.llaves.indexOf(false);
    const pista = total === 0 ? 'Toca la etapa 1 para empezar ✨'
      : total < 4 ? `¡Vas muy bien! Sigue con la etapa ${siguiente + 1}`
        : '¡Tienes las 4 llaves! Toca el cofre 💛';
    const t = texto(this, W / 2, 104, pista, 16, hex(0x3E2F5B), { peso: '600' });
    const pg = this.add.graphics();
    pg.fillStyle(TESORO.crema, 0.95).fillRoundedRect(W / 2 - t.width / 2 - 16, 87, t.width + 32, 34, 17);
    t.setDepth(1);
  }

  crearParada(i) {
    const p = PALETAS[i];
    const [x, y] = PUNTOS_RUTA[i + 1];
    const completa = Guardado.tiene(i);
    const abierta = Guardado.desbloqueada(i);
    const actual = abierta && !completa;
    const c = this.add.container(x, y).setDepth(5);

    const g = this.add.graphics();
    const borde = i === 3 ? TESORO.crema : p.oscuro;
    g.fillStyle(0x000000, 0.15).fillCircle(0, 5, 32);
    g.fillStyle(abierta ? p.acento : 0xCFC8D6, 1).fillCircle(0, 0, 32);
    g.fillStyle(0xFFFFFF, 0.25).fillEllipse(-8, -14, 26, 12);
    g.lineStyle(3, borde, 1).strokeCircle(0, 0, 32);
    c.add(g);

    if (completa) {
      c.add(this.add.image(0, 0, 'llave').setScale(0.75).setAngle(-30));
    } else if (abierta) {
      c.add(texto(this, 0, -1, String(i + 1), 30, i === 3 ? hex(p.fondo) : '#FFFFFF', { peso: '700' }));
    } else {
      c.add(this.add.image(0, 0, 'candado').setScale(0.8));
    }

    // Etiqueta al costado
    const izquierda = x > W / 2;
    const lx = izquierda ? x - 46 : x + 46;
    const ox = izquierda ? 1 : 0;
    const colorTexto = hex(p.oscuro);
    const sub = texto(this, lx, y - 13, `Etapa ${i + 1}`, 14, colorTexto, { origenX: ox, peso: '500' });
    const tit = texto(this, lx, y + 9, CFG.etapas[i].titulo, 19, colorTexto, { origenX: ox, peso: '600' });
    if (!abierta) { sub.setAlpha(0.55); tit.setAlpha(0.55); }

    if (actual) {
      this.tweens.add({ targets: c, scale: 1.1, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    const zona = this.add.zone(x, y, 84, 84).setInteractive({ useHandCursor: true });
    zona.on('pointerup', () => this.tocarParada(i, c));
    this.paradas.push(c);
  }

  tocarParada(i, c) {
    if (this.ocupado || this._saliendo) return;
    if (!Guardado.desbloqueada(i)) {
      Sonido.sfx('error');
      this.tweens.add({ targets: c, x: c.x + 6, duration: 50, yoyo: true, repeat: 3 });
      aviso(this, c.x, c.y - 58, `Primero completa «${CFG.etapas[i - 1].titulo}» 💕`);
      return;
    }
    Sonido.sfx('tap');
    this.caminarA((i + 1) / (PUNTOS_RUTA.length - 1), () => irA(this, 'Etapa' + (i + 1)));
  }

  tocarCofre() {
    if (this.ocupado || this._saliendo) return;
    if (Guardado.total() < 4) {
      Sonido.sfx('error');
      this.tweens.add({ targets: this.cofre, angle: 8, duration: 60, yoyo: true, repeat: 3 });
      aviso(this, this.cofre.x, this.cofre.y + 62, 'Necesitas las 4 llaves para abrirlo 🔑');
      return;
    }
    this.caminarA(1, () => irA(this, 'Cofre'));
  }

  caminarA(tDestino, alLlegar) {
    this.ocupado = true;
    const desde = this.tActual;
    const dur = Math.max(250, Math.abs(tDestino - desde) * (PUNTOS_RUTA.length - 1) * 1100);
    const obj = { t: desde };
    this.heroina.caminar();
    this.tweens.add({
      targets: obj, t: tDestino, duration: dur, ease: 'Sine.easeInOut',
      onUpdate: () => {
        const pt = this.ruta.getPoint(obj.t);
        this.heroina.mirar(pt.x - this.heroina.x);
        this.heroina.setPosition(pt.x, pt.y + 6);
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
 *    obj: S inicio · m recuerdo · h corazón · x espinas · e nubarrón
 *         f bandera de control · c cofre (meta)
 *  Salto máximo ≈ 3,5 filas de alto y 4,5 columnas de largo.
 * ===================================================================== */
const TILE = 40;
const FILAS = 17;
const CONTROLES_Y = 680;

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
    suelo: [[0, 10], [13, 22], [26, 30], [34, 46], [52, 60], [68, 84]],
    bloques: [[55, 13, 2], [57, 12, 2]],
    plataformas: [[4, 12, 3], [15, 12, 2], [18, 9, 3], [23, 13, 2], [31, 12, 2], [38, 12, 3],
      [42, 9, 3], [71, 12, 3], [75, 9, 3]],
    moviles: [[47, 14, 3], [61, 14, 5]],
    obj: [['S', 2, 14], ['h', 5, 11], ['h', 6, 11], ['m', 8, 14], ['e', 17, 14], ['h', 19, 8],
      ['h', 20, 8], ['m', 36, 14], ['e', 40, 14], ['h', 43, 8], ['h', 44, 8],
      ['f', 45, 14], ['f', 52, 14], ['m', 59, 14], ['e', 72, 14], ['h', 72, 11],
      ['h', 76, 8], ['h', 77, 8], ['x', 79, 14], ['c', 81, 14]],
  },
];

const FRASES_CAIDA = ['¡Uy! Aquí te atrapo 💕', 'No pasa nada, otra vez ✨', '¡Casi! Tú puedes 💪'];

class Nivel extends Phaser.Scene {
  constructor(i) {
    super('Etapa' + (i + 1));
    this.i = i;
  }

  create() {
    entrar(this);
    hud(this).mostrarLlaves(true);
    const i = this.i;
    const p = PALETAS[i];
    const def = NIVELES[i];
    const anchoPx = def.ancho * TILE;

    this.pausa = false;
    this.ganado = false;
    this.cayendo = false;
    this.invuln = 0;
    this.bloqueo = 0;
    this.coyote = 0;
    this.buffer = 0;
    this.saltoPrevio = false;
    this.estado = '';
    this.recogidos = 0;

    this.decorarFondo(p, i, anchoPx);

    // --- Mapa de tiles ---
    const datos = Array.from({ length: FILAS }, () => Array(def.ancho).fill(-1));
    const solido = (c, r) => { if (c >= 0 && c < def.ancho && r >= 0 && r < FILAS) datos[r][c] = 1; };
    def.suelo.forEach(([a, b]) => { for (let c = a; c < b; c++) { solido(c, 15); solido(c, 16); } });
    def.bloques.forEach(([c0, r0, w]) => {
      for (let c = c0; c < c0 + w; c++) for (let r = r0; r < 15; r++) solido(c, r);
    });
    for (let r = FILAS - 1; r >= 0; r--) {
      for (let c = 0; c < def.ancho; c++) {
        if (datos[r][c] === 1 && (r === 0 || datos[r - 1][c] !== 1)) datos[r][c] = 0;
      }
    }
    def.plataformas.forEach(([c0, r, w]) => {
      for (let c = c0; c < c0 + w; c++) if (datos[r][c] === -1) datos[r][c] = 2;
    });
    const mapa = this.make.tilemap({ data: datos, tileWidth: TILE, tileHeight: TILE });
    const tileset = mapa.addTilesetImage('tiles_' + i, 'tiles_' + i, TILE, TILE, 0, 0);
    this.capa = mapa.createLayer(0, tileset, 0, 0);
    this.capa.setCollision([0, 1, 2]);
    this.capa.forEachTile((t) => { if (t.index === 2) t.setCollision(false, false, true, false); });

    // --- Objetos ---
    const quietos = { allowGravity: false, immovable: true };
    this.corazones = this.physics.add.group(quietos);
    this.recuerdos = this.physics.add.group(quietos);
    this.espinas = this.physics.add.group(quietos);
    this.banderas = this.physics.add.group(quietos);
    this.moviles = this.physics.add.group(quietos);
    this.enemigos = this.physics.add.group();

    let inicio = { x: 80, y: 600 };
    def.obj.forEach(([tipo, c, r]) => {
      const x = c * TILE + TILE / 2;
      const y = (r + 1) * TILE; // base de la celda
      if (tipo === 'S') {
        inicio = { x, y };
      } else if (tipo === 'h') {
        const h = this.corazones.create(x, y - 20, 'corazon').setScale(0.6).setDepth(15);
        this.tweens.add({ targets: h, scale: 0.68, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      } else if (tipo === 'm') {
        const brillo = this.add.image(x, y - 26, 'brillo').setTint(TESORO.oro).setScale(0.9).setDepth(14);
        const m = this.recuerdos.create(x, y - 26, 'recuerdo').setDepth(15);
        m.body.setSize(36, 220, false).setOffset(0, -170); // se toma aunque pase saltando
        m.brillo = brillo;
        this.tweens.add({ targets: [m, brillo], y: y - 34, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.tweens.add({ targets: m, angle: { from: -6, to: 6 }, duration: 1100, yoyo: true, repeat: -1 });
      } else if (tipo === 'x') {
        const s = this.espinas.create(x, y - 20, 'espinas').setDepth(15);
        s.body.setSize(30, 18).setOffset(5, 22);
      } else if (tipo === 'e') {
        const e = this.enemigos.create(x, y - 24, 'nubarron').setDepth(16);
        e.body.setSize(46, 30).setOffset(7, 12);
        e.dir = -1;
      } else if (tipo === 'f') {
        const f = this.banderas.create(x, y - 40, 'bandera').setDepth(14);
        // Zona alta: se activa aunque ella pase saltando por encima
        f.body.setSize(40, 260, false).setOffset(1, -180);
      } else if (tipo === 'c') {
        this.cofre = this.physics.add.image(x, y - 35, 'cofre').setScale(0.7).setDepth(15);
        this.cofre.body.allowGravity = false;
        // Zona alta: cuenta aunque llegue cayendo desde una plataforma
        this.cofre.body.setSize(100, 420, false).setOffset(10, -320);
        this.cofre.setImmovable(true);
        this.brilloCofre = this.add.image(x, y - 35, 'brillo').setTint(TESORO.oro).setScale(1.6)
          .setBlendMode('ADD').setDepth(14).setAlpha(0.7);
        this.tweens.add({ targets: this.brilloCofre, scale: 2, duration: 900, yoyo: true, repeat: -1 });
      }
    });
    // Los recuerdos se muestran en el orden en que aparecen en el camino
    this.recuerdos.getChildren().sort((a, b) => a.x - b.x).forEach((m, k) => { m.idx = k; });

    def.moviles.forEach(([c, r, rango]) => {
      const m = this.moviles.create(c * TILE + TILE, r * TILE + 10, 'plat_' + i).setDepth(13);
      m.body.checkCollision.down = false;
      m.body.checkCollision.left = false;
      m.body.checkCollision.right = false;
      m.min = m.x;
      m.max = m.x + rango * TILE;
      m.setVelocityX(55);
    });

    // --- Protagonista ---
    this.jug = this.physics.add.sprite(inicio.x, inicio.y - 40, 'heroina_0').setScale(0.55).setDepth(20);
    this.jug.body.setSize(34, 96).setOffset(23, 22);
    this.jug.setCollideWorldBounds(true);
    this.control = { x: inicio.x, y: inicio.y - 40 };

    this.physics.world.setBounds(0, 0, anchoPx, H + 400);
    this.physics.world.setBoundsCollision(true, true, false, false);
    this.physics.add.collider(this.jug, this.capa);
    this.physics.add.collider(this.jug, this.moviles);
    this.physics.add.collider(this.enemigos, this.capa);
    this.physics.add.overlap(this.jug, this.enemigos, (j, e) => this.tocarEnemigo(e));
    this.physics.add.overlap(this.jug, this.espinas, (j, s) => this.herir(s.x));
    this.physics.add.overlap(this.jug, this.corazones, (j, h) => this.tomarCorazon(h));
    this.physics.add.overlap(this.jug, this.recuerdos, (j, m) => this.tomarRecuerdo(m));
    this.physics.add.overlap(this.jug, this.banderas, (j, f) => this.activarBandera(f));
    if (this.cofre) this.physics.add.overlap(this.jug, this.cofre, () => this.llegarCofre());

    const cam = this.cameras.main;
    cam.setBounds(0, 0, anchoPx, H);
    cam.startFollow(this.jug, true, 0.12, 0.12);
    cam.setFollowOffset(-50, 0);

    this.crearControles(p, i);
    this.crearInterfaz(i);
    this.teclas = this.input.keyboard ? this.input.keyboard.createCursorKeys() : null;
    this.cartelInicial(p, i);
  }

  /* ---------- Escenario ---------- */
  decorarFondo(p, i, anchoPx) {
    const cielo = i === 3 ? [[0, 0x10132B], [CONTROLES_Y, p.medio]]
      : [[0, p.fondo], [380, p.fondo], [CONTROLES_Y, p.medio]];
    fondoDegradado(this, cielo).setScrollFactor(0);

    const lejos = this.add.graphics().setScrollFactor(0.05);
    if (i === 0) {
      lejos.fillStyle(0xFFFFFF, 0.35).fillCircle(290, 230, 95);
      lejos.fillStyle(0xFFF4D6, 0.9).fillCircle(290, 230, 62);
    } else if (i === 1) {
      lejos.fillStyle(0xFFFFFF, 0.3).fillCircle(110, 210, 100);
      lejos.fillStyle(0xFFE7F0, 0.6).fillCircle(110, 210, 64);
    } else if (i === 3) {
      lejos.fillStyle(TESORO.crema, 1).fillCircle(300, 170, 40);
      lejos.fillStyle(0x10132B, 1).fillCircle(318, 158, 36);
    }
    const alcance = (f) => (anchoPx - W) * f + W + 200;

    if (i === 3) {
      const est = this.add.graphics().setScrollFactor(0.1);
      for (let k = 0; k < 70; k++) {
        est.fillStyle(TESORO.crema, Phaser.Math.FloatBetween(0.3, 0.9))
          .fillCircle(Phaser.Math.Between(0, alcance(0.1)), Phaser.Math.Between(90, 420), Phaser.Math.FloatBetween(0.8, 2));
      }
    }

    const colinas = this.add.graphics().setScrollFactor(0.3);
    colinas.fillStyle(i === 3 ? 0x2A2F5E : p.medio, i === 3 ? 1 : 0.5);
    for (let x = 0; x < alcance(0.3); x += 190) colinas.fillEllipse(x, 650, 280, 260 + (x % 3) * 30);

    const cerca = this.add.graphics().setScrollFactor(0.6);
    if (i === 2) {
      const pino = Phaser.Display.Color.IntegerToColor(p.acento).darken(12).color;
      for (let x = 40; x < alcance(0.6); x += 130) {
        const alto = 150 + (x % 4) * 25;
        cerca.fillStyle(pino, 0.55).fillTriangle(x - 45, 640, x, 640 - alto, x + 45, 640);
      }
    } else if (i === 3) {
      cerca.fillStyle(0x23285A, 1);
      for (let x = 0; x < alcance(0.6); x += 240) cerca.fillEllipse(x, 680, 300, 200);
    } else {
      cerca.fillStyle(0xFFFFFF, 0.7);
      for (let x = 60; x < alcance(0.6); x += 320) {
        const y = 170 + (x % 5) * 28;
        cerca.fillEllipse(x, y, 90, 34).fillEllipse(x + 30, y - 12, 60, 34).fillEllipse(x - 28, y - 6, 50, 26);
      }
    }

    particulasEtapa(this, i).setScrollFactor(0).setDepth(30);
  }

  crearControles(p, i) {
    const panel = this.add.graphics().setScrollFactor(0).setDepth(40);
    panel.fillStyle(Phaser.Display.Color.IntegerToColor(p.medio).darken(i === 3 ? 10 : 34).color, 1)
      .fillRect(0, CONTROLES_Y, W, H - CONTROLES_Y);
    panel.fillStyle(0x000000, 0.15).fillRect(0, CONTROLES_Y, W, 6);

    const tinta = 0x3E2F5B;
    const crear = (x, y, r, dibujo) => {
      const c = this.add.container(x, y).setScrollFactor(0).setDepth(41);
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.2).fillCircle(0, 5, r);
      g.fillStyle(0xFFFFFF, 0.92).fillCircle(0, 0, r);
      g.lineStyle(3, tinta, 0.8).strokeCircle(0, 0, r);
      g.fillStyle(tinta, 1);
      dibujo(g);
      c.add(g);
      c.presionado = false;
      return c;
    };
    this.botones = {
      izq: crear(60, 768, 40, (g) => g.fillTriangle(-14, 0, 9, -14, 9, 14)),
      der: crear(166, 768, 40, (g) => g.fillTriangle(14, 0, -9, -14, -9, 14)),
      salto: crear(318, 762, 52, (g) => {
        g.fillTriangle(0, -20, -18, 2, 18, 2);
        g.fillRoundedRect(-7, 0, 14, 18, 3);
      }),
    };
    texto(this, 318, 828, 'Saltar', 14, '#FFFFFF', { peso: '600' }).setScrollFactor(0).setDepth(41);
  }

  crearInterfaz(i) {
    // Botón para volver al mapa
    const casa = this.add.container(34, 42).setScrollFactor(0).setDepth(60);
    const g = this.add.graphics();
    g.fillStyle(0xFFFFFF, 0.92).fillCircle(0, 0, 24);
    g.lineStyle(2.5, 0x3E2F5B, 0.35).strokeCircle(0, 0, 24);
    g.fillStyle(0x3E2F5B, 1).fillTriangle(0, -12, -12, -1, 12, -1).fillRect(-8, -2, 16, 12);
    g.fillStyle(0xFFFFFF, 1).fillRect(-3, 3, 6, 7);
    casa.add(g);
    const zona = this.add.zone(34, 42, 56, 56).setScrollFactor(0).setInteractive({ useHandCursor: true });
    zona.on('pointerup', () => {
      if (this.pausa || this.ganado) return;
      Sonido.sfx('tap');
      irA(this, 'Mapa');
    });

    // Contador de recuerdos
    const fondo = this.add.graphics().setScrollFactor(0).setDepth(60);
    fondo.fillStyle(0xFFFFFF, 0.92).fillRoundedRect(10, 84, 92, 36, 18);
    fondo.lineStyle(2.5, 0x3E2F5B, 0.35).strokeRoundedRect(10, 84, 92, 36, 18);
    this.add.image(32, 102, 'recuerdo').setScale(0.6).setScrollFactor(0).setDepth(61);
    this.contador = texto(this, 50, 102, `0/${this.recuerdos.getLength()}`, 18, hex(0x3E2F5B),
      { peso: '600', origenX: 0 }).setScrollFactor(0).setDepth(61);
  }

  cartelInicial(p, i) {
    const tinta = i === 3 ? hex(TESORO.crema) : hex(p.oscuro);
    const borde = i === 3 ? '#10132B' : '#FFFFFF';
    const t1 = texto(this, W / 2, 230, `Etapa ${i + 1}: ${CFG.etapas[i].titulo}`, 26, tinta,
      { peso: '700', borde, grosorBorde: 7 });
    const t2 = texto(this, W / 2, 278, CFG.etapas[i].frase, 18, tinta,
      { ancho: 330, borde, grosorBorde: 5 });
    const t3 = texto(this, W / 2, 330, 'Busca los 3 recuerdos y llega al cofre', 15, tinta,
      { peso: '600', borde, grosorBorde: 5 });
    const todo = [t1, t2, t3];
    todo.forEach((t) => t.setScrollFactor(0).setDepth(70).setAlpha(0));
    this.tweens.add({ targets: todo, alpha: 1, duration: 400, delay: 200 });
    this.tweens.add({ targets: todo, alpha: 0, duration: 500, delay: 3400, onComplete: () => todo.forEach((t) => t.destroy()) });
  }

  /* ---------- Bucle ---------- */
  leerControles() {
    let izq = false;
    let der = false;
    let salto = false;
    if (!this.pausa) {
      for (const ptr of this.input.manager.pointers) {
        if (!ptr || !ptr.isDown || ptr.y < CONTROLES_Y) continue;
        if (ptr.x < 113) izq = true;
        else if (ptr.x < 235) der = true;
        else salto = true;
      }
      const k = this.teclas;
      if (k) {
        izq = izq || k.left.isDown;
        der = der || k.right.isDown;
        salto = salto || k.up.isDown || k.space.isDown;
      }
    }
    const pintar = (b, on) => {
      if (b.presionado === on) return;
      b.presionado = on;
      b.setScale(on ? 0.9 : 1).setAlpha(on ? 0.75 : 1);
    };
    pintar(this.botones.izq, izq);
    pintar(this.botones.der, der);
    pintar(this.botones.salto, salto);
    return { izq, der, salto };
  }

  update(time, delta) {
    const dt = Math.min(delta, 50);
    const ctl = this.leerControles();

    this.moviles.getChildren().forEach((m) => {
      if (m.x >= m.max) m.setVelocityX(-55);
      else if (m.x <= m.min) m.setVelocityX(55);
    });
    this.enemigos.getChildren().forEach((e) => {
      if (!e.body || !e.body.enable) return;
      const eb = e.body;
      if (eb.blocked.left) e.dir = 1;
      else if (eb.blocked.right) e.dir = -1;
      else if (eb.blocked.down && !this.capa.getTileAtWorldXY(e.x + e.dir * 26, eb.bottom + 4)) e.dir *= -1;
      e.setVelocityX(e.dir * 50);
      e.setFlipX(e.dir > 0);
      if (e.y > H + 200) e.destroy();
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

    const estado = !enSuelo ? 'aire' : Math.abs(b.velocity.x) > 25 ? 'camina' : 'quieta';
    if (estado !== this.estado) {
      this.estado = estado;
      if (estado === 'camina') {
        this.jug.play('caminar');
      } else {
        this.jug.stop();
        this.jug.setTexture(estado === 'aire' ? 'heroina_salto' : 'heroina_0');
      }
    }

    if (this.jug.y > H + 40) this.reaparecer();
  }

  /* ---------- Eventos ---------- */
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

  tocarEnemigo(e) {
    if (!e.body.enable || this.ganado) return;
    const b = this.jug.body;
    if (b.velocity.y > 40 && b.bottom < e.body.top + 18) {
      e.body.enable = false;
      b.setVelocityY(-480);
      this.coyote = 0;
      Sonido.sfx('pisar');
      const puf = this.add.particles(e.x, e.y, 'burbuja', {
        speed: { min: 50, max: 140 }, lifespan: 450, scale: { start: 1.2, end: 0 }, emitting: false,
      }).setDepth(17);
      puf.explode(10);
      this.tweens.add({ targets: e, scaleY: 0.2, scaleX: 1.3, alpha: 0, duration: 260, onComplete: () => e.destroy() });
      this.time.delayedCall(600, () => puf.destroy());
    } else {
      this.herir(e.x);
    }
  }

  tomarCorazon(h) {
    h.disableBody(true, true);
    Sonido.sfx('corazon');
    const ch = this.add.particles(h.x, h.y, 'chispa', {
      speed: { min: 40, max: 110 }, lifespan: 400, scale: { start: 0.8, end: 0 }, emitting: false,
    }).setDepth(17);
    ch.explode(6);
    this.time.delayedCall(500, () => ch.destroy());
  }

  tomarRecuerdo(m) {
    if (this.pausa) return;
    m.disableBody(true, true);
    m.brillo.destroy();
    this.recogidos++;
    this.contador.setText(`${this.recogidos}/${this.recuerdos.getLength()}`);
    Sonido.sfx('recoger');
    this.mostrarRecuerdo(m.idx);
  }

  // Polaroid con foto, texto y fecha. Pausa el juego hasta que se toque la pantalla.
  mostrarRecuerdo(idx) {
    const r = CFG.etapas[this.i].recuerdos[idx];
    if (!r) return;
    this.pausa = true;
    this.physics.pause();
    this.jug.anims.pause();

    const velo = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.5).setScrollFactor(0).setDepth(80).setAlpha(0);
    const tarjeta = this.add.container(W / 2, 400).setScrollFactor(0).setDepth(81).setScale(0.3).setAngle(-10);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.25).fillRoundedRect(-142, -172, 290, 360, 8);
    g.fillStyle(0xFFFFFF, 1).fillRoundedRect(-145, -180, 290, 360, 8);
    g.lineStyle(3, TINTA, 1).strokeRoundedRect(-145, -180, 290, 360, 8);
    tarjeta.add(g);
    tarjeta.add(foto(this, 0, -46, 254, 240, r.foto, PALETAS[this.i]));
    tarjeta.add(texto(this, 0, 104, r.texto, 22, hex(TINTA), { peso: '600', ancho: 260 }));
    tarjeta.add(texto(this, 0, 146, r.fecha, 16, hex(TESORO.rosa), { peso: '500' }));
    const sigue = texto(this, W / 2, 640, 'Toca para seguir', 18, '#FFFFFF', { peso: '600' })
      .setScrollFactor(0).setDepth(81).setAlpha(0);

    this.tweens.add({ targets: velo, alpha: 1, duration: 250 });
    this.tweens.add({ targets: tarjeta, scale: 1, angle: -3, duration: 450, ease: 'Back.easeOut' });
    this.tweens.add({ targets: sigue, alpha: 1, duration: 300, delay: 600 });

    this.time.delayedCall(600, () => {
      const cerrar = () => {
        Sonido.sfx('tap');
        this.tweens.add({
          targets: [velo, tarjeta, sigue], alpha: 0, duration: 250,
          onComplete: () => {
            velo.destroy();
            tarjeta.destroy();
            sigue.destroy();
            this.physics.resume();
            this.jug.anims.resume();
            this.pausa = false;
            this.saltoPrevio = true; // evita un salto accidental al cerrar
          },
        });
      };
      this.input.once('pointerdown', cerrar);
    });
  }

  activarBandera(f) {
    if (f.activa) return;
    f.activa = true;
    f.setTexture('bandera_on');
    this.control = { x: f.x, y: f.y };
    Sonido.sfx('bandera');
    this.tweens.add({ targets: f, scaleY: 1.15, duration: 150, yoyo: true });
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
    this.jug.setTexture('heroina_0');
    this.tweens.add({ targets: this.cofre, scale: 0.85, duration: 160, yoyo: true, repeat: 2 });
    this.tweens.add({ targets: this.brilloCofre, scale: 3, alpha: 1, duration: 500 });
    aviso(this, W / 2, 260, '¡Encontraste el cofre! 💛', { duracion: 1400 });

    // Fases 2–3: aquí se abrirá el minijuego de la etapa antes de dar la llave.
    this.time.delayedCall(900, () => {
      Guardado.darLlave(this.i);
      const cam = this.cameras.main;
      hud(this).volarLlave(this.i, this.cofre.x - cam.scrollX, this.cofre.y - 50, () => irA(this, 'Mapa'));
    });
  }
}

class CofrePendiente extends Phaser.Scene {
  constructor() { super('Cofre'); }

  create() {
    entrar(this);
    hud(this).mostrarLlaves(true);
    fondoDegradado(this, [[0, PALETAS[3].fondo], [H, PALETAS[3].medio]]);
    particulasEtapa(this, 3);
    this.add.image(W / 2, 400, 'brillo').setTint(TESORO.oro).setScale(3).setBlendMode('ADD');
    this.add.image(W / 2, 400, 'cofre').setScale(1.6);
    texto(this, W / 2, 230, '¡El tesoro!', 36, hex(TESORO.oro), { peso: '700' });
    texto(this, W / 2, 540, '(El cofre y la sorpresa llegan en la fase 4)', 16, hex(TESORO.crema), { ancho: 320 });
    boton(this, W / 2, 680, 'Volver al mapa', () => irA(this, 'Mapa'), {
      ancho: 240, alto: 52, tam: 20, relleno: TESORO.oro, borde: 0x0E1024, colorTexto: hex(0x3E2F5B),
    });
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
  backgroundColor: '#1B1F3B',
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
