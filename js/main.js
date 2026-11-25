'use strict';
/* 滚动状态、阶段切换、全屏效果、背后改写的文字、故障事件、对话框与声音按钮 */
(function () {
  const { clamp, smooth, lerp } = GN;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const S = GN.S = { c: 0, cv: 0, maxC: 0, y: 0, vh: innerHeight, vw: innerWidth, phase: -1, t0: performance.now(), back: 0, mx: innerWidth / 2, my: innerHeight / 2, lastMove: performance.now(), ended: false, ending: false, reduced, q: 0, inEnd: false };
  GN.ctrls = GN.ctrls || [];
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  let stored = {};
  try { stored = JSON.parse(localStorage.getItem('gn-night') || '{}') || {}; } catch (e) { stored = {}; }
  S.returning = !!stored.ended;
  GN.save = (k, v) => { stored[k] = v; try { localStorage.setItem('gn-night', JSON.stringify(stored)); } catch (e) { /* 存储不可用时照常运行 */ } };

  /* ---------- 按段落锚点把滚动位置换算成“腐化程度” c ---------- */
  let anchors = [];
  function measure() {
    S.vh = innerHeight; S.vw = innerWidth;
    const fxn = document.getElementById('fx-noise');
    fxn.width = Math.ceil(S.vw / 2.5); fxn.height = Math.ceil(S.vh / 2.5);
    anchors =$$('[data-c]').map((el) => ({ y: el.getBoundingClientRect().top + scrollY, c: parseFloat(el.dataset.c) }));
    anchors.push({ y: document.documentElement.scrollHeight - S.vh * 0.5, c: 1 });
    GN.ctrls.forEach((k) => k.resize && k.resize());
  }
  function computeC() {
    const probe = scrollY + S.vh * 0.5;
    let c = 0;
    for (let i = 0; i < anchors.length - 1; i++) {
      const a = anchors[i], b = anchors[i + 1];
      if (probe >= b.y) { c = b.c; continue; }
      if (probe >= a.y) { c = lerp(a.c, b.c, (probe - a.y) / (b.y - a.y)); break; }
    }
    return clamp(c);
  }
  GN.prog = (el) => { const r = el.getBoundingClientRect(); return clamp(-r.top / Math.max(1, r.height - S.vh)); };
  GN.watch = (el, k) => {
    k.on = false;
    new IntersectionObserver((es) => es.forEach((e) => {
      const was = k.on; k.on = e.isIntersecting;
      if (k.on && !was && k.enter) k.enter();
      if (!k.on && was && k.leave) k.leave();
    }), { rootMargin: '120px 0px' }).observe(el);
    GN.ctrls.push(k);
  };
  GN.inView = (el) => { const r = el.getBoundingClientRect(); return r.bottom > -40 && r.top < S.vh + 40; };

  let lastY = scrollY, upAcc = 0, wasDown = true;
  addEventListener('scroll', () => {
    const y = scrollY, dy = y - lastY; lastY = y;
    if (dy < 0) { upAcc -= dy; if (wasDown && upAcc > 400 && S.maxC > 0.2) { S.back++; wasDown = false; } }
    else if (dy > 0) { upAcc = 0; wasDown = true; }
  }, { passive: true });
  addEventListener('resize', measure);
  addEventListener('load', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  const pointer = (x, y) => { S.mx = x; S.my = y; S.lastMove = performance.now(); };
  addEventListener('pointermove', (e) => pointer(e.clientX, e.clientY), { passive: true });
  addEventListener('touchmove', (e) => { const t = e.touches[0]; if (t) pointer(t.clientX, t.clientY); }, { passive: true });

  /* ---------- 阶段：导航、标题、图标 ---------- */
  const PH = [0.16, 0.36, 0.56, 0.7, 0.9];
  const HREF = ['#features', '#tech', '#stories', '#pricing', '#faq', '#end'];
  const NAV = [
    ['产品', '技术', '用户故事', '价格', '常见问题'],
    ['产品', '技术', '用户故事', '价格', '常见问题'],
    ['产品', '技术', '用户', '门', '后面'],
    ['产 品', '技 术', '用 户', '门', '它'],
    ['不', '要', '回', '头'],
    ['它', '在', '你', '身', '后']
  ];
  const CART = ['购物车 (0)', '购物车 (1)', '购物车 (3)', '家庭成员 (5)', '家庭成员 (5)', '家庭成员 (6)'];
  const TITLE = ['晚安电器 WN-89', '晚安电器 WN-89', '晚安电器 · 守夜机', '晚安电器 · 用户紧急通告', '它知道你在这里', '别回头'];
  const LOGO = ['晚安电器', '晚安电器', '晚安电器', '晚安电器', '晚 安', '晚安'];
  const icon = (svg) => { let l = $('link[rel="icon"]'); if (!l) { l = document.createElement('link'); l.rel = 'icon'; document.head.appendChild(l); } l.href = 'data:image/svg+xml,' + encodeURIComponent(svg); };
  const ICON_MOON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#e2a03a"/><circle cx="22" cy="11" r="11" fill="#f6f0e2"/></svg>';
  const ICON_EYE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#000"/><path d="M2 16Q16 4 30 16Q16 28 2 16Z" fill="#e9e7df"/><circle cx="16" cy="16" r="6" fill="#ff2a3c"/><circle cx="16" cy="16" r="2.6" fill="#000"/></svg>';
  function applyPhase(n) {
    S.phase = n;
    document.body.dataset.phase = n;
    $('#nav-links').innerHTML = NAV[n].map((w, i) => `<a href="${HREF[Math.min(i, HREF.length - 1)]}">${w}</a>`).join('');
    $('#cart').textContent = CART[n];
    $('#logo-cn').textContent = LOGO[n];
    if (!document.hidden) document.title = TITLE[n];
    icon(n >= 3 ? ICON_EYE : ICON_MOON);
    document.body.style.cursor = n >= 5 ? 'none' : n >= 4 ? 'crosshair' : '';
    const kb = $('#knob-a'); if (kb) kb.style.transform = `rotate(${n * 57}deg)`;
  }
  document.addEventListener('visibilitychange', () => {
    if (S.phase < 2) return;
    if (document.hidden) document.title = '别走。';
    else { document.title = '你回来了。'; setTimeout(() => { if (!document.hidden) document.title = TITLE[S.phase]; }, 2600); }
  });

  /* ---------- 你离开之后被改写的文字 ---------- */
  const SWAPS = [
    ['#hero-title', 0.5, '它整夜醒着，<br>所以你可以安心睡下。'],
    ['#hero-title', 0.88, '它整夜醒着，<br>所以你可以永远睡下去。'],
    ['#hero-lede', 0.6, '晚安 WN-89 搭载夜视显像管、声纹记忆芯片和永续电源。把它放在卧室门口，它会替你看着黑暗，也看着你。'],
    ['#trust', 0.45, '★★★★★ 4.9 分 · 已陪伴 <span id="fam">1,204,389</span> 个家庭度过夜晚。没有一个家庭醒来。'],
    ['#jingle-btn', 0.6, '▶ 再听一遍'],
    ['#f2', 0.52, '记住每位家人的声音，也记住已经不在的家人的声音。'],
    ['#f3', 0.52, '停电不停机。拔掉电源也不停机。它不需要电。'],
    ['#f4', 0.52, '工作噪声低于 18 分贝。它移动的时候，你听不见。'],
    ['#sp-hours', 0.55, '25 小时 / 天'],
    ['#sp-mem', 0.55, '5 位家庭成员（已自动扩充）'],
    ['#st1', 0.6, '把守夜机放在卧室门口。早上它会自己转向床。'],
    ['#st3', 0.75, '关灯，睡觉。夜里不要起床。它不喜欢被看见。'],
    ['#tip-tail', 0.6, '夜里听到脚步声属于正常现象。'],
    ['#f1-cap', 0.6, '演示录像，已获用户授权使用。该用户已于次日失联。'],
    ['#pl-rec', 0.7, '它会记住每一个人，包括你没告诉它的那一个'],
    ['#dev-name', 0.6, '晚安 WN-00']
  ].map(([sel, at, html]) => ({ sel, at, html, done: false }));
  const MQ = [
    '全国联保 ✦ 七天无理由退换 ✦ 已守护 1,204,388 个家庭 ✦ 今晚，让它替你醒着 ✦ 新春特惠：第二台半价 ✦ ',
    '全国联保 ✦ 没有一个家庭申请退换 ✦ 已守护 1,204,389 个家庭 ✦ 今晚，让它替你醒着 ✦ 它不需要睡觉 ✦ 你需要 ✦ ',
    '晚安 ✦ 晚安 ✦ 晚安 ✦ 不要关灯 ✦ 晚安 ✦ 晚安 ✦ 它在门外 ✦ 晚安 ✦ '
  ];
  let mqStage = -1;
  function setMarquee(i) { mqStage = i; $('#mq').textContent = MQ[i].repeat(4); }
  function runSwaps(force) {
    for (const s of SWAPS) {
      if (s.done || S.maxC < s.at) continue;
      const el = $(s.sel);
      if (!el || (!force && GN.inView(el))) continue;
      el.innerHTML = s.html; s.done = true;
    }
    const want = S.maxC >= 0.88 || S.ended ? 2 : S.maxC >= 0.45 ? 1 : 0;
    if (want > mqStage && (force || !GN.inView($('#mq')))) setMarquee(want);
    if (S.maxC >= 0.55 && !GN.wrongAvatar) {
      const av = $('canvas.avatar[data-av="2"]');
      if (av && (force || !GN.inView(av))) { GN.drawAvatar(av, 2, true); GN.wrongAvatar = true; }
    }
  }
  GN.runSwaps = runSwaps;

  /* ---------- 故障事件 ---------- */
  const GLYPH = '▓▒░█▚▞▙▟◢◣';
  const GLYPH2 = '01#@%&$/\\|<>';
  let nextEv = 0, lastSub = 0, subFace = null;
  function corrupt() {
    const pool = $$('#main h2, #main h3, #main p, #main td, #main li, #main summary').filter((el) => el.childElementCount === 0 && el.textContent.length > 3 && GN.inView(el));
    if (!pool.length) return;
    const el = pool[(Math.random() * pool.length) | 0], orig = el.textContent;
    const set = S.cv > 0.7 ? GLYPH2 : GLYPH;
    const bad = Array.from(orig).map((ch) => (Math.random() < 0.18 + S.cv * 0.3 ? set[(Math.random() * set.length) | 0] : ch)).join('');
    el.textContent = bad;
    setTimeout(() => { if (el.textContent === bad) el.textContent = orig; }, 110 + Math.random() * 160);
  }
  function jolt() {
    if (reduced) return;
    const m = $('#main'), k = 2 + S.cv * 16;
    m.style.setProperty('--jx', ((Math.random() - 0.5) * k).toFixed(1) + 'px');
    m.style.setProperty('--jy', ((Math.random() - 0.5) * k * 0.3).toFixed(1) + 'px');
    m.style.setProperty('--jk', ((Math.random() - 0.5) * S.cv * 5).toFixed(2) + 'deg');
    m.classList.add('jolt');
    setTimeout(() => m.classList.remove('jolt'), 60 + Math.random() * 90);
  }
  function tear() {
    const tr = $('#fx-track');
    tr.style.transform = `translateY(${(Math.random() * 90).toFixed(0)}vh)`;
    tr.style.opacity = 0.9;
    setTimeout(() => { tr.style.opacity = 0; }, 160 + Math.random() * 160);
  }
  function subliminal() {
    const cv = $('#sub-c'), g = cv.getContext('2d');
    if (Math.random() < 0.6) {
      if (!subFace) subFace = GN.Face(cv);
      subFace.render(performance.now() / 1000, { vis: 1, zoom: 1.05, grin: 1, open: 0.15, tilt: 0.25, glitch: 0.3, dither: 0.6, lookX: 0, lookY: 0, eyeS: 1.15, offX: 0, offY: 0.02 });
    } else {
      g.fillStyle = '#000'; g.fillRect(0, 0, cv.width, cv.height);
      GN.bitmapText(g, ['它在你身后', '不要回头', '我看见你了'][(Math.random() * 3) | 0], cv.width / 2, cv.height / 2 - 10, 18, '#ff2a3c', 'center');
    }
    const sub = $('#sub');
    sub.style.display = 'block';
    setTimeout(() => { sub.style.display = 'none'; }, 70);
  }
  function glitchTick(now) {
    if (S.ending || S.cv < 0.14 || now < nextEv) return;
    const rate = (S.cv - 0.14) * 2.2;
    nextEv = now + (1000 / (rate + 0.05)) * (0.5 + Math.random());
    const r = Math.random();
    if (S.cv > 0.56 && !reduced && now - lastSub > 5000 && r < 0.12 && !S.inEnd) { lastSub = now; subliminal(); GN.Audio.burst(1, true); return; }
    if (S.cv > 0.3 && S.cv < 0.74 && r < 0.4) { tear(); GN.Audio.burst(0.6, false); }
    if (S.cv > 0.24 && r < 0.75) corrupt();
    if (r > 0.45) { jolt(); GN.Audio.burst(0.4 + S.cv * 0.6, S.cv > 0.7); }
  }

  /* ---------- 全屏效果层 ---------- */
  const fxNoise = $('#fx-noise'), fxScan = $('#fx-scan'), fxVig = $('#fx-vig'), hud = $('#vhs-hud'), hudTc = $('#hud-tc'), root = document.documentElement;
  let fcount = 0;
  function overlays() {
    const c = S.cv;
    const scan = smooth(0.14, 0.45, c) * 0.55 * (1 - smooth(0.68, 0.74, c));
    const noise = smooth(0.2, 0.6, c) * 0.3 * (1 - 0.5 * smooth(0.7, 0.76, c));
    fxScan.style.opacity = scan.toFixed(3);
    fxNoise.style.opacity = noise.toFixed(3);
    fxVig.style.opacity = (smooth(0.28, 0.95, c) * 0.95).toFixed(3);
    hud.style.opacity = (smooth(0.36, 0.42, c) * (1 - smooth(0.64, 0.7, c))).toFixed(3);
    root.style.setProperty('--ab', (smooth(0.22, 0.66, c) * 2.4 * (1 - smooth(0.88, 0.95, c))).toFixed(2) + 'px');
    if (noise > 0.01 && (fcount++ % 3 === 0)) GN.noiseFrame(fxNoise);
    const s = ((performance.now() - S.t0) / 1000) | 0;
    hudTc.textContent = `SP ${(s / 3600) | 0}:${String(((s / 60) | 0) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  /* ---------- 订单对话框 ---------- */
  const MSG = {
    basic: ['订单已提交。守夜机今晚送达。为了方便配送员进门，请不要锁门。', '订单已提交。它已经出发了，它知道你住在哪里。', '不用订购了。它已经在你家里。'],
    family: ['订单已提交。两台守夜机今晚送达，分别守着卧室和客厅。', '订单已提交。两台都已出发。第三台已经到了。', '不用订购了。它们已经在你家里。'],
    sign: ['签署成功。请在今晚入睡前，对着屏幕说出你的名字。', '签署成功。名字已经收到。', '签署成功。']
  };
  const dlg = $('#dlg');
  let lastFocus = null;
  function openDlg(kind) {
    const st = S.phase < 2 ? 0 : S.phase < 4 ? 1 : 2;
    $('#dlg-msg').textContent = (MSG[kind] || MSG.basic)[st];
    $('#dlg-title').textContent = st === 2 ? '晚安电器 - 警告' : '晚安电器 - 订单';
    lastFocus = document.activeElement;
    dlg.hidden = false;
    $('#dlg-ok').focus();
  }
  function closeDlg() { dlg.hidden = true; if (lastFocus) lastFocus.focus(); }
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-order]'); if (b) openDlg(b.dataset.order); });
  $('#dlg-ok').addEventListener('click', closeDlg);
  $('#dlg-x').addEventListener('click', closeDlg);
  dlg.addEventListener('click', (e) => { if (e.target === dlg) closeDlg(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !dlg.hidden) closeDlg(); });

  /* ---------- 声音按钮 ---------- */
  const sb = $('#sound-btn');
  function soundLabel() { const on = GN.Audio.on; sb.textContent = on ? '声音 开' : '声音 关'; sb.setAttribute('aria-pressed', String(on)); }
  sb.addEventListener('click', () => {
    if (!GN.Audio.ready) { GN.Audio.init(); GN.Audio.setMuted(false); }
    else GN.Audio.setMuted(GN.Audio.on);
    soundLabel();
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#jingle-btn')) return;
    GN.Audio.init(); GN.Audio.setMuted(false); soundLabel();
    GN.Audio.jingle(S.maxC > 0.6 ? { rate: 0.62, creepy: true } : {});
  });
  GN.soundLabel = soundLabel;

  /* ---------- 主循环 ---------- */
  setInterval(() => runSwaps(false), 400);
  function frame(now) {
    requestAnimationFrame(frame);
    const t = now / 1000;
    S.y = scrollY;
    S.c = computeC();
    if (!S.ending) S.maxC = Math.max(S.maxC, S.c);
    S.cv = Math.max(S.c, S.maxC * 0.5);
    let ph = 0; while (ph < PH.length && S.cv >= PH[ph]) ph++;
    if (ph !== S.phase) applyPhase(ph);
    overlays();
    glitchTick(now);
    GN.Audio.update(S.cv, S.q, S.inEnd);
    for (const k of GN.ctrls) if (k.on && k.frame) k.frame(t, now);
  }
  GN.start = function () {
    setMarquee(0);
    if (S.returning) $('#trust').innerHTML = '★★★★★ 4.9 分 · 已陪伴 <span id="fam">1,204,389</span> 个家庭度过夜晚，包括你家。';
    measure();
    requestAnimationFrame(frame);
  };
})();
