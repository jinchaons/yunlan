'use strict';
/* ============ 界面：对话、HUD、菜单、商店、战斗指令 ============ */
const UI = (() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const WT = { sword: '剑 · 云澈/苏青禾', saber: '刀 · 石破军', needle: '针 · 白芷' };
  const SLOT = { w: '兵刃', a: '护甲', c: '饰品' }, SLOT_TYPE = { w: 'weapon', a: 'armor', c: 'acc' };
  let dlg = { res: null, full: '', shown: 0, typing: false, hideT: 0 };
  let chooseRes = null, narrRes = null, narrState = null;
  let menu = { open: false, tab: 'party', sel: 0, slot: null, useItem: null };
  let shopRes = null, shopId = null;

  function init() {
    $('ui').innerHTML = `
<div id="hud" class="hide">
  <div id="h-party"></div>
  <div id="h-top"><span id="h-area"></span><span id="h-gold"></span><button id="h-menu" class="btn sm">菜单</button><button id="h-zoom" class="btn sm" title="切换视野：默认 → 较远 → 最远 → 较近 → 最近">视野</button><button id="h-q" class="btn sm">画质</button><button id="h-snd" class="btn sm ico">♪</button></div>
  <div id="h-quest"></div>
  <div id="h-hint">方向键 / WASD 移动 · 空格 交谈 · 点击地面自动寻路 · 滚轮 缩放视野 · M 地图 · Esc 菜单</div>
</div>
<div id="battleui" class="hide">
  <div id="b-order"></div>
  <div id="b-top"><button id="b-auto" class="btn sm">自动</button><button id="b-speed" class="btn sm">速度 ×1</button></div>
  <div id="b-name"></div>
  <div id="b-say"></div>
  <div id="b-party"></div>
  <div id="b-cmd" class="hide"></div>
  <div id="b-list" class="hide panel"></div>
  <div id="b-desc" class="hide"></div>
  <div id="b-tip" class="hide"></div>
</div>
<div id="dlg" class="hide"><img id="d-por" alt=""><div id="d-box"><div id="d-name"></div><div id="d-text"></div><div id="d-next">▼</div></div></div>
<div id="choose" class="hide"></div>
<div id="ask" class="hide"><img id="a-por" alt=""><div id="a-box"><div id="a-name"></div><div id="a-tag"></div><div id="a-text"></div><div id="a-row"><input id="a-in" maxlength="60" autocomplete="off" placeholder="想说什么？打字后按回车；不打字直接按回车即告辞"><button id="a-send" class="btn sm">说</button><button id="a-bye" class="btn sm">告辞</button></div></div></div>
<div id="banter"></div>
<div id="menu" class="hide overlay"></div>
<div id="shop" class="hide overlay"></div>
<div id="result" class="hide overlay"></div>
<div id="aiset" class="hide overlay"></div>
<div id="gfxset" class="hide overlay"></div>
<div id="banner"><div id="bn-t"></div><div id="bn-s"></div></div>
<div id="toasts"></div>
<div id="narr" class="hide"><div id="narr-in"></div><div id="narr-next">点击继续</div></div>
<div id="title" class="hide">
  <div id="t-logo"><div id="t-seal">侠</div><h1>云岚侠影录</h1><p>原创国风武侠 · 角色扮演</p></div>
  <div id="t-btns"><button id="t-new" class="btn big">新的旅程</button><button id="t-cont" class="btn big">继续旅程</button><div id="t-two"><button id="t-help" class="btn big ghost">操作说明</button><button id="t-aiset" class="btn big ghost">AI 设置</button><button id="t-gfx" class="btn big ghost">画质</button></div></div>
  <div id="t-foot">原创作品 · 所有人物、门派与剧情均为虚构<span id="t-ai"></span></div>
</div>
<div id="fade"></div><div id="err" class="hide"></div>`;
    $('dlg').addEventListener('click', () => advance());
    $('narr').addEventListener('click', () => advance());
    $('h-menu').addEventListener('click', () => { Sfx.play('ui'); toggleMenu(); });
    $('h-snd').addEventListener('click', () => { const on = Sfx.toggle(); $('h-snd').classList.toggle('off', !on); });
    // 画质：打开画质设置面板（档位 + 各分项）
    if (!G3.ok) { $('h-q').classList.add('hide'); $('h-zoom').classList.add('hide'); $('t-gfx').classList.add('hide'); }
    // “视野”按钮：五档视野轮流切换（默认 → 较远 → 最远 → 较近 → 最近）；用滚轮调到了别的位置时，先回到默认
    $('h-zoom').addEventListener('click', () => { if (G.scene !== 'world' || !G3.ok) return; Sfx.play('ui'); toast('视野：' + G3.world.stepZoom()); });
    $('h-q').addEventListener('click', () => { if (G.busy && !menu.open) return; Sfx.play('ui'); gfxPanel(true); });
    $('t-gfx').addEventListener('click', () => { Sfx.play('ui'); gfxPanel(true); });
    $('gfxset').addEventListener('click', onGfxClick);
    $('gfxset').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') gfxPanel(false); });
    $('gfxset').addEventListener('keyup', e => e.stopPropagation());
    $('b-auto').addEventListener('click', () => { Sfx.play('ui'); Battle.setAuto(!Battle.auto); });
    $('b-speed').addEventListener('click', () => { Sfx.play('ui'); Battle.speed = Battle.speed === Battle.SPEEDS[0] ? Battle.SPEEDS[1] : Battle.SPEEDS[0]; $('b-speed').textContent = '速度 ×' + (Battle.speed === Battle.SPEEDS[0] ? 1 : 2); });
    $('menu').addEventListener('click', onMenuClick);
    $('shop').addEventListener('click', onShopClick);
    // 自由交谈的输入框：回车或“说”送出，Esc 或“告辞”结束。输入法选字时的回车不算
    const askDone = v => { if (!askRes) return; const r = askRes; askRes = null; Sfx.play('ui'); r(v); };
    $('a-send').addEventListener('click', () => { const v = $('a-in').value.trim(); if (v) askDone(v.slice(0, 60)); else $('a-in').focus(); });
    $('a-bye').addEventListener('click', () => askDone(null));
    $('a-in').addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); if (e.repeat) return; const v = $('a-in').value.trim(); askDone(v ? v.slice(0, 60) : null); }   // 没打字就按回车：告辞
      else if (e.key === 'Escape') askDone(null);
    });
    $('a-in').addEventListener('keyup', e => e.stopPropagation());
    // AI 设置面板：面板里的按键不当作游戏操作；Esc 关闭，在输入框里按回车即保存
    const A = $('aiset');
    $('t-aiset').addEventListener('click', () => { Sfx.play('ui'); aiPanel(true); });
    A.addEventListener('click', onAiClick);
    A.addEventListener('change', e => { if (e.target.id === 'ai-prov') aiProv(); });
    A.addEventListener('input', e => { if (e.target.id === 'ai-base') aiKeyHint(); });
    A.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Escape') aiPanel(false);
      else if (e.key === 'Enter' && !e.isComposing && e.target.tagName === 'INPUT' && e.target.type === 'text') { e.preventDefault(); if (!e.repeat) aiSave(); }
    });
    A.addEventListener('keyup', e => e.stopPropagation());
  }
  /* ---------- AI 设置：总开关、接入方式、接口地址、模型、密钥 ---------- */
  let aiOpen = false, aiBusy = false;
  function aiMsg(text, cls) { const m = $('ai-msg'); if (m) { m.textContent = text || ''; m.className = 'aimsg' + (cls ? ' ' + cls : ''); } }
  // 面板里现在填的内容
  const aiDraft = () => ({ prov: $('ai-prov').value, base: $('ai-base').value, model: $('ai-model').value, key: $('ai-key').value, keep: $('ai-keep').checked });
  function aiKeyHint() { const t = AI.keyTail($('ai-base').value); $('ai-key').placeholder = t ? '已保存（末四位 ' + t + '），留空则沿用' : '粘贴 API Key'; $('ai-forget').classList.toggle('hide', !t); }
  function aiSwitch() { const c = AI.config(); $('ai-on').classList.toggle('on', c.on); $('ai-on').setAttribute('aria-checked', c.on ? 'true' : 'false'); $('ai-state').textContent = c.on ? (c.mode === 'direct' ? '已开启 · ' + AI.state.model : '已打开，但还没有配置好接口') : '已关闭，人物只说固定台词'; }
  // 换了接入方式：带出这一家的默认地址和模型
  function aiProv(keep) {
    const P = AI.providers(), p = P.find(x => x.id === $('ai-prov').value) || P[0];
    if (!keep) {
      if (p.base) { $('ai-base').value = p.base; $('ai-model').value = p.model || ''; }
      else if (P.some(x => x.base && x.base === $('ai-base').value.trim())) { $('ai-base').value = ''; $('ai-model').value = ''; }   // 从预设的一家换到自填地址：清掉带出来的内容
      $('ai-key').value = ''; $('ai-models').innerHTML = ''; aiMsg(p.tip || '');   // 这一家的填写提示（到哪里申请密钥、模型名怎么写）
    }
    $('ai-base').placeholder = p.ph || p.base || '';
    aiKeyHint();
  }
  function aiPanel(on) {
    const A = $('aiset');
    if (!on) { aiOpen = false; A.classList.add('hide'); A.innerHTML = ''; if (menu.open) renderMenu(); return; }
    const c = AI.config(), P = AI.providers(), prov = P.some(p => p.id === c.prov) ? c.prov : 'litellm';
    aiOpen = true;
    A.innerHTML = '<div class="panel aip"><div class="tabs"><span class="ttl">AI 人物设置</span><button class="x" data-act="close">✕</button></div><div class="aibody">' +
      '<div class="airow"><span>AI 功能</span><div class="aisw"><button id="ai-on" class="switch" data-act="on" role="switch" aria-label="AI 功能开关"><i></i></button><em id="ai-state"></em></div></div>' +
      '<div class="airow"><span>接入方式</span><select id="ai-prov">' + P.map(p => '<option value="' + p.id + '"' + (p.id === prov ? ' selected' : '') + '>' + p.n + '</option>').join('') + '</select></div>' +
      '<div class="airow" id="ai-r-base"><span>接口地址</span><input id="ai-base" type="text" autocomplete="off" spellcheck="false" maxlength="300"></div>' +
      '<div class="airow" id="ai-r-model"><span>模型</span><input id="ai-model" type="text" list="ai-models" autocomplete="off" spellcheck="false" maxlength="120" placeholder="模型名，按接口方给的写法"><datalist id="ai-models"></datalist><button class="btn sm" data-act="models">获取列表</button></div>' +
      '<div class="airow" id="ai-r-key"><span>API Key</span><input id="ai-key" type="text" class="mask" autocomplete="off" spellcheck="false" maxlength="400"><button class="btn sm" data-act="eye">显示</button></div>' +
      '<div class="airow" id="ai-r-keep"><span></span><label class="aichk"><input id="ai-keep" type="checkbox"> 在这台电脑的浏览器里记住密钥（不勾选则关闭页面后清除）</label><button id="ai-forget" class="btn sm ghost hide" data-act="forget">清除密钥</button></div>' +
      '<p id="ai-msg" class="aimsg"></p>' +
      '<div class="aibtns"><button class="btn" data-act="test">测试连接</button><button class="btn" data-act="save">保存</button><button class="btn ghost" data-act="close">关闭</button></div>' +
      '<p class="ainote">密钥只保存在本机浏览器里，只会发往上面填写的接口地址，不会写进存档。请勿在公用电脑上勾选“记住密钥”。<br>关闭 AI 功能、或接口不通时，人物改说固定台词，游戏照常进行。</p>' +
      '</div></div>';
    A.classList.remove('hide');
    $('ai-prov').value = prov; $('ai-base').value = c.base; $('ai-model').value = c.model; $('ai-keep').checked = c.keep;
    aiProv(true); aiSwitch();
  }
  async function aiSave() {
    if (aiBusy) return;
    const d = aiDraft(), r = AI.save(d);
    if (r.err) { Sfx.play('no'); aiMsg(r.err, 'bad'); return; }
    Sfx.play('ok'); $('ai-key').value = ''; $('ai-base').value = AI.config().base; aiKeyHint(); aiSwitch();
    aiMsg('已保存，正在测试连接……'); await aiTest({ prov: d.prov, base: AI.config().base, model: d.model, key: '', keep: d.keep }, '已保存。');
  }
  async function aiTest(d, head) {
    if (aiBusy) return; aiBusy = true;
    if (!head) aiMsg('正在测试连接……');
    const r = await AI.test(d); aiBusy = false;
    if (!aiOpen) return;
    if (r.ok) aiMsg((head || '') + '连接正常，用时 ' + r.ms + ' 毫秒。模型回答：' + r.text, 'ok');
    else aiMsg((head ? head + '但连接没有成功：' : '') + r.err, 'bad');
  }
  async function onAiClick(e) {
    const t = e.target.closest('button'); if (!t) return;   // 点面板外面不关闭：免得在输入框里拖选文字时误关
    const act = t.dataset.act; if (!act) return; Sfx.play('ui');
    if (act === 'close') aiPanel(false);
    else if (act === 'on') { AI.setOn(!AI.config().on); aiSwitch(); }
    else if (act === 'eye') { const k = $('ai-key'), show = k.classList.toggle('mask'); t.textContent = show ? '显示' : '隐藏'; }
    else if (act === 'forget') { AI.forget(); aiKeyHint(); aiSwitch(); aiMsg('已清除保存的密钥。'); }
    else if (act === 'save') aiSave();
    else if (act === 'test') aiTest(aiDraft());
    else if (act === 'models') {
      if (aiBusy) return; aiBusy = true; aiMsg('正在获取模型列表……');
      const r = await AI.models(aiDraft()); aiBusy = false; if (!aiOpen) return;
      if (r.err) { aiMsg(r.err, 'bad'); return; }
      $('ai-models').innerHTML = r.list.map(m => '<option value="' + esc(m) + '"></option>').join('');
      aiMsg('取到 ' + r.list.length + ' 个模型：在“模型”框里输入几个字母（或清空后点一下）即可从列表里选。', 'ok');
    }
  }
  /* ---------- 画质设置：四个档位，外加各分项单独调（见 g3.js 的 GFX_OPT） ---------- */
  let gfxOpen = false;
  const GFX_DESC = {
    auto: '按帧率自动调整：跟不上时先减抗锯齿，再降分辨率（降到后面几档时主角也会略糊）。下面的抗锯齿和超采样是上限，降档后会自动减。',
    high: '各项都照最好的来，分辨率锁定不降。适合独立显卡。',
    fast: '分辨率降到七成，不做多重采样，主角近景也不换高清贴图。主角会跟着略糊。',
    low: '给集成显卡用：景物、草丛、其他人物和后期都简化。分辨率不降，四位主角的模型、贴图和材质照旧。'
  };
  function gfxPanel(on) {
    const A = $('gfxset');
    if (!on) { gfxOpen = false; A.classList.add('hide'); A.innerHTML = ''; return; }
    gfxOpen = true; gfxRender(); A.classList.remove('hide');
  }
  function gfxRender() {
    const q = G3.quality(), g = G3.gfx, M = G3.gfxModes, stale = G3.gfxStale(), name = k => G3.gfxOpts.find(o => o[0] === k)[1];
    let h = '<div class="panel aip"><div class="tabs"><span class="ttl">画质设置</span><button class="x" data-act="close">✕</button></div><div class="aibody">' +
      '<div class="airow"><span>档位</span><div class="gfxmodes">' + ['auto', 'high', 'fast', 'low'].map(k => '<button class="btn sm' + (k === q ? '' : ' ghost') + '" data-mode="' + k + '">' + M[k] + '</button>').join('') + '</div></div>' +
      '<p class="aitip gfxdesc">' + GFX_DESC[q] + (G3.gfxCustom() ? '　<b>下面有几项单独改过。</b>' : '') + '</p>';
    h += G3.gfxOpts.map(o => { const cur = o[2].find(x => x[0] === g[o[0]]) || o[2][0]; return '<div class="airow gfxrow"><span>' + o[1] + '</span><button class="btn sm ghost" data-gfx="' + o[0] + '">' + (q === 'auto' && cur[0] && o[0] === 'msaa' ? '最多 ' + cur[1] : cur[1]) + '</button><small>' + (o[3] ? '立即生效' : '刷新后生效') + '</small></div>'; }).join('');
    h += '<p class="aimsg' + (stale.length ? ' bad' : ' ok') + '">' + (stale.length ? '还有 ' + stale.length + ' 项要刷新页面才生效：' + stale.map(name).join('、') + '。' : '当前：' + G3.qualityText()) + '</p>' +
      '<div class="aibtns">' + (stale.length ? '<button class="btn" data-act="reload">' + (S && G.scene === 'world' ? '保存进度并刷新' : '刷新页面') + '</button>' : '') + '<button class="btn ghost" data-act="close">关闭</button></div>' +
      '<p class="ainote">每一项点一下就换到下一个选项。按 F3 打开性能读数，可以看到帧率和每帧画了多少东西。<br>设置只存在这台电脑的浏览器里，不进存档。</p></div></div>';
    $('gfxset').innerHTML = h;
  }
  function onGfxClick(e) {
    const t = e.target.closest('button'); if (!t) { if (e.target.id === 'gfxset') gfxPanel(false); return; }
    const d = t.dataset; Sfx.play('ui');
    if (d.act === 'close') { gfxPanel(false); return; }
    if (d.act === 'reload') { if (S && G.scene === 'world') G.save(); location.reload(); return; }
    if (d.mode) G3.setQuality(d.mode);
    else if (d.gfx) { const o = G3.gfxOpts.find(x => x[0] === d.gfx), i = o[2].findIndex(x => x[0] === G3.gfx[d.gfx]); G3.setGfx(d.gfx, o[2][(i + 1) % o[2].length][0]); }
    gfxRender();
  }
  /* ---------- 自由交谈（AI 人物）与同伴闲聊 ---------- */
  let askRes = null;
  function askSet(text, busy, done, tag) {
    $('a-text').textContent = text; $('ask').classList.toggle('busy', !!busy);
    if (tag != null) $('a-tag').textContent = tag;
    $('a-in').disabled = $('a-send').disabled = !!busy || !!done;
  }
  function askOpen(who, text, tag) {
    const info = whoIs(who);
    $('a-por').src = Art.portraitURL(info.look, 192); $('a-name').textContent = info.name;
    askSet(text, false, false, tag || ''); $('a-in').value = ''; $('dlg').classList.add('hide'); $('ask').classList.remove('hide');
  }
  function askInput() { return new Promise(res => { askRes = res; const i = $('a-in'); i.disabled = $('a-send').disabled = false; i.value = ''; i.focus(); }); }
  function askClose() { askRes = null; $('a-in').blur(); $('ask').classList.add('hide'); }
  function banter(lines) {
    lines.forEach((l, i) => setTimeout(() => {
      const info = whoIs(l.who); if (!info || G.scene !== 'world') return;
      const d = document.createElement('div'); d.className = 'bt';
      d.innerHTML = '<img src="' + Art.portraitURL(info.look, 96) + '"><div><b>' + esc(l.who === 'hero' ? S.name : info.name) + '</b><span>' + esc(l.text) + '</span></div>';
      $('banter').appendChild(d); setTimeout(() => d.remove(), 6500);
    }, i * 2200));
  }

  /* ---------- 对话 ---------- */
  function say(who, text) {
    return new Promise(res => {
      if (G.autoSkip) { res(); return; }
      const info = who ? whoIs(who) : null;
      const name = who === 'hero' ? S.name : info ? info.name : (who && !info ? who : '');
      const por = $('d-por');
      if (info) { por.src = Art.portraitURL(info.look, 192); por.classList.remove('hide'); } else por.classList.add('hide');
      $('dlg').classList.toggle('narr', !name);
      $('d-name').textContent = name; $('d-name').style.display = name ? '' : 'none';
      // 剧情运镜中：对白自动往下走，不用点击。字出完后按字数留出阅读时间（约每秒七八个字，最少 1.6 秒、最多 7 秒）；想快些仍可点击
      const auto = typeof Cine !== 'undefined' && Cine.on();
      dlg = { res, full: text, shown: 0, typing: true, hideT: 0, auto, wait: Math.min(7, Math.max(1.6, 0.9 + text.length * 0.13)) };
      $('d-text').textContent = ''; $('d-next').style.visibility = 'hidden';
      $('dlg').classList.remove('hide');
    });
  }
  function advance() {
    if (narrRes) { narrStep(); return true; }
    if (!$('result').classList.contains('hide')) { const b = $('result').querySelector('button'); if (b) b.click(); return true; }
    if (!dlg.res) return false;
    if (dlg.typing) { dlg.shown = dlg.full.length; dlg.typing = false; $('d-text').textContent = dlg.full; $('d-next').style.visibility = dlg.auto ? 'hidden' : 'visible'; return true; }
    const r = dlg.res; dlg.res = null; dlg.hideT = 0.08; Sfx.play('ui'); r();
    return true;
  }
  function update(dt) {
    if (dlg.res && dlg.typing) {
      const before = Math.floor(dlg.shown);
      dlg.shown += dt * 48;
      if (dlg.shown >= dlg.full.length) { dlg.shown = dlg.full.length; dlg.typing = false; $('d-next').style.visibility = dlg.auto ? 'hidden' : 'visible'; }
      if (Math.floor(dlg.shown) !== before) { $('d-text').textContent = dlg.full.slice(0, Math.floor(dlg.shown)); if (Math.floor(dlg.shown) % 3 === 0) Sfx.play('text'); }
    } else if (dlg.res && dlg.auto && !chooseRes) {   // 自动播放：读完这一句，接下一句
      if ((dlg.wait -= dt) <= 0) { const r = dlg.res; dlg.res = null; dlg.hideT = 0.08; r(); }
    } else if (!dlg.res && dlg.hideT > 0) { dlg.hideT -= dt; if (dlg.hideT <= 0 && !chooseRes) $('dlg').classList.add('hide'); }
    if (narrState) {
      narrState.t += dt;
      if (narrState.i < narrState.lines.length && narrState.t > 1.5) narrStep(true);
    }
  }
  // keys（可选）：{ space: 选项序号, enter: 选项序号 }，按空格 / 回车直接选中对应的选项，按钮上会标出按键
  let chooseKeys = null, chooseAt = 0;
  function choose(title, opts, keys) {
    return new Promise(res => {
      if (G.autoSkip) { res(G.autoPick ? G.autoPick(title, opts) : 0); return; }
      const box = $('choose'), hint = i => (keys && keys.space === i ? '<small>空格</small>' : keys && keys.enter === i ? '<small>回车</small>' : '');
      box.innerHTML = (title ? '<div class="ch-t">' + esc(title) + '</div>' : '') + opts.map((o, i) => '<button class="btn ch" data-i="' + i + '">' + esc(o) + hint(i) + '</button>').join('');
      box.classList.remove('hide');
      chooseRes = res; chooseKeys = keys || null; chooseAt = performance.now();
      box.onclick = e => {
        const b = e.target.closest('button'); if (!b) return;
        Sfx.play('ok'); box.classList.add('hide'); chooseRes = null; $('dlg').classList.add('hide'); res(+b.dataset.i);
      };
    });
  }
  // 选项框开着时的空格 / 回车。刚弹出的一瞬间不响应，免得上一句对话的按键顺手把选项也选了
  function chooseKey(k) {
    if (!chooseRes || !chooseKeys || chooseKeys[k] == null || performance.now() - chooseAt < 200) return false;
    const b = $('choose').querySelector('[data-i="' + chooseKeys[k] + '"]');
    if (b) b.click();
    return !!b;
  }
  function toast(msg) {
    if (G.autoSkip) return;
    const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = msg;
    $('toasts').appendChild(t);
    while ($('toasts').children.length > 5) $('toasts').firstChild.remove();
    setTimeout(() => t.remove(), 3000);
  }
  let bnT = null;
  function banner(title, sub) {
    if (G.autoSkip) return;
    $('bn-t').textContent = title; $('bn-s').textContent = sub || '';
    const b = $('banner'); b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
    clearTimeout(bnT); bnT = setTimeout(() => b.classList.remove('show'), 2600);
  }
  // 转黑时在画面中央写一行小字（第一次去一张大图要建一两秒场景，免得像卡住了）；fade(0) 时自动清掉
  function fadeNote(text) { $('fade').textContent = text || ''; }
  function fade(on) {
    return new Promise(res => {
      const f = $('fade'); f.className = on ? 'on' : ''; if (!on) setTimeout(() => { if (!f.className) f.textContent = ''; }, 380);
      if (G.autoSkip) res(); else setTimeout(res, 380);
    });
  }
  function flash() {
    return new Promise(res => {
      if (G.autoSkip) { res(); return; }
      const f = $('fade'); f.className = 'flash';
      setTimeout(() => { f.className = 'on'; }, 260);
      setTimeout(() => { res(); setTimeout(() => { f.className = ''; }, 60); }, 620);
    });
  }
  function narrate(lines) {
    return new Promise(res => {
      if (G.autoSkip) { res(); return; }
      $('narr-in').innerHTML = ''; $('narr').classList.remove('hide'); $('narr-next').style.visibility = 'hidden';
      narrState = { lines, i: 0, t: 1.0 }; narrRes = res;
    });
  }
  function narrStep(auto) {
    const n = narrState; if (!n) return;
    if (n.i < n.lines.length) {
      const p = document.createElement('p'); p.textContent = n.lines[n.i++]; $('narr-in').appendChild(p); n.t = 0;
      if (n.i >= n.lines.length) $('narr-next').style.visibility = 'visible';
    } else if (!auto) {
      const r = narrRes; narrRes = null; narrState = null; $('narr').classList.add('hide'); r();
    }
  }

  /* ---------- HUD ---------- */
  function bar(cls, v, m) { return '<div class="bar ' + cls + '"><i style="width:' + clamp(m ? v / m * 100 : 0, 0, 100) + '%"></i></div>'; }
  function hud() {
    if (!S) return;
    $('h-party').innerHTML = S.party.map(m => {
      const st = calcStats(m), c = CHARS[m.id];
      return '<div class="pc"><img class="pc-p" src="' + Art.portraitURL(c.look, 96) + '"><div class="pc-i"><div class="pc-n">' + esc(m.id === 'hero' ? S.name : c.name) + '<b>Lv.' + m.lv + '</b></div>' +
        bar('hp', m.hp, st.mhp) + bar('mp', m.mp, st.mmp) + '</div></div>';
    }).join('');
    $('h-gold').innerHTML = '<i class="coin"></i>' + S.gold;
    $('h-menu').classList.toggle('dot', S.party.some(m => m.pt > 0));   // 有未分配的属性点时，菜单按钮上亮一个红点
    $('h-area').textContent = World.map ? World.map.d.name + (World.night ? ' · 夜' : '') : '';
    $('h-quest').innerHTML = S.quest ? '<b>当前目标</b>' + esc(S.quest) : '';
  }
  function showHud(on) { $('hud').classList.toggle('hide', !on); if (on) hud(); }

  /* ---------- 菜单 ---------- */
  /* 物品的说明。装备的每一项加成后面都标出是怎么算的（core.js 的 gearStats）：
       攻击 / 防御 / 气血 ——“基准的百分之几”：有品级的按那一品级的基准折成固定数值；没有品级的（饰品、独特兵刃）按佩戴者当前的等级折算，随等级成长。
       速度的百分比按佩戴者自身的速度算；内力、暴击、暴伤、闪避、武学威力和写明点数的速度是固定值。
     lv：按谁的等级显示随人成长的数值（人物页里是正在看的那位，别处是云澈）。 */
  function itemText(it, lv) {
    const a = [];
    const ref = lv || (typeof S !== 'undefined' && S && S.party && S.party[0] && S.party[0].lv) || 1;
    const g = it.g, st = g ? gearStats(it, ref) : it.st, pct = v => Math.round(v * 100) + '%';
    if (st) for (const k in st) {
      if (k === 'spdp') a.push('速度+' + pct(st[k]) + '〔自身速度的' + pct(st[k]) + '〕');
      else if (k === 'res') a.push('所受' + st[k].map(e => ELEM[e].n).join('、') + '系伤害-25%');
      else if (g && (k === 'atk' || k === 'def' || k === 'mhp')) a.push(STAT_NAME[k] + '+' + st[k] + '〔基准' + STAT_NAME[k] + '的' + pct(g[k]) + '〕');
      else a.push(STAT_NAME[k] + '+' + st[k] + (STAT_PCT[k] ? '%' : '') + (g ? '〔固定〕' : ''));
    }
    if (g) a.push(g.ilv ? '【' + g.ilv + ' 品】按 ' + g.ilv + ' 级的基准折算，数值不再变' : '【随佩戴者成长】按佩戴者当前等级的基准折算（此处按 ' + ref + ' 级显示）');
    if (it.wt) a.push(WT[it.wt]);
    if (it.desc) a.push(it.desc);
    return a.join('　');
  }
  function toggleMenu(tab) {
    if (aiOpen) { aiPanel(false); return; }
    if (gfxOpen) { gfxPanel(false); return; }
    if (menu.open) { menu.open = false; $('menu').classList.add('hide'); hud(); return; }
    if (G.scene !== 'world' || G.busy) return;
    menu = { open: true, tab: tab || 'party', sel: 0, slot: null, useItem: null };
    $('menu').classList.remove('hide'); renderMenu();
  }
  function renderMenu() {
    const tabs = [['party', '队伍'], ['bag', '行囊'], ['quest', '江湖'], ['sys', '系统']];
    let h = '<div class="panel big"><div class="tabs">' + tabs.map(t => '<button class="tab' + (menu.tab === t[0] ? ' on' : '') + '" data-tab="' + t[0] + '">' + t[1] + '</button>').join('') +
      '<span class="gold"><i class="coin"></i>' + S.gold + '</span><button class="x" data-act="close">✕</button></div><div class="pbody">';
    if (menu.tab === 'party') {
      const m = fixMember(S.party[menu.sel] || S.party[0]), c = CHARS[m.id], st = calcStats(m), pc = v => Math.round(v * 100) + '%';
      h += '<div class="mlist">' + S.party.map((x, i) => '<button class="mrow' + (i === menu.sel ? ' on' : '') + '" data-sel="' + i + '"><img src="' + Art.portraitURL(CHARS[x.id].look, 96) + '"><span>' + esc(x.id === 'hero' ? S.name : CHARS[x.id].name) + '<small>Lv.' + x.lv + '</small></span></button>').join('') + '</div>';
      h += '<div class="mdetail"><div class="mhead"><img src="' + Art.portraitURL(c.look, 192) + '"><div><h3>' + esc(m.id === 'hero' ? S.name : c.name) + ' <small>' + c.title + '</small></h3>' +
        '<div class="lv">等级 ' + m.lv + '　修为 ' + m.exp + ' / ' + expNeed(m.lv) + '</div>' + bar('exp', m.exp, expNeed(m.lv)) +
        '<div class="stats"><span>气血 <b>' + m.hp + '/' + st.mhp + '</b></span><span>内力 <b>' + m.mp + '/' + st.mmp + '</b></span><span>攻击 <b>' + st.atk + '</b></span><span>防御 <b>' + st.def + '</b></span><span>速度 <b>' + st.spd + '</b></span><span>暴击 <b>' + pc(st.crit) + '</b></span><span>暴伤 <b>' + pc(st.cdmg) + '</b></span><span>闪避 <b>' + pc(st.dodge) + '</b></span><span>武学威力 <b>' + pc(st.skl) + '</b></span></div></div></div>';
      // 根基属性：升级得到的点数在这里分配
      h += '<div class="attrs"><div class="sub">根基' + (m.pt > 0 ? '　<em>可分配 ' + m.pt + ' 点</em> <button class="btn sm" data-auto="1">按推荐分配</button>' : '') + '</div>' +
        ATTRS.map(a => '<div class="at"><span>' + a.n + ' <b>' + attrOf(m, a.k) + '</b></span><small>' + a.d + '</small>' + (m.pt > 0 ? '<button class="btn sm" data-attr="' + a.k + '">＋</button>' : '') + '</div>').join('') + '</div>';
      // 招式精进：十五、二十、二十五、三十级各一次，二选一（data.js 的 REFINE）
      { const RF = REFINE[m.id] || [], pend = refinePending(m), done = Object.keys(m.rf || {}).filter(i => RF[i]);
        if (pend >= 0 || done.length) {
          h += '<div class="attrs"><div class="sub">招式精进' + (pend >= 0 ? '　<em>【' + SKILLS[RF[pend].sk].name + '】可以精进，二选一（选定不能更改）</em>' : '') + '</div>';
          if (pend >= 0) h += RF[pend].opts.map((o, i) => '<div class="at"><span><b>' + o.n + '</b></span><small>' + o.d + '</small><button class="btn sm" data-refine="' + i + '">选这个</button></div>').join('');
          h += done.map(i => { const o = RF[i].opts[m.rf[i]]; return '<div class="at"><span>' + SKILLS[RF[i].sk].name + ' · <b>' + o.n + '</b></span><small>' + o.d + '</small></div>'; }).join('') + '</div>';
        } }
      h += '<div class="eq">' + ['w', 'a', 'c'].map(s => '<button class="slot' + (menu.slot === s ? ' on' : '') + '" data-slot="' + s + '"><small>' + SLOT[s] + '</small>' + (m.eq[s] ? esc(ITEMS[m.eq[s]].name) : '<em>未装备</em>') + '</button>').join('') + '</div>';
      if (menu.slot) {
        const list = Object.keys(S.items).filter(id => S.items[id] > 0 && ITEMS[id].type === SLOT_TYPE[menu.slot] && (!ITEMS[id].wt || ITEMS[id].wt === c.wt));
        h += '<div class="pick"><div class="sub">选择' + SLOT[menu.slot] + '</div>' +
          (m.eq[menu.slot] ? '<div class="irow"><span>眼下戴着：' + esc(ITEMS[m.eq[menu.slot]].name) + '</span><small>' + itemText(ITEMS[m.eq[menu.slot]], m.lv) + '</small></div><button class="irow" data-equip=""><span>卸下当前装备</span></button>' : '') +
          (list.length ? list.map(id => '<button class="irow" data-equip="' + id + '"><span>' + esc(ITEMS[id].name) + ' ×' + S.items[id] + '</span><small>' + itemText(ITEMS[id], m.lv) + '</small></button>').join('') : '<div class="empty">行囊中没有可用的' + SLOT[menu.slot] + '</div>') + '</div>';
      } else {
        h += '<div class="sklist"><div class="sub">武学</div>' + memberSkills(m).concat([c.ult]).map(id => {
          const s = SKILLS[id];
          return '<div class="sk"><i class="orb" style="--c:' + ELEM[s.elem].c2 + '">' + ELEM[s.elem].n + '</i><div><b>' + s.name + '</b><small>' + (s.ult ? '怒气满时' : '内力 ' + s.cost) + '</small><p>' + s.desc + '</p></div></div>';
        }).join('') + '</div>';
      }
      h += '</div>';
    } else if (menu.tab === 'bag') {
      const ids = Object.keys(S.items).filter(id => S.items[id] > 0);
      const order = { use: 0, weapon: 1, armor: 2, acc: 3, key: 4 };
      ids.sort((a, b) => order[ITEMS[a].type] - order[ITEMS[b].type]);
      h += '<div class="bag">' + (ids.length ? ids.map(id => {
        const it = ITEMS[id];
        return '<div class="irow"><span>' + esc(it.name) + (it.type === 'key' ? '' : ' ×' + S.items[id]) + '</span><small>' + itemText(it) + '</small>' + (it.type === 'use' ? '<button class="btn sm" data-use="' + id + '">使用</button>' : '') + '</div>';
      }).join('') : '<div class="empty">行囊空空如也</div>') + '</div>';
      if (menu.useItem) {
        h += '<div class="pick float"><div class="sub">对谁使用【' + ITEMS[menu.useItem].name + '】？</div>' + S.party.map((x, i) => { const st = calcStats(x); return '<button class="irow" data-on="' + i + '"><span>' + esc(x.id === 'hero' ? S.name : CHARS[x.id].name) + '</span><small>气血 ' + x.hp + '/' + st.mhp + '　内力 ' + x.mp + '/' + st.mmp + '</small></button>'; }).join('') + '<button class="btn sm" data-on="-1">取消</button></div>';
      }
    } else if (menu.tab === 'quest') {
      const jades = ['jade1', 'jade2', 'jade3', 'jade4'], jc = ['#58d68d', '#3fc7b0', '#ff6a4a', '#e6f4ff'];
      h += '<div class="quest"><h3>' + (CHAPTERS[S.chapter] || '') + '</h3><p class="q">' + esc(S.quest || '') + '</p>' +
        '<div class="sub">璇玑玉</div><div class="jades">' + jades.map((j, i) => '<span class="jade' + (S.items[j] ? ' on' : '') + '" style="--c:' + jc[i] + '">' + ITEMS[j].name.slice(-1) + '</span>').join('') + '</div>' +
        '<div class="sub">委托</div><ul class="qs">' + (QUESTS.filter(q => q.open(S)).map(q => { const v = S.flags[q.id] || 0; return '<li' + (v === 3 ? ' class="ok"' : '') + '><b>' + q.name + '</b>（' + q.who + '）　' + (v === 0 ? '尚未接下，去找' + q.who + '谈谈。' : v === 3 ? '已完成' : (typeof q.text[v - 1] === 'function' ? q.text[v - 1]() : q.text[v - 1]) + (v === 1 ? '<br><small>去处：' + q.where + '</small>' : '')) + '</li>'; }).join('') || '<li>暂时没有委托。</li>') +
        (S.flags.ch1 ? '<li' + ((S.tower || 0) >= TOWER.length ? ' class="ok"' : '') + '><b>问剑台</b>（落霞镇 · 莫问）　已过 ' + (S.tower || 0) + ' / ' + TOWER.length + ' 层</li>' : '') + '</ul>' +
        Jianghu.listHtml() +
        (S.bond && (S.bond.su || S.bond.bai) ? '<div class="sub">同伴情谊</div><ul>' + ['su', 'bai'].filter(k => S.bond[k]).map(k => '<li><b>' + CHARS[k].name + '</b>　<span style="color:#ff8fa8;letter-spacing:.15em">' + '♥'.repeat(Math.max(0, Math.min(40, Math.floor(S.bond[k])))) + '</span>　<small>' + S.bond[k] + ' 点</small>　<small>' + HEART_NAME[heartTier(k)] + '</small></li>').join('') + '</ul><p class="tip" style="text-align:left;margin:.2rem 0 .6rem">情谊深浅决定她与云澈说话的口吻：在客栈“与同伴谈心”时听得出来。</p>' : '') +
        '<div class="sub">江湖见闻</div><ul><li>落霞镇位于江湖中央：西接青岚山道，南通万竹林，东经烟雨渡往赤焰谷，北上寒月雪岭；雪岭背后是幽烬城。</li><li>灯会、疗伤、夜话里的选择会影响同伴的<b>情谊</b>，也会改变结局。</li><li>野外发光的<b>灵泉</b>可恢复全队状态，并记为重生之地。</li><li>怒气蓄满后可施展<b>绝招</b>；普通攻击积攒怒气最快。</li><li>遇敌不敌时可以逃跑；先在镇上添置装备与丹药。</li></ul></div>';
    } else {
      h += '<div class="sys"><button class="btn big" data-act="save">保存进度</button>' +
        '<button class="btn big" data-act="town"' + (S.flags.town ? '' : ' disabled') + '>御风回镇（返回落霞镇）</button>' +
        '<button class="btn big" data-act="snd">音效：' + (Sfx.isOn() ? '开' : '关') + '</button>' +
        '<button class="btn big" data-act="diff">难度：' + DIFFS[S.diff || 0].n + '</button>' +
        '<button class="btn big" data-act="avatar"' + (S.party.length > 1 ? '' : ' disabled') + '>大地图形象：' + CHARS[S.party.some(m => m.id === S.avatar) ? S.avatar : 'hero'].name + '</button>' +
        '<button class="btn big" data-act="ai">AI 人物：' + AI.label() + '</button>' +
        (G3.ok ? '<button class="btn big" data-act="gfx">画质：' + G3.gfxModes[G3.quality()] + (G3.gfxCustom() ? '（自定义）' : '') + '</button>' : '') +
        '<button class="btn big" data-act="perf">性能读数：' + (G.perfOn ? '开' : '关') + '（F3）</button>' +
        '<button class="btn big ghost" data-act="title">返回标题</button>' +
        '<p class="tip">游戏会在切换地图、战斗胜利后自动保存。<br>游玩时间 ' + Math.floor(S.time / 60) + ' 分钟</p></div>';
    }
    h += '</div></div>';
    $('menu').innerHTML = h;
  }
  function onMenuClick(e) {
    const t = e.target.closest('button'); if (!t) { if (e.target.id === 'menu') toggleMenu(); return; }
    const d = t.dataset; Sfx.play('ui');
    if (d.tab) { menu.tab = d.tab; menu.slot = null; menu.useItem = null; }
    else if (d.sel != null) { menu.sel = +d.sel; menu.slot = null; }
    else if (d.slot) menu.slot = menu.slot === d.slot ? null : d.slot;
    else if (d.attr) { const m = S.party[menu.sel]; if (m.pt > 0) { m.at[d.attr]++; m.pt--; Sfx.play('ok'); } }
    else if (d.refine != null) { const m = S.party[menu.sel], i = refinePending(m); if (i >= 0) { const o = REFINE[m.id][i].opts[+d.refine]; refineChoose(m, +d.refine); Sfx.play('lvup'); toast('【' + SKILLS[REFINE[m.id][i].sk].name + '】精进：<b>' + o.n + '</b>'); G.save(); } }
    else if (d.auto) { autoAllot(S.party[menu.sel]); Sfx.play('ok'); }
    else if (d.equip != null) { G.equip(S.party[menu.sel], menu.slot, d.equip || null); menu.slot = null; Sfx.play('ok'); }
    else if (d.use) menu.useItem = d.use;
    else if (d.on != null) {
      const i = +d.on, id = menu.useItem; menu.useItem = null;
      if (i >= 0 && S.items[id] > 0) {
        const m = S.party[i], st = calcStats(m), u = { hp: m.hp, mhp: st.mhp, mp: m.mp, mmp: st.mmp, status: {} };
        const ev = useItemOn(ITEMS[id], u);
        if (ev.some(x => x.val > 0 || x.type === 'revive')) { m.hp = u.hp; m.mp = u.mp; S.items[id]--; Sfx.play('heal'); toast('使用了' + ITEMS[id].name); }
        else { Sfx.play('no'); toast('现在用不上。'); }
      }
    }
    else if (d.act === 'close') { toggleMenu(); return; }
    else if (d.act === 'save') { G.save(); toast('进度已保存'); }
    else if (d.act === 'snd') { const on = Sfx.toggle(); $('h-snd').classList.toggle('off', !on); }
    else if (d.act === 'diff') { S.diff = ((S.diff || 0) + 1) % DIFFS.length; DIFF = S.diff; toast('难度：<b>' + DIFFS[DIFF].n + '</b>'); }
    else if (d.act === 'avatar') { const ids = S.party.map(m => m.id); S.avatar = ids[(Math.max(0, ids.indexOf(S.avatar)) + 1) % ids.length]; toast('大地图上由 <b>' + CHARS[S.avatar].name + '</b> 领路'); G.save(); }
    else if (d.act === 'ai') { aiPanel(true); return; }
    else if (d.act === 'gfx') { gfxPanel(true); return; }
    else if (d.act === 'perf') G.perfToggle();
    else if (d.act === 'town') { toggleMenu(); G.warpTown(); return; }
    else if (d.act === 'title') { toggleMenu(); G.toTitle(); return; }
    renderMenu();
  }

  /* ---------- 商店 ---------- */
  // sell = true：当铺，卖出背包里用不上的东西（按原价五成）
  function shop(id, title, sell) {
    return new Promise(res => {
      if (G.autoSkip) { res(); return; }
      shopId = { id, title, sell: !!sell }; shopRes = res; $('dlg').classList.add('hide');
      $('shop').classList.remove('hide'); renderShop();
    });
  }
  const sellPrice = it => Math.floor((it.price || 0) * 0.5);
  function renderShop() {
    const tier = G.tier();
    let h = '<div class="panel big"><div class="tabs"><span class="ttl">' + shopId.title + '</span><span class="gold"><i class="coin"></i>' + S.gold + '</span><button class="x" data-act="close">✕</button></div><div class="pbody"><div class="bag">';
    if (shopId.sell) {   // 当铺：背包里有标价的东西都收（要紧物件、无价的奇珍不收；穿戴在身上的不在背包里，自然不会列出来）
      const own = Object.keys(S.items).filter(k => S.items[k] > 0 && ITEMS[k] && ITEMS[k].type !== 'key' && sellPrice(ITEMS[k]) > 0);
      h += own.length ? own.map(k => { const it = ITEMS[k], worn = S.party.filter(m => Object.values(m.eq).includes(k)).length; return '<div class="irow"><span>' + it.name + '<em>背包里 ' + S.items[k] + (worn ? '，另有 ' + worn + ' 件穿戴着' : '') + '</em></span><small>' + itemText(it) + '</small><button class="btn sm buy" data-sell="' + k + '">当 <i class="coin"></i>' + sellPrice(it) + '</button></div>'; }).join('') : '<p class="tip">背包里没有当铺肯收的东西。</p>';
      h += '</div><p class="tip">当铺按原价五成收，点一下当出一件。穿戴在身上的装备不会列在这里；要紧的物件和无价的奇珍，当铺不敢收。</p></div></div>';
      $('shop').innerHTML = h; return;
    }
    // 兵刃护甲按品级上架：队伍里最高的那位练到只差一级时就摆出来；药品和饰品仍按主线进度（tier）
    const topLv = S.party.reduce((a, m) => Math.max(a, m.lv), 1);
    const ids = Object.keys(ITEMS).filter(k => { const it = ITEMS[k]; return it.shop === shopId.id && (it.g && it.g.ilv ? it.g.ilv <= topLv + 1 : it.tier <= tier); })
      .sort((a, b) => ((ITEMS[a].g && ITEMS[a].g.ilv) || 0) - ((ITEMS[b].g && ITEMS[b].g.ilv) || 0));
    h += ids.map(k => {
      const it = ITEMS[k], own = (S.items[k] || 0) + S.party.filter(m => Object.values(m.eq).includes(k)).length, pr = Jianghu.price(it, shopId.id);
      return '<div class="irow"><span>' + it.name + '<em>持有 ' + own + '</em></span><small>' + itemText(it) + '</small><button class="btn sm buy" data-buy="' + k + '"' + (S.gold < pr ? ' disabled' : '') + '><i class="coin"></i>' + pr + (pr < it.price ? '<s>' + it.price + '</s>' : '') + '</button></div>';
    }).join('');
    h += '</div><p class="tip">新货会随着你的江湖阅历陆续上架。装备购买后请在「菜单 · 队伍」中更换。</p></div></div>';
    $('shop').innerHTML = h;
  }
  function onShopClick(e) {
    const t = e.target.closest('button');
    if (!t) { if (e.target.id !== 'shop') return; }
    if (!t || t.dataset.act === 'close') { $('shop').classList.add('hide'); const r = shopRes; shopRes = null; hud(); if (r) r(); return; }
    const sk = t.dataset.sell;
    if (sk) { if (S.items[sk] > 0 && ITEMS[sk]) { S.items[sk]--; S.gold += sellPrice(ITEMS[sk]); Sfx.play('ok'); renderShop(); } return; }
    const k = t.dataset.buy;
    const pr = k ? Jianghu.price(ITEMS[k], shopId.id) : 0;
    if (k && S.gold >= pr) { S.gold -= pr; S.items[k] = (S.items[k] || 0) + 1; Sfx.play('ok'); S.bought = S.bought || {}; if ((S.bought[shopId.id] = (S.bought[shopId.id] || 0) + 1) <= 24 && S.bought[shopId.id] % 2 === 0) Jianghu.add(shopId.id, 1, true); renderShop(); }
  }

  /* ---------- 战斗界面 ---------- */
  let cmdState = null;
  const b = {
    show(units) {
      $('battleui').classList.remove('hide'); $('hud').classList.add('hide');
      $('b-cmd').classList.add('hide'); $('b-list').classList.add('hide'); $('b-tip').classList.add('hide'); $('b-desc').classList.add('hide');
      $('b-auto').classList.toggle('on', Battle.auto); $('b-speed').textContent = '速度 ×' + (Battle.speed === Battle.SPEEDS[0] ? 1 : 2);
      this.cards(units);
    },
    hide() { $('battleui').classList.add('hide'); cmdState = null; },
    cards(units, cur) {
      $('b-party').innerHTML = units.filter(u => u.side === 0).map(u => {
        const chips = Object.keys(u.status).map(k => '<i style="background:' + STATUS[k].c + '">' + STATUS[k].n + '</i>').join('');
        const hp = Math.max(0, Math.round(u.dhp));
        return '<div class="pc bc' + (u === cur ? ' cur' : '') + (hp <= 0 ? ' dead' : '') + '" data-u="' + units.indexOf(u) + '"><img class="pc-p" src="' + Art.portraitURL(u.look, 96) + '"><div class="pc-i"><div class="pc-n">' + esc(u.id === 'hero' ? S.name : u.name) + '<span class="chips">' + chips + '</span></div>' +
          '<div class="bar hp"><i style="width:' + hp / u.mhp * 100 + '%"></i><em>' + hp + '/' + u.mhp + '</em></div><div class="bar mp"><i style="width:' + (u.mmp ? u.mp / u.mmp * 100 : 0) + '%"></i><em>' + u.mp + '/' + u.mmp + '</em></div><div class="bar rage' + (u.rage >= 100 ? ' full' : '') + '"><i style="width:' + u.rage + '%"></i></div></div></div>';
      }).join('');
    },
    order(list) {
      $('b-order').innerHTML = list.map((u, i) => '<span class="od s' + u.side + (i === 0 ? ' now' : '') + '"><img src="' + Art.portraitURL(u.look, 96) + '"></span>').join('');
    },
    // 首领出手时说的话：在画面上方停留片刻
    say(name, text) {
      const n = $('b-say'); n.innerHTML = '<b>' + esc(name) + '</b>' + esc(text);
      n.classList.remove('show'); void n.offsetWidth; n.classList.add('show');
    },
    name(text, col) {
      const n = $('b-name'); n.textContent = text; n.style.setProperty('--c', col || '#ffe08a');
      n.classList.remove('show'); void n.offsetWidth; n.classList.add('show');
    },
    tip(text, onCancel) {
      const t = $('b-tip'); t.innerHTML = '<span>' + text + '</span>' + (onCancel ? '<button class="btn sm">取消</button>' : '');
      t.classList.remove('hide');
      if (onCancel) t.querySelector('button').onclick = () => { Sfx.play('ui'); onCancel(); };
    },
    hideTip() { $('b-tip').classList.add('hide'); },
    pending() { return !!cmdState; },
    force(act) { if (!cmdState) return; const r = cmdState.res; cmdState = null; $('b-cmd').classList.add('hide'); $('b-list').classList.add('hide'); $('b-desc').classList.add('hide'); this.hideTip(); r(act); },
    cmd(u, units, opts) {
      return new Promise(res => {
        cmdState = { res, u, units };
        const box = $('b-cmd'), sk = u.skills.map(id => SKILLS[id]), ult = SKILLS[u.ult];
        let h = '<button class="rb atk" data-sk="attack"><b>攻</b><small>攻击</small></button>';
        const slots = [{ s: ult, ult: 1, pos: 'right:7.3rem;bottom:6.9rem' }];
        sk.forEach((s, i) => slots.push({ s, pos: 'right:' + (9.2 + i * 4.95).toFixed(2) + 'rem;bottom:2.3rem' }));
        for (const sl of slots) {
          const s = sl.s, dis = sl.ult ? u.rage < 100 : u.mp < s.cost, e = ELEM[s.elem];
          h += '<button class="rb sk' + (sl.ult ? ' ult' : '') + (sl.ult && !dis ? ' ready' : '') + '" style="' + sl.pos + ';--c:' + e.c2 + ';--c1:' + e.c + '" data-sk="' + s.id + '"' + (dis ? ' disabled' : '') + '><b>' + s.name[0] + '</b><small>' + s.name + '</small><em>' + (sl.ult ? '绝' : s.cost) + '</em></button>';
        }
        h += '<div class="pills"><button class="btn sm" data-c="item">物品</button><button class="btn sm" data-c="guard">防御</button><button class="btn sm" data-c="flee"' + (opts.noFlee ? ' disabled' : '') + '>逃跑</button></div>';
        box.innerHTML = h; box.classList.remove('hide');
        const foes = () => units.filter(x => x.side === 1 && x.hp > 0), team = () => units.filter(x => x.side === 0);
        const done = act => { if (cmdState && cmdState.res === res) b.force(act); };
        const pick = async (cands, text) => {
          box.classList.add('picking'); $('b-list').classList.add('hide');
          const t = await Battle.pick(cands, text);
          box.classList.remove('picking');
          return t;
        };
        const useSkill = async id => {
          const s = SKILLS[id]; let target = null;
          if (s.tgt === 'one') { const c = foes(); target = c.length === 1 ? c[0] : await pick(c, '【' + s.name + '】选择目标'); if (!target) return; }
          else if (s.tgt === 'ally') { target = await pick(team().filter(x => x.hp > 0), '【' + s.name + '】选择同伴'); if (!target) return; }
          else if (s.tgt === 'dead') { const c = team().filter(x => x.hp <= 0); if (!c.length) { toast('没有倒地的同伴。'); Sfx.play('no'); return; } target = c.length === 1 ? c[0] : await pick(c, '【' + s.name + '】选择同伴'); if (!target) return; }
          done({ type: 'skill', id, target });
        };
        const showDesc = id => { const s = SKILLS[id], d = $('b-desc'); d.innerHTML = '<b>' + s.name + '</b><em>' + (s.ult ? '怒气满时可用' : s.cost ? '内力 ' + s.cost : '') + '</em><p>' + s.desc + '</p>'; d.classList.remove('hide'); };
        box.onmouseover = e => { const t = e.target.closest('[data-sk]'); if (t) showDesc(t.dataset.sk); };
        box.onmouseleave = () => $('b-desc').classList.add('hide');
        box.onclick = async e => {
          const t = e.target.closest('button'); if (!t || t.disabled || box.classList.contains('picking')) return;
          Sfx.play('ui');
          if (t.dataset.sk) { showDesc(t.dataset.sk); useSkill(t.dataset.sk); }
          else if (t.dataset.c === 'guard') done({ type: 'guard' });
          else if (t.dataset.c === 'flee') done({ type: 'flee' });
          else if (t.dataset.c === 'item') {
            const L = $('b-list');
            if (!L.classList.contains('hide')) { L.classList.add('hide'); return; }
            const ids = Object.keys(S.items).filter(k => S.items[k] > 0 && ITEMS[k].type === 'use');
            L.innerHTML = '<div class="sub">物品</div>' + (ids.length ? ids.map(k => '<button class="irow" data-it="' + k + '"><span>' + ITEMS[k].name + ' ×' + S.items[k] + '</span><small>' + ITEMS[k].desc + '</small></button>').join('') : '<div class="empty">没有可用的物品</div>');
            L.classList.remove('hide');
            L.onclick = async ev => {
              const r = ev.target.closest('[data-it]'); if (!r) return;
              const it = ITEMS[r.dataset.it]; Sfx.play('ui');
              const c = it.eff.revive ? team().filter(x => x.hp <= 0) : team().filter(x => x.hp > 0);
              if (!c.length) { toast('没有倒地的同伴。'); return; }
              const target = await pick(c, '【' + it.name + '】选择同伴'); if (!target) return;
              done({ type: 'item', id: it.id, target });
            };
          }
        };
      });
    },
    result(d) {
      return new Promise(res => {
        if (G.autoSkip) { res(); return; }
        const R = $('result');
        let h = '<div class="panel res ' + (d.win ? 'win' : 'lose') + '"><h2>' + (d.win ? '战斗胜利' : '力战不敌') + '</h2>';
        if (d.win) {
          h += '<div class="gain"><span>修为 +' + d.exp + '</span><span><i class="coin"></i>+' + d.gold + '</span></div>';
          h += d.rows.map(r => '<div class="rrow"><img src="' + Art.portraitURL(CHARS[r.m.id].look, 96) + '"><div><b>' + esc(r.m.id === 'hero' ? S.name : CHARS[r.m.id].name) + '</b> Lv.' + r.m.lv + (r.ups.length ? '<em class="up">升级！</em>' : '') +
            bar('exp', r.m.exp, expNeed(r.m.lv)) + r.ups.map(u => u.skills.map(s => '<p class="new">领悟武学【' + SKILLS[s].name + '】</p>').join('')).join('') +
            (r.ups.length && refinePending(r.m) >= 0 ? '<p class="new">有一门招式可以精进（菜单 · 人物）</p>' : '') + '</div></div>').join('');
        } else h += '<p class="tip">胜败乃兵家常事。</p>' + (d.tips || []).map(s => '<p class="tip">' + s + '</p>').join('');   // 败因小结（battle.js 的 lossTips）
        h += '<button class="btn big">继续</button></div>';
        R.innerHTML = h; R.classList.remove('hide');
        R.querySelector('button').onclick = () => { Sfx.play('ok'); R.classList.add('hide'); R.innerHTML = ''; res(); };
      });
    }
  };

  function title(on) {
    $('title').classList.toggle('hide', !on);
    if (on) { $('t-cont').disabled = !G.hasSave(); if (typeof AI !== 'undefined') AI.paint(); }
  }
  function err(msg) { const e = $('err'); e.textContent = msg; e.classList.remove('hide'); }
  function busyUI() { return menu.open || aiOpen || gfxOpen || !!shopRes || !!dlg.res || !!chooseRes || !!narrRes || !$('result').classList.contains('hide') || !$('ask').classList.contains('hide'); }

  return { init, say, choose, toast, banner, fade, fadeNote, flash, narrate, advance, update, hud, showHud, toggleMenu, shop, b, title, err, busyUI, askOpen, askSet, askInput, askClose, banter, chooseKey, aiPanel, gfxPanel, menuOpen: () => menu.open, $ };
})();
