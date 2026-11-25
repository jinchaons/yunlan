'use strict';
/* ============ 剧情运镜：上下黑边、镜头切换与推拉、人物站位与表演、慢镜头 ============
   只在 3D 画面下生效；2D 兜底画面或自动测试（G.autoSkip）时，所有调用立即返回，剧情照常只走对白。
   坐标一律用地图格子（可带小数），与 story.js 里 NPC 的 x / y 相同。 */
const Cine = (() => {
  let C = null, tw = [], alt = 1, lastWho = null;
  const ok = () => typeof G3 !== 'undefined' && G3.ok && !G.autoSkip;
  const W3 = () => G3.world;
  const ease = k => k * k * (3 - 2 * k);

  /* ---------- 时间轴 ---------- */
  function tick(dt) {
    for (let i = tw.length - 1; i >= 0; i--) {
      const w = tw[i]; w.t += w.world ? dt * C.rate : dt;
      const k = Math.min(1, w.t / w.d);
      if (w.o) { const e = w.lin ? k : ease(k); for (const p in w.to) w.o[p] = w.from[p] + (w.to[p] - w.from[p]) * e; }
      if (k >= 1) { tw.splice(i, 1); w.r(); }
    }
    const c = C.cam;   // 定住的镜头也极缓慢地往前推，画面不死
    if (c.drift) { const dx = c.tx - c.px, dy = c.ty - c.py, dz = c.tz - c.pz, L = Math.hypot(dx, dy, dz) || 1, s = c.drift * dt / L; c.px += dx * s; c.py += dy * s; c.pz += dz * s; }
    if (C.shake > 0) C.shake *= Math.pow(0.002, dt);
  }
  const tween = (o, to, d, opt) => new Promise(r => { const from = {}; for (const k in to) from[k] = o[k]; tw.push(Object.assign({ t: 0, d: Math.max(0.001, d), r, o, from, to }, opt || {})); });
  const wait = s => (C ? new Promise(r => tw.push({ t: 0, d: s, r })) : Promise.resolve());
  // 取消某个对象身上还没走完的补间（切镜头、重新摆位时，旧的推拉 / 走位不能再拖着它动）
  function stop(o) { for (let i = tw.length - 1; i >= 0; i--) if (tw[i].o === o) { const w = tw[i]; tw.splice(i, 1); w.r(); } }

  /* ---------- 黑边 ---------- */
  function bars(on) {
    let a = document.getElementById('cine-a'), b = document.getElementById('cine-b');
    if (!a) {
      const mk = (id, pos) => { const e = document.createElement('div'); e.id = id; e.style.cssText = 'position:absolute;left:0;right:0;' + pos + ':0;height:0;background:#04030a;pointer-events:none;z-index:1;transition:height .5s ease'; document.getElementById('ui').appendChild(e); return e; };
      a = mk('cine-a', 'top'); b = mk('cine-b', 'bottom');
    }
    a.style.height = on ? '9.5vh' : '0'; b.style.height = on ? '9.5vh' : '0';
  }

  /* ---------- 开始 / 结束 ---------- */
  // setup：在黑屏期间执行（摆人、定第一个镜头）。opts.party === false 时不自动带上同伴
  async function begin(setup, opts) {
    if (C) kill();
    if (!ok()) { await UI.fade(0); return false; }   // 没有运镜时，至少保证画面是亮的
    opts = opts || {};
    await UI.fade(1);
    C = W3().cineStart(); C.tick = tick; tw = []; alt = 1; lastWho = null;
    UI.showHud(false); bars(true);
    const p = World.p;
    put('hero', p.x, p.y, Math.atan2(p.dx, p.dy));
    if (opts.party !== false) party();
    wide(['hero'], { dist: 7 });
    if (setup) setup();
    if (G3.k.ensureModels) await G3.k.ensureModels(C ? C.list.filter(a => a.look).map(a => a.look) : []);   // 黑场里等出场人物的模型到齐
    if (!C) return false;
    await UI.fade(0);
    return true;
  }
  async function end(quick) {
    if (!C) return;
    if (!quick) await UI.fade(1);
    kill();
    if (!quick) await UI.fade(0);
  }
  // 同一场戏里换地方 / 换时间：黑一下再亮
  async function cut(fn) { if (!C) return; await UI.fade(1); if (C) fn(); await UI.fade(0); }
  // 立刻收场（换地图、战败等意外情况下也会被调用）
  function kill() {
    if (!C) return;
    for (const w of tw) w.r(); tw = [];
    W3().cineStop(); C = null; bars(false);
    if (G.scene === 'world') UI.showHud(true);
  }

  /* ---------- 人物 ---------- */
  const lookFor = id => { const w = whoIs(id); return w ? w.look : CHARS.hero.look; };
  // 放一个人物到 (x, y) 格，朝向 yaw（弧度，0 朝南即朝向镜头常在的一侧，π/2 朝东）；已存在则瞬移
  function put(id, x, y, yaw, look) {
    if (!C) return null;
    if (!look && id !== 'hero' && CHARS[id] && !S.party.some(m => m.id === id)) return null;   // 还没入队的同伴不登场
    let a = C.act[id];
    if (!a) { a = C.act[id] = { id, look: look || lookFor(id), seed: C.list.length * 1.7 + 0.3, x: 0, z: 0, yaw: 0, pose: 'idle', h: 1.7 }; C.list.push(a); }
    stop(a); a.walk = false;
    a.x = x + 0.5; a.z = y + 0.5; if (yaw != null) a.yaw = yaw; a.snap = true; a.hide = false;
    return a;
  }
  // 接管地图上已有的 NPC / 守关首领，让它们也听调度
  function npc(who) {
    if (!C) return null;
    const n = World.npcs.find(v => v.def.who === who); if (!n) return null;
    const a = C.act[who] = { id: who, npc: n.def, x: n.px / T, z: n.py / T - 0.3, yaw: (n.def.face || 1) * 0.5, h: 1.7 }; C.list.push(a); return a;
  }
  function foe(id) {
    if (!C) return null;
    const f = World.foes.find(v => v.fixed && v.group[0] === id); if (!f) return null;
    const a = C.act[id] = { id, foe: true, x: f.px / T, z: f.py / T - 0.3, yaw: 0, h: 1.7 * ((f.look && f.look.sz) || 1) }; C.list.push(a); return a;
  }
  // 同伴站到云澈身后两侧
  function party() {
    const h = C.act.hero, f = [Math.sin(h.yaw), Math.cos(h.yaw)], r = [Math.cos(h.yaw), -Math.sin(h.yaw)];
    const slots = [[-0.95, -0.7], [0.95, -0.7], [0, -1.45]];
    S.party.filter(m => m.id !== 'hero').forEach((m, i) => { const s = slots[i % 3]; put(m.id, h.x - 0.5 + r[0] * s[0] + f[0] * s[1], h.z - 0.5 + r[1] * s[0] + f[1] * s[1], h.yaw); });
  }
  const get = id => (C && C.act[id]) || null;
  const has = id => !!get(id);
  function set(id, o) { const a = get(id); if (a) Object.assign(a, o); return a; }
  // 表演：pose 为内置姿势（idle / attack / hit / cast / guard / dead / dodge / victory），或 act 为动捕片段名
  function act(id, name, loop) { return set(id, name ? { pose: 'act', act: name, loop: !!loop } : { pose: 'idle', act: null, loop: false }); }
  function pose(id, p) { return set(id, { pose: p, act: null, loop: false }); }
  const yawTo = (a, tx, tz) => Math.atan2(tx - a.x, tz - a.z);
  // 转身朝向另一个人物，或朝向某一格
  function face(id, target) {
    const a = get(id); if (!a) return;
    const b = typeof target === 'string' ? get(target) : null;
    if (b) a.yaw = yawTo(a, b.x, b.z); else if (Array.isArray(target)) a.yaw = yawTo(a, target[0] + 0.5, target[1] + 0.5); else if (typeof target === 'number') a.yaw = target;
  }
  function look(id, target) { set(id, { lookAt: target || null }); }
  // 走 / 跑到某一格。speed：每秒几格（走 1.5，跑 4.5）
  async function go(id, x, y, speed) {
    const a = get(id); if (!a || a.npc || a.foe) return;
    const tx = x + 0.5, tz = y + 0.5, d = Math.hypot(tx - a.x, tz - a.z); if (d < 0.05) return;
    stop(a); a.yaw = yawTo(a, tx, tz); a.walk = true; a.pose = 'idle'; a.act = null; const my = a.mv = (a.mv || 0) + 1;
    await tween(a, { x: tx, z: tz }, d / (speed || 1.5), { lin: true, world: true });
    if (a.mv === my) a.walk = false;
  }

  /* ---------- 镜头 ---------- */
  const headY = a => (a.y || 0) + (a.h || 1.7) * (a.part ? a.part + 0.06 : 0.9);   // part：坐着、跪着的人，头的高度占身高的比例
  function clear(px, py, pz, tx, ty, tz) { return !W3().cineBlocked(px, py, pz, tx, ty, tz); }
  function apply(s, d) {
    // 画面下方有对白框：镜头的注视点略往下压，让人物落在画面中上部
    if (!s.framed) { s.ty -= Math.hypot(s.px - s.tx, s.py - s.ty, s.pz - s.tz) * 0.045; s.framed = true; }
    const c = C.cam; stop(c); c.drift = 0;
    if (!d) { Object.assign(c, s); c.drift = s.drift || 0; return Promise.resolve(); }
    return tween(c, { px: s.px, py: s.py, pz: s.pz, tx: s.tx, ty: s.ty, tz: s.tz, fov: s.fov }, d).then(() => { if (C) C.cam.drift = s.drift || 0; });
  }
  // 人物近景。o：side（镜头在其正面偏左 -1 / 偏右 1）、ang（偏开的角度）、dist、up（镜头高出视线多少）、part（对准身高的哪个位置）、fov
  function closeSpec(id, o) {
    const a = get(id); if (!a) return null;
    o = o || {};
    const soft = a.glb === false;   // 没有精细模型的人物：镜头留远一些，取半身
    const dist = (o.dist || 2.7) * (soft ? 1.45 : 1), part = o.part || a.part || (soft ? 0.74 : 0.84), ty = (a.y || 0) + (a.h || 1.7) * part, base = o.yaw != null ? o.yaw : a.yaw;
    const tries = []; const s0 = o.side || 1, ang = o.ang == null ? 0.42 : o.ang;
    for (const up of [o.up == null ? 0.12 : o.up, 0.9, 1.9]) for (const s of [s0, -s0]) for (const g of [ang, ang + 0.5, 0.05]) tries.push([base + s * g, up]);
    for (const tr of tries) {
      const px = a.x + Math.sin(tr[0]) * dist, pz = a.z + Math.cos(tr[0]) * dist, py = ty + tr[1];
      if (clear(px, py, pz, a.x, ty, a.z)) return { px, py, pz, tx: a.x, ty, tz: a.z, fov: o.fov || 24, drift: o.drift == null ? 0.05 : o.drift };
    }
    const px = a.x + Math.sin(base) * dist * 0.7, pz = a.z + Math.cos(base) * dist * 0.7;
    return { px, py: ty + 2.6, pz, tx: a.x, ty, tz: a.z, fov: o.fov || 24, drift: 0 };
  }
  // 过肩镜头：从 from 的肩后看 to
  function overSpec(from, to, o) {
    const a = get(from), b = get(to); if (!a || !b) return null;
    o = o || {};
    const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz) || 1, fx = dx / L, fz = dz / L, ty = headY(b) - 0.12;
    for (const s of [o.side || 1, -(o.side || 1)]) for (const back of [1.7, 2.4]) {
      const px = a.x - fx * back + fz * 0.75 * s, pz = a.z - fz * back - fx * 0.75 * s, py = headY(a) + 0.3;
      if (clear(px, py, pz, b.x, ty, b.z)) return { px, py, pz, tx: b.x, ty, tz: b.z, fov: o.fov || 26, drift: 0.04 };
    }
    return closeSpec(to, { yaw: Math.atan2(-fx, -fz), ang: 0.3 });
  }
  // 群像 / 全景：把几个人（或几个格子）都框进来。o：yaw（镜头在哪个方位，默认南侧）、pitch（俯角）、dist、fov
  function wideSpec(ids, o) {
    o = o || {};
    let cx = 0, cz = 0, n = 0, r = 0, hy = 0;
    const pts = ids.map(v => (Array.isArray(v) ? { x: v[0] + 0.5, z: v[1] + 0.5, h: 1.7 } : get(v))).filter(Boolean);
    if (!pts.length) return null;
    for (const a of pts) { cx += a.x; cz += a.z; hy += (a.h || 1.7); n++; }
    cx /= n; cz /= n; hy /= n;
    for (const a of pts) r = Math.max(r, Math.hypot(a.x - cx, a.z - cz));
    const fov = o.fov || 28, dist = o.dist || Math.max(4.2, (r + 1.3) / Math.tan(fov * Math.PI / 360) * 0.62), ty = hy * (o.part || 0.6);
    const yaw0 = o.yaw || 0, p0 = o.pitch == null ? 0.2 : o.pitch;
    for (const pitch of [p0, p0 + 0.25, p0 + 0.55]) for (const dy of [0, 0.45, -0.45, 0.9, -0.9]) {
      const yaw = yaw0 + dy, px = cx + Math.sin(yaw) * Math.cos(pitch) * dist, pz = cz + Math.cos(yaw) * Math.cos(pitch) * dist, py = ty + Math.sin(pitch) * dist;
      if (clear(px, py, pz, cx, ty, cz)) return { px, py, pz, tx: cx, ty, tz: cz, fov, drift: o.drift == null ? 0.07 : o.drift };
    }
    return { px: cx, py: ty + dist * 0.8, pz: cz + dist * 0.6, tx: cx, ty, tz: cz, fov, drift: 0 };
  }
  const shot = (spec, d) => (C && spec ? apply(spec, d || 0) : Promise.resolve());
  const close = (id, o, d) => shot(closeSpec(id, o), d);
  const over = (from, to, o, d) => shot(overSpec(from, to, o), d);
  const wide = (ids, o, d) => shot(wideSpec(ids, o), d);
  // 任意机位：从 (x, y, 高) 看向 (x, y, 高)
  const raw = (px, pz, py, tx, tz, ty, fov, d) => shot({ px: px + 0.5, py, pz: pz + 0.5, tx: tx + 0.5, ty, tz: tz + 0.5, fov: fov || 26, drift: 0 }, d);
  // 在当前镜头上继续推近 / 拉远（k < 1 推近）
  function push(k, d) { if (!C) return Promise.resolve(); const c = C.cam; stop(c); c.drift = 0; return tween(c, { px: c.tx + (c.px - c.tx) * k, py: c.ty + (c.py - c.ty) * k, pz: c.tz + (c.pz - c.tz) * k }, d || 1); }
  function rate(k) { if (C) C.rate = k; }
  // 调色：'night' 夜景（压暗偏蓝，灯火的光晕不受影响）、'dusk' 黄昏、null 还原
  const GRADES = { night: { exp: 0.62, tint: [0.42, 0.56, 1.0], sat: 0.8, bloom: 2.6 }, dusk: { exp: 0.9, tint: [1.0, 0.78, 0.66], sat: 0.95, bloom: 1.5 }, pale: { exp: 1.0, tint: [0.9, 0.96, 1.05], sat: 0.7, bloom: 1.3 } };
  function grade(name) { if (C) C.grade = name ? GRADES[name] : null; }
  function shake(v) { if (C) C.shake = v; }
  function hideNpcs(on) { if (C) C.noNpc = !!on; }   // 这场戏里不让地图上的闲人入画

  /* ---------- 对白：谁开口，镜头就切给谁 ---------- */
  // 每行 [谁, 台词, 可选的调度函数]。调度函数在这句话出现之前执行；返回 false 表示这一句不自动切镜头
  async function talk(lines) {
    for (const l of lines) {
      let auto = true;
      if (C && typeof l[2] === 'function') { const r = await l[2](); if (r === false) auto = false; }
      const who = l[0], a = C && who ? get(who) : null;
      if (a && auto) {
        // 其余人转头看说话的人；说话的人看向上一个开口的人
        for (const b of C.list) if (b !== a) b.lookAt = who;
        if (lastWho && lastWho !== who && get(lastWho)) a.lookAt = lastWho;
        alt = -alt;
        const prev = lastWho && lastWho !== who ? get(lastWho) : null;
        if (prev && Math.hypot(prev.x - a.x, prev.z - a.z) < 4.5 && Math.hypot(prev.x - a.x, prev.z - a.z) > 1.1 && alt > 0) await over(lastWho, who);
        else await close(who, { side: alt });
        lastWho = who;
      }
      if (l[1] != null) await UI.say(l[0], l[1]);
    }
  }

  return { begin, end, cut, kill, on: () => !!C, ok, put, npc, foe, party, get, has, set, act, pose, face, look, go, close, over, wide, raw, push, shot, closeSpec, overSpec, wideSpec, rate, grade, shake, hideNpcs, wait, talk, tween: (o, to, d, opt) => (C ? tween(o, to, d, opt) : (Object.assign(o, to), Promise.resolve())) };
})();
