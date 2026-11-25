'use strict';
/* ============ 大地图：地图生成、探索、遭遇 ============ */
const T = 48;
const GR = { BASE: 0, PATH: 1, STONE: 2, WATER: 3, BRIDGE: 4, WALL: 5, HILL: 6 };   // HILL：山体（不可走，3D 里按到山脚的距离隆起）
const GROUND_SS = 1.5;

const THEMES = {
  mountain: { base: ['#74c56c', '#6abd63', '#7fcd76'], blot: ['#9be088', '#56a85a'], path: '#e2cea2', pathEdge: '#b59c6c', stone: '#d2cdbf', water: '#45b0d6', water2: '#8fe0f0', shore: '#d4f0dc',
    trees: ['treeG', 'treeP', 'treeG', 'treeP', 'rockM'], flowers: ['#ffd1e6', '#fff3b0', '#ffffff'], tuft: '#4a9a52', grade: 'rgba(255,236,190,.10)', vig: '20,50,80', vigA: 0.45, amb: 'petal', ambc: ['#ffd0e0', '#ffb0cc', '#ffffff'], music: 'calm' },
  town: { base: ['#cbb27a', '#c4aa72', '#d2ba82'], blot: ['#dec68e', '#ae965e'], path: '#ead8aa', pathEdge: '#b4966a', stone: '#d8cfba', water: '#5aa8c8', water2: '#9fdcea', shore: '#eae0c4',
    trees: ['treeA', 'treeR', 'treeA', 'rock'], flowers: ['#ffb347', '#ff7a5a', '#fff3b0'], tuft: '#a08844', grade: 'rgba(255,160,80,.13)', vig: '70,20,30', vigA: 0.42, amb: 'leaf', ambc: ['#ff9a3a', '#e65a2a', '#ffc85a'], music: 'town' },
  bamboo: { base: ['#3f8f5a', '#398654', '#459862'], blot: ['#5cb272', '#286e46'], path: '#c0b280', pathEdge: '#877c50', stone: '#a8b0a0', water: '#2a968c', water2: '#7fdcc4', shore: '#8fd0a8',
    trees: ['bamboo', 'bamboo', 'bamboo', 'treeD', 'rockM'], flowers: ['#e0ffb0', '#ffffff', '#b0ffe0'], tuft: '#266a3c', grade: 'rgba(120,255,170,.07)', vig: '0,30,25', vigA: 0.6, amb: 'firefly', ambc: ['#e6ff8a', '#b0ffb0'], music: 'bamboo' },
  fire: { base: ['#4a3230', '#44302c', '#523834'], blot: ['#603e38', '#342220'], path: '#8e6e5c', pathEdge: '#553a32', stone: '#6e5e5a', water: '#ff7a1f', water2: '#ffe070', shore: '#7a2a14',
    trees: ['dead', 'rockL', 'rockL', 'dead'], flowers: ['#ff8a3a', '#ffd060'], tuft: '#2a1a18', grade: 'rgba(255,80,30,.09)', vig: '40,0,0', vigA: 0.6, amb: 'ember', ambc: ['#ffb04a', '#ff6a2a', '#ffe08a'], music: 'fire', liquid: 'lava' },
  snow: { base: ['#eef5fc', '#e6f0fa', '#f4f9ff'], blot: ['#ffffff', '#cedff0'], path: '#c6d3e4', pathEdge: '#9cb0ca', stone: '#d6e2f0', water: '#8cc6ea', water2: '#dcf4ff', shore: '#ffffff',
    trees: ['pineS', 'pineS', 'rockS', 'crysI', 'pineS'], flowers: ['#b0d8ff', '#ffffff'], tuft: '#b4c8de', grade: 'rgba(140,190,255,.10)', vig: '20,40,90', vigA: 0.45, amb: 'snow', ambc: ['#ffffff'], music: 'snow', liquid: 'ice' },
  abyss: { base: ['#2e2448', '#2a2042', '#33284e'], blot: ['#403262', '#1c1430'], path: '#5c4c84', pathEdge: '#382a58', stone: '#4c406e', water: '#0a0618', water2: '#8a4fe0', shore: '#5a2a9a',
    trees: ['crysP', 'rockD', 'deadP', 'rockD'], flowers: ['#c06aff', '#ff6ad0'], tuft: '#1a1230', grade: 'rgba(160,80,255,.09)', vig: '5,0,20', vigA: 0.68, amb: 'mote', ambc: ['#c08aff', '#ff8ae0', '#8ab0ff'], music: 'abyss', liquid: 'void' },
  // 衍生主题（as = 沿用哪个母主题的草木密度与点缀）
  dusk: { as: 'town', base: ['#a79eb6', '#9f96ae', '#afa6be'], blot: ['#bdb4cc', '#857c98'], path: '#d8cbc0', pathEdge: '#9c8c88', stone: '#c8c0cc', water: '#2c4a7c', water2: '#ffb878', shore: '#8a90a8',
    trees: ['treeP', 'treeG', 'treeP', 'rock'], flowers: ['#ffb347', '#ff7a9a', '#fff3b0'], tuft: '#6c688a', grade: 'rgba(255,140,80,.12)', vig: '10,10,50', vigA: 0.6, amb: 'firefly', ambc: ['#ffb050', '#ff8a3a', '#ffd88a'], music: 'town' },
  mist: { as: 'mountain', base: ['#8fa888', '#87a080', '#97b090'], blot: ['#a8c0a0', '#6c8a6c'], path: '#d0c8b0', pathEdge: '#9a9078', stone: '#c4c6c4', water: '#6a9ab0', water2: '#c0e0e8', shore: '#d0dcd8',
    trees: ['treeG', 'rockM', 'treeD', 'rockM', 'treeP'], flowers: ['#ffffff', '#e0e8ff'], tuft: '#5c7a5c', grade: 'rgba(200,220,255,.10)', vig: '30,40,60', vigA: 0.55, amb: 'petal', ambc: ['#ffffff', '#e8f0ff'], music: 'snow' },
  ash: { as: 'fire', base: ['#3a3436', '#343032', '#423c3e'], blot: ['#4e4648', '#242022'], path: '#7c7270', pathEdge: '#4a4240', stone: '#5e5858', water: '#ff5a1a', water2: '#ffc060', shore: '#5a1e10',
    trees: ['dead', 'rockD', 'rockL', 'dead', 'deadP'], flowers: ['#ff8a3a', '#c0c0c8'], tuft: '#1e1a1c', grade: 'rgba(255,90,40,.08)', vig: '20,0,10', vigA: 0.68, amb: 'ember', ambc: ['#c8c8d0', '#ff7a3a', '#8a8a94'], music: 'fire', liquid: 'lava' },
  // 室内：没有草木和飘落物，四周是暗的
  indoor: { as: 'town', base: ['#0e0c12', '#0e0c12', '#0e0c12'], blot: ['#0e0c12', '#0e0c12'], path: '#8a6238', pathEdge: '#5a3c22', stone: '#8a6238', water: '#5aa8c8', water2: '#9fdcea', shore: '#eae0c4',
    trees: [], flowers: [], tuft: '#0e0c12', grade: 'rgba(255,170,90,.07)', vig: '30,14,6', vigA: 0.55, amb: 'none', ambc: [], music: 'town' }
};
// 室内地面的几种铺法：木地板、青砖、夯土
const FLOORS = { wood: ['#8a6238', '#7a5630', '#96703f'], stone: ['#8a877e', '#7c7a72', '#96938a'], earth: ['#6e5a48', '#665240', '#786450'], mat: ['#a89468', '#9c885c', '#b4a074'] };

function buildMap(id) {
  const d = MAPS[id], th = d.liquid ? Object.assign({}, THEMES[d.theme], d.liquid) : THEMES[d.theme], w = d.w, h = d.h, rnd = mulberry32(d.seed || 7);   // d.liquid：这张图的水另用一种（如黑潮），{ liquid, water, water2, shore }
  const g = new Uint8Array(w * h), ob = new Array(w * h).fill(null), blk = new Uint8Array(w * h);
  const I = (x, y) => y * w + x, inb = (x, y) => x >= 0 && y >= 0 && x < w && y < h;
  const NW = Math.ceil(w / 4) + 2, nzv = [];
  for (let i = 0; i < NW * (Math.ceil(h / 4) + 2); i++) nzv.push(rnd());
  const noise = (x, y) => {
    const fx = x / 4, fy = y / 4, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
    const a = nzv[y0 * NW + x0], b = nzv[y0 * NW + x0 + 1], c2 = nzv[(y0 + 1) * NW + x0], d2 = nzv[(y0 + 1) * NW + x0 + 1];
    return lerp(lerp(a, b, tx), lerp(c2, d2, tx), ty);
  };
  const dense = d.dense == null ? 0.1 : d.dense, trees = d.trees || th.trees;   // d.trees：这张图另用一套草木（不写则按主题）
  // 室内：最外一圈是墙，里面全是地板；南墙上留着门（出口）
  if (d.indoor) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) g[I(x, y)] = x === 0 || y === 0 || x === w - 1 || y === h - 1 ? GR.WALL : GR.STONE;
  if (d.indoor) for (const e of d.exits || []) for (let k = 0; k < (e.w || 1); k++) g[I(e.x + k, e.y)] = GR.STONE;
  for (let y = 0; y < h && !d.indoor; y++) for (let x = 0; x < w; x++) {
    const e = Math.min(x, y, w - 1 - x, h - 1 - y), n = noise(x, y);
    const p = e < 1 ? 1 : e < 2 ? 0.92 : e < 3 ? 0.6 : e < 4 ? 0.32 : dense + (n > 0.6 ? (n - 0.6) * 1.5 : 0);
    if (rnd() < p) ob[I(x, y)] = { s: trees[Math.floor(rnd() * trees.length)], sc: 0.85 + rnd() * 0.35, f: rnd() < 0.5 };
  }
  // 整张图先是一座大山（d.massif），再用 d.dells（[cx, cy, rx, ry] 轮廓不规则的山坳）、d.clear、d.paths 在山里挖出平地和山路
  if (d.massif) for (let i = 0; i < w * h; i++) { g[i] = GR.HILL; ob[i] = null; }
  for (const b of d.water || []) {
    for (let y = Math.floor(b[1] - b[2]); y <= Math.ceil(b[1] + b[2]); y++) for (let x = Math.floor(b[0] - b[2]); x <= Math.ceil(b[0] + b[2]); x++)
      if (inb(x, y) && Math.hypot(x - b[0], y - b[1]) <= b[2]) { g[I(x, y)] = GR.WATER; ob[I(x, y)] = null; }
  }
  // 轮廓不规则的一团：[cx, cy, rx, ry]。d.lakes 是湖，d.hills 是山
  const blob = (b, fn) => {
    const rx = b[2], ry = b[3] || b[2], ph = rnd() * TAU, k2 = 2 + Math.floor(rnd() * 2);
    for (let y = Math.floor(b[1] - ry - 1); y <= Math.ceil(b[1] + ry + 1); y++) for (let x = Math.floor(b[0] - rx - 1); x <= Math.ceil(b[0] + rx + 1); x++) {
      if (!inb(x, y)) continue;
      const dx = (x + 0.5 - b[0]) / rx, dy = (y + 0.5 - b[1]) / ry, a = Math.atan2(dy, dx);
      if (Math.hypot(dx, dy) <= 0.84 + 0.14 * Math.sin(a * k2 + ph) + 0.09 * Math.sin(a * 5 + ph * 2)) fn(I(x, y));
    }
  };
  for (const b of d.lakes || []) blob(b, i => { g[i] = GR.WATER; ob[i] = null; });
  for (const b of d.hills || []) blob(b, i => { g[i] = GR.HILL; ob[i] = null; });
  for (const b of d.dells || []) blob(b, i => { if (g[i] !== GR.WATER) { g[i] = GR.BASE; ob[i] = rnd() < dense && trees.length ? { s: trees[Math.floor(rnd() * trees.length)], sc: 0.85 + rnd() * 0.35, f: rnd() < 0.5 } : null; } });
  // 护城河：d.moat = { x0, y0, x1, y1 } 一圈两格宽的水，路经过处自动成桥
  if (d.moat) {
    const q = d.moat;
    for (let y = q.y0; y <= q.y1; y++) for (let x = q.x0; x <= q.x1; x++)
      if (inb(x, y) && (x - q.x0 < 2 || q.x1 - x < 2 || y - q.y0 < 2 || q.y1 - y < 2)) { g[I(x, y)] = GR.WATER; ob[I(x, y)] = null; }
  }
  for (const c of d.clear || []) {
    for (let y = c[1]; y < c[1] + c[3]; y++) for (let x = c[0]; x < c[0] + c[2]; x++)
      if (inb(x, y)) { ob[I(x, y)] = null; g[I(x, y)] = c[4] || GR.BASE; }
  }
  const carve = (x, y) => {
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const X = x + dx, Y = y + dy; if (!inb(X, Y)) continue;
      ob[I(X, Y)] = null;
      const cur = g[I(X, Y)];
      g[I(X, Y)] = cur === GR.WATER || cur === GR.BRIDGE ? GR.BRIDGE : cur === GR.STONE ? GR.STONE : GR.PATH;
    }
  };
  for (const pts of d.paths || []) {
    let x = pts[0][0], y = pts[0][1]; carve(x, y);
    for (let i = 1; i < pts.length; i++) {
      const tx = pts[i][0], ty = pts[i][1];
      while (x !== tx) { x += Math.sign(tx - x); carve(x, y); }
      while (y !== ty) { y += Math.sign(ty - y); carve(x, y); }
    }
  }
  // d.cells：[[x, y, GR.X], …] 逐格指定地面（花园里一格宽的小径就是这样铺的；d.paths 开出来的路都是两格宽）
  for (const c of d.cells || []) if (inb(c[0], c[1])) { ob[I(c[0], c[1])] = null; g[I(c[0], c[1])] = c[2]; }
  // 城墙：d.wall = { x0, y0, x1, y1 } 围成一圈；道路穿过的地方留作城门
  const wall = [];
  if (d.wall) {
    const Wl = d.wall;
    for (let y = Wl.y0; y <= Wl.y1; y++) for (let x = Wl.x0; x <= Wl.x1; x++) {
      if (x !== Wl.x0 && x !== Wl.x1 && y !== Wl.y0 && y !== Wl.y1) continue;
      const i = I(x, y), vert = (x === Wl.x0 || x === Wl.x1) && y !== Wl.y0 && y !== Wl.y1;
      if (g[i] === GR.PATH || g[i] === GR.BRIDGE) { ob[i] = null; wall.push({ x, y, gate: 1, vert }); continue; }
      g[i] = GR.WALL; ob[i] = null; wall.push({ x, y, vert, corner: (x === Wl.x0 || x === Wl.x1) && (y === Wl.y0 || y === Wl.y1) });
    }
  }
  const builds = [], flat = (x, y) => { if (inb(x, y) && g[I(x, y)] === GR.HILL) g[I(x, y)] = GR.BASE; };
  for (const b of d.builds || []) {
    for (let y = b.y - 1; y < b.y + b.h + 1; y++) for (let x = b.x - 1; x < b.x + b.w + 1; x++) if (inb(x, y)) { ob[I(x, y)] = null; flat(x, y); }
    // pass：牌坊一类，只有两端的柱脚挡路，中间可以穿行
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) if (inb(x, y) && (!b.pass || (b.h > b.w ? y === b.y || y === b.y + b.h - 1 : x === b.x || x === b.x + b.w - 1))) blk[I(x, y)] = 1;
    if (b.s2 !== '') builds.push({ s: b.s2 || b.s, px: (b.x + b.w / 2) * T, py: (b.y + b.h) * T - 4 });   // s2：2D 兜底画面用哪种现成的房屋图样（'' 表示不画）
  }
  for (const p of d.props || []) if (inb(p.x, p.y)) { ob[I(p.x, p.y)] = { s: p.s, sc: p.sc || 1, f: false }; flat(p.x, p.y); }
  for (const n of d.npcs || []) for (let k = 0; k < (n.w || 1); k++) if (inb(n.x + k, n.y)) { ob[I(n.x + k, n.y)] = null; if (g[I(n.x + k, n.y)] === GR.WATER) g[I(n.x + k, n.y)] = GR.BASE; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) flat(n.x + k + dx, n.y + dy); }
  for (const n of d.fixed || []) { ob[I(n.x, n.y)] = null; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) flat(n.x + dx, n.y + dy); }
  for (const e of d.exits || []) if (e.door) for (let k = 0; k < (e.w || 1); k++) if (inb(e.x + k, e.y)) blk[I(e.x + k, e.y)] = 0;   // 房门：屋子占的格子里，门口这一格可以走进去
  if (d.scen !== false && !d.indoor) genScenery(d, w, h, g, ob, blk, mulberry32((d.seed || 7) * 13 + 5));
  const lights = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = I(x, y), o = ob[i];
    if (g[i] === GR.WATER || g[i] === GR.WALL || g[i] === GR.HILL || o) blk[i] = 1;
    if (!o) continue;
    const px = x * T + T / 2, py = y * T + T * 0.86;
    if (o.s === 'lantern') lights.push({ x: px + 10, y: py - 38, r: 84, col: '#ff9a40', a: 0.3 });
    else if (o.s === 'brazier') lights.push({ x: px, y: py - 30, r: 130, col: '#ff8a3a', a: 0.55, fire: 1 });
    else if (o.s === 'crysI') lights.push({ x: px, y: py - 22, r: 70, col: '#8fd0ff', a: 0.35 });
    else if (o.s === 'crysP') lights.push({ x: px, y: py - 22, r: 80, col: '#b060ff', a: 0.42 });
    else if (o.s === 'rockL') lights.push({ x: px, y: py - 8, r: 46, col: '#ff7a2a', a: 0.3 });
    else if (o.s === 'rockD') lights.push({ x: px, y: py - 8, r: 46, col: '#b060ff', a: 0.25 });
  }
  const m = { id, d, th, w, h, g, ob, blk, builds, lights, I, inb, wall };
  const clk = G.realNow || (() => performance.now()), pt = clk(); m.ground = paintGround(m); m.paintMs = Math.round(clk() - pt);   // 画地面用了多少毫秒（?test=8 会打印）
  return m;
}

/* 布景：在离道路、房屋、人物都有一段距离的空地上，自动摆上几座山和几片湖。
   每摆一处都检查一遍：原先走得到的出口、人物、首领仍然走得到，也没有把大片空地圈死；否则撤销。
   d.scen：{ n 处数, hills 山所占的比例(0~1), rmax 最大半径 }；d.keep：[[x, y, w, h], …] 这些地方不动（剧情要用的空地）。 */
function genScenery(d, w, h, g, ob, blk, rnd) {
  const sc = Object.assign({ n: Math.round(w * h / 150), hills: 0.55, rmax: 6 }, d.scen || {}), n = w * h;
  const I = (x, y) => y * w + x, inb = (x, y) => x >= 0 && y >= 0 && x < w && y < h;
  const keep = new Uint8Array(n);
  const mark = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inb(x, y)) keep[I(x, y)] = 1; };
  for (let i = 0; i < n; i++) if (g[i] !== GR.BASE || blk[i]) keep[i] = 1;
  for (const b of d.builds || []) mark(b.x - 1, b.y - 1, b.x + b.w, b.y + b.h + 1);
  for (const c of d.clear || []) mark(c[0], c[1], c[0] + c[2] - 1, c[1] + c[3] - 1);
  for (const c of d.keep || []) mark(c[0], c[1], c[0] + c[2] - 1, c[1] + c[3] - 1);
  for (const p of d.props || []) mark(p.x - 1, p.y - 1, p.x + 1, p.y + 1);
  for (const q of d.npcs || []) mark(q.x - 2, q.y - 2, q.x + (q.w || 1) + 1, q.y + 2);
  for (const q of d.fixed || []) mark(q.x - 5, q.y - 5, q.x + 5, q.y + 5);
  for (const e of d.exits || []) mark(e.x - 3, e.y - 3, e.x + (e.w || 1) + 2, e.y + (e.h || 1) + 2);
  if (d.wall) mark(d.wall.x0, d.wall.y0, d.wall.x1, d.wall.y1);
  const N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  const dist = () => {   // 每格到最近一处“不能动”的格子的距离（八方向）
    const fd = new Int16Array(n).fill(-1), q = [];
    for (let i = 0; i < n; i++) if (keep[i]) { fd[i] = 0; q.push(i); }
    for (let qi = 0; qi < q.length; qi++) { const i = q[qi], x = i % w, y = (i - x) / w; for (const dd of N8) { const X = x + dd[0], Y = y + dd[1]; if (!inb(X, Y)) continue; const j = I(X, Y); if (fd[j] < 0) { fd[j] = fd[i] + 1; q.push(j); } } }
    for (let i = 0; i < n; i++) if (fd[i] < 0) fd[i] = 99;
    return fd;
  };
  const isBlk = i => blk[i] || ob[i] || g[i] === GR.WATER || g[i] === GR.WALL || g[i] === GR.HILL;
  const reach = () => {   // 从第一个出口出发走得到的格子
    const seen = new Uint8Array(n), q = []; let cnt = 0;
    for (const e of d.exits || []) { const i = I(e.x, e.y); if (!isBlk(i)) { seen[i] = 1; q.push(i); break; } }
    for (let qi = 0; qi < q.length; qi++) { const i = q[qi], x = i % w, y = (i - x) / w; cnt++; for (let k = 0; k < 4; k++) { const X = x + N8[k][0], Y = y + N8[k][1]; if (!inb(X, Y)) continue; const j = I(X, Y); if (!seen[j] && !isBlk(j)) { seen[j] = 1; q.push(j); } } }
    return { seen, cnt };
  };
  // 必须保持走得到的地方：各出口、各首领的位置、每个人物（宝箱、灵泉）身边
  const tg = [];
  for (const e of d.exits || []) tg.push([I(e.x, e.y)]);
  for (const q of d.fixed || []) tg.push([I(q.x, q.y)]);
  for (const q of d.npcs || []) { const a = []; for (let k = 0; k < (q.w || 1); k++) for (let j = 0; j < 4; j++) { const X = q.x + k + N8[j][0], Y = q.y + N8[j][1]; if (inb(X, Y)) a.push(I(X, Y)); } tg.push(a); }
  let cur = reach(); const must = tg.filter(a => a.some(i => cur.seen[i]));
  let made = 0;
  for (let tries = 0; made < sc.n && tries < sc.n * 4; tries++) {
    const fd = dist(); let best = -1, bv = 0;
    for (let i = 0; i < n; i++) if (fd[i] >= 3 && fd[i] < 99) { const v = fd[i] + rnd() * 1.2; if (v > bv) { bv = v; best = i; } }
    if (best < 0) break;
    const kind = rnd() < sc.hills ? GR.HILL : GR.WATER, cells = [], inC = new Uint8Array(n);
    let cx = best % w + 0.5, cy = Math.floor(best / w) + 0.5, r = Math.min(sc.rmax, fd[best] - 1) * (0.8 + rnd() * 0.2);
    for (let s = 0, ns = 1 + Math.floor(rnd() * (kind === GR.HILL ? 3 : 2)); s < ns && r >= 1.5; s++) {
      const ph = rnd() * TAU, k2 = 2 + Math.floor(rnd() * 2);
      for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
        if (!inb(x, y)) continue; const i = I(x, y); if (inC[i] || keep[i] || fd[i] < 2) continue;
        if (kind === GR.WATER && (x < 3 || y < 3 || x > w - 4 || y > h - 4)) continue;   // 湖不贴着地图边（边外是山）
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy, a = Math.atan2(dy, dx);
        if (Math.hypot(dx, dy) <= r * (0.86 + 0.13 * Math.sin(a * k2 + ph) + 0.08 * Math.sin(a * 5 + ph * 2))) { inC[i] = 1; cells.push(i); }
      }
      // 顺着空地最宽的方向再接一团，连成一道山梁 / 一弯长湖
      let nb = -1, nv = 0;
      for (let k = 0; k < 12; k++) { const a = k / 12 * TAU, X = Math.floor(cx + Math.cos(a) * r * 1.15), Y = Math.floor(cy + Math.sin(a) * r * 1.15); if (!inb(X, Y)) continue; const j = I(X, Y); if (inC[j] || fd[j] < 3 || fd[j] >= 99) continue; const v = fd[j] + rnd(); if (v > nv) { nv = v; nb = j; } }
      if (nb < 0) break;
      cx = nb % w + 0.5; cy = Math.floor(nb / w) + 0.5; r = Math.min(sc.rmax, fd[nb] - 1) * (0.75 + rnd() * 0.2);
    }
    if (cells.length < 5) { keep[best] = 1; continue; }
    const old = cells.map(i => [g[i], ob[i]]); let was = 0;
    for (const i of cells) { if (cur.seen[i]) was++; g[i] = kind; ob[i] = null; }
    const nx = reach();
    if (must.every(a => a.some(i => nx.seen[i])) && nx.cnt >= cur.cnt - was - 3) { cur = nx; made++; for (const i of cells) keep[i] = 1; }
    else { cells.forEach((i, k) => { g[i] = old[k][0]; ob[i] = old[k][1]; }); keep[best] = 1; }
  }
}

/* ---------- 道路的铺法 ----------
   每种铺法：edge 路边的颜色，base 底色（石缝、砖缝里露出来的就是它），paint 在整张图上画纹样（外面已按路面的形状裁好）。 */
// 一排排大小不一的石板。moss：缝边的苔 / 雪；crack：裂纹
function rdSlabs(c, W, H, rnd, o) {
  for (let y = 0; y < H;) {
    const rh = o.rh[0] + rnd() * (o.rh[1] - o.rh[0]), g = o.gap;
    for (let x = -rnd() * o.rw[1]; x < W;) {
      const rw = o.rw[0] + rnd() * (o.rw[1] - o.rw[0]);
      c.fillStyle = Art.shade(o.cols[Math.floor(rnd() * o.cols.length)], (rnd() - 0.5) * 0.1); c.fillRect(x + g / 2, y + g / 2, rw - g, rh - g);
      c.fillStyle = 'rgba(255,255,255,' + o.hl + ')'; c.fillRect(x + g / 2, y + g / 2, rw - g, 1.4); c.fillStyle = 'rgba(0,0,0,.13)'; c.fillRect(x + g / 2, y + rh - g / 2 - 1.4, rw - g, 1.4);
      if (rnd() < o.crack) { const cx = x + rw * (0.2 + rnd() * 0.6); c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(cx, y + g); c.lineTo(cx + (rnd() - 0.5) * 8, y + rh * 0.5); c.lineTo(cx + (rnd() - 0.5) * 10, y + rh - g); c.stroke(); }
      if (rnd() < o.moss) { c.fillStyle = Art.rgba(o.mossC, 0.55); Art.ell(c, x + rnd() * rw, y + (rnd() < 0.5 ? 0 : rh), 4 + rnd() * 7, 1.6 + rnd() * 2.6); c.fill(); }
      x += rw;
    }
    y += rh;
  }
}
// 整齐的砖：bond 错缝，否则对缝
function rdPavers(c, W, H, rnd, o) {
  const g = o.gap;
  for (let y = 0, j = 0; y < H; y += o.sy, j++) for (let x = o.bond && j % 2 ? -o.sx / 2 : 0; x < W; x += o.sx) {
    c.fillStyle = Art.shade(o.cols[Math.floor(rnd() * o.cols.length)], (rnd() - 0.5) * 0.08); c.fillRect(x + g / 2, y + g / 2, o.sx - g, o.sy - g);
    c.fillStyle = 'rgba(255,255,255,' + o.hl + ')'; c.fillRect(x + g / 2, y + g / 2, o.sx - g, 1.2);
    if (o.crack && rnd() < o.crack) { c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 0.7; c.beginPath(); const cx = x + rnd() * o.sx, cy = y + rnd() * o.sy; c.moveTo(cx, cy); c.lineTo(cx + (rnd() - 0.5) * 16, cy + (rnd() - 0.5) * 16); c.lineTo(cx + (rnd() - 0.5) * 22, cy + (rnd() - 0.5) * 22); c.stroke(); }
  }
}
// 卵石
function rdCobbles(c, W, H, rnd, o) {
  const st = (o.r[0] + o.r[1]) * 0.92;
  for (let y = 0, j = 0; y < H + st; y += st * 0.86, j++) for (let x = j % 2 ? st / 2 : 0; x < W + st; x += st) {
    const r = o.r[0] + rnd() * (o.r[1] - o.r[0]), px = x + (rnd() - 0.5) * st * 0.3, py = y + (rnd() - 0.5) * st * 0.3, col = o.cols[Math.floor(rnd() * o.cols.length)];
    c.fillStyle = Art.shade(col, -0.25); Art.ell(c, px + 0.8, py + 1, r, r * (0.72 + rnd() * 0.2)); c.fill();
    c.fillStyle = col; Art.ell(c, px, py, r * 0.94, r * (0.66 + rnd() * 0.2)); c.fill();
    c.fillStyle = 'rgba(255,255,255,.2)'; Art.ell(c, px - r * 0.25, py - r * 0.25, r * 0.4, r * 0.22); c.fill();
    if (o.moss && rnd() < o.moss) { c.fillStyle = Art.rgba(o.mossC, 0.5); Art.ell(c, px + r * 0.5, py + r * 0.4, r * 0.7, r * 0.4); c.fill(); }
  }
}
// 泥径上疏疏落落的汀步石
function rdSteps(c, W, H, rnd, o) {
  for (let i = 0; i < W * H / 260; i++) { c.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,.1)' : 'rgba(255,255,255,.09)'; Art.ell(c, rnd() * W, rnd() * H, 2 + rnd() * 5, 1 + rnd() * 2.5); c.fill(); }
  for (let y = 12; y < H; y += 24) for (let x = 12; x < W; x += 24) {
    if (rnd() < 0.22) continue;
    const px = x + (rnd() - 0.5) * 8, py = y + (rnd() - 0.5) * 8, r = 7.5 + rnd() * 3.5, n = 7, a0 = rnd() * 6, pts = [];
    for (let k = 0; k < n; k++) { const a = a0 + k / n * TAU, rr = r * (0.8 + rnd() * 0.3); pts.push([px + Math.cos(a) * rr, py + Math.sin(a) * rr * 0.86]); }
    const poly = d => { c.beginPath(); pts.forEach((p, k) => (k ? c.lineTo(p[0] + d, p[1] + d) : c.moveTo(p[0] + d, p[1] + d))); c.closePath(); };
    c.fillStyle = Art.rgba(o.mossC, 0.6); c.lineWidth = 3; c.strokeStyle = Art.rgba(o.mossC, 0.6); poly(0); c.stroke();
    c.fillStyle = 'rgba(0,0,0,.25)'; poly(1.2); c.fill();
    c.fillStyle = Art.shade(o.cols[Math.floor(rnd() * o.cols.length)], (rnd() - 0.5) * 0.1); poly(0); c.fill();
    c.fillStyle = 'rgba(255,255,255,.16)'; Art.ell(c, px - r * 0.2, py - r * 0.25, r * 0.5, r * 0.25); c.fill();
  }
}
// 夯土路：深浅不一的土色、碎石
function rdDirt(c, W, H, rnd, o) {
  for (let i = 0; i < W * H / 900; i++) { const x = rnd() * W, y = rnd() * H, r = 10 + rnd() * 22, gr = c.createRadialGradient(x, y, 0, x, y, r), col = o.cols[Math.floor(rnd() * o.cols.length)]; gr.addColorStop(0, Art.rgba(col, 0.5)); gr.addColorStop(1, Art.rgba(col, 0)); c.fillStyle = gr; c.fillRect(x - r, y - r, r * 2, r * 2); }
  for (let i = 0; i < W * H / 120; i++) { c.fillStyle = rnd() < 0.55 ? 'rgba(60,40,20,.22)' : 'rgba(255,240,210,.22)'; Art.ell(c, rnd() * W, rnd() * H, 1 + rnd() * 2.6, 0.8 + rnd() * 1.6); c.fill(); }
  for (let i = 0; i < W * H / 700; i++) { const x = rnd() * W, y = rnd() * H, r = 2 + rnd() * 2.5; c.fillStyle = '#8a8478'; Art.ell(c, x, y, r, r * 0.75); c.fill(); c.fillStyle = 'rgba(255,255,255,.3)'; Art.ell(c, x - r * 0.3, y - r * 0.3, r * 0.4, r * 0.25); c.fill(); }
}
// 碎石路：夯实的土石底子上铺满大小不一、有棱有角的碎石子，间或几块大些的
function rdGravel(c, W, H, rnd, o) {
  for (let i = 0; i < W * H / 1000; i++) { const x = rnd() * W, y = rnd() * H, r = 10 + rnd() * 24, gr = c.createRadialGradient(x, y, 0, x, y, r), col = i % 2 ? '#5e5a50' : '#a09a8a'; gr.addColorStop(0, Art.rgba(col, 0.4)); gr.addColorStop(1, Art.rgba(col, 0)); c.fillStyle = gr; c.fillRect(x - r, y - r, r * 2, r * 2); }
  for (let i = 0; i < W * H / 24; i++) {
    const x = rnd() * W, y = rnd() * H, big = rnd() < 0.1, r = big ? 3 + rnd() * 2.8 : 1.1 + rnd() * 1.9, n = 4 + Math.floor(rnd() * 3), a0 = rnd() * TAU, sq = 0.62 + rnd() * 0.3, col = Art.shade(o.cols[Math.floor(rnd() * o.cols.length)], (rnd() - 0.5) * 0.16), jg = Math.floor(rnd() * 5);
    const poly = (ox, oy, k) => { c.beginPath(); for (let j = 0; j < n; j++) { const a = a0 + j / n * TAU, rr = r * k * (0.68 + 0.32 * ((j * 3 + jg) % 5) / 4), px = x + ox + Math.cos(a) * rr, py = y + oy + Math.sin(a) * rr * sq; if (j) c.lineTo(px, py); else c.moveTo(px, py); } c.closePath(); };
    c.fillStyle = 'rgba(28,24,18,.5)'; poly(0.6, 0.9, 1.06); c.fill();
    c.fillStyle = col; poly(0, 0, 1); c.fill();
    if (r > 1.7) { c.fillStyle = 'rgba(255,255,255,.2)'; poly(-r * 0.2, -r * 0.24, 0.5); c.fill(); }
  }
}
// 刻着符文的晶砖：砖缝透着幽光
function rdRune(c, W, H, rnd, o) {
  const s = o.s;
  for (let y = 0; y < H; y += s) for (let x = 0; x < W; x += s) {
    c.fillStyle = Art.shade(o.cols[Math.floor(rnd() * o.cols.length)], (rnd() - 0.5) * 0.08); c.fillRect(x + 1, y + 1, s - 2, s - 2);
    c.fillStyle = 'rgba(200,170,255,.12)'; c.fillRect(x + 1, y + 1, s - 2, 1.4);
    if (rnd() < 0.3) {
      const cx = x + s / 2, cy = y + s / 2, r = s * 0.26; c.strokeStyle = Art.rgba(o.base, 0.6); c.lineWidth = 1; c.beginPath(); c.arc(cx, cy, r, 0, TAU);
      const k = 3 + Math.floor(rnd() * 3), a0 = rnd() * 6; for (let i = 0; i < k; i++) { const a = a0 + i / k * TAU; c.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); c.lineTo(cx + Math.cos(a + 2.2) * r, cy + Math.sin(a + 2.2) * r); } c.stroke();
    }
  }
}
// 残破的旧砖：缺了不少，缝里偶尔有余烬
function rdRuin(c, W, H, rnd, o) {
  for (let y = 0, j = 0; y < H; y += 13, j++) for (let x = j % 2 ? -13 : 0; x < W; x += 26) {
    const q = rnd(); if (q < 0.14) { if (q < 0.03) { c.fillStyle = 'rgba(255,110,40,.55)'; Art.ell(c, x + 13, y + 6, 4, 2); c.fill(); } continue; }
    c.fillStyle = Art.shade(o.cols[Math.floor(rnd() * o.cols.length)], (rnd() - 0.5) * 0.14); c.fillRect(x + 1, y + 1, 24 - (q < 0.3 ? rnd() * 8 : 0), 11);
    if (q > 0.8) { c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(x + 4 + rnd() * 16, y + 1); c.lineTo(x + 4 + rnd() * 16, y + 12); c.stroke(); }
  }
}
// 木栈道：一块块横铺的木板
function rdPlanks(c, W, H, rnd, o) {
  for (let y = 0; y < H; y += 10) for (let x = -rnd() * 60; x < W;) {
    const len = 50 + rnd() * 60; c.fillStyle = Art.shade(o.cols[Math.floor(rnd() * o.cols.length)], (rnd() - 0.5) * 0.12); c.fillRect(x + 0.8, y + 0.8, len - 1.6, 8.4);
    c.fillStyle = 'rgba(255,255,255,.1)'; c.fillRect(x + 0.8, y + 0.8, len - 1.6, 1.2); c.fillStyle = 'rgba(30,16,6,.5)'; Art.ell(c, x + 5, y + 5, 1.1, 1.1); c.fill(); Art.ell(c, x + len - 5, y + 5, 1.1, 1.1); c.fill();
    x += len;
  }
}
const ROADS = {
  plank:    { edge: '#3e2c1e', base: '#2e2016', paint: rdPlanks, cols: ['#b08a5c', '#a07c50', '#bc9668', '#946f46'] },   // 水寨的木栈道
  slab:     { edge: '#7c8c78', base: '#66746a', paint: rdSlabs, cols: ['#b9c6cb', '#abbac1', '#c4cfd2', '#a1b2ba'], rh: [18, 26], rw: [26, 52], gap: 2.4, hl: 0.2, crack: 0.12, moss: 0.3, mossC: '#5c8a4c' },   // 青石板山道
  slabFine: { edge: '#93a39c', base: '#7d8b90', paint: rdSlabs, cols: ['#ccd7da', '#c2ced3', '#d6dfe0'], rh: [24, 24], rw: [44, 52], gap: 1.6, hl: 0.24, crack: 0.03, moss: 0.04, mossC: '#6c9a5c' },   // 规整的青石甬道
  slabOld:  { edge: '#66745f', base: '#4a584a', paint: rdSlabs, cols: ['#a3ada6', '#94a09a', '#aeb7ae', '#88948f'], rh: [16, 28], rw: [20, 48], gap: 3.4, hl: 0.12, crack: 0.32, moss: 0.65, mossC: '#4f7a48' },   // 残破生苔的旧石阶
  paver:    { edge: '#9a8868', base: '#8a7a60', paint: rdPavers, cols: ['#d8c9ac', '#cdbea2', '#e0d2b6', '#c4b598'], sx: 24, sy: 24, gap: 1.6, bond: 1, hl: 0.16 },   // 方砖街
  cobble:   { edge: '#7e7692', base: '#6a6480', paint: rdCobbles, cols: ['#cfc8da', '#bdb5cb', '#dcd6e4', '#aea7c0'], r: [5, 8] },   // 卵石路
  step:     { edge: '#3f6644', base: '#8a7a54', paint: rdSteps, cols: ['#c4cab8', '#b6bcaa', '#d0d6c2'], mossC: '#4f8a4a' },   // 泥径上的汀步石
  mossy:    { edge: '#2e5238', base: '#3c5642', paint: rdCobbles, cols: ['#8fa08c', '#80927f', '#9cae98', '#738674'], r: [6, 10], moss: 0.5, mossC: '#3f8a4a' },   // 湿滑的苔石
  dirt:     { edge: '#8a7850', base: '#c2a878', paint: rdDirt, cols: ['#d4ba88', '#a89064', '#e0c898'] },   // 夯土路
  gravel:   { edge: '#625e54', base: '#7c7668', paint: rdGravel, cols: ['#b4aea0', '#9a9488', '#c6c0b0', '#86827a', '#a89c88', '#74706a', '#d0cabc', '#938a7c'] },   // 山间的碎石路
  basalt:   { edge: '#2e201c', base: '#ff8a26', paint: rdSlabs, cols: ['#6e5f5a', '#5f524e', '#7a6a64', '#544844'], rh: [18, 28], rw: [22, 46], gap: 2.2, hl: 0.1, crack: 0.2, moss: 0 },   // 火山岩板，缝里透着火光
  cinder:   { edge: '#30201a', base: '#ffa838', paint: rdPavers, cols: ['#84645a', '#74574e', '#906e62', '#684c44'], sx: 30, sy: 15, gap: 2, bond: 1, hl: 0.1 },   // 炉砖
  ice:      { edge: '#ffffff', base: '#f2f8ff', paint: rdSlabs, cols: ['#b5cbe4', '#a7c0dc', '#c2d5ea', '#9bb5d4'], rh: [20, 28], rw: [28, 50], gap: 3, hl: 0.32, crack: 0.1, moss: 0.4, mossC: '#ffffff' },   // 覆雪的石板
  frost:    { edge: '#e4f0ff', base: '#d8ecff', paint: rdPavers, cols: ['#93b6de', '#84a9d6', '#a0c0e4', '#789ecc'], sx: 34, sy: 34, gap: 1.6, bond: 0, hl: 0.36, crack: 0.5 },   // 冰砖
  rune:     { edge: '#1c1430', base: '#b07af8', paint: rdRune, cols: ['#54447e', '#4a3c70', '#5e4c8a'], s: 32 },   // 符文晶砖
  ruin:     { edge: '#2e2628', base: '#221c1e', paint: rdRuin, cols: ['#9a908c', '#8a807e', '#a69c98', '#7c7472'] }   // 残破的旧砖
};
const ROAD_OF = { mountain: 'slab', town: 'paver', bamboo: 'step', fire: 'basalt', snow: 'ice', abyss: 'rune', dusk: 'cobble', mist: 'slabOld', ash: 'ruin' };

function paintGround(m) {
  const { w, h, g, th, I } = m, rnd = mulberry32((m.d.seed || 7) + 99);
  const SS = G3.ok ? Math.min(2, 4096 / (Math.max(w, h) * T)) : GROUND_SS;
  const cv = document.createElement('canvas'); cv.width = Math.floor(w * T * SS); cv.height = Math.floor(h * T * SS);
  const c = cv.getContext('2d'); c.scale(SS, SS);
  if (m.d.indoor) {   // 室内：墙外漆黑，屋里按 d.floor 铺地，d.rugs = [[x, y, w, h, 颜色], …] 是地毯
    const F = FLOORS[m.d.floor || 'wood'], wood = (m.d.floor || 'wood') === 'wood';
    c.fillStyle = '#0a090e'; c.fillRect(0, 0, w * T, h * T);
    c.fillStyle = F[0]; c.fillRect(T, T, (w - 2) * T, (h - 1) * T);
    if (wood) {
      for (let y = T; y < h * T; y += 16) { let x = T + ((y / 16) % 3) * 40 - 80; while (x < (w - 1) * T) { const len = 90 + rnd() * 80, x0 = Math.max(T, x), x1 = Math.min((w - 1) * T, x + len); if (x1 > x0) { c.fillStyle = F[1 + Math.floor(rnd() * 2)]; c.globalAlpha = 0.5 + rnd() * 0.5; c.fillRect(x0, y, x1 - x0, 16); c.globalAlpha = 1; c.fillStyle = 'rgba(40,22,8,.5)'; c.fillRect(x1 - 1, y, 1.5, 16); } x += len; } c.fillStyle = 'rgba(40,22,8,.42)'; c.fillRect(T, y, (w - 2) * T, 1.2); }
    } else {
      const s = m.d.floor === 'stone' ? 24 : 48;
      for (let y = T; y < h * T; y += s) for (let x = T - ((y / s) % 2 ? s / 2 : 0); x < (w - 1) * T; x += s) { const x0 = Math.max(T, x), x1 = Math.min((w - 1) * T, x + s); c.fillStyle = F[Math.floor(rnd() * 3)]; c.fillRect(x0, y, x1 - x0, s); c.strokeStyle = 'rgba(0,0,0,.2)'; c.lineWidth = 1; c.strokeRect(x0 + 0.5, y + 0.5, x1 - x0 - 1, s - 1); }
    }
    for (let i = 0; i < w * h * 3; i++) { c.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.05)'; c.fillRect(T + rnd() * (w - 2) * T, T + rnd() * (h - 2) * T, 2 + rnd() * 6, 1 + rnd() * 2); }
    for (const r of m.d.rugs || []) {
      const x = r[0] * T + 5, y = r[1] * T + 5, rw = r[2] * T - 10, rh = r[3] * T - 10;
      c.fillStyle = r[4]; c.fillRect(x, y, rw, rh); c.strokeStyle = Art.shade(r[4], 0.45); c.lineWidth = 3; c.strokeRect(x + 6, y + 6, rw - 12, rh - 12); c.strokeStyle = Art.shade(r[4], -0.35); c.lineWidth = 2; c.strokeRect(x + 1, y + 1, rw - 2, rh - 2);
      c.strokeStyle = Art.shade(r[4], 0.3); c.lineWidth = 1.5; c.beginPath(); c.moveTo(x + rw / 2, y + 14); c.lineTo(x + rw - 14, y + rh / 2); c.lineTo(x + rw / 2, y + rh - 14); c.lineTo(x + 14, y + rh / 2); c.closePath(); c.stroke();
    }
    c.fillStyle = '#0a090e'; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (g[I(x, y)] === GR.WALL) c.fillRect(x * T, y * T, T, T);   // 墙占的格子（3D 里另画墙体）
    if (!G3.ok) { c.fillStyle = '#5a4a3a'; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (g[I(x, y)] === GR.WALL && (y === 0 || x === 0 || x === w - 1)) c.fillRect(x * T, y * T, T, T); }
    return cv;
  }
  const is = (x, y, v) => x >= 0 && y >= 0 && x < w && y < h && g[I(x, y)] === v;
  c.fillStyle = th.base[0]; c.fillRect(0, 0, w * T, h * T);
  for (let i = 0; i < w * h * 0.9; i++) {
    const x = rnd() * w * T, y = rnd() * h * T, r = 30 + rnd() * 70, col = i % 3 === 2 ? th.base[2] : th.blot[i % 2];
    const gr = c.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, Art.rgba(col, 0.34)); gr.addColorStop(1, Art.rgba(col, 0));
    c.fillStyle = gr; c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // 草丛与花
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    if (g[I(x, y)] !== GR.BASE) continue;
    const n = rnd() < 0.7 ? 1 + Math.floor(rnd() * 2) : 0;
    for (let k = 0; k < n; k++) {
      const px = x * T + rnd() * T, py = y * T + rnd() * T;
      if (rnd() < 0.3) { for (let j = 0; j < 4; j++) { c.fillStyle = th.flowers[Math.floor(rnd() * th.flowers.length)]; Art.circ(c, px + rnd() * 12 - 6, py + rnd() * 8 - 4, 1.4 + rnd() * 1.2); c.fill(); } }
      else { c.strokeStyle = Art.rgba(th.tuft, 0.7); c.lineWidth = 1.4; c.lineCap = 'round'; c.beginPath(); for (let j = -1; j <= 1; j++) { c.moveTo(px + j * 2.4, py); c.lineTo(px + j * 4.6, py - 6 - rnd() * 3); } c.stroke(); }
    }
  }
  const shape = (v, r, also) => {   // 某种地面连成的一片（圆角）
    c.beginPath();
    const t = (x, y) => is(x, y, v) || (also != null && is(x, y, also));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (t(x, y)) {
      const cx = x * T + T / 2, cy = y * T + T / 2;
      c.moveTo(cx + r, cy); c.arc(cx, cy, r, 0, TAU);
      if (t(x + 1, y)) c.rect(cx, cy - r, T, r * 2);
      if (t(x, y + 1)) c.rect(cx - r, cy, r * 2, T);
    }
  };
  const layer = (v, r, col, also) => { c.fillStyle = col; shape(v, r, also); c.fill(); };
  // 水 / 熔岩 / 虚空
  layer(GR.WATER, T * 0.86, th.shore, GR.BRIDGE);
  layer(GR.WATER, T * 0.72, th.water, GR.BRIDGE);
  c.globalAlpha = 0.35; layer(GR.WATER, T * 0.46, th.water2, GR.BRIDGE); c.globalAlpha = 1;
  // 山脚（3D 里山体另画，这一层垫在下面；2D 兜底画面就靠它）
  layer(GR.HILL, T * 0.8, Art.mix(th.stone, th.blot[1], 0.5)); layer(GR.HILL, T * 0.62, Art.shade(th.stone, -0.22));
  if (!G3.ok) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (g[I(x, y)] === GR.HILL && (x + y) % 2 === 0) {
    const px = x * T + T / 2, py = y * T + T * 0.7; c.fillStyle = Art.shade(th.stone, 0.12); c.beginPath(); c.moveTo(px - 20, py + 8); c.lineTo(px - 3, py - 22); c.lineTo(px + 18, py + 8); c.fill();
    c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.moveTo(px - 3, py - 22); c.lineTo(px + 18, py + 8); c.lineTo(px + 2, py + 8); c.fill();
  }
  // 路：各图按 d.road（没写就按主题）用不同的铺法——先铺路边和底色，再在路面范围内画石板、砖、卵石等纹样
  const road = ROADS[m.d.road] || ROADS[ROAD_OF[m.d.theme]];
  if (road) {
    layer(GR.PATH, T * 0.72, road.edge);
    // 纹样先画在一小块画布上（16 格见方），再当作平铺图案把整片路面一次填完。
    // 原先是按路面的形状裁剪后在整张图上逐块画，大图上要画半秒以上——换地图卡顿的一大来源
    const PS = 16 * T, pc = document.createElement('canvas'); pc.width = pc.height = Math.round(PS * SS);
    const pg = pc.getContext('2d'); pg.scale(SS, SS); pg.fillStyle = road.base; pg.fillRect(0, 0, PS, PS);
    road.paint(pg, PS, PS, mulberry32((m.d.seed || 7) * 5 + 3), road);
    const pat = c.createPattern(pc, 'repeat');
    if (pat && pat.setTransform && typeof DOMMatrix !== 'undefined') pat.setTransform(new DOMMatrix().scale(1 / SS));
    c.fillStyle = pat || road.base; shape(GR.PATH, T * 0.62); c.fill();
  } else { layer(GR.PATH, T * 0.7, th.pathEdge); layer(GR.PATH, T * 0.61, th.path); }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = g[I(x, y)], px = x * T, py = y * T;
    if (v === GR.WALL) {   // 城墙的墙基（3D 里墙体另画；2D 兜底画面就靠这一层）
      c.fillStyle = '#6e6a66'; c.fillRect(px, py, T, T); c.strokeStyle = 'rgba(0,0,0,.28)'; c.lineWidth = 1;
      c.beginPath(); for (let k = 1; k < 4; k++) { c.moveTo(px, py + k * 12); c.lineTo(px + T, py + k * 12); } for (let k = 0; k < 4; k++) { const o2 = k % 2 ? 12 : 0; c.moveTo(px + 12 + o2, py + k * 12); c.lineTo(px + 12 + o2, py + k * 12 + 12); c.moveTo(px + 36 - o2, py + k * 12); c.lineTo(px + 36 - o2, py + k * 12 + 12); } c.stroke();
    }
    else if (v === GR.PATH && !road) { for (let k = 0; k < 5; k++) { c.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,.07)' : 'rgba(255,255,255,.14)'; Art.ell(c, px + 6 + rnd() * 36, py + 6 + rnd() * 36, 2 + rnd() * 4, 1 + rnd() * 2); c.fill(); } }
    else if (v === GR.STONE) {
      c.fillStyle = Art.shade(th.stone, (rnd() - 0.5) * 0.1); c.fillRect(px, py, T, T);
      c.strokeStyle = 'rgba(0,0,0,.13)'; c.lineWidth = 1; c.strokeRect(px + 0.5, py + 0.5, T - 1, T - 1);
      c.beginPath(); const off = y % 2 ? T / 2 : 0; c.moveTo(px, py + T / 2); c.lineTo(px + T, py + T / 2); c.moveTo(px + off, py); c.lineTo(px + off, py + T / 2); c.moveTo(px + T / 2 - off / 2 + 12, py + T / 2); c.lineTo(px + T / 2 - off / 2 + 12, py + T); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(px + 1, py + 1, T - 2, 3);
    } else if (v === GR.BRIDGE) {
      const horiz = is(x - 1, y, GR.BRIDGE) || is(x + 1, y, GR.BRIDGE) || is(x - 1, y, GR.PATH) || is(x + 1, y, GR.PATH);
      c.fillStyle = '#a8713c'; c.fillRect(px, py, T, T);
      c.strokeStyle = 'rgba(60,30,10,.5)'; c.lineWidth = 1.2; c.beginPath();
      for (let k = 0; k <= 4; k++) { if (horiz) { c.moveTo(px + k * 12, py); c.lineTo(px + k * 12, py + T); } else { c.moveTo(px, py + k * 12); c.lineTo(px + T, py + k * 12); } }
      c.stroke();
      c.fillStyle = 'rgba(255,255,255,.1)'; c.fillRect(px, py, T, 4);
    }
  }
  return cv;
}

// 主角在大地图上每秒走几格。原先是 6.2——照人物的身量算，相当于全速冲刺；现在是快步赶路的速度
const HERO_SPEED = 5;
// 一昼夜多少秒（游玩时间），以及其中白天占多少：九分钟一昼夜，白天五分半、夜里三分半
const DAY_LEN = 540, NIGHT_AT = 0.61;

/* 氛围粒子：花瓣 / 落叶 / 雪 / 火星 / 萤火 / 幽尘（大地图与战斗共用） */
function ambStep(list, kind, t, dt) {
  for (const a of list) {
    if (kind === 'petal' || kind === 'leaf') { a.x += (0.025 + a.z * 0.03) * dt; a.y += (0.05 + a.z * 0.06) * dt; }
    else if (kind === 'snow') { a.y += (0.07 + a.z * 0.09) * dt; a.x += Math.sin(t + a.ph) * 0.012 * dt + 0.01 * dt; }
    else if (kind === 'ember' || kind === 'mote') { a.y -= (0.03 + a.z * 0.06) * dt; a.x += Math.sin(t * 0.8 + a.ph) * 0.01 * dt; }
    else { a.x += Math.sin(t * 0.5 + a.ph) * 0.02 * dt; a.y += Math.cos(t * 0.4 + a.ph * 2) * 0.02 * dt; }
    if (a.x > 1.05) a.x -= 1.1; if (a.x < -0.05) a.x += 1.1; if (a.y > 1.05) a.y -= 1.1; if (a.y < -0.05) a.y += 1.1;
  }
}
// ox / oy：镜头在地图上的位置（像素）。2D 大地图传进来，粒子就留在原地、不跟着镜头走；战斗画面镜头不动，不用传
function ambDraw(c, W, H, th, t, list, ox, oy) {
  const kind = th.amb, cols = th.ambc, PW = W * 1.1, PH = H * 1.1;
  c.save();
  if (kind === 'ember' || kind === 'firefly' || kind === 'mote') c.globalCompositeOperation = 'lighter';
  list.forEach((a, i) => {
    const x = ((a.x * W + W * 0.05 - (ox || 0)) % PW + PW) % PW - W * 0.05, y = ((a.y * H + H * 0.05 - (oy || 0)) % PH + PH) % PH - H * 0.05, col = cols[i % cols.length];
    if (kind === 'petal' || kind === 'leaf') {
      c.save(); c.translate(x, y); c.rotate(t * (1 + a.z) + a.ph); c.scale(1, 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + a.ph)));
      c.fillStyle = Art.rgba(col, 0.85); c.beginPath(); c.ellipse(0, 0, 3.5 + a.z * 3.5, 2 + a.z * 2, 0, 0, TAU); c.fill(); c.restore();
    } else if (kind === 'snow') { c.fillStyle = 'rgba(255,255,255,' + (0.5 + a.z * 0.5) + ')'; Art.circ(c, x, y, 1.2 + a.z * 2.4); c.fill(); }
    else { const al = kind === 'firefly' ? 0.35 + 0.35 * Math.sin(t * 2.5 + a.ph * 3) : 0.3 + a.z * 0.4; Art.glow(c, x, y, kind === 'firefly' ? 9 : 5 + a.z * 5, col, al); c.fillStyle = Art.rgba(col, al); Art.circ(c, x, y, 1.2); c.fill(); }
  });
  c.restore();
}

/* 3D 大地图上的氛围粒子：钉在场景里，各有各的位置和高度，不跟着镜头走——镜头移动时它们留在原地，
   按远近有大有小；飘出画面的，从另一侧补进来（位置按 PX × PZ 格的周期重复）。位置由时间直接算出，不存状态。 */
function ambDraw3(c, W, H, th, t, list, w3) {
  const kind = th.amb, cols = th.ambc;
  if (kind === 'none' || !list.length || w3.cx == null || !w3.proj) return;
  const PX = 26, PZ = 19, zc = w3.cz + (w3.vs - w3.vn) / 2, hd = (w3.vn + w3.vs) / 2;
  const nx = Math.max(0, Math.ceil((w3.vw - PX / 2) / PX)), nz = Math.max(0, Math.ceil((hd - PZ / 2) / PZ));   // 镜头拉远、看到的范围超过一个周期时，多铺几份
  const fr = v => v - Math.floor(v), up = kind === 'ember' || kind === 'mote';
  c.save();
  if (up || kind === 'firefly') c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < list.length * 4; i++) {   // 每个种子用四次：一个周期里只有落在画面中的那四成看得见，总数要比贴在屏幕上时多
    const a = list[i >> 2], odd = i & 3, sx = fr(a.sx + odd * 0.37), sy = fr(a.sy + odd * 0.61), z = fr(a.z + odd * 0.29), ph = a.ph + odd * 4.1, col = cols[i % cols.length];
    let X, Z, h, al = 1;
    if (kind === 'firefly') {   // 萤火：各自守着一小块地方，慢悠悠地绕
      X = sx * PX + Math.sin(t * 0.5 + ph) * 0.7; Z = sy * PZ + Math.cos(t * 0.4 + ph * 2) * 0.7;
      h = 0.45 + z * 1.2 + Math.sin(t * 0.7 + ph * 1.7) * 0.18; al = 0.35 + 0.35 * Math.sin(t * 2.5 + ph * 3);
    } else {   // 花瓣、落叶、雪从高处落到地上；火星、幽尘从地上往上升。落完（升完）一轮，换个地方再来
      const sp = kind === 'snow' ? 0.14 + z * 0.1 : up ? 0.09 + z * 0.1 : 0.1 + z * 0.08, q = t * sp + ph, n = Math.floor(q), k = q - n, top = kind === 'snow' ? 5 : up ? 3.2 : 4;
      h = up ? 0.15 + k * top : (1 - k) * top;
      X = fr(sx + n * 0.618) * PX + (up ? Math.sin(t * 0.8 + ph) * 0.3 : k * 1.5 + Math.sin(t + ph) * 0.25);
      Z = fr(sy + n * 0.381) * PZ + (up ? 0 : k * 0.7);
      al = Math.min(1, k * 8, (1 - k) * 5);
    }
    const bx = w3.cx + ((X - w3.cx) % PX + PX * 1.5) % PX - PX / 2, bz = zc + ((Z - zc) % PZ + PZ * 1.5) % PZ - PZ / 2;
    for (let ix = -nx; ix <= nx; ix++) for (let iz = -nz; iz <= nz; iz++) {
      const s = w3.proj(bx + ix * PX, h, bz + iz * PZ);
      if (!s || s.x < -20 || s.x > W + 20 || s.y < -20 || s.y > H + 20) continue;
      const u = clamp(s.s / 75, 0.4, 3), x = s.x, y = s.y;   // 默认镜头下一格约 75 像素；离镜头近的大、远的小
      if (kind === 'petal' || kind === 'leaf') {
        c.save(); c.translate(x, y); c.rotate(t * (1 + z) + ph); c.scale(1, 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + ph)));
        c.fillStyle = Art.rgba(col, 0.85 * al); c.beginPath(); c.ellipse(0, 0, (3.5 + z * 3.5) * u, (2 + z * 2) * u, 0, 0, TAU); c.fill(); c.restore();
      } else if (kind === 'snow') { c.fillStyle = 'rgba(255,255,255,' + ((0.5 + z * 0.5) * al).toFixed(3) + ')'; Art.circ(c, x, y, (1.2 + z * 2.4) * u); c.fill(); }
      else { const A = kind === 'firefly' ? al : (0.3 + z * 0.4) * al; Art.glow(c, x, y, (kind === 'firefly' ? 9 : 5 + z * 5) * u, col, A); c.fillStyle = Art.rgba(col, A); Art.circ(c, x, y, 1.2 * u); c.fill(); }
    }
  }
  c.restore();
}

// 这扇门里有没有带任务标记的人（有就在门上、小地图上标出来）
function doorMark(e) { const d = MAPS[e.to]; return !!d && (d.npcs || []).some(n => n.mark && (!n.show || n.show(S)) && n.mark(S)); }

const World = {
  map: null, npcs: [], foes: [], walkers: [], path: null, goalNpc: null, t: 0, cam: { x: 0, y: 0 }, amb: [], mark: null,
  p: { x: 0, y: 0, nx: 0, ny: 0, prog: 0, moving: false, face: 1, dx: 0, dy: 1, px: 0, py: 0, walk: false },

  enter(id, tx, ty) {
    if (typeof Cine !== 'undefined') Cine.kill();   // 换地图时，未收场的运镜一并结束
    // 最近去过的几张图的数据留着（地图是按种子生成的，内容每次都一样），再进去不必重新生成、重新画地面
    if (!this.map || this.map.id !== id) this.map = this.dataOf(id);
    const m = this.map, d = m.d, p = this.p;
    // 落脚处被山、水或房屋占了（地图改过之后的旧存档、旧坐标）：挪到最近的空地上
    if (!m.inb(tx, ty) || m.blk[m.I(tx, ty)]) {
      let bd = 1e9, bx = tx, by = ty;
      for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (!m.blk[m.I(x, y)]) { const dd = Math.abs(x - tx) + Math.abs(y - ty); if (dd < bd) { bd = dd; bx = x; by = y; } }
      tx = bx; ty = by;
    }
    p.x = p.nx = tx; p.y = p.ny = ty; p.moving = false; p.prog = 0;
    S.map = id; S.x = tx; S.y = ty;
    this.path = null; this.goalNpc = null;
    this.night = !!(d.dayNight && this.isNight());   // 有昼夜的图（落霞镇）：进来时是白天还是夜里（要在摆人物之前定下来）
    this.npcs = []; this.foes = [];
    this.refresh();
    this.spawnFoes();
    this.spawnWalkers();
    // 这张图里要出场的人物，模型先解析好（每种只做一次）：这时画面还黑着。不然走着走着遇到新面孔，画面会顿一下
    if (G3.ok && G3.k.prepModel) { const done = new Set(); for (const o of this.npcs.concat(this.foes, this.walkers)) if (o.look && !done.has(o.look)) { done.add(o.look); try { G3.k.prepModel(o.look); } catch (e) { console.warn(e); } } }
    this.pix(); this.cam.x = p.px - G.W / 2; this.cam.y = p.py - G.H / 2; this.clampCam();
    this.amb = []; for (let i = 0; i < 46 && m.th.amb !== 'none'; i++) this.amb.push({ x: Math.random(), y: Math.random(), z: Math.random(), ph: Math.random() * 9, sx: Math.random(), sy: Math.random() });   // sx / sy：3D 大地图上它在场景里的位置（见 ambDraw3）
    Sfx.music(m.th.music);
    if (d.onEnter) d.onEnter();
  },
  refresh() {
    const d = this.map.d;
    this.npcs = [];
    for (const def of d.npcs || []) {
      if (def.show && !def.show(S)) continue;
      // 夜里街上没有人：摊子收了，街坊、兵丁都回屋了。只留眼下有事要找的人（头上顶着任务标记的），或定义里写明夜里也在的（night）
      if (this.night && d.dayNight && !def.night && !(def.mark && def.mark(S))) continue;
      const info = def.who ? whoIs(def.who) : null;
      const n = { def, x: def.x, y: def.y, w: def.w || 1, px: (def.x + (def.w || 1) / 2) * T, py: def.y * T + T * 0.8, face: def.face || 1, look: info && info.look, name: def.name || (info && info.name) || '', sprite: def.sprite, seed: def.x * 3 + def.y };
      this.npcs.push(n);
    }
    for (const def of d.fixed || []) {
      const want = !def.show || def.show(S), i = this.foes.findIndex(f => f.def === def);
      if (want && i < 0) this.foes.push(this.mkFoe(def.x, def.y, def.group, def));
      else if (!want && i >= 0) this.foes.splice(i, 1);
    }
  },
  mkFoe(x, y, group, def) {
    const e = ENEMIES[group[0]];
    return { x, y, nx: x, ny: y, prog: 0, moving: false, home: { x, y }, group, look: e.look, name: e.name, boss: !!(def && def.boss), fixed: !!def, def: def || null, cool: 0, think: Math.random() * 2, face: -1, seed: x + y * 2, spd: 2, px: x * T + T / 2, py: y * T + T * 0.8, alert: false };
  },
  spawnFoes() {
    const m = this.map, d = m.d, fz = d.foes; if (!fz) return;
    const dist = this.bfs(this.p.x, this.p.y).dist, cand = [];
    for (let y = 3; y < m.h - 3; y++) for (let x = 3; x < m.w - 3; x++) {
      const i = m.I(x, y);
      if (dist[i] < 9 || m.g[i] === GR.STONE || m.g[i] === GR.BRIDGE) continue;
      if (this.npcs.some(n => Math.abs(n.x - x) + Math.abs(n.y - y) < 4)) continue;
      if ((d.fixed || []).some(n => Math.abs(n.x - x) + Math.abs(n.y - y) < 5)) continue;
      if ((d.exits || []).some(e => Math.abs(e.x - x) + Math.abs(e.y - y) < 6)) continue;
      cand.push([x, y]);
    }
    // 关卡图（写了“该在几级来”的）上，每四拨对手里有一拨由精英带队：个头大一圈、头顶有金色的名号，看得见、绕得开
    const eliteN = d.lv ? Math.round(fz.n / 4) : 0, AF = Object.keys(AFFIX);
    let tries = 0;
    while (this.foes.filter(f => !f.fixed).length < fz.n && cand.length && tries++ < 400) {
      const c = cand[Math.floor(Math.random() * cand.length)];
      if (this.foes.some(f => Math.abs(f.x - c[0]) + Math.abs(f.y - c[1]) < 6)) continue;
      const f = this.mkFoe(c[0], c[1], fz.groups[Math.floor(Math.random() * fz.groups.length)], null);
      if (this.foes.filter(x => x.elite).length < eliteN) {
        f.elite = true; f.affix = AF[Math.floor(Math.random() * AF.length)]; f.name = AFFIX[f.affix].n + '·' + f.name;
        f.look = Object.assign({}, f.look, { sz: (f.look.sz || 1) * 1.15, aura: '#ffd27a' });
      }
      this.foes.push(f);
    }
  },
  // 街上的行人：在 d.walkers.pts 这些路口之间来回走动，只是景致，不挡路也不能交谈
  spawnWalkers() {
    const wd = this.map.d.walkers; this.walkers = [];
    if (!wd || typeof CITIZENS === 'undefined' || this.night) return;   // 夜里没有行人
    for (let i = 0; i < wd.n; i++) {
      const a = wd.pts[(i * 5 + 3) % wd.pts.length];
      this.walkers.push({ x: a[0], y: a[1], nx: a[0], ny: a[1], prog: 0, moving: false, path: [], wait: Math.random() * 4, look: CITIZENS[i % CITIZENS.length], seed: i * 1.37 + 0.2, spd: 1.0 + (i % 4) * 0.08,   /* 不紧不慢地走：每秒一格左右 */ dx: 0, dy: 1, px: a[0] * T + T / 2, py: a[1] * T + T * 0.8 });
    }
  },
  stepWalkers(dt) {
    const wd = this.map.d.walkers; if (!wd) return;
    for (const w of this.walkers) {
      let carry = 0;
      if (w.moving) { w.prog += dt * w.spd; if (w.prog >= 1) { carry = Math.min(0.9, w.prog - 1); w.x = w.nx; w.y = w.ny; w.prog = 0; w.moving = false; } }
      if (!w.moving) {
        if (w.path.length) { const n = w.path.shift(), dx = n[0] - w.x, dy = n[1] - w.y; if (Math.abs(dx) + Math.abs(dy) === 1 && this.walkable(n[0], n[1])) { w.nx = n[0]; w.ny = n[1]; w.dx = dx; w.dy = dy; w.moving = true; w.prog = carry; } else w.path = []; }
        else if ((w.wait -= dt) <= 0) {   // 到了一处，歇一会儿，再挑下一个去处
          const tg = wd.pts[Math.floor(Math.random() * wd.pts.length)], b = this.bfs(w.x, w.y), i = this.map.I(tg[0], tg[1]);
          if (b.dist[i] > 0) w.path = this.pathTo(b, i);
          w.wait = 1 + Math.random() * 5;
        }
      }
      w.px = lerp(w.x, w.nx, w.prog) * T + T / 2; w.py = lerp(w.y, w.ny, w.prog) * T + T * 0.8;
    }
  },
  npcAt(x, y) { return this.npcs.find(n => y === n.y && x >= n.x && x < n.x + n.w); },
  walkable(x, y, foe) {
    const m = this.map;
    if (!m.inb(x, y) || m.blk[m.I(x, y)]) return false;
    if (this.npcAt(x, y)) return false;
    if (foe) {
      if ((m.d.exits || []).some(e => x >= e.x && x < e.x + (e.w || 1) && y >= e.y && y < e.y + (e.h || 1))) return false;
      if (this.foes.some(f => f !== foe && ((f.x === x && f.y === y) || (f.nx === x && f.ny === y)))) return false;
    }
    return true;
  },
  bfs(sx, sy) {
    const m = this.map, n = m.w * m.h, dist = new Int16Array(n).fill(-1), prev = new Int32Array(n).fill(-1), q = [m.I(sx, sy)];
    dist[q[0]] = 0;
    for (let qi = 0; qi < q.length; qi++) {
      const i = q[qi], x = i % m.w, y = (i - x) / m.w;
      for (const dd of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const X = x + dd[0], Y = y + dd[1];
        if (!this.walkable(X, Y)) continue;
        const j = m.I(X, Y); if (dist[j] >= 0) continue;
        dist[j] = dist[i] + 1; prev[j] = i; q.push(j);
      }
    }
    return { dist, prev };
  },
  pathTo(b, i) {
    const m = this.map, out = [];
    while (i >= 0 && b.dist[i] > 0) { out.unshift([i % m.w, Math.floor(i / m.w)]); i = b.prev[i]; }
    return out;
  },
  pix() {
    const p = this.p, fx = lerp(p.x, p.nx, p.prog), fy = lerp(p.y, p.ny, p.prog);
    p.px = fx * T + T / 2; p.py = fy * T + T * 0.8;
  },
  clampCam() {
    const m = this.map, mw = m.w * T, mh = m.h * T, c = this.cam;
    c.x = mw <= G.W ? (mw - G.W) / 2 : clamp(c.x, 0, mw - G.W);
    c.y = mh <= G.H ? (mh - G.H) / 2 : clamp(c.y, 0, mh - G.H);
  },

  click(lx, ly) {
    if (G.busy) return;
    let wx = lx + this.cam.x, wy = ly + this.cam.y, n;
    const m = this.map, p = this.p;
    if (G3.ok) {
      const g = G3.world.pick(lx, ly); if (!g) return;
      wx = g.x * T; wy = g.z * T;
      n = this.npcs.find(n => { const s = G3.world.screen(n.px / T, 0.7, n.py / T - 0.3); return Math.abs(lx - s.x) < 26 * n.w + 6 && Math.abs(ly - s.y) < 56; });
    } else n = this.npcs.find(n => Math.abs(wx - n.px) < 22 * n.w + 4 && wy > n.py - 66 && wy < n.py + 10);
    const b = this.bfs(p.x, p.y);
    this.goalNpc = null; this.path = null;
    if (n) {
      let best = -1;
      for (let k = 0; k < n.w; k++) for (const dd of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
        const X = n.x + k + dd[0], Y = n.y + dd[1];
        if (!m.inb(X, Y)) continue;
        const i = m.I(X, Y);
        if (b.dist[i] >= 0 && (best < 0 || b.dist[i] < b.dist[best])) best = i;
      }
      if (best >= 0) { this.path = this.pathTo(b, best); this.goalNpc = n; this.mark = { x: n.px, y: n.py, t: 0 }; }
      return;
    }
    const tx = Math.floor(wx / T), ty = Math.floor(wy / T);
    let best = -1, bd = 1e9;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const X = tx + dx, Y = ty + dy; if (!m.inb(X, Y)) continue;
      const i = m.I(X, Y); if (b.dist[i] < 0) continue;
      const dd = Math.hypot((X + 0.5) * T - wx, (Y + 0.5) * T - wy);
      if (dd < bd) { bd = dd; best = i; }
    }
    if (best >= 0) { this.path = this.pathTo(b, best); this.mark = { x: (best % m.w + 0.5) * T, y: (Math.floor(best / m.w) + 0.62) * T, t: 0 }; }
  },
  interact() {
    if (G.busy) return;
    const p = this.p; if (p.moving) return;
    const dirs = [[p.dx, p.dy], [0, -1], [1, 0], [-1, 0], [0, 1]];
    for (const d of dirs) { const n = this.npcAt(p.x + d[0], p.y + d[1]); if (n) { this.talk(n); return; } }
  },
  async talk(n) {
    if (G.busy) return;
    G.busy = true; this.path = null; this.goalNpc = null;
    const p = this.p;
    if (Math.abs(n.px - p.px) > 4) { p.face = n.px > p.px ? 1 : -1; if (!n.sprite) n.face = -p.face; }
    try {
      if (SCRIPTS[n.def.talk]) await SCRIPTS[n.def.talk](n);
      // AI 人物：固定剧情说完之后，可以再自由聊几句（在“AI 人物设置”里接好了接口才出现）
      // 说完固定剧情之后：闲谈（接了 AI 才有）、赠礼，以及好感到了门槛时对方的回赠
      if (G.scene === 'world' && n.def.who && n.def.pose !== 'dead' && !(n.def.frozen && n.def.frozen(S)) && Jianghu.has(n.def.who)) await Jianghu.after(n.def.who);
    } catch (e) { console.error(e); G.err(e); }
    if (typeof Cine !== 'undefined') Cine.kill();
    if (G.scene === 'world') { this.refresh(); UI.hud(); }
    G.busy = false;
  },
  async encounter(f) {
    G.busy = true; this.path = null; this.goalNpc = null;
    try {
      if (f.def && f.def.pre) await SCRIPTS[f.def.pre](f);
      Sfx.play('encounter');
      await UI.flash();
      let group = f.def && f.def.groupFn ? f.def.groupFn() : f.group;
      const lv0 = S.party.reduce((s, m) => s + m.lv, 0);
      const fo = { follow: !!(f.def && f.def.follow) };   // 守关战：对手用自己的等级；follow 的（城里与四郊的委托）至少跟到队伍的等级
      DIFF = S.diff || 0;
      if (!f.fixed) {   // 路上随机遇到的：人数补到不少于队伍人数，等级跟着这张图和队伍走（见 core.js 的 encounterPlan）
        const pool = Array.from(new Set([].concat.apply([], (this.map.d.foes && this.map.d.foes.groups) || [])));
        const plan = encounterPlan(group, pool, S.party, this.map.d.lv);
        group = plan.ids; fo.lv = plan.lv; fo.rw = plan.rw;
        if (f.elite) { fo.elite = [true]; fo.affix = f.affix; fo.boss = false; }   // 带队的那个是精英（比同伙高两级，有架势条和词缀）
      }
      // 首领战输了不直接送回去：可以就地再战，也可以回去整备（main.js 的 G.bossDefeat）
      const bid = f.fixed && group.find(id => ENEMIES[id].boss);
      let r;
      for (;;) {
        r = await Battle.start(group, Object.assign({ boss: f.boss, theme: this.map.d.btheme || this.map.d.theme, noFlee: f.fixed }, fo));
        if (r !== 'lose' || !bid) break;
        if (!(await G.bossDefeat(bid))) { r = 'gone'; break; }
      }
      if (r === 'win') {
        const i = this.foes.indexOf(f); if (i >= 0) this.foes.splice(i, 1);
        if (bid) (S.bossWin = S.bossWin || {})[bid] = 1;   // 打赢过的首领记一笔（说书先生不再提它）
        if (!f.fixed && S.ctr && S.ctr.st === 2 && S.ctr.map === S.map && S.ctr.got < S.ctr.need) {   // 铁老三要的兵刃残片（story.js 的 counterTalk）
          S.ctr.got++; UI.toast('兵刃残片 <b>' + S.ctr.got + ' / ' + S.ctr.need + '</b>' + (S.ctr.got >= S.ctr.need ? '——可以回去找铁老三了' : ''));
        }
        if (f.elite) {   // 精英的战利品：伤药，每张图头两回另有一件当前这一档的兵刃或护甲
          const got = (S.eliteGear = S.eliteGear || {}), mid = S.map, gear = (got[mid] || 0) < 2;
          const loot = eliteLoot(fo.lv, S.party, gear);
          if (gear && loot.some(id => ITEMS[id].g)) got[mid] = (got[mid] || 0) + 1;
          for (const id of loot) give(id, 1);
        }
        if (f.def && f.def.post) await SCRIPTS[f.def.post](f);
        if (G.scene === 'world') { this.refresh(); G.save(); }
        // 打完之后队里的人随口说两句：恶战、有人挂彩、有人长进了，说的话各不相同
        if (G.scene === 'world' && typeof Banter !== 'undefined') {
          const names = Array.from(new Set(group.map(id => ENEMIES[id].name))).join('、'), up = S.party.reduce((s, m) => s + m.lv, 0) > lv0;
          const hurt = typeof calcStats === 'function' && S.party.some(m => m.hp > 0 && m.hp < calcStats(m).mhp * 0.4);
          Banter.fire(f.boss ? 'bosswin' : hurt ? 'hurt' : up ? 'levelup' : 'win', { names });
        }
      } else if (r === 'flee') { f.cool = 5; f.alert = false; if (typeof Banter !== 'undefined') Banter.fire('flee'); }
      else if (r === 'lose') await G.defeat();
    } catch (e) { console.error(e); G.err(e); }
    if (typeof Cine !== 'undefined') Cine.kill();
    UI.hud();
    G.busy = false;
  },
  // 一张图的数据：最近用过的几张留着（地图是按种子生成的，内容每次都一样），不必重新生成、重新画地面
  dataOf(id) {
    const C = this.cache || (this.cache = new Map());
    let m = C.get(id); if (m) C.delete(id); else m = buildMap(id);
    C.set(id, m); while (C.size > 6) C.delete(C.keys().next().value);
    return m;
  },
  // 走近出口：让 3D 场景在后台把那边的图先建起来（每帧做一小段），真走过去时就不用等
  prewarm() {
    if (!G3.ok || !G3.world.prewarm) return;
    const p = this.p;
    for (const e of this.map.d.exits || []) {
      // 屋门不预建：屋子小，进门转黑的那一下就建好了；在城里沿街走会路过一扇又一扇门，挨个预建反而让走路一顿一顿的
      if (e.door || (e.need && !S.flags[e.need]) || !MAPS[e.to] || G3.world.has(e.to)) continue;
      if (Math.abs(e.x + ((e.w || 1) - 1) / 2 - p.x) + Math.abs(e.y + ((e.h || 1) - 1) / 2 - p.y) > 12) continue;
      G3.world.prewarm(this.dataOf(e.to)); break;
    }
  },
  async useExit(e) {
    G.busy = true;
    // 那张图的场景还没建过（第一次去，或者太久没去已经释放了）：转黑时在画面中央写一行“前往……”，建场景的一两秒里不至于像卡住
    if (G3.ok && G3.world.has && !G3.world.has(e.to) && MAPS[e.to] && !MAPS[e.to].indoor && !G.autoSkip) UI.fadeNote('前往 ' + MAPS[e.to].name + ' …');
    const fading = UI.fade(1);
    // 画面转黑的同时把下一张图备好（没预建完的接着做完），转黑结束就能直接进去
    if (G3.ok && G3.world.prepare && !G.autoSkip) { await new Promise(r => setTimeout(r, 40)); try { G3.world.prepare(this.dataOf(e.to)); } catch (er) { console.warn(er); } }
    await fading;
    this.enter(e.to, e.tx, e.ty);
    G.save(); UI.hud();
    UI.banner(this.map.d.name, this.map.d.sub || '');
    await UI.fade(0);
    G.busy = false;
    if (typeof Banter !== 'undefined') Banter.fire('enter');
  },
  arrive() {
    const p = this.p, m = this.map;
    S.x = p.x; S.y = p.y;
    for (const e of m.d.exits || []) {
      if (p.x >= e.x && p.x < e.x + (e.w || 1) && p.y >= e.y && p.y < e.y + (e.h || 1)) {
        if (e.need && !S.flags[e.need]) {
          UI.toast((typeof e.msg === 'function' ? e.msg() : e.msg) || '前路未通。');
          p.x -= p.dx; p.y -= p.dy; p.nx = p.x; p.ny = p.y; S.x = p.x; S.y = p.y; this.path = null; G.keys = {};
        } else this.useExit(e);
        return;
      }
    }
    // 以前走近出口时会在后台预建那边的图（this.prewarm()）。实测建一张大图要一两秒的整块运算，拆不成不打扰画面的小段，
    // 走路时做就是一顿一顿的；现在一律放到换图转黑的那一下去做（见 useExit），走路时不做任何重活
    Jianghu.step();   // 路遇奇事
    if (typeof Banter !== 'undefined' && !G.busy) Banter.step();   // 走了一段路，队里的人随口聊两句
  },

  /* 昼夜：按游玩时间走，一昼夜 DAY_LEN 秒，前 NIGHT_AT 这一段是白天，之后是夜里。只有地图定义里写了 dayNight 的图（落霞镇）会变样；
     在这样的图里待到时辰变了，就在一次短短的黑幕里换过去。客栈里可以歇到天亮，或者坐到掌灯（setTime）。 */
  dayPhase() { return (((S.time || 0) + (S.dayOff || 0)) % DAY_LEN + DAY_LEN) % DAY_LEN / DAY_LEN; },
  isNight() { return this.dayPhase() >= NIGHT_AT; },
  setTime(night) { S.dayOff = ((night ? NIGHT_AT + 0.015 : 0.015) * DAY_LEN - (S.time || 0)) % DAY_LEN; if (this.map && this.map.d.dayNight && this.night !== !!night) this.applyNight(!!night); },
  // 当前这张图换成夜里 / 白天：光线之外，街上的人也跟着换——夜里只留有任务要找的人，行人都散了；天亮再回来
  applyNight(n) {
    this.night = n; if (G3.ok && G3.world.applyNight) G3.world.applyNight(n);
    this.refresh(); this.spawnWalkers();
    const p = this.p;   // 天亮时人回到原处，要是正好站在主角脚下，把主角挪到旁边的空地上
    if (!n && this.npcAt(p.x, p.y)) {
      let best = null, bd = 1e9;
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const x = p.x + dx, y = p.y + dy, dd = Math.abs(dx) + Math.abs(dy); if (dd && dd < bd && this.walkable(x, y)) { bd = dd; best = [x, y]; } }
      if (best) { p.x = p.nx = best[0]; p.y = p.ny = best[1]; p.moving = false; p.prog = 0; S.x = p.x; S.y = p.y; this.pix(); }
    }
  },
  async nightShift() {
    G.busy = true; this.path = null; this.goalNpc = null;
    const n = this.isNight();
    await UI.fade(1);
    this.applyNight(n); UI.hud();
    await UI.fade(0);
    UI.toast(n ? '入夜了——城里掌起了灯，街上的人都回屋了' : '天亮了');
    G.busy = false;
    if (typeof Banter !== 'undefined') Banter.fire(n ? 'night' : 'dawn');
  },
  update(dt) {
    this.t += dt;
    const p = this.p, m = this.map;
    if (!G.busy && !G.autoSkip && typeof spareTick === 'function') spareTick(dt);   // 备用支线：白天在落霞镇或城郊时随机来一桩（见 story.js 末尾）
    if (!G.busy && m.d.dayNight && !p.moving && !G.autoSkip && this.night !== this.isNight()) { this.nightShift(); return; }
    if (!G.busy) {
      let carry = 0;   // 走完一格时多出来的那一小段，接着算进下一格——不然每过一格都会顿一下
      if (p.moving) {
        p.prog += dt * HERO_SPEED;
        if (p.prog >= 1) { carry = Math.min(0.9, p.prog - 1); p.x = p.nx; p.y = p.ny; p.prog = 0; p.moving = false; this.arrive(); }
      }
      if (!p.moving && !G.busy) {
        let dx = 0, dy = 0; const k = G.keys;
        if (k.left) dx = -1; else if (k.right) dx = 1; else if (k.up) dy = -1; else if (k.down) dy = 1;
        if (dx || dy) { this.path = null; this.goalNpc = null; }
        else if (this.path && this.path.length) {
          const n = this.path.shift(); dx = n[0] - p.x; dy = n[1] - p.y;
          if (Math.abs(dx) + Math.abs(dy) !== 1) { dx = dy = 0; this.path = null; }
        } else if (this.goalNpc) {
          const n = this.goalNpc; this.goalNpc = null;
          if (p.y === n.y ? (p.x >= n.x - 1 && p.x <= n.x + n.w) : (Math.abs(p.y - n.y) === 1 && p.x >= n.x && p.x < n.x + n.w)) { this.talk(n); }
        }
        if (dx || dy) {
          p.dx = dx; p.dy = dy; if (dx) p.face = dx;
          if (this.walkable(p.x + dx, p.y + dy)) { p.moving = true; p.nx = p.x + dx; p.ny = p.y + dy; p.prog = carry; }
          else this.path = null;
        }
      }
      p.walk = p.moving;
      this.pix();
      this.stepWalkers(dt);
      // 敌人
      for (const f of this.foes) {
        if (f.cool > 0) f.cool -= dt;
        if (f.moving) { f.prog += dt * f.spd; if (f.prog >= 1) { f.x = f.nx; f.y = f.ny; f.prog = 0; f.moving = false; } }
        else if (!f.fixed) {
          const ddx = p.x - f.x, ddy = p.y - f.y, dist = Math.abs(ddx) + Math.abs(ddy);
          f.alert = dist <= 5 && f.cool <= 0;
          let sx = 0, sy = 0;
          if (f.alert) {
            if (Math.abs(ddx) >= Math.abs(ddy)) { sx = Math.sign(ddx); if (!this.walkable(f.x + sx, f.y, f)) { sx = 0; sy = Math.sign(ddy); } }
            else { sy = Math.sign(ddy); if (!this.walkable(f.x, f.y + sy, f)) { sy = 0; sx = Math.sign(ddx); } }
            f.spd = 3.5;
          } else if ((f.think -= dt) <= 0) {
            f.think = 0.5 + Math.random() * 1.8;
            const dd = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(Math.random() * 4)];
            if (Math.abs(f.x + dd[0] - f.home.x) + Math.abs(f.y + dd[1] - f.home.y) <= 4) { sx = dd[0]; sy = dd[1]; }
            f.spd = 1.8;
          }
          if ((sx || sy) && this.walkable(f.x + sx, f.y + sy, f)) { f.moving = true; f.nx = f.x + sx; f.ny = f.y + sy; f.prog = 0; if (sx) f.face = sx; }
        } else { f.face = p.px > f.px ? 1 : -1; }
        f.px = lerp(f.x, f.nx, f.prog) * T + T / 2; f.py = lerp(f.y, f.ny, f.prog) * T + T * 0.8;
      }
      for (const f of this.foes) {
        if (f.cool > 0) continue;
        const dd = Math.hypot(f.px - p.px, f.py - p.py);
        if (dd < (f.fixed ? T * 1.7 : T * 0.74)) { p.moving = false; p.prog = 0; p.nx = p.x; p.ny = p.y; p.walk = false; this.pix(); this.encounter(f); break; }
      }
    } else p.walk = false;
    // 镜头
    const tx = p.px - G.W / 2, ty = p.py - G.H * 0.54, k = 1 - Math.exp(-dt * 7);
    this.cam.x += (tx - this.cam.x) * k; this.cam.y += (ty - this.cam.y) * k; this.clampCam();
    if (this.mark) { this.mark.t += dt; if (this.mark.t > 0.6) this.mark = null; }
    // 氛围粒子
    ambStep(this.amb, m.th.amb, this.t, dt);
  },

  /* 3D 模式：场景交给 WebGL，这里只画名牌、标记、氛围粒子等叠加层 */
  draw3(c, W, H) {
    const m = this.map, th = m.th, t = this.t, w3 = G3.world;
    w3.render(this, G.dt || 0.016);
    const scr = (px, py, h) => w3.screen(px / T, h, py / T - 0.3);
    const cineOn = !!w3.cine;   // 剧情运镜时不画头顶的名字和标记
    if (this.mark && !cineOn) { const k = this.mark.t / 0.6, s = w3.screen(this.mark.x / T, 0.02, this.mark.y / T - 0.2); c.strokeStyle = 'rgba(255,240,170,' + (1 - k) + ')'; c.lineWidth = 2.5; Art.ell(c, s.x, s.y, 10 + k * 20, 5 + k * 10); c.stroke(); }
    c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    for (const n of cineOn ? [] : this.npcs) {
      const sz = (n.look && n.look.sz) || 1;
      const e3 = w3.npc.get(n.def);
      const h3 = n.sprite === 'chest' ? 0.62 : n.sprite === 'spring' ? 0.8 : n.w > 1 ? 2.15 : n.def.pose === 'dead' ? 0.55 : (e3 && e3.ch ? e3.ch.h : 1.5 * sz) + 0.06;
      const s = scr(n.px, n.py, h3);
      if (s.x < -80 || s.x > W + 80 || s.y < -30 || s.y > H + 60) continue;
      const top = s.y - 5;
      if (n.name && n.sprite !== 'chest') { c.font = '600 13px ' + FONT_S; c.lineWidth = 3; c.strokeStyle = 'rgba(15,12,28,.85)'; c.strokeText(n.name, s.x, top); c.fillStyle = n.sprite === 'spring' ? '#a8fff0' : '#fff4d0'; c.fillText(n.name, s.x, top); }
      if (n.def.mark && n.def.mark(S)) {
        const by = top - 17 + Math.sin(t * 4) * 3;
        c.font = 'bold 24px ' + FONT_K; c.lineWidth = 4; c.strokeStyle = '#5a2a00'; c.strokeText('!', s.x, by); c.fillStyle = '#ffd94a'; c.fillText('!', s.x, by);
      }
    }
    // 房门：走近了标出这是谁家 / 哪间铺子；屋里有人等着（任务标记）时，门上顶一个叹号
    for (const e of cineOn ? [] : m.d.exits || []) {
      if (!e.door) continue;
      const near = Math.abs(e.x - this.p.x) + Math.abs(e.y - this.p.y) < 8, mk = doorMark(e);
      if (!near && !mk) continue;
      const s = w3.screen(e.x + 0.5, 2.3, e.y + 0.4); if (s.x < -80 || s.x > W + 80 || s.y < -30 || s.y > H + 60) continue;
      if (near) { c.font = '600 13px ' + FONT_S; c.lineWidth = 3; c.strokeStyle = 'rgba(15,12,28,.85)'; c.strokeText('▸ ' + MAPS[e.to].name, s.x, s.y); c.fillStyle = '#ffe9a8'; c.fillText('▸ ' + MAPS[e.to].name, s.x, s.y); }
      if (mk) { const by = s.y - 18 + Math.sin(t * 4) * 3; c.font = 'bold 24px ' + FONT_K; c.lineWidth = 4; c.strokeStyle = '#5a2a00'; c.strokeText('!', s.x, by); c.fillStyle = '#ffd94a'; c.fillText('!', s.x, by); }
    }
    for (const f of cineOn ? [] : this.foes) {
      const e = w3.foe.get(f), s = scr(f.px, f.py, (e ? e.ch.h : 1.3) + 0.12), top = s.y - 4;
      if (f.boss) { c.font = '700 14px ' + FONT_S; c.lineWidth = 3; c.strokeStyle = 'rgba(30,0,10,.9)'; c.strokeText(f.name, s.x, top); c.fillStyle = '#ff8a7a'; c.fillText(f.name, s.x, top); }
      else if (f.elite && !f.alert) { c.font = '700 13px ' + FONT_S; c.lineWidth = 3; c.strokeStyle = 'rgba(40,24,0,.9)'; c.strokeText(f.name, s.x, top); c.fillStyle = '#ffd27a'; c.fillText(f.name, s.x, top); }
      else if (f.alert) { c.font = 'bold 22px ' + FONT_K; c.lineWidth = 4; c.strokeStyle = '#400'; c.strokeText('!', s.x, top + Math.sin(t * 10) * 2); c.fillStyle = '#ff5a4a'; c.fillText('!', s.x, top + Math.sin(t * 10) * 2); }
    }
    ambDraw3(c, W, H, th, t, this.amb, w3);
    const nt = this.night;   // 夜里：暖色的罩色换成一层很淡的冷色，四角压得更暗
    c.fillStyle = nt ? 'rgba(40,60,130,.08)' : th.grade; c.fillRect(0, 0, W, H);
    const vg = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.hypot(W, H) * 0.58);
    vg.addColorStop(0, 'rgba(' + (nt ? '4,6,20' : th.vig) + ',0)'); vg.addColorStop(1, 'rgba(' + (nt ? '4,6,20' : th.vig) + ',' + (nt ? 0.42 : th.vigA * 0.8) + ')');
    c.fillStyle = vg; c.fillRect(0, 0, W, H);
  },
  draw(c, W, H) {
    if (G3.ok) return this.draw3(c, W, H);
    const m = this.map, th = m.th, t = this.t, p = this.p;
    const cx = Math.round(this.cam.x * 2) / 2, cy = Math.round(this.cam.y * 2) / 2;
    c.fillStyle = '#0b0a14'; c.fillRect(0, 0, W, H);
    c.save(); c.translate(-cx, -cy);
    c.drawImage(m.ground, 0, 0, m.w * T, m.h * T);
    const x0 = Math.max(0, Math.floor(cx / T) - 2), x1 = Math.min(m.w - 1, Math.ceil((cx + W) / T) + 2);
    const y0 = Math.max(0, Math.floor(cy / T) - 1), y1 = Math.min(m.h - 1, Math.ceil((cy + H) / T) + 3);
    // 液面动态
    const liq = th.liquid || 'water';
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (m.g[m.I(x, y)] !== GR.WATER) continue;
      const px = x * T + T / 2, py = y * T + T / 2, hsh = (x * 7 + y * 13) % 5;
      if (liq === 'lava') {
        c.save(); c.globalCompositeOperation = 'lighter';
        c.fillStyle = 'rgba(255,150,40,' + (0.1 + 0.08 * Math.sin(t * 1.6 + (x + y) * 0.8)) + ')'; Art.circ(c, px, py, T * 0.62); c.fill();
        if (hsh === 0) { const b = (t * 0.6 + x * 0.37) % 1; c.fillStyle = 'rgba(255,230,140,' + (1 - b) * 0.7 + ')'; Art.circ(c, px + 8, py - 4, 2 + b * 6); c.fill(); }
        c.restore();
      } else if (liq === 'void') {
        if (hsh < 3) { c.fillStyle = 'rgba(200,160,255,' + (0.3 + 0.3 * Math.sin(t * 2 + x * 3 + y)) + ')'; Art.circ(c, px + (hsh - 1) * 12, py + ((x * 5 + y) % 3 - 1) * 10, 1.3); c.fill(); }
      } else if (liq === 'ice') {
        if (hsh < 2) { c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(px - 12, py + 6); c.lineTo(px - 2, py - 6); c.moveTo(px - 4, py + 8); c.lineTo(px + 3, py); c.stroke(); }
      } else if (hsh < 2) {
        c.strokeStyle = 'rgba(255,255,255,' + (0.25 + 0.22 * Math.sin(t * 2 + x * 2 + y * 3)) + ')'; c.lineWidth = 1.5; c.lineCap = 'round';
        const ox = Math.sin(t + x + y) * 4; c.beginPath(); c.moveTo(px - 10 + ox, py); c.quadraticCurveTo(px + ox, py - 3, px + 10 + ox, py); c.stroke();
      }
    }
    if (this.mark) { const k = this.mark.t / 0.6; c.strokeStyle = 'rgba(255,240,170,' + (1 - k) + ')'; c.lineWidth = 2.5; Art.ell(c, this.mark.x, this.mark.y, 8 + k * 16, 3 + k * 7); c.stroke(); }
    // 出口指示
    for (const e of m.d.exits || []) {
      const ex = (e.x + (e.w || 1) / 2) * T, ey = (e.y + (e.h || 1) / 2) * T;
      if (ex < cx - 60 || ex > cx + W + 60 || ey < cy - 60 || ey > cy + H + 60) continue;
      const a = 0.35 + 0.25 * Math.sin(t * 3), ok = !e.need || S.flags[e.need];
      c.save(); c.globalCompositeOperation = 'lighter'; Art.glow(c, ex, ey, 54, ok ? '#fff0a0' : '#ff6060', a); c.restore();
    }
    // 物件排序
    const list = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const o = m.ob[m.I(x, y)]; if (o) list.push({ y: y * T + T * 0.86, o, x: x * T + T / 2, k: 0 }); }
    for (const b of m.builds) if (b.px > cx - 260 && b.px < cx + W + 260 && b.py > cy - 20 && b.py < cy + H + 220) list.push({ y: b.py, b, k: 1 });
    for (const n of this.npcs) list.push({ y: n.py, n, k: 2 });
    for (const f of this.foes) list.push({ y: f.py, f, k: 3 });
    list.push({ y: p.py + 0.1, k: 4 });
    list.sort((a, b) => a.y - b.y);
    for (const it of list) {
      if (it.k === 0) Art.draw(c, it.o.s, it.x, it.y, it.o.sc, it.o.f);
      else if (it.k === 1) Art.draw(c, it.b.s, it.b.px, it.b.py);
      else if (it.k === 2) this.drawNpc(c, it.n, t);
      else if (it.k === 3) {
        const f = it.f;
        c.save(); c.translate(f.px, f.py);
        if (f.cool > 0) c.globalAlpha = 0.5;
        const sc = f.look.k ? 1 : 0.98;
        c.scale(sc, sc);
        Art.drawUnit(c, f.look, { t: t, walk: f.moving, face: f.face, seed: f.seed });
        c.restore();
      } else {
        c.save(); c.translate(p.px, p.py);
        c.strokeStyle = 'rgba(255,236,150,.75)'; c.lineWidth = 1.6; Art.ell(c, 0, 0, 15 + Math.sin(t * 3) * 1, 5.2); c.stroke();
        Art.drawUnit(c, CHARS[S.avatar && S.party.some(m => m.id === S.avatar) ? S.avatar : 'hero'].look, { t: t, walk: p.walk, face: p.face, seed: 0 });
        c.restore();
      }
    }
    // 光
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const l of m.lights) {
      if (l.x < cx - l.r || l.x > cx + W + l.r || l.y < cy - l.r || l.y > cy + H + l.r) continue;
      const fl = 1 + Math.sin(t * (l.fire ? 9 : 2.4) + l.x) * (l.fire ? 0.08 : 0.04);
      Art.glow(c, l.x, l.y, l.r * fl, l.col, l.a);
      if (l.fire) { for (let i = 0; i < 3; i++) { const k = (t * 1.6 + i / 3) % 1; c.fillStyle = 'rgba(255,' + Math.round(200 - k * 120) + ',60,' + (1 - k) * 0.9 + ')'; c.beginPath(); c.ellipse(l.x + Math.sin(t * 5 + i * 2) * 3, l.y + 8 - k * 20, 5 * (1 - k) + 1, 8 * (1 - k) + 2, 0, 0, TAU); c.fill(); } }
    }
    for (const n of this.npcs) if (n.sprite === 'spring') {
      Art.glow(c, n.px, n.py - 10, 70 + Math.sin(t * 2) * 6, '#7fffe6', 0.45);
      for (let i = 0; i < 4; i++) { const k = (t * 0.5 + i / 4) % 1; c.fillStyle = 'rgba(200,255,250,' + (1 - k) + ')'; Art.circ(c, n.px + Math.sin(i * 2.4 + t) * 10, n.py - 8 - k * 34, 1.6); c.fill(); }
    }
    c.restore();
    // 名牌
    c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    for (const n of this.npcs) {
      if (n.px < cx - 80 || n.px > cx + W + 80) continue;
      const top = n.py - (n.sprite === 'chest' ? 34 : n.sprite === 'spring' ? 40 : n.w > 1 ? 92 : 62 * ((n.look && n.look.sz) || 1) + 6);
      if (n.name && n.sprite !== 'chest') { c.font = '600 12px ' + FONT_S; c.lineWidth = 3; c.strokeStyle = 'rgba(15,12,28,.85)'; c.strokeText(n.name, n.px, top); c.fillStyle = n.sprite === 'spring' ? '#a8fff0' : '#fff4d0'; c.fillText(n.name, n.px, top); }
      if (n.def.mark && n.def.mark(S)) {
        const by = top - 16 + Math.sin(t * 4) * 3;
        c.font = 'bold 22px ' + FONT_K; c.lineWidth = 4; c.strokeStyle = '#5a2a00'; c.strokeText('!', n.px, by); c.fillStyle = '#ffd94a'; c.fillText('!', n.px, by);
      }
    }
    for (const f of this.foes) {
      const top = f.py - Art.unitHeight(f.look) - 8;
      if (f.boss) { c.font = '700 13px ' + FONT_S; c.lineWidth = 3; c.strokeStyle = 'rgba(30,0,10,.9)'; c.strokeText(f.name, f.px, top); c.fillStyle = '#ff8a7a'; c.fillText(f.name, f.px, top); }
      else if (f.elite && !f.alert) { c.font = '700 12px ' + FONT_S; c.lineWidth = 3; c.strokeStyle = 'rgba(40,24,0,.9)'; c.strokeText(f.name, f.px, top); c.fillStyle = '#ffd27a'; c.fillText(f.name, f.px, top); }
      else if (f.alert) { c.font = 'bold 20px ' + FONT_K; c.lineWidth = 4; c.strokeStyle = '#400'; c.strokeText('!', f.px, top + Math.sin(t * 10) * 2); c.fillStyle = '#ff5a4a'; c.fillText('!', f.px, top + Math.sin(t * 10) * 2); }
    }
    c.restore();
    // 氛围
    ambDraw(c, W, H, th, t, this.amb, cx, cy);
    c.fillStyle = this.night ? 'rgba(8,12,44,.55)' : th.grade; c.fillRect(0, 0, W, H);   // 2D 兜底画面：夜里整体罩一层深蓝
    const vg = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.38, W / 2, H / 2, Math.hypot(W, H) * 0.56);
    vg.addColorStop(0, 'rgba(' + th.vig + ',0)'); vg.addColorStop(1, 'rgba(' + th.vig + ',' + th.vigA + ')');
    c.fillStyle = vg; c.fillRect(0, 0, W, H);
  },
  drawNpc(c, n, t) {
    if (n.sprite === 'chest') { Art.draw(c, S.flags['c_' + n.def.chest] ? 'chestO' : 'chest', n.px, n.py + 4); return; }
    if (n.sprite === 'spring') { Art.draw(c, 'spring', n.px, n.py + 6); return; }
    if (/^(herb|tomb|stele|scarecrow|bloom|carving|glint)$/.test(n.sprite || '')) {   // 2D 兜底：药草、奇花、可翻找的地方是一团光，坟、碑、崖刻、稻草人是一块石头
      if (n.sprite === 'herb' || n.sprite === 'bloom' || n.sprite === 'glint') { c.save(); c.globalCompositeOperation = 'lighter'; Art.glow(c, n.px, n.py - 8, 22, '#9fffb0', 0.5 + 0.2 * Math.sin(t * 3)); c.restore(); c.fillStyle = '#4fa85a'; Art.ell(c, n.px, n.py - 6, 7, 5); c.fill(); }
      else { c.fillStyle = '#8a8f96'; c.fillRect(n.px - 9, n.py - (n.sprite === 'stele' ? 44 : 26), 18, n.sprite === 'stele' ? 44 : 26); c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(n.px + 3, n.py - (n.sprite === 'stele' ? 44 : 26), 6, n.sprite === 'stele' ? 44 : 26); }
      return;
    }
    if (n.sprite === 'stallR' || n.sprite === 'stallG') {
      c.save(); c.translate(n.px, n.py - 14); Art.drawUnit(c, n.look, { t, face: 1, seed: n.seed, noShadow: true }); c.restore();
      Art.draw(c, n.sprite, n.px, n.py + 6); Art.draw(c, n.sprite + 'f', n.px, n.py + 6);
      return;
    }
    c.save(); c.translate(n.px, n.py);
    Art.drawUnit(c, n.look, { t, face: n.face, seed: n.seed, pose: n.def.pose || 'idle' });
    if (n.def.frozen && n.def.frozen(S)) {
      c.fillStyle = 'rgba(160,215,255,.5)'; c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(-17, 2); c.lineTo(-20, -30); c.lineTo(-8, -62); c.lineTo(6, -66); c.lineTo(19, -38); c.lineTo(17, 2); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.moveTo(-10, -8); c.lineTo(-12, -40); c.moveTo(8, -12); c.lineTo(10, -36); c.stroke();
    }
    c.restore();
  }
};
