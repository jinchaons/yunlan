'use strict';
/* ============ 云岚侠影录 · 数据 ============ */

const ELEM = {
  sword:  { n: '剑', c: '#d6ecff', c2: '#5fa8ff' },
  wind:   { n: '风', c: '#c8ffe6', c2: '#2fc79a' },
  fire:   { n: '火', c: '#ffe08a', c2: '#ff5a2a' },
  ice:    { n: '冰', c: '#e0f6ff', c2: '#4fb0ff' },
  poison: { n: '毒', c: '#e2b0ff', c2: '#8a3fd6' },
  heal:   { n: '愈', c: '#e0ffb8', c2: '#4fd070' },
  dark:   { n: '幽', c: '#e6b0ff', c2: '#6a22b0' },
  earth:  { n: '岩', c: '#ffe6b0', c2: '#d08a30' },
  phys:   { n: '击', c: '#ffffff', c2: '#b8c0d0' }
};

const STATUS = {
  poison:  { n: '中毒', c: '#b06bff', bad: 1 },
  burn:    { n: '灼烧', c: '#ff7a3a', bad: 1 },
  stun:    { n: '眩晕', c: '#ffe066', bad: 1, skip: 1 },
  freeze:  { n: '冰封', c: '#8fd8ff', bad: 1, skip: 1 },
  defDown: { n: '破甲', c: '#ff9a9a', bad: 1 },
  brk:     { n: '破绽', c: '#ffd24a', bad: 1, skip: 1 },   // 架势被打空：这一手动不了，期间受到的伤害加两成半（只会出现在有架势条的首领和精英身上）
  atkUp:   { n: '攻↑', c: '#ffb347' },
  defUp:   { n: '防↑', c: '#7ec8ff' },
  spdUp:   { n: '速↑', c: '#9dffb0' },
  taunt:   { n: '嘲讽', c: '#ff6b6b' }
};

/* tgt: one | all | rand | self | ally | allies | dead | party
   kind: atk | heal | buff | revive
   fx: slash | heavy | wave | burst | needle | heal | buff */
const SKILLS = {
  attack: { name: '攻击', desc: '以兵刃普通一击，积攒较多怒气。', cost: 0, tgt: 'one', kind: 'atk', pow: 1, elem: 'phys', fx: 'slash' },

  // —— 云澈 · 听雨剑法 ——
  h1: { name: '斜风细雨', desc: '听雨剑起手式，剑走偏锋。', cost: 6, tgt: 'one', kind: 'atk', pow: 1.5, elem: 'sword', fx: 'slash' },
  h2: { name: '雨打芭蕉', desc: '连刺三剑，密如急雨。', cost: 11, tgt: 'one', kind: 'atk', pow: 0.66, hits: 3, elem: 'sword', fx: 'slash' },
  h3: { name: '云岚心法', desc: '运转心法，回复气血并提升攻击三回合。', cost: 10, tgt: 'self', kind: 'buff', buff: { id: 'atkUp', v: 0.3, t: 3 }, heal: 0.18, elem: 'wind', fx: 'buff' },
  h4: { name: '惊涛拍岸', desc: '剑气如潮，横扫全体敌人。', cost: 18, tgt: 'all', kind: 'atk', pow: 1.25, elem: 'wind', fx: 'wave' },
  h5: { name: '天河倒悬', desc: '一剑自九天而落，极易暴击。', cost: 26, tgt: 'one', kind: 'atk', pow: 2.8, crit: 0.2, elem: 'sword', fx: 'heavy' },
  h6: { name: '璇玑剑意', desc: '四玉共鸣所悟，剑意笼罩全场并破甲。', cost: 34, tgt: 'all', kind: 'atk', pow: 1.9, elem: 'sword', fx: 'wave', st: { id: 'defDown', ch: 0.7, t: 3, v: 0.25 } },
  hU: { name: '万川归海', desc: '【绝招】千万道剑气汇于一处，重创全体敌人。', cost: 0, ult: 1, tgt: 'all', kind: 'atk', pow: 2.5, elem: 'sword', fx: 'wave' },

  // —— 苏青禾 · 青禾剑 ——
  s1: { name: '拂柳式', desc: '轻灵一剑，如风拂柳。', cost: 5, tgt: 'one', kind: 'atk', pow: 1.4, elem: 'wind', fx: 'slash' },
  s2: { name: '流风回雪', desc: '身随剑转，攻击全体并有几率破甲。', cost: 13, tgt: 'all', kind: 'atk', pow: 0.95, elem: 'wind', fx: 'wave', st: { id: 'defDown', ch: 0.6, t: 3, v: 0.25 } },
  s3: { name: '踏月步', desc: '身法大进，速度提升三回合。', cost: 8, tgt: 'self', kind: 'buff', buff: { id: 'spdUp', v: 0.4, t: 3 }, elem: 'wind', fx: 'buff' },
  s4: { name: '飞燕穿帘', desc: '直取要害，暴击率极高。', cost: 16, tgt: 'one', kind: 'atk', pow: 2.1, crit: 0.35, elem: 'sword', fx: 'heavy' },
  s5: { name: '落英缤纷', desc: '剑花纷飞，全体连斩两次。', cost: 24, tgt: 'all', kind: 'atk', pow: 0.85, hits: 2, elem: 'wind', fx: 'wave' },
  sU: { name: '青鸾千羽', desc: '【绝招】化身青鸾，随机连斩六次。', cost: 0, ult: 1, tgt: 'rand', kind: 'atk', pow: 0.9, hits: 6, crit: 0.15, elem: 'wind', fx: 'slash' },

  // —— 白芷 · 青囊术 ——
  b1: { name: '银针渡穴', desc: '以针渡气，回复一名同伴气血。', cost: 8, tgt: 'ally', kind: 'heal', pow: 1.8, elem: 'heal', fx: 'heal' },
  b2: { name: '蚀骨针', desc: '淬毒飞针，极易令敌人中毒。', cost: 8, tgt: 'one', kind: 'atk', pow: 1.1, elem: 'poison', fx: 'needle', st: { id: 'poison', ch: 0.85, t: 3 } },
  b3: { name: '清心诀', desc: '祛除一名同伴的异常状态，并提升防御。', cost: 6, tgt: 'ally', kind: 'buff', cleanse: 1, buff: { id: 'defUp', v: 0.3, t: 3 }, elem: 'heal', fx: 'buff' },
  b4: { name: '青囊回春', desc: '回复全体同伴气血。', cost: 20, tgt: 'allies', kind: 'heal', pow: 1.2, elem: 'heal', fx: 'heal' },
  b5: { name: '起死回生', desc: '救起一名倒地的同伴。', cost: 30, tgt: 'dead', kind: 'revive', pow: 0.45, elem: 'heal', fx: 'heal' },
  b6: { name: '漫天花雨', desc: '毒针如雨，攻击全体并可能致毒。', cost: 22, tgt: 'all', kind: 'atk', pow: 1.05, elem: 'poison', fx: 'needle', st: { id: 'poison', ch: 0.6, t: 3 } },
  bU: { name: '万木春生', desc: '【绝招】救起所有倒地同伴，并大幅回复全体气血、祛除异常。', cost: 0, ult: 1, tgt: 'party', kind: 'heal', pow: 3, cleanse: 1, revive: 0.4, elem: 'heal', fx: 'heal' },

  // —— 石破军 · 赤焰刀 ——
  t1: { name: '裂石刀', desc: '势大力沉的一刀。', cost: 6, tgt: 'one', kind: 'atk', pow: 1.6, elem: 'earth', fx: 'heavy' },
  t2: { name: '铁壁功', desc: '大幅提升防御并嘲讽敌人三回合。', cost: 8, tgt: 'self', kind: 'buff', buff: { id: 'defUp', v: 0.5, t: 3 }, buff2: { id: 'taunt', v: 1, t: 3 }, elem: 'earth', fx: 'buff' },
  t3: { name: '燎原斩', desc: '烈焰刀气横扫全体，可能灼烧。', cost: 16, tgt: 'all', kind: 'atk', pow: 1.15, elem: 'fire', fx: 'wave', st: { id: 'burn', ch: 0.5, t: 3 } },
  t4: { name: '崩山击', desc: '刀背重击，可能震晕敌人。', cost: 18, tgt: 'one', kind: 'atk', pow: 2.3, elem: 'earth', fx: 'heavy', st: { id: 'stun', ch: 0.4, t: 1 } },
  t5: { name: '烈阳护体', desc: '以真气护住全体同伴，提升防御三回合。', cost: 18, tgt: 'allies', kind: 'buff', buff: { id: 'defUp', v: 0.3, t: 3 }, elem: 'fire', fx: 'buff' },
  tU: { name: '焚天一刀', desc: '【绝招】倾尽全力的一刀，必定灼烧。', cost: 0, ult: 1, tgt: 'one', kind: 'atk', pow: 4.2, elem: 'fire', fx: 'heavy', st: { id: 'burn', ch: 1, t: 3 } },

  // —— 敌方 ——
  e_bite:   { name: '撕咬', cost: 0, tgt: 'one', kind: 'atk', pow: 1.3, elem: 'phys', fx: 'slash' },
  e_chop:   { name: '劈砍', cost: 0, tgt: 'one', kind: 'atk', pow: 1.3, elem: 'phys', fx: 'slash' },
  e_venom:  { name: '毒牙', cost: 0, tgt: 'one', kind: 'atk', pow: 1.0, elem: 'poison', fx: 'slash', st: { id: 'poison', ch: 0.6, t: 3 } },
  e_web:    { name: '缠丝', cost: 0, tgt: 'one', kind: 'atk', pow: 0.6, elem: 'poison', fx: 'needle', st: { id: 'stun', ch: 0.45, t: 1 } },
  e_thorn:  { name: '竹刺', cost: 0, tgt: 'all', kind: 'atk', pow: 0.65, elem: 'wind', fx: 'needle' },
  e_shadow: { name: '影袭', cost: 0, tgt: 'one', kind: 'atk', pow: 1.6, crit: 0.2, elem: 'dark', fx: 'slash' },
  e_flame:  { name: '火舌', cost: 0, tgt: 'one', kind: 'atk', pow: 1.3, elem: 'fire', fx: 'burst', st: { id: 'burn', ch: 0.4, t: 3 } },
  e_erupt:  { name: '熔岩喷吐', cost: 0, tgt: 'all', kind: 'atk', pow: 0.9, elem: 'fire', fx: 'burst', st: { id: 'burn', ch: 0.3, t: 3 } },
  e_frost:  { name: '寒息', cost: 0, tgt: 'one', kind: 'atk', pow: 1.2, elem: 'ice', fx: 'burst', st: { id: 'freeze', ch: 0.28, t: 1 } },
  e_blizz:  { name: '风雪', cost: 0, tgt: 'all', kind: 'atk', pow: 0.9, elem: 'ice', fx: 'burst', st: { id: 'freeze', ch: 0.12, t: 1 } },
  e_roar:   { name: '嚎叫', cost: 0, tgt: 'allies', kind: 'buff', buff: { id: 'atkUp', v: 0.25, t: 3 }, elem: 'phys', fx: 'buff' },
  e_drain:  { name: '噬魂', cost: 0, tgt: 'one', kind: 'atk', pow: 1.5, elem: 'dark', fx: 'burst', st: { id: 'defDown', ch: 0.5, t: 3, v: 0.25 } },
  // 首领
  k_whirl:  { name: '黑风旋斩', cost: 0, tgt: 'all', kind: 'atk', pow: 1.05, elem: 'phys', fx: 'wave' },
  k_smash:  { name: '蛮力一击', cost: 0, tgt: 'one', kind: 'atk', pow: 1.8, elem: 'phys', fx: 'heavy' },
  z_silk:   { name: '千丝万缕', cost: 0, tgt: 'all', kind: 'atk', pow: 0.8, elem: 'poison', fx: 'needle', st: { id: 'stun', ch: 0.22, t: 1 } },
  z_spit:   { name: '腐毒喷吐', cost: 0, tgt: 'all', kind: 'atk', pow: 0.9, elem: 'poison', fx: 'burst', st: { id: 'poison', ch: 0.8, t: 3 } },
  z_fang:   { name: '蛛母噬咬', cost: 0, tgt: 'one', kind: 'atk', pow: 1.8, elem: 'poison', fx: 'heavy' },
  c_hell:   { name: '炼狱火海', cost: 0, tgt: 'all', kind: 'atk', pow: 1.15, elem: 'fire', fx: 'burst', st: { id: 'burn', ch: 0.55, t: 3 } },
  c_palm:   { name: '焚心掌', cost: 0, tgt: 'one', kind: 'atk', pow: 2.0, elem: 'fire', fx: 'heavy', st: { id: 'burn', ch: 0.8, t: 3 } },
  c_aura:   { name: '魔焰护身', cost: 0, tgt: 'self', kind: 'buff', buff: { id: 'atkUp', v: 0.3, t: 3 }, elem: 'fire', fx: 'buff' },
  l_dance:  { name: '霜天雪舞', cost: 0, tgt: 'all', kind: 'atk', pow: 1.15, elem: 'ice', fx: 'wave', st: { id: 'freeze', ch: 0.18, t: 1 } },
  l_pierce: { name: '冰魄穿心', cost: 0, tgt: 'one', kind: 'atk', pow: 2.2, elem: 'ice', fx: 'heavy', st: { id: 'freeze', ch: 0.3, t: 1 } },
  l_moon:   { name: '寒月凝华', cost: 0, tgt: 'self', kind: 'buff', buff: { id: 'defUp', v: 0.35, t: 3 }, heal: 0.06, elem: 'ice', fx: 'buff' },
  y_burn:   { name: '幽烬焚天', cost: 0, tgt: 'all', kind: 'atk', pow: 1.25, elem: 'dark', fx: 'burst', st: { id: 'burn', ch: 0.4, t: 3 } },
  y_sword:  { name: '无殇剑', cost: 0, tgt: 'one', kind: 'atk', pow: 2.3, crit: 0.1, elem: 'dark', fx: 'heavy' },
  y_soul:   { name: '摄魂', cost: 0, tgt: 'one', kind: 'atk', pow: 1.2, elem: 'dark', fx: 'burst', st: { id: 'stun', ch: 0.45, t: 1 } },
  y_gate:   { name: '归墟引', cost: 0, tgt: 'self', kind: 'buff', buff: { id: 'atkUp', v: 0.3, t: 3 }, heal: 0.04, elem: 'dark', fx: 'buff' },
  m_all:    { name: '万象归墟', cost: 0, tgt: 'all', kind: 'atk', pow: 1.45, elem: 'dark', fx: 'wave', st: { id: 'defDown', ch: 0.5, t: 3, v: 0.25 } },
  m_eat:    { name: '吞天噬地', cost: 0, tgt: 'one', kind: 'atk', pow: 2.5, elem: 'dark', fx: 'heavy' },
  m_still:  { name: '天地同寂', cost: 0, tgt: 'all', kind: 'atk', pow: 1.0, elem: 'dark', fx: 'burst', st: { id: 'stun', ch: 0.2, t: 1 } }
};
for (const k in SKILLS) SKILLS[k].id = k;

/* 人物外观: robe 衣 trim 襟 sash 腰带 hair 发色 hs 发型 wp 兵刃 */
const CHARS = {
  hero: {
    name: '云澈', title: '听雨阁弟子', wt: 'sword',
    look: { robe: '#3b82e0', trim: '#f4f8ff', sash: '#f6c453', hair: '#1f2233', hs: 'top', wp: 'sword', wc: '#bfe4ff' },
    base: { hp: 130, mp: 42, atk: 22, def: 11, spd: 12 }, attr: { str: 6, con: 6, agi: 6, wis: 6, luk: 7 }, build: { str: 4, con: 3, agi: 1, wis: 1, luk: 1 },
    grow: { hp: 24, mp: 6, atk: 4.2, def: 2.4, spd: 0.7 },
    learn: [[1, 'h1'], [3, 'h2'], [5, 'h3'], [8, 'h4'], [12, 'h5']], ult: 'hU'
  },
  su: {
    name: '苏青禾', title: '听雨阁师姐', wt: 'sword',
    look: { robe: '#35c08c', trim: '#ffffff', sash: '#ff8fab', hair: '#2a1c18', hs: 'pony', wp: 'sword', wc: '#c8ffe6', f: 1 },
    base: { hp: 106, mp: 40, atk: 21, def: 9, spd: 15 }, attr: { str: 5, con: 4, agi: 9, wis: 6, luk: 7 }, build: { str: 3, con: 2, agi: 2, wis: 0, luk: 3 },
    grow: { hp: 19, mp: 6, atk: 4.0, def: 2.0, spd: 0.95 },
    learn: [[1, 's1'], [4, 's2'], [6, 's3'], [9, 's4'], [13, 's5']], ult: 'sU'
  },
  bai: {
    name: '白芷', title: '万竹林医者', wt: 'needle',
    look: { robe: '#f1ecff', trim: '#a987ff', sash: '#7cd992', hair: '#3b2a4d', hs: 'long', wp: 'fan', wc: '#ffd0e6', f: 1 },
    base: { hp: 96, mp: 60, atk: 17, def: 8, spd: 13 }, attr: { str: 3, con: 4, agi: 6, wis: 10, luk: 6 }, build: { str: 1, con: 3, agi: 1, wis: 5, luk: 0 },
    grow: { hp: 17, mp: 9, atk: 3.3, def: 1.9, spd: 0.75 },
    learn: [[1, 'b1'], [1, 'b2'], [1, 'b3'], [8, 'b4'], [10, 'b5'], [12, 'b6']], ult: 'bU'
  },
  shi: {
    name: '石破军', title: '赤焰谷首徒', wt: 'saber',
    look: { robe: '#b8352b', trim: '#3a2620', sash: '#f6c453', hair: '#191919', hs: 'short', wp: 'saber', wc: '#ffd9a0', sz: 1.12, fierce: 1 },
    base: { hp: 160, mp: 30, atk: 23, def: 15, spd: 9 }, attr: { str: 9, con: 9, agi: 3, wis: 4, luk: 5 }, build: { str: 4, con: 4, agi: 1, wis: 0, luk: 1 },
    grow: { hp: 30, mp: 4.5, atk: 4.0, def: 3.2, spd: 0.55 },
    learn: [[1, 't1'], [1, 't2'], [1, 't3'], [10, 't4'], [13, 't5']], ult: 'tU'
  }
};

const NPCS = {
  gu:        { name: '顾苍梧', look: { robe: '#e9eff6', trim: '#5f8fb8', sash: '#5f8fb8', hair: '#dfe4ea', hs: 'bun', beard: 1, wp: 'none' } },
  disciple:  { name: '小石头', look: { robe: '#6fa8dc', trim: '#ffffff', sash: '#f6c453', hair: '#2a2a33', hs: 'top', wp: 'none', sz: 0.86 } },
  shen:      { name: '沈长风', look: { robe: '#4a5a78', trim: '#d8b25a', sash: '#8a2e2e', hair: '#22222a', hs: 'top', beard: 1, wp: 'saber', wc: '#e0e6f0', sz: 1.08 } },
  innkeeper: { name: '柳掌柜', look: { robe: '#c9773a', trim: '#fff1d6', sash: '#7a3b2e', hair: '#3a2a22', hs: 'bun', wp: 'none', f: 1 } },
  smith:     { name: '铁老三', look: { robe: '#6b4a3a', trim: '#2a1f1a', sash: '#c0502a', hair: '#2a2a2a', hs: 'bald', beard: 1, wp: 'none', sz: 1.1, skin: '#e8b890' } },
  herb:      { name: '杜大夫', look: { robe: '#7fae6a', trim: '#f4ffe6', sash: '#5a7a3a', hair: '#55555f', hs: 'bun', wp: 'none' } },
  teller:    { name: '说书先生', look: { robe: '#8a7fb8', trim: '#ffffff', sash: '#3a2f5a', hair: '#8a8a94', hs: 'top', beard: 1, wp: 'fan', wc: '#fff4d6' } },
  kid:       { name: '阿豆', look: { robe: '#ffb347', trim: '#ffffff', sash: '#d94f4f', hair: '#2a1f1a', hs: 'top', wp: 'none', sz: 0.72 } },
  granny:    { name: '孙婆婆', look: { robe: '#9a6f8a', trim: '#f0e0ea', sash: '#5a3a4a', hair: '#cfcfd6', hs: 'bun', wp: 'staff', sz: 0.9, f: 1 } },
  woodman:   { name: '樵夫', look: { robe: '#8a7a55', trim: '#e6dcc0', sash: '#5a4a2a', hair: '#2a2a2a', hs: 'short', hat: 'bamboo', wp: 'none' } },
  gatherer:  { name: '采药老人', look: { robe: '#6f9a7a', trim: '#e6f4e0', sash: '#3a5a44', hair: '#d0d0d6', hs: 'bun', beard: 1, hat: 'bamboo', wp: 'staff' } },
  lie:       { name: '烈千山', look: { robe: '#7a1f1a', trim: '#f6c453', sash: '#2a1512', hair: '#55504a', hs: 'top', beard: 1, wp: 'none', sz: 1.12, fierce: 1 } },
  moon:      { name: '寒月宫弟子', look: { robe: '#dfeeff', trim: '#7fa8e0', sash: '#7fa8e0', hair: '#2a3048', hs: 'long', wp: 'none', f: 1 } },
  baicao:    { name: '百草翁', look: { robe: '#dfe8d0', trim: '#7cae6a', sash: '#5a7a3a', hair: '#e6e6ea', hs: 'bun', beard: 1, wp: 'staff' } }
};

/* 道具: type use|weapon|armor|acc|key ; tier 决定商店上架时机 */
const ITEMS = {
  potion1:  { name: '金创药', type: 'use', price: 30, desc: '回复 80 点气血。', eff: { hp: 80 }, tier: 0, shop: 'herb' },
  potion2:  { name: '玉露丸', type: 'use', price: 110, desc: '回复 260 点气血。', eff: { hp: 260 }, tier: 2, shop: 'herb' },
  potion3:  { name: '九转还丹', type: 'use', price: 360, desc: '回复 750 点气血。', eff: { hp: 750 }, tier: 3, shop: 'herb' },
  mp1:      { name: '回气散', type: 'use', price: 40, desc: '回复 30 点内力。', eff: { mp: 30 }, tier: 0, shop: 'herb' },
  mp2:      { name: '凝神丹', type: 'use', price: 140, desc: '回复 90 点内力。', eff: { mp: 90 }, tier: 2, shop: 'herb' },
  antidote: { name: '清心散', type: 'use', price: 30, desc: '解除中毒、灼烧等异常状态。', eff: { cure: 1 }, tier: 0, shop: 'herb' },
  revive:   { name: '续命丹', type: 'use', price: 280, desc: '救起倒地的同伴，回复三成气血。', eff: { revive: 0.3 }, tier: 1, shop: 'herb' },

  sw1: { name: '铁剑', type: 'weapon', wt: 'sword', price: 100, st: { atk: 6 }, tier: 0, shop: 'smith' },
  sw2: { name: '青钢剑', type: 'weapon', wt: 'sword', price: 420, st: { atk: 14 }, tier: 1, shop: 'smith' },
  sw3: { name: '寒星剑', type: 'weapon', wt: 'sword', price: 800, st: { atk: 26 }, tier: 2, shop: 'smith' },
  sw4: { name: '流霞剑', type: 'weapon', wt: 'sword', price: 1600, st: { atk: 40 }, tier: 3, shop: 'smith' },
  sw5: { name: '承渊剑', type: 'weapon', wt: 'sword', price: 2800, st: { atk: 54 }, tier: 4, shop: 'smith' },
  swX: { name: '听雨·陨星', type: 'weapon', wt: 'sword', price: 0, st: { atk: 60, spd: 3 }, desc: '铁老三以陨铁所铸，剑身隐有雨声。' },
  sb1: { name: '厚背刀', type: 'weapon', wt: 'saber', price: 600, st: { atk: 18 }, tier: 2, shop: 'smith' },
  sb2: { name: '斩岳刀', type: 'weapon', wt: 'saber', price: 1700, st: { atk: 44 }, tier: 3, shop: 'smith' },
  sb3: { name: '焚天刀', type: 'weapon', wt: 'saber', price: 2900, st: { atk: 58 }, tier: 4, shop: 'smith' },
  nd1: { name: '银针', type: 'weapon', wt: 'needle', price: 400, st: { atk: 10, mmp: 10 }, tier: 2, shop: 'smith' },
  nd2: { name: '玉蜂针', type: 'weapon', wt: 'needle', price: 800, st: { atk: 22, mmp: 20 }, tier: 2, shop: 'smith' },
  nd3: { name: '天蚕针', type: 'weapon', wt: 'needle', price: 1600, st: { atk: 34, mmp: 30 }, tier: 3, shop: 'smith' },
  nd4: { name: '素问针', type: 'weapon', wt: 'needle', price: 2700, st: { atk: 46, mmp: 40 }, tier: 4, shop: 'smith' },

  ar1: { name: '布衣', type: 'armor', price: 60, st: { def: 4 }, tier: 0, shop: 'smith' },
  ar2: { name: '皮甲', type: 'armor', price: 300, st: { def: 9 }, tier: 1, shop: 'smith' },
  ar3: { name: '锁子甲', type: 'armor', price: 600, st: { def: 16, mhp: 20 }, tier: 2, shop: 'smith' },
  ar4: { name: '云纹甲', type: 'armor', price: 1300, st: { def: 25, mhp: 40 }, tier: 3, shop: 'smith' },
  ar5: { name: '天蚕宝衣', type: 'armor', price: 2400, st: { def: 36, mhp: 80 }, tier: 4, shop: 'smith' },

  ac1: { name: '平安符', type: 'acc', price: 150, st: { mhp: 30 }, tier: 0, shop: 'smith' },
  ac2: { name: '疾风佩', type: 'acc', price: 600, st: { spd: 4 }, tier: 1, shop: 'smith' },
  ac3: { name: '凝神玉', type: 'acc', price: 700, st: { mmp: 30 }, tier: 2, shop: 'smith' },
  ac4: { name: '虎魄坠', type: 'acc', price: 1500, st: { atk: 12 }, tier: 3, shop: 'smith' },
  acA: { name: '竹青佩', type: 'acc', price: 0, st: { mhp: 60, def: 5 }, desc: '万竹林深处的古玉，温润如水。' },
  acB: { name: '雪魄珠', type: 'acc', price: 0, st: { mmp: 40, def: 8 }, desc: '雪岭千年寒气所凝。' },
  acC: { name: '璇玑佩', type: 'acc', price: 0, st: { atk: 14, spd: 4 }, desc: '归墟中遗落的古佩，刻有星图。' },

  letter: { name: '师父的信', type: 'key', desc: '顾苍梧写给落霞镇沈长风的亲笔信。' },
  token:  { name: '幽烬令牌', type: 'key', desc: '从黑风身上搜出的令牌，刻着一团灰烬中的火。' },
  meteor: { name: '陨铁', type: 'key', desc: '赤焰谷深处的天外奇铁，或许铁匠会感兴趣。' },
  jade1:  { name: '璇玑玉·青', type: 'key', desc: '听雨阁世代守护的青玉。' },
  jade2:  { name: '璇玑玉·碧', type: 'key', desc: '万竹林世代守护的碧玉。' },
  jade3:  { name: '璇玑玉·赤', type: 'key', desc: '赤焰谷世代守护的赤玉。' },
  jade4:  { name: '璇玑玉·白', type: 'key', desc: '寒月宫世代守护的白玉。' }
};
for (const k in ITEMS) ITEMS[k].id = k;

const STAT_NAME = { mhp: '气血', mmp: '内力', atk: '攻击', def: '防御', spd: '速度', crit: '暴击', cdmg: '暴伤', dodge: '闪避', skl: '武学威力' };
const STAT_PCT = { crit: 1, cdmg: 1, dodge: 1, skl: 1 };   // 这几项按百分比显示

/* 敌人 ai: [[技能, 权重]...] */
const ENEMIES = {
  su_spar:  { name: '苏青禾', lv: 1, hp: 70, atk: 12, def: 5, spd: 11, exp: 20, gold: 0, boss: 1, ai: [['attack', 3], ['s1', 1]], look: CHARS.su.look },
  bandit:   { name: '山贼', lv: 1, hp: 52, atk: 14, def: 4, spd: 9, exp: 12, gold: 10, ai: [['attack', 3], ['e_chop', 1]],
              look: { robe: '#7a5a3a', trim: '#3a2a1a', sash: '#a03030', hair: '#1c1c1c', hs: 'short', hat: 'mask', wp: 'saber', wc: '#d0d0d8', fierce: 1 } },
  wolf:     { name: '野狼', lv: 1, hp: 38, atk: 15, def: 2, spd: 14, exp: 10, gold: 5, ai: [['attack', 3], ['e_bite', 1]],
              look: { k: 'wolf', c: '#8a8f9a', c2: '#d0d4dc', eye: '#ffd24a' } },
  heifeng:  { name: '黑风', lv: 4, hp: 235, atk: 21, def: 8, spd: 10, exp: 95, gold: 150, boss: 1, ai: [['attack', 3], ['k_smash', 2], ['k_whirl', 1]],
              look: { robe: '#2f2f3a', trim: '#8a2e2e', sash: '#8a2e2e', hair: '#111111', hs: 'short', beard: 1, wp: 'saber', wc: '#c8ccd8', sz: 1.25, fierce: 1 } },

  spider:   { name: '毒蛛', lv: 5, hp: 95, atk: 27, def: 8, spd: 14, exp: 42, gold: 34, ai: [['attack', 3], ['e_venom', 2], ['e_web', 1]],
              look: { k: 'spider', c: '#4a2f6a', c2: '#b06bff', eye: '#ff4a6a' } },
  bamboo:   { name: '竹灵', lv: 5, hp: 130, atk: 25, def: 16, spd: 8, exp: 46, gold: 38, ai: [['attack', 3], ['e_thorn', 2]],
              look: { k: 'spirit', c: '#e6ffb0', c2: '#3fa64a', eye: '#1f4a2a' } },
  scout:    { name: '幽烬探子', lv: 6, hp: 115, atk: 31, def: 11, spd: 16, exp: 52, gold: 48, ai: [['attack', 3], ['e_shadow', 2]],
              look: { robe: '#3a3348', trim: '#8a5ad0', sash: '#8a5ad0', hair: '#111118', hs: 'hood', hat: 'mask', wp: 'dagger', wc: '#d8c8ff', fierce: 1 } },
  zhumu:    { name: '千眼蛛母', lv: 8, hp: 820, atk: 41, def: 16, spd: 13, exp: 480, gold: 520, boss: 1, ai: [['attack', 2], ['z_fang', 2], ['z_spit', 2], ['z_silk', 1]],
              look: { k: 'spider', c: '#2a1840', c2: '#d04aff', eye: '#ff3050', sz: 1.9 } },

  firespirit: { name: '火灵', lv: 9, hp: 170, atk: 56, def: 12, spd: 15, exp: 115, gold: 85, ai: [['attack', 2], ['e_flame', 3]],
              look: { k: 'spirit', c: '#fff0a0', c2: '#ff5a1f', eye: '#5a1500' } },
  lizard:   { name: '熔岩蜥', lv: 10, hp: 280, atk: 54, def: 30, spd: 8, exp: 135, gold: 100, ai: [['attack', 3], ['e_bite', 2], ['e_erupt', 1]],
              look: { k: 'wolf', c: '#6a2a1a', c2: '#ff8a3a', eye: '#ffe066', spikes: 1 } },
  blade:    { name: '幽烬刀客', lv: 10, hp: 230, atk: 60, def: 20, spd: 14, exp: 145, gold: 120, ai: [['attack', 3], ['e_chop', 2], ['e_shadow', 1]],
              look: { robe: '#40304f', trim: '#c04a4a', sash: '#c04a4a', hair: '#111118', hs: 'short', hat: 'mask', wp: 'saber', wc: '#e8d0ff', fierce: 1 } },
  shi_duel: { name: '石破军', lv: 10, hp: 1100, atk: 70, def: 34, spd: 15, exp: 520, gold: 0, boss: 1, ai: [['attack', 3], ['t1', 3], ['t3', 2], ['t4', 1]], look: CHARS.shi.look },
  chiyan:   { name: '赤魇', lv: 12, hp: 1900, atk: 90, def: 28, spd: 19, exp: 950, gold: 1100, boss: 1, ai: [['attack', 2], ['c_palm', 3], ['c_hell', 2], ['c_aura', 1]],
              look: { robe: '#5a1414', trim: '#ff7a2a', sash: '#ffb347', hair: '#ff5a2a', hs: 'long', wp: 'none', sz: 1.3, fierce: 1, aura: '#ff5a1f' } },

  snowwolf: { name: '雪狼', lv: 13, hp: 300, atk: 88, def: 20, spd: 21, exp: 250, gold: 210, ai: [['attack', 3], ['e_bite', 2], ['e_roar', 1]],
              look: { k: 'wolf', c: '#e6eef8', c2: '#ffffff', eye: '#4fb0ff' } },
  icesoul:  { name: '冰魄', lv: 14, hp: 360, atk: 92, def: 30, spd: 12, exp: 270, gold: 240, ai: [['attack', 2], ['e_frost', 3], ['e_blizz', 1]],
              look: { k: 'spirit', c: '#f0fbff', c2: '#4fa8ff', eye: '#103a6a' } },
  swordman: { name: '幽烬剑士', lv: 14, hp: 400, atk: 98, def: 30, spd: 17, exp: 290, gold: 270, ai: [['attack', 3], ['e_shadow', 2], ['e_chop', 1]],
              look: { robe: '#2f2a45', trim: '#7fa8ff', sash: '#7fa8ff', hair: '#111118', hs: 'top', hat: 'mask', wp: 'sword', wc: '#d0e0ff', fierce: 1 } },
  lingshuang: { name: '凌霜', lv: 16, hp: 3800, atk: 138, def: 40, spd: 25, exp: 1900, gold: 3000, boss: 1, ai: [['attack', 2], ['l_pierce', 3], ['l_dance', 2], ['l_moon', 1]],
              look: { robe: '#cfe4ff', trim: '#3a5ab0', sash: '#8a5ad0', hair: '#e8f0ff', hs: 'long', wp: 'sword', wc: '#bfe8ff', f: 1, sz: 1.15, aura: '#6fb8ff' } },

  deathguard: { name: '幽烬死士', lv: 17, hp: 560, atk: 128, def: 40, spd: 17, exp: 470, gold: 380, ai: [['attack', 3], ['e_chop', 2], ['e_shadow', 1]],
              look: { robe: '#221a30', trim: '#b04aff', sash: '#b04aff', hair: '#111118', hs: 'hood', hat: 'mask', wp: 'saber', wc: '#e0c0ff', sz: 1.08, fierce: 1 } },
  soulshade: { name: '噬魂影', lv: 17, hp: 460, atk: 138, def: 26, spd: 23, exp: 500, gold: 400, ai: [['attack', 2], ['e_drain', 2], ['e_shadow', 1]],
              look: { k: 'spirit', c: '#e0b0ff', c2: '#3a0f6a', eye: '#ffffff' } },
  ye:       { name: '夜无殇', lv: 19, hp: 4600, atk: 165, def: 46, spd: 27, exp: 0, gold: 0, boss: 1, ai: [['attack', 2], ['y_sword', 3], ['y_burn', 2], ['y_soul', 1], ['y_gate', 1]],
              look: { robe: '#1c1626', trim: '#b04aff', sash: '#f6c453', hair: '#e8e8f0', hs: 'long', wp: 'sword', wc: '#d0a0ff', sz: 1.2, fierce: 1, aura: '#8a3fd6' } },
  moxiang:  { name: '归墟魔相', lv: 20, hp: 6200, atk: 185, def: 50, spd: 29, exp: 6000, gold: 0, boss: 1, ai: [['attack', 2], ['m_eat', 3], ['m_all', 2], ['m_still', 1], ['y_gate', 1]],
              look: { robe: '#120a1f', trim: '#ff4ad0', sash: '#b04aff', hair: '#f4e8ff', hs: 'long', hat: 'crown', wp: 'sword', wc: '#ff9af0', sz: 1.55, fierce: 1, aura: '#c040ff', wings: 1 } }
};
for (const k in ENEMIES) ENEMIES[k].id = k;

function whoIs(key) {
  if (CHARS[key]) return CHARS[key];
  if (NPCS[key]) return NPCS[key];
  if (ENEMIES[key]) return ENEMIES[key];
  return null;
}

/* ============ 扩充内容：根基属性、难度、五行克制、支线敌人与装备 ============ */
const ATTR_PER_LV = 3;   // 每升一级得到的属性点
const ATTRS = [
  { k: 'str', n: '膂力', d: '每点：攻击 +0.6%' },
  { k: 'con', n: '根骨', d: '每点：气血 +0.5%，防御 +0.3%' },
  { k: 'agi', n: '身法', d: '每点：速度 +0.25%，闪避 +0.12%' },
  { k: 'wis', n: '悟性', d: '每点：内力 +0.8%，武学威力 +0.5%' },
  { k: 'luk', n: '福缘', d: '每点：暴击 +0.25%，暴伤 +0.6%，异常命中 +0.3%' }
];
// 难度：lv 是所有对手高出的等级（强弱全由等级说了算，不再另有气血、攻击的倍率），rw 为修为与银两的倍率
const DIFFS = [
  { n: '江湖', d: '敌人强悍、懂得集火，首领残血时会狂怒。需要认真加点、配装和用药。', lv: 0, rw: 1 },
  { n: '宗师', d: '所有对手高出两级，更懂得集火。每一场首领战都可能翻船，奖励也更丰厚。', lv: 2, rw: 1.35 }
];

Object.assign(SKILLS, {
  e_snipe:  { name: '冷箭', cost: 0, tgt: 'one', kind: 'atk', pow: 1.7, crit: 0.25, elem: 'phys', fx: 'needle' },
  e_spore:  { name: '瘴雾', cost: 0, tgt: 'all', kind: 'atk', pow: 0.7, elem: 'poison', fx: 'burst', st: { id: 'poison', ch: 0.5, t: 3 } },
  q_fog:    { name: '蚀骨瘴', cost: 0, tgt: 'all', kind: 'atk', pow: 1.0, elem: 'poison', fx: 'burst', st: { id: 'defDown', ch: 0.6, t: 3, v: 0.25 } },
  q_regen:  { name: '聚瘴成形', cost: 0, tgt: 'self', kind: 'buff', buff: { id: 'defUp', v: 0.3, t: 3 }, heal: 0.07, elem: 'poison', fx: 'buff' },
  f_quake:  { name: '裂地', cost: 0, tgt: 'all', kind: 'atk', pow: 1.05, elem: 'earth', fx: 'wave', st: { id: 'stun', ch: 0.22, t: 1 } },
  w_rend:   { name: '撕裂', cost: 0, tgt: 'one', kind: 'atk', pow: 2.1, elem: 'phys', fx: 'heavy', st: { id: 'defDown', ch: 0.7, t: 3, v: 0.25 } }
});
for (const k in SKILLS) SKILLS[k].id = k;

Object.assign(ENEMIES, {
  // 黑风寨
  archer:   { name: '山寨弓手', lv: 5, hp: 88, atk: 30, def: 6, spd: 17, exp: 48, gold: 40, dodge: 0.06, ai: [['attack', 2], ['e_snipe', 2]],
              look: { robe: '#6a5a3a', trim: '#2a2218', sash: '#3f6a3a', hair: '#1c1c1c', hs: 'hood', hat: 'mask', wp: 'dagger', wc: '#c8d0c0', fierce: 1 } },
  brute:    { name: '山寨力士', lv: 6, hp: 175, atk: 31, def: 15, spd: 8, exp: 58, gold: 46, ai: [['attack', 3], ['k_smash', 2]],
              look: { robe: '#5a4030', trim: '#2a1c14', sash: '#8a2e2e', hair: '#1a1a1a', hs: 'bald', beard: 1, wp: 'saber', wc: '#b8bcc8', sz: 1.15, fierce: 1, skin: '#d8a070' } },
  tiebi:    { name: '铁臂熊', lv: 7, hp: 780, atk: 41, def: 18, spd: 11, exp: 420, gold: 500, boss: 1, ai: [['attack', 2], ['k_smash', 3], ['k_whirl', 2], ['e_roar', 1]],
              look: { robe: '#3a2c26', trim: '#c0902a', sash: '#c0902a', hair: '#141414', hs: 'short', beard: 1, wp: 'staff', sz: 1.32, fierce: 1, skin: '#c89468' } },
  // 药王洞
  miasma:     { name: '瘴灵', lv: 8, hp: 150, atk: 44, def: 10, spd: 14, exp: 92, gold: 70, dodge: 0.08, weak: ['fire', 'wind'], res: ['poison'], ai: [['attack', 2], ['e_venom', 2], ['e_spore', 1]],
                look: { k: 'spirit', c: '#d8ffb0', c2: '#6a9a2a', eye: '#2a3a0a' } },
  cavespider: { name: '洞穴毒蛛', lv: 9, hp: 195, atk: 48, def: 14, spd: 15, exp: 104, gold: 80, weak: ['fire'], res: ['poison'], ai: [['attack', 3], ['e_venom', 2], ['e_web', 1]],
                look: { k: 'spider', c: '#2f5a3a', c2: '#8aff6a', eye: '#ffe04a' } },
  zhangmu:    { name: '瘴母', lv: 10, hp: 1900, atk: 72, def: 20, spd: 14, exp: 780, gold: 900, boss: 1, weak: ['fire', 'wind'], res: ['poison'], ai: [['attack', 2], ['z_spit', 2], ['q_fog', 2], ['q_regen', 1]],
                look: { k: 'spirit', c: '#e8ffa0', c2: '#3a7a1a', eye: '#1a2a00', sz: 1.9 } },
  // 炼火窟
  magma:    { name: '熔核', lv: 12, hp: 300, atk: 80, def: 22, spd: 13, exp: 210, gold: 170, weak: ['wind'], res: ['fire'], ai: [['attack', 2], ['e_flame', 3], ['e_erupt', 1]],
              look: { k: 'spirit', c: '#fff4c0', c2: '#ff3a0a', eye: '#3a0a00' } },
  lizard2:  { name: '赤鳞蜥', lv: 13, hp: 430, atk: 82, def: 36, spd: 10, exp: 240, gold: 190, weak: ['sword'], res: ['fire'], ai: [['attack', 3], ['e_bite', 2], ['e_erupt', 1]],
              look: { k: 'wolf', c: '#8a1f14', c2: '#ffb04a', eye: '#fff066', spikes: 1 } },
  yanlong:  { name: '熔岩蜥王', lv: 13, hp: 3500, atk: 124, def: 40, spd: 15, exp: 1500, gold: 1800, boss: 1, weak: ['sword'], res: ['fire'], ai: [['attack', 2], ['e_bite', 2], ['e_erupt', 2], ['f_quake', 2]],
              look: { k: 'wolf', c: '#5a140c', c2: '#ff7a1a', eye: '#ffffff', spikes: 1, sz: 1.9 } },
  // 冰魄窟
  frostwolf: { name: '霜牙狼', lv: 16, hp: 430, atk: 118, def: 26, spd: 24, exp: 420, gold: 330, dodge: 0.1, weak: ['fire'], ai: [['attack', 3], ['e_bite', 2], ['e_frost', 1]],
               look: { k: 'wolf', c: '#b8d0ea', c2: '#f4faff', eye: '#2a8aff' } },
  iceguard:  { name: '冰俑', lv: 16, hp: 580, atk: 112, def: 48, spd: 12, exp: 450, gold: 350, weak: ['fire', 'earth'], res: ['wind'], ai: [['attack', 3], ['e_chop', 2], ['e_frost', 2]],
               look: { robe: '#bcd4ea', trim: '#5a7ab0', sash: '#5a7ab0', hair: '#e0ecf8', hs: 'hood', hat: 'mask', wp: 'saber', wc: '#d8f0ff', sz: 1.12, fierce: 1, skin: '#c8d8e8' } },
  langwang:  { name: '雪狼王', lv: 17, hp: 4600, atk: 150, def: 42, spd: 27, exp: 2600, gold: 3200, boss: 1, dodge: 0.06, weak: ['fire'], ai: [['attack', 2], ['e_bite', 2], ['w_rend', 2], ['l_dance', 2], ['e_roar', 1]],
               look: { k: 'wolf', c: '#dfe8f4', c2: '#ffffff', eye: '#ff4a4a', sz: 1.85 } }
});
for (const k in ENEMIES) ENEMIES[k].id = k;
// 五行克制与闪避（原有敌人）：weak 受到该系伤害 +30%，res 受到该系伤害 -30%
(o => { for (const k in o) Object.assign(ENEMIES[k], o[k]); })({
  wolf: { weak: ['fire'] }, spider: { weak: ['fire'], res: ['poison'] }, bamboo: { weak: ['fire'], res: ['wind'] }, scout: { weak: ['earth'], dodge: 0.12 },
  zhumu: { weak: ['fire'], res: ['poison'] }, firespirit: { weak: ['wind'], res: ['fire'] }, lizard: { weak: ['sword'], res: ['fire'] }, chiyan: { weak: ['wind'], res: ['fire'] },
  snowwolf: { weak: ['fire'], dodge: 0.08 }, icesoul: { weak: ['fire', 'earth'], res: ['wind'] }, swordman: { dodge: 0.06 }, lingshuang: { weak: ['fire'] },
  soulshade: { weak: ['sword'], res: ['poison', 'earth'], dodge: 0.15 }, moxiang: { weak: ['sword'], res: ['poison'] }
});

Object.assign(ITEMS, {
  acD: { name: '虎头腰牌', type: 'acc', price: 0, st: { atk: 8, crit: 5 }, desc: '黑风寨二当家的腰牌，煞气很重。' },
  acE: { name: '七叶佩', type: 'acc', price: 0, st: { mhp: 90, skl: 8 }, desc: '杜大夫用灵芝余料炮制的药佩。' },
  acF: { name: '赤鳞护符', type: 'acc', price: 0, st: { def: 14, mhp: 60 }, desc: '熔岩蜥王的一片逆鳞。' },
  acG: { name: '狼王牙', type: 'acc', price: 0, st: { spd: 5, crit: 8, dodge: 4 }, desc: '雪狼王的獠牙，握在手里仍有寒意。' },
  sbX: { name: '熔心刀', type: 'weapon', wt: 'saber', price: 0, st: { atk: 64, crit: 6 }, desc: '以地火精淬成，刀身常年温热。' },
  tk1: { name: '问剑令·铜', type: 'acc', price: 0, st: { atk: 6, spd: 2 }, desc: '问剑台三层的凭证。' },
  tk2: { name: '问剑令·银', type: 'acc', price: 0, st: { atk: 12, crit: 6 }, desc: '问剑台六层的凭证。' },
  tk3: { name: '问剑令·金', type: 'acc', price: 0, st: { atk: 18, crit: 8, cdmg: 20 }, desc: '问剑台九层的凭证。' },
  tk4: { name: '问剑令·玄', type: 'acc', price: 0, st: { atk: 24, mhp: 120, crit: 10, dodge: 5 }, desc: '登顶问剑台者方能持有。' },
  acS: { name: '灵犀坠', type: 'acc', price: 900, st: { crit: 6, cdmg: 15 }, tier: 2, shop: 'smith' },
  acT: { name: '踏雪履', type: 'acc', price: 1100, st: { spd: 3, dodge: 6 }, tier: 2, shop: 'smith' },
  acU: { name: '明心玉', type: 'acc', price: 1400, st: { mmp: 30, skl: 10 }, tier: 3, shop: 'smith' },
  biaoyin: { name: '失镖', type: 'key', desc: '镖局被劫的那批镖银，封条完好。' },
  lingzhi: { name: '七叶灵芝', type: 'key', desc: '药王洞深处才有的灵药，七片叶子各呈一色。' },
  huojing: { name: '地火精', type: 'key', desc: '炼火窟深处凝成的一团火种，握之不灼。' },
  bingpo:  { name: '千年冰魄', type: 'key', desc: '冰魄窟最深处的寒玉，寒月宫镇宫之物的同源。' }
});
for (const k in ITEMS) ITEMS[k].id = k;

Object.assign(NPCS, {
  keeper: { name: '莫问', look: { robe: '#3a3a46', trim: '#c8a040', sash: '#c8a040', hair: '#9a9aa4', hs: 'top', beard: 1, wp: 'sword', wc: '#e8e8f0', sz: 1.05 } }
});
/* ============ 主线扩充：烟雨渡、断剑崖、幽烬城 ============ */
Object.assign(SKILLS, {
  h7: { name: '一蓑烟雨', desc: '断剑崖上悟得的旧式。一剑既出，不问归途；必定破甲。', cost: 30, tgt: 'one', kind: 'atk', pow: 3.0, crit: 0.1, elem: 'sword', fx: 'heavy', st: { id: 'defDown', ch: 1, t: 3, v: 0.25 } },
  p_charm: { name: '摄心', cost: 0, tgt: 'one', kind: 'atk', pow: 1.2, elem: 'dark', fx: 'burst', st: { id: 'stun', ch: 0.4, t: 1 } },
  p_fan:   { name: '落花毒雨', cost: 0, tgt: 'all', kind: 'atk', pow: 0.95, elem: 'poison', fx: 'needle', st: { id: 'poison', ch: 0.6, t: 3 } },
  p_veil:  { name: '易容换影', cost: 0, tgt: 'self', kind: 'buff', buff: { id: 'spdUp', v: 0.4, t: 3 }, heal: 0.05, elem: 'dark', fx: 'buff' },
  j_cut:   { name: '一剑断念', cost: 0, tgt: 'one', kind: 'atk', pow: 2.3, crit: 0.15, elem: 'sword', fx: 'heavy' },
  j_rain:  { name: '旧雨', cost: 0, tgt: 'all', kind: 'atk', pow: 1.2, elem: 'sword', fx: 'wave', st: { id: 'defDown', ch: 0.4, t: 3, v: 0.25 } },
  j_echo:  { name: '剑意回响', cost: 0, tgt: 'self', kind: 'buff', buff: { id: 'atkUp', v: 0.3, t: 3 }, elem: 'sword', fx: 'buff' },
  x_ash:   { name: '万烬归尘', cost: 0, tgt: 'all', kind: 'atk', pow: 1.3, elem: 'fire', fx: 'burst', st: { id: 'burn', ch: 0.5, t: 3 } },
  x_seal:  { name: '封脉', cost: 0, tgt: 'one', kind: 'atk', pow: 1.6, elem: 'dark', fx: 'burst', st: { id: 'stun', ch: 0.35, t: 1 } },
  x_candle: { name: '续烛', cost: 0, tgt: 'self', kind: 'buff', buff: { id: 'defUp', v: 0.35, t: 3 }, heal: 0.06, elem: 'fire', fx: 'buff' }
});
for (const k in SKILLS) SKILLS[k].id = k;

Object.assign(ENEMIES, {
  // 烟雨渡
  pirate:   { name: '水匪', lv: 9, hp: 215, atk: 50, def: 14, spd: 12, exp: 105, gold: 85, weak: ['fire'], ai: [['attack', 3], ['e_chop', 2]],
              look: { robe: '#3a5a6a', trim: '#1c2c34', sash: '#c0902a', hair: '#1a1a1a', hs: 'short', beard: 1, wp: 'saber', wc: '#c8d4dc', fierce: 1, skin: '#c89468' } },
  spy:      { name: '幽烬细作', lv: 9, hp: 170, atk: 54, def: 10, spd: 18, exp: 110, gold: 90, dodge: 0.12, weak: ['earth'], ai: [['attack', 2], ['e_shadow', 2], ['e_snipe', 1]],
              look: { robe: '#3a3348', trim: '#c05a8a', sash: '#c05a8a', hair: '#111118', hs: 'hood', hat: 'mask', wp: 'dagger', wc: '#ffd0e6', fierce: 1 } },
  qianmian: { name: '千面', lv: 11, hp: 1500, atk: 66, def: 18, spd: 20, exp: 700, gold: 800, boss: 1, dodge: 0.08, weak: ['earth'], res: ['poison'], ai: [['attack', 2], ['e_shadow', 2], ['p_charm', 2], ['p_fan', 2], ['p_veil', 1]],
              look: { robe: '#4a2a5a', trim: '#ff8fc0', sash: '#f6c453', hair: '#1c1420', hs: 'long', wp: 'fan', wc: '#ffb0d8', f: 1, sz: 1.08, aura: '#d060a0' } },
  // 断剑崖
  swordsoul: { name: '剑灵', lv: 15, hp: 380, atk: 104, def: 22, spd: 20, exp: 330, gold: 250, dodge: 0.08, weak: ['earth'], res: ['sword'], ai: [['attack', 3], ['e_shadow', 2]],
               look: { k: 'spirit', c: '#f0f6ff', c2: '#7f9ac0', eye: '#1c2a44' } },
  tombguard: { name: '守冢石俑', lv: 15, hp: 620, atk: 98, def: 50, spd: 9, exp: 340, gold: 260, weak: ['earth'], res: ['sword', 'wind'], ai: [['attack', 3], ['k_smash', 2]],
               look: { robe: '#8a8f96', trim: '#5a6068', sash: '#5a6068', hair: '#9aa0a8', hs: 'hood', hat: 'mask', wp: 'sword', wc: '#c8ccd4', sz: 1.15, fierce: 1, skin: '#a8aeb6' } },
  jianying:  { name: '白衣剑影', lv: 16, hp: 4200, atk: 132, def: 34, spd: 24, exp: 2200, gold: 2400, boss: 1, dodge: 0.08, weak: ['earth', 'fire'], res: ['sword'], ai: [['attack', 2], ['j_cut', 3], ['j_rain', 2], ['j_echo', 1]],
               look: { robe: '#f2f2f6', trim: '#8fa8c8', sash: '#8fa8c8', hair: '#1c1c22', hs: 'long', wp: 'sword', wc: '#dff0ff', sz: 1.1, aura: '#bcd8ff' } },
  // 幽烬城
  ashguard: { name: '烬卫', lv: 20, hp: 760, atk: 150, def: 44, spd: 16, exp: 620, gold: 420, weak: ['wind'], res: ['fire'], ai: [['attack', 3], ['e_chop', 2], ['e_flame', 1]],
              look: { robe: '#4a1c16', trim: '#ff8a3a', sash: '#2a1512', hair: '#111111', hs: 'hood', hat: 'mask', wp: 'saber', wc: '#ffc890', sz: 1.1, fierce: 1 } },
  ashmage:  { name: '烬巫', lv: 20, hp: 560, atk: 160, def: 26, spd: 19, exp: 640, gold: 440, weak: ['wind'], res: ['fire'], ai: [['attack', 1], ['e_flame', 2], ['e_erupt', 2], ['e_drain', 1]],
              look: { k: 'spirit', c: '#ffd9a0', c2: '#b02a10', eye: '#2a0800' } },
  xuanzhu:  { name: '玄烛', lv: 22, hp: 6800, atk: 178, def: 46, spd: 24, exp: 4000, gold: 4200, boss: 1, weak: ['wind', 'sword'], res: ['fire'], ai: [['attack', 2], ['x_ash', 3], ['x_seal', 2], ['x_candle', 1], ['y_soul', 1]],
              look: { robe: '#1c1614', trim: '#d9a13a', sash: '#8a2e1a', hair: '#8a8a94', hs: 'bun', beard: 1, wp: 'staff', sz: 1.15, aura: '#ff7a3a' } }
});
for (const k in ENEMIES) ENEMIES[k].id = k;

Object.assign(NPCS, {
  boatman:    { name: '船家', look: { robe: '#5a7a8a', trim: '#e0e8ec', sash: '#3a4a54', hair: '#3a3a3a', hs: 'short', hat: 'bamboo', beard: 1, wp: 'staff' } },
  lampwoman:  { name: '卖灯婆婆', look: { robe: '#a05a4a', trim: '#f4e0c8', sash: '#6a3a2e', hair: '#d8d8de', hs: 'bun', wp: 'none', sz: 0.9, f: 1 } },
  tombkeeper: { name: '忠伯', look: { robe: '#6a6e74', trim: '#c8ccd0', sash: '#3a3e44', hair: '#e4e4e8', hs: 'bun', beard: 1, wp: 'staff', sz: 0.95 } }
});
Object.assign(ITEMS, {
  hedeng:   { name: '半盏河灯', type: 'key', desc: '焦黑的半盏河灯，灯纸上依稀还剩两个字：疏影。' },
  duanjian: { name: '无殇断剑', type: 'key', desc: '断剑崖上的半截佩剑。剑身刻着「无殇」，另一行字被人以指力抹去了。' }
});
for (const k in ITEMS) ITEMS[k].id = k;

/* ============ 落霞城扩建：城中人物、市井行人、城内任务用到的对手与物件 ============ */
Object.assign(NPCS, {
  jin:      { name: '金掌柜', look: { robe: '#8a3a2a', trim: '#f0d8a0', sash: '#c9a13a', hair: '#2a2420', hs: 'top', beard: 1, wp: 'none', sz: 1.05 } },
  qian:     { name: '钱朝奉', look: { robe: '#4a5a4a', trim: '#d8d0b0', sash: '#2e3a2e', hair: '#8a8a8a', hs: 'bun', beard: 1, wp: 'none', sz: 0.95 } },
  captain:  { name: '秦捕头', look: { robe: '#2e3a52', trim: '#b03a2e', sash: '#b03a2e', hair: '#1c1c22', hs: 'top', wp: 'saber', wc: '#d0d8e0', sz: 1.08 } },
  miaozhu:  { name: '庙祝', look: { robe: '#b8a070', trim: '#6a5a3a', sash: '#6a5a3a', hair: '#c8c8cc', hs: 'bun', beard: 1, wp: 'none', sz: 0.95 } },
  huaniang: { name: '花娘', look: { robe: '#c06a7a', trim: '#f4e0e4', sash: '#7a3a4a', hair: '#2a2024', hs: 'bun', wp: 'none', f: 1 } },
  xiaoman:  { name: '小满', look: { robe: '#f0a0b0', trim: '#ffffff', sash: '#d05a6a', hair: '#2a2024', hs: 'top', wp: 'none', sz: 0.7, f: 1 } },
  vendor1:  { name: '货郎', look: { robe: '#7a8a5a', trim: '#e8e0c0', sash: '#4a5a3a', hair: '#2a2a2a', hs: 'short', hat: 'bamboo', wp: 'none' } },
  vendor2:  { name: '刀剪张', look: { robe: '#5a4a40', trim: '#2a2220', sash: '#a04030', hair: '#2a2a2a', hs: 'short', beard: 1, wp: 'none', skin: '#d8a880' } },
  guard:    { name: '守城兵丁', look: { robe: '#5a2e2a', trim: '#c8b070', sash: '#2a2a30', hair: '#1c1c1c', hs: 'top', hat: 'helm', wp: 'staff', sz: 1.05 } }
});
// 街上的行人（只是走动，不能交谈）：衣着各不相同的寻常百姓
const CITIZENS = [
  { robe: '#6a7a9a', trim: '#e0e4ec', sash: '#3a4a6a', hair: '#22222a', hs: 'top', wp: 'none' },
  { robe: '#a8785a', trim: '#f0e0c8', sash: '#6a4a32', hair: '#2a2420', hs: 'bun', wp: 'none', f: 1 },
  { robe: '#5a8a6a', trim: '#e4f0e0', sash: '#3a5a44', hair: '#1c1c1c', hs: 'short', hat: 'bamboo', wp: 'none' },
  { robe: '#b8a8c8', trim: '#ffffff', sash: '#7a6a9a', hair: '#2a2430', hs: 'long', wp: 'none', f: 1 },
  { robe: '#8a8a7a', trim: '#d8d8c8', sash: '#5a5a4a', hair: '#b8b8bc', hs: 'bun', beard: 1, wp: 'staff', sz: 0.95 },
  { robe: '#9a5a4a', trim: '#f0d8c0', sash: '#5a3028', hair: '#22201c', hs: 'top', beard: 1, wp: 'none', sz: 1.06 },
  { robe: '#d8c8a0', trim: '#8a7a4a', sash: '#8a7a4a', hair: '#2a2a2a', hs: 'top', wp: 'fan', wc: '#fff4d6' },
  { robe: '#7ab0c0', trim: '#ffffff', sash: '#e0b050', hair: '#2a2420', hs: 'top', wp: 'none', sz: 0.74 },
  { robe: '#c89a5a', trim: '#fff0d0', sash: '#8a5a2a', hair: '#3a2a22', hs: 'bun', wp: 'none', f: 1, sz: 0.97 },
  { robe: '#4a4a5a', trim: '#b0b0c0', sash: '#8a2e2e', hair: '#1c1c22', hs: 'short', wp: 'none', sz: 1.04 }
];
Object.assign(ENEMIES, {
  // 城里闹事的泼皮：外形与水匪、力士相同，于是沿用它们的模型
  thug:     { name: '泼皮', lv: 5, hp: 105, atk: 28, def: 7, spd: 12, exp: 60, gold: 50, weak: ['fire'], ai: [['attack', 3], ['e_chop', 2]], look: ENEMIES.pirate.look },
  thugboss: { name: '过山虎', lv: 6, hp: 300, atk: 36, def: 10, spd: 11, exp: 220, gold: 240, boss: 1, weak: ['wind'], ai: [['attack', 2], ['k_smash', 2], ['e_roar', 1]], look: ENEMIES.brute.look }
});
for (const k in ENEMIES) ENEMIES[k].id = k;
Object.assign(ITEMS, {
  yupei: { name: '旧玉佩', type: 'key', desc: '当铺失窃的一块白玉佩，背面刻着一弯寒月。当票上的日子，是二十年前。' }
});
for (const k in ITEMS) ITEMS[k].id = k;

/* ============ 主线扩为十二关：沉舟坞、栖霞旧镇、天工墟、心渊 —— 新增的对手、物件与人物 ============
   新首领沿用现有人物的模型（衣着相同、只是身量与气焰不同），所以不必另做模型：
   沉舟 = 高出一头的水匪头子；潮影 = 与苏青禾七分相似的人影；守图铁俑 = 大一号的石俑；心像 = 同伴的模样。 */
Object.assign(SKILLS, {
  cz_oar:  { name: '铁桨横扫', cost: 0, tgt: 'all', kind: 'atk', pow: 1.05, elem: 'phys', fx: 'wave' },
  cz_sink: { name: '沉舟一击', cost: 0, tgt: 'one', kind: 'atk', pow: 2.0, elem: 'phys', fx: 'heavy', st: { id: 'stun', ch: 0.3, t: 1 } },
  cz_call: { name: '水寨号令', cost: 0, tgt: 'allies', kind: 'buff', buff: { id: 'atkUp', v: 0.25, t: 3 }, elem: 'phys', fx: 'buff' },
  cy_call: { name: '唤归', cost: 0, tgt: 'one', kind: 'atk', pow: 1.9, elem: 'dark', fx: 'burst', st: { id: 'defDown', ch: 0.6, t: 3, v: 0.25 } },
  cy_tide: { name: '黑潮漫卷', cost: 0, tgt: 'all', kind: 'atk', pow: 1.15, elem: 'dark', fx: 'wave', st: { id: 'poison', ch: 0.4, t: 3 } },
  cy_lull: { name: '旧谣', cost: 0, tgt: 'all', kind: 'atk', pow: 0.85, elem: 'dark', fx: 'burst', st: { id: 'stun', ch: 0.22, t: 1 } },
  tg_crush: { name: '千钧', cost: 0, tgt: 'one', kind: 'atk', pow: 2.4, elem: 'earth', fx: 'heavy', st: { id: 'stun', ch: 0.3, t: 1 } },
  tg_gear: { name: '璇玑轮转', cost: 0, tgt: 'all', kind: 'atk', pow: 1.2, elem: 'sword', fx: 'wave', st: { id: 'defDown', ch: 0.4, t: 3, v: 0.25 } },
  tg_lock: { name: '锁枢', cost: 0, tgt: 'self', kind: 'buff', buff: { id: 'defUp', v: 0.4, t: 3 }, heal: 0.05, elem: 'earth', fx: 'buff' },
  xx_lure: { name: '念想', cost: 0, tgt: 'one', kind: 'atk', pow: 1.4, elem: 'dark', fx: 'burst', st: { id: 'stun', ch: 0.4, t: 1 } },
  xx_mend: { name: '如你所愿', cost: 0, tgt: 'self', kind: 'buff', buff: { id: 'defUp', v: 0.3, t: 3 }, heal: 0.07, elem: 'dark', fx: 'buff' }
});
for (const k in SKILLS) SKILLS[k].id = k;

Object.assign(ENEMIES, {
  // 沉舟坞
  oarman:   { name: '水寨桨手', lv: 11, hp: 300, atk: 64, def: 18, spd: 13, exp: 150, gold: 110, weak: ['fire'], ai: [['attack', 3], ['e_chop', 2]], look: ENEMIES.pirate.look },
  dockspy:  { name: '幽烬暗桩', lv: 11, hp: 240, atk: 70, def: 13, spd: 19, exp: 155, gold: 120, dodge: 0.12, weak: ['earth'], ai: [['attack', 2], ['e_shadow', 2], ['e_venom', 1]], look: ENEMIES.spy.look },
  chenzhou: { name: '沉舟', lv: 12, hp: 2300, atk: 86, def: 26, spd: 15, exp: 900, gold: 1000, boss: 1, weak: ['fire', 'wind'], ai: [['attack', 2], ['cz_oar', 2], ['cz_sink', 3], ['cz_call', 1]],
              look: Object.assign({}, ENEMIES.pirate.look, { sz: 1.32, aura: '#4a8ac0' }) },
  // 栖霞旧镇
  tideshade: { name: '潮影', lv: 17, hp: 440, atk: 120, def: 24, spd: 21, exp: 420, gold: 320, dodge: 0.08, weak: ['fire'], res: ['dark'], ai: [['attack', 2], ['e_drain', 2], ['e_shadow', 1]],
               look: { k: 'spirit', c: '#cfc0ff', c2: '#2a1a4a', eye: '#ffffff' } },
  tidewatch: { name: '幽烬守望', lv: 17, hp: 540, atk: 124, def: 34, spd: 18, exp: 430, gold: 340, weak: ['wind'], ai: [['attack', 3], ['e_shadow', 2], ['e_chop', 1]], look: ENEMIES.swordman.look },
  chaoying:  { name: '潮中人影', lv: 18, hp: 5700, atk: 162, def: 36, spd: 24, exp: 2600, gold: 2600, boss: 1, dodge: 0.06, weak: ['fire', 'sword'], res: ['dark'], ai: [['attack', 2], ['cy_call', 3], ['cy_tide', 2], ['cy_lull', 1], ['y_gate', 1]],
               look: Object.assign({}, CHARS.su.look, { aura: '#8a5ad0', sz: 1.06 }) },
  // 天工墟
  tgpawn:   { name: '天工石俑', lv: 20, hp: 860, atk: 150, def: 58, spd: 11, exp: 620, gold: 420, weak: ['earth'], res: ['sword', 'wind'], ai: [['attack', 3], ['k_smash', 2]], look: ENEMIES.tombguard.look },
  tgsoul:   { name: '机关灵', lv: 20, hp: 580, atk: 162, def: 28, spd: 21, exp: 640, gold: 440, dodge: 0.08, weak: ['earth'], res: ['sword'], ai: [['attack', 2], ['e_shadow', 2], ['e_frost', 1]],
              look: { k: 'spirit', c: '#fff0b0', c2: '#8a6a1a', eye: '#3a2a00' } },
  tgguard:  { name: '守图铁俑', lv: 21, hp: 7000, atk: 182, def: 60, spd: 18, exp: 3800, gold: 3800, boss: 1, weak: ['earth', 'fire'], res: ['sword', 'wind'], ai: [['attack', 2], ['tg_crush', 3], ['tg_gear', 2], ['tg_lock', 1]],
              look: Object.assign({}, ENEMIES.tombguard.look, { sz: 1.6, aura: '#e8c66a' }) },
  // 心渊：归墟照着人心里的念想捏出来的“像”
  xx_su:    { name: '心像 · 苏青禾', lv: 24, hp: 4200, atk: 172, def: 40, spd: 28, exp: 3000, gold: 0, boss: 1, dodge: 0.08, weak: ['fire'], res: ['dark'], ai: [['attack', 2], ['s2', 2], ['s4', 3], ['s5', 2], ['xx_lure', 2], ['xx_mend', 1]],
              look: Object.assign({}, CHARS.su.look, { aura: '#b04aff' }) },
  xx_bai:   { name: '心像 · 白芷', lv: 24, hp: 4400, atk: 166, def: 38, spd: 25, exp: 3000, gold: 0, boss: 1, weak: ['fire'], res: ['dark', 'poison'], ai: [['attack', 2], ['p_fan', 3], ['e_drain', 2], ['xx_lure', 2], ['xx_mend', 2]],
              look: Object.assign({}, CHARS.bai.look, { aura: '#b04aff' }) },
  xx_hero:  { name: '心像 · 少年云澈', lv: 24, hp: 4300, atk: 174, def: 40, spd: 26, exp: 3000, gold: 0, boss: 1, weak: ['fire'], res: ['dark'], ai: [['attack', 2], ['h2', 3], ['h4', 2], ['h5', 2], ['xx_lure', 1], ['xx_mend', 1]],
              look: Object.assign({}, CHARS.hero.look, { aura: '#b04aff' }) }
});
for (const k in ENEMIES) ENEMIES[k].id = k;

Object.assign(ITEMS, {
  yaofang:  { name: '药方残页', type: 'key', desc: '百草翁留在沉舟坞的半张药方。背面有一行小字：丫头，莫来寻我。' },
  mushu:    { name: '旧木梳', type: 'key', desc: '栖霞旧镇的断梁下找到的桃木梳，梳背上刻着一个“蘅”字。' },
  paiwei:   { name: '灵位', type: 'key', desc: '城隍庙庙祝代写的灵位：先妣苏门林氏蘅之位。' },
  shuji:    { name: '璇玑枢', type: 'key', desc: '天工墟里取出的铜枢。四玉归位之后，持它的人可以从门里把门合上。' },
  qixing:   { name: '七星莲', type: 'key', desc: '万竹林水边的灵草，七瓣如星。' },
  huorong:  { name: '火绒芝', type: 'key', desc: '只长在赤焰谷熔岩边的菌芝，触手微烫。' },
  xuejian:  { name: '雪见草', type: 'key', desc: '寒月雪岭的雪线之上才有，见雪而开。' },
  zhangce:  { name: '沉舟坞账册', type: 'key', desc: '水寨里搜出的账册，记着每月“送郎中”的人数与去向。' },
  tapian:   { name: '天工拓片', type: 'key', desc: '从天工墟的石碑上拓下来的一纸古篆。' },
  acQ:      { name: '青穗结', type: 'acc', price: 0, st: { atk: 16, spd: 4, crit: 8 }, desc: '苏青禾用旧剑穗重新打的结。她说：系上，别弄丢了。' },
  acZ:      { name: '忘忧香囊', type: 'acc', price: 0, st: { mhp: 160, mmp: 30, skl: 10 }, desc: '白芷缝的香囊，里面是晒干的忘忧草，闻着像雨后的竹林。' },
  acL:      { name: '捕头腰牌', type: 'acc', price: 0, st: { def: 16, mhp: 110, dodge: 3 }, desc: '秦捕头私下给的副牌：凭此牌，落霞镇的差役都认你。' },
  acW:      { name: '天工铜鉴', type: 'acc', price: 0, st: { mmp: 40, skl: 14, crit: 4 }, desc: '书肆掌柜照拓片上的纹样翻铸的小铜鉴，据说能凝神。' }
});
for (const k in ITEMS) ITEMS[k].id = k;

Object.assign(NPCS, {
  healer:   { name: '被掳的郎中', look: { robe: '#8a9a8a', trim: '#e8f0e4', sash: '#5a6a5a', hair: '#5a5a5a', hs: 'bun', beard: 1, wp: 'none', sz: 0.97 } },
  healer2:  { name: '被掳的女医', look: { robe: '#b8c8b8', trim: '#ffffff', sash: '#6a8a6a', hair: '#2a2a2a', hs: 'bun', wp: 'none', f: 1 } },
  ruinhag:  { name: '守墟婆婆', look: { robe: '#6a6474', trim: '#b8b4c4', sash: '#3e3a48', hair: '#e4e4ea', hs: 'bun', wp: 'staff', sz: 0.88, f: 1 } },
  grave:    { name: '苏家旧宅', look: { robe: '#6a6474', trim: '#b8b4c4', sash: '#3e3a48', hair: '#e4e4ea', hs: 'bun', wp: 'none' } },
  stele:    { name: '天工石碑', look: { robe: '#8a8f96', trim: '#5a6068', sash: '#5a6068', hair: '#9aa0a8', hs: 'bun', wp: 'none' } }
});

/* ============ 落霞镇四郊：稻香村、藕花村、摩云岭、撷芳园 —— 人物、对手与物件 ============
   人物没有专门的模型，按年龄和性别用默认形象（见下面的 DEFAULT_LOOK）；对手沿用现成的外形，野兽和灵体是程序生成的、换个颜色就是新的一种。 */
Object.assign(NPCS, {
  // 稻香村
  dx_elder:  { name: '田老爹', look: { robe: '#8a7a56', trim: '#e0d6b8', sash: '#5a4a30', hair: '#dcdce0', hs: 'bun', beard: 1, wp: 'staff', sz: 0.96 } },
  dx_wife:   { name: '晒谷的大嫂', look: { robe: '#a86a4a', trim: '#f0e0c8', sash: '#6a3e2a', hair: '#2a2420', hs: 'bun', wp: 'none', f: 1 } },
  dx_farmer: { name: '庄稼汉', look: { robe: '#7a6a44', trim: '#d8cca0', sash: '#4a3e26', hair: '#22201c', hs: 'short', hat: 'bamboo', beard: 1, wp: 'none', skin: '#d0a070' } },
  dx_kid:    { name: '放牛娃', look: { robe: '#8aa860', trim: '#f0f0d8', sash: '#5a7a3a', hair: '#2a2420', hs: 'top', wp: 'none', sz: 0.72 } },
  dx_miao:   { name: '阿苗', look: { robe: '#9a8a6a', trim: '#d8d0b8', sash: '#6a5a3e', hair: '#2a2420', hs: 'top', wp: 'none', sz: 0.7, f: 1 } },
  // 藕花村
  oh_elder:  { name: '老藕翁', look: { robe: '#5a7a70', trim: '#d8e8e0', sash: '#34504a', hair: '#e0e0e4', hs: 'bun', beard: 1, wp: 'staff', hat: 'bamboo', sz: 0.95 } },
  oh_ling:   { name: '阿菱', look: { robe: '#7ab8a0', trim: '#f4fff8', sash: '#e08aa8', hair: '#22202a', hs: 'long', wp: 'none', f: 1, sz: 0.97 } },
  oh_fisher: { name: '打鱼的汉子', look: { robe: '#4e6a7a', trim: '#c8d8e0', sash: '#2e444e', hair: '#1c1c1c', hs: 'short', hat: 'bamboo', beard: 1, wp: 'none', skin: '#c89468' } },
  oh_aunt:   { name: '剥莲蓬的婶子', look: { robe: '#8a9a6a', trim: '#f0f4e0', sash: '#5a6a3e', hair: '#2a2420', hs: 'bun', wp: 'none', f: 1 } },
  // 摩云岭
  my_hunter: { name: '老猎户', look: { robe: '#6a5640', trim: '#c8b890', sash: '#3e3020', hair: '#8a8a8e', hs: 'short', beard: 1, wp: 'none', skin: '#c89468', cls: 'man' } },
  my_hermit: { name: '崖上客', look: { robe: '#d8dcd8', trim: '#7a8a8a', sash: '#4a5a5a', hair: '#ececf0', hs: 'bun', beard: 1, wp: 'sword', wc: '#e0eef4', sz: 1.02, cls: 'oldman' } },
  // 撷芳园
  gd_yun:    { name: '芸婆婆', look: { robe: '#a87a9a', trim: '#f4e8f0', sash: '#6a4a62', hair: '#e8e4ea', hs: 'bun', wp: 'none', sz: 0.9, f: 1 } },
  gd_boy:    { name: '浇花的小童', look: { robe: '#7ab0c0', trim: '#ffffff', sash: '#e0b050', hair: '#2a2420', hs: 'top', wp: 'none', sz: 0.72 } },
  gd_guest:  { name: '赏花的书生', look: { robe: '#d8d0b0', trim: '#8a7a4a', sash: '#8a7a4a', hair: '#2a2a2a', hs: 'top', wp: 'fan', wc: '#fff4d6' } }
});
Object.assign(ENEMIES, {
  // 稻香村：夜里来挖谷仓的“粮耗子”
  ratboss:  { name: '钻仓鼠', lv: 5, hp: 250, atk: 28, def: 9, spd: 16, exp: 210, gold: 230, boss: 1, dodge: 0.08, weak: ['fire'], ai: [['attack', 3], ['e_snipe', 2], ['e_chop', 1]], look: ENEMIES.archer.look },
  // 藕花村：躲在藕塘里装神弄鬼的水寨逃卒
  shuigui:  { name: '鬼老七', lv: 9, hp: 1350, atk: 64, def: 17, spd: 15, exp: 620, gold: 700, boss: 1, weak: ['fire', 'wind'], ai: [['attack', 2], ['cz_oar', 2], ['cz_sink', 2], ['e_roar', 1]],
              look: Object.assign({}, ENEMIES.pirate.look, { sz: 1.22 }) },
  // 摩云岭：山里的野物
  shanlang: { name: '苍狼', lv: 11, hp: 250, atk: 72, def: 16, spd: 20, exp: 170, gold: 120, weak: ['fire'], ai: [['attack', 3], ['e_bite', 2], ['e_roar', 1]],
              look: { k: 'wolf', c: '#5e6068', c2: '#b8bcc4', eye: '#ffb02a' } },
  yanxi:    { name: '岩甲蜥', lv: 11, hp: 330, atk: 66, def: 34, spd: 9, exp: 180, gold: 130, weak: ['wind'], res: ['earth'], ai: [['attack', 3], ['e_bite', 2], ['k_smash', 1]],
              look: { k: 'wolf', c: '#6a6e68', c2: '#a8b0a0', eye: '#e8f06a', spikes: 1 } },
  lanling:  { name: '岚灵', lv: 11, hp: 215, atk: 76, def: 12, spd: 17, exp: 175, gold: 125, dodge: 0.1, weak: ['fire', 'earth'], res: ['wind'], ai: [['attack', 2], ['e_thorn', 2], ['e_frost', 1]],
              look: { k: 'spirit', c: '#f2faf8', c2: '#7aa8a0', eye: '#1c3a3a' } },
  // 摩云岭顶上那位：只是切磋，点到为止
  yashang:  { name: '崖上客', lv: 12, hp: 2100, atk: 88, def: 30, spd: 22, exp: 1000, gold: 0, boss: 1, dodge: 0.1, weak: ['fire'], res: ['wind'], ai: [['attack', 2], ['j_cut', 3], ['j_rain', 2], ['x_candle', 1]],
              look: { robe: '#d8dcd8', trim: '#7a8a8a', sash: '#4a5a5a', hair: '#ececf0', hs: 'bun', beard: 1, wp: 'sword', wc: '#e0eef4', sz: 1.02, cls: 'oldman' } }
});
for (const k in ENEMIES) ENEMIES[k].id = k;
Object.assign(ITEMS, {
  huagao:   { name: '画着一家三口的纸', type: 'key', desc: '压在稻草人斗笠底下的一张纸，炭条画的：两个大人，牵着一个扎小髻的孩子。' },
  chenyin:  { name: '沉塘的赈银', type: 'key', desc: '藕塘底捞上来的一箱官银，锭底打着“赈”字。' },
  hua1:     { name: '晓妆', type: 'key', desc: '撷芳园的奇花，粉瓣上常年带着露水，只在清早最艳。' },
  hua2:     { name: '夜光白', type: 'key', desc: '撷芳园的奇花，白得发亮，据说夜里能照见人影。' },
  hua3:     { name: '紫霞', type: 'key', desc: '撷芳园的奇花，一朵之中由紫入绯，像一片晚霞。' },
  acR:      { name: '稻穗结', type: 'acc', price: 0, st: { mhp: 70, def: 6 }, desc: '稻香村的人用新稻穗编的结，说是戴着的人一辈子不挨饿。' },
  acO:      { name: '莲心佩', type: 'acc', price: 0, st: { mmp: 30, def: 8, skl: 6 }, desc: '老藕翁用一枚老莲子磨的佩。莲子心是苦的，磨出来却润。' },
  acY:      { name: '摩云佩', type: 'acc', price: 0, st: { spd: 5, dodge: 6, crit: 6 }, desc: '崖上客随手解下来的旧佩，上面刻着四个字：云在脚下。' },
  acH:      { name: '撷芳囊', type: 'acc', price: 0, st: { mmp: 40, mhp: 60, skl: 8 }, desc: '芸婆婆缝的香囊，装着园子里一年四季的落花。' },
  // 备用支线（落霞镇与四郊往来的八桩小事，见 story.js 末尾）要经手的物件
  xinmi:    { name: '一袋新米', type: 'key', desc: '稻香村今年的头一茬新米，田老爹亲手装的样米。' },
  yaopai:   { name: '镖师的遗物', type: 'key', desc: '一块磨亮了的镖局腰牌，一封没寄出去的家书，开头写着：苗儿。' },
  lianpeng: { name: '老莲蓬', type: 'key', desc: '藕花村塘里熟透的莲蓬，莲子心又苦又足。' },
  tizi:     { name: '崖上客的题字', type: 'key', desc: '一张皱巴巴的纸，四个字写得很随便：云在脚下。' },
  chenjiu:  { name: '三十年陈酒', type: 'key', desc: '莫问从问剑台底下起出来的一坛酒，泥封上的字已经看不清了。' },
  songzhi:  { name: '一截松枝', type: 'key', desc: '崖上客随手削下来的松枝，断口平得像镜子。' },
  tanggui:  { name: '糖桂花', type: 'key', desc: '花娘自家腌的一小罐糖桂花，封口的红纸是小满剪的。' },
  huachu:   { name: '小花锄', type: 'key', desc: '芸婆婆分根用的小花锄，木柄磨得发亮。' },
  shaoyao:  { name: '芍药根', type: 'key', desc: '撷芳园分出来的几段芍药根，裹在湿苔里。要三年才开花。' },
  baihua:   { name: '百花酿', type: 'key', desc: '芸婆婆一年只酿一坛的酒。坛口系着一段褪了色的剑穗。' }
});
for (const k in ITEMS) ITEMS[k].id = k;

/* ============ 默认形象 ============
   没有专属模型和头像的人物（城里的掌柜、百姓、行人、兵丁、屋里的闲人、路上偶遇的人……）按年龄和性别归类，
   每一类统一借用一位现成人物的模型和头像，不再用程序拼出来的小人。
   以后给哪一类做了专门的模型（models/<id>.glb）和头像（portraits/src/<id>.png），把这张表里对应的名字换掉就行。 */
const DEFAULT_LOOK = {
  boy: 'kid',            // 男童
  girl: 'kid',           // 女童（还没有女童的模型，暂借男童的）
  youth: 'youngman',     // 青年男子（没留胡须的）：伙计、学徒、书生、年轻的行人。专门生成的布衣青年（models/youngman.glb），不是任何剧情人物
  man: 'herb',           // 中年男子（留胡须的）：掌柜、郎中、账房
  fighter: 'shen',       // 带兵器的成年男子：兵丁、捕头、镖师、剑客、蒙面人
  woman: 'innkeeper',    // 成年女子
  oldman: 'tombkeeper',  // 老翁（须发花白）
  oldwoman: 'granny'     // 老妇
};
// 这几类的头像直接用默认人物的那张头像；其余的（借来的头像年纪对不上，或者默认人物自己也没有头像）照着模型拍一张
const DEFAULT_PHOTO = { boy: 1, girl: 1, man: 1, fighter: 1, woman: 1, oldwoman: 1 };
// 这个长相属于哪一类；野兽、灵体、长翅膀的魔相不是寻常人物，返回 null。L.cls 可以直接指定
function lookClass(L) {
  if (!L || L.k || L.wings) return null;
  if (L.cls) return L.cls;
  const n = parseInt(String(L.hair || '#000000').slice(1), 16), grey = ((n >> 16 & 255) + (n >> 8 & 255) + (n & 255)) / 765 > 0.5 && !L.aura;
  if ((L.sz || 1) < 0.8) return L.f ? 'girl' : 'boy';
  if (grey) return L.f ? 'oldwoman' : 'oldman';
  if (L.f) return 'woman';
  if (L.fierce || L.hat === 'helm' || L.hat === 'mask' || /^(sword|saber|dagger|spear)$/.test(L.wp || '')) return 'fighter';
  return L.beard ? 'man' : 'youth';
}
// 衣着、发式、兵器都一样的第一个人物：模型按它来找（身量、气焰不同不算，所以大一号的首领沿用原主的模型）
const lookSig = L => [L.robe, L.trim, L.sash, L.hair, L.hs, L.hat, L.wp, L.k].join('|');
let _lookOwner = null;
function lookOwner(L) {
  if (!_lookOwner) { _lookOwner = {}; for (const T of [CHARS, NPCS, ENEMIES]) for (const k in T) { const s = lookSig(T[k].look); if (!(s in _lookOwner)) _lookOwner[s] = k; } }
  return _lookOwner[lookSig(L)] || null;
}
// 这个长相用哪个模型：有专属的用专属的，没有的用所属那一类的默认模型；own = 是不是专属的
function lookModel(L) {
  const M = (typeof G3INDEX !== 'undefined' && G3INDEX.models) || {}, own = lookOwner(L);
  if (own && M[own]) return { id: own, own: true };
  const c = lookClass(L), d = c && DEFAULT_LOOK[c];
  return d && M[d] ? { id: d, own: false, cls: c } : null;
}

/* ============ 对手的大招 ============
   每一种对手、每一位首领各有一招压箱底的功夫：怒气攒满（出手、挨打都会涨）的下一手使出来，必中，使完怒气清零。
   小怪的大招比寻常招式重四五成；首领的更重，多半还带着异常状态。写法与 SKILLS 相同，另有：
     act  有模型的人形对手出这一招时播哪段动作（g3model.js 里 ACT 的名字）
   练手的苏青禾（su_spar）是开场教学，不设大招。 */
const ENEMY_ULTS = {
  // —— 山野、匪寨 ——
  bandit:     { name: '乱刀夺命', tgt: 'one', pow: 2.1, elem: 'phys', fx: 'heavy', act: 'heavy' },
  wolf:       { name: '群狼噬', tgt: 'one', pow: 1.05, hits: 2, elem: 'phys', fx: 'slash' },
  archer:     { name: '连珠箭', tgt: 'rand', pow: 0.85, hits: 3, elem: 'phys', fx: 'needle' },
  brute:      { name: '开山劈', tgt: 'one', pow: 2.4, elem: 'phys', fx: 'heavy', st: { id: 'stun', ch: 0.35, t: 1 }, act: 'slam' },
  thug:       { name: '泼皮乱拳', tgt: 'one', pow: 0.75, hits: 3, elem: 'phys', fx: 'slash' },
  pirate:     { name: '翻江刀', tgt: 'all', pow: 1.15, elem: 'phys', fx: 'wave', act: 'spin' },
  oarman:     { name: '铁桨横江', tgt: 'all', pow: 1.15, elem: 'phys', fx: 'wave', act: 'spin' },
  // —— 林间、洞窟 ——
  spider:     { name: '蚀骨毒牙', tgt: 'one', pow: 1.8, elem: 'poison', fx: 'slash', st: { id: 'poison', ch: 1, t: 3 } },
  bamboo:     { name: '万竹穿林', tgt: 'all', pow: 1.15, elem: 'wind', fx: 'needle' },
  miasma:     { name: '腐瘴弥天', tgt: 'all', pow: 1.1, elem: 'poison', fx: 'burst', st: { id: 'poison', ch: 0.8, t: 3 } },
  cavespider: { name: '结网缚杀', tgt: 'one', pow: 1.7, elem: 'poison', fx: 'needle', st: { id: 'stun', ch: 0.6, t: 1 } },
  // —— 幽烬盟 ——
  scout:      { name: '影杀', tgt: 'one', pow: 2.2, crit: 0.3, elem: 'dark', fx: 'slash', act: 'thrust' },
  spy:        { name: '袖里毒针', tgt: 'one', pow: 1.9, elem: 'poison', fx: 'needle', st: { id: 'poison', ch: 1, t: 3 } },
  dockspy:    { name: '暗桩毒刺', tgt: 'one', pow: 2.0, elem: 'poison', fx: 'slash', st: { id: 'poison', ch: 1, t: 3 }, act: 'thrust' },
  blade:      { name: '幽烬连斩', tgt: 'one', pow: 0.8, hits: 3, elem: 'dark', fx: 'slash', act: 'combo3' },
  swordman:   { name: '幽冥一剑', tgt: 'one', pow: 2.3, elem: 'dark', fx: 'heavy', act: 'thrust' },
  tidewatch:  { name: '守望绝剑', tgt: 'one', pow: 2.3, elem: 'dark', fx: 'heavy', act: 'thrust' },
  deathguard: { name: '舍身斩', tgt: 'one', pow: 2.5, elem: 'dark', fx: 'heavy', act: 'hammer' },
  ashguard:   { name: '烬火劈', tgt: 'one', pow: 2.2, elem: 'fire', fx: 'heavy', st: { id: 'burn', ch: 0.8, t: 3 }, act: 'hammer' },
  ashmage:    { name: '灰烬天降', tgt: 'all', pow: 1.25, elem: 'fire', fx: 'burst', st: { id: 'burn', ch: 0.6, t: 3 }, act: 'spell' },
  // —— 火、冰 ——
  firespirit: { name: '爆炎', tgt: 'all', pow: 1.2, elem: 'fire', fx: 'burst', st: { id: 'burn', ch: 0.6, t: 3 } },
  lizard:     { name: '熔岩翻涌', tgt: 'all', pow: 1.2, elem: 'fire', fx: 'burst', st: { id: 'burn', ch: 0.5, t: 3 } },
  magma:      { name: '核心迸裂', tgt: 'all', pow: 1.25, elem: 'fire', fx: 'burst', st: { id: 'burn', ch: 0.6, t: 3 } },
  lizard2:    { name: '赤鳞甩尾', tgt: 'all', pow: 1.2, elem: 'earth', fx: 'wave', st: { id: 'stun', ch: 0.2, t: 1 } },
  snowwolf:   { name: '雪原奔袭', tgt: 'one', pow: 1.1, hits: 2, elem: 'ice', fx: 'slash', st: { id: 'freeze', ch: 0.25, t: 1 } },
  frostwolf:  { name: '霜牙连噬', tgt: 'one', pow: 1.15, hits: 2, elem: 'ice', fx: 'slash', st: { id: 'freeze', ch: 0.3, t: 1 } },
  icesoul:    { name: '冰封千里', tgt: 'all', pow: 1.15, elem: 'ice', fx: 'burst', st: { id: 'freeze', ch: 0.25, t: 1 } },
  iceguard:   { name: '寒冰重锤', tgt: 'one', pow: 2.3, elem: 'ice', fx: 'heavy', st: { id: 'freeze', ch: 0.35, t: 1 }, act: 'hammer' },
  // —— 影、灵、俑 ——
  soulshade:  { name: '噬魂夺魄', tgt: 'all', pow: 1.2, elem: 'dark', fx: 'burst', st: { id: 'defDown', ch: 0.6, t: 3, v: 0.25 } },
  tideshade:  { name: '潮声唤魂', tgt: 'all', pow: 1.15, elem: 'dark', fx: 'burst', st: { id: 'defDown', ch: 0.6, t: 3, v: 0.25 } },
  swordsoul:  { name: '残剑鸣', tgt: 'rand', pow: 0.85, hits: 3, elem: 'sword', fx: 'slash' },
  tombguard:  { name: '镇冢一击', tgt: 'one', pow: 2.4, elem: 'earth', fx: 'heavy', st: { id: 'stun', ch: 0.35, t: 1 }, act: 'slam' },
  tgpawn:     { name: '石俑崩击', tgt: 'one', pow: 2.4, elem: 'earth', fx: 'heavy', st: { id: 'stun', ch: 0.35, t: 1 }, act: 'slam' },
  tgsoul:     { name: '机枢乱舞', tgt: 'rand', pow: 0.7, hits: 4, elem: 'sword', fx: 'slash' },
  // —— 落霞镇四郊 ——
  shanlang:   { name: '苍狼啸月', tgt: 'one', pow: 1.1, hits: 2, elem: 'phys', fx: 'slash' },
  yanxi:      { name: '岩甲冲撞', tgt: 'one', pow: 2.3, elem: 'earth', fx: 'heavy', st: { id: 'stun', ch: 0.3, t: 1 } },
  lanling:    { name: '岚气锁山', tgt: 'all', pow: 1.15, elem: 'wind', fx: 'burst', st: { id: 'defDown', ch: 0.5, t: 3, v: 0.25 } },
  ratboss:    { name: '连环暗弩', tgt: 'rand', pow: 0.8, hits: 4, elem: 'phys', fx: 'needle' },
  shuigui:    { name: '水鬼拖人', tgt: 'one', pow: 2.6, elem: 'phys', fx: 'heavy', st: { id: 'stun', ch: 0.4, t: 1 }, act: 'slam' },
  yashang:    { name: '云在脚下', tgt: 'all', pow: 1.5, elem: 'wind', fx: 'wave', act: 'judge' },

  // —— 首领 ——
  heifeng:    { name: '黑风灭顶', tgt: 'all', pow: 1.5, elem: 'phys', fx: 'wave', st: { id: 'stun', ch: 0.25, t: 1 }, act: 'spin' },
  tiebi:      { name: '熊撼山', tgt: 'one', pow: 2.5, elem: 'phys', fx: 'heavy', st: { id: 'stun', ch: 0.3, t: 1 }, act: 'slam' },
  thugboss:   { name: '过山虎扑', tgt: 'one', pow: 2.8, elem: 'phys', fx: 'heavy', st: { id: 'stun', ch: 0.4, t: 1 }, act: 'slam' },
  zhumu:      { name: '千眼天罗', tgt: 'all', pow: 1.25, elem: 'poison', fx: 'needle', st: { id: 'poison', ch: 0.7, t: 3 } },
  zhangmu:    { name: '瘴海无涯', tgt: 'all', pow: 1.5, elem: 'poison', fx: 'burst', st: { id: 'poison', ch: 1, t: 3 } },
  qianmian:   { name: '千面幻杀', tgt: 'rand', pow: 0.75, hits: 5, crit: 0.2, elem: 'dark', fx: 'slash', act: 'combo3' },
  chenzhou:   { name: '破釜沉舟', tgt: 'one', pow: 2.7, elem: 'phys', fx: 'heavy', st: { id: 'defDown', ch: 1, t: 3, v: 0.3 }, act: 'slam' },
  shi_duel:   { name: '焚天试刀', tgt: 'one', pow: 3.0, elem: 'fire', fx: 'heavy', st: { id: 'burn', ch: 1, t: 3 }, act: 'slam' },
  chiyan:     { name: '赤魇焚世', tgt: 'all', pow: 1.45, elem: 'fire', fx: 'burst', st: { id: 'burn', ch: 0.7, t: 3 }, act: 'spell' },
  yanlong:    { name: '地火奔流', tgt: 'all', pow: 1.6, elem: 'fire', fx: 'wave', st: { id: 'burn', ch: 0.8, t: 3 } },
  jianying:   { name: '一蓑烟雨', tgt: 'all', pow: 1.6, elem: 'sword', fx: 'wave', act: 'judge' },
  chaoying:   { name: '潮生潮灭', tgt: 'all', pow: 1.6, elem: 'dark', fx: 'wave', st: { id: 'stun', ch: 0.25, t: 1 }, act: 'spin' },
  langwang:   { name: '月下狼嚎', tgt: 'all', pow: 1.5, elem: 'ice', fx: 'wave', st: { id: 'freeze', ch: 0.25, t: 1 } },
  lingshuang: { name: '寒月葬雪', tgt: 'all', pow: 1.6, elem: 'ice', fx: 'wave', st: { id: 'freeze', ch: 0.3, t: 1 }, act: 'spin' },
  tgguard:    { name: '天工崩枢', tgt: 'all', pow: 1.7, elem: 'earth', fx: 'wave', st: { id: 'stun', ch: 0.3, t: 1 }, act: 'slam' },
  xuanzhu:    { name: '残烛燎天', tgt: 'all', pow: 1.6, elem: 'fire', fx: 'burst', st: { id: 'burn', ch: 0.9, t: 3 }, act: 'spell' },
  ye:         { name: '归墟无殇', tgt: 'one', pow: 3.2, crit: 0.15, elem: 'dark', fx: 'heavy', act: 'judge' },
  xx_su:      { name: '青鸾千羽 · 像', tgt: 'rand', pow: 0.8, hits: 6, elem: 'wind', fx: 'slash', act: 'combo3' },
  xx_bai:     { name: '万木凋零', tgt: 'all', pow: 1.5, elem: 'poison', fx: 'needle', st: { id: 'poison', ch: 1, t: 3 }, act: 'spell' },
  xx_hero:    { name: '万川归海 · 像', tgt: 'all', pow: 1.7, elem: 'sword', fx: 'wave', act: 'judge' },
  moxiang:    { name: '万劫归墟', tgt: 'all', pow: 1.8, elem: 'dark', fx: 'wave', st: { id: 'defDown', ch: 0.7, t: 3, v: 0.25 } }
};
for (const id in ENEMY_ULTS) {
  if (!ENEMIES[id]) { console.error('ENEMY_ULTS: no such enemy ' + id); continue; }
  const k = 'u_' + id;
  SKILLS[k] = Object.assign({ id: k, cost: 0, ult: 1, kind: 'atk', desc: '【大招】' + ENEMIES[id].name + '压箱底的一招。' }, ENEMY_ULTS[id]);
  ENEMIES[id].ult = k;
}
// 外形借用别人的对手（泼皮、桨手之外，几种“换了名字的同类”）没有单列的，用同类的那一招
for (const id in ENEMIES) {
  const e = ENEMIES[id];
  if (e.ult || id === 'su_spar') continue;
  const twin = Object.keys(ENEMY_ULTS).find(k => ENEMIES[k] && ENEMIES[k].look === e.look) || (e.boss ? null : Object.keys(ENEMY_ULTS).find(k => ENEMIES[k] && !ENEMIES[k].boss && ENEMIES[k].look && e.look && ENEMIES[k].look.k === e.look.k && e.look.k));
  if (twin) e.ult = 'u_' + twin;
}

/* ============ 数值重构：装备品级与对手等级 ============
   装备不再各写各的加成数值，只写“品级 ilv + 占该品级基准的比例”（core.js 的 gearStats 折成数值）：
     兵刃：攻击 +30% 基准（针略低，另加内力）；护甲：防御 +35%、气血 +8%；饰品：约 8% 战力的单项特化。
     商店里的兵刃护甲每四级一档（1 / 5 / 9 / 13 / 17 / 21 / 25），队伍练到差一级时上架；旧装备的数值不变，对手却在长，自然落伍。
     ilv 为 0 的（任务与首领给的独特装备、所有饰品）随佩戴者的等级成长，不会过时。
   攻击 / 防御 / 气血 写的是比例，spdp 是自身速度的百分比，其余（内力、暴击、暴伤、闪避、武学威力）照原数。 */
Object.assign(ITEMS, {
  sw6: { name: '照夜剑', type: 'weapon', wt: 'sword', price: 4200, shop: 'smith' },
  sw7: { name: '归真剑', type: 'weapon', wt: 'sword', price: 6000, shop: 'smith' },
  sb4: { name: '裂穹刀', type: 'weapon', wt: 'saber', price: 6100, shop: 'smith' },
  nd5: { name: '九曜针', type: 'weapon', wt: 'needle', price: 4100, shop: 'smith' },
  nd6: { name: '回天针', type: 'weapon', wt: 'needle', price: 5900, shop: 'smith' },
  ar6: { name: '玄铁甲', type: 'armor', price: 2400, shop: 'smith' },
  ar7: { name: '流云锦甲', type: 'armor', price: 3600, shop: 'smith' }
});
const GEAR = {
  sw1: { ilv: 1, atk: 0.30 }, sw2: { ilv: 5, atk: 0.30 }, sw3: { ilv: 9, atk: 0.30 }, sw4: { ilv: 13, atk: 0.30 }, sw5: { ilv: 17, atk: 0.30 }, sw6: { ilv: 21, atk: 0.30 }, sw7: { ilv: 25, atk: 0.30 },
  sb1: { ilv: 13, atk: 0.31 }, sb2: { ilv: 17, atk: 0.31 }, sb3: { ilv: 21, atk: 0.31 }, sb4: { ilv: 25, atk: 0.31 },
  nd1: { ilv: 5, atk: 0.26, mmp: 10 }, nd2: { ilv: 9, atk: 0.26, mmp: 16 }, nd3: { ilv: 13, atk: 0.26, mmp: 22 }, nd4: { ilv: 17, atk: 0.26, mmp: 28 }, nd5: { ilv: 21, atk: 0.26, mmp: 34 }, nd6: { ilv: 25, atk: 0.26, mmp: 40 },
  ar1: { ilv: 1, def: 0.35, mhp: 0.08 }, ar2: { ilv: 5, def: 0.35, mhp: 0.08 }, ar3: { ilv: 9, def: 0.35, mhp: 0.08 }, ar4: { ilv: 13, def: 0.35, mhp: 0.08 }, ar6: { ilv: 17, def: 0.35, mhp: 0.08 }, ar7: { ilv: 21, def: 0.35, mhp: 0.08 }, ar5: { ilv: 25, def: 0.35, mhp: 0.08 },
  // 独特兵刃：随主人成长
  swX: { ilv: 0, atk: 0.30, spd: 3 }, sbX: { ilv: 0, atk: 0.31, crit: 6 },
  // 商店饰品
  ac1: { ilv: 0, mhp: 0.10 }, ac2: { ilv: 0, spdp: 0.08 }, ac3: { ilv: 0, mmp: 30 }, ac4: { ilv: 0, atk: 0.12 },
  acS: { ilv: 0, crit: 6, cdmg: 15 }, acT: { ilv: 0, spdp: 0.05, dodge: 6 }, acU: { ilv: 0, mmp: 30, skl: 10 },
  // 任务、首领、问剑台的饰品
  acA: { ilv: 0, mhp: 0.12, def: 0.15 }, acB: { ilv: 0, mmp: 40, def: 0.25 }, acC: { ilv: 0, atk: 0.12, spdp: 0.08 }, acD: { ilv: 0, atk: 0.10, crit: 5 },
  acE: { ilv: 0, mhp: 0.12, skl: 8 }, acF: { ilv: 0, def: 0.30, mhp: 0.10 }, acG: { ilv: 0, spdp: 0.08, crit: 8, dodge: 4 },
  tk1: { ilv: 0, atk: 0.06, spdp: 0.04 }, tk2: { ilv: 0, atk: 0.10, crit: 6 }, tk3: { ilv: 0, atk: 0.13, crit: 8, cdmg: 20 }, tk4: { ilv: 0, atk: 0.15, mhp: 0.12, crit: 10, dodge: 5 },
  acQ: { ilv: 0, atk: 0.12, spdp: 0.07, crit: 8 }, acZ: { ilv: 0, mhp: 0.16, mmp: 30, skl: 10 }, acL: { ilv: 0, def: 0.30, mhp: 0.12, dodge: 3 }, acW: { ilv: 0, mmp: 40, skl: 14, crit: 4 },
  acR: { ilv: 0, mhp: 0.12, def: 0.15 }, acO: { ilv: 0, mmp: 30, def: 0.20, skl: 6 }, acY: { ilv: 0, spdp: 0.08, dodge: 6, crit: 6 }, acH: { ilv: 0, mmp: 40, mhp: 0.10, skl: 8 }
};
(o => { for (const k in o) ITEMS[k].price = o[k]; })({ ar5: 5200, sb1: 1700, sb2: 2900, sb3: 4300 });
for (const k in ITEMS) { ITEMS[k].id = k; if (GEAR[k]) { ITEMS[k].g = GEAR[k]; delete ITEMS[k].st; } }

/* 精英的词缀：每张关卡图上有一两拨对手由一名精英带队（地图上头顶有金色的名号，可以绕开）。
   精英比这张图的寻常对手高两级，有架势条、会蓄势放大招，另带一个词缀——有一项长处，就有一项短处，综合战力不变：
     hp / atk / def / spd 是倍率，dodge 是加上去的闪避，venom 是出手致毒的几率，leech 是把造成伤害的几成吸成自己的气血。 */
const AFFIX = {
  iron:  { n: '铁布衫', def: 1.2, spd: 0.92 },
  fury:  { n: '狂刀', atk: 1.15, hp: 0.9 },
  swift: { n: '轻功', dodge: 0.1, hp: 0.88 },
  venom: { n: '淬毒', venom: 0.5, atk: 0.9 },
  leech: { n: '嗜血', leech: 0.15, def: 0.9 }
};

/* 招式精进：十五、二十、二十五、三十级各有一次，把一门已经会的招式往两个方向里选一个练深（人物页里选，选了不能改）。
   mod 里写的是改动：powK 威力倍率；hits / crit / heal / cleanse / pow 直接换成新值；st、buff 与原来的合并；buff2 另加一个增益；
   poiseK 削架势的倍率；mpBack 出招后回复的内力。见 core.js 的 memberMods / modSkill。 */
const REFINE_LV = [15, 20, 25, 30];
const REFINE = {
  hero: [
    { sk: 'h1', opts: [{ n: '细雨穿甲', d: '斜风细雨有六成几率破甲。', mod: { st: { id: 'defDown', ch: 0.6, t: 3, v: 0.25 } } }, { n: '雨歇气回', d: '斜风细雨出手后回复 5 点内力。', mod: { mpBack: 5 } }] },
    { sk: 'h4', opts: [{ n: '叠浪', d: '惊涛拍岸的威力提高两成。', mod: { powK: 1.2 } }, { n: '回澜', d: '惊涛拍岸有三成几率震晕对手（对首领则多削一倍架势）。', mod: { st: { id: 'stun', ch: 0.3, t: 1 } } }] },
    { sk: 'h5', opts: [{ n: '星垂', d: '天河倒悬的暴击几率再加两成。', mod: { crit: 0.4 } }, { n: '破军', d: '天河倒悬多削五成架势。', mod: { poiseK: 1.5 } }] },
    { sk: 'h3', opts: [{ n: '云深', d: '云岚心法的攻击提升由三成加到四成半。', mod: { buff: { v: 0.45 } } }, { n: '岚生', d: '云岚心法回复的气血由一成八加到三成。', mod: { heal: 0.3 } }] }
  ],
  su: [
    { sk: 's1', opts: [{ n: '双柳', d: '拂柳式连出两剑，每剑七成八的威力。', mod: { hits: 2, powK: 0.78 } }, { n: '惊鸿', d: '拂柳式的暴击几率加两成半。', mod: { crit: 0.25 } }] },
    { sk: 's2', opts: [{ n: '雪满弓刀', d: '流风回雪必定破甲。', mod: { st: { ch: 1 } } }, { n: '回风', d: '流风回雪的威力提高两成。', mod: { powK: 1.2 } }] },
    { sk: 's4', opts: [{ n: '穿云', d: '飞燕穿帘的威力提高两成。', mod: { powK: 1.2 } }, { n: '破帘', d: '飞燕穿帘多削五成架势。', mod: { poiseK: 1.5 } }] },
    { sk: 's3', opts: [{ n: '月长', d: '踏月步多持续一回合。', mod: { buff: { t: 4 } } }, { n: '月明', d: '踏月步同时提升两成攻击。', mod: { buff2: { id: 'atkUp', v: 0.2, t: 3 } } }] }
  ],
  bai: [
    { sk: 'b1', opts: [{ n: '渡厄', d: '银针渡穴的回复量提高两成半。', mod: { powK: 1.25 } }, { n: '清络', d: '银针渡穴同时祛除异常状态。', mod: { cleanse: 1 } }] },
    { sk: 'b2', opts: [{ n: '入骨', d: '蚀骨针必定致毒，毒多持续一回合。', mod: { st: { ch: 1, t: 4 } } }, { n: '透穴', d: '蚀骨针的威力提高三成。', mod: { powK: 1.3 } }] },
    { sk: 'b4', opts: [{ n: '春深', d: '青囊回春的回复量提高两成。', mod: { powK: 1.2 } }, { n: '春雨', d: '青囊回春同时祛除全体的异常状态。', mod: { cleanse: 1 } }] },
    { sk: 'b6', opts: [{ n: '花重', d: '漫天花雨的威力提高两成半。', mod: { powK: 1.25 } }, { n: '花毒', d: '漫天花雨必定致毒。', mod: { st: { ch: 1 } } }] }
  ],
  shi: [
    { sk: 't1', opts: [{ n: '开碑', d: '裂石刀的威力提高两成。', mod: { powK: 1.2 } }, { n: '震石', d: '裂石刀有三成几率震晕对手（对首领则多削一倍架势）。', mod: { st: { id: 'stun', ch: 0.3, t: 1 } } }] },
    { sk: 't2', opts: [{ n: '铜墙', d: '铁壁功的防御提升由五成加到七成。', mod: { buff: { v: 0.7 } } }, { n: '吐纳', d: '铁壁功同时回复一成二的气血。', mod: { heal: 0.12 } }] },
    { sk: 't4', opts: [{ n: '崩岳', d: '崩山击的威力提高两成。', mod: { powK: 1.2 } }, { n: '撼势', d: '崩山击多削六成架势。', mod: { poiseK: 1.6 } }] },
    { sk: 't5', opts: [{ n: '烈阳高照', d: '烈阳护体的防御提升由三成加到四成半。', mod: { buff: { v: 0.45 } } }, { n: '余晖', d: '烈阳护体多持续两回合。', mod: { buff: { t: 5 } } }] }
  ]
};

/* 针对性的护身之物：同一位首领手下连败两回，铁老三会教一个法子（story.js 的 counterTalk）——去那一带再打赢三拨对手、带回兵刃残片，
   他给打两件专防那位首领大招那一系的饰品。res 里写的那一系伤害减少两成半（与对手的“抵抗”同一个算法，见 core.js 的 calcDamage）。 */
Object.assign(ITEMS, {
  ctr_fire:   { name: '避火珠', type: 'acc', price: 0, desc: '铁老三用炉底的冷灰炼的珠子，握着发凉。' },
  ctr_ice:    { name: '暖玉佩', type: 'acc', price: 0, desc: '在炉边煨了三天的一块玉，贴身戴着，寒气近不了身。' },
  ctr_poison: { name: '辟毒囊', type: 'acc', price: 0, desc: '杜大夫配的药末，铁老三缝的囊。瘴毒近身先淡三分。' },
  ctr_dark:   { name: '明心符', type: 'acc', price: 0, desc: '一小片磨亮的铜，刻着“守心”二字。幽烬的功夫照上去会散。' },
  ctr_phys:   { name: '护心镜', type: 'acc', price: 0, desc: '巴掌大的一块熟铁，挡在心口。' },
  ctr_earth:  { name: '定岳佩', type: 'acc', price: 0, desc: '嵌着一粒山心石的铁佩，脚下发沉，站得住。' },
  ctr_sword:  { name: '藏锋佩', type: 'acc', price: 0, desc: '用断剑的剑脊磨的佩。剑气遇上它，像遇上同类，先让一步。' },
  ctr_wind:   { name: '定风珠', type: 'acc', price: 0, desc: '一粒沉得出奇的铁丸。风再大，衣角也不怎么动。' }
});
for (const k of ['fire', 'ice', 'poison', 'dark', 'phys', 'earth', 'sword', 'wind']) { ITEMS['ctr_' + k].id = 'ctr_' + k; ITEMS['ctr_' + k].g = { ilv: 0, mhp: 0.06, res: [k] }; }

/* 各位首领自己的机制（core.js 的 mechTurn / mechDo 与 resolveAction 里各处的钩子）。一位首领可以有几样：
     rally   每隔 every 手、有帮手倒下时，蓄一手把倒下的帮手叫回来（气血 hp 成）。蓄的那一手里打出破绽就作罢。
     mend    每隔 every 手、气血不满九成时，蓄一手给自己回 heal 成气血。打出破绽、或者用它怕的那一系招式打中它，就作罢。
     stance  每隔 every 手摆出反击的架势，到它下一手之前：单体招式打上去会被还一击（威力 pow），群体招式不受影响。
     guarded 帮手还站着时，它受到的伤害减去这么多。           armor  防御乘这么多；身上有“破甲”时这层重甲整个失效。
     regen   每个还站着的帮手，每到它出手时给它回这么多气血。   longCharge / ultK  大招要蓄这么多手才放，威力再乘 ultK。
     ultSt   蓄势的大招打中没有防御的人，附带这个异常。         drain  每隔 every 手，蓄一手之后吸干我方所有人的怒气。
     yield   气血降到这么多就认输（点到为止的切磋）。           mirror 心像：气血与攻击照着队伍眼下的数值来，练级压不过；who 是它照着谁的模样。
     phases  气血降到这些比例时换一个阶段（挣脱异常、架势回满、攻击再涨一成）；seals 是每个阶段可以请一块璇玑玉封住的招式。 */
const BOSS_MECH = {
  zhumu:      { rally: { n: '产卵', every: 3, hp: 0.5 } },
  tiebi:      { guarded: 0.3 },
  qianmian:   { guarded: 0.4 },
  zhangmu:    { mend: { n: '聚瘴成形', every: 3, heal: 0.12 } },
  chenzhou:   { rally: { n: '水寨号令', every: 3, hp: 0.5 } },
  shi_duel:   { stance: { n: '铁壁反震', every: 3, pow: 1.0 }, yield: 0.5 },
  chiyan:     { longCharge: 2, ultK: 1.35 },
  yanlong:    { armor: 1.6 },
  jianying:   { stance: { n: '剑意回响', every: 3, pow: 1.2 } },
  chaoying:   { ultSt: { id: 'stun', ch: 0.75, t: 1 } },
  lingshuang: { mend: { n: '寒月凝华', every: 4, heal: 0.1 }, armor: 1.3 },
  langwang:   { rally: { n: '月下唤群', every: 3, hp: 0.5 } },
  tgguard:    { armor: 1.5, rally: { n: '机关重组', every: 4, hp: 0.4 } },
  xuanzhu:    { regen: 0.02 },
  ye:         { drain: { n: '归墟引', every: 3 } },
  xx_su:      { mirror: 1, who: 'su' },
  xx_bai:     { mirror: 1, who: 'bai' },
  xx_hero:    { mirror: 1, who: 'hero' },
  moxiang:    { phases: [0.66, 0.33], seals: [['jade1', 'm_eat'], ['jade2', 'm_still'], ['jade3', 'm_all'], ['jade4', 'y_gate']] },
  yashang:    { yield: 0.4 }
};
Object.assign(STATUS, { counter: { n: '反击', c: '#ffb0b0' } });

/* 对手的等级（等级带）。每张图“该在几级来”记作 L（story.js 的 MAPLV）：路上的对手 L-1，精英 L+1，首领 L+2——
   按时打到关底的队伍大约也是 L+2，所以首领与队伍同级；最后的心像与魔相高出一级。
   ENEMIES 里原先写的 lv 记到 lv0（只用来折算速度，见 core.js 的 enemyShape）。 */
const ENEMY_LV = {
  su_spar: 1, bandit: 1, wolf: 1, heifeng: 4,                                   // 青岚山道 L2
  spider: 4, bamboo: 4, scout: 4, zhumu: 7,                                     // 万竹林 L5
  archer: 5, brute: 5, tiebi: 8, thug: 4, thugboss: 6, ratboss: 6,              // 黑风寨 L6、落霞镇、稻香村
  pirate: 7, spy: 7, qianmian: 10,                                              // 烟雨渡 L8
  miasma: 8, cavespider: 8, zhangmu: 11, shuigui: 10,                           // 药王洞 L9、藕花村
  oarman: 10, dockspy: 10, chenzhou: 13, shanlang: 10, yanxi: 10, lanling: 10, yashang: 13,   // 沉舟坞、摩云岭 L11
  firespirit: 11, lizard: 11, blade: 11, shi_duel: 13, chiyan: 14,              // 赤焰谷 L12
  magma: 12, lizard2: 12, yanlong: 15,                                          // 炼火窟 L13
  swordsoul: 14, tombguard: 14, jianying: 17,                                   // 断剑崖 L15
  tideshade: 17, tidewatch: 17, chaoying: 20,                                   // 栖霞旧镇 L18
  snowwolf: 18, icesoul: 18, swordman: 18, lingshuang: 21, frostwolf: 18, iceguard: 18, langwang: 21,   // 寒月雪岭、冰魄窟 L19
  tgpawn: 20, tgsoul: 20, tgguard: 23,                                          // 天工墟 L21
  ashguard: 22, ashmage: 22, xuanzhu: 25,                                       // 幽烬城 L23
  deathguard: 24, soulshade: 24, ye: 27,                                        // 归墟 L25
  xx_su: 29, xx_bai: 29, xx_hero: 29, moxiang: 30                               // 心渊 L27
};
for (const k in ENEMIES) { const e = ENEMIES[k]; e.lv0 = e.lv; if (ENEMY_LV[k]) e.lv = ENEMY_LV[k]; else console.warn('ENEMY_LV: no level for ' + k); }
