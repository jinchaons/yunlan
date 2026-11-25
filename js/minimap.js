'use strict';
/* ============ 微型地图：大地图界面右下角的小图。点一下（或按 M）放大成全图，再点一下收起 ============
   底图直接用地面贴图缩小，再叠上树石与房屋；出口、人物、宝箱、灵泉、敌人和自己的位置每秒刷新十来次。 */
const MiniMap = (() => {
  let cv = null, c = null, big = false, base = null, baseKey = '', acc = 0, off = false;
  try { off = localStorage.getItem('yunlan_minimap') === '0'; } catch (e) { }

  function init() {
    cv = document.createElement('canvas'); cv.id = 'h-map'; cv.title = '点击放大 / 收起（M）';
    document.getElementById('hud').appendChild(cv);
    c = cv.getContext('2d');
    cv.addEventListener('click', e => { e.stopPropagation(); toggle(); });
    window.addEventListener('keydown', e => {
      if (e.code !== 'KeyM' || e.repeat || (typeof typing === 'function' && typing(e))) return;
      if (!S || G.scene !== 'world' || UI.menuOpen()) return;
      if (e.shiftKey) { off = !off; try { localStorage.setItem('yunlan_minimap', off ? '0' : '1'); } catch (er) { } big = false; UI.toast(off ? '小地图已隐藏（Shift+M 再次显示）' : '小地图已显示'); }   // Shift+M：整个隐藏 / 显示
      else if (!off) toggle();
      acc = 1;
    });
  }
  function toggle() { big = !big; Sfx.play('ui'); acc = 1; }

  // 画布的显示尺寸（CSS 像素）：小图放进约 10.5rem 见方的框，大图占屏幕的七成左右，都保持地图的长宽比
  function layout(m) {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16, vw = window.innerWidth, vh = window.innerHeight;
    const boxW = big ? Math.min(vw * 0.78, vh * 0.74 * m.w / m.h) : Math.min(10.5 * rem, vw * 0.3), boxH = big ? vh * 0.74 : Math.min(10.5 * rem, vh * 0.3);
    const k = Math.min(boxW / m.w, boxH / m.h), w = Math.max(40, Math.round(m.w * k)), h = Math.max(40, Math.round(m.h * k)), pr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.style.width !== w + 'px' || cv.style.height !== h + 'px') { cv.style.width = w + 'px'; cv.style.height = h + 'px'; }
    if (cv.width !== Math.round(w * pr) || cv.height !== Math.round(h * pr)) { cv.width = Math.round(w * pr); cv.height = Math.round(h * pr); }
    cv.classList.toggle('big', big);
    return { w, h, pr, k };
  }

  // 不随时间变化的底图：地面、树石、房屋。地图或尺寸变了才重画
  function drawBase(m, L) {
    const key = m.id + '_' + cv.width + 'x' + cv.height;
    if (baseKey === key && base) return;
    baseKey = key; base = document.createElement('canvas'); base.width = cv.width; base.height = cv.height;
    const b = base.getContext('2d'), W = base.width, H = base.height, tw = W / m.w, th = H / m.h;
    b.fillStyle = '#1a1c2c'; b.fillRect(0, 0, W, H);
    try { b.drawImage(m.ground, 0, 0, W, H); } catch (e) { }
    // 水面（熔岩、冰面、虚空同理）：3D 画面里水是单独的一层，地面贴图上只是灰底，这里按主题的水色补上
    b.fillStyle = m.th.water;
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.g[m.I(x, y)] === GR.WATER) b.fillRect(Math.floor(x * tw), Math.floor(y * th), Math.ceil(tw) + 1, Math.ceil(th) + 1);
    // 山：深色底上点几个山尖
    b.fillStyle = Art.shade(m.th.stone, -0.45);
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.g[m.I(x, y)] === GR.HILL) b.fillRect(Math.floor(x * tw), Math.floor(y * th), Math.ceil(tw) + 1, Math.ceil(th) + 1);
    b.fillStyle = Art.shade(m.th.stone, 0.1);
    for (let y = 0; y < m.h; y++) for (let x = (y % 2); x < m.w; x += 2) if (m.g[m.I(x, y)] === GR.HILL) { const px = (x + 0.5) * tw, py = (y + 0.5) * th, s = Math.max(1.5, tw * 0.55); b.beginPath(); b.moveTo(px - s, py + s * 0.6); b.lineTo(px, py - s * 0.7); b.lineTo(px + s, py + s * 0.6); b.fill(); }
    b.fillStyle = 'rgba(8,10,24,.16)'; b.fillRect(0, 0, W, H);   // 略压暗，标记才醒目
    // 树木、岩石等挡路的东西：深色小团；灯笼火盆之类的摆设不画
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const o = m.ob[m.I(x, y)]; if (!o || /lantern|brazier|boat/.test(o.s)) continue;
      const rock = /rock|crys/.test(o.s);
      b.fillStyle = rock ? 'rgba(40,40,52,.5)' : 'rgba(10,28,18,.5)';
      b.beginPath(); b.arc((x + 0.5) * tw, (y + 0.5) * th, Math.max(1, tw * (rock ? 0.36 : 0.46)), 0, Math.PI * 2); b.fill();
    }
    // 房屋
    for (const bd of m.d.builds || []) {
      b.fillStyle = '#8a4a3a'; b.fillRect(bd.x * tw, bd.y * th, bd.w * tw, bd.h * th);
      b.strokeStyle = 'rgba(255,230,180,.7)'; b.lineWidth = Math.max(1, L.pr); b.strokeRect(bd.x * tw + 0.5, bd.y * th + 0.5, bd.w * tw - 1, bd.h * th - 1);
    }
  }

  function draw(m, L) {
    const W = cv.width, H = cv.height, tw = W / m.w, th = H / m.h, pr = L.pr, t = World.t, u = Math.max(1, Math.min(tw, th));
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H); c.drawImage(base, 0, 0);
    const dot = (x, y, r, col, ring) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); if (ring) { c.strokeStyle = ring; c.lineWidth = pr; c.stroke(); } };
    const label = (txt, x, y, col, size) => { c.font = '600 ' + Math.round((size || 11) * pr) + 'px "Microsoft YaHei", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 3 * pr; c.strokeStyle = 'rgba(10,10,24,.85)'; const hw = c.measureText(txt).width / 2 + 4 * pr; x = Math.min(W - hw, Math.max(hw, x)); c.strokeText(txt, x, y); c.fillStyle = col; c.fillText(txt, x, y); };
    const R = Math.max(2 * pr, u * (big ? 0.42 : 0.62));
    // 出口：通的是金色，没到时候的是暗红
    for (const e of m.d.exits || []) {
      const ok = !e.need || S.flags[e.need], x = (e.x + (e.w || 1) / 2) * tw, y = (e.y + (e.h || 1) / 2) * th, a = 0.75 + 0.25 * Math.sin(t * 3);
      if (e.door) {   // 房门：一个小金点；屋里有人等着时顶一个叹号；大图上写出屋名
        c.fillStyle = '#ffe078'; c.fillRect(x - R * 0.55, y - R * 0.55, R * 1.1, R * 1.1);
        if (doorMark(e)) label('!', x, y - R * 2.2 - Math.abs(Math.sin(t * 4)) * 2 * pr, '#ffe14a', big ? 15 : 12);
        if (big) label(MAPS[e.to].name, x, y - th * 1.4, '#ffe9c8', 9);
        continue;
      }
      c.fillStyle = ok ? 'rgba(255,224,120,' + a + ')' : 'rgba(210,70,70,.85)';
      const rw = Math.max(R * 1.6, (e.w || 1) * tw), rh = Math.max(R * 1.6, (e.h || 1) * th); c.fillRect(x - rw / 2, y - rh / 2, rw, rh);
      if (big && MAPS[e.to] && !m.d.gates) label((ok ? '→ ' : '✕ ') + MAPS[e.to].name, x, Math.min(H - 9 * pr, Math.max(9 * pr, y + (e.y < 2 ? 1 : e.y > m.h - 3 ? -1 : 0) * 14 * pr + (e.x < 2 || e.x > m.w - 3 ? -13 * pr : 0))), ok ? '#ffe9a8' : '#ff9a9a', 11);
    }
    // 人物、摊位、宝箱、灵泉
    for (const n of World.npcs) {
      const x = n.px / T * tw, y = (n.py / T - 0.3) * th;
      if (n.sprite === 'chest') { if (S.flags['c_' + n.def.chest]) continue; c.fillStyle = '#ffd24a'; c.fillRect(x - R * 0.8, y - R * 0.8, R * 1.6, R * 1.6); c.strokeStyle = '#6a4a10'; c.lineWidth = pr; c.strokeRect(x - R * 0.8, y - R * 0.8, R * 1.6, R * 1.6); continue; }
      if (n.sprite === 'spring') { dot(x, y, R, '#7ff0e0', '#1a5a58'); continue; }
      if (n.def.frozen && n.def.frozen(S)) { dot(x, y, R * 0.8, '#b8d8f0', null); continue; }
      dot(x, y, R, n.w > 1 ? '#ffb060' : '#8fd0ff', '#14284a');
      if (n.def.mark && n.def.mark(S)) label('!', x, y - R * 2.2 - Math.abs(Math.sin(t * 4)) * 2 * pr, '#ffe14a', big ? 15 : 12);
      if (big && n.name && n.def.who !== 'guard') label(n.name, x, y + R + 8 * pr, '#eaf4ff', 10);   // 守门兵丁不标名字，城门处另有门名
    }
    // 敌人：游荡的是小红点，守关的首领大一圈并闪动
    for (const f of World.foes) {
      const x = f.px / T * tw, y = (f.py / T - 0.3) * th;
      if (f.boss) { dot(x, y, R * (1.25 + 0.2 * Math.sin(t * 5)), '#ff4a3a', '#fff0d0'); if (big) label(f.name, x, y - R * 2 - 7 * pr, '#ffb0a0', 11); }
      else dot(x, y, R * 0.7, f.cool > 0 ? 'rgba(255,120,110,.45)' : '#ff6a5a', null);
    }
    // 自己：朝行进方向的箭头
    { const p = World.p, x = p.px / T * tw, y = (p.py / T - 0.3) * th, a = Math.atan2(p.dy, p.dx), r = Math.max(4 * pr, R * 1.7);
      c.save(); c.translate(x, y); c.rotate(a);
      c.beginPath(); c.moveTo(r, 0); c.lineTo(-r * 0.75, r * 0.7); c.lineTo(-r * 0.35, 0); c.lineTo(-r * 0.75, -r * 0.7); c.closePath();
      c.fillStyle = '#ffffff'; c.strokeStyle = '#1a2a6a'; c.lineWidth = 1.5 * pr; c.fill(); c.stroke(); c.restore(); }
    if (big) {
      for (const q of m.d.gates || []) {   // 城门：门名加去处，写在门外一侧
        let e = null, bd = 1e9; for (const x of m.d.exits || []) { const dd = Math.abs(x.x - q.x) + Math.abs(x.y - q.y); if (dd < bd) { bd = dd; e = x; } }
        const ok = !e || !e.need || S.flags[e.need], txt = q.name + (e && MAPS[e.to] ? (ok ? ' → ' : ' ✕ ') + MAPS[e.to].name : '');
        const side = q.x < 8 ? 1 : q.x > m.w - 8 ? -1 : 0;
        label(txt, q.x * tw + side * 4 * pr, q.y * th + (side ? -15 * pr : q.y < 8 ? -14 * pr : 15 * pr), ok ? '#ffe9a8' : '#ff9a9a', 10);
      }
      label(m.d.name, (m.d.gates ? 0.12 : 0.5) * W, 14 * pr, '#ffe9a8', 15);   // 有城门的大图：图名挪到左上角，让出北门的位置
      c.textAlign = 'left'; const y = H - 10 * pr; let x = 8 * pr;
      for (const it of [['#ffffff', '自己'], ['#8fd0ff', '人物'], ['#ff6a5a', '敌人'], ['#ffd24a', '宝箱'], ['#7ff0e0', '灵泉'], ['#ffe078', '出口']]) {
        dot(x + 4 * pr, y, 4 * pr, it[0], 'rgba(10,10,24,.8)');
        c.font = '600 ' + Math.round(10 * pr) + 'px "Microsoft YaHei", sans-serif'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.lineWidth = 3 * pr; c.strokeStyle = 'rgba(10,10,24,.85)'; c.strokeText(it[1], x + 11 * pr, y); c.fillStyle = '#eef'; c.fillText(it[1], x + 11 * pr, y);
        x += (11 + it[1].length * 11 + 10) * pr;
      }
    }
  }

  function update(dt) {
    if (!cv) { if (!document.getElementById('hud')) return; init(); }
    const show = !off && S && G.scene === 'world' && World.map && !(typeof Cine !== 'undefined' && Cine.on());
    cv.classList.toggle('hide', !show);
    if (!show) { big = false; return; }
    if (big && UI.menuOpen()) big = false;
    acc += dt; if (acc < (big ? 0.05 : 0.09)) return; acc = 0;
    const m = World.map, L = layout(m);
    drawBase(m, L); draw(m, L);
  }
  return { update, toggle, isBig: () => big };
})();
