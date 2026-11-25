'use strict';
/* ============ 3D 人物与怪物：真人比例建模、五官贴图、发丝衣褶、带肘膝的骨骼式动作 ============ */
(() => {
  if (!G3.ok) return;
  const K = G3.k, GB = K.GB, M = K.M, lin = K.lin, LC = K.LC, PI = Math.PI;
  const SU = 0.81, WY = 1.04, gold = '#d9b45a';           // SU：米 → 场景单位；WY：腰高（米）
  const g1 = (x, s) => Math.exp(-(x * x) / (2 * s * s));
  const sst = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const o3 = [0, 0, 0];
  const bright = hex => { const c = new THREE.Color(hex); return (c.r + c.g + c.b) / 3; };
  const hashS = s => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h) + 1; };
  const nb = () => { const b = new GB(); b.K = []; return b; };

  /* ================= 头部：球面经解析位移雕出下颌、眉弓、眼窝、鼻、唇 ================= */
  function headP(dx, dy, dz, V, out) {
    // 头高 2（下巴 -1，头顶 +1）：眼 0.05，眉 0.21，鼻底 -0.3，口 -0.515
    let x = dx * 0.76, y = dy, z = dz * 0.9;
    const t = Math.max(0, -y);
    x *= (1 - V.jaw * sst(0.42, 1.0, t)) * (1 - 0.06 * sst(0.0, 0.5, t));
    if (z < 0) z *= 1.06 * (1 - 0.5 * sst(0.3, 1.0, t)); else z *= 1 - 0.13 * sst(0.5, 1, t);
    const fr = sst(0.15, 0.6, dz);
    if (fr > 0) {
      const ax = Math.abs(x), ny = clamp((0.14 - y) / 0.4, 0, 1); let b = 0;
      b -= 0.115 * g1(ax - 0.31, 0.14) * g1(y - 0.06, 0.09);
      b += V.brow * g1(y - 0.2, 0.05) * g1(ax - 0.3, 0.25);
      b -= 0.02 * g1(x, 0.09) * g1(y - 0.14, 0.05);
      b += (0.02 + 0.15 * ny) * g1(x, 0.055 + 0.04 * ny) * sst(-0.37, -0.27, y) * sst(0.22, 0.1, y);
      b += 0.07 * g1(x, 0.085) * g1(y + 0.25, 0.06);
      b += 0.048 * g1(ax - 0.125, 0.05) * g1(y + 0.285, 0.045);
      b += 0.05 * g1(ax - 0.47, 0.16) * g1(y + 0.08, 0.14);
      b -= V.hollow * g1(ax - 0.45, 0.13) * g1(y + 0.45, 0.17);
      b += 0.05 * g1(x, 0.28) * g1(y + 0.5, 0.15);
      b += 0.022 * g1(x, 0.17) * g1(y + 0.47, 0.03) + 0.03 * g1(x, 0.15) * g1(y + 0.565, 0.04);
      b -= 0.018 * g1(x, 0.22) * g1(y + 0.515, 0.014);
      b += 0.07 * g1(x, 0.17) * g1(y + 0.84, 0.1) - 0.025 * g1(x, 0.12) * g1(y + 0.68, 0.045);
      z += b * fr;
    }
    out[0] = x; out[1] = y; out[2] = z;
  }
  const TMAX = 62 * PI / 180, VY0 = -1, VY1 = 0.72, FS = 512, FU = FS / (VY1 - VY0);
  const headGeos = {};
  function headGeo(V, hi) {
    const key = V.key + (hi ? 'h' : 'l'); if (headGeos[key]) return headGeos[key];
    const th = [], ph = [], F = 38 * PI / 180;
    const seg = (arr, a, b, n) => { for (let i = 0; i < n; i++) arr.push(a + (b - a) * i / n); };
    if (hi) { seg(th, -PI, -PI / 2, 5); seg(th, -PI / 2, -F, 6); seg(th, -F, F, 30); seg(th, F, PI / 2, 6); seg(th, PI / 2, PI, 5); seg(ph, 0.004, 0.3, 6); seg(ph, 0.3, 0.74, 30); seg(ph, 0.74, 0.99, 6); }
    else { seg(th, -PI, -PI / 2, 3); seg(th, -PI / 2, -F, 3); seg(th, -F, F, 14); seg(th, F, PI / 2, 3); seg(th, PI / 2, PI, 3); seg(ph, 0.004, 0.3, 4); seg(ph, 0.3, 0.74, 14); seg(ph, 0.74, 0.99, 4); }
    th.push(PI); ph.push(0.99);
    const W = th.length, H = ph.length, pos = [], uv = [], idx = [], o = [0, 0, 0];
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const sp = Math.sin(ph[j] * PI), dy = Math.cos(ph[j] * PI), dx = sp * Math.sin(th[i]), dz = sp * Math.cos(th[i]);
      headP(dx, dy, dz, V, o); pos.push(o[0], o[1], o[2]);
      uv.push(0.5 + clamp(th[i] / (2 * TMAX), -0.5, 0.5), clamp((dy - VY0) / (VY1 - VY0), 0, 1));
    }
    for (let j = 0; j < H - 1; j++) for (let i = 0; i < W - 1; i++) { const a = j * W + i, b = a + 1, c = a + W, d = c + 1; idx.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const n = g.attributes.normal;
    for (let j = 0; j < H; j++) { const a = j * W, b = a + W - 1, x = n.getX(a) + n.getX(b), y = n.getY(a) + n.getY(b), z = n.getZ(a) + n.getZ(b), l = Math.hypot(x, y, z) || 1; n.setXYZ(a, x / l, y / l, z / l); n.setXYZ(b, x / l, y / l, z / l); }
    g._keep = true; return headGeos[key] = g;
  }
  // 头部坐标（x, y）→ 贴图像素
  const fX = (x, y) => (0.5 + Math.asin(clamp(x / 0.76 / Math.sqrt(Math.max(0.05, 1 - y * y)), -0.999, 0.999)) / (2 * TMAX)) * FS;
  const fY = y => (1 - (y - VY0) / (VY1 - VY0)) * FS;
  const faceC = {};
  function faceTex(L, V, skin) {
    const noHair = L.hs === 'bald' || L.hs === 'hood';
    const key = [skin, L.hair, V.key, V.old ? 1 : 0, L.beard ? 1 : 0, L.aura || '', noHair ? 1 : 0].join('|');
    if (faceC[key]) return faceC[key];
    const f = V.f, fierce = V.fierce, old = V.old;
    const t = K.canvasTex(FS, FS, c => {
      c.fillStyle = skin; c.fillRect(0, 0, FS, FS); c.lineCap = 'round'; c.lineJoin = 'round';
      const path = pts => { c.beginPath(); pts.forEach((p, i) => { const X = fX(p[0], p[1]), Y = fY(p[1]); if (i) c.lineTo(X, Y); else c.moveTo(X, Y); }); };
      const line = (pts, col, w) => { path(pts); c.strokeStyle = col; c.lineWidth = w; c.stroke(); };
      const blob = (x, y, r, col, a, ry) => { const X = fX(x, y), Y = fY(y), R = r * FU; c.save(); c.translate(X, Y); c.scale(1, ry || 1); const g = c.createRadialGradient(0, 0, 0, 0, 0, R); g.addColorStop(0, Art.rgba(col, a)); g.addColorStop(1, Art.rgba(col, 0)); c.fillStyle = g; c.fillRect(-R, -R, R * 2, R * 2); c.restore(); };
      const rose = '#cf6a62', shade = Art.mix(skin, '#5a2e26', 0.62), lite = Art.mix(skin, '#fff4e8', 0.6);
      // 发际与大明暗
      if (!noHair) { const g = c.createLinearGradient(0, 0, 0, fY(0.56)); g.addColorStop(0, Art.rgba(L.hair, 0.8)); g.addColorStop(1, Art.rgba(L.hair, 0)); c.fillStyle = g; c.fillRect(0, 0, FS, fY(0.56)); }
      for (const s of [-1, 1]) {
        blob(s * 0.31, 0.08, 0.22, shade, 0.44, 0.7); blob(s * 0.19, 0.12, 0.1, shade, 0.22); blob(s * 0.4, -0.2, 0.21, rose, f ? 0.36 : 0.16);
        blob(s * 0.31, -0.04, 0.12, shade, 0.17, 0.5); blob(s * 0.57, -0.5, 0.23, shade, f ? 0.12 : 0.27); blob(s * 0.46, -0.06, 0.1, lite, 0.26);
      }
      blob(0, -0.26, 0.08, rose, 0.17); blob(0, -0.675, 0.12, shade, 0.26, 0.5); blob(0, 0.4, 0.3, lite, 0.3); blob(0, -0.85, 0.1, lite, 0.22);
      if (fierce || L.beard) blob(0, -0.62, 0.46, '#3e3e4c', 0.13);
      // 鼻
      for (const s of [-1, 1]) {
        line([[s * 0.085, 0.1], [s * 0.09, -0.08], [s * 0.135, -0.22]], Art.rgba(shade, 0.2), 8);
        line([[s * 0.15, -0.235], [s * 0.176, -0.29], [s * 0.135, -0.328]], Art.rgba(shade, 0.32), 2.2);
        c.fillStyle = 'rgba(60,26,22,.5)'; c.beginPath(); c.ellipse(fX(s * 0.072, -0.322), fY(-0.322), 0.027 * FU, 0.011 * FU, s * 0.25, 0, TAU); c.fill();
        line([[s * 0.175, -0.32], [s * 0.275, -0.46], [s * 0.305, -0.6]], Art.rgba(shade, old ? 0.45 : 0.12), old ? 2.2 : 3.5);
      }
      line([[0, 0.1], [0, -0.2]], Art.rgba(lite, 0.36), 6); blob(0, -0.25, 0.055, lite, 0.42);
      line([[0, -0.36], [0, -0.45]], Art.rgba(shade, 0.2), 5);
      // 眉
      const browC = old ? '#a4a4a8' : Art.mix(L.hair, '#18100e', bright(L.hair) > 0.5 ? 0.15 : 0.55), bth = f ? 0.026 : fierce ? 0.058 : 0.046;
      c.strokeStyle = Art.rgba(browC, 0.6); c.lineWidth = 1.8;
      for (const s of [-1, 1]) for (let i = 0; i < 120; i++) {
        const q = i / 119, bx = lerp(0.12, 0.57, q), by = fierce ? 0.165 + 0.14 * q - 0.035 * q * q : f ? 0.228 + 0.06 * Math.sin(q * PI * 0.8) - 0.035 * q : 0.205 + 0.06 * Math.sin(q * PI * 0.85) - 0.022 * q;
        const th = bth * (0.6 + 0.5 * Math.sin(PI * Math.min(1, q * 1.5 + 0.12) * 0.5)) * (1 - 0.75 * q * q), r = ((i * 7919) % 13) / 12 - 0.5;
        path([[s * bx, by + r * th], [s * (bx + 0.036), by + r * th * 0.6 + 0.014 + (fierce ? 0.01 : 0)]]); c.stroke();
      }
      // 眼
      const ew = f ? 0.168 : 0.16, hu = f ? 0.076 : fierce ? 0.05 : 0.062, hl = f ? 0.036 : 0.03, tl = f ? 0.02 : fierce ? 0.025 : 0.01, ey = 0.055, ex = 0.315;
      const irisC = L.aura ? Art.mix('#2e1c12', L.aura, 0.6) : old ? '#4a3626' : '#34200f', rI = (f ? 0.074 : 0.067) * FU;
      for (const s of [-1, 1]) {
        const up = [], lo = [];
        for (let i = 0; i <= 20; i++) { const q = i / 20, x = s * (ex - ew + 2 * ew * q), tt = tl * (2 * q - 1); up.push([x, ey + tt + hu * Math.pow(Math.sin(PI * Math.pow(q, 0.8)), 0.85)]); lo.push([x, ey + tt - hl * Math.pow(Math.sin(PI * q), 0.9)]); }
        const X = fX(s * ex, ey), Y = fY(ey + 0.012), B = 0.26 * FU;
        c.save(); path(up.concat(lo.slice().reverse())); c.closePath(); c.clip();
        const sg = c.createRadialGradient(X, Y, 0, X, Y, ew * FU * 1.1); sg.addColorStop(0, '#f4eee8'); sg.addColorStop(0.65, '#dfd3ca'); sg.addColorStop(1, '#b0948a');
        c.fillStyle = sg; c.fillRect(X - B, Y - B, B * 2, B * 2);
        const ig = c.createRadialGradient(X, Y, 0, X, Y, rI); ig.addColorStop(0, '#000000'); ig.addColorStop(0.34, '#050302'); ig.addColorStop(0.42, Art.mix(irisC, '#c48c52', 0.42)); ig.addColorStop(0.78, irisC); ig.addColorStop(0.92, Art.shade(irisC, -0.55)); ig.addColorStop(1, 'rgba(20,10,8,0)');
        c.fillStyle = ig; c.beginPath(); c.arc(X, Y, rI, 0, TAU); c.fill();
        c.fillStyle = 'rgba(255,255,255,.95)'; c.beginPath(); c.arc(X - rI * 0.34, Y - rI * 0.34, rI * 0.21, 0, TAU); c.fill();
        c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(X + rI * 0.36, Y + rI * 0.36, rI * 0.12, 0, TAU); c.fill();
        const tg = c.createLinearGradient(0, fY(ey + hu), 0, fY(ey - 0.005)); tg.addColorStop(0, 'rgba(28,12,10,.66)'); tg.addColorStop(1, 'rgba(28,12,10,0)'); c.fillStyle = tg; c.fillRect(X - B, Y - B, B * 2, B * 2);
        c.restore();
        line(up, 'rgba(24,12,10,.94)', f ? 4.2 : 3.2);
        if (f) for (let i = 0; i < 6; i++) { const p = up[13 + i]; line([p, [p[0] + s * 0.02, p[1] + 0.02 - i * 0.002]], 'rgba(24,12,10,.78)', 1.4); }
        line(lo, Art.rgba(shade, 0.55), 1.5);
        line(up.map((p, i) => [p[0], p[1] + 0.028 + 0.014 * Math.sin(PI * i / 20)]), Art.rgba(shade, 0.48), 1.8);
        c.fillStyle = 'rgba(206,112,104,.6)'; c.beginPath(); c.arc(fX(s * (ex - ew + 0.012), ey), fY(ey - tl - 0.003), 2.6, 0, TAU); c.fill();
        if (old) { for (let i = 0; i < 3; i++) line([[s * (ex + ew + 0.01), ey + 0.012 - i * 0.022], [s * (ex + ew + 0.085), ey + 0.035 - i * 0.05]], Art.rgba(shade, 0.4), 1.3); line([[s * (ex - 0.1), ey - 0.075], [s * ex, ey - 0.092], [s * (ex + 0.11), ey - 0.07]], Art.rgba(shade, 0.4), 1.8); }
      }
      if (old) for (let i = 0; i < 3; i++) line([[-0.34, 0.38 + i * 0.07], [0, 0.395 + i * 0.07], [0.34, 0.38 + i * 0.07]], Art.rgba(shade, 0.32), 1.5);
      // 唇
      const lw = f ? 0.2 : 0.23, my = -0.515, lu = [], ml = [], ll = [];
      for (let i = 0; i <= 24; i++) { const q = i / 12 - 1, x = q * lw, e = 1 - q * q; lu.push([x, my + Math.pow(e, 0.6) * (f ? 0.042 : 0.034) + 0.016 * g1(Math.abs(q) - 0.22, 0.12) - 0.012 * g1(q, 0.09)]); ml.push([x, my - 0.006 * e + (f ? 0.008 : 0.0) * q * q]); ll.push([x, my - Math.pow(e, 0.75) * (f ? 0.082 : 0.066)]); }
      const lipU = f ? '#ab4650' : Art.mix(skin, '#8e423c', old ? 0.3 : 0.5), lipL = f ? '#c45a63' : Art.mix(skin, '#a35048', old ? 0.3 : 0.5);
      path(lu.concat(ml.slice().reverse())); c.closePath(); c.fillStyle = lipU; c.fill();
      path(ml.concat(ll.slice().reverse())); c.closePath(); c.fillStyle = lipL; c.fill();
      blob(0, my - 0.04, 0.06, '#ffffff', f ? 0.3 : 0.14, 0.5);
      line(ml, 'rgba(60,20,22,.88)', 2);
      for (const s of [-1, 1]) blob(s * (lw + 0.008), my, 0.035, shade, 0.42);
      // 须
      if (L.beard) {
        c.lineWidth = 1.6; c.strokeStyle = Art.rgba(L.hair, 0.72);
        for (const s of [-1, 1]) for (let i = 0; i < 60; i++) { const q = i / 59, r = ((i * 31) % 11) / 10; path([[s * (0.015 + 0.25 * q), -0.385 - 0.07 * q * q - r * 0.04], [s * (0.06 + 0.28 * q), -0.44 - 0.15 * q * q - r * 0.035]]); c.stroke(); }
        for (let i = 0; i < 110; i++) { const q = i / 109 * 2 - 1, r = ((i * 17) % 9) / 8; path([[q * 0.24, -0.64 - r * 0.1 - 0.06 * (1 - q * q)], [q * 0.26, -0.74 - r * 0.12 - 0.1 * (1 - q * q)]]); c.stroke(); }
      }
    });
    t.anisotropy = 4; t._keep = true;
    return faceC[key] = t;
  }

  /* ================= 兵器（米制，握于右小臂末端） ================= */
  function weapon(a, L, hy) {
    const wp = L.wp, wc = L.wc || '#dddddd', RX = 1.28, dy = Math.cos(RX), dz = Math.sin(RX), steel = Art.mix('#d6dce6', wc, 0.3);
    const at = (k, up) => [0, hy + dy * k - dz * (up || 0), dz * k + dy * (up || 0)];
    if (wp === 'sword' || wp === 'saber' || wp === 'dagger') {
      const len = wp === 'sword' ? 0.8 : wp === 'saber' ? 0.72 : 0.3, w = wp === 'saber' ? 0.034 : wp === 'sword' ? 0.019 : 0.016, base = 0.085, cv = wp === 'saber' ? 0.075 : 0, P = [], Rr = [];
      for (let i = 0; i <= 8; i++) { const q = i / 8, k = wp === 'saber' ? (q < 0.82 ? 1 + q * 0.25 : (1.2 - (q - 0.82) * 5.5)) : (q < 0.86 ? 1 - q * 0.22 : (0.81 - (q - 0.86) * 5.4)); P.push(at(base + len * q, -cv * q * q)); Rr.push([0.0048 * (1 - q * 0.5), Math.max(0.002, w * k)]); }
      a.m(0.2, 1, 0.06, 0.3).tube(P, Rr, 4, Art.shade(steel, -0.08), steel, { n: [1, 0, 0], cap: 2 });
      a.m('gold');
      if (wp === 'saber') a.c(...at(0.075), 0.045, 0.014, gold, 1, 12, null, RX, 0, 0); else a.b(...at(0.075), 0.022, 0.022, wp === 'sword' ? 0.11 : 0.07, gold, RX, 0, 0);
      a.s(...at(-0.092), 0.019, 0.019, 0.019, gold);
      a.m('leather').tube([at(-0.08), at(0.07)], 0.0145, 6, '#4a1c1c', null, { cap: 0 });
      if (wp === 'sword') { const p = at(-0.1); a.m('silk').tube([p, [0.004, p[1] - 0.09, p[2] - 0.01], [0.0, p[1] - 0.22, p[2] - 0.005]], [0.004, 0.006, 0.014], 5, '#c22a2a', '#e0503a'); }
    } else if (wp === 'fan') {
      a.m('silk').surf(20, 3, (u, v, o) => { const an = RX - 0.25 + (u - 0.5) * 2.2, r = 0.07 + 0.25 * v; o[0] = ((Math.round(u * 20) % 2) ? 0.006 : -0.006) * v; o[1] = hy + 0.02 + Math.cos(an) * r; o[2] = 0.01 + Math.sin(an) * r; },
        (u, v, p, o) => { const c0 = lin('#8a5a34'), c1 = lin(wc), c2 = lin('#ffffff'), k = v < 0.3 ? 0 : 1, q = sst(0.3, 1, v); o[0] = k ? lerp(c1[0], c2[0], q) : c0[0]; o[1] = k ? lerp(c1[1], c2[1], q) : c0[1]; o[2] = k ? lerp(c1[2], c2[2], q) : c0[2]; }, { two: true });
      a.m('gold').s(0, hy + 0.02, 0.01, 0.012, 0.012, 0.012, gold);
    } else if (wp === 'staff') {
      a.m('wood').tube([[0, hy - 0.75, 0.035], [0.006, hy - 0.3, 0.03], [-0.004, hy + 0.2, 0.033], [0.004, hy + 0.66, 0.03], [0.0, hy + 0.8, 0.045], [0, hy + 0.84, 0.085], [0, hy + 0.8, 0.11]], [0.015, 0.017, 0.018, 0.02, 0.024, 0.026, 0.022], 7, '#5a3d28', '#8a6646');
    }
  }

  /* ================= 人物 ================= */
  function mkHuman(L, hi) {
    const f = !!L.f, fierce = !!L.fierce && !f, old = bright(L.hair) > 0.5 && !L.aura, kid = (L.sz || 1) < 0.8;
    const skin = L.skin ? Art.mix(L.skin, '#c08a66', 0.25) : (f ? '#ebc6aa' : fierce ? '#cd9f7a' : old ? '#d9b497' : '#ddb391');
    const V = { f, fierce, old, jaw: f ? 0.44 : fierce ? 0.27 : 0.34, brow: f ? 0.008 : fierce ? 0.05 : 0.032, hollow: f ? 0 : old || fierce ? 0.035 : 0.018, key: f ? 'f' : fierce ? 'x' : old ? 'o' : 'm' };
    const mat = K.stdMat({ leg: true, rim: true }), rnd = mulberry32(hashS(L.robe + L.hair + (L.sash || '')));
    const g = new THREE.Group(), sc = new THREE.Group(), root = new THREE.Group(), up = new THREE.Group(), head = new THREE.Group(), hs = new THREE.Group();
    const sex = f ? 0.94 : 1, HH = (f ? 0.119 : 0.125) * (kid ? 1.22 : 1);
    g.add(sc); sc.scale.setScalar(SU * sex); sc.add(root); root.add(up); up.position.y = WY; up.add(head); head.position.set(0, 0.472, 0.014); head.add(hs); hs.position.y = HH * 1.02; hs.scale.setScalar(HH);
    const robe = L.robe, trim = L.trim, sash = L.sash, hair = L.hair, robeD = Art.shade(robe, -0.3), robeL = Art.shade(robe, 0.08), inner = Art.mix('#f1ede4', robe, 0.1), pant = Art.shade(robe, -0.5), leather = '#30241e';
    const mk = (b, par) => { const me = new THREE.Mesh(b.geo(), mat); me.castShadow = true; me.receiveShadow = true; par.add(me); return me; };
    const p1 = rnd() * 6, p2 = rnd() * 6, p3 = rnd() * 6;

    /* --- 上身 --- */
    const TR = f ? [[-0.16, 0.156, 0.118, 0], [0, 0.118, 0.094, 0], [0.13, 0.134, 0.104, 0.006], [0.27, 0.15, 0.114, 0.02], [0.35, 0.166, 0.1, 0.006], [0.4, 0.152, 0.086, 0], [0.432, 0.098, 0.074, -0.003], [0.455, 0.062, 0.06, -0.004]]
      : [[-0.16, 0.162, 0.12, 0], [0, 0.146, 0.11, 0], [0.14, 0.158, 0.116, 0.004], [0.28, 0.174, 0.124, 0.008], [0.36, 0.196, 0.114, 0.004], [0.405, 0.18, 0.098, 0], [0.437, 0.114, 0.084, -0.003], [0.46, 0.076, 0.074, -0.004]];
    const tpt = (a, y, off, o) => {
      let i = 1; while (i < TR.length - 1 && y > TR[i][0]) i++;
      const A = TR[i - 1], B = TR[i], k = clamp((y - A[0]) / (B[0] - A[0]), 0, 1);
      o[0] = Math.sin(a) * (lerp(A[1], B[1], k) + off); o[1] = y; o[2] = Math.cos(a) * (lerp(A[2], B[2], k) + off) + lerp(A[3], B[3], k);
    };
    let b = nb();
    b.m('cloth').surf(hi ? 28 : 18, 14, (u, v, o) => tpt(-PI + u * TAU, lerp(-0.16, TR[7][0], v), 0, o), [robe, robeL], { closed: true });
    const band = (pts, w, col, off, mt) => { b.m(mt || 'cloth').tube(pts.map(p => { tpt(p[0], p[1], off, o3); return [o3[0], o3[1], o3[2]]; }), [[0.008, w]], 6, col, null, { n: [0, 0, 1], cap: 0 }); };
    const run = (a0, y0, a1, y1, n) => { const r = []; for (let i = 0; i <= n; i++) r.push([lerp(a0, a1, i / n), lerp(y0, y1, i / n)]); return r; };
    b.m('cloth').surf(8, 5, (u, v, o) => { const y = lerp(0.3, 0.45, v); tpt((u - 0.5) * 2 * (0.03 + 2.9 * (y - 0.3)), y, 0.004, o); }, inner);
    band(run(0.42, 0.452, -0.03, 0.32, 6), 0.012, '#efece4', 0.008); band(run(-0.42, 0.452, 0.03, 0.32, 6), 0.012, '#efece4', 0.007);
    band(run(-0.7, 0.45, 0.06, 0.265, 8), 0.021, trim, 0.012);
    band(run(0.7, 0.45, -0.85, 0.02, 14), 0.021, trim, 0.016);
    b.m('silk').surf(hi ? 28 : 18, 2, (u, v, o) => tpt(-PI + u * TAU, lerp(-0.055, 0.06, v), 0.012, o), [Art.shade(sash, -0.15), sash], { closed: true });
    tpt(0.1, 0, 0.02, o3); b.s(o3[0], 0.002, o3[2], 0.03, 0.03, 0.018, sash);
    b.m('skin').tube([[0, 0.41, -0.01], [0, 0.46, -0.004], [0, 0.53, 0.008]], f ? [0.056, 0.05, 0.049] : [0.07, 0.064, 0.062], 10, skin, null, { cap: 0 });
    mk(b, up);

    /* --- 衣摆（随腿摆动） --- */
    const hemY = f ? 0.07 : fierce ? 0.46 : 0.27, hrx = f ? 0.29 : fierce ? 0.225 : 0.25, hrz = f ? 0.26 : fierce ? 0.2 : 0.215, y0s = WY + 0.04, vh = (y0s - 0.93) / (y0s - hemY);
    const spt = (a, v, off, o, lenK) => {
      const k = v < vh ? v / vh : 1, q = v < vh ? 0 : Math.pow((v - vh) / (1 - vh), 0.85), A = 0.08 * sst(vh * 0.5, 1, v);
      const fold = 1 + A * (0.55 * Math.sin(7 * a + p1) + 0.3 * Math.sin(12 * a + p2) + 0.25 * Math.sin(4 * a + p3));
      o[0] = Math.sin(a) * (lerp(lerp(0.152, 0.178, k), hrx, q) + off) * fold; o[1] = lerp(y0s, hemY - (lenK || 0), v); o[2] = Math.cos(a) * (lerp(lerp(0.112, 0.134, k), hrz, q) + off) * fold + 0.004;
      return fold;
    };
    const sb = nb(); sb.skf = (x, y, z, Kk) => { const vf = sst(1.0, hemY, y) * 0.85, sd = sst(-0.07, 0.07, x); Kk.push(vf * sd, vf * (1 - sd)); };
    const cR = lin(robe), cD = lin(robeD), cT = lin(trim);
    sb.m('cloth').surf(hi ? 44 : 24, 10, (u, v, o) => { spt(-PI + u * TAU, v, 0, o); },
      (u, v, p, o) => { const a = -PI + u * TAU, fo = 0.55 * Math.sin(7 * a + p1) + 0.3 * Math.sin(12 * a + p2) + 0.25 * Math.sin(4 * a + p3), sh = 1 - 0.3 * sst(0.2, 1, v) * (0.5 - 0.5 * fo), c = v > 0.93 ? cT : cR, k = v > 0.93 ? 0 : v * 0.5; o[0] = lerp(c[0], cD[0], k) * sh; o[1] = lerp(c[1], cD[1], k) * sh; o[2] = lerp(c[2], cD[2], k) * sh; },
      { closed: true, flip: true, two: true });
    if (!fierce) sb.surf(hi ? 30 : 18, 6, (u, v, o) => { spt(-PI + u * TAU, 0.4 + v * 0.6, -0.014, o, 0.04); }, [inner, Art.shade(inner, -0.2)], { closed: true, flip: true });
    { const pts = []; for (let i = 0; i <= 8; i++) { spt(-0.32, i / 8 * 0.93, 0.008, o3); pts.push([o3[0], o3[1], o3[2]]); } sb.tube(pts, [[0.005, 0.017]], 6, trim, null, { n: [0, 0, 1], cap: 0 }); }
    for (const q of [0.1, 0.2]) { const pts = [], ln = (f ? 0.5 : 0.42) - (q - 0.1); for (let i = 0; i <= 6; i++) { spt(q, 0.03 + i / 6 * ln, 0.014, o3); pts.push([o3[0], o3[1], o3[2]]); } sb.m('silk').tube(pts, [[0.005, 0.02]], 6, sash, Art.shade(sash, -0.2), { n: [0, 0, 1], cap: 2 }); }
    if (!fierce) {
      const pts = []; for (let i = 0; i <= 4; i++) { spt(-0.62, 0.04 + i / 4 * 0.3, 0.012, o3); pts.push([o3[0], o3[1], o3[2]]); }
      sb.m('silk').tube(pts, 0.003, 4, '#c8312c', null, { cap: 0 });
      const e = pts[4]; sb.m('gem').c(e[0], e[1] - 0.025, e[2] + 0.004, 0.024, 0.008, '#9fe0b8', 1, 12, null, PI / 2, 0, 0.5); sb.m('silk').tube([[e[0], e[1] - 0.05, e[2]], [e[0], e[1] - 0.14, e[2] + 0.004]], [0.005, 0.012], 5, '#c8312c', '#e25a40');
    }
    mk(sb, root);

    /* --- 腿 --- */
    const LS = f ? 0.86 : 1;
    const leg = sx => {
      const gL = new THREE.Group(), gK = new THREE.Group(); gL.position.set(sx * 0.088, 0.93, 0); root.add(gL); gK.position.set(0, -0.43, 0); gL.add(gK);
      let a = nb(); a.m('cloth').tube([[0, 0.04, 0], [0, -0.2, 0.006], [0, -0.45, 0]], [0.084 * LS, 0.07 * LS, 0.054 * LS], 8, pant, null, { cap: 0 }); mk(a, gL);
      a = nb(); a.m('cloth').tube([[0, 0.03, 0], [0, -0.15, -0.004]], [0.057 * LS, 0.052 * LS], 8, pant, null, { cap: 1 });
      a.m('leather').tube([[0, fierce ? -0.03 : -0.12, -0.004], [0, -0.25, -0.004], [0, -0.39, 0]], [0.06 * LS, 0.052 * LS, 0.045 * LS], 8, Art.shade(leather, 0.12), leather, { cap: 0 });
      a.tube([[0, -0.375, -0.045], [0, -0.43, 0.012], [0, -0.452, 0.09], [0, -0.447, 0.15]], [[0.043, 0.04], [0.047, 0.036], [0.044, 0.028], [0.03, 0.02]], 8, leather, '#17110e', { n: [1, 0, 0] });
      a.c(0, fierce ? -0.03 : -0.115, -0.004, 0.064 * LS, 0.026, fierce ? '#5a4030' : Art.mix(leather, trim, 0.3), 1, 10);
      if (fierce) for (const yy of [-0.16, -0.28]) a.c(0, yy, -0.004, 0.058 * LS, 0.012, '#6a4a34', 1, 10);
      mk(a, gK); return [gL, gK];
    };
    const LL = leg(1), LR = leg(-1);

    /* --- 手臂 --- */
    const SHX = f ? 0.15 : 0.178, narrow = fierce || L.wp === 'saber' || L.wp === 'dagger', hasWp = L.wp && L.wp !== 'none';
    const arm = sx => {
      const gA = new THREE.Group(), gF = new THREE.Group(); gA.position.set(sx * SHX, 0.385, 0); up.add(gA); gF.position.set(0, -0.28, 0); gA.add(gF);
      const AS = f ? 0.88 : 1;
      let a = nb(); a.m('cloth');
      a.tube([[-sx * 0.02, 0.025, 0], [0, -0.03, 0], [0, -0.15, 0], [0, -0.3, 0]], narrow ? [0.05 * AS, 0.058 * AS, 0.05 * AS, 0.046 * AS] : [0.05 * AS, 0.06 * AS, 0.057 * AS, 0.06 * AS], 10, robeL, robeD, { cap: 1 });
      mk(a, gA);
      a = nb();
      const fist = sx < 0 && hasWp;
      if (!narrow) {
        const ph = p1 + sx;
        a.m('cloth').surf(hi ? 18 : 12, 6, (u, v, o) => { const an = -PI + u * TAU, k = Math.pow(v, 1.2), fo = 1 + 0.08 * v * Math.sin(5 * an + ph); o[0] = Math.sin(an) * lerp(0.067 * AS, 0.08, k) * fo; o[2] = Math.cos(an) * lerp(0.069 * AS, 0.12, k) * fo - 0.022 * k; o[1] = 0.025 - (0.3 + 0.075 * Math.max(0, -Math.cos(an))) * v; },
          (u, v, p, o) => { const c = v > 0.86 ? cT : cR, k = v > 0.86 ? 0 : v * 0.45; o[0] = lerp(c[0], cD[0], k); o[1] = lerp(c[1], cD[1], k); o[2] = lerp(c[2], cD[2], k); }, { closed: true, flip: true, two: true });
        a.tube([[0, -0.1, 0], [0, -0.285, 0]], [0.04, 0.042], 8, inner, Art.shade(inner, -0.12), { cap: 0 });
      } else {
        a.m('cloth').tube([[0, 0.02, 0], [0, -0.07, 0]], [0.05 * AS, 0.046 * AS], 8, robeD, null, { cap: 1 });
        a.m('leather').tube([[0, -0.05, 0], [0, -0.15, 0], [0, -0.245, 0]], [0.049 * AS, 0.044 * AS, 0.036 * AS], 8, '#4a3526', '#3a281c', { cap: 0 });
        a.m('gold'); for (const yy of [-0.07, -0.15, -0.23]) a.c(0, yy, 0, (0.052 + (yy + 0.05) * 0.066) * AS, 0.012, '#9a8050', 1, 10);
      }
      a.m('skin').tube([[0, -0.22, 0], [0, -0.275, 0]], [0.031 * AS, 0.027 * AS], 7, skin, null, { cap: 0 });
      if (fist) { a.add(K.sph(10, 8), M(0, -0.318, 0.004, 0.027, 0.04, 0.036), skin); a.tube([[0, -0.29, 0.03], [-sx * 0.012, -0.32, 0.045], [-sx * 0.026, -0.335, 0.03]], [0.011, 0.0105, 0.009], 5, skin); }
      else {
        a.add(K.sph(10, 8), M(0, -0.305, 0.002, 0.016 * AS, 0.045, 0.036 * AS), skin);
        for (let i = 0; i < 4; i++) { const z = (-0.026 + i * 0.0175) * AS; a.tube([[0, -0.335, z], [-sx * 0.006, -0.376, z], [-sx * 0.02, -0.404 + Math.abs(i - 1.5) * 0.006, z + 0.002]], [0.0088 * AS, 0.008 * AS, 0.0064 * AS], 5, skin); }
        a.tube([[0, -0.283, 0.03 * AS], [-sx * 0.008, -0.322, 0.052 * AS], [-sx * 0.014, -0.352, 0.056 * AS]], [0.0108 * AS, 0.0096 * AS, 0.008 * AS], 5, skin);
      }
      if (fist) weapon(a, L, -0.322);
      mk(a, gF); return [gA, gF];
    };
    const AR = arm(-1), AL = arm(1);

    /* --- 披风（首领） --- */
    let cape = null;
    if (L.aura || (L.sz || 1) >= 1.2) {
      cape = new THREE.Group(); cape.position.set(0, 0.44, -0.075); up.add(cape);
      const a = nb(), cc = lin(Art.shade(robe, -0.42)), ci = lin(Art.mix(robe, L.aura || trim, 0.45));
      a.m('cloth').surf(hi ? 24 : 12, 9, (u, v, o) => { const x = (u - 0.5) * 2, w = lerp(0.235, 0.52, Math.pow(v, 0.8)); o[0] = x * w; o[1] = -v * 1.2 + 0.03 * (1 - x * x) * (1 - v); o[2] = -0.02 - 0.16 * v * v + (0.07 * (1 - v) + 0.02) * x * x + (Math.sin(x * 10 + p1) * 0.028 + Math.sin(x * 5 + p2) * 0.04) * v; },
        (u, v, p, o) => { const x = Math.abs(u - 0.5) * 2, e = v > 0.95 || x > 0.94, c = e ? cT : cc; o[0] = lerp(c[0], ci[0], e ? 0 : v * 0.35); o[1] = lerp(c[1], ci[1], e ? 0 : v * 0.35); o[2] = lerp(c[2], ci[2], e ? 0 : v * 0.35); }, { two: true });
      a.m('gold'); for (const s of [-1, 1]) { a.add(K.sph(12, 8, 0, TAU, 0, PI * 0.55), M(s * (SHX + 0.01), -0.03, 0.075, 0.074, 0.05, 0.08, 0, 0, s * -0.4), fierce ? '#5a4c40' : gold); a.s(s * 0.1, 0.0, 0.17, 0.02, 0.02, 0.014, gold); }
      a.tube([[-0.1, 0, 0.17], [0, -0.03, 0.2], [0.1, 0, 0.17]], 0.006, 5, gold, null, { cap: 0 });
      mk(a, cape);
    }

    /* --- 头：脸、耳、发、冠、须 --- */
    const fmat = new THREE.MeshStandardMaterial({ map: faceTex(L, V, skin), roughness: 0.55, metalness: 0 });
    const face = new THREE.Mesh(headGeo(V, hi), fmat); face.castShadow = true; face.receiveShadow = true; hs.add(face);
    const hdir = (a, y, k, o) => { const s = Math.sqrt(Math.max(0, 1 - y * y)); headP(s * Math.sin(a), y, s * Math.cos(a), V, o); o[0] *= k; o[1] *= k; o[2] *= k; };
    const hb = nb(), style = L.hs, hc = lin(hair), hl = lin(Art.mix(hair, '#ffffff', 0.35)), hairL = Art.shade(hair, 0.22);
    const HM = () => hb.m(0.5, 0, 0, 0);
    const hairCol = (u, v, p, o) => { const k = 0.8 + 0.26 * Math.sin(u * TAU * 11 + 1.3 + 2 * Math.sin(v * 4)) * (0.6 + 0.4 * Math.sin(u * TAU * 3 + 0.5)), s = 0.045 * g1(v - 0.4, 0.14); o[0] = hc[0] * k + hl[0] * s; o[1] = hc[1] * k + hl[1] * s; o[2] = hc[2] * k + hl[2] * s; };
    hb.m('skin'); for (const s of [-1, 1]) hb.add(K.sph(10, 8), M(s * 0.735, -0.05, -0.04, 0.05, 0.25, 0.13, 0, 0, s * -0.12), skin);
    const hairline = a => { a = Math.abs(a) * 180 / PI; return a < 30 ? lerp(f ? 0.57 : 0.61, 0.56, a / 30) : a < 52 ? lerp(0.56, 0.3, (a - 30) / 22) : a < 75 ? lerp(0.3, 0.0, (a - 52) / 23) : a < 100 ? lerp(0.0, -0.22, (a - 75) / 25) : lerp(-0.22, -0.56, (a - 100) / 80); };
    const knot = (x, y, z, r, ry) => { HM(); hb.surf(hi ? 20 : 10, hi ? 10 : 6, (u, v, o) => { const a = u * TAU, p = lerp(0.04, 0.96, v) * PI, rr = r * (1 + (hi ? 0.07 * Math.sin(a * 7 + p * 5) : 0)); o[0] = x + Math.sin(p) * Math.sin(a) * rr; o[1] = y + Math.cos(p) * ry; o[2] = z + Math.sin(p) * Math.cos(a) * rr; }, hairCol, { closed: true, flip: true }); };
    const fall = (len, wid, y0) => { HM(); hb.surf(hi ? 48 : 16, 9, (u, v, o) => {
      const be = (u - 0.5) * 2 * wid, s = sst(0, 0.3, v), e = Math.abs(be) / wid;
      hdir(PI + be, y0, 1.085, o);
      o[0] *= lerp(1, 1.0 - 0.12 * v, s) + 0.1 * s * e; o[1] = y0 - v * len * (0.9 + 0.1 * Math.sin(u * 23 + p1)); o[2] = lerp(o[2], lerp(-1.16, -0.5, e * e), s) - (hi ? 0.035 * Math.sin(u * TAU * 8 + Math.sin(v * 3 + p2)) : 0) * s;
    }, hairCol, { two: true }); };
    let tail = null, top = 1.04;
    if (style === 'hood') {
      hb.m('cloth').surf(hi ? 44 : 22, 9, (u, v, o) => { const a = -PI + u * TAU, d = Math.abs(a) * 180 / PI, yh = d < 24 ? 0.66 : d < 62 ? lerp(0.66, -0.25, (d - 24) / 38) : d < 84 ? lerp(-0.25, -0.96, (d - 62) / 22) : -0.96; hdir(a, Math.cos(lerp(0.004, Math.acos(yh) / PI, v) * PI), 1.13 + 0.03 * Math.sin(a * 5 + v * 4), o); }, [robe, robeD], { closed: true, flip: true, two: true });
      hb.surf(hi ? 30 : 16, 3, (u, v, o) => { const a = u * TAU, r = lerp(0.8, 1.75, v) * (1 + 0.05 * Math.sin(a * 6 + p1)); o[0] = Math.sin(a) * r; o[1] = lerp(-0.86, -1.5, v); o[2] = Math.cos(a) * r * 0.8 - 0.1; }, [robeD, robe], { closed: true, flip: true });
      top = 1.16;
    } else if (style !== 'bald') {
      const bulk = style === 'short' ? 0.7 : f ? 1.1 : 1;
      HM(); hb.surf(hi ? 132 : 33, hi ? 9 : 6, (u, v, o) => { const a = -PI + u * TAU, y = Math.cos(lerp(0.004, Math.acos(hairline(a)) / PI, v) * PI), th = 0.03 + 0.065 * sst(1, 0.5, v) + (hi ? 0.016 * Math.sin(u * 22 * TAU + 2 * Math.sin(v * 4)) * sst(1, 0.8, v) : 0); hdir(a, y, 1 + th * bulk, o); }, hairCol, { closed: true, flip: true });
      if (f && !old) hb.surf(hi ? 30 : 14, 4, (u, v, o) => { const a = (u - 0.5) * 1.9; hdir(a, lerp(0.66, 0.3 + 0.22 * g1(a, 0.2) - 0.07 * Math.abs(Math.sin(u * 31)) - 0.04 * Math.sin(u * 9), v), 1.08 - 0.055 * v, o); }, hairCol, { flip: true });
      if (f || style === 'long') for (const s of [-1, 1]) hb.tube([[s * 0.6, 0.38, 0.42], [s * 0.72, -0.2, 0.36], [s * 0.7, -0.9, 0.5], [s * 0.66, -1.6, 0.8], [s * 0.6, -2.2, 0.96], [s * 0.57, -2.7, 1.0]], [[0.1, 0.08], [0.1, 0.085], [0.09, 0.08], [0.07, 0.06], [0.045, 0.04], [0.012, 0.01]], 8, hair, hairL, { n: [0, 0, 1], cap: 2 });
      if (style === 'top') {
        knot(0, 1.16, -0.08, 0.25, 0.26); top = 1.45;
        hb.m('gold').c(0, 0.98, -0.08, 0.2, 0.09, kid || (L.sz || 1) < 0.9 ? sash : gold, 0.92, 12); hb.stick([-0.48, 1.0, -0.08], [0.48, 1.03, -0.08], 0.022, 0.016, gold, 5);
        if (!old && !kid) { fall(2.7, 1.25, 0.05); hb.m('silk'); for (const s of [-1, 1]) hb.tube([[s * 0.08, 0.92, -0.3], [s * 0.2, 0.2, -1.05], [s * 0.26, -1.0, -1.3], [s * 0.3, -1.9, -1.26]], [[0.008, 0.05]], 5, sash, Art.shade(sash, -0.2), { n: [0, 0, 1], cap: 0 }); }
        else fall(0.75, 1.3, -0.1);
      } else if (style === 'bun') {
        if (f) { knot(0, 0.95, -0.5, 0.36, 0.3); knot(0, 0.5, -0.92, 0.3, 0.3); top = 1.25; } else { knot(0, 0.55, -0.9, 0.33, 0.33); }
        hb.m('gold').stick([-0.5, f ? 0.98 : 0.6, f ? -0.45 : -0.86], [0.5, f ? 0.9 : 0.52, f ? -0.55 : -0.94], 0.022, 0.014, f ? gold : '#7a5a3a', 5);
        if (f) hb.s(0.5, 0.86, -0.56, 0.05, 0.05, 0.05, '#e25a6a');
        fall(0.7, 1.3, -0.1);
      } else if (style === 'long') {
        fall(f ? 4.4 : 3.9, 1.38, 0.1);
        if (!f) { knot(0, 1.08, -0.2, 0.2, 0.2); top = 1.3; } else { hb.m('gold').tube([[-0.5, 0.62, 0.62], [-0.2, 0.7, 0.86], [0.2, 0.7, 0.86], [0.5, 0.62, 0.62]], 0.014, 5, gold, null, { cap: 0 }); hb.m('gem').s(0, 0.69, 0.9, 0.035, 0.045, 0.02, L.trim); }
      } else if (style === 'short') {
        fall(0.8, 1.3, -0.05); HM();
        for (let i = 0; i < 26; i++) { const a = rnd() * TAU, y = 0.55 + rnd() * 0.42; hdir(a, y, 1.04, o3); const q = [o3[0], o3[1], o3[2]]; hdir(a + (rnd() - 0.5) * 0.3, Math.min(0.99, y + 0.06), 1.2 + rnd() * 0.1, o3); hb.stick(q, [o3[0], o3[1], o3[2] - 0.06], 0.13, 0.008, hair, 5, hairL); }
        hb.m('cloth').tube([[-0.74, 0.5, 0.5], [0, 0.56, 0.9], [0.74, 0.5, 0.5]], [[0.012, 0.05]], 5, sash, null, { n: [0, 0, 1], cap: 0 });
      } else if (style === 'pony') {
        hb.m('silk').c(0, 0.86, -0.72, 0.15, 0.1, sash, 1, 10, null, 0.9, 0, 0); fall(0.7, 1.3, -0.1);
        tail = new THREE.Group(); tail.position.set(0, 0.86, -0.76); hs.add(tail);
        const tb = nb(); tb.m(0.5, 0, 0, 0).tube([[0, 0, 0], [0, -0.5, -0.36], [0, -1.4, -0.5], [0, -2.3, -0.42], [0, -3.05, -0.3]], [[0.2, 0.16], [0.25, 0.17], [0.2, 0.14], [0.13, 0.09], [0.03, 0.02]], hi ? 12 : 8, hair, hairL, { n: [1, 0, 0] });
        tb.m('silk'); for (const s of [-1, 1]) tb.tube([[s * 0.1, 0, 0], [s * 0.3, -0.5, -0.3], [s * 0.34, -1.2, -0.36]], [[0.008, 0.05]], 5, sash, null, { n: [0, 0, 1], cap: 0 });
        mk(tb, tail);
      }
    }
    if (L.hat === 'bamboo') {
      hb.m(0.82, 0, 0.7, 0.06).surf(hi ? 36 : 20, 8, (u, v, o) => { const a = u * TAU, r = 0.04 + 2.0 * v; o[0] = Math.sin(a) * r; o[1] = 1.5 - 0.88 * Math.pow(v, 1.12) + (hi ? 0.012 * Math.sin(v * 56) : 0); o[2] = Math.cos(a) * r - 0.05; }, ['#dcc582', '#b0914a'], { closed: true, flip: true, two: true });
      for (const s of [-1, 1]) hb.tube([[s * 0.95, 0.98, 0], [s * 0.7, -0.2, 0.2], [0, -1.02, 0.5]], 0.012, 4, '#5a4630', null, { cap: 0 });
      top = 1.55;
    } else if (L.hat === 'mask') {
      const mc = '#24212c';
      hb.m('cloth').surf(hi ? 28 : 14, hi ? 10 : 6, (u, v, o) => { const a = (u - 0.5) * 2 * 1.5; hdir(a, lerp(-0.07 + 0.06 * sst(0.3, 1.2, Math.abs(a)), -0.985, v), 1.055 + 0.012 * Math.sin(v * 9 + a * 4), o); }, [mc, Art.shade(mc, -0.3)], { flip: true });
      hb.surf(hi ? 24 : 12, 1, (u, v, o) => { const a = 1.45 + u * (TAU - 2.9); hdir(a, lerp(0.02, -0.1, v), 1.1, o); }, mc, { flip: true });
    } else if (L.hat === 'crown') {
      hb.m('gold').surf(hi ? 30 : 16, 2, (u, v, o) => { const a = u * TAU; hdir(a, lerp(0.78, 0.6, v), 1.13, o); }, [gold, Art.shade(gold, -0.2)], { closed: true, flip: true, two: true });
      for (let i = 0; i < 7; i++) { const a = (i - 3) * 0.42; hdir(a, 0.74, 1.14, o3); const q = [o3[0], o3[1], o3[2]]; hb.stick(q, [q[0] * 1.12, q[1] + 0.55 - Math.abs(i - 3) * 0.1, q[2] * 1.08], 0.07, 0.006, gold, 5); }
      hdir(0, 0.69, 1.16, o3); hb.m('gem').glow(2.2).s(o3[0], o3[1], o3[2], 0.06, 0.075, 0.03, L.aura || '#ff4ad0'); hb.glow(1); top = 1.6;
    }
    if (L.beard) {
      HM(); const bl = old ? -2.5 : fierce ? -1.35 : -1.9;
      hb.tube([[0, -0.76, 0.7], [0, lerp(-0.85, bl, 0.35), 0.82], [0, lerp(-0.8, bl, 0.75), 0.8], [0, bl, 0.74]], [[0.3, 0.14], [0.27, 0.15], [0.16, 0.09], [0.02, 0.02]], 9, hair, hairL, { n: [1, 0, 0], cap: 2 });
      for (const s of [-1, 1]) { hb.tube([[s * 0.05, -0.41, 0.95], [s * 0.22, -0.5, 0.86], [s * 0.32, -0.72, 0.72], [s * 0.33, old ? -1.3 : -0.98, 0.7]], [[0.035, 0.05], [0.035, 0.045], [0.03, 0.03], [0.006, 0.006]], 6, hair, hairL, { n: [0, 0, 1], cap: 2 }); if (fierce) hb.tube([[s * 0.6, 0.0, 0.3], [s * 0.56, -0.4, 0.42], [s * 0.36, -0.74, 0.58], [0, -0.9, 0.7]], [[0.03, 0.09]], 6, hair, null, { n: [s, 0, 0.5], cap: 0 }); }
    }
    mk(hb, hs);
    // 眼睑（眨眼时显示）
    const lb = nb(), skD = lin(Art.shade(skin, -0.12)), lash = lin('#1c1210'); lb.m('skin');
    for (const s of [-1, 1]) lb.surf(8, 4, (u, v, o) => { const a = s * 0.427 + (u - 0.5) * 0.46, w = Math.sqrt(Math.max(0, 1 - (2 * u - 1) * (2 * u - 1))), y = 0.07 + (0.5 - v) * 2 * (0.012 + 0.07 * w); hdir(a, y, 1.014, o); },
      (u, v, p, o) => { const c = v > 0.8 ? lash : skD; o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; }, { flip: true });
    const lids = mk(lb, hs); lids.castShadow = false; lids.visible = false;

    const h = (WY + 0.472 + HH * (1.02 + top)) * SU * sex;
    const ch = { kind: 'human', g, root, up, head, lids, tail, cape, aL: AL[0], aR: AR[0], fL: AL[1], fR: AR[1], lL: LL[0], lR: LR[0], kL: LL[1], kR: LR[1], mat, mats: [mat, fmat], lit: [mat, fmat], h, hy: (WY + 0.472 + HH * 1.02) * SU * sex, A: null, nowp: !hasWp, staff: L.wp === 'staff' };
    if (L.wings) {
      // 蝠翼：以腕部为扇心的翼膜 + 臂骨与指骨
      const wb = nb(), ac = L.aura || '#8040c0', mc = lin(Art.mix('#150a1c', ac, 0.2)), mt2 = lin(Art.mix('#150a1c', ac, 0.7)), W0 = [0.95, 0.62], tips = [[1.5, 0.34], [1.3, -0.25], [0.88, -0.62], [0.42, -0.66], [0.03, -0.38], [0, 0]], bone = '#1a0f22';
      wb.m(0.6, 0, 0.5, 0.1).surf(25, 4, (u, v, o) => {
        const fq = Math.min(4.999, u * 5), i = Math.floor(fq), k = fq - i, a = tips[i], b = tips[i + 1], sc2 = 1 - 0.17 * Math.sin(PI * k) * (i < 4 ? 1 : 0.3);
        o[0] = lerp(W0[0], W0[0] + (lerp(a[0], b[0], k) - W0[0]) * sc2, v); o[1] = lerp(W0[1], W0[1] + (lerp(a[1], b[1], k) - W0[1]) * sc2, v); o[2] = -0.1 * Math.sin(PI * v) * Math.sin(PI * k) - 0.05 * v;
      }, (u, v, p, o) => { const k = v * v * 0.8; o[0] = lerp(mc[0], mt2[0], k); o[1] = lerp(mc[1], mt2[1], k); o[2] = lerp(mc[2], mt2[2], k); }, { two: true });
      wb.m(0.5, 0, 0.3, 0.2).tube([[0, 0, 0], [0.42, 0.5, 0.02], [0.95, 0.62, 0]], [0.035, 0.028, 0.022], 6, bone);
      for (let i = 0; i < 4; i++) wb.tube([[0.95, 0.62, 0], [(0.95 + tips[i][0]) / 2, (0.62 + tips[i][1]) / 2, -0.03], [tips[i][0], tips[i][1], -0.05]], [0.02, 0.013, 0.004], 5, bone, Art.mix(bone, ac, 0.6));
      const wg = wb.geo();
      ch.wings = [1, -1].map(s => { const w = new THREE.Mesh(wg, mat); w.castShadow = true; w.position.set(s * 0.07, 0.34, -0.14); w.scale.set(s * 1.25, 1.25, 1.25); up.add(w); return w; });
    }
    return ch;
  }

  /* ================= 怪物 ================= */
  function eyeMat() { return new THREE.MeshBasicMaterial({ vertexColors: true }); }
  function mkWolf(L) {
    const mat = K.stdMat({ rim: true }), em = eyeMat(), g = new THREE.Group(), root = new THREE.Group(); g.add(root);
    const c = L.c, c2 = L.c2, cd = Art.shade(c, -0.35), cA = lin(c), cB = lin(Art.mix(c, c2, 0.7)), cD = lin(cd);
    const mk = (gb, par, m) => { const me = new THREE.Mesh(gb.geo(), m || mat); me.castShadow = !m; me.receiveShadow = !m; par.add(me); return me; };
    const fur = (u, v, p, o) => { const k = Math.sin(u * TAU), q = sst(-0.2, -0.75, k), d = 0.3 * sst(0.4, 1, k); o[0] = lerp(lerp(cA[0], cD[0], d), cB[0], q); o[1] = lerp(lerp(cA[1], cD[1], d), cB[1], q); o[2] = lerp(lerp(cA[2], cD[2], d), cB[2], q); };
    let b = new GB(); b.m('fur');
    b.tube([[0, 0.5, -0.46], [0, 0.515, -0.24], [0, 0.53, 0.02], [0, 0.56, 0.24], [0, 0.63, 0.4], [0, 0.71, 0.53]], [[0.105, 0.12], [0.12, 0.135], [0.132, 0.165], [0.138, 0.178], [0.1, 0.125], [0.082, 0.09]], 12, c, null, { n: [1, 0, 0], cf: fur });
    b.add(K.sph(14, 10), M(0, 0.735, 0.6, 0.088, 0.086, 0.105), c);
    b.tube([[0, 0.715, 0.66], [0, 0.69, 0.76], [0, 0.675, 0.84]], [[0.056, 0.05], [0.042, 0.038], [0.03, 0.026]], 9, c, Art.mix(c, c2, 0.6), { n: [1, 0, 0] });
    b.tube([[0, 0.665, 0.64], [0, 0.648, 0.76], [0, 0.645, 0.82]], [[0.04, 0.018], [0.03, 0.014], [0.02, 0.01]], 6, cd, null, { n: [1, 0, 0] });
    b.m(0.3, 0, 0, 0).s(0, 0.69, 0.852, 0.02, 0.016, 0.016, '#120e10'); b.m('fur');
    for (const s of [-1, 1]) { b.tube([[s * 0.055, 0.79, 0.57], [s * 0.07, 0.86, 0.555], [s * 0.078, 0.925, 0.545]], [[0.036, 0.02], [0.026, 0.014], [0.004, 0.004]], 6, cd, c, { n: [0, 0, 1] }); b.s(s * 0.105, 0.69, 0.58, 0.045, 0.07, 0.06, Art.mix(c, c2, 0.5)); }
    const rnd = mulberry32(11);
    for (let i = 0; i < 26; i++) { const z = 0.5 - i * 0.034, y = z > 0.24 ? lerp(0.738, 0.8, (z - 0.24) / 0.29) : z > 0.02 ? lerp(0.695, 0.738, (z - 0.02) / 0.22) : lerp(0.62, 0.695, (z + 0.46) / 0.48), x = (rnd() - 0.5) * 0.1; b.stick([x, y - 0.05, z], [x * 1.4, y + (L.spikes && i % 3 === 0 ? 0.16 : 0.03), z - 0.07], 0.045, 0.004, L.spikes && i % 3 === 0 ? c2 : cd, 4, L.spikes && i % 3 === 0 ? c2 : c); }
    mk(b, root);
    b = new GB(); b.glow(2.4); for (const s of [-1, 1]) b.s(s * 0.052, 0.765, 0.672, 0.02, 0.014, 0.012, L.eye, null, 0, s * 0.5, s * 0.3); mk(b, root, em);
    const legs = [[0.1, 0.26], [-0.1, 0.26], [0.1, -0.36], [-0.1, -0.36]].map((p, i) => {
      const gl = new THREE.Group(), lo = new THREE.Group(), rear = i > 1; gl.position.set(p[0], 0.5, p[1]); root.add(gl); lo.position.set(0, -0.24, rear ? -0.035 : 0.02); gl.add(lo);
      let a = new GB(); a.m('fur').tube([[0, 0.06, 0], [0, -0.1, rear ? -0.01 : 0.012], [0, -0.25, rear ? -0.035 : 0.02]], rear ? [[0.06, 0.085], [0.05, 0.065], [0.034, 0.04]] : [[0.055, 0.065], [0.046, 0.05], [0.034, 0.036]], 7, c, cd, { n: [1, 0, 0], cap: 0 }); mk(a, gl);
      a = new GB(); a.m('fur').tube([[0, 0.01, 0], [0, -0.12, rear ? 0.03 : -0.012], [0, -0.225, rear ? 0.04 : -0.02]], [0.034, 0.028, 0.026], 6, cd, Art.mix(c, c2, 0.4), { cap: 1 }); a.add(K.sph(10, 8), M(0, -0.235, (rear ? 0.04 : -0.02) + 0.03, 0.038, 0.026, 0.058), Art.mix(c, c2, 0.5)); mk(a, lo);
      gl.userData.lo = lo; gl.userData.rear = rear; return gl;
    });
    const tail = new THREE.Group(); tail.position.set(0, 0.52, -0.46); root.add(tail);
    b = new GB(); b.m('fur').tube([[0, 0, 0.02], [0, -0.06, -0.16], [0, -0.17, -0.31], [0, -0.26, -0.4]], [0.045, 0.065, 0.06, 0.01], 8, c, Art.mix(c, c2, 0.6)); mk(b, tail);
    return { kind: 'wolf', g, root, legs, tail, mat, mats: [mat, em], lit: [mat], h: 0.98 };
  }
  function mkSpider(L) {
    const mat = K.stdMat({ rim: true }), em = eyeMat(), g = new THREE.Group(), root = new THREE.Group(); g.add(root);
    const c = L.c, c2 = L.c2, cd = Art.shade(c, -0.4), cl = Art.shade(c, 0.2), cA = lin(cd), cB = lin(cl), cP = lin(c2);
    const mk = (gb, par, m) => { const me = new THREE.Mesh(gb.geo(), m || mat); me.castShadow = !m; me.receiveShadow = !m; par.add(me); return me; };
    let b = new GB(); b.m(0.55, 0, 0.9, 0.12);
    b.surf(22, 14, (u, v, o) => { const a = u * TAU, p = lerp(0.03, 0.97, v) * PI, bump = 1 + 0.035 * Math.sin(a * 6) * Math.sin(p * 5); o[0] = Math.sin(p) * Math.sin(a) * 0.27 * bump; o[1] = 0.36 + Math.cos(p) * 0.23 * bump; o[2] = -0.25 + Math.sin(p) * Math.cos(a) * 0.33 * bump; },
      (u, v, p, o) => { const top = sst(0.5, 0.1, v), k = top * (0.5 + 0.5 * Math.cos(u * TAU * 2)) * (Math.sin(v * 22) > 0.2 ? 1 : 0), q = lerp(0.2, 1, sst(0.9, 0.2, v)); o[0] = lerp(lerp(cA[0], cB[0], q), cP[0], k * 0.8); o[1] = lerp(lerp(cA[1], cB[1], q), cP[1], k * 0.8); o[2] = lerp(lerp(cA[2], cB[2], q), cP[2], k * 0.8); }, { closed: true, flip: true });
    b.add(K.sph(16, 12), M(0, 0.29, 0.13, 0.175, 0.14, 0.19), c, cl);
    for (const s of [-1, 1]) { b.m(0.3, 0, 0.2, 0.2).tube([[s * 0.05, 0.25, 0.28], [s * 0.06, 0.17, 0.35], [s * 0.035, 0.09, 0.37]], [0.03, 0.022, 0.004], 6, cd, '#efe4d2'); b.m(0.55, 0, 0.9, 0.12).tube([[s * 0.09, 0.27, 0.24], [s * 0.15, 0.24, 0.36], [s * 0.12, 0.16, 0.42]], [0.024, 0.018, 0.008], 5, c, cd); }
    mk(b, root);
    b = new GB(); b.glow(2.6);
    for (const s of [-1, 1]) { b.s(s * 0.055, 0.35, 0.292, 0.026, 0.026, 0.018, L.eye); b.s(s * 0.108, 0.325, 0.262, 0.017, 0.017, 0.013, L.eye); b.s(s * 0.03, 0.4, 0.26, 0.012, 0.012, 0.01, L.eye); }
    mk(b, root, em);
    const legs = [];
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
      const gl = new THREE.Group(), an = (i - 1.5) * 0.5; gl.position.set(s * 0.11, 0.27, 0.12 - i * 0.07); gl.rotation.y = -s * an; root.add(gl);
      const a = new GB(); a.m(0.5, 0, 0.9, 0.2);
      a.tube([[0, 0, 0], [s * 0.16, 0.17, 0], [s * 0.31, 0.28, 0]], [0.04, 0.034, 0.03], 6, c, cl, { cap: 1 });
      a.tube([[s * 0.31, 0.28, 0], [s * 0.45, 0.06, 0], [s * 0.54, -0.14, 0]], [0.03, 0.022, 0.016], 6, cl, cd, { cap: 0 });
      a.tube([[s * 0.54, -0.14, 0], [s * 0.58, -0.27, 0]], [0.016, 0.004], 5, cd, '#140c18', { cap: 0 });
      a.s(s * 0.31, 0.28, 0, 0.038, 0.038, 0.038, c2); a.s(s * 0.54, -0.14, 0, 0.022, 0.022, 0.022, c2);
      mk(a, gl); gl.userData = { s, i, y0: gl.rotation.y }; legs.push(gl);
    }
    return { kind: 'spider', g, root, legs, mat, mats: [mat, em], lit: [mat], h: 0.66 };
  }
  function mkSpirit(L) {
    const g = new THREE.Group(), root = new THREE.Group(); g.add(root);
    const core = new THREE.MeshBasicMaterial({ vertexColors: true }), shell = new THREE.MeshBasicMaterial({ color: LC(L.c2, 1.4), transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false });
    shell._tr = true; shell._op = 0.42;
    const b = new GB(); b.glow(1.5);
    b.add(K.sph(20, 14), M(0, 0, 0, 0.2, 0.21, 0.2), Art.mix(L.c, L.c2, 0.45), L.c);
    b.tube([[0, -0.1, 0], [0.03, -0.3, -0.04], [-0.02, -0.46, -0.08], [0.02, -0.6, -0.1]], [0.16, 0.11, 0.06, 0.004], 10, Art.mix(L.c, L.c2, 0.4), L.c2, { cap: 2 });
    b.glow(0.5); b.s(0.07, 0.02, 0.18, 0.03, 0.05, 0.02, L.eye); b.s(-0.07, 0.02, 0.18, 0.03, 0.05, 0.02, L.eye);
    const body = new THREE.Mesh(b.geo(), core); root.add(body);
    const sh = new THREE.Mesh(K.sph(16, 12), shell); sh.scale.set(0.29, 0.31, 0.29); root.add(sh);
    const wisps = [0, 1, 2].map(() => { const w = new THREE.Mesh(K.sph(8, 6), new THREE.MeshBasicMaterial({ color: LC(L.c, 2) })); w.scale.setScalar(0.05); root.add(w); return w; });
    const gl = K.glowSprite(L.c2, 1.5, 0.5); gl.material._tr = true; gl.material._op = 0.5; root.add(gl);
    root.position.y = 0.72;
    return { kind: 'spirit', g, root, wisps, shell: sh, mats: [core, shell, gl.material].concat(wisps.map(w => w.material)), h: 1.12 };
  }

  /* hi：高细节（战斗、标题、头像）；大地图上的人物用低细节 */
  function mkChar(L, noAura, hi) {
    const ch = L.k === 'wolf' ? mkWolf(L) : L.k === 'spider' ? mkSpider(L) : L.k === 'spirit' ? mkSpirit(L) : (K.mkModel && K.mkModel(L, !!hi)) || mkHuman(L, !!hi);
    ch.sz = L.sz || 1; ch.g.scale.setScalar(ch.sz); ch.h *= ch.sz; ch.seed = 0; ch.alpha = 1; ch.look = L; ch.em0 = [0, 0, 0];
    if (L.aura && !noAura) {
      const s = K.glowSprite(L.aura, 2.8, 0.34, 1.3); s.position.y = 0.75; s.material._tr = true; s.material._op = 0.34; ch.g.add(s); ch.aura = s; ch.mats.push(s.material);
    }
    return ch;
  }
  function kill(ch) {
    if (!ch) return;
    if (ch.g.parent) ch.g.parent.remove(ch.g);
    ch.g.traverse(o => { if (o.isMesh && !o.geometry._keep) o.geometry.dispose(); });
    for (const m of ch.mats) m.dispose();
    if (ch.skel) ch.skel.dispose();
  }
  function tint(ch, flash, alpha) {
    const e = ch.em0;
    if (ch.lit) for (const m of ch.lit) m.emissive.setRGB(e[0] + flash * 1.1, e[1] + flash * 0.4, e[2] + flash * 0.3);
    if (alpha == null) alpha = 1;
    if (ch.alpha !== alpha) {
      ch.alpha = alpha;
      for (const m of ch.mats) { m.transparent = alpha < 0.999 || !!m._tr; m.opacity = (m._op == null ? 1 : m._op) * alpha; }
      ch.g.visible = alpha > 0.01;
    }
  }

  /* ---------- 动画 ---------- */
  const KEYS = ['aL', 'aR', 'aLz', 'aRz', 'eL', 'eR', 'lL', 'lR', 'kL', 'kR', 'lean', 'tw', 'y', 'rx', 'hx', 'hy', 'z', 'tR', 'wR', 'hR'];   // tR：右上臂绕自身轴内旋；wR：右前臂转腕；hR：右腕下压（剑尖朝下）
  function animate(ch, o) {
    const t = o.t || 0, dt = o.dt == null ? 0.016 : o.dt, pose = o.pose || 'idle', sw = o.swing || 0, sd = ch.seed, walk = !!o.walk;
    if (ch.aura) { const k = 1 + Math.sin(t * 2.6 + sd) * 0.1; ch.aura.scale.set(2.8 * k, 2.8 * k, 1); }
    const r = ch.root;
    if (ch.kind === 'wolf') {
      const mv = walk || pose === 'attack', ph = t * 12, dead = pose === 'dead', a = mv && !dead ? 0.6 : 0, s = Math.sin(ph), k = Math.sin(sw * PI);
      [s, -s, -s, s].forEach((v, i) => { const l = ch.legs[i]; l.rotation.x = v * a; l.userData.lo.rotation.x = dead ? 0 : (l.userData.rear ? -1 : 1) * Math.max(0, i % 3 === 0 ? Math.cos(ph) : -Math.cos(ph)) * a * 0.9; });
      ch.tail.rotation.y = dead ? 0 : Math.sin(t * 4 + sd) * 0.3; ch.tail.rotation.x = Math.sin(t * 2 + sd) * 0.1 + (mv ? -0.5 : 0);
      r.position.set(0, dead ? 0.14 : mv ? Math.abs(s) * 0.035 : Math.sin(t * 2.2 + sd) * 0.008, pose === 'attack' ? k * 0.3 : 0);
      r.rotation.set(pose === 'attack' ? -k * 0.4 : pose === 'hit' ? 0.22 : 0, 0, dead ? 1.5 : 0);
      return;
    }
    if (ch.kind === 'spider') {
      const mv = walk || pose === 'attack', dead = pose === 'dead', k = Math.sin(sw * PI);
      for (const l of ch.legs) { const u = l.userData, ph = t * (mv ? 14 : 2) + u.i * 1.7 + (u.s > 0 ? 0 : 1.57); l.rotation.y = u.y0 + (dead ? 0 : Math.sin(ph) * (mv ? 0.3 : 0.05)); l.rotation.z = dead ? u.s * 0.9 : u.s * Math.max(0, Math.cos(ph)) * (mv ? 0.16 : 0.02); }
      r.position.set(0, dead ? 0.5 : (pose === 'attack' ? k * 0.3 : 0) + Math.sin(t * 2.4 + sd) * 0.012, pose === 'attack' ? k * 0.2 : 0);
      r.rotation.set(pose === 'hit' ? 0.25 : pose === 'attack' ? -k * 0.3 : 0, 0, dead ? PI : 0);
      return;
    }
    if (ch.kind === 'spirit') {
      const dead = pose === 'dead', k = Math.sin(sw * PI);
      r.position.set(pose === 'hit' ? Math.sin(t * 60) * 0.03 : 0, (dead ? 0.3 : 0.72) + Math.sin(t * 2.6 + sd) * 0.06, pose === 'attack' ? k * 0.35 : 0);
      const s = dead ? 0.6 : pose === 'hit' ? 0.86 : 1 + Math.sin(t * 5 + sd) * 0.03; r.scale.set(s, s * (pose === 'attack' ? 1 + k * 0.2 : 1), s);
      ch.wisps.forEach((w, i) => { const a = t * 2.2 + i * 2.094 + sd; w.position.set(Math.cos(a) * 0.34, Math.sin(a * 1.3) * 0.12, Math.sin(a) * 0.34); });
      ch.shell.scale.setScalar(0.29 + Math.sin(t * 4 + sd) * 0.015);
      return;
    }
    const still = !!ch.glb, br = still ? 0 : Math.sin(t * 1.6 + sd), sway = still ? 0 : 1;   // 外部模型站立时身体静止（衣物的飘动在着色器里）
    let aL = 0.04 + br * 0.02, aLz = 0.07, eL = -0.22 - br * 0.02, aR, aRz = -0.07, eR = -0.22, lL = -0.03, lR = 0.03, kL = 0.04, kR = 0.04, lean = 0.02 + br * 0.006, tw = 0, y = br * 0.003, rx = 0, hx = Math.sin(t * 0.9 + sd) * 0.03 * sway, hy = Math.sin(t * 0.5 + sd * 2) * 0.09 * sway, z = 0, tR = 0, wR = 0, hR = 0;
    if (ch.nowp) aR = 0.04 - br * 0.02; else if (ch.staff) { aR = -0.1; aRz = -0.1; eR = -0.1; } else { aR = -0.2 + br * 0.02; aRz = -0.13; eR = -0.5; }
    // 外部模型的站姿：自然直立，双腿伸直、上身不前倾，双臂垂在身侧；持兵器的手腕下压，让剑尖斜指地面
    if (still) { aL = 0.03; aLz = 0.05; eL = -0.16; lL = 0; lR = 0; kL = 0; kR = 0; lean = 0; if (!ch.nowp && !ch.staff) { aR = 0.1; aRz = -0.08; eR = -0.06; hR = 0.9; } }
    // 展示姿势（封面）：持扇者小臂横在身前、掌心朝内，扇面朝向观众
    // 上臂前摆会让扇面后仰，用转腕 wR 抵消，使扇面立起并略向前倾
    if (pose === 'show' && ch.look && ch.look.wp === 'fan') { aR = -0.46 + br * 0.015; aRz = -0.05; tR = 1.38; eR = -1.22 - br * 0.02; wR = -0.6; hR = 0; }
    let k = ch.A ? 1 - Math.exp(-dt * 14) : 1;
    if (pose === 'dead') { rx = -PI / 2 + 0.03; y = 0.12; aLz = 0.55; aRz = -0.55; aL = 0; aR = 0; eL = -0.25; eR = -0.2; lL = 0.06; lR = -0.08; kL = 0.12; kR = 0; hx = 0; hy = 0.4; lean = 0; }
    else if (pose === 'hit') { lean = -0.34; aL = -0.5; aLz = 0.5; aR = -0.4; aRz = -0.5; eL = -0.8; eR = -0.6; hx = -0.3; hy = 0; lL = -0.16; kL = 0.3; lR = 0.3; kR = 0.2; rx = -0.06; k = Math.max(k, 0.5); }
    else if (pose === 'attack') { const e = sw * sw * (3 - 2 * sw); aR = lerp(-2.7, -0.75, e); eR = lerp(-1.3, -0.1, e); aRz = lerp(-0.5, -0.1, e); tw = lerp(-0.45, 0.4, e); lean = lerp(-0.1, 0.3, e); aL = 0.45; eL = -0.9; aLz = 0.28; lL = lerp(-0.1, -0.75, e); kL = lerp(0.2, 0.85, e); lR = lerp(0.05, 0.5, e); kR = 0.08; y = -0.075 * e; z = e * 0.2; hy = 0; k = 1; }
    else if (pose === 'cast') { aL = -1.45 + Math.sin(t * 6) * 0.05; aR = aL; aLz = -0.35; aRz = 0.35; eL = -0.85; eR = -0.85; lean = -0.05; y = 0.01 + Math.sin(t * 5) * 0.008; hx = -0.1; hy = 0; lL = -0.1; lR = 0.12; }
    else if (pose === 'dodge') { lean = -0.3; tw = 0.5; z = -0.22; aL = -0.3; aLz = 0.5; aR = -0.3; aRz = -0.5; lL = 0.3; kL = 0.3; lR = -0.2; kR = 0.5; y = -0.05; k = Math.max(k, 0.4); }
    else if (pose === 'victory') { aR = -2.6; aRz = -0.2; eR = -0.3; aL = 0.1; lean = -0.06; hx = -0.15; hy = 0; }
    else if (pose === 'guard') { aL = -1.1; aLz = -0.7; eL = -1.5; aR = -1.2; aRz = 0.55; eR = -1.3; lean = 0.12; lL = -0.35; kL = 0.7; lR = 0.25; kR = 0.5; y = -0.06; hx = 0.08; hy = 0; }
    else if (walk) {
      const ph = t * 9.5, s = Math.sin(ph), c = Math.cos(ph);
      lL = s * 0.52; lR = -lL; kL = Math.max(0, -c) * 0.95 + 0.08; kR = Math.max(0, c) * 0.95 + 0.08;
      aL = -lL * 0.7; eL = -0.3 - Math.max(0, -aL) * 0.35;
      if (ch.nowp) { aR = -lR * 0.7; eR = -0.3 - Math.max(0, -aR) * 0.35; } else if (ch.staff) { aR = -0.25 - lR * 0.2; eR = -0.2; } else { aR = -0.25 - lR * 0.3; eR = -0.6; }
      tw = s * 0.09; y = Math.abs(c) * 0.026 - 0.016; lean = 0.07; hy = 0;
    }
    if (pose !== 'idle' && pose !== 'show') hR = 0;
    const tg = { aL, aR, aLz, aRz, eL, eR, lL, lR, kL, kR, lean, tw, y, rx, hx, hy, z, tR, wR, hR };
    if (!ch.A) ch.A = {};
    const A = ch.A;
    for (const key of KEYS) A[key] = A[key] == null ? tg[key] : A[key] + (tg[key] - A[key]) * k;
    if (ch.glb) { K.poseModel(ch, A, { pose, walk, dt, t, swing: sw, look: o.look, blink: o.blink, act: o.act, lead: o.lead, from: o.from, to: o.to, loop: o.loop, stance: o.stance, level: o.level, at: o.at, gait: o.gait, fly: o.fly, calm: o.calm }); return; }   // 外部模型：有动捕片段的动作播放片段，其余用同一套参数驱动骨骼
    ch.aL.rotation.set(A.aL, 0, A.aLz); ch.aR.rotation.set(A.aR, A.tR, A.aRz); ch.fL.rotation.x = A.eL; ch.fR.rotation.set(A.eR, A.wR, 0);
    ch.lL.rotation.x = A.lL; ch.lR.rotation.x = A.lR; ch.kL.rotation.x = A.kL; ch.kR.rotation.x = A.kR;
    ch.up.rotation.set(A.lean, A.tw, 0); ch.head.rotation.set(A.hx - A.lean * 0.6, A.hy - A.tw * 0.6, 0);
    r.position.set(0, A.y, A.z); r.rotation.x = A.rx;
    ch.mat.userData.uLeg.value.set(A.lL, A.lR, 0.95);
    ch.lids.visible = pose === 'hit' || pose === 'dead' || ((t * 0.9 + sd * 1.7) % 4.2) < 0.13;
    if (ch.tail) ch.tail.rotation.x = 0.1 + (walk ? 0.35 + Math.sin(t * 9.5) * 0.1 : Math.sin(t * 1.6 + sd) * 0.05) - A.lean;
    if (ch.cape) ch.cape.rotation.x = 0.05 + (walk ? 0.3 : 0) + Math.sin(t * 1.7 + sd) * 0.04 - A.lean * 0.8 + (pose === 'attack' ? 0.35 : 0);
    if (ch.wings) { const w = 0.45 + Math.sin(t * 2.4 + sd) * 0.2; ch.wings[0].rotation.y = w; ch.wings[1].rotation.y = -w; }
  }

  K.mkChar = mkChar; K.kill = kill; K.tint = tint; K.animate = animate;
  K.procHuman = mkHuman;                                                    // 供 g3model.js 取程序人物的身高
  K.mkWeapon = L => { const a = nb(); weapon(a, L, 0); return a.geo(); };   // 单独的兵器网格（握把在原点）
})();
