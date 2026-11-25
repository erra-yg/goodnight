'use strict';
/* 通用绘图工具：数值函数、点阵文字、像素图标、七段数码管、故障后处理 */
const GN = window.GN = window.GN || {};

GN.clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
GN.lerp = (a, b, t) => a + (b - a) * t;
GN.smooth = (a, b, x) => { const t = GN.clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
GN.hash = (x, y) => {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
GN.vnoise = (x, y) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = GN.hash(xi, yi), b = GN.hash(xi + 1, yi), c = GN.hash(xi, yi + 1), d = GN.hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};

/* ---------- 点阵文字：小字号渲染后按透明度二值化，放大后就是位图字体 ---------- */
const btCache = new Map();
GN.bitmapText = function (ctx, text, x, y, size, color, align) {
  const key = text + '|' + size + '|' + color;
  let c = btCache.get(key);
  if (!c) {
    c = document.createElement('canvas');
    const font = `${size}px "Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif`;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.font = font;
    c.width = Math.max(1, Math.ceil(g.measureText(text).width) + 2);
    c.height = size + 4;
    g.font = font;
    g.textBaseline = 'top';
    g.fillStyle = '#fff';
    g.fillText(text, 1, 1);
    const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
    const r = parseInt(color.slice(1, 3), 16), gg = parseInt(color.slice(3, 5), 16), b = parseInt(color.slice(5, 7), 16);
    for (let i = 0; i < p.length; i += 4) { const on = p[i + 3] > 105; p[i] = r; p[i + 1] = gg; p[i + 2] = b; p[i + 3] = on ? 255 : 0; }
    g.putImageData(d, 0, 0);
    if (btCache.size > 400) btCache.clear();
    btCache.set(key, c);
  }
  let dx = x;
  if (align === 'center') dx = x - c.width / 2;
  else if (align === 'right') dx = x - c.width;
  ctx.drawImage(c, Math.round(dx), Math.round(y));
  return c.width;
};

/* ---------- 像素图标与头像 ---------- */
const ICONS = {
  eye: ['............', '............', '...######...', '.##......##.', '#....##....#', '#...####...#', '#...####...#', '#....##....#', '.##......##.', '...######...', '............', '............'],
  wave: ['............', '.....#......', '....##...#..', '...#.#....#.', '###..#..#..#', '#....#...#.#', '#....#...#.#', '###..#..#..#', '...#.#....#.', '....##...#..', '.....#......', '............'],
  batt: ['............', '....####....', '..########..', '..#......#..', '..#..##..#..', '..#.##...#..', '..#.####.#..', '..#...##.#..', '..#..##..#..', '..#......#..', '..########..', '............'],
  moon: ['............', '....####....', '..###.......', '.###........', '.##.........', '###.........', '###.........', '.##.......#.', '.####...###.', '..########..', '....####....', '............']
};
GN.drawIcon = function (cv, name, fg) {
  const g = cv.getContext('2d'), rows = ICONS[name];
  g.clearRect(0, 0, 12, 12);
  g.fillStyle = fg;
  rows.forEach((r, y) => { for (let x = 0; x < 12; x++) if (r[x] === '#') g.fillRect(x, y, 1, 1); });
};
const AVATARS = [
  { bg: '#e2a03a', skin: '#f0c9a0', hair: '#2a1a10', long: true },
  { bg: '#2d6e69', skin: '#e3b78e', hair: '#1a120c', long: false },
  { bg: '#b8a98a', skin: '#e8c4a2', hair: '#4a3020', long: true }
];
GN.drawAvatar = function (cv, i, wrong) {
  const g = cv.getContext('2d');
  if (i === 3) {
    g.fillStyle = '#000'; g.fillRect(0, 0, 12, 12);
    g.fillStyle = '#fff'; g.fillRect(3, 5, 1, 1); g.fillRect(8, 5, 1, 1);
    return;
  }
  const a = AVATARS[i];
  g.fillStyle = wrong ? '#111' : a.bg; g.fillRect(0, 0, 12, 12);
  g.fillStyle = a.skin; g.fillRect(3, 3, 6, 7); g.fillRect(2, 5, 8, 3);
  g.fillStyle = a.hair; g.fillRect(3, 2, 6, 2); g.fillRect(2, 3, 1, 3); g.fillRect(9, 3, 1, 3);
  if (a.long) { g.fillRect(2, 6, 1, 5); g.fillRect(9, 6, 1, 5); }
  g.fillStyle = '#2a2118';
  if (wrong) { g.fillStyle = '#000'; g.fillRect(4, 5, 2, 2); g.fillRect(7, 5, 2, 2); g.fillRect(3, 8, 6, 1); }
  else { g.fillRect(4, 6, 1, 1); g.fillRect(7, 6, 1, 1); g.fillRect(5, 8, 2, 1); }
  g.fillStyle = wrong ? '#000' : '#6a5642'; g.fillRect(2, 10, 8, 2);
};

/* ---------- 七段数码管（液晶屏上残留的暗段也画出来） ---------- */
const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g', ' ': '', E: 'adefg', r: 'eg' };
function segRects(ox) {
  const w = 20, h = 36, t = 4;
  return {
    a: [ox + 3, 0, w - 6, t], d: [ox + 3, h - t, w - 6, t], g: [ox + 3, h / 2 - t / 2, w - 6, t],
    f: [ox, 2, t, h / 2 - 3], b: [ox + w - t, 2, t, h / 2 - 3],
    e: [ox, h / 2 + 1, t, h / 2 - 3], c: [ox + w - t, h / 2 + 1, t, h / 2 - 3]
  };
}
GN.drawClock = function (svg, str, colonOn) {
  const ns = 'http://www.w3.org/2000/svg';
  let out = '';
  const xs = [4, 28, 0, 64, 88];
  for (let i = 0; i < 5; i++) {
    if (i === 2) continue;
    const ch = str[i], on = SEG[ch] !== undefined ? SEG[ch] : '';
    const R = segRects(xs[i]);
    for (const s of 'abcdefg') {
      const r = R[s];
      out += `<rect x="${r[0]}" y="${r[1] + 4}" width="${r[2]}" height="${r[3]}" rx="1.5" fill="#26301a" opacity="${on.includes(s) ? 0.92 : 0.08}"/>`;
    }
  }
  const op = colonOn ? 0.92 : 0.08;
  out += `<rect x="55" y="14" width="5" height="5" fill="#26301a" opacity="${op}"/><rect x="55" y="28" width="5" height="5" fill="#26301a" opacity="${op}"/>`;
  svg.innerHTML = out;
  return ns;
};

/* ---------- 故障后处理（都在 ImageData 上做） ---------- */
GN.addNoise = function (d, amt) {
  const p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    const n = (Math.random() - 0.5) * amt;
    p[i] += n; p[i + 1] += n; p[i + 2] += n;
  }
};
/* 横向撕裂：一段行整体平移 */
GN.tear = function (d, y0, h, shift) {
  const w = d.width, u = new Uint32Array(d.data.buffer), row = new Uint32Array(w);
  for (let y = Math.max(0, y0); y < Math.min(d.height, y0 + h); y++) {
    const o = y * w;
    for (let x = 0; x < w; x++) row[x] = u[o + ((x - shift) % w + w) % w];
    u.set(row, o);
  }
};
/* 颜色通道错位 */
GN.rgbSplit = function (d, dx) {
  if (!dx) return;
  const w = d.width, h = d.height, p = d.data, src = new Uint8ClampedArray(p);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const xr = Math.min(w - 1, Math.max(0, x - dx)), xb = Math.min(w - 1, Math.max(0, x + dx));
      p[i] = src[(y * w + xr) * 4];
      p[i + 2] = src[(y * w + xb) * 4 + 2];
    }
  }
};
/* 像素排序：亮度高于阈值的连续段按亮度重新排列，形成拉丝 */
GN.pixelSort = function (d, thresh, rowProb, vertical) {
  const w = d.width, h = d.height, u = new Uint32Array(d.data.buffer), p = d.data;
  const L = (i) => p[i * 4] * 0.3 + p[i * 4 + 1] * 0.59 + p[i * 4 + 2] * 0.11;
  const lines = vertical ? w : h, len = vertical ? h : w;
  const idx = vertical ? (a, b) => b * w + a : (a, b) => a * w + b;
  const seg = [];
  for (let a = 0; a < lines; a++) {
    if (Math.random() > rowProb) continue;
    let b = 0;
    while (b < len) {
      while (b < len && L(idx(a, b)) < thresh) b++;
      const s = b;
      while (b < len && L(idx(a, b)) >= thresh) b++;
      if (b - s > 2) {
        seg.length = 0;
        for (let k = s; k < b; k++) seg.push(u[idx(a, k)]);
        seg.sort((m, n) => ((n & 255) + ((n >> 8) & 255)) - ((m & 255) + ((m >> 8) & 255)));
        for (let k = s; k < b; k++) u[idx(a, k)] = seg[k - s];
      }
    }
  }
};
/* 数据流损坏：从上一帧复制方块并错开，画面像被拖拽 */
GN.mosh = function (d, prev, n, bs, maxShift) {
  if (!prev) return;
  const w = d.width, h = d.height, u = new Uint32Array(d.data.buffer), q = new Uint32Array(prev.data.buffer);
  for (let k = 0; k < n; k++) {
    const bx = (Math.random() * (w / bs) | 0) * bs, by = (Math.random() * (h / bs) | 0) * bs;
    const sx = (Math.random() * 2 - 1) * maxShift | 0, sy = (Math.random() * 2 - 1) * maxShift * 0.3 | 0;
    for (let y = 0; y < bs; y++) {
      const ty = by + y, fy = ty + sy;
      if (ty >= h || fy < 0 || fy >= h) continue;
      for (let x = 0; x < bs; x++) {
        const tx = bx + x, fx = tx + sx;
        if (tx >= w || fx < 0 || fx >= w) continue;
        u[ty * w + tx] = q[fy * w + fx];
      }
    }
  }
};
/* 4×4 有序抖动阈值 */
GN.BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

/* 全屏噪点层：低分辨率噪点，CSS 放大 */
GN.noiseFrame = function (cv) {
  const g = cv.getContext('2d'), d = g.createImageData(cv.width, cv.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) { const v = Math.random() * 255; p[i] = p[i + 1] = p[i + 2] = v; p[i + 3] = 255; }
  g.putImageData(d, 0, 0);
};
