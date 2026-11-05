// =====================================================================
//  Пиксель-арт движок сцены «Кабинет наставницы»
//  Вся графика рисуется процедурно: альбедо + нормали + AO + эмиссия,
//  затем динамическое освещение (камин, лампа, луна, свечи),
//  селективные контуры, виньетка, квантизация в палитру с дизерингом.
// =====================================================================

export const W = 480, H = 270;
const N = W * H;

// ---------------------------------------------------------------- utils
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
function hash(x, y, s = 0) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vnoise(x, y, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, o = 4, s = 0) {
  let v = 0, a = 0.5, f = 1, t = 0;
  for (let i = 0; i < o; i++) { v += a * vnoise(x * f, y * f, s + i * 17); t += a; a *= 0.5; f *= 2; }
  return v / t;
}
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hx = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const mixc = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const mulc = (a, k) => [a[0] * k, a[1] * k, a[2] * k];

// ---------------------------------------------------------------- palette
// Тщательно подобранные рампы с hue-shift (тени уходят в фиолет, света — в жёлтый)
const PALETTE_HEX = [
  // ночь / тени
  '#07060b', '#0d0b13', '#14101c', '#1b1525', '#241b2f', '#2e2339', '#3a2c45', '#4a3a55',
  // красное дерево
  '#1c0d0a', '#2a140f', '#3a1b13', '#4d2417', '#62301c', '#7a3d22', '#94502c', '#b06a3a', '#cc8a50',
  // огонь / тёплый свет
  '#3d1208', '#66200b', '#93310f', '#c24a16', '#e06a20', '#f38c2e', '#fbb147', '#ffd36e', '#ffeaa0', '#fff8dc',
  // кожа
  '#2e1a19', '#4a2a27', '#6b3d36', '#8c5348', '#a96a59', '#c4846d', '#d89e84', '#e6b59a', '#f0caae', '#f8dfc8',
  // волосы (тёмный каштан)
  '#120909', '#1d0f0d', '#2a1511', '#3a1c15', '#4c251a', '#61301f', '#7a3e26', '#955131',
  // бордовая кожа кресел
  '#240b0d', '#3a1114', '#55181b', '#721f21', '#8f2c28', '#ad4133',
  // зелень
  '#0b1610', '#11241a', '#183524', '#204a31', '#2c6342', '#3f8257', '#5fa673', '#8fca95',
  // синие
  '#0c1222', '#131c33', '#1b2847', '#25375e', '#334c7c', '#4a679c', '#6f8fbf', '#a3bfe0', '#d4e4f4',
  // бумага / крем
  '#3e3628', '#5a4f3c', '#7a6d53', '#9c8d6c', '#bdae88', '#d8cba6', '#ece2c4', '#f8f1dc',
  // латунь / золото
  '#2e1f0a', '#4a3410', '#6c4d17', '#8f6a20', '#b38a2e', '#d4ab45', '#ecca6c', '#fbe6a2',
  // камень / мрамор
  '#211e23', '#322e35', '#46414a', '#5c5661', '#746d79', '#8f8893', '#aca5ae', '#cbc5cc', '#e4dfe3',
  // красные книги
  '#4a1216', '#6e1b1d', '#962b27', '#b8443a',
  // фиолетовые
  '#24162e', '#382246', '#523263', '#6e4a82',
  // бирюза
  '#0f2a2c', '#173f40', '#22595a', '#357a76',
  // губы / румянец
  '#5e2629', '#7d3538', '#9c4a4a', '#b86560', '#d0827a',
  // горчица
  '#5c4210', '#87621b', '#a9812a',
];
const PAL = PALETTE_HEX.map(hx);
const LUT = new Uint32Array(32 * 32 * 32);
(function buildLUT() {
  for (let r = 0; r < 32; r++) for (let g = 0; g < 32; g++) for (let b = 0; b < 32; b++) {
    const R = (r + 0.5) / 32, G = (g + 0.5) / 32, B = (b + 0.5) / 32;
    let best = 0, bd = 1e9;
    for (let i = 0; i < PAL.length; i++) {
      const p = PAL[i];
      const rm = (R + p[0]) * 0.5;
      const dr = R - p[0], dg = G - p[1], db = B - p[2];
      // redmean + лёгкий штраф за потерю яркости
      const d = (2 + rm) * dr * dr + 4 * dg * dg + (3 - rm) * db * db;
      if (d < bd) { bd = d; best = i; }
    }
    const p = PAL[best];
    LUT[(r << 10) | (g << 5) | b] = (255 << 24) | (Math.round(p[2] * 255) << 16) | (Math.round(p[1] * 255) << 8) | Math.round(p[0] * 255);
  }
})();
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16 - 0.5);

// ---------------------------------------------------------------- buffers
const alb = new Float32Array(N * 3);
const nrm = new Float32Array(N * 3);
const aoB = new Float32Array(N);
const emi = new Float32Array(N * 3);
const spc = new Float32Array(N);
const zb = new Float32Array(N);
const idB = new Uint8Array(N);
const emiStatic = new Float32Array(N * 3);
// освещение (запекается)
const Ds = new Float32Array(N * 3), Df = new Float32Array(N * 3), Dc = new Float32Array(N * 3);
const Ss = new Float32Array(N * 3), Sf = new Float32Array(N * 3);
const glowF = new Float32Array(N), glowL = new Float32Array(N);
const post = new Float32Array(N); // контуры * виньетка
const ember = new Float32Array(N);

// ID в порядке отрисовки (больше = ближе). Контур рисуется по краю «ближнего».
const ID = {
  WALL: 1, SHELF: 2, BOOK: 3, CHIMNEY: 4, PAINTING: 5, MANTEL: 6, FIREBOX: 7, LOGS: 8, MANTELITEM: 9,
  WINDOW: 10, CURTAIN: 11, LADDER: 12, FLOOR: 13, RUG: 14, GLOBE: 15, CHAIR: 16, HAIRBACK: 17,
  BODY: 18, NECK: 19, FACE: 20, HAIRFRONT: 21, PENDANT: 22, DESK: 23, DESKTOP: 24, PROP: 25, LAMP: 26,
  ARMS: 27, HANDS: 28, ARMCHAIR: 29, FX: 30,
};
const OUTLINE = new Float32Array(64).fill(1);
const setO = (id, v) => (OUTLINE[id] = v);
setO(ID.CHAIR, 0.55); setO(ID.HAIRBACK, 0.6); setO(ID.BODY, 0.6); setO(ID.NECK, 0.8); setO(ID.FACE, 0.62);
setO(ID.HAIRFRONT, 0.55); setO(ID.DESK, 0.6); setO(ID.DESKTOP, 0.7); setO(ID.PROP, 0.55); setO(ID.LAMP, 0.5);
setO(ID.ARMS, 0.68); setO(ID.HANDS, 0.62); setO(ID.ARMCHAIR, 0.5); setO(ID.GLOBE, 0.55); setO(ID.MANTEL, 0.7);
setO(ID.MANTELITEM, 0.6); setO(ID.LADDER, 0.6); setO(ID.CURTAIN, 0.75); setO(ID.PAINTING, 0.7); setO(ID.PENDANT, 0.8);

const P = { r: 0, g: 0, b: 0, nx: 0, ny: 0, nz: 1, ao: 1, er: 0, eg: 0, eb: 0, sp: 0 };
function col(c, k = 1) { P.r = c[0] * k; P.g = c[1] * k; P.b = c[2] * k; }
function nrmSet(x, y, z) { P.nx = x; P.ny = y; P.nz = z; }

function paint(id, x0, y0, x1, y1, z, fn) {
  x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0));
  x1 = Math.min(W - 1, Math.ceil(x1)); y1 = Math.min(H - 1, Math.ceil(y1));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    P.nx = 0; P.ny = 0; P.nz = 1; P.ao = 1; P.er = P.eg = P.eb = 0; P.sp = 0;
    if (fn(x, y, P) === false) continue;
    const i = y * W + x, i3 = i * 3;
    alb[i3] = P.r; alb[i3 + 1] = P.g; alb[i3 + 2] = P.b;
    const l = Math.hypot(P.nx, P.ny, P.nz) || 1;
    nrm[i3] = P.nx / l; nrm[i3 + 1] = P.ny / l; nrm[i3 + 2] = P.nz / l;
    aoB[i] = P.ao; spc[i] = P.sp; zb[i] = z; idB[i] = id;
    emiStatic[i3] = P.er; emiStatic[i3 + 1] = P.eg; emiStatic[i3 + 2] = P.eb;
  }
}
const idAt = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : idB[y * W + x]);
// затемнить уже нарисованное (контактные тени)
function shade(x0, y0, x1, y1, fn) {
  x0 = Math.max(0, x0 | 0); y0 = Math.max(0, y0 | 0); x1 = Math.min(W - 1, x1 | 0); y1 = Math.min(H - 1, y1 | 0);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const k = fn(x, y, idB[y * W + x]); if (k !== undefined) aoB[y * W + x] *= k;
  }
}

// ---------------------------------------------------------------- materials
const C = {
  wood0: hx('#1c0d0a'), wood1: hx('#3a1b13'), wood2: hx('#5a2a1a'), wood3: hx('#7a3d22'), wood4: hx('#a0582f'),
  mahog: hx('#6a2e1c'), mahogD: hx('#3d1a10'), mahogL: hx('#9a4c2a'),
  brass: hx('#b38a2e'), brassL: hx('#ecca6c'), brassD: hx('#6c4d17'),
  leather: hx('#7a2022'), leatherD: hx('#3a1114'), leatherL: hx('#a8402f'),
  green: hx('#1f4a31'), greenL: hx('#3f8257'), greenD: hx('#11241a'),
  marble: hx('#c9c1c4'), marbleD: hx('#8f8893'), stone: hx('#5c5661'),
  cream: hx('#e8dcc0'), paper: hx('#efe5cc'),
  skin: [0.9, 0.72, 0.62], skinD: [0.62, 0.4, 0.36],
  hairD: [0.07, 0.035, 0.03], hairM: [0.25, 0.1, 0.065], hairL: [0.5, 0.24, 0.13],
  dress: [0.075, 0.062, 0.085], dressL: [0.2, 0.17, 0.22],
};
const BOOKC = [
  hx('#6e1b1d'), hx('#962b27'), hx('#4a1216'), hx('#183524'), hx('#204a31'), hx('#1b2847'), hx('#25375e'),
  hx('#4d2417'), hx('#7a3d22'), hx('#9c8d6c'), hx('#bdae88'), hx('#1b1525'), hx('#173f40'), hx('#382246'),
  hx('#87621b'), hx('#2a140f'), hx('#523263'), hx('#5a4f3c'),
];

// =====================================================================
//  ФОН
// =====================================================================
function woodGrain(x, y, base, scale = 1, s = 0) {
  const g = fbm(x * 0.05 * scale, y * 0.6 * scale, 3, s);
  const stripe = 0.5 + 0.5 * Math.sin((y * 0.9 + g * 9) * scale);
  return 0.82 + stripe * 0.12 + (g - 0.5) * 0.25;
}

function drawWallBase() {
  paint(ID.WALL, 0, 0, W - 1, H - 1, -20, (x, y) => { col([0.16, 0.1, 0.09]); P.ao = 0.7; });
}

function drawCeiling() {
  // карниз
  paint(ID.SHELF, 0, 0, W - 1, 11, -4, (x, y) => {
    const rows = [0.35, 0.55, 0.8, 1.0, 0.7, 0.5, 0.85, 1.05, 0.9, 0.6, 0.45, 0.3];
    const k = rows[y] ?? 0.6;
    col(C.wood2, k * woodGrain(x, y, 0, 0.5));
    P.ny = y < 6 ? -0.4 : 0.5; P.sp = 0.15;
    // дентикулы
    if (y >= 8 && y <= 10 && x % 5 === 0) P.ao = 0.5;
  });
}

function bookcase(x0, x1, y0, y1, seed, opt = {}) {
  const R = rng(seed);
  const boards = opt.boards || [];
  // каркас: задняя панель
  paint(ID.SHELF, x0, y0, x1, y1, -8, (x, y) => {
    col(C.wood1, 0.7 * woodGrain(x, y, 0, 0.7, 3)); P.ao = 0.55;
  });
  // полки и книги
  for (let s = 0; s < boards.length - 1; s++) {
    const top = boards[s] + 3, bot = boards[s + 1] - 1;
    if (opt.cabinetFrom && boards[s] >= opt.cabinetFrom) continue;
    // тень под верхней полкой
    shade(x0, top, x1, top + 5, (x, y) => 0.55 + (y - top) * 0.08);
    fillBooks(x0 + 5, x1 - 5, top, bot, R);
  }
  // доски полок
  for (const by of boards) {
    paint(ID.SHELF, x0, by, x1, by + 3, -4, (x, y) => {
      const r = y - by;
      const k = [1.15, 0.95, 0.7, 0.45][r];
      col(C.wood3, k * woodGrain(x, y, 0, 1, 5)); P.ny = r === 0 ? -0.7 : 0.3; P.sp = 0.2;
    });
  }
  // вертикальные стойки
  for (const px of [x0, x1 - 4]) {
    paint(ID.SHELF, px, y0, px + 4, y1, -3, (x, y) => {
      const r = x - px;
      col(C.wood3, [0.55, 1.05, 1.0, 0.85, 0.5][r] * woodGrain(y, x, 0, 0.6, 9)); P.nx = (r - 2) * 0.3; P.sp = 0.2;
    });
  }
  // шкафчики снизу
  if (opt.cabinetFrom) {
    const cy0 = opt.cabinetFrom + 3, cy1 = y1;
    paint(ID.SHELF, x0 + 4, cy0, x1 - 4, cy1, -3, (x, y) => {
      col(C.wood2, woodGrain(x, y, 0, 0.8, 11));
      const w = x1 - x0 - 8, mid = x0 + 4 + w / 2;
      const lx = x < mid ? x - (x0 + 4) : x - mid, ww = w / 2;
      const ly = y - cy0, hh = cy1 - cy0;
      // фрезерованные филёнки
      const inX = lx > 4 && lx < ww - 4, inY = ly > 4 && ly < hh - 3;
      if (inX && inY) {
        const ex = Math.min(lx - 4, ww - 4 - lx), ey = Math.min(ly - 4, hh - 3 - ly);
        const e = Math.min(ex, ey);
        if (e < 1) { P.ao = 0.5; } else if (e < 2.5) { P.ny = lx - 4 < ww - 4 - lx ? -0.3 : 0.3; P.nx = ex < ey ? (lx - 4 < ww - 4 - lx ? -0.5 : 0.5) : 0; P.ny = ey <= ex ? (ly - 4 < hh - 3 - ly ? -0.5 : 0.5) : 0; }
      }
      if (Math.abs(x - mid) < 1) P.ao = 0.4;
      // латунные ручки
      if ((Math.abs(x - (mid - 3)) < 1 || Math.abs(x - (mid + 2)) < 1) && Math.abs(y - (cy0 + 12)) < 2) { col(C.brass); P.sp = 0.9; }
      P.sp = Math.max(P.sp, 0.15);
    });
  }
}

function fillBooks(xa, xb, top, bot, R) {
  const hInt = bot - top;
  let x = xa;
  let leanNext = false;
  while (x < xb - 2) {
    const r = R();
    if (r < 0.035) { x += 2 + Math.floor(R() * 4); continue; }
    if (r < 0.075 && xb - x > 14) {
      // горизонтальная стопка
      const sw = 10 + Math.floor(R() * 4), n = 2 + Math.floor(R() * 3);
      let yy = bot;
      for (let k = 0; k < n; k++) {
        const th = 2 + Math.floor(R() * 2), cc = BOOKC[Math.floor(R() * BOOKC.length)], ww = sw - Math.floor(R() * 3);
        const bx = x + Math.floor(R() * 2);
        paint(ID.BOOK, bx, yy - th + 1, bx + ww - 1, yy, -6, (px, py) => {
          col(cc, 0.95 * (0.9 + 0.2 * hash(px, py)));
          P.ny = py === yy - th + 1 ? -0.6 : py === yy ? 0.5 : 0;
          if (px === bx + ww - 1 || px === bx) { col(C.cream, 0.7); }
        });
        yy -= th;
      }
      // безделушка сверху
      if (R() < 0.5) trinket(x + sw / 2, yy, R);
      x += sw + 1; continue;
    }
    if (r < 0.1 && xb - x > 8) { trinket(x + 4, bot, R, true); x += 9; continue; }
    const w = 3 + Math.floor(R() * 4);
    const h = hInt - 1 - Math.floor(R() * Math.min(9, hInt * 0.4));
    if (x + w > xb) break;
    const cc = BOOKC[Math.floor(R() * BOOKC.length)];
    const bright = 0.75 + R() * 0.45;
    const band = R() < 0.65, label = R() < 0.35, ribbed = R() < 0.3;
    const lean = leanNext ? (R() < 0.5 ? 1 : -1) : 0;
    leanNext = R() < 0.06;
    const bx = x, by0 = bot - h + 1;
    paint(ID.BOOK, bx - 2, by0, bx + w + 2, bot, -6, (px, py) => {
      const sh = lean ? Math.round(((bot - py) / h) * 2.2 * lean) : 0;
      const lx = px - bx - sh;
      if (lx < 0 || lx >= w) return false;
      const u = (lx + 0.5) / w;
      let k = bright;
      col(cc, k);
      P.nx = (u - 0.5) * 1.5;
      const ly = py - by0;
      if (band && (ly === 2 || ly === h - 3 || (ribbed && (ly === 5 || ly === h - 6)))) { col(C.brass, 0.85); P.sp = 0.6; }
      if (label && ly >= 4 && ly <= 6 && lx > 0 && lx < w - 1) col(C.cream, 0.8);
      if (ly === 0) { col(cc, k * 0.7); }
      if (lx === 0) P.ao = 0.55;
      P.sp = Math.max(P.sp, 0.08);
    });
    x += w + (R() < 0.1 ? 1 : 0);
  }
}

function trinket(cx, bot, R, standing) {
  const t = R();
  if (t < 0.33) {
    // ваза
    paint(ID.BOOK, cx - 3, bot - 9, cx + 3, bot, -6, (x, y) => {
      const ly = bot - y, dx = x - cx;
      const wv = ly < 2 ? 2 : ly < 6 ? 3 - Math.abs(ly - 4) * 0.3 : ly < 8 ? 1.5 : 2;
      if (Math.abs(dx + 0.5) > wv) return false;
      col(t < 0.15 ? hx('#22595a') : hx('#b8443a'), 0.9); P.nx = dx / 3; P.sp = 0.6;
    });
  } else if (t < 0.55) {
    // маленький череп — готичный акцент
    paint(ID.BOOK, cx - 3, bot - 6, cx + 3, bot, -6, (x, y) => {
      const dx = x - cx, dy = y - (bot - 3);
      if (dx * dx / 10 + dy * dy / 9 > 1) return false;
      col(hx('#d8cba6'));
      P.nx = dx / 3.5; P.ny = dy / 3.5;
      if (dy === 0 && Math.abs(dx) === 1) col(hx('#2e1f0a'));
      if (dy === 2 && dx === 0) col(hx('#5a4f3c'));
      P.sp = 0.2;
    });
  } else if (t < 0.75) {
    // латунные песочные/шар
    paint(ID.BOOK, cx - 3, bot - 5, cx + 3, bot, -6, (x, y) => {
      const dx = x - cx, dy = y - (bot - 2.5);
      if (dx * dx + dy * dy > 8) return false;
      col(C.brass); P.nx = dx / 3; P.ny = dy / 3; P.sp = 1;
    });
  } else {
    // свеча-огарок
    paint(ID.BOOK, cx - 1, bot - 6, cx + 1, bot, -6, (x, y) => { col(C.cream, 0.9); P.nx = (x - cx) * 0.6; });
  }
}

// ---------------------------------------------------------------- камин
const FIRE = { x0: 62, x1: 138, y0: 140, y1: 186, cx: 100 };
function drawChimney() {
  // стена-дымоход: тёмно-зелёный штоф
  paint(ID.CHIMNEY, 30, 12, 170, 190, -2, (x, y) => {
    const u = (x - 30) / 10, v = (y - 12) / 14;
    const dm = Math.abs(Math.sin(u * Math.PI) * Math.sin(v * Math.PI));
    const pat = Math.abs(((x - 30) % 10) - 5) + Math.abs(((y - 12) % 14) - 7) * 0.7;
    col([0.1, 0.17, 0.13], 0.85 + (pat < 3 ? 0.18 : 0) + (fbm(x * 0.2, y * 0.2) - 0.5) * 0.15);
    P.sp = 0.05; P.ao = 0.95 * (0.9 + 0.1 * dm);
    if (x < 33 || x > 167) { col(C.wood3, 0.8); P.nx = x < 33 ? -0.5 : 0.5; }
  });
  // картина в золотой раме
  const px0 = 56, px1 = 144, py0 = 28, py1 = 106;
  paint(ID.PAINTING, px0, py0, px1, py1, 1, (x, y) => {
    const e = Math.min(x - px0, px1 - x, y - py0, py1 - y);
    if (e < 6) {
      const k = [0.45, 1.0, 1.2, 0.85, 0.65, 1.0][e];
      col(C.brass, k);
      if (e === 2 && ((x + y) % 3 === 0)) col(C.brassL);
      if (e === 4 && ((x + y) % 2 === 0)) col(C.brassD);
      const dx = x - (px0 + px1) / 2, dy = y - (py0 + py1) / 2;
      P.nx = e < 3 ? Math.sign(dx) * (Math.abs(dx) > 40 ? 0.6 : 0) : -Math.sign(dx) * (Math.abs(dx) > 38 ? 0.5 : 0);
      P.ny = e < 3 ? Math.sign(dy) * (Math.abs(dy) > 35 ? 0.6 : 0) : -Math.sign(dy) * (Math.abs(dy) > 33 ? 0.5 : 0);
      P.sp = 0.9;
      // угловые завитки
      const cxl = Math.min(x - px0, px1 - x), cyl = Math.min(y - py0, py1 - y);
      if (cxl < 9 && cyl < 9 && cxl + cyl < 12) { col(C.brassL, 0.95); P.sp = 1; }
      return;
    }
    // холст: ночной пейзаж с морем и луной
    const u = (x - px0 - 6) / (px1 - px0 - 12), v = (y - py0 - 6) / (py1 - py0 - 12);
    let c;
    const horizon = 0.58 + 0.06 * Math.sin(u * 7) * 0.3;
    const hill = 0.62 - 0.12 * Math.exp(-((u - 0.25) ** 2) / 0.03) - 0.07 * Math.exp(-((u - 0.75) ** 2) / 0.05);
    const md = Math.hypot(u - 0.7, v - 0.25);
    if (v < hill) {
      c = mixc([0.08, 0.1, 0.18], [0.35, 0.22, 0.2], smooth(0.1, 0.6, v));
      const cl = fbm(u * 6, v * 14, 3, 4);
      if (cl > 0.6) c = mixc(c, [0.32, 0.3, 0.36], (cl - 0.6) * 2);
      if (md < 0.06) c = [0.92, 0.88, 0.72]; else if (md < 0.12) c = mixc(c, [0.6, 0.55, 0.45], (0.12 - md) * 6);
    } else if (v < 0.78) {
      c = [0.06, 0.07, 0.08];
      // одинокое дерево
    } else {
      c = mixc([0.08, 0.12, 0.18], [0.03, 0.04, 0.07], (v - 0.78) * 4);
      if (Math.abs(u - 0.7 + Math.sin(v * 60) * 0.02) < 0.025 + (v - 0.78) * 0.08 && hash(x, y, 9) > 0.45) c = mixc(c, [0.7, 0.66, 0.5], 0.35);
    }
    const tx = Math.abs(u - 0.25);
    if (v < hill + 0.02 && v > 0.3 && tx < 0.012) c = [0.04, 0.04, 0.05];
    if (v > 0.3 && v < 0.45 && Math.abs(u - 0.25) < 0.09 * (1 - Math.abs(v - 0.37) * 6) && fbm(u * 40, v * 40) > 0.45) c = [0.05, 0.05, 0.06];
    col(c, 0.85); P.sp = 0.25; P.ao = 0.85;
  });
  // каминная полка (мрамор)
  const marbleVein = (x, y) => {
    const n = fbm(x * 0.08, y * 0.08, 4, 21);
    const vein = Math.abs(Math.sin(x * 0.15 + y * 0.05 + n * 8));
    return vein < 0.08 ? 0.72 : 0.95 + (n - 0.5) * 0.12;
  };
  paint(ID.MANTEL, 34, 114, 166, 123, 6, (x, y) => {
    const r = y - 114;
    col(C.marble, [1.1, 1.0, 0.95, 0.9, 0.7, 0.85, 0.95, 0.75, 0.6, 0.45][r] * marbleVein(x, y));
    P.ny = r < 2 ? -0.8 : r > 6 ? 0.6 : 0; P.sp = 0.5;
    if (x < 36 || x > 164) { P.nx = x < 36 ? -0.6 : 0.6; }
  });
  // фриз с резьбой
  paint(ID.MANTEL, 40, 124, 160, 134, 4, (x, y) => {
    col(C.marble, 0.88 * marbleVein(x, y));
    const ly = y - 124;
    if (ly === 0) P.ao = 0.6;
    // гирлянда-резьба
    const wave = 129 + 2.5 * Math.sin((x - 40) * 0.26);
    if (Math.abs(y - wave) < 1 && x > 62 && x < 138) { P.ny = -0.6; col(C.marble, 1.05); }
    if (Math.abs(y - wave - 1) < 0.6 && x > 62 && x < 138) P.ao = 0.7;
    // розетки
    for (const rx of [48, 152]) { const d = Math.hypot(x - rx, y - 129); if (d < 4) { P.nx = (x - rx) / 4; P.ny = (y - 129) / 4; if (d < 1.5) P.ao = 0.6; } }
    P.sp = 0.4;
  });
  // пилястры
  for (const [a, b] of [[40, 56], [144, 160]]) {
    paint(ID.MANTEL, a, 134, b, 188, 4, (x, y) => {
      const lx = x - a, w = b - a;
      col(C.marble, 0.92 * marbleVein(x, y));
      // каннелюры
      if (lx > 2 && lx < w - 2 && y > 138 && y < 184) {
        const f = (lx - 3) % 3;
        P.nx = f === 0 ? -0.5 : f === 2 ? 0.5 : 0; if (f === 1) P.ao = 0.85;
      }
      if (lx < 1 || lx > w - 1) P.ao = 0.6;
      P.sp = 0.4;
    });
  }
  // топка
  paint(ID.FIREBOX, 56, 134, 144, 188, -10, (x, y) => {
    const dx = x - 100;
    // арочный верх
    const archTop = 138 - 4 * Math.cos((dx / 44) * Math.PI * 0.5);
    if (y < archTop) { col(C.marble, 0.8); P.ny = 0.6; P.ao = 0.7; return; }
    // боковые щёки в перспективе
    const side = Math.abs(dx) > 36 - (y - 134) * 0.05;
    if (side) {
      col([0.25, 0.1, 0.07], 0.6);
      const by = (y - 134) % 4, bxo = (Math.floor((y - 134) / 4) % 2) * 3;
      if (by === 0 || (x + bxo) % 6 === 0) P.ao = 0.5;
      P.nx = -Math.sign(dx) * 0.8; return;
    }
    // задняя стенка: кирпич в саже
    const by = (y - 134) % 5, bxo = (Math.floor((y - 134) / 5) % 2) * 5;
    col([0.22, 0.08, 0.06], 0.5 + 0.3 * smooth(186, 150, y) * 0 + hash(Math.floor((x + bxo) / 10), Math.floor((y - 134) / 5)) * 0.25);
    if (by === 0 || (x + bxo) % 10 === 0) col([0.05, 0.03, 0.03]);
    const soot = smooth(176, 140, y);
    P.r *= 1 - soot * 0.7; P.g *= 1 - soot * 0.7; P.b *= 1 - soot * 0.7;
    P.ao = 0.8;
  });
  // поленья и решётка
  const logs = [
    { x0: 70, x1: 124, y: 179, r: 4.5 }, { x0: 80, x1: 132, y: 174, r: 4 }, { x0: 74, x1: 112, y: 168, r: 3.5, tilt: -0.12 },
  ];
  for (const L of logs) {
    paint(ID.LOGS, L.x0 - 2, L.y - 10, L.x1 + 2, L.y + 6, -6, (x, y) => {
      const cyy = L.y + (L.tilt || 0) * (x - L.x0);
      const d = (y - cyy) / L.r;
      if (Math.abs(d) > 1 || x < L.x0 || x > L.x1) return false;
      const endD = Math.min(x - L.x0, L.x1 - x);
      col([0.22, 0.12, 0.07], 0.8 + 0.4 * fbm(x * 0.3, y * 1.2, 2, 8));
      P.ny = d; P.nz = Math.sqrt(1 - d * d) + 0.2;
      // торец полена
      if (endD < 2) { col([0.45, 0.28, 0.16]); P.nx = x - L.x0 < 2 ? -0.8 : 0.8; }
      // трещины с жаром
      const crack = fbm(x * 0.35, y * 0.9, 2, 31);
      const i = y * W + x;
      if (crack > 0.62) ember[i] = (crack - 0.62) * 4 * (0.6 + 0.4 * (1 - Math.abs(d)));
      if (d > 0.3) ember[i] = Math.max(ember[i], 0.35 * (d - 0.3));
    });
  }
  paint(ID.LOGS, 64, 182, 136, 186, -4, (x, y) => {
    const bar = (x - 64) % 6 < 1.5 || y === 182;
    if (!bar) return false;
    col([0.12, 0.1, 0.1]); P.sp = 0.5; P.ny = y === 182 ? -0.7 : 0;
  });
  // очаг
  paint(ID.MANTEL, 28, 186, 172, 194, 12, (x, y) => {
    const r = y - 186;
    col(C.stone, [1.1, 0.95, 0.9, 0.85, 0.8, 0.7, 0.55, 0.45, 0.35][r] * (0.9 + 0.2 * fbm(x * 0.2, y * 0.5)));
    P.ny = r < 2 ? -0.8 : 0.4; P.sp = 0.35;
  });
  // предметы на полке
  // часы
  paint(ID.MANTELITEM, 90, 96, 110, 113, 8, (x, y) => {
    const dx = x - 100, ly = y - 96;
    const topW = ly < 5 ? 6 + ly * 0.8 : 10;
    if (Math.abs(dx) > topW) return false;
    col(C.wood2, woodGrain(x, y)); P.nx = dx / 12; P.sp = 0.4;
    const d = Math.hypot(dx, y - 103);
    if (d < 5) { col(C.cream, 0.9); P.nx = dx / 8; P.ny = (y - 103) / 8; }
    if (d >= 5 && d < 6.2) { col(C.brass); P.sp = 1; }
    if (d < 5 && ((dx === 0 && y < 103 && y > 99) || (y === 103 && dx > 0 && dx < 4))) col([0.1, 0.08, 0.06]);
    if (ly > 14) { col(C.brass, 0.9); P.sp = 0.8; }
  });
  // подсвечники
  for (const cx of [46, 154]) {
    paint(ID.MANTELITEM, cx - 4, 92, cx + 4, 113, 8, (x, y) => {
      const dx = x - cx, ly = y - 92;
      let w;
      if (ly < 11) w = 1.2; // свеча
      else if (ly < 12) w = 3; else if (ly < 18) w = 1 + (ly === 15 ? 1 : 0); else w = 3 + (ly - 18);
      if (Math.abs(dx) > w) return false;
      if (ly < 11) { col(C.cream, 0.95); P.nx = dx * 0.6; if (ly < 2) col(C.cream, 1.05); return; }
      col(C.brass); P.nx = dx / 3; P.sp = 1;
    });
  }
  // сухоцветы в вазе
  paint(ID.MANTELITEM, 66, 88, 80, 113, 8, (x, y) => {
    const dx = x - 73, ly = y - 88;
    if (ly > 16) { const w = ly < 19 ? 2 : 3.5 - Math.abs(ly - 21) * 0.25; if (Math.abs(dx + 0.5) > w) return false; col(hx('#22595a')); P.nx = dx / 4; P.sp = 0.7; return; }
    // стебли
    const st = [-4, -2, 0, 1, 3, 5];
    for (const s of st) {
      const sx = 73 + s * (1 - ly / 18) * 0.2 + s * ((16 - ly) / 16) * 0.6;
      if (Math.abs(x - sx) < 0.6) { col(ly < 7 ? hx('#6e4a82') : hx('#5c4210')); if (ly < 7 && (y % 2 === 0)) col(hx('#523263')); return; }
    }
    return false;
  });
}

// ---------------------------------------------------------------- окно
const WIN = { x0: 420, x1: 466, y0: 26, y1: 150, cx: 443, ar: 23 };
function inWindowGlass(x, y) {
  if (x < WIN.x0 || x > WIN.x1 || y > WIN.y1) return false;
  const top = WIN.y0 + WIN.ar;
  if (y < top) return Math.hypot(x - WIN.cx, y - top) <= WIN.ar;
  return true;
}
function drawWindow() {
  // ниша
  paint(ID.WINDOW, 410, 14, 476, 190, -6, (x, y) => {
    col(C.wood2, 0.85 * woodGrain(x, y, 0, 0.6));
    const top = WIN.y0 + WIN.ar;
    const d = y < top ? Math.hypot(x - WIN.cx, y - top) - WIN.ar : Math.max(WIN.x0 - x, x - WIN.x1);
    if (d < 5 && d > 0) { P.nx = (x - WIN.cx) / 40; P.ao = 0.7 + d * 0.05; }
    if (y < 18) P.ao = 0.5;
    P.sp = 0.15;
    if (inWindowGlass(x, y)) { col([0, 0, 0]); P.ao = 1; }
  });
  // переплёт рисуется динамически поверх стекла (см. updateWindow); здесь — подоконник
  paint(ID.WINDOW, 412, 150, 474, 156, 2, (x, y) => {
    const r = y - 150;
    col(C.wood3, [1.15, 1.0, 0.9, 0.6, 0.45, 0.35, 0.3][r] * woodGrain(x, y)); P.ny = r < 2 ? -0.8 : 0.5; P.sp = 0.3;
  });
  // низкий шкаф под окном
  paint(ID.WINDOW, 414, 157, 472, 190, -2, (x, y) => {
    col(C.wood2, woodGrain(x, y, 0, 0.8, 4));
    const lx = (x - 414) % 29, ly = y - 157;
    if (lx < 1 || ly < 1) P.ao = 0.45;
    else if (lx > 3 && lx < 26 && ly > 3 && ly < 30) { const e = Math.min(lx - 3, 26 - lx, ly - 3, 30 - ly); if (e < 2) { P.nx = lx < 14 ? -0.4 : 0.4; P.ny = ly < 16 ? -0.4 : 0.4; } }
    if (Math.abs(lx - 25) < 1 && Math.abs(ly - 15) < 2) { col(C.brass); P.sp = 1; }
  });
  // шторы
  for (const [a, b, s] of [[402, 421, 1], [465, 480, 2]]) {
    paint(ID.CURTAIN, a, 14, b, 192, 10, (x, y) => {
      // подхват на 112
      const tie = 112;
      let lx = x - a, w = b - a;
      let pinch = 0;
      if (y > tie - 26) pinch = Math.max(0, 1 - Math.abs(y - tie) / 26);
      const edge = s === 1 ? a + w * (1 - pinch * 0.35) : a + w * pinch * 0.35;
      if (s === 1 && x > edge) return false;
      if (s === 2 && x < edge) return false;
      const fold = Math.sin(lx * (0.9 + pinch * 0.6) + s);
      col([0.36, 0.08, 0.14], 0.8 + fold * 0.18 + (fbm(x * 0.4, y * 0.05) - 0.5) * 0.15);
      P.nx = Math.cos(lx * 0.9 + s) * 0.7; P.sp = 0.12;
      if (Math.abs(y - tie) < 2) { col(C.brass, 0.85 + (x % 2) * 0.2); P.sp = 0.7; P.ny = (y - tie) * 0.4; }
      if (y > 186) P.ao = 0.7;
    });
  }
  // карниз
  paint(ID.CURTAIN, 398, 12, 480, 15, 12, (x, y) => { col(C.brass, [1.2, 1, 0.7, 0.45][y - 12]); P.ny = y === 12 ? -0.8 : 0.5; P.sp = 1; if (x < 400) col(C.brassL); });
}

// ---------------------------------------------------------------- лестница и рейлинг
function drawLadder() {
  paint(ID.LADDER, 170, 13, 410, 15, -1, (x, y) => { col(C.brass, y === 13 ? 1.2 : 0.8); P.ny = y === 13 ? -0.7 : 0.4; P.sp = 1; });
  const lean = (y) => (190 - y) * 0.06;
  paint(ID.LADDER, 376, 11, 412, 192, 3, (x, y) => {
    const o = lean(y);
    const l1 = 382 + o, l2 = 400 + o;
    const onRail = (x >= l1 && x < l1 + 3) || (x >= l2 && x < l2 + 3);
    const rung = (y - 20) % 15 < 2 && x > l1 && x < l2 + 1 && y > 18;
    if (!onRail && !rung) return false;
    col(C.wood3, woodGrain(y, x, 0, 0.6));
    if (onRail) { const r = x >= l2 ? x - l2 : x - l1; P.nx = (r - 1.2) * 0.6; } else { P.ny = (y - 20) % 15 === 0 ? -0.6 : 0.6; }
    P.sp = 0.3;
    if (y < 17) { col(C.brass); P.sp = 1; }
  });
}

// ---------------------------------------------------------------- пол и ковёр
function drawFloor() {
  const vy = 40, vx = 270;
  paint(ID.FLOOR, 0, 190, W - 1, H - 1, 30, (x, y) => {
    const dy = y - vy;
    const u = (x - vx) / dy;
    const depth = 3000 / dy;
    const plank = Math.floor(u * 9);
    const joint = Math.floor(depth / 4 + hash(plank, 3) * 7);
    const f = u * 9 - plank;
    const base = 0.75 + hash(plank, joint) * 0.3;
    col(C.wood2, base * (0.9 + 0.2 * fbm(u * 40, depth * 0.3, 2, 2)));
    if (f < 0.06 * (dy / 100) + 0.02) P.ao = 0.4;
    if (Math.abs(depth / 4 + hash(plank, 3) * 7 - Math.round(depth / 4 + hash(plank, 3) * 7)) < 0.03) P.ao = 0.5;
    P.ny = -0.6; P.nz = 0.6; P.sp = 0.35;
    // плинтус
    if (y < 193) { col(C.wood1, 0.8); P.ny = 0; P.nz = 1; P.ao = 0.6; }
    // ковёр
    if (y >= 204 && Math.abs(u) < 1.55) {
      const ru = u / 1.55; // -1..1
      const rv = (depth - 3000 / (H - vy)) / (3000 / (204 - vy) - 3000 / (H - vy)); // 0 (близко) .. 1 (дальний край)
      const eu = 1 - Math.abs(ru), ev = Math.min(rv, 1 - rv) * 3;
      const e = Math.min(eu * 3.2, ev);
      let c;
      if (e < 0.08) c = [0.6, 0.5, 0.32]; // бахрома-кромка
      else if (e < 0.25) c = [0.12, 0.14, 0.28];
      else if (e < 0.3) c = [0.72, 0.55, 0.25];
      else if (e < 0.45) {
        const p = Math.sin(ru * 40) * Math.sin(rv * 30);
        c = p > 0.3 ? [0.65, 0.45, 0.2] : [0.32, 0.07, 0.08];
      } else {
        const m = Math.abs(Math.sin(ru * 12 + Math.sin(rv * 9) * 2)) * Math.abs(Math.cos(rv * 14));
        c = m > 0.65 ? [0.18, 0.2, 0.36] : m > 0.35 ? [0.55, 0.15, 0.12] : [0.4, 0.08, 0.09];
      }
      col(c, 0.85 + 0.25 * hash(x, y)); P.sp = 0; P.ao = 1;
      P.ny = -0.7; P.nz = 0.7;
    }
  });
}

// ---------------------------------------------------------------- глобус
function drawGlobe() {
  const gx = 446, gy = 196, gr = 17;
  // ножки
  paint(ID.GLOBE, 424, 210, 468, 262, 50, (x, y) => {
    const legs = [[446, 216, 430, 258], [446, 216, 462, 258], [446, 216, 447, 262]];
    for (const [ax, ay, bx, by] of legs) {
      const t = clamp((y - ay) / (by - ay));
      const lx = ax + (bx - ax) * t;
      if (Math.abs(x - lx) < 1.4 - t * 0.3 && y >= ay) { col(C.wood3, 0.9); P.nx = (x - lx) * 0.7; P.sp = 0.3; return; }
    }
    // кольцо-стол
    const ey = (y - 214) / 3.5, ex = (x - gx) / 22;
    if (ex * ex + ey * ey < 1 && ex * ex + ey * ey > 0.55) { col(C.wood3); P.ny = ey; P.sp = 0.4; return; }
    return false;
  });
  paint(ID.GLOBE, gx - gr - 3, gy - gr - 3, gx + gr + 3, gy + gr + 3, 52, (x, y) => {
    const dx = x - gx, dy = y - gy;
    const d = Math.hypot(dx, dy);
    // меридиан
    const md = Math.hypot(dx * 1.0, dy) - gr - 1.5;
    if (Math.abs(md) < 1 && dx < 8) { col(C.brass); P.nx = dx / gr; P.ny = dy / gr; P.sp = 1; return; }
    if (d > gr) return false;
    const nx = dx / gr, ny = dy / gr, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    // сферические координаты + наклон
    const lon = Math.atan2(nx, nz) + 0.8, lat = Math.asin(ny);
    const land = fbm(lon * 2.2 + 10, lat * 2.6, 4, 77);
    col(land > 0.55 ? [0.55, 0.38, 0.2] : [0.72, 0.62, 0.42]);
    if (land > 0.53 && land < 0.56) col([0.35, 0.2, 0.1]);
    if (Math.abs(((lat * 6) % 1 + 1) % 1 - 0.5) < 0.04 || Math.abs(((lon * 4) % 1 + 1) % 1 - 0.5) < 0.03) col([0.5, 0.4, 0.28]);
    nrmSet(nx, ny, nz); P.sp = 0.5;
  });
}

// =====================================================================
//  КРЕСЛО НАСТАВНИЦЫ
// =====================================================================
const CX = 270, CY = 84;
function tuft(x, y, s) {
  const a = (x + y) / s, b = (x - y) / s;
  const fa = a - Math.floor(a), fb = b - Math.floor(b);
  const ha = Math.sin(fa * Math.PI), hb = Math.sin(fb * Math.PI);
  const h = ha * hb;
  const ga = Math.cos(fa * Math.PI) * hb, gb = ha * Math.cos(fb * Math.PI);
  return { h, gx: (ga + gb) * 0.7, gy: (ga - gb) * 0.7, button: ha < 0.22 && hb < 0.22, crease: ha < 0.1 || hb < 0.1 };
}
function drawChair() {
  paint(ID.CHAIR, CX - 86, 22, CX + 86, 200, 22, (x, y) => {
    const dx = x - CX, ax = Math.abs(dx);
    const top = 28 + (dx / 70) ** 2 * 18;
    const wingTop = 66, wingOut = 82 - Math.max(0, (y - 150) * 0.25);
    const inBack = ax <= 70 && y >= top;
    const inWing = ax > 58 && ax <= wingOut && y >= wingTop + (ax - 62) * 0.9 && y < 192;
    if (!inBack && !inWing) return false;
    if (inWing && ax > 68) {
      const t = (ax - 68) / (wingOut - 68);
      col(C.leather, 0.85 + 0.25 * Math.sin(t * Math.PI));
      P.nx = Math.sign(dx) * (t - 0.25) * 1.3; P.sp = 0.5;
      if (Math.abs(ax - 69) < 0.6 && (y % 3 === 0)) { col(C.brassL); P.sp = 1; }
      return;
    }
    const edge = Math.min(y - top, 70 - ax);
    if (edge < 3.5) {
      col(C.leather, 0.9); P.ny = -0.5; P.nx = Math.sign(dx) * 0.3; P.sp = 0.55;
      if (edge > 1 && edge < 2.2 && ((x + y) % 3 === 0)) { col(C.brassL); P.sp = 1; }
      return;
    }
    const t = tuft(x - CX, y - 34, 13);
    col(C.leather, 0.5 + t.h * 0.32 + (fbm(x * 0.3, y * 0.3, 2) - 0.5) * 0.1);
    P.nx = t.gx * 0.6; P.ny = t.gy * 0.6; P.sp = 0.35;
    if (t.crease) P.ao = 0.72;
    if (t.button) { col(C.leatherD, 0.8); P.ao = 0.5; P.sp = 0.9; }
  });
}

// =====================================================================
//  ПЕРСОНАЖ
// =====================================================================
const FRX = 18, FRY = 22;
function faceW(y) {
  const t = (y - CY) / FRY;
  if (t < -1 || t > 1) return -1;
  if (t < 0) return FRX * Math.sqrt(1 - t * t * 0.86);
  const a = Math.max(0, 1 - t ** 4);
  return FRX * Math.sqrt(a) * (1 - 0.2 * t * t);
}
const hairline = (dx) => CY - 19 + 0.05 * dx * dx;
function hairHW(y, x) {
  let hw;
  if (y < CY - 44) return -1;
  if (y < CY - 3) { const t = (y - (CY - 3)) / 41; hw = 35 * Math.sqrt(Math.max(0, 1 - t * t)) + 2; }
  else if (y < CY + 52) hw = 37 + (y - (CY - 3)) * 0.2;
  else hw = 48 + (y - (CY + 52)) * 0.1;
  // кудрявый, «гребешковый» край
  hw += (fbm(x * 0.12, y * 0.12, 3, 5) - 0.5) * 7 + 2.4 * Math.abs(Math.sin(y * 0.33 + (x > CX ? 1.7 : 0))) - 1.2;
  return hw;
}
const hairBottom = (x) => CY + 100 + 10 * vnoise(x * 0.18, 5, 3) + 4 * vnoise(x * 0.55, 1, 4);

function hairShade(x, y, P, front) {
  const dx = x - CX;
  const yy = y - (CY - 44);
  const radial = Math.atan2(dx, Math.max(6, yy + 10)) * 34;
  const bl = smooth(CY - 16, CY + 18, y);
  const flow = mix(radial, dx, bl);
  const lane = Math.floor(flow / 5.5);
  const seg = Math.floor((y + hash(lane, 11) * 14) / 12);
  const jitter = (hash(seg, lane, 5) - 0.5) * 3.2;
  const wob = 2.0 * Math.sin(y * 0.5 + hash(lane, 3) * 6.28);
  const u = (flow + wob + jitter) / 5.5;
  const ci = Math.floor(u), f = u - ci;
  const ph = hash(ci, seg, 7) * 6.28;
  const s = Math.sin(y * 0.62 + ph);
  const center = 0.5 + s * 0.24;
  const cross = clamp(1 - Math.abs(f - center) * 2.5);
  const crest = 0.5 + 0.5 * Math.cos(y * 0.62 + ph);
  let v = Math.pow(cross, 1.15) * (0.55 + 0.45 * crest);
  v += (hash(x, y, 3) - 0.5) * 0.1;
  const deep = fbm(x * 0.06, y * 0.06, 2, 13);
  v *= 0.7 + deep * 0.55;
  const c = v < 0.33 ? mixc(C.hairD, C.hairM, v / 0.33) : mixc(C.hairM, C.hairL, clamp((v - 0.33) / 0.67) ** 1.3);
  col(c, front ? 1 : 0.72);
  // форма массы + локальный цилиндр локона
  const fnx = clamp(dx / 46, -1, 1);
  const lnx = (f - center) * 2.0;
  P.nx = fnx * 0.75 + lnx * 0.55;
  P.ny = Math.cos(y * 0.62 + ph) * 0.45 + (y < CY - 22 ? -0.7 * (1 - (y - (CY - 44)) / 22) : 0);
  P.nz = 0.85;
  P.sp = 0.4 * cross * crest;
  if (cross < 0.12) P.ao = 0.62;
}

function drawHairBack() {
  paint(ID.HAIRBACK, CX - 64, CY - 48, CX + 64, CY + 118, 30, (x, y) => {
    const hw = hairHW(y, x);
    if (hw < 0 || Math.abs(x - CX) > hw) return false;
    if (y > hairBottom(x)) return false;
    hairShade(x, y, P, false);
    P.ao *= 0.72;
  });
}

const BODY_S = CY + 30;
function bodyHW(y) {
  if (y < BODY_S) return -1;
  return 10.5 + 43 * (1 - Math.exp(-(y - BODY_S) / 8.5)) + Math.max(0, y - (CY + 60)) * 0.06;
}
const vNeck = (y) => 13 * (1 - (y - BODY_S) / 46);
const HEM = (x) => 999 + 2.6 * Math.sin(x * 0.7) + 1.2 * Math.sin(x * 1.9);
function drawBody() {
  paint(ID.BODY, CX - 70, BODY_S - 2, CX + 70, 200, 36, (x, y) => {
    const dx = x - CX, ax = Math.abs(dx);
    const hw = bodyHW(y);
    if (hw < 0 || ax > hw) return false;
    const armZone = ax > 37 && y > CY + 56;
    if (armZone && y > HEM(x)) {
      // голая рука ниже рукава
      col(C.skin, 0.95);
      const k = clamp((ax - 37) / (hw - 37));
      P.nx = Math.sign(dx) * (k * 1.8 - 0.7); P.sp = 0.06;
      if (y < HEM(x) + 2) P.ao = 0.6;
      return;
    }
    const fold = Math.sin(dx * 0.5 + fbm(x * 0.05, y * 0.04, 2, 4) * 9 + (y > CY + 70 ? dx * 0.08 : 0));
    col(C.dress, 1 + fold * 0.28);
    P.nx = Math.cos(dx * 0.5) * 0.35 + Math.sign(dx) * smooth(hw - 10, hw, ax) * 0.9;
    P.ny = y < CY + 42 ? -0.5 : 0;
    P.sp = 0.25;
    if (y > CY + 58 && Math.abs(ax - 38) < 1) P.ao = 0.45;
    if (armZone && Math.abs(y - HEM(x)) < 1.4) { col(C.dressL, 1.1); P.ny = 0.6; }
    if (ax < 18 && y > CY + 76 && y < CY + 92) P.nx += Math.sin(dx * 1.1) * 0.45;
  });
}

function drawNeck() {
  paint(ID.NECK, CX - 18, CY + 12, CX + 18, CY + 80, 38, (x, y) => {
    const dx = x - CX, ax = Math.abs(dx);
    let inNeck = false, inV = false;
    if (y < BODY_S + 2) inNeck = ax < 8.5 + Math.max(0, y - (CY + 24)) * 0.45;
    if (y >= BODY_S - 2 && y < CY + 76) inV = ax < vNeck(y) && bodyHW(y) > 0;
    if (!inNeck && !inV) return false;
    col(C.skin, 0.97);
    P.nx = dx / 11; P.ny = 0.1; P.sp = 0.06;
    if (y < CY + 28) P.ao = 0.45 + smooth(CY + 18, CY + 28, y) * 0.4;
    if (Math.abs(y - (CY + 33 + ax * 0.13)) < 0.7 && ax > 3 && ax < 13) { P.ny = -0.7; P.ao = 0.84; }
    if (y > CY + 58 && ax < 1) P.ao = 0.68;
    if (ax < 2.5 && y > CY + 29 && y < CY + 33) P.ao *= 0.85; // ямочка
    if (inV && ax > vNeck(y) - 1.5) P.ao *= 0.78;
  });
}

function drawFaceBase() {
  paint(ID.FACE, CX - 21, CY - 25, CX + 21, CY + 24, 40, (x, y) => {
    const dx = x - CX, dy = y - CY;
    const w = faceW(y);
    if (w < 0 || Math.abs(dx + 0.5) > w + 0.5) return false;
    col(C.skin);
    const R = w + 7;
    P.nx = (dx + 0.5) / R; P.ny = dy / 38 + (dy > 8 ? (dy - 8) / 34 : 0); P.nz = 1;
    for (const ex of [-9, 9]) {
      const e = ((dx - ex) / 7.5) ** 2 + ((dy + 2.5) / 4.6) ** 2;
      if (e < 1) P.ao *= 0.84 + e * 0.16;
    }
    // нос
    if (dy > 1 && dy < 10 && Math.abs(dx) <= 3) {
      const nb = dy < 7 ? 0.55 : 1; // переносица мягче кончика
      if (dx === -2) P.nx -= 0.18 * nb; else if (dx === 2) { P.nx += 0.32 * nb; P.ao *= dy > 4 ? 0.9 : 0.95; }
      else if (dx === 1) P.nx += 0.12 * nb; else if (dx === -1) { P.sp = 0.16; }
      if (dy >= 7 && Math.abs(dx) <= 2) { P.ny = -0.25 + (dy - 7) * 0.2; P.sp = 0.3; }
    }
    if (dy === 9 && Math.abs(dx) <= 4) { const a = Math.abs(dx); P.ao *= a === 2 ? 0.55 : a === 3 ? 0.72 : a === 4 ? 0.88 : 0.8; P.ny = 0.5; }
    if (dy === 8 && Math.abs(dx) === 3) P.ao *= 0.88;
    if (dy === 10 && Math.abs(dx) <= 1) P.ao *= 0.85;
    // скулы
    for (const sx of [-12, 12]) { const d = (dx - sx) ** 2 / 30 + (dy - 4) ** 2 / 14; if (d < 1) P.ny -= 0.2 * (1 - d); }
    // подбородок
    if (dy >= 19 && Math.abs(dx) < 5) { P.ny = 0.45; P.sp = 0.1; }
    if (dy === 21 && Math.abs(dx) < 4) P.ao *= 0.9;
    if (dy > 5 && Math.abs(dx) > w - 2.5) P.ao *= 0.85;
    P.sp = Math.max(P.sp, 0.07);
    if (dy < -11 && Math.abs(dx) < 8) P.sp = 0.13;
  });
}

function drawHairFront() {
  paint(ID.HAIRFRONT, CX - 66, CY - 48, CX + 66, CY + 110, 44, (x, y) => {
    const dx = x - CX, ax = Math.abs(dx);
    const hw = hairHW(y, x);
    if (hw < 0 || ax > hw + 0.5) return false;
    const fw = faceW(y);
    let inside = false;
    if (y < hairline(dx) + (vnoise(x * 0.5, 3) - 0.5) * 1.6) inside = true;
    else if (y < CY + 18) {
      const cover = fw - 1.5 - 2.2 * smooth(CY - 8, CY + 12, y) + (vnoise(y * 0.35, x > CX ? 2 : 7) - 0.5) * 2.2;
      if (ax > cover) inside = true;
    } else {
      const yi = y - (CY + 18);
      const inner = 13 + yi * 0.33 + (vnoise(y * 0.22, dx > 0 ? 1 : 2) - 0.5) * 3.5;
      const outer = Math.min(hw, 37 + yi * 0.5);
      const endY = CY + 96 + 9 * vnoise(x * 0.2, 9, 3) - (ax < 32 ? (32 - ax) * 0.7 : 0);
      if (ax > inner && ax < outer && y < endY) inside = true;
    }
    if (!inside) return false;
    hairShade(x, y, P, true);
    if (Math.abs(dx + 0.5) < 0.8 && y < hairline(0) - 1 && y > CY - 40) { col(C.hairD, 0.6); P.ao = 0.55; }
  });
}

function drawPendant() {
  paint(ID.PENDANT, CX - 12, CY + 22, CX + 12, CY + 60, 39, (x, y) => {
    const dx = x - CX, ax = Math.abs(dx);
    const cordY = CY + 27 + (10.5 - Math.min(ax, 10.5)) * 1.65;
    if (ax <= 10.5 && ax > 1 && Math.abs(y - cordY) < 0.7) { col([0.04, 0.03, 0.04]); P.sp = 0.5; return; }
    const map = ['.SS...SS.', 'S..S.S..S', 'S...S...S', 'S.......S', '.S.....S.', '..S...S..', '...S.S...', '....S....'];
    const r = y - (CY + 45), c = dx + 4;
    if (r >= 0 && r < map.length && c >= 0 && c < 9 && map[r][c] === 'S') {
      col([0.86, 0.86, 0.92]); P.sp = 1.5; P.nx = (c - 4) / 5; P.ny = (r - 3) / 5;
      if ((r * 3 + c) % 4 === 0) { P.er = 0.3; P.eg = 0.3; P.eb = 0.34; }
      return;
    }
    if (ax < 1 && y > cordY && y < CY + 45) { col([0.72, 0.72, 0.78]); P.sp = 1; return; }
    return false;
  });
}

// --------------------------------------------------------- черты лица (спрайты)
const FEAT = {
  c: (s) => mixc(s, [0.5, 0.31, 0.33], 0.3),
  C: (s) => mixc(s, [0.36, 0.2, 0.25], 0.55),
  L: () => [0.055, 0.03, 0.04],
  l: (s) => mixc(s, [0.24, 0.12, 0.12], 0.6),
  u: (s) => mixc(s, [0.56, 0.38, 0.4], 0.2),
  o: () => [0.84, 0.79, 0.74],
  B: () => [0.12, 0.06, 0.045],
  b: (s) => mixc(s, [0.2, 0.1, 0.07], 0.55),
  U: () => [0.64, 0.33, 0.33],
  V: () => [0.54, 0.27, 0.28],
  M: () => [0.27, 0.1, 0.11],
  D: () => [0.72, 0.41, 0.39],
  d: () => [0.86, 0.58, 0.54],
  O: () => [0.17, 0.05, 0.06],
  T: () => [0.88, 0.83, 0.78],
  s: (s) => mulc(s, 0.82),
  k: (s) => mulc(s, 0.84),
};
const EYES = {
  open: ['....ccc....', '..ccCCCcc..', 'LcCCCCCCCc.', 'LLLLLLLLLL.', '.LoooooooL.', '..ooooooo..', '..lllllll..', '...uuuuu...'],
  soft: ['....ccc....', '..ccCCCcc..', '.cCCCCCCCc.', 'LcCCCCCCCc.', 'LLLLLLLLLL.', '.Lo.oooooL.', '..lllllll..', '...uuuuu...'],
  closed: ['....ccc....', '..ccCCCcc..', '.cCCCCCCCc.', '.cCCCCCCCc.', '..cccccccc.', 'LLLLLLLLLL.', '..l.lll.l..', '...........'],
  happy: ['....ccc....', '..ccCCCcc..', '..ccccccc..', '...LLLLL...', '..L.....L..', '.L.......l.', '...........', '...........'],
  wide: ['..ccCCCcc..', '.cCCCCCCCc.', 'LLLLLLLLLL.', '.LoooooooL.', '.ooooooooo.', '..ooooooo..', '..lllllll..', '...uuuuu...'],
};
EYES.half = EYES.soft;
const BROWS = {
  neutral: ['....bbBBb....', '..bBBBBBBBBb.', '.bBBb....bBBB', 'bb.........bB'],
  relaxed: ['.............', '...bbBBBBb...', '.bBBBBBBBBBBb', 'bb.......bbBB'],
  raised: ['...bBBBBBb...', '.bBBb....bBBb', 'bB.........BB', '............b'],
  concern: ['........bBBBB', '....bBBBBBBb.', '.bBBBBb......', 'bb...........'],
  stern: ['bbBBb........', '.bBBBBBBb....', '....bbBBBBBb.', '........bBBBB'],
};
const MOUTHS = {
  neutral: ['.....VU.UV.....', '...VUUUUUUUV...', '..kMMMMMMMMMk..', '...DDDDdDDDD...', '....DDdddDD....', '......sss......'],
  soft: ['.....VU.UV.....', '..kVUUUUUUUVk..', '...MMMMMMMMM...', '...DDDDdDDDD...', '....DDdddDD....', '......sss......'],
  smile: ['.....VU.UV.....', '.M.VUUUUUUUV.M.', '..MMMMMMMMMMM..', '...DDDDddDDD...', '.....DDddD.....', '......sss......'],
  smirk: ['.....VU.UV.....', '...VUUUUUUUV.M.', '..kMMMMMMMMMM..', '...DDDDdDDDD...', '....DDdddDD....', '......sss......'],
  sad: ['.....VU.UV.....', '...VUUUUUUUV...', '...MMMMMMMMM...', '..MDDDDdDDDDM..', '....DDdddDD....', '......sss......'],
  talk1: ['.....VU.UV.....', '...VUUUUUUUV...', '..kMOOOOOOOMk..', '...DDDDdDDDD...', '....DDdddDD....', '......sss......'],
  talk2: ['.....VU.UV.....', '...MUUUUUUUM...', '...MTTTTTTTM...', '...MOOOOOOOM...', '....DDDdDDD....', '.....DDdDD.....', '......sss......'],
  talk3: ['......VUV......', '.....MUUUM.....', '....MOOOOOM....', '....MOOOOOM....', '.....DDdDD.....', '......sss......'],
  smileTalk: ['.....VU.UV.....', '.M.VUUUUUUUV.M.', '..MTTTTTTTTTM..', '...MOOOOOOOM...', '....DDDdDDD....', '......sss......'],
  laugh: ['...............', '.MVUUUUUUUUUVM.', '..MTTTTTTTTTM..', '...MOOOOOOOM...', '....MOOOOOM....', '.....DDdDD.....', '......sss......'],
  oh: ['......VUV......', '.....MUUUM.....', '....MOOOOOM....', '....MOOOOOM....', '.....MOOOM.....', '......DdD......', '......sss......'],
};

let faceSnap = null;
const FR = { x0: CX - 21, y0: CY - 25, x1: CX + 21, y1: CY + 24 };
function snapFace() {
  const w = FR.x1 - FR.x0 + 1, h = FR.y1 - FR.y0 + 1;
  faceSnap = new Float32Array(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (FR.y0 + y) * W + FR.x0 + x;
    faceSnap.set(alb.subarray(i * 3, i * 3 + 3), (y * w + x) * 3);
  }
}
function restoreFace() {
  const w = FR.x1 - FR.x0 + 1, h = FR.y1 - FR.y0 + 1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (FR.y0 + y) * W + FR.x0 + x;
    if (idB[i] !== ID.FACE) continue;
    alb.set(faceSnap.subarray((y * w + x) * 3, (y * w + x) * 3 + 3), i * 3);
  }
}
function putFeat(x, y, key) {
  if (idAt(x, y) !== ID.FACE) return;
  const i = (y * W + x) * 3;
  const f = FEAT[key]; if (!f) return;
  const c = f([alb[i], alb[i + 1], alb[i + 2]]);
  alb[i] = c[0]; alb[i + 1] = c[1]; alb[i + 2] = c[2];
}
function drawMap(map, ox, oy, mirror, onCell) {
  for (let r = 0; r < map.length; r++) for (let c = 0; c < map[r].length; c++) {
    const ch = map[r][c];
    if (ch === '.') continue;
    const x = mirror ? ox - c : ox + c;
    if (onCell) onCell(x, oy + r, ch, r, c); else putFeat(x, oy + r, ch);
  }
}
function tintFace(dx, dy, rad, tint, amt) {
  for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++) {
    const d = Math.hypot(x, y) / rad; if (d > 1) continue;
    const px = CX + dx + x, py = CY + dy + y;
    if (idAt(px, py) !== ID.FACE) continue;
    const i = (py * W + px) * 3, k = amt * (1 - d);
    alb[i] = mix(alb[i], tint[0], k); alb[i + 1] = mix(alb[i + 1], tint[1], k); alb[i + 2] = mix(alb[i + 2], tint[2], k);
  }
}

const faceState = { eyes: 'open', browL: 'neutral', browR: 'neutral', mouth: 'neutral', gaze: 0, blush: 0.12 };
function drawFeatures() {
  restoreFace();
  tintFace(-12, 6, 5, [0.88, 0.52, 0.5], 0.3 + faceState.blush);
  tintFace(12, 6, 5, [0.88, 0.52, 0.5], 0.3 + faceState.blush);
  tintFace(-16, 11, 5, [0.62, 0.42, 0.4], 0.25);
  tintFace(16, 11, 5, [0.62, 0.42, 0.4], 0.25);
  tintFace(0, -14, 5, [0.95, 0.8, 0.7], 0.15);
  const em = EYES[faceState.eyes] || EYES.open;
  for (const side of [-1, 1]) {
    const ox = side < 0 ? CX - 14 : CX + 14, oy = CY - 7;
    const opening = [];
    drawMap(em, ox, oy, side > 0, (x, y, ch) => {
      if (ch === 'o') { opening.push([x, y]); putFeat(x, y, 'o'); } else putFeat(x, y, ch);
    });
    if (!opening.length) continue;
    const g = faceState.gaze;
    const icx = (side < 0 ? CX - 9 : CX + 9) + g;
    const rows = [...new Set(opening.map((o) => o[1]))].sort((a, b) => a - b);
    const minR = rows[0], maxR = rows[rows.length - 1];
    for (const [x, y] of opening) {
      const dxI = x - icx, a = Math.abs(dxI);
      const i = (y * W + x) * 3;
      if (a > 2) {
        if (y === minR) { alb[i] *= 0.66; alb[i + 1] *= 0.63; alb[i + 2] *= 0.66; }
        continue;
      }
      let c;
      if (y === minR) c = a === 0 ? [0.03, 0.02, 0.02] : a === 1 ? [0.12, 0.06, 0.035] : [0.09, 0.045, 0.03];
      else c = a === 0 ? [0.08, 0.04, 0.03] : a === 1 ? [0.36, 0.2, 0.11] : [0.2, 0.1, 0.06];
      if (y === minR && dxI === -1) c = [0.97, 0.94, 0.88];
      if (y === maxR && dxI === 1 && maxR !== minR) c = [0.5, 0.3, 0.17];
      alb[i] = c[0]; alb[i + 1] = c[1]; alb[i + 2] = c[2];
    }
  }
  drawMap(BROWS[faceState.browL] || BROWS.neutral, CX - 16, CY - 12, false);
  drawMap(BROWS[faceState.browR] || BROWS.neutral, CX + 16, CY - 12, true);
  drawMap(MOUTHS[faceState.mouth] || MOUTHS.neutral, CX - 7, CY + 12, false);
  bakeRegion(FR.x0, FR.y0, FR.x1, FR.y1);
}

// --------------------------------------------------------- руки
function capsule(px, py, ax, ay, bx, by) {
  const vx = bx - ax, vy = by - ay, wx = px - ax, wy = py - ay;
  const t = clamp((wx * vx + wy * vy) / (vx * vx + vy * vy));
  const cx = ax + vx * t, cy = ay + vy * t;
  return { d: Math.hypot(px - cx, py - cy), t, ox: px - cx, oy: py - cy };
}
const ARM_SEGS = [
  [CX - 47, 190, CX - 16, 204, 6.5],
  [CX + 47, 190, CX + 16, 204, 6.5],
];
function drawArms() {
  paint(ID.ARMS, CX - 62, 180, CX + 62, 214, 72, (x, y) => {
    let best = null;
    for (const [ax, ay, bx, by, r] of ARM_SEGS) {
      const c = capsule(x, y, ax, ay, bx, by);
      if (c.d < r && (!best || c.d / r < best.k)) best = { k: c.d / r, ...c, r };
    }
    if (!best) return false;
    // длинный чёрный рукав с мягкими складками и манжетой
    const fold = Math.sin(best.t * 22 + best.oy * 0.6);
    col(C.dress, 1.05 + fold * 0.3);
    const k = best.oy / best.r, kx = best.ox / best.r;
    P.nx = kx * 0.9; P.ny = k * 0.9; P.nz = Math.sqrt(Math.max(0.05, 1 - k * k - kx * kx));
    P.sp = 0.28;
    if (best.t > 0.86) { col(C.dressL, 1.2); P.sp = 0.4; }
    if (best.k > 0.85) P.ao = 0.75;
  });
  shade(CX - 64, 196, CX + 64, 216, (x, y, id) => {
    if (id !== ID.DESKTOP && id !== ID.PROP) return;
    for (const [ax, ay, bx, by, r] of ARM_SEGS) { const c = capsule(x, y - 2, ax, ay, bx, by); if (c.d < r + 1.5) return 0.55; }
    if (Math.hypot((x - CX) / 16, (y - 211) / 4) < 1) return 0.5;
  });
}
function drawHands() {
  // сцепленные кисти: пальцы переплетены, большие пальцы сверху
  paint(ID.HANDS, CX - 17, 197, CX + 17, 212, 74, (x, y) => {
    const dx = x - CX, dy = y - 204.5;
    const e = (dx / 14.5) ** 2 + (dy / 6.5) ** 2;
    if (e > 1) return false;
    col(C.skin, 0.92);
    P.nx = dx / 20; P.ny = dy / 8 - 0.15; P.nz = 1;
    // большие пальцы — валик сверху
    if (dy < -2.5) { P.ny = -0.8; P.nx = dx / 14; if (Math.abs(dx) < 1) P.ao = 0.65; }
    else {
      // пальцы: чередование левой/правой руки
      const fi = Math.floor((dx + 14) / 3), fx = ((dx + 14) % 3) / 3;
      const alt = fi % 2;
      P.nx += (fx - 0.5) * 0.8;
      col(C.skin, alt ? 0.98 : 0.86);
      if (fx < 0.34) P.ao = 0.66;
      if (dy > -2.5 && dy < -1.4) { P.ny = -0.6; P.sp = 0.2; } // костяшки
      if (dy >= 3 && fx > 0.34) { col([0.84, 0.58, 0.54], alt ? 1 : 0.9); P.sp = 0.5; } // ногти
    }
    if (e > 0.78) P.ao *= 0.78;
    P.sp = Math.max(P.sp, 0.06);
  });
}

// =====================================================================
//  СТОЛ И ПРЕДМЕТЫ
// =====================================================================
const DY = 12; // сдвиг предметов на столе
const DESK = { by: 190, fy: 208, bx0: 150, bx1: 390, fx0: 126, fx1: 414 };
function deskX(y) { const t = (y - DESK.by) / (DESK.fy - DESK.by); return [mix(DESK.bx0, DESK.fx0, t), mix(DESK.bx1, DESK.fx1, t)]; }
function drawDesk() {
  paint(ID.DESKTOP, DESK.fx0, DESK.by, DESK.fx1, DESK.fy - 1, 60, (x, y) => {
    const [a, b] = deskX(y);
    if (x < a || x > b) return false;
    const t = (y - DESK.by) / (DESK.fy - DESK.by);
    col(C.mahog, woodGrain(x * 0.5, y * 2.2, 0, 1, 7) * (0.9 + t * 0.1));
    P.nx = 0; P.ny = -0.85; P.nz = 0.5; P.sp = 0.45;
    const ia = a + 12, ib = b - 12;
    if (y > DESK.by + 2 && y < DESK.fy - 3 && x > ia && x < ib) {
      col(C.green, 0.9 + (fbm(x * 0.4, y * 0.8, 2) - 0.5) * 0.15); P.sp = 0.18;
      const e = Math.min(x - ia, ib - x, (y - DESK.by - 2) * 4, (DESK.fy - 3 - y) * 4);
      if (e > 1.6 && e < 2.6) { col(C.brass, 0.75); P.sp = 0.7; }
    }
    if (y === DESK.by) { col(C.mahogL, 1); P.sp = 0.6; }
  });
  paint(ID.DESK, DESK.fx0 - 3, DESK.fy, DESK.fx1 + 3, DESK.fy + 6, 66, (x, y) => {
    const r = y - DESK.fy;
    const ins = (r < 2 ? 3 - r : 0);
    if (x < DESK.fx0 - 3 + ins || x > DESK.fx1 + 3 - ins) return false;
    col(C.mahog, [1.3, 1.15, 1.0, 0.85, 0.7, 0.55, 0.4][r] * woodGrain(x * 0.5, y, 0, 1, 2));
    P.ny = [-0.8, -0.4, 0, 0.2, 0.4, 0.6, 0.8][r]; P.sp = 0.6;
    if (r === 3 && x % 4 === 0) P.ao = 0.75;
  });
  paint(ID.DESK, DESK.fx0, DESK.fy + 7, DESK.fx1, H - 1, 68, (x, y) => {
    col(C.mahogD, woodGrain(x, y * 0.4, 0, 0.8, 9));
    P.sp = 0.3;
    const ly = y - (DESK.fy + 7);
    const pedL = [DESK.fx0 + 4, DESK.fx0 + 84], pedR = [DESK.fx1 - 84, DESK.fx1 - 4];
    const knee = x > pedL[1] + 3 && x < pedR[0] - 3;
    if (knee) {
      if (ly < 12) {
        const e = Math.min(x - pedL[1] - 3, pedR[0] - 3 - x, ly, 12 - ly);
        if (e < 1) P.ao = 0.45; else if (e < 3) { P.ny = ly < 6 ? -0.5 : 0.5; col(C.mahog, 0.9); }
        else { const sc = Math.sin((x - CX) * 0.35) * Math.sin(ly * 0.9); if (sc > 0.55) { P.ny = -0.6; col(C.mahog, 1.05); } }
        if (Math.abs(x - CX) < 4 && Math.abs(ly - 6) < 1.5) { col(C.brass); P.sp = 1; P.ny = (ly - 6) * 0.4; }
        return;
      }
      col(C.wood0, 0.8); P.ao = 0.3 + 0.2 * smooth(H, 230, y); P.sp = 0; return;
    }
    const inL = x >= pedL[0] && x <= pedL[1], inR = x >= pedR[0] && x <= pedR[1];
    if (!inL && !inR) { P.nx = x < CX ? -0.2 : 0.2; P.ao = 0.85; return; }
    const [p0, p1] = inL ? pedL : pedR;
    const drawers = [[0, 16], [18, 34], [36, 60]];
    for (const [d0, d1] of drawers) {
      if (ly >= d0 && ly <= d1) {
        const e = Math.min(x - p0, p1 - x, ly - d0, d1 - ly);
        if (e < 1) P.ao = 0.4;
        else if (e < 4) {
          const ex = Math.min(x - p0, p1 - x), ey = Math.min(ly - d0, d1 - ly);
          P.nx = ex < ey ? (x - p0 < p1 - x ? -0.6 : 0.6) : 0; P.ny = ey <= ex ? (ly - d0 < d1 - ly ? -0.6 : 0.6) : 0; col(C.mahog, 0.95);
        } else col(C.mahog, 0.8 * woodGrain(x, y * 0.3, 0, 1.3, 12));
        const mx = (p0 + p1) / 2, my = d0 + 8;
        const bd = Math.hypot((x - mx) / 6, (ly - my) / 3.5);
        if (ly >= my && bd > 0.75 && bd < 1.05) { col(C.brass); P.sp = 1; P.nx = (x - mx) / 6; P.ny = 0.5; }
        if ((Math.abs(x - mx + 6) < 1.2 || Math.abs(x - mx - 6) < 1.2) && Math.abs(ly - my) < 1.5) { col(C.brassL); P.sp = 1; }
        if (Math.abs(x - mx) < 1 && ly - my < -3 && ly - my > -6) { col(C.brass, 0.8); P.sp = 0.8; if (Math.abs(x - mx) < 0.5 && ly - my > -5) col([0.05, 0.03, 0.02]); }
        return;
      }
    }
  });
}

function drawProps() {
  // открытый блокнот под руками
  paint(ID.PROP, CX - 44, 194, CX + 44, 208, 62, (x, y) => {
    const t = (y - 195) / 12;
    if (t < 0 || t > 1) return false;
    const hw = 34 + t * 7, dx = x - CX;
    if (Math.abs(dx) > hw) return false;
    col(C.paper, 0.95);
    P.ny = -0.85; P.nz = 0.5; P.sp = 0.05;
    if (Math.abs(dx) < 1) P.ao = 0.6;
    const ly = y - 195;
    if (ly % 2 === 1 && Math.abs(dx) > 3 && Math.abs(dx) < hw - 3 && hash(Math.floor(x / 4), y) > 0.25) col([0.35, 0.3, 0.3]);
    if (Math.abs(dx) > hw - 1) col(C.cream, 0.7);
  });
  const stack = [
    { y: 180, h: 5, x0: 160, x1: 206, c: BOOKC[0] }, { y: 175, h: 5, x0: 163, x1: 202, c: BOOKC[5] },
    { y: 171, h: 4, x0: 161, x1: 200, c: BOOKC[3] }, { y: 166, h: 5, x0: 165, x1: 198, c: BOOKC[8] },
  ];
  for (const b0 of stack) {
    const b = { ...b0, y: b0.y + DY };
    paint(ID.PROP, b.x0, b.y - b.h + 1, b.x1, b.y, 58, (x, y) => {
      const ly = y - (b.y - b.h + 1);
      col(b.c, 0.95);
      if (x > b.x1 - 5) { col(C.cream, 0.8 + (ly % 2) * 0.12); P.nx = 0.5; }
      if (ly === 0) { P.ny = -0.8; col(b.c, 1.15); }
      if (x < b.x0 + 2) P.nx = -0.6;
      if ((x - b.x0) === 5 || (x - b.x0) === 9) { col(C.brass, 0.85); P.sp = 0.6; }
      P.sp = Math.max(P.sp, 0.2);
    });
  }
  paint(ID.PROP, 172, 159 + DY, 192, 165 + DY, 59, (x, y) => {
    const yy = y - DY;
    for (const ccx of [177, 187]) { const d = Math.hypot((x - ccx) / 4, (yy - 162) / 2.5); if (d > 0.7 && d < 1.1) { col(C.brass); P.sp = 1; return; } if (d <= 0.7) { col([0.4, 0.4, 0.45], 0.4); P.sp = 1.2; return; } }
    if (yy === 161 && x > 180 && x < 184) { col(C.brass); P.sp = 1; return; }
    return false;
  });
  paint(ID.PROP, 196, 142 + DY, 232, 184 + DY, 60, (x, y) => {
    const yy = y - DY;
    const dx = x - 222, ly = yy - 172;
    if (ly >= 0 && ly <= 10) {
      const w = ly < 2 ? 2 : ly < 3 ? 3 : 5;
      if (Math.abs(dx) <= w) { col([0.08, 0.1, 0.16]); P.nx = dx / 6; P.sp = 1.1; if (ly < 2) col(C.brass); return; }
    }
    const t = (x - 205) / (221 - 205);
    if (t >= 0 && t <= 1.05) {
      const qy = mix(146, 173, t * t * 0.3 + t * 0.7);
      const vane = t < 0.7 ? 2.6 * Math.sin(t / 0.7 * Math.PI) : 0;
      if (yy >= qy - vane && yy <= qy + vane * 0.6 + 0.6) {
        col(C.cream, 0.95 - Math.abs(yy - qy) * 0.06);
        if (Math.abs(yy - qy) < 0.6) col(C.cream, 0.7);
        if (t < 0.65 && (x + yy) % 3 === 0 && yy < qy - 0.6) P.ao = 0.85;
        P.ny = -0.4; P.sp = 0.1; return;
      }
    }
    return false;
  });
  paint(ID.PROP, 300, 162 + DY, 316, 184 + DY, 58, (x, y) => {
    const dx = x - 308, ly = y - 162 - DY;
    if (ly < 2 || ly > 19) { if (Math.abs(dx) <= 6) { col(C.wood3); P.ny = ly < 2 ? -0.7 : 0.5; P.sp = 0.4; return; } return false; }
    if (Math.abs(dx) === 6) { col(C.brass); P.sp = 1; return; }
    const m = Math.abs(ly - 10.5) / 8.5, w = 0.6 + m * 4;
    if (Math.abs(dx) <= w) {
      col([0.7, 0.75, 0.8], 0.45); P.sp = 1.3; P.nx = dx / 5;
      if ((ly > 6 && ly < 10) || ly > 15 || (ly >= 10 && ly <= 15 && dx === 0)) { col([0.85, 0.68, 0.4]); P.sp = 0.2; }
      return;
    }
    return false;
  });
  paint(ID.PROP, 322, 172 + DY, 350, 188 + DY, 62, (x, y) => {
    const dx = x - 335, yy = y - DY;
    const sd = (dx / 13) ** 2 + ((yy - 185) / 2.6) ** 2;
    if (sd < 1 && yy >= 184) { col([0.9, 0.88, 0.85]); P.ny = -0.7; P.sp = 0.8; if (sd > 0.8) { col(C.brass); P.sp = 1; } return; }
    const ly = yy - 175;
    if (ly >= 0 && ly <= 9) {
      const w = 7 - ly * 0.25;
      if (Math.abs(dx) <= w) {
        col([0.92, 0.9, 0.86]); P.nx = dx / 8; P.sp = 0.8;
        if (ly === 0) { col([0.35, 0.18, 0.08]); P.ny = -0.8; P.sp = 0.9; }
        if (ly === 1) { col(C.brass); P.sp = 1; }
        if (ly === 5 && Math.abs(dx) < 4) col([0.25, 0.45, 0.55], 0.9);
        return;
      }
      const hd = Math.hypot((x - 343.5) / 3, (yy - 179) / 3);
      if (hd > 0.6 && hd < 1.1 && x > 341) { col([0.9, 0.88, 0.85]); P.sp = 0.8; P.nx = 0.5; return; }
    }
    return false;
  });
}

const LAMP = { x: 376, y: 162 + DY };
function drawLamp() {
  paint(ID.LAMP, 346, 140 + DY, 404, 186 + DY, 64, (x, y) => {
    const dx = x - LAMP.x, yy = y - DY;
    if (yy >= 176) {
      const e = (dx / 13) ** 2 + ((yy - 180) / 3.5) ** 2;
      if (e < 1) { col(C.brass, 0.95); P.nx = dx / 14; P.ny = (yy - 180) / 3; P.sp = 1.1; if (yy === 177) col(C.brassL); return; }
      return false;
    }
    if (yy >= 158 && yy < 176) {
      const w = yy > 172 ? 2.5 : 1.2;
      if (Math.abs(dx) <= w) { col(C.brass); P.nx = dx / 2; P.sp = 1.2; return; }
      if (Math.abs(x - (LAMP.x + 20)) < 0.6 && yy < 170) { col(C.brassL); P.sp = 1; return; }
      if (Math.abs(x - (LAMP.x + 20)) < 1.2 && yy >= 170 && yy < 172) { col(C.brassL); P.sp = 1; return; }
      return false;
    }
    const sy = yy - 142;
    if (sy < 0 || sy > 16) return false;
    const w = 14 + sy * 0.9;
    if (Math.abs(dx) > w) return false;
    const u = dx / w;
    col(C.green, 0.75 + (1 - u * u) * 0.4);
    if (sy < 2) col(C.brass, 1);
    P.nx = u * 0.9; P.ny = -0.6 + sy * 0.05; P.nz = 0.6; P.sp = 1.3;
    if (sy > 13) { col(C.brass); P.ny = 0.5; P.sp = 1; P.er = 0.5; P.eg = 0.4; P.eb = 0.2; }
    P.er += 0.03; P.eg += 0.12; P.eb += 0.06;
  });
}


// ---------------------------------------------------------------- переднее кресло
function drawArmchair() {
  paint(ID.ARMCHAIR, 0, 150, 122, H - 1, 100, (x, y) => {
    // спинка (слева, к нам спиной-боком)
    const backTop = 158 + ((x - 18) / 44) ** 2 * 26;
    const inBack = x < 62 && y > backTop;
    // подлокотник-валик
    const armY = 214 + (x - 30) * 0.05;
    const armR = 11;
    const inArm = x > 30 && x < 112 && Math.abs(y - armY) < armR;
    // торец-волюта
    const scroll = Math.hypot((x - 110) / 11, (y - armY) / 12);
    const inScroll = scroll < 1;
    const inSide = x > 26 && x < 110 && y > armY;
    if (!inBack && !inArm && !inScroll && !inSide) return false;
    if (inScroll && x >= 104) {
      col(C.leather, 0.95); P.nx = (x - 110) / 11 + 0.3; P.ny = (y - armY) / 12; P.sp = 0.5;
      if (scroll > 0.4 && scroll < 0.55) P.ao = 0.7;
      if (scroll > 0.82 && ((Math.atan2(y - armY, x - 110) * 8) | 0) % 2 === 0) { col(C.brassL); P.sp = 1; }
      return;
    }
    if (inArm) {
      const k = (y - armY) / armR;
      col(C.leather, 0.95 - k * 0.2); P.ny = k; P.nz = Math.sqrt(1 - k * k) + 0.1; P.sp = 0.55;
      if (Math.abs(k - 0.55) < 0.08 && x % 3 === 0) { col(C.brassL); P.sp = 1; }
      return;
    }
    if (inSide) {
      const t = tuft(x, y, 12);
      col(C.leather, 0.6 + t.h * 0.3); P.nx = t.gx * 0.6 + 0.2; P.ny = t.gy * 0.6; P.sp = 0.4; P.ao = 0.85;
      if (t.button) { col(C.leatherD); P.ao = 0.6; }
      return;
    }
    // спинка
    const edge = y - backTop;
    const t = tuft(x, y, 11);
    col(C.leather, 0.7 + t.h * 0.4);
    P.nx = t.gx + 0.35; P.ny = t.gy - 0.2; P.sp = 0.5;
    if (t.button) { col(C.leatherD); P.ao = 0.55; }
    if (edge < 4) { col(C.leather, 1); P.ny = -0.8; P.nx = 0.2; if (edge > 1.5 && edge < 2.5 && x % 3 === 0) { col(C.brassL); P.sp = 1; } }
  });
}

// =====================================================================
//  ОСВЕЩЕНИЕ
// =====================================================================
const AMB = [0.1, 0.08, 0.1];
// художественный «ключевой» свет только для героини (как в визуальных новеллах)
const KEY = { x: 150, y: 40, z: 150, c: [1.0, 0.76, 0.58], I: 0.95, R: 230 };
const FILL = { x: 420, y: 90, z: 120, c: [0.35, 0.42, 0.7], I: 0.55, R: 200 };
const CHAR_IDS = new Set([ID.HAIRBACK, ID.BODY, ID.NECK, ID.FACE, ID.HAIRFRONT, ID.PENDANT, ID.ARMS, ID.HANDS]);
const LIGHTS_STATIC = [
  { x: 270, y: 206, z: 95, c: [0.36, 0.24, 0.14], I: 1, R: 70 }, // отражение от бумаги/стола
  { x: LAMP.x, y: LAMP.y + 2, z: 78, c: [1.0, 0.8, 0.5], I: 2.0, R: 70, cone: true },
  { x: 446, y: 70, z: 30, c: [0.3, 0.38, 0.62], I: 0.9, R: 120 }, // лунный свет у окна
];
const MOON_DIR = (() => { const v = [0.62, -0.45, 0.62]; const l = Math.hypot(...v); return v.map((a) => a / l); })();
const FIRE_L = { x: 100, y: 166, z: 48, c: [1.0, 0.5, 0.2], I: 2.1, R: 120 };
const CANDLES = [{ x: 46, y: 90, z: 14, c: [1.0, 0.7, 0.35], I: 0.8, R: 28 }, { x: 154, y: 90, z: 14, c: [1.0, 0.7, 0.35], I: 0.8, R: 28 }];

function addPoint(L, x, y, i, D, S, wsp = true) {
  const i3 = i * 3;
  const dx = L.x - x, dy = L.y - y, dz = L.z - zb[i];
  const d2 = dx * dx + dy * dy + dz * dz;
  const inv = 1 / Math.sqrt(d2 + 1e-6);
  const nx = nrm[i3], ny = nrm[i3 + 1], nz = nrm[i3 + 2];
  let ndl = (nx * dx + ny * dy + nz * dz) * inv;
  // мягкий wrap-lighting, чтобы тени не были мёртвыми
  ndl = (ndl + 0.25) / 1.25;
  if (ndl <= 0) return;
  let att = L.I / (1 + d2 / (L.R * L.R));
  if (L.cone) att *= smooth(L.y - 8, L.y + 6, y) * (1 - smooth(60, 110, Math.abs(x - L.x)));
  D[i3] += L.c[0] * ndl * att; D[i3 + 1] += L.c[1] * ndl * att; D[i3 + 2] += L.c[2] * ndl * att;
  if (wsp && spc[i] > 0 && S) {
    let hx = dx * inv, hy = dy * inv, hz = dz * inv + 1;
    const hl = Math.hypot(hx, hy, hz); hx /= hl; hy /= hl; hz /= hl;
    const ndh = Math.max(0, nx * hx + ny * hy + nz * hz);
    const s = spc[i] * Math.pow(ndh, 22) * att * 0.9;
    S[i3] += L.c[0] * s; S[i3 + 1] += L.c[1] * s; S[i3 + 2] += L.c[2] * s;
  }
}
function bakeRegion(x0, y0, x1, y1) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = y * W + x, i3 = i * 3;
    const ao = aoB[i];
    for (const B of [Ds, Df, Dc, Ss, Sf]) { B[i3] = 0; B[i3 + 1] = 0; B[i3 + 2] = 0; }
    // амбиент с лёгкой «небесной» составляющей
    const up = 0.75 + 0.25 * -nrm[i3 + 1];
    Ds[i3] = AMB[0] * up; Ds[i3 + 1] = AMB[1] * up; Ds[i3 + 2] = AMB[2] * up;
    // луна — направленный, только правая часть комнаты
    const mw = smooth(200, 470, x) * 0.55 + 0.05;
    const ndm = Math.max(0, nrm[i3] * MOON_DIR[0] + nrm[i3 + 1] * MOON_DIR[1] + nrm[i3 + 2] * MOON_DIR[2]);
    Ds[i3] += 0.26 * ndm * mw; Ds[i3 + 1] += 0.33 * ndm * mw; Ds[i3 + 2] += 0.55 * ndm * mw;
    for (const L of LIGHTS_STATIC) addPoint(L, x, y, i, Ds, Ss);
    if (CHAR_IDS.has(idB[i])) { addPoint(KEY, x, y, i, Ds, Ss); addPoint(FILL, x, y, i, Ds, Ss); }
    
    addPoint(FIRE_L, x, y, i, Df, Sf);
    for (const L of CANDLES) addPoint(L, x, y, i, Dc, null, false);
    for (const B of [Ds, Df, Dc]) { B[i3] *= ao; B[i3 + 1] *= ao; B[i3 + 2] *= ao; }
  }
}
function bakePost() {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, id = idB[i];
    let o = 1;
    const ol = OUTLINE[id];
    if (ol < 1) {
      const n = [idAt(x - 1, y), idAt(x + 1, y), idAt(x, y - 1), idAt(x, y + 1)];
      for (const q of n) if (q < id && q !== 0) { o = ol; break; }
    }
    const vx = (x - W / 2) / (W / 2), vy = (y - H * 0.45) / (H / 2);
    const v = 1 - 0.42 * Math.pow(Math.min(1, Math.hypot(vx * 0.85, vy)), 2.4);
    post[i] = o * v;
    // атмосферное свечение
    const df = Math.hypot(x - FIRE.cx, (y - 168) * 1.2);
    glowF[i] = Math.exp(-df / 34) * 0.22 + Math.exp(-df / 90) * 0.05;
    const dl = Math.hypot((x - LAMP.x) * 0.8, (y - LAMP.y - 6) * 1.4);
    glowL[i] = Math.exp(-dl / 20) * 0.12 * (y > LAMP.y - 12 ? 1 : 0.4);
  }
}

// =====================================================================
//  ДИНАМИКА: огонь, окно с дождём, свечи
// =====================================================================
const FIRE_RAMP = [
  [0.0, [0.25, 0.04, 0.01]], [0.12, [0.55, 0.1, 0.02]], [0.28, [0.85, 0.25, 0.04]], [0.45, [1.0, 0.45, 0.08]],
  [0.62, [1.0, 0.68, 0.18]], [0.8, [1.0, 0.86, 0.45]], [1.0, [1.0, 0.97, 0.8]],
];
function fireColor(h) {
  if (h <= 0) return null;
  for (let k = FIRE_RAMP.length - 1; k >= 0; k--) if (h >= FIRE_RAMP[k][0]) return FIRE_RAMP[k][1];
  return FIRE_RAMP[0][1];
}
function updateFire(t, flick) {
  for (let y = FIRE.y0; y <= FIRE.y1; y++) for (let x = FIRE.x0; x <= FIRE.x1; x++) {
    const i = y * W + x, i3 = i * 3, id = idB[i];
    emi[i3] = emiStatic[i3]; emi[i3 + 1] = emiStatic[i3 + 1]; emi[i3 + 2] = emiStatic[i3 + 2];
    if (id === ID.LOGS) {
      const e = ember[i];
      if (e > 0) {
        const p = 0.55 + 0.45 * vnoise(x * 0.3 + t * 1.5, y * 0.3, 41);
        const c = fireColor(clamp(e * p * 0.9));
        if (c) { const k = e * p * 1.3; emi[i3] += c[0] * k; emi[i3 + 1] += c[1] * k; emi[i3 + 2] += c[2] * k; }
      }
      continue;
    }
    if (id !== ID.FIREBOX) continue;
    const fx = (x - FIRE.cx) / 34, fy = (182 - y) / 42;
    if (fy < -0.1) continue;
    const shape = 1 - fx * fx * (1.1 + fy * 2.8) - fy * 1.05;
    const n = fbm(x * 0.1, y * 0.075 + t * 2.4, 3, 1);
    const n2 = vnoise(x * 0.28, y * 0.2 + t * 4.2, 2);
    const h = (shape * 1.25 + (n - 0.5) * 1.15 + (n2 - 0.5) * 0.45) * (0.85 + flick * 0.2);
    const c = fireColor(h);
    if (c) { const k = 1.15; emi[i3] = c[0] * k; emi[i3 + 1] = c[1] * k; emi[i3 + 2] = c[2] * k; alb[i3] = 0; alb[i3 + 1] = 0; alb[i3 + 2] = 0; }
    else { alb[i3] = 0.07 * (1 - smooth(176, 146, y) * 0.7); alb[i3 + 1] = 0.03; alb[i3 + 2] = 0.025; }
  }
}
const rain = [];
{ const R = rng(99); for (let k = 0; k < 60; k++) rain.push({ x: WIN.x0 + R() * (WIN.x1 - WIN.x0), y: WIN.y0 + R() * 130, v: 40 + R() * 50, l: 2 + Math.floor(R() * 4) }); }
const drops = [];
{ const R = rng(7); for (let k = 0; k < 18; k++) drops.push({ x: WIN.x0 + 2 + R() * (WIN.x1 - WIN.x0 - 4), y: WIN.y0 + 20 + R() * 100, s: R() }); }
function updateWindow(t, dt) {
  for (let y = 14; y <= WIN.y1; y++) for (let x = WIN.x0; x <= WIN.x1; x++) {
    if (!inWindowGlass(x, y)) continue;
    const i = y * W + x, i3 = i * 3;
    // ночное небо
    const v = (y - WIN.y0) / (WIN.y1 - WIN.y0);
    let c = mixc([0.05, 0.07, 0.15], [0.12, 0.15, 0.27], v);
    const cl = fbm(x * 0.06 + t * 0.02, y * 0.12, 3, 55);
    if (cl > 0.55) c = mixc(c, [0.2, 0.22, 0.34], (cl - 0.55) * 1.6);
    const md = Math.hypot(x - 452, y - 50);
    if (md < 5.5) c = mixc([0.95, 0.93, 0.82], [0.75, 0.75, 0.68], fbm(x * 0.5, y * 0.5) > 0.6 ? 1 : 0);
    else if (md < 14) c = mixc(c, [0.4, 0.45, 0.6], (14 - md) / 14 * 0.6);
    // силуэты деревьев и крыш
    const tree = 128 - 14 * fbm(x * 0.15, 1, 3, 8) - (x > 450 ? 10 : 0);
    if (y > tree) c = [0.02, 0.025, 0.045];
    if (x > 448 && x < 456 && y > 118 && y < 124 && Math.floor(t * 0.2) % 2 === 0) c = [0.6, 0.45, 0.2]; // далёкое окно
    emi[i3] = c[0] * 0.9; emi[i3 + 1] = c[1] * 0.9; emi[i3 + 2] = c[2] * 0.9;
    alb[i3] = 0.02; alb[i3 + 1] = 0.02; alb[i3 + 2] = 0.03;
    // переплёт
    const top = WIN.y0 + WIN.ar;
    const fr = (Math.abs(x - WIN.cx) < 1.2) || (Math.abs(y - 96) < 1.2) || (y < top + 4 && Math.abs(Math.hypot(x - WIN.cx, y - top) - WIN.ar) < 1.5) || x < WIN.x0 + 1.5 || x > WIN.x1 - 1.5 || y > WIN.y1 - 1.5;
    const lead = (Math.abs(((x - WIN.x0) % 8)) < 0.6 || Math.abs(((y - WIN.y0) % 11)) < 0.6) && y > top - 10;
    if (fr) { emi[i3] = emi[i3 + 1] = emi[i3 + 2] = 0; alb[i3] = C.wood2[0] * 0.8; alb[i3 + 1] = C.wood2[1] * 0.8; alb[i3 + 2] = C.wood2[2] * 0.8; }
    else if (lead) { emi[i3] *= 0.35; emi[i3 + 1] *= 0.35; emi[i3 + 2] *= 0.4; }
  }
  // струи дождя
  for (const r of rain) {
    r.y += r.v * dt; r.x -= r.v * dt * 0.12;
    if (r.y > WIN.y1) { r.y = WIN.y0 - Math.random() * 20; r.x = WIN.x0 + Math.random() * (WIN.x1 - WIN.x0 + 10); }
    for (let k = 0; k < r.l; k++) {
      const x = Math.round(r.x + k * 0.12), y = Math.round(r.y - k);
      if (!inWindowGlass(x, y)) continue;
      const i3 = (y * W + x) * 3; emi[i3] += 0.06; emi[i3 + 1] += 0.08; emi[i3 + 2] += 0.12;
    }
  }
  // капли на стекле
  for (const d of drops) {
    d.y += dt * (d.s > 0.7 ? 6 : 0.4);
    if (d.y > WIN.y1 - 3) { d.y = WIN.y0 + 20; d.x = WIN.x0 + 3 + Math.random() * (WIN.x1 - WIN.x0 - 6); }
    const x = Math.round(d.x), y = Math.round(d.y);
    if (!inWindowGlass(x, y)) continue;
    const i3 = (y * W + x) * 3; emi[i3] += 0.16; emi[i3 + 1] += 0.19; emi[i3 + 2] += 0.25;
  }
}
function updateCandles(t, cf) {
  for (const cx of [46, 154]) {
    for (let y = 84; y <= 92; y++) for (let x = cx - 2; x <= cx + 2; x++) {
      const i = y * W + x, i3 = i * 3;
      const ly = 92 - y; // 0..8
      const sway = Math.sin(t * 7 + cx) * 0.4 * (ly / 8);
      const w = ly < 2 ? 0.7 : ly < 5 ? 1.2 : 0.6 - (ly - 5) * 0.2;
      const on = Math.abs(x - cx - sway) <= w && ly <= 6 + cf * 2;
      if (idB[i] === ID.MANTELITEM && ly < 1) continue;
      if (on) {
        const c = ly < 1 ? [0.5, 0.25, 0.3] : ly < 3 ? [1, 0.95, 0.75] : [1, 0.7, 0.25];
        emi[i3] = c[0] * 1.2; emi[i3 + 1] = c[1] * 1.2; emi[i3 + 2] = c[2] * 1.2; alb[i3] = alb[i3 + 1] = alb[i3 + 2] = 0;
        fxMask[i] = 1;
      } else if (fxMask[i]) {
        // восстановить фон
        emi[i3] = emiStatic[i3]; emi[i3 + 1] = emiStatic[i3 + 1]; emi[i3 + 2] = emiStatic[i3 + 2];
        alb[i3] = fxAlb[i3]; alb[i3 + 1] = fxAlb[i3 + 1]; alb[i3 + 2] = fxAlb[i3 + 2];
      }
    }
  }
}
const fxMask = new Uint8Array(N), fxAlb = new Float32Array(N * 3);

// ---------------------------------------------------------------- частицы
const parts = [];
function spawn(kind) {
  if (kind === 'ember') parts.push({ k: 'ember', x: 80 + Math.random() * 40, y: 170, vx: (Math.random() - 0.5) * 6, vy: -12 - Math.random() * 18, life: 1.5 + Math.random() * 2 });
  if (kind === 'steam') parts.push({ k: 'steam', x: 333 + Math.random() * 4, y: 185, vx: 0, vy: -4 - Math.random() * 3, life: 2.5 + Math.random() * 2, ph: Math.random() * 6 });
  if (kind === 'dust') parts.push({ k: 'dust', x: 330 + Math.random() * 80, y: 172 + Math.random() * 30, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 1.5, life: 3 + Math.random() * 4, max: 0 });
}

// =====================================================================
//  ПУБЛИЧНЫЙ API
// =====================================================================
const MOODS = {
  neutral: { eyes: 'open', browL: 'neutral', browR: 'neutral', mouth: 'neutral', gaze: 0, blush: 0.1 },
  smile: { eyes: 'open', browL: 'relaxed', browR: 'relaxed', mouth: 'smile', gaze: 0, blush: 0.2 },
  warm: { eyes: 'soft', browL: 'relaxed', browR: 'relaxed', mouth: 'soft', gaze: 0, blush: 0.22 },
  think: { eyes: 'soft', browL: 'neutral', browR: 'raised', mouth: 'neutral', gaze: 1, blush: 0.1 },
  concern: { eyes: 'open', browL: 'concern', browR: 'concern', mouth: 'sad', gaze: 0, blush: 0.1 },
  sad: { eyes: 'half', browL: 'concern', browR: 'concern', mouth: 'sad', gaze: -1, blush: 0.08 },
  surprise: { eyes: 'wide', browL: 'raised', browR: 'raised', mouth: 'oh', gaze: 0, blush: 0.15 },
  laugh: { eyes: 'happy', browL: 'relaxed', browR: 'relaxed', mouth: 'laugh', gaze: 0, blush: 0.3 },
  smirk: { eyes: 'soft', browL: 'neutral', browR: 'raised', mouth: 'smirk', gaze: 0, blush: 0.12 },
  stern: { eyes: 'half', browL: 'stern', browR: 'stern', mouth: 'neutral', gaze: 0, blush: 0.05 },
  listen: { eyes: 'open', browL: 'relaxed', browR: 'relaxed', mouth: 'soft', gaze: 0, blush: 0.15 },
};
export const MOOD_LIST = Object.keys(MOODS);

export function createScene(canvas) {
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(W, H);
  const px32 = new Uint32Array(img.data.buffer);

  // ---- отрисовка статики
  drawWallBase();
  drawCeiling();
  bookcase(0, 32, 12, 190, 11, { boards: [12, 40, 68, 96, 124, 152, 190], cabinetFrom: 152 });
  bookcase(168, 250, 12, 190, 21, { boards: [16, 44, 72, 100, 128, 152, 190], cabinetFrom: 152 });
  bookcase(249, 331, 12, 190, 31, { boards: [16, 44, 72, 100, 128, 152, 190], cabinetFrom: 152 });
  bookcase(330, 412, 12, 190, 41, { boards: [16, 44, 72, 100, 128, 152, 190], cabinetFrom: 152 });
  drawChimney();
  drawWindow();
  drawLadder();
  drawFloor();
  drawGlobe();
  drawChair();
  drawHairBack();
  drawBody();
  drawNeck();
  drawFaceBase();
  snapFace();
  drawHairFront();
  drawPendant();
  // тень персонажа на кресле
  shade(CX - 90, 20, CX + 90, 200, (x, y, id) => {
    if (id !== ID.CHAIR) return;
    let m = 0;
    for (let k = 2; k <= 8; k += 2) { const q = idAt(x - k, y - 2); if (q >= ID.HAIRBACK && q <= ID.PENDANT) { m = 1 - k / 10; break; } }
    return 1 - m * 0.55;
  });
  drawDesk();
  drawProps();
  drawLamp();
  drawArms();
  drawHands();
  drawArmchair();
  // тень стола на полу / кресла на кресле
  shade(0, 190, W - 1, H - 1, (x, y, id) => (id === ID.FLOOR || id === ID.RUG ? 0.75 + 0.25 * smooth(0, 1, Math.abs(x - CX) / 220) : undefined));

  emi.set(emiStatic);
  fxAlb.set(alb);
  bakeRegion(0, 0, W - 1, H - 1);
  bakePost();

  // ---- состояние анимации
  let mood = 'neutral', talking = false, blinkT = 2 + Math.random() * 3, blinking = 0, talkT = 0, talkFrame = 0;
  let gazeTimer = 0, gazeOverride = null, thinking = false;
  function applyFace() {
    const m = MOODS[mood] || MOODS.neutral;
    Object.assign(faceState, m);
    if (gazeOverride !== null) faceState.gaze = gazeOverride;
    if (thinking) { faceState.gaze = 1; faceState.eyes = 'soft'; faceState.browR = 'raised'; }
    if (blinking > 0 && faceState.eyes !== 'happy') faceState.eyes = 'closed';
    if (talking) {
      const smiley = mood === 'smile' || mood === 'laugh' || mood === 'warm';
      const frames = smiley ? ['smile', 'smileTalk', 'talk1', 'smileTalk'] : ['talk1', 'talk2', 'talk3', 'talk1', m.mouth];
      faceState.mouth = frames[talkFrame % frames.length];
      if (mood === 'laugh' && talkFrame % 2) faceState.mouth = 'laugh';
    }
    drawFeatures();
  }
  applyFace();

  let last = performance.now(), time = 0, spawnAcc = 0, running = true;
  const flickState = { v: 1 };
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.1, (now - last) / 1000); last = now; time += dt;
    // мерцание
    const f = 0.82 + 0.12 * Math.sin(time * 8.3) * Math.sin(time * 3.1) + 0.1 * (vnoise(time * 6, 0, 3) - 0.5) * 2 + 0.06 * Math.sin(time * 17);
    flickState.v = mix(flickState.v, f, 0.5);
    const fl = flickState.v;
    const cf = 0.85 + 0.15 * vnoise(time * 9, 2, 5);
    // моргание / речь
    let dirty = false;
    blinkT -= dt;
    if (blinkT <= 0 && blinking <= 0) { blinking = 0.14; dirty = true; }
    if (blinking > 0) { blinking -= dt; if (blinking <= 0) { blinkT = 2.5 + Math.random() * 4; if (Math.random() < 0.15) blinkT = 0.25; dirty = true; } }
    if (talking) { talkT -= dt; if (talkT <= 0) { talkT = 0.08 + Math.random() * 0.09; talkFrame++; dirty = true; } }
    gazeTimer -= dt;
    if (gazeTimer <= 0 && !talking && !thinking) {
      gazeTimer = 3 + Math.random() * 5;
      const ng = Math.random() < 0.7 ? null : (Math.random() < 0.5 ? -1 : 1);
      if (ng !== gazeOverride) { gazeOverride = ng; dirty = true; }
    }
    if (dirty) applyFace();

    updateFire(time, fl);
    updateWindow(time, dt);
    updateCandles(time, cf);

    // композиция
    const exp = 1.18;
    for (let i = 0, y = 0; y < H; y++) {
      const by = (y & 3) << 2;
      for (let x = 0; x < W; x++, i++) {
        const i3 = i * 3;
        const g = glowF[i] * fl + glowL[i];
        let r = (alb[i3] * (Ds[i3] + Df[i3] * fl + Dc[i3] * cf) + Ss[i3] + Sf[i3] * fl + emi[i3]) * exp + g * 1.0;
        let gg = (alb[i3 + 1] * (Ds[i3 + 1] + Df[i3 + 1] * fl + Dc[i3 + 1] * cf) + Ss[i3 + 1] + Sf[i3 + 1] * fl + emi[i3 + 1]) * exp + g * 0.55;
        let b = (alb[i3 + 2] * (Ds[i3 + 2] + Df[i3 + 2] * fl + Dc[i3 + 2] * cf) + Ss[i3 + 2] + Sf[i3 + 2] * fl + emi[i3 + 2]) * exp + g * 0.22;
        const p = post[i];
        r *= p; gg *= p; b *= p;
        // мягкое плечо тонмаппинга
        if (r > 0.85) r = 0.85 + (r - 0.85) * 0.45;
        if (gg > 0.85) gg = 0.85 + (gg - 0.85) * 0.45;
        if (b > 0.85) b = 0.85 + (b - 0.85) * 0.45;
        const d = BAYER[by | (x & 3)] * 0.045;
        const ri = clamp(r + d, 0, 0.999) * 32 | 0, gi = clamp(gg + d, 0, 0.999) * 32 | 0, bi = clamp(b + d, 0, 0.999) * 32 | 0;
        px32[i] = LUT[(ri << 10) | (gi << 5) | bi];
      }
    }
    // частицы
    spawnAcc += dt;
    while (spawnAcc > 0.05) {
      spawnAcc -= 0.05;
      if (Math.random() < 0.18) spawn('ember');
      if (Math.random() < 0.35) spawn('steam');
      if (Math.random() < 0.06) spawn('dust');
    }
    for (let k = parts.length - 1; k >= 0; k--) {
      const p = parts[k];
      p.life -= dt;
      if (p.life <= 0) { parts.splice(k, 1); continue; }
      if (p.k === 'steam') { p.x += Math.sin(time * 1.5 + p.ph + p.y * 0.2) * 3 * dt; }
      if (p.k === 'ember') { p.vx += (Math.random() - 0.5) * 30 * dt; if (p.y < 138) p.life = 0; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      const x = Math.round(p.x), y = Math.round(p.y);
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const i = y * W + x;
      const c = px32[i];
      let r = c & 255, g = (c >> 8) & 255, b = (c >> 16) & 255;
      if (p.k === 'ember') { const a = Math.min(1, p.life); r = mix(r, 255, a); g = mix(g, 170, a); b = mix(b, 60, a); }
      else if (p.k === 'steam') { const a = Math.min(0.35, p.life * 0.12); r = mix(r, 220, a); g = mix(g, 210, a); b = mix(b, 200, a); }
      else { const a = Math.sin(Math.min(1, p.life / 3) * Math.PI) * 0.35; r = mix(r, 255, a); g = mix(g, 230, a); b = mix(b, 170, a); }
      px32[i] = (255 << 24) | ((b | 0) << 16) | ((g | 0) << 8) | (r | 0);
    }
    ctx.putImageData(img, 0, 0);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    setMood(m) { if (MOODS[m] && m !== mood) { mood = m; applyFace(); } },
    getMood: () => mood,
    setTalking(v) { if (v !== talking) { talking = v; talkFrame = 0; applyFace(); } },
    setThinking(v) { if (v !== thinking) { thinking = v; applyFace(); } },
    stop() { running = false; },
  };
}
