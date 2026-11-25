'use strict';
/* 两个监控画面：逐像素光线投射，红外照明随距离平方衰减，所以近处亮、远处黑 */
(function () {
  const { hash, vnoise, clamp } = GN;

  function makeRays(w, h, cam) {
    const n = w * h, dx = new Float32Array(n), dy = new Float32Array(n), dz = new Float32Array(n), vig = new Float32Array(n);
    const tx = Math.tan(cam.fov / 2), ty = tx * h / w;
    const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch), cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const k = j * w + i;
        const u = ((i + 0.5) / w * 2 - 1), v = (1 - (j + 0.5) / h * 2);
        const x = u * tx, y = v * ty * cp - sp, z = v * ty * sp + cp;
        const X = x * cy + z * sy, Z = -x * sy + z * cy;
        const l = Math.hypot(X, y, Z);
        dx[k] = X / l; dy[k] = y / l; dz[k] = Z / l;
        vig[k] = Math.max(0, 1 - 0.5 * Math.pow((u * u + v * v) / 2, 1.3));
      }
    }
    return { dx, dy, dz, vig, n, w, h };
  }

  /* 站立的人形剪影：头微微歪着，手臂过长垂到膝盖。返回 0 无、1 身体、2 眼睛反光 */
  function figMask(lx, ly, tilt, er, jit) {
    lx += jit;
    const s = Math.sin(tilt), c = Math.cos(tilt);
    const hcx = s * 0.17, hcy = 1.8 + c * 0.18;
    const qx = lx - hcx, qy = ly - hcy;
    const hx = qx * c - qy * s, hy = qx * s + qy * c;
    const e1 = (hx - 0.042) * (hx - 0.042) + (hy + 0.005) * (hy + 0.005), e2 = (hx + 0.042) * (hx + 0.042) + (hy + 0.005) * (hy + 0.005);
    if (e1 < er * er || e2 < er * er) return 2;
    if ((hx / 0.105) * (hx / 0.105) + (hy / 0.14) * (hy / 0.14) < 1) return 1;
    if (Math.abs(hx) < 0.125 && hy < 0.06 && hy > -0.42) return 1;
    const ax = Math.abs(lx);
    if (ly > 1.74 && ly < 1.86 && ax < 0.05) return 1;
    if (ly >= 1.0 && ly <= 1.8 && ax < 0.15 + (ly - 1.0) * 0.0875) return 1;
    if (ly > 0.42 && ly < 1.78) { const armX = 0.215 + (1.78 - ly) * 0.035; if (Math.abs(ax - armX) < (ly < 0.56 ? 0.028 : 0.04)) return 1; }
    if (ly >= 0 && ly < 1.0 && Math.abs(ax - 0.075) < 0.055) return 1;
    return 0;
  }

  function finish(img, R, val, tint, frame) {
    const p = img.data, w = R.w;
    for (let k = 0; k < R.n; k++) {
      const j = (k / w) | 0;
      let v = val[k] * R.vig[k];
      v += (Math.random() - 0.5) * 0.11;
      if (j & 1) v *= 0.84;
      v = clamp(v) * 255;
      const o = k * 4;
      p[o] = v * tint[0]; p[o + 1] = v * tint[1]; p[o + 2] = v * tint[2]; p[o + 3] = 255;
    }
    if (frame % 97 < 3) GN.tear(img, (Math.random() * R.h) | 0, 6 + ((Math.random() * 20) | 0), ((Math.random() - 0.5) * 30) | 0);
  }

  /* ---------- 走廊（CAM 01） ---------- */
  GN.Hall = function (cv) {
    const w = cv.width, h = cv.height, g = cv.getContext('2d'), img = g.createImageData(w, h);
    const W = 0.62, H = 2.5, L = 9;
    const R = makeRays(w, h, { yaw: -0.06, pitch: 0.2, fov: 1.3 });
    const val = new Float32Array(R.n);
    let frame = 0;
    return {
      ctx: g, img,
      render(t, st) {
        frame++;
        const ox = 0.42 + Math.sin(t * 0.7) * 0.002, oy = 2.2, oz = 0.05;
        const pxSize = 2 * Math.tan(0.65) / w;
        for (let k = 0; k < R.n; k++) {
          const dx = R.dx[k], dy = R.dy[k], dz = R.dz[k];
          let tt = 1e9, surf = 0;
          if (dy < 0) { const a = -oy / dy; if (a < tt) { tt = a; surf = 1; } } else if (dy > 0) { const a = (H - oy) / dy; if (a < tt) { tt = a; surf = 2; } }
          if (dx < 0) { const a = (-W - ox) / dx; if (a < tt) { tt = a; surf = 3; } } else if (dx > 0) { const a = (W - ox) / dx; if (a < tt) { tt = a; surf = 4; } }
          if (dz > 0) { const a = (L - oz) / dz; if (a < tt) { tt = a; surf = 5; } }
          const px = ox + dx * tt, py = oy + dy * tt, pz = oz + dz * tt;
          let alb = 0.55, cs = 1, emit = 0;
          if (surf === 1) {
            cs = -dy;
            const fx = (px + W) / 0.155, pl = Math.floor(fx), fr = fx - pl;
            alb = 0.4 + 0.12 * hash(pl, 11);
            if (fr < 0.07) alb *= 0.45;
            const zz = pz / 1.3 + hash(pl, 3);
            if (zz - Math.floor(zz) < 0.02) alb *= 0.5;
            if (Math.abs(px) < 0.36 && pz > 1.4 && pz < 7.6) {
              alb = ((Math.floor(px * 10 + 10) + Math.floor(pz * 5)) & 1) ? 0.27 : 0.33;
              if (Math.abs(px) > 0.31 || pz < 1.5 || pz > 7.5) alb = 0.55;
            }
          } else if (surf === 2) {
            cs = dy; alb = 0.5;
            if (px * px + (pz - 4.5) * (pz - 4.5) < 0.03) alb = 0.95;
          } else if (surf === 3 || surf === 4) {
            cs = Math.abs(dx);
            alb = 0.6 + 0.04 * Math.sin(pz * 55);
            if (py < 0.95) { alb = 0.5; if ((pz * 2.5) % 1 < 0.03) alb *= 0.6; }
            if (py >= 0.95 && py < 1.0) alb = 0.75;
            if (py < 0.12) alb = 0.78;
            if (surf === 3) {
              for (const z0 of [2.5, 7.2]) {
                if (pz > z0 && pz < z0 + 0.9 && py < 2.05) {
                  alb = 0.45;
                  if (pz < z0 + 0.06 || pz > z0 + 0.84 || py > 1.99) alb = 0.75;
                  else if ((pz - z0 - 0.45) ** 2 + (py - 1.0) ** 2 < 0.002) alb = 0.95;
                }
              }
              if (pz > 4.6 && pz < 5.3 && py > 1.35 && py < 1.85) {
                alb = (pz < 4.64 || pz > 5.26 || py < 1.39 || py > 1.81) ? 0.15 : 0.28 + 0.25 * vnoise(pz * 14, py * 14);
                if (st.photo && Math.abs(pz - 4.95) < 0.03 && py > 1.42 && py < 1.7) alb = 0.04;
              }
            } else if (pz > 5.4 && pz < 6.3 && py < 2.05) {
              alb = 0.45;
              if (pz < 5.46 || pz > 6.24 || py > 1.99) alb = 0.75;
              else if (pz < 5.46 + st.gap) alb = 0.0;
            }
          } else {
            cs = dz;
            alb = 0.6 + 0.04 * Math.sin(px * 55);
            if (Math.abs(px) < 0.42 && py < 2.05) {
              alb = 0.45;
              if (Math.abs(px) > 0.37 || py > 1.99) alb = 0.75;
              else if (px < -0.37 + 0.74 * st.open) alb = 0.0;
            }
          }
          // 人形
          if (st.fig && dz > 0) {
            const tf = (st.figZ - oz) / dz;
            if (tf > 0 && tf < tt) {
              const m = figMask(ox + dx * tf - st.figX, oy + dy * tf, st.tilt, Math.max(0.016, pxSize * tf * 0.85), (hash((oy + dy * tf) * 80 | 0, frame) - 0.5) * 0.014);
              if (m === 2) { emit = 1.1; alb = 0; } else if (m === 1) { alb = 0.025; tt = tf; cs = dz; }
            }
          }
          const irr = cs / (0.35 + tt * tt * 0.11);
          val[k] = 1 - Math.exp(-2.7 * alb * irr) + emit + 0.012;
        }
        finish(img, R, val, [0.86, 1, 0.88], frame);
        return img;
      }
    };
  };

  /* ---------- 房间（CAM 00）：桌前坐着一个人，屏幕亮着 ---------- */
  let hitAx = 0;
  function boxHit(ox, oy, oz, dx, dy, dz, b) {
    let tmin = -1e9, tmax = 1e9, ax = 0;
    const o = [ox, oy, oz], d = [dx, dy, dz];
    for (let a = 0; a < 3; a++) {
      const lo = b[a * 2], hi = b[a * 2 + 1];
      if (d[a] === 0) { if (o[a] < lo || o[a] > hi) return -1; continue; }
      let t1 = (lo - o[a]) / d[a], t2 = (hi - o[a]) / d[a];
      if (t1 > t2) { const s = t1; t1 = t2; t2 = s; }
      if (t1 > tmin) { tmin = t1; ax = a; }
      if (t2 < tmax) tmax = t2;
    }
    if (tmax < tmin || tmax < 0 || tmin < 0) return -1;
    hitAx = ax;
    return tmin;
  }
  function personMask(lx, ly) {
    const ax = Math.abs(lx);
    if (ly > 0.5 && ly < 1.0 && ax < 0.25) return 2;
    if (ly > 0.45 && ly <= 0.5 && ax < 0.27) return 2;
    if (ly > 0.08 && ly <= 0.45 && ax < 0.03) return 2;
    if (ly > 0.04 && ly <= 0.08 && ax < 0.29) return 2;
    if ((lx / 0.1) ** 2 + ((ly - 1.24) / 0.125) ** 2 < 1) return 1;
    if (ly > 1.08 && ly < 1.16 && ax < 0.05) return 1;
    if (ly >= 0.6 && ly <= 1.1 && ax < 0.19 + (ly - 0.6) * 0.06) return 1;
    return 0;
  }
  GN.Room = function (cv) {
    const w = cv.width, h = cv.height, g = cv.getContext('2d'), img = g.createImageData(w, h);
    const W = 1.7, H = 2.6, L = 4.2;
    const R = makeRays(w, h, { yaw: -0.39, pitch: 0.39, fov: 1.3 });
    const val = new Float32Array(R.n);
    const DESK = [-0.65, 0.65, 0, 0.74, 3.55, 4.2], MON = [-0.32, 0.32, 0.78, 1.18, 3.75, 3.85];
    const Mx = 0, My = 0.98, Mz = 3.68;
    let frame = 0;
    return {
      ctx: g, img,
      render(t, st) {
        frame++;
        const ox = 1.3, oy = 2.3, oz = 0.25;
        const pxSize = 2 * Math.tan(0.65) / w;
        const pm = 0.42 * (0.92 + 0.08 * Math.sin(t * 13) * Math.sin(t * 3.1));
        for (let k = 0; k < R.n; k++) {
          const dx = R.dx[k], dy = R.dy[k], dz = R.dz[k];
          let tt = 1e9, surf = 0;
          if (dy < 0) { const a = -oy / dy; if (a < tt) { tt = a; surf = 1; } } else if (dy > 0) { const a = (H - oy) / dy; if (a < tt) { tt = a; surf = 2; } }
          if (dx < 0) { const a = (-W - ox) / dx; if (a < tt) { tt = a; surf = 3; } } else if (dx > 0) { const a = (W - ox) / dx; if (a < tt) { tt = a; surf = 4; } }
          if (dz > 0) { const a = (L - oz) / dz; if (a < tt) { tt = a; surf = 5; } }
          let nx = 0, ny = 0, nz = 0;
          const td = boxHit(ox, oy, oz, dx, dy, dz, DESK);
          if (td > 0 && td < tt) { tt = td; surf = 6; }
          const tm = boxHit(ox, oy, oz, dx, dy, dz, MON);
          if (tm > 0 && tm < tt) { tt = tm; surf = 7; }
          let px = ox + dx * tt, py = oy + dy * tt, pz = oz + dz * tt;
          let alb = 0.5, emit = 0;
          if (surf === 1) { ny = 1; alb = 0.3 + 0.08 * vnoise(px * 30, pz * 30); }
          else if (surf === 2) { ny = -1; alb = 0.5; }
          else if (surf === 3) {
            nx = 1; alb = 0.55;
            if (pz > 1.2 && pz < 2.3 && py > 0.95 && py < 2.05) { alb = 0.5 + 0.22 * Math.sin(pz * 42); emit = 0.07; }
          } else if (surf === 4) { nx = -1; alb = 0.55; }
          else if (surf === 5) {
            nz = -1; alb = 0.55;
            if (px > 0.9 && px < 1.4 && py > 1.3 && py < 1.9) alb = (px < 0.93 || px > 1.37 || py < 1.33 || py > 1.87) ? 0.15 : 0.35;
          } else if (surf === 6) {
            if (hitAx === 1) ny = 1; else if (hitAx === 2) nz = -1; else nx = px > 0 ? 1 : -1;
            alb = 0.32;
          } else if (surf === 7) {
            alb = 0.08;
            if (hitAx === 2) {
              const sy = (py - 0.8) / 0.36, sx = (px + 0.3) / 0.6;
              if (sx > 0.04 && sx < 0.96 && sy > 0.06 && sy < 0.94) emit = (sy > 0.82 ? 0.45 : 1.15) * (0.9 + 0.1 * ((py * 400 + t * 30) % 2 > 1 ? 1 : 0));
            }
          }
          // 坐着的人
          if (dz > 0) {
            const tp = (3.05 - oz) / dz;
            if (tp > 0 && tp < tt) {
              const lx = ox + dx * tp - 0.24, ly = oy + dy * tp, m = personMask(lx, ly);
              if (m) {
                tt = tp; nx = 0; ny = 0; nz = 0; emit = 0;
                alb = m === 2 ? 0.1 : 0.04;
                if (st.turned && m === 1) {
                  const ex = Math.abs(Math.abs(lx) - 0.036), ey = ly - 1.25, er = Math.max(0.013, pxSize * tp * 0.8);
                  if (ex * ex + ey * ey < er * er) emit = 1.1;
                }
                const d = 0.02;
                if (m === 1 && (!personMask(lx - d, ly) || !personMask(lx + d, ly) || !personMask(lx, ly + d))) emit = Math.max(emit, 0.6 * pm / 0.42);
              }
            }
          }
          // 它
          if (st.fig && dz > 0) {
            const tf = (st.figZ - oz) / dz;
            if (tf > 0 && tf < tt) {
              const m = figMask(ox + dx * tf - st.figX, oy + dy * tf, st.tilt, Math.max(0.016, pxSize * tf * 0.85), (hash((oy + dy * tf) * 80 | 0, frame) - 0.5) * 0.016);
              if (m === 2) { emit = 1.2; alb = 0; nx = ny = nz = 0; } else if (m === 1) { alb = 0.022; tt = tf; emit = 0; nx = ny = nz = 0; }
            }
          }
          px = ox + dx * tt; py = oy + dy * tt; pz = oz + dz * tt;
          const cs = Math.abs(nx * dx + ny * dy + nz * dz) || 1;
          let E = alb * cs / (0.4 + tt * tt * 0.16);
          if (nx || ny || nz) {
            const lx = Mx - px, ly = My - py, lz = Mz - pz, d2 = lx * lx + ly * ly + lz * lz, d = Math.sqrt(d2);
            const nl = (nx * lx + ny * ly + nz * lz) / d;
            if (nl > 0) E += alb * pm * nl / (d2 + 0.05);
          }
          val[k] = 1 - Math.exp(-2.6 * E) + emit + 0.01;
        }
        finish(img, R, val, st.tint || [1, 1, 1], frame);
        return img;
      }
    };
  };
})();
