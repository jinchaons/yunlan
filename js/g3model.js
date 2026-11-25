'use strict';
/* ============ 外部人物模型：models/<id>.js（由 models/pack.ps1 从带骨骼的 GLB 转出）
   解析蒙皮网格与骨架，实例化后用 g3char.js 里同一套动作参数驱动骨骼。没有模型的角色仍用程序生成的人物。 ============ */
(() => {
  if (!G3.ok) return;
  const K = G3.k, raw = {}, tpls = {}, dims = {};
  const SU = 0.81;
  // 每个模型可单独覆盖：palm 掌心内旋的弧度，armOut 手臂下垂时离身体的外张量，leg 腿部摆幅（长裙调小，免得裙摆被腿拉出尖角）
  // gripF / gripN：握点在掌根→中指根方向上的比例、离开掌心骨骼的距离（米）
  // eyes：[左眼x, 左眼y, 右眼x, 右眼y, 半宽, 半高]，绑定姿势下的米制坐标（左 = 角色自己的左手边，+x），用 ?shot=model:<id>&mode=face&ruler=1 量出；
  // lid：眼睑的颜色（取眼周肤色）
  const CFG = {
    default: { palm: 1.1, armOut: 0.13, leg: 1, gripF: 0.86, gripN: 0.03, smooth: [0.5, 0.3] },
    // smooth：[脸与皮肤, 其余部位] 用多少平滑法线。每个模型的情况不同（有的脸靠法线贴图已经补得很干净，再平滑反而出暗斑），逐个对比后选定
    hero: { eyes: [0.0287, 1.533, -0.025, 1.5337, 0.013, 0.005], lid: '#c99f8b', smooth: [0.65, 0.3] },
    su: { eyes: [0.028, 1.506, -0.0275, 1.506, 0.014, 0.0055], lid: '#d2ab99', smooth: [0.3, 0.3] },
    bai: { leg: 0.62, eyes: [0.029, 1.539, -0.027, 1.5387, 0.0135, 0.0055], lid: '#d4b8ae', smooth: [0.1, 0.25] },
    shi: { eyes: [0.0235, 1.5715, -0.0285, 1.571, 0.013, 0.0045], lid: '#bd8f74', smooth: [0.55, 0.3] }
  };
  // 穿及踝长袍 / 长裙的人物：腿部摆幅收小
  for (const id of ['ye', 'jianying', 'qianmian', 'xuanzhu', 'gu', 'lingshuang', 'baicao', 'lie', 'tombkeeper', 'lampwoman', 'keeper', 'innkeeper', 'herb', 'teller', 'granny', 'gatherer', 'moon', 'chiyan']) CFG[id] = Object.assign({ leg: 0.7 }, CFG[id]);
  // 指节弯曲角（弧度，近→远）：握住兵器 / 空手自然微屈
  // c 开头的四组给“粗手”用（四指合成一两根骨链、指节处没有布线的手，见 parse 里的 coarse）：这种手弯多了就折成碎片，
  // 所以空手只略微弯一点，握兵器时主要在指根处整片弯过去，指节几乎不动
  const CURL = { grip: [1.15, 1.3, 0.7], gripT: [0.55, 0.5, 0.6], relax: [0.3, 0.45, 0.3], relaxT: [0.15, 0.15, 0.15],
    cGrip: [0.9, 0.25, 0.1], cGripT: [-0.4, -0.3, -0.2], cRelax: [0.12, 0.16, 0.1], cRelaxT: [0.08, 0.08, 0.08] };
  const qarr = k => { const m = new RegExp('[?&]' + k + '=([-\\d.,]+)').exec(location.search); return m ? m[1].split(',').map(Number) : null; }, CG = qarr('cg'), CR = qarr('cr'), CGT = qarr('cgt');   // &cg=0.9,0.25,0.1 &cr=...：开发检视，临时改粗手的弯曲角
  const V3 = THREE.Vector3, Q4 = THREE.Quaternion, M4 = THREE.Matrix4;

  // 模型数据文件在页面解析阶段同步载入，后面的脚本运行时模型已经就绪
  const rawAnim = {};
  // 模型与动作文件在游戏启动前取回，放在内存里，用到哪个再解析哪个。
  // 双击 index.html（file://）打开时，浏览器不许网页读取本地的二进制文件，但可以执行脚本，所以模型都打包成脚本（*.g3m.js）：
  // 每个文件执行一次 G3DATA(种类, 名字, 文件头, base64 的二进制)，把自己登记进来。
  const rawHi = {};
  window.G3DATA = (kind, name, head, b64) => {
    const bs = atob(b64), bin = new Uint8Array(bs.length); for (let i = 0; i < bs.length; i++) bin[i] = bs.charCodeAt(i);
    (kind === 'a' ? rawAnim : kind === 'h' ? rawHi : raw)[name] = { gltf: head.gltf, bv: head.bv, img: head.img, roles: head.roles, bin };
  };
  const IDX = (typeof G3INDEX !== 'undefined' && G3INDEX) || {};
  const loadScript = url => new Promise(res => { const s = document.createElement('script'); s.onload = s.onerror = res; s.src = url; document.head.appendChild(s); });
  const EAGER = { hero: 1, su: 1, bai: 1, shi: 1 }, later = [], want = {}, pending = {};
  const ONLY_WANT = /[?&](shot|sim|test)=/.test(location.search);   // 开发截图：只载入画面里用得着的模型，不把其余几十个也拉一遍
  for (const id in IDX.models || {}) if (!EAGER[id]) pending[id] = 1;
  if (Object.keys(IDX.models || {}).length) G3.ready = (async () => {
    let tip = null;
    try {
      const idx = IDX, jobs = [];
      let got = 0;
      const show = () => { if (tip) tip.textContent = '载入人物模型 ' + got + ' / ' + jobs.length; };
      const done = () => { got++; show(); };
      const get = url => jobs.push(loadScript(url).then(done));
      // 四位主角和动作文件在开场前取回；其余人物的模型数量多，进游戏后在后台一个个载入（见下面的 later），没到的先用程序人物顶着
      for (const id in idx.models || {}) { if (EAGER[id]) get('models/' + id + '.g3m.js?v=' + idx.models[id]); else later.push(id); }
      for (const n in idx.anims || {}) get('models/anim/' + n + '.g3m.js?v=' + idx.anims[n]);
      if (jobs.length) {
        tip = document.createElement('div');
        tip.style.cssText = 'position:fixed;left:0;right:0;top:46%;text-align:center;color:#f4e6c0;font:600 20px "Microsoft YaHei",sans-serif;letter-spacing:.2em;z-index:50;text-shadow:0 2px 8px #000';
        document.body.appendChild(tip); show();
        await Promise.all(jobs);
      }
    } catch (e) { console.error('models: ' + (e && e.message || e)); }
    if (tip) tip.remove();
    // 后台载入：眼下场景里用得着的（want）优先。每到一个，K.modelStamp 加一，场景据此把已经站在那里的程序人物换成模型
    (async () => {
      const one = id => loadScript('models/' + id + '.g3m.js?v=' + IDX.models[id]);
      while (later.length) {
        let i = later.findIndex(id => want[id]);
        if (i < 0) {
          if (ONLY_WANT) { await new Promise(r => setTimeout(r, 100)); continue; }
          // 眼下用不着的模型：主角正在走路时先不载（载一个要占主线程十几到几十毫秒，走着走着会顿一下），等他停下来；
          // 一直走个不停的话，每个最多等三秒，免得永远载不完
          for (let n = 0; n < 20 && typeof World !== 'undefined' && World.map && World.p && World.p.moving && typeof G !== 'undefined' && G.scene === 'world'; n++) await new Promise(r => setTimeout(r, 150));
          i = later.findIndex(id => want[id]); if (i < 0) i = 0;
        }
        const id = later.splice(i, 1)[0];
        try { await one(id); } catch (e) { console.error('model file: ' + (e && e.message || e)); }
        pending[id] = 0; K.modelStamp = (K.modelStamp || 0) + 1;
        await new Promise(r => setTimeout(r, want[id] ? 0 : 120));   // 不急用的，留出间隔，别抢画面的帧时间
      }
    })();
  })();

  // 这个长相用哪个模型：有专属模型的用专属的；没有的按年龄、性别用默认模型（见 data.js 的 DEFAULT_LOOK / lookModel）
  const midOf = L => { const m = lookModel(L); return m ? m.id : null; };
  function idOf(L) {
    const id = midOf(L);
    if (id && !raw[id] && pending[id]) want[id] = 1;   // 还在路上：标记为急用
    return id && raw[id] ? id : null;
  }
  K.hasModel = L => !!idOf(L);
  // 提前把这个长相要用的模型解析好（每种模型只需一次，约二十毫秒）：进图转黑时调用，免得走到跟前才解析、画面顿一下
  K.prepModel = L => { if (!L || L.k) return; const id = idOf(L); if (!id || !tplOf(id) || dims[id]) return; const c = K.procHuman(L, false); dims[id] = { h: c.h, hy: c.hy }; K.kill(c); };
  // 开打 / 开演之前：等这几位的模型载入（它们会被排到队首），最多等 ms 毫秒，免得一开场还是替身
  K.ensureModels = (looks, ms) => new Promise(res => {
    const need = looks.map(L => { idOf(L); return midOf(L); }).filter(id => id && pending[id]);
    if (!need.length) { res(); return; }
    const t0 = performance.now(), chk = () => { if (need.every(id => !pending[id]) || performance.now() - t0 > (ms || 3000)) res(); else setTimeout(chk, 50); };
    chk();
  });

  /* ---------- 解析 ---------- */
  const COMP = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
  const NUM = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
  const ROLES = [
    ['spine', /spine$/], ['head', /head$/],
    ['armL', /(leftarm|lupperarm)$/], ['foreL', /(leftforearm|lforearm)$/], ['handL', /(lefthand|lhand)$/],
    ['armR', /(rightarm|rupperarm)$/], ['foreR', /(rightforearm|rforearm)$/], ['handR', /(righthand|rhand)$/],
    ['legL', /(leftupleg|lthigh)$/], ['kneeL', /(leftleg|lcalf)$/], ['legR', /(rightupleg|rthigh)$/], ['kneeR', /(rightleg|rcalf)$/]
  ];
  // 躯干与四肢的标准骨名（Mixamo，去前缀小写）：动捕片段只驱动这些骨头，手指与头发衣物的附加骨不动
  const BODY = {}; for (const s of ['hips', 'spine', 'spine1', 'spine2', 'neck', 'head']) BODY[s] = 1;
  for (const sd of ['left', 'right']) for (const s of ['shoulder', 'arm', 'forearm', 'hand', 'upleg', 'leg', 'foot', 'toebase']) BODY[sd + s] = 1;
  const mkAcc = (g, d, bin) => i => {
    const a = g.accessors[i], v = g.bufferViews[a.bufferView], o = d.bv[a.bufferView], T = COMP[a.componentType], n = NUM[a.type], es = n * T.BYTES_PER_ELEMENT;
    const st = v.byteStride || es, base = bin.byteOffset + o[0] + (a.byteOffset || 0), out = new T(a.count * n);
    if (st === es) out.set(new T(bin.buffer.slice(base, base + a.count * es)));
    else for (let k = 0; k < a.count; k++) out.set(new T(bin.buffer.slice(base + k * st, base + k * st + es)), k * n);
    return { arr: out, n, norm: !!a.normalized, a };
  };
  // 平滑法线：AI 生成的模型为了展开贴图，几乎每个三角形都有自己单独的顶点，相邻面的法线可能对不上，光照下就显出一块块折面。
  // 这里把位置相同的顶点归为一组，按夹角加权把周围各面的法线平均起来；与原法线相差超过 55 度的（衣服叠层的硬边）保持原样
  const qnum = n => { const m = new RegExp('[?&]' + n + '=([\\d.]+)').exec(location.search); return m ? +m[1] : null; };
  const SMOOTH_N = !/[?&]sn=0/.test(location.search), NO_NM = /[?&]nm=0/.test(location.search), SNKQ = qnum('snk'), FK = qnum('fk'), CURLK = qnum('curl'), REFIT = !/[?&]refit=0/.test(location.search);
  function smoothNormals(geo) {
    const P = geo.attributes.position.array, N = geo.attributes.normal.array, I = geo.index.array, nv = P.length / 3, key = new Map(), grp = new Int32Array(nv);
    let ng = 0;
    for (let v = 0; v < nv; v++) { const k = Math.round(P[v * 3] * 20000) + '_' + Math.round(P[v * 3 + 1] * 20000) + '_' + Math.round(P[v * 3 + 2] * 20000); let g = key.get(k); if (g === undefined) { g = ng++; key.set(k, g); } grp[v] = g; }
    const acc = new Float32Array(ng * 3), a = new V3(), b = new V3(), c = new V3(), e1 = new V3(), e2 = new V3(), fn = new V3();
    for (let i = 0; i < I.length; i += 3) {
      const ia = I[i], ib = I[i + 1], ic = I[i + 2];
      a.fromArray(P, ia * 3); b.fromArray(P, ib * 3); c.fromArray(P, ic * 3);
      fn.crossVectors(e1.copy(b).sub(a), e2.copy(c).sub(a)); if (fn.lengthSq() < 1e-16) continue; fn.normalize();
      const ang = (p, q, r) => { e1.copy(q).sub(p).normalize(); e2.copy(r).sub(p).normalize(); return Math.acos(Math.min(1, Math.max(-1, e1.dot(e2)))); };
      const wa = ang(a, b, c), wb = ang(b, c, a), wc = ang(c, a, b);
      for (const [iv, w] of [[ia, wa], [ib, wb], [ic, wc]]) { const g = grp[iv] * 3; acc[g] += fn.x * w; acc[g + 1] += fn.y * w; acc[g + 2] += fn.z * w; }
    }
    // 结果另存为 sNormal：原法线要留着解码法线贴图（贴图是按原来的折面法线烘焙的），着色时再把两者按部位混合
    const SN = new Float32Array(N), cosLim = Math.cos(55 * Math.PI / 180);
    for (let v = 0; v < nv; v++) {
      const g = grp[v] * 3; a.set(acc[g], acc[g + 1], acc[g + 2]); if (a.lengthSq() < 1e-12) continue; a.normalize();
      if (a.x * N[v * 3] + a.y * N[v * 3 + 1] + a.z * N[v * 3 + 2] < cosLim) continue;
      SN[v * 3] = a.x; SN[v * 3 + 1] = a.y; SN[v * 3 + 2] = a.z;
    }
    geo.setAttribute('sNormal', new THREE.BufferAttribute(SN, 3));
  }
  // 让浏览器在后台把图片解码完再继续；解码迟迟不回话（页面在后台标签里、无头浏览器里都会这样）就不等了，半秒后照常继续
  // （开发截图 / 测试模式下不走这一步：无头浏览器的“虚拟时间”会被一个迟迟不结束的解码卡住，整个页面停在那里）
  const decodeThen = (im, fn) => { let done = false; const once = () => { if (!done) { done = true; fn(); } }; if (im.decode && !ONLY_WANT) { im.decode().then(once, once); setTimeout(once, 500); } else once(); };
  function parse(id) {
    const d = raw[id], g = d.gltf, bin = d.bin, acc = mkAcc(g, d, bin);
    const tex = {}, texOf = (ref, srgb) => {
      if (!ref) return null;
      const src = g.textures[ref.index].source, key = src + (srgb ? 's' : 'l');
      if (tex[key]) return tex[key];
      if (!d.img[src]) return null;
      const im = new Image(), t = new THREE.Texture(im);
      t.flipY = false; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = Math.min(8, K.R.capabilities.getMaxAnisotropy()); if (srgb) t.encoding = THREE.sRGBEncoding;
      const e = d.img[src], url = URL.createObjectURL(new Blob([bin.slice(e[0], e[0] + e[1])], { type: e[2] }));
      // 图片到了：先让浏览器在后台把它解码完，再马上送进显卡——不等这个人物第一次走进画面时才解码、上传（那样会顿一下）
      const up = () => { t.needsUpdate = true; T.pending--; try { K.R.initTexture(t); } catch (e) { } };
      T.pending++; im.onload = () => { URL.revokeObjectURL(url); decodeThen(im, up); }; im.onerror = () => { T.pending--; URL.revokeObjectURL(url); };
      im.src = url;
      return tex[key] = t;
    };
    const T = { id, pending: 0, prims: [], mats: [] }, at0 = { tan: true };
    // 蒙皮网格
    const skinIdx = (g.nodes.find(n => n.mesh != null && n.skin != null) || {}).skin || 0, skin = g.skins[skinIdx];
    let y0 = Infinity, y1 = -Infinity;
    for (const n of g.nodes) {
      if (n.mesh == null || n.skin !== skinIdx) continue;
      for (const p of g.meshes[n.mesh].primitives) {
        if (p.mode != null && p.mode !== 4) continue;
        const at = p.attributes, geo = new THREE.BufferGeometry(), P = acc(at.POSITION);
        geo.setAttribute('position', new THREE.BufferAttribute(P.arr, 3));
        if (at.NORMAL != null) geo.setAttribute('normal', new THREE.BufferAttribute(acc(at.NORMAL).arr, 3));
        if (at.TANGENT != null && d.bv[g.accessors[at.TANGENT].bufferView]) geo.setAttribute('tangent', new THREE.BufferAttribute(acc(at.TANGENT).arr, 4));   // 法线贴图按模型自带切线解码
        else at0.tan = false;
        if (at.TEXCOORD_0 != null) { const u = acc(at.TEXCOORD_0); geo.setAttribute('uv', new THREE.BufferAttribute(u.arr, 2, u.norm)); }
        const J = acc(at.JOINTS_0), Wt = acc(at.WEIGHTS_0);
        geo.setAttribute('skinIndex', new THREE.BufferAttribute(new Uint16Array(J.arr), 4));
        geo.setAttribute('skinWeight', new THREE.BufferAttribute(Wt.arr, 4, Wt.norm));
        if (p.indices != null) { const ix = acc(p.indices).arr; geo.setIndex(new THREE.BufferAttribute(ix instanceof Uint8Array ? new Uint16Array(ix) : ix, 1)); }
        if (at.NORMAL == null) geo.computeVertexNormals();
        if (geo.index) smoothNormals(geo); else geo.setAttribute('sNormal', new THREE.BufferAttribute(new Float32Array(geo.attributes.normal.array), 3));
        geo.computeBoundingBox(); geo.computeBoundingSphere(); geo._keep = true;
        y0 = Math.min(y0, geo.boundingBox.min.y); y1 = Math.max(y1, geo.boundingBox.max.y);
        T.prims.push({ geo, mat: p.material == null ? -1 : p.material });
      }
    }
    for (const m of g.materials || []) {
      const pm = m.pbrMetallicRoughness || {}, mr = texOf(pm.metallicRoughnessTexture, false);
      T.mats.push({ map: texOf(pm.baseColorTexture, true), normalMap: texOf(m.normalTexture, false), mr,
        color: pm.baseColorFactor || [1, 1, 1, 1], rough: pm.roughnessFactor == null ? 1 : pm.roughnessFactor, metal: pm.metallicFactor == null ? 1 : pm.metallicFactor });
    }
    // 骨架：绑定姿势取自逆绑定矩阵，不依赖节点上保存的（可能是动画某一帧的）姿势
    const J = skin.joints, nJ = J.length, ibmA = acc(skin.inverseBindMatrices).arr, par = {};
    g.nodes.forEach((n, i) => { for (const c of n.children || []) par[c] = i; });
    const jOf = {}; J.forEach((n, k) => { jOf[n] = k; });
    T.n = nJ; T.ibm = []; T.parent = []; T.name = []; T.pos = []; T.quat = []; T.scl = []; T.restW = []; T.restL = [];
    const world = [], wp = [];
    for (let k = 0; k < nJ; k++) {
      const m = new M4().fromArray(ibmA, k * 16); T.ibm.push(m); world.push(m.clone().invert());
      let p = par[J[k]]; while (p != null && jOf[p] == null) p = par[p];
      T.parent.push(p == null ? -1 : jOf[p]); T.name.push(g.nodes[J[k]].name || '');
    }
    // 修正层级（新版自动绑定会多出衣摆、宽袖、发束的附加骨）：
    //   1. 髋骨之外的其它“根骨”改挂到髋上，否则身体蹲下、倒地时它们管着的布料留在原地；
    //   2. 挂在手臂 / 手上、位置却离手臂很远的附加骨（垂到膝下的宽袖、被误挂的袍摆）也改挂到髋上：
    //      手臂从绑定时的张开放到身侧要转过几十度，这些骨头若跟着整体转，会把下半身的布料甩出去近一米。
    T.rehung = 0;
    {
      const nm0 = T.name.map(n => n.replace(/^.*[:|]/, '').replace(/[\s_.\-]/g, '').toLowerCase()), hip = nm0.indexOf('hips');
      if (hip >= 0) {
        const P = world.map(m => new V3().setFromMatrixPosition(m)), isArm = s => /^(left|right)(shoulder|arm|forearm|hand)$/.test(s), far = 0.3 * P[hip].y / 0.97;
        const a = new V3(), b = new V3(), segD = (p, s0, s1) => { a.copy(s1).sub(s0); const L2 = a.lengthSq(), t = L2 > 0 ? Math.min(1, Math.max(0, b.copy(p).sub(s0).dot(a) / L2)) : 0; return b.copy(s0).addScaledVector(a, t).distanceTo(p); };
        const up = k => { let n = 0; for (let p = T.parent[k]; p >= 0 && n < 99; p = T.parent[p], n++) if (p === hip) return true; return false; };
        for (let k = 0; k < nJ; k++) {
          if (k === hip) continue;
          if (T.parent[k] < 0) { if (!up(hip)) { T.parent[k] = hip; T.rehung++; } continue; }
          const p = T.parent[k]; if (!/^bone\d/.test(nm0[k]) || !isArm(nm0[p])) continue;
          let d = P[k].distanceTo(P[p]);
          for (let j = 0; j < nJ; j++) if (T.parent[j] === p && j !== k && !/^bone\d/.test(nm0[j])) d = Math.min(d, segD(P[k], P[p], P[j]));
          const gp = T.parent[p]; if (gp >= 0 && isArm(nm0[gp])) d = Math.min(d, segD(P[k], P[gp], P[p]));
          if (d > far) { T.parent[k] = hip; T.rehung++; }
        }
      }
    }
    const tm = new M4();
    for (let k = 0; k < nJ; k++) {
      const p = T.parent[k], loc = p < 0 ? world[k].clone() : tm.copy(world[p]).invert().multiply(world[k]).clone();
      const ps = new V3(), q = new Q4(), s = new V3(); loc.decompose(ps, q, s); T.pos.push(ps); T.quat.push(q); T.scl.push(s); T.restL.push(q);
      const wq = new Q4(), ws = new V3(), wpos = new V3(); world[k].decompose(wpos, wq, ws); T.restW.push(wq); wp.push(wpos);
      if (k === 0) T.ws = ws.x;
    }
    // 父骨在前的遍历顺序
    T.order = []; const seen = new Array(nJ).fill(false);
    const visit = k => { if (seen[k]) return; if (T.parent[k] >= 0) visit(T.parent[k]); seen[k] = true; T.order.push(k); };
    for (let k = 0; k < nJ; k++) visit(k);
    // 骨骼角色：兼容 Mixamo 与 3ds Max Biped 的命名
    T.role = {}; T.roleOf = new Array(nJ).fill(null);
    T.name.forEach((nm, k) => { const s = nm.replace(/^.*[:|]/, '').replace(/[\s_.\-]/g, '').toLowerCase(); for (const r of ROLES) if (T.role[r[0]] == null && r[1].test(s)) { T.role[r[0]] = k; T.roleOf[k] = r[0]; break; } });
    // 手臂：把绑定姿势（T 或 A 字）的上臂、前臂方向转到自然下垂，之后的动作参数与程序人物一致
    T.restC = T.restW.map(q => q.clone());
    const child = k => T.parent.indexOf(k);
    // 手掌与手指（Mixamo 命名）：由掌根、各指根的位置求出指向 f、拇指侧 a、掌心法线 n，以及每个指节的弯曲轴
    const nrm = T.name.map(nm => nm.replace(/^.*[:|]/, '').replace(/[\s_.\-]/g, '').toLowerCase()), find = s => nrm.indexOf(s);
    T.hand = {};
    for (const sd of ['L', 'R']) {
      const side = sd === 'L' ? 'left' : 'right', hk = T.role['hand' + sd], m1 = find(side + 'handmiddle1'), i1 = find(side + 'handindex1');
      const p1 = find(side + 'handpinky1') >= 0 ? find(side + 'handpinky1') : find(side + 'handring1'), t1 = find(side + 'handthumb1');
      if (hk == null || m1 < 0 || ((i1 < 0 || p1 < 0) && t1 < 0)) continue;
      const f = wp[m1].clone().sub(wp[hk]), len = f.length(); f.normalize();
      // 拇指侧：小指根→食指根；手指合并成一根骨链的模型（只有拇指和中指）改用拇指自身的指向（指根的方位偏向掌心，不能用）
      const tt = find(side + 'handthumb3') >= 0 ? find(side + 'handthumb3') : find(side + 'handthumb2');
      if ((i1 < 0 || p1 < 0) && tt < 0) continue;
      const a = i1 >= 0 && p1 >= 0 ? wp[i1].clone().sub(wp[p1]) : wp[tt].clone().sub(wp[t1]); a.addScaledVector(f, -a.dot(f)).normalize();
      const n = sd === 'R' ? new V3().crossVectors(a, f) : new V3().crossVectors(f, a), joints = [];
      for (const fg of ['thumb', 'index', 'middle', 'ring', 'pinky']) {
        let last = f;
        for (let j = 1; j <= 3; j++) {
          const k = find(side + 'hand' + fg + j), c = find(side + 'hand' + fg + (j + 1));
          if (k < 0) continue;
          const dir = c >= 0 ? wp[c].clone().sub(wp[k]).normalize() : last; last = dir;
          const to = fg === 'thumb' ? new V3().addScaledVector(n, 0.8).addScaledVector(a, -0.5).addScaledVector(f, 0.35).normalize() : n;
          joints.push({ k, j, fg, ax: new V3().crossVectors(dir, to).normalize() });
        }
      }
      T.hand[sd] = { hk, f, a, n, len, joints };
    }
    // 有的模型绑出了手指骨，却没有任何顶点跟着它们动（整只手只绑在掌骨上）。这里按位置补上蒙皮：
    // 指根线以外的顶点按远近分给三节指骨（四指并作一片弯曲），拇指骨链附近的顶点分给拇指三节。
    for (const sd of ['L', 'R']) {
      const h = T.hand[sd], side = sd === 'L' ? 'left' : 'right';
      if (!h) continue;
      const mid = [1, 2, 3].map(j => find(side + 'handmiddle' + j)), th = [1, 2, 3, 4].map(j => find(side + 'handthumb' + j)).filter(k => k >= 0);
      if (mid.some(k => k < 0)) continue;
      // 手上的骨头：按名字认的指骨，以及挂在掌骨下面的无名附加骨（自动绑定常把某一两根手指单独挂在这样一根骨头上，
      // 我们不驱动它，那根手指就一直直挺挺地戳着）
      const fset = {}; nrm.forEach((s, k) => { if (k === h.hk) return; if (s.indexOf(side + 'hand') === 0) { fset[k] = 1; return; } for (let p = T.parent[k], n = 0; p >= 0 && n < 9; p = T.parent[p], n++) if (p === h.hk) { fset[k] = 1; break; } });
      let firm = 0, skip = false;   // 指骨上权重接近 1 的顶点数：很少就说明手指基本还挂在掌骨上，弯不动
      for (const p of T.prims) { const si = p.geo.attributes.skinIndex.array, sw = p.geo.attributes.skinWeight.array; if (!(sw instanceof Float32Array)) { skip = true; break; } for (let i = 0; i < si.length; i++) if (sw[i] > 0.8 && fset[si[i]]) firm++; }
      // 四指合成一两根骨链的手（只有中指，或中指加小指）：自动绑定给的权重很乱——有的指尖顶点还挂在掌骨上，一弯就戳出尖刺。
      // 这种手一律按位置重新分配：四指并成一片，沿指根、指节两道线整齐地弯
      const coarse = find(side + 'handindex1') < 0 || find(side + 'handring1') < 0;
      h.coarse = coarse;
      if (skip || (firm >= 12 && !(coarse && REFIT))) continue;
      const o = wp[mid[0]], us = mid.map(k => wp[k].clone().sub(o).dot(h.f)), band = h.len * 0.08, tr = h.len * 0.2, pv = new V3(), d = new V3(), c = new V3();
      const blend = (out, a, b, t) => { t = Math.min(1, Math.max(0, t)); out[0] = a; out[1] = b; out[2] = 1 - t; out[3] = t; }, bw = [0, 0, 0, 0];
      for (const p of T.prims) {
        const ps = p.geo.attributes.position.array, si = p.geo.attributes.skinIndex.array, sw = p.geo.attributes.skinWeight.array;
        for (let v = 0; v < ps.length / 3; v++) {
          let wh = 0; for (let q = 0; q < 4; q++) if (si[v * 4 + q] === h.hk || fset[si[v * 4 + q]]) wh += sw[v * 4 + q];
          if (wh < 0.5) continue;
          pv.set(ps[v * 3], ps[v * 3 + 1], ps[v * 3 + 2]);
          const u = d.copy(pv).sub(o).dot(h.f); let hit = false;
          // 四指：指根线以外、又在手掌这一片的厚度和宽度之内的顶点（袖口、护腕虽然也挂在手上，但不在这一片里，不动它）
          if (u > -band && u < h.len * 1.7 && Math.abs(d.dot(h.n)) < h.len * 0.45 && Math.abs(d.dot(h.a)) < h.len * 0.95) {
            const i = u < us[1] ? 0 : u < us[2] ? 1 : 2;
            if (u < us[i] + band) blend(bw, i === 0 ? h.hk : mid[i - 1], mid[i], (u - us[i] + band) / (2 * band)); else blend(bw, mid[i], mid[i], 1);
            hit = true;
          } else for (let i = 0; i + 1 < th.length && !hit; i++) {   // 拇指
            const A0 = wp[th[i]], B0 = wp[th[i + 1]], L = d.copy(B0).sub(A0).length(), s = c.copy(pv).sub(A0).dot(d.normalize());
            if (s < (i === 0 ? 0 : -band) || s > L + (i + 2 === th.length ? tr : 0)) continue;
            if (c.copy(A0).addScaledVector(d, s).distanceTo(pv) > tr) continue;
            if (s < band) blend(bw, i === 0 ? h.hk : th[i - 1], th[i], (s + band) / (2 * band)); else blend(bw, th[i], th[i], 1);
            hit = true;
          }
          if (hit) { si[v * 4] = bw[0]; si[v * 4 + 1] = bw[1]; si[v * 4 + 2] = 0; si[v * 4 + 3] = 0; sw[v * 4] = bw[2]; sw[v * 4 + 1] = bw[3]; sw[v * 4 + 2] = 0; sw[v * 4 + 3] = 0; }
        }
      }
    }
    // 图生 3D 的模型多为掌心朝前：再绕手臂自身的轴内旋，让掌心朝向身体（上臂分担四成，肘部不至于拧得太狠）。
    // 有手指骨骼时按掌心法线精确求内旋角，否则用 palm 的经验值。
    const cf = Object.assign({}, CFG.default, CFG[id]), corr = {};
    for (const sd of ['L', 'R']) {
      const sg = sd === 'L' ? 1 : -1, tgt = new V3(sg * cf.armOut, -1, 0.02).normalize(), sw = {};
      for (const r of ['arm' + sd, 'fore' + sd]) {
        const k = T.role[r], c = k == null ? -1 : child(k);
        if (c >= 0) sw[r] = new Q4().setFromUnitVectors(wp[c].clone().sub(wp[k]).normalize(), tgt);
      }
      let ang = sg * cf.palm; const h = T.hand[sd], sf = sw['fore' + sd];
      if (h && sf) {
        const n1 = h.n.clone().applyQuaternion(sf); n1.addScaledVector(tgt, -n1.dot(tgt)).normalize();
        const nd = new V3(-sg, 0, 0); nd.addScaledVector(tgt, -nd.dot(tgt)).normalize();
        ang = Math.atan2(tgt.dot(new V3().crossVectors(n1, nd)), n1.dot(nd));
      }
      for (const r of ['arm' + sd, 'fore' + sd]) if (sw[r]) { T.restC[T.role[r]] = new Q4().setFromAxisAngle(tgt, ang * (r[0] === 'a' ? 0.4 : 1)).multiply(sw[r]).multiply(T.restW[T.role[r]]); corr[T.role[r]] = 1; }
    }
    // “标准站姿”（手臂下垂、掌心朝内）下各骨骼的朝向：动捕片段记录的是相对它的转动，所以同一片段能套到任何角色上
    T.canonW = [];
    for (const k of T.order) { const p = T.parent[k]; T.canonW[k] = corr[k] ? T.restC[k] : p < 0 ? T.restW[k] : T.canonW[p].clone().multiply(T.restL[k]); }
    T.std = nrm.map(s => (BODY[s] ? s : null)); T.ctl = nrm.map((s, k) => !!BODY[s] || T.roleOf[k] != null);
    // 某根骨头及其以下的全部受控骨（呼吸、转头这类叠加动作要整段一起转）
    T.sub = {};
    // 髋到颈的骨链（不含髋）：赶路时扶正上身用。lean0 是标准站姿下这条线本来的倾角
    T.spineChain = []; { const hip0 = find('hips'); let k = find('neck') >= 0 ? find('neck') : find('head'); for (let c = 0; k >= 0 && k !== hip0 && c < 12; k = T.parent[k], c++) T.spineChain.push(k); if (k !== hip0 || hip0 < 0) T.spineChain = []; }
    { const v = new V3(), u = new V3(); for (const k of T.spineChain) v.add(u.copy(T.pos[k]).applyQuaternion(T.canonW[T.parent[k]])); T.lean0 = T.spineChain.length ? Math.atan2(v.z, v.y) : 0; }
    for (const nmS of ['spine', 'spine1', 'neck', 'head', 'leftshoulder', 'rightshoulder']) {
      const r = find(nmS); if (r < 0) continue;
      T.sub[nmS] = T.order.filter(k => { if (!T.ctl[k]) return false; for (let p = k; p >= 0; p = T.parent[p]) if (p === r) return true; return false; });
    }
    T.nrm = nrm; T.wp = wp; T.hipK = find('hips') >= 0 ? find('hips') : T.order[0]; T.hipH = Math.max(0.3, wp[T.hipK].y - y0);
    // 衣物附加骨（Meshy 在髋下加的骨链，裤腿、靴子、袍摆的顶点绑在上面）：没有对应的动捕数据，
    // 这里让贴近腿的那些跟着最近的一段腿骨转，离得远的（前后襟）留在髋上自然下垂
    T.ext = []; T.follow = {}; T.followW = {};
    const legK = ['leftupleg', 'leftleg', 'leftfoot', 'rightupleg', 'rightleg', 'rightfoot'].map(find).filter(k => k >= 0), sd3 = new V3(), sp3 = new V3();
    const segDist = (p, a, b) => { sd3.copy(b).sub(a); const L2 = sd3.lengthSq(), t = L2 > 0 ? Math.min(1, Math.max(0, sp3.copy(p).sub(a).dot(sd3) / L2)) : 0; return sp3.copy(a).addScaledVector(sd3, t).distanceTo(p); };
    for (const k of T.order) {
      if (T.std[k] || T.roleOf[k] != null || /hand(thumb|index|middle|ring|pinky)\d$/.test(nrm[k])) continue;
      let p = T.parent[k]; while (p >= 0 && !T.std[p]) p = T.parent[p];
      if (p < 0 || nrm[p] !== 'hips') continue;
      T.ext.push(k); T.ctl[k] = true;
      let best = -1, bd = 0.12 * (y1 - y0) / 1.7;
      for (const lk of legK) { const c = child(lk), dd = c >= 0 ? segDist(wp[k], wp[lk], wp[c]) : wp[k].distanceTo(wp[lk]); if (dd < bd) { bd = dd; best = lk; } }
      if (best >= 0) { T.follow[k] = best; T.followW[k] = wp[k].z < wp[best].z - 0.02 * (y1 - y0) / 1.7 ? 0.35 : 0.7; }   // 跟腿转多少：腿后面的布（后摆）少跟
    }
    // 兵器握点：握把横过掌心（指根内侧），刃朝拇指一侧；兵器网格的 X/Y/Z 轴对应 掌心法线 / 指根→掌根 / 拇指侧
    if (T.hand.R) {
      const h = T.hand.R, bm = new M4().makeBasis(h.n, h.f.clone().negate(), h.a);
      T.holdQ = T.restW[h.hk].clone().invert().multiply(new Q4().setFromRotationMatrix(bm));
      T.holdP = wp[h.hk].clone().addScaledVector(h.f, h.len * cf.gripF).addScaledVector(h.n, cf.gripN).applyMatrix4(world[h.hk].clone().invert());
    }
    // 风动权重：离身体骨架越远的顶点（衣摆、宽袖、垂下的发梢、腰带）越“松”，着色器里按它做轻微飘动；
    // 贴着骨架的部位（脸、手、躯干、腿、靴）为 0，纹丝不动
    {
      const S = (y1 - y0) / 1.7, segs = [], handSet = {};
      for (const sd of ['L', 'R']) { const hk = T.role['hand' + sd]; if (hk == null) continue; for (let k = 0; k < nJ; k++) for (let q = k, c = 0; q >= 0 && c < 12; q = T.parent[q], c++) if (q === hk) { handSet[k] = 1; break; } }
      const rad = s => /^(hips|spine)/.test(s) ? [0.18, 1.25] : /^neck/.test(s) ? [0.085, 1] : /^head/.test(s) ? [0.14, 1] : /shoulder$/.test(s) ? [0.11, 1.3] : /forearm$/.test(s) ? [0.06, 1] : /arm$/.test(s) ? [0.07, 1]
        : /hand/.test(s) ? [0.05, 1] : /upleg$/.test(s) ? [0.105, 1] : /leg$/.test(s) ? [0.08, 1] : /(foot|toe)/.test(s) ? [0.075, 1] : null;
      for (let k = 0; k < nJ; k++) {
        const r = /^bone/.test(nrm[k]) ? null : rad(nrm[k]); if (!r) continue;
        let any = false;
        for (let c = 0; c < nJ; c++) if (T.parent[c] === k && !/^bone/.test(nrm[c])) { segs.push([wp[k], wp[c], r[0] * S, r[1]]); any = true; }
        if (!any) segs.push([wp[k], wp[k], r[0] * S, r[1]]);
      }
      const pa = new V3(), pb = new V3(), pp = new V3(), ab = new V3(), lo = 0.015 * S, hi = 0.13 * S;
      for (const p of T.prims) {
        const ps = p.geo.attributes.position.array, n = ps.length / 3, wd = new Float32Array(n);
        for (let v = 0; v < n; v++) {
          let best = Infinity;
          for (const sg of segs) {
            const zs = sg[3];
            pa.copy(sg[0]); pb.copy(sg[1]); pp.set(ps[v * 3], ps[v * 3 + 1], ps[v * 3 + 2]); pa.z *= zs; pb.z *= zs; pp.z *= zs;
            ab.copy(pb).sub(pa); const L2 = ab.lengthSq(), t = L2 > 0 ? Math.min(1, Math.max(0, pp.sub(pa).dot(ab) / L2)) : (pp.sub(pa), 0);
            const dd = pp.addScaledVector(ab, -t).length() - sg[2];
            if (dd < best) best = dd;
          }
          const x = Math.min(1, Math.max(0, (best - lo) / (hi - lo))); wd[v] = x * x * (3 - 2 * x);
        }
        // 手（掌骨及其下面所有骨头管着的顶点）：风动权重本来就是 0，借这个位置记成负数，着色器里据此把手一律按平滑法线着色——
        // 手的面数很少，按原来一块块的折面法线画，近看全是棱角
        const si = p.geo.attributes.skinIndex.array, sw = p.geo.attributes.skinWeight.array;
        if (sw instanceof Float32Array) for (let v = 0; v < n; v++) { let hw = 0; for (let q = 0; q < 4; q++) if (handSet[si[v * 4 + q]]) hw += sw[v * 4 + q]; if (hw > 0.5) wd[v] = -Math.min(1, hw); }
        p.geo.setAttribute('wind', new THREE.BufferAttribute(wd, 1));
      }
    }
    // 部位权重（按绑定姿势下的位置估计）：x = 可能露出皮肤的部位（头、颈、手臂、手），y = 可能是头发的部位（头部周围、脑后到后背）。
    // 着色器里再乘上按贴图颜色判断的结果（肤色 / 深色），两样都满足才按皮肤或头发来着色
    {
      const S = (y1 - y0) / 1.7, hd = find('head'), ht = find('headtopend'), nk = find('neck'), sk = [], pa = new V3(), ab = new V3();
      const cap = (p, a, b) => { ab.copy(b).sub(a); const L2 = ab.lengthSq(), t = L2 > 0 ? Math.min(1, Math.max(0, pa.copy(p).sub(a).dot(ab) / L2)) : 0; return pa.copy(a).addScaledVector(ab, t).distanceTo(p); };
      const fall = (d, r) => { const x = Math.min(1, Math.max(0, (r * 1.35 - d) / (r * 0.35))); return x * x * (3 - 2 * x); };
      let base = null, top = null, crown = null, skull = null;
      if (hd >= 0) {
        base = wp[hd]; top = ht >= 0 ? wp[ht] : base.clone().add(new V3(0, 0.2 * S, 0)); crown = top.clone().add(top.clone().sub(base).normalize().multiplyScalar(0.12 * S)); skull = base.clone().lerp(top, 0.55);
        sk.push([base, top, 0.135 * S]); if (nk >= 0) sk.push([wp[nk], base, 0.075 * S]);
        T.faceZ = base.z + 0.02 * S;
      }
      for (const sd of ['left', 'right']) {
        const a = find(sd + 'arm'), f = find(sd + 'forearm'), h = find(sd + 'hand');
        if (a >= 0 && f >= 0) sk.push([wp[a], wp[f], 0.07 * S]);
        if (f >= 0 && h >= 0) { sk.push([wp[f], wp[h], 0.06 * S]); sk.push([wp[h], wp[h].clone().add(wp[h].clone().sub(wp[f]).normalize().multiplyScalar(0.2 * S)), 0.065 * S]); }
      }
      const hip = wp[T.hipK], pp = new V3(), sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
      for (const p of T.prims) {
        const ps = p.geo.attributes.position.array, n = ps.length / 3, rg = new Float32Array(n * 3);
        for (let v = 0; v < n; v++) {
          pp.set(ps[v * 3], ps[v * 3 + 1], ps[v * 3 + 2]);
          let s = 0; for (const g of sk) s = Math.max(s, fall(cap(pp, g[0], g[1]), g[2]));
          let h = 0;
          if (base) {
            h = fall(cap(pp, skull, crown), 0.15 * S);   // 从颅骨中部算起，免得把肩膀和衣领也圈进来
            // 脑后垂到后背的头发：腰以上、身体中线两侧、后背表面之外
            h = Math.max(h, sm(hip.y + 0.02 * S, hip.y + 0.12 * S, pp.y) * sm(0.24 * S, 0.17 * S, Math.abs(pp.x - hip.x)) * sm(base.z - 0.045 * S, base.z - 0.085 * S, pp.z));
          }
          rg[v * 3] = s; rg[v * 3 + 1] = h; rg[v * 3 + 2] = base ? fall(cap(pp, base, top), 0.135 * S) : 0;   // z：头部（脸）
        }
        p.geo.setAttribute('reg', new THREE.BufferAttribute(rg, 3));
        // 惯性摆动的权重：垂下来的头发（头发部位里、颈根以下的那一段，越往下越松）和离骨架远的衣料（衣摆、宽袖、飘带）。
        // 人物走动、转身、点头时，着色器按它让这些部位慢半拍、再荡回来（见 poseModel 末尾的弹簧）
        const wdA = p.geo.attributes.wind.array, sy = new Float32Array(n);
        for (let v = 0; v < n; v++) { const hl = base ? rg[v * 3 + 1] * sm(base.y + 0.02 * S, base.y - 0.38 * S, ps[v * 3 + 1]) : 0; sy[v] = Math.max(0.5 * Math.max(0, wdA[v]), hl); }
        p.geo.setAttribute('sway', new THREE.BufferAttribute(sy, 1));
      }
      T.eyes = cf.eyes || null; T.lid = cf.lid || null; T.smooth = cf.smooth;
    }
    T.leg = cf.leg;
    if (!at0.tan) for (const m of T.mats) m.flipN = true;   // 没有切线时由屏幕导数推算，贴图未翻转需把法线贴图的 Y 取反
    T.y0 = y0; T.h0 = y1 - y0;
    d.bin = null; d.img = null; d.gltf = null;
    return T;
  }
  function tplOf(id) {
    if (!(id in tpls)) { const pf = G3.prof && G3.pf, t0 = pf ? pf[0]() : 0; try { tpls[id] = parse(id); if (pf) pf[1]('parse model ' + id, t0); } catch (e) { console.error('model ' + id + ': ' + (e && e.stack || e)); tpls[id] = null; raw[id] = null; } }
    return tpls[id];
  }

  // 衣物随风轻摆：蒙皮之后按 wind 权重加一个沿布料向下传播的小幅波动（最松处约 1.5 厘米），阵风强弱缓慢起伏
  // 同时做三件让人物显得“是活人”的事：
  //   皮肤：明暗交界处透出一点红（光在皮下散射）、轮廓边缘的柔光、不那么像塑料的高光；
  //   头发：沿发丝方向的两道丝状高光；
  //   眼睛：定时眨眼（眼睑从上往下盖住眼睛）和一点眼神光。眼睛的位置按角色在 CFG 里给出。
  const QSM = location.search, DBG_W = /[?&]wdbg/.test(QSM), DBG_K = /[?&]kdbg/.test(QSM), DBG_F = /[?&]fdbg/.test(QSM), NOSKIN = /[?&]skin=0/.test(QSM);
  // 头发的两道丝状高光各给多少：第一道是又细又亮的白线，第二道是宽一些、带发色的柔光。原先两道都给足（1, 1），
  // 黑发近看像掺了一缕缕白发、整片发灰；现在白线基本不要，柔光留三成。&hl=0.3,0.5：开发检视时临时改
  const HLQ = qarr('hl'), HL1 = HLQ ? HLQ[0] : 0.1, HL2 = HLQ ? (HLQ.length > 1 ? HLQ[1] : HLQ[0]) : 0.3;
  const charPatch = function (sh) {
    const ud = this.userData;
    sh.uniforms.uTime = K.U.uTime; sh.uniforms.uEyeL = ud.uEyeL; sh.uniforms.uEyeR = ud.uEyeR; sh.uniforms.uLidC = ud.uLidC; sh.uniforms.uBlink = ud.uBlink; sh.uniforms.uFaceZ = ud.uFaceZ;
    sh.vertexShader = 'attribute float wind;\nattribute float sway;\nattribute vec3 reg;\nattribute vec3 sNormal;\nuniform float uTime;\nuniform vec3 uSway;\nvarying vec3 vReg;\nvarying vec3 vRP;\nvarying vec3 vSN;\nvarying float vHand;\n' + sh.vertexShader.replace('#include <defaultnormal_vertex>', `#include <defaultnormal_vertex>
      { vec3 sN = sNormal;
        #ifdef USE_SKINNING
          sN = (skinMatrix * vec4(sN, 0.0)).xyz;
        #endif
        vSN = normalize(normalMatrix * sN); }`).replace('#include <skinning_vertex>', `vReg = reg; vRP = position; vHand = max(-wind, 0.0);
      #include <skinning_vertex>
      { float windK = max(wind, 0.0), ph = uTime * 2.1 - transformed.y * 7.0 + transformed.x * 3.0;
        float gust = 0.55 + 0.45 * sin(uTime * 0.47 + transformed.x * 1.3 + transformed.z * 0.9);
        transformed.x += windK * gust * (0.013 * sin(ph) + 0.006 * sin(ph * 2.3 + 1.7));
        transformed.z += windK * gust * 0.009 * cos(ph * 0.83 + transformed.z * 5.0);
        // 垂发与衣摆：一阵阵很慢的微风，加上人物动作带出来的惯性摆动
        float ph2 = uTime * 1.05 - transformed.y * 3.6 + transformed.z * 2.0;
        transformed.x += sway * gust * 0.011 * sin(ph2);
        transformed.z += sway * gust * 0.007 * cos(ph2 * 0.77 + 1.3);
        // 往身体里摆的那一半只给三成半：背后的头发往前荡、前襟往后荡时，不至于穿进身体里
        vec3 dS = uSway * sway; vec2 ro = transformed.xz - vec2(0.0, 0.04); float rl = length(ro);
        if (rl > 0.001) { float inw = dot(dS.xz, ro / rl); if (inw < 0.0) dS.xz -= (ro / rl) * inw * 0.65; }
        transformed += dS; }`);
    sh.uniforms.uSmooth = ud.uSmooth; sh.uniforms.uRim = ud.uRim; sh.uniforms.uSway = ud.uSway;
    let fs = 'varying vec3 vReg;\nvarying vec3 vRP;\nvarying vec3 vSN;\nvarying float vHand;\nuniform vec2 uSmooth;\nuniform float uRim;\nuniform vec4 uEyeL;\nuniform vec4 uEyeR;\nuniform vec3 uLidC;\nuniform float uBlink;\nuniform float uFaceZ;\n' + sh.fragmentShader;
    fs = fs.replace('#include <map_fragment>', `#include <map_fragment>
      float eyeOpen = 0.0; vec2 eyeP = vec2(1.0);
      if (uEyeL.z > 0.0 && vRP.z > uFaceZ) {
        vec4 E = vRP.x > 0.0 ? uEyeL : uEyeR; eyeP = vRP.xy - E.xy;
        vec2 eq = eyeP / E.zw; float ee = dot(eq, eq);
        if (ee < 1.0) {
          // 眼睑的下缘：睁眼时贴着眼眶上沿，闭眼时落到眼眶下沿稍上方，是一条向下弯的弧线，弧线上画睫毛
          float arc = sqrt(max(1.0 - eq.x * eq.x, 0.0)), lid = mix(arc, -0.72 * arc, uBlink), edge = smoothstep(1.0, 0.6, ee), on = step(0.02, uBlink);
          if (eq.y > lid) {
            float lash = smoothstep(0.26, 0.04, eq.y - lid) * (1.0 - eq.x * eq.x * eq.x * eq.x);
            diffuseColor.rgb = mix(diffuseColor.rgb, mix(uLidC * (0.9 + 0.1 * smoothstep(0.0, 1.2, eq.y - lid)), vec3(0.03, 0.02, 0.02), lash), max(edge, lash) * on);
          } else eyeOpen = edge;
        }
      }
      vec3 bc = diffuseColor.rgb; float bmx = max(bc.r, max(bc.g, bc.b)), bmn = min(bc.r, min(bc.g, bc.b));
      float bsat = (bmx - bmn) / max(bmx, 0.0001), bhr = (bc.g - bc.b) / max(bc.r - bc.b, 0.0001);
      float skinK = vReg.x * step(bc.g, bc.r) * smoothstep(0.2, 0.36, bmx) * smoothstep(0.06, 0.14, bsat) * smoothstep(0.84, 0.7, bsat) * smoothstep(0.08, 0.2, bhr) * smoothstep(0.78, 0.58, bhr) * (1.0 - eyeOpen);
      float hairK = vReg.y * smoothstep(0.2, 0.07, bmx) * smoothstep(0.86, 0.7, bsat) * step(bc.b, bc.r + 0.004) * step(bc.g, bc.r * 1.12 + 0.004) * (1.0 - eyeOpen);   // 深色且偏中性或偏暖：排除深蓝、深绿、深红的衣料
      ${NOSKIN ? 'skinK = 0.0; hairK = 0.0; eyeOpen = 0.0;' : ''}
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.04, 0.97, 0.93), skinK);`);
    fs = fs.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(mix(mix(roughnessFactor, 0.5, skinK * 0.85), 0.8, hairK * 0.6), 0.22, eyeOpen);   // 头发本身调粗糙，免得整片反射天光发灰；光泽由下面的丝状高光给');
    fs = fs.replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor *= 1.0 - max(max(skinK, hairK), eyeOpen);');
    // 法线：模型自带的是一块块折面的法线，靠法线贴图去补，补不干净的地方就露出棱角。这里把它和重新算出的平滑法线混合：
    // 脸和皮肤几乎全用平滑法线，头发居中，衣料保留较多贴图细节（刺绣、褶皱）
    if (SMOOTH_N) fs = fs.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      normal = normalize(mix(normal, normalize(vSN), max(max(max(skinK, vReg.z) * (1.0 - hairK) * uSmooth.x, uSmooth.y), vHand * 0.92)));`);
    fs = fs.replace('#include <output_fragment>', `{
        vec3 Vv = normalize(vViewPosition), Ld = vec3(0.0, 1.0, 0.0), Lc = vec3(0.0); float shd = 1.0;
        #if NUM_DIR_LIGHTS > 0
          Ld = directionalLights[0].direction; Lc = directionalLights[0].color * RECIPROCAL_PI;
          #if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
            shd = receiveShadow ? getShadow(directionalShadowMap[0], directionalLightShadows[0].shadowMapSize, directionalLightShadows[0].shadowBias, directionalLightShadows[0].shadowRadius, vDirectionalShadowCoord[0]) : 1.0;
          #endif
        #endif
        float ndl = dot(normal, Ld), ndv = saturate(dot(normal, Vv));
        float band = smoothstep(-0.5, 0.2, ndl) * (1.0 - smoothstep(0.05, 0.6, ndl));
        outgoingLight += skinK * diffuseColor.rgb * Lc * vec3(1.0, 0.3, 0.16) * band * 0.3 * (0.4 + 0.6 * shd);
        outgoingLight += skinK * pow(1.0 - ndv, 3.0) * 0.12 * (reflectedLight.indirectDiffuse + reflectedLight.directDiffuse * 0.4);
        if (hairK > 0.01) {
          vec3 upV = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz), Tn = normalize(upV - normal * dot(upV, normal) + vec3(0.0001)), Hh = normalize(Ld + Vv);
          float sh0 = (dot(bc, vec3(0.333)) - 0.04) * 3.0;
          float t1 = dot(normalize(Tn + normal * (0.06 + sh0)), Hh), t2 = dot(normalize(Tn + normal * (-0.16 + sh0)), Hh);
          float s1 = pow(max(1.0 - t1 * t1, 0.0), 110.0), s2 = pow(max(1.0 - t2 * t2, 0.0), 28.0);
          outgoingLight += hairK * Lc * shd * smoothstep(0.0, 0.6, ndl) * (vec3(0.07) * s1 * ${HL1.toFixed(3)} + (bc * 1.6 + vec3(0.006, 0.004, 0.003)) * s2 * ${HL2.toFixed(3)});
        }
        outgoingLight += eyeOpen * smoothstep(0.0017, 0.0008, length(eyeP - vec2(0.0022, 0.002))) * (Lc * (0.3 + 0.7 * shd) * 0.5 + vec3(0.12));
        // 展示用的影棚光（uRim > 0 时）：沿轮廓的一圈冷色边光，两侧最亮，把人物从背景里勾出来；外加一点正面的暖色补光
        if (uRim > 0.0) {
          float rimF = pow(1.0 - ndv, 2.6) * (0.3 + 0.7 * smoothstep(0.15, 0.8, abs(normal.x))) * smoothstep(-0.6, 0.2, normal.y);
          // 边光只按衣料和皮肤自身的颜色提亮（不掺白），并且背光一侧减半，免得轮廓泛出一圈白边
          outgoingLight += uRim * rimF * rimF * diffuseColor.rgb * vec3(1.0, 1.02, 1.08) * 1.1 * (0.5 + 0.5 * smoothstep(-0.3, 0.4, ndl));
          outgoingLight += uRim * diffuseColor.rgb * vec3(1.0, 0.95, 0.88) * 0.07 * saturate(normal.z + 0.3);
        }
      }
      #include <output_fragment>
      ${DBG_K ? 'gl_FragColor.rgb = mix(mix(gl_FragColor.rgb, vec3(1.0, 0.0, 0.0), skinK), vec3(0.0, 1.0, 0.0), hairK);' : ''}
      ${DBG_W ? '' : ''}
      ${DBG_F ? `{ vec2 g1 = abs(fract(vRP.xy * 100.0 + 0.5) - 0.5) / fwidth(vRP.xy * 100.0), g5 = abs(fract(vRP.xy * 20.0 + 0.5) - 0.5) / fwidth(vRP.xy * 20.0);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0, 1.0, 0.0), (1.0 - min(min(g1.x, g1.y), 1.0)) * 0.45);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0, 0.0, 0.0), 1.0 - min(min(g5.x, g5.y), 1.0));
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.0, 1.0, 1.0), 1.0 - min(abs(vRP.y - 1.6) / fwidth(vRP.y) * 0.5, 1.0)); }` : ''}`);
    if (DBG_W) {   // 开发检视：把风动权重涂成红色
      sh.vertexShader = sh.vertexShader.replace('uniform float uTime;', 'uniform float uTime;\nvarying float vWind;').replace('#include <skinning_vertex>', 'vWind = wind;\n#include <skinning_vertex>');
      fs = 'varying float vWind;\n' + fs.replace('#include <dithering_fragment>', 'gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0, 0.0, 0.0), vWind);\n#include <dithering_fragment>');
    }
    sh.fragmentShader = fs;
  };

  /* ---------- 4K 贴图：只在近看时用（标题页、镜头拉近），用到时才下载，20 秒没人用就从显存里释放 ---------- */
  const NOHI = /[?&]hi=0/.test(location.search);
  function loadHi(T) {
    const id = T.id; T.hi = { ready: false, map: null, normalMap: null };
    const build = d => {
      if (!d) return;
      let left = 0;
      for (const role of ['map', 'normalMap']) {
        const e = d.roles && d.img[d.roles[role]]; if (!e) continue;
        const im = new Image(), t = new THREE.Texture(im), url = URL.createObjectURL(new Blob([d.bin.slice(e[0], e[0] + e[1])], { type: e[2] }));
        t.flipY = false; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = Math.min(8, K.R.capabilities.getMaxAnisotropy()); if (role === 'map') t.encoding = THREE.sRGBEncoding;
        const up = () => { t.needsUpdate = true; if (--left === 0) T.hi.ready = true; };
        left++; im.onload = () => { URL.revokeObjectURL(url); decodeThen(im, up); }; im.onerror = () => { URL.revokeObjectURL(url); T.hi[role] = null; if (--left === 0) T.hi.ready = !!T.hi.map; };
        im.src = url; T.hi[role] = t;
      }
      rawHi[id] = null;
    };
    loadScript('models/hi/' + id + '.g3m.js?v=' + IDX.hi[id]).then(() => { if (rawHi[id]) build(rawHi[id]); });
  }
  K.setHiTex = (ch, on) => {
    const R = ch && ch.rig; if (!R) return;
    const T = R.T; if (NOHI || !IDX.hi || !IDX.hi[T.id] || K.R.capabilities.maxTextureSize < 4096) return;
    const now = performance.now();
    if (on && G3.quality() === 'fast') on = false;
    if (on) { T.hiUse = now; if (!T.hi) loadHi(T); }
    else if (T.hi && T.hi.live && now - (T.hiUse || 0) > 90000) { if (T.hi.map) T.hi.map.dispose(); if (T.hi.normalMap) T.hi.normalMap.dispose(); T.hi.live = false; }
    const use = !!(on && T.hi && T.hi.ready);
    if (use) T.hi.live = true;
    if (R.hiOn === use) return;
    R.hiOn = use;
    for (const m of R.texMats) { const u = m.userData; m.map = use && T.hi.map && u.map0 ? T.hi.map : u.map0; m.normalMap = use && T.hi.normalMap && u.nm0 ? T.hi.normalMap : u.nm0; }
  };

  /* ---------- 实例化 ---------- */
  K.mkModel = (L, hi) => {
    const id = idOf(L), T = id && tplOf(id);
    if (!T) return null;
    if (!dims[id]) { const c = K.procHuman(L, false); dims[id] = { h: c.h, hy: c.hy }; K.kill(c); }   // 身高与程序人物一致
    const g = new THREE.Group(), root = new THREE.Group(), inner = new THREE.Group(); g.add(root); root.add(inner);
    const s = dims[id].h / T.h0; inner.scale.setScalar(s); inner.position.y = -T.y0 * s;
    const bones = [];
    for (let k = 0; k < T.n; k++) { const b = new THREE.Bone(); b.name = T.name[k]; b.position.copy(T.pos[k]); b.quaternion.copy(T.quat[k]); b.scale.copy(T.scl[k]); bones.push(b); }
    for (let k = 0; k < T.n; k++) (T.parent[k] < 0 ? inner : bones[T.parent[k]]).add(bones[k]);
    const skel = new THREE.Skeleton(bones, T.ibm.slice()), mats = [], lit = [], meshes = [];
    // 眼睛：[左眼x, 左眼y, 右眼x, 右眼y, 半宽, 半高]（绑定姿势下的米制坐标），没有配置的角色不眨眼
    const E = T.eyes, lc = T.lid ? K.lin(T.lid) : [0.6, 0.4, 0.3];
    const eyeU = { uEyeL: { value: new THREE.Vector4(E ? E[0] : 0, E ? E[1] : 0, E ? E[4] : 0, E ? E[5] : 0) }, uEyeR: { value: new THREE.Vector4(E ? E[2] : 0, E ? E[3] : 0, E ? E[4] : 0, E ? E[5] : 0) },
      uLidC: { value: new V3(lc[0], lc[1], lc[2]) }, uBlink: { value: 0 }, uFaceZ: { value: T.faceZ || 0 }, uRim: { value: 0 }, uSway: { value: new V3() },
      uSmooth: { value: new THREE.Vector2(FK != null ? FK : T.smooth[0], SNKQ != null ? SNKQ : T.smooth[1]) } };   // 平滑法线的比例：[脸与皮肤, 其余部位]
    const mm = T.mats.map(m => {
      const mt = new THREE.MeshStandardMaterial({ map: m.map, normalMap: NO_NM ? null : m.normalMap, roughnessMap: m.mr, metalnessMap: m.mr, roughness: m.rough, metalness: m.mr ? m.metal : Math.min(m.metal, 0.2) });
      mt.color.setRGB(m.color[0], m.color[1], m.color[2]); if (m.flipN) mt.normalScale.y = -1; mats.push(mt); lit.push(mt);
      Object.assign(mt.userData, eyeU); mt.userData.map0 = mt.map; mt.userData.nm0 = mt.normalMap;
      mt.onBeforeCompile = charPatch; mt.customProgramCacheKey = () => 'g3model-char';
      return mt;
    });
    let fb = null;
    for (const p of T.prims) {
      const mt = p.mat >= 0 ? mm[p.mat] : (fb || (fb = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8 }), mats.push(fb), lit.push(fb), fb));
      const me = new THREE.SkinnedMesh(p.geo, mt); me.castShadow = true; me.receiveShadow = true; me.frustumCulled = false;
      inner.add(me); me.bind(skel, new M4()); meshes.push(me);
    }
    const hasWp = L.wp && L.wp !== 'none';
    const ch = { kind: 'human', glb: true, g, root, mat: mats[0], mats, lit, rim: eyeU.uRim, h: dims[id].h, hy: dims[id].hy, A: null, nowp: !hasWp, staff: L.wp === 'staff', skel, meshes,
      rig: { T, bones, inner, W: bones.map(() => new Q4()), hold: null, blink: E ? eyeU.uBlink : null, sway: eyeU.uSway.value, texMats: mm, hiOn: false } };
    // 兵器挂在右手：朝向跟随“虚拟前臂”，与程序人物握法一致
    const hk = T.role.handR;
    if (hasWp && hk != null) {
      const wm = K.stdMat({ rim: true }), w = new THREE.Mesh(K.mkWeapon(L), wm), hold = new THREE.Group();
      w.castShadow = true; hold.add(w); hold.scale.setScalar(1 / T.ws); bones[hk].add(hold);
      ch.rig.hold = hold; mats.push(wm); lit.push(wm);
      if (T.holdQ) { hold.quaternion.copy(T.holdQ); hold.position.copy(T.holdP); } else ch.rig.holdDyn = true;   // 有手指骨骼：兵器固定在握拢的掌心里
    }
    // 手指：持兵器的右手握拢，其余自然微屈
    for (const sd of ['L', 'R']) {
      const h = T.hand[sd], grip = sd === 'R' && hasWp;
      if (h) for (const jt of h.joints) {
        const tb = jt.fg === 'thumb', set = h.coarse ? (grip ? (tb ? CGT || CURL.cGripT : CG || CURL.cGrip) : (tb ? CURL.cRelaxT : CR || CURL.cRelax)) : CURL[(grip ? 'grip' : 'relax') + (tb ? 'T' : '')];
        const ang = set[jt.j - 1] * (CURLK != null ? CURLK : 1), rw = T.restW[jt.k];   // &curl=0：开发检视，手指不弯
        bones[jt.k].quaternion.copy(T.restL[jt.k]).multiply(q1.copy(rw).invert()).multiply(q2.setFromAxisAngle(jt.ax, ang)).multiply(rw);
      }
    }
    K.poseModel(ch, REST);
    return ch;
  };

  /* ---------- 动作：把 animate() 的参数（与程序人物相同）换算成各骨骼的目标朝向 ---------- */
  const X = new V3(1, 0, 0), Yax = new V3(0, 1, 0), Zax = new V3(0, 0, 1), eu = new THREE.Euler(), q1 = new Q4(), q2 = new Q4(), v1 = new V3();
  const G = {}; for (const r of ROLES) G[r[0]] = new Q4();
  const REST = { aL: 0.04, aR: 0.04, aLz: 0.07, aRz: -0.07, eL: -0.22, eR: -0.22, lL: 0, lR: 0, kL: 0, kR: 0, lean: 0, tw: 0, y: 0, rx: 0, hx: 0, hy: 0, z: 0, tR: 0, wR: 0, hR: 0 };
  const GRIP = new V3(0, -0.085, 0.03);
  /* ---------- 动捕片段：models/anim/<来源角色>_<名称>.js ---------- */
  const FPS = 30, FADE = 0.2, WALK_RATE = 1.15;
  // 游戏里的动作 → [片段文件, 片段名]。没列出的动作（施法、防御、受击、倒地等）仍用上面的公式姿势
  const ACT = {
    stand: ['hero_trial', 'idle'], mvwalk: ['hero_trial', 'casual_walk'], mvjog: ['hero_run', 'run_02'], mvrun: ['hero_run', 'runfast'], mvquick: ['hero_walk2', 'quick_walk'],   // 这一行只供开发检视（?shot=clip:mvjog）
    slash: ['hero_trial', 'right_hand_sword_slash'], thrust: ['hero_act2', 'thrust_slash'], heavy: ['hero_act2', 'charged_slash'], push: ['hero_act2', 'charged_spell_cast_1'],
    hit: ['hero_act2', 'hit_reaction'], dead: ['hero_act2', 'dying_backwards'], cast: ['hero_act2', 'mage_soell_cast'], guard: ['hero_act2', 'sword_parry'],
    // 战斗：架势、连招、重击、闪避、击飞、起身
    stance: ['hero_bat1', 'combat_stance'], combo2: ['hero_bat1', 'double_combo_attack'], combo3: ['hero_bat1', 'triple_combo_attack'], lslash: ['hero_bat1', 'left_slash'],
    upslash: ['hero_bat1', 'charged_upward_slash'], judge: ['hero_bat1', 'sword_judgment'], spin: ['hero_bat1', 'double_blade_spin'],
    hammer: ['hero_bat2', 'heavy_hammer_swing'], slam: ['hero_bat2', 'charged_ground_slam'], spell: ['hero_bat2', 'charged_spell_cast'], dodge: ['hero_bat2', 'stand_dodge'],
    flyup: ['hero_bat2', 'behit_flyup'], shout: ['hero_bat2', 'sword_shout'], getup: ['hero_bat2', 'stand_up1'],
    // 剧情：行礼、交谈、倾听、蹲身放物、盘坐、饮酒、单膝跪地、缓步、推开
    bow: ['hero_story1', 'formal_bow'], chat: ['hero_story1', 'stand_and_chat'], talk: ['hero_story1', 'talk_with_hands_open'], listen: ['hero_story1', 'listening_gesture'],
    place: ['hero_story1', 'female_crouch_pick_up_place_side'], sit: ['hero_story1', 'sit_cross_legged_on_floor'], drink: ['hero_story1', 'stand_and_drink'],
    kneel: ['hero_story1', 'kneel_on_one_knee_and_stand'], slowwalk: ['hero_story1', 'thoughtful_walk'], shove: ['hero_story1', 'step_forward_and_push']
  };
  // 招式 → 出招片段（没列出的招式按兵器用默认的一招）
  const SKILL_ACT = { h1: 'lslash', h2: 'combo3', h4: 'upslash', h5: 'heavy', h6: 'spin', h7: 'thrust', hU: 'judge',
    s1: 'thrust', s2: 'spin', s4: 'thrust', s5: 'combo2', sU: 'combo3', b6: 'spell',
    t1: 'heavy', t3: 'lslash', t4: 'hammer', tU: 'slam',
    // 敌方（有模型的人形角色）
    e_shadow: 'thrust', k_whirl: 'spin', k_smash: 'hammer', c_hell: 'spell', c_palm: 'slam', l_dance: 'spin', l_pierce: 'thrust',
    y_burn: 'spell', y_sword: 'judge', y_soul: 'spell', j_cut: 'thrust', j_rain: 'upslash', x_ash: 'spell', x_seal: 'spell', p_fan: 'spell', p_charm: 'spell' };
  // 出招用哪个片段：先按角色，再按兵器
  const ATTACK_ID = { su: 'thrust' }, ATTACK_WP = { sword: 'slash', saber: 'heavy', dagger: 'thrust', staff: 'heavy', fan: 'push', none: 'push' };
  // 行进动作有快有慢：每帧按角色的实际移动速度挑最接近的一个，再微调播放速度让步频对上
  const MOVE = [['hero_trial', 'casual_walk'], ['hero_walk2', 'quick_walk'], ['hero_run', 'run_02'], ['hero_run', 'runfast']];
  const HITS = { sword_judgment: [1.5] };   // 自动找出的出手时刻不对时，在这里按片段名手工指定（秒）
  const animFiles = {};
  function sampleQ(tr, t, out) {
    const ti = tr.ti, v = tr.v, n = ti.length; let i = tr.c || 0;
    if (ti[i] > t) i = 0;
    while (i < n - 2 && ti[i + 1] <= t) i++;
    tr.c = i;
    const j = Math.min(n - 1, i + 1), u = ti[j] > ti[i] ? Math.min(1, Math.max(0, (t - ti[i]) / (ti[j] - ti[i]))) : 0;
    out.set(v[i * 4], v[i * 4 + 1], v[i * 4 + 2], v[i * 4 + 3]);
    if (u > 0 && !tr.step) out.slerp(q2.set(v[j * 4], v[j * 4 + 1], v[j * 4 + 2], v[j * 4 + 3]), u);
    return out;
  }
  function parseAnim(file) {
    const d = rawAnim[file], Ts = d && tplOf(file.split('_')[0]);
    if (!Ts) return null;
    const g = d.gltf, acc = mkAcc(g, d, d.bin), par = {}, kOf = {};
    g.nodes.forEach((n, i) => { for (const c of n.children || []) par[c] = i; const k = Ts.name.indexOf(n.name); if (k >= 0) kOf[i] = k; });
    // 根骨之上的非骨骼节点（如把 Z 轴朝上转成 Y 轴朝上的骨架节点）的变换
    const pre = new M4(), tm = new M4(), chain = [];
    let rn = -1; g.nodes.forEach((n, i) => { if (kOf[i] != null && Ts.parent[kOf[i]] < 0) rn = i; });
    for (let p = par[rn]; p != null; p = par[p]) chain.unshift(p);
    for (const i of chain) { const n = g.nodes[i]; if (n.matrix) tm.fromArray(n.matrix); else tm.compose(new V3().fromArray(n.translation || [0, 0, 0]), new Q4().fromArray(n.rotation || [0, 0, 0, 1]), new V3().fromArray(n.scale || [1, 1, 1])); pre.multiply(tm); }
    const preQ = new Q4(); pre.decompose(new V3(), preQ, new V3());
    const have = i => !!d.bv[g.accessors[i].bufferView], out = {}, Wa = Ts.order.map(() => new Q4()), loc = new Q4(), qa = new Q4(), qb = new Q4(), pv = new V3(), fk = Ts.role.foreR;
    const Pa = Ts.order.map(() => new V3()), lf = Ts.nrm.indexOf('leftfoot'), rf = Ts.nrm.indexOf('rightfoot');
    for (const a of g.animations || []) {
      const rot = {}; let trk = null, dur = 0;
      for (const c of a.channels) {
        const k = kOf[c.target.node], s = a.samplers[c.sampler];
        if (k == null || !have(s.input) || !have(s.output)) continue;
        const tr = { ti: acc(s.input).arr, v: acc(s.output).arr, step: s.interpolation === 'STEP' };
        if (c.target.path === 'rotation') { rot[k] = tr; dur = Math.max(dur, tr.ti[tr.ti.length - 1]); } else if (c.target.path === 'translation' && k === Ts.hipK) trk = tr;
      }
      if (dur <= 0) continue;
      const N = Math.max(2, Math.round(dur * FPS) + 1), D = {}, pos = new Float32Array(N * 3);
      Ts.std.forEach(s => { if (s) D[s] = new Float32Array(N * 4); });
      let peak = 0, hit = dur * 0.5, pzL = 0, pzR = 0, vs = 0, vn = 0; const ws = new Float32Array(N);
      for (let f = 0; f < N; f++) {
        const t = Math.min(dur, f / FPS);
        pv.set(0, 0, 0);
        if (trk) {   // 髋部位置：相对绑定姿势的偏移，按髋高归一，换到别的身高时等比缩放
          const ti = trk.ti, n = ti.length; let i = 0; while (i < n - 2 && ti[i + 1] <= t) i++;
          const j = Math.min(n - 1, i + 1), u = ti[j] > ti[i] ? Math.min(1, Math.max(0, (t - ti[i]) / (ti[j] - ti[i]))) : 0;
          pv.set(trk.v[i * 3] + (trk.v[j * 3] - trk.v[i * 3]) * u, trk.v[i * 3 + 1] + (trk.v[j * 3 + 1] - trk.v[i * 3 + 1]) * u, trk.v[i * 3 + 2] + (trk.v[j * 3 + 2] - trk.v[i * 3 + 2]) * u).applyMatrix4(pre).sub(Ts.wp[Ts.hipK]);
          pos[f * 3] = pv.x / Ts.hipH; pos[f * 3 + 1] = pv.y / Ts.hipH; pos[f * 3 + 2] = pv.z / Ts.hipH;
        }
        for (const k of Ts.order) {
          const p = Ts.parent[k];
          if (rot[k]) { sampleQ(rot[k], t, loc); if (p < 0) Wa[k].copy(preQ).multiply(loc); else Wa[k].copy(Wa[p]).multiply(loc); }
          else if (p < 0) Wa[k].copy(Ts.restW[k]); else Wa[k].copy(Wa[p]).multiply(Ts.restL[k]);
          if (p < 0) Pa[k].copy(Ts.wp[k]).add(pv); else Pa[k].copy(Ts.pos[k]).multiplyScalar(Ts.ws).applyQuaternion(Wa[p]).add(Pa[p]);   // 关节位置，用来量脚步
          const s = Ts.std[k];
          if (s) { qa.copy(Wa[k]).multiply(qb.copy(Ts.canonW[k]).invert()); D[s][f * 4] = qa.x; D[s][f * 4 + 1] = qa.y; D[s][f * 4 + 2] = qa.z; D[s][f * 4 + 3] = qa.w; }
        }
        // 原地踏步的片段：着地的那只脚相对身体向后滑的速度，就是这段步伐对应的行进速度
        if (lf >= 0 && rf >= 0) {
          const L = Pa[lf], Rr = Pa[rf];
          if (f > 0) { const vz = (L.y < Rr.y ? L.z - pzL : Rr.z - pzR) * FPS; if (vz < 0) { vs -= vz; vn++; } }
          pzL = L.z; pzR = Rr.z;
        }
        if (fk != null && Ts.std[fk] && f > 0) { const w = 1 - Math.abs(qb.fromArray(D[Ts.std[fk]], (f - 1) * 4).dot(qa.fromArray(D[Ts.std[fk]], f * 4))); ws[f] = w; if (w > peak) { peak = w; hit = t; } }   // 右前臂转得最快的一刻 ≈ 击中
      }
      // 去掉水平方向的整体位移（走路片段原地踏步，位移由游戏逻辑负责），首尾对齐便于循环
      const dx = pos[(N - 1) * 3] - pos[0], dz = pos[(N - 1) * 3 + 2] - pos[2], x0 = pos[0], z0 = pos[2];
      const speed = vn > N * 0.3 ? vs / vn / Ts.hipH : 0;   // 每秒走多少个“髋高”
      if (/[?&]adbg/.test(location.search)) {
        const hd = s => { const o = []; for (let f = 0; f < N; f += Math.max(1, Math.floor(N / 12))) { pv.set(0, 0, 1).applyQuaternion(qa.fromArray(D[s], f * 4)); o.push((f / FPS).toFixed(2) + ':' + Math.round(Math.atan2(pv.x, pv.z) * 57.3)); } return o.join(' '); };
        setTimeout(() => console.warn('CLIP ' + a.name + ' dur=' + dur.toFixed(2) + ' hit=' + hit.toFixed(2) + ' speed=' + speed.toFixed(3) + ' (' + vn + '/' + N + ') hipsYaw ' + hd('hips') + ' | chestYaw ' + hd('spine2')), 300);
      }
      for (let f = 0; f < N; f++) { pos[f * 3] -= x0 + dx * f / (N - 1); pos[f * 3 + 2] -= z0 + dz * f / (N - 1); }
      const nm = a.name.toLowerCase().replace(/^.*?\|/, '').replace(/\|.*$/, '');   // 新导出的片段名带前后缀：Armature|Quick_Walk|baselayer
      // 连招里的每一击：右前臂转速的各个峰值（相隔不到 0.4 秒的并作一击，留较强的那个）
      const hits = [], sm = new Float32Array(N); let mx = 0;
      for (let i = 0; i < N; i++) { sm[i] = (ws[i - 2] || 0) * 0.1 + (ws[i - 1] || 0) * 0.2 + ws[i] * 0.4 + (ws[i + 1] || 0) * 0.2 + (ws[i + 2] || 0) * 0.1; if (sm[i] > mx) mx = sm[i]; }
      for (let i = 2; i < N - 2; i++) if (sm[i] > mx * 0.4 && sm[i] >= sm[i - 1] && sm[i] > sm[i + 1]) {
        const tt = i / FPS, L = hits.length - 1;
        if (L >= 0 && tt - hits[L] < 0.4) { if (sm[i] > sm[Math.round(hits[L] * FPS)]) hits[L] = tt; } else hits.push(tt);
      }
      if (HITS[nm]) { hits.length = 0; for (const v of HITS[nm]) hits.push(v); hit = HITS[nm][HITS[nm].length > 1 ? 0 : 0]; }
      if (/[?&]adbg/.test(location.search)) setTimeout(() => console.warn('HITS ' + a.name + ' ' + hits.map(v => v.toFixed(2)).join(' ')), 320);
      out[nm] = { name: file + '/' + nm, dur, N, D, pos, hit, hits, speed };
    }
    d.bin = null; d.gltf = null;
    return out;
  }
  let clipSet;
  function clips() {
    if (clipSet !== undefined) return clipSet;
    clipSet = null;
    try {
      const C = {}; let any = false;
      const get = a => { const f = a[0]; if (!(f in animFiles)) animFiles[f] = rawAnim[f] ? parseAnim(f) : null; return (animFiles[f] && animFiles[f][a[1]]) || null; };
      for (const act in ACT) { const c = get(ACT[act]); if (c) { C[act] = c; any = true; } }
      C.move = MOVE.map(get).filter(c => c && c.speed > 0).sort((a, b) => a.speed - b.speed);
      C.stroll = C.move.filter(c => !/run/.test(c.name));   // 走的那几段（漫步、快走），不含跑
      if (C.move.length) { C.walk = C.move[0]; any = true; }
      if (any) clipSet = C;
    } catch (e) { console.error('anim: ' + (e && e.stack || e)); }
    return clipSet;
  }
  const smooth = x => x * x * (3 - 2 * x), lerp = (a, b, t) => a + (b - a) * t;
  // 供战斗和剧情编排查询：某个片段多长、哪一刻击中；某招式该用哪个片段
  K.clipInfo = key => { const C = clips(), c = C && C[key]; return c ? { dur: c.dur, hit: c.hit, hits: c.hits } : null; };
  K.skillAct = id => SKILL_ACT[id] || (SKILLS[id] && SKILLS[id].act) || null;   // 对手的大招在数据里自带动作名（ENEMY_ULTS 的 act）

  // o：{ pose, walk, dt, t, swing }。有对应片段的动作播放动捕，其余用公式姿势；两者之间、片段之间都做交叉淡化
  const BIND_ONLY = /[?&]bind=1/.test(location.search);   // 开发检视：不摆任何姿势，看模型绑定时的原样
  const q3 = new Q4(), q4 = new Q4(), v2 = new V3();
  // 男子用快走动作时，各部位的拧转（绕竖轴）、左右摆（绕前后轴）各留几成：[拧转, 左右摆]；头颈不动
  const MASC = {}, MASC_ON = !/[?&]masc=0/.test(location.search);
  // 这些比例是照着“漫步”那段（看着自然的男子步态）量出来调的（?test=13）：两脚左右相距九厘米上下、骨盆左右倾七八度、拧七度、
  // 两肩拧十五度上下。腿的左右摆不能收太多——模型绑定时两腿是分开站的，全收掉两脚会叉开三十厘米；肩（锁骨）的拧转是“扭”的主要来源
  // 大地图上主角的头抬到多高（弧度）。模型里他本来就是平视，可镜头在斜上方，只看得见头顶，像低着头；朝镜头略抬一些才“看起来”平视。
  // &headup=0.3 可以临时换个角度比较
  const HEAD_UP = +((/[?&]headup=([\d.]+)/.exec(location.search) || [])[1] || 0.28);
  const MK = { hips: [0.6, 0.45], spine: [0.45, 0.6], shoulder: [0.38, 0.6], forearm: [0.8, 0.7], arm: [0.8, 0.6], hand: [0.7, 0.6], upleg: [0.7, 0.86], leg: [0.7, 0.86], foot: [0.7, 0.8], head: [0.7, 0.4], shift: 1.6 };
  { const m = /[?&]mk=([^&]+)/.exec(location.search); if (m) for (const kv of m[1].split(';')) { const p = kv.split(':'); MK[p[0]] = p.length > 2 ? [+p[1], +p[2]] : +p[1]; } }   // &mk=upleg:0.6:0.6;shift:0.5：开发检视，临时改某个部位的比例
  const mascK = s => /^hips/.test(s) ? MK.hips : /^spine/.test(s) ? MK.spine : /shoulder$/.test(s) ? MK.shoulder : /forearm$/.test(s) ? MK.forearm : /arm$/.test(s) ? MK.arm : /hand$/.test(s) ? MK.hand
    : /upleg$/.test(s) ? MK.upleg : /leg$/.test(s) ? MK.leg : /(foot|toebase)$/.test(s) ? MK.foot : /^(neck|head)/.test(s) ? MK.head : 0;
  K.poseModel = (ch, A, o) => {
    if (BIND_ONLY) return;
    const R = ch.rig, T = R.T, W = R.W, B = R.bones, C = o ? clips() : null;
    let clip = null, ct = 0, st = null, calmK = 0;
    if (C) {
      st = R.st || (R.st = { key: '', fade: 1, lt: (ch.seed || 0) * 0.9, shot: null, last: '', lk: 0, snap: B.map(() => new Q4()), out: B.map(() => new Q4()), po: new V3(), ps: new V3(), ro: [0, 0, 0], rs: [0, 0, 0] });
      const dt = o.dt || 0, pose = o.pose || 'idle', pk = pose + (o.act ? ':' + o.act : '');
      // 一次性动作：姿势一变就触发，从 t 播到 end。keep：姿势还没变回去时停在 end 上等着；loop：姿势保持期间循环；hold：停在最后一帧（倒地）
      if (pk !== st.last) {
        const first = !st.key, own = o.act && C[o.act], atk = (pose === 'attack' && own) || C[ATTACK_ID[T.id] || ATTACK_WP[(ch.look && ch.look.wp) || 'none'] || 'slash'] || C.slash;
        // 游戏的出招很短：从击中前不久切入（lead 秒），收势播完为止；指定了 from 的连招从那一刻起整段播放
        if (pose === 'attack' && atk) st.shot = { c: atk, t: o.from != null ? o.from : Math.max(0, atk.hit - (o.lead != null ? o.lead : 0.22)), end: Math.min(atk.dur - FADE, o.from != null ? atk.dur : atk.hit + 0.9) };
        // 通用表演：act 指定片段；loop 循环，否则播完停在最后一帧
        else if (pose === 'act' && own) { const e2 = Math.min(own.dur, o.to || own.dur); st.shot = { c: own, t: first && !o.loop ? e2 : (o.from || 0), end: e2, loop: o.loop ? 'act' : null, hold: o.loop ? null : 'act', t0: o.from || 0 }; }
        else if (pose === 'dodge' && C.dodge) st.shot = { c: C.dodge, t: 0.05, end: Math.min(C.dodge.dur - FADE, 1.0), keep: 'dodge' };
        else if (pose === 'victory' && C.shout) st.shot = { c: C.shout, t: 0, end: C.shout.dur - FADE, hold: 'victory' };
        else if (pose === 'hit' && C.hit) st.shot = { c: C.hit, t: 0.04, end: Math.min(C.hit.dur - FADE, 0.85), keep: 'hit' };
        else if (pose === 'cast' && C.cast) st.shot = { c: C.cast, t: C.cast.dur * 0.15, end: Math.min(C.cast.dur - FADE, C.cast.dur * 0.15 + 1.1), keep: 'cast' };
        else if (pose === 'dead' && C.dead) { const dc = o.fly && C.flyup ? C.flyup : C.dead; st.shot = { c: dc, t: first ? dc.dur : 0, end: dc.dur, hold: 'dead' }; }   // 被重招击倒：整个人飞出去
        else if (pose === 'guard' && C.guard) st.shot = { c: C.guard, t: 0, end: C.guard.dur, loop: 'guard' };
        else if (st.shot && (st.shot.hold || st.shot.loop)) st.shot = st.shot.hold === 'dead' && pose === 'idle' && C.getup && o.dt ? { c: C.getup, t: Math.min(2.3, C.getup.dur * 0.3), end: C.getup.dur * 0.9, rate: 2.3 } : null;   // 离开倒地（被救起：播起身）/ 防御
        st.last = pk;
      }
      const sh = st.shot;
      if (sh) {
        if (o.at != null) sh.t = o.at;   // 开发检视：直接指定片段时间
        else if (dt === 0) sh.t = sh.hold ? sh.end : sh.loop ? (o.t || 0) % sh.end : sh.keep ? Math.min(sh.end, sh.c.hit) : Math.max(0, sh.c.hit - 0.22 + (o.swing || 0) * 0.3);
        else sh.t += dt * (sh.rate || 1);
        if (sh.loop) ct = (sh.t0 || 0) + (sh.t - (sh.t0 || 0)) % Math.max(0.1, sh.end - (sh.t0 || 0));
        else if (sh.hold || (sh.keep && pose === sh.keep)) ct = Math.min(sh.t, sh.end);
        else if (sh.t > sh.end) st.shot = null; else ct = sh.t;
      }
      if (st.shot) clip = st.shot.c;
      else if (pose === 'idle' || pose === 'attack' || pose === 'hit' || pose === 'cast' || (pose === 'show' && !(ch.look && ch.look.wp === 'fan'))) {
        if (o.walk && C.walk) {
          // 步频跟着实际移动速度走：每段步伐本来该走多快（clip.speed × 腿长 × 模型缩放），与角色真实位移的速度相比，
          // 挑最接近的一段，再用播放倍率补齐差距，脚就不会在地上打滑
          const gp = ch.g.position, unit = T.hipH * R.inner.scale.x * ch.g.scale.x;
          if (dt > 0 && st.lp) { const v = Math.hypot(gp.x - st.lp.x, gp.z - st.lp.z) / dt; if (v < 30 * unit) st.sp = st.sp == null ? v : st.sp + (v - st.sp) * Math.min(1, dt * 10); }
          (st.lp || (st.lp = new V3())).copy(gp);
          const fit = c => Math.abs(Math.log(Math.max(1e-3, st.sp) / (c.speed * unit)));
          // calm（大地图上的主角）：只用走的动作（漫步、快走），不用跑的——跑的那几段都是俯身前冲，在地图上赶路用它，人像一直在逃命。
          // 地图上赶路的速度比真人快走快得多，步频封顶在一倍六，步子再迈大一成多（宁可脚下滑一点，也不让腿抡成风车）；上身再扶正（见下面的 calmK）
          const MV = o.calm && C.stroll.length ? C.stroll : C.move;
          if (st.sp > 0.05 * unit) { let best = st.mv && MV.indexOf(st.mv) >= 0 ? st.mv : MV[0]; for (const c of MV) if (fit(c) < fit(best) - 0.2) best = c; st.mv = best; }
          else if (!st.mv || MV.indexOf(st.mv) < 0) st.mv = o.speedHint ? MV[MV.length - 1] : MV[0];
          if (o.gait && C[o.gait] && C[o.gait].speed > 0) st.mv = C[o.gait];   // 指定步态（如缓步）
          clip = st.mv;
          calmK = o.calm ? 1 : 0;
          const rate = st.sp > 0.05 * unit ? Math.min(o.calm ? 1.6 : 1.9, Math.max(0.55, st.sp / (clip.speed * unit))) : WALK_RATE;
          if (dt === 0) st.lt = o.t || 0; else st.lt += dt * rate;
          ct = st.lt % clip.dur;
        } else {
          st.lp = null; st.sp = null;   // 站立：不用动捕，走下面的公式姿势（自然直立、静止），衣摆和发梢的轻微飘动由着色器负责
          if (o.stance && C.stance && pose !== 'show') { clip = C.stance; if (dt === 0) st.gt = o.t || 0; else st.gt = (st.gt || (ch.seed || 0)) + dt; ct = st.gt % clip.dur; }   // 战斗中：摆出架势
        }
      }
    }
    let ox = 0, oy = 0, oz = 0, ry = A.y * SU, rz = A.z * SU, rx = A.rx;
    if (clip) {
      const f = ct * FPS, i0 = Math.min(clip.N - 1, Math.floor(f)), i1 = Math.min(clip.N - 1, i0 + 1), u = f - i0;
      const masc = MASC_ON && /quick_walk/.test(clip.name) && !(ch.look && ch.look.f);
      for (const k of T.order) {
        const p = T.parent[k], s = T.std[k], Dk = s && clip.D[s];
        if (Dk) {
          q1.fromArray(Dk, i0 * 4).slerp(q2.fromArray(Dk, i1 * 4), u);
          if (/leg$/.test(s)) { const kl = T.leg * (calmK ? 1.13 : 1); if (kl !== 1) q1.copy(q2.set(0, 0, 0, 1).slerp(q1, kl)); }   // 长裙角色收小腿部摆幅；赶路时步子迈大一些
          // 快走那段动作是照女子的步态录的：胯左右摆、两脚踩在一条线上、两臂往外撇着甩。男子用它时把这几样收掉——
          // 各骨头的前后摆动（绕左右轴转）照旧，左右摆（绕前后轴）和拧转（绕竖轴）按部位收小（比例见 MK）；女子不动
          if (masc) { const mk = MASC[s] || (MASC[s] = mascK(s)); if (mk) { eu.setFromQuaternion(q1, 'XYZ'); eu.y *= mk[0]; eu.z *= mk[1]; q1.setFromEuler(eu); } }
          W[k].copy(q1).multiply(T.canonW[k]);
        }
        else if (p < 0) W[k].copy(T.restW[k]); else W[k].copy(W[p]).multiply(T.restL[k]);
      }
      const P = clip.pos; ox = lerp(P[i0 * 3], P[i1 * 3], u) * T.hipH * (masc ? MK.shift : 1); oy = lerp(P[i0 * 3 + 1], P[i1 * 3 + 1], u) * T.hipH; oz = lerp(P[i0 * 3 + 2], P[i1 * 3 + 2], u) * T.hipH;
      // 赶路时把上身扶正：量出髋到颈这条线此刻比站着时往前（或往后）倾了多少，超出两度的部分，让髋连同腰以上整段转回来
      if (calmK && T.sub.spine && T.spineChain.length) {
        const ln = Wq => { v2.set(0, 0, 0); for (const k of T.spineChain) v2.add(v1.copy(T.pos[k]).applyQuaternion(Wq[T.parent[k]])); return Math.atan2(v2.z, v2.y); };
        const lean = ln(W) - T.lean0, fix = lean - Math.max(-0.02, Math.min(0.035, lean));
        if (Math.abs(fix) > 0.003) { q3.setFromAxisAngle(X, -fix); for (const k of T.sub.spine) W[k].premultiply(q3); W[T.hipK].premultiply(q3); }
      }
      ry = 0; rz = 0; rx = 0;
    } else {
      G.spine.setFromEuler(eu.set(A.lean, A.tw, 0));
      G.head.copy(G.spine).multiply(q1.setFromEuler(eu.set(A.hx - A.lean * 0.6, A.hy - A.tw * 0.6, 0)));
      G.armL.copy(G.spine).multiply(q1.setFromEuler(eu.set(A.aL, 0, A.aLz))); G.foreL.copy(G.armL).multiply(q1.setFromAxisAngle(X, A.eL));
      G.armR.copy(G.spine).multiply(q1.setFromEuler(eu.set(A.aR, A.tR || 0, A.aRz))); G.foreR.copy(G.armR).multiply(q1.setFromEuler(eu.set(A.eR, A.wR || 0, 0)));
      G.legL.setFromAxisAngle(X, A.lL * T.leg); G.kneeL.copy(G.legL).multiply(q1.setFromAxisAngle(X, A.kL * T.leg));
      G.legR.setFromAxisAngle(X, A.lR * T.leg); G.kneeR.copy(G.legR).multiply(q1.setFromAxisAngle(X, A.kR * T.leg));
      G.handR.copy(G.foreR).multiply(q1.setFromAxisAngle(X, A.hR || 0));   // 右腕：绕掌心法线下压，兵器随之指向斜下方
      for (const k of T.order) {
        const p = T.parent[k], r = T.roleOf[k];
        if (r === 'handR') W[k].copy(G.handR).multiply(T.canonW[k]);
        else if (r && r !== 'handL') W[k].copy(G[r]).multiply(T.restC[k]);
        else if (p < 0) W[k].copy(T.restW[k]); else W[k].copy(W[p]).multiply(T.restL[k]);
      }
    }
    // 衣物附加骨（裙摆、袍摆、裤腿）。原先贴腿的整根跟着腿转、其余的死死固定在髋上：人一前倾，整条裙子跟着髋翘起来，
    // 后摆抬得老高；腿往后一蹬，后摆又被踢得飞起。布是往下垂的：身子直立着走动、站立时，让它们大半保持垂直，
    // 贴腿的只跟腿转一部分（腿后面的跟得更少）。倒地、翻滚和各种表演动作（st.shot）时仍按原来的办法，免得布料悬在半空
    let hang = 0;
    if (!(st && st.shot)) { v2.set(0, 1, 0).applyQuaternion(q3.copy(W[T.hipK]).multiply(q4.copy(T.canonW[T.hipK]).invert())); hang = smooth(Math.min(1, Math.max(0, (v2.y - 0.6) / 0.3))); }
    for (const k of T.ext) {
      const fb = T.follow[k];
      if (fb != null) {
        W[k].copy(W[fb]).multiply(q1.copy(T.canonW[fb]).invert()).multiply(T.canonW[k]);
        if (hang > 0) W[k].copy(q3.copy(T.canonW[k]).slerp(W[k], lerp(1, T.followW[k], hang)));
      } else { W[k].copy(W[T.parent[k]]).multiply(T.restL[k]); if (hang > 0) W[k].slerp(T.canonW[k], hang * 0.75); }
    }
    // 交叉淡化：动作来源一变，就从当前姿势出发，在 FADE 秒内过渡到新动作
    let fd = 1;
    if (st) {
      const key = clip ? clip.name : 'proc:' + (o.pose || 'idle');
      if (key !== st.key) { if (st.key && o.dt) { for (let k = 0; k < B.length; k++) st.snap[k].copy(st.out[k]); st.ps.copy(st.po); st.rs = st.ro.slice(); st.fade = 0; } st.key = key; }
      if (st.fade < 1) { st.fade = o.dt ? Math.min(1, st.fade + o.dt / FADE) : 1; fd = smooth(st.fade); }
      if (fd < 1) { ox = lerp(st.ps.x, ox, fd); oy = lerp(st.ps.y, oy, fd); oz = lerp(st.ps.z, oz, fd); ry = lerp(st.rs[0], ry, fd); rz = lerp(st.rs[1], rz, fd); rx = lerp(st.rs[2], rx, fd); }
      st.po.set(ox, oy, oz); st.ro[0] = ry; st.ro[1] = rz; st.ro[2] = rx;
    }
    if (R.blink && o) {   // 眨眼：每 3–5 秒一次，闭 0.07 秒、停 0.04 秒、睁 0.11 秒；受击时眯眼，倒地时闭眼
      const sd = ch.seed || 0, P = 3.2 + ((sd * 0.73) % 1) * 1.8, u = ((o.t || 0) + sd * 1.9) % P;
      R.blink.value = o.blink != null ? o.blink : o.pose === 'dead' ? 1 : o.pose === 'hit' ? 0.75 : u < 0.07 ? u / 0.07 : u < 0.11 ? 1 : u < 0.22 ? 1 - (u - 0.11) / 0.11 : 0;
    }
    if (st) for (let k = 0; k < B.length; k++) { if (fd < 1) W[k].copy(q1.copy(st.snap[k]).slerp(W[k], fd)); st.out[k].copy(W[k]); }
    // 叠加在任何动作之上的“活气”：站立时极轻微的呼吸（胸口起伏不到 1 度，肩略抬），以及头颈转向关注的对象或偶尔环顾
    if (st && o.pose !== 'dead') {
      const t = o.t || 0, sd = ch.seed || 0, S = T.sub, add = (list, q) => { if (list) for (const k of list) W[k].premultiply(q); };
      if (!clip && (o.pose == null || o.pose === 'idle' || o.pose === 'show')) {
        // 呼吸：胸口起伏一度多，肩跟着略抬
        const b = Math.sin(t * 1.5 + sd * 1.3);
        add(S.spine1, q2.setFromAxisAngle(X, -0.021 * b)); add(S.neck, q2.setFromAxisAngle(X, 0.016 * b));
        add(S.leftshoulder, q2.setFromAxisAngle(Zax, 0.016 * b)); add(S.rightshoulder, q2.setFromAxisAngle(Zax, -0.016 * b));
        // 站着的人不会纹丝不动：上身极慢地左右晃、略微转一转，头跟着小幅点动、偏一偏，两臂各自轻轻前后荡（脚不动，免得打滑）。
        // 几样动作的周期互不成倍数，每个人的相位又不同，看上去不会像钟摆
        const s1 = Math.sin(t * 0.41 + sd * 2.1) + 0.5 * Math.sin(t * 0.27 + sd * 0.7), s2 = Math.sin(t * 0.33 + sd * 1.4) + 0.5 * Math.sin(t * 0.19 + sd * 3.3);
        add(S.spine1, q2.setFromAxisAngle(Zax, 0.011 * s1)); add(S.spine1, q2.setFromAxisAngle(Yax, 0.016 * s2));
        add(S.head, q2.setFromAxisAngle(X, 0.018 * Math.sin(t * 0.53 + sd * 1.9) + 0.008 * Math.sin(t * 1.3 + sd))); add(S.head, q2.setFromAxisAngle(Zax, -0.014 * s1));
        add(S.leftshoulder, q2.setFromAxisAngle(X, 0.022 * Math.sin(t * 0.47 + sd * 2.6))); add(S.rightshoulder, q2.setFromAxisAngle(X, 0.022 * Math.sin(t * 0.39 + sd * 0.9)));
      }
      let tgt = 0;
      if (!st.shot) {
        if (o.look != null) tgt = Math.max(-1.1, Math.min(1.1, o.look));
        else if (!o.walk) { const ph = (t * 0.11 + sd * 0.37) % 1; if (ph < 0.26) tgt = (Math.floor(t * 0.11 + sd * 0.37) % 2 ? 0.3 : -0.3) * Math.sin(ph / 0.26 * Math.PI); }   // 每 9 秒左右缓缓向一侧看一眼
      }
      st.lk = o.dt ? st.lk + (tgt - st.lk) * (1 - Math.exp(-o.dt * 4)) : tgt;
      if (Math.abs(st.lk) > 0.002) { add(S.neck, q2.setFromAxisAngle(Yax, st.lk * 0.4)); add(S.head, q2.setFromAxisAngle(Yax, st.lk * 0.5)); }
      // 战斗中：架势片段里人是含胸低头的，从斜上方的镜头看过去像一直盯着地面。量出头此刻朝哪，把它抬到平视、略微上扬，
      // 看向对面的对手（颈和头各分担一半）。出招、受击、倒地这些一次性动作期间淡出，不去干扰动捕
      // 大地图上的主角（o.level）同理：走路、站立的片段都略微低头，镜头又在斜上方，看着像一路盯着脚尖——同样量出来、抬到平视
      if (o.stance || o.level) {
        const on = o.stance && st.shot ? 0 : 1, hk = T.role.head, aim = o.stance ? 0.07 : HEAD_UP;
        st.hu = o.dt ? (st.hu || 0) + (on - (st.hu || 0)) * (1 - Math.exp(-o.dt * 6)) : on;
        if (st.hu > 0.01 && hk != null) {
          v1.set(0, 0, 1).applyQuaternion(q1.copy(W[hk]).multiply(q2.copy(T.canonW[hk]).invert()));
          const hl = Math.hypot(v1.x, v1.z), up = Math.max(-0.25, Math.min(0.8, (aim - Math.atan2(v1.y, hl)) * st.hu));   // 要抬多少（弧度）
          // （量下来：站立时模型里的头几乎是水平的，只低 0.6 度；抬的这些全是为了抵消俯视的镜头）
          if (hl > 0.2 && Math.abs(up) > 0.004) { q2.setFromAxisAngle(v1.set(v1.z / hl, 0, -v1.x / hl), -up * 0.5); add(S.neck, q2); add(S.head, q2); }
        }
      }
    }
    for (const k of T.order) {
      const p = T.parent[k];
      if (T.ctl[k]) { if (p < 0) B[k].quaternion.copy(W[k]); else B[k].quaternion.copy(W[p]).invert().multiply(W[k]); }
    }
    // 头发、衣摆的惯性：盯着头的位置（上一帧渲染时的），头一动，垂着的东西先落在后面，再像弹簧一样荡回来；匀速走动时略微向后飘
    if (st && R.sway && o && o.dt > 0 && o.dt < 0.1 && T.role.head != null) {
      const hp = v1.setFromMatrixPosition(B[T.role.head].matrixWorld), dt = o.dt;
      if (!st.hp) { st.hp = hp.clone(); st.hv = new V3(); st.sx = new V3(); st.sv = new V3(); st.hn = 0; }
      else if (st.hn < 3 || hp.distanceToSquared(st.hp) > 0.6) { st.hn++; st.hv.set(0, 0, 0); st.sx.set(0, 0, 0); st.sv.set(0, 0, 0); }   // 刚创建、瞬移：不算
      else {
        const vx = (hp.x - st.hp.x) / dt, vy = (hp.y - st.hp.y) / dt, vz = (hp.z - st.hp.z) / dt;
        let dx = vx - st.hv.x, dy = vy - st.hv.y, dz = vz - st.hv.z; const dl = Math.hypot(dx, dy, dz); if (dl > 2.5) { const k = 2.5 / dl; dx *= k; dy *= k; dz *= k; }
        st.sv.x -= dx * 0.6; st.sv.y -= dy * 0.25; st.sv.z -= dz * 0.6;
        const rx0 = Math.max(-0.035, Math.min(0.035, -vx * 0.012)), rz0 = Math.max(-0.035, Math.min(0.035, -vz * 0.012)), KS = 64, damp = Math.exp(-dt * 5.5);
        st.sv.x += (rx0 - st.sx.x) * KS * dt; st.sv.y += -st.sx.y * KS * dt; st.sv.z += (rz0 - st.sx.z) * KS * dt; st.sv.multiplyScalar(damp); st.sx.addScaledVector(st.sv, dt);
        const sl = st.sx.length(); if (sl > 0.07) st.sx.multiplyScalar(0.07 / sl);
        st.hv.set(vx, vy, vz);
      }
      st.hp.copy(hp);
      const yaw = ch.g.rotation.y, cy = Math.cos(yaw), sn = Math.sin(yaw), k = 1 / Math.max(1e-3, R.inner.scale.x * ch.g.scale.x);
      R.sway.set((st.sx.x * cy - st.sx.z * sn) * k, st.sx.y * k, (st.sx.x * sn + st.sx.z * cy) * k);
    }
    B[T.hipK].position.copy(T.pos[T.hipK]); B[T.hipK].position.x += ox; B[T.hipK].position.y += oy; B[T.hipK].position.z += oz;
    ch.root.position.set(0, ry, rz); ch.root.rotation.x = rx;
    if (R.hold && R.holdDyn) {
      const hk = T.role.handR; q1.copy(W[hk]).invert();
      R.hold.quaternion.copy(q1).multiply(G.foreR);
      R.hold.position.copy(v1.copy(GRIP).applyQuaternion(G.foreR).applyQuaternion(q1)).multiplyScalar(1 / T.ws);
    }
  };
  K.modelSU = SU;
})();
