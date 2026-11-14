/* =====================================================================
 *  arte.js — Ilustraciones vectoriales del juego (SVG generado por código)
 *
 *  Estilo: "cuento de viaje pintado a tinta". Cada función devuelve
 *  { svg, w, h } con el tamaño final en píxeles. Boot las convierte en
 *  texturas de Phaser una sola vez al cargar (no se redibujan por frame).
 *  Todo es original: no usa personajes ni elementos de otras obras.
 * ===================================================================== */
'use strict';

const Arte = (() => {
  const INK = '#2A1B23';
  const SEPIA = '#4E3626';
  const LAVADO = '#E8D6B2';

  /* ---------- Aleatorio con semilla (las ilustraciones salen siempre iguales) ---------- */
  let R = Math.random;
  function semilla(s) {
    R = function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rnd = (a, b) => a + (b - a) * R();
  const pick = (a) => a[Math.floor(R() * a.length)];
  const f = (n) => Math.round(n * 10) / 10;

  /* ---------- Documento SVG ---------- */
  const lg = (id, stops) =>
    `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">` +
    stops.map(([o, c, op = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${op}"/>`).join('') +
    '</linearGradient>';
  const blur = (id, s) => `<filter id="${id}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${s}"/></filter>`;
  const DEFS =
    blur('b1', 1.2) + blur('b3', 3) + blur('b8', 8) + blur('b16', 16) +
    '<radialGradient id="glowGold"><stop offset="0" stop-color="#FFE7A8" stop-opacity=".95"/><stop offset=".4" stop-color="#FFD27A" stop-opacity=".35"/><stop offset="1" stop-color="#FFD27A" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="glowCream"><stop offset="0" stop-color="#FFF6E2"/><stop offset=".35" stop-color="#FFF1D6" stop-opacity=".45"/><stop offset="1" stop-color="#FFF1D6" stop-opacity="0"/></radialGradient>';

  function doc(w, h, cuerpo, defsExtra = '', escala = 1) {
    const W = Math.round(w * escala);
    const H = Math.round(h * escala);
    return {
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${w} ${h}"><defs>${DEFS}${defsExtra}</defs>${cuerpo}</svg>`,
      w: W,
      h: H,
    };
  }

  /* ---------- Piezas de escenario ---------- */
  function ridge({ x0 = -10, x1, base, amp, color, bottom, op = 1, step = 6, freqs = [[0.012, 1], [0.031, 0.45], [0.07, 0.18]], jit = 1.5, filter = '' }) {
    const ph = freqs.map(() => rnd(0, 6.28));
    let d = `M${x0},${bottom} `;
    for (let x = x0; x <= x1 + step; x += step) {
      let y = base;
      freqs.forEach(([fr, a], i) => { y -= amp * a * (0.5 + 0.5 * Math.sin(x * fr + ph[i])); });
      d += `L${f(x)},${f(y + rnd(-jit, jit))} `;
    }
    d += `L${x1 + step},${bottom} Z`;
    return `<path d="${d}" fill="${color}" opacity="${op}"${filter ? ` filter="url(#${filter})"` : ''}/>`;
  }

  function grass({ x0, x1, base, hMin, hMax, count, color, op = 1, lean = 5, wMin = 2, wMax = 5, filter = '', evitar = null }) {
    let d = '';
    for (let i = 0; i < count; i++) {
      const x = rnd(x0, x1);
      if (evitar && x > evitar[0] && x < evitar[1]) continue;
      const b = typeof base === 'function' ? base(x) : base;
      const h = rnd(hMin, hMax);
      const w = rnd(wMin, wMax);
      const l = rnd(-lean, lean);
      d += `M${f(x)},${f(b)} Q${f(x + l * 0.3)},${f(b - h * 0.6)} ${f(x + l)},${f(b - h)} Q${f(x + w + l * 0.3)},${f(b - h * 0.5)} ${f(x + w)},${f(b)}Z`;
    }
    return `<path d="${d}" fill="${color}" opacity="${op}"${filter ? ` filter="url(#${filter})"` : ''}/>`;
  }

  function dots({ x0, x1, y0, y1, count, rMin, rMax, colors, op = 1, glow = false }) {
    let s = '';
    for (let i = 0; i < count; i++) {
      const x = rnd(x0, x1), y = rnd(y0, y1), r = rnd(rMin, rMax), c = pick(colors), o = rnd(0.4, 1) * op;
      if (glow) s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 4)}" fill="${c}" opacity="${f(o * 0.3)}" filter="url(#b3)"/>`;
      s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${c}" opacity="${f(o)}"/>`;
    }
    return s;
  }

  function rays({ ox, oy, count, len, angle, spread, color, op }) {
    let s = `<g filter="url(#b8)" opacity="${op}">`;
    for (let i = 0; i < count; i++) {
      const a = (angle + (i / (count - 1) - 0.5) * spread + rnd(-3, 3)) * Math.PI / 180;
      const w = rnd(1.5, 4.5) * Math.PI / 180;
      s += `<polygon points="${ox},${oy} ${f(ox + Math.cos(a - w) * len)},${f(oy + Math.sin(a - w) * len)} ${f(ox + Math.cos(a + w) * len)},${f(oy + Math.sin(a + w) * len)}" fill="${color}" opacity="${f(rnd(0.4, 1))}"/>`;
    }
    return s + '</g>';
  }

  function arch(x, base, r, h, color, roto, sw) {
    const cx = x + r, cy = base - h;
    if (!roto) return `<path d="M${x},${base} V${cy} A${r},${r} 0 0 1 ${x + 2 * r},${cy} V${base}" fill="none" stroke="${color}" stroke-width="${sw}"/>`;
    const th = Math.PI * 0.3;
    return `<path d="M${x},${base} V${cy} A${r},${r} 0 0 1 ${f(cx + r * Math.cos(th))},${f(cy - r * Math.sin(th))} M${x + 2 * r},${base} V${f(base - h * 0.55)}" fill="none" stroke="${color}" stroke-width="${sw}"/>`;
  }

  function tower(x, base, w, h, color, ventana) {
    const t = base - h;
    return `<path d="M${x},${base} L${x},${t + 6} L${f(x + w * 0.2)},${t - 4} L${f(x + w * 0.35)},${t + 5} L${f(x + w * 0.55)},${t - 10} L${f(x + w * 0.75)},${t + 2} L${x + w},${t - 3} L${x + w},${base} Z" fill="${color}"/>` +
      (ventana ? `<path d="M${f(x + w * 0.35)},${f(t + h * 0.4)} v-8 a${f(w * 0.15)},${f(w * 0.15)} 0 0 1 ${f(w * 0.3)},0 v8 Z" fill="${ventana}"/>` : '');
  }

  function flower(x, y, r, c) {
    let s = `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 3.2)}" fill="${c}" opacity=".22" filter="url(#b3)"/>`;
    for (let k = 0; k < 5; k++) {
      const a = k * 1.2566 - 1.5708;
      s += `<circle cx="${f(x + Math.cos(a) * r)}" cy="${f(y + Math.sin(a) * r)}" r="${f(r * 0.75)}" fill="${c}"/>`;
    }
    return s + `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.55)}" fill="#FFE7A8"/>`;
  }

  const heart = (x, y, s, fill) =>
    `<path transform="translate(${x},${y}) scale(${s})" d="M0,4 C-6,-2 -10,-6 -6,-9 C-3,-11 0,-8 0,-6 C0,-8 3,-11 6,-9 C10,-6 6,-2 0,4Z" fill="${fill}"/>`;

  const estrella4 = (x, y, r, fill, extra = '') =>
    `<path d="M${x},${y - r} Q${x + r * 0.18},${y - r * 0.18} ${x + r},${y} Q${x + r * 0.18},${y + r * 0.18} ${x},${y + r} Q${x - r * 0.18},${y + r * 0.18} ${x - r},${y} Q${x - r * 0.18},${y - r * 0.18} ${x},${y - r}Z" fill="${fill}" ${extra}/>`;

  // Contorno irregular (papel rasgado, sellos de cera)
  function bordeIrregular(cx, cy, r, jit, n) {
    let d = '';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rr = r + rnd(-jit, jit);
      d += `${i ? 'L' : 'M'}${f(cx + Math.cos(a) * rr)},${f(cy + Math.sin(a) * rr)} `;
    }
    return d + 'Z';
  }

  // Catmull-Rom -> Bézier (igual a Phaser.Curves.Spline, para que el camino dibujado coincida)
  function caminoSuave(pts) {
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${p2[0]},${p2[1]}`;
    }
    return d;
  }

  /* =====================================================================
   *  Angie — hoja de animación (13 cuadros de 80×96, a 2× de resolución)
   *  0-1 respirar · 2-7 correr · 8 subir · 9 caer · 10 aterrizar
   *  11 celebrar · 12 parpadeo. Mira a la derecha; pies en (40, 92).
   * ===================================================================== */
  const CUADRO = { w: 80, h: 96, pies: 92, escala: 2 };

  function poseAngie(p) {
    const q = Object.assign({ y: 0, sx: 1, sy: 1, pl: 0, pr: 0, ll: 0, lr: 0, capa: 0, capaY: 0, buf: [0, 0], trenza: 0, farol: [0, 0], arriba: false, ojos: 'abiertos' }, p);
    const piel = '#F8E6D6', pelo = '#6B4330', capa = '#EADFCB', bufanda = '#C9566E', bota = '#4A2E3A';
    let g = `<ellipse cx="0" cy="1" rx="${f(14 * q.sx)}" ry="3" fill="#000" opacity=".22"/>`;

    const fx = q.arriba ? 10.5 : 16.5 + q.farol[0];
    const fy = q.arriba ? -63 : -14.5 + q.farol[1];
    g += `<circle cx="${f(fx)}" cy="${f(fy + q.y)}" r="26" fill="url(#glowGold)" opacity=".8"/>`;
    g += `<g transform="translate(0,${f(q.y)}) scale(${q.sx},${q.sy})">`;

    // Trenza (espalda)
    [[-13, -38], [-15, -31], [-16.5, -24]].forEach(([bx, by], k) => {
      g += `<circle cx="${f(bx + q.trenza * (k + 1) * 0.7)}" cy="${f(by - Math.max(0, -q.trenza) * k * 0.6)}" r="3.3" fill="${pelo}" stroke="${INK}" stroke-width="1.4"/>`;
    });
    g += `<circle cx="${f(-17 + q.trenza * 2.1)}" cy="${f(-19.5 - Math.max(0, -q.trenza) * 1.2)}" r="2" fill="${bufanda}"/>`;

    // Cola de la bufanda (ondea hacia atrás)
    const ex = -19 + q.buf[0], ey = -28 + q.buf[1];
    const cola = `M-4,-35 Q${f(-12 + q.buf[0] * 0.4)},${f(-35 + q.buf[1] * 0.3)} ${f(ex)},${f(ey)}`;
    g += `<path d="${cola}" stroke="${INK}" stroke-width="7" fill="none" stroke-linecap="round"/><path d="${cola}" stroke="${bufanda}" stroke-width="4.2" fill="none" stroke-linecap="round"/>`;

    // Piernas con botas
    const pierna = (hx, ang, alza) => {
      const largo = 12 + alza;
      return `<g transform="translate(${hx},-12) rotate(${f(ang)})"><rect x="-2.6" y="0" width="5.2" height="${f(largo)}" rx="2.2" fill="${INK}"/><ellipse cx="1.3" cy="${f(largo - 0.5)}" rx="4.2" ry="2.5" fill="${bota}" stroke="${INK}" stroke-width="1.2"/></g>`;
    };
    g += pierna(-4, q.pl, q.ll) + pierna(4, q.pr, q.lr);

    // Capa
    const k = q.capa, cy = q.capaY;
    g += `<path d="M${f(-15 - k)},${f(-7 - cy)} C${f(-17 - k * 0.6)},-25 -12,-38 0,-40 C12,-38 17,-25 15,-7 C8,-3 ${f(-8 - k * 0.5)},${f(-3 - cy * 0.5)} ${f(-15 - k)},${f(-7 - cy)}Z" fill="${capa}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
    g += `<path d="M-5,-30 Q${f(-7 - k * 0.3)},-17 ${f(-8 - k * 0.6)},${f(-6 - cy * 0.6)} M6,-30 Q7,-17 8,-6" stroke="${INK}" stroke-width="1" opacity=".35" fill="none"/>`;
    g += `<path d="M${f(-15 - k)},${f(-7 - cy)} C${f(-8 - k * 0.5)},${f(-3 - cy * 0.5)} 8,-3 15,-7" stroke="#FFFFFF" stroke-width="1.2" opacity=".35" fill="none"/>`;

    // Bufanda al cuello
    g += `<path d="M-10,-38 Q0,-33 10,-38 L9,-34 Q0,-29 -9,-34Z" fill="${bufanda}" stroke="${INK}" stroke-width="1.3"/>`;

    // Farol
    const farol = (x, y) =>
      `<rect x="${f(x - 3.5)}" y="${f(y - 4.5)}" width="7" height="9" rx="2" fill="#F5C26B" stroke="${INK}" stroke-width="1.3"/>` +
      `<rect x="${f(x - 2.5)}" y="${f(y - 6.8)}" width="5" height="2.5" rx="1" fill="${INK}"/><circle cx="${f(x)}" cy="${f(y)}" r="2" fill="#FFF6DE"/>`;
    if (q.arriba) {
      const brazo = 'M7,-34 L10.5,-55';
      g += `<path d="${brazo}" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="${brazo}" stroke="${capa}" stroke-width="4.4" stroke-linecap="round"/>`;
      g += farol(10.5, -63);
    } else {
      g += `<path d="M12,-22 L${f(fx)},${f(fy - 6.8)}" stroke="${INK}" stroke-width="1.5"/>` + farol(fx, fy);
    }

    // Cabeza
    g += `<ellipse cx="0" cy="-52" rx="15" ry="15" fill="${pelo}" stroke="${INK}" stroke-width="2"/>`;
    g += `<circle cx="0" cy="-52" r="12.5" fill="${piel}" stroke="${INK}" stroke-width="2"/>`;
    g += `<ellipse cx="-12" cy="-46" rx="3.5" ry="8" fill="${pelo}" stroke="${INK}" stroke-width="1.3"/><ellipse cx="12" cy="-46" rx="3.5" ry="8" fill="${pelo}" stroke="${INK}" stroke-width="1.3"/>`;
    g += `<path d="M-13,-53 C-13,-66 13,-68 13,-53 C9,-59 4,-57 2,-61 C-1,-57 -6,-59 -13,-53Z" fill="${pelo}" stroke="${INK}" stroke-width="1.3"/>`;
    const ox = 1.2; // mirada hacia adelante
    if (q.ojos === 'feliz') {
      g += `<path d="M${-7 + ox},-49 q2.4,-3.2 4.8,0 M${2.2 + ox},-49 q2.4,-3.2 4.8,0" stroke="${INK}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
    } else if (q.ojos === 'cerrados') {
      g += `<path d="M${-6.8 + ox},-49.5 q2.2,1.4 4.4,0 M${2.4 + ox},-49.5 q2.2,1.4 4.4,0" stroke="${INK}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
    } else {
      g += `<ellipse cx="${-4.6 + ox}" cy="-50" rx="2.4" ry="3.4" fill="${INK}"/><ellipse cx="${4.6 + ox}" cy="-50" rx="2.4" ry="3.4" fill="${INK}"/>`;
      g += `<circle cx="${-3.8 + ox}" cy="-51.4" r="1.05" fill="#fff"/><circle cx="${5.4 + ox}" cy="-51.4" r="1.05" fill="#fff"/>`;
    }
    g += `<ellipse cx="-8.6" cy="-46" rx="2.6" ry="1.5" fill="#F09AA8" opacity=".75"/><ellipse cx="9.4" cy="-46" rx="2.6" ry="1.5" fill="#F09AA8" opacity=".75"/>`;
    g += q.ojos === 'feliz'
      ? `<path d="M-1.4,-45.4 Q${ox},-42.6 3.4,-45.4" stroke="${INK}" stroke-width="1.1" fill="#C9566E" stroke-linecap="round"/>`
      : `<path d="M-0.4,-45.6 Q${ox},-44.2 2.8,-45.6" stroke="${INK}" stroke-width="1" fill="none" stroke-linecap="round"/>`;
    return g + '</g>';
  }

  function angie() {
    const poses = [{}, { sy: 1.025, sx: 0.99, trenza: 0.5, farol: [0, 0.6], buf: [0, 1] }];
    for (let k = 0; k < 6; k++) {
      const t = (k / 6) * Math.PI * 2;
      const s = Math.sin(t);
      poses.push({
        y: -Math.abs(Math.sin(t)) * 2.2,
        pl: -32 * s, pr: 32 * s,
        ll: s < 0 ? 4 * s : 0, lr: s > 0 ? -4 * s : 0,
        capa: 6 + 2 * Math.sin(2 * t), capaY: 2 + 1.5 * Math.cos(2 * t),
        buf: [-5 + 2 * Math.sin(2 * t), -2 + 3 * Math.sin(2 * t)],
        trenza: -1.6, farol: [-1.5 + 2 * s, -0.5],
      });
    }
    poses.push({ sx: 0.93, sy: 1.08, pl: -28, pr: 18, ll: -5, lr: -3, capa: 2, capaY: -3, buf: [2, 7], trenza: 0.5, farol: [0, 2] }); // 8 subir
    poses.push({ sy: 1.02, pl: 14, pr: -12, capa: 3, capaY: 8, buf: [-2, -9], trenza: -1, farol: [-1, -3] }); // 9 caer
    poses.push({ sx: 1.14, sy: 0.86, pl: -14, pr: 14, capa: 2, capaY: -1, buf: [0, 3] }); // 10 aterrizar
    poses.push({ y: -3, sy: 1.04, arriba: true, ojos: 'feliz', capa: 2, capaY: 2, buf: [-2, -3], trenza: 0.8 }); // 11 celebrar
    poses.push({ ojos: 'cerrados' }); // 12 parpadeo
    let s = '';
    poses.forEach((p, i) => { s += `<g transform="translate(${i * CUADRO.w + CUADRO.w / 2},${CUADRO.pies})">${poseAngie(p)}</g>`; });
    const d = doc(CUADRO.w * poses.length, CUADRO.h, s, '', CUADRO.escala);
    d.cuadros = { n: poses.length, w: CUADRO.w * CUADRO.escala, h: CUADRO.h * CUADRO.escala, pies: CUADRO.pies * CUADRO.escala };
    return d;
  }

  /* =====================================================================
   *  Portada: el prado del amanecer (1560 de ancho; se ve el centro)
   * ===================================================================== */
  const ANCHO_MAX = 1560;
  const SUELO_INTRO = 640;

  function introFondo() {
    semilla(11);
    const W0 = ANCHO_MAX, H0 = 844, cx = W0 / 2;
    let s = `<rect width="${W0}" height="${H0}" fill="url(#cielo)"/>`;
    s += `<circle cx="${cx + 120}" cy="330" r="320" fill="url(#glowCream)" opacity=".9"/><circle cx="${cx + 120}" cy="330" r="46" fill="#FFF8E6"/>`;
    s += rays({ ox: cx + 120, oy: 330, count: 12, len: 950, angle: 115, spread: 120, color: '#FFF4DC', op: 0.3 });
    s += ridge({ x1: W0, base: 440, amp: 110, color: '#D9B2AB', bottom: H0, op: 0.85, filter: 'b1' });
    s += `<rect y="385" width="${W0}" height="120" fill="url(#niebla)" filter="url(#b8)"/>`;
    const mid = '#B98A8E';
    s += tower(cx - 262, 482, 28, 112, mid, '#E9C2B0') + arch(cx + 150, 488, 24, 74, mid, true, 9) + arch(cx + 215, 492, 20, 58, mid, false, 8);
    s += tower(cx - 620, 488, 22, 84, mid) + arch(cx - 470, 492, 18, 52, mid, false, 7) + arch(cx + 520, 490, 22, 66, mid, true, 8) + tower(cx + 650, 490, 18, 72, mid);
    s += ridge({ x1: W0, base: 508, amp: 48, color: mid, bottom: H0 });
    s += `<rect y="470" width="${W0}" height="100" fill="url(#niebla)" opacity=".8" filter="url(#b8)"/>`;
    s += ridge({ x1: W0, base: 566, amp: 22, color: '#D4A56E', bottom: H0, freqs: [[0.02, 1], [0.06, 0.4]] });
    s += grass({ x0: -5, x1: W0 + 5, base: 590, hMin: 14, hMax: 38, count: 900, color: '#C08E58', op: 0.9, lean: 6 });
    s += grass({ x0: -5, x1: W0 + 5, base: 596, hMin: 10, hMax: 26, count: 480, color: '#EAC690', op: 0.75, lean: 5 });

    // Suelo oscuro con borde iluminado (plano en el centro, donde está Angie)
    const top = (x) => SUELO_INTRO + Math.min(1, Math.abs(x - cx) / 220) * (6 * Math.sin(x * 0.013) + 4 * Math.sin(x * 0.041 + 1));
    let d = `M-10,${H0}`, e = '';
    for (let x = -10; x <= W0 + 10; x += 8) {
      const y = f(top(x));
      d += ` L${x},${y}`;
      e += `${e ? ' L' : 'M'}${x},${y}`;
    }
    d += ` L${W0 + 10},${H0} Z`;
    s += `<path d="${d}" fill="url(#tierra)" stroke="${INK}" stroke-width="2.5"/><path d="${e}" stroke="#F7CF9C" stroke-width="2" fill="none"/>`;
    s += grass({ x0: -5, x1: W0 + 5, base: (x) => top(x) + 2, hMin: 5, hMax: 17, count: 420, color: '#24161E', lean: 4, wMin: 1.5, wMax: 3.5 });
    s += grass({ x0: -5, x1: W0 + 5, base: (x) => top(x) + 2, hMin: 4, hMax: 11, count: 160, color: '#EDBB7E', op: 0.7, lean: 3, wMin: 1, wMax: 2 });
    for (let k = 0; k < 46; k++) {
      const x = rnd(0, W0);
      if (Math.abs(x - cx) < 40) continue;
      s += flower(x, top(x) - 9, 2.2, pick(['#FFF1D6', '#F2A7B5']));
    }
    for (let k = 0; k < 40; k++) {
      s += `<ellipse cx="${f(rnd(0, W0))}" cy="${f(rnd(680, 840))}" rx="${f(rnd(6, 18))}" ry="${f(rnd(3, 7))}" fill="#000" opacity=".12"/>`;
    }
    return doc(W0, H0, s,
      lg('cielo', [[0, '#E2B7B0'], [0.38, '#F2CFB3'], [0.62, '#FBE8C6'], [1, '#F6DDB7']]) +
      lg('tierra', [[0, '#6A4650'], [0.2, '#43293A'], [1, '#1A1017']]) +
      lg('niebla', [[0, '#FBEAD2', 0], [0.5, '#FBEAD2', 0.75], [1, '#FBEAD2', 0]]));
  }

  // Mata de hierba oscura para el primer plano (se coloca en los bordes de la pantalla)
  function mata() {
    semilla(7);
    let s = grass({ x0: 0, x1: 190, base: 400, hMin: 110, hMax: 330, count: 30, color: '#120B10', op: 0.97, lean: 40, wMin: 7, wMax: 15, filter: 'b3' });
    s += grass({ x0: 0, x1: 120, base: 400, hMin: 60, hMax: 160, count: 18, color: '#1B1118', op: 1, lean: 20, wMin: 5, wMax: 10, filter: 'b3' });
    return doc(240, 380, s);
  }

  // Rama con hojas para la esquina superior
  function rama() {
    semilla(9);
    let s = `<g filter="url(#b3)" opacity=".95"><path d="M-20,40 C60,18 140,52 230,26 C244,22 248,34 236,40 C150,72 70,58 -20,84 Z" fill="#1A1016"/>`;
    for (let k = 0; k < 16; k++) {
      const x = rnd(10, 230), y = rnd(30, 80);
      s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rnd(8, 12))}" ry="${f(rnd(3.5, 5))}" fill="#1A1016" transform="rotate(${f(rnd(-50, 50))} ${f(x)} ${f(y)})"/>`;
    }
    return doc(300, 130, s + '</g>');
  }

  function vineta() {
    return doc(256, 256, '<rect width="256" height="256" fill="url(#vin)"/>',
      '<radialGradient id="vin" cx=".5" cy=".45" r=".75"><stop offset=".55" stop-color="#140c12" stop-opacity="0"/><stop offset="1" stop-color="#140c12" stop-opacity=".62"/></radialGradient>');
  }

  /* =====================================================================
   *  Mapa: fondo nocturno + pergamino con el viaje dibujado a tinta
   * ===================================================================== */
  // Coordenadas dentro del papel (380×740)
  const PAPEL = { w: 380, h: 740, margen: 20 };
  const RUTA = [[190, 680], [100, 600], [280, 470], [100, 335], [280, 205], [190, 104]];
  const ZONAS = [
    { x: 175, y: 628, w: 330, h: 120 }, // I prado
    { x: 285, y: 482, w: 210, h: 170 }, // II pueblo
    { x: 120, y: 375, w: 250, h: 130 }, // III bosque
    { x: 285, y: 205, w: 210, h: 160 }, // IV ruinas
  ];

  function mapaFondo() {
    semilla(31);
    const W0 = ANCHO_MAX, H0 = 844;
    let s = `<rect width="${W0}" height="${H0}" fill="url(#noche)"/>`;
    s += dots({ x0: 0, x1: W0, y0: 0, y1: 520, count: 220, rMin: 0.4, rMax: 1.3, colors: ['#FFF1D6', '#DDE4FF'], op: 0.8 });
    s += '<g filter="url(#b16)">';
    for (let k = 0; k < 46; k++) {
      s += `<circle cx="${f(rnd(0, W0))}" cy="${f(rnd(80, H0))}" r="${f(rnd(18, 70))}" fill="${pick(['#F5C26B', '#F2A7B5', '#B59CFF'])}" opacity="${f(rnd(0.05, 0.16))}"/>`;
    }
    s += '</g>';
    s += `<circle cx="${W0 / 2}" cy="${H0 / 2}" r="520" fill="url(#glowGold)" opacity=".12"/>`;
    return doc(W0, H0, s, lg('noche', [[0, '#120D1C'], [0.55, '#271B33'], [1, '#3A2838']]));
  }

  function pergamino() {
    semilla(17);
    const m = PAPEL.margen, W0 = PAPEL.w + m * 2, H0 = PAPEL.h + m * 2;
    const P = (x, y) => [x + m, y + m];

    // Papel con bordes rasgados
    const pts = [];
    for (let t = 0; t <= PAPEL.w; t += 10) pts.push([m + t, m + rnd(-2.5, 2.5)]);
    for (let t = 10; t <= PAPEL.h; t += 10) pts.push([m + PAPEL.w + rnd(-2.5, 2.5), m + t]);
    for (let t = PAPEL.w - 10; t >= 0; t -= 10) pts.push([m + t, m + PAPEL.h + rnd(-2.5, 2.5)]);
    for (let t = PAPEL.h - 10; t > 0; t -= 10) pts.push([m + rnd(-2.5, 2.5), m + t]);
    const papel = 'M' + pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' L') + ' Z';

    let s = `<path d="${papel}" fill="#000" opacity=".5" filter="url(#b16)" transform="translate(6,12)"/>`;
    s += `<path d="${papel}" fill="url(#papel)" stroke="#8C6A48" stroke-width="1.2"/>`;
    s += `<g clip-path="url(#recorte)">`;
    for (let k = 0; k < 14; k++) {
      s += `<circle cx="${f(rnd(m, m + PAPEL.w))}" cy="${f(rnd(m, m + PAPEL.h))}" r="${f(rnd(20, 70))}" fill="#B99368" opacity="${f(rnd(0.06, 0.16))}" filter="url(#b16)"/>`;
    }
    for (let k = 0; k < 60; k++) {
      const x = rnd(m, m + PAPEL.w), y = rnd(m, m + PAPEL.h);
      s += `<path d="M${f(x)},${f(y)} l${f(rnd(-14, 14))},${f(rnd(-3, 3))}" stroke="#A88A63" stroke-width=".5" opacity=".35"/>`;
    }
    s += '</g>';
    s += `<rect x="${m + 14}" y="${m + 14}" width="${PAPEL.w - 28}" height="${PAPEL.h - 28}" fill="none" stroke="${SEPIA}" stroke-width="1.4" opacity=".75"/>`;
    s += `<rect x="${m + 19}" y="${m + 19}" width="${PAPEL.w - 38}" height="${PAPEL.h - 38}" fill="none" stroke="${SEPIA}" stroke-width=".6" opacity=".6"/>`;

    const tinta = `stroke="${SEPIA}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"`;

    // I · Prado del amanecer: colinas, sol naciente, torre en ruinas
    const [sx, sy] = P(300, 652);
    s += `<path d="M${sx - 20},${sy} A20,20 0 0 1 ${sx + 20},${sy}" fill="${LAVADO}" ${tinta}/>`;
    for (let k = 0; k < 7; k++) {
      const a = Math.PI + (k + 0.5) * Math.PI / 7;
      s += `<path d="M${f(sx + Math.cos(a) * 25)},${f(sy + Math.sin(a) * 25)} L${f(sx + Math.cos(a) * 33)},${f(sy + Math.sin(a) * 33)}" ${tinta}/>`;
    }
    let colina = `M${P(26, 660).join(',')}`;
    for (let x = 26; x <= 354; x += 8) colina += ` L${P(x, 652 - 7 * Math.sin((x - 26) * 0.035) - 3 * Math.sin(x * 0.11)).map(f).join(',')}`;
    s += `<path d="${colina}" fill="none" ${tinta}/>`;
    const [tx, ty] = P(30, 612);
    s += `<path d="M${tx},${ty} V${ty - 44} l4,-6 l4,5 l5,-9 l4,8 l3,-4 V${ty}" fill="${LAVADO}" ${tinta}/><path d="M${tx + 7},${ty - 22} v-7 a3,3 0 0 1 6,0 v7z" fill="${SEPIA}"/>`;
    for (let k = 0; k < 9; k++) {
      const [gx, gy] = P(rnd(150, 240), rnd(626, 640));
      s += `<path d="M${f(gx)},${f(gy)} l-2,-6 M${f(gx)},${f(gy)} l1,-7 M${f(gx)},${f(gy)} l3,-5" stroke="${SEPIA}" stroke-width="1" fill="none"/>`;
    }

    // II · Pueblo de los faroles
    [[214, 22, 26, 12], [240, 26, 32, 14], [270, 24, 24, 12], [296, 30, 34, 16], [328, 22, 26, 12]].forEach(([x, w, h, r]) => {
      const [hx, hy] = P(x, 545);
      s += `<path d="M${hx},${hy} V${hy - h} L${hx + w / 2},${hy - h - r} L${hx + w},${hy - h} V${hy}Z" fill="${LAVADO}" ${tinta}/><rect x="${hx + w / 2 - 3}" y="${hy - h + 7}" width="6" height="7" fill="${SEPIA}" opacity=".7"/>`;
    });
    // Faroles en postes a los lados del pueblo
    [[200, 545], [362, 545]].forEach(([x, b]) => {
      const [px, py] = P(x, b);
      s += `<path d="M${px},${py} V${py - 38} h7" fill="none" ${tinta}/><rect x="${px + 4}" y="${py - 36}" width="6" height="8" rx="1.5" fill="${LAVADO}" ${tinta.replace('1.6', '1.1')}/>`;
    });

    // III · Bosque antiguo
    [[22, 400, 46], [50, 410, 58], [148, 416, 40], [176, 404, 52], [206, 418, 38], [232, 410, 30]].forEach(([x, b, h]) => {
      const [px, py] = P(x, b);
      s += `<path d="M${px},${py - h} L${px + h * 0.32},${py - 6} L${px - h * 0.32},${py - 6}Z M${px},${py - h * 0.66} L${px + h * 0.4},${py - h * 0.12} L${px - h * 0.4},${py - h * 0.12}Z" fill="${LAVADO}" ${tinta}/><path d="M${px},${py - 6} V${py}" ${tinta}/>`;
    });
    [[30, 300, 14], [58, 290, 11]].forEach(([x, y, r]) => {
      const [px, py] = P(x, y);
      s += `<circle cx="${px}" cy="${py}" r="${r}" fill="${LAVADO}" ${tinta}/><path d="M${px},${py + r} V${py + r + 9}" ${tinta}/>`;
    });

    // IV · Ruinas bajo las estrellas
    [[226, 262, 56], [334, 250, 44]].forEach(([x, y, w]) => {
      const [px, py] = P(x, y);
      s += `<path d="M${px - w / 2},${py} L${px + w / 2},${py} L${f(px + w * 0.15)},${f(py + w * 0.45)} L${f(px - w * 0.1)},${f(py + w * 0.3)}Z" fill="${LAVADO}" ${tinta}/>`;
    });
    const [rx, ry] = P(214, 262);
    s += `<path d="M${rx},${ry} V${ry - 18} A8,8 0 0 1 ${rx + 14},${ry - 22}" fill="none" ${tinta}/>`;
    [[226, 160, 6], [252, 136, 4.5], [318, 146, 5.5], [352, 172, 4], [300, 118, 3.5], [200, 190, 3.5]].forEach(([x, y, r]) => {
      const [px, py] = P(x, y);
      s += estrella4(px, py, r, SEPIA);
    });
    const [lx, ly] = P(346, 126);
    s += `<path d="M${lx},${ly - 12} A12,12 0 1 0 ${lx + 7},${ly + 9} A9,9 0 1 1 ${lx},${ly - 12}Z" fill="${LAVADO}" ${tinta}/>`;

    // Cima: campo de flores
    for (let k = 0; k < 22; k++) {
      const [px, py] = P(rnd(120, 262), rnd(118, 134));
      s += `<circle cx="${f(px)}" cy="${f(py)}" r="2" fill="none" stroke="${SEPIA}" stroke-width="1"/>`;
    }

    // Rosa de los vientos
    const [cx, cy] = P(52, 104);
    s += `<circle cx="${cx}" cy="${cy}" r="22" fill="none" stroke="${SEPIA}" stroke-width="1" opacity=".8"/>`;
    s += estrella4(cx, cy, 20, LAVADO, `stroke="${SEPIA}" stroke-width="1.2"`) + estrella4(cx, cy, 9, SEPIA);
    s += `<path d="M${cx},${cy - 30} l-3,6 h6z" fill="${SEPIA}"/>`;

    // Camino punteado
    s += `<path d="${caminoSuave(RUTA.map(([x, y]) => P(x, y)))}" fill="none" stroke="#7A5A40" stroke-width="2.4" stroke-dasharray="0.1 8" stroke-linecap="round"/>`;

    return doc(W0, H0, s,
      `<radialGradient id="papel" cx=".5" cy=".5" r=".75"><stop offset="0" stop-color="#F6EBD3"/><stop offset=".7" stop-color="#EEDDBA"/><stop offset="1" stop-color="#D7BC90"/></radialGradient>` +
      `<clipPath id="recorte"><path d="${papel}"/></clipPath>`);
  }

  // Mancha de acuarela que "colorea" un lugar del mapa al completarlo
  function mapaColor(i) {
    semilla(50 + i);
    const z = ZONAS[i];
    const colores = [
      ['#F2A07E', '#F7C873', '#E98AA0'],
      ['#B9A0E6', '#F5B26B', '#E7A6C8'],
      ['#7CCBA2', '#B8E39A', '#5FAE8C'],
      ['#6F7FD6', '#F5C26B', '#7FE0C2'],
    ][i];
    let s = '<g filter="url(#b8)">';
    for (let k = 0; k < 9; k++) {
      s += `<ellipse cx="${f(rnd(z.w * 0.25, z.w * 0.75))}" cy="${f(rnd(z.h * 0.3, z.h * 0.7))}" rx="${f(rnd(z.w * 0.15, z.w * 0.32))}" ry="${f(rnd(z.h * 0.18, z.h * 0.3))}" fill="${pick(colores)}" opacity="${f(rnd(0.35, 0.6))}"/>`;
    }
    return doc(z.w, z.h, s + '</g>');
  }

  /* ---------- Sellos de las paradas ---------- */
  function sello(color, oscuro) {
    semilla(3);
    let s = `<path d="${bordeIrregular(36, 36, 27, 1.8, 26)}" fill="${color}" stroke="${INK}" stroke-width="2"/>`;
    s += `<circle cx="36" cy="36" r="20" fill="none" stroke="${oscuro}" stroke-width="1.6" opacity=".6"/>`;
    s += `<ellipse cx="28" cy="25" rx="8" ry="4" fill="#FFFFFF" opacity=".3" transform="rotate(-25 28 25)"/>`;
    return doc(72, 72, s, '', 2);
  }

  function selloBloqueado() {
    let s = `<circle cx="36" cy="36" r="22" fill="#EADBBE" stroke="${SEPIA}" stroke-width="1.6" stroke-dasharray="3 3"/>`;
    s += `<path d="M30,34 v-5 a6,6 0 0 1 12,0 v5" fill="none" stroke="${SEPIA}" stroke-width="2.2"/><rect x="27" y="33" width="18" height="13" rx="3" fill="${SEPIA}"/><circle cx="36" cy="39" r="2" fill="#EADBBE"/>`;
    return doc(72, 72, s, '', 2);
  }

  function llaveDibujo(x, y, esc) {
    return `<g transform="translate(${x},${y}) scale(${esc})">` +
      `<rect x="-6" y="-3.5" width="34" height="7" rx="3" fill="url(#oro)" stroke="${INK}" stroke-width="1.8"/>` +
      `<path d="M18,3 v7 h4 v-7 M24,3 v5 h3 v-5" fill="url(#oro)" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>` +
      `<circle cx="-12" cy="0" r="11" fill="url(#oro)" stroke="${INK}" stroke-width="2"/>` +
      heart(-12, 0.5, 0.75, '#C9566E') +
      `<path d="M-4,-2.5 H24" stroke="#FFF6DE" stroke-width="1.2" opacity=".7"/><circle cx="-16" cy="-5" r="2.4" fill="#FFF6DE" opacity=".8"/></g>`;
  }
  const ORO = lg('oro', [[0, '#FFE7A8'], [0.5, '#F5C26B'], [1, '#C98B2E']]);

  function selloHecho() {
    semilla(4);
    let s = `<path d="${bordeIrregular(36, 36, 27, 1.8, 26)}" fill="#F3D27E" stroke="${INK}" stroke-width="2"/>`;
    s += `<circle cx="36" cy="36" r="20" fill="none" stroke="#B5832E" stroke-width="1.6" opacity=".7"/>`;
    s += llaveDibujo(38, 37, 0.62);
    return doc(72, 72, `<g transform="rotate(-30 36 36)">${s}</g>`, ORO, 2);
  }

  function llave() {
    return doc(64, 32, llaveDibujo(22, 16, 1), ORO, 2);
  }

  function cofreMapa() {
    const s = `<circle cx="32" cy="30" r="30" fill="url(#glowGold)" opacity=".6"/>` +
      `<path d="M10,26 Q32,6 54,26 Z" fill="#9C5B2E" stroke="${INK}" stroke-width="2"/>` +
      `<rect x="10" y="26" width="44" height="22" rx="3" fill="#7A4A2A" stroke="${INK}" stroke-width="2"/>` +
      `<rect x="18" y="14" width="5" height="34" fill="#F5C26B" stroke="${INK}" stroke-width="1.2"/><rect x="41" y="14" width="5" height="34" fill="#F5C26B" stroke="${INK}" stroke-width="1.2"/>` +
      `<rect x="27" y="23" width="10" height="11" rx="2" fill="#F5C26B" stroke="${INK}" stroke-width="1.4"/>` + heart(32, 28.5, 0.32, '#C9566E');
    return doc(64, 54, s, '', 2);
  }

  /* ---------- Iconos de la interfaz (crema, para discos oscuros) ---------- */
  function icono(tipo) {
    const c = '#FFF1D6';
    let s = '';
    if (tipo === 'casa') {
      s = `<path d="M16,6 L28,16 H24 V26 H8 V16 H4 Z" fill="${c}"/><rect x="13" y="18" width="6" height="8" fill="#3A2833"/>`;
    } else {
      s = `<path d="M5,12 H10 L17,6 V26 L10,20 H5 Z" fill="${c}"/>`;
      s += tipo === 'sonido'
        ? `<path d="M21,11 q4,5 0,10 M24,8 q7,8 0,16" stroke="${c}" stroke-width="2" fill="none" stroke-linecap="round"/>`
        : `<path d="M21,12 L28,20 M28,12 L21,20" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/>`;
    }
    return doc(32, 32, s, '', 2);
  }

  /* ---------- Catálogo que carga Boot ---------- */
  function catalogo() {
    return {
      angie: angie(),
      intro_fondo: introFondo(),
      mata: mata(),
      rama: rama(),
      vineta: vineta(),
      mapa_fondo: mapaFondo(),
      pergamino: pergamino(),
      mapa_color_0: mapaColor(0),
      mapa_color_1: mapaColor(1),
      mapa_color_2: mapaColor(2),
      mapa_color_3: mapaColor(3),
      sello_0: sello('#C9566E', '#7A2840'),
      sello_1: sello('#8E6BC0', '#4A3470'),
      sello_2: sello('#4E9F7E', '#1F4F45'),
      sello_3: sello('#D9A23E', '#7A5212'),
      sello_bloq: selloBloqueado(),
      sello_hecho: selloHecho(),
      llave: llave(),
      cofre_mapa: cofreMapa(),
      ico_casa: icono('casa'),
      ico_sonido: icono('sonido'),
      ico_mudo: icono('mudo'),
    };
  }

  return { catalogo, ANCHO_MAX, SUELO_INTRO, PAPEL, RUTA, ZONAS };
})();
