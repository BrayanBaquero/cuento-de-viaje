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
   *  11 celebrar · 12 parpadeo · 13 planear. Mira a la derecha; pies en (40, 92).
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
    poses.push({ y: -2, sy: 0.97, sx: 1.04, pl: -18, pr: 10, ll: -3, capa: 17, capaY: -11, buf: [-9, -12], trenza: -2, farol: [-1, -3] }); // 13 planear
    let s = '';
    poses.forEach((p, i) => { s += `<g transform="translate(${i * CUADRO.w + CUADRO.w / 2},${CUADRO.pies})">${poseAngie(p)}</g>`; });
    const d = doc(CUADRO.w * poses.length, CUADRO.h, s, '', CUADRO.escala);
    d.cuadros = { n: poses.length, w: CUADRO.w * CUADRO.escala, h: CUADRO.h * CUADRO.escala, pies: CUADRO.pies * CUADRO.escala };
    return d;
  }

  /* =====================================================================
   *  Brayan — aparece en el final (mismo estilo y cuadro que Angie, 80×96)
   *  0-1 respirar · 2-7 caminar · 8 enamorado · 9 de la mano.
   *  Mira a la derecha; pies en (40, 92).
   * ===================================================================== */
  function poseBrayan(p) {
    const q = Object.assign({ y: 0, sy: 1, pl: 0, pr: 0, ll: 0, lr: 0, brazo: 0, mano: false, ojos: 'abiertos' }, p);
    const piel = '#EFCFB4', pelo = '#2A1E1A', chaqueta = '#2E2A36', jean = '#55555F', tenis = '#D9D6CF';
    let g = `<ellipse cx="0" cy="1" rx="14" ry="3" fill="#000" opacity=".22"/>`;
    g += `<g transform="translate(0,${f(q.y)}) scale(1,${q.sy})">`;
    const pierna = (hx, ang, alza) => {
      const largo = 13 + alza;
      return `<g transform="translate(${hx},-13) rotate(${f(ang)})"><rect x="-3" y="0" width="6" height="${f(largo)}" rx="2.4" fill="${jean}" stroke="${INK}" stroke-width="1.2"/><ellipse cx="1.6" cy="${f(largo - 0.3)}" rx="4.8" ry="2.6" fill="${tenis}" stroke="${INK}" stroke-width="1.2"/></g>`;
    };
    g += pierna(-4, q.pl, q.ll) + pierna(4, q.pr, q.lr);
    // Brazo de atrás
    g += `<path d="M-9,-33 L${f(-11 - q.brazo * 0.4)},-16" stroke="${INK}" stroke-width="6.6" stroke-linecap="round"/><path d="M-9,-33 L${f(-11 - q.brazo * 0.4)},-16" stroke="${chaqueta}" stroke-width="4" stroke-linecap="round"/>`;
    // Chaqueta
    g += `<path d="M-13,-10 L-12,-35 Q0,-41 12,-35 L13,-10 Q0,-6 -13,-10 Z" fill="${chaqueta}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
    g += `<path d="M0,-37 V-9" stroke="#8E8A99" stroke-width="1" opacity=".7"/><path d="M-6,-38 L0,-32 L6,-38" fill="none" stroke="#8E8A99" stroke-width="1.2"/>`;
    g += `<path d="M-13,-10 Q0,-6 13,-10" stroke="#FFFFFF" stroke-width="1" opacity=".18" fill="none"/>`;
    // Brazo de adelante (balanceo o extendido para tomar la mano)
    const fin = q.mano ? [21, -24] : [f(11 + q.brazo * 0.4), -15];
    g += `<path d="M8,-33 L${fin[0]},${fin[1]}" stroke="${INK}" stroke-width="6.6" stroke-linecap="round"/><path d="M8,-33 L${fin[0]},${fin[1]}" stroke="${chaqueta}" stroke-width="4" stroke-linecap="round"/>`;
    g += `<circle cx="${q.mano ? 23 : fin[0]}" cy="${fin[1] + (q.mano ? 0 : 1.5)}" r="2.8" fill="${piel}" stroke="${INK}" stroke-width="1.2"/>`;
    // Cabeza
    g += `<rect x="-3" y="-42" width="6" height="5" fill="${piel}" stroke="${INK}" stroke-width="1.2"/>`;
    g += `<circle cx="-12.4" cy="-51" r="2.6" fill="${piel}" stroke="${INK}" stroke-width="1.2"/><circle cx="12.4" cy="-51" r="2.6" fill="${piel}" stroke="${INK}" stroke-width="1.2"/>`;
    g += `<circle cx="0" cy="-52" r="12.5" fill="${piel}" stroke="${INK}" stroke-width="2"/>`;
    // Barba ligera
    g += `<path d="M-9,-48 Q-8,-40 0,-39 Q8,-40 9,-48 Q5,-43 0,-43 Q-5,-43 -9,-48 Z" fill="#6B5048" opacity=".28"/>`;
    // Cabello oscuro corto
    g += `<path d="M-13.5,-52 C-15,-67 11,-71 14,-56 L13,-52 C11,-58 8,-60 4,-59 C1,-63 -4,-61 -7,-58 C-9,-57 -11,-55 -13.5,-52 Z" fill="${pelo}" stroke="${INK}" stroke-width="1.3"/>`;
    g += `<path d="M-6,-63 l3,-4 l2,4 M2,-64 l3,-4 l2,5" fill="${pelo}" stroke="${INK}" stroke-width="1"/>`;
    // Cejas
    g += `<path d="M-7.5,-56 h4.6 M3.6,-56 h4.6" stroke="${pelo}" stroke-width="1.8" stroke-linecap="round"/>`;
    const ox = 1.2;
    if (q.ojos === 'corazon') {
      g += heart(-4.4 + ox, -50, 0.36, '#E2546E') + heart(4.8 + ox, -50, 0.36, '#E2546E');
      g += `<ellipse cx="-8.4" cy="-45.6" rx="2.8" ry="1.6" fill="#F09AA8" opacity=".85"/><ellipse cx="9.2" cy="-45.6" rx="2.8" ry="1.6" fill="#F09AA8" opacity=".85"/>`;
    } else if (q.ojos === 'feliz') {
      g += `<path d="M${-7 + ox},-49.5 q2.4,-3 4.8,0 M${2.2 + ox},-49.5 q2.4,-3 4.8,0" stroke="${INK}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
    } else {
      g += `<ellipse cx="${-4.6 + ox}" cy="-50" rx="2.2" ry="3" fill="${INK}"/><ellipse cx="${4.6 + ox}" cy="-50" rx="2.2" ry="3" fill="${INK}"/>`;
      g += `<circle cx="${-3.9 + ox}" cy="-51.2" r=".9" fill="#fff"/><circle cx="${5.3 + ox}" cy="-51.2" r=".9" fill="#fff"/>`;
    }
    g += q.ojos === 'abiertos'
      ? `<path d="M-1,-44.6 Q${ox},-43.2 3.2,-44.6" stroke="${INK}" stroke-width="1.1" fill="none" stroke-linecap="round"/>`
      : `<path d="M-2,-45 Q${ox},-41.4 4.2,-45" stroke="${INK}" stroke-width="1.2" fill="#C9566E" stroke-linecap="round"/>`;
    return g + '</g>';
  }

  function brayan() {
    const poses = [{}, { sy: 1.02 }];
    for (let k = 0; k < 6; k++) {
      const s = Math.sin((k / 6) * Math.PI * 2);
      poses.push({ y: -Math.abs(s) * 2.2, pl: -30 * s, pr: 30 * s, ll: s < 0 ? 4 * s : 0, lr: s > 0 ? -4 * s : 0, brazo: 10 * s });
    }
    poses.push({ ojos: 'corazon', sy: 1.03 }); // 8 enamorado
    poses.push({ ojos: 'corazon', mano: true }); // 9 de la mano
    let s = '';
    poses.forEach((p, i) => { s += `<g transform="translate(${i * CUADRO.w + CUADRO.w / 2},${CUADRO.pies})">${poseBrayan(p)}</g>`; });
    const d = doc(CUADRO.w * poses.length, CUADRO.h, s, '', CUADRO.escala);
    d.cuadros = { n: poses.length, w: CUADRO.w * CUADRO.escala, h: CUADRO.h * CUADRO.escala };
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

  /* =====================================================================
   *  Niveles: capas de paralaje por etapa, terreno orgánico y objetos
   * ===================================================================== */
  const L = 1024; // ancho de cada mosaico de paralaje (se repite sin costuras)

  // Cresta que empata en x=0 y x=L (frecuencias enteras)
  function crestaCiclica({ base, amp, ks = [[2, 1], [5, 0.45], [11, 0.18]], color, op = 1, filter = '', paso = 8 }) {
    const ph = ks.map(() => rnd(0, 6.28));
    // Se dibuja un poco más allá de los bordes para que el desenfoque no deje costuras
    let d = `M-48,844 `;
    for (let x = -48; x <= L + 48; x += paso) {
      let y = base;
      ks.forEach(([k, a], i) => { y -= amp * a * (0.5 + 0.5 * Math.sin((x / L) * Math.PI * 2 * k + ph[i])); });
      d += `L${x},${f(y)} `;
    }
    d += `L${L + 48},844 Z`;
    return `<path d="${d}" fill="${color}" opacity="${op}"${filter ? ` filter="url(#${filter})"` : ''}/>`;
  }

  // Repite un dibujo cerca de los bordes para que el mosaico no tenga costuras
  const ciclico = (x, margen, dibujar) => {
    let s = dibujar(x);
    if (x < margen) s += dibujar(x + L);
    if (x > L - margen) s += dibujar(x - L);
    return s;
  };

  function hierbaCiclica({ base, hMin, hMax, count, color, op = 1, lean = 5, wMin = 2, wMax = 5 }) {
    let d = '';
    for (let i = 0; i < count; i++) {
      const x0 = rnd(0, L), h = rnd(hMin, hMax), w = rnd(wMin, wMax), l = rnd(-lean, lean);
      d += ciclico(x0, 20, (x) => `M${f(x)},${base} Q${f(x + l * 0.3)},${f(base - h * 0.6)} ${f(x + l)},${f(base - h)} Q${f(x + w + l * 0.3)},${f(base - h * 0.5)} ${f(x + w)},${base}Z`);
    }
    return `<path d="${d}" fill="${color}" opacity="${op}"/>`;
  }

  const niebla = (y, h, color, op = 0.8) =>
    `<rect x="-60" y="${y}" width="${L + 120}" height="${h}" fill="url(#niebla)" opacity="${op}" filter="url(#b8)"/>`;

  // Repite un grupo desplazado ±L (para trazos desenfocados que cruzan el borde)
  const repetido = (contenido) => `<g>${contenido}</g><g transform="translate(${L},0)">${contenido}</g><g transform="translate(${-L},0)">${contenido}</g>`;

  const nieblaDef = (c) => lg('niebla', [[0, c, 0], [0.5, c, 0.75], [1, c, 0]]);

  function casa(x, base, w, h, techo, color, ventana) {
    let s = `<path d="M${f(x)},${base} V${f(base - h)} L${f(x + w / 2)},${f(base - h - techo)} L${f(x + w)},${f(base - h)} V${base} Z" fill="${color}"/>`;
    if (ventana) {
      const wx = x + w / 2 - 4, wy = base - h * 0.62;
      s += `<circle cx="${f(wx + 4)}" cy="${f(wy + 5)}" r="16" fill="url(#glowGold)" opacity=".85"/><rect x="${f(wx)}" y="${f(wy)}" width="8" height="10" rx="1.5" fill="${ventana}"/>`;
    }
    return s;
  }

  function tronco(x, base, w, top, color) {
    return `<path d="M${f(x - w * 0.9)},${base} Q${f(x - w * 0.5)},${base - 14} ${f(x - w / 2)},${base - 30} L${f(x - w * 0.42)},${top} L${f(x + w * 0.42)},${top} L${f(x + w / 2)},${base - 30} Q${f(x + w * 0.5)},${base - 14} ${f(x + w * 0.9)},${base} Z" fill="${color}"/>`;
  }

  function islaFlotante(x, y, w, color, borde) {
    return `<path d="M${f(x - w / 2)},${y} Q${x},${y - 6} ${f(x + w / 2)},${y} L${f(x + w * 0.28)},${f(y + w * 0.32)} L${f(x + w * 0.05)},${f(y + w * 0.6)} L${f(x - w * 0.18)},${f(y + w * 0.3)} Z" fill="${color}"/>` +
      `<path d="M${f(x - w / 2)},${y} Q${x},${y - 6} ${f(x + w / 2)},${y}" stroke="${borde}" stroke-width="1.6" fill="none" opacity=".85"/>`;
  }

  // Sol, luna o rayos de cada etapa (700×700, fijo en pantalla)
  function astro(i) {
    semilla(200 + i);
    let s = '';
    if (i === 0) {
      s += `<circle cx="350" cy="350" r="330" fill="url(#glowCream)" opacity=".95"/><circle cx="350" cy="350" r="46" fill="#FFF8E6"/>`;
      s += rays({ ox: 350, oy: 350, count: 9, len: 700, angle: 118, spread: 80, color: '#FFF4DC', op: 0.32 });
    } else if (i === 1) {
      s += `<circle cx="350" cy="350" r="330" fill="url(#glowCream)" opacity=".7"/><circle cx="350" cy="350" r="70" fill="#FFE7F0" opacity=".55"/>`;
    } else if (i === 2) {
      s += rays({ ox: 600, oy: -60, count: 8, len: 900, angle: 118, spread: 40, color: '#F4FFE8', op: 0.5 });
    } else {
      s += `<circle cx="350" cy="350" r="240" fill="url(#glowCream)" opacity=".7"/><circle cx="350" cy="350" r="34" fill="#FFF4DE"/>`;
      s += `<circle cx="338" cy="340" r="6" fill="#EADCC0" opacity=".6"/><circle cx="362" cy="364" r="4" fill="#EADCC0" opacity=".6"/>`;
    }
    return doc(700, 700, s);
  }

  // Tres capas de paralaje (lejos, medio, campo) de 1024×844 por etapa
  function capas(i) {
    semilla(300 + i);
    const r = {};
    if (i === 0) {
      r.lejos = doc(L, 844, crestaCiclica({ base: 450, amp: 110, color: '#D9B2AB', op: 0.85, filter: 'b1' }) + niebla(395, 130), nieblaDef('#FBEAD2'));
      const mid = '#B98A8E';
      let m = tower(170, 500, 28, 112, mid, '#E9C2B0') + arch(520, 504, 24, 76, mid, true, 9) + arch(590, 508, 20, 58, mid, false, 8) + tower(860, 504, 20, 78, mid);
      m += crestaCiclica({ base: 520, amp: 48, color: mid }) + niebla(480, 110);
      r.medio = doc(L, 844, m, nieblaDef('#FBEAD2'));
      let c = crestaCiclica({ base: 578, amp: 22, ks: [[3, 1], [8, 0.4]], color: '#D4A56E' });
      c += hierbaCiclica({ base: 602, hMin: 14, hMax: 40, count: 620, color: '#C08E58', op: 0.92, lean: 6 });
      c += hierbaCiclica({ base: 606, hMin: 10, hMax: 26, count: 320, color: '#EAC690', op: 0.75, lean: 5 });
      r.campo = doc(L, 844, c);
    } else if (i === 1) {
      r.lejos = doc(L, 844, crestaCiclica({ base: 430, amp: 100, color: '#A08BC8', op: 0.85, filter: 'b1' }) + niebla(400, 120), nieblaDef('#F3DCE8'));
      const pueblo = '#5E4A7E';
      let m = '';
      let x = 10;
      while (x < L - 60) {
        const w = rnd(30, 54), hh = rnd(40, 70), techo = rnd(16, 24);
        m += casa(x, 560, w, hh, techo, pueblo, R() < 0.75 ? '#FFD58A' : null);
        x += w + rnd(4, 26);
      }
      m += tower(400, 560, 24, 140, pueblo, '#FFD58A');
      m += `<rect y="558" width="${L}" height="286" fill="${pueblo}"/>`;
      // Guirnaldas de faroles (empatan en los bordes)
      [[0, 512, 300], [512, 1024, 300]].forEach(([a, b, y0]) => {
        const cx = (a + b) / 2;
        m += `<path d="M${a},${y0} Q${cx},${y0 + 90} ${b},${y0}" stroke="#3E2F5B" stroke-width="1.6" fill="none"/>`;
        for (let k = 1; k < 7; k++) {
          const t = k / 7, px = (1 - t) * (1 - t) * a + 2 * (1 - t) * t * cx + t * t * b, py = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * (y0 + 90) + t * t * y0;
          m += `<circle cx="${f(px)}" cy="${f(py + 9)}" r="18" fill="url(#glowGold)"/><rect x="${f(px - 4.5)}" y="${f(py + 2)}" width="9" height="12" rx="3" fill="#FFB867" stroke="#3E2F5B" stroke-width="1.2"/>`;
        }
      });
      r.medio = doc(L, 844, m + niebla(530, 70, '#F3DCE8', 0.5), nieblaDef('#F3DCE8'));
      let c = '';
      [120, 460, 800].forEach((px) => {
        c += `<path d="M${px},600 V530 h10" stroke="#2B2145" stroke-width="5" fill="none"/><circle cx="${px + 12}" cy="538" r="22" fill="url(#glowGold)"/><rect x="${px + 7}" y="532" width="11" height="14" rx="3" fill="#FFB867" stroke="#2B2145" stroke-width="1.5"/>`;
      });
      c += crestaCiclica({ base: 590, amp: 12, ks: [[4, 1]], color: '#3E2F5B' });
      r.campo = doc(L, 844, c);
    } else if (i === 2) {
      let lj = '';
      for (let x = 30; x < L; x += rnd(90, 140)) lj += ciclico(x, 40, (px) => tronco(px, 600, rnd(16, 26), -10, '#9ACFB6'));
      r.lejos = doc(L, 844, lj + niebla(430, 180, '#E9FFF3', 0.85), nieblaDef('#E9FFF3'));
      let m = '';
      for (let x = 80; x < L; x += rnd(210, 290)) m += ciclico(x, 50, (px) => tronco(px, 610, rnd(30, 42), -10, '#5E9F84'));
      m += arch(600, 600, 26, 70, '#4E8C75', true, 10);
      m += `<g filter="url(#b8)">${repetido([0, 260, 520, 780].map((x) => `<ellipse cx="${x}" cy="10" rx="190" ry="70" fill="#2F6B5A"/>`).join(''))}</g>`;
      r.medio = doc(L, 844, m + niebla(500, 120, '#E9FFF3', 0.6), nieblaDef('#E9FFF3'));
      let c = '';
      [150, 650].forEach((x) => { c += tronco(x, 640, 58, -10, '#1F4F45'); });
      [60, 330, 560, 880].forEach((x) => {
        const largo = rnd(110, 220);
        c += `<path d="M${x},0 C${x + 8},${largo * 0.4} ${x - 8},${largo * 0.7} ${x + 3},${largo}" stroke="#1F4F45" stroke-width="2.5" fill="none"/>`;
        for (let k = 1; k < 5; k++) c += `<ellipse cx="${x + (k % 2 ? 4 : -3)}" cy="${f(largo * k / 5)}" rx="5" ry="2.6" fill="#2F6B5A"/>`;
      });
      c += `<g filter="url(#b3)">${repetido([100, 420, 760].map((x) => `<ellipse cx="${x}" cy="-10" rx="170" ry="55" fill="#1F4F45"/>`).join(''))}</g>`;
      r.campo = doc(L, 844, c);
    } else {
      let lj = dots({ x0: 0, x1: L, y0: 0, y1: 480, count: 160, rMin: 0.4, rMax: 1.4, colors: ['#FFF1D6', '#DDE4FF'] });
      lj += `<g filter="url(#b16)" opacity=".5">${repetido('<path d="M0,140 C200,60 360,200 560,110 C720,40 880,120 1024,140" stroke="#7FE0C2" stroke-width="40" fill="none"/><path d="M0,200 C260,140 520,230 1024,200" stroke="#B59CFF" stroke-width="30" fill="none"/>')}</g>`;
      lj += crestaCiclica({ base: 520, amp: 80, color: '#20264F' }) + tower(700, 470, 20, 80, '#20264F');
      r.lejos = doc(L, 844, lj);
      let m = islaFlotante(220, 300, 110, '#1A1E42', '#F5C26B') + arch(185, 300, 16, 36, '#1A1E42', true, 6);
      m += islaFlotante(560, 360, 80, '#1A1E42', '#F5C26B') + `<circle cx="560" cy="346" r="22" fill="url(#glowGold)"/><circle cx="560" cy="348" r="3" fill="#FFE7A8"/>`;
      m += islaFlotante(860, 260, 70, '#1A1E42', '#F5C26B');
      m += crestaCiclica({ base: 560, amp: 34, color: '#171C40' }) + niebla(520, 90, '#8F86C9', 0.35);
      r.medio = doc(L, 844, m, nieblaDef('#8F86C9'));
      let c = crestaCiclica({ base: 596, amp: 18, ks: [[3, 1], [7, 0.4]], color: '#111533' });
      for (let k = 0; k < 40; k++) c += ciclico(rnd(0, L), 10, (x) => flower(x, rnd(585, 605), 1.8, pick(['#BFD8FF', '#FFF1D6', '#F5C26B'])));
      r.campo = doc(L, 844, c);
    }
    return r;
  }

  const TEMAS = [
    { tierra: ['#6A4650', '#43293A', '#1A1017'], borde: '#F7CF9C', hierba: '#24161E', brillo: '#EDBB7E', flores: ['#FFF1D6', '#F2A7B5'], piedra: '#8E6F7A', losa: '#6B4C57', musgo: '#8E8F5A' },
    { tierra: ['#4A3A6A', '#2B2145', '#140F24'], borde: '#F2C6D9', hierba: '#1C1530', brillo: '#C9B5E8', flores: ['#FFB867', '#F2C6D9'], piedra: '#6E5C8E', losa: '#584679', musgo: '#9C86C8' },
    { tierra: ['#2F6B5A', '#1F4F45', '#0E2A24'], borde: '#CFF5DF', hierba: '#123029', brillo: '#9ACFB6', flores: ['#F3FF9A', '#FFFFFF'], piedra: '#4E8C75', losa: '#3E7A64', musgo: '#7FC09F' },
    { tierra: ['#2A2F5E', '#171C40', '#0A0C1F'], borde: '#F5C26B', hierba: '#0D1028', brillo: '#7F8BD6', flores: ['#BFD8FF', '#F5C26B', '#FFF1D6'], piedra: '#3A4078', losa: '#2A2F5E', musgo: '#7FE0C2' },
  ];

  // Terreno del nivel a partir de su diseño (suelo, muros y plataformas). Ocupa y = 280–844.
  const TERRENO_Y = 280;
  function terreno(i, def) {
    semilla(100 + i);
    const T = TEMAS[i];
    const ancho = def.ancho * 40, alto = 844 - TERRENO_Y;
    const Y = (v) => f(v - TERRENO_Y);
    let s = '';

    // Abismo en los huecos
    let x = 0;
    [...def.suelo].sort((a, b) => a[0] - b[0]).forEach(([a, b]) => {
      if (a * 40 > x) s += `<rect x="${x}" y="${Y(600)}" width="${a * 40 - x}" height="${Y(844) - Y(600)}" fill="url(#abismo)"/>`;
      x = Math.max(x, b * 40);
    });
    if (x < ancho) s += `<rect x="${x}" y="${Y(600)}" width="${ancho - x}" height="${Y(844) - Y(600)}" fill="url(#abismo)"/>`;

    const hierbaEn = (x0, x1, yBase, densidad) => {
      const n = Math.round((x1 - x0) * densidad);
      let d1 = '', d2 = '';
      for (let k = 0; k < n; k++) {
        const px = rnd(x0 + 2, x1 - 4), h = rnd(5, 17), w = rnd(1.5, 3.5), l = rnd(-4, 4);
        d1 += `M${f(px)},${Y(yBase + 2)} Q${f(px + l * 0.3)},${Y(yBase + 2 - h * 0.6)} ${f(px + l)},${Y(yBase + 2 - h)} Q${f(px + w)},${Y(yBase + 2 - h * 0.5)} ${f(px + w)},${Y(yBase + 2)}Z`;
        if (k % 3 === 0) {
          const h2 = rnd(4, 10), px2 = rnd(x0 + 2, x1 - 4);
          d2 += `M${f(px2)},${Y(yBase + 2)} L${f(px2 + 1)},${Y(yBase + 2 - h2)} L${f(px2 + 2)},${Y(yBase + 2)}Z`;
        }
      }
      return `<path d="${d1}" fill="${T.hierba}"/><path d="${d2}" fill="${T.brillo}" opacity=".7"/>`;
    };

    // Tramos de suelo con bordes de acantilado irregulares
    def.suelo.forEach(([a, b]) => {
      const x0 = a * 40, x1 = b * 40;
      const borde = (xb, dir) => [[xb, 600], [xb + dir * 3, 640], [xb - dir * 4, 690], [xb + dir * 5, 750], [xb - dir * 2, 844]];
      const izq = a === 0 ? [[-10, 844], [-10, 600]] : borde(x0, 1).reverse();
      const der = b * 40 >= ancho ? [[ancho + 10, 600], [ancho + 10, 844]] : borde(x1, -1);
      let arriba = [];
      for (let px = x0; px <= x1; px += 8) arriba.push([px, 600 + 1.2 * Math.sin(px * 0.05) + 0.8 * Math.sin(px * 0.13)]);
      const pts = [...izq, ...arriba, ...der];
      s += `<path d="M${pts.map(([px, py]) => `${f(px)},${Y(py)}`).join(' L')} Z" fill="url(#tierra)" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`;
      s += `<path d="M${arriba.map(([px, py]) => `${f(px)},${Y(py)}`).join(' L')}" stroke="${T.borde}" stroke-width="2" fill="none"/>`;
      // Detalle de la tierra: piedras enterradas, raíces y vetas
      for (let k = 0; k < (x1 - x0) / 60; k++) {
        s += `<ellipse cx="${f(rnd(x0 + 10, x1 - 10))}" cy="${Y(rnd(650, 830))}" rx="${f(rnd(6, 16))}" ry="${f(rnd(3, 7))}" fill="#000" opacity=".14"/>`;
      }
      for (let k = 0; k < (x1 - x0) / 140; k++) {
        const px = rnd(x0 + 20, x1 - 30), py = rnd(660, 800), rx = rnd(10, 20);
        s += `<path d="M${f(px - rx)},${Y(py)} Q${f(px - rx * 0.6)},${Y(py - rx * 0.7)} ${f(px)},${Y(py - rx * 0.6)} Q${f(px + rx * 0.8)},${Y(py - rx * 0.5)} ${f(px + rx)},${Y(py)} Z" fill="${T.tierra[0]}" opacity=".55" stroke="${INK}" stroke-width="1" stroke-opacity=".4"/>`;
      }
      for (let k = 0; k < (x1 - x0) / 110; k++) {
        const px = rnd(x0 + 10, x1 - 40), largo = rnd(20, 60);
        s += `<path d="M${f(px)},${Y(606)} C${f(px + 6)},${Y(606 + largo * 0.4)} ${f(px - 8)},${Y(606 + largo * 0.7)} ${f(px + 4)},${Y(606 + largo)}" stroke="${INK}" stroke-width="1.4" opacity=".45" fill="none"/>`;
      }
      for (let py = 640; py < 840; py += rnd(34, 56)) {
        const a = rnd(x0, x1 - 60);
        s += `<path d="M${f(a)},${Y(py)} q${f(rnd(30, 80))},${f(rnd(-4, 4))} ${f(rnd(80, 160))},0" stroke="#FFFFFF" stroke-width="1" opacity=".05" fill="none"/>`;
      }
      s += hierbaEn(x0, x1, 600, 0.35);
      for (let k = 0; k < (x1 - x0) / 70; k++) s += flower(rnd(x0 + 10, x1 - 10), Y(591), 2.1, pick(T.flores));
    });

    // Muros: pilares de piedra en ruinas con musgo
    def.bloques.forEach(([c, r0, w]) => {
      const x0 = c * 40, x1 = (c + w) * 40, top = r0 * 40;
      s += `<path d="M${x0 - 1},${Y(604)} L${x0 + 1},${Y(top + 4)} L${x0 + 6},${Y(top - 1)} L${x1 - 6},${Y(top)} L${x1 + 1},${Y(top + 5)} L${x1 - 1},${Y(604)} Z" fill="url(#piedra)" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`;
      let ladrillos = '';
      for (let py = top + 20; py < 600; py += 20) {
        ladrillos += `M${x0 + 3},${Y(py)} H${x1 - 3} `;
        const desfase = ((py - top) / 20) % 2 ? 0 : 20;
        for (let px = x0 + 20 + desfase; px < x1 - 6; px += 40) ladrillos += `M${px},${Y(py)} V${Y(py - 20)} `;
      }
      s += `<path d="${ladrillos}" stroke="${INK}" stroke-width="1.1" opacity=".35"/>`;
      s += `<path d="M${x0 + 1},${Y(top + 4)} L${x0 + 6},${Y(top - 1)} L${x1 - 6},${Y(top)} L${x1 + 1},${Y(top + 5)}" stroke="${T.borde}" stroke-width="2" fill="none"/>`;
      s += hierbaEn(x0 + 2, x1 - 2, top, 0.3).replace(T.hierba, T.musgo);
    });

    // Plataformas: losas de ruina flotantes con enredaderas
    def.plataformas.forEach(([c, r, w]) => {
      const x0 = c * 40, x1 = (c + w) * 40, top = r * 40, cx = (x0 + x1) / 2;
      const p = [[x0 - 3, top + 7], [x0 + 3, top - 1], [cx, top - 2], [x1 - 3, top - 1], [x1 + 3, top + 7], [x1 - 6, top + 18], [cx + w * 8, top + 22], [cx, top + 32], [cx - w * 9, top + 21], [x0 + 6, top + 18]];
      s += `<path d="M${p.map(([px, py]) => `${f(px)},${Y(py)}`).join(' L')} Z" fill="${T.losa}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`;
      s += `<path d="M${x0 + 8},${Y(top + 10)} L${cx - 6},${Y(top + 13)} M${cx + 8},${Y(top + 8)} L${x1 - 10},${Y(top + 14)}" stroke="${INK}" stroke-width="1.1" opacity=".45"/>`;
      s += `<path d="M${x0 + 3},${Y(top - 1)} L${cx},${Y(top - 2)} L${x1 - 3},${Y(top - 1)}" stroke="${T.borde}" stroke-width="2" fill="none"/>`;
      s += hierbaEn(x0 + 4, x1 - 4, top - 2, 0.3).replace(T.hierba, T.musgo);
      for (let k = 0; k < w; k++) {
        const vx = rnd(x0 + 10, x1 - 10), largo = rnd(14, 34), base = top + 18;
        s += `<path d="M${f(vx)},${Y(base)} C${f(vx - 4)},${Y(base + largo * 0.4)} ${f(vx + 4)},${Y(base + largo * 0.7)} ${f(vx)},${Y(base + largo)}" stroke="#3E2B33" stroke-width="1.5" fill="none"/>`;
        s += `<ellipse cx="${f(vx + 2)}" cy="${Y(base + largo * 0.5)}" rx="3.2" ry="1.8" fill="${T.musgo}"/><ellipse cx="${f(vx - 1)}" cy="${Y(base + largo)}" rx="3" ry="1.7" fill="${T.musgo}"/>`;
      }
    });

    return doc(ancho, alto, s,
      `<linearGradient id="tierra" gradientUnits="userSpaceOnUse" x1="0" y1="${Y(600)}" x2="0" y2="${Y(844)}">` +
      `<stop offset="0" stop-color="${T.tierra[0]}"/><stop offset=".14" stop-color="${T.tierra[1]}"/><stop offset="1" stop-color="${T.tierra[2]}"/></linearGradient>` +
      lg('piedra', [[0, T.piedra], [1, T.tierra[2]]]) +
      lg('abismo', [[0, '#000000', 0], [0.35, '#0B060A', 0.75], [1, '#050305', 1]]));
  }

  /* ---------- Objetos de los niveles ---------- */
  function zarza() {
    const c = '#21151C';
    let espinas = '';
    [[-16, -10, -30], [-6, -18, 20], [4, -11, 160], [14, -19, -20], [20, -8, 40], [-20, -2, 200], [-2, -6, 120]].forEach(([tx, ty, a]) => {
      espinas += `<polygon points="0,-2.4 8,0 0,2.4" fill="${c}" transform="translate(${tx},${ty}) rotate(${a})"/>`;
    });
    const s = `<g transform="translate(32,38)"><path d="M-26,0 C-22,-18 -9,-27 0,-17 C6,-9 11,-29 23,-21 C29,-16 27,-4 25,0 M-13,0 C-15,-9 -6,-11 -2,-7 C2,-2 8,-11 13,0" stroke="${c}" stroke-width="3.6" fill="none" stroke-linecap="round"/>${espinas}<circle cx="-4" cy="-18" r="2.6" fill="#9B3651"/><circle cx="16" cy="-17" r="2.2" fill="#9B3651"/><circle cx="-18" cy="-8" r="2" fill="#9B3651"/></g>`;
    return doc(64, 40, s);
  }

  function sombra() {
    const s = `<g transform="translate(35,34)"><circle r="34" fill="url(#violeta)"/>` +
      `<path d="M-18,4 C-22,-16 -11,-28 0,-28 C11,-28 22,-16 18,4 C14,10 11,0 7,8 C3,0 -1,10 -5,5 C-9,-1 -13,10 -18,4Z" fill="#231A2E" opacity=".95"/>` +
      `<ellipse cx="-6" cy="-13" rx="2.8" ry="3.8" fill="#EDE3FF"/><ellipse cx="6" cy="-13" rx="2.8" ry="3.8" fill="#EDE3FF"/>` +
      `<circle cx="-6" cy="-13" r="6" fill="#EDE3FF" opacity=".25" filter="url(#b3)"/><circle cx="6" cy="-13" r="6" fill="#EDE3FF" opacity=".25" filter="url(#b3)"/>` +
      `<path d="M-21,8 q-6,4 -11,0 M21,6 q7,3 12,-2" stroke="#231A2E" stroke-width="2.2" opacity=".55" fill="none" stroke-linecap="round"/></g>`;
    return doc(70, 60, s, '<radialGradient id="violeta"><stop offset="0" stop-color="#B9A2FF" stop-opacity=".5"/><stop offset="1" stop-color="#B9A2FF" stop-opacity="0"/></radialGradient>');
  }

  function luz() {
    return doc(32, 32, `<circle cx="16" cy="16" r="15" fill="url(#glowGold)"/>${estrella4(16, 16, 8, '#FFF6DE')}<circle cx="16" cy="16" r="2.4" fill="#FFFFFF"/>`);
  }

  function faro(encendido) {
    let s = '';
    if (encendido) s += `<circle cx="18" cy="22" r="22" fill="url(#glowGold)"/>`;
    s += `<path d="M14,86 L15,34 H21 L22,86 Z" fill="#6B5A63" stroke="${INK}" stroke-width="2"/>`;
    s += `<rect x="8" y="84" width="20" height="6" rx="2" fill="#6B5A63" stroke="${INK}" stroke-width="2"/>`;
    s += `<path d="M7,14 L18,6 L29,14 Z" fill="#4A3A42" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
    s += `<rect x="10" y="14" width="16" height="18" rx="2" fill="${encendido ? '#FFD27A' : '#3A2D35'}" stroke="${INK}" stroke-width="2"/>`;
    s += `<path d="M18,14 V32 M10,23 H26" stroke="${INK}" stroke-width="1.2" opacity=".6"/>`;
    if (encendido) s += `<circle cx="18" cy="23" r="4" fill="#FFF6DE"/>`;
    return doc(36, 92, s);
  }

  function paginaIcono() {
    return doc(44, 50, `<circle cx="22" cy="25" r="22" fill="url(#glowGold)"/><g transform="translate(22,25) rotate(-8)"><rect x="-13" y="-17" width="26" height="34" rx="2" fill="#FBF3E2" stroke="${INK}" stroke-width="1.5"/><rect x="-9" y="-13" width="18" height="13" fill="#E9C9B0"/>${heart(0, -6, 0.7, '#C9566E')}<path d="M-8,5 H8 M-8,9 H5 M-8,13 H7" stroke="#B9A58E" stroke-width="1.2"/></g>`);
  }

  function cofreNivel() {
    const s = `<rect x="14" y="34" width="72" height="38" rx="5" fill="#7A4A2A" stroke="${INK}" stroke-width="2.5"/>` +
      `<path d="M12,36 Q50,6 88,36 Z" fill="#8E5631" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>` +
      `<rect x="26" y="20" width="7" height="52" fill="#F5C26B" stroke="${INK}" stroke-width="1.4"/><rect x="67" y="20" width="7" height="52" fill="#F5C26B" stroke="${INK}" stroke-width="1.4"/>` +
      `<rect x="42" y="30" width="16" height="17" rx="3" fill="#F5C26B" stroke="${INK}" stroke-width="1.6"/>` + heart(50, 38.5, 0.5, '#C9566E') +
      `<path d="M20,36 Q50,14 80,36" stroke="#FFFFFF" stroke-width="1.4" opacity=".3" fill="none"/>`;
    return doc(100, 76, s);
  }

  function losa(i) {
    const T = TEMAS[i];
    const s = `<path d="M2,6 L6,1 L74,1 L78,6 L70,15 L52,18 L40,23 L28,17 L10,15 Z" fill="${T.losa}" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>` +
      `<path d="M6,1 L74,1" stroke="${T.borde}" stroke-width="2"/><circle cx="40" cy="9" r="3" fill="${T.borde}" opacity=".7"/><circle cx="40" cy="9" r="8" fill="url(#glowGold)" opacity=".5"/>`;
    return doc(80, 26, s);
  }

  function paginaDiario() {
    semilla(77);
    const pts = [];
    for (let t = 0; t <= 300; t += 10) pts.push([10 + t, 10 + rnd(-2, 2)]);
    for (let t = 10; t <= 480; t += 10) pts.push([310 + rnd(-2, 2), 10 + t]);
    for (let t = 290; t >= 0; t -= 10) pts.push([10 + t, 490 + rnd(-2, 2)]);
    for (let t = 470; t > 0; t -= 10) pts.push([10 + rnd(-2, 2), 10 + t]);
    const papel = 'M' + pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' L') + ' Z';
    let s = `<path d="${papel}" fill="#000" opacity=".4" filter="url(#b8)" transform="translate(4,8)"/>`;
    s += `<path d="${papel}" fill="url(#hoja)" stroke="#8C6A48" stroke-width="1.2"/>`;
    for (let y = 300; y < 480; y += 24) s += `<path d="M34,${y} H286" stroke="#B9A58E" stroke-width=".8" opacity=".45"/>`;
    s += `<path d="M40,10 V490" stroke="#D9A0A8" stroke-width="1" opacity=".5"/>`;
    return doc(320, 502, s, '<radialGradient id="hoja" cx=".5" cy=".45" r=".8"><stop offset="0" stop-color="#FBF3E2"/><stop offset=".8" stop-color="#F1E2C4"/><stop offset="1" stop-color="#E2CBA0"/></radialGradient>');
  }

  function cinta() {
    return doc(64, 20, `<path d="M2,3 L62,1 L60,18 L4,19 Z" fill="#F3E6C8" opacity=".75" stroke="#C9B28A" stroke-width=".8"/>`);
  }

  /* ---------- Minijuego 1: frasco de los recuerdos ---------- */
  function frasco() {
    const s = `<ellipse cx="50" cy="70" rx="46" ry="40" fill="url(#glowGold)" opacity=".55"/>` +
      `<rect x="20" y="4" width="60" height="12" rx="4" fill="#9C6B3E" stroke="${INK}" stroke-width="2"/>` +
      `<path d="M10,34 Q10,22 22,20 L78,20 Q90,22 90,34 L90,92 Q90,108 74,108 L26,108 Q10,108 10,92 Z" fill="#FFFFFF" fill-opacity=".16" stroke="${INK}" stroke-width="2.5"/>` +
      `<ellipse cx="50" cy="21" rx="32" ry="5" fill="#FFFFFF" fill-opacity=".25" stroke="${INK}" stroke-width="2"/>` +
      `<path d="M18,40 Q16,70 22,96" stroke="#FFFFFF" stroke-width="3" opacity=".55" fill="none" stroke-linecap="round"/>` +
      `<path d="M78,44 Q81,60 79,74" stroke="#FFFFFF" stroke-width="2" opacity=".35" fill="none" stroke-linecap="round"/>` +
      `<path d="M14,56 Q50,64 86,56" stroke="${INK}" stroke-width="1" opacity=".25" fill="none"/>` +
      `<circle cx="50" cy="84" r="14" fill="url(#glowGold)"/>`;
    return doc(100, 112, s);
  }

  function petaloGrande() {
    return doc(30, 24, `<circle cx="15" cy="12" r="12" fill="url(#glowCream)" opacity=".6"/><path d="M4,13 C6,4 18,1 26,6 C22,16 12,21 4,13 Z" fill="#F7B7C3" stroke="#9B3651" stroke-width="1.2"/><path d="M7,12 C12,9 18,8 23,7" stroke="#FFFFFF" stroke-width="1" opacity=".6" fill="none"/>`);
  }

  function fugaz() {
    return doc(30, 70, `<path d="M15,2 L19,50 L11,50 Z" fill="url(#cola)"/><circle cx="15" cy="54" r="14" fill="url(#glowGold)"/>${estrella4(15, 54, 9, '#FFF6DE')}<circle cx="15" cy="54" r="2.4" fill="#FFFFFF"/>`,
      lg('cola', [[0, '#FFE7A8', 0], [1, '#FFE7A8', 0.9]]));
  }

  /* ---------- Minijuego 2: naipes del farol ---------- */
  function cartaDorso() {
    let s = `<rect x="3" y="3" width="114" height="154" rx="10" fill="url(#dorso)" stroke="${INK}" stroke-width="2.5"/>`;
    s += `<rect x="11" y="11" width="98" height="138" rx="6" fill="none" stroke="#F5C26B" stroke-width="1.6" opacity=".9"/>`;
    s += `<rect x="16" y="16" width="88" height="128" rx="4" fill="none" stroke="#F5C26B" stroke-width=".7" opacity=".6"/>`;
    s += `<circle cx="60" cy="80" r="34" fill="url(#glowGold)" opacity=".8"/>`;
    s += `<path d="M48,62 L60,54 L72,62 Z" fill="#F5C26B" stroke="${INK}" stroke-width="1.4"/><rect x="50" y="62" width="20" height="26" rx="3" fill="#FFD27A" stroke="${INK}" stroke-width="1.6"/><path d="M60,62 V88 M50,75 H70" stroke="${INK}" stroke-width="1" opacity=".5"/><circle cx="60" cy="75" r="4" fill="#FFF6DE"/><path d="M60,54 V48" stroke="${INK}" stroke-width="1.6"/><circle cx="60" cy="46" r="2.5" fill="none" stroke="${INK}" stroke-width="1.4"/>`;
    [[24, 26], [96, 26], [24, 134], [96, 134]].forEach(([x, y]) => { s += estrella4(x, y, 5, '#F5C26B'); });
    return doc(120, 160, s, lg('dorso', [[0, '#3E2F5B'], [1, '#1E1630']]));
  }

  function cartaFrente() {
    let s = `<rect x="3" y="3" width="114" height="154" rx="10" fill="#FBF3E2" stroke="${INK}" stroke-width="2.5"/>`;
    s += `<rect x="9" y="9" width="102" height="142" rx="6" fill="none" stroke="#D9A23E" stroke-width="1.2" opacity=".8"/>`;
    return doc(120, 160, s);
  }

  /* ---------- Etapa IV: plataforma de luz (aparece y desaparece) ---------- */
  function losaLuz() {
    const s = `<ellipse cx="44" cy="14" rx="44" ry="14" fill="url(#glowGold)" opacity=".7"/>` +
      `<path d="M6,9 L10,4 L78,4 L82,9 L74,17 L44,22 L14,17 Z" fill="#F5C26B" fill-opacity=".85" stroke="#FFF1D6" stroke-width="2" stroke-linejoin="round"/>` +
      `<path d="M10,4 L78,4" stroke="#FFF6DE" stroke-width="2.4"/>` +
      estrella4(28, 11, 3.5, '#FFF6DE') + estrella4(60, 11, 3.5, '#FFF6DE') + `<circle cx="44" cy="11" r="2.2" fill="#FFFFFF"/>`;
    return doc(88, 28, s);
  }

  /* ---------- Minijuego 3: tablero de piedra en el claro del bosque ---------- */
  const TABLERO = { casilla: 64, borde: 28 };

  function tablero() {
    semilla(91);
    const { casilla: q, borde: m } = TABLERO;
    const lado = q * 8 + m * 2;
    let s = `<rect x="4" y="10" width="${lado - 8}" height="${lado - 8}" rx="18" fill="#000" opacity=".45" filter="url(#b8)"/>`;
    s += `<rect x="2" y="2" width="${lado - 4}" height="${lado - 4}" rx="16" fill="url(#losaPiedra)" stroke="${INK}" stroke-width="3"/>`;
    // Musgo en los bordes
    for (let k = 0; k < 26; k++) {
      const lado4 = k % 4, t = rnd(30, lado - 30);
      const [x, y] = [[t, 10], [lado - 10, t], [t, lado - 10], [10, t]][lado4];
      s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rnd(6, 16))}" ry="${f(rnd(3, 7))}" fill="#7FC09F" opacity="${f(rnd(0.35, 0.7))}"/>`;
    }
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const clara = (r + c) % 2 === 0;
        const x = m + c * q, y = m + r * q;
        s += `<rect x="${x}" y="${y}" width="${q}" height="${q}" fill="${clara ? '#D7E6DA' : '#5E8F7A'}"/>`;
        // Vetas de la piedra
        s += `<path d="M${f(x + rnd(4, 20))},${f(y + rnd(10, 54))} q${f(rnd(10, 20))},${f(rnd(-6, 6))} ${f(rnd(24, 40))},${f(rnd(-4, 4))}" stroke="${clara ? '#9DB8A6' : '#3E6B5A'}" stroke-width="1" opacity=".6" fill="none"/>`;
      }
    }
    s += `<rect x="${m}" y="${m}" width="${q * 8}" height="${q * 8}" fill="none" stroke="${INK}" stroke-width="2.5"/>`;
    // Coordenadas talladas
    'abcdefgh'.split('').forEach((l, c) => {
      s += `<text x="${m + c * q + q / 2}" y="${lado - 8}" font-family="Georgia, serif" font-size="15" font-weight="700" fill="#E3F4EA" opacity=".8" text-anchor="middle">${l}</text>`;
    });
    for (let r = 0; r < 8; r++) {
      s += `<text x="${m / 2}" y="${m + r * q + q / 2 + 5}" font-family="Georgia, serif" font-size="15" font-weight="700" fill="#E3F4EA" opacity=".8" text-anchor="middle">${8 - r}</text>`;
    }
    return doc(lado, lado, s, lg('losaPiedra', [[0, '#4E8C75'], [1, '#1F4F45']]));
  }

  // Piezas talladas en piedra: claras (crema) u oscuras (pizarra). 64×64.
  function pieza(tipo, blanca) {
    const relleno = blanca ? '#F1E8D2' : '#2E3A44';
    const luz = blanca ? '#FFFFFF' : '#7F8FA0';
    const t = `fill="${relleno}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"`;
    const base = `<path d="M14,58 L50,58 L48,51 L16,51 Z" ${t}/><path d="M18,51 Q32,47 46,51" stroke="${luz}" stroke-width="1.2" opacity=".5" fill="none"/>`;
    let s = '';
    if (tipo === 'p') {
      s = `<path d="M22,51 Q24,38 28,34 Q22,30 24,23 Q27,15 32,15 Q37,15 40,23 Q42,30 36,34 Q40,38 42,51 Z" ${t}/>`;
    } else if (tipo === 'r') {
      s = `<path d="M19,51 L22,24 L18,24 L18,12 L24,12 L24,17 L29,17 L29,12 L35,12 L35,17 L40,17 L40,12 L46,12 L46,24 L42,24 L45,51 Z" ${t}/><path d="M22,30 H42" stroke="${INK}" stroke-width="1.4" opacity=".5"/>`;
    } else if (tipo === 'n') {
      s = `<path d="M18,51 Q20,40 28,35 Q22,33 16,36 Q12,32 15,27 Q22,16 30,11 L31,7 L35,12 Q46,16 47,32 Q48,43 46,51 Z" ${t}/><circle cx="27" cy="21" r="2" fill="${INK}"/><path d="M33,14 Q42,20 42,34" stroke="${luz}" stroke-width="1.4" opacity=".55" fill="none"/>`;
    } else if (tipo === 'b') {
      s = `<path d="M21,51 Q22,40 27,36 Q20,30 23,21 Q27,12 32,9 Q37,12 41,21 Q44,30 37,36 Q42,40 43,51 Z" ${t}/><path d="M35,16 L29,26" stroke="${INK}" stroke-width="2"/><circle cx="32" cy="7" r="3" ${t}/>`;
    } else if (tipo === 'q') {
      s = `<path d="M19,51 Q21,38 24,32 L15,14 L25,22 L32,9 L39,22 L49,14 L40,32 Q43,38 45,51 Z" ${t}/>` +
        [[15, 13], [32, 8], [49, 13]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" ${t}/>`).join('');
    } else {
      s = `<path d="M19,51 Q21,37 25,31 Q18,26 20,19 L44,19 Q46,26 39,31 Q43,37 45,51 Z" ${t}/><path d="M32,5 V17 M27,10 H37" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M32,5 V17 M27,10 H37" stroke="${relleno}" stroke-width="2.4" stroke-linecap="round"/>`;
    }
    return doc(64, 64, `<ellipse cx="32" cy="58" rx="20" ry="4" fill="#000" opacity=".3"/>` + base + s, '', 2);
  }

  /* ---------- Minijuego 4: vitral de una ventana en ruinas ---------- */
  const VITRAL = { lado: 360, x: 40, y: 150, w: 440, h: 550 };

  // Marco de piedra con arco y rosetón (el rompecabezas va en el hueco cuadrado)
  function ventana() {
    semilla(61);
    const { lado, x: px, y: py, w, h } = VITRAL;
    const cx = w / 2;
    let s = `<path d="M10,${h} V150 A${cx - 10},140 0 0 1 ${w - 10},150 V${h} Z" fill="#000" opacity=".45" filter="url(#b8)" transform="translate(4,10)"/>`;
    s += `<path d="M10,${h - 4} V150 A${cx - 10},140 0 0 1 ${w - 10},150 V${h - 4} Z" fill="url(#piedraVentana)" stroke="${INK}" stroke-width="3"/>`;
    // Rosetón del arco
    s += `<circle cx="${cx}" cy="86" r="52" fill="#1A1E42" stroke="${INK}" stroke-width="3"/>`;
    const colores = ['#7FE0C2', '#F5C26B', '#B59CFF', '#F2A7B5', '#9EC5F2'];
    for (let k = 0; k < 10; k++) {
      const a0 = (k / 10) * Math.PI * 2, a1 = ((k + 1) / 10) * Math.PI * 2;
      s += `<path d="M${cx},86 L${f(cx + Math.cos(a0) * 46)},${f(86 + Math.sin(a0) * 46)} A46,46 0 0 1 ${f(cx + Math.cos(a1) * 46)},${f(86 + Math.sin(a1) * 46)} Z" fill="${colores[k % 5]}" opacity=".55" stroke="#20264F" stroke-width="2.5"/>`;
    }
    s += `<circle cx="${cx}" cy="86" r="14" fill="#F5C26B" stroke="#20264F" stroke-width="2.5"/>`;
    // Hueco del vitral
    s += `<rect x="${px - 8}" y="${py - 8}" width="${lado + 16}" height="${lado + 16}" rx="4" fill="#0D1028" stroke="${INK}" stroke-width="3"/>`;
    // Grietas y musgo
    for (let k = 0; k < 7; k++) {
      const gx = rnd(16, w - 16), gy = rnd(160, h - 20);
      if (gx > px - 10 && gx < px + lado + 10 && gy > py - 10 && gy < py + lado + 10) continue;
      s += `<path d="M${f(gx)},${f(gy)} l${f(rnd(-10, 10))},${f(rnd(8, 18))} l${f(rnd(-8, 8))},${f(rnd(6, 14))}" stroke="${INK}" stroke-width="1.3" opacity=".5" fill="none"/>`;
    }
    for (let k = 0; k < 18; k++) {
      s += `<ellipse cx="${f(rnd(14, w - 14))}" cy="${f(rnd(h - 26, h - 8))}" rx="${f(rnd(6, 16))}" ry="${f(rnd(3, 6))}" fill="#7FE0C2" opacity="${f(rnd(0.25, 0.5))}"/>`;
    }
    return doc(w, h, s, lg('piedraVentana', [[0, '#3A4078'], [1, '#1A1E42']]));
  }

  // Imagen de reemplazo si no hay foto: vitral con luna, corazón y estrellas (cada pieza es distinta)
  function vitral() {
    semilla(62);
    const L0 = VITRAL.lado;
    let s = `<rect width="${L0}" height="${L0}" fill="#20264F"/>`;
    const colores = ['#3A3F7A', '#2E5E8C', '#7FE0C2', '#6F7FD6', '#B59CFF', '#4E8C9F', '#8F86C9', '#2A6F6A'];
    // Mosaico de vidrios triangulares
    const n = 6, q = L0 / n;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const x = c * q, y = r * q;
        const t1 = `${x},${y} ${x + q},${y} ${x},${y + q}`, t2 = `${x + q},${y} ${x + q},${y + q} ${x},${y + q}`;
        s += `<polygon points="${t1}" fill="${pick(colores)}" opacity="${f(rnd(0.65, 0.95))}"/><polygon points="${t2}" fill="${pick(colores)}" opacity="${f(rnd(0.65, 0.95))}"/>`;
      }
    }
    s += `<circle cx="${L0 * 0.72}" cy="${L0 * 0.26}" r="64" fill="url(#glowCream)" opacity=".9"/>`;
    s += `<path d="M${L0 * 0.72},${L0 * 0.26 - 44} A44,44 0 1 0 ${L0 * 0.72 + 30},${L0 * 0.26 + 32} A34,34 0 1 1 ${L0 * 0.72},${L0 * 0.26 - 44}Z" fill="#FFF1D6"/>`;
    s += heart(L0 * 0.36, L0 * 0.62, 9, '#C9566E');
    s += `<path transform="translate(${L0 * 0.36},${L0 * 0.62}) scale(9)" d="M0,4 C-6,-2 -10,-6 -6,-9 C-3,-11 0,-8 0,-6 C0,-8 3,-11 6,-9 C10,-6 6,-2 0,4Z" fill="none" stroke="#F5C26B" stroke-width=".35"/>`;
    [[60, 60, 14], [150, 40, 9], [300, 300, 13], [250, 200, 8], [90, 320, 10], [320, 150, 7]].forEach(([x, y, r]) => { s += estrella4(x, y, r, '#F5C26B'); });
    // Plomo entre los vidrios
    let plomo = '';
    for (let k = 0; k <= n; k++) plomo += `M0,${k * q} H${L0} M${k * q},0 V${L0} `;
    for (let k = -n; k <= n; k++) plomo += `M${k * q},${L0} L${k * q + L0},0 `;
    s += `<path d="${plomo}" stroke="#141833" stroke-width="3" opacity=".85" fill="none"/>`;
    return doc(L0, L0, s);
  }

  /* =====================================================================
   *  Tesoro final: el campo de flores bajo la luna
   * ===================================================================== */
  const SUELO_TESORO = 690;

  function tesoroFondo() {
    semilla(401);
    const W0 = ANCHO_MAX, H0 = 844, cx = W0 / 2;
    let s = `<rect width="${W0}" height="${H0}" fill="url(#nocheT)"/>`;
    s += dots({ x0: 0, x1: W0, y0: 0, y1: 560, count: 260, rMin: 0.4, rMax: 1.5, colors: ['#FFF1D6', '#DDE4FF'] });
    s += `<g filter="url(#b16)" opacity=".55">` +
      `<path d="M-40,330 C240,240 420,420 760,300 C1040,200 1260,330 1600,250" stroke="#7FE0C2" stroke-width="70" fill="none"/>` +
      `<path d="M-40,420 C300,360 640,470 980,390 C1220,330 1400,380 1600,350" stroke="#B59CFF" stroke-width="46" fill="none" opacity=".7"/></g>`;
    const lx = cx + 170, ly = 250;
    s += `<circle cx="${lx}" cy="${ly}" r="260" fill="url(#glowCream)" opacity=".75"/><circle cx="${lx}" cy="${ly}" r="62" fill="#FFF4DE"/>`;
    s += `<circle cx="${lx - 18}" cy="${ly - 14}" r="11" fill="#EADCC0" opacity=".7"/><circle cx="${lx + 22}" cy="${ly + 20}" r="8" fill="#EADCC0" opacity=".7"/>`;
    // Ruinas lejanas y colinas
    s += ridge({ x1: W0, base: 600, amp: 70, color: '#262C5E', bottom: H0, op: 0.9, filter: 'b1' });
    s += tower(cx - 420, 590, 26, 110, '#262C5E') + arch(cx + 330, 600, 22, 70, '#262C5E', true, 8) + tower(cx + 560, 600, 20, 80, '#262C5E');
    s += `<rect y="560" width="${W0}" height="110" fill="url(#niebla)" opacity=".5" filter="url(#b8)"/>`;
    s += ridge({ x1: W0, base: 660, amp: 30, color: '#171C40', bottom: H0, freqs: [[0.01, 1], [0.04, 0.4]] });
    // Campo oscuro
    let d = `M-10,${H0}`;
    for (let x = -10; x <= W0 + 10; x += 10) d += ` L${x},${f(SUELO_TESORO + 4 * Math.sin(x * 0.012) + 2 * Math.sin(x * 0.05))}`;
    s += `<path d="${d} L${W0 + 10},${H0} Z" fill="url(#campoT)"/>`;
    s += grass({ x0: -5, x1: W0 + 5, base: () => SUELO_TESORO + 6, hMin: 6, hMax: 20, count: 520, color: '#0A0C1F', lean: 5, wMin: 1.5, wMax: 3.5 });
    return doc(W0, H0, s,
      lg('nocheT', [[0, '#0B0F2A'], [0.55, '#1E2454'], [1, '#3A3F7A']]) +
      lg('campoT', [[0, '#151A3C'], [1, '#07081A']]) +
      lg('niebla', [[0, '#8F86C9', 0], [0.5, '#8F86C9', 0.6], [1, '#8F86C9', 0]]));
  }

  // Flor del campo (32×32): 5 pétalos y centro dorado
  function flor(c) {
    let s = `<circle cx="16" cy="16" r="15" fill="${c}" opacity=".25" filter="url(#b3)"/>`;
    for (let k = 0; k < 5; k++) {
      const a = k * 1.2566 - 1.5708;
      s += `<circle cx="${f(16 + Math.cos(a) * 6)}" cy="${f(16 + Math.sin(a) * 6)}" r="4.6" fill="${c}"/>`;
    }
    return doc(32, 32, s + `<circle cx="16" cy="16" r="3.2" fill="#FFE7A8"/>`);
  }

  function cofreGrande(abierto) {
    let s = `<ellipse cx="80" cy="132" rx="70" ry="8" fill="#000" opacity=".35"/>`;
    if (abierto) {
      s += `<ellipse cx="80" cy="58" rx="60" ry="24" fill="url(#glowGold)"/>`;
      s += `<path d="M22,58 L30,8 Q80,-6 130,8 L138,58 Z" fill="#8E5631" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
      s += `<path d="M38,12 L36,56 M122,12 L124,56" stroke="#F5C26B" stroke-width="7"/><path d="M38,12 L36,56 M122,12 L124,56" stroke="${INK}" stroke-width="1.2" opacity=".6"/>`;
      s += `<ellipse cx="80" cy="60" rx="56" ry="10" fill="#FFE7A8" stroke="${INK}" stroke-width="2.5"/>`;
    } else {
      s += `<path d="M16,64 Q80,4 144,64 Z" fill="#8E5631" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
      s += `<path d="M26,58 Q80,16 134,58" stroke="#FFFFFF" stroke-width="2" opacity=".25" fill="none"/>`;
    }
    s += `<rect x="18" y="62" width="124" height="66" rx="7" fill="#7A4A2A" stroke="${INK}" stroke-width="3"/>`;
    const y0 = abierto ? 62 : 28, alto = abierto ? 66 : 100;
    s += `<rect x="36" y="${y0}" width="11" height="${alto}" fill="#F5C26B" stroke="${INK}" stroke-width="1.8"/><rect x="113" y="${y0}" width="11" height="${alto}" fill="#F5C26B" stroke="${INK}" stroke-width="1.8"/>`;
    s += `<rect x="66" y="66" width="28" height="30" rx="5" fill="#F5C26B" stroke="${INK}" stroke-width="2.2"/>` + heart(80, 81, 0.95, '#C9566E');
    s += `<path d="M24,118 H136" stroke="${INK}" stroke-width="1.4" opacity=".4"/>`;
    return doc(160, 142, s, '', 2);
  }

  function cerradura(abierta) {
    let s = `<circle cx="24" cy="26" r="22" fill="url(#glowGold)" opacity="${abierta ? 1 : 0.4}"/>`;
    s += abierta
      ? `<path d="M15,22 V14 a9,9 0 0 1 17,-4" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="M15,22 V14 a9,9 0 0 1 17,-4" fill="none" stroke="#F5C26B" stroke-width="3" stroke-linecap="round"/>`
      : `<path d="M15,22 V14 a9,9 0 0 1 18,0 V22" fill="none" stroke="${INK}" stroke-width="6"/><path d="M15,22 V14 a9,9 0 0 1 18,0 V22" fill="none" stroke="#C9B28A" stroke-width="3"/>`;
    s += `<rect x="9" y="21" width="30" height="24" rx="5" fill="${abierta ? '#F5C26B' : '#9C8A6E'}" stroke="${INK}" stroke-width="2.5"/>`;
    s += `<circle cx="24" cy="31" r="3.4" fill="${INK}"/><path d="M24,33 V39" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
    return doc(48, 50, s, '', 2);
  }

  // Pergamino enrollado pequeño (flota sobre el cofre)
  function pergaminoMini() {
    const s = `<circle cx="60" cy="48" r="50" fill="url(#glowCream)" opacity=".6"/>` +
      `<g transform="rotate(-4 60 48)"><rect x="14" y="16" width="92" height="64" rx="3" fill="#FBF3E2" stroke="${INK}" stroke-width="2.2"/>` +
      `<rect x="6" y="10" width="108" height="10" rx="5" fill="#EADBBE" stroke="${INK}" stroke-width="2"/><rect x="6" y="76" width="108" height="10" rx="5" fill="#EADBBE" stroke="${INK}" stroke-width="2"/>` +
      `<path d="M26,34 H90 M26,44 H86 M26,54 H78" stroke="#8C6A48" stroke-width="2" opacity=".7"/>${heart(88, 64, 0.6, '#C9566E')}</g>`;
    return doc(120, 96, s, '', 2);
  }

  // Hoja grande del pergamino (fondo de la leyenda), 340×470
  function pergaminoCarta() {
    semilla(402);
    const w = 340, h = 470;
    const pts = [];
    for (let t = 0; t <= w - 40; t += 10) pts.push([20 + t, 24 + rnd(-1.5, 1.5)]);
    for (let t = 0; t <= h - 48; t += 10) pts.push([w - 20 + rnd(-1.5, 1.5), 24 + t]);
    for (let t = w - 40; t >= 0; t -= 10) pts.push([20 + t, h - 24 + rnd(-1.5, 1.5)]);
    for (let t = h - 48; t > 0; t -= 10) pts.push([20 + rnd(-1.5, 1.5), 24 + t]);
    const papel = 'M' + pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' L') + ' Z';
    let s = `<path d="${papel}" fill="#000" opacity=".45" filter="url(#b8)" transform="translate(4,10)"/>`;
    s += `<path d="${papel}" fill="url(#hojaP)" stroke="#8C6A48" stroke-width="1.4"/>`;
    s += `<rect x="6" y="6" width="${w - 12}" height="26" rx="13" fill="url(#rollo)" stroke="${INK}" stroke-width="2.4"/>`;
    s += `<rect x="6" y="${h - 32}" width="${w - 12}" height="26" rx="13" fill="url(#rollo)" stroke="${INK}" stroke-width="2.4"/>`;
    s += `<rect x="38" y="48" width="${w - 76}" height="${h - 96}" fill="none" stroke="#C9A36A" stroke-width="1.2" opacity=".7"/>`;
    s += heart(w / 2, h - 52, 1.1, '#C9566E');
    return doc(w, h, s,
      '<radialGradient id="hojaP" cx=".5" cy=".45" r=".8"><stop offset="0" stop-color="#FBF3E2"/><stop offset=".8" stop-color="#F1E2C4"/><stop offset="1" stop-color="#E2CBA0"/></radialGradient>' +
      lg('rollo', [[0, '#F3E6C8'], [0.5, '#D9BF8E'], [1, '#B8955E']]), 2);
  }

  // Columna de luz dorada que sale del cofre
  function columnaLuz() {
    return doc(200, 760, `<rect x="40" y="0" width="120" height="760" fill="url(#col)" filter="url(#b16)"/><rect x="80" y="0" width="40" height="760" fill="url(#col2)" filter="url(#b8)"/>`,
      '<linearGradient id="col" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#FFE7A8" stop-opacity=".9"/><stop offset="1" stop-color="#FFE7A8" stop-opacity="0"/></linearGradient>' +
      '<linearGradient id="col2" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".95"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>');
  }

  // Texturas propias de una etapa: se crean al entrar al nivel y se liberan al salir
  function nivelArte(i, def) {
    const c = capas(i);
    return {
      ['n_astro']: astro(i),
      ['n_lejos']: c.lejos,
      ['n_medio']: c.medio,
      ['n_campo']: c.campo,
      ['n_terreno']: terreno(i, def),
    };
  }

  /* ---------- Catálogo que carga Boot ---------- */
  function catalogo() {
    return {
      angie: angie(),
      brayan: brayan(),
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
      zarza: zarza(),
      sombra: sombra(),
      luz: luz(),
      faro: faro(false),
      faro_on: faro(true),
      pagina: paginaIcono(),
      cofre_nivel: cofreNivel(),
      losa_0: losa(0),
      losa_1: losa(1),
      losa_2: losa(2),
      losa_3: losa(3),
      pagina_diario: paginaDiario(),
      cinta: cinta(),
      frasco: frasco(),
      petalo_g: petaloGrande(),
      fugaz: fugaz(),
      carta_dorso: cartaDorso(),
      carta_frente: cartaFrente(),
      losa_luz: losaLuz(),
      tablero: tablero(),
      ...Object.fromEntries(['k', 'q', 'r', 'b', 'n', 'p'].flatMap((t) => [
        ['pieza_w' + t, pieza(t, true)],
        ['pieza_b' + t, pieza(t, false)],
      ])),
      ventana: ventana(),
      vitral: vitral(),
      tesoro_fondo: tesoroFondo(),
      flor_0: flor('#FFF1D6'),
      flor_1: flor('#F2A7B5'),
      flor_2: flor('#BFD8FF'),
      flor_3: flor('#F5C26B'),
      cofre_grande: cofreGrande(false),
      cofre_abierto: cofreGrande(true),
      cerradura: cerradura(false),
      cerradura_abierta: cerradura(true),
      pergamino_mini: pergaminoMini(),
      pergamino_carta: pergaminoCarta(),
      columna_luz: columnaLuz(),
    };
  }

  // Colores del cielo de cada etapa (degradado vertical que pinta Phaser)
  const CIELOS = [
    [[0, 0xE2B7B0], [320, 0xF2CFB3], [520, 0xFBE8C6], [844, 0xF6DDB7]],
    [[0, 0xB6A0DC], [420, 0xE3C6DA], [844, 0xF6D9C9]],
    [[0, 0xE3F4EA], [500, 0xA9DCC4], [844, 0x6FB497]],
    [[0, 0x0B0F2A], [500, 0x1E2454], [844, 0x3A3F7A]],
  ];

  return { catalogo, nivelArte, ANCHO_MAX, SUELO_INTRO, PAPEL, RUTA, ZONAS, CIELOS, TERRENO_Y, TABLERO, VITRAL, SUELO_TESORO };
})();
