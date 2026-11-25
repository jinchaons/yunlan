'use strict';
/* ============ 江湖：人物好感与赠礼、路遇奇事 ============
   这两套系统不依赖 AI：没有接网关时用写好的文字；接了网关，奇遇的叙述和人物对你的态度由 AI 临场发挥。
   数值（给什么、扣什么、打谁）始终由这里的代码决定，AI 只负责措辞。 */
const Jianghu = (() => {
  /* ---------- 好感 ---------- */
  // [起始值, 称呼, 店铺折扣]
  const LV = [[0, '生疏', 0], [25, '相识', 0.05], [45, '熟络', 0.1], [70, '莫逆', 0.15]];
  // 四档交情各自的口吻和肯说到哪一步（写给 AI；没开 AI 时的现成台词在 talks.js，也是照这四档写的）
  const ATT = ['把少侠当作头一回打交道的外人：客气而有所保留，只说场面话和自己这一行的事，不谈私事，不替人拿主意；称呼用最客套的那一种。',
    '已经认得这位少侠：态度和气，愿意多聊几句，会顺口说说近来的见闻和自己这一行的门道，偶尔打趣；自己的私事点到为止。',
    '把少侠当作信得过的晚辈或朋友：说话随意亲近，肯讲自己的旧事、难处和私下才说的话，会主动叮嘱、提醒几句。',
    '视少侠为自己人：说话毫无保留，言语间处处关照，肯托付心事、说掏心窝的话；称呼也比平日更亲。'];
  // base 初始好感；likes 喜欢的礼物；money 喜欢银两；secret 熟络之后才肯说的话（AI 交谈时用）；
  // r2 / r3：好感到“熟络”“莫逆”时的回赠 { say, items, gold, pt: [角色, 属性点], at: [角色, 属性, 点数] }
  const P = {
    gu: { base: 45, likes: ['mp2', 'mp1'], secret: '归墟里的东西最怕纯正的剑气，毒对它无用；夜无殇的剑路出自听雨阁，他起手总比常人偏左三寸。',
      r2: { say: '这几粒凝神丹是为师自己炼的，带在身上。山下不比山上，没人替你护法。', items: [['mp2', 3]] },
      r3: { say: '听雨剑法剩下的那三分，为师说过在江湖里。今日看你出剑，已有两分了——剩下一分，为师替你点破。', pt: ['hero', 3] } },
    innkeeper: { base: 20, likes: ['potion2', 'mp1'], money: 1, secret: '铁匠铺的铁老三嘴硬心软，多照顾他几回生意，他会给老主顾让利；药铺的杜大夫也是一样。',
      r2: { say: '客官是小店的老主顾了，往后住店只收您一半房钱！', items: [['potion2', 2]] },
      r3: { say: '什么钱不钱的！往后客官来了，上房热水管够，分文不取。这颗续命丹您收着，是我压箱底的。', items: [['revive', 2]] } },
    teller: { base: 20, likes: ['mp1'], money: 1, secret: '赤魇那一身魔焰最怕风；寒月宫的凌霜和雪岭上的狼都怕火；万竹林的蛛母也怕火；幽烬盟的探子身法滑溜，却经不住重手。',
      r2: { say: '客官是知音。老朽这里有几样走江湖攒下的小玩意儿，您拿去防身。', items: [['antidote', 3], ['mp1', 3]] },
      r3: { say: '说了一辈子别人的故事，头一回想把这枚玉送给故事里的人。客官，您可得让老朽把这段书说圆了。', items: [['ac3', 1]] } },
    shen: { base: 25, likes: ['potion2', 'revive'], secret: '走镖的规矩：打不过的先打跟班，再围首领；首领一旦红了眼，下手会重上三成，那时宁可防御一轮。',
      r2: { say: '小兄弟，这是镖局的一点心意。出门在外，盘缠要带足。', gold: 400 },
      r3: { say: '这枚虎魄坠跟了我二十年镖路。如今我走不动远镖了，你替我戴着它去见见世面。', items: [['ac4', 1]] } },
    smith: { base: 15, likes: ['potion2', 'mp1'], secret: '兵刃要趁手，不在贵；饰品里带“暴击”“闪避”的，比光加攻击的更值。',
      r2: { say: '老主顾了，往后来我这儿拿东西，给你打个折。别往外说！', items: [['potion2', 2]] },
      r3: { say: '这副甲是给我自己预备的，一直没舍得穿。拿去，别死在外头，不然谁来照顾老子生意。', items: [['ar4', 1]] } },
    herb: { base: 20, likes: ['antidote', 'mp1'], secret: '中毒和灼烧拖久了比一刀还狠，清心散要常备；眩晕和冰封防不住，就让石破军把人嘲讽过去。',
      r2: { say: '少侠常来常往，老朽的药往后给你算便宜些。这几包清心散先拿着。', items: [['antidote', 4]] },
      r3: { say: '这是老朽照古方配的九转还丹，一共就成了三粒，都给你。', items: [['potion3', 3]] } },
    disciple: { base: 50, likes: ['potion1', 'mp1'], money: 1,
      r2: { say: '师兄！这是我偷偷攒的金创药，都给你！你可要平平安安回来呀。', items: [['potion1', 4]] },
      r3: { say: '师兄，师父教我的吐纳口诀，我背给你听——咦，你怎么好像一下子就懂了？', pt: ['hero', 2] } },
    kid: { base: 30, likes: ['potion1'], money: 1,
      r2: { say: '大哥哥，这个平安符给你！阿娘说戴着它，坏人就打不着啦！', items: [['ac1', 1]] },
      r3: { say: '大哥哥，我把我的好运气分你一半！拉钩！', at: ['hero', 'luk', 2] } },
    granny: { base: 35, likes: ['potion1', 'antidote'],
      r2: { say: '年轻人，老婆子熬了些药汤装在瓶里，路上喝。', items: [['potion2', 3]] },
      r3: { say: '老婆子眼花了，这件软甲缝了三个月。穿在里头，暖和，也挡刀。', items: [['ar3', 1]], at: ['hero', 'con', 1] } },
    woodman: { base: 25, likes: ['potion1'], money: 1, secret: '山道上的狼怕火；山贼里使弓的最要先收拾，他们专挑气血少的人射。',
      r2: { say: '小兄弟是好人。这点伤药是我上回从镇上带的，你拿着。', items: [['potion1', 3], ['antidote', 1]] },
      r3: { say: '这是我在山里捡到的，瞧着不像凡物，我一个砍柴的留着没用。', items: [['revive', 1]], gold: 200 } },
    gatherer: { base: 25, likes: ['antidote', 'potion1'], secret: '林子里的蜘蛛和竹灵都怕火；药王洞里的瘴气怕风也怕火，寻常毒物伤不了它。',
      r2: { say: '年轻人，这几味解毒的药你带着，林子里用得上。', items: [['antidote', 3]] },
      r3: { say: '老头子采了一辈子药，这两粒是压箱底的。白芷那孩子，就托付给你们了。', items: [['potion3', 2]] } },
    lie: { base: 15, likes: ['mp2', 'potion3'], show: s => s.flags.fireDone, secret: '熔岩里长大的东西皮糙肉厚，偏偏怕剑；谷里的火灵怕风。寒月宫那位……咳，她的徒弟怕火。',
      r2: { say: '哼，你小子还算懂事。拿去，谷里的凝神丹，比山外的强十倍。', items: [['mp2', 3]] },
      r3: { say: '破军那小子认你这个朋友，老夫也认。这套赤焰谷的吐纳法门，你替我转教给他——老夫当面教，他不肯好好听。', pt: ['shi', 3] } },
    boatman: { base: 20, likes: ['potion2', 'mp1'], money: 1, show: s => s.flags.bambooDone, secret: '渡口那些戴面具的人身法滑，怕的是沉手的重招；水匪一身湿气，最怕火攻。',
      r2: { say: '后生，老汉在河上捞起来的，瞧着是好东西，你拿去用。', items: [['potion2', 3]] },
      r3: { say: '这块佩子是当年一位过河的剑客抵的船钱，说日后来赎，再没来过。老汉留着没用，给你吧。', items: [['acT', 1]] } },
    lampwoman: { base: 25, likes: ['potion1', 'antidote'], money: 1, show: s => s.flags.bambooDone, secret: '崖上、雪里那些没有血肉的影子，寻常刀剑砍不疼；用沉手的、带土石之力的招式，才打得散。',
      r2: { say: '后生心善。老婆子没别的，这盏小灯你带着，走夜路的时候，心里亮堂。', items: [['mp2', 2]], at: ['hero', 'luk', 1] },
      r3: { say: '老婆子扎了一辈子灯，这是最后一盏好的。不写名字，等你想好了，自己写。', items: [['acS', 1]] } },
    tombkeeper: { base: 20, likes: ['potion2', 'mp2'], show: s => s.flags.cliffOpen, secret: '崖顶那影子使的是少爷二十岁时的剑，一往无前，从不回守——它不怕剑，却怕沉猛的重手和火。',
      r2: { say: '小少爷肯听老奴唠叨这些旧事……这是少爷从前用剩的伤药，老奴一直收着。', items: [['potion3', 2]] },
      r3: { say: '少爷留下的剑谱，老奴不识字，看不懂。小少爷替他看看吧——他从前，也是想把剑教给人的。', pt: ['hero', 3] } },
    jin: { base: 20, likes: ['potion2', 'mp1'], money: 1, secret: '城里那伙泼皮只会仗着人多，先放倒领头的，剩下的自己就散；他最怕身法快的。',
      r2: { say: '少侠是醉仙楼的贵客！这几丸药是南来的行商抵的酒钱，少侠拿去。', items: [['potion2', 3]] },
      r3: { say: '小店开了二十年，头一回给人留雅座。这枚佩子是位老主顾押在柜上的，一直没回来取，少侠戴着，比锁在柜里强。', items: [['ac2', 1]], gold: 300 } },
    qian: { base: 15, likes: ['mp2', 'antidote'], money: 1, show: s => s.flags.bambooDone, secret: '典当行里有句话：饰物要看“眼”。带暴击、闪避字样的，比只加气血的值钱得多。',
      r2: { say: '少侠是信得过的人。这几样是过了期的死当，放着也是落灰。', items: [['mp2', 2], ['revive', 1]] },
      r3: { say: '这块凝神玉在柜上压了十年，没人识货。少侠内力见长，正好用得上。', items: [['ac3', 1]] } },
    captain: { base: 15, likes: ['potion2', 'revive'], secret: '幽烬盟的细作身法滑，却不耐打，最怕沉手的重招；蒙面刀客怕风。夜里别走城隍庙后巷。',
      r2: { say: '少侠替城里出过力，衙门记着。这是库里的伤药，拿去。', items: [['potion2', 2], ['antidote', 2]] },
      r3: { say: '秦某当差二十年，这手擒拿的窍门从不外传。少侠看好了——只演一遍。', pt: ['hero', 2] } },
    miaozhu: { base: 25, likes: ['potion1', 'antidote'], money: 1, secret: '归墟里的东西是“无影之物”，寻常毒药伤不了它，倒是怕纯正的剑气。老朽是听上一任庙祝说的。',
      r2: { say: '施主心善，城隍爷看着呢。这道符是老朽亲手画的。', items: [['ac1', 1]], at: ['hero', 'luk', 1] },
      r3: { say: '老朽守了一辈子庙，只攒下这两粒丹药。施主要走的路比老朽远，带上吧。', items: [['potion3', 2]] } },
    huaniang: { base: 25, likes: ['potion1'], money: 1,
      r2: { say: '少侠又来看我们娘俩了。这是自家晒的药草，路上泡水喝。', items: [['antidote', 3]] },
      r3: { say: '小满她爹留下的这双鞋，一次也没穿过。少侠脚程远，穿上它，替他多走些路吧。', items: [['acT', 1]] } },
    keeper: { base: 10, likes: [], show: s => s.flags.ch1, secret: '问剑台上的对手都有破绽：先看它怕什么，再决定让谁出手；首领红眼之后，守一轮比抢一刀要紧。',
      r2: { say: '后生，你的剑有点意思了。这一式，老夫只演一遍。', pt: ['hero', 2] },
      r3: { say: '老夫守了半辈子台，等的就是一个肯把剑练到这份上的人。你们几个，都过来。', ptAll: 1 } }
  };
  const has = who => !!P[who];
  const aff = who => { const a = (S.aff = S.aff || {}); return a[who] == null ? P[who].base : a[who]; };
  const lvI = v => { let i = 0; for (let k = 0; k < LV.length; k++) if (v >= LV[k][0]) i = k; return i; };
  const level = who => LV[lvI(aff(who))];
  const nameOf = who => whoIs(who).name;
  function add(who, n, quiet) {
    if (!S || !has(who) || !n) return;
    const a0 = aff(who), a1 = clamp(a0 + n, 0, 100); S.aff[who] = a1;
    if (lvI(a1) > lvI(a0)) { Sfx.play('lvup'); toast('与<b>' + nameOf(who) + '</b>的交情更进一步：<b>' + LV[lvI(a1)][1] + '</b>'); }
    else if (!quiet && a1 !== a0) toast('<b>' + nameOf(who) + '</b> 好感 ' + (n > 0 ? '+' : '') + (a1 - a0));
  }
  // 好感到了门槛，对方回赠一次（在一次交谈结束时调用）
  async function rewards(who) {
    if (!has(who)) return;
    for (const i of [2, 3]) {
      const key = 'af_' + who + '_' + i, r = P[who]['r' + i];
      if (!r || S.flags[key] || lvI(aff(who)) < i) continue;
      S.flags[key] = 1;
      await say(who, r.say);
      for (const it of r.items || []) give(it[0], it[1]);
      if (r.gold) give('gold', r.gold);
      const pts = r.ptAll ? S.party.map(m => [m.id, r.ptAll]) : r.pt ? [r.pt] : [];
      for (const [id, n] of pts) { const m = fixMember(S.party.find(x => x.id === id) || S.party[0]); m.pt += n; toast('<b>' + (m.id === 'hero' ? S.name : CHARS[m.id].name) + '</b> 得到 ' + n + ' 点属性点'); }
      if (r.at) { const m = fixMember(S.party.find(x => x.id === r.at[0]) || S.party[0]); m.at[r.at[1]] += r.at[2]; toast('<b>' + (m.id === 'hero' ? S.name : CHARS[m.id].name) + '</b> 的' + ATTRS.find(a => a.k === r.at[1]).n + ' +' + r.at[2]); }
      Sfx.play('lvup'); UI.hud(); G.save();
    }
  }
  const discount = who => (S && has(who) ? level(who)[2] : 0);
  const price = (it, shop) => Math.max(1, Math.round(it.price * (1 - discount(shop))));
  const innFee = () => { const i = lvI(aff('innkeeper')); return i >= 3 ? 0 : i >= 2 ? 15 : 30; };
  // 赠礼：每个人在每一章里最多收四次
  async function gift(who) {
    const tier = G.tier(), key = who + '_' + tier, cnt = (S.giftN = S.giftN || {});
    if ((cnt[key] || 0) >= 4) { await say(who, who === 'keeper' ? '后生，老夫不缺这些。把心思放在剑上。' : '心意领了。近来收了你不少东西，可不敢再要了。'); return; }
    const ids = Object.keys(S.items).filter(id => S.items[id] > 0 && ITEMS[id].type === 'use').slice(0, 6), money = 50 * (tier + 1);
    const opts = ids.map(id => ITEMS[id].name + '（持有 ' + S.items[id] + '）');
    if (S.gold >= money) opts.push('银两 ' + money + ' 文');
    opts.push('算了');
    const c = await choose('送什么给' + nameOf(who) + '？', opts);
    if (c >= opts.length - 1) return;
    let liked;
    if (c < ids.length) { S.items[ids[c]]--; liked = P[who].likes.indexOf(ids[c]) >= 0; } else { S.gold -= money; liked = !!P[who].money; }
    cnt[key] = (cnt[key] || 0) + 1;
    await say(who, who === 'keeper' ? '……放下吧。' : liked ? '这正是我用得着的东西。有心了！' : '客气了，那我便收下。');
    add(who, who === 'keeper' ? 1 : liked ? 8 : 3); UI.hud();
  }
  // 没开 AI 时的闲谈：从 talks.js 里按眼下的交情挑一句这个人会说的话。每一章里头两回闲谈各添一点交情
  async function small(who) {
    const line = typeof Talks !== 'undefined' ? Talks.next(who) : null;
    if (!line) { await say(who, '……'); return; }
    await say(who, line);
    const key = who + '_' + G.tier(), cnt = (S.chatN = S.chatN || {});
    if ((cnt[key] || 0) < 2) { cnt[key] = (cnt[key] || 0) + 1; add(who, 1, true); }
  }
  // 交谈之后的选项：闲谈（接了 AI 是自由交谈，没接就是 talks.js 里的现成话）、赠礼
  async function after(who) {
    if (!has(who) || G.autoSkip) return;
    if (P[who].show && !P[who].show(S)) return;
    for (let i = 0; i < 8; i++) {
      const ai = typeof AI !== 'undefined' && AI.canTalk(who), can = ai || (typeof Talks !== 'undefined' && Talks.has(who)), opts = (can ? ['与' + nameOf(who) + '闲谈'] : []).concat(['赠礼', '告辞']);
      // 空格 = 闲谈，回车 = 告辞
      const c = opts[await UI.choose(nameOf(who) + '　交情：' + level(who)[1], opts, can ? { space: 0, enter: opts.length - 1 } : { enter: opts.length - 1 })];
      if (c === '赠礼') await gift(who); else if (c === '告辞') break; else if (ai) await AI.talk(who); else await small(who);
      await rewards(who);
      if (c !== '赠礼' && ai) break;   // AI 闲谈里告辞就是告辞，不再回到这个选项框；现成话可以接着再聊一句
    }
  }
  // 给 AI 交谈用：这个人现在对少侠是什么态度、肯不肯说私房话
  const attitude = who => (has(who) ? '\n【你对这位少侠的态度】交情：' + level(who)[1] + '。' + ATT[lvI(aff(who))] + (P[who].secret && lvI(aff(who)) >= 2 ? '\n【私下才说的话】少侠问到相关的事时，你可以用自己的口吻透露：' + P[who].secret : '') : '');
  function listHtml() {
    const rows = Object.keys(P).filter(w => !P[w].show || P[w].show(S)).map(w => {
      const v = aff(w), i = lvI(v), d = LV[i][2];
      return '<li><b>' + nameOf(w) + '</b>　' + LV[i][1] + '<span class="affbar"><i style="width:' + v + '%"></i></span>' + (d && (w === 'smith' || w === 'herb') ? '<small>　店里让利 ' + Math.round(d * 100) + '%</small>' : w === 'innkeeper' && i >= 2 ? '<small>　' + (i >= 3 ? '住店不收钱' : '住店半价') + '</small>' : '') + '</li>';
    });
    return '<div class="sub">人物交情</div><ul class="aff">' + rows.join('') + '</ul><p class="tip">与人交谈、赠礼、办成委托、常去光顾，交情都会加深。到了“熟络”“莫逆”，对方会有所回赠。</p>';
  }

  /* ---------- 路遇奇事 ---------- */
  Object.assign(NPCS, {
    ev_peddler: { name: '行脚商', look: { robe: '#8a6a3a', trim: '#e6d8b0', sash: '#5a3a2a', hair: '#3a2a22', hs: 'short', hat: 'bamboo', wp: 'staff' } },
    ev_traveler: { name: '负伤的旅人', look: { robe: '#7a8a9a', trim: '#dfe6ec', sash: '#4a5a6a', hair: '#2a2a2a', hs: 'top', wp: 'none' } },
    ev_rogue: { name: '蒙面人', look: { robe: '#3a3a3a', trim: '#8a2e2e', sash: '#8a2e2e', hair: '#111111', hs: 'hood', hat: 'mask', wp: 'dagger', wc: '#d0d0d8', fierce: 1 } },
    ev_hermit: { name: '白发异人', look: { robe: '#e6e2d6', trim: '#8a8a7a', sash: '#6a6a5a', hair: '#f0f0f0', hs: 'long', beard: 1, wp: 'staff' } },
    ev_duelist: { name: '游方剑客', look: { robe: '#4a6a8a', trim: '#e8e8f0', sash: '#c8a040', hair: '#1c1c22', hs: 'pony', wp: 'sword', wc: '#e0f0ff' } }
  });
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const partyLv = () => Math.max(1, Math.floor(S.party.reduce((s, m) => s + m.lv, 0) / S.party.length));
  const USE = [['potion1', 'antidote', 'mp1'], ['potion2', 'mp1', 'antidote'], ['potion2', 'mp2', 'revive'], ['potion3', 'mp2', 'revive'], ['potion3', 'mp2', 'revive']];
  const WARE = [['sw2', 'ar2', 'ac1'], ['ar2', 'ac2', 'sw2'], ['ac3', 'acS', 'ar3', 'sw3'], ['acT', 'acU', 'ar4', 'ac4'], ['acU', 'ar5', 'ac4']];
  const DUEL = [['bandit', 2.2], ['scout', 1.9], ['blade', 1.8], ['swordman', 1.8], ['deathguard', 1.9]];
  const QA = [
    { q: '你手中的剑，为何而出？', o: [['为护住身后的人', 'con'], ['为胜过昨日的自己', 'str'], ['为向这世道问个明白', 'wis']] },
    { q: '路有两条：一条平坦，一条险峻。你走哪条？', o: [['险的。近', 'agi'], ['平的。稳', 'con'], ['先掷一枚铜钱', 'luk']] },
    { q: '强敌当前，同伴已伤。你当如何？', o: [['挡在前面', 'con'], ['一剑求胜', 'str'], ['先想清楚它怕什么', 'wis']] }
  ];
  // 每种奇遇：roll 定下这一回的具体内容（数值在此决定）；desc / fields 是给 AI 的说明；text 是没有 AI 时用的文字
  const TPL = {
    peddler: {
      roll(t) { const id = pick(WARE[t]), it = ITEMS[id]; return { item: id, price: Math.round((it.price || 400) * 0.6) }; },
      desc: e => '一位行脚商在路边歇脚，向少侠兜售一件' + ITEMS[e.item].name + '，只要 ' + e.price + ' 文（市价六折），说是急着脱手换盘缠。',
      fields: { line: '行脚商招呼少侠、兜售这件东西时说的话', a: '少侠买下后，行脚商说的话', b: '少侠婉拒后，行脚商说的话' },
      text: e => ({ intro: '路边的树下支着一副货担，一位行脚商正拿斗笠扇着风。', line: '这位少侠留步！小人急着赶路，这件' + ITEMS[e.item].name + '便宜出了，只要 ' + e.price + ' 文。', a: '少侠好眼力！山高路远，后会有期。', b: '不妨事，买卖不成仁义在。' })
    },
    wounded: {
      roll(t) { return { reward: pick(USE[Math.min(4, t + 1)]), n: 2, coin: 30 + 30 * t }; },
      desc: e => '一名旅人负了伤，倚在路旁，气息微弱。少侠可以送他一份伤药，或留下 ' + e.coin + ' 文盘缠，也可以径自离开。若得了救助，他会拿出随身的' + ITEMS[e.reward].name + '相谢。',
      fields: { line: '负伤的旅人向少侠求助时说的话', a: '得到救助后，旅人道谢并拿出谢礼时说的话', b: '【旁白】少侠转身离开时的情景，一句话' },
      text: e => ({ intro: '路旁的石头上倚着一个人，衣襟上血迹未干。', line: '这位少侠……可否，借一口伤药……', a: '大恩不言谢。这点东西不成敬意，少侠务必收下。', b: '你没有回头。身后的喘息声，渐渐被风盖住了。' })
    },
    ambush: {
      roll(t, m) { return { group: pick(m.d.foes.groups), toll: Math.max(30, Math.round(S.gold * 0.1)), loot: pick(USE[t]), coin: 80 + 90 * t }; },
      desc: e => '一伙来路不明的人（或野兽）拦住了去路，为首的蒙面人索要 ' + e.toll + ' 文买路钱。少侠可以迎战，也可以破财消灾。对手是：' + e.group.map(id => ENEMIES[id].name).join('、') + '。',
      fields: { line: '蒙面人拦路索财时说的话', a: '【旁白】少侠打赢之后的情景，一句话', b: '少侠交了钱，蒙面人收钱放行时说的话' },
      text: e => ({ intro: '林子里忽然静了下来。前方的路中央，不知何时多了几道影子。', line: '此路不通。留下 ' + e.toll + ' 文，或者留下点别的。', a: '影子散了。地上落着他们没来得及带走的东西。', b: '识相。走吧，别回头。' })
    },
    bundle: {
      roll(t) { const r = Math.random(); return r < 0.5 ? { kind: 'gold', coin: 120 + 140 * t } : r < 0.78 ? { kind: 'item', item: pick(USE[Math.min(4, t + 1)]), n: 2 } : { kind: 'trap', coin: 60 + 60 * t }; },
      desc: e => '路边草丛里有一只不知谁遗落的包袱。少侠可以打开，也可以不动它。打开的结果是：' + (e.kind === 'gold' ? '里面是 ' + e.coin + ' 文银两' : e.kind === 'item' ? '里面是' + ITEMS[e.item].name : '这是个圈套，旁边埋伏着人，一场打斗在所难免') + '。',
      fields: { line: '【旁白】对这只包袱外观的描写，一句话', a: '【旁白】打开包袱之后看到的情景，一句话，要与上面的结果相符', b: '【旁白】少侠没有动它、继续赶路的情景，一句话' },
      text: e => ({ intro: '草丛里露出一角蓝布——是一只包袱，结打得很紧。', line: '包袱不大，却沉甸甸的，上面落着一层薄灰。', a: e.kind === 'gold' ? '里面是用油纸包好的银两，不知是谁的救命钱。' : e.kind === 'item' ? '里面整整齐齐码着几样东西，像是行医之人的行囊。' : '布结刚一松开，四周的草丛便动了。', b: '不是自己的东西，不动为好。你绕开它，继续赶路。' })
    },
    hermit: {
      once: 1,
      roll(t) { return { qa: Math.floor(Math.random() * QA.length) }; },
      desc: e => '一位白发异人独坐道旁，拦下少侠，只问了一个问题：“' + QA[e.qa].q + '”。少侠有三种回答：一、' + QA[e.qa].o[0][0] + '；二、' + QA[e.qa].o[1][0] + '；三、' + QA[e.qa].o[2][0] + '。无论怎么答，异人都会点拨一句，让少侠有所领悟。',
      fields: { line: '异人拦下少侠、开口问话之前说的一句话（不要把问题本身写进去）', a: '少侠给出第一种回答后，异人点拨的话', b: '少侠给出第二种回答后，异人点拨的话', c: '少侠给出第三种回答后，异人点拨的话' },
      text: () => ({ intro: '道旁的青石上坐着一位白发人，膝上横着一根竹杖，像是等了很久。', line: '年轻人，且慢走。老朽只问你一句话。', a: '好。记着这句话，它比任何护甲都结实。', b: '好。那就别停，一日也别停。', c: '好。肯问的人，迟早会得到回答。' })
    },
    duel: {
      roll(t) { return { foe: DUEL[t][0], k: DUEL[t][1], coin: 150 + 150 * t, loot: pick(USE[Math.min(4, t + 1)]) }; },
      desc: e => '一位游方剑客看出少侠身负武功，提出切磋一场，点到为止。少侠可以应战，也可以婉拒。赢了，他会留下 ' + e.coin + ' 文彩头。',
      fields: { line: '游方剑客提出切磋时说的话', a: '少侠赢了之后，剑客认输并留下彩头时说的话', b: '少侠婉拒之后，剑客说的话', c: '少侠输了之后，剑客说的话（点到为止，没有恶意）' },
      text: () => ({ intro: '一位背剑的旅人与你擦肩而过，走出几步，忽然停下了。', line: '阁下步子很稳，是练家子。相逢是缘，可愿指教一二？', a: '痛快！这是彩头，愿赌服输。他日再会，我必不同。', b: '可惜。那便后会有期。', c: '承让。阁下的底子不差，只是还欠些火候。' })
    }
  };
  const OFF = /[?&](test|sim|shot)\b/.test(location.search) && !/[?&]events=1/.test(location.search);
  let steps = 0, lastT = performance.now(), next = null;
  function prepare(force) {
    const m = World.map, t = Math.min(4, G.tier());
    let ids = Object.keys(TPL).filter(id => !(TPL[id].once && S.flags['ev_' + id + '_' + t]));
    const id = force && TPL[force] ? force : pick(ids), ev = Object.assign({ id, map: m.id }, TPL[id].roll(t, m));
    ev.text = TPL[id].text(ev);
    next = ev;
    if (typeof AI !== 'undefined' && AI.on) AI.eventText(TPL[id].desc(ev), TPL[id].fields, NPCS['ev_' + ({ peddler: 'peddler', wounded: 'traveler', ambush: 'rogue', hermit: 'hermit', duel: 'duelist' }[id] || 'peddler')].name).then(tx => { if (tx && next === ev) Object.assign(ev.text, tx); });
  }
  // 主角每走完一格调用一次
  function step() {
    if (OFF || G.autoSkip || G.busy || !S || !S.flags.spar || !World.map.d.foes) return;
    if (!next || next.map !== World.map.id) prepare();
    steps++;
    if (steps < 45 || performance.now() - lastT < 60000 || Math.random() > 0.035) return;
    const p = World.p;
    if (World.foes.some(f => Math.abs(f.x - p.x) + Math.abs(f.y - p.y) < 5) || World.npcs.some(n => Math.abs(n.x - p.x) + Math.abs(n.y - p.y) < 3)) return;
    run();
  }
  async function run(force) {
    if (force || !next || next.map !== World.map.id) prepare(force);
    const ev = next, T = ev.text; next = null; steps = 0; lastT = performance.now();
    G.busy = true; World.path = null; World.goalNpc = null; G.keys = {};
    const theme = World.map.d.theme;
    try {
      Sfx.play('chest');
      await say(null, T.intro);
      if (ev.id === 'peddler') {
        await say('ev_peddler', T.line);
        const c = await choose('', ['买下' + ITEMS[ev.item].name + '（' + ev.price + ' 文）', '婉拒']);
        if (c === 0 && S.gold >= ev.price) { S.gold -= ev.price; give(ev.item, 1); await say('ev_peddler', T.a); }
        else if (c === 0) await say(null, '摸了摸钱袋，盘缠不够，只好作罢。');
        else await say('ev_peddler', T.b);
      } else if (ev.id === 'wounded') {
        await say('ev_traveler', T.line);
        const med = ['potion1', 'potion2', 'potion3'].find(id => S.items[id] > 0), opts = [];
        if (med) opts.push('送他一份' + ITEMS[med].name);
        if (S.gold >= ev.coin) opts.push('留下 ' + ev.coin + ' 文盘缠');
        opts.push('拱手离开');
        const c = opts[await choose('', opts)];
        if (c === '拱手离开') await say(null, T.b);
        else {
          if (c.indexOf('文') >= 0) S.gold -= ev.coin; else S.items[med]--;
          await say('ev_traveler', T.a); give(ev.reward, ev.n);
          S.deeds = (S.deeds || 0) + 1;
          if (S.deeds % 3 === 0) { const m = fixMember(S.party[0]); m.pt += 1; toast('行侠三次，心有所得：<b>' + S.name + '</b> 得到 1 点属性点'); } else toast('侠名远播（已行侠 ' + S.deeds + ' 次）');
        }
      } else if (ev.id === 'ambush') {
        await say('ev_rogue', T.line);
        const c = await choose('', ['迎战', S.gold >= ev.toll ? '破财消灾（' + ev.toll + ' 文）' : '掉头就走']);
        if (c === 0) {
          const r = await battle(ev.group, { theme, lv: partyLv() });   // 拦路的：与队伍同级，比路上寻常的对手高一级
          if (r === 'win') { await say(null, T.a); give('gold', ev.coin); give(ev.loot, 1); } else if (r === 'lose') await G.defeat();
        } else { if (S.gold >= ev.toll) S.gold -= ev.toll; await say('ev_rogue', T.b); }
      } else if (ev.id === 'bundle') {
        await say(null, T.line);
        const c = await choose('', ['打开看看', '不动它']);
        if (c !== 0) await say(null, T.b);
        else {
          await say(null, T.a);
          if (ev.kind === 'gold') give('gold', ev.coin); else if (ev.kind === 'item') give(ev.item, ev.n);
          else { const r = await battle(pick(World.map.d.foes.groups), { theme, lv: Math.max(1, partyLv() - 1) }); if (r === 'win') give('gold', ev.coin); else if (r === 'lose') await G.defeat(); }
        }
      } else if (ev.id === 'hermit') {
        const Q = QA[ev.qa];
        await say('ev_hermit', T.line); await say('ev_hermit', Q.q);
        const c = await choose(Q.q, Q.o.map(o => o[0]));
        await say('ev_hermit', [T.a, T.b, T.c][c]);
        const m = fixMember(S.party[0]), k = Q.o[c][1]; m.at[k] += 1;
        S.flags['ev_hermit_' + Math.min(4, G.tier())] = 1; Sfx.play('lvup');
        toast('若有所悟：<b>' + S.name + '</b> 的' + ATTRS.find(a => a.k === k).n + ' +1');
        await say(null, '再抬头时，青石上已空无一人。');
      } else if (ev.id === 'duel') {
        await say('ev_duelist', T.line);
        const c = await choose('', ['应战', '婉拒']);
        if (c !== 0) await say('ev_duelist', T.b);
        else {
          const r = await battle([ev.foe], { theme, lv: partyLv(), champ: true, noFlee: true, quietLose: true });   // 独自挑战整支队伍：按首领的档次给气血和攻击
          if (r === 'win') { await say('ev_duelist', T.a); give('gold', ev.coin); give(ev.loot, 1); }
          else { healAll(); await say('ev_duelist', T.c); }
        }
      }
    } catch (e) { console.error(e); G.err(e); }
    if (G.scene === 'world') { UI.hud(); G.save(); }
    G.busy = false;
    if (G.scene === 'world' && World.map.d.foes) prepare();
  }

  return { has, aff, add, level, lv: who => lvI(aff(who)), names: LV.map(l => l[1]), rewards, discount, price, innFee, gift, after, small, attitude, listHtml, step, run, TPL, people: P };
})();
