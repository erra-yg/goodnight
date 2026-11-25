'use strict';
/* 守夜机屏幕、紧急通告电视、断裂画面、眼睛墙、结尾的脸 */
(function () {
  const { clamp, smooth, lerp, vnoise, BAYER } = GN;

  /* ---------- 守夜机的小屏幕（48×36） ---------- */
  GN.DeviceScreen = function (cv) {
    const g = cv.getContext('2d');
    return {
      render(t, s) {
        const bad = s.mode >= 2, odd = s.mode >= 1;
        const fg = bad ? '#ff5a4a' : '#86ffa8';
        g.fillStyle = bad ? '#160404' : '#0b1710';
        g.fillRect(0, 0, 48, 36);
        g.fillStyle = fg;
        const lx = Math.round(clamp(s.lookX, -1, 1) * 1.5), ly = Math.round(clamp(s.lookY, -1, 1));
        if (bad) {
          const msg = '我看见你了　我看见你了　';
          const off = -((t * 14) % 120);
          GN.bitmapText(g, msg, off, 2, 10, '#ff5a4a');
          GN.bitmapText(g, msg, off + 120, 2, 10, '#ff5a4a');
        }
        const blink = !odd && (t % 4.2) < 0.14;
        for (const ex of [13, 30]) {
          const ey = bad ? 15 : 9;
          if (blink) { g.fillRect(ex, ey + 4, 5, 1); continue; }
          if (odd) {
            g.fillRect(ex - 1, ey, 7, 1); g.fillRect(ex - 1, ey + 8, 7, 1); g.fillRect(ex - 1, ey, 1, 9); g.fillRect(ex + 5, ey, 1, 9);
            g.fillRect(ex + 2 + lx, ey + 4 + ly, 1, 1);
          } else {
            g.fillRect(ex, ey, 5, 7);
            g.fillStyle = '#0b1710'; g.fillRect(ex + 1 + lx + 1, ey + 2 + ly + 1, 2, 2); g.fillStyle = fg;
          }
        }
        if (!odd) {
          for (let x = 14; x <= 34; x++) { const y = Math.round(27 - 0.028 * (x - 24) * (x - 24)); g.fillRect(x, y, 1, 2); }
        } else {
          const jit = Math.random() < 0.1 ? 1 : 0;
          for (let x = 2; x <= 46; x++) {
            const y = Math.round(31 - 0.011 * (x - 24) * (x - 24)) + jit;
            g.fillRect(x, y - 3, 1, 1); g.fillRect(x, y + 1, 1, 1);
            if (x % 3 === 0) g.fillRect(x, y - 2, 1, 3);
          }
        }
      }
    };
  };

  /* ---------- 紧急通告：彩条、雪花、逐行出现的文字、显像管熄灭 ---------- */
  const PAGES = [
    ['本通告只面向购买了', 'WN-89 守夜机的家庭。', '', '如果你的守夜机在夜里', '转向了你，请照做：'],
    ['一、不要与它对视。', '', '二、不要回应用家人的', '　　声音发出的呼唤。', '', '三、不要数家里有几个人。'],
    ['四、如果你已经数过，', '　　并且多出了一个，', '　　不要说出是哪一个。', '', '五、天亮之前不要开灯。'],
    ['六、']
  ];
  GN.TV = function (cv) {
    const w = cv.width, h = cv.height, g = cv.getContext('2d', { willReadFrequently: true });
    const buf = document.createElement('canvas'); buf.width = w; buf.height = h;
    const b = buf.getContext('2d', { willReadFrequently: true });
    function bars(t) {
      const top = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];
      const mid = ['#0000c0', '#131313', '#c000c0', '#131313', '#00c0c0', '#131313', '#c0c0c0'];
      const bw = w / 7;
      top.forEach((c, i) => { b.fillStyle = c; b.fillRect(i * bw, 0, bw + 1, h * 0.67); });
      mid.forEach((c, i) => { b.fillStyle = c; b.fillRect(i * bw, h * 0.67, bw + 1, h * 0.08); });
      ['#00214c', '#ffffff', '#32006a', '#131313', '#090909', '#131313', '#1d1d1d', '#131313'].forEach((c, i) => {
        const x0 = i < 4 ? i * bw * 1.25 : 5 * bw + (i - 4) * bw / 2;
        const ww = i < 4 ? bw * 1.25 : bw / 2;
        b.fillStyle = c; b.fillRect(x0, h * 0.75, ww + 1, h * 0.25);
      });
      b.fillStyle = '#000'; b.fillRect(w / 2 - 92, h * 0.33 - 14, 184, 30);
      GN.bitmapText(b, '晚安电器　测试信号', w / 2, h * 0.33 - 8, 14, '#ffffff', 'center');
      if ((t * 2 | 0) % 2) GN.bitmapText(b, '1 kHz', w - 8, h * 0.75 + 6, 12, '#ffffff', 'right');
    }
    function page(t, i, lp) {
      b.fillStyle = '#000'; b.fillRect(0, 0, w, h);
      b.fillStyle = '#a3001a'; b.fillRect(0, 0, w, 30);
      GN.bitmapText(b, '晚安电器　·　用户紧急通告', w / 2, 8, 14, '#ffffff', 'center');
      if (i < 3) {
        const lines = PAGES[i], n = Math.min(lines.length, Math.ceil(lp * 1.7 * lines.length));
        for (let k = 0; k < n; k++) if (lines[k]) GN.bitmapText(b, lines[k], 24, 46 + k * 24, 15, '#e8e8e8');
      } else {
        GN.bitmapText(b, '六、', w / 2, 56, 16, '#e8e8e8', 'center');
        if (lp > 0.25) GN.bitmapText(b, '我们从来没有', w / 2, 92, 24, '#ffffff', 'center');
        if (lp > 0.5) GN.bitmapText(b, '生产过守夜机。', w / 2, 128, 24, '#ff3045', 'center');
      }
      b.fillStyle = '#111'; b.fillRect(0, h - 24, w, 24);
      const crawl = '本通告将重复播放　▪　不要关掉电视　▪　不要看它的屏幕　▪　';
      const off = -((t * 40) % crawlW);
      crawlW = GN.bitmapText(b, crawl, off, h - 20, 13, '#d6c94a');
      GN.bitmapText(b, crawl, off + crawlW, h - 20, 13, '#d6c94a');
    }
    let crawlW = 600;
    let frame = 0;
    return {
      render(t, p) {
        frame++;
        if (p < 0.13) bars(t);
        else if (p < 0.18) { const d = b.createImageData(w, h); GN.addNoise(d, 0); const q = d.data; for (let i = 0; i < q.length; i += 4) { const v = Math.random() * 255; q[i] = q[i + 1] = q[i + 2] = v; q[i + 3] = 255; } b.putImageData(d, 0, 0); }
        else {
          const pp = clamp((p - 0.18) / 0.66, 0, 0.9999), i = Math.floor(pp * 4), lp = pp * 4 - i;
          page(t, i, lp);
        }
        const d = b.getImageData(0, 0, w, h);
        GN.addNoise(d, 34);
        const roll = ((t * 40) % (h + 60)) - 30;
        const q = d.data;
        for (let y = Math.max(0, roll | 0); y < Math.min(h, (roll | 0) + 26); y++) for (let x = 0; x < w; x++) { const o = (y * w + x) * 4; q[o] *= 0.8; q[o + 1] *= 0.8; q[o + 2] *= 0.8; }
        if (frame % 53 < 2) GN.tear(d, (Math.random() * h) | 0, 4 + (Math.random() * 14 | 0), ((Math.random() - 0.5) * 24) | 0);
        GN.rgbSplit(d, 1);
        b.putImageData(d, 0, 0);
        g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
        if (p < 0.86) { g.drawImage(buf, 0, 0); return; }
        // 显像管熄灭：先压成一条亮线，再缩成一个点
        const a = smooth(0.86, 0.92, p), c = smooth(0.92, 0.97, p), f = smooth(0.965, 1.0, p);
        const sh = Math.max(1.5, h * (1 - a)), sw = Math.max(2, w * (1 - c));
        g.save();
        g.translate(w / 2, h / 2);
        g.drawImage(buf, -sw / 2, -sh / 2, sw, sh);
        g.globalCompositeOperation = 'lighter';
        g.fillStyle = `rgba(255,255,255,${0.9 * a * (1 - f)})`;
        g.fillRect(-sw / 2, -sh / 2, sw, sh);
        if (c > 0.6) {
          const r = 6 * (1 - f);
          const gr = g.createRadialGradient(0, 0, 0, 0, 0, r * 3 + 1);
          gr.addColorStop(0, `rgba(255,255,255,${1 - f})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = gr; g.fillRect(-20, -20, 40, 40);
        }
        g.restore();
      }
    };
  };

  /* ---------- 断裂：把首屏的样子拿来做像素排序与数据流损坏 ---------- */
  GN.Burst = function (cv) {
    const w = cv.width, h = cv.height, g = cv.getContext('2d', { willReadFrequently: true });
    const src = document.createElement('canvas'); src.width = w; src.height = h;
    const s = src.getContext('2d', { willReadFrequently: true });
    let srcData = null, prev = null, frame = 0;
    function build() {
      s.fillStyle = '#f6f0e2'; s.fillRect(0, 0, w, h);
      s.fillStyle = '#2a2118'; s.fillRect(0, 0, w, 22);
      GN.bitmapText(s, '晚安电器', 12, 4, 13, '#f6f0e2');
      s.font = '30px "ZCOOL QingKe HuangYou","Noto Sans SC",sans-serif'; s.fillStyle = '#2a2118';
      s.fillText('它整夜醒着，', 26, 84); s.fillText('所以你可以安心入睡。', 26, 122);
      s.fillStyle = '#d4531f'; s.fillRect(26, 146, 116, 30);
      GN.bitmapText(s, '立即订购', 84, 153, 14, '#fff8ee', 'center');
      s.fillStyle = '#e2d5b8'; s.fillRect(300, 50, 150, 128); s.strokeStyle = '#3a2e22'; s.lineWidth = 2; s.strokeRect(300, 50, 150, 128);
      s.fillStyle = '#0b1710'; s.fillRect(312, 62, 88, 66);
      s.fillStyle = '#86ffa8'; s.fillRect(334, 80, 8, 12); s.fillRect(368, 80, 8, 12);
      for (let x = 336; x <= 376; x++) s.fillRect(x, Math.round(112 - 0.008 * (x - 356) * (x - 356)), 1, 3);
      ['#d4531f', '#e2a03a', '#2d6e69', '#6a5642'].forEach((c, i) => { s.fillStyle = c; s.fillRect(0, 214 + i * 7, w, 7); });
      s.fillStyle = '#2a2118'; s.fillRect(0, 242, w, 28);
      srcData = s.getImageData(0, 0, w, h);
    }
    return {
      render(t, r) {
        if (!srcData) build();
        frame++;
        const d = g.createImageData(w, h);
        d.data.set(srcData.data);
        const shift = Math.sin(t * 0.9) * 10 * r;
        if (r > 0.02) GN.tear(d, 0, h, shift | 0);
        GN.mosh(d, prev, (r * 160) | 0, 16, 8 + r * 50);
        if (r > 0.08) GN.pixelSort(d, 250 - r * 210, 0.15 + r * 0.85, frame % 2 === 0 && r > 0.4);
        GN.rgbSplit(d, (r * 12) | 0);
        const p = d.data, post = smooth(0.25, 0.7, r), dark = smooth(0.7, 1, r);
        if (post > 0) {
          for (let i = 0; i < p.length; i += 4) {
            const L = (p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11) / 255;
            let R, G, B;
            if (L < 0.3) { R = 5; G = 5; B = 6; } else if (L < 0.55) { R = 255; G = 42; B = 60; } else if (L < 0.8) { R = 0; G = 225; B = 255; } else { R = 233; G = 231; B = 223; }
            p[i] = lerp(p[i], R, post) * (1 - dark * 0.92); p[i + 1] = lerp(p[i + 1], G, post) * (1 - dark * 0.96); p[i + 2] = lerp(p[i + 2], B, post) * (1 - dark * 0.96);
          }
        }
        g.putImageData(d, 0, 0);
        prev = d;
      }
    };
  };

  /* ---------- 眼睛墙：每一只都盯着光标 ---------- */
  GN.Eyes = function (cv) {
    const g = cv.getContext('2d');
    let eyes = [], W = 0, H = 0;
    function layout() {
      W = cv.width = cv.clientWidth; H = cv.height = cv.clientHeight;
      eyes = [];
      const sp = W < 600 ? 84 : 118;
      for (let y = sp * 0.6; y < H; y += sp * 0.78) {
        for (let x = (Math.round(y / sp) % 2) * sp / 2 + sp * 0.4; x < W; x += sp) {
          eyes.push({ x: x + (Math.random() - 0.5) * 18, y: y + (Math.random() - 0.5) * 14, r: sp * (0.2 + Math.random() * 0.1), nb: Math.random() * 6, open: 1 });
        }
      }
    }
    return {
      layout,
      render(t, mx, my, idle, glitch) {
        if (cv.clientWidth !== W || cv.clientHeight !== H) layout();
        g.clearRect(0, 0, W, H);
        for (const e of eyes) {
          if (t > e.nb) { e.nb = t + 2 + Math.random() * 7; e.bl = t; }
          const bt = e.bl ? (t - e.bl) / 0.22 : 2;
          const o = bt < 1 ? Math.abs(1 - bt * 2) * 0.9 + 0.1 : 1;
          let ax = mx - e.x, ay = my - e.y;
          const l = Math.hypot(ax, ay) || 1;
          const reach = idle ? 0 : Math.min(1, l / 300);
          ax = ax / l * e.r * 0.42 * reach; ay = ay / l * e.r * 0.25 * reach;
          const ox = glitch && Math.random() < 0.04 ? (Math.random() - 0.5) * 30 : 0;
          g.save();
          g.translate(e.x + ox, e.y);
          g.beginPath();
          g.moveTo(-e.r, 0);
          g.quadraticCurveTo(0, -e.r * 0.8 * o, e.r, 0);
          g.quadraticCurveTo(0, e.r * 0.8 * o, -e.r, 0);
          g.closePath();
          g.fillStyle = '#d9d6cc'; g.fill();
          g.save(); g.clip();
          g.fillStyle = '#7d0c16'; g.beginPath(); g.arc(ax, ay, e.r * 0.4, 0, 7); g.fill();
          g.fillStyle = '#000'; g.beginPath(); g.arc(ax, ay, e.r * (idle ? 0.3 : 0.16), 0, 7); g.fill();
          g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(ax - e.r * 0.12, ay - e.r * 0.14, e.r * 0.07, e.r * 0.07);
          g.restore();
          g.lineWidth = 1.2; g.strokeStyle = glitch ? '#00e1ff' : '#e9e7df';
          g.stroke();
          g.restore();
        }
      }
    };
  };

  /* ---------- 结尾的脸 ---------- */
  const STR = [-0.19, -0.075, 0.035, 0.16, 0.245];
  function faceVal(x0, y0, P) {
    const c = Math.cos(P.tilt), s = Math.sin(P.tilt);
    const x = x0 * c + y0 * s, y = -x0 * s + y0 * c, ax = Math.abs(x);
    const jaw = y > 0.12 ? 1 + (y - 0.12) * 1.25 : 1;
    const ex = x * jaw / 0.34, ey = (y - 0.02) / 0.5, e = ex * ex + ey * ey;
    let v = 0;
    if (e < 1) {
      // 光从下往上打：下巴亮，额头沉进黑暗
      const up = clamp((y + 0.45) / 0.95);
      v = 0.88 * smooth(1, 0.8, e) * (0.05 + 0.95 * up * up);
      for (let k = -1; k <= 1; k += 2) {
        const sy = k > 0 ? -0.048 : -0.062;
        const gx = x - (k * 0.13 + P.lookX * 0.024), gy = y - (sy + P.lookY * 0.016);
        if (gx * gx + gy * gy < 0.00022 * P.eyeS * P.eyeS) return 1.3;
        const dx = (x - k * 0.13) / (0.08 * P.eyeS), dy = (y - sy) / (0.068 * P.eyeS), d = dx * dx + dy * dy;
        if (d < 2.4) v *= 1 - smooth(2.4, 0.9, d);
      }
      if (y > 0.05 && y < 0.14 && ax < 0.05) v *= 0.55 + ax * 8;
      if ((ax - 0.028) * (ax - 0.028) + (y - 0.118) * (y - 0.118) < 0.00025) v *= 0.15;
      v *= 1 - 0.45 * Math.exp(-(((ax - 0.21) / 0.07) ** 2 + ((y - 0.14) / 0.09) ** 2));
      // 垂在脸上的几缕头发
      for (let i = 0; i < STR.length; i++) {
        const sx = STR[i] + 0.016 * Math.sin(y * 11 + i * 2.1);
        if (Math.abs(x - sx) < 0.006 + 0.004 * (i % 2) && y < 0.44 - i * 0.05) v *= 0.06;
      }
    }
    const hairEdge = 0.215 + 0.04 * vnoise(y * 9, 3.1);
    const hairTop = -0.28 + 0.06 * vnoise(x * 14, 1.7) + 0.1 * ax;
    if (e < 1.3 && y < hairTop) v = 0.012 + 0.03 * vnoise(x * 70, y * 4);
    if (ax > hairEdge && y > -0.52 && y < 1.1 && ax < 0.43 + 0.06 * y) v = 0.012 + 0.04 * vnoise(x * 60, y * 3);
    const mw = 0.14 + 0.24 * P.grin;
    if (ax < mw && e < 1.6) {
      const u = ax / mw;
      const yc = 0.27 - 0.08 * P.grin * u * u - 0.05 * P.open;
      const th = 0.008 + 0.012 * P.grin * (1 - u * u) + 0.12 * P.open * (1 - u * u);
      const dm = y - yc;
      if (Math.abs(dm) < th) {
        v = 0.015;
        const tooth = ((x * 40 + 100) % 1) < 0.6;
        if (P.grin > 0.3 && tooth && (dm < -th + 0.022 || dm > th - 0.016)) v = 0.66 * (1 - u * 0.45);
      } else if (Math.abs(dm) < th + 0.012 && e < 1) v *= 0.45;
    }
    return v;
  }
  GN.Face = function (cv) {
    let g = cv.getContext('2d', { willReadFrequently: true }), prev = null, frame = 0;
    return {
      render(t, P) {
        frame++;
        const w = cv.width, h = cv.height, d = g.createImageData(w, h), p = d.data;
        const cx = w / 2 + P.offX * w, cy = h / 2 + P.offY * h, sc = Math.min(h, w * 1.35) * 0.95 * P.zoom;
        for (let j = 0; j < h; j++) {
          for (let i = 0; i < w; i++) {
            let v = faceVal((i - cx) / sc, (j - cy) / sc, P) * P.vis;
            if (v > 0.03) v += (Math.random() - 0.5) * 0.08 * P.vis;
            const o = (j * w + i) * 4;
            if (v > 1.1 * P.vis && v > 0.9) { p[o] = 255; p[o + 1] = 245; p[o + 2] = 235; p[o + 3] = 255; continue; }
            const bit = v - 0.04 > BAYER[(j & 3) * 4 + (i & 3)] ? 1 : 0;
            const gr = clamp(v) * 255;
            p[o] = lerp(gr * 0.95, bit * 255, P.dither);
            p[o + 1] = lerp(gr * 0.5, bit * 42, P.dither);
            p[o + 2] = lerp(gr * 0.48, bit * 60, P.dither);
            p[o + 3] = 255;
          }
        }
        if (P.glitch > 0.05) {
          GN.mosh(d, prev, (P.glitch * 60) | 0, 8, 4 + P.glitch * 24);
          if (Math.random() < P.glitch) GN.pixelSort(d, 120 - P.glitch * 60, P.glitch * 0.6, Math.random() < 0.3);
          if (Math.random() < P.glitch * 0.5) GN.tear(d, (Math.random() * h) | 0, (h * 0.1 * Math.random()) | 0, ((Math.random() - 0.5) * w * 0.2 * P.glitch) | 0);
          GN.rgbSplit(d, (P.glitch * 4) | 0);
        }
        g.putImageData(d, 0, 0);
        prev = d;
      }
    };
  };
})();
