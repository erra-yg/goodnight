'use strict';
/* 声音：全部用 Web Audio 现场合成。广告歌、低频持续音、磁带嘶声、心跳、故障声、尖啸、八音盒 */
GN.Audio = (function () {
  let ctx = null, master, comp, drone, droneF, tri, hiss, toneOsc, toneGain;
  let muted = false, hush = false, nextBeat = 0, noiseBuf = null;
  const VOL = 0.75;
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    comp = ctx.createDynamicsCompressor();
    master = ctx.createGain(); master.gain.value = VOL;
    master.connect(comp); comp.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const ch = noiseBuf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    // 低频持续音：两只略微失谐的锯齿波
    droneF = ctx.createBiquadFilter(); droneF.type = 'lowpass'; droneF.frequency.value = 120;
    drone = ctx.createGain(); drone.gain.value = 0;
    [55, 55.45, 27.6].forEach((f) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(droneF); o.start(); });
    droneF.connect(drone); drone.connect(master);
    // 三全音
    tri = ctx.createGain(); tri.gain.value = 0;
    const to = ctx.createOscillator(); to.type = 'sine'; to.frequency.value = 77.78; to.connect(tri); to.start();
    tri.connect(master);
    // 磁带嘶声
    const hs = ctx.createBufferSource(); hs.buffer = noiseBuf; hs.loop = true;
    const hf = ctx.createBiquadFilter(); hf.type = 'bandpass'; hf.frequency.value = 3200; hf.Q.value = 0.6;
    hiss = ctx.createGain(); hiss.gain.value = 0;
    hs.connect(hf); hf.connect(hiss); hiss.connect(master); hs.start();
    // 测试信号 1 kHz
    toneOsc = ctx.createOscillator(); toneOsc.frequency.value = 1000;
    toneGain = ctx.createGain(); toneGain.gain.value = 0;
    toneOsc.connect(toneGain); toneGain.connect(master); toneOsc.start();
  }

  function note(type, f, t0, dur, vol, detune, wow) {
    const o = ctx.createOscillator(), gn = ctx.createGain();
    o.type = type; o.frequency.value = f; o.detune.value = detune || 0;
    if (wow) {
      const l = ctx.createOscillator(), lg = ctx.createGain();
      l.frequency.value = 0.55; lg.gain.value = wow; l.connect(lg); lg.connect(o.detune); l.start(t0); l.stop(t0 + dur + 0.1);
    }
    gn.gain.setValueAtTime(0, t0);
    gn.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    gn.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 2600;
    o.connect(f2); f2.connect(gn); gn.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  /* 广告歌。rate<1 时像磁带被拖慢，creepy 时有几个音被改成小调 */
  const MEL = [[72, 1], [76, 1], [79, 1], [84, 2], [83, 1], [79, 1], [81, 1], [79, 3], [76, 1], [77, 1], [79, 2], [72, 4]];
  const BASS = [[48, 4], [55, 4], [53, 4], [48, 4]];
  function jingle(o) {
    if (!ctx || muted) return;
    o = o || {};
    const rate = o.rate || 1, beat = 0.2 / rate, t0 = ctx.currentTime + 0.05;
    const shift = Math.log2(rate) * 12;
    let t = t0;
    MEL.forEach(([m, d], i) => {
      let mm = m + shift + (o.box ? 12 : 0);
      if (o.creepy && (i === 1 || i === 8)) mm -= 1;
      note(o.box ? 'triangle' : 'square', mtof(mm), t, d * beat * (o.box ? 2.2 : 0.95), o.box ? 0.09 : 0.05, o.box ? (Math.random() - 0.5) * 30 : 0, o.creepy ? 40 : 0);
      t += d * beat;
    });
    if (!o.box) {
      t = t0;
      BASS.forEach(([m, d]) => { note('triangle', mtof(m + shift), t, d * beat * 0.9, 0.09, 0, o.creepy ? 40 : 0); t += d * beat; });
    }
  }

  function update(c, q, inEnd) {
    if (!ctx || hush) return;
    const now = ctx.currentTime, S = GN.smooth;
    drone.gain.setTargetAtTime(muted ? 0 : S(0.22, 1, c) * 0.16, now, 0.4);
    droneF.frequency.setTargetAtTime(110 + c * 520, now, 0.4);
    tri.gain.setTargetAtTime(muted ? 0 : S(0.5, 0.9, c) * 0.07, now, 0.6);
    hiss.gain.setTargetAtTime(muted ? 0 : S(0.2, 0.5, c) * (1 - S(0.7, 0.8, c) * 0.6) * 0.05, now, 0.3);
    if (inEnd && q > 0.25 && !muted && now >= nextBeat) {
      const iv = GN.lerp(1.25, 0.42, GN.clamp((q - 0.25) / 0.7));
      thump(now + 0.02, 0.5); thump(now + 0.2, 0.32);
      nextBeat = now + iv;
    }
  }
  function thump(t, v) {
    const o = ctx.createOscillator(), gn = ctx.createGain();
    o.frequency.setValueAtTime(62, t); o.frequency.exponentialRampToValueAtTime(32, t + 0.16);
    gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(v, t + 0.01); gn.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o.connect(gn); gn.connect(master); o.start(t); o.stop(t + 0.25);
  }
  function burst(intensity, digital) {
    if (!ctx || muted) return;
    const t = ctx.currentTime, gn = ctx.createGain();
    gn.gain.setValueAtTime(0.18 * intensity, t); gn.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    if (digital) {
      const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 600 + Math.random() * 2400;
      o.connect(gn); o.start(t); o.stop(t + 0.07);
    } else {
      const s = ctx.createBufferSource(); s.buffer = noiseBuf;
      const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1500;
      s.connect(f); f.connect(gn); s.start(t, Math.random()); s.stop(t + 0.12);
    }
    gn.connect(master);
  }
  function tone(on) {
    if (!ctx) return;
    toneGain.gain.setTargetAtTime(on && !muted ? 0.022 : 0, ctx.currentTime, 0.03);
  }
  function scream() {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const sh = ctx.createWaveShaper(), curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; curve[i] = Math.tanh(x * 6); }
    sh.curve = curve;
    const gn = ctx.createGain();
    gn.gain.setValueAtTime(0.55, t); gn.gain.setValueAtTime(0.55, t + 0.7); gn.gain.linearRampToValueAtTime(0, t + 0.95);
    sh.connect(gn); gn.connect(master);
    for (let i = 0; i < 6; i++) {
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      const f = 280 + Math.random() * 520;
      o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.45, t + 0.95);
      o.connect(sh); o.start(t); o.stop(t + 1);
    }
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 2;
    bp.frequency.setValueAtTime(2600, t); bp.frequency.exponentialRampToValueAtTime(380, t + 0.9);
    s.connect(bp); bp.connect(sh); s.start(t); s.stop(t + 1);
    // 尖啸之后，所有持续音一起停下
    hush = true;
    [drone, tri, hiss].forEach((n) => { n.gain.cancelScheduledValues(t); n.gain.setValueAtTime(0, t + 0.95); });
  }
  function wake() { hush = false; if (ctx) nextBeat = ctx.currentTime; }
  function setMuted(m) {
    muted = m;
    if (ctx) master.gain.setTargetAtTime(m ? 0 : VOL, ctx.currentTime, 0.05);
  }
  return {
    init, jingle, update, burst, tone, scream, setMuted, wake,
    get ready() { return !!ctx; },
    get on() { return !!ctx && !muted; }
  };
})();
