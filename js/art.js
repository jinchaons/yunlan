'use strict';
/* ============ 程序化美术：人物、怪物、场景物件、远景 ============ */
const TAU = Math.PI * 2;
const FONT_K = '"STKaiti","KaiTi","楷体","Kaiti SC","Noto Serif SC","Songti SC",serif';
const FONT_S = '"Microsoft YaHei","PingFang SC","Noto Sans SC","Hiragino Sans GB",sans-serif';

const Art = (() => {
  const cache = {};
  const SS = 2; // 物件贴图超采样

  function hx(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function toHex(r, g, b) { return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1); }
  function mix(a, b, t) {
    const A = hx(a), B = hx(b);
    return toHex(Math.round(A[0] + (B[0] - A[0]) * t), Math.round(A[1] + (B[1] - A[1]) * t), Math.round(A[2] + (B[2] - A[2]) * t));
  }
  function shade(c, a) { return a >= 0 ? mix(c, '#ffffff', a) : mix(c, '#000000', -a); }
  function rgba(c, a) { const A = hx(c); return 'rgba(' + A[0] + ',' + A[1] + ',' + A[2] + ',' + a + ')'; }
  function circ(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, TAU); }
  function ell(c, x, y, rx, ry, rot) { c.beginPath(); c.ellipse(x, y, rx, ry, rot || 0, 0, TAU); }
  function rrect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h); c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
  }
  function glow(c, x, y, r, col, a) {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0));
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const OL = 'rgba(24,18,36,.62)';

  /* ---------------- 人形角色（Q版） ---------------- */
  function sleeve(c, sx, sy, hx_, hy, w0, w1, col) {
    const dx = hx_ - sx, dy = hy - sy, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    c.beginPath();
    c.moveTo(sx + nx * w0, sy + ny * w0); c.lineTo(hx_ + nx * w1, hy + ny * w1);
    c.lineTo(hx_ - nx * w1, hy - ny * w1); c.lineTo(sx - nx * w0, sy - ny * w0); c.closePath();
    c.fillStyle = col; c.fill(); c.stroke();
  }
  function weapon(c, L, ang) {
    const wp = L.wp || 'none', wc = L.wc || '#dfe8f4';
    if (wp === 'none') return;
    c.save(); c.rotate(ang);
    c.lineWidth = 1; c.strokeStyle = OL;
    if (wp === 'sword' || wp === 'dagger') {
      const len = wp === 'sword' ? 27 : 14;
      const g = c.createLinearGradient(-2, 0, 2, 0); g.addColorStop(0, '#ffffff'); g.addColorStop(1, wc);
      c.beginPath(); c.moveTo(-1.6, -1); c.lineTo(-1.6, -len + 4); c.lineTo(0, -len); c.lineTo(1.6, -len + 4); c.lineTo(1.6, -1); c.closePath();
      c.fillStyle = g; c.fill(); c.stroke();
      c.fillStyle = '#e8c66a'; rrect(c, -4.2, -2, 8.4, 2.6, 1); c.fill(); c.stroke();
      c.fillStyle = '#4a3324'; c.fillRect(-1.1, 0.6, 2.2, 5.5);
      c.fillStyle = '#e8c66a'; circ(c, 0, 6.6, 1.4); c.fill();
    } else if (wp === 'saber') {
      const g = c.createLinearGradient(-3, 0, 4, 0); g.addColorStop(0, '#ffffff'); g.addColorStop(1, wc);
      c.beginPath(); c.moveTo(-1.6, -1); c.lineTo(-2.2, -20); c.quadraticCurveTo(-1, -28, 5, -30); c.quadraticCurveTo(5, -16, 2.8, -1); c.closePath();
      c.fillStyle = g; c.fill(); c.stroke();
      c.fillStyle = '#c9a24a'; ell(c, 0.4, -0.6, 4.2, 1.8); c.fill(); c.stroke();
      c.fillStyle = '#3a2620'; c.fillRect(-1.2, 0.8, 2.6, 6);
      c.strokeStyle = '#c9a24a'; c.lineWidth = 1.2; circ(c, 0.2, 8.6, 1.8); c.stroke();
    } else if (wp === 'staff') {
      c.strokeStyle = '#6b4a2a'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(0, 14); c.lineTo(0, -32); c.stroke();
      c.fillStyle = '#e8c66a'; circ(c, 0, -33, 2.6); c.fill();
    } else if (wp === 'fan') {
      c.strokeStyle = '#8a6a4a'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, 2); c.lineTo(0, -8); c.stroke();
      c.fillStyle = '#ffffff'; c.strokeStyle = shade(wc, -0.2); c.lineWidth = 1.4; circ(c, 0, -15, 7.6); c.fill(); c.stroke();
      c.fillStyle = wc; circ(c, -2, -16, 2); c.fill(); circ(c, 2.4, -13.4, 1.5); c.fill(); circ(c, 1, -18.6, 1.2); c.fill();
    }
    c.restore();
  }

  function humanoid(c, L, o) {
    const t = o.t || 0, pose = o.pose || 'idle', sw = o.swing || 0, moving = !!o.walk, ph = t * 11, seed = o.seed || 0;
    const legA = moving ? Math.sin(ph) * 4 : 0;
    const bob = moving ? -Math.abs(Math.sin(ph)) * 1.6 : Math.sin(t * 2.4 + seed) * 0.7;
    const robe = L.robe || '#888888', trim = L.trim || '#ffffff', skin = L.skin || '#ffe2c8', hair = L.hair || '#22222c', sash = L.sash || '#f2c14e';
    const sz = L.sz || 1;
    c.save();
    c.scale(sz * (o.face || 1), sz);
    c.lineJoin = 'round'; c.lineCap = 'round';
    if (!o.noShadow) { c.fillStyle = 'rgba(0,0,0,.26)'; ell(c, 0, 0, 13, 4.5); c.fill(); }
    if (pose === 'dead') { c.translate(-8, -5); c.rotate(-1.42); c.globalAlpha *= 0.82; }
    if (L.aura && pose !== 'dead') {
      c.save(); c.globalCompositeOperation = 'lighter';
      if (L.wings) {
        for (let i = 0; i < 7; i++) {
          const a = -Math.PI / 2 + (i - 3) * 0.42 + Math.sin(t * 1.7 + i) * 0.06, len = 44 + Math.sin(t * 3 + i * 2) * 6;
          c.save(); c.translate(-2, -26); c.rotate(a);
          const g = c.createLinearGradient(0, 0, len, 0); g.addColorStop(0, rgba(L.aura, 0.55)); g.addColorStop(1, rgba(L.aura, 0));
          c.fillStyle = g; c.beginPath(); c.moveTo(0, -5); c.quadraticCurveTo(len * 0.5, -9, len, 0); c.quadraticCurveTo(len * 0.5, 9, 0, 5); c.fill();
          c.restore();
        }
      }
      glow(c, 0, -24, 40 + Math.sin(t * 3) * 3, L.aura, 0.42);
      c.restore();
    }
    let lean = 0;
    if (pose === 'attack') lean = 0.2 * Math.sin(sw * Math.PI);
    else if (pose === 'hit') lean = -0.24;
    else if (pose === 'guard') lean = -0.06;
    c.rotate(lean);
    c.lineWidth = 1.3; c.strokeStyle = OL;

    // 腿
    const legc = shade(robe, -0.5);
    for (const s of [-1, 1]) {
      const fx = s * 3.6 + s * legA * 0.9, lift = moving ? Math.max(0, -s * Math.cos(ph)) * 2 : 0;
      c.strokeStyle = legc; c.lineWidth = 5.4; c.beginPath(); c.moveTo(s * 3, -11); c.lineTo(fx, -2 - lift); c.stroke();
      c.fillStyle = '#2a2230'; ell(c, fx + 1, -1.4 - lift, 3.8, 2.3); c.fill();
    }
    c.strokeStyle = OL; c.lineWidth = 1.3;
    c.translate(0, bob);

    // 后发
    const hy0 = -38, hx0 = 1;
    const sway = Math.sin(t * 2.2 + seed) * 1.5 + (moving ? -2.5 : 0);
    c.fillStyle = hair;
    if (L.hs === 'long') {
      c.beginPath(); c.moveTo(hx0 - 11, hy0 - 4); c.quadraticCurveTo(hx0 - 17 + sway, hy0 + 14, hx0 - 12 + sway * 1.6, hy0 + 27);
      c.quadraticCurveTo(hx0 - 4 + sway, hy0 + 24, hx0 + 2, hy0 + 12); c.lineTo(hx0 + 6, hy0 - 6); c.closePath(); c.fill(); c.stroke();
    } else if (L.hs === 'pony') {
      c.beginPath(); c.moveTo(hx0 - 7, hy0 - 10); c.quadraticCurveTo(hx0 - 21 + sway, hy0 - 6, hx0 - 17 + sway * 1.8, hy0 + 18);
      c.quadraticCurveTo(hx0 - 11 + sway, hy0 + 6, hx0 - 6, hy0 - 2); c.closePath(); c.fill(); c.stroke();
    } else if (L.hs === 'top') {
      c.strokeStyle = sash; c.lineWidth = 2;
      c.beginPath(); c.moveTo(hx0 - 2, hy0 - 14); c.quadraticCurveTo(hx0 - 12 + sway, hy0 - 12, hx0 - 13 + sway * 1.6, hy0 - 2); c.stroke();
      c.beginPath(); c.moveTo(hx0 - 2, hy0 - 14); c.quadraticCurveTo(hx0 - 9 + sway, hy0 - 16, hx0 - 16 + sway * 1.6, hy0 - 8); c.stroke();
      c.strokeStyle = OL; c.lineWidth = 1.3;
    }
    if (L.hs === 'hood') {
      c.fillStyle = shade(robe, -0.3);
      c.beginPath(); c.moveTo(hx0 - 12, hy0 - 2); c.quadraticCurveTo(hx0 - 16, hy0 + 12, hx0 - 9, hy0 + 16); c.lineTo(hx0 + 4, hy0 + 12); c.closePath(); c.fill(); c.stroke();
    }

    // 后臂
    const armSw = moving ? Math.sin(ph) * 3 : 0;
    let bhx = -10 - armSw, bhy = -15;
    if (pose === 'cast') { bhx = 4; bhy = -31; }
    sleeve(c, -6.5, -26, bhx, bhy, 3, 4.4, shade(robe, -0.2));
    c.fillStyle = skin; circ(c, bhx, bhy, 2.2); c.fill(); c.stroke();

    // 衣袍
    const hem = moving ? legA * 0.35 : Math.sin(t * 2 + seed) * 0.5;
    let g = c.createLinearGradient(0, -29, 0, -5);
    g.addColorStop(0, shade(robe, 0.18)); g.addColorStop(0.55, robe); g.addColorStop(1, shade(robe, -0.24));
    c.beginPath(); c.moveTo(-8, -27); c.quadraticCurveTo(-10, -17, -12.5 - hem, -7); c.quadraticCurveTo(0, -3.5, 12.5 - hem, -7);
    c.quadraticCurveTo(10, -17, 8, -27); c.quadraticCurveTo(0, -30, -8, -27); c.closePath();
    c.fillStyle = g; c.fill(); c.stroke();
    // 下摆饰边
    c.strokeStyle = rgba(trim, 0.85); c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(-11.6 - hem, -8.6); c.quadraticCurveTo(0, -5.4, 11.6 - hem, -8.6); c.stroke();
    // 衣襟
    c.strokeStyle = trim; c.lineWidth = 2.4;
    c.beginPath(); c.moveTo(-4.5, -28); c.lineTo(1.5, -19.5); c.lineTo(5.5, -28); c.stroke();
    c.lineWidth = 1.5; c.beginPath(); c.moveTo(1.5, -19.5); c.lineTo(2.2 - hem * 0.4, -6.6); c.stroke();
    // 腰带
    c.strokeStyle = sash; c.lineWidth = 3.2; c.beginPath(); c.moveTo(-9.6, -18.6); c.quadraticCurveTo(0, -17, 9.6, -18.6); c.stroke();
    c.lineWidth = 2; c.beginPath(); c.moveTo(3.5, -17.4); c.lineTo(5 - hem * 0.8, -10.5); c.stroke();
    c.strokeStyle = OL; c.lineWidth = 1.3;

    // 头
    c.fillStyle = shade(skin, -0.12); c.fillRect(-1.6, -29.5, 4.4, 3.5);
    g = c.createRadialGradient(hx0 + 3, hy0 - 3, 2, hx0, hy0, 12.5);
    g.addColorStop(0, shade(skin, 0.14)); g.addColorStop(1, shade(skin, -0.06));
    c.fillStyle = g; circ(c, hx0, hy0, 11.5); c.fill(); c.stroke();
    // 五官
    const ex = hx0 + 2.6, shut = pose === 'dead' || pose === 'hit' || ((t * 0.9 + seed * 1.7) % 4.2) < 0.12;
    for (const s of [-1, 1]) {
      const x = ex + s * 4.4, y = hy0 + 1.2;
      if (shut) { c.strokeStyle = '#2a1f2a'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(x - 1.8, y + (pose === 'hit' ? -s * 0.8 : 0)); c.lineTo(x + 1.8, y + (pose === 'hit' ? s * 0.8 : 0)); c.stroke(); }
      else {
        c.fillStyle = '#231a2c'; ell(c, x, y, 1.75, 2.6); c.fill();
        c.fillStyle = L.eye || shade(robe, -0.1); ell(c, x, y + 0.7, 1.1, 1.4); c.fill();
        c.fillStyle = '#ffffff'; circ(c, x + 0.6, y - 1, 0.75); c.fill();
      }
      if (L.fierce) { c.strokeStyle = '#2a1f2a'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x - s * 2.3, y - 3.3); c.lineTo(x + s * 2.3, y - 5.1); c.stroke(); }
      if (L.f) { c.fillStyle = 'rgba(255,120,140,.3)'; ell(c, x + s * 1.6, y + 4, 2.2, 1.3); c.fill(); }
    }
    c.strokeStyle = '#8a4a4a'; c.lineWidth = 1;
    c.beginPath();
    if (pose === 'hit') c.arc(ex, hy0 + 7.4, 1.4, Math.PI, TAU); else c.arc(ex, hy0 + 5.2, 1.6, 0.2, Math.PI - 0.2);
    c.stroke();
    c.strokeStyle = OL; c.lineWidth = 1.3;
    if (L.beard) {
      c.fillStyle = L.hs === 'bald' ? '#2a2a2a' : hair;
      c.beginPath(); c.moveTo(ex - 5, hy0 + 7); c.quadraticCurveTo(ex, hy0 + 21, ex + 5, hy0 + 7); c.quadraticCurveTo(ex, hy0 + 10, ex - 5, hy0 + 7); c.fill(); c.stroke();
    }
    if (L.hat === 'mask') {
      c.fillStyle = '#2a2632';
      c.beginPath(); c.arc(hx0, hy0, 11.5, 0.12, Math.PI - 0.12); c.quadraticCurveTo(hx0, hy0 + 0.5, hx0 + 11.4, hy0 + 1.4); c.closePath(); c.fill(); c.stroke();
    }
    // 前发
    if (L.hs === 'hood') {
      c.fillStyle = shade(robe, -0.3);
      c.beginPath(); c.arc(hx0, hy0, 13.2, Math.PI * 0.96, Math.PI * 2.06); c.quadraticCurveTo(hx0 + 4, hy0 - 6, hx0 - 2, hy0 - 6.5); c.quadraticCurveTo(hx0 - 9, hy0 - 5, hx0 - 13, hy0 + 2); c.closePath(); c.fill(); c.stroke();
    } else if (L.hs !== 'bald') {
      c.fillStyle = hair;
      c.beginPath(); c.arc(hx0, hy0, 12.2, Math.PI * 1.0, Math.PI * 2.02);
      if (L.hs === 'short') {
        c.lineTo(hx0 + 9, hy0 - 5); c.lineTo(hx0 + 7, hy0 - 2.5); c.lineTo(hx0 + 4, hy0 - 6); c.lineTo(hx0 + 1, hy0 - 3); c.lineTo(hx0 - 3, hy0 - 6.5); c.lineTo(hx0 - 7, hy0 - 3);
      } else {
        c.quadraticCurveTo(hx0 + 10, hy0 - 6, hx0 + 6.5, hy0 - 3); c.quadraticCurveTo(hx0 + 4, hy0 - 7, hx0 + 0.5, hy0 - 3.4); c.quadraticCurveTo(hx0 - 3, hy0 - 7.5, hx0 - 7, hy0 - 3);
      }
      c.quadraticCurveTo(hx0 - 11, hy0 - 2, hx0 - 12.2, hy0); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = rgba(shade(hair, 0.5), 0.5); c.lineWidth = 1.4;
      c.beginPath(); c.arc(hx0 + 1, hy0 - 1, 9.4, Math.PI * 1.3, Math.PI * 1.62); c.stroke();
      c.strokeStyle = OL; c.lineWidth = 1.3;
      if (L.f) { c.fillStyle = hair; c.beginPath(); c.moveTo(hx0 + 9.5, hy0 - 4); c.quadraticCurveTo(hx0 + 13.5, hy0 + 4, hx0 + 10.5, hy0 + 11); c.quadraticCurveTo(hx0 + 9, hy0 + 4, hx0 + 8, hy0 - 2); c.fill(); }
      if (L.hs === 'bun' || L.hs === 'top') {
        c.fillStyle = hair; circ(c, hx0 - 1.5, hy0 - 13.5, L.hs === 'bun' ? 5.2 : 4.2); c.fill(); c.stroke();
        c.strokeStyle = L.hs === 'bun' ? '#e8c66a' : sash; c.lineWidth = 2;
        c.beginPath(); c.moveTo(hx0 - 7, hy0 - 11.2); c.lineTo(hx0 + 4, hy0 - 11.2); c.stroke();
        c.strokeStyle = OL; c.lineWidth = 1.3;
      }
      if (L.hs === 'pony') { c.fillStyle = sash; circ(c, hx0 - 7.5, hy0 - 9.5, 2.2); c.fill(); }
    }
    if (L.hat === 'bamboo') {
      c.fillStyle = '#dcbb6e';
      c.beginPath(); c.moveTo(hx0 - 18, hy0 - 5); c.lineTo(hx0, hy0 - 18); c.lineTo(hx0 + 18, hy0 - 5); c.quadraticCurveTo(hx0, hy0 - 0.5, hx0 - 18, hy0 - 5); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(120,90,30,.45)'; c.lineWidth = 0.9;
      for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(hx0, hy0 - 18); c.lineTo(hx0 + i * 7, hy0 - 3.6 + Math.abs(i) * -0.5); c.stroke(); }
      c.strokeStyle = OL; c.lineWidth = 1.3;
    } else if (L.hat === 'crown') {
      c.fillStyle = '#e8c66a';
      c.beginPath(); c.moveTo(hx0 - 8, hy0 - 10); c.lineTo(hx0 - 9, hy0 - 19); c.lineTo(hx0 - 4, hy0 - 14); c.lineTo(hx0, hy0 - 22); c.lineTo(hx0 + 4, hy0 - 14); c.lineTo(hx0 + 9, hy0 - 19); c.lineTo(hx0 + 8, hy0 - 10); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = L.trim; circ(c, hx0, hy0 - 14, 1.8); c.fill();
    }

    // 前臂 + 兵刃
    let fhx = 10 + armSw, fhy = -15, wa = 0.32;
    if (pose === 'attack') { fhx = lerp(1, 17, sw); fhy = lerp(-37, -19, sw); wa = lerp(-2.0, 1.55, sw); }
    else if (pose === 'cast') { fhx = 13; fhy = -31; wa = -0.25; }
    else if (pose === 'guard') { fhx = 10; fhy = -24; wa = -1.0; }
    else if (pose === 'hit') { fhx = 8; fhy = -13; wa = 0.9; }
    sleeve(c, 6.5, -26, fhx, fhy, 3, 4.6, shade(robe, 0.06));
    c.save(); c.translate(fhx, fhy); weapon(c, L, wa); c.restore();
    c.fillStyle = skin; c.strokeStyle = OL; c.lineWidth = 1.3; circ(c, fhx, fhy, 2.4); c.fill(); c.stroke();
    c.restore();
  }

  /* ---------------- 兽形 ---------------- */
  function wolf(c, L, o) {
    const t = o.t || 0, moving = !!o.walk || o.pose === 'attack', ph = t * 12, sz = L.sz || 1, seed = o.seed || 0;
    c.save(); c.scale(sz * (o.face || 1), sz); c.lineJoin = 'round'; c.lineCap = 'round';
    if (!o.noShadow) { c.fillStyle = 'rgba(0,0,0,.26)'; ell(c, 0, 0, 17, 4.5); c.fill(); }
    if (o.pose === 'dead') { c.translate(0, -3); c.rotate(-0.3); c.globalAlpha *= 0.7; }
    if (o.pose === 'hit') c.rotate(-0.16);
    if (o.pose === 'attack') c.rotate(0.14 * Math.sin((o.swing || 0) * Math.PI));
    const bob = moving ? Math.sin(ph) * 1 : Math.sin(t * 2.6 + seed) * 0.7;
    c.strokeStyle = OL; c.lineWidth = 1.3;
    const dark = shade(L.c, -0.3);
    // 腿
    for (let i = 0; i < 4; i++) {
      const bx = [-10, -6, 7, 11][i], a = moving ? Math.sin(ph + i * 1.7) * 4 : 0;
      c.strokeStyle = i % 2 ? L.c : dark; c.lineWidth = 4;
      c.beginPath(); c.moveTo(bx, -11); c.lineTo(bx + a, -1.5); c.stroke();
    }
    c.strokeStyle = OL; c.lineWidth = 1.3;
    c.translate(0, bob);
    // 尾
    c.fillStyle = L.c;
    const tw = Math.sin(t * 5 + seed) * 3;
    c.beginPath(); c.moveTo(-13, -17); c.quadraticCurveTo(-24, -22 + tw, -25, -12 + tw); c.quadraticCurveTo(-19, -12, -12, -11); c.closePath(); c.fill(); c.stroke();
    // 身
    let g = c.createLinearGradient(0, -22, 0, -6); g.addColorStop(0, shade(L.c, 0.14)); g.addColorStop(1, shade(L.c, -0.2));
    c.fillStyle = g; ell(c, 0, -14, 15, 8.4); c.fill(); c.stroke();
    c.fillStyle = rgba(L.c2, 0.75); ell(c, 2, -10.6, 9, 3.4); c.fill();
    if (L.spikes) {
      c.fillStyle = L.c2;
      for (let i = 0; i < 5; i++) { const x = -10 + i * 5; c.beginPath(); c.moveTo(x - 2.6, -20.5 - (2 - Math.abs(i - 2)) * 0.6); c.lineTo(x, -28 - (2 - Math.abs(i - 2))); c.lineTo(x + 2.6, -20.5 - (2 - Math.abs(i - 2)) * 0.6); c.closePath(); c.fill(); c.stroke(); }
    }
    // 头
    c.fillStyle = L.c;
    if (!L.spikes) { c.beginPath(); c.moveTo(9, -25); c.lineTo(10.5, -33); c.lineTo(14.5, -27); c.closePath(); c.fill(); c.stroke(); c.beginPath(); c.moveTo(15, -26); c.lineTo(18.5, -32.5); c.lineTo(20, -25); c.closePath(); c.fill(); c.stroke(); }
    circ(c, 14, -21, 7.4); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(18, -23.5); c.quadraticCurveTo(26, -22.5, 26.5, -18.6); c.quadraticCurveTo(22, -15, 16.5, -15.5); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#231a2c'; circ(c, 25.6, -19.8, 1.4); c.fill();
    c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(20, -16); c.lineTo(21, -13.4); c.lineTo(22.2, -15.8); c.fill();
    c.save(); c.globalCompositeOperation = 'lighter'; glow(c, 16.6, -22.6, 5, L.eye || '#ffd24a', 0.8); c.restore();
    c.fillStyle = L.eye || '#ffd24a'; ell(c, 16.6, -22.6, 1.9, 1.5, -0.3); c.fill();
    c.fillStyle = '#1a1020'; ell(c, 17, -22.6, 0.7, 1.3); c.fill();
    c.restore();
  }
  function spider(c, L, o) {
    const t = o.t || 0, moving = !!o.walk || o.pose === 'attack', sz = L.sz || 1, seed = o.seed || 0;
    c.save(); c.scale(sz * (o.face || 1), sz); c.lineJoin = 'round'; c.lineCap = 'round';
    if (!o.noShadow) { c.fillStyle = 'rgba(0,0,0,.28)'; ell(c, 0, 0, 19, 5); c.fill(); }
    if (o.pose === 'dead') { c.globalAlpha *= 0.7; c.translate(0, 4); }
    if (o.pose === 'hit') c.rotate(-0.14);
    if (o.pose === 'attack') c.translate(0, -6 * Math.sin((o.swing || 0) * Math.PI));
    const bob = Math.sin(t * 3 + seed) * 1.2;
    // 腿
    c.strokeStyle = shade(L.c, -0.25); c.lineWidth = 2.4;
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
      const a = moving ? Math.sin(t * 14 + i * 1.6 + (s > 0 ? 1.5 : 0)) * 3 : Math.sin(t * 2 + i + seed) * 0.8;
      const bx = 2 + (i - 1.5) * 3.2, kx = bx + s * (10 + i * 1.2) * (s > 0 ? 1 : 0.9) + (i - 1.5) * 4, fx = kx + s * 6 + (i - 1.5) * 3;
      c.beginPath(); c.moveTo(bx, -12 + bob); c.lineTo(kx, -24 - i + a + bob * 0.5); c.lineTo(fx + a, -1); c.stroke();
    }
    c.translate(0, bob);
    c.strokeStyle = OL; c.lineWidth = 1.3;
    let g = c.createRadialGradient(-9, -18, 2, -6, -14, 13); g.addColorStop(0, shade(L.c, 0.3)); g.addColorStop(1, shade(L.c, -0.2));
    c.fillStyle = g; ell(c, -6, -14, 12, 10.5); c.fill(); c.stroke();
    c.fillStyle = L.c2; c.beginPath(); c.moveTo(-6, -21); c.lineTo(-2.5, -15); c.lineTo(-6, -8); c.lineTo(-9.5, -15); c.closePath(); c.fill();
    circ(c, -12, -16, 1.5); c.fill(); circ(c, 0, -17, 1.3); c.fill();
    c.fillStyle = shade(L.c, 0.08); circ(c, 9, -11, 6.6); c.fill(); c.stroke();
    c.strokeStyle = '#f4e8ff'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(12, -7); c.lineTo(15, -3); c.moveTo(8.6, -6); c.lineTo(9.6, -1.6); c.stroke();
    c.save(); c.globalCompositeOperation = 'lighter'; glow(c, 11, -12, 9, L.eye, 0.55); c.restore();
    c.fillStyle = L.eye;
    for (const p of [[9, -13.6, 1.5], [13, -12.6, 1.5], [6.6, -10.6, 1], [11.4, -9.4, 1], [14.4, -9.4, 0.8], [11, -15.6, 0.9]]) { circ(c, p[0], p[1], p[2]); c.fill(); }
    c.restore();
  }
  function spirit(c, L, o) {
    const t = o.t || 0, sz = L.sz || 1, seed = o.seed || 0;
    c.save(); c.scale(sz * (o.face || 1), sz);
    if (!o.noShadow) { c.fillStyle = 'rgba(0,0,0,.2)'; ell(c, 0, 0, 11, 3.6); c.fill(); }
    if (o.pose === 'dead') c.globalAlpha *= 0.5;
    const bob = Math.sin(t * 2.6 + seed) * 2.6, cy = -24 + bob + (o.pose === 'attack' ? -4 * Math.sin((o.swing || 0) * Math.PI) : 0);
    if (o.pose === 'hit') c.translate(-3, 0);
    c.save(); c.globalCompositeOperation = 'lighter'; glow(c, 0, cy, 30, L.c2, 0.5); c.restore();
    // 焰身
    c.fillStyle = L.c2;
    c.beginPath(); c.moveTo(-12, cy + 4);
    for (let i = 0; i <= 6; i++) {
      const a = Math.PI + i / 6 * Math.PI, r = 13 + (i % 2 ? 9 + Math.sin(t * 7 + i * 2 + seed) * 4 : 0);
      c.lineTo(Math.cos(a) * r * 0.9, cy + Math.sin(a) * r * 1.15 - 2);
    }
    c.quadraticCurveTo(13, cy + 14, 0, cy + 17 + Math.sin(t * 5) * 2); c.quadraticCurveTo(-13, cy + 14, -12, cy + 4); c.closePath(); c.fill();
    const g = c.createRadialGradient(0, cy - 1, 1, 0, cy, 13); g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, L.c); g.addColorStop(1, rgba(L.c2, 0.9));
    c.fillStyle = g; ell(c, 0, cy + 1, 11, 12.5); c.fill();
    c.fillStyle = L.eye || '#221133';
    const shut = o.pose === 'hit' || o.pose === 'dead';
    for (const s of [-1, 1]) { if (shut) { c.fillRect(2 + s * 4.4 - 2, cy, 4, 1.4); } else { ell(c, 2 + s * 4.4, cy, 1.9, 3, s * 0.2); c.fill(); } }
    c.fillStyle = '#ffffff'; if (!shut) for (const s of [-1, 1]) { circ(c, 2.7 + s * 4.4, cy - 1.2, 0.8); c.fill(); }
    c.restore();
  }
  function drawUnit(c, L, o) {
    o = o || {};
    if (L.k === 'wolf') wolf(c, L, o); else if (L.k === 'spider') spider(c, L, o); else if (L.k === 'spirit') spirit(c, L, o); else humanoid(c, L, o);
  }
  function unitHeight(L) { const s = L.sz || 1; return (L.k === 'wolf' ? 34 : L.k === 'spider' ? 30 : L.k === 'spirit' ? 46 : 56) * s; }

  /* 头像 */
  let pid = 0;
  function portrait(L, size) {
    if (!L._pid) Object.defineProperty(L, '_pid', { value: ++pid, enumerable: false });
    // 模型还在后台载入时拍到的是程序人物：模型到了以后重拍一张
    const key = 'p' + L._pid + '_' + size + (typeof G3 !== 'undefined' && G3.ok && G3.k.hasModel && G3.k.hasModel(L) ? 'm' : '');
    if (cache[key]) return cache[key];
    const cv = document.createElement('canvas'); cv.width = cv.height = size;
    const c = cv.getContext('2d'), base = L.robe || L.c2 || '#666666';
    const g = c.createRadialGradient(size * 0.5, size * 0.35, size * 0.05, size * 0.5, size * 0.5, size * 0.75);
    g.addColorStop(0, shade(base, 0.35)); g.addColorStop(1, shade(base, -0.62));
    c.fillStyle = g; c.fillRect(0, 0, size, size);
    if (typeof G3 !== 'undefined' && G3.ok) { c.imageSmoothingQuality = 'high'; c.drawImage(G3.snap(L, size * 2, size > 200 ? 'cut' : 'face'), 0, 0, size, size); return cache[key] = cv; }
    const LL = Object.assign({}, L, { sz: 1, aura: null });
    c.save();
    if (L.k) { const s = size / (L.k === 'spirit' ? 44 : 52); c.translate(size * (L.k === 'spirit' ? 0.5 : 0.44), size * (L.k === 'spirit' ? 0.94 : 0.84)); c.scale(s, s); }
    else { const s = size / 33; c.translate(size * 0.47, size * 0.5 + 39 * s); c.scale(s, s); }
    drawUnit(c, LL, { t: 0.5, noShadow: true, seed: 1 });
    c.restore();
    return cache[key] = cv;
  }
  /* 外部头像：portraits/index.js 列出已有图片的角色（由 portraits/pack.ps1 生成），没有图片的沿用上面的头像 */
  const EXT = (typeof PORTRAITS !== 'undefined' && PORTRAITS) || {}, extCut = {};
  let lookId = null;
  function extId(L) {
    if (!lookId) { lookId = new Map(); for (const T of [CHARS, NPCS, ENEMIES]) for (const k in T) if (!lookId.has(T[k].look)) lookId.set(T[k].look, k); }
    const id = lookId.get(L);
    if (id && EXT[id]) return id;
    // 没有自己的头像：有专属模型的照模型拍一张（返回 null，走下面的 portrait）；
    // 连模型也没有的，用同年龄、性别那一类默认人物的头像（见 data.js 的 DEFAULT_LOOK）
    const m = lookModel(L);
    return m && !m.own && DEFAULT_PHOTO[m.cls] && EXT[m.id] ? m.id : null;
  }
  // 绝招特写用的半身图：左右两侧羽化后返回画布；图片还没载入时返回 null
  function cutImg(L) {
    const id = extId(L);
    if (!id) return null;
    let e = extCut[id];
    if (!e) { e = extCut[id] = { im: new Image(), cv: null }; e.im.src = 'portraits/' + id + '_c.jpg?v=' + EXT[id]; }
    if (!e.cv && e.im.complete && e.im.naturalWidth) {
      const cv = e.cv = document.createElement('canvas'); cv.width = e.im.naturalWidth; cv.height = e.im.naturalHeight;
      const c = cv.getContext('2d'); c.drawImage(e.im, 0, 0);
      const g = c.createLinearGradient(0, 0, cv.width, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.22, '#000'); g.addColorStop(0.78, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.globalCompositeOperation = 'destination-in'; c.fillStyle = g; c.fillRect(0, 0, cv.width, cv.height);
    }
    return e.cv;
  }
  for (const k in CHARS) cutImg(CHARS[k].look);   // 只有主角有绝招特写，预先载入
  function portraitURL(L, size) {
    const id = extId(L);
    if (id) return 'portraits/' + id + '_s.jpg?v=' + EXT[id];
    const cv = portrait(L, size || 96);
    if (!cv._url) cv._url = cv.toDataURL();
    return cv._url;
  }

  /* ---------------- 场景物件贴图 ---------------- */
  function mk(w, h, ax, ay, fn) {
    const cv = document.createElement('canvas'); cv.width = w * SS; cv.height = h * SS;
    const c = cv.getContext('2d'); c.scale(SS, SS); c.translate(ax, ay); c.lineJoin = 'round'; c.lineCap = 'round';
    fn(c);
    return { cv, w, h, ax, ay };
  }
  function blob(c, x, y, r, pal) {
    const g = c.createRadialGradient(x - r * 0.35, y - r * 0.45, r * 0.1, x, y, r);
    g.addColorStop(0, pal[2]); g.addColorStop(0.55, pal[1]); g.addColorStop(1, pal[0]);
    c.fillStyle = g; circ(c, x, y, r); c.fill();
    c.strokeStyle = 'rgba(20,30,30,.28)'; c.lineWidth = 1.2; c.stroke();
  }
  function tree(c, pal, dots) {
    const r = mulberry32(pal[0].charCodeAt(1) * 7 + pal[1].charCodeAt(2));
    c.fillStyle = 'rgba(0,0,0,.22)'; ell(c, 0, 0, 20, 6); c.fill();
    const g = c.createLinearGradient(-5, 0, 5, 0); g.addColorStop(0, '#4a3122'); g.addColorStop(0.6, '#7a5236'); g.addColorStop(1, '#3f291c');
    c.fillStyle = g; c.beginPath(); c.moveTo(-5, 0); c.quadraticCurveTo(-2.5, -14, -3.4, -30); c.lineTo(3.4, -30); c.quadraticCurveTo(2.5, -14, 5.5, 0); c.closePath(); c.fill();
    c.strokeStyle = OL; c.lineWidth = 1.2; c.stroke();
    blob(c, -14, -36, 14, pal); blob(c, 14, -37, 14, pal); blob(c, 0, -46, 19, pal); blob(c, -7, -58, 13, pal); blob(c, 8, -56, 12, pal);
    for (let i = 0; i < 16; i++) {
      const a = r() * TAU, d = r() * 20, x = Math.cos(a) * d, y = -46 + Math.sin(a) * d * 0.9;
      c.fillStyle = dots ? rgba(dots, 0.9) : rgba(pal[2], 0.55); circ(c, x, y, dots ? 1.4 + r() * 1.4 : 2 + r() * 2.4); c.fill();
    }
  }
  function pine(c, snow) {
    c.fillStyle = 'rgba(0,0,0,.2)'; ell(c, 0, 0, 16, 5); c.fill();
    c.fillStyle = '#5a3d2b'; c.fillRect(-3, -14, 6, 14);
    for (let i = 0; i < 4; i++) {
      const y = -10 - i * 15, w = 21 - i * 4;
      const g = c.createLinearGradient(-w, 0, w, 0); g.addColorStop(0, '#1f4a44'); g.addColorStop(0.5, '#3a7a66'); g.addColorStop(1, '#1a3f3a');
      c.fillStyle = g; c.beginPath(); c.moveTo(-w, y); c.quadraticCurveTo(0, y + 5, w, y); c.lineTo(0, y - 24); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(10,25,30,.4)'; c.lineWidth = 1.2; c.stroke();
      if (snow) { c.fillStyle = '#f4faff'; c.beginPath(); c.moveTo(-w * 0.55, y - 9); c.quadraticCurveTo(-w * 0.3, y - 5, -w * 0.1, y - 9); c.quadraticCurveTo(w * 0.1, y - 4, w * 0.35, y - 10); c.quadraticCurveTo(w * 0.5, y - 8, w * 0.52, y - 10); c.lineTo(0, y - 24); c.closePath(); c.fill(); }
    }
  }
  function deadtree(c, col, emb) {
    c.fillStyle = 'rgba(0,0,0,.22)'; ell(c, 0, 0, 13, 4); c.fill();
    c.strokeStyle = col; c.lineWidth = 6; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-2, -18, 1, -34); c.stroke();
    c.lineWidth = 3.4; c.beginPath(); c.moveTo(0, -22); c.quadraticCurveTo(-12, -30, -17, -46); c.moveTo(1, -30); c.quadraticCurveTo(12, -38, 15, -54); c.moveTo(1, -34); c.lineTo(-3, -58); c.stroke();
    c.lineWidth = 1.8; c.beginPath(); c.moveTo(-12, -34); c.lineTo(-21, -36); c.moveTo(11, -42); c.lineTo(21, -45); c.moveTo(-2, -48); c.lineTo(-9, -57); c.stroke();
    if (emb) { const r = mulberry32(5); for (let i = 0; i < 12; i++) { const x = -20 + r() * 40, y = -30 - r() * 30; c.fillStyle = rgba(emb, 0.9); circ(c, x, y, 1 + r() * 1.6); c.fill(); } }
  }
  function bambooS(c) {
    c.fillStyle = 'rgba(0,0,0,.2)'; ell(c, 0, 0, 14, 4.5); c.fill();
    const r = mulberry32(9);
    for (const s of [[-8, 70, -0.05], [0, 84, 0.02], [8, 64, 0.07]]) {
      c.save(); c.translate(s[0], 0); c.rotate(s[2]);
      const g = c.createLinearGradient(-2, 0, 2, 0); g.addColorStop(0, '#2f8a4a'); g.addColorStop(0.5, '#8fe07a'); g.addColorStop(1, '#2a7a44');
      c.fillStyle = g; c.fillRect(-2, -s[1], 4, s[1]);
      c.strokeStyle = 'rgba(15,60,35,.6)'; c.lineWidth = 1;
      for (let y = -10; y > -s[1]; y -= 12) { c.beginPath(); c.moveTo(-2.3, y); c.lineTo(2.3, y); c.stroke(); }
      for (let i = 0; i < 7; i++) {
        const y = -s[1] + r() * 26, a = (r() - 0.5) * 2.4, l = 9 + r() * 6;
        c.save(); c.translate(0, y); c.rotate(a);
        c.fillStyle = r() < 0.5 ? '#5fc76a' : '#3fa65a'; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(l * 0.5, -3.4, l, 0); c.quadraticCurveTo(l * 0.5, 3.4, 0, 0); c.fill();
        c.restore();
      }
      c.restore();
    }
  }
  function rock(c, col, cap, cracks) {
    const r = mulberry32(col.charCodeAt(2) * 3 + 1), pts = [];
    for (let i = 0; i < 9; i++) { const a = i / 9 * TAU, rr = 0.8 + r() * 0.3; pts.push([Math.cos(a) * 17 * rr, -11 + Math.sin(a) * 11 * rr]); }
    c.fillStyle = 'rgba(0,0,0,.24)'; ell(c, 0, 0, 19, 5); c.fill();
    const g = c.createLinearGradient(-10, -24, 8, 0); g.addColorStop(0, shade(col, 0.3)); g.addColorStop(1, shade(col, -0.3));
    c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.fillStyle = g; c.fill();
    c.strokeStyle = OL; c.lineWidth = 1.3; c.stroke();
    c.fillStyle = rgba(cap || shade(col, 0.5), cap ? 0.95 : 0.4);
    c.beginPath(); c.moveTo(pts[5][0], pts[5][1]); c.lineTo(pts[6][0], pts[6][1]); c.lineTo(pts[7][0], pts[7][1]); c.lineTo(pts[8][0], pts[8][1] - 2); c.quadraticCurveTo(0, -12, pts[5][0] + 2, pts[5][1] + 5); c.closePath(); c.fill();
    if (cracks) { c.strokeStyle = cracks; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-9, -3); c.lineTo(-4, -10); c.lineTo(-6, -16); c.moveTo(-4, -10); c.lineTo(4, -8); c.lineTo(9, -14); c.moveTo(4, -8); c.lineTo(7, -2); c.stroke(); }
  }
  function crystal(c, col) {
    c.fillStyle = 'rgba(0,0,0,.22)'; ell(c, 0, 0, 15, 4.5); c.fill();
    for (const p of [[-8, 26, -0.25, 6], [7, 30, 0.2, 6.5], [0, 44, 0, 8]]) {
      c.save(); c.translate(p[0], 0); c.rotate(p[2]);
      const g = c.createLinearGradient(-p[3], 0, p[3], 0); g.addColorStop(0, shade(col, -0.2)); g.addColorStop(0.45, shade(col, 0.6)); g.addColorStop(1, shade(col, -0.35));
      c.fillStyle = g; c.beginPath(); c.moveTo(-p[3], 0); c.lineTo(-p[3], -p[1] + 8); c.lineTo(0, -p[1]); c.lineTo(p[3], -p[1] + 8); c.lineTo(p[3], 0); c.closePath(); c.fill();
      c.strokeStyle = rgba(shade(col, -0.5), 0.7); c.lineWidth = 1.2; c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.moveTo(-p[3] * 0.3, -3); c.lineTo(-p[3] * 0.3, -p[1] + 9); c.stroke();
      c.restore();
    }
  }
  function lantern(c) {
    c.fillStyle = 'rgba(0,0,0,.22)'; ell(c, 0, 0, 7, 3); c.fill();
    c.strokeStyle = '#4a3324'; c.lineWidth = 3.4; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -50); c.lineTo(10, -50); c.stroke();
    c.strokeStyle = '#2a1f1a'; c.lineWidth = 1; c.beginPath(); c.moveTo(10, -50); c.lineTo(10, -46); c.stroke();
    const g = c.createRadialGradient(9, -39, 1, 10, -38, 8); g.addColorStop(0, '#fff2b0'); g.addColorStop(0.5, '#ff7a3a'); g.addColorStop(1, '#c0302a');
    c.fillStyle = g; rrect(c, 4, -46, 12, 15, 5); c.fill(); c.strokeStyle = OL; c.stroke();
    c.fillStyle = '#e8c66a'; c.fillRect(6, -47.5, 8, 2.4); c.fillRect(6, -32, 8, 2.4);
    c.strokeStyle = '#e8c66a'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(10, -29.5); c.lineTo(10, -24); c.stroke();
  }
  function brazier(c) {
    c.fillStyle = 'rgba(0,0,0,.24)'; ell(c, 0, 0, 12, 4); c.fill();
    c.fillStyle = '#3a3030'; c.beginPath(); c.moveTo(-4, 0); c.lineTo(-2.4, -14); c.lineTo(2.4, -14); c.lineTo(4, 0); c.closePath(); c.fill();
    const g = c.createLinearGradient(0, -24, 0, -12); g.addColorStop(0, '#6a5a55'); g.addColorStop(1, '#2a2020');
    c.fillStyle = g; c.beginPath(); c.moveTo(-12, -24); c.quadraticCurveTo(-10, -12, 0, -12); c.quadraticCurveTo(10, -12, 12, -24); c.closePath(); c.fill(); c.strokeStyle = OL; c.lineWidth = 1.2; c.stroke();
    c.fillStyle = '#ff8a3a'; ell(c, 0, -24, 11, 2.6); c.fill();
  }
  function chest(c, open) {
    c.fillStyle = 'rgba(0,0,0,.26)'; ell(c, 0, 0, 16, 4.6); c.fill();
    let g = c.createLinearGradient(0, -16, 0, 0); g.addColorStop(0, '#a8662e'); g.addColorStop(1, '#6a3a18');
    c.fillStyle = g; rrect(c, -14, -15, 28, 15, 2); c.fill(); c.strokeStyle = OL; c.lineWidth = 1.3; c.stroke();
    if (open) {
      c.fillStyle = '#2a1608'; c.fillRect(-12, -17, 24, 4);
      c.save(); c.globalCompositeOperation = 'lighter'; glow(c, 0, -17, 16, '#ffe08a', 0.7); c.restore();
      g = c.createLinearGradient(0, -34, 0, -18); g.addColorStop(0, '#c98440'); g.addColorStop(1, '#8a4f20');
      c.fillStyle = g; c.beginPath(); c.moveTo(-14, -18); c.lineTo(-13, -31); c.quadraticCurveTo(0, -37, 13, -31); c.lineTo(14, -18); c.closePath(); c.fill(); c.stroke();
    } else {
      g = c.createLinearGradient(0, -26, 0, -14); g.addColorStop(0, '#c98440'); g.addColorStop(1, '#8a4f20');
      c.fillStyle = g; c.beginPath(); c.moveTo(-14.6, -14); c.lineTo(-14.6, -19); c.quadraticCurveTo(0, -30, 14.6, -19); c.lineTo(14.6, -14); c.closePath(); c.fill(); c.stroke();
    }
    c.fillStyle = '#f0cf6a'; c.fillRect(-10, -15, 2.6, 15); c.fillRect(7.4, -15, 2.6, 15);
    if (!open) { c.fillRect(-10, -23, 2.6, 9); c.fillRect(7.4, -23, 2.6, 9); rrect(c, -3, -17, 6, 7, 1.5); c.fill(); c.stroke(); c.fillStyle = '#5a3a10'; circ(c, 0, -13.6, 1.2); c.fill(); }
  }
  function springS(c) {
    c.fillStyle = 'rgba(0,0,0,.22)'; ell(c, 0, 0, 22, 8); c.fill();
    c.fillStyle = '#9a968c'; ell(c, 0, -5, 21, 10); c.fill(); c.strokeStyle = OL; c.lineWidth = 1.3; c.stroke();
    c.fillStyle = '#c9c5ba'; ell(c, 0, -7, 21, 10); c.fill(); c.stroke();
    const g = c.createRadialGradient(0, -7, 1, 0, -7, 17); g.addColorStop(0, '#f0ffff'); g.addColorStop(0.5, '#7fe6e0'); g.addColorStop(1, '#2fa8c0');
    c.fillStyle = g; ell(c, 0, -7, 16, 6.6); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1; ell(c, -3, -8, 6, 2); c.stroke();
  }
  function stall(c, col) {
    c.fillStyle = 'rgba(0,0,0,.22)'; ell(c, 0, 0, 46, 7); c.fill();
    c.fillStyle = '#5a3d2b'; c.fillRect(-42, -78, 4, 78); c.fillRect(38, -78, 4, 78);
    for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#fff4e0' : col; c.beginPath(); const x = -46 + i * 11.5; c.moveTo(x, -80); c.lineTo(x + 11.5, -80); c.lineTo(x + 11.5 + (i - 3.5) * 0.9, -66); c.quadraticCurveTo(x + 5.7 + (i - 4) * 0.9, -61, x + (i - 4.5) * 0.9, -66); c.closePath(); c.fill(); c.strokeStyle = 'rgba(40,20,20,.4)'; c.lineWidth = 1; c.stroke(); }
    c.fillStyle = shade(col, -0.35); c.fillRect(-46, -83, 92, 4);
  }
  function stallFront(c, col, goods) {
    const g = c.createLinearGradient(0, -22, 0, 0); g.addColorStop(0, '#b0774a'); g.addColorStop(1, '#6a4428');
    c.fillStyle = g; rrect(c, -40, -22, 80, 22, 2); c.fill(); c.strokeStyle = OL; c.lineWidth = 1.3; c.stroke();
    c.fillStyle = shade(col, -0.1); c.fillRect(-40, -22, 80, 5);
    c.strokeStyle = 'rgba(40,20,10,.35)'; c.lineWidth = 1; for (let x = -26; x < 40; x += 14) { c.beginPath(); c.moveTo(x, -16); c.lineTo(x, 0); c.stroke(); }
    if (goods === 'herb') {
      for (let i = 0; i < 5; i++) { const x = -30 + i * 15; c.fillStyle = ['#d94f4f', '#f0e6d0', '#5fa86a', '#f0e6d0', '#4a7ad0'][i]; rrect(c, x - 4.5, -31, 9, 10, 3); c.fill(); c.strokeStyle = OL; c.stroke(); c.fillStyle = '#c9a24a'; c.fillRect(x - 2.5, -33.5, 5, 3); }
    } else {
      c.strokeStyle = '#dfe8f4'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(-30, -23.5); c.lineTo(-8, -29); c.stroke();
      c.strokeStyle = '#e8c66a'; c.lineWidth = 3; c.beginPath(); c.moveTo(-31, -22.6); c.lineTo(-27, -24); c.stroke();
      c.fillStyle = '#8a8f9a'; rrect(c, 2, -30, 14, 8, 2); c.fill(); c.strokeStyle = OL; c.lineWidth = 1.2; c.stroke();
      c.fillStyle = '#6a7080'; c.beginPath(); c.moveTo(22, -22); c.lineTo(24, -32); c.lineTo(34, -32); c.lineTo(36, -22); c.closePath(); c.fill(); c.stroke();
    }
  }
  function roof(c, hw, y, h, col) {
    const g = c.createLinearGradient(0, y - h, 0, y); g.addColorStop(0, shade(col, 0.2)); g.addColorStop(1, shade(col, -0.28));
    c.beginPath(); c.moveTo(-hw - 12, y - 6); c.quadraticCurveTo(-hw + 4, y - 8, -hw * 0.6, y - h); c.lineTo(hw * 0.6, y - h);
    c.quadraticCurveTo(hw - 4, y - 8, hw + 12, y - 6); c.quadraticCurveTo(0, y + 8, -hw - 12, y - 6); c.closePath();
    c.fillStyle = g; c.fill(); c.strokeStyle = OL; c.lineWidth = 1.5; c.stroke();
    c.strokeStyle = 'rgba(0,0,0,.2)'; c.lineWidth = 1;
    for (let i = -7; i <= 7; i++) { const tx = i / 7; c.beginPath(); c.moveTo(tx * hw * 0.6, y - h); c.quadraticCurveTo(tx * hw * 0.82, y - h * 0.45, tx * (hw + 6), y - 4 + (1 - Math.abs(tx)) * 6); c.stroke(); }
    c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-hw - 9, y - 5); c.quadraticCurveTo(0, y + 8, hw + 9, y - 5); c.stroke();
    c.strokeStyle = '#e8c66a'; c.lineWidth = 3.6; c.beginPath(); c.moveTo(-hw * 0.6 - 6, y - h - 4); c.quadraticCurveTo(0, y - h + 2.5, hw * 0.6 + 6, y - h - 4); c.stroke();
    c.fillStyle = '#e8c66a'; circ(c, -hw - 11, y - 7.5, 2.6); c.fill(); circ(c, hw + 11, y - 7.5, 2.6); c.fill();
  }
  function building(sp) {
    const W = sp.w * 48 - 12, wallH = 48, rh = 36, tiers = sp.tiers || 1;
    const H = 12 + wallH + rh + (tiers > 1 ? 24 + 28 : 0) + 16;
    return mk(W + 70, H + 14, (W + 70) / 2, H + 6, c => {
      c.fillStyle = 'rgba(0,0,0,.24)'; ell(c, 0, 2, W / 2 + 12, 10); c.fill();
      c.fillStyle = '#8d877b'; rrect(c, -W / 2 - 3, -10, W + 6, 12, 3); c.fill(); c.strokeStyle = OL; c.lineWidth = 1.3; c.stroke();
      c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(-W / 2 - 2, -9.5, W + 4, 3);
      const ww = W - 22, top = -10 - wallH;
      let g = c.createLinearGradient(0, top, 0, -10); g.addColorStop(0, shade(sp.wall, -0.22)); g.addColorStop(0.4, sp.wall); g.addColorStop(1, shade(sp.wall, -0.06));
      c.fillStyle = g; c.fillRect(-ww / 2, top, ww, wallH); c.strokeRect(-ww / 2, top, ww, wallH);
      const np = sp.w >= 6 ? 6 : 4;
      for (let i = 0; i < np; i++) { const x = -ww / 2 + i * (ww - 7) / (np - 1); g = c.createLinearGradient(x, 0, x + 7, 0); g.addColorStop(0, shade(sp.pillar, 0.15)); g.addColorStop(1, shade(sp.pillar, -0.3)); c.fillStyle = g; c.fillRect(x, top, 7, wallH); }
      // 窗
      const seg = (ww - 7) / (np - 1);
      for (let i = 0; i < np - 1; i++) {
        const cx = -ww / 2 + 3.5 + seg * (i + 0.5);
        if (Math.abs(cx) < 16) continue;
        c.fillStyle = '#3f2a1c'; c.fillRect(cx - 12, top + 12, 24, 20);
        g = c.createLinearGradient(0, top + 12, 0, top + 32); g.addColorStop(0, '#fff0b8'); g.addColorStop(1, '#ffc46a');
        c.fillStyle = sp.dark ? '#b08aff' : g; c.fillRect(cx - 10, top + 14, 20, 16);
        c.strokeStyle = '#3f2a1c'; c.lineWidth = 1.2; c.beginPath();
        for (let k = -1; k <= 1; k++) { c.moveTo(cx + k * 5, top + 14); c.lineTo(cx + k * 5, top + 30); }
        c.moveTo(cx - 10, top + 22); c.lineTo(cx + 10, top + 22); c.stroke();
      }
      // 门
      c.fillStyle = shade(sp.pillar, -0.5); rrect(c, -14, -10 - 38, 28, 38, 2); c.fill();
      c.strokeStyle = '#d8b25a'; c.lineWidth = 1.5; c.strokeRect(-12.5, -46.5, 25, 36); c.beginPath(); c.moveTo(0, -46.5); c.lineTo(0, -10.5); c.stroke();
      c.fillStyle = '#e8c66a'; circ(c, -3.4, -28, 1.6); c.fill(); circ(c, 3.4, -28, 1.6); c.fill();
      // 灯笼
      for (const s of [-1, 1]) { c.fillStyle = '#d0342a'; rrect(c, s * 22 - 4, top + 6, 8, 11, 3.5); c.fill(); c.fillStyle = '#e8c66a'; c.fillRect(s * 22 - 2.6, top + 4.6, 5.2, 2); c.fillRect(s * 22 - 2.6, top + 16.4, 5.2, 2); }
      roof(c, W / 2 + 10, top + 6, rh, sp.roof);
      if (tiers > 1) {
        const w2 = W * 0.52, t2 = top + 6 - rh + 2;
        c.fillStyle = shade(sp.wall, -0.1); c.fillRect(-w2 / 2, t2 - 22, w2, 24);
        c.fillStyle = sp.pillar; c.fillRect(-w2 / 2, t2 - 22, 5, 24); c.fillRect(w2 / 2 - 5, t2 - 22, 5, 24);
        c.fillStyle = sp.dark ? '#b08aff' : '#ffd98a'; for (let i = -1; i <= 1; i++) c.fillRect(i * w2 * 0.27 - 7, t2 - 17, 14, 12);
        roof(c, w2 / 2 + 12, t2 - 18, 28, sp.roof);
      }
      if (sp.sign) {
        const tw = sp.sign.length * 13 + 12;
        c.fillStyle = '#1d1826'; rrect(c, -tw / 2, top - 5, tw, 17, 2.5); c.fill(); c.strokeStyle = '#e8c66a'; c.lineWidth = 1.4; c.stroke();
        c.fillStyle = '#f6d98a'; c.font = 'bold 12px ' + FONT_K; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(sp.sign, 0, top + 4);
      }
    });
  }
  const BUILD = {
    hallTingyu: { w: 6, tiers: 2, roof: '#3d7396', wall: '#f3ecda', pillar: '#9a4030', sign: '听雨阁' },
    inn:        { w: 4, tiers: 2, roof: '#8a4030', wall: '#f5e6c6', pillar: '#6b3a22', sign: '客栈' },
    biaoju:     { w: 4, tiers: 1, roof: '#3a4a66', wall: '#ece5d2', pillar: '#7a2e2e', sign: '镖局' },
    house1:     { w: 4, tiers: 1, roof: '#6a4a7a', wall: '#f0e6d4', pillar: '#6b4a32' },
    house2:     { w: 4, tiers: 1, roof: '#3f7a6a', wall: '#f3ead6', pillar: '#7a4a2a' },
    house3:     { w: 5, tiers: 2, roof: '#a8502e', wall: '#f5e9cc', pillar: '#6b3a22' },
    hallFire:   { w: 6, tiers: 2, roof: '#6a1a16', wall: '#5a4640', pillar: '#c8552a', sign: '赤焰殿' },
    hallSnow:   { w: 8, tiers: 2, roof: '#5f82b0', wall: '#eff5fc', pillar: '#8aa6cc', sign: '寒月宫' },
    hallAbyss:  { w: 6, tiers: 2, roof: '#2c1746', wall: '#241a38', pillar: '#7a3fd0', sign: '归墟', dark: 1 }
  };
  const SPR = {
    treeG: () => mk(92, 92, 46, 84, c => tree(c, ['#2a7446', '#49a35c', '#8ad67c'])),
    treeP: () => mk(92, 92, 46, 84, c => tree(c, ['#c4628c', '#ee8fb4', '#ffd0e0'], '#fff4f8')),
    treeA: () => mk(92, 92, 46, 84, c => tree(c, ['#b5541f', '#e6812c', '#fbbf58'])),
    treeR: () => mk(92, 92, 46, 84, c => tree(c, ['#8f2424', '#cf402e', '#f57a50'])),
    treeD: () => mk(92, 92, 46, 84, c => tree(c, ['#1c5440', '#2f7d5a', '#62b884'])),
    pineS: () => mk(60, 100, 30, 92, c => pine(c, true)),
    dead:  () => mk(60, 76, 30, 70, c => deadtree(c, '#2a1a18', '#ff8a3a')),
    deadP: () => mk(60, 76, 30, 70, c => deadtree(c, '#1f1630', '#c06aff')),
    bamboo: () => mk(60, 104, 30, 96, c => bambooS(c)),
    rock:  () => mk(52, 40, 26, 32, c => rock(c, '#8a8f8a')),
    rockM: () => mk(52, 40, 26, 32, c => rock(c, '#6f8a78', '#8fd47e')),
    rockS: () => mk(52, 40, 26, 32, c => rock(c, '#8fa0b8', '#ffffff')),
    rockL: () => mk(52, 40, 26, 32, c => rock(c, '#4a3030', null, '#ff8a3a')),
    rockD: () => mk(52, 40, 26, 32, c => rock(c, '#3a2f55', null, '#c06aff')),
    crysI: () => mk(48, 62, 24, 56, c => crystal(c, '#8fd0ff')),
    crysP: () => mk(48, 62, 24, 56, c => crystal(c, '#a060e0')),
    lantern: () => mk(44, 64, 16, 58, c => lantern(c)),
    brazier: () => mk(40, 40, 20, 34, c => brazier(c)),
    chest: () => mk(44, 44, 22, 38, c => chest(c, false)),
    chestO: () => mk(44, 50, 22, 44, c => chest(c, true)),
    spring: () => mk(56, 36, 28, 26, c => springS(c)),
    stallR: () => mk(104, 96, 52, 90, c => stall(c, '#d0483a')),
    stallG: () => mk(104, 96, 52, 90, c => stall(c, '#3f9a6a')),
    stallRf: () => mk(104, 50, 52, 44, c => stallFront(c, '#d0483a', 'smith')),
    stallGf: () => mk(104, 50, 52, 44, c => stallFront(c, '#3f9a6a', 'herb'))
  };
  function sprite(name) {
    if (cache[name]) return cache[name];
    if (SPR[name]) return cache[name] = SPR[name]();
    if (BUILD[name]) return cache[name] = building(BUILD[name]);
    return null;
  }
  function draw(c, name, x, y, sc, flip) {
    const s = sprite(name); if (!s) return;
    sc = sc || 1;
    if (flip) { c.save(); c.translate(x, y); c.scale(-sc, sc); c.drawImage(s.cv, -s.ax, -s.ay, s.w, s.h); c.restore(); }
    else c.drawImage(s.cv, x - s.ax * sc, y - s.ay * sc, s.w * sc, s.h * sc);
  }

  /* ---------------- 远景（战斗/标题背景） ---------------- */
  const SCN = {
    mountain: { sky: ['#6fc2f0', '#bfe6fb', '#fdf0d0'], sun: '#fff8d8', m: ['#a8d0e0', '#78b0c0', '#4f9094'], g: ['#8ad67c', '#3a8a55'], mist: '#ffffff' },
    town:     { sky: ['#f0744a', '#ffab70', '#ffe2a8'], sun: '#fff2c0', m: ['#e09a78', '#b86a58', '#864444'], g: ['#d8b070', '#8a6238'], mist: '#ffe0b0' },
    bamboo:   { sky: ['#144a3c', '#3a8a66', '#b8eaa8'], sun: '#f0ffc8', m: ['#3a8a62', '#246a4c', '#164a38'], g: ['#5aae62', '#1c5236'], mist: '#c8ffd0' },
    fire:     { sky: ['#1c080c', '#701a14', '#ff7a32'], sun: '#ffd88a', m: ['#6a1e1a', '#40120f', '#240a0a'], g: ['#6a2e24', '#1e0c0a'], mist: '#ff8a4a' },
    snow:     { sky: ['#2f4f88', '#86b2e0', '#eef8ff'], sun: '#ffffff', m: ['#c4d8ee', '#98b6d6', '#7494bc'], g: ['#f4faff', '#a4c0e0'], mist: '#ffffff' },
    abyss:    { sky: ['#05030c', '#1c0c38', '#5c2a90'], sun: '#dab0ff', m: ['#30205a', '#1c1238', '#100a22'], g: ['#32245a', '#0a0616'], mist: '#a060ff' },
    dusk:     { sky: ['#141a44', '#5a3a78', '#ff9a6a'], sun: '#ffd8a0', m: ['#6a5a8a', '#4a3a6a', '#2c2248'], g: ['#7a6a80', '#3a2e4a'], mist: '#ffc0a0' },
    mist:     { sky: ['#7a8ea8', '#c4d0dc', '#f0f0ec'], sun: '#ffffff', m: ['#b4c0cc', '#8a9aa8', '#647484'], g: ['#9ab094', '#4a6a54'], mist: '#ffffff' },
    ash:      { sky: ['#0e0a10', '#3a1c20', '#c05a30'], sun: '#ffc890', m: ['#4a2c2c', '#2c1a1c', '#181012'], g: ['#4a3432', '#140c0c'], mist: '#c06a4a' }
  };
  function scenery(c, W, H, theme, seed) {
    const S = SCN[theme] || SCN.mountain, r = mulberry32(seed || 3);
    if (typeof THEMES !== 'undefined' && THEMES[theme] && THEMES[theme].as) theme = THEMES[theme].as;   // 衍生主题沿用母主题的点缀
    let g = c.createLinearGradient(0, 0, 0, H * 0.62);
    g.addColorStop(0, S.sky[0]); g.addColorStop(0.6, S.sky[1]); g.addColorStop(1, S.sky[2]);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    if (theme === 'abyss' || theme === 'fire') { for (let i = 0; i < 90; i++) { c.fillStyle = 'rgba(255,255,255,' + (0.2 + r() * 0.6) + ')'; circ(c, r() * W, r() * H * 0.45, r() * 1.4); c.fill(); } }
    const sx = W * 0.74, sy = H * 0.2;
    c.save(); c.globalCompositeOperation = 'lighter'; glow(c, sx, sy, H * 0.42, S.sun, 0.5); c.restore();
    c.fillStyle = S.sun; circ(c, sx, sy, H * 0.07); c.fill();
    if (theme === 'abyss') { c.strokeStyle = 'rgba(210,150,255,.6)'; c.lineWidth = 3; circ(c, sx, sy, H * 0.11); c.stroke(); c.lineWidth = 1; circ(c, sx, sy, H * 0.15); c.stroke(); c.fillStyle = '#0a0616'; circ(c, sx, sy, H * 0.055); c.fill(); }
    for (let i = 0; i < 3; i++) {
      const base = H * (0.4 + 0.075 * i), amp = H * (0.2 - 0.045 * i), p = [r() * 9, r() * 9, r() * 9], f = 2.2 + i * 1.3;
      c.beginPath(); c.moveTo(0, H);
      for (let x = 0; x <= W + 8; x += 8) {
        const u = x / H, n = Math.sin(u * f + p[0]) * 0.5 + Math.sin(u * f * 2.3 + p[1]) * 0.3 + Math.sin(u * f * 5.1 + p[2]) * 0.14;
        c.lineTo(x, base - amp * (0.5 + 0.5 * n));
      }
      c.lineTo(W, H); c.closePath();
      g = c.createLinearGradient(0, base - amp, 0, base + H * 0.12); g.addColorStop(0, S.m[i]); g.addColorStop(1, mix(S.m[i], S.mist, 0.55));
      c.fillStyle = g; c.fill();
      if (i === 1 && (theme === 'mountain' || theme === 'snow' || theme === 'town')) {
        // 远处楼阁
        const px = W * 0.24, py = base - amp * 0.62; c.fillStyle = mix(S.m[2], '#000000', 0.1);
        for (let k = 0; k < 3; k++) { const w = 26 - k * 6, y = py - k * 15; c.fillRect(px - w * 0.36, y - 12, w * 0.72, 12); c.beginPath(); c.moveTo(px - w, y - 10); c.quadraticCurveTo(px, y - 15, px + w, y - 10); c.lineTo(px + w * 0.5, y - 17); c.lineTo(px - w * 0.5, y - 17); c.closePath(); c.fill(); }
      }
    }
    // 地面
    const gy = H * 0.56;
    g = c.createLinearGradient(0, gy, 0, H); g.addColorStop(0, mix(S.g[0], S.mist, 0.35)); g.addColorStop(0.25, S.g[0]); g.addColorStop(1, S.g[1]);
    c.fillStyle = g; c.fillRect(0, gy, W, H - gy);
    g = c.createLinearGradient(0, gy - H * 0.06, 0, gy + H * 0.05); g.addColorStop(0, rgba(S.mist, 0)); g.addColorStop(0.5, rgba(S.mist, 0.5)); g.addColorStop(1, rgba(S.mist, 0));
    c.fillStyle = g; c.fillRect(0, gy - H * 0.06, W, H * 0.11);
    for (let i = 0; i < 70; i++) {
      const y = gy + 10 + r() * (H - gy - 10), k = (y - gy) / (H - gy), x = r() * W;
      c.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.08)'; ell(c, x, y, 30 + k * 90, 3 + k * 7); c.fill();
    }
    c.save(); c.globalCompositeOperation = 'lighter';
    g = c.createRadialGradient(W / 2, H * 0.76, 10, W / 2, H * 0.76, W * 0.5); g.addColorStop(0, rgba(S.sun, 0.16)); g.addColorStop(1, rgba(S.sun, 0));
    c.fillStyle = g; c.save(); c.translate(W / 2, H * 0.76); c.scale(1, 0.34); c.translate(-W / 2, -H * 0.76); c.fillRect(0, -H, W, H * 4); c.restore();
    if (theme === 'fire') { for (let i = 0; i < 7; i++) { const x = r() * W, y = gy + 30 + r() * (H - gy - 40); g = c.createRadialGradient(x, y, 2, x, y, 120); g.addColorStop(0, 'rgba(255,120,40,.4)'); g.addColorStop(1, 'rgba(255,120,40,0)'); c.fillStyle = g; c.save(); c.translate(x, y); c.scale(1, 0.25); c.translate(-x, -y); c.fillRect(x - 120, y - 120, 240, 240); c.restore(); } }
    c.restore();
    // 前景点缀
    const deco = { mountain: 'treeP', town: 'treeA', bamboo: 'bamboo', fire: 'dead', snow: 'pineS', abyss: 'crysP' }[theme];
    for (const p of [[0.04, 0.66, 2.2], [0.12, 0.6, 1.5], [0.95, 0.64, 2.3], [0.87, 0.59, 1.5], [0.5, 0.575, 1.0], [0.62, 0.57, 0.9], [0.36, 0.572, 0.9]]) draw(c, deco, W * p[0], H * p[1], p[2], r() < 0.5);
    // 暗角
    g = c.createRadialGradient(W / 2, H * 0.55, H * 0.35, W / 2, H * 0.55, Math.max(W, H) * 0.75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(8,6,20,.5)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }

  return { mix, shade, rgba, circ, ell, rrect, glow, drawUnit, unitHeight, portrait, portraitURL, portraitId: extId, cutImg, sprite, draw, scenery, SCN, OL };
})();
