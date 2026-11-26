'use strict';
/* ============ 3D 场景：光照与天空、景物建模、大地图、战斗舞台、标题、头像 ============ */
(() => {
  if (!G3.ok) return;
  const K = G3.k, R = K.R, GB = K.GB, M = K.M, lin = K.lin, LC = K.LC, U = K.U, PI = Math.PI;
  const cam = new THREE.PerspectiveCamera(30, 16 / 9, 0.5, 900);
  const _p = new THREE.Vector3(), _ray = new THREE.Raycaster(), _pl = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), _v2 = new THREE.Vector2();
  const gold = '#d9b45a';
  const sst = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  /* 每个主题：太阳[色, 强度]，天空环境光[顶色, 强度, 地平线色, 强度, 地面反光色, 强度]，雾色，光向，曝光，泛光 */
  const LIT = {
    mountain: { sun: ['#fff0d6', 1.4], sky: ['#4f93e6', 0.5, '#cfe6fa', 0.6, '#7c9460', 0.3], fog: '#c2e0f2', dir: [-0.5, 0.78, 0.62], exp: 1.0, bloom: 0.07, cov: 0.58, sat: 1.1 },
    town:     { sun: ['#ffc896', 1.5], sky: ['#6f84c0', 0.5, '#ffd0b0', 0.62, '#a08068', 0.32], fog: '#f2c4a2', dir: [-0.78, 0.5, 0.55], exp: 1.12, bloom: 0.09, cov: 0.5, sat: 1.0 },
    bamboo:   { sun: ['#fbffe6', 1.2], sky: ['#8fb8c4', 0.46, '#dcecd8', 0.54, '#5a7458', 0.3], fog: '#6fa88c', dir: [-0.4, 0.85, 0.55], exp: 1.0, bloom: 0.08, cov: 0.5, sat: 0.9, gd: [0.3, '#86a070'] },
    fire:     { sun: ['#ffd6b4', 1.35], sky: ['#4c3c44', 0.5, '#c07c5c', 0.52, '#6e4030', 0.44], fog: '#4a221a', dir: [-0.5, 0.8, 0.6], exp: 1.3, bloom: 0.11, cov: 0.4, sat: 0.84, gd: [0.72, '#8a746c'] },
    snow:     { sun: ['#fff5e6', 1.15], sky: ['#6294de', 0.5, '#e4eefc', 0.6, '#dbe6f4', 0.5], fog: '#d2e2f4', dir: [-0.55, 0.8, 0.6], exp: 0.92, bloom: 0.08, cov: 0.5, sat: 1.0 },
    abyss:    { sun: ['#e4e0ff', 1.3], sky: ['#34305a', 0.5, '#7c74b4', 0.54, '#4a466c', 0.44], fog: '#221a40', dir: [-0.45, 0.85, 0.6], exp: 1.3, bloom: 0.11, cov: 0.45, sat: 0.84, gd: [0.72, '#7a7790'] },
    // 衍生主题：烟雨渡的灯会暮色、断剑崖的雾、幽烬城的灰
    dusk:     { sun: ['#ffc8a0', 1.15], sky: ['#6478d0', 0.72, '#f0b0c0', 0.8, '#9484a4', 0.5], fog: '#8478a8', dir: [-0.66, 0.6, 0.5], exp: 1.2, bloom: 0.13, cov: 0.5, sat: 1.0 },
    mist:     { sun: ['#f4f0e8', 1.05], sky: ['#8a9cb4', 0.55, '#e0e6ec', 0.62, '#7c8878', 0.32], fog: '#cfd8de', dir: [-0.4, 0.8, 0.6], exp: 1.0, bloom: 0.08, cov: 0.75, sat: 0.86 },
    ash:      { sun: ['#ffc8a8', 1.2], sky: ['#3a3440', 0.5, '#8a5c50', 0.5, '#54403c', 0.44], fog: '#2c2024', dir: [-0.5, 0.8, 0.6], exp: 1.3, bloom: 0.12, cov: 0.4, sat: 0.76, gd: [0.72, '#7c7474'] },
    // 室内：灯火的暖光，四周是暗的
    indoor:   { sun: ['#ffe2b8', 1.05], sky: ['#6a5a52', 0.6, '#e0b888', 0.7, '#8a6a4a', 0.5], fog: '#0a090e', dir: [-0.3, 0.86, 0.42], exp: 1.12, bloom: 0.1, cov: 0.5, sat: 1.0 }
  };
  const baseOf = t => (THEMES[t] && THEMES[t].as) || t;

  /* ---------- 共享材质 ---------- */
  function seeBasic(sh) {
    sh.uniforms.uP = U.uP; sh.uniforms.uPS = U.uPS;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;').replace('#include <project_vertex>', '#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;\nuniform vec3 uP;\nuniform vec3 uPS;')
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' +
        'if (uPS.z > 0.0 && vWP.z > uP.z + 0.3 && vWP.y > 0.1) {\n vec2 dd = (gl_FragCoord.xy - uPS.xy) / uPS.z; dd.y *= 0.8;\n float kk = dot(dd, dd);\n' +
        ' if (kk < 1.0) { float nz = fract(52.9829189 * fract(dot(floor(gl_FragCoord.xy), vec2(0.06711056, 0.00583715)))); if (nz > kk * kk * 0.75 + 0.12) discard; }\n}');
  }
  const keep = m => { m._keep = true; return m; };
  // 景物共用的材质都带 scene 标记：画质设置里“景物材质”选了简化时，换成简化材质（见 g3.js 的 stdMat）
  const GB0 = G3.gfxBoot, LITE = !GB0.scene;
  const matSee = keep(K.stdMat({ see: true, scene: true })), matPlain = keep(K.stdMat({ scene: true }));
  // 植被贴图集（透明底，近白色，由顶点色染色）：0 阔叶枝 1 花枝 2 竹叶 3 草丛
  const leafTex = K.canvasTex(1024, 1024, c => {
    c.scale(2, 2);   // 以 512 的坐标绘制，实际分辨率翻倍，叶片轮廓放大后不发虚
    const rnd = mulberry32(77);
    const grey = k => { const v = Math.round(255 * Math.min(1, k)); return 'rgb(' + v + ',' + v + ',' + Math.round(v * 0.93) + ')'; };
    const leafShape = (x, y, len, wid, ang, col) => { c.save(); c.translate(x, y); c.rotate(ang); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(wid, -len * 0.45, 0, -len); c.quadraticCurveTo(-wid, -len * 0.45, 0, 0); c.fillStyle = col; c.fill(); c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -len * 0.9); c.stroke(); c.restore(); };
    const tile = (tx, ty, fn) => { c.save(); c.beginPath(); c.rect(tx * 256 + 3, ty * 256 + 3, 250, 250); c.clip(); c.translate(tx * 256 + 128, ty * 256 + 128); fn(); c.restore(); };
    tile(0, 0, () => { for (let i = 0; i < 30; i++) { const a = rnd() * TAU, d = rnd() * 80, x = Math.cos(a) * d, y = Math.sin(a) * d; leafShape(x, y, 32 + rnd() * 20, 12 + rnd() * 6, a + PI / 2 + (rnd() - 0.5) * 1.6, grey(0.5 + rnd() * 0.5)); } });
    tile(1, 0, () => {
      for (let i = 0; i < 7; i++) { const a = rnd() * TAU, d = rnd() * 80; leafShape(Math.cos(a) * d, Math.sin(a) * d, 26 + rnd() * 12, 9, rnd() * TAU, 'rgb(120,150,110)'); }
      for (let i = 0; i < 22; i++) { const a = rnd() * TAU, d = rnd() * 92, x = Math.cos(a) * d, y = Math.sin(a) * d, r = 12 + rnd() * 7, k = 0.78 + rnd() * 0.22; c.fillStyle = grey(k); for (let p = 0; p < 5; p++) { const pa = p / 5 * TAU + a; c.beginPath(); c.ellipse(x + Math.cos(pa) * r * 0.55, y + Math.sin(pa) * r * 0.55, r * 0.56, r * 0.42, pa, 0, TAU); c.fill(); } c.fillStyle = 'rgb(255,200,150)'; c.beginPath(); c.arc(x, y, r * 0.2, 0, TAU); c.fill(); }
    });
    tile(0, 1, () => { for (let i = 0; i < 11; i++) leafShape((rnd() - 0.5) * 110, -100 + rnd() * 80, 80 + rnd() * 45, 7 + rnd() * 3.5, PI + (rnd() - 0.5) * 1.5, grey(0.55 + rnd() * 0.45)); });
    tile(1, 1, () => { for (let i = 0; i < 26; i++) { const x = (rnd() - 0.5) * 150, h = 90 + rnd() * 150, bend = (x / 75) * 36 + (rnd() - 0.5) * 50, w = 4.5 + rnd() * 4, k = 0.62 + rnd() * 0.38, g = c.createLinearGradient(0, 128, 0, 128 - h); g.addColorStop(0, grey(k * 0.7)); g.addColorStop(1, grey(k * 1.05)); c.fillStyle = g; c.beginPath(); c.moveTo(x - w, 128); c.quadraticCurveTo(x - w * 0.5 + bend * 0.3, 128 - h * 0.6, x + bend, 128 - h); c.quadraticCurveTo(x + w * 0.5 + bend * 0.3, 128 - h * 0.6, x + w, 128); c.closePath(); c.fill(); } });
  });
  leafTex.anisotropy = 4; leafTex._keep = true;
  const TILE = [[0.02, 0.52, 0.48, 0.98], [0.52, 0.52, 0.98, 0.98], [0.02, 0.02, 0.48, 0.48], [0.52, 0.02, 0.98, 0.49]];
  const matLeafSee = keep(K.stdMat({ see: true, two: true, keepN: true, wind: 1, map: leafTex, scene: true })), matLeaf = keep(K.stdMat({ two: true, keepN: true, wind: 1, map: leafTex, scene: true }));
  const matGrass = keep(K.stdMat({ two: true, keepN: true, wind: 2, map: leafTex, alphaTest: 0.35, scene: true }));
  // 简化材质下的平面（地底、战场的路面）：漫反射 + 天光
  function liteFlat(p) { const m = new THREE.MeshLambertMaterial(p); m.onBeforeCompile = K.hemiPatch; m.customProgramCacheKey = () => 'g3flat'; return m; }
  const flatMat = p => { if (!LITE) return new THREE.MeshStandardMaterial(p); const q = Object.assign({}, p); delete q.roughness; delete q.metalness; return liteFlat(q); };
  // 草丛减半：照常掷骰子（后面的景物摆放不变），只是每两丛里有一丛画到一个不用的缓冲里
  const vegKeep = (() => { const r = mulberry32(4242); return () => GB0.veg >= 1 || r() < GB0.veg; })();
  const mkF = () => { const g = new GB().m('leaf'); g.T = []; return g; }, mkGr = () => { const g = new GB().m(0.75, 0, 0.1, 0.05); g.T = []; return g; };
  const matGlowSee = keep(new THREE.MeshBasicMaterial({ vertexColors: true })); matGlowSee.onBeforeCompile = seeBasic;
  const blobMat = keep(new THREE.MeshBasicMaterial({ map: K.glowTex, color: 0x000000, transparent: true, opacity: 0.42, depthWrite: false }));
  const blobGeo = new THREE.PlaneGeometry(1, 1); blobGeo.rotateX(-PI / 2); blobGeo._keep = true;
  function addBlob(ch, s) { const b = new THREE.Mesh(blobGeo, blobMat); b.position.y = 0.02; b.scale.setScalar(s || (ch.kind === 'human' ? 0.95 : 1.3)); b.renderOrder = 1; ch.g.add(b); ch.blob = b; }
  // 地面材质：在底图上叠加噪声细节与微凹凸
  // （简化材质下：漫反射 + 天光，颜色上的两层噪声照旧，不做噪声凹凸）
  function groundMat(tex, tw, th, tint, gd) {
    const m = LITE ? new THREE.MeshLambertMaterial({ map: tex, color: LC('#ffffff', tint || 1) }) : new THREE.MeshStandardMaterial({ map: tex, color: LC('#ffffff', tint || 1), roughness: 0.94, metalness: 0 }), tile = { value: new THREE.Vector2(tw, th) }, dc = gd ? LC(gd[1]) : null, des = { value: new THREE.Vector4(dc ? dc.r : 0, dc ? dc.g : 0, dc ? dc.b : 0, gd ? gd[0] : 0) };
    m.onBeforeCompile = sh => {
      sh.uniforms.tNoise = U.tNoise; sh.uniforms.uTile = tile; sh.uniforms.uDes = des;
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D tNoise;\nuniform vec2 uTile;\nuniform vec4 uDes;')
        .replace('#include <map_fragment>', '#include <map_fragment>\nvec2 gUv = vUv * uTile;\nvec3 gA = texture2D(tNoise, gUv * 0.23).rgb; vec3 gB = texture2D(tNoise, gUv * 1.7).rgb;\nfloat gH = gA.g * 0.45 + gB.g * 0.35 + gB.r * 0.2;\ndiffuseColor.rgb = mix(diffuseColor.rgb, uDes.rgb * (dot(diffuseColor.rgb, vec3(0.3, 0.55, 0.15)) * 2.4 + 0.015), uDes.a);\ndiffuseColor.rgb *= 0.8 + 0.38 * (gA.b * 0.45 + gB.g * 0.55);');
      if (LITE) { K.hemiPatch(sh); return; }
      sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' +
          '{ vec3 bx = dFdx(-vViewPosition), by = dFdy(-vViewPosition); float hx = dFdx(gH), hy = dFdy(gH);\n vec3 r1 = cross(by, normal), r2 = cross(normal, bx); float det = dot(bx, r1);\n' +
          ' normal = normalize(abs(det) * normal - 0.035 * sign(det) * (hx * r1 + hy * r2)); }');
    };
    m.customProgramCacheKey = () => LITE ? 'g3groundL' : 'g3ground';
    return m;
  }

  function baseScene(theme, shadowR) {
    const L = LIT[theme], sc = new THREE.Scene(), s = L.sky;
    const env = K.envFor(theme, LC(s[0], s[1]), LC(s[2], s[3]), LC(s[4], s[5]), LC(L.sun[0], L.sun[1] * 0.4), L.dir);
    if (env) sc.environment = env; else sc.add(new THREE.HemisphereLight(LC(Art.mix(s[0], s[2], 0.5), (s[1] + s[3]) / 2), LC(s[4], s[5]), 1));
    // 简化材质的天光：与上面那盏半球光同一对颜色。没有环境贴图时那盏灯已经照着了，这里就给黑色，免得加两遍
    const hemi = env ? hemiOf(s) : [new THREE.Color(0, 0, 0), new THREE.Color(0, 0, 0)];
    const sun = new THREE.DirectionalLight(LC(L.sun[0]), L.sun[1]);
    sun.castShadow = true; sun.shadow.mapSize.setScalar(GB0.shadow >= 2 ? 2048 : 1024);   // 画质设置里的“阴影”：精细 2048、普通 1024
    const c = sun.shadow.camera; c.left = -shadowR; c.right = shadowR; c.top = shadowR; c.bottom = -shadowR; c.near = 1; c.far = 110;
    // 偏移量按 2048 的阴影贴图调的；贴图粗一倍，一个阴影像素在墙上占的地方也大一倍，偏移跟着放大，不然侧对太阳的墙面、招牌上会出一道道自阴影的条纹
    const bk = 2048 / sun.shadow.mapSize.x; sun.shadow.bias = -0.0004 * bk; sun.shadow.normalBias = 0.035 * bk;
    sc.add(sun); sc.add(sun.target);
    sc.userData = { sun, dir: new THREE.Vector3(L.dir[0], L.dir[1], L.dir[2]).normalize(), lit: L, hemi };
    return sc;
  }
  // 简化材质的天光：按环境贴图（g3.js 的 envFor）里天空的画法估出来——朝上的面看到的天，余弦加权下天顶约占八成、地平线两成；
  // 朝下的面看到的地面约占八成半，其余是地平线
  const hemiOf = s => { const top = LC(s[0], s[1]), hor = LC(s[2], s[3]), gnd = LC(s[4], s[5]); return [hor.clone().lerp(top, 0.78), hor.clone().lerp(gnd, 0.85)]; };
  /* 阴影的范围跟着镜头走，但每次只按“整格阴影像素”挪：在太阳看过来的平面上，把中心对齐到阴影像素的整数倍。
     不然每挪一下，墙上、招牌上的影子边缘和细小的自阴影就重新排一遍，主角一走动，旁边的房子就一闪一闪的 */
  const _sx = new THREE.Vector3(), _sy = new THREE.Vector3(), _sp = new THREE.Vector3();
  function aimSun(sc, x, z) {
    const u = sc.userData, d = u.dir, sh = u.sun.shadow, c = sh.camera, t = (c.right - c.left) / sh.mapSize.x;
    _sx.set(d.z, 0, -d.x).normalize(); _sy.crossVectors(d, _sx);   // 阴影相机的横轴、竖轴（与 three.js 的 lookAt 一致：上方向取世界的 y）
    _sp.set(x, 0, z);
    const a = Math.round(_sp.dot(_sx) / t) * t, b = Math.round(_sp.dot(_sy) / t) * t, k = Math.round(_sp.dot(d) * 4) / 4;
    _sp.copy(_sx).multiplyScalar(a).addScaledVector(_sy, b).addScaledVector(d, k);
    u.sun.target.position.copy(_sp); u.sun.position.copy(_sp).addScaledVector(d, 50); u.sun.target.updateMatrixWorld();
  }
  /* ---------- 景物的影子进图时算好一次（画质设置里的“景物的影子”，低配默认开；只用于大地图） ----------
     原先每帧都要把镜头附近的景物从太阳那边再画一遍（阴影贴图），这一遍的三角面和主画面差不多多。可景物不会动、太阳也不动，影子就不会变：
     进图时按整张地图把景物的影子画进一张大阴影贴图（bakeStatic），之后每帧只画人物（world.dyn 里的一切，屋里还有墙）。
     每帧用的那张阴影贴图照旧跟着镜头走（aimSun），先用一块铺满的方片（customDepthMaterial 是 bakeFS）把大图里对应的那一块深度拷进来，
     再把人物画上去——着色器里还是只查一张阴影贴图，取样次数、影子的样子都和原来一样。
     怎么分：three.js 画阴影时从场景的根往下挨个找要投影的东西（R.shadowMap.render），这里把它包一层——
     每帧画的时候只从 world.dyn 往下找（拷贝用的方片也放在 world.dyn 里），景物一个也不碰；画大图的时候从整个场景往下找，人物先藏起来。
     （不能靠图层分：这一版 three.js 画阴影时按主镜头的图层挑东西，不看阴影镜头的图层。）
     画大图用第 31 层的灯和镜头：主画面一个东西也不画，只有这盏灯的阴影要画。
     大图的阴影像素和默认视野下每帧那张一样大、格子对齐（都按 t0 的整数倍摆），拷过来是一格对一格，不会走一步闪一下。
     代价：会动的景物（风里的灯笼之类）的影子定在进图那一刻；进图时多画一张大图。 */
  const BAKE = !!GB0.bake && R.capabilities.isWebGL2, L_BAKE = 31;
  const SMR = R.shadowMap.render, cam0 = new THREE.Camera();   // cam0：第 0 层的镜头，画大图时拿它决定“哪些东西算数”
  let smRoot = null, smCam = null;
  if (BAKE) R.shadowMap.render = function (lights, scene, camera) { return SMR.call(this, lights, smRoot || scene, smCam || camera); };
  const bakeVS = 'varying vec2 vUv;\nvoid main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  // 每帧那张阴影贴图上的一格 → 大图上的同一处（uN），大图里存的深度 → 换算成这张图的深度（uZ）。大图上没有东西的地方写成“最远”
  const bakeFS = '#include <packing>\nuniform sampler2D tS;\nuniform mat4 uN;\nuniform vec4 uZ;\nvarying vec2 vUv;\nvoid main() {\n' +
    ' vec4 s = uN * vec4(vUv * 2.0 - 1.0, 0.0, 1.0); vec2 su = s.xy * 0.5 + 0.5; float d = 1.0;\n' +
    ' if (su.x >= 0.0 && su.x <= 1.0 && su.y >= 0.0 && su.y <= 1.0) { float ds = unpackRGBAToDepth(texture2D(tS, su));\n' +
    '  if (ds < 0.99999) d = clamp(dot(uZ, vec4(s.xy, ds * 2.0 - 1.0, 1.0)) * 0.5 + 0.5, 0.0, 1.0); }\n' +
    ' gl_FragDepth = d; gl_FragColor = d >= 1.0 ? vec4(1.0) : packDepthToRGBA(d);\n}';
  const bakeCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); bakeCam.layers.set(L_BAKE);
  const bakeGeo = new THREE.PlaneGeometry(2, 2); bakeGeo._keep = true;
  // 进图时画那张大图。b：这张图的场景（sceneSteps 的结果），m：地图
  function bakeStatic(b, m) {
    const sc = b.sc, u = sc.userData, d = u.dir, t0 = 30 / u.sun.shadow.mapSize.x, mx = Math.min(4096, R.capabilities.maxTextureSize), E = 5, RY = 14;
    _sx.set(d.z, 0, -d.x).normalize(); _sy.crossVectors(d, _sx);
    // 大图要盖住的地方：整张图再往外 E 格（镜头最多看到图外两三格），高到 RY（房顶、树冠、近处的山坡，影子落在它们上面也得查得到）——
    // 在太阳看过来的平面上取外框。挡光的东西可以更高（图外的山）：深度方向按高到 40 留
    let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9, k0 = 1e9, k1 = -1e9;
    for (const x of [-E, m.w + E]) for (const z of [-E, m.h + E]) for (const y of [-1, RY, 40]) {
      _sp.set(x, y, z); const k = _sp.dot(d); k0 = Math.min(k0, k); k1 = Math.max(k1, k);
      if (y > RY) continue;
      const a = _sp.dot(_sx), bb = _sp.dot(_sy); a0 = Math.min(a0, a); a1 = Math.max(a1, a); b0 = Math.min(b0, bb); b1 = Math.max(b1, bb);
    }
    const ts = t0 * Math.ceil(Math.max(a1 - a0, b1 - b0) / (t0 * mx));   // 大图的阴影像素：一般就是 t0；图太大、超出 4096 时取它的整数倍
    a0 = Math.floor(a0 / ts) * ts; a1 = Math.ceil(a1 / ts) * ts; b0 = Math.floor(b0 / ts) * ts; b1 = Math.ceil(b1 / ts) * ts;
    const bk = new THREE.DirectionalLight(0xffffff, 0), sh = bk.shadow, c = sh.camera;
    bk.castShadow = true; bk.layers.set(L_BAKE); sh.mapSize.set(Math.round((a1 - a0) / ts), Math.round((b1 - b0) / ts)); sh.autoUpdate = false; sh.needsUpdate = true;
    c.left = -(a1 - a0) / 2; c.right = (a1 - a0) / 2; c.bottom = -(b1 - b0) / 2; c.top = (b1 - b0) / 2; c.near = 1; c.far = k1 - k0 + 3; c.updateProjectionMatrix();
    bk.position.copy(_sx).multiplyScalar((a0 + a1) / 2).addScaledVector(_sy, (b0 + b1) / 2).addScaledVector(d, k1 + 2); bk.target.position.copy(bk.position).sub(d);
    sc.add(bk); sc.add(bk.target); b.dyn.visible = false; smCam = cam0;
    const rt = R.getRenderTarget(); R.setRenderTarget(warmRT); R.render(sc, bakeCam); R.setRenderTarget(rt);
    smCam = null; b.dyn.visible = true; sc.remove(bk); sc.remove(bk.target);
    const mat = new THREE.ShaderMaterial({ uniforms: { tS: { value: sh.map.texture }, uN: { value: new THREE.Matrix4() }, uZ: { value: new THREE.Vector4() } }, vertexShader: bakeVS, fragmentShader: bakeFS });
    // 拷贝用的方片：主画面里它什么也不写（不写颜色、不写深度），只在画阴影时用 customDepthMaterial 铺满整张阴影贴图。
    // 两面都画：画阴影时 three.js 会把单面材质翻成背面
    const quad = new THREE.Mesh(bakeGeo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, colorWrite: false, depthWrite: false, depthTest: false }));
    quad.customDepthMaterial = mat; quad.castShadow = true; quad.frustumCulled = false; quad.position.y = -50; b.dyn.add(quad);
    u.bake = { bk, cam: c, mat, quad, w: sh.mapSize.x, h: sh.mapSize.y, ts, t0, base: u.sun.shadow.mapSize.x };
  }
  // 每帧：算出拷贝要用的两组换算；这一帧画阴影时只从 world.dyn 往下找（present 画完再放开，见 world.render）
  const _m1 = new THREE.Matrix4(), _m2 = new THREE.Matrix4();
  function bakeFrame(sc, dyn, ref) {
    const u = sc.userData, B = u.bake, sun = u.sun, c = sun.shadow.camera;
    B.quad.visible = !ref; smRoot = ref ? null : dyn;   // ref：开发对照用，这一帧照原来的办法把景物也画进阴影贴图
    sun.updateMatrixWorld(); sun.shadow.updateMatrices(sun);   // 画的时候 three.js 会再算一遍，结果相同
    _m1.multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse).invert();
    _m2.multiplyMatrices(B.cam.projectionMatrix, B.cam.matrixWorldInverse);
    const N = B.mat.uniforms.uN.value.multiplyMatrices(_m2, _m1), e = _m1.copy(N).invert().elements;
    B.mat.uniforms.uZ.value.set(e[2], e[6], e[10], e[14]);
  }
  // 阴影贴图覆盖的范围（半边长）：范围越小，同一张贴图落在人物身上的像素越多，影子越清晰
  // 景物影子算好一次时（u.bake）：每帧那张阴影贴图的一格固定和大图一样大，范围要大就把贴图加大（按 256 一档），不放大格子——
  // 这样任何视野下都是一格对一格拷过来，走动时影子边不会抖。
  // 剧情运镜（cine）照原来的办法：贴图回到原尺寸，景物每帧重画（见 bakeFrame）——近景里原来就用更细的阴影，大图没那么细
  function shadowSpan(sc, r, cine) {
    const u = sc.userData;
    if (u.bake) { const sh = u.sun.shadow, n = cine ? u.bake.base : Math.ceil(2 * r / u.bake.t0 / 256) * 256; if (!cine) r = n * u.bake.t0 / 2; if (sh.mapSize.x !== n) { sh.mapSize.set(n, n); if (sh.map) { sh.map.dispose(); sh.map = null; } } }
    if (u.sr === r) return; u.sr = r; const c = u.sun.shadow.camera; c.left = -r; c.right = r; c.top = r; c.bottom = -r; c.updateProjectionMatrix(); }
  /* 夜色（地图定义里写了 dayNight 的才有，眼下只有落霞镇）：天光换成很暗的月色——太阳光改成偏蓝的弱光、环境光换一张夜空烘出来的、
     雾和远处压成深蓝；灯火本身是自发光的，不受这些影响，于是窗里的灯、檐下和路边的灯笼就在暗处亮了出来。
     再把灯笼的光晕和地上的光斑加强、泛光加大，夜里的街就是一盏盏灯照出来的。
     昼夜是在转场的黑幕里整个换掉的（见 world.js 的 nightShift），不做渐变。 */
  // 月光（平行光）给得弱、环境光给得足：不然背着月亮的一面和影子里是死黑的，人走进去就看不见了
  const DEV_URL = /[?&](shot|sim|test)=/.test(location.search);
  const NIGHT = { sun: ['#a8bcf4', 0.5], sky: ['#2c3a66', 2.0, '#48587e', 2.0, '#2c3246', 1.4], fog: '#0d1428', exp: 0.95, bloom: 2.2, sat: 0.82, tint: [0.93, 0.97, 1.08], glow: 1.6, glowS: 1.25, pool: 1.9,
    dome: { cT: ['#04071a', 1], cM: ['#0a1230', 1], cH: ['#1a2a52', 1], cC: ['#1c2540', 0.9], cS: ['#c8d6ff', 0.55] } };
  function setNight(b, on) {
    const sc = b.sc, u = sc.userData; on = !!on;
    if (!!u.night === on) return;
    const sky = b.sky && b.sky.material.uniforms;
    if (!u.day) u.day = { env: sc.environment, hemi: u.hemi, sunC: u.sun.color.clone(), sunI: u.sun.intensity, fog: sc.fog.color.clone(), dome: sky ? { cT: sky.cT.value.clone(), cM: sky.cM.value.clone(), cH: sky.cH.value.clone(), cC: sky.cC.value.clone(), cS: sky.cS.value.clone() } : null };
    u.night = on;
    const D = u.day, s = NIGHT.sky;
    if (on) {
      const env = K.envFor('night', LC(s[0], s[1]), LC(s[2], s[3]), LC(s[4], s[5]), LC(NIGHT.sun[0], NIGHT.sun[1] * 0.4), u.lit.dir);
      if (env && D.env) { sc.environment = env; u.hemi = hemiOf(s); }
      u.sun.color.copy(LC(NIGHT.sun[0])); u.sun.intensity = NIGHT.sun[1]; sc.fog.color.copy(LC(NIGHT.fog));
    } else { if (D.env) sc.environment = D.env; u.hemi = D.hemi; u.sun.color.copy(D.sunC); u.sun.intensity = D.sunI; sc.fog.color.copy(D.fog); }
    if (sc.background && sc.background.isColor) sc.background.copy(sc.fog.color);
    if (sky) for (const k in D.dome) sky[k].value.copy(on ? LC(NIGHT.dome[k][0], NIGHT.dome[k][1]) : D.dome[k]);
    const fo = b.fxo;
    if (fo) {
      for (const g of fo.glows) { const ud = g.userData; if (ud.op0 == null) { ud.op0 = ud.op; ud.s0 = g.scale.x; } ud.op = Math.min(1, ud.op0 * (on ? NIGHT.glow : 1)); g.scale.setScalar(ud.s0 * (on ? NIGHT.glowS : 1)); }
      if (fo.pool) fo.pool.material.color.setScalar(on ? NIGHT.pool : 1);
    }
  }
  function disposeScene(sc) {
    const B = sc.userData && sc.userData.bake; if (B) { B.bk.shadow.dispose(); B.mat.dispose(); }   // 景物影子的那张大图
    sc.traverse(o => {
      if (o.isMesh && o.geometry && !o.geometry._keep) o.geometry.dispose();
      const m = o.material;
      if (m && !m._keep) { if (m.map && m.map !== K.glowTex && !m.map._keep) m.map.dispose(); m.dispose(); }
    });
  }

  /* ---------- 光效收集 ---------- */
  function fxKit() {
    return { pools: [], glows: [], fires: [],
      pool(x, z, r, col, a) { this.pools.push([x, z, r, col, a]); }, glow(x, y, z, s, col, a) { this.glows.push([x, y, z, s, col, a]); }, fire(x, y, z) { this.fires.push([x, y, z]); } };
  }
  function fxBuild(fx, parent) {
    const out = { fires: [], glows: [] };
    if (fx.pools.length) {
      const P = [], UV = [], C = [];
      for (const p of fx.pools) {
        const x = p[0], z = p[1], r = p[2], col = lin(p[3]), k = p[4] * 0.6;
        P.push(x - r, 0.04, z - r, x - r, 0.04, z + r, x + r, 0.04, z + r, x - r, 0.04, z - r, x + r, 0.04, z + r, x + r, 0.04, z - r);
        UV.push(0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0);
        for (let i = 0; i < 6; i++) C.push(col[0] * k, col[1] * k, col[2] * k);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
      const me = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: K.glowTex, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      me.renderOrder = 2; parent.add(me); out.pool = me;
    }
    for (const g of fx.glows) { const s = K.glowSprite(g[4], g[3], g[5], 1.8); s.position.set(g[0], g[1], g[2]); s.userData.op = g[5]; parent.add(s); out.glows.push(s); }
    for (const f of fx.fires) out.fires.push({ p: f, s: [0, 1, 2].map(i => { const s = K.glowSprite(i === 0 ? '#ff4a12' : i === 1 ? '#ff8a22' : '#ffd86a', 0.5, 0.9, 3.2); parent.add(s); return s; }) });
    return out;
  }
  function fxAnim(o, t) {
    for (const f of o.fires) f.s.forEach((s, i) => {
      const k = (t * 1.7 + i / 3 + f.p[0] * 0.37) % 1, w = (0.66 - k * 0.42) * (1 + Math.sin(t * 13 + i * 2) * 0.12);
      s.scale.set(w, w * 1.5, 1); s.position.set(f.p[0] + Math.sin(t * 6 + i * 2.1) * 0.03, f.p[1] + k * 0.55, f.p[2]); s.material.opacity = 0.95 * (1 - k * 0.8);
    });
    for (const s of o.glows) s.material.opacity = s.userData.op * (1 + Math.sin(t * 2.4 + s.position.x * 3) * 0.1);
  }

  /* ================= 景物建模 ================= */
  // 岩石：细分球体 + 多倍频起伏 + 随机切面，法线按位置合并求平滑
  const rockGeo = [0, 1, 2].map(i => {
    const g = new THREE.IcosahedronGeometry(1, 2), p = g.attributes.position, n = p.count, sh = new Float32Array(n), rnd = mulberry32(31 + i * 7), cuts = [];
    for (let j = 0; j < 9; j++) { const a = rnd() * TAU, y = rnd() * 1.4 - 0.4, s = Math.sqrt(Math.max(0, 1 - Math.min(1, y * y))); cuts.push([Math.cos(a) * s, clamp(y, -1, 1), Math.sin(a) * s, 0.6 + rnd() * 0.25]); }
    for (let j = 0; j < n; j++) {
      let x = Math.round(p.getX(j) * 1000) / 1000, y = Math.round(p.getY(j) * 1000) / 1000, z = Math.round(p.getZ(j) * 1000) / 1000;
      const k = 1 + 0.16 * Math.sin(3.1 * x + 1.3 * i + 2 * y) * Math.cos(2.7 * z - 1.9 * y + i) + 0.1 * Math.sin(6.3 * y + 4.1 * x * z + i * 2.1) + 0.06 * Math.sin(9.7 * x - 7.3 * z + 5.9 * y + i);
      x *= k; y *= k; z *= k;
      for (const c of cuts) { const d = x * c[0] + y * c[1] + z * c[2] - c[3]; if (d > 0) { x -= c[0] * d; y -= c[1] * d; z -= c[2] * d; } }
      y = Math.max(-0.42, y); p.setXYZ(j, x, y, z); sh[j] = (0.72 + 0.28 * sst(-0.42, 0.15, y)) * (0.86 + 0.28 * clamp(k - 0.8, 0, 0.5));
    }
    g.computeVertexNormals();
    const N = g.attributes.normal, acc = {};
    for (let j = 0; j < n; j++) { const key = p.getX(j).toFixed(3) + p.getY(j).toFixed(3) + p.getZ(j).toFixed(3), a = acc[key] || (acc[key] = [0, 0, 0]); a[0] += N.getX(j); a[1] += N.getY(j); a[2] += N.getZ(j); }
    for (let j = 0; j < n; j++) { const a = acc[p.getX(j).toFixed(3) + p.getY(j).toFixed(3) + p.getZ(j).toFixed(3)], l = Math.hypot(a[0], a[1], a[2]) || 1; N.setXYZ(j, a[0] / l, a[1] / l, a[2] / l); }
    g.setAttribute('shade', new THREE.Float32BufferAttribute(sh, 1)); g._keep = true; return g;
  });
  // 一张植被卡片：以 c 为中心，a 为纵向半轴、b 为横向半轴；法线取所在树冠的柔和法线，kb 为底边压暗系数
  function card(F, cx, cy, cz, ax, ay, az, bx, by, bz, nx, ny, nz, r, g, b, tile, kb) {
    const t = TILE[tile];
    const put = (sa, sb, u, v, m) => { F.tu = u; F.tv = v; F.v(cx + ax * sa + bx * sb, cy + ay * sa + by * sb, cz + az * sa + bz * sb, nx, ny, nz, r * m, g * m, b * m); };
    put(-1, -1, t[0], t[1], kb); put(-1, 1, t[2], t[1], kb); put(1, 1, t[2], t[3], 1);
    put(-1, -1, t[0], t[1], kb); put(1, 1, t[2], t[3], 1); put(1, -1, t[0], t[3], 1);
  }
  function canopy(L, F, cx, cy, cz, cr, n, sz, rnd, pal, tile, lod) {
    const c0 = lin(pal[0]), c1 = lin(pal[1]), c2 = lin(pal[2]);
    if (!lod) L.m('leaf').add(K.ico(0), M(cx, cy, cz, cr * 0.46, cr * 0.4, cr * 0.46, 0, rnd() * 3, 0), Art.shade(pal[0], -0.5), Art.shade(pal[0], -0.2));
    for (let i = 0; i < n; i++) {
      const dy = clamp(rnd() * 2 - 0.72, -1, 1), th = rnd() * TAU, s = Math.sqrt(1 - dy * dy), dx = s * Math.cos(th), dz = s * Math.sin(th), r = cr * (0.6 + rnd() * 0.44), h = sz * (0.8 + rnd() * 0.5);
      let nx = dx * 0.7, ny = dy * 0.7 + 0.55, nz = dz * 0.7; const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
      let ax = rnd() - 0.5, ay = rnd() - 0.2, az = rnd() - 0.5; const dt = (ax * dx + ay * dy + az * dz) * 0.8; ax -= dx * dt; ay -= dy * dt; az -= dz * dt;
      let l = Math.hypot(ax, ay, az) || 1; ax *= h / l; ay *= h / l; az *= h / l;
      let bx = dy * az - dz * ay, by = dz * ax - dx * az, bz = dx * ay - dy * ax; l = Math.hypot(bx, by, bz) || 1; bx *= h / l; by *= h / l; bz *= h / l;
      const k = clamp(dy * 0.5 + 0.5, 0, 1), q = rnd(), a = k * k * 0.7, sh = (0.5 + 0.5 * k) * (0.72 + 0.4 * (r / cr - 0.6) / 0.44);
      card(F, cx + dx * r, cy + dy * r * 0.82, cz + dz * r, ax, ay, az, bx, by, bz, nx, ny, nz,
        lerp(lerp(c0[0], c1[0], q), c2[0], a) * sh, lerp(lerp(c0[1], c1[1], q), c2[1], a) * sh, lerp(lerp(c0[2], c1[2], q), c2[2], a) * sh, tile, 0.85);
    }
  }
  const TREEPAL = { treeG: ['#1f5a34', '#3f8f4c', '#8fce70'], treeP: ['#b0507c', '#e686ac', '#ffd0e0'], treeA: ['#9a4418', '#d8742a', '#f6bc58'], treeR: ['#7a1c1c', '#c03a2a', '#f07a50'], treeD: ['#143e30', '#2a6e50', '#62b484'] };
  function tree(L, F, x, z, sc, rnd, pal, lod) {
    sc *= 1.2;
    const h = (1.15 + rnd() * 0.5) * sc, lx = (rnd() - 0.5) * 0.3 * sc, lz = (rnd() - 0.5) * 0.25 * sc, bark = pal === TREEPAL.treeP ? '#3c2a26' : '#46331f', barkL = '#70583c';
    L.m('bark').tube([[x, -0.05, z], [x + lx * 0.15, h * 0.35, z + lz * 0.15], [x + lx * 0.55, h * 0.7, z + lz * 0.55], [x + lx, h, z + lz]], [0.2 * sc, 0.125 * sc, 0.105 * sc, 0.085 * sc], lod ? 5 : 7, bark, barkL, { cap: 0 });
    if (!lod) for (let i = 0; i < 4; i++) { const a = i * 1.57 + rnd(); L.tube([[x + Math.cos(a) * 0.1 * sc, 0.22 * sc, z + Math.sin(a) * 0.1 * sc], [x + Math.cos(a) * 0.22 * sc, 0.03, z + Math.sin(a) * 0.22 * sc], [x + Math.cos(a) * 0.36 * sc, -0.05, z + Math.sin(a) * 0.36 * sc]], [0.07 * sc, 0.06 * sc, 0.03 * sc], 5, bark, bark, { cap: 0 }); }
    const nbr = 3 + Math.floor(rnd() * 2), cl = [[x + lx, h + 0.36 * sc, z + lz, 0.64 * sc]];
    for (let i = 0; i < nbr; i++) {
      const a = i / nbr * TAU + rnd(), d = (0.52 + rnd() * 0.3) * sc, y0 = h * (0.7 + rnd() * 0.2), ex = x + lx + Math.cos(a) * d, ez = z + lz + Math.sin(a) * d, ey = y0 + (0.3 + rnd() * 0.35) * sc;
      L.m('bark').tube([[x + lx * 0.8, y0, z + lz * 0.8], [(x + lx + ex) / 2, y0 + (ey - y0) * 0.35, (z + lz + ez) / 2], [ex, ey, ez]], [0.07 * sc, 0.048 * sc, 0.024 * sc], lod ? 4 : 5, bark, barkL, { cap: 0 });
      cl.push([ex, ey + 0.1 * sc, ez, (0.44 + rnd() * 0.16) * sc]);
    }
    for (const c of cl) canopy(L, F, c[0], c[1], c[2], c[3], Math.round((lod ? 13 : 24) * c[3] / (0.5 * sc)), (lod ? 0.36 : 0.3) * sc, rnd, pal, pal === TREEPAL.treeP ? 1 : 0, lod);
  }
  function rock(L, Gl, x, z, sc, rnd, col, cap, crack, fx) {
    const s = (0.4 + rnd() * 0.16) * sc, lo = Art.shade(col, -0.32), hi = cap ? Art.mix(col, cap, 0.4) : Art.shade(col, 0.18);
    L.m('stone').add(rockGeo[Math.floor(rnd() * 3)], M(x, s * 0.4, z, s * 1.15, s * 0.95, s, 0, rnd() * TAU, 0), lo, hi);
    if (rnd() < 0.65) L.add(rockGeo[Math.floor(rnd() * 3)], M(x + 0.34 * sc, s * 0.18, z + 0.16, s * 0.52, s * 0.44, s * 0.52, 0, rnd() * TAU, 0), lo, hi);
    if (rnd() < 0.4) L.add(rockGeo[0], M(x - 0.3 * sc, s * 0.1, z + 0.22, s * 0.3, s * 0.26, s * 0.34, 0, rnd() * TAU, 0), lo, hi);
    if (crack) {
      Gl.glow(3);
      for (let i = 0; i < 3; i++) { const a = rnd() * TAU; Gl.s(x + Math.cos(a) * s * 0.85, s * (0.2 + rnd() * 0.4), z + Math.sin(a) * s * 0.8, 0.06, 0.1, 0.06, crack); }
      fx.pool(x, z, 1.1, crack, 0.3);
    }
  }
  function crystal(L, x, z, sc, rnd, col, fx) {
    const lo = Art.shade(col, -0.25), hi = Art.mix(col, '#ffffff', 0.7);
    L.m(0.08, 0, 0.1, 0.05);
    for (let i = 0; i < 5; i++) {
      const a = rnd() * TAU, d = i ? 0.22 * sc : 0, h = (i ? 0.4 + rnd() * 0.35 : 0.95) * sc, r = (i ? 0.085 : 0.13) * sc, tx = (rnd() - 0.5) * (i ? 0.6 : 0.2), tz = (rnd() - 0.5) * (i ? 0.6 : 0.2);
      const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d, top = [px + tx * h, h, pz + tz * h];
      L.stick([px, 0, pz], top, r, r * 0.8, lo, 6, hi);
      L.stick(top, [top[0] + tx * r * 2, h + r * 2, top[2] + tz * r * 2], r * 0.8, 0.004, hi, 6, '#ffffff');
    }
    fx.pool(x, z, 1.5, col, 0.4); fx.glow(x, 0.5 * sc, z, 1.3, col, 0.28);
  }
  /* ---------- 室内陈设：一格一件，靠墙的都朝南。名字后面可带一个变体，如 shelf:cloth、c:jar ---------- */
  function furniture(name, v, L, Gl, x, z, rnd, fx) {
    const wd = '#6a4428', wdL = '#8a5c38', dk = '#3e2818', C5 = ['#b84444', '#447eb0', '#c89a38', '#6aa860', '#8a60b4'];
    if (name === 'void') return true;   // 只占位（两格宽的家具的另一半）
    if (name === 'c') { clutter(L, x - (v === 'barrel' ? 0.18 : 0), z, rnd, v); return true; }
    if (name === 'table' || name === 'tableR') {
      if (name === 'tableR') L.m('wood').c(x, 0.72, z, 0.5, 0.06, wdL, 1, 16).c(x, 0.36, z, 0.09, 0.7, wd, 1.8, 8);
      else { L.m('wood').b(x, 0.72, z, 0.9, 0.06, 0.9, wdL); for (const s of [-1, 1]) for (const e of [-1, 1]) L.b(x + s * 0.38, 0.35, z + e * 0.38, 0.07, 0.7, 0.07, wd); }
      L.m(0.3, 0, 0.2, 0.1).s(x - 0.12, 0.82, z + 0.04, 0.08, 0.07, 0.08, '#e8e4d8', '#ffffff').c(x - 0.03, 0.83, z + 0.04, 0.012, 0.08, '#e8e4d8', 1, 5, null, 0, 0, 1.1);
      for (let k = 0; k < 3; k++) L.c(x + 0.14 + Math.cos(k * 2.1) * 0.13, 0.775, z + Math.sin(k * 2.1) * 0.16, 0.035, 0.05, '#dfe8e4', 1.25, 8);
      if (v === 'food') { L.c(x + 0.02, 0.765, z - 0.22, 0.13, 0.02, '#f0ead8', 1, 10); L.m('leaf').s(x + 0.02, 0.8, z - 0.22, 0.09, 0.04, 0.09, '#b86a3a', '#e0a050'); L.m(0.3, 0, 0.2, 0.1).s(x - 0.26, 0.86, z - 0.2, 0.08, 0.11, 0.08, '#5a3a2a', '#8a5a3a'); }
    } else if (name === 'stool') L.m('wood').c(x, 0.4, z, 0.2, 0.05, wdL, 1, 10).c(x, 0.2, z, 0.15, 0.38, wd, 0.75, 8);
    else if (name === 'bench') { L.m('wood').b(x, 0.4, z, 0.96, 0.06, 0.32, wdL); for (const s of [-1, 1]) L.b(x + s * 0.38, 0.2, z, 0.07, 0.38, 0.28, wd); }
    else if (name === 'counter') {
      L.m('wood').b(x, 0.45, z, 1.0, 0.9, 0.5, wd, 0, 0, 0, wdL).b(x, 0.92, z, 1.04, 0.05, 0.6, '#9a6a40').b(x, 0.5, z + 0.256, 0.8, 0.6, 0.012, dk);
      const k = Math.floor(rnd() * 4);
      if (k === 0) { L.m('wood').b(x, 0.97, z, 0.34, 0.04, 0.2, dk); L.m('gold'); for (let i = 0; i < 5; i++) L.s(x - 0.12 + i * 0.06, 0.985, z, 0.02, 0.02, 0.02, gold); }   // 算盘
      else if (k === 1) L.m('cloth').b(x, 0.965, z, 0.3, 0.03, 0.22, '#e8dcc0', 0, 0.3, 0).b(x + 0.02, 0.985, z, 0.28, 0.012, 0.2, '#3a5a8a', 0, 0.2, 0);   // 账簿
      else if (k === 2) { L.m(0.3, 0, 0.2, 0.1).s(x, 1.06, z, 0.09, 0.12, 0.09, '#5a3a2a', '#8a5a3a'); L.m('cloth').c(x, 1.18, z, 0.05, 0.03, '#b0402e', 1, 8); }
    } else if (name === 'shelf') {   // 靠北墙的货架：三层搁板，摆着货
      const zz = z - 0.3; L.m('wood').b(x, 0.95, zz - 0.14, 1.0, 1.9, 0.04, dk); for (const s of [-1, 1]) L.b(x + s * 0.48, 0.95, zz, 0.05, 1.9, 0.3, wd);
      for (let j = 0; j < 4; j++) {
        const y = 0.1 + j * 0.56; L.m('wood').b(x, y, zz, 0.96, 0.04, 0.3, wdL); if (j === 3) break;
        for (let i = 0; i < 4; i++) {
          const gx = x - 0.34 + i * 0.225, c5 = C5[(i + j * 2 + Math.floor(rnd() * 5)) % 5];
          if (v === 'cloth') L.m('silk').c(gx, y + 0.1, zz, 0.07, 0.26, c5, 1, 8, Art.shade(c5, 0.25), PI / 2, 0, 0);
          else if (v === 'books') { L.m('cloth'); for (let k = 0; k < 3; k++) L.b(gx - 0.05 + k * 0.05, y + 0.16, zz, 0.04, 0.26, 0.2, k % 2 ? '#3a5a8a' : '#d8ccb0', 0, 0, (rnd() - 0.5) * 0.12); }
          else if (v === 'jars') { L.m(0.3, 0, 0.2, 0.1).s(gx, y + 0.14, zz, 0.085, 0.12, 0.085, '#5a3a2a', '#8a5a3a'); L.m('cloth').c(gx, y + 0.26, zz, 0.045, 0.025, '#b0402e', 1, 8); }
          else if (v === 'iron') { L.m('metal').b(gx, y + 0.2, zz, 0.03, 0.36, 0.012, '#cfd8e4', 0, 0, (rnd() - 0.5) * 0.3); L.m('gold').b(gx, y + 0.04, zz, 0.07, 0.03, 0.03, gold); }
          else if (v === 'herbs') { L.m('wood').b(gx, y + 0.1, zz, 0.18, 0.16, 0.22, '#7a5230', 0, 0, 0, '#9a6a40'); L.m('gold').s(gx, y + 0.1, zz + 0.115, 0.014, 0.014, 0.01, gold); }
          else if (v === 'silver') { L.m('metal'); for (let k = 0; k < 2; k++) L.b(gx, y + 0.06 + k * 0.07, zz, 0.14, 0.06, 0.1, '#d8dce4', 0, 0.2 * k, 0); }
          else L.m(0.25, 0, 0.1, 0.1).c(gx, y + 0.12, zz, 0.07, 0.2, c5, 0.75, 10);
        }
      }
    } else if (name === 'bed') {   // 两格宽（另一格用 void 占位）
      const bx = x + 0.5; L.m('wood').b(bx, 0.22, z - 0.05, 1.9, 0.44, 0.86, wd, 0, 0, 0, wdL).b(bx - 0.93, 0.6, z - 0.05, 0.06, 0.9, 0.86, dk).b(bx, 0.75, z - 0.47, 1.9, 1.2, 0.05, dk);
      L.m('cloth').b(bx + 0.2, 0.5, z - 0.05, 1.4, 0.14, 0.8, v === 'red' ? '#a8362a' : '#3a5a8a', 0, 0, 0, v === 'red' ? '#c85a4a' : '#5a7aaa').b(bx - 0.68, 0.52, z - 0.05, 0.3, 0.12, 0.56, '#efe6d0');
    } else if (name === 'screen') {   // 屏风
      for (let i = -1; i <= 1; i++) { const a = i * 0.35, px = x + i * 0.34; L.m('wood').b(px, 0.9, z - Math.abs(i) * 0.06, 0.36, 1.8, 0.04, dk, 0, a, 0); L.m('silk').b(px, 0.98, z - Math.abs(i) * 0.06 + 0.012, 0.28, 1.36, 0.03, v === 'green' ? '#5a8a6a' : '#e8dcc0', 0, a, 0, v === 'green' ? '#8ab89a' : '#f6efdc'); }
    } else if (name === 'rack') {   // 兵器架
      L.m('wood').b(x, 0.08, z, 0.9, 0.16, 0.36, wd).b(x, 1.0, z, 0.9, 0.06, 0.1, wd); for (const s of [-1, 1]) L.b(x + s * 0.42, 0.55, z, 0.06, 1.0, 0.08, dk);
      for (let i = 0; i < 4; i++) { const gx = x - 0.3 + i * 0.2; L.m('wood').stick([gx, 0.16, z], [gx, 1.75, z], 0.02, 0.02, '#5a3a22', 5); L.m('metal'); if (i % 2) L.b(gx, 1.86, z, 0.05, 0.3, 0.012, '#cfd8e4'); else L.b(gx, 1.8, z, 0.11, 0.34, 0.012, '#cfd8e4', 0, 0, 0.12); L.m('silk').s(gx, 1.62, z, 0.04, 0.06, 0.04, '#c8302a'); }
    } else if (name === 'anvil') { L.m('bark').c(x, 0.22, z, 0.24, 0.44, '#5a4030', 1, 10); L.m('metal').b(x, 0.52, z, 0.5, 0.16, 0.22, '#2e282e', 0, 0, 0, '#5a5460').b(x + 0.3, 0.55, z, 0.2, 0.08, 0.12, '#3a3438'); L.m('wood').stick([x - 0.1, 0.62, z + 0.1], [x + 0.25, 0.66, z - 0.12], 0.02, 0.02, wd, 5); L.m('metal').b(x + 0.27, 0.67, z - 0.13, 0.12, 0.08, 0.08, '#4a444a'); }
    else if (name === 'forge') {   // 锻炉
      L.m('stone').b(x, 0.4, z - 0.1, 0.96, 0.8, 0.7, '#4a4442', 0, 0, 0, '#6a6460').b(x, 1.5, z - 0.3, 0.6, 1.4, 0.3, '#3e3836', 0, 0, 0, '#5a5450');
      Gl.glow(4).s(x, 0.82, z - 0.05, 0.28, 0.06, 0.2, '#ff8a2a'); fx.fire(x, 0.9, z - 0.05); fx.pool(x, z + 0.4, 2.6, '#ff8a3a', 0.45); fx.glow(x, 1.0, z, 1.4, '#ff9a50', 0.35);
    } else if (name === 'altar') {   // 神像与供桌
      L.m('stone').b(x, 0.3, z - 0.22, 0.96, 0.6, 0.5, '#7a2a1e', 0, 0, 0, '#9a3a2a');
      L.m('gold').c(x, 0.95, z - 0.24, 0.26, 0.7, '#c9a13a', 0.6, 12, '#e8c66a').s(x, 1.42, z - 0.24, 0.15, 0.17, 0.15, '#e8c66a').c(x, 1.62, z - 0.24, 0.12, 0.1, '#c9a13a', 0.5, 8);
      L.m('wood').b(x, 0.38, z + 0.22, 0.9, 0.06, 0.34, '#5a2a1e'); for (const s of [-1, 1]) L.b(x + s * 0.38, 0.18, z + 0.22, 0.06, 0.36, 0.28, '#4a221a');
      L.m('metal').c(x, 0.48, z + 0.22, 0.09, 0.12, '#6a5a3a', 1.3, 10); Gl.glow(3.5); for (const s of [-1, 1]) { L.m('silk').c(x + s * 0.3, 0.5, z + 0.22, 0.02, 0.2, '#c8302a', 1, 6); Gl.s(x + s * 0.3, 0.63, z + 0.22, 0.02, 0.035, 0.02, '#ffd27a'); }
      fx.glow(x, 0.7, z + 0.3, 1.2, '#ffb050', 0.4); fx.pool(x, z + 0.6, 2.0, '#ffb050', 0.3);
    } else if (name === 'burner') { L.m('metal').c(x, 0.36, z, 0.3, 0.3, '#5a5038', 1.25, 12, '#8a7a50').c(x, 0.12, z, 0.14, 0.24, '#4a4230', 1.4, 8); Gl.glow(3).s(x, 0.54, z, 0.2, 0.03, 0.2, '#ff7a2a'); L.m('silk'); for (let i = 0; i < 3; i++) L.stick([x + (i - 1) * 0.07, 0.52, z], [x + (i - 1) * 0.08, 0.86, z], 0.007, 0.007, '#8a3a2a', 4); fx.glow(x, 0.8, z, 0.9, '#ffb060', 0.3); }
    else if (name === 'cushion') L.m('cloth').c(x, 0.07, z, 0.3, 0.14, '#b08a3a', 0.9, 14, '#d8b060');
    else if (name === 'desk') {   // 书案 / 公案
      L.m('wood').b(x, 0.74, z, 1.0, 0.06, 0.56, v === 'red' ? '#7a2a1e' : wdL); for (const s of [-1, 1]) L.b(x + s * 0.42, 0.36, z, 0.08, 0.72, 0.5, v === 'red' ? '#5a2018' : wd); L.b(x, 0.5, z + 0.27, 0.8, 0.44, 0.02, v === 'red' ? '#8a3226' : dk);
      L.m('cloth').b(x - 0.1, 0.78, z, 0.34, 0.012, 0.26, '#efe6d0', 0, 0.15, 0); L.m('wood').c(x + 0.3, 0.83, z - 0.1, 0.045, 0.12, dk, 1, 8); for (let i = 0; i < 3; i++) L.stick([x + 0.3, 0.86, z - 0.1], [x + 0.28 + i * 0.02, 1.02, z - 0.1 + (i - 1) * 0.02], 0.006, 0.004, '#c8b890', 4);
      L.m('stone').b(x + 0.12, 0.79, z + 0.12, 0.12, 0.03, 0.09, '#2a2a30');
    } else if (name === 'chair') { L.m('wood').b(x, 0.42, z, 0.5, 0.05, 0.46, wdL).b(x, 0.8, z - 0.22, 0.5, 0.76, 0.04, wd); for (const s of [-1, 1]) { L.b(x + s * 0.22, 0.2, z + 0.2, 0.05, 0.4, 0.05, wd).b(x + s * 0.22, 0.2, z - 0.2, 0.05, 0.4, 0.05, wd).b(x + s * 0.24, 0.62, z, 0.04, 0.04, 0.44, wd); } }
    else if (name === 'drum') { L.m('wood'); for (const s of [-1, 1]) L.stick([x + s * 0.3, 0, z + 0.15], [x + s * 0.2, 1.1, z], 0.03, 0.03, wd, 5).stick([x + s * 0.3, 0, z - 0.15], [x + s * 0.2, 1.1, z], 0.03, 0.03, wd, 5); L.m(0.6, 0, 0.3, 0.1).c(x, 1.15, z, 0.34, 0.36, '#a8362a', 1, 16, '#c85a4a', PI / 2, 0, 0); L.m('leather').c(x, 1.15, z + 0.185, 0.31, 0.01, '#e8dcc0', 1, 16, null, PI / 2, 0, 0); }
    else if (name === 'lampS') {   // 落地灯
      L.m('wood').c(x, 0.03, z, 0.16, 0.06, dk, 0.8, 8).stick([x, 0.05, z], [x, 1.3, z], 0.022, 0.018, dk, 6);
      Gl.glow(3.4).surf(10, 5, (u, vv, o) => { const a = u * TAU, p = lerp(0.1, 0.9, vv) * PI; o[0] = x + Math.sin(p) * Math.sin(a) * 0.12; o[1] = 1.48 + Math.cos(p) * 0.17; o[2] = z + Math.sin(p) * Math.cos(a) * 0.12; }, ['#ffe0a0', '#ff8a3a'], { closed: true, flip: true });
      L.m('gold').c(x, 1.66, z, 0.05, 0.03, gold, 1, 8).c(x, 1.3, z, 0.05, 0.03, gold, 1, 8);
      fx.glow(x, 1.48, z, 1.3, '#ffa050', 0.45); fx.pool(x, z, 2.6, '#ffa040', 0.32);
    } else if (name === 'stairs') { L.m('wood'); for (let k = 0; k < 7; k++) L.b(x, 0.12 + k * 0.24, z + 0.42 - k * 0.2, 0.9, 0.24 + k * 0.001, 0.22, k % 2 ? wd : wdL); for (const s of [-1, 1]) L.stick([x + s * 0.46, 0.6, z + 0.5], [x + s * 0.46, 2.3, z - 0.85], 0.03, 0.03, dk, 5); }   // 通往楼上的楼梯（只是陈设）
    else if (name === 'stage') L.m('wood').b(x, 0.12, z, 1.0, 0.24, 1.0, wd, 0, 0, 0, wdL).b(x, 0.245, z, 1.0, 0.012, 1.0, '#a8362a');   // 说书台 / 戏台的一格
    else if (name === 'clothrack') { L.m('wood'); for (const s of [-1, 1]) L.stick([x + s * 0.44, 0, z], [x + s * 0.44, 1.7, z], 0.03, 0.03, wd, 5); L.stick([x - 0.46, 1.66, z], [x + 0.46, 1.66, z], 0.022, 0.022, wd, 5); L.m('silk'); for (let i = 0; i < 4; i++) { const c5 = C5[(i + Math.floor(rnd() * 5)) % 5], hh = 1.0 + rnd() * 0.4; L.b(x - 0.33 + i * 0.22, 1.64 - hh / 2, z, 0.19, hh, 0.02, c5, 0, 0, 0, Art.shade(c5, 0.25)); } }
    else if (name === 'stove') { L.m('stone').b(x, 0.38, z - 0.1, 0.96, 0.76, 0.7, '#8a7a68', 0, 0, 0, '#a8988a'); L.m('metal').c(x, 0.8, z - 0.1, 0.3, 0.1, '#2e282e', 0.6, 14); Gl.glow(3.5).b(x, 0.25, z + 0.255, 0.26, 0.2, 0.01, '#ff7a2a'); fx.pool(x, z + 0.5, 1.6, '#ff8a3a', 0.3); L.m('leaf').s(x, 0.84, z - 0.1, 0.2, 0.05, 0.2, '#e8e0d0'); }
    else if (name === 'vat') { L.m(0.3, 0, 0.2, 0.1).s(x, 0.42, z, 0.4, 0.44, 0.4, '#4a3024', '#7a5038'); L.m('wood').c(x, 0.84, z, 0.3, 0.05, wdL, 1, 12); L.m('cloth').b(x, 0.5, z + 0.39, 0.22, 0.22, 0.01, '#b0402e'); }
    else if (name === 'scale') { L.m('wood').b(x, 0.45, z, 0.7, 0.9, 0.5, wd, 0, 0, 0, wdL); L.m('metal').stick([x, 0.9, z], [x, 1.3, z], 0.015, 0.015, '#8a8a90', 5).stick([x - 0.26, 1.28, z], [x + 0.26, 1.28, z], 0.012, 0.012, '#8a8a90', 5); for (const s of [-1, 1]) { L.stick([x + s * 0.26, 1.28, z], [x + s * 0.26, 1.08, z], 0.004, 0.004, '#3a3a40', 4); L.m('gold').c(x + s * 0.26, 1.07, z, 0.09, 0.015, gold, 1.2, 10); L.m('metal'); } }
    else return false;
    return true;
  }
  /* 屋子的四壁：北墙和东西两墙是整面的，南墙只留一道矮矮的墙根和门柱（镜头从南面往里看） */
  function roomWalls(m, chunk, fx, dyn) {
    const d = m.d, R = d.room || {}, w = m.w, h = m.h, WH = 2.7, wc = R.wall || '#e4d8c0', wn = R.wood || '#6a3e26', dk = Art.shade(wn, -0.4), lightC = '#ffd08a';
    const c = chunk(1, 1), L = c.L, Gl = c.Gl;
    L.m('plaster').b(w / 2, WH / 2, 0.85, w - 1.4, WH, 0.3, wc, 0, 0, 0, Art.shade(wc, -0.14));
    L.m('wood').b(w / 2, 0.42, 1.005, w - 1.7, 0.84, 0.03, wn, 0, 0, 0, Art.shade(wn, 0.14)).b(w / 2, 0.87, 1.02, w - 1.7, 0.06, 0.05, dk).b(w / 2, WH - 0.1, 1.01, w - 1.7, 0.2, 0.05, dk).b(w / 2, WH + 0.06, 0.85, w - 1.3, 0.12, 0.44, dk);
    for (const s of [0, 1]) {
      const x = s ? w - 0.85 : 0.85, fxn = s ? w - 1.005 : 1.005, zl = h - 1.4;
      L.m('plaster').b(x, WH / 2, h / 2, 0.3, WH, zl, wc, 0, 0, 0, Art.shade(wc, -0.14));
      L.m('wood').b(fxn, 0.42, h / 2, 0.03, 0.84, zl - 0.3, wn, 0, 0, 0, Art.shade(wn, 0.14)).b(fxn, 0.87, h / 2, 0.05, 0.06, zl - 0.3, dk).b(fxn, WH - 0.1, h / 2, 0.05, 0.2, zl - 0.3, dk).b(x, WH + 0.06, h / 2, 0.44, 0.12, zl + 0.1, dk);
    }
    // 柱子：四角各一根，北墙上每隔几格一根
    const np = Math.max(2, Math.round((w - 2) / 3)) + 1;
    for (let i = 0; i < np; i++) { const px = 1.08 + i * (w - 2.16) / (np - 1); if (R.sign && Math.abs(px - w / 2) < R.sign.length * 0.22 + 0.3) continue; L.m(0.38, 0, 0.3, 0.05).c(px, WH / 2, 1.08, 0.1, WH, wn, 1, 10, Art.shade(wn, -0.2)); }   // 匾下面不立柱
    for (const s of [0, 1]) L.c(s ? w - 1.08 : 1.08, WH / 2, h - 1.08, 0.1, WH, wn, 1, 10, Art.shade(wn, -0.2));
    // 北墙上：没摆东西的地方开窗、挂字画
    let k = 0;
    for (let x = 2; x <= w - 3; x++) {
      if (m.ob[m.I(x, 1)] || (R.sign && Math.abs(x + 0.5 - w / 2) < R.sign.length * 0.3 + 0.6)) continue;
      if (k++ % 2 === 0) winAt(L, Gl, x + 0.5, 1.72, 1.0, 0.66, 0.62, lightC);
      else { L.m('cloth').b(x + 0.5, 1.6, 1.012, 0.46, 1.0, 0.012, '#efe6cc').b(x + 0.5, 2.12, 1.016, 0.5, 0.04, 0.02, dk).b(x + 0.5, 1.08, 1.016, 0.5, 0.04, 0.02, dk); L.m('leaf'); for (let j = 0; j < 4; j++) L.b(x + 0.42 + ((j * 37) % 5) * 0.04, 1.3 + j * 0.2, 1.02, 0.03 + (j % 2) * 0.05, 0.12, 0.004, j % 3 ? '#2a2a30' : '#8a3a2a'); }
    }
    // 南墙：矮墙根，门口两根门柱
    const ex = (d.exits || [])[0] || { x: Math.floor(w / 2) - 1, w: 2 }, x0 = ex.x, x1 = ex.x + (ex.w || 1), zs = h - 0.85;
    L.m('stone').b((0.7 + x0) / 2, 0.22, zs, x0 - 0.7, 0.44, 0.3, '#6e6a64', 0, 0, 0, '#8a867e').b((x1 + w - 0.7) / 2, 0.22, zs, w - 0.7 - x1, 0.44, 0.3, '#6e6a64', 0, 0, 0, '#8a867e');
    L.m('wood').b((x0 + x1) / 2, 0.03, zs, x1 - x0, 0.06, 0.34, dk);
    for (const x of [x0 - 0.05, x1 + 0.05]) L.m(0.38, 0, 0.3, 0.05).c(x, 0.6, zs, 0.09, 1.2, wn, 1, 8);
    fx.pool(w / 2, h / 2, Math.max(w, h) * 0.75, '#ffb868', 0.1);
    if (R.sign) signPlane(dyn, R.sign, w / 2, 2.12, 1.03, 0, 1.15);
  }
  /* ---------- 田园与花圃（一格一件，名字后面带品种，如 crop:wheat、flower:peony）：庄稼、花丛、稻草人、草垛、水井、花架、假山 ---------- */
  const CROP = {   // soil 土色，c 苗色（深 / 浅），h 苗高，rows 一格几垄；wet 水田，leaf 贴地的菜，bloom 顶上开花
    wheat: { soil: '#7a5c38', c: ['#c08c28', '#f2d66a'], h: 0.62, rows: 4 },
    rice: { soil: '#3e5648', c: ['#8a9c2c', '#e2d658'], h: 0.46, rows: 5, wet: 1 },   // 快熟的稻子：黄里带青
    veg: { soil: '#5e4630', c: ['#2f7a3a', '#86cc64'], h: 0.2, rows: 3, leaf: 1 },
    rape: { soil: '#6a5236', c: ['#3f8a3a', '#8ac850'], h: 0.5, rows: 4, bloom: '#f2c200' }
  };
  const FLOWERS = { peony: ['#c81e5e', '#ff6aa4'], rose: ['#b01028', '#f03c4c'], mum: ['#d89000', '#ffc81e'], white: ['#e4dccc', '#fffaf0'], violet: ['#5e30bc', '#a878f4'], blue: ['#2450c8', '#6aa0f8'], peach: ['#f47068', '#ffb4a4'], orange: ['#e06008', '#ff9c38'] };
  const FLOWER_KEYS = Object.keys(FLOWERS);
  function outdoor(name, v, L, F, Gl, x, z, sc, rnd, fx) {
    if (name === 'crop') {
      const q = CROP[v] || CROP.wheat, c0 = lin(q.c[0]), c1 = lin(q.c[1]), dkS = Art.shade(q.soil, -0.14);
      if (q.wet) L.m(0.32, 0, 0.3, 0.02).b(x, 0.018, z, 1.0, 0.036, 1.0, '#5c6e58');   // 水田：一层浅水（不能太亮太光，否则背阴处映出来是一块黑）
      else L.m('bark').b(x, 0.025, z, 1.0, 0.05, 1.0, q.soil, 0, 0, 0, Art.shade(q.soil, 0.1));
      for (let r = 0; r < q.rows; r++) {
        const rz = z - 0.5 + (r + 0.5) / q.rows;
        if (!q.wet) L.m('bark').c(x, 0.05, rz, 0.075, 1.0, dkS, 1, 5, null, 0, 0, PI / 2);   // 垄
        for (let k = 0; k < 5; k++) {
          const px = x - 0.5 + (k + 0.5) / 5 + (rnd() - 0.5) * 0.07, pz = rz + (rnd() - 0.5) * 0.06, h = q.h * (0.85 + rnd() * 0.3), t = rnd(), sh = 0.78 + rnd() * 0.32;
          if (q.leaf) { L.m('leaf').add(K.ico(0), M(px, 0.08 + h * 0.5, pz, 0.12, h * 0.6, 0.12, 0, rnd() * 3, 0), Art.mix(q.c[0], q.c[1], t * 0.5), Art.mix(q.c[0], q.c[1], 0.5 + t * 0.5)); continue; }
          const a = rnd() * PI, hw = h * 0.3;
          for (let j = 0; j < 2; j++) { const b = a + j * PI / 2; card(F, px, 0.04 + h / 2, pz, 0, h / 2, 0, Math.cos(b) * hw, 0, Math.sin(b) * hw, 0, 1, 0, lerp(c0[0], c1[0], t) * sh, lerp(c0[1], c1[1], t) * sh, lerp(c0[2], c1[2], t) * sh, 3, 0.72); }
          if (q.bloom && rnd() < 0.85) L.m('silk').add(K.ico(0), M(px + (rnd() - 0.5) * 0.08, 0.04 + h * 0.96, pz + (rnd() - 0.5) * 0.08, 0.07, 0.05, 0.07, 0, rnd() * 3, 0), Art.shade(q.bloom, -0.12), q.bloom);
        }
      }
      return true;
    }
    if (name === 'flower') {
      const pal = FLOWERS[v] || FLOWERS[FLOWER_KEYS[Math.floor(rnd() * FLOWER_KEYS.length)]], g0 = lin('#1f5028'), g1 = lin('#58a048'), f1 = lin(pal[1]);
      for (let i = 0; i < 4; i++) {
        const bx = x + (i % 2 ? 0.25 : -0.25) + (rnd() - 0.5) * 0.14, bz = z + (i < 2 ? -0.25 : 0.25) + (rnd() - 0.5) * 0.14, h = (0.34 + rnd() * 0.2) * sc, r = 0.27 + rnd() * 0.06;
        for (let j = 0; j < 5; j++) {   // 叶丛
          const a = rnd() * TAU, t = rnd(), sh = 0.7 + rnd() * 0.4, hs = h * 0.6;
          card(F, bx + Math.cos(a) * r * 0.4, h * 0.5, bz + Math.sin(a) * r * 0.4, (rnd() - 0.5) * 0.1, hs, (rnd() - 0.5) * 0.1, Math.cos(a + 1.57) * r, 0, Math.sin(a + 1.57) * r, Math.cos(a) * 0.4, 0.86, Math.sin(a) * 0.4, lerp(g0[0], g1[0], t) * sh, lerp(g0[1], g1[1], t) * sh, lerp(g0[2], g1[2], t) * sh, 0, 0.7);
        }
        // 花：平铺在叶丛顶上的一层花瓣，再点几朵立体的花头
        const a0 = rnd() * TAU; card(F, bx, h * 0.96, bz, Math.cos(a0) * r * 1.05, 0.02, Math.sin(a0) * r * 1.05, -Math.sin(a0) * r * 1.05, 0.02, Math.cos(a0) * r * 1.05, 0, 1, 0, f1[0], f1[1], f1[2], 1, 1);
        card(F, bx, h * 0.8, bz, Math.cos(a0 + 0.8) * r * 1.2, -0.03, Math.sin(a0 + 0.8) * r * 1.2, -Math.sin(a0 + 0.8) * r * 1.2, 0.05, Math.cos(a0 + 0.8) * r * 1.2, 0, 1, 0, f1[0] * 0.8, f1[1] * 0.8, f1[2] * 0.8, 1, 1);
        L.m('silk'); for (let j = 0; j < 2; j++) { const a = rnd() * TAU, d = rnd() * r * 0.8, t = rnd(); L.add(K.ico(0), M(bx + Math.cos(a) * d, h * (0.92 + rnd() * 0.22), bz + Math.sin(a) * d, 0.075, 0.055, 0.075, (rnd() - 0.5) * 0.6, rnd() * 3, 0), Art.mix(pal[0], pal[1], t * 0.6), pal[1]); }
      }
      return true;
    }
    if (name === 'scarecrow') {
      const wd = '#6a4a2c', st = '#d2b254', stL = '#ecd47c', rag = v === 'red' ? '#9a4a3a' : '#7c6a50';
      L.m('wood').stick([x, 0, z], [x, 1.56, z], 0.035, 0.03, wd, 5).stick([x - 0.58, 1.18, z], [x + 0.58, 1.2, z], 0.028, 0.024, wd, 5);
      L.m('cloth').c(x, 0.98, z, 0.2, 0.56, rag, 0.7, 8, Art.shade(rag, 0.16));   // 破褂子
      for (const s of [-1, 1]) L.c(x + s * 0.33, 1.185, z, 0.075, 0.42, rag, 1, 6, null, 0, 0, PI / 2);
      L.m('fur'); for (const s of [-1, 1]) L.c(x + s * 0.6, 1.19, z, 0.07, 0.16, st, 0.4, 6, stL, 0, 0, -s * PI / 2);   // 袖口露出来的稻草
      L.c(x, 0.64, z, 0.2, 0.16, st, 1.5, 8, stL);
      L.m('cloth').s(x, 1.47, z, 0.14, 0.15, 0.14, '#d2c096', '#e8dab0');
      L.m('fur').c(x, 1.62, z, 0.32, 0.04, '#b89840', 1, 12, '#d8b858').c(x, 1.71, z, 0.14, 0.16, '#b89840', 0.25, 10, '#dcc064');   // 斗笠
      return true;
    }
    if (name === 'haystack') {
      const s = sc * (0.9 + rnd() * 0.2);
      L.m('fur').c(x, 0.42 * s, z, 0.5 * s, 0.84 * s, '#b89444', 0.82, 12, '#dcc068').c(x, 1.08 * s, z, 0.43 * s, 0.5 * s, '#c8a850', 0.12, 12, '#ecd480');
      L.m('wood').stick([x, 1.2 * s, z], [x, 1.5 * s, z], 0.02, 0.012, '#6a4a2c', 4);
      return true;
    }
    if (name === 'well') {
      L.m('stone').c(x, 0.26, z, 0.44, 0.52, '#7c776c', 1, 12, '#a29c90').c(x, 0.03, z, 0.6, 0.06, '#8a8478', 1, 12);
      L.m(0.08, 0, 0.2, 0.02).c(x, 0.5, z, 0.33, 0.03, '#16262c', 1, 12);
      L.m('wood'); for (const s of [-1, 1]) L.b(x + s * 0.48, 0.75, z, 0.08, 1.5, 0.08, '#5a3c24');
      L.c(x, 1.2, z, 0.05, 1.0, '#6a4628', 1, 8, null, 0, 0, PI / 2).stick([x, 1.2, z], [x, 0.72, z], 0.008, 0.008, '#c8b890', 4);
      L.c(x, 0.66, z, 0.09, 0.14, '#7a5230', 0.85, 8, '#9a6a40');
      gableRoof(L, x, 1.5, z, 0.68, 0.42, 0.3, '#6a5a3a', { plain: 1, sag: 1, mat: 'fur' });
      return true;
    }
    if (name === 'trellis') {   // 花架：四根柱子托着格子顶，藤花垂下来
      const pal = FLOWERS[v] || FLOWERS.violet, f0 = lin(pal[0]), f1 = lin(pal[1]), g0 = lin('#2a6a34'), wd = '#5e4028';
      L.m('wood'); for (const s of [-1, 1]) for (const e of [-1, 1]) L.b(x + s * 0.42, 0.95, z + e * 0.42, 0.07, 1.9, 0.07, wd);
      for (const s of [-1, 0, 1]) L.b(x + s * 0.42, 1.92, z, 0.05, 0.05, 1.1, wd).b(x, 1.97, z + s * 0.42, 1.1, 0.05, 0.05, wd);
      for (let i = 0; i < 14; i++) {
        const px = x + (rnd() - 0.5) * 1.0, pz = z + (rnd() - 0.5) * 1.0, t = rnd(), sh = 0.75 + rnd() * 0.35, a = rnd() * TAU, hs = 0.2 + rnd() * 0.16;
        card(F, px, 2.02, pz, Math.cos(a) * 0.3, 0.03, Math.sin(a) * 0.3, -Math.sin(a) * 0.3, 0.03, Math.cos(a) * 0.3, 0, 1, 0, g0[0] * sh * 1.4, g0[1] * sh * 1.4, g0[2] * sh * 1.4, 0, 1);
        card(F, px, 1.92 - hs, pz, 0, hs, 0, Math.cos(a) * 0.16, 0, Math.sin(a) * 0.16, Math.cos(a + 1.57) * 0.5, 0.7, Math.sin(a + 1.57) * 0.5, lerp(f0[0], f1[0], t) * sh, lerp(f0[1], f1[1], t) * sh, lerp(f0[2], f1[2], t) * sh, 1, 1);   // 垂下来的花穗
      }
      return true;
    }
    if (name === 'rockery') {   // 假山：几块瘦石叠起来
      L.m('stone');
      for (let i = 0; i < 5; i++) { const k = 1 - i * 0.14; L.add(rockGeo[(i + Math.floor(rnd() * 3)) % 3], M(x + (rnd() - 0.5) * 0.42 * k, 0.3 + i * 0.3 * sc, z + (rnd() - 0.5) * 0.3 * k, 0.5 * k * sc, 0.52 * sc, 0.42 * k * sc, (rnd() - 0.5) * 0.5, rnd() * TAU, (rnd() - 0.5) * 0.5), '#5c625c', '#a4aaa0'); }
      const g0 = lin('#2f6a36'); for (let i = 0; i < 3; i++) { const a = rnd() * TAU; card(F, x + Math.cos(a) * 0.4, 0.2, z + Math.sin(a) * 0.4, 0, 0.2, 0, Math.cos(a + 1.57) * 0.2, 0, Math.sin(a + 1.57) * 0.2, 0, 1, 0, g0[0], g0[1], g0[2], 3, 0.7); }
      return true;
    }
    return false;
  }
  const NOJIT = /^(crop|flower|well|trellis|scarecrow|haystack|rockery)(:|$)/;   // 这些东西一格一件、彼此对齐，不像树那样随手挪一点
  function prop(name, L, F, Gl, x, z, sc, rnd, fx, lod) {
    const fi = name.indexOf(':'), pn = fi < 0 ? name : name.slice(0, fi), pv = fi < 0 ? '' : name.slice(fi + 1);
    if (outdoor(pn, pv, L, F, Gl, x, z, sc, rnd, fx) || furniture(pn, pv, L, Gl, x, z, rnd, fx)) return;
    if (TREEPAL[name]) return tree(L, F, x, z, sc, rnd, TREEPAL[name], lod);
    if (name === 'pineS') {
      sc *= 1.15;
      const H = (2.3 + rnd() * 0.6) * sc, cg = lin('#1f4f3e'), cl = lin('#3a7a5c'), cs = lin('#f4f8fc'), ph = rnd() * 6;
      L.m('bark').tube([[x, -0.05, z], [x, H * 0.5, z], [x, H * 0.95, z]], [0.13 * sc, 0.08 * sc, 0.025 * sc], 6, '#4a3526', '#6a5038', { cap: 0 });
      L.m('leaf');
      for (let i = 0; i < 5; i++) {
        const y0 = H * (0.22 + i * 0.155), r0 = (0.78 - i * 0.135) * sc, hh = H * 0.24;
        L.surf(lod ? 14 : 22, 3, (u, v, o) => { const a = u * TAU, r = r0 * (1 - v) * (0.72 + 0.28 * Math.abs(Math.sin(a * (lod ? 3.5 : 5.5) + ph + i))) + 0.02; o[0] = x + Math.sin(a) * r; o[1] = y0 + hh * Math.pow(v, 0.8) - 0.1 * sc * (1 - v) * (1 - v); o[2] = z + Math.cos(a) * r; },
          (u, v, p, o) => { const s = sst(0.25, 0.75, v + 0.25 * Math.sin(u * 40 + i)), k = 0.6 + 0.4 * v; o[0] = lerp(lerp(cg[0], cl[0], v) * k, cs[0], s); o[1] = lerp(lerp(cg[1], cl[1], v) * k, cs[1], s); o[2] = lerp(lerp(cg[2], cl[2], v) * k, cs[2], s); }, { closed: true, two: true });
      }
    } else if (name === 'dead' || name === 'deadP') {
      const col = name === 'dead' ? '#2c1c1a' : '#241a3a', emb = name === 'dead' ? '#ff8a3a' : '#c06aff', h = (1.3 + rnd() * 0.5) * sc * 1.15, colL = Art.shade(col, 0.2);
      L.m('bark').tube([[x, -0.05, z], [x + 0.05, h * 0.4, z + 0.03], [x - 0.03, h * 0.75, z - 0.02], [x + 0.06, h, z]], [0.16 * sc, 0.1 * sc, 0.075 * sc, 0.04 * sc], 6, col, colL, { cap: 2 });
      Gl.glow(3.5);
      for (let i = 0; i < 4; i++) {
        const a = rnd() * TAU, y0 = h * (0.42 + i * 0.14), len = (0.62 - i * 0.07) * sc, ex = x + Math.cos(a) * len, ez = z + Math.sin(a) * len, ey = y0 + len * 0.7, mx = x + Math.cos(a) * len * 0.5, mz = z + Math.sin(a) * len * 0.5;
        L.tube([[x, y0, z], [mx, y0 + len * 0.2, mz], [ex, ey, ez]], [0.05 * sc, 0.035 * sc, 0.012 * sc], 5, col, colL, { cap: 2 });
        const a2 = a + (rnd() - 0.5) * 1.6, tx = mx + Math.cos(a2) * len * 0.45, tz = mz + Math.sin(a2) * len * 0.45;
        L.tube([[mx, y0 + len * 0.2, mz], [tx, y0 + len * 0.62, tz]], [0.028 * sc, 0.008 * sc], 4, col, colL, { cap: 2 });
        if (i % 2 === 0) Gl.s(ex, ey, ez, 0.045, 0.045, 0.045, emb);
      }
    } else if (name === 'bamboo') {
      const c0 = lin('#2f7430'), c1 = lin('#5fae48'), c2 = lin('#b4e07c');
      for (let i = 0; i < 3; i++) {
        const bx = x + (rnd() - 0.5) * 0.55, bz = z + (rnd() - 0.5) * 0.45, h = (2.9 + rnd() * 1.2) * sc, lx = (rnd() - 0.5) * 0.5, lz = (rnd() - 0.5) * 0.3, pts = [], rr = [], nn = lod ? 4 : 7;
        for (let j = 0; j <= nn; j++) { const k = j / nn; pts.push([bx + lx * k * k, h * k, bz + lz * k * k]); rr.push(0.052 - 0.03 * k); }
        L.m(0.42, 0, 0.35, 0.04).tube(pts, rr, 6, '#3f7c30', '#9ccf62', { cap: 0 });
        for (let j = 1; j < nn; j++) L.c(pts[j][0], pts[j][1], pts[j][2], rr[j] + 0.008, 0.02, '#2e5e26', 1, 6);
        const nl = lod ? 6 : 12;
        for (let j = 0; j < nl; j++) {
          const k = 0.45 + rnd() * 0.55, a = rnd() * TAU, d = 0.1 + rnd() * 0.36, q = rnd(), py = h * k + (rnd() - 0.5) * 0.2, sh = 0.6 + 0.4 * rnd(), hs = (0.3 + rnd() * 0.16) * sc, b2 = rnd() * TAU;
          card(F, bx + lx * k * k + Math.cos(a) * d, py, bz + lz * k * k + Math.sin(a) * d, (rnd() - 0.5) * 0.2 * hs, hs, (rnd() - 0.5) * 0.2 * hs, Math.cos(b2) * hs, 0, Math.sin(b2) * hs, Math.cos(a) * 0.4, 0.86, Math.sin(a) * 0.4, lerp(lerp(c0[0], c1[0], q), c2[0], q * q * 0.6) * sh, lerp(lerp(c0[1], c1[1], q), c2[1], q * q * 0.6) * sh, lerp(lerp(c0[2], c1[2], q), c2[2], q * q * 0.6) * sh, 2, 0.8);
        }
      }
    } else if (name === 'boat') boat(L, Gl, x, z, (rnd() - 0.5) * 1.2, fx);
    else if (name === 'rock') rock(L, Gl, x, z, sc, rnd, '#85897f', null, null, fx);
    else if (name === 'rockM') rock(L, Gl, x, z, sc, rnd, '#7c8478', '#7aa868', null, fx);
    else if (name === 'rockS') rock(L, Gl, x, z, sc, rnd, '#8c9cb4', '#ffffff', null, fx);
    else if (name === 'rockL') rock(L, Gl, x, z, sc, rnd, '#3e2a2a', null, '#ff8a3a', fx);
    else if (name === 'rockD') rock(L, Gl, x, z, sc, rnd, '#34294e', null, '#c06aff', fx);
    else if (name === 'crysI') crystal(L, x, z, sc, rnd, '#8fd0ff', fx);
    else if (name === 'crysP') crystal(L, x, z, sc, rnd, '#b070f0', fx);
    else if (name === 'lantern') {
      L.m('stone').c(x, 0.06, z, 0.15, 0.12, '#8a8478', 0.8, 8).c(x, 0.15, z, 0.1, 0.06, '#9a9488', 0.9, 8);
      L.m('wood').stick([x, 0.12, z], [x, 1.62, z], 0.046, 0.038, '#3e2820', 7, '#5a3c2c');
      L.tube([[x, 1.52, z], [x + 0.2, 1.62, z], [x + 0.36, 1.58, z]], 0.022, 5, '#3e2820', null, { cap: 2 });
      L.stick([x + 0.32, 1.58, z], [x + 0.32, 1.43, z], 0.006, 0.006, '#1e1818', 4);
      Gl.glow(3.4).surf(12, 6, (u, v, o) => { const a = u * TAU, p = lerp(0.12, 0.88, v) * PI; o[0] = x + 0.32 + Math.sin(p) * Math.sin(a) * 0.115 * (1 + 0.04 * Math.cos(a * 6)); o[1] = 1.28 + Math.cos(p) * 0.15; o[2] = z + Math.sin(p) * Math.cos(a) * 0.115 * (1 + 0.04 * Math.cos(a * 6)); }, ['#ffd27a', '#ff5a2c'], { closed: true, flip: true });
      L.m('gold').c(x + 0.32, 1.425, z, 0.05, 0.03, gold, 1, 8).c(x + 0.32, 1.135, z, 0.05, 0.03, gold, 1, 8);
      L.m('silk').stick([x + 0.32, 1.12, z], [x + 0.32, 0.95, z], 0.014, 0.004, '#c8302a', 4);
      fx.glow(x + 0.32, 1.28, z, 1.1, '#ff9a50', 0.42); fx.pool(x + 0.32, z, 2.0, '#ff9a40', 0.3);
    } else if (name === 'brazier') {
      L.m('metal');
      for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + 0.5; L.stick([x + Math.cos(a) * 0.24, 0, z + Math.sin(a) * 0.24], [x + Math.cos(a) * 0.1, 0.52, z + Math.sin(a) * 0.1], 0.024, 0.024, '#2e2830', 5); }
      L.c(x, 0.58, z, 0.16, 0.18, '#3a3238', 1.5, 12, '#6a5a5c').c(x, 0.68, z, 0.25, 0.03, '#4a4044', 1, 12);
      Gl.glow(4).s(x, 0.67, z, 0.2, 0.05, 0.2, '#ff8a2a');
      fx.fire(x, 0.76, z); fx.pool(x, z, 2.8, '#ff8a3a', 0.42);
    }
  }

  /* ---------- 楼阁 ---------- */
  const roofCache = {};
  function roofGeo(hw, hd, rw, H, lift) {
    const key = [hw, hd, rw, H, lift].map(v => v.toFixed(2)).join();
    if (roofCache[key]) return roofCache[key];
    const MT = 8, pos = [], sh = [], idx = [];
    const face = (fn, wid) => {
      const N = Math.max(8, Math.round(wid / 0.18)) * 2, b = pos.length / 3;
      for (let j = 0; j <= MT; j++) for (let i = 0; i <= N; i++) {
        const u = i / N * 2 - 1, t = j / MT, p = fn(u, t), rg = i % 2 ? 0.045 * (1 - t * 0.6) : 0;
        pos.push(p[0], H * Math.pow(t, 1.6) + lift * Math.pow(Math.abs(u), 3) * (1 - t) * (1 - t) + rg, p[1]); sh.push((i % 2 ? 1.12 : 0.66) * (j === 0 ? 1.2 : 1) * (0.92 + 0.08 * ((j * 7 + i * 3) % 5) / 4));
      }
      for (let j = 0; j < MT; j++) for (let i = 0; i < N; i++) { const a = b + j * (N + 1) + i, c = a + N + 1; idx.push(a, a + 1, c, a + 1, c + 1, c); }
    };
    face((u, t) => [u * lerp(hw, rw, t), lerp(hd, 0, t)], hw * 2);
    face((u, t) => [-u * lerp(hw, rw, t), -lerp(hd, 0, t)], hw * 2);
    face((u, t) => [lerp(hw, rw, t), -u * lerp(hd, 0, t)], hd * 2);
    face((u, t) => [-lerp(hw, rw, t), u * lerp(hd, 0, t)], hd * 2);
    let g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('shade', new THREE.Float32BufferAttribute(sh, 1)); g.setIndex(idx);
    g.computeVertexNormals(); g = g.toNonIndexed(); g._keep = true;
    return roofCache[key] = g;
  }
  // o：{ lift 檐角起翘, pyr 攒尖顶（没有正脊）, skirt 腰檐（正脊埋在上一层里，不画）, fin 宝顶 }
  function roof(L, cx, y, cz, hw, hd, rw, H, col, o) {
    o = o || {};
    const lift = o.lift == null ? 0.34 : o.lift, dk = Art.shade(col, -0.4), bare = o.pyr || o.skirt;
    L.m('tile').add(roofGeo(hw, hd, rw, H, lift), M(cx, y, cz), Art.shade(col, 0.1), Art.shade(col, -0.18));
    L.m('wood').b(cx, y - 0.05, cz, hw * 2 - 0.14, 0.1, hd * 2 - 0.14, Art.shade(col, -0.6));
    L.m('tile'); if (!bare) L.c(cx, y + H + 0.05, cz, 0.085, rw * 2 + 0.16, dk, 1, 8, null, 0, 0, PI / 2);
    if (o.fin) { L.m('gold').c(cx, y + H + 0.1, cz, 0.07, 0.14, gold, 0.7, 8).s(cx, y + H + 0.24, cz, 0.075, 0.075, 0.075, gold).stick([cx, y + H + 0.3, cz], [cx, y + H + 0.56, cz], 0.022, 0.004, gold, 6); L.m('tile'); }
    for (const s of [-1, 1]) {
      if (!bare) L.tube([[cx + s * (rw + 0.02), y + H + 0.05, cz], [cx + s * (rw + 0.14), y + H + 0.16, cz], [cx + s * (rw + 0.1), y + H + 0.3, cz]], [0.085, 0.075, 0.03], 6, dk, null, { cap: 2 });
      for (const q of [-1, 1]) {
        const pts = [[cx + s * (hw + 0.1), y + lift + 0.14, cz + q * (hd + 0.1)]];
        for (let i = 0; i <= 5; i++) { const t = i / 5; pts.push([cx + s * lerp(hw, rw, t), y + H * Math.pow(t, 1.6) + lift * (1 - t) * (1 - t) + 0.05, cz + q * lerp(hd, 0, t)]); }
        L.tube(pts, [0.03, 0.06, 0.06, 0.062, 0.064, 0.066, 0.07], 5, dk, null, { cap: 1 });
      }
    }
    if (!bare) { L.m('gold'); for (const s of [-1, 1]) L.s(cx + s * (rw + 0.1), y + H + 0.33, cz, 0.045, 0.06, 0.045, gold); }
  }

  /* ---------- 建筑部件 ---------- */
  const LAT = '#3a2618';
  /* 写着字的东西（匾、幌子、牌坊）用的材质：在画面的透明通道里记 0，最后合成时的边缘平滑（FXAA）和锐化就跳过这些像素。
     FXAA 分不清“物体的边”和“贴图里的字”，金字黑底对比又强，镜头每挪一点它就把笔画重新抹一遍，字一闪一闪地发毛、看不清。
     字本身有贴图的多级缩小（mipmap）管着，用不着再平滑。没有后期（直接画到屏幕上）时不做这一步，免得字变成透明 */
  function textMat(p) {
    const m = new THREE.MeshBasicMaterial(p);
    if (G3.post) { m.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <output_fragment>', '#include <output_fragment>\ngl_FragColor.a = 0.0;'); }; m.customProgramCacheKey = () => 'g3text'; }
    return m;
  }
  // 横匾（朝南，略向后仰）；ry 另转一个朝向
  function signPlane(dyn, text, x, y, z, tilt, k, ry) {
    const n = text.length, tex = K.canvasTex(64 * n + 40, 96, (c, W, H) => {
      c.fillStyle = '#17131e'; c.fillRect(0, 0, W, H); c.strokeStyle = '#c9a44e'; c.lineWidth = 6; c.strokeRect(5, 5, W - 10, H - 10);
      c.fillStyle = '#e8c878'; c.font = 'bold 58px ' + FONT_K; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, W / 2, H / 2 + 3);
    });
    const me = new THREE.Mesh(new THREE.PlaneGeometry((0.34 * n + 0.2) * (k || 1), 0.46 * (k || 1)), textMat({ map: tex, side: ry ? THREE.DoubleSide : THREE.FrontSide }));
    me.position.set(x, y, z); me.rotation.order = 'YXZ'; me.rotation.y = ry || 0; me.rotation.x = tilt; dyn.add(me);
  }
  // 幌子：一根杆子挑着一面竖幅，上面写着字
  function banner(L, dyn, text, x, z, h, col) {
    const n = text.length, bh = 0.34 * n + 0.22;
    L.m('wood').stick([x, 0, z], [x, h, z], 0.035, 0.028, '#4a3222', 6).stick([x, h - 0.12, z], [x + 0.42, h - 0.06, z], 0.018, 0.014, '#4a3222', 5);
    const tex = K.canvasTex(96, 64 * n + 40, (c, W, H) => {
      c.fillStyle = col; c.fillRect(0, 0, W, H); c.strokeStyle = 'rgba(255,236,190,.85)'; c.lineWidth = 5; c.strokeRect(5, 5, W - 10, H - 10);
      c.fillStyle = '#fff2d0'; c.font = 'bold 56px ' + FONT_K; c.textAlign = 'center'; c.textBaseline = 'middle'; for (let i = 0; i < n; i++) c.fillText(text[i], W / 2, 52 + i * 64);
    });
    const me = new THREE.Mesh(new THREE.PlaneGeometry(0.36, bh), textMat({ map: tex, side: THREE.DoubleSide, color: LC('#ffffff', 0.8) }));
    me.position.set(x + 0.24, h - 0.12 - bh / 2, z + 0.01); me.rotation.x = -0.06; dyn.add(me);
  }
  function hangLantern(L, Gl, fx, lx, ly, lz, dark, s) {
    s = s || 1;
    Gl.glow(3.2).surf(10, 5, (u, v, o) => { const a = u * TAU, p = lerp(0.14, 0.86, v) * PI; o[0] = lx + Math.sin(p) * Math.sin(a) * 0.085 * s; o[1] = ly + Math.cos(p) * 0.11 * s; o[2] = lz + Math.sin(p) * Math.cos(a) * 0.085 * s; }, dark ? ['#e0b0ff', '#8a4ad0'] : ['#ffd27a', '#ff5a2c'], { closed: true, flip: true });
    L.m('gold').c(lx, ly + 0.105 * s, lz, 0.04 * s, 0.025, gold, 1, 8).c(lx, ly - 0.105 * s, lz, 0.04 * s, 0.025, gold, 1, 8); L.stick([lx, ly + 0.11 * s, lz], [lx, ly + 0.3 * s, lz], 0.005, 0.005, '#1e1818', 4);
    if (fx) fx.glow(lx, ly, lz, 0.8 * s, dark ? '#b070ff' : '#ff9a50', 0.36);
  }
  function doorAt(L, x, y0, z, wd, hg, col) {   // 两扇格子门，朝南
    L.m('wood').b(x, y0 + hg / 2, z, wd + 0.12, hg + 0.08, 0.06, Art.shade(col, -0.6));
    for (const s of [-1, 1]) { L.b(x + s * wd / 4, y0 + hg / 2 - 0.02, z + 0.035, wd / 2 - 0.04, hg - 0.1, 0.03, Art.shade(col, -0.38)); for (let k = 0; k < 3; k++) L.b(x + s * (wd * 0.12 + k * wd * 0.125), y0 + hg * 0.68, z + 0.055, 0.016, hg * 0.42, 0.012, LAT); }
    L.m('gold'); for (const s of [-1, 1]) L.s(x + s * 0.05, y0 + hg * 0.45, z + 0.06, 0.024, 0.024, 0.016, gold);
  }
  function winAt(L, Gl, x, y, z, w, h, lightC) {   // 透着灯光的格子窗
    L.m('wood').b(x, y, z + 0.015, w + 0.1, h + 0.1, 0.05, LAT); Gl.glow(2.2).b(x, y, z + 0.042, w, h, 0.02, lightC);
    const nx = Math.max(2, Math.round(w / 0.12)); for (let k = 1; k < nx; k++) L.b(x - w / 2 + k * w / nx, y, z + 0.058, 0.016, h, 0.014, LAT); L.b(x, y, z + 0.058, w, 0.016, 0.014, LAT);
  }
  // 两面坡的屋顶：正脊沿东西向，前后两坡；sag 越大坡面越凹
  function gableRoof(L, cx, y, cz, hw, hd, H, col, o) {
    o = o || {};
    const N = Math.max(10, Math.round(hw * 2 / 0.2)) * 2, c0 = lin(Art.shade(col, 0.1)), c1 = lin(Art.shade(col, -0.2)), dk = Art.shade(col, -0.42), sag = o.sag || 1.25;
    for (const s of [-1, 1]) L.m(o.mat || 'tile').surf(N, 6, (u, v, p) => { const i = Math.round(u * N); p[0] = cx + (u * 2 - 1) * hw; p[2] = cz + s * hd * (1 - v); p[1] = y + H * Math.pow(v, sag) + (i % 2 ? 0.04 * (1 - v * 0.5) : 0); },
      (u, v, p, out) => { const i = Math.round(u * N), k = (i % 2 ? 1.12 : 0.68) * (v < 0.01 ? 1.2 : 1) * (0.92 + 0.08 * ((i * 3 + Math.round(v * 6) * 7) % 5) / 4); out[0] = lerp(c1[0], c0[0], v) * k; out[1] = lerp(c1[1], c0[1], v) * k; out[2] = lerp(c1[2], c0[2], v) * k; }, { two: true });
    L.m('wood').b(cx, y - 0.04, cz, hw * 2 - 0.12, 0.08, hd * 2 - 0.12, Art.shade(col, -0.6));
    L.m(o.mat || 'tile').c(cx, y + H + 0.05, cz, 0.08, hw * 2 + 0.1, dk, 1, 8, null, 0, 0, PI / 2);
    for (const s of [-1, 1]) {
      if (!o.plain) L.tube([[cx + s * (hw + 0.02), y + H + 0.05, cz], [cx + s * (hw + 0.12), y + H + 0.14, cz], [cx + s * (hw + 0.1), y + H + 0.26, cz]], [0.08, 0.07, 0.03], 6, dk, null, { cap: 2 });
      for (const q of [-1, 1]) { const pts = []; for (let i = 0; i <= 5; i++) { const t = i / 5; pts.push([cx + s * hw, y + H * Math.pow(t, sag) + 0.05, cz + q * hd * (1 - t)]); } L.tube(pts, 0.05, 5, dk, null, { cap: 1 }); }
    }
  }
  // 山墙上那块三角形的墙面：x 处一片，宽到 ±hwall，顶边贴着屋面（屋面檐口在 ±hroof）
  function gableWall(L, x, y, cz, hwall, hroof, H, col, sag) {
    L.m('plaster').surf(8, 3, (u, v, p) => { const t = u * 2 - 1; p[0] = x; p[2] = cz + t * hwall; p[1] = y + v * Math.max(0.001, H * Math.pow(1 - Math.abs(t) * hwall / hroof, sag || 1.25) - 0.03); }, [Art.shade(col, -0.12), col], { two: true });
  }
  // 屋前屋后的零碎：酒坛、柴垛、木桶、货箱、草垛、盆栽
  function clutter(L, x, z, rnd, kind) {
    if (kind === 'jar') for (let i = 0; i < 3; i++) { const jx = x + (i - 1) * 0.3 + rnd() * 0.06, jz = z + (rnd() - 0.5) * 0.16, s = 0.8 + rnd() * 0.5; L.m(0.3, 0, 0.2, 0.1).s(jx, 0.17 * s, jz, 0.13 * s, 0.17 * s, 0.13 * s, '#5a3a2a', '#8a5a3a'); L.m('cloth').c(jx, 0.33 * s, jz, 0.07 * s, 0.04, '#b0402e', 1, 8); }
    else if (kind === 'barrel') for (let i = 0; i < 2; i++) { const bx = x + i * 0.36; L.m('wood').c(bx, 0.24, z, 0.15, 0.48, '#7a5230', 0.9, 10, '#9a6a40'); L.m('metal').c(bx, 0.14, z, 0.158, 0.03, '#3a3436', 1, 10).c(bx, 0.36, z, 0.152, 0.03, '#3a3436', 1, 10); }
    else if (kind === 'wood') { L.m('bark'); for (let i = 0; i < 6; i++) L.c(x + (i % 3) * 0.13 - 0.13, 0.07 + Math.floor(i / 3) * 0.12, z, 0.06, 0.5, '#6a4a30', 1, 6, '#8a6a48', PI / 2, 0, 0); }
    else if (kind === 'crate') L.m('wood').b(x, 0.16, z, 0.34, 0.32, 0.34, '#8a6238', 0, rnd(), 0).b(x + 0.32, 0.12, z + 0.05, 0.26, 0.24, 0.26, '#7a5230', 0, rnd(), 0);
    else if (kind === 'hay') L.m('fur').c(x, 0.3, z, 0.34, 0.6, '#c8a850', 0.25, 10, '#e0c470');
    else { L.m(0.5, 0, 0.3, 0.08).c(x, 0.1, z, 0.1, 0.2, '#6a6e78', 0.8, 8); L.m('leaf').s(x, 0.3, z, 0.16, 0.14, 0.16, '#3f7a3e', '#7ab85a'); }
  }
  const CLUT = ['jar', 'wood', 'barrel', 'crate', 'pot', 'hay'];
  // 一圈栏杆：沿 pts 折线立柱、架两道横栏
  function railing(L, pts, y, h, col) {
    L.m('wood');
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(len / 0.45));
      for (let k = 0; k <= n; k++) { const t = k / n, x = lerp(a[0], b[0], t), z = lerp(a[1], b[1], t); L.b(x, y + h / 2, z, 0.05, h, 0.05, col); }
      L.stick([a[0], y + h, a[1]], [b[0], y + h, b[1]], 0.022, 0.022, col, 5).stick([a[0], y + h * 0.5, a[1]], [b[0], y + h * 0.5, b[1]], 0.016, 0.016, col, 5);
    }
  }

  /* ---------- 各式建筑（BUILD 里的 kind）：民居、茅舍、木楼、铺面、塔、亭、哨楼、水榭、牌坊、废墟 ---------- */
  const KIND = {};
  // 民居：硬山两坡顶。hz：粉墙黛瓦，两头是高出屋面的马头墙；frame：露明的木构架
  KIND.house = q => {
    const { L, Gl, sp, fx, dyn, w, cx, zf, zb, rnd } = q, cz = (zf + zb) / 2, dd = zf - zb;
    const wallC = Art.shade(sp.wall, (rnd() - 0.5) * 0.12), roofC = Art.shade(sp.roof, (rnd() - 0.5) * 0.16), lightC = '#ffd08a', bs = sp.base || '#6f6c68';
    const H0 = 0.14, WH = 1.55 + rnd() * 0.3, ww = w - 1.0 - rnd() * 0.3, wd = dd - 0.8, wzf = cz + wd / 2, wy = H0 + WH / 2, ry = H0 + WH, RH = 0.85 + rnd() * 0.3, rhd = wd / 2 + 0.45;
    L.m('stone').b(cx, H0 / 2, cz, ww + 0.3, H0, wd + 0.3, '#8a8478', 0, 0, 0, '#a6a094'); L.b(cx, H0 * 0.35, wzf + 0.28, 1.1, H0 * 0.7, 0.3, '#a29c90');
    L.m('plaster').b(cx, wy, cz, ww, WH, wd, wallC, 0, 0, 0, Art.shade(wallC, -0.2));
    L.m('stone').b(cx, H0 + 0.19, cz, ww + 0.04, 0.38, wd + 0.04, bs, 0, 0, 0, Art.shade(bs, 0.15));
    if (sp.frame) { L.m('wood'); for (let i = 0; i < 4; i++) L.b(cx - ww / 2 + i * ww / 3, wy, wzf + 0.01, 0.1, WH, 0.06, sp.frame); L.b(cx, ry - 0.06, wzf + 0.01, ww, 0.1, 0.06, sp.frame).b(cx, H0 + 0.5, wzf + 0.01, ww, 0.07, 0.05, sp.frame); }
    const dx = cx + (sp.hz || sp.frame || q.b.door ? 0 : (rnd() < 0.5 ? -1 : 1) * ww * 0.2);   // 能进去的屋子，门开在正中（入口那一格）
    doorAt(L, dx, H0, wzf + 0.02, 0.8, 1.3, sp.pillar);
    for (const s of [-1, 1]) { const x = cx + s * ww * 0.3; if (Math.abs(x - dx) > 0.75) winAt(L, Gl, x, H0 + (sp.hz ? 1.15 : 0.98), wzf, sp.hz ? 0.36 : 0.56, sp.hz ? 0.3 : 0.5, lightC); }
    if (sp.hz) { L.m('tile').b(dx, H0 + 1.52, wzf + 0.16, 1.3, 0.07, 0.36, '#2e2e34', 0.25, 0, 0); L.m('stone').b(dx, H0 + 1.42, wzf + 0.04, 1.06, 0.1, 0.08, '#9a968c'); }   // 门罩
    gableRoof(L, cx, ry, cz, ww / 2 + (sp.hz ? 0.02 : 0.4), rhd, RH, roofC);
    for (const s of [-1, 1]) gableWall(L, cx + s * (ww / 2 - 0.01), ry, cz, wd / 2, rhd, RH, wallC);
    if (sp.hz) for (const s of [-1, 1]) {
      const x = cx + s * (ww / 2 + 0.07), z0 = wd / 2 + 0.3, zs = [z0, z0 * 0.62, z0 * 0.27], ys = [ry + 0.22, ry + 0.22 + RH * 0.42, ry + 0.3 + RH * 0.86], dk = '#2e2e34';
      for (let k = 0; k < 3; k++) {
        L.m('plaster').b(x, (H0 + ys[k]) / 2, cz, 0.16, ys[k] - H0, zs[k] * 2, '#f2efe6', 0, 0, 0, '#d8d4c8');
        const z1 = k < 2 ? zs[k + 1] : 0;
        L.m('tile'); for (const e of k < 2 ? [-1, 1] : [0]) L.b(x, ys[k] + 0.04, cz + (e ? e * (zs[k] + z1) / 2 : 0), 0.3, 0.08, e ? zs[k] - z1 + 0.14 : zs[k] * 2 + 0.14, dk);
        for (const e of [-1, 1]) L.b(x, ys[k] + 0.12, cz + e * (zs[k] + 0.06), 0.22, 0.06, 0.24, dk, e * 0.5, 0, 0);
      }
    } else if (rnd() < 0.6) { const x = cx + (rnd() < 0.5 ? -1 : 1) * ww * 0.28; L.m('stone').b(x, ry + RH * 0.75, cz - wd * 0.2, 0.26, RH * 0.9, 0.26, '#6a6660', 0, 0, 0, '#85807a'); }
    const side = rnd() < 0.5 ? -1 : 1;
    clutter(L, cx + side * (ww / 2 - 0.5), wzf + 0.3, rnd, CLUT[Math.floor(rnd() * 5)]); if (rnd() < 0.6) clutter(L, cx - side * (ww / 2 - 0.4), wzf + 0.28, rnd, 'pot');
    hangLantern(L, Gl, fx, dx + 0.62, H0 + 1.25, wzf + 0.16, false, 0.8);
    fx.pool(cx, zf + 0.5, 1.8, lightC, 0.12);
    if (sp.sign) signPlane(dyn, sp.sign, dx, H0 + 1.78, wzf + 0.2, -0.2, 0.85);
  };
  // 茅舍：土墙木架，四面坡的茅草顶，门前一段篱笆
  KIND.thatch = q => {
    const { L, Gl, sp, fx, w, cx, zf, zb, rnd } = q, cz = (zf + zb) / 2, dd = zf - zb, fr = sp.pillar;
    const H0 = 0.1, WH = 1.45, ww = w - 1.2, wd = dd - 0.9, wzf = cz + wd / 2, wy = H0 + WH / 2, ry = H0 + WH;
    L.m('stone').b(cx, H0 / 2, cz, ww + 0.3, H0, wd + 0.3, '#8a8070', 0, 0, 0, '#a09684');
    L.m('plaster').b(cx, wy, cz, ww, WH, wd, sp.wall, 0, 0, 0, Art.shade(sp.wall, -0.22));
    L.m('wood'); for (let i = 0; i < 4; i++) L.b(cx - ww / 2 + i * ww / 3, wy, wzf + 0.01, 0.09, WH, 0.06, fr); L.b(cx, ry - 0.05, wzf + 0.01, ww, 0.09, 0.06, fr);
    doorAt(L, cx - ww * 0.17, H0, wzf + 0.02, 0.7, 1.2, fr); winAt(L, Gl, cx + ww * 0.3, H0 + 0.95, wzf, 0.46, 0.4, '#f0c070');
    L.m('fur').add(roofGeo(ww / 2 + 0.56, wd / 2 + 0.56, ww * 0.3, 0.98, 0), M(cx, ry - 0.06, cz), '#8a6c2c', '#6a5020');
    L.add(roofGeo(ww / 2 + 0.5, wd / 2 + 0.5, ww * 0.3, 1.05, 0), M(cx, ry + 0.02, cz), '#dcbc64', '#a88838');
    L.c(cx, ry + 1.1, cz, 0.1, ww * 0.6 + 0.3, '#b89848', 1, 8, null, 0, 0, PI / 2);
    L.m('wood'); for (const k of [-1, 0, 1]) { const x = cx + k * ww * 0.26; L.stick([x, ry + 0.9, cz - 0.24], [x, ry + 1.32, cz + 0.14], 0.02, 0.02, fr, 5).stick([x, ry + 0.9, cz + 0.24], [x, ry + 1.32, cz - 0.14], 0.02, 0.02, fr, 5); }
    if (sp.fence !== 0) { const x0 = cx + ww * 0.12, x1 = cx + w / 2 - 0.25; for (let x = x0; x <= x1 + 0.01; x += 0.3) L.stick([x, 0, zf], [x + (rnd() - 0.5) * 0.04, 0.55 + rnd() * 0.12, zf], 0.022, 0.016, '#7a5c3a', 5); L.stick([x0, 0.2, zf], [x1, 0.2, zf], 0.016, 0.016, '#6a4c2e', 5).stick([x0, 0.42, zf], [x1, 0.42, zf], 0.016, 0.016, '#6a4c2e', 5); }
    clutter(L, cx - w / 2 + 0.55, wzf + 0.25, rnd, rnd() < 0.5 ? 'hay' : 'wood'); clutter(L, cx + ww * 0.05, wzf + 0.24, rnd, 'jar');
    hangLantern(L, Gl, fx, cx - ww * 0.17 + 0.55, H0 + 1.15, wzf + 0.14, false, 0.7);
    fx.pool(cx, zf + 0.4, 1.5, '#ffd08a', 0.1);
  };
  // 木楼：两三层，层间出腰檐，楼上一圈回廊。客栈、酒楼、茶馆都是这个样子
  KIND.lou = q => {
    const { L, Gl, sp, fx, dyn, w, cx, zf, zb, rnd } = q, cz = (zf + zb) / 2, dd = zf - zb, tiers = sp.tiers || 2;
    const H0 = 0.24, WH = 1.7, ww = w - 1.0, wd = dd - 0.9, wzf = cz + wd / 2, wy = H0 + WH / 2, lightC = '#ffd08a', frame = Art.shade(sp.pillar, -0.5), wm = sp.woodWall ? 'wood' : 'plaster';
    L.m('stone').b(cx, H0 / 2, cz, w - 0.15, H0, dd, '#8a8478', 0, 0, 0, '#a6a094');
    for (let i = 0; i < 3; i++) L.b(cx, H0 * (0.84 - i * 0.3) / 2, zf + 0.1 + i * 0.13, 1.7 + i * 0.12, H0 * (0.84 - i * 0.3), 0.26, '#a29c90');
    L.m(wm).b(cx, wy, cz, ww, WH, wd, sp.wall, 0, 0, 0, Art.shade(sp.wall, -0.2));
    const np = w >= 6 ? 6 : 4, px0 = cx - (w - 0.6) / 2, pstep = (w - 0.6) / (np - 1), pz = zf - 0.28;
    for (let i = 0; i < np; i++) { L.m(0.38, 0, 0.3, 0.05).c(px0 + i * pstep, wy, pz, 0.085, WH, sp.pillar, 1, 10, Art.shade(sp.pillar, -0.22)); L.m('stone').c(px0 + i * pstep, H0 + 0.06, pz, 0.125, 0.12, '#8a8478', 0.78, 10); }
    L.m('wood').b(cx, H0 + WH - 0.14, pz, w - 0.5, 0.11, 0.1, frame);
    doorAt(L, cx, H0, wzf + 0.02, 0.96, 1.36, sp.pillar); L.m('gold').b(cx, H0 + 1.44, wzf + 0.05, 1.1, 0.06, 0.06, gold);
    for (const s of [-1, 1]) winAt(L, Gl, cx + s * ww * 0.33, H0 + 0.95, wzf, 0.62, 0.56, lightC);
    if (sp.lanterns) for (let i = 0; i < 5; i++) hangLantern(L, Gl, i % 2 ? null : fx, cx + (i - 2) * (w - 1.2) / 4, H0 + WH - 0.42, pz + 0.12, false, 0.7);
    else for (const s of [-1, 1]) hangLantern(L, Gl, fx, cx + s * 0.78, H0 + 1.3, pz + 0.1);
    let y = H0 + WH, fw = ww, fd = wd;
    for (let t = 1; t < tiers; t++) {
      roof(L, cx, y + 0.08, cz, fw / 2 + 0.72, fd / 2 + 0.72, fw / 2 - 0.1, 0.42, sp.roof, { skirt: true, lift: 0.26 });
      const uw = fw - 0.5, ud = fd - 0.4, uh = 1.3, uy = y + 0.3, uzf = cz + ud / 2;
      L.m(wm).b(cx, uy + uh / 2, cz, uw, uh, ud, Art.shade(sp.wall, -0.05), 0, 0, 0, Art.shade(sp.wall, -0.2));
      L.m('wood').b(cx, uy + 0.03, cz + 0.1, uw + 0.62, 0.06, ud + 0.5, frame);
      railing(L, [[cx - uw / 2 - 0.28, cz - ud / 2 + 0.1], [cx - uw / 2 - 0.28, uzf + 0.32], [cx + uw / 2 + 0.28, uzf + 0.32], [cx + uw / 2 + 0.28, cz - ud / 2 + 0.1]], uy + 0.06, 0.4, Art.shade(sp.pillar, -0.25));
      const nw = uw > 3 ? 4 : 3; for (let i = 0; i < nw; i++) winAt(L, Gl, cx + (i - (nw - 1) / 2) * uw / nw, uy + uh * 0.56, uzf, uw / nw - 0.26, uh * 0.44, lightC);
      for (const s of [-1, 1]) for (const e of [-1, 1]) L.m(0.38, 0, 0.3, 0.05).c(cx + s * uw / 2, uy + uh / 2, cz + e * ud / 2, 0.06, uh, sp.pillar, 1, 8);
      y = uy + uh; fw = uw; fd = ud;
    }
    roof(L, cx, y + 0.1, cz, fw / 2 + 0.62, fd / 2 + 0.62, fw * 0.3, 0.95, sp.roof);
    fx.pool(cx, zf + 0.5, 2.2, lightC, 0.16);
    if (sp.sign) signPlane(dyn, sp.sign, cx, H0 + WH + 0.56, zf + 0.42, -0.6);
    if (sp.flag) banner(L, dyn, sp.flag, cx + w / 2 - 0.3, zf, 3.0, sp.flagC || '#a8362a');
    clutter(L, cx - w / 2 + 0.6, zf - 0.02, rnd, sp.flag === '酒' ? 'jar' : CLUT[Math.floor(rnd() * 5)]);
  };
  // 铺面：敞开的店面，柜台上摆着货，檐下挑一幅布篷
  KIND.shop = q => {
    const { L, Gl, sp, fx, dyn, w, cx, zf, zb, rnd } = q, cz = (zf + zb) / 2 - 0.2, dd = zf - zb - 0.4;
    const H0 = 0.16, WH = 1.72, ww = w - 1.0, wd = dd - 0.6, wzf = cz + wd / 2, wy = H0 + WH / 2, ry = H0 + WH, lightC = '#ffcf8a', awn = sp.awn || '#a8362a';
    L.m('stone').b(cx, H0 / 2, cz + 0.2, w - 0.2, H0, dd + 0.4, '#8a8478', 0, 0, 0, '#a6a094');
    L.m('plaster').b(cx, wy, cz, ww, WH, wd, sp.wall, 0, 0, 0, Art.shade(sp.wall, -0.2));
    L.m('stone').b(cx, H0 + 0.16, cz, ww + 0.04, 0.32, wd + 0.04, '#77726c');
    // 店面：一大片敞开的门洞，里头亮着灯
    const ox = cx - ww * 0.1, ow = ww * 0.62;
    L.m('wood').b(ox, H0 + 0.76, wzf + 0.01, ow + 0.14, 1.52, 0.05, Art.shade(sp.pillar, -0.5)); Gl.glow(1.5).b(ox, H0 + 0.8, wzf + 0.035, ow, 1.36, 0.02, '#a8743c');
    for (const s of [-1, 1]) L.m(0.38, 0, 0.3, 0.05).c(ox + s * (ow / 2 + 0.06), wy, wzf + 0.05, 0.07, WH, sp.pillar, 1, 8);
    doorAt(L, cx + ww * 0.36, H0, wzf + 0.02, 0.56, 1.26, sp.pillar);
    // 柜台和货
    const kz = wzf + 0.3, ky = H0 + 0.62;
    L.m('wood').b(ox, H0 + 0.3, kz, ow, 0.6, 0.34, Art.shade(sp.pillar, -0.2), 0, 0, 0, Art.shade(sp.pillar, 0.1)); L.b(ox, ky, kz, ow + 0.1, 0.05, 0.42, '#9a6a40');
    const G = sp.goods, n = Math.max(3, Math.round(ow / 0.3));
    for (let i = 0; i < n; i++) {
      const gx = ox - ow / 2 + (i + 0.5) * ow / n, c5 = ['#b84444', '#447eb0', '#c89a38', '#6aa860', '#8a60b4'][i % 5];
      if (G === 'cloth') L.m('silk').c(gx, ky + 0.09, kz, 0.065, 0.32, c5, 1, 8, Art.shade(c5, 0.25), PI / 2, 0, 0);
      else if (G === 'books') { L.m('cloth'); for (let k = 0; k < 2 + (i % 3); k++) L.b(gx, ky + 0.05 + k * 0.045, kz, 0.2, 0.04, 0.26, k % 2 ? '#3a5a8a' : '#e8dcc0', 0, (rnd() - 0.5) * 0.3, 0); }
      else if (G === 'jars') { L.m(0.3, 0, 0.2, 0.1).s(gx, ky + 0.13, kz, 0.1, 0.13, 0.1, '#5a3a2a', '#8a5a3a'); L.m('cloth').c(gx, ky + 0.26, kz, 0.055, 0.03, '#b0402e', 1, 8); }
      else if (G === 'iron') { L.m('metal').b(gx, ky + 0.04, kz, 0.045, 0.014, 0.36, '#cfd8e4', 0, 0.3 - i * 0.15, 0); L.m('gold').b(gx, ky + 0.04, kz + 0.17, 0.09, 0.03, 0.03, gold, 0, 0.3 - i * 0.15, 0); }
      else if (G === 'herbs') { L.m('wood').b(gx, ky + 0.07, kz, 0.2, 0.1, 0.24, '#7a5230'); L.m('leaf').s(gx, ky + 0.14, kz, 0.085, 0.045, 0.1, i % 2 ? '#4a8a3e' : '#b0903a', '#86bc62'); }
      else { L.m(0.25, 0, 0.1, 0.1).c(gx, ky + 0.1, kz, 0.07, 0.16, c5, 0.7, 10); L.m('wood').c(gx, ky + 0.2, kz, 0.035, 0.04, '#b89868', 1, 6); }
    }
    if (sp.gable) { gableRoof(L, cx, ry, cz, ww / 2 + 0.4, wd / 2 + 0.45, 0.9, sp.roof); for (const s of [-1, 1]) gableWall(L, cx + s * (ww / 2 - 0.01), ry, cz, wd / 2, wd / 2 + 0.45, 0.9, sp.wall); }
    else roof(L, cx, ry + 0.1, cz, ww / 2 + 0.5, wd / 2 + 0.5, ww * 0.3, 0.9, sp.roof);
    // 布篷
    const ax0 = ox - ow / 2 - 0.2, ax1 = ox + ow / 2 + 0.2, az1 = wzf + 0.98;
    L.m('cloth').surf(16, 4, (u, v, o) => { o[0] = lerp(ax0, ax1, u); o[2] = lerp(wzf + 0.04, az1, v); o[1] = lerp(ry - 0.12, ry - 0.5, v) - 0.05 * Math.sin(u * PI) * Math.sin(v * PI) + 0.015 * Math.sin(u * 44); },
      (u, v, p, o) => { const c = lin(Math.floor(u * 9) % 2 ? '#f0e4cc' : awn), k = 0.8 + 0.2 * v; o[0] = c[0] * k; o[1] = c[1] * k; o[2] = c[2] * k; }, { two: true });
    L.b((ax0 + ax1) / 2, ry - 0.56, az1 + 0.005, ax1 - ax0, 0.14, 0.02, Art.shade(awn, -0.2));
    L.m('wood'); for (const x of [ax0 + 0.05, ax1 - 0.05]) L.stick([x, 0, az1 - 0.04], [x, ry - 0.5, az1 - 0.04], 0.03, 0.03, '#4e3220', 6);
    if (sp.forge) { L.m('stone').b(cx + ww * 0.36, 0.3, zf + 0.0, 0.5, 0.6, 0.4, '#4a4442', 0, 0, 0, '#6a6460'); Gl.glow(4).s(cx + ww * 0.36, 0.62, zf, 0.16, 0.05, 0.12, '#ff8a2a'); fx.fire(cx + ww * 0.36, 0.7, zf); fx.pool(cx + ww * 0.36, zf, 1.8, '#ff8a3a', 0.35); L.m('metal').b(ox + ow / 2 + 0.3, 0.42, az1 - 0.3, 0.3, 0.14, 0.16, '#2e282e').c(ox + ow / 2 + 0.3, 0.18, az1 - 0.3, 0.1, 0.36, '#3a3436', 1.3, 8); }
    hangLantern(L, Gl, fx, ox + ow / 2 + 0.3, H0 + 1.2, wzf + 0.2, false, 0.8);
    fx.pool(ox, zf + 0.5, 2.0, lightC, 0.16);
    if (sp.sign) signPlane(dyn, sp.sign, cx, ry + 0.42, wzf + 0.34, -0.45, 0.9);
    if (sp.flag) banner(L, dyn, sp.flag, cx - w / 2 + 0.3, zf + 0.02, 2.7, awn);
  };
  // 塔：一层层收分，每层一圈出檐，顶上是宝顶
  KIND.pagoda = q => {
    const { L, Gl, sp, fx, w, cx, zf, zb } = q, cz = (zf + zb) / 2, n = sp.tiers || 5, lightC = sp.dark ? '#b08aff' : '#ffd08a';
    let hs = Math.min(w, zf - zb + 0.42) / 2 - 0.42, y = 0.3; hs = Math.min(hs, 1.15);
    L.m('stone').b(cx, 0.15, cz, hs * 2 + 0.7, 0.3, hs * 2 + 0.7, '#8a8478', 0, 0, 0, '#a6a094').b(cx, 0.08, cz + hs + 0.5, 1.0, 0.16, 0.3, '#a29c90');
    for (let t = 0; t < n; t++) {
      const bh = t ? 0.86 * Math.pow(0.94, t) : 1.3, last = t === n - 1;
      L.m('plaster').b(cx, y + bh / 2, cz, hs * 2, bh, hs * 2, sp.wall, 0, 0, 0, Art.shade(sp.wall, -0.2));
      for (const s of [-1, 1]) for (const e of [-1, 1]) L.m(0.38, 0, 0.3, 0.05).c(cx + s * hs, y + bh / 2, cz + e * hs, 0.055, bh, sp.pillar, 1, 8);
      L.m('wood').b(cx, y + bh - 0.05, cz, hs * 2 + 0.08, 0.1, hs * 2 + 0.08, Art.shade(sp.pillar, -0.5));
      if (t === 0) doorAt(L, cx, y, cz + hs + 0.02, 0.6, 1.05, sp.pillar); else winAt(L, Gl, cx, y + bh * 0.5, cz + hs, hs * 0.7, bh * 0.4, lightC);
      Gl.glow(2.2); for (const s of [-1, 1]) Gl.b(cx + s * (hs + 0.012), y + bh * 0.5, cz, 0.02, bh * 0.36, hs * 0.6, lightC);
      roof(L, cx, y + bh, cz, hs + 0.44, hs + 0.44, 0.03, last ? 0.8 : 0.4, sp.roof, { pyr: true, lift: 0.22, fin: last });
      y += bh + 0.12; hs *= 0.87;
    }
    fx.glow(cx, 1.0, cz + hs + 0.6, 1.2, sp.dark ? '#b070ff' : '#ff9a50', 0.25); fx.pool(cx, zf + 0.4, 1.8, lightC, 0.12);
  };
  // 亭：四根柱子一个攒尖顶，里头一张石桌
  KIND.pavilion = q => {
    const { L, Gl, sp, fx, w, cx, zf, zb } = q, cz = (zf + zb) / 2 - 0.05, r = Math.min(w, zf - zb + 0.42) / 2 - 0.28, col = sp.pillar;
    L.m('stone').b(cx, 0.1, cz, r * 2 + 0.5, 0.2, r * 2 + 0.5, '#8a8478', 0, 0, 0, '#a6a094').b(cx, 0.05, cz + r + 0.36, 0.8, 0.1, 0.22, '#a29c90');
    for (const s of [-1, 1]) for (const e of [-1, 1]) { L.m(0.38, 0, 0.3, 0.05).c(cx + s * r, 1.12, cz + e * r, 0.07, 1.84, col, 1, 10, Art.shade(col, -0.2)); L.m('stone').c(cx + s * r, 0.25, cz + e * r, 0.11, 0.1, '#8a8478', 0.8, 8); }
    const fr = Art.shade(col, -0.45); L.m('wood');
    for (const s of [-1, 1]) { L.b(cx, 1.96, cz + s * r, r * 2 + 0.16, 0.12, 0.1, fr).b(cx + s * r, 1.96, cz, 0.1, 0.12, r * 2 + 0.16, fr); L.b(cx + s * r, 0.5, cz, 0.08, 0.06, r * 2, fr).b(cx + s * r, 0.36, cz, 0.05, 0.3, r * 2 - 0.2, Art.shade(col, -0.2)); }
    L.b(cx, 0.5, cz - r, r * 2, 0.06, 0.08, fr).b(cx, 0.36, cz - r, r * 2 - 0.2, 0.3, 0.05, Art.shade(col, -0.2));
    L.m('stone').c(cx, 0.48, cz, 0.24, 0.07, '#9a968c', 1, 12).c(cx, 0.32, cz, 0.1, 0.26, '#8a867c', 1.2, 8);
    roof(L, cx, 2.04, cz, r + 0.56, r + 0.56, 0.03, 0.78, sp.roof, { pyr: true, lift: 0.3, fin: true });
    hangLantern(L, Gl, fx, cx, 1.6, cz + r + 0.02, false, 0.8);
  };
  // 哨楼：木头搭的高脚望楼（wood），或石砌的箭楼
  KIND.tower = q => {
    const { L, Gl, sp, fx, cx, zf, zb, rnd } = q, cz = (zf + zb) / 2 - 0.1;
    if (sp.wood) {
      const wd = sp.pillar, dk = Art.shade(wd, -0.3), py = 2.5; L.m('wood');
      for (const s of [-1, 1]) for (const e of [-1, 1]) L.stick([cx + s * 0.72, 0, cz + e * 0.72], [cx + s * 0.5, py, cz + e * 0.5], 0.06, 0.05, wd, 6);
      for (const s of [-1, 1]) { L.stick([cx + s * 0.68, 0.5, cz - 0.68], [cx + s * 0.56, 1.9, cz + 0.56], 0.028, 0.028, dk, 5).stick([cx - 0.68, 0.5, cz + s * 0.68], [cx + 0.56, 1.9, cz + s * 0.56], 0.028, 0.028, dk, 5); }
      L.b(cx, py + 0.04, cz, 1.5, 0.08, 1.5, dk);
      railing(L, [[cx - 0.7, cz - 0.7], [cx - 0.7, cz + 0.7], [cx + 0.7, cz + 0.7], [cx + 0.7, cz - 0.7], [cx - 0.7, cz - 0.7]], py + 0.08, 0.5, wd);
      for (const s of [-1, 1]) for (const e of [-1, 1]) L.stick([cx + s * 0.6, py + 0.08, cz + e * 0.6], [cx + s * 0.6, py + 1.3, cz + e * 0.6], 0.035, 0.035, wd, 5);
      L.m('fur').add(roofGeo(1.0, 1.0, 0.03, 0.7, 0), M(cx, py + 1.3, cz), '#cdae5c', '#94762e');
      L.m('wood'); for (const s of [-1, 1]) L.stick([cx + s * 0.18, 0, cz + 1.25], [cx + s * 0.18, py + 0.1, cz + 0.76], 0.025, 0.025, dk, 5); for (let k = 1; k < 8; k++) { const t = k / 8; L.stick([cx - 0.18, t * (py + 0.1), lerp(cz + 1.25, cz + 0.76, t)], [cx + 0.18, t * (py + 0.1), lerp(cz + 1.25, cz + 0.76, t)], 0.018, 0.018, dk, 4); }
      Gl.glow(3.6).s(cx, py + 0.3, cz, 0.1, 0.07, 0.1, '#ff8a2a'); fx.glow(cx, py + 0.45, cz, 1.0, '#ff9a50', 0.3);
    } else {
      const st = sp.wall, hi = Art.shade(st, 0.18), H = 3.0;
      L.m('stone').b(cx, H / 2, cz, 1.5, H, 1.5, st, 0, 0, 0, hi).b(cx, 0.2, cz, 1.7, 0.4, 1.7, Art.shade(st, -0.15)).b(cx, H + 0.06, cz, 1.72, 0.12, 1.72, hi);
      for (const s of [-1, 0, 1]) for (const e of [-1, 0, 1]) if (s || e) L.b(cx + s * 0.72, H + 0.3, cz + e * 0.72, 0.3, 0.36, 0.3, st);
      L.m('wood').b(cx, 0.6, cz + 0.76, 0.56, 1.1, 0.05, '#2a1e1a'); for (const yy of [1.7, 2.4]) L.b(cx, yy, cz + 0.76, 0.1, 0.36, 0.04, '#141012');
      Gl.glow(2.4).b(cx, 2.05, cz + 0.762, 0.26, 0.2, 0.02, sp.dark ? '#b08aff' : '#ffb060');
      for (const s of [-1, 1]) for (const e of [-1, 1]) L.m(0.38, 0, 0.3, 0.05).c(cx + s * 0.5, H + 0.7, cz + e * 0.5, 0.05, 1.0, sp.pillar, 1, 8);
      roof(L, cx, H + 1.2, cz, 1.05, 1.05, 0.03, 0.6, sp.roof, { pyr: true, lift: 0.22, fin: true });
      fx.glow(cx, 2.05, cz + 0.9, 0.9, '#ff9a50', 0.3);
    }
  };
  // 水榭：架在木桩上的板屋，门前一方带栏杆的平台
  KIND.stilt = q => {
    const { L, Gl, sp, fx, w, cx, zf, zb, rnd } = q, cz = (zf + zb) / 2 - 0.25, dd = zf - zb, py = 0.5, wd = sp.pillar, dk = Art.shade(wd, -0.3);
    const ww = w - 1.3, dp = dd - 1.3, WH = 1.5, wzf = cz + dp / 2, ry = py + WH;
    L.m('wood'); for (let i = 0; i < 4; i++) for (const zz of [cz - dp / 2, cz + dp / 2 + 0.75]) L.stick([cx - ww / 2 - 0.1 + i * (ww + 0.2) / 3, -0.1, zz], [cx - ww / 2 - 0.1 + i * (ww + 0.2) / 3, py, zz], 0.055, 0.05, dk, 6);
    L.b(cx, py - 0.04, cz + 0.4, ww + 0.5, 0.08, dp + 1.15, '#8a6a44', 0, 0, 0, '#a07e54');
    L.b(cx, py + WH / 2, cz, ww, WH, dp, sp.wall, 0, 0, 0, Art.shade(sp.wall, -0.25));
    for (let i = 0; i <= 8; i++) L.b(cx - ww / 2 + i * ww / 8, py + WH / 2, wzf + 0.008, 0.03, WH, 0.02, dk);
    doorAt(L, cx - ww * 0.2, py, wzf + 0.02, 0.7, 1.2, wd); winAt(L, Gl, cx + ww * 0.26, py + 0.9, wzf, 0.5, 0.42, '#f0c070');
    gableRoof(L, cx, ry, cz, ww / 2 + 0.4, dp / 2 + 0.5, 0.85, sp.roof, { plain: true });
    for (const s of [-1, 1]) gableWall(L, cx + s * (ww / 2 - 0.01), ry, cz, dp / 2, dp / 2 + 0.5, 0.85, sp.wall);
    const x0 = cx - ww / 2 - 0.2, x1 = cx + ww / 2 + 0.2, z1 = wzf + 0.92;
    railing(L, [[x0, wzf + 0.1], [x0, z1], [cx - 0.5, z1]], py, 0.42, wd); railing(L, [[cx + 0.5, z1], [x1, z1], [x1, wzf + 0.1]], py, 0.42, wd);
    for (let k = 0; k < 3; k++) L.m('wood').b(cx, py - 0.1 - k * 0.15, z1 + 0.14 + k * 0.2, 0.9, 0.06, 0.22, '#8a6a44');
    hangLantern(L, Gl, fx, x1 - 0.1, py + 1.1, z1 - 0.05, false, 0.8); clutter(L, x0 + 0.45, wzf + 0.45, rnd, 'barrel');
    for (let k = 0; k < 3; k++) { const p = [x1 - 0.3 - k * 0.25, py + 0.5]; L.m('wood').stick([p[0], py, wzf + 0.5], [p[0], py + 0.9, wzf + 0.5], 0.015, 0.015, dk, 4); }
    L.stick([x1 - 0.85, py + 0.88, wzf + 0.5], [x1 - 0.25, py + 0.88, wzf + 0.5], 0.012, 0.012, dk, 4);
    fx.pool(cx, zf + 0.3, 1.8, '#ffd08a', 0.12);
  };
  // 牌坊：两根立柱，上架额枋和小檐，匾上题名。横跨在路上，人从中间穿过
  KIND.paifang = q => {
    const { L, Gl, sp, b, fx, dyn } = q, vert = b.h > b.w, n = vert ? b.h : b.w, cx = b.x + b.w / 2, cz = b.y + b.h / 2, half = n / 2 - 0.5, col = sp.pillar, fr = Art.shade(col, -0.45);
    const bx = (t, y, lt, hy, ws, c1, c2) => (vert ? L.b(cx, y, cz + t, ws, hy, lt, c1, 0, 0, 0, c2) : L.b(cx + t, y, cz, lt, hy, ws, c1, 0, 0, 0, c2));
    for (const s of [-1, 1]) {
      L.m('stone'); bx(s * half, 0.3, 0.52, 0.6, 0.52, '#8a8478', '#a6a094');
      const px = vert ? cx : cx + s * half, pz = vert ? cz + s * half : cz;
      L.m(0.38, 0, 0.3, 0.05).c(px, 2.0, pz, 0.13, 3.4, col, 1, 10, Art.shade(col, -0.2));
      hangLantern(L, Gl, fx, px + (vert ? 0 : -s * 0.42), 2.45, pz + (vert ? -s * 0.42 : 0), false, 0.9);
    }
    L.m('wood'); bx(0, 2.9, n - 0.5, 0.2, 0.18, fr); bx(0, 3.62, n - 0.3, 0.2, 0.2, fr); bx(0, 3.26, n - 1.5, 0.5, 0.08, '#1a1620');
    L.m('gold'); bx(0, 3.02, n - 0.6, 0.03, 0.2, gold);
    if (vert) roof(L, cx, 3.76, cz, 0.55, half + 0.62, 0.03, 0.5, sp.roof, { pyr: true, lift: 0.24 });
    else roof(L, cx, 3.76, cz, half + 0.62, 0.55, half * 0.75, 0.5, sp.roof, { lift: 0.24 });
    const name = b.sign || sp.sign;
    if (name) { if (vert) signPlane(dyn, name, cx - 0.06, 3.26, cz, 0, 0.82, -PI / 2); else signPlane(dyn, name, cx, 3.26, cz + 0.06, -0.12, 0.82); }
  };
  // 废墟：塌了大半的墙和烧焦的梁
  KIND.ruin = q => {
    const { L, Gl, sp, fx, w, cx, zf, zb, rnd } = q, cz = (zf + zb) / 2, dd = zf - zb, ww = w - 1.0, wd = dd - 0.9, st = sp.wall, hi = Art.shade(st, 0.2);
    L.m('stone').b(cx, 0.08, cz, ww + 0.3, 0.16, wd + 0.3, Art.shade(st, -0.2), 0, 0, 0, st);
    for (let i = 0; i < 6; i++) { const t = (i + 0.5) / 6, h = 0.5 + rnd() * 1.5; L.b(cx - ww / 2 + t * ww, 0.16 + h / 2, cz - wd / 2, ww / 6 + 0.02, h, 0.2, st, 0, 0, (rnd() - 0.5) * 0.06, hi); }
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const t = (i + 0.5) / 3, h = 0.3 + rnd() * (1.5 - i * 0.4); L.b(cx + s * ww / 2, 0.16 + h / 2, cz - wd / 2 + t * wd, 0.2, h, wd / 3 + 0.02, st, 0, 0, 0, hi); }
    L.m('bark').stick([cx - ww * 0.4, 0.2, cz + wd * 0.3], [cx + ww * 0.25, 1.5, cz - wd * 0.4], 0.07, 0.06, sp.pillar, 6).stick([cx + ww * 0.42, 0.16, cz + wd * 0.1], [cx - ww * 0.05, 0.5, cz + wd * 0.45], 0.06, 0.05, sp.pillar, 6);
    L.m(0.38, 0, 0.3, 0.05).c(cx + ww * 0.3, 0.75, cz + wd * 0.35, 0.09, 1.2, sp.pillar, 1, 8);
    L.m('stone'); for (let i = 0; i < 7; i++) { const s = 0.1 + rnd() * 0.16; L.add(rockGeo[i % 3], M(cx + (rnd() - 0.5) * ww, s * 0.35, cz + (rnd() - 0.2) * wd * 0.8, s * 1.2, s, s, 0, rnd() * 6, 0), Art.shade(st, -0.3), hi); }
    Gl.glow(3); for (let i = 0; i < 3; i++) Gl.s(cx + (rnd() - 0.5) * ww * 0.7, 0.2, cz + (rnd() - 0.5) * wd * 0.6, 0.05, 0.03, 0.05, '#ff7a2a');
    fx.pool(cx, cz, 1.6, '#ff7a3a', 0.2);
  };

  function building(L, Gl, sp, b, fx, dyn) {
    if (sp.kind) return KIND[sp.kind]({ L, Gl, sp, b, fx, dyn, w: b.w, cx: b.x + b.w / 2, zf: b.y + b.h - 0.12, zb: b.y + 0.3, rnd: mulberry32(b.x * 131 + b.y * 17 + 3) });
    const w = b.w, cx = b.x + w / 2, zf = b.y + b.h - 0.12, zb = b.y + 0.3, cz = (zf + zb) / 2, dd = zf - zb;
    const H0 = 0.26, WH = 1.75, wy = H0 + WH / 2, ww = w - 1.0, wd = dd - 0.9, wzf = cz + wd / 2, lightC = sp.dark ? '#b08aff' : '#ffd08a', frame = Art.shade(sp.pillar, -0.5), lat = '#3a2618';
    L.m('stone').b(cx, H0 / 2, cz, w - 0.15, H0, dd, '#8a8478', 0, 0, 0, '#a6a094');
    for (let i = 0; i < 3; i++) L.b(cx, H0 * (0.84 - i * 0.3) / 2, zf + 0.1 + i * 0.13, 1.7 + i * 0.12, H0 * (0.84 - i * 0.3), 0.26, '#a29c90');
    L.m('plaster').b(cx, wy, cz, ww, WH, wd, sp.wall, 0, 0, 0, Art.shade(sp.wall, -0.18));
    L.m('wood').b(cx, H0 + 0.09, wzf + 0.012, ww + 0.02, 0.18, 0.03, frame).b(cx, H0 + WH - 0.09, wzf + 0.012, ww + 0.02, 0.18, 0.03, frame);
    const np = w >= 6 ? 6 : 4, px0 = cx - (w - 0.6) / 2, pstep = (w - 0.6) / (np - 1), pz = zf - 0.28;
    for (let i = 0; i < np; i++) {
      L.m(0.38, 0, 0.3, 0.05).c(px0 + i * pstep, wy, pz, 0.092, WH, sp.pillar, 1, 10, Art.shade(sp.pillar, -0.22));
      L.m('stone').c(px0 + i * pstep, H0 + 0.06, pz, 0.135, 0.12, '#8a8478', 0.78, 10);
      L.m('wood').b(px0 + i * pstep, H0 + WH - 0.07, pz, 0.26, 0.1, 0.26, frame);
    }
    for (const i of [0, np - 1]) L.m(0.38, 0, 0.3, 0.05).c(px0 + i * pstep, wy, zb + 0.28, 0.092, WH, sp.pillar, 1, 10);
    L.m('wood').b(cx, H0 + WH - 0.16, pz, w - 0.5, 0.11, 0.1, frame);
    // 门
    L.b(cx, H0 + 0.68, wzf + 0.02, 0.98, 1.36, 0.06, Art.shade(sp.pillar, -0.6));
    for (const s of [-1, 1]) { L.b(cx + s * 0.235, H0 + 0.66, wzf + 0.055, 0.43, 1.26, 0.03, Art.shade(sp.pillar, -0.38)); for (let k = 0; k < 3; k++) L.b(cx + s * (0.11 + k * 0.125), H0 + 0.95, wzf + 0.075, 0.016, 0.56, 0.012, lat); for (let k = 0; k < 3; k++) L.b(cx + s * 0.235, H0 + 0.74 + k * 0.2, wzf + 0.075, 0.38, 0.016, 0.012, lat); }
    L.m('gold').b(cx, H0 + 1.4, wzf + 0.05, 1.1, 0.07, 0.07, gold); for (const s of [-1, 1]) L.s(cx + s * 0.05, H0 + 0.6, wzf + 0.08, 0.026, 0.026, 0.018, gold);
    // 窗
    Gl.glow(2.2);
    for (let i = 0; i < np - 1; i++) {
      const x = px0 + (i + 0.5) * pstep; if (Math.abs(x - cx) < 0.8 || Math.abs(x - cx) > ww / 2 - 0.3) continue;
      L.m('wood').b(x, H0 + 0.95, wzf + 0.015, 0.7, 0.66, 0.05, lat); Gl.b(x, H0 + 0.95, wzf + 0.042, 0.6, 0.56, 0.02, lightC);
      for (const k of [-2, -1, 0, 1, 2]) L.b(x + k * 0.1, H0 + 0.95, wzf + 0.058, 0.018, 0.56, 0.016, lat); for (const k of [-1, 0, 1]) L.b(x, H0 + 0.95 + k * 0.16, wzf + 0.058, 0.6, 0.018, 0.016, lat);
    }
    Gl.glow(3.2);
    for (const s of [-1, 1]) {
      const lx = cx + s * 0.78, ly = H0 + 1.3, lz = pz + 0.1;
      Gl.surf(10, 5, (u, v, o) => { const a = u * TAU, p = lerp(0.14, 0.86, v) * PI; o[0] = lx + Math.sin(p) * Math.sin(a) * 0.085; o[1] = ly + Math.cos(p) * 0.11; o[2] = lz + Math.sin(p) * Math.cos(a) * 0.085; }, sp.dark ? ['#e0b0ff', '#8a4ad0'] : ['#ffd27a', '#ff5a2c'], { closed: true, flip: true });
      L.m('gold').c(lx, ly + 0.105, lz, 0.04, 0.025, gold, 1, 8).c(lx, ly - 0.105, lz, 0.04, 0.025, gold, 1, 8); L.stick([lx, ly + 0.11, lz], [lx, ly + 0.3, lz], 0.005, 0.005, '#1e1818', 4);
      fx.glow(lx, ly, lz, 0.8, sp.dark ? '#b070ff' : '#ff9a50', 0.36);
    }
    const ry = H0 + WH;
    L.m('wood').b(cx, ry + 0.06, cz, w - 0.3, 0.14, dd - 0.25, Art.shade(sp.pillar, -0.34));
    for (let i = 0; i < np * 2 - 1; i++) L.b(px0 + i * pstep / 2, ry + 0.02, zf - 0.12, 0.12, 0.12, 0.34, frame);
    roof(L, cx, ry + 0.13, cz, w / 2 + 0.42, dd / 2 + 0.42, w * 0.27, 1.0, sp.roof);
    if ((sp.tiers || 1) > 1) {
      const y2 = ry + 0.13 + 0.54, w2 = w * 0.5, d2 = dd * 0.42;
      L.m('plaster').b(cx, y2 + 0.42, cz, w2, 0.86, d2, Art.shade(sp.wall, -0.06), 0, 0, 0, Art.shade(sp.wall, -0.2));
      Gl.glow(2.2);
      for (const i of [-1, 0, 1]) { L.m('wood').b(cx + i * w2 * 0.29, y2 + 0.52, cz + d2 / 2 + 0.005, 0.38, 0.36, 0.02, lat); Gl.b(cx + i * w2 * 0.29, y2 + 0.52, cz + d2 / 2 + 0.02, 0.3, 0.28, 0.02, lightC); for (const k of [-1, 0, 1]) L.b(cx + i * w2 * 0.29 + k * 0.08, y2 + 0.52, cz + d2 / 2 + 0.034, 0.014, 0.28, 0.012, lat); }
      for (const s of [-1, 1]) for (const q of [-1, 1]) L.m(0.38, 0, 0.3, 0.05).c(cx + s * w2 / 2, y2 + 0.42, cz + q * d2 / 2, 0.06, 0.86, sp.pillar, 1, 8);
      L.m('wood').b(cx, y2 + 0.06, cz + d2 / 2 + 0.1, w2 + 0.3, 0.04, 0.04, frame).b(cx, y2 + 0.2, cz + d2 / 2 + 0.1, w2 + 0.3, 0.03, 0.03, frame);
      roof(L, cx, y2 + 0.85, cz, w2 / 2 + 0.47, d2 / 2 + 0.47, w2 * 0.22, 0.84, sp.roof);
    }
    fx.pool(cx, zf + 0.5, 2.2, lightC, 0.16);
    if (sp.sign) {
      const n = sp.sign.length, tex = K.canvasTex(64 * n + 40, 96, (c, W, H) => {
        c.fillStyle = '#17131e'; c.fillRect(0, 0, W, H); c.strokeStyle = '#c9a44e'; c.lineWidth = 6; c.strokeRect(5, 5, W - 10, H - 10);
        c.fillStyle = '#e8c878'; c.font = 'bold 58px ' + FONT_K; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(sp.sign, W / 2, H / 2 + 3);
      });
      const me = new THREE.Mesh(new THREE.PlaneGeometry(0.34 * n + 0.2, 0.46), textMat({ map: tex }));
      me.position.set(cx, ry + 0.54, zf + 0.38); me.rotation.x = -0.6; dyn.add(me);
    }
    if (sp.flag) for (const s of [-1, 1]) banner(L, dyn, sp.flag, cx + s * (w / 2 - 0.2) - (s > 0 ? 0.42 : 0), zf + 0.02, 3.1, sp.flagC || '#a8362a');
  }
  const BUILD = {
    hallTingyu: { tiers: 2, roof: '#35607c', wall: '#e9e2d0', pillar: '#8a3426', sign: '听雨阁' },
    inn: { tiers: 2, roof: '#6e3a2c', wall: '#eadcbc', pillar: '#5e3220', sign: '客栈' },
    biaoju: { tiers: 1, roof: '#34425a', wall: '#e2dbc8', pillar: '#6c2828', sign: '镖局' },
    // 民居三式：青砖灰瓦的硬山房、粉墙黛瓦带马头墙的、两层的木楼
    house1: { kind: 'house', roof: '#4c4a52', wall: '#b9b4a8', pillar: '#5e4230', base: '#77746e' },
    house2: { kind: 'house', hz: 1, roof: '#34343a', wall: '#f1eee4', pillar: '#4a3426' },
    house3: { kind: 'lou', tiers: 2, roof: '#8c462a', wall: '#7a5636', pillar: '#5e3220', woodWall: 1 },
    dorm: { kind: 'house', roof: '#35607c', wall: '#e9e2d0', pillar: '#8a3426', frame: '#6a3a2a' },
    hut: { kind: 'thatch', wall: '#bfa06c', pillar: '#4a3424' },
    hut2: { kind: 'thatch', wall: '#c9b48e', pillar: '#5a4030' },
    stilt: { kind: 'stilt', roof: '#4a443e', wall: '#7a5a3a', pillar: '#5a4028' },
    ferryInn: { kind: 'lou', tiers: 2, roof: '#6e3a2c', wall: '#eadcbc', pillar: '#5e3220', sign: '客栈', flag: '栈', lanterns: 1 },
    fortHall: { kind: 'lou', tiers: 2, roof: '#4a3a2c', wall: '#6a5238', pillar: '#4a3020', woodWall: 1, sign: '聚义厅', flag: '寨', flagC: '#3a3436' },
    pagoda: { kind: 'pagoda', tiers: 5, roof: '#3e4a56', wall: '#e6dcc4', pillar: '#8a2e22' },
    pagodaS: { kind: 'pagoda', tiers: 4, roof: '#5476a0', wall: '#e5ecf4', pillar: '#7c98bc' },
    pagodaD: { kind: 'pagoda', tiers: 4, roof: '#281a34', wall: '#2e2636', pillar: '#6c38b8', dark: 1 },
    pavilion: { kind: 'pavilion', roof: '#3e5a48', pillar: '#8a2e22' },
    towerW: { kind: 'tower', wood: 1, pillar: '#6a4c30' },
    towerS: { kind: 'tower', roof: '#5a1814', wall: '#4a3c38', pillar: '#b44c26' },
    paifang: { kind: 'paifang', roof: '#3e4a56', pillar: '#8a2e22' },
    ruin: { kind: 'ruin', wall: '#4a4244', pillar: '#241c1e' },
    hallFire: { tiers: 2, roof: '#5a1814', wall: '#52403a', pillar: '#b44c26', sign: '赤焰殿' },
    hallAsh: { tiers: 2, roof: '#2a2226', wall: '#3a3234', pillar: '#7a3a2a', sign: '幽烬殿' },
    hallSnow: { tiers: 2, roof: '#5476a0', wall: '#e5ecf4', pillar: '#7c98bc', sign: '寒月宫' },
    hallAbyss: { tiers: 2, roof: '#281540', wall: '#201832', pillar: '#6c38b8', sign: '归墟', dark: 1 },
    // 落霞城里的铺面：客栈、酒楼、茶馆是木楼；当铺是高墙深院；布庄、书肆等是敞开的店面；衙门、庙、钱庄、镖局是殿堂
    inn2:     { kind: 'lou', tiers: 2, roof: '#6e3a2c', wall: '#eadcbc', pillar: '#5e3220', sign: '悦来客栈', flag: '栈', lanterns: 1 },
    tavern:   { kind: 'lou', tiers: 3, roof: '#7a2a22', wall: '#f0e2c0', pillar: '#8a2e22', sign: '醉仙楼', flag: '酒', lanterns: 1 },
    teahouse: { kind: 'lou', tiers: 2, roof: '#3e5a48', wall: '#6e5236', pillar: '#4a3a26', woodWall: 1, sign: '茶馆', flag: '茶', flagC: '#3a6a4a' },
    pawn:     { kind: 'house', hz: 1, roof: '#30303a', wall: '#e8e4d8', pillar: '#3a2a22', sign: '当铺' },
    yamen:    { tiers: 2, roof: '#2e3a52', wall: '#e4dccc', pillar: '#7a2424', sign: '衙门' },
    temple:   { tiers: 2, roof: '#8a6a22', wall: '#d8c8a0', pillar: '#8a2a1e', sign: '城隍庙' },
    cloth:    { kind: 'shop', roof: '#5a4a7a', wall: '#ece2d4', pillar: '#5a3a4a', sign: '布庄', awn: '#7a4a9a', goods: 'cloth', flag: '布' },
    grocer:   { kind: 'shop', gable: 1, roof: '#4a6a4a', wall: '#e8e0c8', pillar: '#5a4228', sign: '杂货', awn: '#3a7a5a', goods: 'misc' },
    book:     { kind: 'shop', roof: '#3a4a5a', wall: '#ece6d6', pillar: '#4a3a2a', sign: '书肆', awn: '#3a5a8a', goods: 'books', flag: '书' },
    wine:     { kind: 'shop', gable: 1, roof: '#7a4a2a', wall: '#ecdcb8', pillar: '#5a3220', sign: '酒坊', awn: '#a8362a', goods: 'jars', flag: '酒' },
    smithy:   { kind: 'shop', gable: 1, roof: '#44403e', wall: '#a8a096', pillar: '#4a2a1e', sign: '铁匠铺', awn: '#4a4a52', goods: 'iron', forge: 1 },
    clinic:   { kind: 'shop', roof: '#3e6a52', wall: '#eee8d4', pillar: '#4a5a32', sign: '药铺', awn: '#3e7a52', goods: 'herbs', flag: '药' },
    bank:     { tiers: 2, roof: '#4a4a3a', wall: '#e8dcc0', pillar: '#6a5a22', sign: '钱庄' },
    escort:   { tiers: 2, roof: '#34425a', wall: '#e2dbc8', pillar: '#6c2828', sign: '长风镖局', flag: '镖', flagC: '#2e3a6a' }
  };
  /* 城墙与城门：墙体一格一段，顶上有垛口；四角是角楼；道路穿过处是门洞，上面起一座门楼并挂匾 */
  function cityWall(m, chunk, fx, dyn) {
    const WH = 2.5, stone = '#7e786f', top = '#948e84', dark = '#5e5850', Wl = m.d.wall;
    for (const t of m.wall) {
      if (t.gate) continue;
      const L = chunk(t.x, t.y).L.m('stone'), cx = t.x + 0.5, cz = t.y + 0.5;
      if (t.corner) {   // 角楼
        L.b(cx, 1.7, cz, 1.9, 3.4, 1.9, stone, 0, 0, 0, top); L.b(cx, 3.46, cz, 2.1, 0.14, 2.1, top);
        for (const s of [-1, 1]) for (const q of [-1, 1]) L.b(cx + s * 0.86, 3.72, cz + q * 0.86, 0.34, 0.4, 0.34, stone);
        roof(L, cx, 3.9, cz, 1.25, 1.25, 0.7, 0.7, '#4a4640');
        continue;
      }
      L.b(cx, WH / 2, cz, t.vert ? 0.9 : 1.02, WH, t.vert ? 1.02 : 0.9, stone, 0, 0, 0, top);
      L.b(cx, WH + 0.05, cz, t.vert ? 1.0 : 1.02, 0.1, t.vert ? 1.02 : 1.0, top);
      for (const s of [-1, 1]) for (const k of [-0.25, 0.25]) {   // 两侧垛口
        if (t.vert) L.b(cx + s * 0.4, WH + 0.3, cz + k, 0.16, 0.42, 0.3, stone); else L.b(cx + k, WH + 0.3, cz + s * 0.4, 0.3, 0.42, 0.16, stone);
      }
    }
    // 城门：把相邻的门洞格归成一座门
    const seen = new Set(), gates = [];
    for (const t of m.wall) {
      if (!t.gate || seen.has(t.x + '_' + t.y)) continue;
      const g = { x0: t.x, y0: t.y, x1: t.x, y1: t.y, vert: t.vert };
      for (const u of m.wall) if (u.gate && Math.abs(u.x - t.x) + Math.abs(u.y - t.y) <= 1) { seen.add(u.x + '_' + u.y); g.x0 = Math.min(g.x0, u.x); g.y0 = Math.min(g.y0, u.y); g.x1 = Math.max(g.x1, u.x); g.y1 = Math.max(g.y1, u.y); }
      gates.push(g);
    }
    for (const g of gates) {
      const cx = (g.x0 + g.x1 + 1) / 2, cz = (g.y0 + g.y1 + 1) / 2, L = chunk(cx, cz).L, Gl = chunk(cx, cz).Gl;
      const lenX = g.vert ? 1.5 : g.x1 - g.x0 + 1 + 1.0, lenZ = g.vert ? g.y1 - g.y0 + 1 + 1.0 : 1.5;
      L.m('stone');
      // 门洞两侧的墩台与门楣
      if (g.vert) { for (const s of [-1, 1]) L.b(cx, 1.5, cz + s * (lenZ / 2 + 0.05), 1.5, 3.0, 0.5, dark, 0, 0, 0, stone); }
      else { for (const s of [-1, 1]) L.b(cx + s * (lenX / 2 + 0.05), 1.5, cz, 0.5, 3.0, 1.5, dark, 0, 0, 0, stone); }
      L.b(cx, 2.55, cz, lenX + 0.6, 0.9, lenZ + 0.6, stone, 0, 0, 0, top);
      // 门楼
      L.m('plaster').b(cx, 3.6, cz, g.vert ? 1.5 : lenX + 0.1, 1.2, g.vert ? lenZ + 0.1 : 1.5, '#d8cdb4', 0, 0, 0, '#b8ac94');
      L.m(0.38, 0, 0.3, 0.05); for (const s of [-1, 1]) for (const q of [-1, 1]) L.c(cx + s * (g.vert ? 0.8 : lenX / 2 + 0.1), 3.6, cz + q * (g.vert ? lenZ / 2 + 0.1 : 0.8), 0.08, 1.2, '#8a2e22', 1, 8);
      roof(L, cx, 4.22, cz, (g.vert ? 0.75 : lenX / 2 + 0.05) + 0.5, (g.vert ? lenZ / 2 + 0.05 : 0.75) + 0.5, 0.75, 0.9, '#3e4a56');
      Gl.glow(2.4); for (const s of [-1, 1]) { const lx = cx + (g.vert ? 0 : s * (lenX / 2 - 0.2)), lz = cz + (g.vert ? s * (lenZ / 2 - 0.2) : 0) + 0.8; Gl.s(lx, 2.0, lz, 0.1, 0.13, 0.1, '#ffd27a'); fx.glow(lx, 2.0, lz, 0.9, '#ff9a50', 0.3); }
      // 匾：门名取 d.gates 里离这座门最近的一条
      let nm = ''; let bd = 9;
      for (const q of m.d.gates || []) { const dd = Math.abs(q.x - cx) + Math.abs(q.y - cz); if (dd < bd) { bd = dd; nm = q.name; } }
      if (nm) {
        const n = nm.length, tex = K.canvasTex(64 * n + 40, 96, (c, W, H) => { c.fillStyle = '#1a1620'; c.fillRect(0, 0, W, H); c.strokeStyle = '#c9a44e'; c.lineWidth = 6; c.strokeRect(5, 5, W - 10, H - 10); c.fillStyle = '#f0d488'; c.font = 'bold 58px ' + FONT_K; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(nm, W / 2, H / 2 + 3); });
        const me = new THREE.Mesh(new THREE.PlaneGeometry(0.42 * n + 0.24, 0.56), textMat({ map: tex }));
        me.position.set(cx, 3.15, cz + (g.vert ? lenZ / 2 + 0.36 : 1.08)); me.rotation.x = -0.55; dyn.add(me);
      }
    }
  }

  /* ---------- 可交互物件 ---------- */
  function mkChest() {
    const g = new THREE.Group(); let b = new GB();
    b.m('wood').b(0, 0.15, 0, 0.56, 0.3, 0.38, '#6a3c1e', 0, 0, 0, '#8a5028'); b.m('gold').b(0, 0.27, 0, 0.58, 0.05, 0.4, gold);
    for (const s of [-1, 1]) b.b(s * 0.2, 0.15, 0, 0.06, 0.31, 0.4, gold);
    g.add(b.mesh(matPlain, true, true));
    const lid = new THREE.Group(); lid.position.set(0, 0.3, -0.19); g.add(lid);
    b = new GB();
    b.m('wood').c(0, 0, 0.19, 0.19, 0.56, '#7a4624', 1, 14, null, 0, 0, PI / 2);
    b.m('gold'); for (const s of [-1, 1]) b.c(s * 0.2, 0, 0.19, 0.196, 0.06, gold, 1, 14, null, 0, 0, PI / 2);
    b.b(0, -0.02, 0.385, 0.09, 0.11, 0.03, gold);
    lid.add(b.mesh(matPlain, true, false));
    const gl = K.glowSprite('#ffe27a', 1.0, 0); gl.position.set(0, 0.4, 0); g.add(gl);
    return { g, lid, gl, kind: 'chest' };
  }
  function mkSpring() {
    const g = new THREE.Group(), b = new GB(), rnd = mulberry32(5);
    b.m('stone'); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, s = 0.12 + rnd() * 0.07; b.add(rockGeo[i % 3], M(Math.cos(a) * 0.46, s * 0.35, Math.sin(a) * 0.42, s * 1.2, s, s, 0, rnd() * 6, 0), '#5c6874', '#a4b0bc'); }
    g.add(b.mesh(matPlain, true, true));
    const w = new THREE.Mesh(K.cyl(1, 16), new THREE.MeshBasicMaterial({ color: LC('#8ffff0', 1.5), transparent: true, opacity: 0.8 })); w.scale.set(0.4, 0.05, 0.36); w.position.y = 0.05; g.add(w);
    const gl = K.glowSprite('#7fffe6', 2.2, 0.45); gl.position.y = 0.35; g.add(gl);
    const sparks = [0, 1, 2, 3].map(() => { const s = K.glowSprite('#d8fffa', 0.14, 0.9, 2.5); g.add(s); return s; });
    return { g, gl, sparks, kind: 'spring' };
  }
  // 可以查看 / 采摘的物件：发着微光的药草、一座旧坟、一块石碑、稻草人、奇花、崖刻
  const OBJS = /^(herb|tomb|stele|scarecrow|bloom|carving|glint)$/;
  function mkObj(kind, def) {
    const g = new THREE.Group(), b = new GB(); let gl = null;
    if (kind === 'glint') {   // 地上一处可以翻找的地方：一小堆松动的土，里头有东西在闪
      b.m('bark').s(0, 0.05, 0, 0.3, 0.1, 0.24, '#6a5236', '#8a6e4a').s(0.16, 0.04, 0.1, 0.14, 0.07, 0.12, '#5e4830', '#7a6040');
      b.m('stone').add(K.ico(0), M(-0.14, 0.06, 0.12, 0.06, 0.04, 0.05), '#8a8478');
      gl = K.glowSprite('#ffe8a0', 1.1, 0.5); gl.position.y = 0.25; g.add(gl);
      g.add(b.mesh(matPlain, true, true)); return { g, gl, kind: 'obj' };
    }
    if (kind === 'scarecrow') {   // 可以查看的稻草人（比田里的那些多一圈微光）
      outdoor('scarecrow', 'red', b, null, null, 0, 0, 1, mulberry32(3), noFx);
      gl = K.glowSprite('#ffe8a0', 1.5, 0.26); gl.position.y = 1.1; g.add(gl);
    } else if (kind === 'bloom') {   // 一株奇花：def.col 是花色
      const col = (def && def.col) || '#ff8ab8', hi = Art.mix(col, '#ffffff', 0.55);
      b.m('leaf');
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.3, r = 0.16 + (i % 2) * 0.06; b.stick([0, 0, 0], [Math.cos(a) * r, 0.2 + (i % 3) * 0.05, Math.sin(a) * r], 0.014, 0.006, '#2f7a3a', 4, '#7ac860'); b.add(K.ico(0), M(Math.cos(a) * r * 1.2, 0.2 + (i % 3) * 0.05, Math.sin(a) * r * 1.2, 0.09, 0.03, 0.06, 0, -a, 0), '#3a8a44', '#8ad070'); }
      b.stick([0, 0, 0], [0.02, 0.5, 0], 0.016, 0.012, '#3a7a3e', 5);
      b.m('silk'); for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; b.add(K.ico(0), M(0.02 + Math.cos(a) * 0.085, 0.53, Math.sin(a) * 0.085, 0.075, 0.04, 0.055, 0, -a, 0.5), col, hi); }
      b.add(K.ico(0), M(0.02, 0.57, 0, 0.07, 0.06, 0.07), hi, '#ffffff').add(K.ico(0), M(0.02, 0.62, 0, 0.03, 0.025, 0.03), '#f6d84a');
      gl = K.glowSprite(col, 1.4, 0.42); gl.position.y = 0.5; g.add(gl);
    } else if (kind === 'carving') {   // 崖刻：一方立着的大石，朝南的一面磨平了刻着字
      b.m('stone').add(rockGeo[1], M(0, 0.7, -0.05, 0.85, 1.25, 0.5, 0, 0.3, 0), '#565c56', '#a0a69c').add(rockGeo[0], M(-0.5, 0.25, 0.1, 0.4, 0.45, 0.35, 0, 1.2, 0), '#565c56', '#90968c');
      b.b(0, 0.95, 0.3, 0.62, 1.0, 0.08, '#7e847e', -0.08, 0, 0, '#a8aea6');
      b.m('gold'); for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) b.b(-0.12 + j * 0.24, 0.62 + i * 0.2, 0.335 - (0.62 + i * 0.2 - 0.95) * 0.08, 0.1, 0.11, 0.012, '#7a2a20', -0.08, 0, 0);
      gl = K.glowSprite('#ffe8a0', 1.6, 0.3); gl.position.y = 1.0; g.add(gl);
    } else if (kind === 'herb') {
      b.m('leaf'); for (let i = 0; i < 7; i++) { const a = i / 7 * TAU, r = 0.1 + (i % 3) * 0.04, h = 0.22 + (i % 2) * 0.12; b.stick([0, 0, 0], [Math.cos(a) * r, h, Math.sin(a) * r], 0.012, 0.006, '#3f8a4a', 4, '#9fe07a'); b.add(K.ico(0), M(Math.cos(a) * r, h + 0.02, Math.sin(a) * r, 0.05, 0.03, 0.05, 0, a, 0), i % 2 ? '#e8f8ff' : '#bfffd0'); }
      gl = K.glowSprite('#9fffb0', 1.3, 0.4); gl.position.y = 0.3; g.add(gl);
    } else if (kind === 'tomb') {
      b.m('stone').s(0, 0.12, -0.25, 0.7, 0.3, 0.55, '#6a665e', '#8a867c').b(0, 0.42, 0.18, 0.46, 0.84, 0.12, '#7a7870', 0, 0, 0, '#a09c92').b(0, 0.06, 0.2, 0.6, 0.12, 0.26, '#6a665e');
      b.m('leaf'); for (let i = 0; i < 5; i++) b.add(K.ico(0), M(-0.5 + i * 0.25, 0.06, 0.5 + (i % 2) * 0.1, 0.05, 0.04, 0.05), i % 2 ? '#fff0f4' : '#ffd0e0');
    } else {
      b.m('stone').b(0, 0.14, 0, 0.9, 0.28, 0.5, '#6e6a64', 0, 0, 0, '#8a867e').b(0, 1.15, 0, 0.7, 1.8, 0.2, '#858a90', 0, 0, 0, '#a8adb2').b(0, 2.1, 0, 0.8, 0.14, 0.26, '#6e7278');
      b.m('gold'); for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) b.b(-0.2 + j * 0.2, 0.5 + i * 0.24, 0.105, 0.09, 0.12, 0.01, '#3a3e44');
      gl = K.glowSprite('#ffe8a0', 1.6, 0.3); gl.position.y = 1.2; g.add(gl);
    }
    g.add(b.mesh(matPlain, true, true));
    return { g, gl, kind: 'obj' };
  }
  function mkStall(col, kind, look) {
    const g = new THREE.Group(), b = new GB(), wood = '#7a5030', wd = '#4e3220';
    b.m('wood').b(0, 0.28, 0.32, 1.8, 0.56, 0.5, wd, 0, 0, 0, wood); b.b(0, 0.58, 0.32, 1.92, 0.05, 0.6, '#9a6a40');
    for (const s of [-1, 1]) for (const q of [-0.42, 0.52]) b.stick([s * 0.9, 0, q], [s * 0.9, q > 0 ? 1.52 : 1.86, q], 0.04, 0.04, wd, 6);
    b.m('cloth').surf(18, 4, (u, v, o) => { o[0] = (u - 0.5) * 2.1; o[2] = lerp(-0.56, 0.7, v); o[1] = lerp(1.9, 1.5, v) - 0.05 * Math.sin(u * PI) * Math.sin(v * PI) + 0.02 * Math.sin(u * 40); },
      (u, v, p, o) => { const c = lin(Math.floor(u * 9) % 2 ? '#f0e4cc' : col), k = 0.8 + 0.2 * v; o[0] = c[0] * k; o[1] = c[1] * k; o[2] = c[2] * k; }, { two: true });
    b.b(0, 1.42, 0.71, 2.1, 0.16, 0.02, Art.shade(col, -0.2));
    if (kind === 'smith') {
      b.m('metal'); for (let i = 0; i < 3; i++) { b.b(-0.6 + i * 0.26, 0.62, 0.34, 0.045, 0.014, 0.46, '#cfd8e4', 0, 0.2 - i * 0.2, 0); b.m('gold').b(-0.6 + i * 0.26, 0.62, 0.55, 0.09, 0.03, 0.03, gold, 0, 0.2 - i * 0.2, 0); b.m('metal'); }
      b.s(0.35, 0.66, 0.3, 0.12, 0.1, 0.12, '#8a9098', '#c8ced6'); b.b(0.68, 0.67, 0.34, 0.22, 0.13, 0.15, '#2e282e');
    } else {
      const cols = ['#b84444', '#447eb0', '#c89a38', '#6aa860', '#8a60b4'];
      for (let i = 0; i < 5; i++) { b.m(0.25, 0, 0.1, 0.1).c(-0.66 + i * 0.3, 0.69, 0.3, 0.07, 0.16, cols[i], 0.7, 10); b.m('wood').c(-0.66 + i * 0.3, 0.78, 0.3, 0.035, 0.04, '#b89868', 1, 6); }
      b.m('leaf').s(0.7, 0.66, 0.42, 0.1, 0.07, 0.08, '#4a8a3e', '#86bc62');
    }
    g.add(b.mesh(matPlain, true, true));
    const ch = K.mkChar(look, false, false); ch.g.position.set(0, 0, -0.18); g.add(ch.g);
    return { g, ch, kind: 'stall' };
  }

  /* ---------- 液面：水与冰走 PBR（反射天空、太阳高光），熔岩与虚空自发光 ---------- */
  function liquidMat(kind, th) {
    const wp = sh => { sh.uniforms.tNoise = U.tNoise; sh.uniforms.uTime = U.uTime; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLW;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLW = (modelMatrix * vec4(position, 1.0)).xyz;'); };
    if (kind === 'cloud') {   // 云海：悬崖外、深涧里翻涌的云。不反光，自己就是亮的，一团团慢慢地流
      const m = new THREE.MeshBasicMaterial({ color: 0xffffff });
      m.onBeforeCompile = sh => {
        wp(sh);
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vLW;\nuniform sampler2D tNoise;\nuniform float uTime;')
          .replace('#include <map_fragment>', 'vec2 lq = vLW.xz; float ln = texture2D(tNoise, lq * 0.07 + uTime * vec2(0.006, 0.003)).g * 0.55 + texture2D(tNoise, lq * 0.19 - uTime * vec2(0.004, 0.007)).g * 0.3 + texture2D(tNoise, lq * 0.53 + uTime * vec2(0.003, 0.002)).r * 0.15;\n' +
            'diffuseColor.rgb = mix(vec3(0.15, 0.21, 0.3), vec3(0.5, 0.58, 0.68), smoothstep(0.28, 0.74, ln));');   // 这一层是深处的云气，颜色压暗发青；上面另有一朵朵白云（见 cloudsBuild），有深有浅才看得出高下
      };
      m.customProgramCacheKey = () => 'g3liqcloud';
      return m;
    }
    if (kind === 'lava' || kind === 'void') {
      const m = new THREE.MeshBasicMaterial({ color: 0xffffff });
      m.onBeforeCompile = sh => {
        wp(sh);
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vLW;\nuniform sampler2D tNoise;\nuniform float uTime;')
          .replace('#include <map_fragment>', 'vec2 lq = vLW.xz; float ln = texture2D(tNoise, lq * 0.11 + uTime * vec2(0.008, 0.005)).g * 0.6 + texture2D(tNoise, lq * 0.29 - uTime * vec2(0.006, 0.011)).g * 0.4;\n' +
            (kind === 'lava' ? 'float cr = smoothstep(0.4, 0.6, ln); vec3 hot = mix(vec3(1.9, 0.78, 0.13), vec3(1.05, 0.2, 0.02), smoothstep(0.1, 0.42, ln));\ndiffuseColor.rgb = mix(hot, vec3(0.05, 0.018, 0.012), cr) * (0.9 + 0.1 * sin(uTime * 2.0 + lq.x));'
              : 'float st = pow(texture2D(tNoise, lq * 1.3 + uTime * vec2(0.004, -0.007)).r, 14.0) * 9.0;\ndiffuseColor.rgb = mix(vec3(0.012, 0.004, 0.04), vec3(0.7, 0.2, 1.9), pow(ln, 3.0)) + vec3(1.2, 0.9, 2.0) * st;'));
      };
      m.customProgramCacheKey = () => 'g3liq' + kind;
      return m;
    }
    const ice = kind === 'ice';
    const m = new THREE.MeshStandardMaterial({ color: LC(ice ? '#bcd8ee' : Art.mix(th.water, '#06242c', 0.62)), roughness: ice ? 0.16 : 0.06, metalness: 0, transparent: true, opacity: ice ? 0.9 : 0.86, envMapIntensity: 1.6 });
    m.onBeforeCompile = sh => {
      wp(sh);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vLW;\nuniform sampler2D tNoise;\nuniform float uTime;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + (ice ? '' : 'totalEmissiveRadiance += vec3(0.75, 0.95, 1.0) * smoothstep(0.66, 0.9, wA.g * 0.55 + wB.b * 0.45) * 0.13;'))
        .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nvec3 wA = vec3(0.0); vec3 wB = vec3(0.0);\n' +
          (ice ? '{ vec3 a = texture2D(tNoise, vLW.xz * 0.21).rgb; vec3 wn = normalize(vec3((a.g - 0.5) * 0.3, 1.0, (a.b - 0.5) * 0.3)); normal = normalize((viewMatrix * vec4(wn, 0.0)).xyz); diffuseColor.rgb *= 0.8 + 0.5 * a.g; }'
            : '{ wA = texture2D(tNoise, vLW.xz * 0.19 + uTime * vec2(0.021, 0.013)).rgb; wB = texture2D(tNoise, vLW.xz * 0.47 - uTime * vec2(0.017, 0.026)).rgb;\n vec3 wn = normalize(vec3((wA.g - 0.5) * 0.7 + (wB.r - 0.5) * 0.3, 1.0, (wA.b - 0.5) * 0.7 + (wB.g - 0.5) * 0.3)); normal = normalize((viewMatrix * vec4(wn, 0.0)).xyz); }'));
    };
    m.customProgramCacheKey = () => 'g3liq' + kind;
    return m;
  }

  /* ---------- 天空穹顶与远山 ---------- */
  function skyDome(theme) {
    const SC = Art.SCN[theme], L = LIT[theme], hor = Art.mix(SC.sky[2], L.fog, 0.5);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { cT: { value: LC(SC.sky[0], 1.0) }, cM: { value: LC(SC.sky[1], 1.05) }, cH: { value: LC(hor, 1.1) }, cC: { value: LC(SC.mist, 1.25) }, cS: { value: LC(L.sun[0], 1) }, uD: { value: new THREE.Vector3(L.dir[0], L.dir[1], L.dir[2]).normalize() }, uCov: { value: L.cov }, uTime: U.uTime, tNoise: U.tNoise },
      vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: '#include <common>\nuniform vec3 cT; uniform vec3 cM; uniform vec3 cH; uniform vec3 cC; uniform vec3 cS; uniform vec3 uD; uniform float uCov; uniform float uTime; uniform sampler2D tNoise; varying vec3 vD;\n' +
        'void main(){ vec3 d = normalize(vD); float h = max(d.y, 0.0);\n vec3 c = mix(cH, cM, smoothstep(0.0, 0.2, h)); c = mix(c, cT, smoothstep(0.14, 0.75, h));\n' +
        ' float s = max(dot(d, uD), 0.0); c += cS * (pow(s, 6.0) * 0.12 + pow(s, 700.0) * 24.0);\n' +
        ' vec2 q = d.xz / (h + 0.14) * 0.085 + uTime * vec2(0.0022, 0.0006);\n float n = texture2D(tNoise, q).g * 0.58 + texture2D(tNoise, q * 2.7 + 0.31).g * 0.3 + texture2D(tNoise, q * 6.9).g * 0.12;\n' +
        ' float cl = smoothstep(uCov, uCov + 0.22, n) * smoothstep(0.015, 0.16, d.y);\n vec3 cc = cC * mix(0.62, 1.12, smoothstep(uCov + 0.02, uCov + 0.34, n)) + cS * 0.12;\n' +
        ' c = mix(c, cc, cl * 0.92);\n gl_FragColor = vec4(c, 1.0);\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n}'
    });
    const me = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), mat); me.frustumCulled = false; me.renderOrder = -10;
    return me;
  }
  const hash2 = (x, y) => { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); };
  const vnoise = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy); return lerp(lerp(hash2(xi, yi), hash2(xi + 1, yi), sx), lerp(hash2(xi, yi + 1), hash2(xi + 1, yi + 1), sx), sy); };
  const fbm = (x, y) => vnoise(x, y) * 0.5 + vnoise(x * 2.1 + 5.2, y * 2.1 + 1.3) * 0.27 + vnoise(x * 4.3 + 1.7, y * 4.3 + 9.1) * 0.15 + vnoise(x * 8.7, y * 8.7 + 3.3) * 0.08;
  function ridge(mt, seed, d0, d1, hMax, lo, mid, hi, cap, nu) {
    const cL = lin(lo), cM = lin(mid), cH = lin(hi), cC = lin(cap);
    mt.surf(nu, 9, (u, v, o) => {
      const a = PI * (0.9 + 1.2 * u), d = lerp(d0, d1, v), n = fbm(u * 9 + seed, v * 1.6 + seed * 0.7), rg = 1 - Math.abs(fbm(u * 21 + seed * 3, v * 3 + 2) * 2 - 1);
      o[0] = Math.cos(a) * d * 1.35; o[2] = Math.sin(a) * d - 8; o[1] = hMax * Math.pow(Math.sin(PI * v), 0.75) * (0.2 + 0.95 * n * n * 1.6) * (0.75 + 0.35 * rg) - 0.8;
    }, (u, v, p, o) => {
      const k = clamp(p[1] / hMax, 0, 1.2), n = fbm(u * 40 + seed, v * 9), a = sst(0.12, 0.5, k + (n - 0.5) * 0.25), b = sst(0.62, 0.86, k + (n - 0.5) * 0.3), sh = 0.72 + 0.5 * n;
      o[0] = lerp(lerp(cL[0], cM[0], a), cC[0], b) * lerp(sh, 1, b) + cH[0] * 0.0; o[1] = lerp(lerp(cL[1], cM[1], a), cC[1], b) * lerp(sh, 1, b); o[2] = lerp(lerp(cL[2], cM[2], a), cC[2], b) * lerp(sh, 1, b);
    }, { two: true });
  }
  function grassTuft(Gr, x, z, rnd, c0, c1, n, hgt) {
    const a0 = rnd() * PI, h = hgt * (0.7 + rnd() * 0.6), w = h * (1.0 + rnd() * 0.5), q = rnd(), k = 0.8 + rnd() * 0.35;
    const r1 = lerp(c0[0], c1[0], q) * k, g1 = lerp(c0[1], c1[1], q) * k, b1 = lerp(c0[2], c1[2], q) * k;
    for (let j = 0; j < n; j++) { const a = a0 + j * PI / n + (rnd() - 0.5) * 0.4; card(Gr, x, h / 2, z, 0, h / 2, 0, Math.cos(a) * w / 2, 0, Math.sin(a) * w / 2, 0, 1, 0, r1, g1, b1, 3, 0.7); }
  }

  /* ---------- 山：图内的山（GR.HILL）和图外四周的群山共用一张高度场 ----------
     每个山格的高度看它离最近的平地有多远；山在平地北面时坡陡，在南面时坡缓（免得挡住俯视的镜头）。出口正对的地方留一道山口。 */
  const RIMH = { mountain: 9, town: 4, bamboo: 6, fire: 9, snow: 12, abyss: 7 }, EXT = 14;
  const noFx = { pool() { }, glow() { }, fire() { } };
  // 把一件景物摆在离地 y 高的地方（山坡上的树）
  function propAt(name, c, x, y, z, sc, rnd, lod) {
    const a = c.L.P.length, b = c.F.P.length, g = c.Gl.P.length;
    prop(name, c.L, c.F, c.Gl, x, z, sc, rnd, noFx, lod);
    for (let i = a + 1; i < c.L.P.length; i += 3) c.L.P[i] += y;
    for (let i = b + 1; i < c.F.P.length; i += 3) c.F.P[i] += y;
    for (let i = g + 1; i < c.Gl.P.length; i += 3) c.Gl.P[i] += y;
  }
  function* terrain(m, chunk, rnd) {   // 分段执行（每个 yield 可以让出一帧），供后台预建场景用
    const d = m.d, th = m.th, bt = baseOf(d.theme), E = EXT, W = m.w + E * 2, H = m.h + E * 2, sd = d.seed || 7;
    const rimH = d.rimH != null ? d.rimH : RIMH[bt], inH = d.hillH || (bt === 'town' ? 3.4 : 6), sides = d.rim || {};
    const D = new Float32Array(W * H), open = new Uint8Array(W * H);   // open：图外不起山的地方（1 山口，2 水面）
    for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
      const x = tx - E, y = ty - E, i = ty * W + tx;
      if (m.inb(x, y)) D[i] = m.g[m.I(x, y)] === GR.HILL ? 1e3 : 0;
      else { const s = y < 0 ? 'n' : y >= m.h ? 's' : x < 0 ? 'w' : 'e'; if (sides[s]) open[i] = 2; D[i] = rimH > 0 && !sides[s] ? 1e3 : 0; }
    }
    for (const e of d.exits || []) {
      const ew = e.w || 1, eh = e.h || 1, dx = e.x === 0 ? -1 : e.x + ew >= m.w ? 1 : 0, dy = dx ? 0 : e.y === 0 ? -1 : e.y + eh >= m.h ? 1 : 0;
      if (!dx && !dy) continue;
      for (let k = 1; k <= E; k++) for (let j = -1; j <= (dx ? eh : ew); j++) {
        const x = dx ? (dx < 0 ? -k : m.w - 1 + k) : e.x + j, y = dy ? (dy < 0 ? -k : m.h - 1 + k) : e.y + j;
        if (x + E < 0 || x + E >= W || y + E < 0 || y + E >= H) continue;
        const i = (y + E) * W + x + E; D[i] = 0; if (!open[i]) open[i] = 1;
      }
    }
    // 到最近平地的距离（两遍扫描）
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; let v = D[i]; if (!v) continue;
      if (x > 0) v = Math.min(v, D[i - 1] + 1);
      if (y > 0) { v = Math.min(v, D[i - W] + 1); if (x > 0) v = Math.min(v, D[i - W - 1] + 1.414); if (x < W - 1) v = Math.min(v, D[i - W + 1] + 1.414); }
      D[i] = v;
    }
    let any = false;
    for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
      const i = y * W + x; let v = D[i]; if (!v) continue;
      if (x < W - 1) v = Math.min(v, D[i + 1] + 1);
      if (y < H - 1) { v = Math.min(v, D[i + W] + 1); if (x < W - 1) v = Math.min(v, D[i + W + 1] + 1.414); if (x > 0) v = Math.min(v, D[i + W - 1] + 1.414); }
      D[i] = v; any = true;
    }
    if (!any) return { hAt: () => 0, open, W, E };
    /* 整张图都是山的地图（d.massif）：山再高，也不许挡住走在山路上的人。镜头在南边往下看（俯角约 49°），一处山石只要比“它到正北最近那块可走之地的距离”矮，
       就挡不到那块地上的人。SC[格] 就是这个距离（左右各看两列取最小；正北没有可走之地的是 99，不设限），山体的高度、石峰的峰顶都照它封顶。
       结果是：每条山路北面是高崖，南面是一级级低下去的缓坡；背后没有路的地方，山想多高就多高。 */
    let SC = null;
    if (d.massif) {
      const dn = new Float32Array(W * H).fill(99); SC = new Float32Array(W * H).fill(99);
      for (let tx = 0; tx < W; tx++) { let last = -99; for (let ty = 0; ty < H; ty++) { const x = tx - E, y = ty - E; if (m.inb(x, y)) { const gv = m.g[m.I(x, y)]; if (gv !== GR.HILL && gv !== GR.WATER) last = ty; } if (last > -99) dn[ty * W + tx] = ty - last; } }
      for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) { let v = 99; for (let k = -2; k <= 2; k++) { const X = tx + k; if (X >= 0 && X < W) v = Math.min(v, dn[ty * W + X] + Math.abs(k) * 0.25); } SC[ty * W + tx] = v; }
    }
    const bil = (A, w, h, fx, fy) => { fx = clamp(fx, 0, w - 1.001); fy = clamp(fy, 0, h - 1.001); const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0, i = y0 * w + x0; return lerp(lerp(A[i], A[i + 1], tx), lerp(A[i + w], A[i + w + 1], tx), ty); };
    const hf = (x, z) => {
      const fx = x + E - 0.5, fy = z + E - 0.5, dd = bil(D, W, H, fx, fy) - 0.55; if (dd <= 0) return 0;
      const out = Math.max(-x, -z, x - m.w, z - m.h, 0), cap = lerp(inH, rimH, sst(0, 5, out));
      const gz = bil(D, W, H, fx, fy + 0.6) - bil(D, W, H, fx, fy - 0.6), s = lerp(1.7, 3.4, clamp(-gz, 0, 1));
      const n = fbm(x * 0.21 + sd, z * 0.21 + sd * 0.37), rg = 1 - Math.abs(fbm(x * 0.47 + sd * 1.7, z * 0.47 + 3.1) * 2 - 1), cr = fbm(x * 1.3 + 9, z * 1.3 + sd);
      let h = cap * (1 - Math.exp(-s * dd / cap)) * (0.55 + 0.5 * n + 0.5 * rg * rg * sst(0.4, 2.5, dd));   // rg：山脊（越靠近脊线越高，脊线是尖的）
      if (out > 3) h *= 0.75 + 0.75 * fbm(x * 0.07 + sd, z * 0.07 + 1.3);   // 远处的峰高低错落
      // 岩层：把高度压成一级一级的台阶，台阶之间是近乎直立的岩壁；再加一层细碎的起伏
      const st = 0.85, tq = Math.floor(h / st) * st, tr = tq + st * sst(0.5, 0.95, (h - tq) / st);
      h = lerp(h, tr, 0.75 * sst(0.3, 1.3, dd)) + (cr - 0.5) * 0.7 * sst(0.3, 1.5, dd);
      if (SC) h = Math.min(h, topAt(x, z));   // 不挡山路上的人（见上面 SC 的说明）
      return Math.max(0, h);
    };
    // 这一点上的山石最高能到多高（没有限制时是个很大的数）
    const topAt = (x, z) => { const tx = clamp(Math.floor(x + E), 0, W - 1), ty = clamp(Math.floor(z + E), 0, H - 1), v = SC[ty * W + tx]; return v > 90 ? 999 : Math.max(0, 0.93 * (v - 0.5 + (z + E - ty)) - 0.1); };
    const VW = W * 2 + 1, VH = H * 2 + 1, Hv = new Float32Array(VW * VH);
    for (let j = 0; j < VH; j++) { for (let i = 0; i < VW; i++) Hv[j * VW + i] = hf(i / 2 - E, j / 2 - E); if (j % 12 === 11) yield; }
    const hAt = (x, z) => bil(Hv, VW, VH, (x + E) * 2, (z + E) * 2);
    // 颜色：缓坡长草，陡处露岩，高处（雪山、云上的峰）积雪；山脚并入地面的颜色
    const RK = { mountain: ['#565c54', '#979c8e'], town: ['#665a48', '#a4967a'], bamboo: ['#46544a', '#80907e'], fire: ['#281a1a', '#5c3e36'], snow: ['#526280', '#93a4c0'], abyss: ['#20183a', '#4a3a78'] }[bt];
    const tone = d.theme === bt ? 0 : 0.3, cF = lin(Art.shade(th.base[0], -0.3)), cG = lin(Art.shade(th.blot[1], -0.22)), cR = lin(Art.mix(RK[0], Art.shade(th.stone, -0.5), tone)), cR2 = lin(Art.mix(RK[1], Art.shade(th.stone, -0.2), tone));
    const capAt = bt === 'snow' ? 0.2 : d.theme === 'mountain' || d.theme === 'mist' ? 0.72 : 9, cC = lin('#f2f6fa');
    // 每个三角面单独上色、单独取法线：岩石是一块一块有棱有角的，不能像土坡那样圆滑。
    // 朝上的面颜色浅（低处长点苔草，雪山和高峰上积雪），立面颜色深、带一层层的岩纹；山脚并入地面的颜色
    const lush = bt === 'mountain' || bt === 'bamboo', snowy = bt === 'snow';
    const face = (x, z, h, ny, o) => {
      const n = fbm(x * 0.9 + 3, z * 0.9 + 7), f = hash2(x * 7.31 + h, z * 9.17 - h), up = clamp((ny - 0.4) / 0.5, 0, 1);
      const band = 0.84 + 0.24 * Math.sin(h * 6.5 + n * 4), k = (d.massif ? 0.93 + 0.12 * f : 0.86 + 0.26 * f) * lerp(band, 1.04, up);
      // 整张图都是山的地图：朝上的缓面不论多高都东一块西一块长着薄草，立面再压暗一些——灰白一片的石头才分得出崖壁和山顶
      const gk = d.massif && h < rimH ? sst(0.74, 0.93, ny) * sst(0.42, 0.62, n) * 0.62 : lush ? sst(0.78, 0.95, ny) * sst(1.5, 0.3, h) * 0.75 : 0, kd = d.massif ? lerp(0.8, 1.05, up) : 1;
      const ck = snowy ? sst(0.5, 0.8, ny) * sst(0.25, 0.7, h) : capAt < 1 ? sst(0.5, 0.8, ny) * sst(capAt, capAt + 0.14, h / rimH + (n - 0.5) * 0.14) : 0, fk = sst(0.3, 0.03, h);
      for (let i = 0; i < 3; i++) { let c = lerp(cR[i], cR2[i], up * 0.75 + n * 0.25) * k * kd; c = lerp(c, cG[i], gk); c = lerp(c, cC[i], ck); o[i] = lerp(c, cF[i], fk); }
    };
    const jit = (x, z, q) => (fbm(x * 1.7 + q, z * 1.7 + sd + q * 2) - 0.5) * 0.55, col = [0, 0, 0];
    for (let cz = -E; cz < m.h + E; cz += 8) for (let cx = -E; cx < m.w + E; cx += 8) {
      yield;
      const x1 = Math.min(cx + 8, m.w + E), z1 = Math.min(cz + 8, m.h + E), nu = (x1 - cx) * 2, nv = (z1 - cz) * 2, Wd = nu + 1, P = new Float32Array(Wd * (nv + 1) * 4); let mx = 0;
      // 整张图都是山的地图：每个顶点另算一条顺着山势的平滑法线，和所在面的法线掺着用——山体是连成一片的岩坡，不是一块块反光各异的大三角面
      const SN = d.massif ? new Float32Array(Wd * (nv + 1) * 3) : null;
      for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
        const x = cx + i / 2, z = cz + j / 2, h = hAt(x, z), k = sst(0.05, 0.7, h), p = (j * Wd + i) * 4;   // 顶点横向错开一点，打破整齐的网格
        P[p] = x + jit(x, z, 11) * k; P[p + 1] = h - 0.07; P[p + 2] = z + jit(x, z, 5) * k; P[p + 3] = h; if (h > mx) mx = h;
        if (SN) { const gx = (hAt(x + 0.3, z) - hAt(x - 0.3, z)) / 0.6, gz = (hAt(x, z + 0.3) - hAt(x, z - 0.3)) / 0.6, l = Math.hypot(gx, 1, gz), q = (j * Wd + i) * 3; SN[q] = -gx / l; SN[q + 1] = 1 / l; SN[q + 2] = -gz / l; }
      }
      if (mx < 0.04) continue;
      const L = chunk(cx + 4, cz + 4).L.m(0.96, 0, 1, 0.03);
      const vtx = (a, nx, ny, nz) => {
        if (SN) { const q = a / 4 * 3; nx = nx * 0.38 + SN[q] * 0.62; ny = ny * 0.38 + SN[q + 1] * 0.62; nz = nz * 0.38 + SN[q + 2] * 0.62; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l; }
        L.v(P[a], P[a + 1], P[a + 2], nx, ny, nz, col[0], col[1], col[2]);
      };
      const tri = (a, b, c) => {
        if (P[a + 3] + P[b + 3] + P[c + 3] < 0.02) return;
        const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
        face((P[a] + P[b] + P[c]) / 3, (P[a + 2] + P[b + 2] + P[c + 2]) / 3, (P[a + 3] + P[b + 3] + P[c + 3]) / 3, ny, col);
        vtx(a, nx, ny, nz); vtx(b, nx, ny, nz); vtx(c, nx, ny, nz);
      };
      for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
        const a = (j * Wd + i) * 4, b = a + 4, c = a + Wd * 4, e = c + 4;
        if ((i + j) % 2) { tri(a, c, b); tri(b, c, e); } else { tri(a, c, e); tri(a, e, b); }
      }
    }
    // 山上的岩峰（一块块立着的大石，山就是由它们堆成的）和山脚的树（图外近处密，远处疏）
    const trees = (d.trees || th.trees).filter(s => !/crys|lantern|brazier/.test(s)), rkA = Art.mix(RK[0], Art.shade(th.stone, -0.5), tone), rkB = Art.mix(RK[1], Art.shade(th.stone, -0.2), tone);
    // 图外的树石只摆在镜头看得到的范围里：俯视的镜头往北能看出去好几格（高的东西更远也露头），东、西、南三面只露出两三格
    for (let y = -9; y < m.h + 4; y++) for (let x = -7; x < m.w + 7; x++) {
      if (x === -7) yield;
      const inside = m.inb(x, y); if (inside && m.g[m.I(x, y)] !== GR.HILL) continue;
      if (!inside && open[(y + E) * W + x + E]) continue;
      const out = Math.max(-x, -y, x - m.w + 1, y - m.h + 1, 0), north = y < 0 && -y >= Math.max(-x, x - m.w + 1), h = hAt(x + 0.5, y + 0.5), c = chunk(x, y);
      if (d.massif && inside) {
        /* 整张图都是山的地图：山身上立的不是一堆圆滚滚的大石，而是一根根上细下粗、带竖棱的石峰（越往山里越高越粗），峰脚散着碎岩，偶尔有一棵松长在峰顶。
           平地南面的（最近的平地在它北边）一律压矮：峰顶不许高过镜头的视线（往南每远一格最多高一格），否则会挡住走在山路上的人。 */
        const d0 = D[(y + E) * W + x + E];
        if (h > 0.25 && rnd() < 0.2 + 0.3 * sst(1.5, 5, d0)) {
          // 一座主峰，旁边靠着一两座矮些的副峰（峰丛）；每一座的峰顶都不许高过 topAt
          const mx0 = x + rnd(), mz0 = y + rnd(), R0 = 0.85 + rnd() * 0.6 + 0.14 * Math.min(d0, 5), H0 = R0 * (1.0 + rnd() * 1.1), cB = Art.shade(rkA, 0.04), cT = Art.mix(rkB, '#e2ddcc', 0.38);
          for (let q = 0, nq = 1 + Math.floor(rnd() * 2.6); q < nq; q++) {
            const a = rnd() * TAU, off = q ? R0 * (0.55 + rnd() * 0.35) : 0, px = mx0 + Math.cos(a) * off, pz = mz0 + Math.sin(a) * off, py = hAt(px, pz);
            let rs = q ? R0 * (0.5 + rnd() * 0.3) : R0, hh = Math.min(q ? H0 * (0.45 + rnd() * 0.35) : H0, topAt(px, pz + rs * 0.4) - py);
            if (hh < 0.3) continue;
            rs = Math.min(rs, 0.35 + hh * 0.5);
            c.L.m(0.96, 0, 1, 0.03).add(spireGeo[Math.floor(rnd() * spireGeo.length)], M(px, py - 0.3, pz, rs, hh + 0.3, rs, (rnd() - 0.5) * 0.14, rnd() * TAU, (rnd() - 0.5) * 0.14), cB, cT);
            if (!q && hh > 1.8 && rnd() < 0.13 && py + hh + 1.3 < topAt(px, pz)) propAt(rnd() < 0.6 ? 'pineS' : 'treeD', c, px, py + hh - 0.4, pz, 0.45 + rnd() * 0.25, rnd, true);
          }
        }
        if (h > 0.15 && rnd() < 0.3) { const px = x + rnd(), pz = y + rnd(), s = 0.16 + rnd() * 0.24; c.L.m(0.96, 0, 1, 0.03).add(cragGeo[Math.floor(rnd() * 3)], M(px, hAt(px, pz) - 0.2 * s, pz, s * (0.9 + rnd() * 0.6), s * (0.7 + rnd() * 0.5), s * (0.9 + rnd() * 0.6), 0, rnd() * TAU, 0), Art.shade(rkA, -0.1), Art.shade(rkB, 0.04)); }
      } else for (let k = 0, nk = h < 0.15 ? 0 : inside ? 2 : out <= (north ? 7 : 5) ? 1 : 0; k < nk; k++) {
        if (rnd() > (inside ? 0.5 : 0.4)) continue;
        const px = x + rnd(), pz = y + rnd(), py = hAt(px, pz); const s = 0.35 + rnd() * rnd() * 0.85, tall = 0.9 + rnd() * 1.3;
        c.L.m(0.96, 0, 1, 0.03).add(cragGeo[Math.floor(rnd() * 3)], M(px, py - 0.25 * s, pz, s * (0.8 + rnd() * 0.5), s * tall, s * (0.8 + rnd() * 0.5), (rnd() - 0.5) * 0.3, rnd() * TAU, (rnd() - 0.5) * 0.3), Art.shade(rkA, snowy ? -0.25 : -0.1), snowy ? Art.mix(rkB, '#ffffff', 0.35) : Art.shade(rkB, 0.06));
      }
      const px = x + 0.2 + rnd() * 0.6, pz = y + 0.2 + rnd() * 0.6, py = Math.max(0, hAt(px, pz) - 0.1);
      if (h > (inside ? 0.9 : rimH * 0.45) || rnd() > (inside ? 0.35 : north ? (out <= 4 ? 0.55 : 0.3) : out <= 2 ? 0.5 : out <= 4 ? 0.22 : 0.14)) continue;   // 图内的山只在山脚长树，山身露着岩石
      if (SC && py + 3.2 > topAt(px, pz)) continue;   // 整张图都是山的地图：山路南侧近处不种树（树比石头高，照样挡人）
      propAt(trees[Math.floor(rnd() * trees.length)], c, px, py, pz, 0.9 + rnd() * 0.5, rnd, true);
    }
    return { hAt, open, W, E };
  }
  // 岩峰：棱角分明的多面体，上尖下宽，每个面一个法线
  const cragGeo = [0, 1, 2].map(i => {
    const g = new THREE.IcosahedronGeometry(1, 1), p = g.attributes.position;
    for (let j = 0; j < p.count; j++) {
      let x = Math.round(p.getX(j) * 1000) / 1000, y = Math.round(p.getY(j) * 1000) / 1000, z = Math.round(p.getZ(j) * 1000) / 1000;
      const k = 0.72 + 0.56 * hash2(x * 3.1 + i * 7.7 + z * 1.3, y * 5.3 + z * 2.9 + i), tp = 1 - 0.45 * Math.max(0, y);
      x *= k * tp; z *= k * tp; y = Math.max(-0.35, y * (0.85 + 0.3 * k)) + 0.35;
      p.setXYZ(j, x, y, z);
    }
    g.computeVertexNormals(); g._keep = true; return g;
  });
  // 石峰：一根上细下粗的多棱石柱，各条棱粗细不一（从上到下是连贯的竖棱），顶上削成歪尖；每个面一个法线，面上自带明暗——下暗上亮、隔一段一道深色的岩层
  // 做法同上面的岩石（细分球体 + 起伏 + 切面、法线按位置合并求平滑），只是先把球拉成一根底粗顶尖的柱子：
  // 竖棱只随方位变（从上到下连贯），岩层只随高度变（一圈一圈的横纹），再用几个近乎直立的切面削出平整的崖面；高度 0~1，底面半径约 0.5
  const spireGeo = [0, 1, 2, 3].map(i => {
    const g = new THREE.IcosahedronGeometry(1, 2), p = g.attributes.position, n = p.count, sh = new Float32Array(n), rnd = mulberry32(911 + i * 37), cuts = [], fl = i === 3 ? 0.66 : 1, ph = rnd() * TAU, lx = (rnd() - 0.5) * 0.24, lz = (rnd() - 0.5) * 0.24;
    for (let j = 0; j < 7; j++) { const a = rnd() * TAU; cuts.push([Math.cos(a) * 0.95, 0.3 * (rnd() - 0.2), Math.sin(a) * 0.95, 0.2 + rnd() * 0.22, 0.35]); }   // 近乎直立的切面：削出崖面
    for (let j = 0; j < 3; j++) { const a = rnd() * TAU, s = 0.55 + rnd() * 0.25, cy = Math.sqrt(1 - s * s); cuts.push([Math.cos(a) * s, cy, Math.sin(a) * s, 0.08 + rnd() * 0.1, 0.82 + rnd() * 0.1]); }   // 斜着削顶：峰顶是崩断的斜面，不是一个圆尖
    for (let j = 0; j < n; j++) {
      const x = Math.round(p.getX(j) * 1000) / 1000, y = Math.round(p.getY(j) * 1000) / 1000, z = Math.round(p.getZ(j) * 1000) / 1000;
      const t = (y + 1) / 2, a = Math.atan2(z, x), rad = Math.hypot(x, z);
      const rib = 1 + 0.26 * Math.sin(a * 3 + ph) + 0.16 * Math.sin(a * 5 + ph * 2.3 + t * 2) + 0.08 * Math.sin(a * 11 + ph), ledge = 1 + 0.1 * Math.sin(t * 15 + Math.sin(a * 2 + ph) * 1.6) + 0.05 * Math.sin(t * 37 + a), nz = 1 + 0.14 * Math.sin(5.1 * x + 3.3 * y + i) * Math.cos(4.3 * z - 2.9 * y);
      const R = 0.5 * lerp(1, 0.42, Math.pow(t, 1.5)) * rib * ledge * nz * Math.min(1, rad * 2.6);
      let X = Math.cos(a) * R + lx * t * t, Y = t, Z = Math.sin(a) * R * fl + lz * t * t;
      for (const c of cuts) { const dd = X * c[0] + (Y - c[4]) * c[1] + Z * c[2] - c[3]; if (dd > 0) { X -= c[0] * dd; Y -= c[1] * dd; Z -= c[2] * dd; } }
      p.setXYZ(j, X, clamp(Y, 0, 1.02), Z); sh[j] = (0.62 + 0.4 * t) * (0.74 + 0.6 * clamp(rib * ledge - 0.78, 0, 0.5));
    }
    g.computeVertexNormals();
    // 法线：按位置合并出的平滑法线和各面自己的法线各占一半——既不是一粒粒的小平面，也不是磨圆了的卵石
    const N = g.attributes.normal, acc = {}, key = j => p.getX(j).toFixed(3) + p.getY(j).toFixed(3) + p.getZ(j).toFixed(3);
    for (let j = 0; j < n; j++) { const q = acc[key(j)] || (acc[key(j)] = [0, 0, 0]); q[0] += N.getX(j); q[1] += N.getY(j); q[2] += N.getZ(j); }
    for (let j = 0; j < n; j++) { const q = acc[key(j)], l = Math.hypot(q[0], q[1], q[2]) || 1, fx = N.getX(j) * 0.5 + q[0] / l * 0.5, fy = N.getY(j) * 0.5 + q[1] / l * 0.5, fz = N.getZ(j) * 0.5 + q[2] / l * 0.5, l2 = Math.hypot(fx, fy, fz) || 1; N.setXYZ(j, fx / l2, fy / l2, fz / l2); }
    g.setAttribute('shade', new THREE.Float32BufferAttribute(sh, 1)); g._keep = true; return g;
  });
  /* ---------- 云（地图定义里写了 clouds: { sea, drift } 的才有，眼下只有摩云岭）----------
     sea：浮在云海上的一朵朵云，各走各的方向；飘到崖边、飘上陆地就慢慢散掉，再在云海别处重新聚起来。
     drift：从山间飘过的薄云，很淡；飘到会挡住主角的位置时自己让开（变透明）。
     每朵云是一张始终朝着镜头的贴图（贴图本身是十几团柔光叠成的），横竖比例、朝向各不相同。 */
  const cloudTex = K.canvasTex(256, 256, c => {
    const rnd = mulberry32(4242);
    for (let i = 0; i < 30; i++) {
      const a = rnd() * TAU, dd = rnd() * 48 * (i < 7 ? 0.35 : 1), x = 128 + Math.cos(a) * dd * 1.25, y = 136 + Math.sin(a) * dd * 0.55 - (i % 3) * 9, r = 26 + rnd() * 20, g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,.5)'); g.addColorStop(0.55, 'rgba(255,255,255,.2)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }, false);
  cloudTex._keep = true;
  function cloudsBuild(m, sc) {
    const o = m.d.clouds, rnd = mulberry32((m.d.seed || 7) * 7 + 11), wet = [], list = [], north = !!(m.d.rim && m.d.rim.n);
    for (let i = 0; i < m.w * m.h; i++) if (m.g[i] === GR.WATER) wet.push(i);
    const sea = (x, z) => (z < 0 ? north && z > -26 && x > -12 && x < m.w + 12 : m.inb(Math.floor(x), Math.floor(z)) && m.g[m.I(Math.floor(x), Math.floor(z))] === GR.WATER);
    const place = c => {
      if (c.sea) {
        if (north && (!wet.length || rnd() < 0.45)) { c.x = -8 + rnd() * (m.w + 16); c.z = -20 + rnd() * 22; }
        else { const i = wet[Math.floor(rnd() * wet.length)]; c.x = i % m.w + rnd(); c.z = Math.floor(i / m.w) + rnd(); }
        c.y = 0.35 + rnd() * 0.9; c.size = 2.2 + rnd() * 2.6; c.max = 0.75 + rnd() * 0.2; const a = rnd() * TAU, v = 0.12 + rnd() * 0.3; c.vx = Math.cos(a) * v + 0.12; c.vz = Math.sin(a) * v * 0.6;
      } else {
        c.x = -3 + rnd() * (m.w + 6); c.z = -3 + rnd() * (m.h + 6); c.y = 1.8 + rnd() * 1.6; c.size = 5 + rnd() * 4; c.max = 0.2 + rnd() * 0.12; const a = rnd() * TAU, v = 0.25 + rnd() * 0.4; c.vx = Math.cos(a) * v; c.vz = Math.sin(a) * v;
      }
      c.s.scale.set(c.size, c.size * (0.5 + rnd() * 0.2), 1); c.s.material.rotation = (rnd() - 0.5) * 0.5;
    };
    for (let i = 0, n = (o.sea || 0) + (o.drift || 0); i < n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, color: LC('#f2f5fa', 0.95), transparent: true, opacity: 0, depthWrite: false }));
      s.renderOrder = 2; sc.add(s);
      const c = { s, sea: i < (o.sea || 0), a: 0, ph: rnd() * 9 }; place(c); c.a = c.sea ? (sea(c.x, c.z) ? 1 : 0) : 1; list.push(c);
    }
    return { list, sea, place, w: m.w, h: m.h };
  }
  function cloudsAnim(cl, dt, px, pz) {
    for (const c of cl.list) {
      c.x += c.vx * dt; c.z += c.vz * dt; c.ph += dt;
      const inR = c.sea ? cl.sea(c.x, c.z) : c.x > -4 && c.x < cl.w + 4 && c.z > -4 && c.z < cl.h + 4; let k = inR ? 1 : 0;
      if (!c.sea) k *= sst(c.size * 0.4, c.size * 0.4 + 2.5, Math.hypot(c.x - px, (c.z - (pz + c.y / 1.14)) * 1.4));   // 薄云飘到主角和镜头之间时让开
      c.a += clamp(k - c.a, -dt * 0.45, dt * 0.3);
      if (!inR && c.a <= 0.002) { cl.place(c); c.a = 0; }
      c.s.position.set(c.x, c.y + Math.sin(c.ph * 0.4) * 0.08, c.z); c.s.material.opacity = c.a * c.max; c.s.visible = c.a > 0.004;
    }
  }
  // 小船：乌篷、撑篙，船头挂一盏灯
  function boat(L, Gl, x, z, yaw, fx) {
    const m4 = M(x, 0.03, z, 1, 1, 1, 0, yaw, 0), cs = Math.cos(yaw), sn = Math.sin(yaw), at = (lx, lz) => [x + lx * cs + lz * sn, z - lx * sn + lz * cs];
    L.m('wood').surf(12, 6, (u, v, o) => { const t = u * 2 - 1, wv = 0.3 * (1 - Math.pow(Math.abs(t), 2.6)) + 0.012, a = (v - 0.5) * PI; o[0] = t * 1.05; o[2] = Math.sin(a) * wv; o[1] = 0.2 - Math.cos(a) * 0.2 + 0.16 * t * t * t * t; }, ['#4a3020', '#7a5230'], { two: true, m: m4 });
    L.b(x, 0.16, z, 1.5, 0.03, 0.4, '#8a6238', 0, yaw, 0);
    L.m('cloth').surf(4, 8, (u, v, o) => { const a = v * PI; o[0] = (u - 0.5) * 0.8 - 0.1; o[1] = 0.14 + Math.sin(a) * 0.36; o[2] = Math.cos(a) * 0.27; }, ['#2e2a26', '#4a4038'], { two: true, m: m4 });
    const s0 = at(-0.9, 0.05), s1 = at(-0.55, 0.3), bw = at(0.82, 0);
    L.m('wood').stick([s0[0], 0.15, s0[1]], [s1[0], 1.5, s1[1]], 0.014, 0.012, '#6a4c2e', 5).stick([bw[0], 0.2, bw[1]], [bw[0], 0.82, bw[1]], 0.016, 0.014, '#4a3222', 5);
    hangLantern(L, Gl, fx, bw[0], 0.62, bw[1] + 0.06, false, 0.6); if (fx) fx.pool(bw[0], bw[1], 1.2, '#ff9a40', 0.25);
  }

  /* ================= 大地图 ================= */
  const world = G3.world = { sc: null, m: null, npc: new Map(), foe: new Map(), walk: new Map(), hero: null, cx: 0, cz: 0, fxo: null, exits: [], dyn: null, ring: null, zoom: 1, zoomT: 1, vw: 13, vn: 11, vs: 7.5 };
  const ZMAX = 2;   // 滚轮缩放的范围：0.36（贴近人物）～ 1（默认）～ 2（拉远，看到的范围宽一倍）
  try { const z = +localStorage.getItem('yunlan_zoom'); if (z >= 0.36 && z <= ZMAX) world.zoom = world.zoomT = z; } catch (e) { }
  world.zmax = ZMAX;
  // 测试用：这张图的景物影子大图（没开就是 null）
  world.bakeInfo = () => { const B = world.sc && world.sc.userData.bake; return B ? { w: B.w, h: B.h, ts: B.ts, t0: B.t0, sun: world.sc.userData.sun, quad: B.quad, map: B.bk.shadow.map } : null; };
  // 界面上“视野”按钮的五档：默认、默认与最远的正中、最远、默认与最近的正中、最近。不在档位上（用滚轮调过）时先回到默认
  const ZSTEPS = [[1, '默认'], [(1 + ZMAX) / 2, '较远'], [ZMAX, '最远'], [(1 + 0.36) / 2, '较近'], [0.36, '最近']];
  world.stepZoom = () => {
    const i = ZSTEPS.findIndex(s => Math.abs(s[0] - world.zoomT) < 0.005), s = ZSTEPS[i < 0 ? 0 : (i + 1) % ZSTEPS.length];
    world.setZoom(s[0]);
    return s[1] + (s[0] > (world.zcap || ZMAX) + 0.005 ? '（屋里最远只到看全整间屋子）' : '');
  };
  world.setZoom = z => { world.zoomT = clamp(z, 0.36, ZMAX); try { localStorage.setItem('yunlan_zoom', world.zoomT); } catch (e) { } };
  function killEnt(e) {
    if (e.ch) K.kill(e.ch);
    if (e.g) { if (e.g.parent) e.g.parent.remove(e.g); e.g.traverse(o => { if (o.isMesh && !o.geometry._keep) o.geometry.dispose(); if ((o.isSprite || o.isMesh) && o.material && !o.material._keep) o.material.dispose(); }); }
  }
  /* 换地图：最近去过的几张图的场景留着（按图名），再进去直接用，不必重建——从屋里出来回到街上、在两张图之间来回，都是瞬间的事。
     留着的只是静态的东西（地面、山、树、房屋、水、光效）；人物每次进图重新摆。超出份额的最久没去的那张图才真正释放。 */
  const SCENES = new Map(), SCENE_KEEP = 4;
  // 性能体检（?test=10 时才有 G3.prof）：记下各件“重活”每次花了多久
  const PT = () => (G3.prof ? G.realNow() : 0);
  const PF = (name, t0) => { const P = G3.prof; if (!P) return; const d = G.realNow() - t0, e = P.ev[name] || (P.ev[name] = { n: 0, sum: 0, max: 0 }); e.n++; e.sum += d; if (d > e.max) e.max = d; if (d >= 2) P.cur.push(name + ' ' + d.toFixed(0)); };
  G3.pf = [PT, PF];
  // 静态景物的顶点数据传给显卡之后，内存里的那一份就不留了（一张大图有几十兆）
  const slim = me => { const g = me.geometry; g.computeBoundingSphere(); for (const k in g.attributes) g.attributes[k].onUpload(function () { this.array = null; }); return me; };
  let job = null;   // 后台正在预建的那张图：{ id, gen }
  const finish = g => { let r; do { r = g.next(); } while (!r.done); return r.value; };
  // 把建好的场景记下来（最近用过的排在后面）；超出份额时释放最久没用的，但当前所在的这张不动
  function store(id, b) {
    SCENES.delete(id); SCENES.set(id, b);
    const cur = world.m && world.m.id;
    for (const k of Array.from(SCENES.keys())) { if (SCENES.size <= SCENE_KEEP) break; if (k === cur || k === id) continue; const old = SCENES.get(k); SCENES.delete(k); const tp = PT(); disposeScene(old.sc); PF('dispose scene ' + k, tp); }
  }
  // 确保这张图的场景已经建好：建过的直接用；后台预建到一半的接着做完；否则现在建
  function ready(m) {
    let b = SCENES.get(m.id);
    if (!b) { if (job && job.id === m.id) { b = job.gen ? finish(job.gen) : job.b; b.pre = true; job = null; } else b = finish(sceneSteps(m)); }
    store(m.id, b); return b;
  }
  world.prepare = m => { warmUp(ready(m), 1e9); };                      // 换图前（画面转黑的那一刻）先把场景备好、数据传给显卡
  world.has = id => SCENES.has(id) || !!(job && job.id === id);
  world.jobId = () => (job ? job.id : null);
  world.prewarm = m => { if (!job && !SCENES.has(m.id)) job = { id: m.id, gen: sceneSteps(m), b: null }; };   // 走近出口时开始在后台预建，之后每帧做一小段
  // 把场景里还没传给显卡的东西（地面贴图、各块景物的顶点数据）传过去：往一张极小的离屏画面上各画一遍即可。做满 ms 毫秒就先停，返回是否全部做完
  const warmSc = new THREE.Scene(), warmCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), warmRT = new THREE.WebGLRenderTarget(2, 2), warmMat = keep(new THREE.MeshBasicMaterial());
  function warmUp(b, ms) {
    const t0 = performance.now();
    try {
      if (b.tex) { const tp = PT(); R.initTexture(b.tex); PF('upload ground', tp); b.tex = null; if (performance.now() - t0 >= ms) return false; }
      while (b.meshes.length) {
        const w = new THREE.Mesh(b.meshes.pop().geometry, warmMat); w.frustumCulled = false; warmSc.add(w);
        const tp = PT(), rt = R.getRenderTarget(); R.setRenderTarget(warmRT); R.render(warmSc, warmCam); R.setRenderTarget(rt); warmSc.remove(w); PF('upload mesh', tp);
        if (performance.now() - t0 >= ms) return false;
      }
    } catch (e) { console.warn(e); b.meshes.length = 0; b.tex = null; }   // 传不了就算了，进图后的第一帧照常会传
    return true;
  }
  function pump(ms) {
    if (!job) return;
    if (job.gen) {   // 第一阶段：分段建场景
      const t0 = performance.now(); let r;
      do { const tp = PT(); r = job.gen.next(); PF('build step ' + job.id, tp); } while (!r.done && performance.now() - t0 < ms);
      if (r.done) { job.b = r.value; job.b.pre = true; job.gen = null; }
    } else if (warmUp(job.b, ms)) { store(job.id, job.b); job = null; }   // 第二阶段：分批传给显卡
  }
  world.build = m => {
    for (const e of world.npc.values()) killEnt(e); world.npc.clear();
    for (const e of world.foe.values()) killEnt(e); world.foe.clear();
    for (const e of world.walk.values()) killEnt(e); world.walk.clear();
    if (world.hero) K.kill(world.hero);
    if (world.ring && world.ring.parent) world.ring.parent.remove(world.ring);
    if (world.cine) for (const a of world.cine.list) if (a.ch) { K.kill(a.ch); a.ch = null; }
    const b = ready(m); b.meshes.length = 0; b.tex = null;   // 没来得及预传的，这一帧渲染时自然会传
    world.cur = b; setNight(b, !!(m.d.dayNight && World.night)); world.night = !!b.sc.userData.night;
    if (!world.warmed) {   // 预传用的那个材质，头一回用要编译着色器：趁第一次进图（画面还黑着）编译掉，免得以后后台预传时顿一下
      world.warmed = true;
      try { const w = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), warmMat), rt = R.getRenderTarget(); warmSc.add(w); R.setRenderTarget(warmRT); R.render(warmSc, warmCam); R.setRenderTarget(rt); warmSc.remove(w); w.geometry.dispose(); } catch (e) { }
    }
    world.sc = b.sc; world.m = m; world.dyn = b.dyn; world.sky = b.sky; world.far = b.far; world.exits = b.exits; world.fxo = b.fxo; world.prof = b.used++ > 0 ? 'cached' : b.pre ? 'prebuilt' : b.prof;
    // 主角
    const av = avatarId(), hero = world.hero = K.mkChar(CHARS[av].look, false, false); addBlob(hero); b.dyn.add(hero.g); hero.yaw = 0; world.heroId = av;
    if (!world.ring) { world.ring = new THREE.Mesh(new THREE.RingGeometry(0.33, 0.39, 40), keep(new THREE.MeshBasicMaterial({ color: LC('#ffe696', 1.6), transparent: true, opacity: 0.7, depthWrite: false }))); world.ring.geometry._keep = true; world.ring.rotation.x = -PI / 2; world.ring.renderOrder = 3; }
    b.dyn.add(world.ring);
    world.cx = null; world.first = true;   // first：进图后的第一帧（画面还黑着）把所有只做一次的重活干完，见 render
  };
  function* sceneSteps(m) {
    const th = m.th, d = m.d, lit = LIT[d.theme], sc = baseScene(d.theme, 19), rnd = mulberry32((d.seed || 7) * 3 + 1), fx = fxKit();
    const clk = G.realNow || (() => performance.now()); let pT = clk(); const pf = [], mark = n => { const t = clk(); pf.push(n + ' ' + Math.round(t - pT)); pT = t; };   // 各步用了多少毫秒（?test=8 会打印）
    const out = { sc, used: 0, meshes: [], tex: null };   // meshes / tex：还没传给显卡的东西（见 warmUp）
    sc.fog = new THREE.Fog(LC(lit.fog), 30, 85); sc.background = LC(lit.fog);
    const dyn = out.dyn = new THREE.Group(); sc.add(dyn);
    const sky = out.sky = d.indoor ? null : skyDome(d.theme); if (sky) { sky.position.set(m.w / 2, 0, m.h / 2); sky.visible = false; sc.add(sky); }   // 俯视时看不到天，只在剧情运镜的平视镜头里显示；室内没有天
    // 地面
    const tex = new THREE.CanvasTexture(m.ground); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = R.capabilities.getMaxAnisotropy();
    const gm = new THREE.Mesh(new THREE.PlaneGeometry(m.w, m.h), groundMat(tex, m.w, m.h, 0.6, lit.gd));
    gm.rotation.x = -PI / 2; gm.position.set(m.w / 2, 0, m.h / 2); gm.receiveShadow = true; sc.add(gm); out.tex = tex;
    const um = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), flatMat({ color: LC(d.indoor ? '#050508' : Art.shade(th.base[0], -0.18)), roughness: 1 }));
    um.rotation.x = -PI / 2; um.position.set(m.w / 2, -0.03, m.h / 2); um.receiveShadow = true; sc.add(um);
    // 静态景物，按 8×8 分块合并：L 实体，F 树叶，Gr 草，Gl 发光体
    const CH = 8, chunks = {};
    const chunk = (x, z) => { const k = Math.floor(x / CH) + '_' + Math.floor(z / CH); return chunks[k] || (chunks[k] = { L: new GB(), F: mkF(), Gr: mkGr(), Gl: new GB() }); };
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (x === 0 && y % 2 === 0) yield;
      const o = m.ob[m.I(x, y)]; if (!o) continue;
      const c = chunk(x, y), isProp = d.indoor || o.s === 'lantern' || o.s === 'brazier' || NOJIT.test(o.s);
      prop(o.s, c.L, c.F, c.Gl, x + 0.5 + (isProp ? 0 : (rnd() - 0.5) * 0.3), y + 0.5 + (isProp ? 0 : (rnd() - 0.5) * 0.3), o.sc, rnd, fx, false);
    }
    mark('props');
    // 山：图内的山丘、图外四周的群山，连同山坡上的树（遮住地图边缘）
    if (d.indoor) roomWalls(m, chunk, fx, dyn); else yield* terrain(m, chunk, rnd);
    mark('terrain');
    // 水边的芦苇、水面的荷叶，开阔的水面上偶尔泊一条小船
    if ((th.liquid || 'water') === 'water') {
      const gAt = (x, y) => (m.inb(x, y) ? m.g[m.I(x, y)] : -1), boats = [];
      for (let y = 1; y < m.h - 1; y++) for (let x = 1; x < m.w - 1; x++) {
        const i = m.I(x, y), gv = m.g[i], c = chunk(x, y);
        if (gv === GR.WATER && !m.ob[i]) {
          let deep = true, br = false;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const v = gAt(x + dx, y + dy); if (v !== GR.WATER) deep = false; if (v === GR.BRIDGE) br = true; }
          if (br) continue;
          if (d.lotus) {
            // 荷塘（d.lotus = 荷叶有多密）：贴着水面的浮叶之外，还有擎出水面的大荷叶、荷花和莲蓬
            if (rnd() < d.lotus) for (let k = 0, n = 2 + Math.floor(rnd() * 3); k < n; k++) {
              const px = x + 0.1 + rnd() * 0.8, pz = y + 0.1 + rnd() * 0.8, r = 0.16 + rnd() * 0.12, up = rnd() < 0.55 ? 0.14 + rnd() * 0.3 : 0, q = rnd();
              if (up) c.L.m('leaf').stick([px, 0, pz], [px, up, pz], 0.012, 0.009, '#3f6e3a', 4);
              c.L.m('leaf').c(px, up + 0.034, pz, r, up ? 0.03 : 0.012, q < 0.5 ? '#2f6a3a' : '#3a7a40', up ? 1.25 : 1, 10, q < 0.5 ? '#58a85a' : '#6cb862', up ? (rnd() - 0.5) * 0.3 : 0, rnd() * 3, up ? (rnd() - 0.5) * 0.3 : 0);
              if (rnd() < 0.34) {
                const fx2 = px + (rnd() - 0.5) * 0.3, fz = pz + (rnd() - 0.5) * 0.3, fh = 0.3 + rnd() * 0.3, pod = rnd() < 0.25;
                c.L.m('leaf').stick([fx2, 0, fz], [fx2 + 0.02, fh, fz], 0.009, 0.007, '#4a7a3e', 4);
                if (pod) c.L.c(fx2 + 0.02, fh + 0.03, fz, 0.05, 0.07, '#6a8a3a', 0.45, 8, '#9ab050');
                else { c.L.m('silk').add(K.ico(0), M(fx2 + 0.02, fh + 0.04, fz, 0.1, 0.085, 0.1, 0, rnd() * 3, 0), rnd() < 0.3 ? '#f4eef0' : '#e8709c', '#ffe4ee'); c.L.add(K.ico(0), M(fx2 + 0.02, fh + 0.09, fz, 0.035, 0.03, 0.035), '#f6d84a'); }
              }
            }
          } else if (rnd() < 0.2) {
            for (let k = 0, n = 1 + Math.floor(rnd() * 3); k < n; k++) {
              const px = x + 0.15 + rnd() * 0.7, pz = y + 0.15 + rnd() * 0.7, r = 0.1 + rnd() * 0.09;
              c.L.m('leaf').c(px, 0.034, pz, r, 0.012, '#356e3e', 1, 9, '#5aa85a', 0, rnd() * 3, 0);
              if (rnd() < 0.3) { c.L.stick([px, 0.03, pz], [px + 0.02, 0.13, pz], 0.006, 0.005, '#4a7a3e', 4); c.L.m('silk').add(K.ico(0), M(px + 0.02, 0.15, pz, 0.05, 0.04, 0.05, 0, rnd() * 3, 0), '#f2a0c4', '#ffe0ee'); }
            }
          } else if (deep && rnd() < 0.05 && !boats.some(b => Math.abs(b[0] - x) + Math.abs(b[1] - y) < 6)) { boats.push([x, y]); boat(c.L, c.Gl, x + 0.5, y + 0.5, rnd() * TAU, fx); }
        } else if (gv === GR.BASE && !m.blk[i] && rnd() < 0.42 && (gAt(x + 1, y) === GR.WATER || gAt(x - 1, y) === GR.WATER || gAt(x, y + 1) === GR.WATER || gAt(x, y - 1) === GR.WATER)) {
          const wx = gAt(x + 1, y) === GR.WATER ? 1 : gAt(x - 1, y) === GR.WATER ? -1 : 0, wz = wx ? 0 : gAt(x, y + 1) === GR.WATER ? 1 : -1;
          for (let k = 0; k < 7; k++) {
            const px = x + 0.5 + wx * (0.3 + rnd() * 0.25) + (wx ? 0 : rnd() - 0.5) * 0.8, pz = y + 0.5 + wz * (0.3 + rnd() * 0.25) + (wz ? 0 : rnd() - 0.5) * 0.8, h = 0.45 + rnd() * 0.45, lx = (rnd() - 0.5) * 0.16, lz = (rnd() - 0.5) * 0.16;
            c.L.m('leaf').stick([px, 0, pz], [px + lx, h, pz + lz], 0.012, 0.007, '#5c7a3c', 4, '#9ab45a');
            if (k % 2) c.L.m('fur').stick([px + lx, h, pz + lz], [px + lx * 1.25, h + 0.13, pz + lz * 1.25], 0.02, 0.012, '#8a6a3a', 5);
          }
        }
      }
    }
    // 草丛、花、碎石
    const gc0 = lin(Art.shade(th.base[1], -0.1)), gc1 = lin(Art.mix(th.blot[0], th.base[2], 0.5)), bt = baseOf(d.theme), lush = bt === 'mountain' || bt === 'bamboo' || bt === 'town', gh = lush ? 0.34 : 0.22;
    const junk = mkGr();   // 草丛减半时，被略去的那些画到这里（用完即弃）
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (x === 0 && y % 4 === 0) yield;
      const i = m.I(x, y); if (m.g[i] !== GR.BASE) continue;
      const c = chunk(x, y), nt = lush ? 5 : 1;
      for (let t = 0; t < nt; t++) if (rnd() < (lush ? 0.75 : 0.3)) grassTuft(vegKeep() ? c.Gr : junk, x + rnd(), y + rnd(), rnd, gc0, gc1, 2, gh);
      if (d.bloom && !m.blk[i]) {   // 花海（d.bloom = { p 每格开花的机会, n 每格几丛, cols 花色 }）：满地野花，不挡路
        const bl = d.bloom;
        if (rnd() < bl.p) for (let j = 0; j < bl.n; j++) {
          const fx2 = x + rnd(), fz = y + rnd(), fh = 0.14 + rnd() * 0.16, fc = bl.cols[Math.floor(rnd() * bl.cols.length)];
          c.L.m('leaf').stick([fx2, 0, fz], [fx2, fh, fz], 0.008, 0.006, '#3f7a3a', 3); c.L.m('silk').add(K.ico(0), M(fx2, fh + 0.02, fz, 0.055, 0.035, 0.055, 0, rnd() * 3, 0), fc, Art.mix(fc, '#ffffff', 0.45));
        }
        continue;
      }
      if (m.blk[i] || rnd() > 0.16) continue;
      const px = x + 0.15 + rnd() * 0.7, pz = y + 0.15 + rnd() * 0.7;
      if (rnd() < 0.6 && th.flowers) { c.L.m('leaf'); for (let j = 0; j < 3; j++) { const fx2 = px + (rnd() - 0.5) * 0.3, fz = pz + (rnd() - 0.5) * 0.3, fh = 0.12 + rnd() * 0.1, fc = th.flowers[Math.floor(rnd() * th.flowers.length)]; c.L.stick([fx2, 0, fz], [fx2, fh, fz], 0.008, 0.006, Art.shade(th.blot[1], -0.1), 3); c.L.add(K.ico(0), M(fx2, fh + 0.015, fz, 0.036, 0.022, 0.036, 0, rnd() * 3, 0), fc); } }
      else c.L.m('stone').add(rockGeo[Math.floor(rnd() * 3)], M(px, 0.03, pz, 0.13, 0.09, 0.11, 0, rnd() * 6, 0), Art.shade(th.stone, -0.35), Art.shade(th.stone, -0.05));
    }
    // 桥栏
    const isW = (x, y) => m.inb(x, y) && m.g[m.I(x, y)] === GR.WATER;
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (m.g[m.I(x, y)] !== GR.BRIDGE) continue;
      const c = chunk(x, y).L.m('wood'), wd = '#6a4022';
      for (const dd of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (!isW(x + dd[0], y + dd[1])) continue;
        const ex = x + 0.5 + dd[0] * 0.47, ez = y + 0.5 + dd[1] * 0.47;
        c.b(ex, 0.4, ez, dd[0] ? 0.06 : 1, 0.05, dd[0] ? 1 : 0.06, wd); c.b(ex, 0.22, ez, dd[0] ? 0.04 : 1, 0.04, dd[0] ? 1 : 0.04, wd);
        c.b(ex - (dd[0] ? 0 : 0.5), 0.24, ez - (dd[0] ? 0.5 : 0), 0.085, 0.5, 0.085, '#7a4e2a'); c.s(ex - (dd[0] ? 0 : 0.5), 0.52, ez - (dd[0] ? 0.5 : 0), 0.055, 0.055, 0.055, '#7a4e2a');
      }
    }
    // 碎石路（d.road === 'gravel'）：路面是贴图，另在路上撒一层立体的小石子，靠路边的大一些、多一些——走近了看是真的有石头
    if (d.road === 'gravel') {
      const r2 = mulberry32((d.seed || 7) * 17 + 3), GC = ['#b4aea0', '#9a9488', '#c6c0b0', '#86827a', '#a89c88'], isP = (x, y) => m.inb(x, y) && (m.g[m.I(x, y)] === GR.PATH || m.g[m.I(x, y)] === GR.BRIDGE || m.g[m.I(x, y)] === GR.STONE);
      for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
        if (m.g[m.I(x, y)] !== GR.PATH) continue;
        const c = chunk(x, y).L.m('stone'), ex = !isP(x - 1, y) ? -1 : !isP(x + 1, y) ? 1 : 0, ez = !isP(x, y - 1) ? -1 : !isP(x, y + 1) ? 1 : 0, edge = ex || ez;
        for (let k = 0, n = edge ? 7 : 3; k < n; k++) {
          const near = edge && k < 4, s = near ? 0.05 + r2() * 0.07 : 0.025 + r2() * 0.035, col = GC[Math.floor(r2() * GC.length)];
          const px = x + (near && ex ? 0.5 + ex * (0.3 + r2() * 0.24) : r2()), pz = y + (near && ez ? 0.5 + ez * (0.3 + r2() * 0.24) : r2());
          c.add(K.ico(0), M(px, s * 0.3, pz, s * (0.8 + r2() * 0.5), s * (0.5 + r2() * 0.3), s * (0.8 + r2() * 0.5), r2() * 0.6, r2() * TAU, r2() * 0.6), Art.shade(col, -0.3), col);
        }
      }
    }
    mark('grass');
    for (const b of d.builds || []) if (BUILD[b.s]) { const c = chunk(b.x + b.w / 2, b.y + b.h / 2); building(c.L, c.Gl, BUILD[b.s], b, fx, dyn); yield; }
    if (m.wall && m.wall.length) cityWall(m, chunk, fx, dyn);
    mark('builds');
    for (const k in chunks) {
      yield;
      const c = chunks[k];
      const put = me => { sc.add(slim(me)); out.meshes.push(me); };
      if (!c.L.empty()) put(c.L.mesh(matSee, true, true));
      if (!c.F.empty()) put(c.F.mesh(matLeafSee, true, true));
      if (!c.Gr.empty()) put(c.Gr.mesh(matGrass, false, true));
      if (!c.Gl.empty()) put(c.Gl.mesh(matGlowSee, false, false));
    }
    mark('meshes');
    // 液面
    {
      const P = [], N = [];
      const quad = (x0, z0, x1, z1) => { P.push(x0, 0.02, z0, x0, 0.02, z1, x1, 0.02, z1, x0, 0.02, z0, x1, 0.02, z1, x1, 0.02, z0); for (let i = 0; i < 6; i++) N.push(0, 1, 0); };
      for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.g[m.I(x, y)] === GR.WATER) quad(x, y, x + 1, y + 1);
      // 地图外是水面的那几侧（d.rim）：一直铺到远处
      const rs = d.rim || {}, far = 70;
      if (rs.n) quad(-far, -far, m.w + far, 0); if (rs.s) quad(-far, m.h, m.w + far, m.h + far); if (rs.w) quad(-far, 0, 0, m.h); if (rs.e) quad(m.w, 0, m.w + far, m.h);
      if (P.length) {
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
        const me = new THREE.Mesh(g, liquidMat(th.liquid || 'water', th)); me.renderOrder = 1; me.receiveShadow = true; sc.add(me);
      }
    }
    // 远山：只在剧情运镜的平视镜头里看得到，南北各一圈
    out.far = null;
    if (!d.indoor) {
      const SC = Art.SCN[d.theme], capC = baseOf(d.theme) === 'snow' ? '#ffffff' : SC.m[0], rk = c => (lit.gd ? Art.mix(c, Art.shade(lit.gd[1], -0.45), lit.gd[0] * 0.8) : c), k = Math.max(1, (Math.max(m.w, m.h) / 2 + EXT + 8) / 44);
      const far = out.far = new THREE.Group(); far.visible = false; sc.add(far);
      for (const r of [0, 1]) {
        const mt = new GB().m(0.95, 0, 0.9, 0.004), sd = (d.seed || 7) + r * 37;
        ridge(mt, 3 + sd, 46, 72, 12, rk(SC.g[1]), rk(SC.g[0]), SC.g[0], rk(Art.mix(SC.g[0], SC.m[1], 0.5)), 90);
        ridge(mt, 11 + sd, 78, 130, 32, rk(Art.mix(SC.g[1], SC.m[2], 0.6)), rk(SC.m[2]), SC.m[1], rk(capC), 110);
        const me = mt.mesh(matPlain, false, false); me.position.set(m.w / 2, 0, m.h / 2); me.scale.set(k, 1, k); me.rotation.y = r * PI; me.frustumCulled = false; far.add(me);
      }
    }
    // 出口光晕
    out.exits = (d.exits || []).map(e => {
      const me = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: K.glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      me.rotation.x = -PI / 2; me.position.set(e.x + (e.w || 1) / 2, e.door ? 0.3 : 0.05, e.y + (e.h || 1) / 2 + (e.door ? 0.25 : 0)); me.scale.set((e.w || 1) + (e.door ? 0.5 : 1.6), (e.h || 1) + (e.door ? 0.3 : 1.6), 1); me.renderOrder = 2; sc.add(me);   // 房门口的光晕小一些，落在门槛上
      return { e, me };
    });
    out.fxo = fxBuild(fx, sc);
    out.clouds = d.clouds ? cloudsBuild(m, sc) : null;
    mark('rest'); out.prof = pf.join(' ');
    return out;
  }
  // 大地图上显示的是队伍里的哪一位（菜单 · 系统 里可换）
  function avatarId() { const a = S && S.avatar; return !world.cine && a && CHARS[a] && S.party.some(m => m.id === a) ? a : 'hero'; }   // 剧情运镜时出场的总是云澈本人
  function turn(o, target, k) { let d = (target - o.yaw) % TAU; if (d > PI) d -= TAU; if (d < -PI) d += TAU; o.yaw += d * k; return o.yaw; }
  function mkNpc(n) {
    if (n.sprite === 'chest') return mkChest();
    if (n.sprite === 'spring') return mkSpring();
    if (OBJS.test(n.sprite || '')) return mkObj(n.sprite, n.def);
    if (n.sprite === 'stallR' || n.sprite === 'stallG') return mkStall(n.sprite === 'stallR' ? '#b8402e' : '#38805a', n.sprite === 'stallR' ? 'smith' : 'herb', n.look);
    const ch = K.mkChar(n.look, false, false); ch.seed = n.seed; ch.yaw = (n.def.face || 1) * 0.5; addBlob(ch);
    return { g: ch.g, ch, kind: 'human', look: n.look };
  }
  // 画质设置里的“其他人物的投影”：只用脚下的圆影时，NPC、路上的对手和行人不投实时阴影（主角照旧投）
  const noCast = g => { if (!GB0.npcShadow) g.traverse(o => { if (o.isMesh) o.castShadow = false; }); };
  // “其他人物的动作”隔帧算：把跳过那几帧的时长攒着，轮到它的那一帧一次算完；各人错开，不挤在同一帧。主角、剧情里的人物不受影响
  let fno = 0;
  function animNpc(e, o) {
    const n = G3.gfx.anim;
    if (!(n > 1)) { K.animate(e.ch, o); return; }
    e.adt = (e.adt || 0) + (o.dt || 0);
    if (e.slot == null) e.slot = Math.floor(Math.random() * n);
    if ((fno + e.slot) % n) return;
    o.dt = e.adt; e.adt = 0; K.animate(e.ch, o);
  }
  world.render = (W, dt) => {
    const m = W.map; if (world.m !== m) world.build(m);
    // 这张图第一次画：先把景物的影子算好（场景留着的话，再进来不用重算）。
    // 屋里不做：墙在 world.dyn 里本来就每帧画，屋子又小（一间不到十万个三角面），省不了什么，还白占一张大图
    if (BAKE && !m.d.indoor && !world.sc.userData.bake) { const tp = PT(); bakeStatic(world.cur, m); PF('bake shadows', tp); }
    fno++;
    if (world.heroId !== avatarId()) { const old = world.hero, av = avatarId(), nh = world.hero = K.mkChar(CHARS[av].look, false, false); addBlob(nh); world.dyn.add(nh.g); nh.yaw = old.yaw; world.dyn.remove(old.g); K.kill(old); world.heroId = av; }
    const sc = world.sc, p = W.p, t = W.t, px = p.px / T, pz = p.py / T - 0.3, kt = 1 - Math.exp(-dt * 12), hero = world.hero, lit = sc.userData.lit;
    const CN = world.cine, adt = CN ? dt * CN.rate : dt;   // 剧情运镜：人物和镜头由导演（cine.js）摆布
    if (world.ms !== K.modelStamp && (CN || !p.moving)) {   // 主角正走着的时候不换（换一个要解析模型、重建人物，会顿一下），等他停下再换
        // 后台又载入了人物模型：把还是程序人物、现在已有模型的换掉（下一帧会重新创建）
      world.ms = K.modelStamp;
      for (const [k, e] of world.npc) if (e.kind === 'human' && e.ch && !e.ch.glb && e.look && K.hasModel(e.look)) { killEnt(e); world.npc.delete(k); }
      for (const [k, e] of world.foe) if (e.ch && !e.ch.glb && e.ch.kind === 'human' && K.hasModel(k.look)) { killEnt(e); world.foe.delete(k); }
      for (const [k, e] of world.walk) if (e.ch && !e.ch.glb && K.hasModel(k.look)) { killEnt(e); world.walk.delete(k); }
      if (CN) for (const a of CN.list) if (a.ch && !a.ch.glb && a.ch.kind === 'human' && K.hasModel(a.look)) { world.dyn.remove(a.ch.g); K.kill(a.ch); a.ch = null; }
    }
    if (CN && CN.tick) CN.tick(dt);
    U.uTime.value = t;
    if (!CN) { hero.g.position.set(px, 0, pz); hero.g.rotation.y = turn(hero, Math.atan2(p.dx, p.dy), kt); }
    // 头部朝向：主角看向身边最近的人；NPC 在主角走近、身体还没转过来之前先转头
    const relYaw = (fx, fz, yaw, tx, tz, lim) => { let r = (Math.atan2(tx - fx, tz - fz) - yaw) % TAU; if (r > PI) r -= TAU; if (r < -PI) r += TAU; return Math.abs(r) < lim ? r : null; };
    let hLook = null, hBest = 3.2;
    if (!CN && !p.walk) for (const n of W.npcs) { if (n.sprite === 'chest' || n.sprite === 'spring' || n.w > 1 || n.def.pose === 'dead') continue; const dd = Math.hypot(n.px / T - px, n.py / T - 0.3 - pz); if (dd < hBest) { const r = relYaw(px, pz, hero.yaw, n.px / T, n.py / T - 0.3, 1.5); if (r != null) { hBest = dd; hLook = r; } } }
    if (!CN) K.animate(hero, { t, dt, walk: p.walk, look: hLook, calm: true, level: !/[?&]nolevel/.test(location.search) });   // calm：赶路用快步走，不用冲刺的动作；level：头抬到平视（g3model.js）
    const hiZ = !!CN || world.zoomT < 0.62; K.setHiTex(hero, hiZ);   // 镜头拉近时换上 4K 贴图
    const lookOf = (a, yaw) => { const b = a.lookAt && CN.act[a.lookAt]; return b ? relYaw(a.x, a.z, yaw, b.x, b.z, 1.25) : null; };
    world.ring.visible = !CN; if (world.sky) world.sky.visible = !!CN; if (world.far) world.far.visible = !!CN;
    world.ring.position.set(px, 0.035, pz); world.ring.scale.setScalar(1 + Math.sin(t * 3) * 0.05);
    // NPC
    const seen = new Set();
    // 进图后的第一帧画面还是黑的（正在转场）：趁这一帧把这张图上所有的人物都建出来、都画一遍，景物也不做视野裁剪全画一遍。
    // 模型解析、贴图和顶点数据送进显卡、着色器编译这些只做一次的重活，就都在黑场里做完了。不然它们会摊到走路的时候：
    // 每走到一处新地方、每遇到一个新面孔，画面就顿一下。之后才出现的人物（剧情里新冒出来的）仍然每帧最多建两个
    // （开发截图 / 测试模式下不做这一步，除非测的就是它（world.warmAll）：无头浏览器用软件渲染，整张大图不裁剪画一帧有时要好几分钟）
    const first = !!world.first && (!DEV_URL || !!world.warmAll); world.first = false;
    let quota = CN || first ? 1e9 : 2;
    const vcx = world.cx == null ? px : world.cx, vcz = world.cx == null ? pz : world.cz;
    const inView = (x, z, pad) => !!CN || first || (Math.abs(x - vcx) < world.vw + pad && z - vcz > -world.vn - pad && z - vcz < world.vs + pad);
    for (const n of W.npcs) {
      let e = world.npc.get(n.def);
      const nx = n.px / T, nz = n.py / T - 0.3;
      if (!e) { if (!n.sprite || n.w > 1) { if (quota <= 0 || !inView(nx, nz, 3 + (n.w || 1))) continue; quota--; } e = mkNpc(n); if (e.kind === 'human') noCast(e.g); world.npc.set(n.def, e); world.dyn.add(e.g); }
      seen.add(n.def);
      e.g.position.set(nx, 0, nz);
      if (!CN) { e.g.visible = inView(nx, nz, n.w || 1); if (!e.g.visible) continue; }   // 镜头看不到的人物不画、也不算动作（一个带模型的人物有一万多个面）
      if (e.kind === 'chest') { const open = !!S.flags['c_' + n.def.chest]; e.lid.rotation.x += ((open ? -1.25 : 0) - e.lid.rotation.x) * kt; e.gl.material.opacity = open ? 0 : 0.22 + Math.sin(t * 3) * 0.1; }
      else if (e.kind === 'spring') { e.gl.material.opacity = 0.4 + Math.sin(t * 2) * 0.1; e.sparks.forEach((s, i) => { const k = (t * 0.5 + i / 4) % 1; s.position.set(Math.sin(i * 2.4 + t) * 0.25, 0.1 + k * 0.9, Math.cos(i * 1.7 + t * 0.7) * 0.2); s.material.opacity = 1 - k; }); }
      else if (e.kind === 'obj') { if (e.gl) e.gl.material.opacity = 0.34 + Math.sin(t * 2.4) * 0.12; }
      else if (e.kind === 'stall') animNpc(e, { t, dt });
      else {
        const frozen = !!(n.def.frozen && n.def.frozen(S)), pose = n.def.pose || 'idle', near = Math.hypot(px - nx, pz - nz) < 2.1;
        const ov = CN && n.def.who && CN.act[n.def.who] && CN.act[n.def.who].npc === n.def ? CN.act[n.def.who] : null;
        e.g.visible = !(CN && CN.noNpc && !ov);
        if (ov) { e.g.rotation.y = turn(e.ch, ov.yaw, kt * 0.5); ov.h = e.ch.h; ov.glb = !!e.ch.glb; K.animate(e.ch, { t, dt: adt, pose: ov.pose || pose, act: ov.act, loop: ov.loop, look: lookOf(ov, e.ch.yaw) }); if (e.ch.blob) e.ch.blob.visible = (ov.pose || pose) !== 'dead'; K.setHiTex(e.ch, hiZ); continue; }
        if (pose !== 'dead' && !frozen) e.g.rotation.y = turn(e.ch, near ? Math.atan2(px - nx, pz - nz) : (n.def.face || 1) * 0.5, kt * 0.6); else e.g.rotation.y = e.ch.yaw;
        animNpc(e, { t: frozen ? 1 : t, dt, pose, look: frozen || pose !== 'idle' || Math.hypot(px - nx, pz - nz) > 5 ? null : relYaw(nx, nz, e.ch.yaw, px, pz, 1.6) });
        if (e.ch.blob) e.ch.blob.visible = pose !== 'dead';
        K.setHiTex(e.ch, hiZ);
        if (frozen && !e.ice) {
          e.ice = new THREE.Mesh(K.cyl(0.55, 6), new THREE.MeshStandardMaterial({ color: LC('#a8dcff'), transparent: true, opacity: 0.5, roughness: 0.08, metalness: 0, depthWrite: false, envMapIntensity: 1.6 }));
          e.ice.scale.set(0.46, 1.8, 0.46); e.ice.position.y = 0.9; e.ice.rotation.y = n.seed; e.g.add(e.ice); e.ch.em0 = [0.01, 0.05, 0.12]; K.tint(e.ch, 0, 1);
        } else if (!frozen && e.ice) { e.g.remove(e.ice); e.ice.material.dispose(); e.ice = null; e.ch.em0 = [0, 0, 0]; K.tint(e.ch, 0, 1); }
      }
    }
    for (const [k, e] of world.npc) if (!seen.has(k)) { killEnt(e); world.npc.delete(k); }
    // 敌人
    seen.clear();
    for (const f of W.foes) {
      let e = world.foe.get(f);
      const fx = f.px / T, fz = f.py / T - 0.3;
      if (!e) { if (quota <= 0 || !inView(fx, fz, 4)) continue; quota--; const ch = K.mkChar(f.look, false, false); ch.seed = f.seed; ch.yaw = 0; if (ch.kind !== 'spirit') addBlob(ch); noCast(ch.g); e = { g: ch.g, ch }; world.foe.set(f, e); world.dyn.add(e.g); }
      seen.add(f);
      e.g.position.set(fx, 0, fz);
      e.g.visible = CN ? !!f.fixed : inView(fx, fz, 1.5);   // 运镜时游荡的小怪不入画；平时镜头外的不画
      if (!e.g.visible) continue;
      const fo = CN && f.fixed && CN.act[f.group[0]] && CN.act[f.group[0]].foe ? CN.act[f.group[0]] : null;
      if (fo) { e.g.rotation.y = turn(e.ch, fo.yaw, kt * 0.4); fo.h = e.ch.h; fo.glb = !!e.ch.glb; K.animate(e.ch, { t, dt: adt, pose: fo.pose || 'idle', act: fo.act, loop: fo.loop, look: lookOf(fo, e.ch.yaw) }); K.tint(e.ch, 0, fo.alpha == null ? 1 : fo.alpha); continue; }
      const ty = f.moving ? Math.atan2(f.nx - f.x, f.ny - f.y) : (f.fixed || f.alert) ? Math.atan2(px - fx, pz - fz) : e.ch.yaw;
      e.g.rotation.y = turn(e.ch, ty, kt * 0.7);
      animNpc(e, { t, dt, walk: f.moving }); K.tint(e.ch, 0, f.cool > 0 ? 0.45 : 1);
    }
    for (const [k, e] of world.foe) if (!seen.has(k)) { killEnt(e); world.foe.delete(k); }
    // 街上的行人：走到镜头附近才创建，走出镜头只是藏起来（不拆掉，免得来回走动时反复重建）；运镜时不入画
    seen.clear();
    if (!CN) for (const w of W.walkers || []) {
      const wx = w.px / T, wz = w.py / T - 0.3, near = inView(wx, wz, 1.5);
      let e = world.walk.get(w);
      if (!near) { if (e) { e.g.visible = false; seen.add(w); } continue; }
      if (!e) { if (quota <= 0) continue; quota--; const ch = K.mkChar(w.look, false, false); ch.seed = w.seed; ch.yaw = Math.atan2(w.dx, w.dy); addBlob(ch); noCast(ch.g); e = { g: ch.g, ch }; world.walk.set(w, e); world.dyn.add(e.g); }
      seen.add(w); e.g.visible = true;
      e.g.position.set(wx, 0, wz); e.g.rotation.y = turn(e.ch, Math.atan2(w.dx, w.dy), kt * 0.6);
      animNpc(e, { t, dt, walk: w.moving });
    }
    for (const [k, e] of world.walk) if (!seen.has(k)) { killEnt(e); world.walk.delete(k); }
    // 剧情里另外登场的人物（同伴、敌方角色等）；云澈本人沿用大地图上的那个模型
    if (CN) for (const a of CN.list) {
      if (a.npc || a.foe) continue;
      let ch = a.id === 'hero' ? hero : a.ch;
      if (!ch) { ch = a.ch = K.mkChar(a.look, false, false); ch.seed = a.seed; ch.yaw = a.yaw; if (ch.kind !== 'spirit') addBlob(ch); world.dyn.add(ch.g); }
      if (a.snap) { ch.yaw = a.yaw; a.snap = false; }
      ch.g.visible = !a.hide; ch.g.position.set(a.x, a.y || 0, a.z); ch.g.rotation.y = turn(ch, a.yaw, 1 - Math.exp(-adt * (a.turn || 8)));
      K.animate(ch, { t, dt: adt, pose: a.pose || 'idle', act: a.act, loop: a.loop, from: a.from, to: a.to, at: a.at, gait: a.gait, walk: !!a.walk, look: lookOf(a, ch.yaw) });
      if (ch.rig && ch.rig.hold) ch.rig.hold.visible = !a.nowp;   // nowp：收起兵器
      K.tint(ch, 0, a.alpha == null ? 1 : a.alpha); K.setHiTex(ch, true);
      if (ch.blob) ch.blob.visible = a.pose !== 'dead' && !a.hide && (a.alpha == null || a.alpha > 0.5);
      a.h = ch.h; a.glb = !!ch.glb; if (ch.rim) ch.rim.value = 0.7;   // 平视镜头里给人物一圈轮廓光，从背景里分出来
    }
    // 镜头
    // 滚轮缩放（zoom 从 0.36 到 ZMAX，默认 1）：拉近时镜头压低、对准主角上半身，方便看清人物；
    // 拉远时镜头升高、再俯一些，看到的范围成倍变大（雾、阴影、人物的显示范围都跟着放大）
    world.zoom += (world.zoomT - world.zoom) * (1 - Math.exp(-dt * 8));
    // 屋里地方小：最多拉远到刚好看全整间屋子，不然屋子缩在一片黑里
    const asp = G3.aspect, d0 = Math.max(16, 3.5 / (0.268 * asp)), cap = world.zcap = m.d.indoor ? clamp(Math.max((m.w / 2 + 2) / (d0 * 0.268 * asp), (m.h + 4.5) / (d0 * 0.755)), 1, ZMAX) : ZMAX;
    const zm = Math.min(world.zoom, cap), zk = clamp((1 - zm) / 0.64, 0, 1), zo = Math.max(1, zm), zf = clamp((zm - 1) / (ZMAX - 1), 0, 1);
    const dist = d0 * zm, pitch = zm > 1 ? lerp(0.85, 1.0, zf) : lerp(0.85, 0.5, zk), halfW = dist * 0.268 * asp, hwv = halfW - Math.min(halfW * 0.2, 1.55);
    // 镜头在地面上往北能看出去 nExt 格、往南 sExt 格；拉远以后按这个来定镜头离地图边缘多远，边外始终只露出两三格
    const nExt = dist * (Math.sin(pitch) / Math.tan(pitch - 0.2618) - Math.cos(pitch)), sExt = dist * (Math.cos(pitch) - Math.sin(pitch) / Math.tan(pitch + 0.2618));
    const zN = zm > 1 ? nExt - 2.85 : 4.6 * zm, zS = zm > 1 ? sExt - 1.4 : 3.2 * zm;
    // 人物只画镜头看得到的那一片（见上面的 inView）：往两侧 vw 格、往北 vn 格、往南 vs 格，各带两三格余量——个子高的会从画面上沿探头，影子会从旁边投进来
    world.vw = dist * Math.sin(pitch) / Math.sin(pitch - 0.2618) * 0.268 * asp + 2.5; world.vn = nExt + 3.5; world.vs = sExt + 2.5;
    const tx = m.w <= hwv * 2 ? m.w / 2 : clamp(px, hwv, m.w - hwv), tz = m.h <= zN + zS ? m.h / 2 : clamp(pz - 0.5 * zm, zN, m.h - zS);
    if (world.cx == null) { world.cx = tx; world.cz = tz; }
    const kc = 1 - Math.exp(-dt * 6); world.cx += (tx - world.cx) * kc; world.cz += (tz - world.cz) * kc;
    if (CN) {
      const c = CN.cam, sh = CN.shake || 0;
      cam.fov = c.fov; cam.aspect = asp; cam.updateProjectionMatrix();
      cam.position.set(c.px + (Math.random() - 0.5) * sh, c.py + (Math.random() - 0.5) * sh, c.pz); cam.lookAt(c.tx, c.ty, c.tz); cam.updateMatrixWorld();
      shadowSpan(sc, 10, true); sc.fog.near = 30; sc.fog.far = 85; aimSun(sc, c.tx, c.tz); U.uP.value.set(c.tx, 0, c.tz); U.uPS.value.z = 0;
    } else {
      shadowSpan(sc, Math.round(15 * zo * 4) / 4);   // 阴影只算镜头看得到的那一片再多出几格（原先是 19，城里每帧有近一半的三角面花在画面外的阴影上） sc.fog.near = 30 * zo; sc.fog.far = 85 * zo;
      cam.fov = 30; cam.aspect = asp; cam.updateProjectionMatrix();
      cam.position.set(world.cx, dist * Math.sin(pitch) + 0.6 * zk, world.cz + dist * Math.cos(pitch)); cam.lookAt(world.cx, lerp(0.6, 1.0, zk), world.cz); cam.updateMatrixWorld();
      aimSun(sc, world.cx + (world.sunOff || 0), world.cz - 2 * zo);   // sunOff：开发检视用（?test 里挪动阴影范围、量画面闪不闪），平时是 0
      _p.set(px, 0.7, pz).project(cam);
      U.uP.value.set(px, 0, pz); const rs = G3.post ? G3.rs : 1; U.uPS.value.set((_p.x * 0.5 + 0.5) * G3.bw * rs, (_p.y * 0.5 + 0.5) * G3.bh * rs, 0.08 * G3.bh * rs / zm);
    }
    // 动态光效
    fxAnim(world.fxo, t);
    if (world.cur && world.cur.clouds) cloudsAnim(world.cur.clouds, Math.min(dt || 0, 0.1), px, pz);
    for (const x of world.exits) { const ok = !x.e.need || S.flags[x.e.need]; x.me.visible = !CN; x.me.material.color.copy(LC(ok ? '#fff0a0' : '#ff6060', 1.4)); x.me.material.opacity = 0.36 + 0.22 * Math.sin(t * 3); }
    if (sc.userData.bake) bakeFrame(sc, world.dyn, !!world.bakeRef || !!CN);   // 剧情运镜时景物照旧每帧画进阴影（见 shadowSpan）
    const gr = CN && CN.grade;   // 运镜时的调色：夜景等
    let unc = null;
    if (first) { unc = []; sc.traverse(o => { if (o.frustumCulled && (o.isMesh || o.isPoints || o.isLine || o.isSprite)) { o.frustumCulled = false; unc.push(o); } }); }   // 第一帧：不裁剪，全图画一遍
    const ng = sc.userData.night ? NIGHT : null, nE = ng ? ng.exp : 1, nB = ng ? ng.bloom : 1, nS = ng ? ng.sat : 1;   // 夜里：泛光加大，颜色略偏冷
    try { K.present(sc, cam, CN ? { exp: lit.exp * 1.22 * (gr ? gr.exp : 1) * nE, bloom: lit.bloom * (gr ? gr.bloom : 1.15) * nB, sat: lit.sat * (gr ? gr.sat : 0.97) * nS, con: 1.03, vig: 0.3, ss: 1.25, tint: gr ? gr.tint : ng ? ng.tint : null } : { exp: lit.exp * nE, bloom: lit.bloom * nB, sat: lit.sat * nS, con: 1.05, tint: ng ? ng.tint : null }); }
    finally { smRoot = null; }   // 只管这一帧的大地图；战斗、标题等别的画面照常
    if (unc) for (const o of unc) o.frustumCulled = true;
    if (!CN) pump(p.moving ? 2 : 6);   // 后台预建下一张图：主角走动时每帧只占 2 毫秒（不抢画面），站着不动时 6 毫秒
  };
  // 运镜的开关与辅助（导演逻辑在 cine.js）
  world.cineStart = () => (world.cine = { rate: 1, shake: 0, tick: null, list: [], act: {}, cam: { px: 0, py: 6, pz: 8, tx: 0, ty: 1, tz: 0, fov: 26 } });
  world.cineStop = () => { const CN = world.cine; if (!CN) return; if (world.hero && world.hero.rim) world.hero.rim.value = 0; if (world.hero && world.hero.rig && world.hero.rig.hold) world.hero.rig.hold.visible = true; for (const a of CN.list) if (a.ch) { world.dyn.remove(a.ch.g); K.kill(a.ch); a.ch = null; } world.cine = null; world.cx = null; };
  // 镜头到被摄者之间有没有树、房子、摆设挡着（高于 3.4 的那段视线不算）
  world.cineBlocked = (x0, y0, z0, x1, y1, z1) => {
    const m = world.m, d = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(d / 0.25);
    for (let i = 0; i <= n; i++) {
      const k = i / n, x = lerp(x0, x1, k), y = lerp(y0, y1, k), z = lerp(z0, z1, k);
      if ((1 - k) * d < 0.9 || y > 3.4) continue;
      const X = Math.floor(x), Z = Math.floor(z);
      if (!m.inb(X, Z)) { if (k < 0.02) return true; continue; }
      const idx = m.I(X, Z);
      if (m.ob[idx] || (m.blk[idx] && m.g[idx] !== GR.WATER)) return true;
    }
    return false;
  };
  // 当前这张图换成夜色 / 换回白天（在转场的黑幕里调用）
  world.applyNight = on => { if (world.cur && world.m && world.m.d.dayNight) { setNight(world.cur, on); world.night = !!world.cur.sc.userData.night; } };
  world.screen = (x, y, z) => { _p.set(x, y, z).project(cam); return { x: (_p.x * 0.5 + 0.5) * G.W, y: (-_p.y * 0.5 + 0.5) * G.H }; };
  // 氛围粒子（萤火、花瓣、雪……）用：场景里的一点 → 屏幕坐标，连同该处一格合多少像素（s）；在镜头背后或贴着镜头的返回 null。返回的是同一个对象，用完即弃
  const _po = { x: 0, y: 0, s: 0 };
  world.proj = (x, y, z) => {
    const d = _p.set(x, y, z).distanceTo(cam.position); _p.project(cam);
    if (_p.z < -1 || _p.z > 1 || d < 0.8) return null;
    _po.x = (_p.x * 0.5 + 0.5) * G.W; _po.y = (-_p.y * 0.5 + 0.5) * G.H; _po.s = G.H / (2 * Math.tan(cam.fov * PI / 360)) / d; return _po;
  };
  world.pick = (lx, ly) => {
    _ray.setFromCamera(_v2.set(lx / G.W * 2 - 1, -(ly / G.H * 2 - 1)), cam);
    return _ray.ray.intersectPlane(_pl, _p) ? { x: _p.x, z: _p.z } : null;
  };

  /* ================= 战斗舞台 ================= */
  const stages = {};
  function stage(theme) {
    if (stages[theme]) return stages[theme];
    const th = THEMES[theme], SC = Art.SCN[theme], lit = LIT[theme], sc = baseScene(theme, 15), rnd = mulberry32(theme.length * 7 + 5), fx = fxKit();
    const fogC = Art.mix(SC.sky[2], lit.fog, 0.5);
    sc.fog = new THREE.Fog(LC(fogC, 1.05), 34, 430); sc.background = LC(fogC);
    sc.add(skyDome(theme));
    // 地面
    const gt = K.canvasTex(1024, 1024, (c, W) => {
      c.fillStyle = Art.shade(th.base[0], -0.06); c.fillRect(0, 0, W, W);
      for (let i = 0; i < 320; i++) {
        const x = rnd() * W, y = rnd() * W, r = 30 + rnd() * 90, col = i % 3 === 2 ? th.base[2] : th.blot[i % 2];
        for (const ox of [-W, 0, W]) for (const oy of [-W, 0, W]) { const g = c.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r); g.addColorStop(0, Art.rgba(col, 0.3)); g.addColorStop(1, Art.rgba(col, 0)); c.fillStyle = g; c.fillRect(x + ox - r, y + oy - r, r * 2, r * 2); }
      }
      for (let i = 0; i < 2600; i++) { const x = rnd() * W, y = rnd() * W; c.fillStyle = Art.rgba(i % 2 ? Art.shade(th.blot[1], -0.25) : th.blot[0], 0.25); c.fillRect(x, y, 1.5 + rnd() * 2.5, 1.5 + rnd() * 2.5); }
    });
    gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set(40, 40); gt.anisotropy = R.capabilities.getMaxAnisotropy();
    const gm = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), groundMat(gt, 22.5, 22.5, 0.66, lit.gd)); gm.rotation.x = -PI / 2; gm.position.z = -200; gm.receiveShadow = true; sc.add(gm);
    const at = K.canvasTex(256, 256, c => { const g = c.createRadialGradient(128, 128, 20, 128, 128, 128); g.addColorStop(0, Art.rgba(th.path, 0.7)); g.addColorStop(0.55, Art.rgba(th.path, 0.42)); g.addColorStop(1, Art.rgba(th.path, 0)); c.fillStyle = g; c.fillRect(0, 0, 256, 256); });
    const am = new THREE.Mesh(new THREE.PlaneGeometry(26, 12), flatMat({ map: at, transparent: true, depthWrite: false, roughness: 0.95 })); am.rotation.x = -PI / 2; am.position.set(0, 0.012, 0.3); am.receiveShadow = true; am.renderOrder = 1; sc.add(am);
    // 景物
    const L = new GB(), F = mkF(), Gr = mkGr(), Gl = new GB();
    const put = (x, z, lod) => prop(th.trees[Math.floor(rnd() * th.trees.length)], L, F, Gl, x, z, 1.0 + rnd() * 0.55, rnd, fx, lod);
    for (let z = -5.5; z > -40; z -= 1.6) for (let x = -40; x <= 40; x += 1.6) {
      if (Math.abs(x) < 4 + (z + 5) * -0.06 && z > -12) continue;
      if (rnd() < (z < -13 ? 0.4 : 0.24)) put(x + (rnd() - 0.5) * 1.3, z + (rnd() - 0.5) * 1.3, z < -12);
    }
    for (const s of [-1, 1]) for (let z = -4; z < 3.4; z += 1.7) for (let x = 11; x < 28; x += 1.9) if (rnd() < 0.3) put(s * (x + rnd()), z + rnd(), false);
    const bt = baseOf(theme), acc = bt === 'fire' || bt === 'abyss' ? 'brazier' : bt === 'snow' ? 'crysI' : 'lantern';
    for (const s of [-1, 1]) { prop(acc, L, F, Gl, s * 7.6, -3.7, 1.1, rnd, fx); prop(acc, L, F, Gl, s * 3.4, -5.3, 1.1, rnd, fx); }
    const lush = bt === 'mountain' || bt === 'bamboo' || bt === 'town', gc0 = lin(Art.shade(th.base[1], -0.1)), gc1 = lin(Art.mix(th.blot[0], th.base[2], 0.5));
    const junk = mkGr();
    for (let i = 0; i < (lush ? 2600 : 500); i++) { const x = (rnd() - 0.5) * 56, z = 5.5 - rnd() * 30, e = Math.hypot(x / 9.5, (z - 0.3) / 3.6); if (e < 1 && rnd() > e * e * e) continue; grassTuft(vegKeep() ? Gr : junk, x, z, rnd, gc0, gc1, 2, lush ? 0.36 : 0.24); }
    L.m('stone'); for (let i = 0; i < 46; i++) { const x = (rnd() - 0.5) * 50, z = 5 - rnd() * 22; if (Math.abs(x) < 8.5 && z > -3.6) continue; const s = 0.1 + rnd() * rnd() * 0.5; L.add(rockGeo[i % 3], M(x, s * 0.3, z, s * 1.2, s, s, 0, rnd() * 6, 0), Art.shade(th.stone, -0.4), Art.shade(th.stone, -0.08)); }
    sc.add(L.mesh(matPlain, true, true)); if (!F.empty()) sc.add(F.mesh(matLeaf, true, true)); sc.add(Gr.mesh(matGrass, false, true)); if (!Gl.empty()) sc.add(Gl.mesh(K.matGlow, false, false));
    // 远山
    const mt = new GB().m(0.95, 0, 0.9, 0.004), capC = bt === 'snow' ? '#ffffff' : SC.m[0], rk = c => lit.gd ? Art.mix(c, Art.shade(lit.gd[1], -0.45), lit.gd[0] * 0.8) : c;
    ridge(mt, 3 + theme.length, 46, 72, 9, rk(SC.g[1]), rk(SC.g[0]), SC.g[0], rk(Art.mix(SC.g[0], SC.m[1], 0.5)), 90);
    ridge(mt, 11 + theme.length, 78, 130, 30, rk(Art.mix(SC.g[1], SC.m[2], 0.6)), rk(SC.m[2]), SC.m[1], rk(capC), 110);
    ridge(mt, 23 + theme.length, 140, 235, 62, rk(SC.m[2]), rk(SC.m[1]), SC.m[1], rk(capC), 110);
    sc.add(mt.mesh(matPlain, false, false));
    const fxo = fxBuild(fx, sc), dyn = new THREE.Group(); sc.add(dyn);
    aimSun(sc, 0, -1);
    return stages[theme] = { sc, fxo, dyn, theme, lit };
  }

  const BS = 1.2, battle = G3.battle = { st: null, units: [], rings: [] };
  const xs = () => clamp(G3.aspect / 1.45, 0.55, 1);
  const _ca = new THREE.Vector3(), _cb = new THREE.Vector3();
  function setBattleCam(shake, t, zoom) {
    const asp = G3.aspect, d = Math.max(13.4, 6.5 * xs() / (0.268 * asp));
    cam.fov = 30; cam.aspect = asp; cam.updateProjectionMatrix();
    _ca.set(Math.sin(t * 0.22) * 0.35 + (Math.random() - 0.5) * shake * 0.012, 3.3 + (Math.random() - 0.5) * shake * 0.012, d); _cb.set(0, 1.25, 0);
    if (zoom && zoom.k > 0 && zoom.u.v) {   // 绝招起手：镜头推到出招者身前，略偏向其正面
      const q = upos(zoom.u, true), s = zoom.u.side === 0 ? 1 : -1, hh = ((zoom.u.v.ch && zoom.u.v.ch.h) || 1.7) * BS, k = zoom.k * zoom.k * (3 - 2 * zoom.k);
      _ca.lerp(_p.set(q[0] + s * 1.5, hh * 0.72, q[1] + Math.max(4.6, 2.2 / asp)), k); _cb.lerp(_p.set(q[0] + s * 0.25, hh * 0.6, q[1]), k);
    }
    cam.position.copy(_ca); cam.lookAt(_cb); cam.updateMatrixWorld();
  }
  battle.begin = (theme, units) => {
    battle.end();
    const st = battle.st = stage(theme); battle.units = units; battle.rings = [];
    shadowSpan(st.sc, 15); aimSun(st.sc, 0, -1);
    if (title.grp) title.grp.visible = false;
    for (const u of units) {
      const ch = K.mkChar(u.look, false, true); ch.seed = u.v.seed; ch.g.scale.setScalar(ch.sz * BS); if (ch.kind !== 'spirit') addBlob(ch); st.dyn.add(ch.g); u.v.ch = ch;
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.47, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
      ring.rotation.x = -PI / 2; ring.renderOrder = 3; ring.userData.s = (u.look.sz || 1) * BS * (u.look.k === 'spider' ? 1.35 : 1); st.dyn.add(ring); u.v.ring = ring;
    }
    setBattleCam(0, 0);
  };
  battle.end = () => {
    if (!battle.st) return;
    for (const u of battle.units) if (u.v) { if (u.v.ch) K.kill(u.v.ch); if (u.v.ring) { battle.st.dyn.remove(u.v.ring); u.v.ring.geometry.dispose(); u.v.ring.material.dispose(); } u.v.ch = u.v.ring = null; }
    battle.st = null; battle.units = [];
  };
  const upos = (u, off) => { const v = u.v; return [(v.bx + (off ? v.ox / 80 : 0)) * xs(), v.bz + (off ? v.oy / 80 : 0)]; };
  const cW = LC('#ffffff', 1.6), cY = LC('#ffe278', 1.6);
  battle.render = (B, dt) => {
    const st = battle.st; if (!st) return;
    const t = B.t, ps = B.pickState;
    U.uTime.value = t; U.uPS.value.z = 0;
    // 朝向：冲向目标时面朝前进方向，其余时候面朝对方阵营（还站着的敌人的中心）
    const cen = [[0, 0, 0], [0, 0, 0]];
    for (const u of B.units) if (u.v && u.hp > 0) { const b = upos(u, false), c = cen[u.side]; c[0] += b[0]; c[1] += b[1]; c[2]++; }
    for (const u of B.units) {
      const v = u.v, ch = v.ch; if (!ch) continue;
      const hk = v.hitT > 0 ? v.hitT / 0.28 : 0, side = u.side === 0 ? 1 : -1, q = upos(u, true), b0 = upos(u, false), e = cen[1 - u.side];
      let ty = side * PI / 2;
      if (Math.hypot(q[0] - b0[0], q[1] - b0[1]) > 0.3) ty = Math.atan2(q[0] - b0[0], q[1] - b0[1]); else if (e[2]) ty = Math.atan2(e[0] / e[2] - b0[0], e[1] / e[2] - b0[1]);
      if (ch.yaw == null) ch.yaw = ty;
      ch.g.position.set(q[0] + (hk ? Math.sin(t * 70) * 0.06 * hk - side * 0.12 * hk : 0), 0, q[1]);
      if (!v.dead) turn(ch, ty, dt > 0 ? 1 - Math.exp(-dt * 10) : 1);
      ch.g.rotation.y = ch.yaw;
      K.animate(ch, { t, dt, pose: v.dead ? 'dead' : hk ? 'hit' : v.dodgeT > 0 ? 'dodge' : v.pose, swing: v.swing, act: v.pose === 'attack' ? v.act : null, lead: v.lead, from: v.pose === 'attack' ? v.from : null, stance: true, fly: v.fly });
      K.tint(ch, hk * 0.6, v.alpha);
      if (ch.blob) ch.blob.visible = !v.dead;
      const r = v.ring, m = r.material; let op = 0, sc = r.userData.s;
      if (v.alpha > 0.5) {
        if (ps && ps.cands.includes(u)) { const on = ps.cands[ps.sel] === u; m.color.copy(cW); op = on ? 0.95 : 0.35; sc *= on ? 1.12 + Math.sin(t * 8) * 0.06 : 1.05; }
        else if (u === B.cur && u.hp > 0) { m.color.copy(cY); op = 0.65 + 0.3 * Math.sin(t * 6); }
      }
      m.opacity = op; r.visible = op > 0; r.position.set(q[0], 0.03, q[1]); r.scale.setScalar(sc);
    }
    setBattleCam(B.shake > 0.3 ? B.shake : 0, t, B.zoom);
    fxAnim(st.fxo, t);
    K.present(st.sc, cam, { exp: st.lit.exp, bloom: st.lit.bloom, sat: st.lit.sat, con: 1.05 });
  };
  battle.screen = (u, h, off) => { const q = upos(u, off); _p.set(q[0], h || 0, q[1]).project(cam); return { x: (_p.x * 0.5 + 0.5) * G.W, y: (-_p.y * 0.5 + 0.5) * G.H }; };
  battle.hgt = u => { const ch = u.v.ch, hh = ch ? ch.h * BS : 1.7, a = battle.screen(u, 0, false), b = battle.screen(u, hh, false); return a.y - b.y; };

  /* ================= 标题 ================= */
  const title = G3.title = { grp: null, chs: [], t: 0 };
  title.render = dt => {
    const st = stage('mountain'); title.t += dt;
    if (!title.grp) {
      title.grp = new THREE.Group(); st.sc.add(title.grp);
      // 四人分列两侧、前后两排，站得离镜头近：人物约占画面高度的六成，贴图和五官的细节才看得出来
      [['hero', -1.5, 0, 0.42], ['su', -2.95, -1.25, 0.6], ['bai', 1.5, 0, -0.42], ['shi', 2.95, -1.25, -0.6]].forEach((l, i) => {
        const ch = K.mkChar(CHARS[l[0]].look, false, true); ch.seed = i * 1.7; ch.g.position.set(l[1], 0, l[2]); ch.g.rotation.y = l[3]; ch.g.scale.setScalar(ch.sz * 1.3); addBlob(ch); title.grp.add(ch.g); title.chs.push(ch);
      });
      // 影棚式补光只加在人物身上（着色器里的轮廓光和一点正面补光），不动场景的灯，免得把地面也照白
      for (const ch of title.chs) if (ch.rim) ch.rim.value = 1;
    }
    title.grp.visible = true; st.dyn.visible = false; U.uTime.value = title.t; U.uPS.value.z = 0;
    for (const ch of title.chs) { K.animate(ch, { t: title.t, dt, pose: 'show' }); K.setHiTex(ch, true); }   // 标题页近看：用 4K 贴图
    shadowSpan(st.sc, 9); aimSun(st.sc, 0, -3.5);
    // 画面窄时镜头后退，保证后排两人不出画
    const asp = G3.aspect, s = Math.max(1, 3.6 / (0.268 * asp) / 6.85);
    cam.fov = 30; cam.aspect = asp; cam.updateProjectionMatrix();
    cam.position.set(Math.sin(title.t * 0.18) * 0.3, 1.3, 5.6 * s); cam.lookAt(0, 1.2, -1.2); cam.updateMatrixWorld();
    fxAnim(st.fxo, title.t);
    K.present(st.sc, cam, { exp: st.lit.exp, bloom: st.lit.bloom, sat: st.lit.sat, con: 1.05, ss: 1.5 }); st.dyn.visible = true;   // ss：标题页用 1.5 倍超采样
  };

  /* ================= 头像（影棚布光，渲染到贴图再读回） ================= */
  let psc = null, pcam = null;
  const s2l = new Uint8Array(256); for (let i = 0; i < 256; i++) { const c = i / 255; s2l[i] = Math.round(255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)); }
  G3.snap = (L, size, mode) => {
    if (!psc) {
      psc = new THREE.Scene();
      const env = K.envFor('studio', LC('#dfe6f4', 0.5), LC('#f2ebe4', 0.42), LC('#8a7c74', 0.3), LC('#fff4e4', 0.4), [-0.4, 0.6, 0.7]);
      if (env) psc.environment = env; else psc.add(new THREE.HemisphereLight(LC('#e8ecf6', 0.7), LC('#8a7c74', 0.4), 1));
      const key = new THREE.DirectionalLight(LC('#fff2e2'), 1.3); key.position.set(-2.2, 3.4, 4.2); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
      const c = key.shadow.camera; c.left = -1.6; c.right = 1.6; c.top = 2.4; c.bottom = -0.6; c.near = 0.5; c.far = 14; key.shadow.bias = -0.0006; key.shadow.normalBias = 0.012; key.shadow.radius = 3;
      psc.add(key); key.target.position.set(0, 0.8, 0); psc.add(key.target);
      const rim = new THREE.DirectionalLight(LC('#a8c4ff'), 0.9); rim.position.set(2.5, 2.2, -3.5); psc.add(rim);
      pcam = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
    }
    const ch = K.mkChar(Object.assign({}, L, { sz: 1, cls: lookClass(L) || undefined }), true, true), cut = mode === 'cut', hy = ch.h - 0.21;   // 头像里身量一律按 1 拍；cls 记下原来属于哪一类（孩童放大以后不能被当成大人）
    psc.add(ch.g); ch.g.rotation.y = G3.snapYaw != null ? G3.snapYaw : cut ? -0.34 : mode === 'full' ? 0.35 : 0.32;
    if (!G3.snapRest) K.animate(ch, G3.snapPose || { t: 0.5, dt: 0, pose: 'idle', look: 0 });   // snapPose / snapYaw / snapRest：开发检视用
    if (ch.kind === 'human') {
      const top = ch.h, hc = ch.hy;
      if (mode === 'full') { pcam.position.set(0.5, 0.95, 4.3); pcam.lookAt(0, 0.76, 0); }
      else if (cut) { pcam.position.set(-0.42, hc + 0.03, 1.6); pcam.lookAt(-0.03, hc - 0.1, 0); }
      else { pcam.position.set(0.36, hc + 0.03, 1.18); pcam.lookAt(0.01, hc - 0.03, 0); }
    }
    else if (ch.kind === 'wolf') { pcam.position.set(1.0, 0.85, 2.2); pcam.lookAt(0, 0.52, 0.2); }
    else if (ch.kind === 'spider') { pcam.position.set(0.9, 0.9, 2.3); pcam.lookAt(0, 0.3, 0); }
    else { pcam.position.set(0.2, 0.7, 2.2); pcam.lookAt(0, 0.68, 0); }
    if (G3.snapCam) { const c = G3.snapCam, oy = G3.snapCamRel ? ch.hy || 0 : 0; pcam.position.set(c[0], c[1] + oy, c[2]); pcam.lookAt(c[3], c[4] + oy, c[5]); }   // 开发检视：自定机位（camrel：高度相对头部中心）
    if (G3.snapFov) { pcam.fov = G3.snapFov; pcam.updateProjectionMatrix(); }
    const out = new THREE.WebGLRenderTarget(size, size), buf = new Uint8Array(size * size * 4), set = G3.post ? K.mkSet(size, size) : null;
    K.present(psc, pcam, { set, to: out, keepA: true, exp: 1.0, bloom: 0.03 });
    R.readRenderTargetPixels(out, 0, 0, size, size, buf); R.setRenderTarget(null); out.dispose(); if (set) K.freeSet(set);
    psc.remove(ch.g); K.kill(ch);
    if (!G3.post) for (let i = 0; i < buf.length; i += 4) { buf[i] = s2l[buf[i]]; buf[i + 1] = s2l[buf[i + 1]]; buf[i + 2] = s2l[buf[i + 2]]; }
    const cv = document.createElement('canvas'); cv.width = cv.height = size;
    const c = cv.getContext('2d'), img = c.createImageData(size, size), row = size * 4;
    for (let y = 0; y < size; y++) img.data.set(buf.subarray((size - 1 - y) * row, (size - y) * row), y * row);
    c.putImageData(img, 0, 0);
    return cv;
  };
})();
