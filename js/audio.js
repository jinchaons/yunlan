'use strict';
/* ============ 程序化音效与配乐（WebAudio，无外部素材） ============ */
const Sfx = (() => {
  let ac = null, master = null, mus = null, on = true, cur = null, timer = null, step = 0, rnd = mulberry32(42), deg = 4;
  const MOODS = {
    calm:   { bpm: 76,  root: 293.66, scale: [0, 2, 4, 7, 9], dens: 0.55, drum: 0, vol: 0.5 },
    town:   { bpm: 104, root: 392.0,  scale: [0, 2, 4, 7, 9], dens: 0.7,  drum: 0.25, vol: 0.5 },
    bamboo: { bpm: 70,  root: 261.63, scale: [0, 3, 5, 7, 10], dens: 0.45, drum: 0, vol: 0.5 },
    fire:   { bpm: 92,  root: 220.0,  scale: [0, 3, 5, 7, 10], dens: 0.6,  drum: 0.4, vol: 0.5 },
    snow:   { bpm: 60,  root: 329.63, scale: [0, 2, 5, 7, 9], dens: 0.4,  drum: 0, vol: 0.5 },
    abyss:  { bpm: 64,  root: 196.0,  scale: [0, 1, 5, 7, 8], dens: 0.4,  drum: 0.2, vol: 0.5 },
    battle: { bpm: 148, root: 220.0,  scale: [0, 3, 5, 7, 10], dens: 0.8,  drum: 1, vol: 0.55 },
    boss:   { bpm: 164, root: 174.61, scale: [0, 1, 5, 7, 8], dens: 0.85, drum: 1, vol: 0.6 },
    title:  { bpm: 66,  root: 261.63, scale: [0, 2, 4, 7, 9], dens: 0.5,  drum: 0, vol: 0.5 }
  };
  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = on ? 0.6 : 0; master.connect(ac.destination);
      mus = ac.createGain(); mus.gain.value = 0.5; mus.connect(master);
      if (cur) { const m = cur; cur = null; music(m); }
    } catch (e) { ac = null; }
  }
  function tone(freq, dur, type, vol, when, slide, dest) {
    if (!ac) return;
    const t0 = ac.currentTime + (when || 0), o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest || master); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function noise(dur, vol, when, freq, q, dest) {
    if (!ac) return;
    const t0 = ac.currentTime + (when || 0), n = Math.floor(ac.sampleRate * dur), buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ac.createBufferSource(); s.buffer = buf;
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 1200; f.Q.value = q || 0.8;
    const g = ac.createGain(); g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(dest || master); s.start(t0);
  }
  function pluck(freq, vol, when) {
    tone(freq, 1.1, 'triangle', vol, when, 0, mus);
    tone(freq * 2, 0.35, 'sine', vol * 0.35, when, 0, mus);
    tone(freq * 1.003, 0.8, 'sine', vol * 0.4, when, 0, mus);
  }
  function play(name) {
    if (!ac || !on) return;
    switch (name) {
      case 'ui': tone(880, 0.07, 'triangle', 0.12); break;
      case 'ok': tone(660, 0.08, 'triangle', 0.14); tone(990, 0.12, 'triangle', 0.12, 0.06); break;
      case 'no': tone(180, 0.14, 'square', 0.07); break;
      case 'text': tone(1200 + Math.random() * 200, 0.02, 'sine', 0.03); break;
      case 'slash': noise(0.16, 0.34, 0, 3200, 0.7); tone(900, 0.12, 'sawtooth', 0.05, 0, 200); break;
      case 'hit': noise(0.1, 0.4, 0, 700, 0.6); tone(150, 0.14, 'sine', 0.3, 0, 60); break;
      case 'crit': noise(0.2, 0.5, 0, 1800, 0.5); tone(220, 0.25, 'square', 0.12, 0, 55); tone(1400, 0.2, 'triangle', 0.1, 0.02, 500); break;
      case 'heavy': noise(0.3, 0.5, 0, 400, 0.5); tone(110, 0.35, 'sine', 0.4, 0, 40); break;
      case 'fire': noise(0.45, 0.35, 0, 900, 0.4); tone(300, 0.4, 'sawtooth', 0.06, 0, 90); break;
      case 'ice': tone(2100, 0.25, 'triangle', 0.1); tone(2800, 0.3, 'sine', 0.08, 0.05); noise(0.2, 0.2, 0, 5000, 2); break;
      case 'poison': tone(260, 0.3, 'sawtooth', 0.07, 0, 140); noise(0.3, 0.15, 0, 1500, 3); break;
      case 'dark': tone(120, 0.5, 'sawtooth', 0.12, 0, 50); noise(0.4, 0.25, 0, 300, 1); break;
      case 'heal': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, 'sine', 0.12, i * 0.07)); break;
      case 'buff': tone(440, 0.25, 'triangle', 0.12, 0, 880); tone(660, 0.3, 'sine', 0.08, 0.1, 1320); break;
      case 'ult': noise(0.7, 0.3, 0, 600, 0.3); tone(110, 0.7, 'sawtooth', 0.14, 0, 440); tone(880, 0.5, 'triangle', 0.1, 0.35, 1760); break;
      case 'ko': tone(300, 0.4, 'sawtooth', 0.1, 0, 60); break;
      case 'win': [587, 740, 880, 1175, 880, 1175].forEach((f, i) => { tone(f, 0.4, 'triangle', 0.16, i * 0.13); tone(f / 2, 0.4, 'sine', 0.1, i * 0.13); }); break;
      case 'lose': [440, 392, 330, 262].forEach((f, i) => tone(f, 0.6, 'sine', 0.16, i * 0.25)); break;
      case 'lvup': [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.25, 'triangle', 0.15, i * 0.08)); break;
      case 'chest': tone(784, 0.1, 'triangle', 0.14); tone(1047, 0.1, 'triangle', 0.14, 0.09); tone(1568, 0.3, 'triangle', 0.14, 0.18); break;
      case 'encounter': tone(200, 0.35, 'sawtooth', 0.14, 0, 900); noise(0.35, 0.25, 0, 2000, 0.6); break;
      case 'gong': tone(98, 1.6, 'sine', 0.4); tone(196.5, 1.2, 'sine', 0.2); tone(294, 0.9, 'triangle', 0.1); noise(0.5, 0.15, 0, 500, 0.4); break;
    }
  }
  function tick() {
    const M = MOODS[cur]; if (!M || !ac || !on) return;
    const beat = step % 8, bar = Math.floor(step / 8);
    const f = d => { const n = M.scale.length, oct = Math.floor(d / n), i = ((d % n) + n) % n; return M.root * Math.pow(2, (M.scale[i] + oct * 12) / 12); };
    if (beat === 0 || rnd() < M.dens) {
      deg += Math.floor(rnd() * 5) - 2;
      if (deg < 0) deg += 3; if (deg > 11) deg -= 4;
      if (beat === 0 && bar % 4 === 0) deg = 5;
      pluck(f(deg), 0.16);
      if (rnd() < 0.18) pluck(f(deg + 2), 0.09, 30 / M.bpm);
    }
    if (beat % 4 === 0) tone(f([0, 3, 2, 4][bar % 4] - 10), 60 / M.bpm * 1.9, 'sine', 0.2, 0, 0, mus);
    if (M.drum) {
      if (beat % 4 === 0 && rnd() < M.drum + 0.2) { tone(120, 0.16, 'sine', 0.35 * M.drum, 0, 45, mus); }
      if (beat % 4 === 2 && rnd() < M.drum) noise(0.08, 0.16 * M.drum, 0, 2400, 1, mus);
      if (M.drum >= 1 && beat % 2 === 1) noise(0.03, 0.06, 0, 6000, 2, mus);
    }
    step++;
  }
  function music(mood) {
    if (cur === mood && timer) return;
    cur = mood; step = 0; deg = 5;
    if (timer) { clearInterval(timer); timer = null; }
    if (!ac || !MOODS[mood]) return;
    timer = setInterval(tick, 60000 / MOODS[mood].bpm / 2);
  }
  function toggle() { on = !on; if (master) master.gain.value = on ? 0.6 : 0; return on; }
  return { init, play, music, toggle, isOn: () => on };
})();
