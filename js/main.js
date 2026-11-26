'use strict';
/* ============ 主循环、存档、输入、剧情辅助 ============ */
let S = null;
const SAVE_KEY = 'yunlan_xiaying_save_v1';
const cv = document.getElementById('cv'), ctx = cv.getContext('2d');

const G = {
  scene: 'title', busy: false, keys: {}, W: 1280, H: 720, scale: 1, pr: 1, t: 0, autoSkip: false, titleBg: null, titleKey: '', titleAmb: [],
  tier() { const F = S.flags; return (F.ch1 ? 1 : 0) + (F.bambooDone ? 1 : 0) + (F.fireDone ? 1 : 0) + (F.snowDone ? 1 : 0); },
  newState() {
    return { v: 1, name: '云澈', map: 'tingyu', x: 14, y: 10, gold: 60, items: { potion1: 2 }, party: [newMember('hero', 1)], flags: {}, quest: '', chapter: 0, respawn: { map: 'tingyu', x: 14, y: 10 }, time: 0, diff: 0, tower: 0, v8: 1, v12: 1, town2: 1, bond: {}, avatar: 'hero' };
  },
  save() { if (!S || G.autoSkip) return; try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* 存储不可用时静默 */ } },
  load() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.v === 1 && s.party && s.party.length) { for (const m of s.party) { m.ex = m.ex || []; m.rage = m.rage || 0; fixMember(m); const st = calcStats(m); m.hp = Math.min(m.hp, st.mhp); m.mp = Math.min(m.mp, st.mmp); } /* 数值重构之后旧存档里的气血、内力可能超出新的上限 */ s.diff = Math.min(DIFFS.length - 1, s.diff || 0); G.migrate(s); return s; } } catch (e) { } return null; },
  // 旧存档（主线只有五关时存的）接到八关的新主线上：已经走过的地方，其前置新关卡视为已过
  migrate(s) {
    s.bond = s.bond || {}; s.avatar = s.avatar || 'hero';
    // 落霞镇扩建成大城之后，旧存档里记在镇上的位置和重生点都挪到中心广场
    if (!s.town2) { if (s.map === 'town') { s.x = 37; s.y = 33; } if (s.respawn && s.respawn.map === 'town') { s.respawn.x = 37; s.respawn.y = 33; } s.town2 = 1; }
    const F = s.flags;
    if (!s.v8) G.migrate8(s);
    // 主线八关 → 十二关：已经走过的地方，其前置的新关卡（沉舟坞、栖霞旧镇、天工墟、心渊）视为已过；两桩心事照常可以去做
    if (!s.v12) {
      if (F.shiDuel || F.fireDone) F.dockDone = 1;
      if (F.snowDone) F.oldDone = 1;
      if (F.cityDone) { F.tgDone = 1; if (!F.final) s.items.shuji = 1; }
      if (F.final) { F.gateOpen = F.xxDone = 1; F.ending = F.ending || 'solo'; }
      if (F.dockDone && !F.q_bai) { F.q_bai = 1; s.items.yaofang = 1; }
      if (F.oldDone && !F.q_su) { F.q_su = 1; s.items.mushu = 1; }
      if (F.ferryDone && !F.dockDone) s.quest = '千面的船还系在烟雨渡的栈桥尽头。乘船顺流而下，去沉舟坞找被掳走的郎中。';
      else if (F.cliffDone && !F.oldDone) s.quest = '经青岚山道往北的岔路，去栖霞旧镇——苏青禾的故乡。';
      else if (F.snowDone && !F.tgDone) s.quest = '从寒月宫东面的岔路进冰谷，去天工墟找关上归墟之门的法子。';
      s.chapter = chapterOf(F); s.v12 = 1;
    }
  },
  migrate8(s) {
    const F = s.flags, to = (m, x, y) => { s.map = m; s.x = x; s.y = y; };
    if (F.shiDuel || F.fireDone) F.lantern = F.ferryDone = 1;
    if (F.snowDone) { F.cliffOpen = F.cliffDone = F.tombTalk = 1; const h = s.party[0]; if (h.ex.indexOf('h7') < 0) h.ex.push('h7'); }
    if (F.final) F.cityDone = 1;
    if (F.bambooDone && !F.ferryDone) { s.quest = '返回落霞镇，从镇东正中的烟雨门前往烟雨渡，过河去赤焰谷。'; if (s.map === 'fire' || s.map === 'forge') to('town', 37, 33); }
    else if (F.fireDone && !F.cliffDone) { s.quest = '回听雨阁，向师父问明夜无殇的来历。'; if (s.map === 'snow' || s.map === 'icecave') to('town', 37, 33); }
    else if (F.snowDone && !F.cityDone) { s.quest = '穿过寒月宫东侧的山门，前往雪岭背后的幽烬城。'; if (s.map === 'abyss') to('city', 18, 33); }
    if (!F.final) { if (F.ferryDone) s.items.hedeng = 1; if (F.cliffDone) s.items.duanjian = 1; }
    s.chapter = chapterOf(F); s.v8 = 1;
  },
  hasSave() { return !!G.load(); },
  equip(m, slot, id) {
    if (m.eq[slot]) S.items[m.eq[slot]] = (S.items[m.eq[slot]] || 0) + 1;
    m.eq[slot] = null;
    if (id && S.items[id] > 0) { S.items[id]--; m.eq[slot] = id; }
    const st = calcStats(m); m.hp = Math.min(m.hp, st.mhp); m.mp = Math.min(m.mp, st.mmp);
  },
  async defeat() {
    await UI.say(null, '眼前一黑……再醒来时，已被人救回了安全的地方。');
    healAll(); S.gold = Math.floor(S.gold * 0.9);
    const r = S.respawn || { map: 'tingyu', x: 14, y: 10 };
    await UI.fade(1); World.enter(r.map, r.x, r.y); UI.hud(); await UI.fade(0);
    UI.toast('损失了一成盘缠'); G.save();
  },
  /* 首领战败：不扣盘缠。可以就地再战（气血内力回满），也可以回去整备。返回 true 表示再战。
     同一位首领手下连败两回：记下一桩“针对性的护身之物”（S.ctr），铁老三会教法子（story.js 的 counterTalk）。 */
  async bossDefeat(bid) {
    const L = (S.bossLoss = S.bossLoss || {}); L[bid] = (L[bid] || 0) + 1;
    if (L[bid] >= 2 && S.flags.town && !S.flags['ctr_' + bid] && !(S.ctr && S.ctr.st < 3) && ENEMIES[bid].ult) {
      S.ctr = { boss: bid, map: S.map, got: 0, need: World.map && World.map.d.foes ? 3 : 0, st: 1 };
      if (!G.autoSkip) await UI.say(null, '又败了一阵。……' + ENEMIES[bid].name + '的路数，落霞镇的铁老三或许听说过。回去问问他，说不定有对付的法子。');
    }
    healAll();
    if (!G.autoSkip && (await UI.choose('重整旗鼓——', ['就地再战（气血内力已回满）', '回去整备'])) === 0) return true;
    await UI.say(null, '你们且战且退……再醒过神来，已回到了安全的地方。');
    const r = S.respawn || { map: 'tingyu', x: 14, y: 10 };
    await UI.fade(1); World.enter(r.map, r.x, r.y); UI.hud(); await UI.fade(0); G.save();
    return false;
  },
  async warpTown() {
    if (G.busy || !S.flags.town) return;
    G.busy = true;
    await UI.fade(1); World.enter('town', 37, 33); UI.hud(); G.save(); UI.banner('落霞镇', '御风而归'); await UI.fade(0);
    G.busy = false;
  },
  async toTitle() {
    G.save(); await UI.fade(1);
    G.scene = 'title'; UI.showHud(false); UI.title(true); Sfx.music('title');
    await UI.fade(0);
  },
  err(e) { UI.err('出错了：' + (e && e.message ? e.message : e)); const o = document.getElementById('simout'); if (o) o.textContent += '\nERROR: ' + (e && e.stack ? e.stack : e); }
};

/* ---------- 剧情辅助函数 ---------- */
const say = (w, t) => UI.say(w, t);
const choose = (t, o) => UI.choose(t, o);
const toast = m => UI.toast(m);
async function talk(lines) { for (const l of lines) await UI.say(l[0], l[1]); }
function give(id, n) {
  n = n || 1;
  if (id === 'gold') { S.gold += n; toast('获得 <i class="coin"></i><b>' + n + '</b>'); }
  else { S.items[id] = (S.items[id] || 0) + n; toast('获得 <b>' + ITEMS[id].name + '</b>' + (n > 1 ? ' ×' + n : '')); }
  UI.hud();
}
function setQuest(q) { S.quest = q; UI.hud(); }
function healAll() { for (const m of S.party) { const st = calcStats(m); m.hp = st.mhp; m.mp = st.mmp; } UI.hud(); }
function addMember(id, eq) {
  if (S.party.some(m => m.id === id)) return;
  const m = newMember(id, Math.max(1, S.party[0].lv), eq);
  autoAllot(m); const st = calcStats(m); m.hp = st.mhp; m.mp = st.mmp;   // 半路入队的同伴，属性点先按其所长分好（之后升级得的点数仍由玩家分配）
  S.party.push(m);
  Sfx.play('lvup'); toast('<b>' + CHARS[id].name + '</b> 加入了队伍！'); UI.hud();
}
async function battle(ids, opts) {
  Sfx.play('encounter'); await UI.flash();
  const o = Object.assign({ theme: World.map ? World.map.d.btheme || World.map.d.theme : 'mountain' }, opts || {});
  DIFF = S.diff || 0;
  return Battle.start(ids, o);   // 对手的强弱只看等级：o.lv 这一场定在几级，o.follow 至少跟到队伍的等级，都没给就用对手自己的等级
}

/* ---------- 画面与循环 ---------- */
function resize() {
  const iw = window.innerWidth || 1280, ih = window.innerHeight || 720;
  G.pr = Math.min(2, window.devicePixelRatio || 1);
  G.scale = Math.min(ih / 720, iw / 620);
  G.W = iw / G.scale; G.H = ih / G.scale;
  cv.width = Math.round(iw * G.pr); cv.height = Math.round(ih * G.pr);
  if (G3.ok) G3.resize(iw, ih, G.pr);
  document.documentElement.style.fontSize = clamp(16 * G.scale, 9, 24) + 'px';
}
function drawTitle(c, W, H, dt) {
  const key = Math.round(W) + '_' + Math.round(H);
  if (G.titleKey !== key) {
    const pr = Math.min(2, G.pr * G.scale);
    G.titleBg = document.createElement('canvas'); G.titleBg.width = Math.ceil(W * pr); G.titleBg.height = Math.ceil(H * pr);
    const b = G.titleBg.getContext('2d'); b.scale(pr, pr); Art.scenery(b, W, H, 'mountain', 21); G.titleKey = key;
    G.titleAmb = []; for (let i = 0; i < 60; i++) G.titleAmb.push({ x: Math.random(), y: Math.random(), z: Math.random(), ph: Math.random() * 9 });
  }
  c.drawImage(G.titleBg, 0, 0, W, H);
  ambStep(G.titleAmb, 'petal', G.t, dt); ambDraw(c, W, H, THEMES.mountain, G.t, G.titleAmb);
  // 立于山巅的侠客剪影
  const t = G.t, list = [['hero', 0.2, 0.9, 3.4, 1], ['su', 0.1, 0.94, 3.0, 1], ['bai', 0.86, 0.93, 3.0, -1], ['shi', 0.94, 0.97, 3.3, -1]];
  for (const l of list) { c.save(); c.translate(W * l[1], H * l[2]); c.scale(l[3], l[3]); Art.drawUnit(c, CHARS[l[0]].look, { t: t, face: l[4], seed: l[1] * 9 }); c.restore(); }
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(10,16,40,.35)'); g.addColorStop(0.5, 'rgba(10,16,40,0)'); g.addColorStop(1, 'rgba(10,10,30,.5)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
}
/* 性能读数（F3，或 菜单 · 系统 里开关）：左下角显示帧率、最近几百帧里最慢的一帧、掉帧的次数，以及当前的渲染分辨率和画面复杂度。
   觉得卡的时候打开看一眼：帧率一直低，是画面太重（把画质调到流畅，或者把读数告诉我）；帧率平时很高、只是偶尔有一帧特别慢，是另一类问题。 */
const PERF = { buf: new Float32Array(600), n: 0, el: null, acc: 0 };
try { G.perfOn = localStorage.getItem('yunlan_perf') === '1'; } catch (e) { G.perfOn = false; }
// 同伴闲谈的气泡也在左下角：读数面板开着的时候，把气泡整体抬到面板上方（面板有几行就抬多高），关掉再落回原处
function perfLift() { const b = document.getElementById('banter'); if (b) b.style.bottom = G.perfOn && PERF.el ? 'max(3.4rem, ' + (PERF.el.offsetHeight + 18) + 'px)' : ''; }
G.perfToggle = () => { G.perfOn = !G.perfOn; try { localStorage.setItem('yunlan_perf', G.perfOn ? '1' : '0'); } catch (e) { } if (PERF.el) PERF.el.style.display = G.perfOn ? 'block' : 'none'; PERF.n = 0; PERF.acc = 1e9; perfLift(); };
function perfTick(ms) {
  if (ms > 0 && ms < 2000) PERF.buf[PERF.n++ % 600] = ms;
  if (!G.perfOn || (PERF.acc += ms) < 500) return;
  PERF.acc = 0; setTimeout(perfLift, 0);   // 面板的字刚换过（行数可能变了），排完版再量它的高度
  if (!PERF.el) { const e = PERF.el = document.createElement('div'); e.id = 'perf'; e.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:60;padding:6px 10px;border-radius:6px;background:rgba(6,8,20,.78);color:#cfe8d0;font:12px/1.5 Consolas,"Microsoft YaHei",monospace;white-space:pre;pointer-events:none'; document.body.appendChild(e); }
  const N = Math.min(PERF.n, 600); if (N < 10) { PERF.el.textContent = '性能读数：正在统计……'; return; }
  let sum = 0, worst = 0, slow = 0, bad = 0; const a = [];
  for (let i = 0; i < N; i++) { const v = PERF.buf[i]; sum += v; a.push(v); if (v > worst) worst = v; }
  a.sort((x, y) => x - y); const med = a[N >> 1];
  for (const v of a) { if (v > med * 1.6 + 2) slow++; if (v > 50) bad++; }
  const q = G3.ok && G3.perfInfo ? G3.perfInfo() : null;
  PERF.el.textContent = '帧率 ' + (1000 / (sum / N)).toFixed(0) + '（平均每帧 ' + (sum / N).toFixed(1) + ' 毫秒，最近 ' + N + ' 帧）\n' +
    '最慢一帧 ' + worst.toFixed(0) + ' 毫秒　掉帧 ' + slow + ' 次，其中超过 50 毫秒的 ' + bad + ' 次\n' +
    (q ? '画质 ' + q.mode + (G3.quality() === 'auto' ? ' 第 ' + (q.lvl + 1) + ' 档' : '') + '　渲染 ' + Math.round(G3.bw * q.scale) + '×' + Math.round(G3.bh * q.scale) + (q.msaa ? '　抗锯齿×' + q.msaa : '　无多重采样') + '\n绘制批次 ' + q.calls + '　三角面 ' + (q.tris / 1e4).toFixed(1) + ' 万' : '2D 模式') +
    (typeof World !== 'undefined' && World.map && G.scene === 'world' ? '　' + World.map.d.name : '');
}
window.addEventListener('keydown', e => { if (e.code === 'F3') { e.preventDefault(); G.perfToggle(); } });
let last = 0;
function frame(ts) {
  // 画质设置里的“帧率上限”：离上一帧还不到 1/上限 秒就不画这一帧（留 3 毫秒余量，免得在 60 赫兹的屏上落成 20 帧）
  const cap = G3.ok && G3.gfx ? G3.gfx.cap : 0;
  if (cap && last && ts - last < 1000 / cap - 3) { requestAnimationFrame(frame); return; }
  perfTick(ts - last);
  const dt = Math.min(0.05, Math.max(0, (ts - last) / 1000 || 0)); last = ts; G.t += dt; G.dt = dt;
  if (G.devIdle) { requestAnimationFrame(frame); return; }   // 开发检视（模型 / 动作连拍）时不画主画面
  try {
    UI.update(dt);
    if (typeof MiniMap !== 'undefined') MiniMap.update(dt);
    const k = G.scale * G.pr;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    if (G3.ok) ctx.clearRect(0, 0, G.W, G.H);
    if (G.scene === 'title') { if (G3.ok) G3.title.render(dt); else drawTitle(ctx, G.W, G.H, dt); }
    else if (G.scene === 'battle') { Battle.update(dt); Battle.draw(ctx, G.W, G.H); }
    else if (World.map) { if (!UI.menuOpen()) World.update(dt); World.draw(ctx, G.W, G.H); if (S) S.time += dt; }
  } catch (e) { console.error(e); G.err(e); }
  requestAnimationFrame(frame);
}

async function newGame() {
  Sfx.init(); Sfx.play('ok');
  // 选难度（之后可在 菜单 · 系统 里随时更改）
  const diff = G.autoSkip ? 0 : await UI.choose('此去江湖，路有多险？', DIFFS.map(d => d.n + '　' + d.d));
  await UI.fade(1);
  S = G.newState(); S.diff = diff; DIFF = diff; UI.title(false);
  Sfx.music('calm');
  await UI.narrate(INTRO);
  World.enter('tingyu', 14, 10); G.scene = 'world'; G.busy = false;
  setQuest('去听雨阁正殿前，与师父顾苍梧交谈。');
  UI.showHud(true);
  await UI.fade(0);
  UI.banner('听雨阁', CHAPTERS[0]);
}
async function continueGame() {
  const s = G.load(); if (!s) return;
  Sfx.init(); Sfx.play('ok');
  await UI.fade(1);
  S = s; DIFF = S.diff || 0; UI.title(false);
  World.enter(MAPS[S.map] ? S.map : 'tingyu', S.x, S.y); G.scene = 'world'; G.busy = false;
  UI.showHud(true);
  await UI.fade(0);
  UI.banner(World.map.d.name, CHAPTERS[S.chapter] || '');
}

/* ---------- 输入 ---------- */
const KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down' };
const typing = e => !!(e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));   // 正在输入框里打字：按键不当作游戏操作
window.addEventListener('keydown', e => {
  if (typing(e)) return;
  Sfx.init();
  const k = KEYMAP[e.code];
  if (k) {
    e.preventDefault();
    if (G.scene === 'battle') { if (!e.repeat) Battle.key(k); }
    else G.keys[k] = true;
    return;
  }
  if (e.code === 'Space' || e.code === 'Enter') {
    e.preventDefault(); if (e.repeat) return;
    if (UI.chooseKey(e.code === 'Space' ? 'space' : 'enter')) return;
    if (UI.advance()) return;
    if (G.scene === 'battle') Battle.key('ok');
    else if (G.scene === 'world' && !UI.busyUI()) World.interact();
  } else if (e.code === 'Escape') {
    if (G.scene === 'battle') Battle.key('esc');
    else if (G.scene === 'world') UI.toggleMenu();
  }
});
window.addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) G.keys[k] = false; });
window.addEventListener('blur', () => { G.keys = {}; });
cv.addEventListener('pointerdown', e => {
  Sfx.init();
  const lx = e.clientX / G.scale, ly = e.clientY / G.scale;
  if (UI.advance()) return;
  if (G.scene === 'battle') Battle.click(lx, ly);
  else if (G.scene === 'world' && !UI.busyUI()) World.click(lx, ly);
});
cv.addEventListener('pointermove', e => { if (G.scene === 'battle') Battle.hover(e.clientX / G.scale, e.clientY / G.scale); });
// 大地图：滚轮或 +/- 键缩放视野。往后滚拉远（看得更宽，最远是默认视野的两倍），往前滚拉近（看清人物）；
// 滚过默认视野时先停在默认上，方便找回原来的镜头
function zoomBy(k) {
  if (!G3.ok || G.scene !== 'world') return;
  const w = G3.world, z0 = Math.min(w.zoomT, w.zcap || 9); let z = z0 * k;
  if ((z0 - 1) * (z - 1) < 0 || Math.abs(z - 1) < 0.05) z = 1;
  w.setZoom(z);
}
cv.addEventListener('wheel', e => { if (G.scene !== 'world') return; e.preventDefault(); zoomBy(e.deltaY > 0 ? 1.12 : 1 / 1.12); }, { passive: false });
window.addEventListener('keydown', e => { if (typing(e)) return; if (e.code === 'Equal' || e.code === 'NumpadAdd') zoomBy(1 / 1.15); else if (e.code === 'Minus' || e.code === 'NumpadSubtract') zoomBy(1.15); });
window.addEventListener('resize', resize);
window.addEventListener('error', e => G.err(e.error || e.message));
window.addEventListener('unhandledrejection', e => G.err(e.reason));

/* ---------- 启动 ---------- */
function boot() {
  UI.init(); resize();
  UI.$('t-new').addEventListener('click', async () => {
    if (G.hasSave()) { Sfx.init(); const c = await UI.choose('已有存档，开始新的旅程将覆盖旧存档。', ['开始新的旅程', '取消']); if (c !== 0) return; }
    newGame();
  });
  UI.$('t-cont').addEventListener('click', continueGame);
  UI.$('t-help').addEventListener('click', async () => {
    Sfx.init();
    await talk([
      [null, '【探索】方向键 / WASD 移动，空格或回车与人交谈、开启宝箱；也可以直接点击地面或人物，自动寻路前往。'],
      [null, '【战斗】回合制。右下角「攻」为普通攻击，环绕的圆钮是武学；怒气满后「绝招」亮起。可开启右上角「自动」与二倍速。'],
      [null, '【成长】战斗获得修为与银两，升级会领悟新武学；在落霞镇的铁匠铺、药铺添置装备丹药，于「菜单 · 队伍」中更换。'],
      [null, '【存档】切换地图与战斗胜利后自动存档，存档保存在本浏览器中。祝你江湖路顺。']
    ]);
  });
  UI.title(true);
  document.addEventListener('pointerdown', () => { Sfx.init(); if (G.scene === 'title') Sfx.music('title'); }, { once: true });
  requestAnimationFrame(frame);
  if (typeof devBoot === 'function') devBoot();
}
(typeof G3 !== 'undefined' && G3.ready ? G3.ready : Promise.resolve()).then(boot);   // 等四位主角的模型和动作文件载入后再启动（没有模型则立即启动）
