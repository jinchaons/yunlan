'use strict';
/* ============ 纯逻辑：成长、战斗结算、AI ============ */

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;

const MAX_LV = 30;
function expNeed(lv) { return 24 + lv * lv * 7; }

/* 五项根基属性：天生的底子（CHARS[id].attr）加上升级时自己分配的点数（m.at）。
   以 5 点为基准，高出的部分才产生加成，所以没加点的一级角色与原来的数值基本一致。 */
function attrOf(m, k) { return CHARS[m.id].attr[k] + ((m.at && m.at[k]) || 0); }
function fixMember(m) {   // 旧存档里的角色补上属性点：每升一级 3 点
  if (!m.at) m.at = { str: 0, con: 0, agi: 0, wis: 0, luk: 0 };
  const spent = m.at.str + m.at.con + m.at.agi + m.at.wis + m.at.luk;
  if (m.pt == null || m.pt + spent !== (m.lv - 1) * ATTR_PER_LV) m.pt = Math.max(0, (m.lv - 1) * ATTR_PER_LV - spent);
  return m;
}
/* ============ 数值基线 ============
   队伍和对手的气血、攻击、防御都从同一条曲线推出来：基准侠客一级是 BASE，每升一级三项各乘 LV_GROW。
   所以“差一级”在任何等级都是同样的差距（三项各差 7.5%，折合综合战力约 8%～9%），显示出来的等级就是真实的强弱。
   四位主角是这条基准的固定倍率（CHAR_MUL）；内力和速度不跟着翻倍，仍按 CHARS 里的 base / grow 线性成长。 */
const LV_GROW = 1.075;
const BASE = { hp: 120, atk: 20, def: 10 };
const lvK = lv => Math.pow(LV_GROW, Math.max(1, lv) - 1);
const CHAR_MUL = { hero: { hp: 1.08, atk: 1.10, def: 1.10 }, su: { hp: 0.88, atk: 1.05, def: 0.90 }, bai: { hp: 0.80, atk: 0.85, def: 0.80 }, shi: { hp: 1.33, atk: 1.15, def: 1.50 } };
/* 根基属性：每一点都是“当前等级基准的百分之几”，所以一点属性在一级和三十级同样值钱（各项大约都折合 0.3% 的综合战力）。
   天生的底子以 5 点为准，高出（或不足）的部分与自己加的点数同样计算。 */
const ATTR_FX = { str: { atk: 0.006 }, con: { mhp: 0.005, def: 0.003 }, agi: { spd: 0.0025, dodge: 0.0012 }, wis: { mmp: 0.008, skl: 0.005 }, luk: { crit: 0.0025, cdmg: 0.006, hit: 0.003 } };
/* 装备：ITEMS[id].g 里写的是“品级 ilv + 各项占基准的比例”（见 data.js 的 GEAR）。
   攻击、防御、气血按该品级（ilv 为 0 的随佩戴者等级）的基准折成数值，其余各项（内力、暴击、闪避……）照原数。spdp 是自身速度的百分比。 */
function gearStats(it, lv) {
  const g = it && it.g, o = {};
  if (!g) return (it && it.st) || o;
  const k = lvK(g.ilv || lv || 1);
  for (const s in g) {
    if (s === 'ilv') continue;
    o[s] = s === 'atk' ? Math.max(1, Math.round(g[s] * BASE.atk * k)) : s === 'def' ? Math.max(1, Math.round(g[s] * BASE.def * k)) : s === 'mhp' ? Math.max(1, Math.round(g[s] * BASE.hp * k)) : g[s];
  }
  return o;
}
// 某个等级的“标准装备”：商店里品级不超过这个等级的最好一件兵刃和护甲（模拟对战用）
function stdGear(id, lv) {
  const wt = CHARS[id].wt, best = f => { let b = null; for (const k in ITEMS) { const it = ITEMS[k]; if (f(it) && it.g && it.g.ilv && it.shop && it.g.ilv <= lv && (!b || it.g.ilv > ITEMS[b].g.ilv)) b = k; } return b; };
  return { w: best(it => it.type === 'weapon' && it.wt === wt), a: best(it => it.type === 'armor'), c: null };
}
function calcStats(m) {
  const c = CHARS[m.id], b = c.base, g = c.grow, n = m.lv - 1, k = lvK(m.lv), cm = CHAR_MUL[m.id] || CHAR_MUL.hero, F = ATTR_FX;
  const A = a => attrOf(m, a) - 5;
  const st = {
    mhp: BASE.hp * k * cm.hp * (1 + A('con') * F.con.mhp), mmp: (b.mp + g.mp * n) * (1 + A('wis') * F.wis.mmp),
    atk: BASE.atk * k * cm.atk * (1 + A('str') * F.str.atk), def: BASE.def * k * cm.def * (1 + A('con') * F.con.def), spd: (b.spd + g.spd * n) * (1 + A('agi') * F.agi.spd),
    crit: 0.06 + A('luk') * F.luk.crit, cdmg: 1.5 + A('luk') * F.luk.cdmg, dodge: 0.02 + A('agi') * F.agi.dodge, skl: 1 + A('wis') * F.wis.skl, hit: A('luk') * F.luk.hit
  };
  let sp = 0;
  for (const s in m.eq) {
    const it = m.eq[s] && ITEMS[m.eq[s]];
    if (!it) continue;
    const gs = gearStats(it, m.lv);
    for (const q in gs) { if (q === 'spdp') sp += gs[q]; else if (q === 'res') st.res = (st.res || []).concat(gs.res); else st[q] = (st[q] || 0) + (STAT_PCT[q] ? gs[q] / 100 : gs[q]); }
  }
  st.spd *= 1 + sp;
  for (const q of ['mhp', 'mmp', 'atk', 'def', 'spd']) st[q] = Math.max(1, Math.round(st[q]));
  st.crit = clamp(st.crit, 0, 0.5); st.dodge = clamp(st.dodge, 0, 0.3); st.hit = Math.max(0, st.hit);
  return st;
}
function newMember(id, lv, eq) {
  const m = { id, lv: lv || 1, exp: 0, eq: Object.assign({ w: null, a: null, c: null }, eq || {}), hp: 0, mp: 0, rage: 0, ex: [], at: { str: 0, con: 0, agi: 0, wis: 0, luk: 0 }, pt: ((lv || 1) - 1) * ATTR_PER_LV };
  const st = calcStats(m); m.hp = st.mhp; m.mp = st.mmp;
  return m;
}
// 按该角色的推荐加点比例，把剩余的点数一次分完
function autoAllot(m) {
  fixMember(m);
  const bd = CHARS[m.id].build, keys = Object.keys(bd), tot = keys.reduce((a, k) => a + bd[k], 0);
  while (m.pt > 0) {
    const sum = keys.reduce((a, k) => a + m.at[k], 0) + 1;
    let best = keys[0], bv = -1e9;
    for (const k of keys) { const v = bd[k] / tot * sum - m.at[k]; if (bd[k] > 0 && v > bv) { bv = v; best = k; } }
    m.at[best]++; m.pt--;
  }
  const st = calcStats(m); m.hp = Math.min(m.hp, st.mhp); m.mp = Math.min(m.mp, st.mmp);
}
function memberSkills(m) {
  const r = [];
  for (const [lv, id] of CHARS[m.id].learn) if (m.lv >= lv) r.push(id);
  for (const id of (m.ex || [])) if (!r.includes(id)) r.push(id);
  return r;
}
/* 招式精进（data.js 的 REFINE）：m.rf[第几次] = 选了哪一个。到了等级还没选的，人物页里会提示。 */
function refinePending(m) {
  const list = REFINE[m.id] || [];
  for (let i = 0; i < list.length; i++) if (m.lv >= REFINE_LV[i] && !(m.rf && m.rf[i] != null)) return i;
  return -1;
}
function refineChoose(m, opt) { const i = refinePending(m); if (i < 0) return false; (m.rf = m.rf || {})[i] = opt ? 1 : 0; return true; }
function refineAuto(m) { while (refinePending(m) >= 0) refineChoose(m, 0); return m; }   // 模拟对战用：一律选第一个
function memberMods(m) {
  const out = {}, list = REFINE[m.id] || [];
  for (const i in (m.rf || {})) { const r = list[i]; if (r && r.opts[m.rf[i]]) out[r.sk] = r.opts[m.rf[i]].mod; }
  return out;
}
function modSkill(sk, md) {
  const o = Object.assign({}, sk);
  for (const k in md) {
    if (k === 'powK') o.pow = (sk.pow || 1) * md.powK;
    else if (k === 'st' || k === 'buff') o[k] = Object.assign({}, sk[k] || {}, md[k]);
    else o[k] = md[k];
  }
  return o;
}
function gainExp(m, exp) {
  const ups = [];
  m.exp += exp;
  while (m.lv < MAX_LV && m.exp >= expNeed(m.lv)) {
    m.exp -= expNeed(m.lv);
    const before = memberSkills(m);
    m.lv++; fixMember(m); m.pt += ATTR_PER_LV;
    const st = calcStats(m); m.hp = st.mhp; m.mp = st.mmp;
    ups.push({ lv: m.lv, skills: memberSkills(m).filter(s => !before.includes(s)) });
  }
  return ups;
}

/* ---------- 战斗单位 ---------- */
function unitFromMember(m) {
  const c = CHARS[m.id], st = calcStats(m);
  return {
    side: 0, id: m.id, name: c.name, look: c.look, lv: m.lv,
    mhp: st.mhp, hp: clamp(m.hp, 1, st.mhp), mmp: st.mmp, mp: clamp(m.mp, 0, st.mmp),
    atk: st.atk, def: st.def, spd: st.spd, crit: st.crit, cdmg: st.cdmg, dodge: st.dodge, skl: st.skl, hit: st.hit, rage: m.rage || 0,
    skills: memberSkills(m), ult: c.ult, status: {}, guard: false, wait: 0, ref: m, boss: false, res: st.res || null, mods: memberMods(m)
  };
}
/* 难度：当前档位（0 江湖 / 1 宗师，见 data.js 的 DIFFS）。宗师难度下所有对手高两级、更懂得集火，战利品更丰厚。 */
let DIFF = 0;
/* 敌人也有怒气和大招（ENEMIES[id].ult，见 data.js 末尾的 ENEMY_ULTS）：出手、挨打都涨怒气，满了就放大招。
   小怪活不了几个回合，所以开场就带着两三成到一半的怒气、涨得也快，一场仗里总有一两个放得出大招（没有预警，直接放）；
   首领的怒气涨得很快：寻常打一两手就蓄势一次、下一手放大招（BAL.chargeK 倍的威力）。首领战的凶险主要就在这一招上——
   不理会它，按时来的队伍胜率只有五成半；看准了防御、嘲讽或打断，能到八成（?test=18 的 A、P 两列）。 */
// 涨怒气的倍率（小怪 / 首领）、开场的怒气、首领大招的威力折算，各按难度 [江湖, 宗师] 给。宗师的难处全在“对手高两级”，这里两档相同
const RAGE = { mob: [1.7, 1.7], boss: [2.2, 2.2], mob0: [22, 22], boss0: [20, 20], ultK: [1, 1] };
const rageOf = k => { const a = RAGE[k]; return a[Math.min(DIFF, a.length - 1)]; };
function addRage(u, n) { u.rage = Math.min(100, u.rage + n * (u.side === 1 ? rageOf(u.boss ? 'boss' : 'mob') : 1)); }
/* ============ 对手 ============
   对手不再各有一套手填的数值，只有三样：等级、档次、体型。
     等级：随机遭遇跟着地图走（比“该在几级来”低一级，队伍练高了它也跟着长，见 encounterPlan）；首领的等级写在 data.js 的 ENEMY_LV 里；
           首领身边的帮手比首领低三级。宗师难度下所有对手再高两级（DIFFS[1].lv）。
     档次：BAL 里的 mob（普通）/ elite（精英）/ boss（首领）——气血、攻击、防御各是该等级基准的几倍。全游戏要校准的就是这几个数。
           首领的气血按队伍人数给（帮手占掉一部分），攻击也随人数略增；BOSS_C 是各位首领招式不同带来的微调，范围很窄。
     体型：ENEMIES 里原先手填的 hp / atk / def / spd 如今只取“比例”——血厚攻低还是血薄攻高、甲硬不硬、手快不快（enemyShape）。
   重新校准：?test=23&calib=1。 */
const BAL = {
  // 各档对手的气血、攻击是该等级基准的几倍，按队伍人数 [1 人, 2 人, 3 人, 4 人] 查表：人越多，群攻、补血、集火越划算，对手也得越硬。
  // 首领的气血是“每人份”，还要再乘队伍人数。数值是 ?test=18&calib=1 反推出来的：普通遭遇打三轮上下、打完剩七成多气血；首领战九轮上下。
  mob: { hp: [1.0, 1.15, 1.4, 2.45], atk: [0.53, 0.88, 1.6, 1.74], def: 0.9 },
  elite: { hp: [1.3, 1.45, 1.8, 3.1], atk: [0.8, 1.3, 2.3, 2.6], def: 1.0 },
  lead: 1.25, leadless: 0.85,   // 带队的精英还站着时同伙攻击的倍率；带队的倒下之后的倍率
  boss: { hp: [1.4, 1.4, 2.5, 3.2], atk: [1.84, 1.96, 2.19, 2.3], def: 1.1 },
  attr: 0,          // 对手每高一级额外再长多少（校准下来不需要：标准装备、招式与属性点带来的成长，各等级大致相抵）
  addShare: 0,      // 每个帮手顶掉首领多少“人份”的气血（校准下来帮手不必折算）
  x: { mh: 1, ma: 1, eh: 1, ea: 1, bh: 1, ba: 1 },   // 校准时临时用的旋钮（普通 / 精英 / 首领 的 气血 / 攻击），平时都是 1
  xp: { mob: 0.28, elite: 0.5, boss: 0.6 },   // 一场普通 / 精英遭遇、一位首领给的修为，占“升这一级所需”的几成（只走主线、路上的对手都打，正好按时到下一张图）
  follow: 1,        // 队伍练高了，随机遭遇的对手保持比队伍低几级
  bossLag: 2,       // 队伍练高了，首领至少跟到“比队伍低几级”：多做支线仍然占便宜，但不至于把首领碾过去
  /* 蓄势与架势（首领和精英才有）。
       蓄势：怒气满了不直接放大招，先蓄一手（场上看得见招名和目标），下一手才放——威力按 ult 里“群体 / 单体 / 乱击”的预算给（单体的一招能要命），
             但来得及防御、嘲讽，或者把架势打空来打断。chargeK 是这份预算的总倍率。
       架势：一条厚度为“队伍每人 poise 份基准气血”的条，挨打就掉；克制的招式掉 1.5 倍、被抵抗的减半，目标破甲时再乘 1.5，带眩晕 / 冰封的招式不再掷骰子、改为多掉一倍。
             打空了就是“破绽”：打断蓄势、停一手、期间受到的伤害 +25%；之后架势回满，并且比上一次厚 poiseUp 倍。 */
  chargeK: 1, ult: { all: 3.0, one: 4.5, splash: 1.6, rand: 6.5 }, poise: 0.95, poiseUp: 1.25, brkDmg: 1.25, brkRage: 30,
  decay: 0.12       // 对手被队伍“带高”的每一级，修为与银两少一成二（最少剩四成）
};
// 各首领的微调 { id: [气血, 攻击] }，没列的都是 1。招式各不相同（有的群攻带灼烧，有的又慢又硬，有的大招是单体），同样的档次打起来难易不一，
// 这里把按时来的队伍“不理会蓄势、自动出招”的胜率拉到五成半上下（开头独自面对的黑风、剧情切磋的石破军、几桩委托留到七成）。
// ?test=18&calib=1（气血与攻击）/ &calib=atk（只调攻击）会重新算一遍。眼下各人相差还比较大，等每位首领有了自己的机制再收窄
const BOSS_C = {
  heifeng: [1.29, 0.87], zhumu: [1.24, 0.74], tiebi: [1.5, 1.02], qianmian: [1, 0.71], zhangmu: [1, 1.5], chenzhou: [1.3, 1.6], shi_duel: [1, 1.7],
  chiyan: [1, 1.07], yanlong: [1, 0.71], jianying: [1, 0.81], chaoying: [1, 0.89], lingshuang: [1, 1.0], langwang: [1, 0.81], tgguard: [1, 0.92],
  xuanzhu: [1, 1.3], ye: [1, 1.7], xx_su: [1, 1.26], xx_bai: [1, 0.92], xx_hero: [1, 1.02], moxiang: [1, 0.83],
  thugboss: [1.1, 1.2], ratboss: [1, 0.5], shuigui: [1.15, 1.1], yashang: [1, 0.73]   // 城里与四郊的委托：过山虎、钻仓鼠、鬼老七，以及点到为止的崖上客
};
const spdRef = lv => 10 + 0.7 * lv;
function enemyShape(e) {
  if (e._sh) return e._sh;
  const ha = e.hp / e.atk, da = e.def / e.atk, lv0 = e.lv0 || e.lv;
  // 普通对手：血攻比的中位数约 3.75，偏离多少就往“肉”或“脆”那边挪多少（气血 × 攻击的乘积不变）；首领的气血另按人数给，这里只留甲和速度
  const h = e.boss ? 1 : clamp(ha / 3.75, 0.65, 1.5);
  return e._sh = { h: Math.sqrt(h), a: 1 / Math.sqrt(h), d: clamp(da / 0.31, 0.5, 1.8), s: e.spd / spdRef(lv0) };
}
function unitFromEnemy(id, o) {
  o = o && typeof o === 'object' ? o : {};
  const e = ENEMIES[id], D = DIFFS[Math.min(DIFF, DIFFS.length - 1)] || DIFFS[0], sh = enemyShape(e);
  const lv0 = Math.max(1, o.lv || e.lv), lv = lv0 + (D.lv || 0), k = lvK(lv), pn = Math.max(1, o.pn || 1);
  const big = e.boss || o.champ;   // champ：不是首领、却独自对上整支队伍的（路上遇到的游方剑客），气血和攻击按首领的档次给
  const R = BAL[big ? 'boss' : o.elite ? 'elite' : 'mob'], c = (e.boss && BOSS_C[id]) || [1, 1];
  const byPn = v => Array.isArray(v) ? v[Math.min(v.length, pn) - 1] : v, ak = 1 + BAL.attr * (lv - 1), X = BAL.x;
  const af = (o.elite && AFFIX[o.affix]) || null;   // 精英的词缀（data.js 的 AFFIX）
  let hp = BASE.hp * k * byPn(R.hp) * sh.h * c[0] * ak * (big ? X.bh : o.elite ? X.eh : X.mh) * (af && af.hp || 1), atk = BASE.atk * k * byPn(R.atk) * sh.a * c[1] * ak * (big ? X.ba : o.elite ? X.ea : X.ma) * (af && af.atk || 1);
  if (big) hp *= Math.max(1, pn - BAL.addShare * (o.adds || 0));   // 首领：每人份 × 人数
  hp = Math.max(1, Math.round(hp));
  // 修为：按“升到对手这一级所需”的比例给；普通对手按队伍人数摊，所以人数相当的一场遭遇合起来正好是 BAL.xp.mob
  const rw = (o.rw == null ? 1 : o.rw) * (D.rw || 1), need = expNeed(Math.min(MAX_LV - 1, e.boss ? lv0 : lv0 + 1));
  // 带队的精英补足差额：人数相当的一场精英遭遇合起来正好是 BAL.xp.elite
  const exp = e.exp === 0 ? 0 : need * (e.boss ? BAL.xp.boss : o.champ ? BAL.xp.elite : o.elite ? BAL.xp.elite - BAL.xp.mob * (pn - 1) / pn : BAL.xp.mob / pn) * rw;
  const gold = e.gold === 0 ? 0 : (1.6 * Math.pow(lv0, 1.9) + 8) * (e.boss ? 10 : o.elite || o.champ ? 2 : 1) * rw;
  // 架势的厚度不跟首领自己的气血走，而是按“队伍每人一份”给（精英是四成）：这样两三个人时打出破绽的节奏和四个人时一样，
  // 不会因为早期首领气血少、架势跟着薄，蓄势总被打断
  const poise = big || o.elite ? Math.round(BASE.hp * k * BAL.poise * pn * (big ? 1 : 0.4)) : 0;
  // 精英：个头大一圈、身上有一层金色的气焰，名字前面带着词缀
  const look = o.elite ? Object.assign({}, e.look, { sz: (e.look.sz || 1) * 1.15, aura: '#ffd27a' }) : e.look;
  return {
    side: 1, id, name: af ? af.n + '·' + e.name : e.name, look, lv, ult: e.ult || null,
    mhp: hp, hp, mmp: 0, mp: 0, atk: Math.max(1, Math.round(atk)), def: Math.max(1, Math.round(BASE.def * k * R.def * sh.d * (af && af.def || 1))), spd: Math.max(1, Math.round(sh.s * spdRef(lv0) * (af && af.spd || 1))),
    rage: e.ult ? (e.boss ? rageOf('boss0') : rageOf('mob0') + Math.floor(Math.random() * 30)) : 0,
    crit: 0.06 + (e.boss ? 0.04 : 0), cdmg: 1.5, dodge: (e.dodge || 0) + (af && af.dodge || 0), venom: af && af.venom || 0, leech: af && af.leech || 0, skl: 1, weak: e.weak || null, res: e.res || null,
    skills: [], ai: e.ai, status: {}, guard: false, wait: 0, boss: !!e.boss, elite: !!o.elite, exp: Math.round(exp), gold: Math.round(gold),
    poise, mpoise: poise, charge: null
  };
}
/* 一场仗里各个对手的等级。
     o.lv：这一场“定在几级”（随机遭遇、问剑台）——普通对手就是这一级；有首领的话首领高一级、帮手低两级。
     没给：首领用自己的等级（ENEMY_LV），帮手比首领低三级，单独出现的小怪用自己的等级。
     o.follow：对手至少跟到队伍的等级（城里与四郊的委托：什么时候来做都是一场像样的架）。 */
function foeLevels(ids, o, party) {
  const avg = Math.floor(party.reduce((s, m) => s + m.lv, 0) / Math.max(1, party.length)), bid = ids.find(id => ENEMIES[id].boss), bl = bid ? Math.max(ENEMIES[bid].lv, avg - BAL.bossLag) : 0;
  return ids.map((id, i) => {
    const e = ENEMIES[id];
    let lv = o.lv ? (e.boss ? o.lv + 1 : bid ? o.lv - 2 : o.lv) : e.boss ? Math.max(e.lv, avg - BAL.bossLag) : bid ? bl - 3 : e.lv;
    if (o.follow) lv = Math.max(lv, avg - (e.boss ? 0 : bid ? 3 : 1));
    if (o.elite) lv += 2;   // 精英带队的这一拨整体高两级（等级带里的 L+1），带队的那个另按精英的档次给气血和攻击
    return Math.max(1, Math.min(MAX_LV, lv));
  });
}
function foeUnits(ids, o, party) {
  o = o && typeof o === 'object' ? o : {};
  const lvs = foeLevels(ids, o, party), adds = ids.filter(id => !ENEMIES[id].boss).length;
  const us = ids.map((id, i) => unitFromEnemy(id, { lv: lvs[i], pn: party.length, adds: o.champ ? ids.length - 1 : adds, rw: o.rw, elite: o.elite && o.elite[i], affix: o.affix, champ: o.champ && i === 0 }));
  const lead = us.find(u => u.elite);
  if (lead) for (const u of us) if (u !== lead) u.leader = lead;
  for (const u of us) if (u.boss && BOSS_MECH[u.id]) mechInit(u, party);
  return us;
}
/* ---------- 首领的机制（data.js 的 BOSS_MECH） ----------
   mechInit  开打时挂到首领身上；mechTurn 轮到它出手时先问一遍：有没有要办的事（返回一个行动，或 null 表示照常出招）；
   mechDo    办那件事。其余的（护卫减伤、重甲、反击、大招附带异常……）散在 calcDamage / resolveAction / eff 里。
   行动的种类：{ type: 'tele', kind, name } 蓄一手（下一手才办，记在 u.pend 里，中途打出破绽就作罢）；
               { type: 'mech', kind, name } 这一手就办；{ type: 'none' } 什么也不做（已经认输）。 */
const MIRROR = { hp: 3.2, atk: 2.2 };   // 心像：气血是队伍气血总和的几倍、攻击是队伍平均攻击的几倍
function mechInit(u, party) {
  const M = u.mech = BOSS_MECH[u.id], c = BOSS_C[u.id] || [1, 1];
  u.mt = 0; u.pend = null; u.phase = 0;
  if (M.mirror && party.length) {   // 照着队伍眼下的数值来：练得再高，它也跟着高
    const ps = party.map(calcStats);
    u.mhp = u.hp = Math.max(1, Math.round(ps.reduce((s, p) => s + p.mhp, 0) * MIRROR.hp * c[0] * BAL.x.bh));
    u.atk = Math.max(1, Math.round(ps.reduce((s, p) => s + p.atk, 0) / ps.length * MIRROR.atk * c[1] * BAL.x.ba));
    // 情谊深的那一位，她的心像下手时会迟疑（少年云澈的心像看两人里情谊更深的那一位）
    const tier = typeof heartTier === 'function' && typeof S !== 'undefined' && S && S.bond ? (M.who === 'hero' ? Math.max(heartTier('su'), heartTier('bai')) : heartTier(M.who)) : 0;
    u.hesitate = tier >= 4 ? 0.25 : tier >= 3 ? 0.15 : 0;
  }
  if (M.seals) u.sealed = M.seals[2][1];   // 没人选的时候（模拟对战）默认封住群攻的那一式
}
function mechTurn(u, units, rnd, ev) {
  const M = u.mech, adds = units.filter(x => x.side === u.side && x !== u), foes = units.filter(x => x.side !== u.side && x.hp > 0);
  u.mt = (u.mt || 0) + 1;
  if (u.status.counter) delete u.status.counter;
  if (M.yield && u.hp <= u.mhp * M.yield) { u.hp = 0; u.status = {}; u.charge = null; u.pend = null; ev.push({ type: 'yield', t: u }); ev.push({ type: 'ko', t: u }); return { type: 'none' }; }
  if (M.phases && u.phase < M.phases.length && u.hp <= u.mhp * M.phases[u.phase]) {
    u.phase++; cleanse(u); u.poise = u.mpoise; u.atk = Math.round(u.atk * 1.1);
    ev.push({ type: 'phase', t: u, n: u.phase });
  }
  if (M.regen) { const n = adds.filter(x => x.hp > 0).length, real = Math.min(u.mhp - u.hp, Math.round(u.mhp * M.regen * n)); if (real > 0) { u.hp += real; ev.push({ type: 'heal', t: u, val: real }); } }
  if (u.pend) { const p = u.pend; u.pend = null; return { type: 'mech', kind: p.kind, name: p.name }; }
  if (u.charge || u.rage >= 100) return null;
  if (u.hesitate && rnd() < u.hesitate) return { type: 'mech', kind: 'hesitate' };
  const due = m => m && u.mt % m.every === 0;
  if (due(M.rally) && adds.some(x => x.hp <= 0)) return { type: 'tele', kind: 'rally', name: M.rally.n };
  if (due(M.mend) && u.hp < u.mhp * 0.9) return { type: 'tele', kind: 'mend', name: M.mend.n };
  if (due(M.drain) && foes.some(f => f.rage >= 50)) return { type: 'tele', kind: 'drain', name: M.drain.n };
  if (due(M.stance)) return { type: 'mech', kind: 'stance', name: M.stance.n };
  return null;
}
function mechDo(u, act, units, rnd) {
  const M = u.mech, ev = [];
  if (act.kind === 'rally') {
    for (const x of units) if (x.side === u.side && x !== u && x.hp <= 0) { x.hp = Math.max(1, Math.round(x.mhp * M.rally.hp)); x.status = {}; x.wait = 1000 / eff(x, 'spd'); ev.push({ type: 'revive', t: x, val: x.hp }); }
  } else if (act.kind === 'mend') {
    const real = Math.min(u.mhp - u.hp, Math.round(u.mhp * M.mend.heal)); u.hp += real; ev.push({ type: 'heal', t: u, val: real });
  } else if (act.kind === 'drain') {
    let sum = 0;
    for (const h of units) if (h.side !== u.side && h.hp > 0 && h.rage > 0) { sum += h.rage; h.rage = 0; ev.push({ type: 'drain', t: h }); }
    const real = Math.min(u.mhp - u.hp, Math.round(u.mhp * 0.01 * sum / 50)); if (real > 0) { u.hp += real; ev.push({ type: 'heal', t: u, val: real }); }
  } else if (act.kind === 'stance') {
    u.status.counter = { t: 1, v: M.stance.pow }; ev.push({ type: 'status', t: u, id: 'counter' });
  }
  addRage(u, 10);
  return ev;
}
/* 打赢一拨精英的额外战利品：一份合用的伤药（偶尔再带一份回气的），以及——每张图头两回——一件当前这一档的兵刃或护甲。
   lv 这场遭遇的等级，party 队伍（只掉队里有人用得上的兵刃），gear 这张图还掉不掉装备。返回物品 id 的数组。 */
function eliteLoot(lv, party, gear, rnd) {
  rnd = rnd || Math.random;
  const out = [lv < 8 ? 'potion1' : lv < 16 ? 'potion2' : 'potion3'];
  if (rnd() < 0.4) out.push(lv < 12 ? 'mp1' : 'mp2');
  if (gear) {
    const wts = party.map(m => CHARS[m.id].wt), pool = [];
    let top = 0;
    for (const k in ITEMS) { const it = ITEMS[k]; if (it.g && it.g.ilv && it.shop && it.g.ilv <= lv + 2 && (it.type === 'armor' || (it.type === 'weapon' && wts.indexOf(it.wt) >= 0))) { if (it.g.ilv > top) { top = it.g.ilv; pool.length = 0; } if (it.g.ilv === top) pool.push(k); } }
    if (pool.length) out.push(pool[Math.floor(rnd() * pool.length)]);
  }
  return out;
}
/* 关卡地图上随机遭遇的阵容与等级。
   人数：不少于眼下队伍的人数（至多五个）；原定的那一拨不够，就从这张图会出现的对手里补。 */
const ENC = { plus: [0, 0] };   // plus：各难度在“不少于队伍人数”之外再多几个
/* 新的算法：人数照旧；等级 = 这张图“该在几级来”减一（mapLv - 1），队伍练高了就保持比队伍低 BAL.follow 级。
   返回 { ids, lv, rw }：rw 是对手被“带高”之后修为与银两的折扣。 */
function encounterPlan(group, pool, party, mapLv, rnd) {
  rnd = rnd || Math.random;
  const pn = party.length, n = Math.min(5, Math.max(group.length, pn + (pn >= 2 ? ENC.plus[Math.min(DIFF, ENC.plus.length - 1)] || 0 : 0)));
  const ids = group.slice(), extra = (pool || []).filter(id => ENEMIES[id] && !ENEMIES[id].boss);
  while (ids.length < n) ids.push(extra.length && rnd() < 0.45 ? extra[Math.floor(rnd() * extra.length)] : group[Math.floor(rnd() * group.length)]);
  const avg = Math.floor(party.reduce((s, m) => s + m.lv, 0) / Math.max(1, pn));
  const home = mapLv ? mapLv - 1 : Math.max(1, avg - BAL.follow), lv = Math.max(1, Math.min(MAX_LV - 1, Math.max(home, avg - BAL.follow)));
  return { ids, lv, rw: Math.max(0.4, 1 - BAL.decay * (lv - home)) };
}
function eff(u, k) {
  let v = u[k]; const s = u.status;
  if (k === 'atk' && s.atkUp) v *= 1 + s.atkUp.v;
  if (k === 'atk' && u.leader) v *= u.leader.hp > 0 ? BAL.lead : BAL.leadless;   // 带队的精英还站着：同伙的攻击高出一截；带队的倒了，同伙群龙无首、攻击反而打折
  if (k === 'def') { if (s.defUp) v *= 1 + s.defUp.v; if (s.defDown) v *= 1 - s.defDown.v; else if (u.mech && u.mech.armor) v *= u.mech.armor; }   // 重甲：破甲时整层失效
  if (k === 'spd' && s.spdUp) v *= 1 + s.spdUp.v;
  return v;
}
function initWaits(units, rnd) {
  for (const u of units) u.wait = 1000 / eff(u, 'spd') * (0.45 + rnd() * 0.5);
}
function nextActor(units) {
  let best = null;
  for (const u of units) if (u.hp > 0 && (!best || u.wait < best.wait)) best = u;
  if (!best) return null;
  const w = best.wait;
  for (const u of units) if (u.hp > 0) u.wait -= w;
  best.wait = 1000 / eff(best, 'spd');
  return best;
}
function predictOrder(units, n) {
  const sim = units.filter(u => u.hp > 0).map(u => ({ u, w: u.wait }));
  const out = [];
  while (out.length < n && sim.length) {
    let b = sim[0];
    for (const s of sim) if (s.w < b.w) b = s;
    const w = b.w;
    for (const s of sim) s.w -= w;
    b.w = 1000 / eff(b.u, 'spd');
    out.push(b.u);
  }
  return out;
}

/* 一次攻击的结算：闪避 → 基础伤害 → 武学威力（悟性）→ 五行克制 / 抵抗 → 暴击 → 防御姿态。
   绝招必中；被眩晕、冰封或正在防御的目标不会闪避。 */
function calcDamage(a, t, sk, rnd) {
  if (!sk.ult && !t.guard && !t.status.stun && !t.status.freeze && rnd() < (t.dodge || 0)) return { dmg: 0, crit: false, miss: true };
  // 防御常数跟着攻击者的等级长：同级的“标准防御”在任何等级都挡掉三分之一，不会前期形同虚设、后期打不动
  const K = 2 * BASE.def * lvK(a.lv || 1);
  let d = eff(a, 'atk') * (sk.pow || 1) * K / (K + eff(t, 'def'));
  d *= 0.92 + rnd() * 0.16;
  if (sk.id !== 'attack') d *= a.skl || 1;
  if (sk.ult && a.side === 1 && a.boss) d *= rageOf('ultK');
  // 蓄过势的大招：威力不看各人原先的倍率，按“单体 / 群体 / 乱击”给统一的预算（BAL.ult），免得有的首领大招形同虚设、有的一招团灭
  if (sk.ult && a.side === 1 && a.mpoise) d *= BAL.chargeK * (BAL.ult[sk.tgt] || BAL.ult.one) / ((sk.pow || 1) * (sk.hits || 1)) * (a.mech && a.mech.ultK || 1);
  if (t.status.brk) d *= BAL.brkDmg;                           // 打在破绽上
  let el = 0;
  if (t.weak && t.weak.indexOf(sk.elem) >= 0) { d *= 1.25; el = 1; } else if (t.res && t.res.indexOf(sk.elem) >= 0) { d *= 0.75; el = -1; }
  const crit = rnd() < (a.crit == null ? 0.08 : a.crit) + (sk.crit || 0);
  if (crit) d *= a.cdmg || 1.5;
  if (t.guard) d *= 0.5;
  return { dmg: Math.max(1, Math.round(d)), crit, el };
}
function addStatus(user, t, st, ev, rnd) {
  let ch = st.ch == null ? 1 : st.ch;
  const meta = STATUS[st.id];
  if (meta.skip && t.mpoise) return;          // 有架势条的对手不吃眩晕 / 冰封：这类招式改为多削一倍架势（见 resolveAction）
  if (meta.bad && user.hit) ch += user.hit;   // 福缘：异常命中
  if (t.boss && meta.skip) ch *= 0.3;
  if (rnd() >= ch) return;
  const o = { t: st.t + (t === user ? 1 : 0), v: st.v || 0 };
  if (st.id === 'poison') o.v = Math.max(3, Math.round(Math.min(t.mhp * 0.06, eff(user, 'atk') * 0.9)));
  if (st.id === 'burn') o.v = Math.max(3, Math.round(eff(user, 'atk') * 0.45));
  t.status[st.id] = o;
  ev.push({ type: 'status', t, id: st.id });
}
function cleanse(t) {
  let n = 0;
  for (const k in t.status) if (STATUS[k].bad) { delete t.status[k]; n++; }
  return n;
}

/* 结算一次行动，返回事件序列（数值已即时生效，表现层按事件播放） */
function resolveAction(user, sk, target, units, rnd) {
  rnd = rnd || Math.random;
  const ev = [];
  if (user.mods && user.mods[sk.id]) sk = modSkill(sk, user.mods[sk.id]);   // 招式精进
  if (sk.ult) user.rage = 0; else user.mp = Math.min(user.mmp, Math.max(0, user.mp - (sk.cost || 0)) + (sk.mpBack || 0));
  const foes = () => units.filter(u => u.side !== user.side && u.hp > 0);
  const allies = () => units.filter(u => u.side === user.side && u.hp > 0);

  if (sk.kind === 'atk') {
    const hits = sk.hits || 1;
    for (let h = 0; h < hits; h++) {
      let list;
      const f = foes();
      if (!f.length) break;
      if (sk.tgt === 'all') list = f;
      else if (sk.tgt === 'rand') list = [f[Math.floor(rnd() * f.length)]];
      else {
        if (!target || target.hp <= 0 || target.side === user.side) target = f[0];
        list = [target];
      }
      for (const t of list) {
        const r = calcDamage(user, t, sk, rnd);
        if (r.miss) { ev.push({ type: 'miss', t, hit: h }); continue; }
        // 首领的机制：帮手还站着时它受的伤害打折；正在蓄“回血”的，被它怕的那一系招式打中就作罢
        if (t.mech && t.mech.guarded && units.some(x => x.side === t.side && x !== t && x.hp > 0)) r.dmg = Math.max(1, Math.round(r.dmg * (1 - t.mech.guarded)));
        if (t.pend && t.pend.kind === 'mend' && r.el > 0) { t.pend = null; ev.push({ type: 'cancel', t, hit: h }); }
        t.hp = Math.max(0, t.hp - r.dmg);
        ev.push({ type: 'dmg', t, val: r.dmg, crit: r.crit, el: r.el, hit: h });
        addRage(t, 6);
        // 精英的词缀：嗜血（吸回造成伤害的几成）、淬毒（出手有几率致毒）
        if (user.leech && user.hp > 0 && user.hp < user.mhp) { const real = Math.min(user.mhp - user.hp, Math.round(r.dmg * user.leech)); if (real > 0) { user.hp += real; ev.push({ type: 'heal', t: user, val: real, hit: h }); } }
        if (user.venom && !sk.st && t.hp > 0 && rnd() < user.venom) { const e0 = ev.length; addStatus(user, t, { id: 'poison', ch: 1, t: 3 }, ev, rnd); for (let i = e0; i < ev.length; i++) ev[i].hit = h; }
        if (t.mpoise && t.hp > 0 && !t.status.brk) {   // 削架势；打空了就是破绽
          t.poise -= r.dmg * (r.el > 0 ? 1.5 : r.el < 0 ? 0.5 : 1) * (t.status.defDown ? 1.5 : 1) * (sk.st && STATUS[sk.st.id].skip ? 2 : 1) * (sk.poiseK || 1);
          if (t.poise <= 0) {
            const cut = !!(t.charge || t.pend);
            t.status.brk = { t: 1, v: 0 }; t.mpoise = Math.round(t.mpoise * BAL.poiseUp); t.poise = t.mpoise; delete t.status.counter;
            if (t.charge) { t.charge = null; t.rage = BAL.brkRage; }
            t.pend = null;
            ev.push({ type: 'break', t, cut, hit: h });
          }
        }
        if (sk.ult && user.mech && user.mech.ultSt && t.hp > 0 && !t.guard) { const e0 = ev.length; addStatus(user, t, user.mech.ultSt, ev, rnd); for (let i = e0; i < ev.length; i++) ev[i].hit = h; }   // 大招附带的异常：防御着的人不中
        if (t.hp <= 0) { t.status = {}; t.guard = false; t.charge = null; t.pend = null; ev.push({ type: 'ko', t, hit: h }); }
        else if (sk.st && (h === hits - 1 || sk.tgt === 'rand')) { const e0 = ev.length; addStatus(user, t, sk.st, ev, rnd); for (let i = e0; i < ev.length; i++) ev[i].hit = h; }
      }
    }
    // 反击的架势：单体招式打在摆着架势的首领身上，自己挨一下（群体招式不受影响）
    if (user.side === 0 && user.hp > 0 && sk.tgt === 'one' && target && target.hp > 0 && target.status.counter) {
      const r = calcDamage(target, user, { id: 'counter', pow: target.status.counter.v, elem: 'phys' }, rnd);
      ev.push({ type: 'counter', t: target, hit: hits - 1 });
      if (!r.miss) { user.hp = Math.max(0, user.hp - r.dmg); ev.push({ type: 'dmg', t: user, val: r.dmg, crit: r.crit, el: 0, hit: hits - 1 }); if (user.hp <= 0) { user.status = {}; user.guard = false; ev.push({ type: 'ko', t: user, hit: hits - 1 }); } }
    }
    // 蓄过势的单体大招带余波：正主之外的人也挨一下（BAL.ult.splash）。不然“一招放倒一个、救起来再放倒”，对整支队伍构不成威胁
    if (sk.ult && user.side === 1 && user.mpoise && sk.tgt === 'one' && target) {
      const sp = Object.assign({}, sk, { tgt: 'splash', crit: 0, st: null });
      for (const t of foes()) {
        if (t === target) continue;
        const r = calcDamage(user, t, sp, rnd);
        t.hp = Math.max(0, t.hp - r.dmg); ev.push({ type: 'dmg', t, val: r.dmg, crit: r.crit, el: r.el, hit: hits - 1 }); addRage(t, 6);
        if (t.hp <= 0) { t.status = {}; t.guard = false; ev.push({ type: 'ko', t, hit: hits - 1 }); }
      }
    }
    if (!sk.ult) addRage(user, sk.id === 'attack' ? 18 : 12);
  } else if (sk.kind === 'heal') {
    let list;
    if (sk.tgt === 'party') list = units.filter(u => u.side === user.side);
    else if (sk.tgt === 'allies') list = allies();
    else list = [target && target.hp > 0 && target.side === user.side ? target : user];
    for (const t of list) {
      if (t.hp <= 0) {
        if (!sk.revive) continue;
        t.hp = Math.round(t.mhp * sk.revive); t.wait = 1000 / eff(t, 'spd');
        ev.push({ type: 'revive', t, val: t.hp });
      }
      const amt = Math.round((eff(user, 'atk') * sk.pow * 1.3 + t.mhp * 0.08) * (user.skl || 1));
      const real = Math.min(t.mhp - t.hp, amt);
      t.hp += real;
      ev.push({ type: 'heal', t, val: real });
      if (sk.cleanse && cleanse(t)) ev.push({ type: 'cleanse', t });
    }
    if (!sk.ult) addRage(user, 12);
  } else if (sk.kind === 'buff') {
    const list = sk.tgt === 'allies' ? allies() : sk.tgt === 'ally' ? [target && target.hp > 0 && target.side === user.side ? target : user] : [user];
    for (const t of list) {
      if (sk.cleanse && cleanse(t)) ev.push({ type: 'cleanse', t });
      if (sk.buff) addStatus(user, t, sk.buff, ev, rnd);
      if (sk.buff2) addStatus(user, t, sk.buff2, ev, rnd);
      if (sk.heal) {
        const real = Math.min(t.mhp - t.hp, Math.round(t.mhp * sk.heal));
        t.hp += real; ev.push({ type: 'heal', t, val: real });
      }
    }
    addRage(user, 10);
  } else if (sk.kind === 'revive') {
    const t = target;
    if (t && t.hp <= 0) {
      t.hp = Math.round(t.mhp * sk.pow); t.wait = 1000 / eff(t, 'spd');
      ev.push({ type: 'revive', t, val: t.hp });
    }
    addRage(user, 10);
  }
  return ev;
}

function useItemOn(it, t) {
  const ev = [], e = it.eff;
  if (e.revive) {
    if (t.hp <= 0) { t.hp = Math.round(t.mhp * e.revive); if (t.wait != null) t.wait = 1000 / eff(t, 'spd'); ev.push({ type: 'revive', t, val: t.hp }); }
    return ev;
  }
  if (t.hp <= 0) return ev;
  if (e.hp) { const real = Math.min(t.mhp - t.hp, e.hp); t.hp += real; ev.push({ type: 'heal', t, val: real }); }
  if (e.mp) { const real = Math.min(t.mmp - t.mp, e.mp); t.mp += real; ev.push({ type: 'mp', t, val: real }); }
  if (e.cure) { cleanse(t); ev.push({ type: 'cleanse', t }); }
  return ev;
}

function startTurn(u) {
  const ev = []; let skip = false;
  u.guard = false;
  // 首领气血低于四成时狂怒一次：攻击与速度永久提升，并挣脱控制
  if (u.boss && u.side === 1 && !u.enraged && u.hp > 0 && u.hp < u.mhp * 0.4) {
    u.enraged = true; u.atk = Math.round(u.atk * 1.22); u.spd = Math.round(u.spd * 1.12);
    delete u.status.stun; delete u.status.freeze; delete u.status.defDown;
    ev.push({ type: 'enrage', t: u });
  }
  for (const id of ['poison', 'burn']) {
    const s = u.status[id];
    if (!s || u.hp <= 0) continue;
    const d = Math.min(u.hp, s.v);
    u.hp -= d;
    ev.push({ type: 'dmg', t: u, val: d, dot: id });
    if (--s.t <= 0) delete u.status[id];
    if (u.hp <= 0) { u.status = {}; ev.push({ type: 'ko', t: u }); }
  }
  if (u.hp > 0) for (const id of ['stun', 'freeze', 'brk']) {
    const s = u.status[id];
    if (!s) continue;
    skip = true;
    if (--s.t <= 0) delete u.status[id];
  }
  return { ev, skip };
}
function endTurn(u) {
  for (const id of ['atkUp', 'defUp', 'spdUp', 'defDown', 'taunt']) {
    const s = u.status[id];
    if (s && --s.t <= 0) delete u.status[id];
  }
}

/* ---------- AI ---------- */
function pickFoe(u, foes, rnd) {
  const tn = foes.filter(f => f.status.taunt);
  if (tn.length) return tn[0];
  // 难度越高，敌人越懂得集火：优先打气血最少的，其次盯住会疗伤的
  const smart = [0.3, 0.6][DIFF] || 0.3;
  if (rnd() < smart) {
    const low = foes.slice().sort((a, b) => a.hp - b.hp)[0];
    const healer = foes.find(f => f.skills && f.skills.indexOf('b1') >= 0);
    return healer && rnd() < 0.4 ? healer : low;
  }
  return foes[Math.floor(rnd() * foes.length)];
}
function enemyUlt(u, units, rnd) {
  if (u.side !== 1 || !u.ult || u.rage < 100 || !SKILLS[u.ult]) return null;
  const sk = SKILLS[u.ult], foes = units.filter(x => x.side !== u.side && x.hp > 0);
  if (!foes.length) return null;
  // 有架势条的（首领、精英）：先蓄势一手，目标这时就定下来、亮给对面看；下一手才放（中途被打出破绽就作罢）
  if (u.mpoise && !u.charge) return { type: 'charge', id: sk.id, target: sk.tgt === 'one' ? pickFoe(u, foes, rnd || Math.random) : null, wait: ((u.mech && u.mech.longCharge) || 1) - 1 };
  if (u.charge && u.charge.wait > 0) { u.charge.wait--; return { type: 'hold' }; }   // 要蓄不止一手的大招：接着蓄
  let target = sk.tgt === 'one' ? (u.charge && u.charge.target && u.charge.target.hp > 0 ? u.charge.target : pickFoe(u, foes, rnd || Math.random)) : null;
  if (target) { const tn = foes.find(f => f.status.taunt); if (tn) target = tn; }
  return { type: 'skill', id: sk.id, target, ult: true };
}
function aiChoose(u, units, rnd) {
  rnd = rnd || Math.random;
  const foes = units.filter(x => x.side !== u.side && x.hp > 0);
  const allies = units.filter(x => x.side === u.side && x.hp > 0);
  const list = u.ai || [['attack', 1]];
  { const ua = enemyUlt(u, units, rnd); if (ua) return ua; }
  let total = 0; for (const a of list) total += a[1];
  let sk = SKILLS.attack;
  for (let tries = 0; tries < 6; tries++) {
    let r = rnd() * total, id = list[0][0];
    for (const a of list) { r -= a[1]; if (r <= 0) { id = a[0]; break; } }
    sk = SKILLS[id];
    if (u.sealed === id) { sk = SKILLS.attack; continue; }   // 被璇玑玉封住的那一式
    if (sk.kind === 'buff' && sk.buff && u.status[sk.buff.id]) { sk = SKILLS.attack; continue; }
    if (sk.tgt === 'all' && foes.length === 1 && rnd() < 0.4) { sk = SKILLS.attack; continue; }
    break;
  }
  let target = null;
  if (sk.kind === 'atk' && sk.tgt === 'one') target = pickFoe(u, foes, rnd);
  else if (sk.tgt === 'ally') target = allies.slice().sort((a, b) => a.hp / a.mhp - b.hp / b.mhp)[0];
  return { type: 'skill', id: sk.id, target };
}

/* 我方自动战斗 */
function autoChoose(u, units, rnd, aware) {
  rnd = rnd || Math.random;
  const foes = units.filter(x => x.side !== u.side && x.hp > 0);
  const team = units.filter(x => x.side === u.side);
  const allies = team.filter(x => x.hp > 0);
  const dead = team.filter(x => x.hp <= 0);
  const can = id => SKILLS[id] && u.skills.includes(id) && u.mp >= SKILLS[id].cost;
  const hardFight = foes.some(f => f.boss);
  const low = allies.slice().sort((a, b) => a.hp / a.mhp - b.hp / b.mhp);
  const hurt60 = allies.filter(a => a.hp < a.mhp * 0.6).length;
  const focus = foes.slice().sort((a, b) => a.hp - b.hp)[0];
  const big = foes.slice().sort((a, b) => b.hp - a.hp)[0];
  const ult = SKILLS[u.ult];

  if (u.rage >= 100 && ult) {
    if (ult.kind === 'heal') { if (dead.length || hurt60 >= 2 || low[0].hp < low[0].mhp * 0.35) return { type: 'skill', id: ult.id, target: null }; }
    else return { type: 'skill', id: ult.id, target: big };
  }
  // 治疗者逻辑
  const heals = u.skills.map(id => SKILLS[id]).filter(s => s.kind === 'heal' || s.kind === 'revive');
  if (heals.length) {
    if (dead.length && can('b5')) return { type: 'skill', id: 'b5', target: dead[0] };
    if (hurt60 >= 2 && can('b4') && low[0].hp < low[0].mhp * 0.5) return { type: 'skill', id: 'b4', target: null };
    if (low[0].hp < low[0].mhp * 0.5 && can('b1')) return { type: 'skill', id: 'b1', target: low[0] };
    const cc = allies.find(a => a.status.stun || a.status.freeze);
    if (cc && cc !== u && can('b3')) return { type: 'skill', id: 'b3', target: cc };
  }
  // 增益
  if (hardFight) {
    for (const id of u.skills) {
      const s = SKILLS[id];
      if (s.kind !== 'buff' || s.cleanse || u.mp < s.cost) continue;
      const tg = s.tgt === 'self' ? [u] : allies;
      if (tg.every(a => !a.status[s.buff.id]) && rnd() < 0.7) return { type: 'skill', id, target: u };
    }
  }
  // 攻击
  const thrifty = !hardFight && u.mp < u.mmp * 0.3;
  let best = SKILLS.attack, bestV = 1;
  if (!thrifty) for (const id of u.skills) {
    const s = SKILLS[id];
    if (s.kind !== 'atk' || u.mp < s.cost) continue;
    let v = s.pow * (s.hits || 1);
    if (s.tgt === 'all') v *= foes.length;
    v *= 1 + (s.crit || 0) * 0.5;
    if (s.st) v *= 1.1;
    if (aware && hardFight && big.mpoise) v *= s.tgt === 'all' ? 1 : Math.sqrt(elemK(big, s));   // 会应对：打首领时偏向克制它的招式
    v /= 1 + s.cost * 0.004;
    if (v > bestV) { bestV = v; best = s; }
  }
  const lead = aware && foes.find(f => f.elite);   // 会应对：有精英带队就先打带队的（它在场，同伙的攻击都高出一截）
  return { type: 'skill', id: best.id, target: hardFight ? (foes.find(f => !f.boss && f.hp < f.mhp * 0.5) || big) : lead || focus };
}

/* “会应对”的出招（模拟对战用，代表认真看场面的玩家）：
     对手在蓄势——架势快空了就集火把它打断；石破军用铁壁功把单体大招引到自己身上；大招会落到自己头上的人防御；
     平时——打有架势条的对手优先用克制的招式（autoChoose 的 aware 参数）。该补血、该救人的时候仍然先补血救人。 */
function awareChoose(u, units, rnd) {
  rnd = rnd || Math.random;
  const base = autoChoose(u, units, rnd, true), bs = base.type === 'skill' && SKILLS[base.id];
  if (bs && (bs.kind === 'heal' || bs.kind === 'revive')) return base;
  const foes = units.filter(x => x.side !== u.side && x.hp > 0), B = foes.find(x => x.mech), adds = B ? foes.filter(x => x !== B) : [];
  const usable = f => ['attack'].concat(u.skills).map(id => SKILLS[id]).filter(s => s.kind === 'atk' && u.mp >= (s.cost || 0) && f(s));
  const bestOf = list => list.sort((a, b) => (b.pow || 1) * (b.hits || 1) - (a.pow || 1) * (a.hits || 1))[0];
  if (B && bs && bs.kind === 'atk') {   // 对着首领的机制下药
    const M = B.mech;
    // 它在蓄“回血”：用它怕的那一系招式打一下就作罢
    if (B.pend && B.pend.kind === 'mend' && B.weak) { const s = bestOf(usable(s => B.weak.indexOf(s.elem) >= 0)); if (s) return { type: 'skill', id: s.id, target: B }; }
    // 它摆着反击的架势：别用单体招式打它——有群体招式用群体的，有帮手就打帮手，都没有就防御
    if (B.status.counter && bs.tgt === 'one' && (base.target === B || !base.target)) {
      const s = bestOf(usable(s => s.tgt === 'all'));
      if (s) return { type: 'skill', id: s.id, target: null };
      if (adds.length) return { type: 'skill', id: bs.id, target: adds.slice().sort((a, b) => a.hp - b.hp)[0] };
      return { type: 'guard' };
    }
    // 帮手在场它受的伤害打折：先清帮手
    if (M.guarded && adds.length && bs.tgt === 'one' && !B.charge) return { type: 'skill', id: bs.id, target: adds.slice().sort((a, b) => a.hp - b.hp)[0] };
    // 重甲：先给它上破甲
    if (M.armor && !B.status.defDown && !B.charge) { const s = bestOf(usable(s => s.st && s.st.id === 'defDown' || (u.mods && u.mods[s.id] && u.mods[s.id].st && u.mods[s.id].st.id === 'defDown'))); if (s) return { type: 'skill', id: s.id, target: s.tgt === 'one' ? B : null }; }
  }
  const c = units.find(x => x.side !== u.side && x.hp > 0 && (x.charge || (x.pend && x.pend.kind !== 'mend')));
  if (!c) return base;
  if (!c.charge) {   // 它在蓄别的（叫帮手、吸怒气）：架势差一口气就打断；怒气满了就赶紧把绝招放掉
    if (c.pend.kind === 'drain' && u.rage >= 100 && SKILLS[u.ult]) return { type: 'skill', id: u.ult, target: SKILLS[u.ult].kind === 'atk' ? c : null };
    if (c.poise <= c.mpoise * 0.3 && bs && bs.kind === 'atk') return { type: 'skill', id: bs.id, target: bs.tgt === 'one' ? c : null };
    return base;
  }
  const sk = SKILLS[c.charge.id], can = id => SKILLS[id] && u.skills.includes(id) && u.mp >= SKILLS[id].cost;
  if (c.poise <= c.mpoise * 0.3) {   // 差一口气：全力打断
    let best = SKILLS.attack, bv = 0;
    for (const id of ['attack'].concat(u.skills)) { const s = SKILLS[id]; if (s.kind !== 'atk' || u.mp < (s.cost || 0)) continue; const v = (s.pow || 1) * (s.hits || 1) * elemK(c, s) * (s.st && STATUS[s.st.id].skip ? 2 : 1); if (v > bv) { bv = v; best = s; } }
    if (u.rage >= 100 && SKILLS[u.ult] && SKILLS[u.ult].kind === 'atk') best = SKILLS[u.ult];
    return { type: 'skill', id: best.id, target: c };
  }
  if (sk.tgt === 'one' && can('t2') && !u.status.taunt) return { type: 'skill', id: 't2', target: u };
  const taunter = units.find(x => x.side === u.side && x.hp > 0 && x.status.taunt);
  const hitsMe = sk.tgt !== 'one' ? true : taunter ? taunter === u : c.charge.target === u;
  // 只在“它出手之前我再没有机会行动”的那一手才防御（u.wait 这时已是我下一次行动的等待，c.wait 是它还要等多久），手快的人先照常出招
  return hitsMe && !c.charge.wait && u.wait >= c.wait ? { type: 'guard' } : base;   // 要蓄好几手的大招：最后一手才防，前面照常出招（争取打断）
}
const elemK = (t, s) => (t.weak && t.weak.indexOf(s.elem) >= 0 ? 2 : t.res && t.res.indexOf(s.elem) >= 0 ? 0.5 : 1);
/* 无动画快速模拟（用于平衡测试） */
function simBattle(members, enemyIds, seed, potions, fo) {
  const rnd = mulberry32(seed || 1);
  const units = members.map(unitFromMember).concat(foeUnits(enemyIds, fo, members));
  let ults = 0, brks = 0, cuts = 0;
  potions = Object.assign({ n: 0, hp: 80 }, potions || {});
  initWaits(units, rnd);
  let turns = 0;
  const alive = s => units.some(u => u.side === s && u.hp > 0);
  while (alive(0) && alive(1) && turns < 600) {
    const u = nextActor(units); turns++;
    const st = startTurn(u);
    if (u.hp <= 0) continue;
    if (st.skip) { endTurn(u); continue; }
    let act;
    if (u.side === 0) {
      const low = units.filter(x => x.side === 0 && x.hp > 0).sort((a, b) => a.hp / a.mhp - b.hp / b.mhp)[0];
      const healer = units.some(x => x.side === 0 && x.hp > 0 && x.skills.includes('b1') && x.mp >= 8);
      if (potions.n > 0 && low.hp < low.mhp * 0.35 && !healer) { potions.n--; low.hp = Math.min(low.mhp, low.hp + potions.hp); endTurn(u); continue; }
      act = fo && fo.aware ? awareChoose(u, units, rnd) : autoChoose(u, units, rnd);
    } else {
      act = u.mech ? mechTurn(u, units, rnd, []) : null;   // 首领自己的机制先问一遍
      if (u.hp <= 0) { endTurn(u); continue; }             // 点到为止：认输了
      if (!act) { act = aiChoose(u, units, rnd); if (act.ult) ults++; }
    }
    if (act.type === 'guard') { u.guard = true; u.mp = Math.min(u.mmp, u.mp + Math.ceil(u.mmp * 0.08)); u.rage = Math.min(100, u.rage + 8); }
    else if (act.type === 'charge') u.charge = { id: act.id, target: act.target, wait: act.wait || 0 };
    else if (act.type === 'hold' || act.type === 'none') { /* 接着蓄势 / 什么也不做 */ }
    else if (act.type === 'tele') u.pend = { kind: act.kind, name: act.name };
    else if (act.type === 'mech') mechDo(u, act, units, rnd);
    else { const ev = resolveAction(u, SKILLS[act.id], act.target, units, rnd); if (act.ult) u.charge = null; for (const e of ev) if (e.type === 'break') { brks++; if (e.cut) cuts++; } }
    endTurn(u);
  }
  const team = units.filter(u => u.side === 0);
  return { win: alive(0) && !alive(1), turns, hp: team.reduce((a, u) => a + u.hp, 0) / team.reduce((a, u) => a + u.mhp, 0), dead: team.filter(u => u.hp <= 0).length, ults, brks, cuts };
}
