'use strict';
/* 各段落的控制器：每段只在看得见时才渲染 */
(function () {
  const { clamp, smooth, lerp } = GN;
  const S = GN.S, $ = (s) => document.querySelector(s);
  const pad = (n) => String(n).padStart(2, '0');

  /* ---------- 首屏：守夜机屏幕、液晶时钟、家庭计数 ---------- */
  document.querySelectorAll('canvas.picon').forEach((c) => GN.drawIcon(c, c.dataset.icon, '#2a2118'));
  document.querySelectorAll('canvas.avatar').forEach((c) => GN.drawAvatar(c, +c.dataset.av, false));
  const dev = GN.DeviceScreen($('#dev-screen')), clockSvg = $('#dev-clock'), devEl = $('.device');
  let fam = 1204388, nextFam = 0, lastClock = '';
  GN.watch(devEl, {
    frame(t, now) {
      const r = devEl.getBoundingClientRect();
      const follow = S.cv >= 0.2;
      const mode = S.ended || S.maxC >= 0.85 ? 2 : S.maxC >= 0.45 ? 1 : 0;
      dev.render(t, {
        mode,
        lookX: follow ? (S.mx - (r.left + r.width * 0.36)) / 260 : 0,
        lookY: follow ? (S.my - (r.top + r.height * 0.38)) / 260 : 0
      });
      const d = new Date();
      const str = mode === 2 ? '00x00' : pad(d.getHours()) + 'x' + pad(d.getMinutes());
      const colon = mode === 2 ? (t % 1 < 0.5) : d.getSeconds() % 2 === 0;
      const key = str + colon;
      if (key !== lastClock) { GN.drawClock(clockSvg, str, colon); lastClock = key; }
      if (now > nextFam && S.phase < 2) {
        nextFam = now + 3000 + Math.random() * 6000;
        if (nextFam > 0 && lastClock) { fam += 1; const f = $('#fam'); if (f) f.textContent = fam.toLocaleString('en-US'); }
      }
    }
  });

  /* ---------- CAM 01 走廊 ---------- */
  const f1 = $('#feed1'), hall = GN.Hall(f1), f1g = f1.getContext('2d'), f1ts = $('#f1-ts'), f1n = $('#f1-count');
  let f1visits = 0, f1count = 0, nextFlash = 0, flashUntil = 0, f1frame = 0;
  const today = new Date();
  GN.watch($('#demo'), {
    enter() { f1visits++; nextFlash = performance.now() + 2500 + Math.random() * 3000; },
    frame(t, now) {
      if ((f1frame++ & 1)) return;
      const m = S.maxC;
      const st = { open: m < 0.45 && f1visits <= 1 ? 0 : m < 0.7 ? 0.45 : 1, gap: m >= 0.45 ? 0.42 : 0.16, photo: m >= 0.55, fig: 0, figZ: 8.6, figX: 0, tilt: 0.08 };
      if (now > nextFlash) { flashUntil = now + 450 + Math.random() * 300; nextFlash = now + 6000 + Math.random() * 5000; f1count++; f1n.textContent = f1count; }
      if (m >= 0.7) { st.fig = 1; st.figZ = 4.9; st.figX = -0.22; st.tilt = 0.38; f1n.textContent = '99+'; }
      else if (now < flashUntil) { st.fig = 1; st.figZ = m >= 0.45 ? 6.1 : 8.6; st.figX = m >= 0.45 ? 0.15 : 0; st.tilt = m >= 0.45 ? 0.3 : 0.08; }
      else if (m >= 0.45) { st.fig = 1; st.figZ = 8.95; st.figX = -0.12; st.tilt = 0.15; }
      f1g.putImageData(hall.render(t, st), 0, 0);
      const s = 7 + ((now - S.t0) / 1000 | 0);
      f1ts.textContent = `1997-${pad(today.getMonth() + 1)}-${pad(today.getDate())} 02:${pad(13 + ((s / 60) | 0) % 47)}:${pad(s % 60)}`;
    }
  });

  /* ---------- 常见问题：问题自己打开 ---------- */
  const faqItems = Array.from(document.querySelectorAll('#faq-list details'));
  let faqNext = 0, faqI = 0;
  GN.watch($('#faq'), {
    frame(t, now) {
      if (S.cv < 0.42 || faqI >= faqItems.length || now < faqNext) return;
      faqNext = now + 1700 + Math.random() * 900;
      const d = faqItems[faqI++];
      if (GN.inView(d)) { d.open = true; GN.Audio.burst(0.25, false); } else faqI--;
    }
  });

  /* ---------- 紧急通告 ---------- */
  const tvEl = $('#notice'), tv = GN.TV($('#tv'));
  let tvFrame = 0, sangCreepy = false;
  GN.watch(tvEl, {
    leave() { GN.Audio.tone(false); },
    frame(t) {
      const p = GN.prog(tvEl);
      GN.Audio.tone(p < 0.13 && p > 0);
      if (p > 0.2 && !sangCreepy && GN.Audio.on) { sangCreepy = true; GN.Audio.jingle({ rate: 0.62, creepy: true }); }
      if ((tvFrame++ & 1)) return;
      tv.render(t, p);
    }
  });

  /* ---------- 断裂 ---------- */
  const brEl = $('#break'), burst = GN.Burst($('#burst')), bt1 = $('#break-t1'), bt2 = $('#break-t2');
  let brFrame = 0;
  GN.watch(brEl, {
    frame(t) {
      const r = GN.prog(brEl);
      if (!(brFrame++ & 1)) burst.render(t, r);
      const word = r < 0.45 ? '信号中断' : '看见你了';
      if (bt1.textContent !== word) { bt1.textContent = word; bt1.dataset.text = word; }
      const k = S.reduced ? 0 : r * 0.06;
      bt1.style.transform = `translate(calc(-50% + ${((Math.random() - 0.5) * k * 100).toFixed(1)}px), -50%) scale(${(1 + (Math.random() - 0.5) * k).toFixed(3)}, ${(1 + r * 0.25).toFixed(3)})`;
      bt1.style.opacity = (1 - smooth(0.88, 1, r)).toFixed(3);
      bt2.style.opacity = (smooth(0.5, 0.62, r) * (1 - smooth(0.92, 1, r))).toFixed(3);
    }
  });

  /* ---------- 观察记录 ---------- */
  const eyes = GN.Eyes($('#eyes')), eyesEl = $('#eyes'), youEl = $('#you');
  const R = (id) => document.getElementById(id);
  let roNext = 0, eyFrame = 0;
  const plat = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '未知';
  R('r-plat').textContent = plat || '未知';
  GN.watch(youEl, {
    frame(t, now) {
      const idle = now - S.lastMove > 2200;
      if (!(eyFrame++ & 1)) { const r = eyesEl.getBoundingClientRect(); eyes.render(t, S.mx - r.left, S.my - r.top, idle, Math.random() < 0.3); }
      if (now < roNext) return;
      roNext = now + 250;
      const d = new Date(), hr = d.getHours();
      R('r-time').textContent = `${pad(hr)}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      R('r-time-c').textContent = hr >= 22 || hr < 5 ? '这么晚了，你还醒着。它喜欢醒着的人。' : hr < 17 ? '天还亮着。天总会黑的。' : '天快黑了。';
      const s = ((now - S.t0) / 1000) | 0;
      R('r-stay').textContent = `${(s / 60) | 0} 分 ${s % 60} 秒`;
      R('r-back').textContent = `${S.back} 次`;
      R('r-back-c').textContent = S.back ? '你往回看了。你在找什么？它一直跟在你后面。' : '你一次都没有往回看。很好。不要往回看。';
      R('r-screen').textContent = `${screen.width} × ${screen.height}`;
      R('r-cursor').textContent = `(${S.mx | 0}, ${S.my | 0})`;
      R('r-cursor-c').textContent = idle ? '别动。它在看你。' : '它看见你在动。';
      R('r-scroll').textContent = `${Math.round(scrollY).toLocaleString('en-US')} 像素`;
    }
  });

  /* ---------- CAM 00：你所在的房间 ---------- */
  const f2 = $('#feed2'), room = GN.Room(f2), f2g = f2.getContext('2d'), f2ts = $('#f2-ts'), f2cap = $('#f2-cap');
  const POS = [{ x: -1.45, z: 3.95, tilt: 0.1 }, { x: -0.85, z: 3.25, tilt: 0.25 }, { x: -0.22, z: 2.75, tilt: 0.55 }];
  const CAP = ['角落里有东西。', '它比刚才近了。', '它就在你身后。', '坐在那里的，不是你。'];
  let camState = -1, camSince = 0, f2frame = 0;
  function setCam(s) {
    camState = s; camSince = performance.now();
    f2cap.textContent = CAP[s]; f2cap.dataset.text = CAP[s];
    GN.Audio.burst(1, true);
  }
  GN.watch($('#cam0'), {
    enter() { setCam(Math.min(3, camState + 1)); },
    frame(t, now) {
      if (camState < 2 && now - camSince > 6500) setCam(camState + 1);
      if ((f2frame++ & 1)) return;
      const p = POS[Math.min(2, camState)];
      const st = { fig: camState < 3 ? 1 : 0, figX: p.x, figZ: p.z, tilt: p.tilt + Math.sin(t * 0.5) * 0.03, turned: camState >= 3, tint: [1, 0.95, 0.95] };
      const img = room.render(t, st);
      GN.rgbSplit(img, 2);
      if (Math.random() < 0.1) GN.pixelSort(img, 150, 0.35, false);
      f2g.putImageData(img, 0, 0);
      const d = new Date();
      f2ts.textContent = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }
  });

  /* ---------- 结尾 ---------- */
  const endEl = $('#end'), stage = $('#end-stage'), faceCv = $('#face'), face = GN.Face(faceCv);
  const lines = Array.from(document.querySelectorAll('.end-line')).map((el) => ({ el, a: +el.dataset.a, b: +el.dataset.b }));
  let jx = 0, jy = 0, nextJit = 0, endFrame = 0, scareUntil = 0;
  function sizeFace() {
    const w = S.vw > 900 ? 240 : 180;
    faceCv.width = w; faceCv.height = Math.round(clamp(w * S.vh / S.vw, w * 0.45, w * 2.2));
  }
  sizeFace();
  function scare() {
    S.ending = true;
    scareUntil = performance.now() + 900;
    GN.Audio.scream();
    if (!S.reduced) stage.classList.add('scare');
    lines.forEach((l) => { l.el.style.opacity = 0; });
    setTimeout(() => {
      stage.classList.remove('scare');
      faceCv.style.opacity = 0;
      const en = $('#ending');
      en.hidden = false;
      document.body.style.overflow = 'hidden';
      setTimeout(() => en.classList.add('show'), 1400);
      GN.save('ended', true);
    }, 900);
  }
  GN.watch(endEl, {
    resize: sizeFace,
    leave() { S.inEnd = false; },
    frame(t, now) {
      const q = GN.prog(endEl);
      S.q = q; S.inEnd = true;
      const scaring = now < scareUntil;
      if (!S.ending) {
        lines.forEach((l) => { l.el.style.opacity = (smooth(l.a, l.a + 0.03, q) * (1 - smooth(l.b - 0.03, l.b, q))).toFixed(3); });
        if (q >= 0.975) { scare(); return; }
      }
      if (now > nextJit) { nextJit = now + 120 + Math.random() * 380; jx = (Math.random() - 0.5) * 0.02; jy = (Math.random() - 0.5) * 0.015; }
      const vis = 0.14 * smooth(0.42, 0.55, q) + 0.78 * smooth(0.55, 0.93, q);
      if (!scaring && (vis <= 0.001 || S.ending)) { faceCv.style.opacity = 0; return; }
      faceCv.style.opacity = 1;
      if ((endFrame++ & 1)) return;
      const lx = clamp((S.mx / S.vw - 0.5) * 2, -1, 1), ly = clamp((S.my / S.vh - 0.5) * 2, -1, 1);
      const P = scaring
        ? { vis: 1.15, zoom: 1.8 + (now - scareUntil + 900) / 900 * 0.5, grin: 1, open: 0.85, tilt: 0.3 + (Math.random() - 0.5) * 0.12, glitch: scareUntil - now > 480 ? 0.06 : 0.85, dither: 0.15, lookX: 0, lookY: 0, eyeS: 1.3, offX: (Math.random() - 0.5) * 0.03, offY: -0.12 }
        : { vis, zoom: lerp(0.5, 1.15, smooth(0.5, 0.95, q)), grin: smooth(0.6, 0.9, q), open: 0, tilt: 0.06 + 0.3 * smooth(0.6, 0.95, q) + Math.sin(t * 0.7) * 0.02, glitch: 0.04 + 0.5 * smooth(0.75, 0.96, q), dither: 0.65 * smooth(0.55, 0.8, q), lookX: lx, lookY: ly, eyeS: 1, offX: jx, offY: jy };
      face.render(t, P);
    }
  });

  $('#restart').addEventListener('click', () => {
    const en = $('#ending');
    en.classList.remove('show'); en.hidden = true;
    document.body.style.overflow = '';
    S.ended = true; S.ending = false; S.maxC = 1;
    GN.runSwaps(true);
    GN.Audio.wake();
    scrollTo(0, 0);
    if (GN.Audio.on) setTimeout(() => GN.Audio.jingle({ box: true, rate: 0.8 }), 600);
  });

  GN.start();
})();
