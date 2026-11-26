'use strict';
/* ============ 3D 渲染核心：渲染器、线性光照 + HDR 后期、几何合并工具、PBR 材质 ============ */
const G3 = (() => {
  const g3 = { ok: false };
  const cvs = document.getElementById('gl'), QS = location.search;
  if (typeof THREE === 'undefined' || !cvs || /[?&]2d=1/.test(QS)) { if (cvs) cvs.style.display = 'none'; return g3; }
  // 探测是否支持浮点渲染目标（HDR 后期与环境光照都依赖它）
  let hdr = false;
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    hdr = !!(gl && gl.getExtension('EXT_color_buffer_float'));
    const lose = gl && gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
  } catch (e) { hdr = false; }
  const POST = hdr && !/[?&]post=0/.test(QS);

  /* ---------- 画质设置（右上角“画质”按钮打开的面板） ----------
     档位 gmode：auto 自动（按帧率自动降多重采样和分辨率）/ high 高清 / fast 流畅（分辨率降到七成）/ low 低配（集成显卡用）。
     各分项（GFX_OPT）在档位的基础上还可以单独改（gover 记着改过的几项）。分项分两类：
       live = 1 改了立刻生效；live = 0 是建场景、载模型的时候用的，要刷新页面才生效——这些一律读开局时的那一份（g3.gfxBoot）。
     任何一档都不动四位主角的模型、贴图和材质；低配只简化景物、其他人物与后期，分辨率保持原样（只有“流畅”会降分辨率，主角也跟着变糊）。 */
  const GFX_DEF = { msaa: 4, bloom: 1, ss: 1, cap: 0, anim: 1, shadow: 2, scene: 1, veg: 1, npcTex: 0, npcShadow: 1 };
  // 低配不封帧率：封在 30 帧时，镜头跟着主角平移，画面一格一格地跳，招牌上的字、人物这些对比强的细节看着在抖、在闪（30 帧平移的通病）。
  // 30 帧留作可选：显卡实在跟不上、或者想省电时再开
  const GFX_PRE = { auto: {}, high: {}, fast: {}, low: { msaa: 0, bloom: 0, ss: 0, cap: 0, anim: 2, shadow: 1, scene: 0, veg: 0.5, npcTex: 1024, npcShadow: 0 } };
  const GFX_OPT = [   // [键, 名称, [[值, 说明]…], 是否立刻生效]
    ['msaa', '多重采样抗锯齿', [[4, '4 倍'], [2, '2 倍'], [0, '关（只用后期抗锯齿）']], 1],
    ['bloom', '泛光', [[1, '开'], [0, '关']], 1],
    ['ss', '过场与标题的超采样', [[1, '开'], [0, '关']], 1],
    ['cap', '帧率上限', [[0, '不限'], [30, '30 帧（省电，镜头移动时画面会发顿、发抖）']], 1],
    ['anim', '其他人物的动作', [[1, '每帧计算'], [2, '隔一帧计算']], 1],
    ['shadow', '阴影', [[2, '精细（2048，柔边）'], [1, '普通（1024，硬边）']], 0],
    ['scene', '景物材质', [[1, '精细'], [0, '简化（不算环境反射与细部凹凸）']], 0],
    ['veg', '草丛', [[1, '正常'], [0.5, '减半']], 0],
    ['npcTex', '其他人物的贴图', [[0, '原样'], [1024, '缩小，不用法线与粗糙度贴图']], 0],
    ['npcShadow', '其他人物的投影', [[1, '实时投影'], [0, '只用脚下的圆影']], 0]
  ];
  const GFX_MODE = { auto: '自动', high: '高清', fast: '流畅', low: '低配' };
  let gmode = 'auto', gover = {};
  try { const q = localStorage.getItem('yunlan_quality'); if (GFX_PRE[q]) gmode = q; const o = JSON.parse(localStorage.getItem('yunlan_gfx')); if (o && typeof o === 'object') gover = o; } catch (e) { }
  { const m = /[?&]gfx=(\w+)/.exec(QS); if (m && GFX_PRE[m[1]]) { gmode = m[1]; gover = {}; } }   // ?gfx=low：只这一次按某一档开（不存）
  const gfx = g3.gfx = Object.assign({}, GFX_DEF, GFX_PRE[gmode], gover), gfxBoot = g3.gfxBoot = Object.assign({}, gfx);
  const LITE = !gfxBoot.scene;   // 景物用简化材质

  let R;
  try { R = new THREE.WebGLRenderer({ canvas: cvs, antialias: !POST, powerPreference: 'high-performance' }); }
  catch (e) { cvs.style.display = 'none'; return g3; }
  R.shadowMap.enabled = true; R.shadowMap.type = gfxBoot.shadow >= 2 ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  R.outputEncoding = POST ? THREE.LinearEncoding : THREE.sRGBEncoding;
  R.toneMapping = POST ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
  R.info.autoReset = false;
  g3.ok = true; g3.hdr = hdr; g3.post = POST;

  const V3 = THREE.Vector3, M4 = THREE.Matrix4;
  const _v = new V3(), _a = new V3(), _b = new V3(), _s = new V3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _n3 = new THREE.Matrix3();
  const _c1 = new THREE.Color(), _c2 = new THREE.Color(), UP = new V3(0, 1, 0);

  /* ---------- 颜色：一律转到线性空间再参与光照 ---------- */
  const linC = {};
  const lin = hex => linC[hex] || (linC[hex] = (() => { _c1.set(hex).convertSRGBToLinear(); return [_c1.r, _c1.g, _c1.b]; })());
  const LC = (hex, k) => { const c = new THREE.Color(hex).convertSRGBToLinear(); if (k != null) c.multiplyScalar(k); return c; };

  /* ---------- 基础几何（单位尺寸，带缓存） ---------- */
  const gc = {};
  const ni = g => g.index ? g.toNonIndexed() : g;
  const geo = (k, f) => { if (!gc[k]) { gc[k] = ni(f()); gc[k]._keep = true; } return gc[k]; };
  const sph = (ws, hs, ps, pl, ts, tl) => geo('s' + [ws, hs, ps, pl, ts, tl].join(), () => new THREE.SphereGeometry(1, ws || 12, hs || 8, ps || 0, pl == null ? TAU : pl, ts || 0, tl == null ? Math.PI : tl));
  const box = () => geo('b', () => new THREE.BoxGeometry(1, 1, 1));
  const cyl = (rt, seg, open) => geo('c' + [rt, seg, open].join(), () => new THREE.CylinderGeometry(rt == null ? 1 : rt, 1, 1, seg || 8, 1, !!open));
  const ico = d => geo('i' + d, () => new THREE.IcosahedronGeometry(1, d));
  const lathe = (pts, seg) => geo('l' + pts.join() + '_' + seg, () => new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg || 14));
  function M(x, y, z, sx, sy, sz, rx, ry, rz) {
    if (sx == null) sx = 1; if (sy == null) sy = sx; if (sz == null) sz = sx;
    _q.setFromEuler(_e.set(rx || 0, ry || 0, rz || 0));
    return new M4().compose(_v.set(x, y, z), _q, _s.set(sx, sy, sz));
  }

  /* ---------- 几何合并器：把许多带颜色、带材质参数的部件合成一个网格 ----------
     每个顶点带：位置、法线、线性颜色、pbr(粗糙度, 金属度, 细节强度, 细节频率/64)。 */
  const MATS = {
    cloth: [0.86, 0, 0.22, 0.45], silk: [0.5, 0, 0.12, 0.45], leather: [0.6, 0, 0.4, 0.3], skin: [0.56, 0, 0.08, 0.5], hair: [0.5, 0, 0, 0],
    metal: [0.3, 1, 0.12, 0.3], gold: [0.34, 1, 0.1, 0.3], wood: [0.78, 0, 0.7, 0.05], bark: [0.95, 0, 1, 0.035], stone: [0.92, 0, 1, 0.02],
    leaf: [0.62, 0, 0.3, 0.04], plaster: [0.9, 0, 0.6, 0.012], tile: [0.5, 0, 0.6, 0.03], fur: [0.9, 0, 0.9, 0.16], gem: [0.12, 0, 0, 0], plain: [0.9, 0, 0.3, 0.03]
  };
  function GB() { this.P = []; this.N = []; this.C = []; this.B = []; this.K = null; this.T = null; this.tu = 0; this.tv = 0; this.pb = [230, 0, 77, 8]; this.em = 1; this.skf = null; }
  const gp = GB.prototype;
  gp.m = function (r, mt, d, f) { if (typeof r === 'string') { const a = MATS[r]; r = a[0]; mt = a[1]; d = a[2]; f = a[3]; } this.pb = [Math.round(r * 255), Math.round((mt || 0) * 255), Math.round((d || 0) * 255), Math.round((f || 0) * 255)]; return this; };
  gp.glow = function (k) { this.em = k; return this; };
  gp.v = function (x, y, z, nx, ny, nz, r, g, b) {
    this.P.push(x, y, z); this.N.push(nx, ny, nz); this.C.push(r, g, b); const p = this.pb; this.B.push(p[0], p[1], p[2], p[3]);
    if (this.K) { if (this.skf) this.skf(x, y, z, this.K); else this.K.push(0, 0); }
    if (this.T) this.T.push(this.tu, this.tv);
  };
  gp.add = function (g, m, col, col2) {
    const P = g.attributes.position, N = g.attributes.normal, SH = g.attributes.shade, n = P.count, grad = col2 != null, em = this.em;
    _n3.getNormalMatrix(m); const a = lin(col), b = grad ? lin(col2) : a;
    let y0 = 0, yr = 1;
    if (grad) { if (!g.boundingBox) g.computeBoundingBox(); y0 = g.boundingBox.min.y; yr = (g.boundingBox.max.y - y0) || 1; }
    for (let i = 0; i < n; i++) {
      _v.fromBufferAttribute(P, i); const k = grad ? (_v.y - y0) / yr : 0, q = (SH ? SH.getX(i) : 1) * em;
      _v.applyMatrix4(m); const x = _v.x, y = _v.y, z = _v.z;
      _v.fromBufferAttribute(N, i).applyMatrix3(_n3).normalize();
      this.v(x, y, z, _v.x, _v.y, _v.z, (a[0] + (b[0] - a[0]) * k) * q, (a[1] + (b[1] - a[1]) * k) * q, (a[2] + (b[2] - a[2]) * k) * q);
    }
    return this;
  };
  gp.s = function (x, y, z, sx, sy, sz, col, col2, rx, ry, rz) { return this.add(sph(12, 8), M(x, y, z, sx, sy, sz, rx, ry, rz), col, col2); };
  gp.b = function (x, y, z, sx, sy, sz, col, rx, ry, rz, col2) { return this.add(box(), M(x, y, z, sx, sy, sz, rx, ry, rz), col, col2); };
  gp.c = function (x, y, z, r, h, col, rt, seg, col2, rx, ry, rz) { return this.add(cyl(rt, seg), M(x, y, z, r, h, r, rx, ry, rz), col, col2); };
  gp.stick = function (a, b, r0, r1, col, seg, col2) {
    _a.set(a[0], a[1], a[2]); _b.set(b[0], b[1], b[2]);
    const d = _b.clone().sub(_a), len = d.length() || 0.001; d.multiplyScalar(1 / len);
    const m = new M4().compose(_a.clone().add(_b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(UP, d), new V3(r0, len, r0));
    return this.add(cyl(Math.round((r1 == null ? r0 : r1) / r0 * 20) / 20, seg || 6), m, col, col2);
  };
  /* 参数曲面：f(u,v,out) 给出位置；法线由相邻格点差分得到，可表现衣褶、发丝、瓦垄等起伏。
     col：颜色字符串 | [c0,c1] 沿 v 渐变 | function(u,v,p,out) 直接写线性 RGB。
     o：{closed: u 方向闭合, flip: 翻面, two: 双面, m: 变换矩阵} */
  gp.surf = function (nu, nv, f, col, o) {
    o = o || {};
    const W = nu + 1, H = nv + 1, n = W * H, P = new Float32Array(n * 3), Nn = new Float32Array(n * 3), Cc = new Float32Array(n * 3), out = [0, 0, 0], pc = [0, 0, 0], em = this.em;
    const cf = typeof col === 'function' ? col : null, c0 = cf ? null : lin(Array.isArray(col) ? col[0] : col), c1 = cf ? null : Array.isArray(col) ? lin(col[1]) : c0;
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const k = (j * W + i) * 3, u = i / nu, v = j / nv;
      f(u, v, out);
      if (o.m) { _v.set(out[0], out[1], out[2]).applyMatrix4(o.m); out[0] = _v.x; out[1] = _v.y; out[2] = _v.z; }
      P[k] = out[0]; P[k + 1] = out[1]; P[k + 2] = out[2];
      if (cf) { pc[0] = out[0]; pc[1] = out[1]; pc[2] = out[2]; cf(u, v, pc, out); } else { out[0] = c0[0] + (c1[0] - c0[0]) * v; out[1] = c0[1] + (c1[1] - c0[1]) * v; out[2] = c0[2] + (c1[2] - c0[2]) * v; }
      Cc[k] = out[0] * em; Cc[k + 1] = out[1] * em; Cc[k + 2] = out[2] * em;
    }
    const sg = o.flip ? -1 : 1;
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const i0 = i > 0 ? i - 1 : o.closed ? nu - 1 : 0, i1 = i < nu ? i + 1 : o.closed ? 1 : nu, j0 = j > 0 ? j - 1 : 0, j1 = j < nv ? j + 1 : nv;
      const a = (j * W + i0) * 3, b = (j * W + i1) * 3, c = (j0 * W + i) * 3, d = (j1 * W + i) * 3, k = (j * W + i) * 3;
      const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[d] - P[c], vy = P[d + 1] - P[c + 1], vz = P[d + 2] - P[c + 2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz);
      if (l < 1e-12) { nx = 0; ny = sg; nz = 0; } else { nx *= sg / l; ny *= sg / l; nz *= sg / l; }
      Nn[k] = nx; Nn[k + 1] = ny; Nn[k + 2] = nz;
    }
    const put = (k, s) => this.v(P[k], P[k + 1], P[k + 2], Nn[k] * s, Nn[k + 1] * s, Nn[k + 2] * s, Cc[k], Cc[k + 1], Cc[k + 2]);
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const a = (j * W + i) * 3, b = a + 3, c = a + W * 3, d = c + 3;
      if (!o.flip || o.two) { put(a, sg); put(b, sg); put(c, sg); put(b, sg); put(d, sg); put(c, sg); }
      if (o.flip || o.two) { put(a, -sg); put(c, -sg); put(b, -sg); put(b, -sg); put(c, -sg); put(d, -sg); }
    }
    return this;
  };
  /* 沿折线的管体：rad 可为数字、每点数组，或 [rx, rz] 椭圆截面。cap 位：1 起点封口 2 终点封口 */
  gp.tube = function (pts, rad, seg, col, col2, o) {
    o = o || {}; const n = pts.length, cap = o.cap == null ? 3 : o.cap, C = [], Rr = [];
    const rOf = i => { const r = Array.isArray(rad) ? rad[Math.min(i, rad.length - 1)] : rad; return Array.isArray(r) ? r : [r, r]; };
    for (let i = 0; i < n; i++) { C.push(pts[i]); Rr.push(rOf(i)); }
    if (cap & 1) { const p = C[0], q = C[1], r = Rr[0], l = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]) || 1, e = Math.max(r[0], r[1]) * 0.55 / l; C.unshift([p[0] - (q[0] - p[0]) * e, p[1] - (q[1] - p[1]) * e, p[2] - (q[2] - p[2]) * e]); Rr.unshift([r[0] * 0.04, r[1] * 0.04]); C.splice(1, 0, [p[0] - (q[0] - p[0]) * e * 0.6, p[1] - (q[1] - p[1]) * e * 0.6, p[2] - (q[2] - p[2]) * e * 0.6]); Rr.splice(1, 0, [r[0] * 0.7, r[1] * 0.7]); }
    if (cap & 2) { const m = C.length, p = C[m - 1], q = C[m - 2], r = Rr[m - 1], l = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]) || 1, e = Math.max(r[0], r[1]) * 0.55 / l; C.push([p[0] - (q[0] - p[0]) * e * 0.6, p[1] - (q[1] - p[1]) * e * 0.6, p[2] - (q[2] - p[2]) * e * 0.6]); Rr.push([r[0] * 0.7, r[1] * 0.7]); C.push([p[0] - (q[0] - p[0]) * e, p[1] - (q[1] - p[1]) * e, p[2] - (q[2] - p[2]) * e]); Rr.push([r[0] * 0.04, r[1] * 0.04]); }
    const m = C.length, T = [], Nv = [], Bv = [];
    for (let i = 0; i < m; i++) { const a = C[Math.max(0, i - 1)], b = C[Math.min(m - 1, i + 1)]; T.push(new V3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize()); }
    const hint = o.n ? new V3(o.n[0], o.n[1], o.n[2]) : Math.abs(T[0].y) < 0.9 ? new V3(0, 1, 0) : new V3(1, 0, 0);
    let N0 = hint.clone().addScaledVector(T[0], -hint.dot(T[0])).normalize();
    for (let i = 0; i < m; i++) { if (i > 0) N0 = N0.clone().addScaledVector(T[i], -N0.dot(T[i])).normalize(); Nv.push(N0); Bv.push(new V3().crossVectors(T[i], N0)); }
    const ca = lin(col), cb = col2 ? lin(col2) : ca, i0 = (cap & 1) ? 2 : 0, span = Math.max(1, n - 1);
    return this.surf(seg || 8, m - 1, (u, v, out) => {
      const j = Math.round(v * (m - 1)), a = u * TAU, cs = Math.cos(a) * Rr[j][0], sn = Math.sin(a) * Rr[j][1], c = C[j], N = Nv[j], B = Bv[j];
      out[0] = c[0] + N.x * cs + B.x * sn; out[1] = c[1] + N.y * cs + B.y * sn; out[2] = c[2] + N.z * cs + B.z * sn;
    }, o.cf || ((u, v, p, out) => { const k = clamp((Math.round(v * (m - 1)) - i0) / span, 0, 1); out[0] = ca[0] + (cb[0] - ca[0]) * k; out[1] = ca[1] + (cb[1] - ca[1]) * k; out[2] = ca[2] + (cb[2] - ca[2]) * k; }), { closed: true });
  };
  gp.geo = function () {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.P, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.N, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.C, 3));
    g.setAttribute('pbr', new THREE.Uint8BufferAttribute(this.B, 4, true));
    if (this.K) g.setAttribute('skw', new THREE.Float32BufferAttribute(this.K, 2));
    if (this.T) g.setAttribute('uv', new THREE.Float32BufferAttribute(this.T, 2));
    return g;
  };
  gp.mesh = function (mat, cast, recv) { const me = new THREE.Mesh(this.geo(), mat); me.castShadow = !!cast; me.receiveShadow = !!recv; return me; };
  gp.empty = function () { return this.P.length === 0; };

  /* ---------- 贴图 ---------- */
  function canvasTex(w, h, fn, srgb) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb !== false) t.encoding = THREE.sRGBEncoding; return t; }
  const glowTex = canvasTex(64, 64, c => {
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  }, false);
  function glowSprite(col, size, op, k) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: LC(col, k == null ? 1.6 : k), transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.scale.set(size, size, 1); return s;
  }
  // 细节噪声：R 细颗粒，G 多倍频云纹，B 低频斑块（均可无缝平铺）
  const noiseTex = (() => {
    const N = 256, d = new Uint8Array(N * N * 4), rnd = mulberry32(90210);
    const oct = [4, 8, 16, 32, 64, 128].map(p => { const a = new Float32Array(p * p); for (let i = 0; i < a.length; i++) a[i] = rnd(); return [p, a]; });
    const vn = (o, x, y) => {
      const p = o[0], a = o[1], fx = x * p / N, fy = y * p / N, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty), x1 = (x0 + 1) % p, y1 = (y0 + 1) % p;
      return lerp(lerp(a[y0 * p + x0], a[y0 * p + x1], sx), lerp(a[y1 * p + x0], a[y1 * p + x1], sx), sy);
    };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const k = (y * N + x) * 4;
      const g = vn(oct[1], x, y) * 0.36 + vn(oct[2], x, y) * 0.27 + vn(oct[3], x, y) * 0.19 + vn(oct[4], x, y) * 0.12 + vn(oct[5], x, y) * 0.06;
      d[k] = clamp((vn(oct[5], x, y) * 0.55 + rnd() * 0.45), 0, 1) * 255; d[k + 1] = clamp((g - 0.5) * 2.1 + 0.5, 0, 1) * 255; d[k + 2] = clamp((vn(oct[0], x, y) * 0.6 + vn(oct[1], x, y) * 0.4 - 0.5) * 1.8 + 0.5, 0, 1) * 255; d[k + 3] = 255;
    }
    const t = new THREE.DataTexture(d, N, N, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true; t._keep = true;
    return t;
  })();

  /* ---------- PBR 材质：顶点 pbr 属性 + 三向噪声细节（反照率/粗糙度/凹凸） ----------
     flags：leg 衣摆随腿摆动；see 主角遮挡透视；rim 布料边缘绒光 */
  // uHS / uHG：简化材质的天光与地面反光（低配下景物不算环境反射，改用这一对颜色；每帧由 present 按当前场景换上）
  const U = { uP: { value: new V3() }, uPS: { value: new V3() }, tNoise: { value: noiseTex }, uTime: { value: 0 }, uHS: { value: new THREE.Color(0.5, 0.5, 0.5) }, uHG: { value: new THREE.Color(0.2, 0.2, 0.2) } };
  // 简化材质里补上的天光：法线朝上取天色、朝下取地面反光（与半球光同一算法），代替环境贴图的漫反射
  const HEMI_GLSL = '{ float hk = dot(normal, normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz)) * 0.5 + 0.5; reflectedLight.indirectDiffuse += PI * mix(uHG, uHS, hk) * BRDF_Lambert(diffuseColor.rgb); }\n#include <aomap_fragment>';
  // 简化材质的平行光：漫反射照旧，另把 GGX 高光记进 gSpec（阴影已经乘在 directLight.color 里了，背光处自然没有高光）
  const LAMBERT_SPEC = THREE.ShaderChunk.lights_lambert_pars_fragment.replace('reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );',
    '$&\n\tgSpec += irradiance * BRDF_GGX( directLight.direction, geometry.viewDir, geometry.normal, gF0, 1.0, gRough );');
  function hemiPatch(sh) { sh.uniforms.uHS = U.uHS; sh.uniforms.uHG = U.uHG; sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uHS;\nuniform vec3 uHG;').replace('#include <aomap_fragment>', HEMI_GLSL); }
  // 低配的景物材质：漫反射（Lambert）+ 补上的天光 + 一次噪声细节，不算镜面高光、环境反射和噪声凹凸。风吹草木、主角处的透视照旧
  function patchLite(f) {
    return function (sh) {
      sh.uniforms.tNoise = U.tNoise;
      let vs = sh.vertexShader, fs = sh.fragmentShader;
      vs = vs.replace('#include <common>', '#include <common>\nattribute vec4 pbr;\nvarying vec4 vPbr;\nvarying vec3 vOP;\nvarying vec3 vON;' + (f.see ? '\nvarying vec3 vWP;' : '') + (f.wind ? '\nuniform float uTime;' : ''));
      if (f.wind) sh.uniforms.uTime = U.uTime;
      vs = vs.replace('#include <begin_vertex>', '#include <begin_vertex>\nvPbr = pbr; vOP = position; vON = normal;' + windGLSL(f.wind));
      if (f.see) vs = vs.replace('#include <project_vertex>', '#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      // gSpec：太阳在这一点上的高光（瓦片、漆木的光泽主要来自它），算法同物理材质（GGX），只是不查环境贴图
      fs = fs.replace('#include <common>', '#include <common>\nvarying vec4 vPbr;\nvarying vec3 vOP;\nvarying vec3 vON;\nuniform sampler2D tNoise;\nfloat gRough = 1.0; vec3 gF0 = vec3(0.04); vec3 gSpec = vec3(0.0);' + (f.see ? '\nvarying vec3 vWP;\nuniform vec3 uP;\nuniform vec3 uPS;' : ''));
      fs = fs.replace('#include <lights_lambert_pars_fragment>', LAMBERT_SPEC);
      if (f.see) { sh.uniforms.uP = U.uP; sh.uniforms.uPS = U.uPS; fs = fs.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' + SEE_GLSL); }
      fs = fs.replace('#include <color_fragment>', '#include <color_fragment>\n' +
        'vec3 aN = abs(vON); vec3 dP = vOP * (vPbr.w * 64.0); vec2 dUv = (aN.x > aN.y && aN.x > aN.z) ? dP.yz : (aN.y > aN.z ? dP.xz : dP.xy);\n' +
        'vec3 dN = texture2D(tNoise, dUv).rgb;\ndiffuseColor.rgb *= 1.0 + (dN.g * 0.45 + dN.b * 0.4 + dN.r * 0.15 - 0.5) * vPbr.z * 0.42;\n' +
        'gRough = clamp(vPbr.x + (dN.r - 0.5) * vPbr.z * 0.25, 0.08, 1.0); gF0 = mix(vec3(0.04), diffuseColor.rgb, vPbr.y);');
      if (f.keepN) fs = fs.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\nnormal = normalize(vNormal);');
      // 近似的天光反射：不查环境贴图，按视线的反射方向朝上还是朝下取天色或地色，乘菲涅耳和光滑度。
      // 瓦片、漆木、金属件靠它保住一层光泽，不然整片发闷、发艳；金属件的漫反射相应减掉
      fs = fs.replace('#include <aomap_fragment>',
        '{ vec3 vd = normalize(vViewPosition); float NoV = saturate(dot(normal, vd)); vec3 upV = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);\n' +
        ' float rk = dot(reflect(-vd, normal), upV) * 0.5 + 0.5; vec3 F0 = gF0; totalEmissiveRadiance += gSpec;\n' +
        // 环境反射的“镜面系数”用物理材质同一套近似（Karis 的 EnvBRDFApprox）
        ' vec4 rr = vPbr.x * vec4(-1.0, -0.0275, -0.572, 0.022) + vec4(1.0, 0.0425, 1.04, -0.04); float a4 = min(rr.x * rr.x, exp2(-9.28 * NoV)) * rr.x + rr.y; vec2 AB = vec2(-1.04, 1.04) * a4 + rr.zw;\n' +
        ' reflectedLight.directDiffuse *= 1.0 - vPbr.y; diffuseColor.rgb *= 1.0 - vPbr.y; totalEmissiveRadiance += mix(uHG, uHS, rk) * (F0 * AB.x + AB.y); }\n#include <aomap_fragment>');
      sh.vertexShader = vs; sh.fragmentShader = fs;
      hemiPatch(sh);
    };
  }
  // 草木随风摆动（wind 1 树叶、2 草丛），两种材质共用
  const windGLSL = w => (w === 2 ? '\n{ float wk = max(position.y, 0.0); float wp = uTime * 1.7 + position.x * 0.9 + position.z * 0.7; transformed.x += sin(wp) * 0.7 * wk * wk; transformed.z += cos(wp * 0.8) * 0.4 * wk * wk; }' : '') +
    (w === 1 ? '\n{ float wk = clamp(position.y - 0.6, 0.0, 3.0); float wp = uTime * 1.3 + position.x * 0.5 + position.z * 0.4; transformed.x += sin(wp) * 0.02 * wk + sin(uTime * 4.3 + position.x * 9.0 + position.y * 7.0) * 0.007; transformed.z += cos(wp * 0.9) * 0.013 * wk; }' : '');
  // 主角被房檐树冠挡住时，挡住的那一小圈打散成点阵，透出主角
  const SEE_GLSL = 'if (uPS.z > 0.0 && vWP.z > uP.z + 0.3 && vWP.y > 0.1) {\n vec2 dd = (gl_FragCoord.xy - uPS.xy) / uPS.z; dd.y *= 0.8;\n float kk = dot(dd, dd);\n' +
    ' if (kk < 1.0) { float nz = fract(52.9829189 * fract(dot(floor(gl_FragCoord.xy), vec2(0.06711056, 0.00583715)))); if (nz > kk * kk * 0.75 + 0.12) discard; }\n}';
  function patch(f) {
    return function (sh) {
      sh.uniforms.tNoise = U.tNoise;
      let vs = sh.vertexShader, fs = sh.fragmentShader;
      vs = vs.replace('#include <common>', '#include <common>\nattribute vec4 pbr;\nvarying vec4 vPbr;\nvarying vec3 vOP;\nvarying vec3 vON;' + (f.leg ? '\nattribute vec2 skw;\nuniform vec3 uLeg;' : '') + (f.see ? '\nvarying vec3 vWP;' : '') + (f.wind ? '\nuniform float uTime;' : ''));
      if (f.wind) sh.uniforms.uTime = U.uTime;
      vs = vs.replace('#include <begin_vertex>', '#include <begin_vertex>\nvPbr = pbr; vOP = position; vON = normal;' +
        (f.leg ? '\n{ float la = dot(uLeg.xy, skw); float lc = cos(la), ls = sin(la); float ly = transformed.y - uLeg.z; transformed = vec3(transformed.x, uLeg.z + ly * lc - transformed.z * ls, ly * ls + transformed.z * lc); }' : '') +
        windGLSL(f.wind));
      if (f.keepN) fs = fs.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\nnormal = normalize(vNormal);');
      if (f.see) vs = vs.replace('#include <project_vertex>', '#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      fs = fs.replace('#include <common>', '#include <common>\nvarying vec4 vPbr;\nvarying vec3 vOP;\nvarying vec3 vON;\nuniform sampler2D tNoise;' + (f.see ? '\nvarying vec3 vWP;\nuniform vec3 uP;\nuniform vec3 uPS;' : ''));
      if (f.see) {
        sh.uniforms.uP = U.uP; sh.uniforms.uPS = U.uPS;
        fs = fs.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' + SEE_GLSL);
      }
      fs = fs.replace('#include <color_fragment>', '#include <color_fragment>\n' +
        'vec3 dW = vON * vON; dW /= (dW.x + dW.y + dW.z + 0.00001);\nvec3 dP = vOP * (vPbr.w * 64.0);\n' +
        'vec3 dN = texture2D(tNoise, dP.yz).rgb * dW.x + texture2D(tNoise, dP.xz).rgb * dW.y + texture2D(tNoise, dP.xy).rgb * dW.z;\n' +
        'float dH = dN.g;\ndiffuseColor.rgb *= 1.0 + (dN.g * 0.45 + dN.b * 0.4 + dN.r * 0.15 - 0.5) * vPbr.z * 0.42;');
      fs = fs.replace('#include <roughnessmap_fragment>', 'float roughnessFactor = clamp(vPbr.x + (dN.r - 0.5) * vPbr.z * 0.25, 0.05, 1.0);');
      fs = fs.replace('#include <metalnessmap_fragment>', 'float metalnessFactor = vPbr.y;');
      fs = fs.replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' +
        '{ vec3 bx = dFdx(-vViewPosition), by = dFdy(-vViewPosition); float hx = dFdx(dH), hy = dFdy(dH);\n vec3 r1 = cross(by, normal), r2 = cross(normal, bx); float det = dot(bx, r1);\n' +
        ' vec3 gr = sign(det) * (hx * r1 + hy * r2); float bs = vPbr.z * 0.022 / (vPbr.w * 64.0 + 0.01);\n normal = normalize(abs(det) * normal - bs * gr); }');
      if (f.rim) fs = fs.replace('#include <output_fragment>',
        'float rimK = pow(1.0 - saturate(dot(normalize(vViewPosition), normal)), 3.0) * (1.0 - metalnessFactor);\noutgoingLight += diffuseColor.rgb * rimK * 0.5;\n#include <output_fragment>');
      if (f.map) {
        // 镂空贴图的边缘抗锯齿：把透明度在边缘处收紧成一像素宽的过渡，交给多重采样按覆盖率处理（alpha to coverage），
        // 叶片和草的轮廓就不再是一格一格的硬边。不透明材质的输出透明度会被置 1，这里手动写回
        fs = fs.replace('#include <alphatest_fragment>', '#ifdef USE_ALPHATEST\ndiffuseColor.a = clamp((diffuseColor.a - alphaTest) / max(fwidth(diffuseColor.a), 0.0001) + 0.5, 0.0, 1.0);\nif (diffuseColor.a < 0.02) discard;\n#endif');
        fs = fs.replace('#include <output_fragment>', 'float a2cA = diffuseColor.a;\n#include <output_fragment>\ngl_FragColor.a = a2cA;');
      }
      if (f.leg) sh.uniforms.uLeg = this.userData.uLeg;
      sh.vertexShader = vs; sh.fragmentShader = fs;
    };
  }
  function stdMat(f) {
    f = f || {};
    // scene：景物用的材质。低配时换成简化材质（人物、兵刃不带这个标记，始终是完整的 PBR）
    if (LITE && f.scene) {
      const m = new THREE.MeshLambertMaterial({ vertexColors: true, side: f.two ? THREE.DoubleSide : THREE.FrontSide });
      if (f.map) { m.map = f.map; m.alphaTest = f.alphaTest || 0.42; }
      m.onBeforeCompile = patchLite(f); m.customProgramCacheKey = () => 'g3lite' + (f.see ? 'S' : '') + (f.keepN ? 'N' : '') + (f.wind || '') + (f.map ? 'M' : '');
      return m;
    }
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, side: f.two ? THREE.DoubleSide : THREE.FrontSide });
    if (f.leg) m.userData.uLeg = { value: new V3(0, 0, 0.93) };
    if (f.map) { m.map = f.map; m.alphaTest = f.alphaTest || 0.42; m.alphaToCoverage = true; }
    m.onBeforeCompile = patch(f); m.customProgramCacheKey = () => 'g3' + (f.leg ? 'L' : '') + (f.see ? 'S' : '') + (f.rim ? 'R' : '') + (f.keepN ? 'N' : '') + (f.wind || '') + (f.map ? 'M' : '');
    return m;
  }
  const matGlow = new THREE.MeshBasicMaterial({ vertexColors: true }); matGlow._keep = true;

  /* ---------- 环境光照：由程序天空烘出 PMREM，供 PBR 的漫反射与镜面反射使用 ---------- */
  const envs = {};
  function envFor(key, top, hor, gnd, sunC, dir) {
    if (!hdr) return null;
    if (envs[key]) return envs[key];
    const sc = new THREE.Scene(), d = new V3(dir[0], dir[1], dir[2]).normalize();
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { cT: { value: top }, cH: { value: hor }, cG: { value: gnd }, cS: { value: sunC }, uD: { value: d } },
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 cT; uniform vec3 cH; uniform vec3 cG; uniform vec3 cS; uniform vec3 uD; varying vec3 vD;\n' +
        'void main(){ vec3 d = normalize(vD); vec3 c = d.y > 0.0 ? mix(cH, cT, pow(d.y, 0.55)) : mix(cH, cG, pow(-d.y, 0.35));\n' +
        ' float s = max(dot(d, uD), 0.0); c += cS * (pow(s, 24.0) * 0.5 + pow(s, 400.0) * 6.0); gl_FragColor = vec4(c, 1.0); }'
    });
    sc.add(new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), mat));
    const pm = new THREE.PMREMGenerator(R), rt = pm.fromScene(sc, 0.03, 0.1, 100);
    pm.dispose(); mat.dispose(); rt.texture._keep = true;
    return envs[key] = rt.texture;
  }

  /* ---------- HDR 后期：多级泛光 + ACES 色调映射 + sRGB 输出 ---------- */
  const fsQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)), fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), fsScene = new THREE.Scene();
  fsQuad.frustumCulled = false; fsScene.add(fsQuad);
  const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const smat = (fs, un) => new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms: un, depthTest: false, depthWrite: false, toneMapped: false });
  const mDown = smat('uniform sampler2D tD; uniform vec2 uT; uniform float uThr; varying vec2 vUv;\n' +
    'void main(){ vec3 c = texture2D(tD, vUv).rgb * 4.0 + texture2D(tD, vUv + uT).rgb + texture2D(tD, vUv - uT).rgb + texture2D(tD, vUv + vec2(uT.x, -uT.y)).rgb + texture2D(tD, vUv - vec2(uT.x, -uT.y)).rgb;\n' +
    ' c = clamp(c * 0.125, 0.0, 32.0); if (uThr > 0.0) { float l = max(c.r, max(c.g, c.b)); c *= max(l - uThr, 0.0) / max(l, 0.0001); }\n gl_FragColor = vec4(c, 1.0); }',
    { tD: { value: null }, uT: { value: new THREE.Vector2() }, uThr: { value: 0 } });
  const mUp = smat('uniform sampler2D tD; uniform sampler2D tA; uniform vec2 uT; varying vec2 vUv;\n' +
    'void main(){ vec3 c = texture2D(tD, vUv + vec2(-uT.x * 2.0, 0.0)).rgb + texture2D(tD, vUv + vec2(-uT.x, uT.y)).rgb * 2.0 + texture2D(tD, vUv + vec2(0.0, uT.y * 2.0)).rgb + texture2D(tD, vUv + uT).rgb * 2.0\n' +
    ' + texture2D(tD, vUv + vec2(uT.x * 2.0, 0.0)).rgb + texture2D(tD, vUv + vec2(uT.x, -uT.y)).rgb * 2.0 + texture2D(tD, vUv + vec2(0.0, -uT.y * 2.0)).rgb + texture2D(tD, vUv - uT).rgb * 2.0;\n' +
    ' gl_FragColor = vec4(c / 12.0 + texture2D(tA, vUv).rgb, 1.0); }',
    { tD: { value: null }, tA: { value: null }, uT: { value: new THREE.Vector2() } });
  // 最后一步里先做一次边缘平滑（FXAA）：多重采样管不到的锯齿（高光闪烁、极细的线、内部分辨率降低后的放大）在这里抹平。
  // 颜色先压到 0–1 再比较和混合，免得高亮像素把边缘判断带偏
  const mFinal = smat('uniform sampler2D tS; uniform sampler2D tB; uniform float uBloom; uniform float uExp; uniform float uSat; uniform float uCon; uniform float uVig; uniform float uTime; uniform float uKeepA; uniform vec2 uT; uniform float uFxaa; uniform float uSharp; uniform vec3 uTint; varying vec2 vUv;\n' +
    'vec3 rrt(vec3 v){ vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }\n' +
    'vec3 aces(vec3 c){ c = mat3(0.59719, 0.07600, 0.02840, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777) * (c / 0.6); c = rrt(c); return clamp(mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602) * c, 0.0, 1.0); }\n' +
    'float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }\n' +
    'vec3 tm(vec2 uv){ vec3 c = max(texture2D(tS, uv).rgb, 0.0); return c / (1.0 + lum(c)); }\n' +
    'vec3 fxaa(vec3 mid){\n' +
    ' vec3 m = mid / (1.0 + lum(mid)), nw = tm(vUv + vec2(-uT.x, uT.y)), ne = tm(vUv + uT), sw = tm(vUv - uT), se = tm(vUv + vec2(uT.x, -uT.y));\n' +
    ' float lM = lum(m), lNW = lum(nw), lNE = lum(ne), lSW = lum(sw), lSE = lum(se), lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE))), lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));\n' +
    ' if (lMax - lMin < max(0.03, lMax * 0.11)) return mid;\n' +
    ' vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), (lNW + lSW) - (lNE + lSE));\n' +
    ' float red = max((lNW + lNE + lSW + lSE) * 0.03125, 0.0078125), rcp = 1.0 / (min(abs(dir.x), abs(dir.y)) + red);\n' +
    ' dir = clamp(dir * rcp, vec2(-8.0), vec2(8.0)) * uT;\n' +
    ' vec3 a = 0.5 * (tm(vUv + dir * -0.16667) + tm(vUv + dir * 0.16667)), b = a * 0.5 + 0.25 * (tm(vUv + dir * -0.5) + tm(vUv + dir * 0.5));\n' +
    ' float lB = lum(b); vec3 r = (lB < lMin || lB > lMax) ? a : b; return r / max(1.0 - lum(r), 0.001); }\n' +
    // 锐化：把每个像素和上下左右的平均值拉开一点，结果限制在这五个像素的明暗范围内（不会出白边）。
    // 抗锯齿和内部分辨率放大都会让小而细的东西发虚（远处人物的五官），这一步把清晰度找回来
    'vec3 sharpen(vec3 mid){ vec3 m = mid / (1.0 + lum(mid)), n = tm(vUv + vec2(0.0, uT.y)), s = tm(vUv - vec2(0.0, uT.y)), e = tm(vUv + vec2(uT.x, 0.0)), w = tm(vUv - vec2(uT.x, 0.0));\n' +
    ' vec3 lo = min(m, min(min(n, s), min(e, w))), hi = max(m, max(max(n, s), max(e, w)));\n' +
    ' vec3 r = clamp(m + (m - (n + s + e + w) * 0.25) * uSharp, lo, hi); return r / max(1.0 - lum(r), 0.001); }\n' +
    'void main(){ vec4 s = texture2D(tS, vUv); vec3 c = max(s.rgb, 0.0); if (uKeepA > 0.5) { if (s.a > 0.001) c /= s.a; } else if (s.a > 0.01) { if (uFxaa > 0.5) c = fxaa(c); if (uSharp > 0.0) c = sharpen(c); }\n' +   // 透明通道记了 0 的（写着字的匾、幌子）不做平滑和锐化
    ' c *= uTint; c += texture2D(tB, vUv).rgb * uBloom; c = aces(c * uExp);\n' +
    ' float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = mix(vec3(l), c, uSat); c = (c - 0.5) * uCon + 0.5;\n' +
    ' vec2 q = vUv - 0.5; c *= 1.0 - uVig * smoothstep(0.2, 0.9, dot(q, q) * 2.0); c = clamp(c, 0.0, 1.0);\n' +
    ' c = mix(c * 12.92, 1.055 * pow(c, vec3(0.41666)) - 0.055, step(vec3(0.0031308), c));\n' +
    ' c += (fract(sin(dot(gl_FragCoord.xy + uTime, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;\n' +
    ' gl_FragColor = vec4(c, uKeepA > 0.5 ? s.a : 1.0); }',
    { tS: { value: null }, tB: { value: null }, uBloom: { value: 0.1 }, uExp: { value: 1 }, uSat: { value: 1 }, uCon: { value: 1 }, uVig: { value: 0 }, uTime: { value: 0 }, uKeepA: { value: 0 }, uT: { value: new THREE.Vector2() }, uFxaa: { value: /[?&]fxaa=0/.test(QS) ? 0 : 1 }, uSharp: { value: 0 }, uTint: { value: new THREE.Vector3(1, 1, 1) } });
  const SHARP = (/[?&]sharp=([\d.]+)/.exec(QS) || [0, null])[1];
  function mkSet(w, h, samples) {
    // 深度缓冲要 24 位：three.js 默认给渲染目标的是 16 位，镜头二三十格远的地方只分得清两厘米上下的前后，
    // 招牌和梁、人物衣服的里外几层贴得比这还近，镜头一动就轮流露出来（闪）。带上模板缓冲，深度就是 24 位的（DEPTH24_STENCIL8）
    const sm = samples == null ? 4 : samples, s = { w, h, sm, rt: new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: sm, stencilBuffer: !/[?&]z16/.test(QS) }), d: [], u: [] };
    let cw = w, ch = h;
    for (let i = 0; i < 5; i++) {
      cw = Math.max(2, cw >> 1); ch = Math.max(2, ch >> 1);
      s.d.push(new THREE.WebGLRenderTarget(cw, ch, { type: THREE.HalfFloatType, depthBuffer: false }));
      if (i < 4) s.u.push(new THREE.WebGLRenderTarget(cw, ch, { type: THREE.HalfFloatType, depthBuffer: false }));
    }
    return s;
  }
  function freeSet(s) { s.rt.dispose(); s.d.forEach(t => t.dispose()); s.u.forEach(t => t.dispose()); }
  const pass = (mat, to) => { fsQuad.material = mat; R.setRenderTarget(to); R.render(fsScene, fsCam); };
  let mainSet = null, frameNo = 0, lastT = 0, ema = 16, cnt = 0, ups = 0, lvl = 0, probe = 0, noDrop = false;
  const ADAPT = !/[?&](shot|test|sim)\b/.test(QS), TEST = /[?&]test\b/.test(QS);
  g3.rs = TEST ? 0.4 : 1;   // 自动测试时降低内部分辨率，加快无头软件渲染
  // 画质档位 [内部分辨率比例, 多重采样数]。帧率不够时先减多重采样（边缘仍有 FXAA 兜底），最后才降分辨率，而且最低只到 0.7，
  // 免得人物的脸糊掉。画质设为“高清”时锁定在第一档，“流畅”锁定在最后一档
  // 高清、低配锁在全分辨率（多重采样按设置）；流畅锁在最后一档；自动按帧率在各档之间升降。多重采样都不超过设置里的上限
  const LV = [[1, 4], [1, 2], [1, 0], [0.85, 0], [0.7, 0]];
  const curLv = () => { if (TEST) return [0.4, 4]; const L = gmode === 'auto' ? LV[lvl] : gmode === 'fast' ? LV[LV.length - 1] : LV[0]; return [L[0], Math.min(L[1], gfx.msaa)]; };
  g3.quality = () => gmode;
  g3.perfInfo = () => ({ mode: GFX_MODE[gmode] + (Object.keys(gover).length ? '（自定义）' : ''), lvl, scale: curLv()[0], msaa: curLv()[1], calls: R.info.render.calls, tris: R.info.render.triangles });   // 性能读数用（见 main.js）
  const gfxSave = () => { try { localStorage.setItem('yunlan_quality', gmode); localStorage.setItem('yunlan_gfx', JSON.stringify(gover)); } catch (e) { } };
  const gfxApply = () => { for (const k in GFX_DEF) gfx[k] = k in gover ? gover[k] : k in GFX_PRE[gmode] ? GFX_PRE[gmode][k] : GFX_DEF[k]; cnt = 0; ema = 16; probe = 0; noDrop = false; gfxSave(); };
  // 换档：各分项回到这一档的默认
  g3.setQuality = q => { if (!GFX_PRE[q]) return; gmode = q; gover = {}; gfxApply(); };
  // 单独改一项；和这一档的默认相同就不算改过
  g3.setGfx = (k, v) => { if (!(k in GFX_DEF)) return; const d = k in GFX_PRE[gmode] ? GFX_PRE[gmode][k] : GFX_DEF[k]; if (v === d) delete gover[k]; else gover[k] = v; gfxApply(); };
  g3.gfxOpts = GFX_OPT; g3.gfxModes = GFX_MODE; g3.gfxCustom = () => Object.keys(gover).length > 0;
  g3.gfxStale = () => GFX_OPT.filter(o => !o[3] && gfx[o[0]] !== gfxBoot[o[0]]).map(o => o[0]);   // 改了、但要刷新页面才生效的几项
  g3.qualityText = () => { const L = POST ? curLv() : [1, 4]; return GFX_MODE[gmode] + ' · ' + Math.round(g3.bw * L[0]) + '×' + Math.round(g3.bh * L[0]) + (L[1] ? ' · 抗锯齿×' + L[1] : ''); };
  const BLACK = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, THREE.RGBAFormat); BLACK.needsUpdate = true;   // 关掉泛光时给合成那一步的空白泛光图
  /* 渲染一帧。o：{exp 曝光, bloom 泛光量, thr 泛光阈值, sat, con, vig, to 输出目标, keepA 保留透明通道, set 指定缓冲组} */
  function present(sc, cam, o) {
    o = o || {}; R.info.reset(); frameNo++;
    const hm = sc.userData && sc.userData.hemi; if (hm) { U.uHS.value.copy(hm[0]); U.uHG.value.copy(hm[1]); }   // 简化材质的天光换成这个场景的
    if (!POST) {
      R.toneMappingExposure = o.exp || 1; R.setRenderTarget(o.to || null);
      if (o.keepA) { R.setClearColor(0x000000, 0); R.clear(); }
      R.render(sc, cam);
      if (o.keepA) R.setClearColor(0x000000, 1);
      R.setRenderTarget(null); return;
    }
    let s = o.set;
    if (!s) {
      // 帧率自适应：跟不上屏幕刷新时逐级降低画质档位（见 LV），帧率富余时再升回去。
      // 头两档只是减多重采样（画面几乎看不出差别），所以平均帧时间一过 21 毫秒（60 赫兹的屏上已有三成的帧赶不上、看着发顿）就减；
      // 再往下是降分辨率，要到 30 毫秒才动。降了一档之后帧时间若没有明显变短，说明慢不在显卡上（比如屏幕本身只刷 30 帧），
      // 就退回原档，以后不再往下降，免得白白把画面弄糊
      const now = performance.now(), dtm = now - lastT; lastT = now;
      if (ADAPT && gmode === 'auto' && dtm < 500) {
        ema += (dtm - ema) * 0.05; cnt++;
        if (probe && cnt > 150) { if (ema > probe * 0.9) { lvl--; noDrop = true; } probe = 0; cnt = 0; }
        else if (!probe && !noDrop && cnt > 90 && ema > (LV[lvl][1] ? 21 : 30) && lvl < LV.length - 1) { probe = ema; lvl++; cnt = 0; }
        else if (!probe && cnt > 600 && ema < 12 && lvl > 0 && ups < 3) { lvl--; cnt = 0; ups++; }
      }
      const L = curLv(); g3.rs = L[0];
      // 超采样（o.ss）：以高于屏幕的分辨率渲染再缩小，细小的东西（五官、发丝）更清楚。只在画质没被降档、像素总量不过大时启用
      let ss = o.ss && gfx.ss && !TEST && gmode !== 'fast' && (gmode !== 'auto' || lvl === 0) ? o.ss : 1;
      if (ss > 1) ss = Math.max(1, Math.min(ss, Math.sqrt(3840 * 2160 / (g3.bw * g3.bh))));
      const w = Math.max(2, Math.round(g3.bw * g3.rs * ss)), h = Math.max(2, Math.round(g3.bh * g3.rs * ss));
      if (!mainSet || mainSet.w !== w || mainSet.h !== h || mainSet.sm !== L[1]) { if (mainSet) freeSet(mainSet); mainSet = mkSet(w, h, L[1]); }
      s = mainSet;
    }
    R.setRenderTarget(s.rt);
    if (o.keepA) { R.setClearColor(0x000000, 0); R.clear(); }
    R.render(sc, cam);
    if (o.keepA) R.setClearColor(0x000000, 1);
    // 泛光：缩小五次再放大回来，共九遍全屏的绘制。设置里关掉时整段跳过（灯火、技能少一圈光晕）
    const bloomOn = !!(gfx.bloom || o.set);
    let src = s.rt, sw = s.w, sh = s.h;
    if (bloomOn) {
      for (let i = 0; i < 5; i++) { mDown.uniforms.tD.value = src.texture; mDown.uniforms.uT.value.set(1 / sw, 1 / sh); mDown.uniforms.uThr.value = i === 0 ? (o.thr || 1.0) : 0; pass(mDown, s.d[i]); src = s.d[i]; sw = src.width; sh = src.height; }
      for (let i = 3; i >= 0; i--) { mUp.uniforms.tD.value = src.texture; mUp.uniforms.tA.value = s.d[i].texture; mUp.uniforms.uT.value.set(0.5 / src.width, 0.5 / src.height); pass(mUp, s.u[i]); src = s.u[i]; }
    }
    const u = mFinal.uniforms;
    u.tS.value = s.rt.texture; u.tB.value = bloomOn ? src.texture : BLACK; u.uBloom.value = !bloomOn ? 0 : o.bloom == null ? 0.09 : o.bloom; u.uExp.value = o.exp || 1; u.uSat.value = o.sat || 1; u.uCon.value = o.con || 1;
    if (o.tint) u.uTint.value.set(o.tint[0], o.tint[1], o.tint[2]); else u.uTint.value.set(1, 1, 1);   // 调色（如夜景偏蓝压暗）；加在泛光之前，灯火的光晕保持原色
    u.uVig.value = o.vig || 0; u.uTime.value = frameNo % 61; u.uKeepA.value = o.keepA ? 1 : 0; u.uT.value.set(1 / s.w, 1 / s.h);
    u.uSharp.value = SHARP != null ? +SHARP : s === mainSet ? (g3.rs < 1 ? 0.9 : 0.55) : 0;
    pass(mFinal, o.to || null);
    R.setRenderTarget(null);
  }

  /* ---------- 画布尺寸 ---------- */
  g3.resize = (w, h, pr) => { R.setPixelRatio(pr); R.setSize(w, h, false); g3.bw = Math.max(2, Math.round(w * pr)); g3.bh = Math.max(2, Math.round(h * pr)); g3.aspect = w / h; };
  g3.k = { R, GB, M, sph, box, cyl, ico, lathe, geo, lin, LC, canvasTex, glowTex, glowSprite, noiseTex, matGlow, stdMat, envFor, present, mkSet, freeSet, U, V3, hemiPatch };
  return g3;
})();
