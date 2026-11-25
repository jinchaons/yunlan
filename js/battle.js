'use strict';
/* ============ 回合制战斗：流程与演出 ============ */
const Battle = {
  // speed：演出的实际倍率。按钮上的 ×1 / ×2 对应 SPEEDS 里的 1.6 / 4（一倍速原先是 2，嫌快，降了两成；二倍速没动）
  active: false, auto: false, speed: 1.6, SPEEDS: [1.6, 4], units: [], tw: [], fx: [], nums: [], parts: [], amb: [], t: 0,
  bg: null, bgKey: '', cur: null, pickState: null, cut: null, shake: 0, theme: 'mountain', opts: {}, W: 1280, H: 720, US: 2.3,

  sleep(d) { if (G.autoSkip) return Promise.resolve(); return new Promise(r => this.tw.push({ t: 0, d, r })); },
  tween(o, to, d, ease) {
    if (G.autoSkip) { Object.assign(o, to); return Promise.resolve(); }
    return new Promise(r => { const from = {}; for (const k in to) from[k] = o[k]; this.tw.push({ t: 0, d, r, o, from, to, ease }); });
  },
  pos(u) { return G3.ok ? G3.battle.screen(u, 0, true) : { x: this.W * u.v.fx + u.v.ox, y: this.H * u.v.fy + u.v.oy }; },
  home(u) { return G3.ok ? G3.battle.screen(u, 0, false) : { x: this.W * u.v.fx, y: this.H * u.v.fy }; },
  hgt(u) { return G3.ok ? G3.battle.hgt(u) : Art.unitHeight(u.look) * this.US; },

  async start(ids, opts) {
    opts = opts || {};
    this.opts = opts; this.theme = opts.theme || (World.map ? World.map.d.btheme || World.map.d.theme : 'mountain');
    this.tw = []; this.fx = []; this.nums = []; this.parts = []; this.cut = null; this.shake = 0; this.pickState = null; this.cur = null; this.t = 0;
    this.plan = null; this.log = []; this.zoom = null; this.slow = 0; this.stat = { by: {}, total: 0, ultHit: 0, ultOpen: 0, brk: 0 };
    this.amb = []; for (let i = 0; i < 30; i++) this.amb.push({ x: Math.random(), y: Math.random(), z: Math.random(), ph: Math.random() * 9 });
    DIFF = S.diff || 0; S.party.forEach(fixMember);
    const units = this.units = S.party.map(unitFromMember).concat(foeUnits(ids, opts, S.party));   // 对手的等级：opts.lv 这一场定在几级 / opts.follow 至少跟到队伍的等级（见 core.js 的 foeLevels）
    for (const s of [0, 1]) {
      const list = units.filter(u => u.side === s), n = list.length;
      list.forEach((u, i) => {
        const big = (u.look.sz || 1) > 1.4;
        let fx = s === 0 ? 0.33 - (i % 2) * 0.11 : 0.67 + (i % 2) * 0.11, fy = n === 1 ? 0.7 : lerp(0.57, 0.8, i / (n - 1));
        if (s === 1 && big) { fx = 0.72; fy = n === 1 ? 0.74 : fy; }
        if (s === 1 && n > 1 && ENEMIES[u.id].boss) { fx = 0.79; fy = 0.69; }
        else if (s === 1 && n > 1 && list.some(x => ENEMIES[x.id].boss)) { const j = list.filter(x => !ENEMIES[x.id].boss).indexOf(u), m = list.length - 1; fx = 0.64; fy = m === 1 ? 0.78 : lerp(0.59, 0.8, j / (m - 1)); }
        u.v = { fx, fy, bx: clamp((fx - 0.5) * 18, -5.1, big ? 3.9 : 4.6), bz: (fy - 0.69) * 18, ox: s === 0 ? -260 : 260, oy: 0, pose: 'idle', swing: 0, hitT: 0, alpha: 1, dead: false, seed: i * 2.3 + s };
        u.dhp = u.hp;
      });
    }
    if (G3.ok && G3.k.ensureModels && !G.autoSkip) await G3.k.ensureModels(units.map(u => u.look));
    if (G3.ok) G3.battle.begin(this.theme, units);
    initWaits(units, Math.random);
    this.active = true; G.scene = 'battle';
    UI.b.show(units); UI.b.order(predictOrder(units, 7));
    Sfx.music(opts.boss ? 'boss' : 'battle');
    await UI.fade(0);
    await Promise.all(units.map((u, i) => this.tween(u.v, { ox: 0 }, 0.35 + i * 0.04, 'out')));
    if (opts.boss && !G.autoSkip) { Sfx.play('gong'); UI.b.name(units.filter(u => u.side === 1 && u.boss).map(u => u.name).join(' · ') || '强敌', '#ff6a5a'); await this.sleep(0.7); }
    for (const u of units) if (u.mech && u.mech.seals) await this.askSeal(u);   // 魔相：开打先请一块玉

    let result = null, guardN = 0;
    const alive = s => units.some(u => u.side === s && u.hp > 0);
    while (!result && guardN++ < 2000) {
      const u = nextActor(units);
      this.cur = u; this.prefetch(units);
      UI.b.order([u].concat(predictOrder(units, 6))); UI.b.cards(units, u);
      const st = startTurn(u);
      if (st.ev.length) { this.tally(null, null, st.ev, null); this.playEvents(st.ev, null); await this.sleep(0.45); }
      if (!alive(0)) { result = 'lose'; break; }
      if (!alive(1)) { result = 'win'; break; }
      if (u.hp <= 0) continue;
      if (st.skip) { this.text(u, '无法行动', '#ffe066'); await this.sleep(0.5); endTurn(u); continue; }
      let act;
      if (u.side === 0) act = (this.auto || G.autoSkip) ? autoChoose(u, units) : await UI.b.cmd(u, units, { noFlee: !!opts.noFlee });
      else {
        // 对手怒气满了：这一手必出大招（不去问 AI，也不走寻常的随机出招）
        // 首领自己的机制先问一遍（core.js 的 mechTurn）：换阶段、认输、回血，或者要办一件事
        let ma = null;
        if (u.mech) { const mev = []; ma = mechTurn(u, units, Math.random, mev); if (mev.length) await this.mechShow(u, mev); }
        const ua = ma ? null : enemyUlt(u, units);
        if (ma) { await this.sleep(0.25); act = ma; }
        else if (ua) { await this.sleep(0.25); act = ua; } else act = (await this.bossAct(u, units)) || aiChoose(u, units);
      }
      if (act.type === 'flee') {
        if (Math.random() < 0.7) { this.text(u, '撤退！', '#ffffff'); await Promise.all(units.filter(x => x.side === 0).map(x => this.tween(x.v, { ox: -400 }, 0.4))); result = 'flee'; break; }
        this.text(u, '逃跑失败', '#ff9a9a'); await this.sleep(0.5);
      } else if (act.type === 'guard') {
        u.guard = true; u.mp = Math.min(u.mmp, u.mp + Math.ceil(u.mmp * 0.08)); u.rage = Math.min(100, u.rage + 8);
        u.v.pose = 'guard'; this.text(u, '防御', '#7ec8ff'); Sfx.play('buff'); await this.sleep(0.4);
      } else if (act.type === 'item') {
        const it = ITEMS[act.id];
        if (S.items[it.id] > 0) {
          S.items[it.id]--; UI.b.name(it.name, '#9dffb0');
          u.v.pose = 'cast'; await this.sleep(0.25);
          const ev = useItemOn(it, act.target);
          const p = this.pos(act.target); this.fx.push({ type: 'heal', x: p.x, y: p.y, col: '#e0ffb8', col2: '#4fd070', t: 0, d: 0.7 });
          Sfx.play('heal'); this.playEvents(ev, null); await this.sleep(0.5); u.v.pose = 'idle';
        }
      } else if (act.type === 'charge') {
        // 蓄势：这一手不出招，把大招和目标亮出来，下一手才放。来得及防御、嘲讽，或者把它的架势打空来打断（core.js 的 BAL）
        const sk = SKILLS[act.id], who = act.target ? (act.target.id === 'hero' ? S.name : act.target.name) : (sk.tgt === 'rand' ? '乱击' : '全体');
        u.charge = { id: act.id, target: act.target, wait: act.wait || 0 };
        u.v.pose = 'cast'; UI.b.name('蓄势 · ' + sk.name + ' → ' + who + (act.wait ? '（要蓄 ' + (act.wait + 1) + ' 手）' : ''), '#ffb347'); this.text(u, '蓄势', '#ffb347'); Sfx.play('gong'); this.shake = Math.max(this.shake, 6);
        this.log.push(u.name + ' 正在蓄势，下一手要放「' + sk.name + '」（目标：' + who + '）');
        if (this.log.length > 8) this.log.shift();
        await this.sleep(0.9);
      } else if (act.type === 'hold') {   // 要蓄不止一手的大招：接着蓄
        u.v.pose = 'cast'; this.text(u, '仍在蓄势', '#ffb347'); Sfx.play('buff'); await this.sleep(0.7);
      } else if (act.type === 'tele') {   // 首领的机制：蓄一手，下一手才办
        const tip = { rally: '打出破绽可以打断', mend: '用它怕的招式打中、或打出破绽，可以打断', drain: '怒气将被吸走，绝招趁早放' }[act.kind] || '';
        u.pend = { kind: act.kind, name: act.name };
        u.v.pose = 'cast'; UI.b.name('蓄势 · ' + act.name + (tip ? '（' + tip + '）' : ''), '#ffb347'); this.text(u, '蓄势', '#ffb347'); Sfx.play('gong');
        this.log.push(u.name + ' 正在蓄势，下一手要用「' + act.name + '」'); if (this.log.length > 8) this.log.shift();
        await this.sleep(0.9);
      } else if (act.type === 'mech') {   // 首领的机制：这一手就办
        const ev = mechDo(u, act, units, Math.random);
        if (act.kind === 'hesitate') { this.text(u, '……', '#d8c8ff'); UI.b.name(u.name + ' 迟疑了一下', '#d8c8ff'); }
        else { u.v.pose = 'cast'; UI.b.name(act.name + (act.kind === 'stance' ? '（单体招式会被反击）' : ''), '#ffb347'); Sfx.play('buff'); }
        this.playEvents(ev, null); await this.sleep(0.8);
      } else if (act.type === 'none') {
        await this.sleep(0.3);
      } else {
        await this.perform(u, SKILLS[act.id], act.target);
        if (act.ult) u.charge = null;
      }
      if (u.v.pose !== 'guard') u.v.pose = 'idle';
      endTurn(u);
      for (const x of units) { x.dhp = x.hp; if (x.side === 0 && x.hp > 0 && x.v.pose === 'guard' && !x.guard) x.v.pose = 'idle'; }
      UI.b.cards(units);
      if (!alive(1)) result = 'win'; else if (!alive(0)) result = 'lose';
    }
    this.cur = null; this.pickState = null; UI.b.force({ type: 'guard' });
    // 结算
    for (const u of units) if (u.side === 0) { u.ref.hp = Math.max(1, u.hp); u.ref.mp = u.mp; u.ref.rage = u.rage; }
    if (result === 'win') {
      await this.sleep(0.5);
      let exp = 0, gold = 0;
      for (const u of units) if (u.side === 1) { exp += u.exp || 0; gold += u.gold || 0; }
      for (const u of units) if (u.side === 0 && u.hp > 0) u.v.pose = 'victory';
      S.gold += gold;
      const rows = S.party.map(m => ({ m, ups: gainExp(m, exp) }));
      Sfx.music(null); Sfx.play(rows.some(r => r.ups.length) ? 'lvup' : 'win');
      if (!G.autoSkip) Sfx.play('win');
      await UI.b.result({ win: true, exp, gold, rows });
    } else if (result === 'lose') {
      Sfx.music(null); Sfx.play('lose');
      await this.sleep(0.8);
      if (!opts.quietLose) await UI.b.result({ win: false, tips: this.lossTips() });
    }
    await UI.fade(1);
    if (G3.ok) G3.battle.end();
    this.active = false; UI.b.hide(); G.scene = 'world';
    UI.showHud(true);
    if (World.map) Sfx.music(World.map.th.music);
    await UI.fade(0);
    return result;
  },

  /* 首领战术（AI）：在首领出手的前一个行动开始时就去问“下一手怎么打”，轮到它时多半已有答复，不必干等。
     答复无效、超时或没接 AI 时返回 null，改用内置的随机出招。 */
  prefetch(units) {
    if (typeof AI === 'undefined' || !AI.on || G.autoSkip) return;
    const nx = predictOrder(units, 1)[0];
    if (nx && nx.side === 1 && nx.boss && nx.hp > 0 && !(this.plan && this.plan.u === nx)) this.plan = { u: nx, p: AI.bossPlan(nx, units, this.log) };
  },
  async bossAct(u, units) {
    if (!u.boss || typeof AI === 'undefined' || !AI.on || G.autoSkip) { await this.sleep(0.25); return null; }
    if (!this.plan || this.plan.u !== u) this.plan = { u, p: AI.bossPlan(u, units, this.log) };
    const pl = this.plan; this.plan = null;
    const r = await Promise.race([pl.p.catch(() => null), new Promise(res => setTimeout(() => res(null), 2800))]);
    if (!r || !SKILLS[r.id]) { await this.sleep(0.2); return null; }
    const sk = SKILLS[r.id], foes = units.filter(x => x.side === 0 && x.hp > 0);
    if (sk.kind === 'buff' && sk.buff && u.status[sk.buff.id]) return null;   // 增益还在身上：不重复施放
    if (u.sealed === r.id) return null;                                        // 被璇玑玉封住的那一式
    let target = null;
    if (sk.kind === 'atk' && sk.tgt === 'one') { const tn = foes.find(f => f.status.taunt); target = tn || (r.target && r.target.hp > 0 ? r.target : null) || pickFoe(u, foes, Math.random); }
    // 话不能太密：上一回合刚说过就这回合不说，也不重复说过的句子
    u.turnN = (u.turnN || 0) + 1; u.said = u.said || [];
    if (r.say && u.said.indexOf(r.say) < 0 && u.turnN - (u.sayN || -9) >= 2) {
      u.said.push(r.say); u.sayN = u.turnN; this.log.push(u.name + ' 说：「' + r.say + '」（不要再说相同或相近的话）');
      UI.b.say(u.name, r.say); await this.sleep(0.55);
    } else await this.sleep(0.2);
    return { type: 'skill', id: r.id, target };
  },
  /* 首领的机制在它出手之前带出来的事：认输、换阶段（魔相每个阶段可以请一块璇玑玉封住它一式）、帮手给它回的血 */
  async mechShow(u, mev) {
    this.playEvents(mev, null);
    for (const e of mev) {
      if (e.type === 'yield') { UI.b.name('点到为止', '#fff2a0'); this.text(u, '认输', '#fff2a0'); await this.sleep(0.8); }
      else if (e.type === 'phase') {
        UI.b.name(u.name + ' · 第 ' + (e.n + 1) + ' 重', '#ff6a5a'); Sfx.play('gong'); this.shake = Math.max(this.shake, 14); await this.sleep(0.8);
        await this.askSeal(u);
      }
    }
    if (!mev.some(e => e.type === 'yield' || e.type === 'phase')) await this.sleep(0.35);
  },
  async askSeal(u) {
    const sl = u.mech && u.mech.seals; if (!sl || G.autoSkip || this.auto) return;
    const c = await UI.choose('四玉共鸣——请哪一块玉，封住它哪一式？', sl.map(s => ITEMS[s[0]].name + '：封住「' + SKILLS[s[1]].name + '」'));
    u.sealed = sl[Math.max(0, c)][1]; UI.b.name('封 · ' + SKILLS[u.sealed].name, '#bfe6ff');
  },
  /* 败因小结：一场仗里记下对手每一招打掉了多少气血、蓄势的大招有几人次没防住、我方打出过几次破绽，输了的时候讲给玩家听 */
  tally(u, sk, ev, guarded) {
    const st = this.stat; if (!st) return;
    for (const e of ev) {
      if (e.type === 'break' && u.side === 0) st.brk++;
      if (e.type !== 'dmg' || e.t.side !== 0) continue;
      const k = e.dot ? STATUS[e.dot].n : sk ? sk.name : '其他';
      st.by[k] = (st.by[k] || 0) + e.val; st.total += e.val;
      if (sk && sk.ult && u && u.mpoise) { st.ultHit++; if (!guarded || guarded.indexOf(e.t) < 0) st.ultOpen++; }
    }
  },
  lossTips() {
    const st = this.stat, out = []; if (!st || !st.total) return out;
    const top = Object.keys(st.by).sort((a, b) => st.by[b] - st.by[a]).slice(0, 2);
    out.push('吃亏最多的是：' + top.map(k => '「' + k + '」' + Math.round(st.by[k] / st.total * 100) + '%').join('，'));
    if (st.ultHit) out.push('对手蓄势的大招打中 ' + st.ultHit + ' 人次，其中 ' + st.ultOpen + ' 人次没有防御。' + (st.ultOpen ? '看到「蓄势」，让会被打到的人防御，或者把它的架势打空来打断。' : ''));
    const b = this.units.find(x => x.side === 1 && x.mpoise && x.weak && x.weak.length);
    if (b) out.push(b.name + ' 怕' + b.weak.map(e => ELEM[e].n).join('、') + '系的招式：伤害更高，架势也掉得更快。' + (st.brk ? '这一仗打出破绽 ' + st.brk + ' 次。' : '这一仗一次破绽也没打出来。'));
    return out;
  },
  async perform(u, sk, target) {
    const guarded = u.side === 1 ? this.units.filter(x => x.side === 0 && x.guard) : null;
    const ev = resolveAction(u, sk, target, this.units, Math.random);
    this.tally(u, sk, ev, guarded);
    // 记下最近几次行动，供首领的 AI 参考
    { const dm = ev.filter(x => x.type === 'dmg'), ko = ev.filter(x => x.type === 'ko').map(x => x.t.name), nm = x => (x.id === 'hero' ? S.name : x.name);
      this.log.push(nm(u) + ' 使出「' + sk.name + '」' + (dm.length ? '，对 ' + Array.from(new Set(dm.map(x => nm(x.t)))).join('、') + ' 造成共 ' + dm.reduce((a, x) => a + x.val, 0) + ' 点伤害' : sk.kind === 'heal' ? '，为同伴疗伤' : '') + (ko.length ? '，击倒了 ' + ko.join('、') : ''));
      if (this.log.length > 8) this.log.shift(); }
    const dir = u.side === 0 ? 1 : -1, e = ELEM[sk.elem];
    if (sk.id !== 'attack') UI.b.name(sk.name, e.c2);
    UI.b.cards(this.units, u);
    if (sk.ult) await this.cutIn(u, sk);
    const melee = sk.fx === 'slash' || sk.fx === 'heavy';
    // 有动捕模型的角色：按招式播放对应的出招片段（连招、重击、施法……），出手的时机跟片段里击中的那一刻对齐
    let A = null;
    if (G3.ok && !G.autoSkip && u.v.ch && u.v.ch.glb && sk.kind === 'atk') {
      const key = G3.k.skillAct(sk.id), ci = key && G3.k.clipInfo(key), n = sk.hits || 1;
      if (ci) {
        const ts = n > 1 && ci.hits && ci.hits.length > 1 ? ci.hits : [ci.hit], lead = Math.min(ts[0], sk.ult ? 1.0 : 0.5), at = [];
        // 几次伤害分摊到片段里的各击上；一击里要出两次伤害的，后一次略晚
        for (let h = 0; h < n; h++) { const j = Math.min(ts.length - 1, Math.floor(h * ts.length / n)); at.push(ts[j] + (h - Math.ceil(j * n / ts.length)) * 0.15); }
        A = { key, lead, at, from: ts[0] - lead, end: Math.min(ci.dur - 0.25, at[n - 1] + (sk.ult ? 1.0 : 0.7)) };
      }
    }
    const clipT = () => this.t - A.t0;   // 出招片段此刻播到第几秒
    const windup = async () => {   // 起手：切到出招片段；绝招时镜头推近出招的人，出手前拉回
      u.v.pose = 'attack'; u.v.swing = 0; u.v.act = A.key; u.v.from = A.from; A.t0 = this.t - A.from;
      const pre = Math.max(0, A.lead - 0.1);
      if (sk.ult && pre > 0.45) { this.zoom = { u, k: 0 }; await this.tween(this.zoom, { k: 1 }, 0.2, 'out'); await this.sleep(Math.max(0, pre - 0.42)); await this.tween(this.zoom, { k: 0 }, 0.2); this.zoom = null; }
    };    const approach = async t => {
      if (G3.ok) { const k = t.look.k === 'spider' ? 1.3 : 1; await this.tween(u.v, { ox: (t.v.bx - dir * (0.8 + 0.42 * (t.look.sz || 1) * k) - u.v.bx) * 80, oy: (t.v.bz - u.v.bz) * 80 + 4 }, 0.16, 'out'); return; }
      const a = this.home(u), b = this.home(t); await this.tween(u.v, { ox: b.x - dir * (62 + 22 * (t.look.sz || 1)) - a.x, oy: b.y - a.y + 3 }, 0.16, 'out');
    };
    if (sk.kind === 'atk') {
      const hits = sk.hits || 1;
      const first = ev.find(x => x.type === 'dmg');
      if (melee && first) await approach(first.t);
      else if (sk.fx === 'wave') await this.tween(u.v, { ox: dir * 56 }, 0.14, 'out');
      else if (A) { this.fx.push({ type: 'ring', u, col: e.c, col2: e.c2, t: 0, d: 0.5 }); Sfx.play('buff'); }
      else { u.v.pose = 'cast'; this.fx.push({ type: 'ring', u, col: e.c, col2: e.c2, t: 0, d: 0.5 }); Sfx.play('buff'); await this.sleep(0.3); }
      if (A) await windup();
      for (let h = 0; h < hits; h++) {
        const evs = ev.filter(x => x.hit === h);
        if (!evs.length) break;
        if (melee && h > 0 && evs[0].t !== ev.find(x => x.hit === h - 1).t) await approach(evs[0].t);
        const heavy = sk.fx === 'heavy';
        if (A) { const w = A.at[h] - 0.09 - clipT(); if (w > 0) await this.sleep(w); }
        else if (sk.fx !== 'burst' && sk.fx !== 'needle') { u.v.pose = 'attack'; u.v.swing = 0; }
        const p = this.tween(u.v, { swing: 1 }, heavy ? 0.26 : 0.17);
        await this.sleep(heavy ? 0.13 : 0.08);
        this.skillFx(sk, u, evs);
        this.playEvents(evs, sk);
        await p; await this.sleep(hits > 1 ? 0.07 : 0.16);
      }
      if (A) await this.sleep(clamp(A.end - clipT(), 0.12, 1.0));
      u.v.pose = 'idle'; u.v.swing = 0; u.v.act = u.v.lead = u.v.from = null;
      if (u.v.ox || u.v.oy) await this.tween(u.v, { ox: 0, oy: 0 }, 0.18, 'out');
      await this.sleep(0.14);
    } else {
      u.v.pose = 'cast'; this.fx.push({ type: 'ring', u, col: e.c, col2: e.c2, t: 0, d: 0.5 });
      await this.sleep(0.3);
      Sfx.play(sk.kind === 'buff' ? 'buff' : 'heal');
      this.skillFx(sk, u, ev); this.playEvents(ev, sk);
      await this.sleep(0.5); u.v.pose = 'idle';
    }
  },
  async cutIn(u, sk) {
    if (G.autoSkip) return;
    Sfx.play('ult');
    const d = u.side === 1 && !u.boss ? 0.8 : 1.1;   // 小怪的大招特写短一些，免得拖节奏
    this.cut = { u, sk, t: 0, d };
    await this.sleep(d);
    this.cut = null;
  },
  skillFx(sk, u, evs) {
    const e = ELEM[sk.elem], dir = u.side === 0 ? 1 : -1, seen = new Set(), big = !!sk.ult || sk.fx === 'heavy';
    const snd = { fire: 'fire', ice: 'ice', poison: 'poison', dark: 'dark' }[sk.elem];
    if (sk.kind === 'atk') Sfx.play(snd || 'slash');
    if (sk.fx === 'wave') {
      const a = this.pos(u);
      this.fx.push({ type: 'wave', x: a.x + dir * 30, x2: a.x + dir * this.W * 0.62, y: this.H * 0.72, dir, col: e.c, col2: e.c2, t: 0, d: 0.42, big });
    }
    for (const x of evs) {
      if (!x.t || seen.has(x.t) || x.type === 'ko') continue; seen.add(x.t);
      const p = this.pos(x.t), hh = this.hgt(x.t);
      const o = { x: p.x, y: p.y, cy: p.y - hh * 0.5, col: e.c, col2: e.c2, t: 0, dir, big, rot: (Math.random() - 0.5) * 1.6 };
      if (sk.kind !== 'atk') { this.fx.push(Object.assign(o, { type: sk.kind === 'buff' ? 'buff' : 'heal', d: 0.8 })); this.burst(p.x, p.y - hh * 0.4, 10, e.c2, 60, true); continue; }
      if (sk.fx === 'slash' || sk.fx === 'wave') this.fx.push(Object.assign(o, { type: 'slash', d: 0.28 }));
      else if (sk.fx === 'heavy') { this.fx.push(Object.assign({}, o, { type: 'slash', d: 0.36 })); this.fx.push(Object.assign({}, o, { type: 'shock', d: 0.5 })); }
      else if (sk.fx === 'burst') this.fx.push(Object.assign(o, { type: 'burst', d: 0.5, elem: sk.elem }));
      else if (sk.fx === 'needle') { const a = this.pos(u); this.fx.push(Object.assign(o, { type: 'needle', d: 0.3, sx: a.x + dir * 20, sy: a.y - this.hgt(u) * 0.55 })); }
      this.burst(p.x, o.cy, big ? 22 : 12, e.c2, big ? 260 : 180);
    }
  },
  burst(x, y, n, col, sp, up) {
    if (G.autoSkip) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, v = sp * (0.3 + Math.random() * 0.7);
      this.parts.push({ x, y, vx: Math.cos(a) * v, vy: up ? -Math.abs(Math.sin(a) * v) - 30 : Math.sin(a) * v - 40, g: up ? -20 : 300, life: 0, max: 0.35 + Math.random() * 0.45, r: 1.5 + Math.random() * 3, col });
    }
  },
  num(x, y, txt, col, size, sub) { if (!G.autoSkip) this.nums.push({ x: x + (Math.random() - 0.5) * 26, y, txt, col, size, sub, t: 0, d: 1.0 }); },
  text(u, txt, col) { const p = this.pos(u); this.num(p.x, p.y - this.hgt(u) - 6, txt, col, 20); },
  playEvents(evs, sk) {
    for (const e of evs) {
      const t = e.t, p = this.pos(t), hh = this.hgt(t);
      if (e.type === 'dmg') {
        t.dhp = Math.max(0, t.dhp - e.val); t.v.hitT = 0.28;
        if (e.dot) this.num(p.x, p.y - hh * 0.8, String(e.val), STATUS[e.dot].c, 22);
        else this.num(p.x, p.y - hh * 0.8, String(e.val), e.crit ? '#ffd24a' : e.el > 0 ? '#ffb070' : e.el < 0 ? '#a8b4c8' : t.side === 0 ? '#ff7a7a' : '#ffffff', e.crit ? 38 : e.el > 0 ? 32 : e.el < 0 ? 24 : 28, (e.crit ? '暴击' : '') + (e.el > 0 ? ' 克制' : e.el < 0 ? ' 抵抗' : ''));
        this.shake = Math.max(this.shake, e.crit || (sk && sk.fx === 'heavy') ? 12 : 5);
        Sfx.play(e.crit ? 'crit' : sk && sk.fx === 'heavy' ? 'heavy' : 'hit');
      } else if (e.type === 'miss') { this.num(p.x, p.y - hh * 0.8, '闪避', '#bfe6ff', 24); Sfx.play('ui'); t.v.dodgeT = 0.75; }
      else if (e.type === 'enrage') { this.num(p.x, p.y - hh - 14, '狂怒！', '#ff5a3a', 30); this.burst(p.x, p.y - hh * 0.5, 30, '#ff5a3a', 260, true); this.shake = Math.max(this.shake, 14); Sfx.play('gong'); }
      else if (e.type === 'cancel') { this.num(p.x, p.y - hh - 16, '蓄势被打断', '#ffd24a', 26); Sfx.play('crit'); }
      else if (e.type === 'counter') { this.num(p.x, p.y - hh - 16, '反击', '#ffb0b0', 26); Sfx.play('heavy'); }
      else if (e.type === 'drain') { this.num(p.x, p.y - hh - 12, '怒气被吸走', '#d0a0ff', 20); }
      else if (e.type === 'break') { this.num(p.x, p.y - hh - 16, e.cut ? '破绽！蓄势被打断' : '破绽！', '#ffd24a', 30); this.burst(p.x, p.y - hh * 0.5, 28, '#ffd24a', 240, true); this.shake = Math.max(this.shake, 14); this.slow = Math.max(this.slow || 0, 0.25); Sfx.play('crit'); }
      else if (e.type === 'heal') { t.dhp = Math.min(t.mhp, t.dhp + e.val); if (e.val > 0) this.num(p.x, p.y - hh * 0.8, '+' + e.val, '#8dff9a', 26); }
      else if (e.type === 'mp') { this.num(p.x, p.y - hh * 0.6, '内力+' + e.val, '#7ec8ff', 20); }
      else if (e.type === 'revive') { t.v.dead = false; t.v.alpha = 1; t.dhp = e.val; this.num(p.x, p.y - hh, '复苏', '#fff2a0', 24); }
      else if (e.type === 'status') this.num(p.x, p.y - hh - 12, STATUS[e.id].n, STATUS[e.id].c, 20);
      else if (e.type === 'cleanse') this.num(p.x, p.y - hh - 12, '净化', '#d8ffe6', 20);
      else if (e.type === 'ko') { t.v.dead = true; t.dhp = 0; t.v.fly = !!(sk && (sk.fx === 'heavy' || sk.ult)); Sfx.play('ko'); if (t.side === 1 && !this.units.some(x => x.side === 1 && x.hp > 0)) { this.slow = 0.55; this.shake = Math.max(this.shake, 16); } /* 最后一击：慢镜头 */ if (t.side === 1) { this.burst(p.x, p.y - hh * 0.5, 26, '#ffffff', 220); this.tween(t.v, { alpha: 0 }, 0.5); } }
    }
    UI.b.cards(this.units, this.cur);
  },

  pick(cands, text) {
    return new Promise(res => {
      this.pickState = { cands, res, sel: 0 };
      UI.b.tip(text + '（点击目标，或方向键选择后回车）', () => this.cancelPick());
    });
  },
  endPick(u) { const p = this.pickState; if (!p) return; this.pickState = null; UI.b.hideTip(); p.res(u); },
  cancelPick() { this.endPick(null); },
  pickByIndex(i) { const p = this.pickState; if (p && p.cands.includes(this.units[i])) { Sfx.play('ok'); this.endPick(this.units[i]); } },
  click(lx, ly) {
    const p = this.pickState; if (!p) return;
    let best = null, bd = 1e9;
    for (const u of p.cands) {
      const q = this.pos(u), hh = this.hgt(u), w = 34 * (u.look.sz || 1) * this.US * 0.5 + 16;
      if (Math.abs(lx - q.x) < w && ly > q.y - hh - 16 && ly < q.y + 22) { const d = Math.hypot(lx - q.x, ly - (q.y - hh / 2)); if (d < bd) { bd = d; best = u; } }
    }
    if (best) { Sfx.play('ok'); this.endPick(best); }
  },
  hover(lx, ly) {
    const p = this.pickState; if (!p) return;
    p.cands.forEach((u, i) => { const q = this.pos(u), hh = this.hgt(u); if (Math.abs(lx - q.x) < 50 * (u.look.sz || 1) && ly > q.y - hh - 16 && ly < q.y + 22) p.sel = i; });
  },
  key(k) {
    const p = this.pickState; if (!p) return false;
    if (k === 'up' || k === 'left') p.sel = (p.sel + p.cands.length - 1) % p.cands.length;
    else if (k === 'down' || k === 'right') p.sel = (p.sel + 1) % p.cands.length;
    else if (k === 'ok') { Sfx.play('ok'); this.endPick(p.cands[p.sel]); }
    else if (k === 'esc') this.cancelPick();
    return true;
  },
  setAuto(on) {
    this.auto = on; UI.$('b-auto').classList.toggle('on', on);
    if (on && this.active && UI.b.pending() && this.cur) { this.cancelPick(); UI.b.force(autoChoose(this.cur, this.units)); }
  },

  update(dt) {
    if (this.slow > 0) { this.slow -= dt; dt *= 0.3; }
    dt *= this.speed; this.t += dt; this.fdt = dt;
    for (let i = this.tw.length - 1; i >= 0; i--) {
      const w = this.tw[i]; w.t += dt;
      let k = Math.min(1, w.t / w.d);
      if (w.o) { const e = w.ease === 'out' ? 1 - (1 - k) * (1 - k) : k; for (const p in w.to) w.o[p] = w.from[p] + (w.to[p] - w.from[p]) * e; }
      if (k >= 1) { this.tw.splice(i, 1); w.r(); }
    }
    for (const u of this.units) { if (u.v.hitT > 0) u.v.hitT -= dt; if (u.v.dodgeT > 0) u.v.dodgeT -= dt; }
    for (let i = this.fx.length - 1; i >= 0; i--) { this.fx[i].t += dt; if (this.fx[i].t >= this.fx[i].d) this.fx.splice(i, 1); }
    for (let i = this.nums.length - 1; i >= 0; i--) { this.nums[i].t += dt; if (this.nums[i].t >= this.nums[i].d) this.nums.splice(i, 1); }
    for (let i = this.parts.length - 1; i >= 0; i--) { const p = this.parts[i]; p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.vx *= 0.96; if (p.life >= p.max) this.parts.splice(i, 1); }
    if (this.cut) this.cut.t += dt;
    this.shake *= Math.pow(0.001, dt);
    ambStep(this.amb, THEMES[this.theme].amb, this.t, dt);
  },

  draw(c, W, H) {
    this.W = W; this.H = H; const t = this.t, US = this.US = clamp(Math.min(H / 720, W / 760), 0.7, 1.4) * 2.3;
    const pr = Math.min(2, G.pr * G.scale), key = this.theme + '_' + Math.round(W) + '_' + Math.round(H);
    if (!G3.ok && this.bgKey !== key) {
      this.bg = document.createElement('canvas'); this.bg.width = Math.ceil(W * pr); this.bg.height = Math.ceil(H * pr);
      const b = this.bg.getContext('2d'); b.scale(pr, pr); Art.scenery(b, W, H, this.theme, this.theme.length * 7 + 2); this.bgKey = key;
    }
    c.save();
    const g3 = G3.ok;
    if (g3) G3.battle.render(this, this.fdt != null ? this.fdt : (G.dt || 0.016) * this.speed);
    else {
      if (this.shake > 0.3) c.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
      c.drawImage(this.bg, -8, -8, W + 16, H + 16);
    }
    ambDraw(c, W, H, THEMES[this.theme], t, this.amb);
    const list = this.units.slice().sort((a, b) => (a.v.fy * H + a.v.oy) - (b.v.fy * H + b.v.oy));
    const ps = this.pickState;
    // 脚下光环
    if (!g3) for (const u of list) {
      if (u.v.alpha <= 0.01) continue;
      const p = this.pos(u), sz = (u.look.sz || 1) * US;
      if (u === this.cur && u.hp > 0) { c.strokeStyle = 'rgba(255,226,120,' + (0.6 + 0.3 * Math.sin(t * 6)) + ')'; c.lineWidth = 3; c.setLineDash([10, 7]); c.lineDashOffset = -t * 30; Art.ell(c, p.x, p.y, 17 * sz, 6 * sz); c.stroke(); c.setLineDash([]); }
      if (ps && ps.cands.includes(u)) {
        const on = ps.cands[ps.sel] === u;
        c.strokeStyle = on ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.4)'; c.lineWidth = on ? 3.5 : 2; Art.ell(c, p.x, p.y, (19 + Math.sin(t * 8) * 1.5) * sz, 6.6 * sz); c.stroke();
      }
    }
    if (!g3) for (const u of list) {
      if (u.v.alpha <= 0.01) continue;
      const p = this.pos(u), v = u.v;
      c.save();
      c.translate(p.x + (v.hitT > 0 ? Math.sin(t * 70) * 5 * (v.hitT / 0.28) - (u.side === 0 ? 1 : -1) * 8 * (v.hitT / 0.28) : 0), p.y);
      c.scale(US, US); c.globalAlpha = v.alpha;
      const pose = v.dead ? 'dead' : v.hitT > 0 ? 'hit' : v.pose;
      Art.drawUnit(c, u.look, { t, face: u.side === 0 ? 1 : -1, pose, swing: v.swing, seed: v.seed, walk: false });
      c.restore();
    }
    // 血条
    for (const u of list) {
      if (u.v.alpha <= 0.5 || u.v.dead) continue;
      const p = this.home(u), top = p.y - this.hgt(u) - 12;
      const chips = Object.keys(u.status);
      if (u.side === 1 && !u.boss) {
        const w = 76; c.fillStyle = 'rgba(10,8,20,.7)'; Art.rrect(c, p.x - w / 2 - 2, top - 2, w + 4, 9, 4); c.fill();
        const g = c.createLinearGradient(0, top, 0, top + 5); g.addColorStop(0, '#ff8a7a'); g.addColorStop(1, '#d0302a');
        c.fillStyle = g; Art.rrect(c, p.x - w / 2, top, Math.max(2, w * u.dhp / u.mhp), 5, 2.5); c.fill();
        // 怒气条（血条下面细细的一道）：满了会闪，下一手就是大招
        if (u.ult) { const rk = Math.min(1, (u.rage || 0) / 100); c.fillStyle = 'rgba(10,8,20,.7)'; c.fillRect(p.x - w / 2, top + 7.5, w, 3); c.fillStyle = rk >= 1 ? (Math.sin(t * 12) > 0 ? '#fff2a0' : '#ff8a2a') : '#e8a03a'; c.fillRect(p.x - w / 2, top + 7.5, w * rk, 3); }
        // 架势条（精英才有）：打空了就是破绽
        if (u.mpoise) { const pk = clamp(u.poise / u.mpoise, 0, 1); c.fillStyle = 'rgba(10,8,20,.7)'; c.fillRect(p.x - w / 2, top + 11.5, w, 3); c.fillStyle = '#bfe6ff'; c.fillRect(p.x - w / 2, top + 11.5, w * pk, 3); }
        const nm = u.name + (u.lv ? '  Lv.' + u.lv : '');
        c.font = '600 12px ' + FONT_S; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = 'rgba(10,8,20,.9)'; c.strokeText(nm, p.x, top - 6); c.fillStyle = u.elite ? '#ffd27a' : '#fff'; c.fillText(nm, p.x, top - 6);
      }
      // 蓄势中的对手：头顶亮出要放的招
      if (u.side === 1 && ((u.charge && SKILLS[u.charge.id]) || u.pend)) {
        const s = '蓄势 · ' + (u.charge ? SKILLS[u.charge.id].name : u.pend.name), y = top - (u.boss ? 20 : 40) + Math.sin(t * 9) * 2;
        c.font = '700 14px ' + FONT_S; c.textAlign = 'center'; c.lineWidth = 3.5; c.strokeStyle = 'rgba(40,10,0,.95)'; c.strokeText(s, p.x, y); c.fillStyle = Math.sin(t * 12) > 0 ? '#ffe08a' : '#ff8a2a'; c.fillText(s, p.x, y);
      }
      if (chips.length && (u.side === 1)) {
        c.font = '600 11px ' + FONT_S; c.textAlign = 'center';
        chips.forEach((k, i) => { const x = p.x + (i - (chips.length - 1) / 2) * 34, y = top - (u.boss ? 2 : 24); c.fillStyle = STATUS[k].c; Art.rrect(c, x - 15, y - 11, 30, 14, 4); c.fill(); c.fillStyle = '#1a1028'; c.fillText(STATUS[k].n, x, y); });
      }
    }
    // 首领血条
    const bosses = this.units.filter(u => u.side === 1 && u.boss && u.hp > 0 || (u.side === 1 && u.boss && u.dhp > 0));
    bosses.forEach((u, i) => {
      const w = Math.min(W * 0.46, 520), x = W / 2 - w / 2, y = H * 0.135 + i * 34;
      c.fillStyle = 'rgba(10,8,20,.78)'; Art.rrect(c, x - 4, y - 4, w + 8, 20, 9); c.fill(); c.strokeStyle = '#e8c66a'; c.lineWidth = 1.6; c.stroke();
      const g = c.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, '#ff4a4a'); g.addColorStop(1, '#ffb347');
      c.fillStyle = g; Art.rrect(c, x, y, Math.max(6, w * u.dhp / u.mhp), 12, 6); c.fill();
      c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(x + 4, y + 1.5, Math.max(0, w * u.dhp / u.mhp - 8), 3);
      if (u.ult) { const rk = Math.min(1, (u.rage || 0) / 100); c.fillStyle = 'rgba(10,8,20,.8)'; c.fillRect(x, y + 15, w, 4); c.fillStyle = rk >= 1 ? (Math.sin(t * 12) > 0 ? '#fff2a0' : '#ff8a2a') : '#e8a03a'; c.fillRect(x, y + 15, w * rk, 4); }   // 首领的怒气条
      if (u.mpoise) { const pk = clamp(u.poise / u.mpoise, 0, 1); c.fillStyle = 'rgba(10,8,20,.8)'; c.fillRect(x, y + 20.5, w, 4); c.fillStyle = u.status.brk ? '#ffd24a' : '#bfe6ff'; c.fillRect(x, y + 20.5, u.status.brk ? w : w * pk, 4); }   // 首领的架势条（破绽时整条发黄）
      c.font = '700 14px ' + FONT_S; c.textAlign = 'center'; c.lineWidth = 3.5; c.strokeStyle = 'rgba(10,8,20,.95)'; const s = u.name + '  ' + Math.ceil(u.dhp) + ' / ' + u.mhp; c.strokeText(s, W / 2, y + 11); c.fillStyle = '#fff6da'; c.fillText(s, W / 2, y + 11);
    });
    // 选中箭头
    if (ps) { const u = ps.cands[ps.sel]; if (u) { const p = this.pos(u), y = p.y - this.hgt(u) - 34 + Math.sin(t * 8) * 5; c.fillStyle = '#ffe27a'; c.strokeStyle = '#5a3a00'; c.lineWidth = 2; c.beginPath(); c.moveTo(p.x - 12, y - 14); c.lineTo(p.x + 12, y - 14); c.lineTo(p.x, y + 4); c.closePath(); c.fill(); c.stroke(); } }
    // 特效
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const f of this.fx) this.drawFx(c, f, t);
    for (const p of this.parts) { const k = 1 - p.life / p.max; c.fillStyle = Art.rgba(p.col, k); Art.circ(c, p.x, p.y, p.r * (0.4 + k)); c.fill(); }
    c.restore();
    c.restore();
    // 数字
    c.textAlign = 'center';
    for (const n of this.nums) {
      const k = n.t / n.d, e = 1 - (1 - k) * (1 - k), s = k < 0.12 ? lerp(1.7, 1, k / 0.12) : 1, a = k > 0.7 ? (1 - k) / 0.3 : 1;
      c.save(); c.translate(n.x, n.y - 46 * e); c.scale(s, s); c.globalAlpha = a;
      c.font = 'italic 900 ' + n.size + 'px ' + FONT_S; c.lineWidth = 5; c.strokeStyle = 'rgba(16,10,30,.92)'; c.lineJoin = 'round';
      c.strokeText(n.txt, 0, 0); c.fillStyle = n.col; c.fillText(n.txt, 0, 0);
      if (n.sub) { c.font = '900 15px ' + FONT_S; c.lineWidth = 4; c.strokeText(n.sub, 0, -n.size + 4); c.fillStyle = '#ff8a3a'; c.fillText(n.sub, 0, -n.size + 4); }
      c.restore();
    }
    if (this.cut) this.drawCut(c, W, H);
  },
  drawFx(c, f, t) {
    const k = f.t / f.d, a = 1 - k;
    const crescent = (R, w) => { c.beginPath(); c.arc(0, 0, R, -1.15, 1.15); c.arc(-R * w, 0, R * (1 - w * 0.25), 0.98, -0.98, true); c.closePath(); };
    if (f.type === 'slash') {
      const R = (f.big ? 84 : 58) * (0.7 + k * 0.5);
      c.save(); c.translate(f.x, f.cy); c.rotate(f.rot + (f.dir < 0 ? Math.PI : 0) + (k - 0.5) * 0.7); c.globalAlpha = a;
      Art.glow(c, 0, 0, R * 1.3, f.col2, 0.5);
      c.fillStyle = f.col2; crescent(R, 0.34); c.fill();
      c.fillStyle = f.col; crescent(R * 0.94, 0.2); c.fill();
      c.fillStyle = '#ffffff'; crescent(R * 0.9, 0.1); c.fill();
      c.restore();
    } else if (f.type === 'shock') {
      c.save(); c.globalAlpha = a; c.strokeStyle = f.col; c.lineWidth = 6 * a + 1; Art.ell(c, f.x, f.y, 30 + k * 110, 9 + k * 30); c.stroke();
      const g = c.createLinearGradient(0, f.y - 300, 0, f.y); g.addColorStop(0, Art.rgba(f.col2, 0)); g.addColorStop(1, Art.rgba(f.col2, 0.8 * a));
      c.fillStyle = g; c.fillRect(f.x - 26 * a, f.y - 300, 52 * a, 300); c.fillStyle = 'rgba(255,255,255,' + a + ')'; c.fillRect(f.x - 5 * a, f.y - 300, 10 * a, 300);
      c.restore();
    } else if (f.type === 'wave') {
      const e = 1 - (1 - k) * (1 - k), x = lerp(f.x, f.x2, e), R = f.big ? 190 : 140;
      c.save(); c.translate(x, f.y); c.scale(f.dir * 0.55, 1.15); c.globalAlpha = Math.min(1, a * 1.6);
      Art.glow(c, 0, 0, R * 1.2, f.col2, 0.4);
      c.fillStyle = f.col2; crescent(R, 0.3); c.fill(); c.fillStyle = f.col; crescent(R * 0.95, 0.17); c.fill(); c.fillStyle = '#fff'; crescent(R * 0.92, 0.07); c.fill();
      c.restore();
      if (f.big) { c.save(); c.globalAlpha = a * 0.5; c.fillStyle = f.col; for (let i = 0; i < 6; i++) { const y = f.y - 150 + i * 60 + Math.sin(i * 9) * 20; c.fillRect(Math.min(f.x, x), y, Math.abs(x - f.x), 3); } c.restore(); }
    } else if (f.type === 'burst') {
      const R = (f.big ? 70 : 46) + k * (f.big ? 110 : 70);
      c.save(); c.globalAlpha = a; Art.glow(c, f.x, f.cy, R * 1.2, f.col2, 0.9);
      c.strokeStyle = f.col; c.lineWidth = 7 * a + 1; Art.circ(c, f.x, f.cy, R * 0.8); c.stroke();
      c.fillStyle = 'rgba(255,255,255,' + a * 0.8 + ')'; Art.circ(c, f.x, f.cy, R * 0.3 * a); c.fill();
      c.strokeStyle = f.col; c.lineWidth = 4;
      const n = f.elem === 'ice' ? 6 : 9;
      for (let i = 0; i < n; i++) { const an = i / n * TAU + f.rot, r0 = R * 0.3, r1 = R * (f.elem === 'ice' ? 1.15 : 0.95); c.beginPath(); c.moveTo(f.x + Math.cos(an) * r0, f.cy + Math.sin(an) * r0); c.lineTo(f.x + Math.cos(an) * r1, f.cy + Math.sin(an) * r1); c.stroke(); }
      c.restore();
    } else if (f.type === 'needle') {
      c.save(); c.strokeStyle = f.col; c.lineWidth = 2.5; c.lineCap = 'round';
      for (let i = 0; i < 5; i++) {
        const kk = clamp(k * 1.5 - i * 0.08, 0, 1), oy = (i - 2) * 14, x = lerp(f.sx, f.x, kk), y = lerp(f.sy + oy * 0.3, f.cy + oy, kk), ang = Math.atan2(f.cy + oy - f.sy, f.x - f.sx);
        if (kk >= 1) continue;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x - Math.cos(ang) * 38, y - Math.sin(ang) * 38); c.stroke();
      }
      if (k > 0.6) { c.globalAlpha = a * 2.5; c.strokeStyle = f.col2; c.lineWidth = 4; Art.circ(c, f.x, f.cy, (k - 0.6) * 130); c.stroke(); }
      c.restore();
    } else if (f.type === 'heal' || f.type === 'buff') {
      c.save(); c.globalAlpha = Math.min(1, a * 1.5);
      const g = c.createLinearGradient(0, f.y - 190, 0, f.y); g.addColorStop(0, Art.rgba(f.col2, 0)); g.addColorStop(1, Art.rgba(f.col2, 0.55));
      c.fillStyle = g; c.fillRect(f.x - 44, f.y - 190, 88, 190);
      c.strokeStyle = f.col; c.lineWidth = 3.5;
      for (let i = 0; i < 2; i++) { const kk = (k + i * 0.35) % 1; Art.ell(c, f.x, f.y - (f.type === 'buff' ? kk * 130 : 0), 30 + (f.type === 'heal' ? kk * 44 : 14), 10 + (f.type === 'heal' ? kk * 13 : 4)); c.stroke(); }
      c.fillStyle = f.col; c.font = '900 22px ' + FONT_S; c.textAlign = 'center';
      for (let i = 0; i < 5; i++) { const kk = (k * 1.2 + i * 0.21) % 1, x = f.x + Math.sin(i * 2.6) * 34, y = f.y - 20 - kk * 130; c.globalAlpha = (1 - kk) * a * 1.5; c.fillText(f.type === 'heal' ? '+' : '↑', x, y); }
      c.restore();
    } else if (f.type === 'ring') {
      const p = this.pos(f.u), sz = (f.u.look.sz || 1) * this.US;
      c.save(); c.globalAlpha = a; c.strokeStyle = f.col; c.lineWidth = 4;
      Art.ell(c, p.x, p.y, (30 - k * 12) * sz, (11 - k * 4) * sz); c.stroke(); Art.glow(c, p.x, p.y - 20 * sz, 46 * sz, f.col2, 0.5);
      c.restore();
    }
  },
  drawCut(c, W, H) {
    const q = this.cut, k = q.t / q.d, env = k < 0.12 ? k / 0.12 : k > 0.86 ? (1 - k) / 0.14 : 1, e = ELEM[q.sk.elem];
    const sl = Math.min(1, k * 4), ez = 1 - (1 - sl) * (1 - sl), dir = q.u.side === 0 ? 1 : -1;
    c.save();
    c.fillStyle = 'rgba(6,4,16,' + 0.62 * env + ')'; c.fillRect(0, 0, W, H);
    c.globalAlpha = env;
    const y0 = H * 0.3, bh = H * 0.34, sk = 70;
    c.beginPath(); c.moveTo(-10, y0 + sk * 0.5); c.lineTo(W + 10, y0 - sk * 0.5); c.lineTo(W + 10, y0 + bh - sk * 0.5); c.lineTo(-10, y0 + bh + sk * 0.5); c.closePath();
    const g = c.createLinearGradient(0, y0, W, y0 + bh); g.addColorStop(0, Art.rgba(e.c2, 0.95)); g.addColorStop(0.5, 'rgba(20,14,40,.95)'); g.addColorStop(1, Art.rgba(e.c2, 0.85));
    c.fillStyle = g; c.fill(); c.strokeStyle = '#ffe9a8'; c.lineWidth = 3; c.stroke();
    c.save(); c.clip();
    c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 2;
    for (let i = 0; i < 16; i++) { const yy = y0 + ((i * 53) % bh), xx = ((i * 211 + this.t * 1800 * dir) % (W + 400) + W + 400) % (W + 400) - 200; c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx + 160, yy - 16); c.stroke(); }
    const cxp = dir > 0 ? lerp(-240, W * 0.26, ez) + k * 30 : lerp(W + 240, W * 0.74, ez) - k * 30;
    const ext = Art.cutImg(q.u.look);
    if (ext) {   // 外部半身图：铺满色带高度，人物朝向画面内侧
      const hh = bh + sk * 0.3, ww = hh * ext.width / ext.height;   // 色带是斜的：按图片所在位置的色带中线对齐，整张图基本都露出来
      c.translate(cxp, y0 + bh * 0.5 + sk * (0.5 - cxp / W)); c.scale(dir, 1); c.drawImage(ext, -ww / 2, -hh / 2, ww, hh);
    } else if (G3.ok) {
      if (!q.img) q.img = G3.snap(q.u.look, 640, 'cut');
      const sz = bh * 1.7; c.translate(cxp, y0 + bh * 0.5); c.scale(q.u.look.k ? dir : -dir, 1); c.drawImage(q.img, -sz / 2, -sz * 0.47, sz, sz);
    } else {
      c.translate(cxp, y0 + bh + 118); c.scale(6, 6);
      Art.drawUnit(c, Object.assign({}, q.u.look, { sz: 1, aura: null }), { t: 1 + k * 0.4, face: dir, pose: 'idle', noShadow: true, seed: 1 });
    }
    c.restore();
    const tx = dir > 0 ? lerp(W + 300, W * 0.66, ez) - k * 24 : lerp(-300, W * 0.34, ez) + k * 24;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    const fs = Math.min(84, W * 0.09);
    c.font = '900 ' + fs + 'px ' + FONT_K; c.lineJoin = 'round';
    c.shadowColor = e.c2; c.shadowBlur = 30; c.lineWidth = 9; c.strokeStyle = 'rgba(14,8,30,.95)'; c.strokeText(q.sk.name, tx, y0 + bh * 0.5);
    const tg = c.createLinearGradient(0, y0 + bh * 0.5 - fs / 2, 0, y0 + bh * 0.5 + fs / 2); tg.addColorStop(0, '#fffbe0'); tg.addColorStop(0.5, '#ffd866'); tg.addColorStop(1, '#ff9a3a');
    c.fillStyle = tg; c.fillText(q.sk.name, tx, y0 + bh * 0.5);
    c.shadowBlur = 0; c.font = '700 ' + fs * 0.26 + 'px ' + FONT_S; c.fillStyle = q.u.side === 1 ? '#ffb0a0' : '#fff'; c.fillText('— ' + (q.u.id === 'hero' ? S.name : q.u.name) + (q.u.side === 1 ? ' · 大招 —' : ' · 绝招 —'), tx, y0 + bh * 0.5 + fs * 0.78);
    c.restore();
  }
};
