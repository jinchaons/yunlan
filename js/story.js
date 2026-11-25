'use strict';
/* ============ 地图定义与剧情脚本（原创故事） ============ */
/* 主线十二关：青岚山道 → 万竹林 → 烟雨渡 → 沉舟坞 → 赤焰谷 → 断剑崖 → 栖霞旧镇 → 寒月雪岭 → 天工墟 → 幽烬城 → 归墟之门 → 心渊 */
const CHAPTERS = ['序章 · 听雨阁', '第一章 · 万竹深处', '第二章 · 烟雨灯会', '第三章 · 沉舟夜渡', '第四章 · 赤焰焚心', '第五章 · 断剑旧梦', '第六章 · 栖霞故里', '第七章 · 寒月霜天', '第八章 · 天工遗墟', '第九章 · 幽烬孤城', '第十章 · 归墟之门', '终章 · 心渊', '尾声 · 江湖路远'];
// 由剧情标记推出当前是第几章
const chapterOf = F => (F.final ? 12 : F.gateOpen ? 11 : F.cityDone ? 10 : F.tgDone ? 9 : F.snowDone ? 8 : F.oldDone ? 7 : F.cliffDone ? 6 : F.fireDone ? 5 : F.dockDone ? 4 : F.ferryDone ? 3 : F.bambooDone ? 2 : F.ch1 ? 1 : 0);

const INTRO = [
  '大胤末年，朝纲不振，江湖风雨欲来。',
  '相传上古天工遗下一幅《璇玑图》，藏着沟通天地的秘密。',
  '先贤恐其为祸，将图一分为四，化作四枚璇玑玉，',
  '交由听雨阁、万竹林、赤焰谷、寒月宫四派世代守护。',
  '三百年过去，璇玑之名渐成传说——',
  '直到一个名叫「幽烬盟」的组织，悄然出现在江湖的阴影里。',
  '青岚山，听雨阁。少年云澈的故事，从一个寻常的清晨开始……'
];
/* 三种结局（S.flags.ending）：'su' 与苏青禾终成眷属，'bai' 与白芷终成眷属，'solo' 各自珍重。
   由 moxiang_post 里最后的那句话决定：要对谁说，还得情谊够深（一路上的选择）、她的心事已了（各自的缘分支线）。 */
function endingLines() {
  const e = S.flags.ending || 'solo';
  const mid = e === 'su' ? [
    '苏青禾依旧嚷着师父偏心。只是如今下山的包袱总是两份，剑穗也是一对——青的那条系在他的剑上，是她亲手打的结。',
    '开春的时候，两个人回了一趟栖霞旧镇。坟前的野花开了一地，她站了很久，只说了一句：娘，我带他来了。',
    '那天下山的路上落了雨。她照旧走在前头，走出十几步，忽然停下来，头也不回地伸出一只手。',
    '「愣着干什么。」',
    '后来听雨阁的弟子都知道：阁里那两位吵架吵得最凶的师兄师姐，拜堂那天，一句嘴也没拌。'
  ] : e === 'bai' ? [
    '苏青禾依旧嚷着师父偏心。每逢落雨，她总要多看一眼山道，嘴上说：那小子，可别被萤火虫拐跑了。——说完自己先笑了。',
    '那年夏夜，万竹林的萤火比往年都亮。白芷在林口等到了一个背着剑的人，剑穗上，系着一枚旧香囊。',
    '「我来看萤火。」他说。',
    '「……只是看萤火吗？」',
    '后来万竹林的药庐前多了一口剑架。来求医的人都说：白大夫看诊的时候，总有个人在廊下替她捣药，捣得不大好，她却从不嫌。'
  ] : [
    '苏青禾依旧嚷着师父偏心，却把下山的包袱，悄悄多备了一份。',
    '白芷偶尔托人捎信上山，信里只写药方，末尾却总要多问一句：听雨阁的雨，今年下得可好？',
    '云澈把信收在剑谱里，一封也没有回——每一封，他都提笔写过，又都搁下了。',
    '有些话，他终究没有说出口。好在人都还在，山还是那座山，雨还是那场雨。',
    '也许明年灯会，也许后年落雪。江湖路远，来日方长。'
  ];
  return [
    '数月之后，青岚山，听雨阁。',
    '顾苍梧的伤已大好，每日在檐下煮茶听雨，只是常常多摆两只空杯。',
    '断剑崖上，忠伯依旧每日热着一份饭。崖顶的风里，再没有人与他过招。',
    '烟雨渡的灯会上，卖灯婆婆扎了一盏新灯，写了两个名字，顺水放了下去。',
    '石破军回了赤焰谷。据说谷中的炉火，如今也为山外的百姓而燃。',
    '白芷与百草翁重返万竹林，林中毒瘴散尽，萤火比从前更亮。'
  ].concat(mid, [
    '至于听雨剑法剩下的那三分——',
    e === 'solo' ? '云澈后来说，那不在剑上，也不全在江湖里。在路上，在一回头就看得见的地方。' : '云澈后来说，那不在剑上，也不在江湖里。在身边。',
    '《云岚侠影录》　' + (e === 'su' ? '檐下听雨' : e === 'bai' ? '萤火归林' : '江湖路远') + ' · 全剧终',
    '感谢游玩'
  ]);
}

const chestNpc = (id, x, y, loot) => ({ x, y, sprite: 'chest', chest: id, loot, talk: 'chest', name: '宝箱' });
const springNpc = (x, y) => ({ x, y, sprite: 'spring', talk: 'spring', name: '灵泉' });

const MAPS = {
  tingyu: {
    name: '听雨阁', sub: '青岚山 · 檐下听雨三百年', theme: 'mountain', w: 30, h: 24, seed: 11, dense: 0.12,
    water: [[5, 10, 2.6], [24, 16, 2.3]],
    clear: [[9, 6, 12, 7, GR.STONE]],
    paths: [[[14, 12], [14, 23]], [[15, 12], [29, 12]]],
    builds: [{ x: 12, y: 3, w: 6, h: 3, s: 'hallTingyu' }],
    props: [{ x: 10, y: 6, s: 'lantern' }, { x: 19, y: 6, s: 'lantern' }, { x: 12, y: 12, s: 'lantern' }, { x: 17, y: 12, s: 'lantern' }],
    exits: [{ x: 14, y: 23, w: 2, h: 1, to: 'road', tx: 6, ty: 2, need: 'spar', msg: '先去见过师父吧。' },
      { x: 29, y: 12, w: 1, h: 2, to: 'cliff', tx: 2, ty: 24, need: 'cliffOpen', msg: '后山的小径被师父下了禁制，弟子不得擅入。' }],
    npcs: [
      { who: 'gu', x: 14, y: 7, talk: 'gu', show: s => !s.flags.delivered || s.flags.ch1, mark: s => !s.flags.spar },
      { who: 'gu', x: 15, y: 8, talk: 'gu', pose: 'dead', show: s => s.flags.delivered && !s.flags.ch1, mark: s => true },
      { who: 'su', x: 11, y: 9, talk: 'su', show: s => !s.flags.delivered },
      { who: 'su', x: 13, y: 8, talk: 'su', show: s => s.flags.delivered && !s.flags.ch1 },
      { who: 'disciple', x: 18, y: 10, talk: 'disciple', face: -1 },
      springNpc(19, 8),
      chestNpc('t1', 9, 8, [['potion1', 2], ['ar1', 1]])
    ]
  },
  road: {
    name: '青岚山道', sub: '樱雨纷飞 · 山贼出没', theme: 'mountain', w: 46, h: 26, seed: 23, dense: 0.13,
    water: [[13, 4, 2.4], [38, 21, 2.5], [27, 12, 1.4], [27, 14, 1.6], [27, 16, 1.6], [27, 18, 1.6], [27, 20, 1.5]],
    clear: [[27, 2, 4, 3, 0], [10, 20, 5, 3, 0]],
    paths: [[[6, 0], [6, 8], [20, 8], [20, 16], [34, 16], [34, 13], [45, 13]], [[20, 8], [28, 8], [28, 4]], [[20, 16], [12, 16], [12, 20]]],
    exits: [{ x: 6, y: 0, w: 2, h: 1, to: 'tingyu', tx: 14, ty: 21 }, { x: 45, y: 13, w: 1, h: 2, to: 'town', tx: 2, ty: 31 }],
    npcs: [
      { who: 'woodman', x: 9, y: 10, talk: 'woodman' },
      chestNpc('r1', 29, 3, [['gold', 100], ['mp1', 2]]),
      chestNpc('r2', 11, 21, [['ac1', 1], ['potion1', 2]])
    ],
    fixed: [{ x: 31, y: 16, group: ['heifeng', 'bandit'], boss: true, show: s => s.flags.delivered && !s.flags.heifeng, pre: 'heifeng_pre', post: 'heifeng_post' }],
    foes: { n: 6, groups: [['bandit'], ['wolf'], ['wolf', 'wolf'], ['bandit', 'wolf'], ['bandit']] }
  },
  /* 落霞镇（扩建成一座大城）：四面城墙，东西各三门、南北各一门。三横（y=17/31/45 的大街，通东西城门）三纵（x=20/37/54），
     外加三条横巷（y=10/24/38）和贴着城墙的环城街。房屋一律坐北朝南，门前留一格（人物站这里），再往南就是街。 */
  town: {
    name: '落霞镇', sub: '江湖中枢 · 八门通衢', theme: 'town', w: 76, h: 59, seed: 5, dense: 0.035,
    wall: { x0: 5, y0: 5, x1: 70, y1: 53 },
    gates: [{ x: 38, y: 5.5, name: '望雪门' }, { x: 38, y: 53.5, name: '听竹门' },
      { x: 5.5, y: 18, name: '演武门' }, { x: 5.5, y: 32, name: '青岚门' }, { x: 5.5, y: 46, name: '栖霞门' },
      { x: 70.5, y: 18, name: '观澜门' }, { x: 70.5, y: 32, name: '烟雨门' }, { x: 70.5, y: 46, name: '朝阳门' }],
    water: [[14, 49.5, 2.3]],
    clear: [[31, 26, 14, 8, GR.STONE], [55, 48, 11, 4, GR.STONE]],
    paths: [[[0, 17], [75, 17]], [[0, 31], [75, 31]], [[0, 45], [75, 45]], [[37, 0], [37, 58]],
      [[8, 10], [67, 10]], [[8, 24], [67, 24]], [[8, 38], [67, 38]],
      [[8, 10], [8, 46]], [[67, 10], [67, 46]], [[20, 10], [20, 46]], [[54, 10], [54, 46]],
      [[60, 46], [60, 48]], [[20, 46], [20, 49], [17, 49]]],
    builds: [
      // 北巷（y=10）北侧
      { x: 12, y: 6, w: 5, h: 3, s: 'house1' }, { x: 24, y: 6, w: 5, h: 3, s: 'house2' }, { x: 30, y: 6, w: 5, h: 3, s: 'book', s2: 'house1' },
      { x: 41, y: 6, w: 5, h: 3, s: 'cloth', s2: 'house2' }, { x: 47, y: 6, w: 5, h: 3, s: 'house3' }, { x: 58, y: 6, w: 5, h: 3, s: 'house1' },
      // 北大街（y=17）北侧
      { x: 12, y: 13, w: 5, h: 3, s: 'pawn', s2: 'house1' }, { x: 24, y: 13, w: 5, h: 3, s: 'smithy', s2: 'house2' }, { x: 30, y: 13, w: 5, h: 3, s: 'clinic', s2: 'house2' },
      { x: 41, y: 13, w: 5, h: 3, s: 'bank', s2: 'house3' }, { x: 47, y: 13, w: 5, h: 3, s: 'grocer', s2: 'house1' }, { x: 58, y: 13, w: 5, h: 3, s: 'house2' },
      // 中巷（y=24）北侧
      { x: 12, y: 20, w: 5, h: 3, s: 'house3' }, { x: 24, y: 20, w: 5, h: 3, s: 'house1' }, { x: 30, y: 20, w: 5, h: 3, s: 'teahouse', s2: 'house3' },
      { x: 41, y: 20, w: 5, h: 3, s: 'yamen', s2: 'biaoju' }, { x: 47, y: 20, w: 5, h: 3, s: 'house2' }, { x: 58, y: 20, w: 5, h: 3, s: 'wine', s2: 'house1' },
      // 中大街（y=31）北侧：广场两翼
      { x: 12, y: 27, w: 5, h: 3, s: 'escort', s2: 'biaoju' }, { x: 24, y: 27, w: 5, h: 3, s: 'inn2', s2: 'inn' },
      { x: 47, y: 27, w: 5, h: 3, s: 'tavern', s2: 'inn' }, { x: 58, y: 27, w: 5, h: 3, s: 'house3' },
      // 南巷（y=38）北侧
      { x: 12, y: 34, w: 5, h: 3, s: 'house2' }, { x: 24, y: 34, w: 5, h: 3, s: 'house1' }, { x: 30, y: 34, w: 5, h: 3, s: 'house3' },
      { x: 41, y: 34, w: 5, h: 3, s: 'house2' }, { x: 47, y: 34, w: 5, h: 3, s: 'house1' }, { x: 58, y: 34, w: 5, h: 3, s: 'house1' },
      // 南大街（y=45）北侧
      { x: 12, y: 41, w: 5, h: 3, s: 'house1' }, { x: 24, y: 41, w: 5, h: 3, s: 'house2' }, { x: 30, y: 41, w: 5, h: 3, s: 'house3' },
      { x: 41, y: 41, w: 5, h: 3, s: 'temple', s2: 'biaoju' }, { x: 47, y: 41, w: 5, h: 3, s: 'pagoda', s2: 'house1' }, { x: 58, y: 41, w: 5, h: 3, s: 'house2' }
    ],
    props: [{ x: 31, y: 26, s: 'lantern' }, { x: 44, y: 26, s: 'lantern' }, { x: 31, y: 33, s: 'lantern' }, { x: 44, y: 33, s: 'lantern' }, { x: 34, y: 29, s: 'treeR', sc: 1.3 }, { x: 42, y: 29, s: 'treeA', sc: 1.2 },
      { x: 36, y: 14, s: 'lantern' }, { x: 39, y: 14, s: 'lantern' }, { x: 36, y: 21, s: 'lantern' }, { x: 39, y: 21, s: 'lantern' }, { x: 36, y: 40, s: 'lantern' }, { x: 39, y: 40, s: 'lantern' }, { x: 36, y: 48, s: 'lantern' }, { x: 39, y: 48, s: 'lantern' },
      { x: 19, y: 16, s: 'lantern' }, { x: 22, y: 16, s: 'lantern' }, { x: 53, y: 16, s: 'lantern' }, { x: 56, y: 16, s: 'lantern' }, { x: 19, y: 30, s: 'lantern' }, { x: 22, y: 30, s: 'lantern' }, { x: 53, y: 30, s: 'lantern' }, { x: 56, y: 30, s: 'lantern' },
      { x: 19, y: 44, s: 'lantern' }, { x: 22, y: 44, s: 'lantern' }, { x: 53, y: 44, s: 'lantern' }, { x: 56, y: 44, s: 'lantern' },
      { x: 55, y: 48, s: 'brazier' }, { x: 65, y: 48, s: 'brazier' }, { x: 11, y: 48, s: 'treeA', sc: 1.25 }, { x: 17, y: 47, s: 'treeR', sc: 1.2 }],
    exits: [
      // 东西各三座门：中间的通主线（青岚山道 / 烟雨渡），两旁的四座各通一处城郊（摩云岭、稻香村、藕花村、撷芳园，见文件末尾）
      { x: 0, y: 31, w: 1, h: 2, to: 'road', tx: 43, ty: 13 },
      { x: 0, y: 17, w: 1, h: 2, to: 'moyun', tx: 41, ty: 34, need: 'ferryDone', msg: () => S.flags.ch1 ? '演武门外是上摩云岭的山路。岭上有狼，守门的兵丁说：没有几分真本事，别上去。' : GATE_BUSY() },
      { x: 0, y: 45, w: 1, h: 2, to: 'daoxiang', tx: 43, ty: 16, need: 'ch1', msg: () => GATE_BUSY() },
      { x: 37, y: 58, w: 2, h: 1, to: 'bamboo', tx: 20, ty: 2, need: 'ch1', msg: () => S.flags.delivered ? '听雨阁出事了——先赶回青岚山！' : '师命在身，先把信送到镖局吧。' },
      { x: 75, y: 31, w: 1, h: 2, to: 'ferry', tx: 2, ty: 14, need: 'bambooDone', msg: '城东的路通往烟雨渡。眼下还有更要紧的事。' },
      { x: 75, y: 17, w: 1, h: 2, to: 'ouhua', tx: 2, ty: 16, need: 'bambooDone', msg: () => S.flags.ch1 ? '观澜门外是去藕花村的水路。眼下还有更要紧的事。' : GATE_BUSY() },
      { x: 75, y: 45, w: 1, h: 2, to: 'garden', tx: 2, ty: 15, need: 'ch1', msg: () => GATE_BUSY() },
      { x: 37, y: 0, w: 2, h: 1, to: 'snow', tx: 18, ty: 37, need: 'oldDone', msg: () => S.flags.cliffDone ? '师父嘱咐过：上雪岭之前，先去青岚山道北面的栖霞旧镇看一眼。' : S.flags.fireDone ? '北上雪岭之前，还有一件事没弄明白——先回听雨阁问问师父。' : '北面雪岭风雪正紧，现在上山太过凶险。' }
    ],
    onEnter() { S.flags.town = 1; S.respawn = { map: 'town', x: 37, y: 33 }; },
    // 街上只留两个慢慢踱步的行人（原先十四个、走得又快，满街乱窜）；去处都在城中心这几条街上，走到哪儿都还碰得见
    walkers: { n: 2, pts: [[37, 17], [20, 17], [54, 17], [20, 31], [54, 31], [37, 24], [37, 38], [37, 45], [33, 31], [42, 31], [28, 24], [46, 24], [28, 38], [46, 38]] },
    npcs: [
      { who: 'shen', x: 14, y: 30, talk: 'shen', mark: s => s.flags.spar && !s.flags.delivered },
      { who: 'innkeeper', x: 26, y: 30, talk: 'inn' },
      { who: 'jin', x: 49, y: 30, talk: 'jin', mark: s => s.flags.ch1 && !s.flags.q_tavern },
      { who: 'smith', x: 26, y: 16, talk: 'smith' },
      { who: 'herb', x: 32, y: 16, talk: 'herb' },
      { who: 'qian', x: 14, y: 16, talk: 'qian', mark: s => s.flags.bambooDone && !s.flags.q_pawn },
      { who: 'teller', x: 32, y: 23, talk: 'teller', mark: s => s.flags.q_pawn === 1 && !s.flags.pawn_clue },
      { who: 'captain', x: 43, y: 23, talk: 'captain' },
      { who: 'miaozhu', x: 43, y: 44, talk: 'miaozhu' },
      { who: 'huaniang', x: 43, y: 37, talk: 'huaniang', mark: s => s.flags.spar && !s.flags.q_lost },
      { who: 'xiaoman', x: 64, y: 9, talk: 'xiaoman', show: s => s.flags.q_lost === 1, mark: s => true },
      { who: 'xiaoman', x: 44, y: 37, talk: 'xiaoman', face: -1, show: s => s.flags.q_lost >= 2 },
      { who: 'granny', x: 26, y: 37, talk: 'granny' },
      { who: 'kid', x: 40, y: 28, talk: 'kid', face: -1 },
      { who: 'keeper', x: 60, y: 49, talk: 'tower' },
      { who: 'vendor1', x: 33, y: 27, w: 2, sprite: 'stallG', talk: 'vendor1', name: '杂货摊' },
      { who: 'vendor2', x: 41, y: 27, w: 2, sprite: 'stallR', talk: 'vendor2', name: '刀剪摊' },
      { who: 'guard', x: 36, y: 7, talk: 'guard', gate: '望雪门', to: '寒月雪岭', dir: '北' },
      { who: 'guard', x: 39, y: 51, talk: 'guard', gate: '听竹门', to: '万竹林', dir: '南', face: -1 },
      { who: 'guard', x: 7, y: 16, talk: 'guard', gate: '演武门', to: '摩云岭', dir: '西' },
      { who: 'guard', x: 7, y: 30, talk: 'guard', gate: '青岚门', to: '青岚山道', dir: '西' },
      { who: 'guard', x: 7, y: 44, talk: 'guard', gate: '栖霞门', to: '稻香村', dir: '西' },
      { who: 'guard', x: 69, y: 16, talk: 'guard', gate: '观澜门', to: '藕花村', dir: '东', face: -1 },
      { who: 'guard', x: 69, y: 30, talk: 'guard', gate: '烟雨门', to: '烟雨渡', dir: '东', face: -1 },
      { who: 'guard', x: 69, y: 44, talk: 'guard', gate: '朝阳门', to: '撷芳园', dir: '东', face: -1 },
      chestNpc('w1', 10, 9, [['gold', 200], ['potion1', 3]]),
      chestNpc('w2', 66, 47, [['mp1', 3], ['antidote', 2]])
    ],
    fixed: [
      { x: 50, y: 33, group: ['thugboss', 'thug', 'thug'], boss: true, k: s => Math.max(1, 0.5 + s.party[0].lv * 0.12), show: s => s.flags.q_tavern === 1, pre: 'tavern_pre', post: 'tavern_post' },
      { x: 46, y: 40, group: ['spy', 'spy', 'scout'], boss: true, k: s => Math.max(1, s.party[0].lv / 8), show: s => s.flags.q_pawn === 1 && s.flags.pawn_clue, pre: 'pawn_pre', post: 'pawn_post' }
    ]
  },  bamboo: {
    name: '万竹林', sub: '萤火幽深 · 毒瘴暗涌', theme: 'bamboo', w: 40, h: 32, seed: 31, dense: 0.2,
    water: [[14, 10, 2.2], [28, 9, 3], [35, 25, 2], [15, 12, 1.3], [15, 14, 1.5], [15, 16, 1.5], [15, 18, 1.3]],
    clear: [[16, 26, 10, 5, 0], [17, 23, 4, 3, 0]],
    paths: [[[20, 0], [20, 6], [9, 6], [9, 14], [22, 14], [22, 20], [31, 20], [31, 26], [20, 26], [20, 28]], [[9, 14], [5, 14], [5, 20]], [[31, 20], [36, 20], [36, 14]]],
    exits: [{ x: 20, y: 0, w: 2, h: 1, to: 'town', tx: 37, ty: 56 }],
    npcs: [
      { who: 'gatherer', x: 22, y: 3, talk: 'gatherer', face: -1 },
      { who: 'bai', x: 23, y: 29, talk: 'bai_trapped', face: -1, show: s => !s.flags.bambooDone },
      springNpc(18, 24),
      chestNpc('b1', 6, 21, [['acA', 1]]),
      chestNpc('b2', 37, 14, [['potion2', 2], ['gold', 300]])
    ],
    fixed: [{ x: 20, y: 29, group: ['zhumu', 'spider', 'spider'], boss: true, show: s => !s.flags.bambooDone, pre: 'zhumu_pre', post: 'zhumu_post' }],
    foes: { n: 7, groups: [['spider', 'spider'], ['bamboo', 'spider'], ['scout', 'spider'], ['bamboo', 'bamboo'], ['scout', 'scout'], ['spider', 'spider', 'bamboo']] }
  },
  fire: {
    name: '赤焰谷', sub: '地火千年 · 炉中藏刀', theme: 'fire', w: 46, h: 26, seed: 47, dense: 0.12,
    water: [[16, 12, 2.6], [17, 19, 2.6], [28, 4, 2.4], [26, 20, 2.3], [5, 5, 2.4], [5, 21, 2.6], [41, 21, 2.4], [16, 4, 1.4], [16, 6, 1.5], [16, 8, 1.4]],
    clear: [[34, 9, 10, 5, GR.STONE], [31, 10, 3, 3, 0]],
    paths: [[[0, 13], [10, 13], [10, 6], [22, 6], [22, 13], [30, 13], [30, 19], [38, 19], [38, 13]], [[10, 13], [10, 22]], [[30, 19], [30, 23], [24, 23]]],
    builds: [{ x: 36, y: 6, w: 6, h: 3, s: 'hallFire' }],
    props: [{ x: 35, y: 9, s: 'brazier' }, { x: 42, y: 9, s: 'brazier' }, { x: 21, y: 9, s: 'brazier' }, { x: 24, y: 9, s: 'brazier' }],
    exits: [{ x: 0, y: 13, w: 1, h: 2, to: 'ferry', tx: 37, ty: 14 }],
    npcs: [
      { who: 'shi', x: 36, y: 12, talk: 'shi_wait', show: s => s.flags.shiDuel && !s.flags.fireDone, mark: s => true },
      { who: 'lie', x: 38, y: 10, talk: 'lie', show: s => s.flags.fireDone },
      springNpc(32, 11),
      chestNpc('f1', 11, 23, [['revive', 1], ['mp2', 2]]),
      chestNpc('f2', 24, 24, [['meteor', 1], ['gold', 500]])
    ],
    fixed: [
      { x: 22, y: 10, group: ['shi_duel'], boss: true, show: s => !s.flags.shiDuel, pre: 'shi_pre', post: 'shi_post' },
      { x: 39, y: 11, group: ['chiyan', 'blade', 'blade'], boss: true, show: s => s.flags.shiDuel && !s.flags.fireDone, pre: 'chiyan_pre', post: 'chiyan_post' }
    ],
    foes: { n: 7, groups: [['firespirit', 'firespirit'], ['lizard', 'firespirit'], ['blade', 'blade'], ['blade', 'firespirit', 'firespirit'], ['lizard', 'lizard']] }
  },
  snow: {
    name: '寒月雪岭', sub: '千山暮雪 · 宫门深锁', theme: 'snow', w: 36, h: 40, seed: 59, dense: 0.12,
    water: [[17, 27, 3.4], [30, 30, 3], [4, 12, 2.4]],
    clear: [[13, 6, 12, 6, GR.STONE]],
    paths: [[[18, 39], [18, 32], [8, 32], [8, 22], [26, 22], [26, 13], [18, 13], [18, 10]], [[8, 22], [4, 22], [4, 28]], [[26, 13], [31, 13], [31, 18]], [[24, 9], [33, 9], [33, 0]]],
    builds: [{ x: 15, y: 3, w: 8, h: 3, s: 'hallSnow' }],
    props: [{ x: 13, y: 6, s: 'crysI' }, { x: 24, y: 6, s: 'crysI' }, { x: 13, y: 11, s: 'lantern' }, { x: 23, y: 11, s: 'lantern' }],
    exits: [{ x: 18, y: 39, w: 2, h: 1, to: 'town', tx: 37, ty: 2 }, { x: 33, y: 0, w: 2, h: 1, to: 'city', tx: 18, ty: 33, need: 'tgDone', msg: () => S.flags.snowDone ? '凌霜说过：门怎么关，答案在雪岭东面的天工墟。先去那里。' : '一道冰墙封住了山门，寒气正从寒月宫中涌出。' }],
    npcs: [
      { who: 'moon', x: 15, y: 8, talk: 'moon', frozen: s => !s.flags.snowDone },
      { who: 'moon', x: 22, y: 9, talk: 'moon', face: -1, frozen: s => !s.flags.snowDone },
      { who: 'moon', x: 21, y: 7, talk: 'moon', face: -1, frozen: s => !s.flags.snowDone },
      springNpc(14, 10),
      chestNpc('s1', 5, 29, [['acB', 1]]),
      chestNpc('s2', 32, 19, [['potion3', 2], ['gold', 800]])
    ],
    fixed: [{ x: 18, y: 7, group: ['lingshuang'], boss: true, show: s => !s.flags.snowDone, pre: 'lingshuang_pre', post: 'lingshuang_post' }],
    foes: { n: 7, groups: [['snowwolf', 'snowwolf'], ['icesoul', 'snowwolf'], ['swordman', 'swordman'], ['swordman', 'icesoul'], ['snowwolf', 'snowwolf', 'snowwolf'], ['icesoul', 'icesoul']] }
  },
  abyss: {
    name: '归墟', sub: '万象终焉 · 天地之隙', theme: 'abyss', w: 36, h: 36, seed: 71, dense: 0.12,
    water: [[18, 24, 3], [5, 26, 3], [30, 8, 3], [31, 31, 2.5], [14, 28, 1.5]],
    clear: [[12, 3, 14, 6, GR.STONE]],
    paths: [[[18, 35], [18, 28], [28, 28], [28, 18], [8, 18], [8, 10], [18, 10], [18, 8]], [[28, 18], [32, 18], [32, 13]]],
    builds: [{ x: 15, y: 0, w: 6, h: 3, s: 'hallAbyss' }],
    props: [{ x: 12, y: 3, s: 'crysP' }, { x: 25, y: 3, s: 'crysP' }, { x: 12, y: 8, s: 'brazier' }, { x: 25, y: 8, s: 'brazier' }],
    exits: [{ x: 18, y: 35, w: 2, h: 1, to: 'city', tx: 33, ty: 18 }],
    npcs: [
      { who: 'baicao', x: 22, y: 4, talk: 'baicao', face: -1, show: s => s.flags.final },
      springNpc(14, 7),
      chestNpc('a1', 33, 13, [['acC', 1], ['potion3', 2]])
    ],
    fixed: [{ x: 18, y: 4, group: ['ye'], boss: true, show: s => !s.flags.final, pre: 'ye_pre', post: 'ye_post' }],
    foes: { n: 6, groups: [['deathguard', 'soulshade'], ['deathguard', 'deathguard'], ['soulshade', 'soulshade'], ['deathguard', 'soulshade', 'soulshade']] }
  }
};

const SCRIPTS = {
  async chest(n) {
    const k = 'c_' + n.def.chest;
    if (S.flags[k]) { await say(null, '箱子已经空了。'); return; }
    S.flags[k] = 1; Sfx.play('chest');
    for (const l of n.def.loot) give(l[0], l[1]);
    if (typeof Banter !== 'undefined') setTimeout(() => Banter.fire('chest'), 900);
  },
  async spring() {
    healAll(); S.respawn = { map: S.map, x: World.p.x, y: World.p.y };
    Sfx.play('heal'); toast('灵泉涤荡身心——全队状态已恢复'); G.save();
    if (typeof Banter !== 'undefined') setTimeout(() => Banter.fire('spring'), 900);
  },

  /* ---------- 听雨阁 ---------- */
  async gu() {
    const F = S.flags;
    if (!F.spar) {
      await talk([
        ['gu', '澈儿，你来了。入门十年，听雨剑法你已学得七分形似。'],
        ['hero', '师父，那剩下的三分呢？'],
        ['gu', '剩下三分不在剑上，在江湖里。今日起，你可以下山了。'],
        ['su', '师父偏心！我当年可是多练了两年，才准下山的。'],
        ['gu', '青禾，你陪师弟过几招。让为师看看，他接不接得住山下的风雨。'],
        ['su', '师弟，小心了——我可不会手下留情！'],
        [null, '【战斗提示】右下角的「攻」是普通攻击，周围的圆形按钮是武学（消耗内力）。怒气蓄满后可施展绝招。']
      ]);
      const r = await battle(['su_spar'], { noFlee: true, quietLose: true });
      healAll();
      await talk([
        ['su', r === 'win' ? '好啦好啦，算你赢。……进步倒是不小嘛。' : '承让啦师弟。不过你这几剑，已经有点意思了。'],
        ['gu', '不错。剑意已成，只欠历练。'],
        ['gu', '这封信，你送去落霞镇的镖局，亲手交给总镖头沈长风。山道上近来不太平，自己当心。'],
        ['hero', '弟子遵命。']
      ]);
      give('letter', 1); give('potion1', 3);
      F.spar = 1;
      setQuest('下山，经青岚山道前往落霞镇，把信交给镖局的沈长风。');
      toast('提示：院中的<b>灵泉</b>可以恢复状态');
    } else if (!F.delivered) {
      await say('gu', '信要紧，快去快回。出了山门一路向东，便是落霞镇。');
    } else if (!F.ch1) {
      await talk([
        ['su', '师弟！你总算回来了……'],
        ['hero', '师父！这是谁干的？！'],
        ['gu', '咳……是幽烬盟。为首之人戴着面具，一身功夫却分明出自……罢了。'],
        ['gu', '他们要的，是这个。'],
        [null, '顾苍梧从怀中取出一枚温润的青玉，玉中似有烟雨流转。'],
        ['gu', '璇玑玉。三百年来，听雨阁守的就是它。四玉合一，可开归墟之门——门后的东西，足以倾覆天下。'],
        ['gu', '幽烬盟没能得手，必会转向另外三派：万竹林、赤焰谷、寒月宫。你须赶在他们之前。'],
        ['hero', '弟子明白。可是师父您的伤……'],
        ['gu', '死不了。青禾，你随澈儿同去。你二人的剑，合则听雨。'],
        ['su', '是，师父。——师弟，这一路，师姐罩着你。']
      ]);
      give('jade1', 1);
      addMember('su', { w: 'sw1', a: 'ar1' });
      F.ch1 = 1; S.chapter = chapterOf(S.flags);
      setQuest('回到落霞镇，从镇南出口前往万竹林，寻访守玉的药王传人。');
      UI.banner(CHAPTERS[S.chapter], '苏青禾 加入队伍');
    } else if (F.fireDone && !F.cliffOpen) {
      await talk([
        ['hero', '师父。烈谷主说，夜无殇的来历，您最清楚。'],
        [null, '顾苍梧沉默了很久。檐外的雨，一滴一滴落在石阶上。'],
        ['gu', '他本名顾无殇，是为师的亲师兄，听雨阁百年来天分最高的弟子。'],
        ['su', '师伯？！师父，您从没提过……'],
        ['gu', '二十年前，他爱上了寒月宫的圣女，叶疏影。'],
        ['gu', '四派有约：守玉之人，不得有私。寒月宫更有铁律——入宫者，终身不得下山。'],
        ['gu', '那一年归墟的封印松动，须以寒月圣女为阵眼，入门镇守。四派长老议定之后……是为师，亲手拦住了去救人的师兄。'],
        ['gu', '他在后山断剑崖上折了佩剑。从此，世上再无顾无殇。'],
        ['hero', '师父……'],
        ['gu', '澈儿，他要开归墟之门，不是为了什么天下。他只是想把一个人接回来。'],
        ['gu', '去断剑崖看看吧。他的剑折在那里，他的心也留在那里。要拦他，先得懂他。']
      ]);
      F.cliffOpen = 1;
      setQuest('从听雨阁东侧的小径上后山，前往断剑崖。');
    } else if (F.cliffOpen && !F.cliffDone) {
      await say('gu', '后山小径的尽头便是断剑崖。守冢的忠伯还在，替为师……问他一声好。');
    } else if (!F.final) {
      await say('gu', F.snowDone ? '无殇师兄……澈儿，若有可能，替为师把他带回来。若不能——便替为师，送他一程。' : F.cliffDone ? (F.oldDone ? '你见过那柄断剑了。……这二十年，为师没有一夜不听见它落地的声音。' : '栖霞旧镇在青岚山道的北面。青禾这孩子嘴硬，路上，你多陪她说说话。') : '为师的伤不碍事。璇玑玉的事，就托付给你们了。');
    } else {
      await say('gu', '回来就好。茶还温着，坐下，陪为师听一场雨。');
    }
  },
  async su() {
    const F = S.flags;
    if (!F.spar) await say('su', '师弟，师父在阁前等你呢。别磨蹭，小心又被罚抄剑谱。');
    else if (!F.delivered) await say('su', '下山路上小心山贼和野狼。打不过就跑，不丢人——这是师姐的经验之谈。');
    else await say('su', '师父伤得很重，却一直撑着等你……你先听师父说。');
  },
  async disciple() {
    const F = S.flags;
    if (F.final) await say('disciple', '师兄师兄！镇上的说书先生已经把你们的故事编成段子了！');
    else if (F.delivered && !F.ch1) await say('disciple', '呜……那些黑衣人好凶，师父一个人挡住了他们所有人……');
    else await talk([
      ['disciple', '师兄！我来考考你：遇到打不过的敌人怎么办？'],
      ['disciple', '答案是——先「防御」回气，或者干脆「逃跑」！还有，战斗里右上角可以开「自动」，可省心了。'],
      ['disciple', '对了，地上的宝箱记得都打开看看，走过去按空格就行。']
    ]);
  },

  /* ---------- 青岚山道 ---------- */
  async woodman() {
    if (S.flags.heifeng) await say('woodman', '黑风那伙人散了？好，好啊！这条山道总算能太平几天了。');
    else await talk([
      ['woodman', '小兄弟，下山啊？顺着大路往东走到头，就是落霞镇。'],
      ['woodman', '路上那些晃悠的山贼野狼，你不去招惹，它们也会来招惹你——离近了就会扑上来。']
    ]);
  },
  async heifeng_pre() {
    await talk([
      ['heifeng', '站住！此山是我开——哦？是听雨阁的小崽子。'],
      ['hero', '让开，我有急事回山。'],
      ['heifeng', '回山？哈哈哈！那位大人吩咐了，今日青岚山上，一只鸟也不许飞回去。'],
      ['heifeng', '你的人头值五十两。兄弟们，上！']
    ]);
  },
  async heifeng_post() {
    await talk([
      ['heifeng', '怎、怎么可能……幽烬盟……不会放过你的……'],
      [null, '黑风倒下时，一枚令牌从他怀中滑落，上面刻着一团灰烬中的火。']
    ]);
    give('token', 1);
    S.flags.heifeng = 1;
    await say('hero', '幽烬盟……师父！');
    setQuest('赶回听雨阁！');
  },

  /* ---------- 落霞镇 ---------- */
  async shen() {
    const F = S.flags;
    if (!F.delivered) {
      await talk([
        ['shen', '这位小兄弟面生得很。是来托镖，还是来寻人？'],
        ['hero', '晚辈听雨阁云澈，奉家师顾苍梧之命，送信给沈总镖头。'],
        [null, '沈长风拆开信，只看了几行，脸色便沉了下来。'],
        ['shen', '「幽烬再起，四玉将危」……顾老哥果然也察觉了。'],
        ['shen', '小兄弟，实不相瞒：今晨我镖局的弟兄看见一队黑衣人马，绕过镇子，直奔青岚山去了。'],
        ['hero', '什么？！'],
        ['shen', '这把铁剑你拿去，再带上这些盘缠。快回山！但愿还来得及。']
      ]);
      S.items.letter = 0;
      give('sw1', 1); give('gold', 200);
      F.delivered = 1;
      setQuest('幽烬盟的人马上了青岚山！立刻经青岚山道赶回听雨阁。');
      toast('提示：在「菜单 · 队伍」中可以更换兵刃');
    } else if (!F.ch1) await say('shen', '快回去！镇上有我盯着。');
    else if (await sideQuest('q_fort')) return;
    else if (F.q_fort === 1) await say('shen', '黑风寨在青岚山道南面那条岔路的尽头。那铁臂熊不好对付，多备些伤药。');
    else if (!F.bambooDone) await say('shen', '万竹林在镇子正南。林中的百草翁医术通神，守玉的想必就是他那一脉。');
    else if (!F.fireDone) await say('shen', '赤焰谷在镇东。谷里的人脾气和他们的炉火一样爆，说话客气些。');
    else if (!F.snowDone) await say('shen', '寒月宫在北面雪岭之巅，已有二十年不与外人往来。此去多带丹药御寒。');
    else if (!F.final) await say('shen', '归墟……老夫只在祖辈的故事里听过。小兄弟，活着回来，我请你喝落霞镇最好的酒。');
    else await say('shen', '哈哈哈！好小子！今晚镖局摆酒，不醉不归！');
  },
  async inn() {
    await say('innkeeper', '客官里边请！小店上房三十文一晚，热水管够。');
    const fee = Jianghu.innFee();
    // 落霞镇有昼夜：住店一觉睡到天亮；不住店也可以在店里坐到掌灯（看夜景）或坐到天亮，不收钱、也不回复
    const night = World.isNight(), wait = night ? '在店里坐到天亮' : '在店里坐到掌灯（入夜）';
    const heart = S.party.some(m => m.id === 'su' || m.id === 'bai'), opts = ['住店歇息（' + (fee ? fee + ' 文' : '掌柜请客') + '）', '打听消息'].concat(heart ? ['与同伴谈心'] : [], [wait, '离开']);
    const c = await choose('', opts);
    if (opts[c] === '与同伴谈心') { await heartTalk(); return; }
    if (opts[c] === wait) {
      await UI.fade(1); World.setTime(!night); await UI.fade(0);
      await say('innkeeper', night ? '天亮啦，客官。街上的早点摊子刚支起来。' : '掌灯喽——客官出门瞧瞧，落霞镇的夜景，十里八乡数第一。');
      G.save(); return;
    }
    if (c === 0) {
      if (S.gold < fee) await say('innkeeper', '哎呀，客官手头不宽裕？……罢了，柴房不收钱，将就一晚吧。');
      else { S.gold -= fee; S.stays = (S.stays || 0) + 1; if (S.stays <= 10) Jianghu.add('innkeeper', 2, true); }
      await UI.fade(1); healAll(); World.setTime(false); S.respawn = { map: 'town', x: 37, y: 33 }; Sfx.play('heal'); await UI.fade(0);   // 一觉睡到天亮
      toast('一夜好眠——全队气血、内力已恢复');
      await nightTalk(); G.save();
    } else if (c === 1) {
      const t = G.tier();
      await say('innkeeper', ['近来山道上的山贼越发猖狂，听说背后有人撑腰。', '镇南万竹林起了毒瘴，采药的都不敢往深处走了。', '前几日有个红头发的怪人往镇东去了，走过的地方草都焦了。', '北边下来的客商说，寒月宫的钟已经半个月没响过了。', '客官，昨夜北边的天裂开了一道紫色的口子，您瞧见没有？'][t]);
    }
  },
  async smith() {
    if (await counterTalk()) return;
    if (await sideQuest('q_forge')) return;
    await say('smith', '打铁三十年，童叟无欺。看看？');
    const opts = ['买兵刃护具'];
    if (S.items.meteor > 0 && !S.flags.forged) opts.push('交出陨铁');
    opts.push('离开');
    const c = opts[await choose('', opts)];
    if (c === '买兵刃护具') { const g0 = S.gold; await UI.shop('smith', '铁老三的铺子'); if (S.gold < g0 && typeof Banter !== 'undefined') setTimeout(() => Banter.fire('shop'), 600); }
    else if (c === '交出陨铁') {
      await talk([
        ['smith', '这、这是天外陨铁？！小子，你从哪儿弄来的？'],
        ['smith', '别动，都别动！老子等这块料等了半辈子……给我一炷香的工夫！'],
        [null, '炉火映红了半条街。铁老三抡锤三百记，一柄剑身隐有雨声的长剑横在砧上。'],
        ['smith', '拿去。不要钱——这辈子能打出这么一把剑，值了。']
      ]);
      S.items.meteor = 0; S.flags.forged = 1; give('swX', 1);
    } else if (!S.flags.forged && S.flags.bambooDone) await say('smith', '听说赤焰谷深处落过一块天外陨铁。谁要能弄来，老子白给他打一把好剑。');
  },
  async herb() {
    if (S.flags.q_bai === 1 && ['qixing', 'huorong', 'xuejian'].every(k => S.items[k] > 0) && S.party.some(m => m.id === 'bai')) { await SCRIPTS.q_bai_brew(); return; }   // 白芷的心事：三味药齐了
    if (await sideQuest('q_cave')) return;
    await say('herb', '头疼脑热，跌打损伤，都有药。少侠要点什么？');
    const g0 = S.gold; await UI.shop('herb', '杜大夫的药铺'); if (S.gold < g0 && typeof Banter !== 'undefined') setTimeout(() => Banter.fire('shop'), 600);
  },
  async teller() {
    const t = G.tier();
    if (S.flags.q_pawn === 1 && !S.flags.pawn_clue) {
      await talk([
        ['teller', '当铺的事？嘿，客官算问对人了。'],
        ['teller', '前天夜里老朽收摊晚，看见三个蒙着脸的从当铺后墙翻出来，一路往南，钻进了城隍庙后头那条巷子。'],
        ['teller', '走路没声，袖口绣着一团灰里的火。——这一段，老朽可不敢上台说。']
      ]);
      S.flags.pawn_clue = 1; toast('线索：城隍庙后巷（南巷东段）'); return;
    }
    // 除了听书，还可以向他打听首领的底细、请教过招的门道（bossLore / FIGHT_TIPS）
    const ask = await choose('说书先生放下醒木——', ['听一段书', '打听江湖上的狠角色', '请教过招的门道']);
    if (ask === 1) { await tellerBoss(); return; }
    if (ask === 2) { await talk(FIGHT_TIPS.map(s => ['teller', s])); return; }
    await say('teller', ['话说三百年前，天工遗图，一分为四——哎，客官，后面的要收茶钱了。', '听雨阁守青玉，万竹林守碧玉，赤焰谷守赤玉，寒月宫守白玉。四玉不聚，天下太平。', '幽烬盟的盟主夜无殇，据说二十年前是个白衣剑客，一手剑法如烟似雨……像哪一家的？老朽可不敢说。', '寒月宫的规矩：入宫者终身不得下山。守得住玉，守不住人心哪。', '归墟者，万物所归之处。门开之日，要么旧天地亡，要么……出一个了不得的少年人。'][t]);
  },
  async kid() {
    await say('kid', S.flags.final ? '大哥哥大哥哥！教我听雨剑法好不好！' : '我长大了也要当大侠！先从……先从帮阿娘打酱油开始！');
  },
  async granny() {
    if (!S.flags.granny) {
      await talk([['granny', '年轻人，出门在外不容易。这道平安符是老婆子在庙里求的，你带着。'], ['hero', '多谢婆婆。']]);
      S.flags.granny = 1; give('ac1', 1);
    } else await say('granny', '平安就好，平安就好。');
  },

  /* ---------- 万竹林 ---------- */
  async gatherer() {
    if (S.flags.bambooDone) { await say('gatherer', '林子里的蛛网少多了……白芷那孩子，托付给你们了。'); return; }
    await talk([
      ['gatherer', '年轻人，莫再往里走了。林子深处结满了蛛网，连竹子都被毒死了一片。'],
      ['gatherer', '白芷姑娘三天前进去寻她师父，至今没有出来……那孩子心善，常给镇上人看病，分文不取。'],
      ['su', '师弟，守玉的药王传人，多半就是她。'],
      ['gatherer', '若一定要去，沿着路走到尽头。蛛母巢穴旁有一眼灵泉，先歇歇脚再动手。']
    ]);
  },
  async bai_trapped() { await say('bai', '别……别过来……它就在上面……'); },
  async zhumu_pre() {
    await talk([
      [null, '林间空地上蛛网密布。一名白衣少女被缚在网中，面色苍白。巨大的阴影自树冠缓缓垂下——'],
      ['bai', '别过来……它的毒，沾上一点就……'],
      ['su', '说得好像我们会掉头就走似的。师弟，上！']
    ]);
  },
  async zhumu_post() {
    await talk([
      [null, '蛛母轰然倒地。苏青禾挥剑斩断蛛丝，少女跌落下来，被云澈一把扶住。'],
      ['bai', '多谢二位……我叫白芷，是百草翁的弟子。'],
      ['hero', '百草翁前辈在何处？我们奉听雨阁之命前来示警，幽烬盟要夺璇玑玉。'],
      ['bai', '晚了一步。师父三日前被他们掳走了——这只蛛母，就是幽烬盟留下看守我的。'],
      ['bai', '但他们不知道，碧玉从不在师父身上。'],
      [null, '白芷解开发带，一枚碧色小玉悄然落入掌心。'],
      ['bai', '师父说过，若有一日听雨阁的人带着青玉来，便把它交出去，然后……跟着他们走。'],
      ['su', '跟着我们？你会武功吗？'],
      ['bai', '不大会。但你们受的伤，我都能治。——还有，我要把师父救回来。']
    ]);
    give('jade2', 1);
    addMember('bai', { w: 'nd1', a: 'ar1' });
    S.flags.bambooDone = 1; S.chapter = chapterOf(S.flags);
    await say('su', '下一处是赤焰谷。去赤焰谷，得先过镇东的烟雨渡——听说这两天渡口正办河灯会。');
    setQuest('返回落霞镇，从镇东正中的烟雨门前往烟雨渡，过河去赤焰谷。');
    UI.banner(CHAPTERS[S.chapter], '白芷 加入队伍');
  },

  /* ---------- 赤焰谷 ---------- */
  async shi_pre() {
    await talk([
      ['shi', '来者止步！赤焰谷今日封谷，不见外客。'],
      ['hero', '在下听雨阁云澈，有要事求见烈谷主——'],
      ['shi', '听雨阁？三天前也有人自称听雨阁门下，转头就在谷中放了一把火。'],
      ['bai', '这位大哥，我们真的不是……'],
      ['shi', '是真是假，手底下见分晓。接得住我石破军的刀，再谈求见！']
    ]);
  },
  async shi_post() {
    await talk([
      ['shi', '……好剑法。听雨剑「斜风细雨」，做不得假。是我鲁莽了。'],
      [null, '话音未落，谷内骤然响起急促的钟声，一道火柱冲天而起。'],
      ['shi', '警钟！是大殿方向——师父！'],
      ['shi', '几位，方才多有得罪。若还肯信我，请随我来！']
    ]);
    S.flags.shiDuel = 1;
    setQuest('赶往赤焰谷深处的赤焰殿！');
  },
  async shi_wait() { await say('shi', '那红发妖人就在殿前，师父被他所伤……我们一起上！'); },
  async chiyan_pre() {
    await talk([
      ['chiyan', '烈千山，交出赤玉，本座留你全尸。'],
      ['shi', '赤魇！离我师父远点！'],
      ['chiyan', '哦？又来几只小虫。青玉、碧玉竟自己送上门来——盟主果然算无遗策。'],
      ['hero', '算得再准，也得先问过我们手里的剑。']
    ]);
    if (!S.party.some(m => m.id === 'shi')) { addMember('shi', { w: 'sb1', a: 'ar3' }); UI.banner('石破军 加入队伍', '「我的刀，借你们一用！」'); }
  },
  async chiyan_post() {
    await talk([
      ['chiyan', '不可能……盟主……归墟之门……终将……'],
      ['lie', '咳咳……好，好！破军，你带回来的朋友，比为师强。'],
      ['lie', '赤玉在此。幽烬盟的盟主夜无殇，二十年前曾是名动江湖的剑客……不知为何，堕入此道。'],
      ['lie', '四玉只剩寒月宫的白玉。破军，你随他们去。赤焰谷的刀，不能只守着一座山谷。'],
      ['shi', '弟子领命！——云兄弟，往后我这把刀，听你调遣。'],
      ['lie', '还有一事。夜无殇的来历，你们该回去问顾苍梧。那老东西，把一桩旧事瞒了所有人二十年。']
    ]);
    give('jade3', 1);
    S.flags.fireDone = 1; S.chapter = chapterOf(S.flags);
    setQuest('回听雨阁，向师父问明夜无殇的来历。');
    UI.banner(CHAPTERS[S.chapter], '回山问剑');
  },
  async lie() { await say('lie', S.flags.final ? '后生可畏。赤焰谷的炉火，永远为你们留着。' : '寒月宫主与我有旧，替我问声好……若她还安好的话。'); },

  /* ---------- 寒月雪岭 ---------- */
  async moon() {
    if (!S.flags.snowDone) await say(null, '冰中封着一名寒月宫弟子，眉睫凝霜，尚有一丝气息。');
    else if (await sideQuest('q_ice')) return;
    else await say('moon', S.flags.q_ice === 3 ? '大阵已经重启。少侠的恩情，寒月宫上下铭记。' : '多谢诸位相救……凌霜师姐她，从前不是这样的。');
  },
  async lingshuang_pre() {
    await talk([
      ['lingshuang', '你们来得比我想的要慢。'],
      ['hero', '寒月宫的人，是你冰封的？'],
      ['lingshuang', '她们太吵了。整座寒月宫守着一块玉、一条规矩，守到忘了春天的样子。'],
      ['lingshuang', '二十年前我七岁，站在宫门口，看着师父走进那扇门。宫主说，那是圣女的荣耀。'],
      ['bai', '你的师父……是叶疏影？'],
      ['lingshuang', '盟主答应我：门开之日，把师父带回来。为此，我可以把整座雪岭都冻住。'],
      ['su', '所以你就把同门冻成了冰雕？这笔账，怎么算都不划算。'],
      ['lingshuang', '多说无益。留下三枚璇玑玉——或者，留下你们的命。']
    ]);
  },
  async lingshuang_post() {
    await talk([
      ['lingshuang', '……听雨剑。和师父留下的那册剑谱上画的，一模一样。'],
      ['hero', '你师父与我师伯的事，我们在断剑崖都听说了。'],
      [null, '云澈取出那半盏焦黑的河灯。凌霜怔怔地看着灯纸上的两个字，握剑的手第一次垂了下来。'],
      ['lingshuang', '……这是师父的字。'],
      ['lingshuang', '白玉我早已献给了他。他在雪岭背后的幽烬城，等四玉齐聚。'],
      ['lingshuang', '四玉须同时在场，门才会开。你们带着三枚玉走到这里，每一步，都在他的棋盘上。'],
      ['bai', '那我们若是不去呢？'],
      ['lingshuang', '百草翁在他手里。况且……他迟早会自己来取。'],
      ['lingshuang', '要拦他，光凭剑不够。雪岭东面的冰谷里埋着天工墟——三百年前，璇玑图就是在那里一分为四的。'],
      ['lingshuang', '门怎么开，四派都知道。门怎么关，只有那里的石碑上写着。我在谷口等你们。'],
      ['lingshuang', '若门后的那个人，还是她——替我带一句话：寒月宫的梅花，今年开了。'],
      [null, '凌霜闭上双眼。冰封的寒月宫弟子身上，冰层开始一点点消融。'],
      [null, '三枚璇玑玉在云澈怀中轻轻震颤，一道剑意自玉中流入心间。']
    ]);
    const hero = S.party[0];
    if (!hero.ex.includes('h6')) { hero.ex.push('h6'); Sfx.play('lvup'); toast('云澈 领悟了武学【<b>璇玑剑意</b>】'); }
    await talk([
      ['shi', '是陷阱，也得去。'],
      ['su', '去。而且要赢。——先去天工墟，把关门的法子找出来。'],
      ['hero', '嗯。把师伯带回来——或者，拦下来。']
    ]);
    S.flags.snowDone = 1; S.chapter = chapterOf(S.flags);
    setQuest('从寒月宫东面的岔路进冰谷，去天工墟找关上归墟之门的法子。凌霜在谷口等着。');
    UI.banner(CHAPTERS[S.chapter], '东谷 · 天工墟');
  },

  /* ---------- 归墟 ---------- */
  async ye_pre() {
    await talk([
      [null, '归墟之门前，一人负手而立。白发如雪，黑衣如夜。'],
      ['ye', '苍梧的徒弟。你的起手式，和他年轻时一模一样。'],
      ['hero', '师伯。师父让我带一句话——听雨阁的门，一直没有关。'],
      ['ye', '……他还是老样子。当年拦我的是他，如今劝我的，还是他。'],
      [null, '云澈取出那半盏河灯，和那柄断剑。'],
      ['ye', '…………'],
      ['ye', '这盏灯，我以为早就沉了。'],
      ['bai', '夜盟主，门后回来的不会是叶姑娘。玄烛前辈都告诉我们了。'],
      ['ye', '我知道。'],
      ['ye', '可我答应过她，要亲手打开这扇门。二十年，我只剩下这一件事可做了。'],
      ['su', '那就恕师侄无礼。这扇门，我们不许你开。'],
      ['ye', '拔剑吧。让我看看，苍梧教出了怎样的传人——也让我看看，这世上的“守”，到底守得住什么。']
    ]);
  },
  async ye_post() {
    const P = Math.PI;
    await Cine.begin(() => {
      Cine.put('hero', 18, 6.6, P); Cine.put('su', 16.8, 7.2, P); Cine.put('bai', 19.2, 7.2, P); Cine.put('shi', 18.1, 8.0, P);
      Cine.put('ye', 18, 4.3, 0, ENEMIES.ye.look);
      Cine.wide(['ye', 'hero', 'su', 'bai'], { yaw: 0.55, pitch: 0.3 });
    }, { party: false });
    await Cine.talk([
      ['ye', '好……好剑。可惜，门已经开了。'],
      [null, '四枚璇玑玉同时腾空而起，归墟之门轰然洞开。黑色的潮水涌出，潮水之中，隐约有一道女子的身影，向他伸出了手。', () => { Cine.shake(0.4); Cine.face('ye', P); Cine.wide(['ye', [18, 2.4]], { yaw: 0.3, pitch: 0.18, dist: 7.5 }); Cine.push(0.8, 5); }],
      ['ye', '疏影……', () => false],
      [null, '他握住了那只手。黑潮在一瞬间将他整个吞没——', () => { Cine.tween(Cine.get('ye'), { alpha: 0 }, 1.2); Cine.shake(0.7); }],
      [null, '黑潮深处传来一个不似人声的回响：吾……即……归墟……', () => { Cine.shake(0.5); }],
      ['shi', '人没了？！门还开着——'],
      ['bai', '不。潮水是往里收的……他被拖进门里去了。'],
      ['su', '门开着一天，漏出来的东西就多一天。栖霞镇是怎么没的，我们都看见了。'],
      ['hero', '师伯还在里面。璇玑枢也只有从门里才用得上。——进去，把他带出来，把门关上。']
    ]);
    await Cine.end();
    healAll();
    S.flags.gateOpen = 1; S.chapter = chapterOf(S.flags);
    setQuest('归墟之门已经洞开。走进门里，找到夜无殇，从里面把门合上。（门就是那座大殿）');
    UI.banner(CHAPTERS[S.chapter], '门后 · 心渊');
  },
  async baicao() { await say('baicao', '这地方阴气太重，老夫采几株幽昙花就走。年轻人，多谢了。'); }
};

/* ============ 扩充内容：四处支线秘境、问剑台、支线委托、客栈夜话 ============ */
Object.assign(MAPS, {
  fort: {
    name: '黑风寨', sub: '山坳深处 · 余孽未清', theme: 'mountain', w: 34, h: 26, seed: 83, dense: 0.14,
    water: [[26, 5, 2.2]],
    clear: [[14, 2, 12, 6, GR.STONE]],
    paths: [[[16, 25], [16, 18], [8, 18], [8, 10], [20, 10], [20, 6]], [[20, 10], [27, 10], [27, 17]]],
    builds: [{ x: 17, y: 2, w: 5, h: 3, s: 'fortHall', s2: 'house3' }],
    props: [{ x: 15, y: 7, s: 'brazier' }, { x: 24, y: 7, s: 'brazier' }],
    exits: [{ x: 16, y: 25, w: 2, h: 1, to: 'road', tx: 12, ty: 22 }],
    npcs: [springNpc(10, 17), chestNpc('x1', 28, 18, [['potion2', 3], ['gold', 400], ['ac2', 1]])],
    fixed: [{ x: 20, y: 6, group: ['tiebi', 'archer', 'brute'], boss: true, show: s => s.flags.q_fort === 1, pre: 'tiebi_pre', post: 'tiebi_post' }],
    foes: { n: 6, groups: [['archer', 'bandit'], ['brute'], ['archer', 'archer'], ['brute', 'archer'], ['bandit', 'bandit', 'archer']] }
  },
  cave: {
    name: '药王洞', sub: '瘴气弥漫 · 灵药深藏', theme: 'bamboo', w: 32, h: 28, seed: 91, dense: 0.22,
    water: [[16, 11, 2.2], [6, 22, 2.4]],
    clear: [[23, 19, 7, 6, 0]],
    paths: [[[0, 14], [10, 14], [10, 6], [22, 6], [22, 16], [14, 16], [14, 22], [26, 22]]],
    props: [{ x: 23, y: 19, s: 'lantern' }, { x: 29, y: 19, s: 'lantern' }],
    exits: [{ x: 0, y: 14, w: 1, h: 2, to: 'bamboo', tx: 37, ty: 20 }],
    npcs: [springNpc(9, 6), chestNpc('x2', 24, 17, [['potion2', 3], ['antidote', 3], ['gold', 600]])],
    fixed: [{ x: 27, y: 22, group: ['zhangmu', 'miasma', 'miasma'], boss: true, show: s => s.flags.q_cave === 1, pre: 'zhangmu_pre', post: 'zhangmu_post' }],
    foes: { n: 6, groups: [['miasma', 'miasma'], ['cavespider', 'miasma'], ['cavespider', 'cavespider'], ['miasma', 'miasma', 'cavespider']] }
  },
  forge: {
    name: '炼火窟', sub: '地脉火眼 · 古炉余烬', theme: 'fire', w: 34, h: 26, seed: 97, dense: 0.12,
    water: [[11, 13, 2.5], [24, 6, 2.6]],
    clear: [[23, 17, 9, 7, GR.STONE]],
    paths: [[[16, 0], [16, 8], [6, 8], [6, 18], [18, 18], [18, 13], [28, 13], [28, 20]]],
    props: [{ x: 24, y: 17, s: 'brazier' }, { x: 31, y: 17, s: 'brazier' }],
    exits: [{ x: 16, y: 0, w: 2, h: 1, to: 'fire', tx: 10, ty: 22 }],
    npcs: [springNpc(18, 9), chestNpc('x3', 5, 19, [['potion3', 2], ['mp2', 3], ['gold', 1000]])],
    fixed: [{ x: 28, y: 20, group: ['yanlong', 'magma', 'magma'], boss: true, show: s => s.flags.q_forge === 1, pre: 'yanlong_pre', post: 'yanlong_post' }],
    foes: { n: 6, groups: [['magma', 'magma'], ['lizard2', 'magma'], ['lizard2', 'lizard2'], ['magma', 'magma', 'lizard2']] }
  },
  icecave: {
    name: '冰魄窟', sub: '万载玄冰 · 狼啸雪原', theme: 'snow', w: 32, h: 28, seed: 103, dense: 0.13,
    water: [[26, 22, 2.6], [15, 10, 2]],
    clear: [[2, 19, 7, 6, GR.STONE]],
    paths: [[[31, 14], [22, 14], [22, 6], [10, 6], [10, 16], [16, 16], [16, 22], [6, 22]]],
    props: [{ x: 2, y: 19, s: 'crysI' }, { x: 8, y: 19, s: 'crysI' }],
    exits: [{ x: 31, y: 14, w: 1, h: 2, to: 'snow', tx: 2, ty: 22 }],
    npcs: [springNpc(24, 13), chestNpc('x4', 9, 6, [['potion3', 3], ['revive', 2], ['gold', 1500]])],
    fixed: [{ x: 5, y: 22, group: ['langwang', 'frostwolf', 'frostwolf'], boss: true, show: s => s.flags.q_ice === 1, pre: 'langwang_pre', post: 'langwang_post' }],
    foes: { n: 6, groups: [['frostwolf', 'frostwolf'], ['iceguard', 'frostwolf'], ['iceguard', 'iceguard'], ['frostwolf', 'frostwolf', 'iceguard']] }
  }
});
// 在原有地图上接出通往秘境的岔路（接了对应的委托之后才放行）
(() => {
  const link = (map, path, exit) => { MAPS[map].paths.push(path); MAPS[map].exits.push(exit); };
  link('road', [[12, 20], [12, 25]], { x: 12, y: 25, w: 2, h: 1, to: 'fort', tx: 16, ty: 22, need: 'q_fort', msg: '一条荒僻的岔路通向山坳深处。眼下没有理由进去。' });
  link('bamboo', [[36, 20], [39, 20]], { x: 39, y: 20, w: 1, h: 2, to: 'cave', tx: 2, ty: 14, need: 'q_cave', msg: '岩壁上有个被藤蔓遮住的洞口，瘴气正从里面渗出来。' });
  link('fire', [[10, 22], [10, 25]], { x: 10, y: 25, w: 2, h: 1, to: 'forge', tx: 16, ty: 3, need: 'q_forge', msg: '地缝里热浪逼人，深处隐约有打铁般的闷响。' });
  link('snow', [[4, 22], [0, 22]], { x: 0, y: 22, w: 1, h: 2, to: 'icecave', tx: 28, ty: 14, need: 'q_ice', msg: '风雪里有一道幽蓝的冰隙，寒气刺骨，不可贸然深入。' });
})();

/* 问剑台：十二层擂台，逐层挑战。g 对手，lv 这一层定在几级（也就是建议等级）：
   寻常的一层，对手与建议等级相同（比路上的对手高一级）；首领层，首领高一级、帮手低两级（core.js 的 foeLevels）。 */
const TOWER = [
  { g: ['bandit', 'wolf', 'wolf'], lv: 4 },
  { g: ['scout', 'scout', 'spider'], lv: 6 },
  { g: ['heifeng', 'archer', 'archer'], lv: 8, boss: 1, item: 'tk1' },
  { g: ['blade', 'blade', 'firespirit'], lv: 10 },
  { g: ['lizard', 'lizard', 'firespirit', 'firespirit'], lv: 12 },
  { g: ['zhumu', 'cavespider', 'cavespider'], lv: 14, boss: 1, item: 'tk2' },
  { g: ['swordman', 'swordman', 'icesoul'], lv: 16 },
  { g: ['deathguard', 'soulshade', 'soulshade'], lv: 18 },
  { g: ['chiyan', 'blade', 'blade'], lv: 20, boss: 1, item: 'tk3' },
  { g: ['deathguard', 'deathguard', 'swordman', 'soulshade'], lv: 22 },
  { g: ['lingshuang', 'icesoul', 'icesoul'], lv: 25, boss: 1 },
  { g: ['ye', 'deathguard', 'deathguard'], lv: 28, boss: 1, item: 'tk4' }
];

/* 支线委托：flag 值 1 = 已接下，2 = 已办成（东西在手），3 = 已交差 */
const QUESTS = [
  { id: 'q_fort', name: '失镖', who: '沈长风', where: '青岚山道南侧岔路 → 黑风寨', open: s => s.flags.ch1, text: ['黑风寨余党劫了镖局的镖银，去寨里夺回来。', '失镖已夺回，回落霞镇镖局交给沈长风。'] },
  { id: 'q_cave', name: '七叶灵芝', who: '杜大夫', where: '万竹林东侧 → 药王洞', open: s => s.flags.bambooDone, text: ['镇上染了瘴毒的人越来越多，去药王洞采一株七叶灵芝。', '灵芝到手，回落霞镇药铺交给杜大夫。'] },
  { id: 'q_forge', name: '地火精', who: '铁老三', where: '赤焰谷南侧地缝 → 炼火窟', open: s => s.flags.fireDone, text: ['铁老三想要炼火窟深处的地火精，说能淬出一口好刀。', '地火精到手，回落霞镇铁匠铺交给铁老三。'] },
  { id: 'q_ice', name: '千年冰魄', who: '寒月宫弟子', where: '寒月雪岭西侧冰隙 → 冰魄窟', open: s => s.flags.snowDone, text: ['寒月宫的护山大阵要靠冰魄重启，去冰魄窟取一块回来。', '冰魄到手，回寒月宫交给宫中弟子。'] }
];
// 与委托人交谈时调用：处理“接委托 / 交差”，返回 true 表示这次交谈已被委托占用
/* 说书先生肚子里的“狠角色”：每位首领怕什么、压箱底的是哪一招、有什么门道，照着 data.js 里的数据现编（改了首领的数据，这里的话跟着变）。
   tellerBoss 列出眼下够得着、还没打赢过的几位（等级不超过队伍三级），选一位听他讲。 */
const BOSS_DONE = { heifeng: 'heifeng', zhumu: 'bambooDone', qianmian: 'ferryDone', chenzhou: 'dockDone', shi_duel: 'shiDuel', chiyan: 'fireDone', jianying: 'cliffDone', chaoying: 'oldDone', lingshuang: 'snowDone', tgguard: 'tgDone', xuanzhu: 'cityDone', xx_su: 'xxDone', xx_bai: 'xxDone', xx_hero: 'xxDone', moxiang: 'final' };
function bossLore(id) {
  const e = ENEMIES[id], M = BOSS_MECH[id] || {}, U = e.ult && SKILLS[e.ult], el = a => a.map(k => '「' + ELEM[k].n + '」').join(''), L = [];
  L.push(e.name + '？这一段老朽说过。' +
    (e.weak && e.weak.length ? '对付' + e.name + '，用' + el(e.weak) + '这' + (e.weak.length > 1 ? '几' : '一') + '路功夫最见效：打上去更疼，架势也掉得更快。' : '没听说' + e.name + '特别怕哪一路功夫。') +
    (e.res && e.res.length ? el(e.res) + '的招式则不大管用。' : ''));
  if (U) L.push('压箱底的一招叫「' + U.name + '」，走的是「' + ELEM[U.elem].n + '」系，' + (U.tgt === 'all' ? '一招罩住所有人' : U.tgt === 'rand' ? '出手极快，落在谁身上没个准' : '盯准一个人下死手，旁人也要吃些余波') +
    '。出招之前要先蓄一手——看见了，就让挨得着的人防御；架势条若只差一口气，索性把它打空，那一招便放不出来。');
  if (M.rally) L.push('还有一手「' + M.rally.n + '」：蓄一手，把倒下的帮手再叫起来。趁蓄势的工夫打出破绽，就叫不成。');
  if (M.guarded) L.push('身边的帮手还站着的时候，打在' + e.name + '身上的力道要被卸去' + Math.round(M.guarded * 10) + '成。先清帮手，再打正主。');
  if (M.mend) L.push('还有一手「' + M.mend.n + '」：蓄一手给自己回血。用对方怕的那一路招式打中，或者打出破绽，就回不成。');
  if (M.stance) L.push('要留神「' + M.stance.n + '」的架势：摆出来的那一轮，单打独斗的招式打上去，自己要挨一记反击。改用横扫一片的招式，或者调息、防御，等它收了架势再说。');
  if (M.longCharge) L.push('那一招要蓄' + M.longCharge + '手才放，比别家的更重——可也多给了你们一手的工夫去打断。');
  if (M.armor) L.push('对方一身重甲，寻常招式打上去像挠痒。先上「破甲」，那层甲就整个不作数了。');
  if (M.ultSt) L.push('那一招打中没有防御的人，会叫人「' + STATUS[M.ultSt.id].n + '」。蓄势时防御；中了招的，得有人来解。');
  if (M.regen) L.push('身边每多一个帮手站着，' + e.name + '每一手就多回一口血。先杀谁，客官自己掂量。');
  if (M.drain) L.push('最要命的是「' + M.drain.n + '」：蓄一手之后，把你们攒下的怒气吸个干净。看见蓄这一手，绝招有就赶紧放。');
  if (M.mirror) L.push('那不是人，是照着你们自己捏出来的像：你们多强，它就多强，靠苦练是压不过的。不过……情谊深的那一位，她的像下手时会迟疑。');
  if (M.phases) L.push('它有三重变化，每变一重更凶一分。开打和每次变化的时候，可以请一块璇玑玉封住它一式——封哪一式，看你们最吃不住哪一招。');
  if (M.yield) L.push('这一场是切磋，点到为止：把对方打到剩' + Math.round(M.yield * 10) + '成气血，人家自会收手。');
  L.push('实在过不去，输上两回之后去找铁老三——他有专门对付这一路的东西。');
  return L;
}
async function tellerBoss() {
  const top = S.party.reduce((a, m) => Math.max(a, m.lv), 1), won = S.bossWin || {};
  const ids = Object.keys(ENEMIES).filter(id => ENEMIES[id].boss && id !== 'su_spar' && !won[id] && !(BOSS_DONE[id] && S.flags[BOSS_DONE[id]]) && ENEMIES[id].lv <= top + 3)
    .sort((a, b) => ENEMIES[b].lv - ENEMIES[a].lv).slice(0, 6);
  if (!ids.length) { await say('teller', '眼下江湖上叫得出名号的，客官都会过了。老朽没什么可说的喽。'); return; }
  const c = await choose('想打听哪一位？', ids.map(id => ENEMIES[id].name + '（' + ENEMIES[id].lv + ' 级）').concat('不问了'));
  if (c < 0 || c >= ids.length) return;
  await talk(bossLore(ids[c]).map(s => ['teller', s]));
}
const FIGHT_TIPS = [
  '对手头顶有两根条：红的是气血，底下淡蓝的是架势。把架势打空，对方就露出「破绽」——停一手，挨打更疼，正在蓄的招也散了。',
  '首领怒气一满，先「蓄势」一手，下一手才出大招；招名、要打谁，都亮在明处。让挨得着的人防御，或者让硬朗的人使嘲讽的功夫把它引到自己身上。',
  '用对方怕的那一路招式，架势掉得快；先给它上破甲，更快。会震晕、冰封的招式对首领不灵，可削起架势来加倍。',
  '路上头顶金字名号的是精英带队：它站着，同伙下手更狠；它倒了，同伙就泄了气。打不打、先打谁，看清了再动手。',
  '兵刃护甲隔几级就该换一档；饰品和几把神兵跟着人长，不必换。十五级起每五级能把一门招式练深一层，去人物页里挑。'
];
/* 针对性的护身之物：同一位首领手下连败两回之后（main.js 的 G.bossDefeat 记在 S.ctr 里），铁老三教一个法子。
   st 1 = 还没来问；2 = 接下了，去那张图再打赢 need 拨拦路的（world.js 的 encounter 里计数）；3 = 东西已经拿到。
   给的是专防那位首领大招那一系的饰品（data.js 的 ctr_*），两件。返回 true 表示这一趟话已经说完、不必再进铺子。 */
async function counterTalk() {
  const c = S.ctr; if (!c || c.st >= 3 || !ENEMIES[c.boss]) return false;
  const e = ENEMIES[c.boss], el = e.ult && SKILLS[e.ult] ? SKILLS[e.ult].elem : 'phys', it = ITEMS['ctr_' + el] ? 'ctr_' + el : 'ctr_phys', where = MAPS[c.map] ? MAPS[c.map].name : '那一带';
  if (c.st === 1) {
    await talk([
      ['smith', '在' + e.name + '手底下栽了两回？……那一路的功夫，我年轻时走镖见识过。'],
      ['smith', '它压箱底的那一招，走的是「' + ELEM[el].n + '」这一系的路子。硬扛是扛不住的，得有件东西替你们卸一卸。'],
      ['smith', c.need > 0 ? '去' + where + '，再打赢' + c.need + '拨拦路的，把他们的兵刃残片带回来——那一带的铁沾过那股劲。我给你们打两件【' + ITEMS[it].name + '】，不收钱。' : '等着，我这就给你们打两件【' + ITEMS[it].name + '】，不收钱。']
    ]);
    c.st = 2; G.save();
    if (c.need > 0) return true;
  }
  if (c.got < c.need) { await say('smith', '残片还差 ' + (c.need - c.got) + ' 份。' + where + '那些拦路的，打赢了就有。'); return false; }
  await talk([
    ['smith', '够了。……等着。'],
    [null, '炉火烧了小半个时辰。铁老三把两件东西丢进冷水里，嗤的一声。'],
    ['smith', '【' + ITEMS[it].name + '】，两件。给最吃不住那一招的人戴上。再输，可就不赖我的铁了。']
  ]);
  give(it, 2); c.st = 3; S.flags['ctr_' + c.boss] = 1; G.save();
  return true;
}
async function sideQuest(id) {
  const F = S.flags, q = QUESTS.find(x => x.id === id);
  if (!q.open(S) || F[id] === 3) return false;
  if (!F[id]) { await SCRIPTS[id + '_offer'](); F[id] = 1; Sfx.play('ok'); toast('接下委托：<b>' + q.name + '</b>（菜单 · 江湖 可查看）'); G.save(); return true; }
  if (F[id] === 2) { await SCRIPTS[id + '_done'](); F[id] = 3; Sfx.play('lvup'); toast('委托完成：<b>' + q.name + '</b>'); const jh = { q_fort: 'shen', q_cave: 'herb', q_forge: 'smith', q_tavern: 'jin', q_pawn: 'qian', q_lost: 'huaniang', q_ledger: 'captain' }[id]; if (jh) Jianghu.add(jh, 25); G.save(); return true; }
  return false;
}

/* 客栈夜话：住店时触发的同伴闲谈，每段只出现一次 */
const NIGHTS = [
  { id: 'n_su1', need: s => s.flags.ch1, lines: [
    [null, '夜深了。客栈的灯笼在风里轻轻晃，苏青禾还坐在窗边擦剑。'],
    ['hero', '师姐，还不睡？'],
    ['su', '睡不着。一闭眼就是师父倒在阁前的样子。'],
    ['su', '师弟，你知道我当年为什么非要拜进听雨阁吗？我家那个镇子，就是被一伙来历不明的黑衣人烧掉的。'],
    ['su', '师父路过，把我从火里拎出来。所以这回——轮到我护着听雨阁了。'],
    ['hero', '是“我们”。'],
    ['su', '……行，算你会说话。睡了睡了，明早赖床的人负责背行李。']] },
  { id: 'n_bai1', need: s => s.flags.bambooDone, lines: [
    [null, '白芷借了柜台的灯，把白天采的药草一株株摊开晾着。'],
    ['bai', '这是鬼针草，这是七星莲……啊，云少侠。吵到你了吗？'],
    ['hero', '没有。你认得的药草真多。'],
    ['bai', '师父说，医者认药，就像剑客认剑。可我有时会想：同一株草，三钱救人，一两便能杀人。'],
    ['bai', '蛛母洞里那些毒，我全都认得，全都解得开——也全都配得出来。这让我有点怕自己。'],
    ['su', '怕就对了。不怕的那种人，叫夜无殇。'],
    ['bai', '……苏姑娘安慰人的法子，真是别致。']] },
  { id: 'n_shi1', need: s => s.flags.fireDone, lines: [
    [null, '后院传来一下一下的闷响。石破军赤着上身，在月光底下劈柴。'],
    ['shi', '看什么看？掌柜的说劈一担柴免一晚房钱。'],
    ['hero', '你一个赤焰谷首徒，还在乎房钱？'],
    ['shi', '在乎。我是谷里捡来的，师父从不给我零花，说刀客的手不能软，钱袋子更不能软。'],
    ['shi', '那天赤魇打上门来，师父挡在我前头。我才明白，他那口刀再重，也是替我们扛的。'],
    ['shi', '所以别跟我客气。往后前头那个位置，归我。'],
    ['su', '说得好！那明早的包袱也归你。'],
    ['shi', '……你们听雨阁的人，是不是都这么会顺杆爬？']] },
  { id: 'n_all1', need: s => s.flags.snowDone && s.party.length >= 4, lines: [
    [null, '四个人难得凑在一张桌上。窗外，北边的天际隐隐泛着紫光。'],
    ['su', '翻过雪岭就是幽烬城了。有什么遗憾，趁今晚说。'],
    ['shi', '没喝过落霞镇最贵的酒。'],
    ['bai', '没来得及把《青囊补遗》抄完。'],
    ['su', '没赢过师父一招半式。师弟，你呢？'],
    ['hero', '我想知道，听雨剑法剩下的那三分，到底是什么。'],
    ['bai', '也许……就是今晚这样的时候。'],
    ['shi', '酸。掌柜的！上酒，记这小子账上！']] },
  { id: 'n_su2', need: s => s.flags.q_fort === 3 && s.flags.bambooDone, lines: [
    ['su', '师弟，黑风寨那个铁臂熊临死前说的话，你还记得吗？'],
    ['hero', '“每月初一，有人送银子上山”。'],
    ['su', '幽烬盟养着山贼，不是为了劫道，是为了让青岚山道上没人敢走——这样听雨阁出了事，山下三天都不会知道。'],
    ['su', '这盘棋，他们下了不止一两年。夜无殇这个人……比我想的要耐心得多。'],
    ['hero', '耐心的人，也会等来他没算到的事。'],
    ['su', '比如你？脸皮见长啊，师弟。']] }
];
async function nightTalk() {
  const F = S.flags, n = NIGHTS.find(x => !F[x.id] && x.need(S) && x.lines.every(l => !l[0] || l[0] === 'hero' || S.party.some(m => m.id === l[0])));
  if (!n) return;
  F[n.id] = 1; await talk(n.lines);
}

Object.assign(SCRIPTS, {
  // —— 失镖 · 黑风寨 ——
  async q_fort_offer() {
    await talk([
      ['shen', '小兄弟来得正好，镖局出事了。上月一趟走青岚山道的镖，连人带货被劫进了山。'],
      ['shen', '黑风虽死，他那寨子却没散，二当家“铁臂熊”收拢了残部，就窝在山道南面的山坳里。'],
      ['hero', '镖局的事，就是听雨阁的事。我去走一趟。'],
      ['shen', '好！山道往南那条岔路，尽头便是寨门。那厮一身横练功夫，莫要托大。']
    ]);
  },
  async tiebi_pre() {
    await talk([
      ['tiebi', '听雨阁的？老子正想找你们——大哥就是折在你手里的吧。'],
      ['hero', '把镖银交出来。还有，谁在背后给你们撑腰？'],
      ['tiebi', '撑腰？嘿，每月初一有人送银子上山，只要这条道上没人敢走。至于是谁……你下去问大哥吧！']
    ]);
  },
  async tiebi_post() {
    await talk([['tiebi', '银子……在后堂……那些黑衣人，早就不要我们了……'], [null, '后堂的箱笼里，镖局的封条完好无损。旁边还压着半张烧剩的信笺，落款是一团灰烬中的火。']]);
    give('biaoyin', 1); S.flags.q_fort = 2;
    await say('su', '又是幽烬盟。养着山贼封路，就为了让听雨阁孤立无援……好算计。');
  },
  async q_fort_done() {
    await talk([
      ['shen', '封条都没动过！好，好啊！小兄弟，这趟镖要是丢了，镖局三十年的招牌就砸了。'],
      ['shen', '这是镖局的谢仪，还有从那铁臂熊身上解下来的腰牌——戴着它，道上的宵小见了都得绕着走。']
    ]);
    S.items.biaoyin = 0; give('gold', 800); give('acD', 1);
  },
  // —— 七叶灵芝 · 药王洞 ——
  async q_cave_offer() {
    await talk([
      ['herb', '少侠留步。万竹林的瘴气散了，可镇上吸了瘴毒的人却一个个发起病来，寻常药石压不住。'],
      ['herb', '古方上说，药王洞深处生着一种七叶灵芝，专克瘴毒。只是那洞里……自打起了瘴，就没人活着出来过。'],
      ['bai', '药王洞是我师门的旧地。洞口就在万竹林东边的岩壁上，我认得路。'],
      ['herb', '有白芷姑娘同去，老朽就放心了。千万小心洞里的瘴气。']
    ]);
  },
  async zhangmu_pre() {
    await talk([
      [null, '洞窟尽头，一团惨绿的雾气缓缓聚成人形。雾气之下，七片颜色各异的叶子正微微发光。'],
      ['bai', '是瘴母……瘴气积了三百年，竟生出了灵智。它在守着灵芝——不，它是在吃它。'],
      ['hero', '那就不能让它再吃下去了。']
    ]);
  },
  async zhangmu_post() {
    await talk([[null, '雾气溃散。灵芝完好，只是最外一片叶子缺了个小小的齿痕。'], ['bai', '洞壁上有字……“医者三戒：不欺、不藏、不惧”。是祖师的笔迹。师父从没带我来过这里。']]);
    give('lingzhi', 1); S.flags.q_cave = 2;
  },
  async q_cave_done() {
    await talk([
      ['herb', '七色俱全，药性正足！有了它，一镇的人都有救了。'],
      ['herb', '炮制时剩下的边角料，老朽做了枚药佩，贴身戴着能固本培元。少侠莫嫌寒酸。']
    ]);
    S.items.lingzhi = 0; give('potion3', 3); give('acE', 1);
  },
  // —— 地火精 · 炼火窟 ——
  async q_forge_offer() {
    await talk([
      ['smith', '小子，听说你把赤焰谷的麻烦也平了？那正好，老子托你件事。'],
      ['smith', '赤焰谷往南有条地缝，底下是炼火窟——三百年前天工一脉炼璇玑玉的老炉子，就在那里头。'],
      ['smith', '炉子早塌了，可火眼里凝出的“地火精”还在。你给我弄一团来，老子给那使刀的大个子淬一口刀。'],
      ['shi', '给我的？……咳，那什么，我去便是。']
    ]);
  },
  async yanlong_pre() {
    await talk([
      [null, '古炉的残垣上盘着一头小山般的赤蜥，鳞缝间淌着岩浆。它的腹下，一团金红的火种静静悬着。'],
      ['shi', '好家伙，比谷里最大的那头还大三圈。'],
      ['su', '别光顾着感叹——它醒了！']
    ]);
  },
  async yanlong_post() {
    await talk([[null, '蜥王轰然倒地。那团火种落进云澈掌心，竟一点也不烫。'], ['shi', '炉壁上刻着字：“器成之日，四方共守”。原来四派守玉的约定，是在这座炉子前立下的。']]);
    give('huojing', 1); give('acF', 1); S.flags.q_forge = 2;
  },
  async q_forge_done() {
    await talk([
      ['smith', '就是它！别说话，都别说话——'],
      [null, '这一回铁老三没有抡锤。他只是把地火精按进一口旧刀胚里，看着它一寸寸亮起来。'],
      ['smith', '成了。刀名“熔心”。大个子，这刀认主，往后别拿它劈柴。'],
      ['shi', '……谢了，老头。']
    ]);
    S.items.huojing = 0; give('sbX', 1);
  },
  // —— 千年冰魄 · 冰魄窟 ——
  async q_ice_offer() {
    await talk([
      ['moon', '少侠，寒月宫还有一事相求。护山的冰阵被凌霜师姐破了阵眼，如今山门洞开。'],
      ['moon', '重启大阵需要一块千年冰魄，只有雪岭西面的冰魄窟里才有。可那里是雪狼王的巢穴……'],
      ['hero', '我们去取。']
    ]);
  },
  async langwang_pre() {
    await talk([
      [null, '冰窟最深处，一头通体雪白的巨狼卧在寒玉之上，双眼赤红。它的脚边散落着几柄断剑——剑格上都刻着月纹。'],
      ['su', '是寒月宫的剑。来取冰魄的弟子，都没能回去。'],
      ['hero', '那就由我们替她们带回去。']
    ]);
  },
  async langwang_post() {
    await talk([[null, '狼王倒下，赤红的眼睛渐渐褪成了寻常的琥珀色。寒玉之下，压着一方冰封的手札。'], ['bai', '是凌霜姑娘的字：“师父说守玉便是守心。可若心已冻住，守着的又是什么？”……她来过这里，很多次。']]);
    give('bingpo', 1); S.flags.q_ice = 2;
  },
  async q_ice_done() {
    await talk([
      ['moon', '冰魄！大阵有救了……还有这手札，我会交给师姐。她醒来以后，一直不肯说话。'],
      ['moon', '这是从狼王口中取下的獠牙，宫中巧匠已经磨成了坠子。请少侠收下。']
    ]);
    S.items.bingpo = 0; give('acG', 1); give('gold', 2000);
  },
  // —— 问剑台 ——
  async tower() {
    const done = S.tower || 0;
    if (!S.flags.ch1) { await say('keeper', '问剑台只接待真正走过江湖的人。小娃娃，等你下过几回山再来。'); return; }
    if (!S.flags.towerIntro) {
      await talk([
        ['keeper', '老夫莫问，替人守着镇外这座问剑台。台分十二层，一层一拨对手，都是老夫照着江湖上的狠角色调教出来的。'],
        ['keeper', '规矩简单：打赢一层，才许上一层；每逢三、六、九、十二层，另有一枚问剑令相赠。输了不丢人，养好伤再来。']
      ]);
      S.flags.towerIntro = 1;
    }
    if (done >= TOWER.length) { await say('keeper', '十二层你都走完了。如今该是老夫向你问剑才对——可惜，老夫这把骨头经不起喽。'); return; }
    const f = TOWER[done];
    const c = await choose('问剑台 · 第 ' + (done + 1) + ' 层（建议等级 ' + f.lv + '）', ['登台', '改日再来']);
    if (c !== 0) return;
    const r = await battle(f.g, { theme: 'town', boss: !!f.boss, noFlee: false, lv: f.lv });
    if (r === 'win') {
      S.tower = done + 1; give('gold', (done + 1) * 200); Jianghu.add('keeper', f.boss ? 10 : 5, true);
      if (f.item) { give(f.item, 1); await say('keeper', '好！这枚问剑令是你的了。'); }
      else await say('keeper', done + 1 >= TOWER.length ? '后生可畏。' : '不错。上面那层，可没这么客气。');
      G.save();
    } else if (r === 'lose') { healAll(); await say('keeper', '江湖路远，不急这一时。老夫替你推过宫了，回去歇着吧。'); }
  }
});

/* ============ 主线扩充：烟雨渡（灯会）、断剑崖（旧梦）、幽烬城（孤城） ============ */
// 与两位同伴的情谊：灯会、疗伤、夜话里的选择会累加，决定结局旁白
const bondAdd = (k, n) => { S.bond = S.bond || {}; S.bond[k] = (S.bond[k] || 0) + n; Sfx.play('ok'); toast('与 <b>' + CHARS[k].name + '</b> 的情谊加深了'); };
const bondOf = k => (S.bond && S.bond[k]) || 0;

Object.assign(MAPS, {
  ferry: {
    name: '烟雨渡', sub: '河灯万点 · 一夜灯会', theme: 'dusk', w: 40, h: 28, seed: 113, dense: 0.06,
    water: [[0.5, 25.5, 3.2], [5.5, 25.5, 3.2], [10.5, 25.5, 3.2], [15.5, 25.5, 3.2], [20.5, 25.5, 3.2], [25.5, 25.5, 3.2], [30.5, 25.5, 3.2], [35.5, 25.5, 3.2], [40, 25.5, 3.2],
      [33.5, 21, 2], [33.5, 17.5, 2], [33.5, 14, 2], [33.5, 10.5, 2], [33.5, 7, 2], [33.5, 3.5, 2], [33.5, 0.5, 2]],
    clear: [[14, 10, 13, 8, GR.STONE], [16, 18, 4, 5, 0]],   // 第二块：河滩（放灯的地方），不长树
    paths: [[[0, 14], [39, 14]], [[20, 14], [20, 24]], [[10, 14], [10, 7]], [[30, 14], [30, 8]]],
    builds: [{ x: 15, y: 6, w: 4, h: 3, s: 'ferryInn', s2: 'inn' }, { x: 23, y: 6, w: 4, h: 3, s: 'hut', s2: 'house1' }, { x: 5, y: 9, w: 4, h: 3, s: 'hut2', s2: 'house2' }, { x: 25, y: 19, w: 5, h: 3, s: 'stilt', s2: 'house3' }],
    props: [{ x: 14, y: 10, s: 'lantern' }, { x: 26, y: 10, s: 'lantern' }, { x: 14, y: 17, s: 'lantern' }, { x: 26, y: 17, s: 'lantern' }, { x: 19, y: 10, s: 'lantern' }, { x: 22, y: 10, s: 'lantern' },
      { x: 19, y: 19, s: 'lantern' }, { x: 22, y: 21, s: 'lantern' }, { x: 19, y: 22, s: 'lantern' }, { x: 8, y: 13, s: 'lantern' }, { x: 31, y: 13, s: 'lantern' }, { x: 37, y: 13, s: 'lantern' }, { x: 16, y: 15, s: 'treeR', sc: 1.25 }],
    exits: [{ x: 0, y: 14, w: 1, h: 2, to: 'town', tx: 73, ty: 31 },
      { x: 39, y: 14, w: 1, h: 2, to: 'fire', tx: 2, ty: 13, need: 'dockDone', msg: () => S.flags.ferryDone ? '白芷停下了脚步：师父或许就在下游的沉舟坞。先乘栈桥尽头的船去看看。' : S.flags.lantern ? '桥头的缆索还锁着。那个戴面具的人逃向了渡口南面的栈桥！' : '桥头的缆索锁着，几个戴面具的人守在那里。先去渡口找船家打听打听。' }],
    npcs: [
      { who: 'boatman', x: 22, y: 19, talk: 'boatman', face: -1, mark: s => !s.flags.lantern },
      { who: 'lampwoman', x: 17, y: 12, talk: 'lampwoman', mark: s => s.flags.ferryDone && !s.flags.lampTold },
      springNpc(24, 15),
      chestNpc('y1', 10, 6, [['ac2', 1], ['potion2', 2]]),
      chestNpc('y2', 30, 7, [['gold', 400], ['mp2', 2]])
    ],
    fixed: [{ x: 20, y: 22, group: ['qianmian', 'spy', 'spy'], boss: true, show: s => s.flags.lantern && !s.flags.ferryDone, pre: 'qianmian_pre', post: 'qianmian_post' }],
    foes: { n: 5, groups: [['pirate', 'pirate'], ['spy', 'pirate'], ['spy', 'spy'], ['pirate', 'pirate', 'spy']] }
  },
  cliff: {
    name: '断剑崖', sub: '听雨阁后山 · 剑折之处', theme: 'mist', w: 32, h: 30, seed: 127, dense: 0.13,
    water: [[27, 5, 2.4], [16, 22, 2.2]],
    clear: [[11, 2, 11, 5, GR.STONE]],
    paths: [[[0, 24], [10, 24], [10, 16], [22, 16], [22, 8], [16, 8], [16, 5]], [[10, 16], [4, 16], [4, 10]], [[22, 16], [28, 16], [28, 22]]],
    props: [{ x: 11, y: 6, s: 'lantern' }, { x: 21, y: 6, s: 'lantern' }, { x: 13, y: 2, s: 'rockM' }, { x: 19, y: 2, s: 'rockM' }],
    exits: [{ x: 0, y: 24, w: 1, h: 2, to: 'tingyu', tx: 27, ty: 12 }],
    npcs: [
      { who: 'tombkeeper', x: 6, y: 23, talk: 'tombkeeper', mark: s => !s.flags.tombTalk },
      springNpc(12, 6),
      chestNpc('d1', 4, 9, [['acS', 1], ['potion2', 3]]),
      chestNpc('d2', 28, 24, [['revive', 2], ['gold', 900]])
    ],
    fixed: [{ x: 16, y: 4, group: ['jianying', 'swordsoul', 'swordsoul'], boss: true, show: s => !s.flags.cliffDone, pre: 'jianying_pre', post: 'jianying_post' }],
    foes: { n: 6, groups: [['swordsoul', 'swordsoul'], ['tombguard', 'swordsoul'], ['tombguard'], ['swordsoul', 'swordsoul', 'tombguard']] }
  },
  city: {
    name: '幽烬城', sub: '残烛万盏 · 无人之城', theme: 'ash', w: 36, h: 36, seed: 131, dense: 0.11,
    water: [[13, 23, 2.6], [28, 10, 2.6], [5, 10, 2.4], [30, 28, 2.6], [22, 23, 1.6]],
    clear: [[12, 3, 13, 5, GR.STONE]],
    paths: [[[18, 35], [18, 28], [8, 28], [8, 18], [35, 18]], [[18, 18], [18, 7]], [[8, 28], [4, 28], [4, 22]], [[26, 18], [26, 26]]],
    builds: [{ x: 15, y: 0, w: 6, h: 3, s: 'hallAsh', s2: 'hallFire' }],
    props: [{ x: 12, y: 3, s: 'brazier' }, { x: 24, y: 3, s: 'brazier' }, { x: 12, y: 7, s: 'brazier' }, { x: 24, y: 7, s: 'brazier' }, { x: 17, y: 12, s: 'brazier' }, { x: 20, y: 12, s: 'brazier' }, { x: 17, y: 16, s: 'crysP' }, { x: 20, y: 16, s: 'crysP' }],
    exits: [{ x: 18, y: 35, w: 2, h: 1, to: 'snow', tx: 33, ty: 2 },
      { x: 35, y: 18, w: 1, h: 2, to: 'abyss', tx: 18, ty: 33, need: 'cityDone', msg: '东门外黑潮翻涌。门楼上的残烛还亮着——守城的人还在殿中。' }],
    npcs: [
      springNpc(14, 6),
      chestNpc('u1', 4, 21, [['acU', 1], ['potion3', 2]]),
      chestNpc('u2', 26, 28, [['revive', 2], ['gold', 1500]])
    ],
    fixed: [{ x: 18, y: 5, group: ['xuanzhu', 'ashguard', 'ashguard'], boss: true, show: s => !s.flags.cityDone, pre: 'xuanzhu_pre', post: 'xuanzhu_post' }],
    foes: { n: 7, groups: [['ashguard', 'ashguard'], ['ashmage', 'ashguard'], ['ashmage', 'ashmage'], ['ashguard', 'ashguard', 'ashmage'], ['deathguard', 'ashmage']] }
  }
});

NIGHTS.push(
  { id: 'n_lamp', need: s => s.flags.ferryDone, lines: [
    [null, '半夜，云澈被窗外的水声吵醒。客栈后院的井边，苏青禾和白芷并肩坐着，中间放着那半盏焦黑的河灯。'],
    ['bai', '苏姑娘，你说，写下这两个字的人，后来怎么样了？'],
    ['su', '多半没什么好下场。灯都烧成这样了。'],
    ['bai', '……苏姑娘若是放灯，会写谁的名字？'],
    ['su', '我？我写师父长命百岁。你呢？'],
    ['bai', '我写了师父平安。还有……'],
    ['su', '还有？'],
    ['bai', '没、没有了。'],
    [null, '云澈悄悄退回屋里。不知为什么，他忽然很想知道那个“还有”。']] },
  { id: 'n_cliff', need: s => s.flags.cliffDone, lines: [
    [null, '苏青禾肩上还缠着药布，却非要坐在屋顶上喝酒。云澈只好跟着爬上去。'],
    ['su', '别唠叨。白芷说了，小酌活血。'],
    ['hero', '她说的是“忌酒”。'],
    ['su', '……你听错了。'],
    ['su', '师弟。那一剑飞过来的时候，我什么都没想。真的，身子自己就动了。'],
    ['su', '后来躺在榻上才后怕——不是怕死。是怕我死了，你这个闷葫芦，会不会也变成夜师伯那样。'],
    ['hero', '会。'],
    ['su', '……你就不能说句“不会”哄哄我？'],
    ['hero', '所以师姐得好好活着。'],
    ['su', '行吧。为了江湖太平，我勉为其难。']] },
  { id: 'n_bai3', need: s => s.flags.snowDone, lines: [
    [null, '白芷坐在灯下，对着凌霜留下的那册旧剑谱出神。扉页上有一行娟秀的小字。'],
    ['bai', '“雪岭无春，君来即是。”……这是叶姑娘写的。'],
    ['bai', '云少侠，寒月宫的规矩说，圣女不可动情。可我读遍了医书，没有哪一味药，能叫人不动情。'],
    ['hero', '也许那条规矩，本来就不是给人守的。'],
    ['bai', '嗯。……师父也说过，万竹林的传人，要一辈子守着那片林子。'],
    ['bai', '可是林子不会跑。人，是会走远的。'],
    ['hero', '白芷？'],
    ['bai', '没什么。我是说……等这一切结束，我想先不回林子。想去看看你说过的，听雨阁的雨。']] }
);

Object.assign(SCRIPTS, {
  /* ---------- 烟雨渡 ---------- */
  async boatman() {
    const F = S.flags;
    if (F.ferryDone) { await say('boatman', F.dockDone ? '桥头的缆索解了。往东过了桥，再走半日便是赤焰谷。几位，一路顺风。' : '沉舟坞在下游十里，三面是水。栈桥尽头那条船，几位只管撑去——那伙人掳了那么多郎中，老汉早看不过眼了。'); return; }
    if (F.lantern) { await say('boatman', '那戴面具的往南边栈桥上去了！几位当心，那人邪性得很。'); return; }
    await Cine.begin(() => {
      Cine.put('hero', 21, 17.5, 0.6); Cine.put('su', 19.9, 17.0, 0.6); Cine.put('bai', 21.7, 16.4, 0.6);
      Cine.npc('boatman'); for (const id of ['hero', 'su', 'bai']) Cine.face(id, 'boatman'); Cine.face('boatman', 'hero');
      Cine.wide(['hero', 'boatman', 'su'], { yaw: -0.5, pitch: 0.22 });
    }, { party: false });
    await Cine.talk([
      ['boatman', '几位要过河？对不住，今晚桥不放行，船也不开。'],
      ['su', '为什么？我们有急事要去赤焰谷。'],
      ['boatman', '今儿是烟雨渡的河灯会。老规矩：灯不放完，桥头的缆索不解，怕惊了河里的灯。'],
      ['boatman', '不过嘛……今年这规矩守得格外严。桥头多了些生面孔，个个戴着面具，说是灯会请来的戏班子。'],
      ['bai', '戏班子？'],
      ['boatman', '谁知道呢。几位既然来了，不如也去放一盏。等灯会散了，老汉头一个送你们过去。'],
      [null, '暮色四合，满街的灯笼一盏盏亮了起来。河面上，已经漂着星星点点的灯火。', () => { Cine.wide([[20, 12], [20, 21]], { yaw: 0.25, pitch: 0.5, dist: 15, drift: 0.5 }); }],
      ['su', '……反正也过不去。师弟，逛逛？那边有猜灯谜的。'],
      ['bai', '我、我想去河边放一盏灯。给师父祈个平安。']
    ]);
    const c = await choose('灯会只有一晚。云澈决定——', ['陪师姐去猜灯谜', '陪白芷去河边放灯', '留下看着行囊，让她们去逛']);
    let fake = 'su';
    if (c === 0) {
      fake = 'bai';
      await Cine.cut(() => {
        Cine.put('hero', 18.4, 14.6, 0.5); Cine.put('su', 19.5, 14.3, -0.4); Cine.set('bai', { hide: true }); Cine.set('su', { nowp: true }); Cine.set('hero', { nowp: true });
        Cine.wide(['hero', 'su'], { yaw: 0.1, pitch: 0.14, dist: 4.6 });
      });
      await Cine.talk([
        [null, '灯谜摊前挤满了人。苏青禾一口气猜中七个，赢回来一只兔子灯，硬塞进云澈手里。'],
        ['su', '拿着。小时候镇上过节，我娘也给我扎过一只。后来镇子没了，灯也没了。'],
        ['hero', '师姐……'],
        ['su', '别用那种眼神看我。我是想说——'],
        ['su', '这回下山，其实我挺怕的。怕护不住师父，也怕护不住你。'],
        ['hero', '那换我护着师姐。'],
        ['su', '……就凭你那七分形似的剑法？'],
        [null, '她别过脸去。灯影里，耳根却悄悄红了。', () => { Cine.look('su', null); Cine.face('su', -1.7); Cine.close('su', { yaw: -0.5, dist: 2.2, ang: 0.2 }); Cine.push(0.86, 5); }]
      ]);
      bondAdd('su', 2);
      await Cine.talk([
        [null, '人群里挤过来一个熟悉的身影。白衣，药囊，正是白芷。', () => { Cine.put('bai', 15.3, 16.6, 1.0); Cine.set('bai', { nowp: true }); Cine.wide(['hero', 'su', [16.2, 16]], { yaw: 0.45, pitch: 0.2 }); Cine.go('bai', 17.3, 15.5, 1.8); Cine.face('hero', [15, 17]); Cine.face('su', [15, 17]); }],
        ['bai', '云大哥，苏姐姐！我在河湾里找到一条小船，船家肯悄悄送我们过去。'],
        ['bai', '只是船小浪急……云大哥，璇玑玉先交给我收着吧，我的药囊不怕水。']
      ]);
    } else if (c === 1) {
      await Cine.cut(() => {
        Cine.put('hero', 17.3, 21.3, 0.2); Cine.put('bai', 18.4, 21.5, 0); Cine.set('su', { hide: true }); Cine.set('hero', { nowp: true }); Cine.set('bai', { nowp: true });
        Cine.wide(['hero', 'bai'], { yaw: 0.25, pitch: 0.12, dist: 4.8 });
      });
      await Cine.talk([
        [null, '河滩上，白芷把一盏莲花灯托在掌心，认认真真地写了很久。'],
        ['bai', '写好了。……不许偷看。'],
        ['hero', '写的是百草翁前辈吧。'],
        ['bai', '嗯。师父平安。还有……还有两个名字，是这一路上才认得的人。'],
        [null, '她俯身把灯放进水里。灯火映着她的侧脸，一明一暗。', async () => { Cine.look('bai', null); Cine.wide(['hero', 'bai'], { yaw: -0.5, pitch: 0.1, dist: 4.4 }); Cine.set('bai', { pose: 'act', act: 'place', from: 0.4, to: 5.0, loop: false, part: 0.5 }); await Cine.wait(1.8); }],
        ['bai', '云少侠，我从小在林子里长大，没见过这么多人，这么多灯。', async () => { await Cine.wait(1.2); Cine.set('bai', { part: null }); }],
        ['bai', '师父被掳走的时候，我以为这世上只剩我一个人了。现在……好像不是。'],
        ['hero', '不是。往后也不会是。'],
        ['bai', '……嗯。'],
        [null, '那盏灯漂出去很远，她才发觉自己一直攥着他的袖角，慌忙松开了手。', () => { Cine.set('bai', { pose: 'idle', act: null }); Cine.wide(['hero', 'bai'], { yaw: 0.2, pitch: 0.1, dist: 4.2 }); Cine.push(0.84, 6); }]
      ]);
      bondAdd('bai', 2);
      await Cine.talk([
        [null, '身后传来脚步声。苏青禾提着一只兔子灯，不知什么时候站在了柳树下。', () => { Cine.put('su', 17.0, 18.2, 0); Cine.set('su', { nowp: true }); Cine.wide(['hero', 'bai', [17, 18.5]], { yaw: 0.9, pitch: 0.22 }); Cine.go('su', 17.3, 19.8, 1.6); Cine.face('hero', [17, 18]); Cine.face('bai', [17, 18]); }],
        ['su', '云澈，白姑娘。桥头那些人在挨个搜身，是冲着玉来的。'],
        ['su', '云澈，把玉给我。我轻功好，先带过河去，你们随后跟上。']
      ]);
    } else {
      await Cine.cut(() => {
        Cine.put('hero', 19.3, 20.4, 0.9); Cine.set('hero', { pose: 'act', act: 'sit', loop: true, nowp: true, part: 0.5 }); Cine.set('su', { hide: true }); Cine.set('bai', { hide: true });
        Cine.face('boatman', 'hero'); Cine.wide(['hero', 'boatman'], { yaw: 0.2, pitch: 0.18 });
      });
      await Cine.talk([
        [null, '云澈坐在渡口的石阶上守着行囊。远处的灯谜摊前，传来苏青禾赢了彩头的欢呼，和白芷小声的劝阻。'],
        ['boatman', '后生，不去逛逛？这灯会一年才一回。'],
        ['hero', '总得有人看着东西。'],
        ['boatman', '嘿。老汉年轻时也这么想。后来才明白：东西丢了能再挣，有些灯，过了今晚，就没人陪你放了。'],
        [null, '船家递来一碗热姜汤，摇着头走开了。不多时，苏青禾独自一人走了回来。', () => { Cine.put('su', 17.4, 17.8, 0.6); Cine.set('su', { nowp: true }); Cine.set('hero', { pose: 'idle', act: null, part: null }); Cine.wide(['hero', [17.6, 18.6]], { yaw: 0.8, pitch: 0.2 }); Cine.go('su', 18.3, 19.4, 1.6); Cine.face('hero', [17, 18]); }],
        ['su', '云澈，白姑娘还在看灯。桥头那些人在挨个搜身，是冲着玉来的。'],
        ['su', '云澈，把玉给我。我轻功好，先带过河去，你们随后跟上。']
      ]);
    }
    const name = CHARS[fake].name;
    const d = await choose('「' + name + '」伸出了手——', ['把青玉递过去', fake === 'bai' ? '「白芷从不叫我云大哥。」' : '「师姐从不叫我的名字。」']);
    // 假扮者现出原形，向栈桥飘退
    const flee = async () => {
      const f = Cine.get(fake); if (!f) return;
      Cine.shake(0.35); UI.flash();
      Cine.put('qianmian', f.x - 0.5, f.z - 0.5, f.yaw, ENEMIES.qianmian.look); f.hide = true;
      Cine.wide([[f.x - 0.5, f.z - 0.5], [20, 20.5], 'hero'], { yaw: -0.7, pitch: 0.3 });
      await Cine.go('qianmian', 20.4, 20.7, 7); Cine.face('qianmian', 'hero');
    };
    if (d === 1) {
      await Cine.talk(fake === 'bai' ? [
        ['hero', '白芷从不叫我云大哥。她也从不开口要玉——当初，是她自己把碧玉交出来的。'],
        [null, '「白芷」的笑容僵了一瞬。下一刻，她的身形向后飘出三丈，声音已换了一副腔调。', flee],
        ['qianmian', '哎呀。小剑客倒把那丫头记得清楚。']
      ] : [
        ['hero', '师姐从不叫我的名字。她只叫我师弟——气急了，叫臭小子。'],
        [null, '「苏青禾」手里的兔子灯晃了晃。下一刻，她的身形向后飘出三丈，笑声已换了一副腔调。', flee],
        ['qianmian', '哎呀。小剑客倒把你那师姐记得清楚。']
      ]);
      bondAdd(fake, 1);
    } else {
      await Cine.talk([
        [null, '指尖相触的一瞬，一蓬细如牛毛的毒针自她袖中激射而出！', () => { Cine.shake(0.6); UI.flash(); Sfx.play('crit'); Cine.set('hero', { pose: 'hit' }); }],
        ['hero', '唔——！'],
        [null, '云澈拼着中针，反手扣回了青玉。那人一击不中，身形向后飘出三丈。', async () => { Cine.set('hero', { pose: 'idle' }); await flee(); }],
        ['qianmian', '可惜。只差一点。']
      ]);
      const h = S.party[0]; h.hp = Math.max(1, Math.round(h.hp * 0.5)); UI.hud(); toast('云澈 中了毒针，气血大损');
    }
    const arrive = (id, x, y) => () => { Cine.put(id, x - 2.2, y - 1.6, 0.8); Cine.set(id, { nowp: false }); Cine.go(id, x, y, 4.5); Cine.set('hero', { nowp: false }); };
    const hp = Cine.get('hero'), hx = hp ? hp.x - 0.5 : 18, hy = hp ? hp.z - 0.5 : 15;
    await Cine.talk([
      ['qianmian', '幽烬盟千面，奉盟主之命，来瞧瞧听雨阁的传人。想过河——就到栈桥上来。']
    ].concat(fake === 'bai' ? [
      [null, '真正的白芷这时才从人群里挤出来，外衫不见了，气喘吁吁。', arrive('bai', hx - 1.0, hy + 0.4)],
      ['bai', '云少侠！苏姑娘！有人在河边点了我的穴道，换走了我的衣裳……你们没事吧？'],
      ['su', d === 1 ? '没事。你的云少侠，眼睛尖得很。' : '师弟中了针！白芷，快给他看看——然后我们去拆了那座栈桥！']
    ] : [
      [null, '真正的苏青禾这时才从巷子里冲出来，头发上还沾着草屑。', arrive('su', hx - 1.0, hy + 0.4)],
      ['su', '师弟！刚才有个王八蛋敢拿迷烟熏我——人呢？！'],
      c === 2 ? ['bai', '苏姑娘追着一个人影就跑，我、我跟不上……云少侠，你没事吧？', arrive('bai', hx + 1.0, hy + 0.6)] : ['bai', d === 1 ? '往栈桥去了。苏姑娘，云少侠一眼就认出那不是你。' : '苏姑娘，先别追！云少侠中了毒针，让我看看。'],
      ['su', '……哼。算他有良心。追！']
    ]));
    await Cine.end();
    F.lantern = 1; F.lanternWith = c === 0 ? 'su' : c === 1 ? 'bai' : '';
    setQuest('千面逃向了渡口南面的栈桥。追上去！');
  },
  async lampwoman() {
    const F = S.flags;
    if (!F.ferryDone) {
      await say('lampwoman', '河灯嘞——三文钱一盏。写上心上人的名字，顺水漂过三座桥，来世还能遇上。');
      if (!F.lantern && S.party.length >= 3) await talk([['su', '……骗小孩的。'], ['bai', '可是，很好看呀。']]);
    } else if (!F.lampTold) {
      await talk([
        [null, '云澈取出那半盏焦黑的河灯。卖灯婆婆眯着眼看了半晌，手忽然抖了一下。'],
        ['lampwoman', '这灯骨是老婆子扎的。二十年了……竹篾上这道记号，错不了。'],
        ['lampwoman', '那年灯会，来了个白衣裳的后生，剑上系着青穗子。身边跟着个姑娘，冷冷清清的，像是雪山上下来的人。'],
        ['lampwoman', '两个人买了一盏灯，一人写一个名字。那姑娘写完，笑了一下——老婆子卖了一辈子灯，没见过那么好看的笑。'],
        ['bai', '后来呢？'],
        ['lampwoman', '后来？第二年，后生一个人来的。在栈桥上站了一夜，把灯点着了，又自己伸手进火里抢出来。'],
        ['lampwoman', '手烧成那样，一声也没吭。从那以后，再没见过他。'],
        ['su', '青穗子……那是听雨阁的剑穗。'],
        ['hero', '…………']
      ]);
      F.lampTold = 1;
    } else await say('lampwoman', F.final ? '今年的灯，老婆子替他们放了。两个名字，写在一块儿。' : '那后生若还在世，替老婆子带句话：灯还给他留着。名字，老婆子替他重新写。');
  },
  async qianmian_pre() {
    await Cine.begin(() => {
      Cine.put('hero', 20.5, 20.0, 0); Cine.put('su', 19.4, 20.3, 0); Cine.put('bai', 21.6, 20.3, 0);
      const q = Cine.foe('qianmian'); if (q) q.yaw = Math.PI;
      Cine.wide(['qianmian', 'hero'], { yaw: 1.0, pitch: 0.2, dist: 7 });
    }, { party: false });
    await Cine.talk([
      [null, '栈桥尽头，那人已撕下了脸上的面具。面具之下，仍是一张面具。'],
      ['qianmian', '听雨阁的小剑客。妾身扮过三百张脸，敢追到这儿来的，你是第二个。'],
      ['hero', '第一个是谁？'],
      ['qianmian', '我家盟主。二十年前，也是在这座栈桥上。'],
      ['su', '少废话。封桥、扣船，就为了偷一块玉？'],
      ['qianmian', '偷？盟主要的东西，从来不必偷。妾身只是想替他瞧瞧：苍梧的徒弟，身边站着的，是什么样的人。'],
      ['qianmian', '如今瞧过了。可惜，你们也瞧过了妾身的脸——虽然哪一张都不是真的。']
    ]);
    await Cine.end(true);
  },
  async qianmian_post() {
    const w = S.flags.lanternWith;
    await talk([
      ['qianmian', '咳……好，好得很。'],
      ['qianmian', '小剑客，送你一样东西，算是妾身输的彩头。往后见了盟主，替我问他一句：这盏灯，他还认不认得。'],
      [null, '千面从袖中取出半盏焦黑的河灯，轻轻放在栈桥上，随即纵身跃入满河灯火之中，不见了踪影。'],
      ['bai', '这盏灯……被火烧过。灯纸上还有字。'],
      ['hero', '“疏影”。'],
      ['su', '是个名字？谁的？'],
      [null, '没有人答得上来。河面上，千万盏灯正顺流而下，像一条不肯熄灭的星河。']
    ].concat(w === 'su' ? [
      ['su', '啧，兔子灯落在摊子上了……算了。'],
      ['hero', '我收着呢。'],
      ['su', '……谁、谁让你收着的。给我。']
    ] : w === 'bai' ? [
      ['bai', '我们的那盏，已经漂得看不见了。云少侠，你方才许了什么愿？'],
      ['hero', '说出来就不灵了。'],
      ['bai', '那……等它灵了，你再告诉我。']
    ] : [
      ['su', '师弟，下回灯会，不许再一个人守行李。'],
      ['bai', '嗯。行囊可以锁在客栈里的。']
    ]));
    give('hedeng', 1);
    await talk([
      ['bai', '……等等。她方才撒的迷药，是“眠蝉散”。这方子只有师父会配。'],
      ['su', '你是说，百草翁前辈在替他们配药？'],
      ['bai', '师父不会甘心替他们做事。除非——他们手里，不止他一个郎中。'],
      [null, '栈桥尽头，千面来时的那条乌篷船还系在桩上。船家远远喊了一声：那伙戴面具的，是从下游的沉舟坞撑船上来的！这半年，十里八乡丢了七八个郎中……']
    ]);
    S.flags.ferryDone = 1; S.chapter = chapterOf(S.flags);
    setQuest('千面的船还系在栈桥尽头。乘船顺流而下，去沉舟坞找被掳走的郎中。（卖灯婆婆或许认得这盏河灯）');
    UI.banner(CHAPTERS[S.chapter], '顺流而下 · 沉舟坞');
  },

  /* ---------- 断剑崖 ---------- */
  async tombkeeper() {
    const F = S.flags;
    if (F.cliffDone) { await say('tombkeeper', F.final ? '少爷……到底是回家了。老奴这顿饭，往后摆在崖边，敬他，也敬那位叶姑娘。' : '少爷的剑，就拜托几位带去了。若是见着他——告诉他，后山的饭，老奴还每日热着。'); return; }
    if (F.tombTalk) { await say('tombkeeper', '崖顶风大。……见了那影子，替老奴看一眼，它瘦了没有。'); return; }
    await talk([
      ['tombkeeper', '多少年没人走这条路了。……青穗子。是苍梧少爷的徒弟？'],
      ['hero', '晚辈云澈。前辈是？'],
      ['tombkeeper', '老奴姓忠，从前是无殇少爷的剑童。少爷走后，老奴就守在这儿，替他守着那半截剑。'],
      ['tombkeeper', '崖顶有座剑冢。少爷折剑那天，把二十年的剑意一并留在了上头。日子久了，剑意成了形——是个白衣的影子，还是他二十岁时的模样。'],
      ['tombkeeper', '它不认人，只认剑。谁上崖，它便与谁过招。老奴上去送过一回饭，躺了三个月。'],
      ['su', '……送饭？给一个影子？'],
      ['tombkeeper', '少爷从前练起剑来，总忘了吃饭。'],
      ['bai', '忠伯……'],
      ['tombkeeper', '几位若要上去，沿石阶走到头便是。路上的剑灵、石俑都是剑意所化，莫要轻敌。']
    ]);
    F.tombTalk = 1;
  },
  async jianying_pre() {
    const P = Math.PI;
    await Cine.begin(() => {
      Cine.put('hero', 16, 7.3, P); Cine.put('su', 14.9, 8.0, P); Cine.put('bai', 17.2, 8.1, P); Cine.put('shi', 16.1, 8.9, P);
      const j = Cine.foe('jianying'); if (j) j.yaw = P;   // 背对众人
      Cine.grade('pale');
      Cine.wide([[16, 4], 'hero'], { yaw: 0.55, pitch: 0.32 });
    });
    await Cine.talk([
      [null, '崖顶剑冢。半截断剑斜插在青石之中，剑穗早已褪成了灰白。'],
      [null, '一道白衣人影背对众人，立在崖边。它缓缓回过身来——那张脸很年轻，眉眼之间，依稀有几分像顾苍梧。', () => { Cine.close('jianying', { yaw: 0, dist: 4.4, part: 0.7, ang: 0.25, drift: 0.22 }, 1.4); Cine.face('jianying', 0); }],
      ['jianying', '……疏影，是你来了？'],
      ['hero', '师伯……？'],
      ['jianying', '不是她。'],
      ['jianying', '听雨剑。苍梧的起手式。——你也是来拦我的。'],
      ['shi', '它听不进人话。云兄弟，当心！']
    ]);
    await Cine.end(true);
  },
  async jianying_post() {
    const P = Math.PI;
    await Cine.begin(() => {
      Cine.put('hero', 16, 6.6, P); Cine.put('su', 14.4, 7.7, P); Cine.put('bai', 18.7, 8.3, P); Cine.put('shi', 17.9, 9.4, P);
      Cine.put('jianying', 16, 4, 0, ENEMIES.jianying.look);
      Cine.grade('pale');
      Cine.wide(['jianying', 'hero', 'su'], { yaw: 0.6, pitch: 0.3 });
    });
    await Cine.talk([
      [null, '白衣剑影的身形渐渐淡去。就在众人松一口气的刹那，那半截断剑忽然自石中铮然飞起，直取云澈后心——', () => { Cine.tween(Cine.get('jianying'), { alpha: 0.45 }, 1.6); Cine.face('hero', 'su'); }],
      ['su', '师弟！！', () => { Cine.rate(0.4); Cine.wide(['hero', 'su'], { yaw: P / 2, pitch: 0.14, dist: 5.2 }); Cine.go('su', 15.5, 6.9, 5); return false; }],
      [null, '苏青禾撞开了云澈。断剑贯肩而过，将她带退三步，血溅在青石上。', async () => {
        if (!Cine.on()) return;
        Cine.face('su', 'hero'); Cine.set('su', { pose: 'act', act: 'shove', from: 0.2, to: 1.2, loop: false });
        await Cine.wait(0.5);
        Cine.set('hero', { pose: 'dodge' }); Cine.tween(Cine.get('hero'), { x: 17.6 }, 0.5, { world: true });
        await Cine.wait(0.45);
        Cine.rate(1); Cine.shake(0.5); UI.flash(); Sfx.play('crit');
        Cine.set('su', { pose: 'hit', act: null }); Cine.face('su', P);
        await Cine.tween(Cine.get('su'), { z: Cine.get('su').z + 1.1 }, 0.5, { world: true });
        Cine.set('su', { pose: 'act', act: 'kneel', at: 0.05, part: 0.5 }); Cine.set('hero', { pose: 'idle' });
        Cine.close('su', { dist: 3.2, up: 0.5 });
      }],
      ['hero', '师姐！！', async () => { Cine.go('hero', 16.7, 8.1, 4.5); await Cine.wait(0.4); }],
      ['jianying', '……为什么要挡。', () => { Cine.face('hero', 'su'); Cine.set('hero', { pose: 'act', act: 'kneel', at: 0.05, part: 0.5 }); }],
      ['su', '咳……问得真多余。他是我师弟。'],
      [null, '剑影怔住了。它低头看着自己的手，像是第一次看清上面的血。', () => { Cine.close('jianying', { dist: 3.2, part: 0.75 }); }],
      ['jianying', '那一年……她也是这样，挡在我前面，走进了那扇门。'],
      ['jianying', '原来挡剑的人，是不疼的。疼的，是被留下的那一个。'],
      [null, '白衣人影散作满崖风絮。断剑落地，剑身上“无殇”二字之侧，有一行被指力抹去的小字。', () => { Cine.wide(['jianying', [16, 5.5]], { yaw: 0.4, pitch: 0.34, dist: 7 }); Cine.tween(Cine.get('jianying'), { alpha: 0 }, 2.2); }],
      ['bai', '让开！按住她的肩井穴——云少侠，别发愣，按住！', async () => { Cine.set('jianying', { hide: true }); Cine.go('bai', 14.9, 8.5, 4.5); await Cine.wait(0.5); Cine.wide(['su', 'hero', 'bai'], { yaw: -0.5, pitch: 0.28, dist: 5 }); return false; }]
    ]);
    await UI.fade(1); Cine.kill();
    World.enter('tingyu', 14, 10); healAll(); UI.hud();
    // 当夜：听雨阁的石阶上
    await Cine.begin(() => {
      Cine.grade('night'); Cine.hideNpcs(true);
      Cine.put('hero', 14.2, 9.4, 0); Cine.set('hero', { pose: 'act', act: 'sit', loop: true, nowp: true, part: 0.5 });
      Cine.wide(['hero'], { yaw: 0.35, pitch: 0.24, dist: 7.5 });
    }, { party: false });
    await Cine.talk([
      [null, '当夜，听雨阁。苏青禾的伤口已经包好，人还昏睡着。药炉在廊下咕嘟作响，后山的方向，风声一阵紧似一阵。']
    ]);
    const c = await choose('这一夜，云澈——', ['守在师姐门外', '去廊下帮白芷煎药', '独自回崖顶，看看那柄断剑']);
    S.flags.cliffNight = ['su', 'bai', 'alone'][c];
    if (c === 0) {
      Cine.put('su', 15, 6.4, 0); Cine.set('su', { nowp: true });
      await Cine.talk([
        [null, '后半夜，苏青禾醒了。她披衣走到廊下，看见云澈还坐在石阶上守着，一步也没挪过。', () => { Cine.wide(['su', 'hero'], { yaw: 0.25, pitch: 0.2 }); Cine.go('su', 15.0, 8.5, 1.1); }],
        ['su', '……傻坐着干什么，不冷吗。'],
        ['hero', '师姐！你怎么起来了——'],
        ['su', '躺不住。……往边上挪挪。'],
        [null, '她挨着他坐下，没受伤的那只手，很自然地搁在了他的手背上。', async () => { await Cine.go('su', 15.05, 9.4, 1.1); Cine.face('su', 0); Cine.set('su', { pose: 'act', act: 'sit', loop: true, part: 0.5 }); Cine.wide(['su', 'hero'], { yaw: 0, pitch: 0.1, dist: 4.4, part: 0.42 }); }],
        ['su', '师弟，我刚才做了个梦。梦见我们俩都老了，还在檐下吵架，吵师父当年到底偏心谁。'],
        ['hero', '那一定是我吵输了。'],
        ['su', '嗯。你从小就吵不过我。'],
        ['su', '……所以往后也别想着一个人往前冲。要挡剑，轮不到你。'],
        ['hero', '师姐。下一回，换我。'],
        ['su', '没有下一回。——我们谁都不许再有下一回。', () => { Cine.wide(['su', 'hero'], { yaw: 0, pitch: 0.1, dist: 4.4, part: 0.42 }); Cine.push(0.8, 6); return false; }]
      ]);
      bondAdd('su', 2);
    } else if (c === 1) {
      Cine.put('bai', 17.3, 8.4, -1.2); Cine.set('bai', { nowp: true, pose: 'act', act: 'chat', loop: true });
      Cine.set('hero', { pose: 'idle', act: null, part: null });
      await Cine.talk([
        [null, '药炉前，白芷的手一直在抖，药杵几次磕在碗沿上。云澈接过药杵，替她捣了下去。', async () => { Cine.wide(['bai', 'hero'], { yaw: 0.3, pitch: 0.2 }); await Cine.go('hero', 16.3, 8.6, 1.4); Cine.face('hero', 'bai'); Cine.face('bai', 'hero'); Cine.set('bai', { pose: 'idle', act: null }); }],
        ['bai', '……苏姑娘的伤不碍事，没伤到筋骨。我只是……'],
        ['bai', '我只是在想，方才若是我离得近些，我有没有胆子，像她那样扑上去。'],
        ['hero', '是你救了她。那一刻所有人都慌了，只有你没有。'],
        ['bai', '那是因为我是大夫。大夫不能慌。可是云少侠——'],
        ['bai', '大夫也是会怕的。我怕有一天躺在那里的是你，而我的药，来不及。'],
        [null, '炉火噼啪一响。她低下头，把一缕散下来的头发别到耳后。', () => { Cine.close('bai', { dist: 2.2, ang: 0.3 }); Cine.push(0.85, 5); }],
        ['bai', '……药好了，我去送药。方才的话，你就当是药气熏的。', async () => { Cine.wide(['bai', 'hero'], { yaw: 0.2, pitch: 0.18 }); Cine.go('bai', 15.2, 6.6, 1.3); return false; }]
      ]);
      bondAdd('bai', 2);
    } else {
      await UI.fade(1); Cine.kill();
      World.enter('cliff', 16, 6);
      await Cine.begin(() => {
        Cine.grade('night');
        Cine.put('hero', 16, 4.4, 0.5); Cine.set('hero', { pose: 'act', act: 'lslash', loop: true });
        Cine.put('shi', 18.7, 6.3, -1.1); Cine.set('shi', { pose: 'act', act: 'sit', loop: true, nowp: true, part: 0.5, hide: true });
        Cine.wide(['hero'], { yaw: 0.5, pitch: 0.3, dist: 8 });
      }, { party: false });
      await Cine.talk([
        [null, '云澈独自回到崖顶。月色如洗，他拾起那柄断剑，照着白衣剑影最后的那一式，一遍遍地比划。', () => { Cine.push(0.7, 7); }],
        [null, '不知何时，石破军抱着刀坐在了石阶上，扔过来一只酒葫芦。', () => { Cine.set('shi', { hide: false }); Cine.wide(['hero', 'shi'], { yaw: 0.3, pitch: 0.22 }); }],
        ['shi', '练了一百多遍了。还差什么？'],
        ['hero', '这一剑没有回头路。使出去的时候，他根本没想过要收。', () => { Cine.set('hero', { pose: 'idle', act: null }); Cine.face('hero', 'shi'); }],
        ['shi', '那就别学全。留三分收得住的力气——你身后还有人。'],
        ['hero', '……嗯。']
      ]);
      await UI.fade(1); Cine.kill();
      World.enter('tingyu', 14, 10);
    }
    if (Cine.on()) { await UI.fade(1); Cine.kill(); }
    // 次日清晨
    await Cine.begin(() => {
      Cine.put('hero', 14, 8.7, P); Cine.put('su', 12.8, 9.3, P); Cine.put('bai', 15.2, 9.3, P); Cine.put('shi', 14.1, 10.1, P);
      const g = Cine.npc('gu'); if (g) g.yaw = 0;
      Cine.wide(['hero', 'su', 'bai', [14, 7]], { yaw: 0.7, pitch: 0.3 });
    }, { party: false });
    await Cine.talk([
      [null, '次日清晨。顾苍梧接过断剑，指腹抚过那行被抹去的字，许久没有说话。'],
      ['gu', '这里原本刻的是——“愿为疏影，守一世烟雨”。是他二十岁那年，自己一笔一笔刻上去的。'],
      ['gu', '带上它。到了他面前，替为师还给他。'],
      ['gu', '还有一处，上雪岭之前你们该去看看。青岚山道往北，有一座栖霞旧镇。'],
      ['su', '……师父。'],
      ['gu', '青禾，十二年了。那一夜烧掉镇子的不只是火——为师在废墟里，见过不该在人间的东西。门后是什么，你们得亲眼看一看。'],
      [null, '云澈握住断剑的一瞬，白衣剑影最后的那一式，忽然在心头清清楚楚地亮了一下。', () => { Cine.close('hero', { dist: 2.3, ang: 0.3 }); Cine.push(0.85, 4); }]
    ]);
    const hero = S.party[0];
    if (!hero.ex.includes('h7')) { hero.ex.push('h7'); Sfx.play('lvup'); toast('云澈 领悟了武学【<b>一蓑烟雨</b>】'); }
    give('duanjian', 1);
    await Cine.talk([
      ['su', '看什么看。肩膀？早没事了——白芷的药，比师父的茶管用。'],
      ['bai', '苏姑娘，三日之内不许抡剑。……我说的是“不许”。'],
      ['shi', '那就我打头阵。走，先去栖霞旧镇。'],
      ['su', '……嗯。回家看看。']
    ]);
    await Cine.end();
    S.flags.cliffDone = 1; S.chapter = chapterOf(S.flags);
    setQuest('经青岚山道往北的岔路，去栖霞旧镇——苏青禾的故乡。');
    UI.banner(CHAPTERS[S.chapter], '山北 · 栖霞旧镇');
  },
  /* ---------- 幽烬城 ---------- */
  async xuanzhu_pre() {
    await talk([
      [null, '幽烬城深处，万千残烛围成一座大殿。殿心坐着一名枯瘦的老者，正用指尖一盏一盏地续着灯。'],
      ['xuanzhu', '听雨阁的孩子。老夫等你们很久了。'],
      ['hero', '你是幽烬盟的人？'],
      ['xuanzhu', '老夫玄烛，替盟主守城，也替他守着这些灯。一盏灯，便是一个被“规矩”吞掉的人。'],
      ['xuanzhu', '这座城里的每一个人，都有一个想从门后接回来的名字。你们要拦盟主，便是要拦他们所有人。'],
      ['bai', '可是，门后回来的，真的还是那个人吗？'],
      ['xuanzhu', '…………'],
      ['xuanzhu', '小姑娘，这句话，老夫二十年不敢问自己。'],
      ['xuanzhu', '过得了老夫这一关，老夫便把答案告诉你们。过不了——就留下来，做一盏灯。']
    ]);
  },
  async xuanzhu_post() {
    const P = Math.PI;
    await Cine.begin(() => {
      Cine.put('hero', 18, 6.3, P); Cine.put('su', 16.8, 6.9, P); Cine.put('bai', 19.2, 6.9, P); Cine.put('shi', 18.1, 7.7, P);
      Cine.put('xuanzhu', 18, 4.2, 0, ENEMIES.xuanzhu.look);
      Cine.wide(['xuanzhu', 'hero', 'su', 'bai'], { yaw: 0.6, pitch: 0.3 });
    }, { party: false });
    await Cine.talk([
      ['xuanzhu', '咳……罢了。老夫这支烛，也该烧到头了。'],
      ['xuanzhu', '答案是：不是。'],
      ['xuanzhu', '老夫的女儿，便是寒月宫送进门里的上一任圣女。十年前，老夫偷偷开过一线门缝。'],
      ['xuanzhu', '出来的东西，有她的脸，她的声音，记得她七岁时爱吃的糖——可它没有影子，也不会哭。归墟只是照着你心里的念想，捏了一个像。'],
      ['su', '那你为什么不告诉夜无殇？！'],
      ['xuanzhu', '告诉过。他说：“像，也好。”']
    ].concat(S.flags.oldDone && S.items.mushu ? [
      ['su', '十年前，一线门缝。……栖霞镇，是不是那一夜没的？'],
      ['xuanzhu', '…………是。黑潮顺着地脉漫出去三十里，一个镇子的人，一夜之间都成了“像”。'],
      ['xuanzhu', '那把火是老夫下令放的。不烧，潮会漫到落霞镇。这笔债，老夫认。'],
      ['su', '我娘的梳子，我从废墟里捡回来了。你欠的不是我，是那一镇子的名字。'],
      ['xuanzhu', '所以老夫才守着这些灯。姑娘，那一镇的灯都在这里——一盏也没敢让它灭。']
    ] : [], [
      [null, '殿中一时无人说话，只有残烛噼啪作响。', () => { Cine.wide(['xuanzhu', 'hero', 'su', 'bai', 'shi'], { yaw: -0.5, pitch: 0.42, dist: 9 }); Cine.push(0.85, 6); }],
      ['xuanzhu', '孩子，一个人若是只剩下一件事可做，对错便不要紧了。你们拦不住他的剑，就去拦他的念想。'],
      ['xuanzhu', '城东那道门通往归墟。去吧。趁老夫的烛，还亮着。']
    ]));
    healAll();
    // 入归墟前夜：殿前火盆边
    const sit = { pose: 'act', act: 'sit', loop: true, nowp: true, part: 0.5 };
    await Cine.cut(() => {
      Cine.grade('dusk'); Cine.set('xuanzhu', { hide: true });
      // 四人围着殿前东南角的火盆坐成一道弧，脸朝火；镜头从火盆一侧的高处俯看
      Cine.put('su', 24.0, 5.1, 0); Cine.put('hero', 22.9, 5.4, 0.6); Cine.put('bai', 22.3, 6.3, 1.18); Cine.put('shi', 22.1, 7.1, 1.62);
      for (const id of ['hero', 'su', 'bai', 'shi']) Cine.set(id, sit);
      Cine.wide(['hero', 'su', 'bai', 'shi'], { yaw: 0.85, pitch: 0.5, dist: 8.5, drift: 0.12 });
    });
    await Cine.talk([[null, '入归墟前的最后一夜。四个人在殿前的火盆边坐下。谁都知道，明天未必人人都回得来。']]);
    const c = await choose('火堆旁，云澈走向——', ['苏青禾', '白芷', '石破军']);
    S.flags.campWith = ['su', 'bai', 'shi'][c];
    const pair = async (id, x, y) => {   // 两个人挪到一旁说话
      await Cine.cut(() => {
        for (const o of ['su', 'bai', 'shi']) if (o !== id) Cine.set(o, { hide: true });
        // 两人面朝大殿并肩坐下，镜头在殿前回望，身后是空城与火盆
        Cine.put('hero', x + 0.95, y, P - 0.25); Cine.put(id, x, y + 0.05, P + 0.25); Cine.set('hero', sit); Cine.set(id, sit);
        Cine.wide(['hero', id], { yaw: P, pitch: 0.1, dist: 3.7, part: 0.42 });
      });
    };
    if (c === 0) {
      const deep = bondOf('su') >= 3;
      await pair('su', 20.4, 6.3);
      await Cine.talk([
        ['su', '师弟，你说夜师伯错了吗？'],
        ['hero', '他错在一个人扛了二十年。'],
        ['su', '……要是有一天，进门的那个人是我呢？'],
        ['hero', '那我不开门。'],
        ['su', '哦。'],
        ['hero', '我跟着进去。'],
        [null, '苏青禾愣了一下，随即抓起一把草屑，扔在他脸上。', () => { Cine.wide(['hero', 'su'], { yaw: P, pitch: 0.1, dist: 3.7, part: 0.42 }); }],
        ['su', '笨蛋。那叫殉情，不叫本事。']
      ].concat(deep ? [
        ['su', '……云澈。'],
        ['hero', '师姐第一次这样叫我。'],
        ['su', '少得意。等这件事了了，你再陪我回一趟栖霞。上回是去送她——下回，我想带一个人，去给我娘看看。'],
        ['hero', '好。'],
        [null, '火光里，她伸手替他拂掉了头发上的草屑，指尖停了很久。', () => { Cine.wide(['hero', 'su'], { yaw: P, pitch: 0.1, dist: 3.7, part: 0.42 }); Cine.push(0.8, 7); }]
      ] : [
        ['su', '行了，睡吧。明天，还得靠你这把剑。']
      ]));
      bondAdd('su', 2);
    } else if (c === 1) {
      const deep = bondOf('bai') >= 3;
      await pair('bai', 20.4, 6.3);
      await Cine.talk([
        [null, '白芷把药囊里的药一样样摆出来，清点了三遍。'],
        ['bai', '止血的，解毒的，吊命的……都够。只要还有一口气，我就能把你们拉回来。'],
        ['hero', '那你自己呢？'],
        ['bai', '我？我躲在你们身后呀。……云少侠，其实我一直很羡慕苏姑娘。'],
        ['bai', '她能和你并肩。我只能看着你的背影，数你身上又添了几道伤。'],
        ['hero', '可每一次回头，我都知道你在。所以才敢往前。']
      ].concat(deep ? [
        ['bai', '……等师父救出来，万竹林的萤火也该回来了。'],
        ['bai', '到那时候，我想请你来看。不是请“云少侠”，是请……云澈。'],
        ['hero', '我一定去。'],
        [null, '她把一枚小小的香囊系在他的剑穗上。里面是晒干的忘忧草，闻起来，像雨后的竹林。', () => { Cine.wide(['hero', 'bai'], { yaw: P, pitch: 0.1, dist: 3.7, part: 0.42 }); Cine.push(0.8, 7); }]
      ] : [
        ['bai', '……早些歇息吧。明天，一个都不许少。']
      ]));
      bondAdd('bai', 2);
    } else {
      await Cine.cut(() => {
        Cine.set('su', { hide: true }); Cine.set('bai', { hide: true });
        Cine.put('hero', 21.3, 6.3, P - 0.3); Cine.put('shi', 20.2, 6.2, P + 0.3);
        Cine.set('hero', { pose: 'idle', act: null, nowp: true, part: null }); Cine.set('shi', { pose: 'act', act: 'drink', loop: true, nowp: true, part: null });
        Cine.wide(['hero', 'shi'], { yaw: P, pitch: 0.1, dist: 3.9 });
      });
      await Cine.talk([
        ['shi', '来，喝。明天要是回不来，这酒就白背了一路。'],
        ['hero', '会回来的。'],
        ['shi', '我知道。我是说酒。'],
        ['shi', '……云兄弟，有句话我憋了一路。那两个姑娘看你的眼神，瞎子都瞧得出来。'],
        ['hero', '咳——！'],
        ['shi', '我不管你心里装着谁。只一条：别学那位夜盟主，把话烂在肚子里二十年。'],
        ['shi', '说了，顶多挨一巴掌。不说，就是一辈子。']
      ]);
    }
    await Cine.end();
    S.flags.cityDone = 1; S.chapter = chapterOf(S.flags);
    setQuest('穿过幽烬城的东门，进入归墟，阻止夜无殇。');
    UI.banner(CHAPTERS[S.chapter], '归墟在望');
  }
});

/* ============ 落霞镇城内的人与事：三桩委托（醉仙楼的麻烦 / 走失的小满 / 当铺失窃）、守门兵丁、求签、街坊闲话 ============ */
QUESTS.push(
  { id: 'q_tavern', name: '醉仙楼的麻烦', who: '金掌柜', where: '落霞镇 · 醉仙楼门前的大街', open: s => s.flags.ch1, text: ['一伙泼皮堵在醉仙楼门前要“平安钱”，把他们打发走。', '泼皮已经赶跑，回醉仙楼告诉金掌柜。'] },
  { id: 'q_lost', name: '走失的小满', who: '花娘', where: '落霞镇 · 衙门口 → 北巷东头', open: s => s.flags.spar,
    text: [() => (S.flags.lost_clue ? '有人看见一个粉衣小丫头追着货郎往东北角去了。到北巷东头、靠城墙的地方找找。' : '花娘的女儿小满走丢了。街面上的事秦捕头最清楚，去衙门口问问他。'), '小满已经找到，回南巷告诉花娘。'] },
  { id: 'q_pawn', name: '当铺失窃', who: '钱朝奉', where: '落霞镇 · 茶馆 → 城隍庙后巷', open: s => s.flags.bambooDone,
    text: [() => (S.flags.pawn_clue ? '说书先生见过三个蒙面人钻进了城隍庙后头的巷子。去南巷东段看看。' : '当铺丢了一块二十年没人来赎的旧玉佩。茶馆的说书先生消息灵通，去问问他。'), '玉佩已经夺回，拿去还给钱朝奉。'] }
);
Object.assign(SCRIPTS, {
  // —— 醉仙楼 ——
  async jin() {
    if (await sideQuest('q_tavern')) return;
    if (S.flags.q_tavern === 1) { await say('jin', '那伙泼皮就在门前街上晃荡。少侠当心，领头的“过山虎”有把子蛮力。'); return; }
    await say('jin', ['客官里边请！醉仙楼的“落霞烧”，方圆百里独一份。……只是近来山道不太平，南来北往的客人少了。',
      '听说听雨阁出了事？唉，这世道。少侠要打听消息，楼上的酒客嘴最松。',
      '烟雨渡的灯会快到了。往年这时候，小店的酒要多备三成。',
      '赤焰谷那边起过大火，逃出来的行商在小店住了三天，说是有个红头发的妖人……吓得酒都醒了。',
      '北边的天，夜里泛紫光。老主顾们都说要变天了。少侠，多喝一碗，壮壮胆。'][G.tier()]);
  },
  async q_tavern_offer() {
    await talk([
      ['jin', '少侠留步！小店……唉，小店摊上事了。'],
      ['jin', '城南有伙泼皮，领头的叫“过山虎”，三天两头来白吃白喝。今日更是堵在门前，说不交“平安钱”就砸了招牌。'],
      ['hero', '衙门不管？'],
      ['jin', '秦捕头的人手都撒出去追山贼余党了，城里只剩几个老差役。少侠身上带着剑，能不能……'],
      ['hero', '人在哪儿？'],
      ['jin', '就在门前街上。少侠千万留他们一口气，小店可不想沾人命官司。']
    ]);
  },
  async tavern_pre() {
    await talk([
      ['thugboss', '哟，金胖子请帮手了？小子，这条街姓“虎”，识相的滚远点！'],
      ['hero', '这条街姓什么我不知道。不过，你挡着人家做生意了。'],
      ['thugboss', '找打！弟兄们，上！']
    ]);
  },
  async tavern_post() {
    await talk([
      ['thugboss', '好、好汉饶命！小的有眼不识泰山……'],
      ['hero', '平安钱，还收不收？'],
      ['thugboss', '不收了不收了！小的这就出城，再也不回来！'],
      [null, '几个泼皮连滚带爬地跑了。街坊们从门缝里探出头来，不知是谁带头叫了一声好。']
    ]);
    S.flags.q_tavern = 2; toast('回醉仙楼告诉金掌柜');
  },
  async q_tavern_done() {
    await talk([
      ['jin', '少侠真是好身手！街坊们都看见了，往后这条街能清净了。'],
      ['jin', '这点银子不成敬意。江湖人带酒不如带药——这几丸玉露丸是小店常备的，少侠收着。往后来醉仙楼，酒管够！']
    ]);
    give('gold', 400); give('potion2', 3);
  },

  // —— 走失的小满 ——
  async huaniang() {
    if (await sideQuest('q_lost')) return;
    await say('huaniang', S.flags.q_lost === 1 ? '小满……小满你在哪儿啊……' : S.flags.q_lost === 3 ? '小满天天念叨那位带剑的大哥哥呢。少侠路过，进来喝口茶吧。' : '这位少侠，买花吗？后院刚开的栀子。');
  },
  async q_lost_offer() {
    await talk([
      ['huaniang', '这位少侠……你、你有没有看见一个穿粉衣裳的小丫头？这么高，扎着个小髻。'],
      ['huaniang', '我家小满，一转眼的工夫就不见了。我找遍了南巷，嗓子都喊哑了……'],
      ['hero', '别急。她平时爱去哪儿？'],
      ['huaniang', '她嘴馋，见了卖糖的就走不动道。少侠若肯帮忙，去衙门口问问秦捕头吧，街面上的事他最清楚。']
    ]);
  },
  async xiaoman() {
    if (S.flags.q_lost !== 1) { await say('xiaoman', '大哥哥！我以后再也不乱跑啦。……就跑一小会儿。'); return; }
    await talk([
      [null, '城墙根下，一个粉衣小丫头蹲在地上，正对着一只花猫掉眼泪。'],
      ['xiaoman', '呜……糖葫芦掉了……猫猫也不理我……我找不到娘了……']
    ]);
    const c = await choose('云澈——', [S.gold >= 10 ? '买一串糖葫芦哄她（10 文）' : '摸摸口袋，一文钱也没有', '蹲下来，学猫叫逗她']);
    if (c === 0 && S.gold >= 10) { S.gold -= 10; UI.hud(); await talk([[null, '云澈跑到巷口，买回一串最大的糖葫芦。'], ['xiaoman', '给我的？……谢谢大哥哥！']]); }
    else await talk([[null, '云澈笨手笨脚地学了两声猫叫。花猫没过来，小丫头倒是破涕为笑了。'], ['xiaoman', '大哥哥学得一点都不像！']]);
    await talk([['hero', '走，我送你回家。你娘找你，找得快急哭了。'], ['xiaoman', '嗯！']]);
    S.flags.q_lost = 2; toast('小满已经送回家，去和花娘说一声');
  },
  async q_lost_done() {
    await talk([
      ['huaniang', '小满！你这孩子……谢天谢地！'],
      ['huaniang', '少侠的恩情，我们娘俩记一辈子。家里没什么值钱的——这道护身符，是我给小满她爹缝的。他走镖，再没回来……少侠带着吧，保平安。']
    ]);
    const m = fixMember(S.party[0]); m.at.luk += 1; give('potion1', 3); give('gold', 80);
    toast('<b>' + S.name + '</b> 的福缘 +1');
  },

  // —— 当铺失窃 ——
  async qian() {
    if (await sideQuest('q_pawn')) return;
    const F = S.flags;
    if (F.q_pawn === 1) { await say('qian', F.pawn_clue ? '城隍庙后巷？那地方入了夜就没人走……少侠千万小心。' : '说书先生就在茶馆门口。城里来了什么生面孔，他最清楚。'); await pawnDeal(); return; }
    await say('qian', F.q_pawn === 3 ? '那位白衣后生若还在世……少侠若是遇见，替小号带句话：当票，小号替他烧了。' : '当金、当玉、当古董，死当活当都收。少侠手头紧了，尽管来。');
    await pawnDeal();
  },
  async q_pawn_offer() {
    await talk([
      ['qian', '少侠请留步。小号遭了贼，丢了一件要紧的当物。'],
      ['hero', '当铺失窃，该去报官。'],
      ['qian', '报了。可丢的东西蹊跷——金银一文没少，只少了一块白玉佩。那是二十年前的死当，早过了赎期，论理早该变卖了。'],
      ['qian', '当年来当它的，是个白衣后生，说“等我从烟雨渡回来就赎”。先师看他的神色，没忍心卖，一留就是二十年。'],
      ['hero', '一块二十年没人要的玉佩，谁会专程来偷？'],
      ['qian', '所以才蹊跷。茶馆的说书先生整日坐在街口，城里来了什么生面孔，他最清楚。少侠若肯帮忙，小号必有重谢。']
    ]);
  },
  async pawn_pre() {
    await talk([
      [null, '城隍庙后巷。三个蒙面人正围着一只打开的木匣，匣中白玉莹然。'],
      ['spy', '……就是这块。盟主找了它二十年。'],
      ['spy', '谁？！——听雨阁的人？正好，一并带回去领赏。']
    ]);
  },
  async pawn_post() {
    await talk([
      ['spy', '咳……你们抢得走玉佩，抢不走……盟主的念想……'],
      [null, '云澈拾起玉佩。白玉温润，背面刻着一弯寒月，月下两个小字，已被人摩挲得几乎看不清了。'],
      ['hero', S.flags.cliffOpen ? '……“疏影”。' : '寒月宫的纹样？怎么会在落霞镇的当铺里。']
    ]);
    give('yupei', 1); S.flags.q_pawn = 2; toast('把玉佩拿去还给钱朝奉');
  },
  async q_pawn_done() {
    await talk([
      ['qian', '找回来了！……幽烬盟？小号何德何能，招惹上这等人物。'],
      ['qian', '少侠，这玉佩小号不敢再留了。按规矩，过期的死当归当铺处置——小号做主，把它交给少侠。'],
      ['qian', '当年那位后生若还在世，少侠行走江湖，或许能替他物归原主。']
    ]);
    give('gold', 800); give('mp2', 3);
  },

  // —— 衙门、城隍庙、摊贩、城门 ——
  async captain() {
    const F = S.flags;
    if (F.q_lost === 1 && !F.lost_clue) {
      await talk([
        ['captain', '走丢的丫头？粉衣裳……方才有个弟兄说，看见一个小丫头追着卖糖葫芦的货郎，往东北角去了。'],
        ['captain', '北巷东头靠着城墙，平日没什么人。去那儿找找。']
      ]);
      F.lost_clue = 1; toast('线索：北巷东头，靠城墙处'); return;
    }
    if (await sideQuest('q_ledger')) return;
    await say('captain', ['落霞镇八座城门，日出而开，日落而闭。外乡人，在城里莫要生事。',
      '听雨阁的事，衙门也听说了。江湖事江湖了，可要是闹到城里来——秦某的刀也不是摆设。',
      '近来城里多了些生面孔，白天睡觉，夜里走动。少侠若是看见蒙面的，知会一声。',
      '东边烟雨渡闹过一场，西边山道又有余匪。这差事，真是一天比一天难当。',
      '北边的天象不对。上头只说“安抚百姓”……安抚？秦某自己心里都没底。'][G.tier()]);
    const todo = QUESTS.filter(q => /^q_(tavern|lost|pawn)$/.test(q.id) && q.open(S) && !F[q.id]);
    if (todo.length) await say('captain', '对了——' + todo.map(q => q.who).join('、') + '那边像是遇上了难处。少侠若是得闲，不妨过去看看。');
  },
  async miaozhu() {
    if (S.flags.q_su === 1 && !S.items.paiwei && S.party.some(m => m.id === 'su')) { await SCRIPTS.q_su_tablet(); return; }   // 苏青禾的心事：请庙祝写灵位
    const k = 'sign_' + G.tier();
    if (S.flags[k]) { await say('miaozhu', '今日的签，施主已经求过了。心诚则灵，贪多不灵。'); return; }
    await talk([['miaozhu', '施主，求支签吧。城隍爷灵验得很。'], [null, '云澈接过签筒，摇了三摇，一支竹签落在地上。']]);
    S.flags[k] = 1;
    const r = Math.floor(Math.random() * 3);
    if (r === 0) { await say('miaozhu', '上上签！“云开月现，旧雨重逢”。施主近日诸事顺遂。'); healAll(); Sfx.play('heal'); toast('神清气爽——全队状态已恢复'); }
    else if (r === 1) { await say('miaozhu', '中平签。“行路须防暗箭，带药胜似带金”。——这丸药，施主拿着。'); give('potion2', 1); }
    else { await say('miaozhu', '下下签……“前路多歧”。施主莫慌，签是死的，路是人走的。这包清心散，算老朽替城隍爷赔个不是。'); give('antidote', 2); }
  },
  async vendor1() {
    const F = S.flags;
    if (F.q_lost === 1 && !F.lost_clue) {
      await say('vendor1', '粉衣小丫头？追了我半条街呢！我早上挑担子去东北角卖糖葫芦，她一路跟着，后来就没影了。');
      F.lost_clue = 1; toast('线索：北巷东头，靠城墙处'); return;
    }
    await say('vendor1', '针头线脑、糖人泥哨、陈皮梅子——客官看看，都是走街串巷的好东西！');
  },
  async vendor2() { await say('vendor2', S.flags.ch1 ? '磨剪子嘞——戗菜刀！……少侠那口剑？听雨阁的剑，小的可不敢碰，磨坏了赔不起。' : '磨剪子嘞——戗菜刀！'); },
  async guard(n) {
    const d = (n && n.def) || {}, F = S.flags;
    if (!d.gate) { await say('guard', '城门重地，莫要逗留。'); return; }
    let more = '';
    if (d.to === '烟雨渡' && !F.bambooDone) more = '近来渡口不太平，没有要紧事，别往那边去。';
    else if (d.to === '寒月雪岭' && !F.cliffDone) more = '雪岭上风雪封山，上头有令，暂不放行。';
    else if (d.to === '万竹林' && !F.ch1) more = '林子里近来有毒瘴，闲人免进。';
    else if (d.to === '青岚山道') more = F.heifeng ? '黑风那伙人散了以后，山道上太平多了。' : '山道上有山贼出没，结伴走稳当些。';
    else if (d.to === '摩云岭') more = F.ferryDone ? '岭上有狼，还有个不下山的怪老头。上去的人，十个有九个是自己走下来的。' : '岭上有狼，山路又险。上头有话：没有几分真本事的，不放上去。';
    else if (d.to === '稻香村') more = F.q_scare === 3 ? '稻香村今年的新米进城了，比往年的香。' : '村里正忙秋收。听说夜里不大太平，田里的稻草人……会自己走路。';
    else if (d.to === '藕花村') more = !F.bambooDone ? '去藕花村要走一段水路，近来水上不太平，暂不放行。' : F.q_ghost === 3 ? '藕塘里的“水鬼”叫人拿了，村里又敢下塘了。' : '村里的藕和莲蓬是一绝。只是近来都说塘里闹水鬼，天一黑就没人敢靠近。';
    else if (d.to === '撷芳园') more = '芸婆婆的园子，一年四季都有花开。进去莫要攀折——她眼神不好，耳朵可灵。';
    await say('guard', '这里是' + d.gate + '。出了门往' + d.dir + '，便是' + d.to + '。' + more);
  }
});


/* ============ 地图扩建与布景 ============
   各图向东、向南扩出一块（原有坐标一律不变，剧情里写死的位置照旧可用），东 / 南边上的出口跟着外移，路也接过去；
   多出来的空地和原先的空地由 world.js 的 genScenery 摆上山和湖。另给各图添了楼阁、塔、亭、牌坊、茅舍等建筑。
   road：道路的铺法（见 world.js 的 ROADS；不写则按主题）；rim：{ n|s|w|e: 'water' } 这一侧地图外面是水面而不是山；scen：布景参数（见 genScenery）；hillH / rimH：图内 / 图外山的高度。 */
const GROW = { tingyu: [8, 6], road: [6, 8], bamboo: [8, 6], fire: [6, 8], snow: [8, 4], abyss: [6, 6], fort: [6, 6], cave: [6, 6], forge: [6, 6], icecave: [6, 6], ferry: [8, 0], cliff: [8, 6], city: [6, 6] };
const MAPADD = {
  tingyu: { road: 'slabFine', scen: { hills: 0.6 }, builds: [{ x: 13, y: 15, w: 4, h: 1, s: 'paifang', pass: true, sign: '听雨阁', s2: '' }, { x: 22, y: 2, w: 3, h: 3, s: 'pagoda', s2: '' }, { x: 3, y: 3, w: 5, h: 3, s: 'dorm', s2: 'house1' }, { x: 27, y: 14, w: 2, h: 2, s: 'pavilion', s2: '' }] },
  road: { scen: { hills: 0.65 }, builds: [{ x: 2, y: 9, w: 4, h: 3, s: 'hut', s2: 'house1' }, { x: 23, y: 5, w: 2, h: 2, s: 'pavilion', s2: '' }, { x: 37, y: 15, w: 2, h: 2, s: 'towerW', s2: '' }] },
  town: { scen: false, moat: { x0: 2, y0: 2, x1: 73, y1: 56 }, rimH: 3.5,
    builds: [{ x: 36, y: 12, w: 4, h: 1, s: 'paifang', pass: true, sign: '落霞', s2: '' }, { x: 59, y: 47, w: 4, h: 1, s: 'paifang', pass: true, sign: '问剑台', s2: '' }] },
  bamboo: { scen: { hills: 0.45 }, builds: [{ x: 24, y: 1, w: 4, h: 3, s: 'hut', s2: 'house1' }] },
  fire: { scen: { hills: 0.75 }, builds: [{ x: 33, y: 6, w: 2, h: 2, s: 'towerS', s2: '' }, { x: 43, y: 6, w: 2, h: 2, s: 'towerS', s2: '' }] },
  snow: { scen: { hills: 0.6 }, builds: [{ x: 11, y: 2, w: 3, h: 3, s: 'pagodaS', s2: '' }, { x: 24, y: 2, w: 3, h: 3, s: 'pagodaS', s2: '' }, { x: 17, y: 12, w: 4, h: 1, s: 'paifang', pass: true, sign: '寒月宫', s2: '' }] },
  abyss: { scen: { hills: 0.6 }, builds: [{ x: 9, y: 2, w: 3, h: 3, s: 'pagodaD', s2: '' }, { x: 26, y: 2, w: 3, h: 3, s: 'pagodaD', s2: '' }] },
  fort: { road: 'dirt', scen: { hills: 0.7 }, builds: [{ x: 13, y: 8, w: 2, h: 2, s: 'towerW', s2: '' }, { x: 24, y: 8, w: 2, h: 2, s: 'towerW', s2: '' }] },
  cave: { road: 'mossy', scen: { hills: 0.6 } }, forge: { road: 'cinder', scen: { hills: 0.75 } }, icecave: { road: 'frost', scen: { hills: 0.65 } },
  ferry: { scen: { hills: 0.3, n: 5 }, rim: { s: 'water' }, rimH: 4, water: [[44.5, 25.5, 3.2], [48, 25.5, 3.2]],
    builds: [{ x: 10, y: 19, w: 2, h: 2, s: 'pavilion', s2: '' }, { x: 4, y: 13, w: 1, h: 4, s: 'paifang', pass: true, sign: '烟雨渡', s2: '' }],
    props: [{ x: 8, y: 25, s: 'boat' }, { x: 14, y: 26, s: 'boat' }, { x: 30, y: 25, s: 'boat' }, { x: 36, y: 26, s: 'boat' }, { x: 43, y: 25, s: 'boat' }] },
  cliff: { scen: { hills: 0.75 }, rimH: 13, hillH: 3.8, builds: [{ x: 24, y: 9, w: 2, h: 2, s: 'pavilion', s2: '' }, { x: 2, y: 19, w: 4, h: 3, s: 'hut', s2: 'house1' }] },
  city: { scen: { hills: 0.65 }, builds: [{ x: 8, y: 2, w: 3, h: 3, s: 'pagodaD', s2: '' }, { x: 26, y: 2, w: 3, h: 3, s: 'pagodaD', s2: '' },
    { x: 11, y: 14, w: 4, h: 3, s: 'ruin', s2: '' }, { x: 22, y: 14, w: 4, h: 3, s: 'ruin', s2: '' }, { x: 29, y: 21, w: 4, h: 3, s: 'ruin', s2: '' }] }
};
(() => {
  const old = {};
  for (const id in MAPS) old[id] = { w: MAPS[id].w, h: MAPS[id].h, exits: MAPS[id].exits.map(e => ({ x: e.x, y: e.y, w: e.w || 1, h: e.h || 1 })) };
  // 进入某张图的落脚点：离它最近的那个出口若在东 / 南边上，落脚点跟着边界一起外移
  for (const id in MAPS) for (const e of MAPS[id].exits) {
    const gw = GROW[e.to], o = old[e.to]; if (!gw) continue;
    let best = null, bd = 1e9;
    for (const x of o.exits) { const dd = Math.abs(x.x - e.tx) + Math.abs(x.y - e.ty); if (dd < bd) { bd = dd; best = x; } }
    if (best && bd <= 6) { if (best.x + best.w >= o.w) e.tx += gw[0]; else if (best.y + best.h >= o.h) e.ty += gw[1]; }
  }
  for (const id in GROW) {
    const d = MAPS[id], ow = d.w, oh = d.h, dw = GROW[id][0], dh = GROW[id][1];
    d.w += dw; d.h += dh;
    for (const e of d.exits) {
      if (dw && e.x + (e.w || 1) >= ow) { d.paths.push([[e.x, e.y], [e.x + dw, e.y]]); e.x += dw; }
      else if (dh && e.y + (e.h || 1) >= oh) { d.paths.push([[e.x, e.y], [e.x, e.y + dh]]); e.y += dh; }
    }
  }
  for (const id in MAPADD) { const a = MAPADD[id], d = MAPS[id]; for (const k in a) d[k] = Array.isArray(a[k]) ? (d[k] || []).concat(a[k]) : a[k]; }
})();
/* ============ 落霞镇的室内 ============
   城里能进去的屋子各有一张室内小图（in_<名字>）：走到门口那一格就进屋，从屋里南墙的门出来回到门前。
   原先站在门外的掌柜、大夫、捕头等人都搬进了自己的屋里，屋里另添了伙计、客人等闲人（talk: 'chat'，说 lines 里的话）。
   rows 是屋内的平面图，一个字符一格：
     . 空地   数字 第几个人物   T 方桌 R 圆桌(带酒菜) o 凳 b 长凳 C 柜台 S 货架 B 床(占两格，后面跟 _) _ 占位
     P 屏风 K 兵器架 A 铁砧 F 锻炉 G 神像供桌 U 香炉 u 蒲团 D 书案 d 公案 h 椅 M 鼓 L 落地灯 Z 楼梯(上面一格跟 _) E 台子
     H 布架 V 灶 W 酒缸 Q 天平 j 坛 k 桶 x 箱 y 草垛 w 柴 p 盆栽 */
const ROOM_LEGEND = { T: 'table', R: 'tableR:food', o: 'stool', b: 'bench', C: 'counter', B: 'bed', _: 'void', P: 'screen', K: 'rack', A: 'anvil', F: 'forge', G: 'altar', U: 'burner', u: 'cushion', D: 'desk', d: 'desk:red', h: 'chair', M: 'drum', L: 'lampS', Z: 'stairs', E: 'stage', H: 'clothrack', V: 'stove', W: 'vat', Q: 'scale', j: 'c:jar', k: 'c:barrel', x: 'c:crate', y: 'c:hay', w: 'c:wood', p: 'c:pot' };
(() => {
  const town = MAPS.town;
  // 把城里原有的人物请进屋：从城里的名单上取下来（保留他的台词、任务标记、出现条件）
  const take = (who, pred) => { const i = town.npcs.findIndex(n => n.who === who && (!pred || pred(n))); return i < 0 ? null : town.npcs.splice(i, 1)[0]; };
  // 屋里新添的闲人：名字、衣着（取街上行人的某一套，可再改几样）、几句话
  let seq = 0;
  const extra = (name, look, lines, more) => { const who = 'r_' + (++seq); NPCS[who] = { name, look: Object.assign({}, CITIZENS[look % CITIZENS.length], more || {}) }; return { who, talk: 'chat', lines }; };
  const room = (id, bx, by, o) => {
    const W = o.rows[0].length, H = o.rows.length, dx = Math.floor((W + 2) / 2) - 1, props = [], npcs = [];
    o.rows.forEach((r, j) => {
      if (r.length !== W) console.error('room ' + id + ' row ' + (j + 1) + ' has ' + r.length + ' cells, expected ' + W);
      for (let i = 0; i < r.length; i++) {
        const ch = r[i], x = i + 1, y = j + 1;
        if (ch >= '1' && ch <= '9') { const n = o.npcs[+ch - 1]; if (n) npcs.push(Object.assign(n, { x, y })); }
        else if (ch === 'S') props.push({ x, y, s: 'shelf:' + (o.goods || 'misc') });
        else if (ROOM_LEGEND[ch]) props.push({ x, y, s: ROOM_LEGEND[ch] });
      }
    });
    MAPS['in_' + id] = { name: o.name, sub: o.sub || '落霞镇', theme: 'indoor', btheme: 'town', indoor: true, w: W + 2, h: H + 2, seed: 200 + seq + bx, scen: false, floor: o.floor, rugs: o.rugs, room: { sign: o.sign, wall: o.wall, wood: o.wood },
      props, npcs, exits: [{ x: dx, y: H + 1, w: 2, h: 1, to: 'town', tx: bx + 2, ty: by + 3 }] };
    town.exits.push({ x: bx + 2, y: by + 2, w: 1, h: 1, to: 'in_' + id, tx: dx, ty: H, door: true });
    const b = town.builds.find(q => q.x === bx && q.y === by); if (b) b.door = true;
    // 白天：屋里有两个人以上时，请一位寻常人物（闲谈的那种，不是掌柜、先生）站到门口去，街上才有人气；夜里他回屋。
    // 优先请本来就该在门口招呼的人（伙计、小二、衙役、护院、镖师、学徒、药童），没有就请最后一位寻常客人。
    // 站在门边一格（不挡门前出入的那一格）；那一格被占了就换另一边。屋里那一位只在夜里出现（show），门口这一位到了夜里随街上的人一起收起来
    const ord = npcs.filter(n => n.talk === 'chat' && !/掌柜|老板|店主|师傅|先生|师爷/.test(NPCS[n.who].name));
    if (npcs.length >= 2 && ord.length && o.out !== false) {
      const pick = ord.find(n => /伙计|小二|衙役|护院|镖师|学徒|药童/.test(NPCS[n.who].name)) || ord[ord.length - 1];
      const free = (x, y) => !town.props.some(p => p.x === x && p.y === y) && !town.npcs.some(n => y === n.y && x >= n.x && x < n.x + (n.w || 1)) && !town.builds.some(q => x >= q.x && x < q.x + q.w && y >= q.y && y < q.y + q.h);
      const xs = [bx + 1, bx + 3, bx, bx + 4].filter(x => free(x, by + 3));
      if (xs.length) {
        pick.show = () => World.isNight();
        town.npcs.push({ who: pick.who, x: xs[0], y: by + 3, talk: 'chat', lines: pick.lines, face: xs[0] < bx + 2 ? 1 : -1, doorOf: 'in_' + id });
      }
    }
  };
  const xiaoman = take('xiaoman', n => n.x === 44);

  room('escort', 12, 27, { name: '长风镖局', sub: '落霞镇 · 中大街', floor: 'stone', sign: '义薄云天', rugs: [[5, 2, 4, 2, '#7a2a22']], rows: [
    'K.K.P1P.K.xx',
    '...h....h...',
    '............',
    '.2.T.o....3.',
    '..........x.',
    '.4........x.',
    'L..........L'], npcs: [take('shen'),
    extra('镖师老周', 5, ['总镖头这几日睡得少。山道上的事，他比谁都上心。', '走镖的规矩：三分保平安，七分靠人情。小兄弟，记着点。', '这趟镖要过青岚山道，我正磨刀呢。'], { wp: 'saber', wc: '#d0d8e0' }),
    extra('女镖师阿鸢', 3, ['别看我是女子，这杆枪走过十三省。', '听说你替镇上除了山贼？好样的。', '镖局后院有木桩，手痒了可以去练练。'], { robe: '#8a3a3a', wp: 'spear' }),
    extra('账房先生', 6, ['一趟镖三百两，路上打点去掉一半……唉，这账难算。', '少侠要托镖？眼下人手都派出去了，得等几日。'])] });

  room('inn', 24, 27, { name: '悦来客栈', sub: '落霞镇 · 中大街', goods: 'jars', rugs: [[5, 5, 4, 2, '#7a3a2a']], rows: [
    'LjS.._..B_B_',
    '.CC1.Z......',
    '............',
    '.T.o...T.o.2',
    '.o.....o....',
    '3..........L',
    'p..........p'], npcs: [take('innkeeper'),
    extra('住店的书生', 6, ['小生进京赶考，路过此地，盘缠被山贼劫了大半……', '掌柜的心善，许我先赊着房钱。', '少侠可知“侠之大者”四字何解？小生想了一夜。']),
    extra('店小二', 2, ['客官楼上请——哎，楼上客满了，您还是找掌柜的吧。', '后厨炖着羊肉，香不香？香也得先付钱。', '昨夜有位客人半夜翻墙走了，房钱倒是留在了枕头底下。'], { hat: null })] });

  room('tavern', 47, 27, { name: '醉仙楼', sub: '落霞镇 · 中大街', goods: 'jars', rows: [
    'WWSS._..SSkk',
    '.CCC1Z......',
    '............',
    '.o.R.o..R.o.',
    '.2....3....4',
    '.o.R.o..R.o.',
    'L..........L'], npcs: [take('jin'),
    extra('跑堂伙计', 2, ['来咧——“落霞烧”一坛，酱牛肉两斤！', '客官小声些，那桌几位爷喝高了，脾气大。', '掌柜的说了，带剑的客人一律多送一碟花生。'], { hat: null, robe: '#6a7a8a' }),
    extra('酒客', 5, ['嗝……这世道，也就酒是真的。', '我跟你说，北边雪岭上的钟，半个月没响了！', '兄弟，喝一碗？我请——哎我钱袋呢？']),
    extra('行商', 9, ['从烟雨渡过来的。今年的灯会怕是办不安生喽。', '跑了二十年买卖，头一回见山贼敢在镇子边上劫道。', '少侠往哪边去？东边的路，夜里莫走。'])] });

  room('teahouse', 30, 20, { name: '茶馆', sub: '落霞镇 · 中巷', goods: 'misc', wood: '#4a3a26', rows: [
    'SS..EEEE..SS',
    'L....1T....L',
    '............',
    '.T.o..o.T.o.',
    '.2.......3..',
    '.T.o..o.T.o.',
    'p..........p'], npcs: [take('teller'),
    extra('老茶客', 4, ['先生这段“四玉镇归墟”，老汉听了三十年，还是爱听。', '后生，坐。茶要趁热，话要趁早。', '当年老汉也见过一位白衣剑客……唉，不提了。'], { wp: 'none' }),
    extra('茶客', 0, ['说书先生今日这一段留了扣子，急煞人。', '这茶馆的碧螺春，是万竹林那边的山泉水泡的。', '你也是来听书的？先给茶钱，不然先生不开口。'])] });

  room('smithy', 24, 13, { name: '铁匠铺', sub: '落霞镇 · 北大街', floor: 'earth', goods: 'iron', wall: '#b8aa98', wood: '#4a2a1e', rows: [
    'FSS.K.K.wk',
    '.A1.......',
    '..........',
    '2.....CC..',
    '.x......j.',
    'L........L'], npcs: [take('smith'),
    extra('学徒', 7, ['师父说我拉风箱还得再练三年……', '这把是我打的！……师父说只能当柴刀使。', '少侠的剑真好看，能让我摸一下吗？就一下。'], { sz: 0.9, robe: '#5a4a40' })] });

  room('clinic', 30, 13, { name: '药铺', sub: '落霞镇 · 北大街', goods: 'herbs', rows: [
    'SSSS..B_.P',
    '.CC1......',
    '..........',
    '2....T.o.3',
    '..........',
    'p........L'], npcs: [take('herb'),
    extra('药童', 7, ['当归三钱，黄芪五钱……哎呀，又抓错了。', '师父说，医者眼里没有江湖，只有病人。', '万竹林的白芷姐姐来过，她认的药比师父还多！'], { sz: 0.82, robe: '#7aa88a' }),
    extra('候诊的老汉', 4, ['老寒腿，一到阴天就疼。杜大夫的膏药管用。', '年轻人，身子骨是本钱，莫仗着年轻硬扛。'], { wp: 'staff' })] });

  room('pawn', 12, 13, { name: '当铺', sub: '落霞镇 · 北大街', goods: 'silver', wood: '#3a2a22', rows: [
    'SSS.QS.SSx',
    'CCCC1.....',
    '..........',
    '.....2....',
    '.o......o.',
    'L........p'], npcs: [take('qian'),
    extra('当铺伙计', 0, ['活当三分利，死当不赎。少侠要当什么？', '朝奉的眼力，隔着柜台就知道东西值几个钱。', '库房在后头，闲人免进。'])] });

  room('yamen', 41, 20, { name: '衙门', sub: '落霞镇 · 中巷', floor: 'stone', sign: '明镜高悬', rugs: [[5, 3, 4, 3, '#6a2420']], rows: [
    '.K...d....K.',
    '.....1......',
    'M...........',
    '.2........3.',
    '............',
    '.D4.........',
    'L..........L'], npcs: [take('captain'),
    extra('衙役', 9, ['威——武——……哦，今日不升堂。', '捕头带着弟兄们连追了三天山贼，眼都熬红了。', '少侠有冤情？击鼓便是。没有？那莫要在此逗留。'], { robe: '#2e3a52', trim: '#b03a2e', wp: 'staff' }),
    extra('老衙役', 4, ['老汉在这衙门当了四十年差，没见过这么乱的年月。', '城门口的告示看了吗？幽烬盟的人，见了要报官。'], { robe: '#2e3a52', trim: '#b03a2e', wp: 'staff' }),
    extra('师爷', 6, ['卷宗堆了半人高……山贼案、失窃案、还有走失孩童的。', '少侠若肯帮衙门分忧，秦捕头面冷心热，不会亏待你。'])] });

  room('temple', 41, 41, { name: '城隍庙', sub: '落霞镇 · 南大街', floor: 'stone', wall: '#d8c8a0', wood: '#8a2a1e', rows: [
    'L...GGG....L',
    '.....U......',
    '....u.u.....',
    '.1.......2..',
    '........3...',
    '............',
    'p..........p'], npcs: [take('miaozhu'),
    extra('香客', 8, ['求城隍爷保佑我家那口子走镖平安……', '这庙里的签灵得很。少侠也求一支？'], {}),
    extra('老香客', 4, ['老婆子每逢初一十五都来上香，四十年没断过。', '心诚则灵，心不诚，磕破头也没用。'], { f: 1, hs: 'bun', beard: 0, wp: 'none', robe: '#8a7a8a' })] });

  room('huaniang', 41, 34, { name: '花娘家', sub: '落霞镇 · 南巷', goods: 'misc', rugs: [[3, 3, 3, 2, '#8a4a5a']], rows: [
    'B_.S.pHp',
    '.....1..',
    '.T.o..2.',
    '........',
    'p......L'], npcs: [take('huaniang'), xiaoman] });

  room('granny', 24, 34, { name: '孙婆婆家', sub: '落霞镇 · 南巷', goods: 'misc', floor: 'mat', rows: [
    'B_.SV.jw',
    '....1...',
    '.T.o....',
    '........',
    'L......p'], npcs: [take('granny')] });

  room('cloth', 41, 6, { name: '布庄', sub: '落霞镇 · 北巷', goods: 'cloth', rows: [
    'SSS.HH.SSS',
    '.CC1......',
    '..........',
    '.H......H.',
    '.....2....',
    'L........L'], npcs: [
    extra('布庄老板娘', 1, ['少侠看看料子？这匹云锦是苏州来的，做件新袍子正合适。', '听雨阁的弟子袍，一向是在小店裁的布。', '近来路上不太平，南边的绸缎运不过来，价钱涨了三成。'], { robe: '#8a4aa0' }),
    extra('买布的妇人', 8, ['这匹蓝的好看，还是那匹青的好看？', '给我家闺女做嫁衣，可不能马虎。'])] });

  room('book', 30, 6, { name: '书肆', sub: '落霞镇 · 北巷', goods: 'books', rows: [
    'SSSSS.SSSS',
    '..........',
    '.D1...SS..',
    '..........',
    '.2........',
    'p........L'], npcs: [
    extra('书肆掌柜', 6, ['小店有经史子集，也有话本传奇。武功秘籍？那可没有。', '《江湖见闻录》卖得最好，里头把四派的来历写得明明白白。', '少侠识字？难得，难得。如今的江湖人，十个里有八个只认得银票。'], { robe: '#3a4a5a' }),
    extra('看书的少年', 7, ['嘘——我在看《白衣剑客传》，正到要紧处。', '掌柜的说看书不要钱，买书才要钱。'], { sz: 0.85 })] });

  room('grocer', 47, 13, { name: '杂货铺', sub: '落霞镇 · 北大街', goods: 'misc', rows: [
    'SSjSSkSxyw',
    '.CCC1.....',
    '..........',
    '.x..j..k..',
    '.......2..',
    'L........p'], npcs: [
    extra('杂货店主', 5, ['油盐酱醋、针头线脑，小店都有。', '火折子、麻绳、干粮，出远门的都来我这儿备货。', '少侠要丹药？那得去隔壁街的药铺。'], { robe: '#4a6a4a' }),
    extra('街坊大婶', 1, ['盐又涨价了！这日子可怎么过。', '听说了吗？当铺前天夜里遭了贼。'])] });

  room('wine', 58, 20, { name: '酒坊', sub: '落霞镇 · 中巷', floor: 'earth', goods: 'jars', rows: [
    'WWW.SSS.VV',
    '....1.....',
    '..........',
    '.kk....jj.',
    '.....2....',
    'L........L'], npcs: [
    extra('酿酒师傅', 5, ['醉仙楼的“落霞烧”，就是从老汉这几口缸里出去的。', '好酒要等。高粱入缸，少说也得等过一个冬天。', '闻见了？这一缸再有三天就能起了。'], { robe: '#7a4a2a', beard: 1 }),
    extra('打酒的汉子', 9, ['给我打二斤，要去年的陈酿！', '干了一天活，就指着这一口呢。'])] });

  room('bank', 41, 13, { name: '钱庄', sub: '落霞镇 · 北大街', floor: 'stone', goods: 'silver', sign: '汇通天下', rows: [
    'SS.QSSQ.SS',
    'CCCCC1....',
    '..........',
    '..........',
    '.2......3.',
    'L........L'], npcs: [
    extra('钱庄掌柜', 6, ['通宝钱庄，见票即兑，童叟无欺。', '近来兑现银的客人多了。人心一慌，都想把银子攥在手里。', '少侠的银两若是带着不便，日后小号开了分号，可以存在这里。'], { robe: '#4a4a3a' }),
    extra('钱庄护院', 9, ['站住。……哦，是客人。请。', '库里的银子，一两也少不得。'], { wp: 'saber', wc: '#d0d8e0', sz: 1.08 }),
    extra('兑银子的商人', 0, ['三百两的票子，掌柜的验了半炷香了……', '做买卖的，最怕的就是世道不稳。'])] });
})();

Object.assign(SCRIPTS, {
  // 屋里的闲人、街坊、村民：说什么看同他有多熟（talks.js 里按身份和熟悉程度备了话，生疏时也会说 lines 里原有的那几句）；每说一回，就更熟一点
  async chat(n) {
    const L = (n && n.def && n.def.lines) || ['……'], who = n && n.def && n.def.who;
    const t = typeof Talks !== 'undefined' && who ? Talks.next(who, L) : null;
    if (t) { await say(who, t); Talks.meet(who); return; }
    n._i = ((n._i == null ? -1 : n._i) + 1) % L.length;
    await say(who, L[n._i]);
  }
});

/* ============ 主线扩为十二关：沉舟坞、栖霞旧镇、天工墟、心渊；缘分支线与三种结局 ============
   情谊（S.bond.su / S.bond.bai）来自一路上的选择；两位姑娘各有一桩心事（缘分支线 q_su / q_bai）。
   最后在归墟门外，云澈要对谁开口由玩家选；她是否应下，看情谊够不够深（≥ BOND_NEED）、她的心事了没了。 */
const BOND_NEED = 10;   // 要到第 4 档“心照不宣”（见后面的 HEART_STEP，两处要一起改）
// 心渊照见的是谁：情谊最深、且已过半的那一位；都不够深，照见的就是少年时的自己
const heartOf = s => { const b = s.bond || {}, su = b.su || 0, bai = b.bai || 0; return su >= 6 && (su > bai || (su === bai && s.flags.q_su === 3)) ? 'su' : bai >= 6 ? 'bai' : su >= 6 ? 'su' : 'hero'; };

Object.assign(MAPS, {
  dock: {
    name: '沉舟坞', sub: '水寨连营 · 夜渡无灯', theme: 'dusk', road: 'plank', w: 44, h: 32, seed: 151, dense: 0.05,
    rim: { n: 'water', s: 'water', w: 'water' }, rimH: 4, scen: { hills: 0.25, n: 4 },
    lakes: [[21, 13, 12.5, 5.5], [37, 27, 4.5, 3]],
    clear: [[22, 14, 6, 4, GR.STONE], [14, 24, 13, 6, GR.STONE]],
    paths: [[[20, 0], [20, 5], [7, 5], [7, 21], [20, 21], [20, 24]], [[20, 5], [35, 5], [35, 15], [27, 15]], [[7, 13], [3, 13]], [[35, 15], [35, 22], [38, 22]]],
    builds: [{ x: 22, y: 11, w: 5, h: 3, s: 'stilt', s2: 'house3' }, { x: 17, y: 2, w: 2, h: 2, s: 'towerW', s2: '' }, { x: 23, y: 2, w: 2, h: 2, s: 'towerW', s2: '' },
      { x: 10, y: 1, w: 4, h: 3, s: 'hut', s2: 'house1' }, { x: 30, y: 25, w: 5, h: 3, s: 'stilt', s2: 'house3' }],
    props: [{ x: 14, y: 24, s: 'brazier' }, { x: 26, y: 24, s: 'brazier' }, { x: 14, y: 29, s: 'brazier' }, { x: 26, y: 29, s: 'brazier' }, { x: 19, y: 4, s: 'lantern' }, { x: 22, y: 4, s: 'lantern' },
      { x: 6, y: 12, s: 'lantern' }, { x: 9, y: 20, s: 'lantern' }, { x: 34, y: 14, s: 'lantern' }, { x: 15, y: 12, s: 'boat' }, { x: 17, y: 16, s: 'boat' }, { x: 28, y: 11, s: 'boat' }],
    exits: [{ x: 20, y: 0, w: 2, h: 1, to: 'ferry', tx: 20, ty: 25 }],
    npcs: [
      { who: 'healer', x: 23, y: 16, talk: 'healer', show: s => !s.flags.dockDone },
      { who: 'healer2', x: 26, y: 16, talk: 'healer', face: -1, show: s => !s.flags.dockDone },
      springNpc(17, 23),
      chestNpc('k1', 3, 12, [['potion2', 3], ['gold', 500]]),
      chestNpc('k2', 39, 21, [['mp2', 3], ['revive', 1]]),
      { x: 28, y: 27, sprite: 'chest', chest: 'k_ledger', talk: 'ledger_box', name: '账箱', show: s => s.flags.q_ledger === 1 || s.flags.c_k_ledger }
    ],
    fixed: [{ x: 20, y: 27, group: ['chenzhou', 'oarman', 'oarman'], boss: true, show: s => !s.flags.dockDone, pre: 'chenzhou_pre', post: 'chenzhou_post' }],
    foes: { n: 6, groups: [['oarman', 'oarman'], ['dockspy', 'oarman'], ['dockspy', 'dockspy'], ['oarman', 'oarman', 'dockspy']] }
  },
  oldtown: {
    name: '栖霞旧镇', sub: '十二年前 · 一夜成墟', theme: 'mist', road: 'ruin', w: 44, h: 34, seed: 163, dense: 0.07,
    liquid: { liquid: 'void', water: '#140a26', water2: '#8a4fe0', shore: '#4a2a7a' }, scen: { hills: 0.5, n: 6 },
    water: [[10, 25, 2.6], [33, 26, 2.4], [8, 9, 2.2]],
    clear: [[15, 4, 13, 6, GR.STONE]],
    paths: [[[21, 33], [21, 10]], [[5, 18], [38, 18]], [[30, 18], [30, 13]], [[12, 18], [12, 24]], [[36, 18], [36, 11]]],
    builds: [{ x: 14, y: 14, w: 4, h: 3, s: 'ruin', s2: '' }, { x: 24, y: 14, w: 4, h: 3, s: 'ruin', s2: '' }, { x: 6, y: 14, w: 4, h: 3, s: 'ruin', s2: '' }, { x: 14, y: 21, w: 4, h: 3, s: 'ruin', s2: '' },
      { x: 25, y: 21, w: 4, h: 3, s: 'ruin', s2: '' }, { x: 33, y: 21, w: 4, h: 3, s: 'ruin', s2: '' }, { x: 28, y: 9, w: 5, h: 3, s: 'ruin', s2: '' },
      { x: 20, y: 27, w: 4, h: 1, s: 'paifang', pass: true, sign: '栖霞', s2: '' }],
    props: [{ x: 15, y: 4, s: 'deadP' }, { x: 27, y: 4, s: 'deadP' }, { x: 15, y: 9, s: 'rockD' }, { x: 27, y: 9, s: 'rockD' }, { x: 19, y: 20, s: 'deadP' }, { x: 24, y: 20, s: 'deadP' }, { x: 10, y: 17, s: 'rockD' }, { x: 34, y: 17, s: 'deadP' }],
    exits: [{ x: 21, y: 33, w: 2, h: 1, to: 'road', tx: 28, ty: 2 }],
    npcs: [
      { who: 'ruinhag', x: 19, y: 25, talk: 'ruinhag' },
      { sprite: 'tomb', x: 32, y: 13, talk: 'su_grave', name: '苏家旧宅', show: s => s.flags.oldDone },
      springNpc(24, 12),
      chestNpc('o1', 4, 18, [['potion3', 2], ['gold', 900]]),
      chestNpc('o2', 37, 10, [['revive', 1], ['mp2', 3]])
    ],
    fixed: [{ x: 21, y: 6, group: ['chaoying', 'tideshade', 'tideshade'], boss: true, show: s => !s.flags.oldDone, pre: 'chaoying_pre', post: 'chaoying_post' }],
    foes: { n: 6, groups: [['tideshade', 'tideshade'], ['tidewatch', 'tideshade'], ['tidewatch', 'tidewatch'], ['tideshade', 'tideshade', 'tidewatch']] }
  },
  tiangong: {
    name: '天工墟', sub: '冰谷深处 · 璇玑旧迹', theme: 'snow', road: 'frost', w: 42, h: 36, seed: 173, dense: 0.1, scen: { hills: 0.7, n: 6 }, rimH: 13,
    water: [[30, 26, 2.6], [8, 27, 2.4]],
    clear: [[14, 26, 13, 7, GR.STONE], [24, 4, 8, 4, GR.STONE]],
    paths: [[[0, 18], [12, 18], [12, 8], [28, 8], [28, 20], [20, 20], [20, 26]], [[12, 18], [6, 18], [6, 24]], [[28, 14], [35, 14], [35, 20]]],
    builds: [{ x: 8, y: 4, w: 3, h: 3, s: 'pagodaS', s2: '' }, { x: 16, y: 4, w: 2, h: 2, s: 'towerS', s2: '' }, { x: 11, y: 12, w: 4, h: 1, s: 'paifang', pass: true, sign: '天工', s2: '' },
      { x: 31, y: 9, w: 4, h: 3, s: 'ruin', s2: '' }, { x: 16, y: 13, w: 4, h: 3, s: 'ruin', s2: '' }],
    props: [{ x: 14, y: 26, s: 'crysI' }, { x: 26, y: 26, s: 'crysI' }, { x: 14, y: 32, s: 'crysI' }, { x: 26, y: 32, s: 'crysI' }, { x: 24, y: 8, s: 'lantern' }, { x: 31, y: 8, s: 'lantern' }],
    exits: [{ x: 0, y: 18, w: 1, h: 2, to: 'snow', tx: 41, ty: 9 }],
    npcs: [
      { who: 'lingshuang', x: 3, y: 17, talk: 'ls_guide', mark: s => s.flags.snowDone && !s.flags.lsGuide },
      { sprite: 'stele', x: 27, y: 5, talk: 'stele', name: '天工石碑' },
      springNpc(22, 22),
      chestNpc('g1', 5, 24, [['potion3', 3], ['gold', 1200]]),
      chestNpc('g2', 37, 20, [['revive', 2], ['mp2', 3]])
    ],
    fixed: [{ x: 20, y: 30, group: ['tgguard', 'tgpawn', 'tgpawn'], boss: true, show: s => !s.flags.tgDone, pre: 'tgguard_pre', post: 'tgguard_post' }],
    foes: { n: 6, groups: [['tgpawn', 'tgsoul'], ['tgsoul', 'tgsoul'], ['tgpawn', 'tgpawn'], ['tgsoul', 'tgsoul', 'tgpawn']] }
  },
  deep: {
    name: '心渊', sub: '归墟之内 · 念想成像', theme: 'abyss', w: 40, h: 40, seed: 181, dense: 0.08, scen: { hills: 0.45, n: 7 }, rimH: 8,
    lakes: [[29, 24, 5, 4], [9, 9, 4, 3.5]],
    clear: [[12, 3, 15, 7, GR.STONE], [15, 16, 9, 5, GR.STONE]],
    paths: [[[19, 39], [19, 30], [8, 30], [8, 18], [19, 18]], [[19, 16], [19, 10]], [[19, 30], [30, 30], [30, 34]], [[8, 18], [4, 18], [4, 12]]],
    props: [{ x: 12, y: 3, s: 'crysP' }, { x: 26, y: 3, s: 'crysP' }, { x: 12, y: 9, s: 'brazier' }, { x: 26, y: 9, s: 'brazier' }, { x: 15, y: 16, s: 'crysP' }, { x: 23, y: 16, s: 'crysP' }],
    exits: [{ x: 19, y: 39, w: 2, h: 1, to: 'abyss', tx: 18, ty: 4 }],
    npcs: [springNpc(21, 33), chestNpc('z1', 32, 34, [['potion3', 3], ['revive', 2]]), chestNpc('z2', 4, 11, [['mp2', 4], ['gold', 2000]])],
    fixed: [
      { x: 19, y: 17, group: ['xx_su'], boss: true, show: s => !s.flags.xxDone && heartOf(s) === 'su', pre: 'xinxiang_pre', post: 'xinxiang_post' },
      { x: 19, y: 17, group: ['xx_bai'], boss: true, show: s => !s.flags.xxDone && heartOf(s) === 'bai', pre: 'xinxiang_pre', post: 'xinxiang_post' },
      { x: 19, y: 17, group: ['xx_hero'], boss: true, show: s => !s.flags.xxDone && heartOf(s) === 'hero', pre: 'xinxiang_pre', post: 'xinxiang_post' },
      { x: 19, y: 6, group: ['moxiang'], boss: true, show: s => s.flags.xxDone && !s.flags.final, pre: 'moxiang_pre', post: 'moxiang_post' }
    ],
    foes: { n: 6, groups: [['deathguard', 'soulshade'], ['tideshade', 'soulshade'], ['deathguard', 'deathguard'], ['tideshade', 'tideshade', 'soulshade']] }
  }
});
// 把新地图接到旧地图上，并在旧地图上放缘分支线要采的三味药
(() => {
  const M = MAPS;
  M.ferry.paths.push([[20, 24], [20, 27]]);
  M.ferry.exits.push({ x: 20, y: 27, w: 2, h: 1, to: 'dock', tx: 20, ty: 2, need: 'ferryDone', msg: '栈桥尽头系着一条乌篷船。眼下还有人守着栈桥。' });
  M.road.paths.push([[28, 4], [28, 0]]);
  M.road.exits.push({ x: 28, y: 0, w: 2, h: 1, to: 'oldtown', tx: 21, ty: 31, need: 'cliffDone', msg: '一条荒草没膝的旧路通向山北。路口的石碑倒在地上，隐约是“栖霞”二字。' });
  M.snow.paths.push([[33, 9], [43, 9]]);
  M.snow.exits.push({ x: 43, y: 9, w: 1, h: 2, to: 'tiangong', tx: 2, ty: 18, need: 'snowDone', msg: '东面的冰谷里风声如哨，积雪没过了路。' });
  M.abyss.exits.push({ x: 17, y: 2, w: 2, h: 1, to: 'deep', tx: 19, ty: 37, need: 'gateOpen', door: true, msg: '归墟之门紧闭着，门缝里渗出一线黑气。' });
  for (const f of M.abyss.fixed) if (f.group[0] === 'ye') f.show = s => !s.flags.gateOpen && !s.flags.final;
  const herb = (map, x, y, item, name) => M[map].npcs.push({ sprite: 'herb', x, y, talk: 'herb_pick', item, name, show: s => s.flags.q_bai === 1 && !s.items[item] });
  herb('bamboo', 24, 17, 'qixing', '七星莲'); herb('fire', 12, 18, 'huorong', '火绒芝'); herb('snow', 10, 27, 'xuejian', '雪见草');
  const bk = M.in_book && M.in_book.npcs.find(n => NPCS[n.who] && NPCS[n.who].name === '书肆掌柜'); if (bk) { bk.talk = 'bookman'; bk.mark = s => s.flags.snowDone && !s.flags.q_rubbing; }
  for (const n of (M.in_yamen ? M.in_yamen.npcs : [])) if (n.who === 'captain') n.mark = s => s.flags.dockDone && !s.flags.q_ledger;
})();
// 各关卡地图“该在几级来”（记作 L）。对手的强弱只看等级：路上的对手 L-1、首领 L+2（data.js 的 ENEMY_LV），
// 队伍练高了，路上的对手保持比队伍低一级（core.js 的 encounterPlan）。不再有逐图的强度倍率。
const MAPLV = { road: 2, bamboo: 5, fort: 6, ferry: 8, cave: 9, dock: 11, fire: 12, forge: 13, cliff: 15, oldtown: 18, snow: 19, icecave: 19, tiangong: 21, city: 23, abyss: 25, deep: 27 };
for (const id in MAPLV) if (MAPS[id]) MAPS[id].lv = MAPLV[id];

QUESTS.push(
  { id: 'q_bai', name: '青囊补遗（白芷的心事）', who: '白芷', where: '万竹林 · 赤焰谷 · 寒月雪岭 → 落霞镇药铺', open: s => s.flags.dockDone,
    text: [() => { const it = S.items, got = ['qixing', 'huorong', 'xuejian'].filter(k => it[k] > 0); return got.length === 3 ? '三味药都齐了。带白芷回落霞镇药铺，找杜大夫一起把师父的方子配出来。' : '百草翁留下的半张药方，缺三味主药：万竹林的七星莲、赤焰谷的火绒芝、寒月雪岭的雪见草。（已得 ' + got.length + ' / 3，药草在各地路旁发着微光）'; }, ''] },
  { id: 'q_su', name: '旧梳（苏青禾的心事）', who: '苏青禾', where: '落霞镇城隍庙 → 栖霞旧镇 · 苏家旧宅', open: s => s.flags.oldDone,
    text: [() => (S.items.paiwei ? '灵位写好了。带着它回栖霞旧镇，到苏家旧宅前，把那把木梳安葬。' : '苏青禾想给娘立一座坟。先去落霞镇城隍庙，请庙祝写一块灵位。'), ''] },
  { id: 'q_ledger', name: '沉舟坞的账册', who: '秦捕头', where: '沉舟坞 · 聚义台东侧', open: s => s.flags.dockDone, text: ['衙门要治沉舟坞掳人的罪，缺一样物证。去水寨聚义台的东边，找那只记着“送郎中”的账箱。', '账册到手，回落霞镇衙门交给秦捕头。'] },
  { id: 'q_rubbing', name: '天工拓片', who: '书肆掌柜', where: '寒月雪岭东谷 → 天工墟 · 石碑', open: s => s.flags.snowDone, text: ['书肆掌柜想要一纸天工墟石碑的拓片。去冰谷里那块碑前拓一张。', '拓片到手，回落霞镇书肆交给掌柜。'] }
);

Object.assign(SCRIPTS, {
  /* ---------- 第三章 · 沉舟坞 ---------- */
  async healer() {
    await talk([
      ['healer', '几位是……来救人的？老朽是下游柳溪村的郎中，被掳来三个月了。'],
      ['healer2', '他们逼我们日夜熬药，一炉一炉往北边送。那药是吊命用的——吃药的人，怕是已经油尽灯枯了。'],
      ['bai', '有没有见过一位白眉毛的老人？他叫百草翁。'],
      ['healer', '见过。他是被单独关着的，后来……唉。牢门的钥匙在寨主“沉舟”身上，人在南边的聚义台。']
    ]);
  },
  async chenzhou_pre() {
    await Cine.begin(() => { const c = Cine.foe('chenzhou'); if (c) c.yaw = 0; Cine.wide(['hero', 'chenzhou'], { yaw: 0.8, pitch: 0.24 }); });
    await Cine.talk([
      [null, '水寨深处的聚义台上，一个铁塔般的汉子正用一支铁桨拨弄着火盆。'],
      ['chenzhou', '千面那娘们说，有几条小鱼要顺水漂下来。嘿，还真来了。'],
      ['bai', '你们掳来的郎中在哪里？百草翁在哪里？'],
      ['chenzhou', '郎中？牢里关着几个。至于那个最老的——盟主亲自提走了。小丫头，你来晚了。'],
      ['su', '提去哪儿了？'],
      ['chenzhou', '问得好。赢了老子手里这支桨，就告诉你们。输了正好——寨里还缺几个摇橹的。']
    ]);
    await Cine.end(true);
  },
  async chenzhou_post() {
    await talk([
      ['chenzhou', '咳……好剑。牢门的钥匙在老子腰上，拿去。'],
      ['bai', '我师父呢？'],
      ['chenzhou', '北边。雪岭背后那座城。盟主的身子……二十年的幽烬心法，早把他烧空了。全天下的名医，他都要。'],
      ['chenzhou', '“撑到门开那一天就够了”——他是这么说的。'],
      [null, '牢门打开，几名郎中相互搀扶着走了出来。为首的老郎中颤巍巍地递过半张药方。'],
      ['healer', '白姑娘？百草翁被带走之前，把这个塞在了老朽的鞋底。他说，若有个背药囊的丫头找来，就交给她。'],
      [null, '药方只剩半页，是一张解“烬毒”的方子。背面有一行小字：丫头，莫来寻我。带着玉，走得越远越好。'],
      ['bai', '…………'],
      ['bai', '师父总是这样。小时候我发烧，他说“莫怕，睡一觉就好”，自己却在药炉前守了三天三夜。'],
      [null, '聚义台下，几个受伤的水寨喽啰蜷在地上呻吟。白芷已经解开了药囊。'],
      ['su', '白芷，他们是幽烬盟的人。方才还想要我们的命。'],
      ['bai', '我知道。可他们现在是伤者。']
    ]);
    const c = await choose('云澈——', ['蹲下来，帮白芷按住伤口', '「师姐说得对。先顾郎中，他们等不起。」', '持剑守在一旁，让她放心去救']);
    S.flags.dockPick = c;
    if (c === 0) {
      await talk([
        ['hero', '要哪一味药？我来递。'],
        ['bai', '……金创散，左边第二格。'],
        [null, '她抬头看了他一眼，眼睛很亮。'],
        ['bai', '云少侠，我原以为你会拦我。'],
        ['hero', '拦你做什么。你救人的时候，比谁都像个侠客。']
      ]);
      bondAdd('bai', 2);
    } else if (c === 1) {
      await talk([
        ['bai', '……嗯。是我分不清轻重了。'],
        [null, '白芷合上药囊，先去看那几位郎中。苏青禾拍了拍云澈的肩。'],
        ['su', '算你明白。——不过那几个喽啰，我已经把止血的布条扔过去了。别告诉她。']
      ]);
      bondAdd('su', 1);
    } else {
      await talk([
        [null, '云澈没有说话，只是提剑站到了她的身后。'],
        ['bai', '……谢谢。有你在后面，我的手就不抖。']
      ]);
      bondAdd('bai', 1);
    }
    await talk([
      ['healer2', '这半张方子我看过了，是解烬毒的。只是缺了三味主药：七星莲、火绒芝、雪见草。'],
      ['healer', '我们几个身上都被灌了烬毒，才不敢逃。往后就借住在落霞镇杜大夫的药铺里，慢慢将养。'],
      ['bai', '三味药，我去找。师父的方子，我替他配完。'],
      ['su', '走吧。桥该放行了——过了河，就是赤焰谷。']
    ]);
    give('yaofang', 1);
    S.flags.dockDone = 1; S.flags.q_bai = 1; S.chapter = chapterOf(S.flags);
    toast('白芷的心事：<b>青囊补遗</b>（菜单 · 江湖 可查看）');
    setQuest('回烟雨渡，从东侧过桥，前往赤焰谷。');
    UI.banner(CHAPTERS[S.chapter], '过河 · 赤焰谷');
  },
  async ledger_box() {
    if (S.flags.c_k_ledger) { await say(null, '箱子已经空了。'); return; }
    S.flags.c_k_ledger = 1; Sfx.play('chest'); give('zhangce', 1); S.flags.q_ledger = 2;
    await say('su', '“三月，送北，郎中二人”“五月，送北，郎中三人”……一笔一笔，记得倒清楚。');
  },
  async q_ledger_offer() {
    await talk([
      ['captain', '沉舟坞的事，是少侠做的？好。那伙水匪掳人半年，苦主告到衙门，秦某却连寨门都摸不进去。'],
      ['captain', '如今寨子破了，可要定罪，还缺一样物证。水匪做事必有账——少侠若再去，替秦某找找那本账册。'],
      ['hero', '账册在何处？'],
      ['captain', '多半在聚义台左近。寨主睡觉的地方，离他的银子不会远。']
    ]);
  },
  async q_ledger_done() {
    await talk([
      ['captain', '好！有了这本账，往北的那条线，秦某就能顺藤摸瓜查下去。'],
      ['captain', '这块副牌少侠收着。往后在落霞镇，见牌如见秦某。']
    ]);
    give('acL', 1); give('gold', 600); S.items.zhangce = 0;
  },

  /* ---------- 缘分支线 · 白芷：青囊补遗 ---------- */
  async herb_pick(n) {
    const id = n.def.item; give(id, 1); Sfx.play('chest'); World.refresh();
    const got = ['qixing', 'huorong', 'xuejian'].filter(k => S.items[k] > 0).length;
    await say('bai', got === 3 ? '三味都齐了！……云少侠，我们回落霞镇药铺吧。' : { qixing: '七星莲。师父说，这花只在没有瘴气的水边开——林子，真的在好起来了。', huorong: '火绒芝，要趁热收进瓷瓶。……好烫。', xuejian: '雪见草。这么冷的地方，它偏要开花。' }[id]);
  },
  async q_bai_brew() {
    await talk([
      ['herb', '七星莲、火绒芝、雪见草……都是有年份的好药。白姑娘，这方子老朽看不透，你来掌炉。'],
      [null, '药铺后堂生起了炉火。白芷对着那半张药方看了很久，提笔把缺的那半页，一味一味补了上去。'],
      ['bai', '师父只教过我解毒。可这方子的前半页，是在教人——怎么让中毒的人，自己想活下去。'],
      ['bai', '我从前怕自己。同一株草，三钱救人，一两杀人，我全都配得出来。'],
      ['hero', '现在呢？'],
      ['bai', '现在不怕了。药是死的。……握着药杵的这只手往哪边用力，是我自己选的。'],
      [null, '三日之后，那几位郎中身上的烬毒尽数解了。老郎中把补全的药方抄了十几份，说要带回十里八乡去。'],
      ['herb', '《青囊补遗》——白姑娘，这名字，是你师父起的吧？如今，你替他写完了。'],
      [null, '白芷把一枚小小的香囊放进云澈手里，没有抬头。'],
      ['bai', '配药剩下的忘忧草。……不是谢礼。是我自己想给。']
    ]);
    for (const k of ['qixing', 'huorong', 'xuejian', 'yaofang']) S.items[k] = 0;
    give('acZ', 1); bondAdd('bai', 2);
    S.flags.q_bai = 3; Sfx.play('lvup'); toast('委托完成：<b>青囊补遗</b>'); G.save();
  },

  /* ---------- 第六章 · 栖霞旧镇 ---------- */
  async ruinhag() {
    const F = S.flags;
    if (F.oldDone) { await say('ruinhag', '雾散了。阿蘅她……总算能歇着了。禾丫头，常回来看看。'); return; }
    if (F.hagTalk) { await say('ruinhag', '别应声，丫头。应了，就走不了了。'); return; }
    await talk([
      ['ruinhag', '阿蘅？……阿蘅，是你回来了？你家禾丫头又爬树了，我替你喊了半天。'],
      ['su', '……阿婆。我是青禾。苏家的禾丫头。'],
      ['ruinhag', '禾丫头？禾丫头才这么高。……哦，哦。十二年了。老婆子糊涂了。'],
      ['ruinhag', '别往镇北的戏台去。一到起雾的时候，镇上的人就“回来”了。会说话，会笑，就是没有影子。'],
      ['ruinhag', '你娘也在。夜夜站在戏台上，喊你回家吃饭。老婆子不敢应——应了，就走不了了。'],
      ['bai', '苏姑娘……'],
      ['su', '我没事。走。']
    ]);
    F.hagTalk = 1;
  },
  async chaoying_pre() {
    await Cine.begin(() => { const c = Cine.foe('chaoying'); if (c) c.yaw = 0; Cine.grade('pale'); Cine.wide(['hero', 'chaoying', 'su'], { yaw: 0.6, pitch: 0.26 }); });
    await Cine.talk([
      [null, '旧戏台上起了雾。雾里站着一个妇人，挽着袖子，像是刚从灶台边出来。她的眉眼，与苏青禾有七分像。'],
      ['chaoying', '禾儿，疯到哪里去了？饭都凉了。'],
      ['su', '……娘。'],
      ['shi', '苏姑娘！它没有影子！'],
      ['chaoying', '手怎么这样凉。来，跟娘回家。灶上还煨着你爱喝的甜汤。'],
      [null, '苏青禾的剑垂了下去。她向前走了一步，又一步。', () => { Cine.close('su', { dist: 2.6, ang: 0.3 }); return false; }]
    ]);
    const c = await choose('云澈——', ['抓住她的手腕：「师姐，那不是她。」', '退后半步守着她，让她自己看清', '「白芷，醒神香！」']);
    S.flags.oldPick = c;
    if (c === 0) {
      await Cine.talk([
        ['hero', '师姐。那不是她。'],
        ['su', '我知道！我知道……可是它记得甜汤。连我都快忘了的事，它记得。'],
        ['hero', '记得的是你。它只是照着你心里的样子，捏了一个像。'],
        [null, '她的手在他掌心里抖了很久，终于反握回来，握得很紧。'],
        ['su', '……别松手。等我砍完这一剑，再松。']
      ]);
      bondAdd('su', 2);
    } else if (c === 1) {
      await Cine.talk([
        [null, '云澈没有拦她，只是把剑横在了一步就能赶到的地方。'],
        ['su', '娘。我长大了，会使剑了。师父说，我的剑太急。'],
        ['chaoying', '禾儿乖。跟娘回家。'],
        ['su', '……你只会说这几句。我娘骂起人来，半条街都听得见。'],
        [null, '她抬起剑，回头看了云澈一眼。'],
        ['su', '谢了。没拦我。']
      ]);
      bondAdd('su', 1);
    } else {
      await Cine.talk([
        ['bai', '屏息！'],
        [null, '一缕辛辣的药香散开。苏青禾猛地呛了一下，眼神清明过来。'],
        ['su', '咳咳——白芷！你这是什么鬼东西！'],
        ['bai', '醒神香，加了三倍的薄荷。……对不起，苏姑娘。可我不能看着你走过去。'],
        ['su', '……算了。欠你一回。']
      ]);
      bondAdd('bai', 1);
    }
    await Cine.talk([['su', '把我娘的脸，还给她。']]);
    await Cine.end(true);
  },
  async chaoying_post() {
    await talk([
      [null, '人影散成一地黑水，渗进戏台的缝隙里。雾，一点点薄了。'],
      ['su', '它最后说了什么，你们听见没有？'],
      ['bai', '它说……“禾儿，吃饱了再走”。'],
      ['su', '嗯。这一句，倒真像我娘。'],
      [null, '苏家旧宅只剩半堵墙。苏青禾在断梁下翻了很久，翻出一把烧黑了半边的桃木梳。'],
      ['su', '她每天早上给我梳头，梳得我直叫疼。……我以为早烧没了。'],
      ['shi', '放火的是那些黑衣人？'],
      ['su', '火是黑衣人放的。可在那之前，镇上的人已经不对了——师父从没告诉过我这个。'],
      ['hero', '师父说，那是门里漏出来的东西。'],
      ['su', '所以夜无殇要开的那扇门，开一条缝，就是一个栖霞镇。'],
      ['su', '师弟。这扇门，我一定要关上。不为听雨阁，为这把梳子。']
    ]);
    give('mushu', 1);
    S.flags.oldDone = 1; S.flags.q_su = 1; S.chapter = chapterOf(S.flags);
    toast('苏青禾的心事：<b>旧梳</b>（菜单 · 江湖 可查看）');
    setQuest('返回落霞镇，从镇北出口登上寒月雪岭。');
    UI.banner(CHAPTERS[S.chapter], '北上雪岭');
  },
  /* ---------- 缘分支线 · 苏青禾：旧梳 ---------- */
  async q_su_tablet() {
    await talk([
      ['su', '庙祝爷爷。我想……请您写一块灵位。'],
      ['miaozhu', '施主要供奉哪一位？'],
      ['su', '我娘。姓林，单名一个蘅字。栖霞镇人。'],
      [null, '庙祝研了墨，一笔一画写得很慢。写完，又在灵位背面添了一行小字。'],
      ['miaozhu', '“女青禾立”。——施主，立了位，人就有处可去了。往后逢年过节，记得添一炷香。'],
      ['su', '……多谢。'],
      [null, '走出庙门，苏青禾把灵位抱在怀里，走得很快。云澈跟上去，她才放慢了步子。'],
      ['su', '师弟，陪我再回一趟栖霞。把梳子，埋在我家院子里。']
    ]);
    give('paiwei', 1);
  },
  async su_grave() {
    const F = S.flags;
    if (F.q_su === 3) { await say(null, '坟前的野花开了。灵位擦得很干净。'); return; }
    if (F.q_su !== 1 || !S.items.paiwei) { await say(null, '断梁，焦土，半堵墙。这里曾是一户人家。' + (F.q_su === 1 ? '（先去落霞镇城隍庙，请庙祝写一块灵位）' : '')); return; }
    await talk([
      [null, '苏家旧宅的院子里，一株老桃树竟还活着。苏青禾在树下挖了一个坑，把木梳用帕子包好，放了进去。'],
      ['su', '娘。我把梳子还你。往后，没人扯着我的头发骂我疯丫头了。'],
      ['su', '我过得挺好的。师父待我好，就是偏心。同门有个师弟，剑使得凑合，人嘛……'],
      [null, '她顿了顿，回头看了云澈一眼，又转了回去。'],
      ['su', '人还行。吵架从来吵不赢我，却每回都在。'],
      ['hero', '伯母。往后，我陪她来。'],
      ['su', '……谁让你插嘴的。'],
      [null, '她填好土，立起灵位，又在坟前站了很久。起身的时候，把自己剑上那条褪了色的青穗解下来，重新打了个结，系在了云澈的剑柄上。'],
      ['su', '旧了，凑合用。——系上，别弄丢了。']
    ]);
    S.items.mushu = 0; S.items.paiwei = 0;
    give('acQ', 1); bondAdd('su', 2);
    F.q_su = 3; Sfx.play('lvup'); toast('委托完成：<b>旧梳</b>'); G.save();
  },

  /* ---------- 第八章 · 天工墟 ---------- */
  async ls_guide() {
    const F = S.flags;
    if (F.final) { await say('lingshuang', '寒月宫的梅花，今年开得很好。我替师父，多看了一眼。'); return; }
    if (F.tgDone) { await say('lingshuang', '关门的法子……原来如此。师父她，是自己选的。'); return; }
    if (F.lsGuide) { await say('lingshuang', '石碑在北面，铜殿在谷底。我在这里守着，不让雪狼进去。'); return; }
    await talk([
      ['lingshuang', '来了。谷里的石俑和机关灵认的是寒月宫的心法，我一进去，它们就会全醒过来。所以只能送到这里。'],
      ['lingshuang', '往里走，先看石碑，再去谷底的铜殿。殿里有一件东西，叫璇玑枢。'],
      ['su', '你倒不怕我们拿了东西就跑。'],
      ['lingshuang', '你们若是会跑的人，就走不到寒月宫。'],
      ['lingshuang', '……还有。我师父当年进门之前，在那块碑前站了一夜。你们看了碑文，就知道她为什么非进去不可。']
    ]);
    F.lsGuide = 1;
  },
  async stele() {
    const F = S.flags;
    if (F.q_rubbing === 1) { give('tapian', 1); F.q_rubbing = 2; Sfx.play('chest'); await say('bai', '拓好了。墨还没干，小心些拿。'); }
    if (F.steleRead) { await say(null, '“无殇，莫等。”——那一行小字，刻得很浅。'); return; }
    await talk([
      [null, '石碑上的古篆已被风雪磨去大半。白芷辨认了很久，轻声念了出来。'],
      ['bai', '“璇玑四分，以镇归墟。门启之后，潮出不止。欲阖其门，须有一人持枢入内，自内而阖之。”'],
      ['bai', '“入者不得复出。是以寒月立圣女，世代以身为钥。”'],
      ['shi', '……所以叶疏影当年，不是被送进去的。'],
      ['su', '是她自己走进去的。门漏了，总得有人进去关。'],
      ['hero', '师伯恨了二十年的“规矩”，原来是这个。'],
      [null, '碑的最下面，有一行后刻上去的小字，刻得很浅，像是用发簪划的：“无殇，莫等。”']
    ]);
    F.steleRead = 1;
  },
  async tgguard_pre() {
    await talk([
      [null, '谷底的铜殿里，一尊丈许高的铁俑单膝跪在殿心，掌中托着一枚拳头大小的铜枢。'],
      [null, '众人踏进殿门的一瞬，铁俑的眼眶里亮起了两点金光。'],
      ['tgguard', '持……玉者……止步。枢……非……取用之物。'],
      ['hero', '我们要用它关上归墟之门。'],
      ['tgguard', '取枢者……须……入门。入门者……不归。尔等……可愿？'],
      ['su', '这铁疙瘩是在问：谁去送死。'],
      ['hero', '先拿到手，再说谁去。'],
      ['tgguard', '不答……即……不予。']
    ]);
  },
  async tgguard_post() {
    await talk([
      [null, '铁俑轰然跪倒，掌中的铜枢滚落在地。它眼中的金光熄灭之前，又响了一声：'],
      ['tgguard', '三百年……终有……肯来取的人。']
    ]);
    give('shuji', 1);
    await talk([
      [null, '璇玑枢入手冰凉。四个人谁也没有先开口。'],
      ['shi', '碑上写得明白：得有一个人拿着它进门，从里面关。进去的，出不来。'],
      ['bai', '……我是大夫。门里若有伤者——'],
      ['su', '少来。要进也是我进。我跟那扇门有账要算。'],
      ['hero', '谁都不进。'],
      ['su', '师弟——'],
      ['hero', '夜师伯要进门，是为了一个人。我们去拦他，不是为了再赔进去一个。到了门前，总有别的法子。'],
      ['shi', '……行。这句话我先记下。到时候没法子，我可不认账。'],
      [null, '当夜，冰谷口。凌霜生了一堆火，自己坐得很远。']
    ]);
    const c = await choose('这一夜，云澈——', ['去找苏青禾', '去找白芷', '一个人翻看璇玑枢']);
    S.flags.tgNight = c;
    if (c === 0) {
      await talk([
        ['su', '睡不着？我也是。'],
        ['su', '白天那句“要进也是我进”，不是逞强。我认真想过。'],
        ['hero', '我知道。所以才不许。'],
        ['su', '凭什么你说不许就不许。'],
        ['hero', '凭我吵不过你，只能先把话撂在这儿。'],
        [null, '她笑出了声，又很快收住，把脸埋进了膝盖里。'],
        ['su', '……云澈。要是真到了那一步，你别抢在我前头。我受不了第二回——看着人走进去，不回来。'],
        ['hero', '不会有那一步。'],
        ['su', '你最好说到做到。']
      ]);
      bondAdd('su', 2);
    } else if (c === 1) {
      await talk([
        ['bai', '云少侠。我在想碑上那一行小字。“无殇，莫等。”'],
        ['bai', '她明知道自己回不来，还怕他等。……可他还是等了二十年。'],
        ['hero', '换作是你呢？'],
        ['bai', '我？我大概会留一张药方。写得长长的，写上他会生的所有的病——这样他每回吃药，都得想起我来。'],
        [null, '她说完才发觉这话不对，耳朵一下子红了。'],
        ['bai', '我、我是说打个比方！'],
        ['hero', '嗯。那我一定好好生病。'],
        ['bai', '……不许。病了，我会心疼的。']
      ]);
      bondAdd('bai', 2);
    } else {
      await talk([
        [null, '云澈独自把璇玑枢翻来覆去看了半夜。铜枢的内壁上，刻着历代持枢人的名字。最后一个，是“叶疏影”。再往下，还空着一格。'],
        ['hero', '这一格，不该再有名字了。']
      ]);
    }
    S.flags.tgDone = 1; S.chapter = chapterOf(S.flags);
    setQuest('回寒月雪岭，穿过寒月宫东北的山门，前往雪岭背后的幽烬城。');
    UI.banner(CHAPTERS[S.chapter], '山门已开');
  },
  async bookman(n) {
    if (await sideQuest('q_rubbing')) return;
    // 每回搭话先吟一首（三十首里随机一首，各首机会均等，见 talks.js 的 POEMS），再说一句同少侠有多熟就说到哪一步的话
    if (typeof Talks !== 'undefined' && n && n.def && n.def.who) await say(n.def.who, Talks.poem());
    await SCRIPTS.chat(n);
  },
  async q_rubbing_offer() {
    const b = bookWho();
    await talk([
      [b, '少侠是从雪岭下来的？老朽斗胆，有一事相求。'],
      [b, '古书上说，雪岭东谷有一座天工墟，墟中立着一块记“璇玑”的石碑。老朽找了半辈子，腿脚却上不得雪山。'],
      [b, '少侠若是路过，替老朽拓一纸碑文回来。老朽照着上头的纹样，给少侠翻铸一件小玩意儿。']
    ]);
  },
  async q_rubbing_done() {
    const b = bookWho();
    await talk([
      [b, '这、这是天工古篆！“欲阖其门，须有一人持枢入内”……原来书上写的都是真的。'],
      [b, '少侠稍候——这面小铜鉴，是老朽照着碑额的纹样铸的，据说能凝神静气。请收下。']
    ]);
    give('acW', 1); give('gold', 800); S.items.tapian = 0;
  }
});
// 书肆掌柜在室内图里的代号（r_ 开头，按顺序编的）：对白里要用它当说话人
function bookWho() { const n = MAPS.in_book && MAPS.in_book.npcs.find(v => v.talk === 'bookman'); return n ? n.who : null; }

Object.assign(SCRIPTS, {
  /* ---------- 终章 · 心渊 ---------- */
  async xinxiang_pre() {
    const r = heartOf(S), id = 'xx_' + r;
    await Cine.begin(() => { const c = Cine.foe(id); if (c) c.yaw = 0; Cine.grade('night'); Cine.wide(['hero', id], { yaw: 0.7, pitch: 0.22 }); });
    await Cine.talk(r === 'su' ? [
      [null, '心渊深处是一片静水。水面上站着一个人，青衣，束发，正歪着头冲他笑。'],
      [id, '师弟。门里没有规矩，没有师父，也没有那扇要人去关的门。'],
      [id, '留下来吧。我再也不同你吵了。你说什么，我都依你。'],
      ['su', '…………喂。'],
      ['hero', '你不是她。'],
      [id, '我哪里不是？'],
      ['hero', '她不会说“都依你”。她只会说“凭什么”。'],
      [null, '真正的苏青禾站在他身后，握剑的手紧了又松，耳根红得厉害。'],
      ['su', '……算你有眼力。砍它！']
    ] : r === 'bai' ? [
      [null, '心渊深处是一片静水。水面上站着一个人，白衣，药囊，正低头数着手里的药草。'],
      [id, '云少侠，你来了。这里没有人受伤，也没有人会死。我再也不用数你身上的伤了。'],
      [id, '留下来。我给你煎一辈子的药，一味也不苦。'],
      ['bai', '那、那不是我……'],
      ['hero', '我知道。'],
      ['hero', '她煎的药苦得很。她说，药不苦，人就不记得疼。'],
      [null, '真正的白芷怔了一下，攥着药囊的手指，轻轻松开了。'],
      ['bai', '……云澈。我们把它送走吧。']
    ] : [
      [null, '心渊深处是一片静水。水面上站着一个少年，背着一柄比人还高的木剑——是十年前刚上山时的云澈自己。'],
      [id, '山下好玩吗？师父说，学成了剑就能下山。可我不想下山了。这里不下雨，也没有人会走。'],
      ['hero', '会走的。师父会老，师姐会有自己的路，朋友会回各自的山谷。'],
      [id, '那你还出去做什么？'],
      ['hero', '去送他们。也让他们送我。'],
      ['su', '……师弟，你小时候原来这么矮。'],
      ['bai', '苏姑娘！']
    ]);
    if (r !== 'hero' && !S.flags.xxBond) { S.flags.xxBond = 1; bondAdd(r, 1); }
    await Cine.end(true);
  },
  async xinxiang_post() {
    const r = heartOf(S);
    await talk([
      [null, '心像碎成一片水光。水面之下，露出一道通往深处的石阶。'],
      ['shi', '这地方专挑人心里软的地方下刀。……都还撑得住吧？'],
      r === 'su' ? ['su', '撑得住。——方才那些话，出去以后不许再提。'] : r === 'bai' ? ['bai', '嗯。……云少侠方才认得那么快，我有些高兴。'] : ['hero', '撑得住。走吧，师伯还在下面。']
    ]);
    S.flags.xxDone = 1;
    setQuest('沿石阶往心渊最深处走。夜无殇就在那里。');
  },
  async moxiang_pre() {
    await talk([
      [null, '归墟的最深处没有光。黑潮凝成一尊顶天立地的魔相，魔相的胸口，隐约嵌着一个白发的人影。'],
      ['moxiang', '吾……即……归墟……念……皆……归我……'],
      ['bai', '夜盟主还活着！他的念想是它的根——他不醒，它就不散。'],
      ['su', '那就打到他醒。'],
      ['hero', '师伯！听雨阁的雨还在下——你听！']
    ]);
  },
  async moxiang_post() {
    const F = S.flags, P = Math.PI, m0 = MAPS.deep.fixed[3];
    await Cine.begin(() => { Cine.put('ye', m0.x, m0.y - 0.4, 0, ENEMIES.ye.look); Cine.grade('night'); Cine.wide(['ye', 'hero'], { yaw: 0.5, pitch: 0.26 }); });
    await Cine.talk([
      [null, '魔相崩解，黑潮四散。夜无殇跌落在石台上，白发散乱，手里攥着的只是一把灰烬。'],
      ['ye', '……不是她。她的手，没有这么冷。'],
      ['ye', '我听见了。雨声，是听雨阁檐下的雨声……还有她的声音。她说：隔着一扇门，也算是相守。'],
      [null, '云澈取出璇玑枢。铜枢内壁上，最后一个名字的下面，还空着一格。'],
      ['ye', '给我。'],
      ['hero', '师伯！碑上说，进去的人——'],
      ['ye', '我本来就在门里了，澈儿。二十年前就在了。'],
      ['ye', '她替天下人守了二十年。往后的，我替她守。这一格，该刻我的名字。']
    ].concat(S.items.yupei ? [[null, '云澈想起怀里那块旧玉佩，递了过去。夜无殇看了很久很久，把它系回了腰间——像是二十年前，它本该在的地方。']] : [], [
      ['ye', '出去吧。别学我。有什么话，趁人还在眼前，就说。'],
      [null, '夜无殇握住璇玑枢，将那半盏河灯揣入怀中，转身走向黑潮退去的方向。四枚璇玑玉自众人怀中飞起，化作四道流光，追着他去了。', async () => {
        if (!Cine.on()) return;
        Cine.look('ye', null); Cine.face('ye', P); Cine.go('ye', m0.x, m0.y - 3, 0.5); Cine.tween(Cine.get('ye'), { alpha: 0 }, 3.8); Cine.push(0.9, 5);
        await Cine.wait(1.6); return false;
      }],
      [null, '脚下的心渊开始合拢。一股柔和的力道推着众人，退出了门外——']
    ]));
    await UI.fade(1); Cine.kill();
    for (const j of ['jade1', 'jade2', 'jade3', 'hedeng', 'duanjian', 'yupei', 'shuji']) S.items[j] = 0;
    World.enter('abyss', 18, 6); healAll(); UI.hud();
    // 归墟门外：百草翁醒来，然后是那句“趁人还在眼前”
    await Cine.begin(() => { Cine.put('baicao', 21.8, 4.3, 0.2); Cine.wide(['hero', 'su', 'bai', 'baicao'], { yaw: 0.5, pitch: 0.28 }); });
    await Cine.talk([
      [null, '归墟之门在身后缓缓合上，再没有一丝缝隙。'],
      ['bai', '师父！'],
      [null, '门前的石台上，被囚多日的百草翁悠悠转醒。'],
      ['baicao', '咳……丫头，哭什么。为师这把老骨头，硬得很。'],
      ['baicao', '那位夜盟主……最后这半年，是他自己不肯再吃药了。他说，够了，撑到门开就够了。'],
      [null, '天亮了。北边的天际，那道紫色的口子不见了。几个人坐在石阶上，谁也没有力气说话。'],
      [null, '云澈想起夜无殇最后的那句话。']
    ]);
    const c = await choose('有什么话，趁人还在眼前——', ['走到苏青禾面前', '走到白芷面前', '什么也没有说']);
    const who = c === 0 ? 'su' : c === 1 ? 'bai' : '', deep = !!who && bondOf(who) >= BOND_NEED, done = !!who && F['q_' + who] === 3;
    F.endPick = who; F.ending = who && deep && done ? who : 'solo';
    F.final = 1; S.chapter = chapterOf(F);
    if (who === 'su') await Cine.talk(deep && done ? [
      ['hero', '师姐。'],
      ['su', '干什么。'],
      ['hero', '方才在门里，我对着那个假的说了一堆。真的这个，我还一句没说。'],
      ['su', '……说。'],
      ['hero', '往后下山，包袱我来背。吵架，我让你赢。还有——栖霞的坟，每年清明，我陪你去。'],
      [null, '苏青禾盯着他看了很久。然后伸手，重重地弹了一下他的额头。'],
      ['su', '笨蛋。这种话，要先说“我喜欢你”。'],
      ['hero', '我喜——'],
      ['su', '晚了。我先说的。'],
      [null, '石破军咳嗽一声，把脸转向了另一边。白芷低下头，笑了一下，把一包药塞进了苏青禾的行囊。'],
      ['bai', '治他嘴笨的。苏姐姐，要按时喂。']
    ] : !done ? [
      ['hero', '师姐。我……'],
      ['su', '……云澈。我心里还压着一件事。娘的梳子，还没入土。'],
      ['su', '等我把她送走了，你再问我一遍。到那时候，我好好答你。']
    ] : [
      ['hero', '师姐。我……'],
      ['su', '行了。看你那张脸，就知道要说什么。'],
      ['su', '师弟，我不是不愿意听。只是这一路上，你看我的时候，心里到底有几分是“师姐”，你自己都还没想明白。'],
      ['su', '等你想明白了，再来说。我又不会跑。']
    ]);
    else if (who === 'bai') await Cine.talk(deep && done ? [
      ['hero', '白芷。'],
      ['bai', '云少侠？你、你是不是哪里伤着了——'],
      ['hero', '没有。我是想说，万竹林的萤火，我想去看。'],
      ['bai', '……嗯。夏天的时候，最好看。'],
      ['hero', '不是只看一个夏天。'],
      [null, '白芷愣住了。药囊从她手里滑下去，她也没有去捡。'],
      ['bai', '我、我不会武功，只会煎很苦的药，还总是数你身上的伤……'],
      ['hero', '所以我才想，往后都让你数。'],
      [null, '她的眼泪一下子掉了下来，却是笑着的。'],
      ['bai', '……那你要先答应我，少添几道。'],
      ['su', '喂。当着师姐的面，收敛点。'],
      [null, '苏青禾嘴上这么说，却把脸转向了初升的日头，笑得很轻。'],
      ['su', '白芷，这小子往后归你管了。他要是敢欺负你，写信上山，我下来揍他。']
    ] : !done ? [
      ['hero', '白芷。我……'],
      ['bai', '……云澈。师父留下的那半张方子，我还没有配全。'],
      ['bai', '那是他教我的最后一课。我想先做完它，再来想自己的事。到那时候——你再问我，好不好？']
    ] : [
      ['hero', '白芷。我……'],
      ['bai', '云少侠，这一路承你照顾，我……很感激。'],
      ['bai', '可是感激和别的，我分得清。你看我的眼神，和看一位同行的大夫，没有两样。'],
      ['bai', '没关系的。往后你受了伤，还来找我，好不好？']
    ]);
    else await Cine.talk([
      [null, '他张了张口，终究什么也没有说。'],
      ['shi', '……啧。'],
      ['su', '走了走了，回家。师父的茶该凉了。'],
      ['bai', '嗯。我也该送师父回林子了。'],
      [null, '下山的路上，三个人各自回头看了一眼。谁也没有看见谁在回头。']
    ]);
    setQuest('江湖路远，后会有期。（已通关，可继续自由游历）');
    await UI.fade(1); Cine.kill();
    Sfx.music('title');
    await UI.narrate(endingLines());
    await UI.narrate(await endingLetter());
    healAll();
    World.enter('tingyu', 14, 10); G.save(); UI.hud();
    await UI.fade(0);
    UI.banner('尾声', F.ending === 'su' ? '檐下听雨' : F.ending === 'bai' ? '萤火归林' : '江湖路远');
  }
});

/* ---------- 这一路的经过（结局手书、AI 谈心用）与结局手书 ---------- */
function journey() {
  const F = S.flags, a = [], nm = k => (k === 'su' ? '苏青禾' : '白芷');
  if (F.lanternWith) a.push('烟雨渡的河灯会，云澈陪' + nm(F.lanternWith) + (F.lanternWith === 'su' ? '猜灯谜，她赢了一只兔子灯' : '在河边放了一盏莲花灯'));
  if (F.dockPick === 0) a.push('沉舟坞里，白芷要救受伤的敌人，云澈蹲下来替她递药');
  if (F.cliffNight === 'su') a.push('断剑崖上苏青禾替云澈挡了一剑，那一夜他在她门外守到天亮'); else if (F.cliffNight === 'bai') a.push('苏青禾受伤那一夜，云澈在廊下帮白芷捣药');
  if (F.oldPick === 0) a.push('栖霞旧镇，苏青禾对着母亲的幻影失了神，是云澈抓住了她的手');
  if (F.q_su === 3) a.push('云澈陪苏青禾回栖霞旧镇，把她娘的木梳葬在老桃树下，她把旧剑穗系在了他的剑上');
  if (F.q_bai === 3) a.push('白芷采齐三味药，补全了师父留下的半张药方，把一枚忘忧草香囊给了云澈');
  if (F.tgNight === 0) a.push('天工墟的雪夜，苏青禾说“别抢在我前头”'); else if (F.tgNight === 1) a.push('天工墟的雪夜，白芷说要留一张长长的药方');
  if (F.campWith) a.push('入归墟前夜，云澈在火盆边找的是' + (F.campWith === 'shi' ? '石破军' : nm(F.campWith)));
  return a;
}
async function endingLetter() {
  const e = S.flags.ending || 'solo';
  const fixed = e === 'su' ? ['【苏青禾留在枕边的字条】', '臭小子：', '我下山打酒去了。师父问起，就说我在练剑。', '晚上回来吃饭。——不许再把我的剑穗系错边。', '青禾']
    : e === 'bai' ? ['【白芷夹在药方里的信】', '云澈：', '今日的药多放了一钱甘草，不那么苦了。', '林子里的萤火开始亮了。你若是忙完了，早些回来看。', '白芷']
      : ['【云澈写了又没有寄出的信】', '师姐、白芷：', '听雨阁的雨，今年下得很好。', '有些话，等下回见面，我当面说。', '云澈'];
  if (typeof AI === 'undefined' || !AI.on || !AI.letter || G.autoSkip) return fixed;
  const t = await AI.letter(e, journey());
  return t && t.length >= 2 ? [fixed[0]].concat(t) : fixed;
}

/* ---------- 客栈里的谈心：与苏青禾、白芷说说话。开了 AI 就是自由交谈，没开就是下面这些话；每章头一回谈心，情谊加一点（每人最多三点） ---------- */
/* 同伴说话的口吻跟着眼下的情谊走（S.bond，菜单里的那排心）。分七档：
     0 同行之谊（0–2）  1 渐渐熟络（3–5）  2 暗生在意（6–7）  3 心有所属（8–9）  4 心照不宣（≥ 10）　——分界在 HEART_STEP
     5 两心相许（结局里云澈对她说破了）  6 各自珍重（云澈选了另一位）
   结局里她应不应，要到第 4 档（BOND_NEED = 10，与 HEART_STEP[3] 是同一个数）；心渊照见谁（≥ 6）另有门槛，不跟着这里变。
   开了 AI：这一档的口吻说明写进她的人设里（HEART_TONE），开场白、收场白也按档换；
   没开 AI：按档从不同的几段话里挑（HEART），收场白同样按档换。路上的随口闲聊（AI.banter）也带上这一档的简述。 */
const HEART_NAME = ['同行之谊', '渐渐熟络', '暗生在意', '心有所属', '心照不宣', '两心相许', '各自珍重'];
const HEART_STEP = [3, 6, 8, 10];   // 情谊到这么多点，分别升到第 1、2、3、4 档
function heartTier(id) {
  const e = S.flags.ending, b = bondOf(id);
  if (e === id) return 5;
  if ((e === 'su' || e === 'bai') && e !== id) return 6;
  return b >= HEART_STEP[3] ? 4 : b >= HEART_STEP[2] ? 3 : b >= HEART_STEP[1] ? 2 : b >= HEART_STEP[0] ? 1 : 0;
}
const HEART_TONE = {
  su: [
    '你把他当作刚带下山、要自己罩着的小师弟：说话明快、爱使唤、爱拌嘴，只叫他“师弟”或“臭小子”，不谈自己的心事，他问得深了就拿玩笑岔开。',
    '你已经习惯了有他在身边：照旧拌嘴、逗他，但会顺口问他吃没吃饱、伤好没好；叫他“师弟”“臭小子”。自己的事只肯说一点皮毛。',
    '你对他有了超出师姐弟的在意，自己还不肯承认：嘴上照旧不饶人，可常常话说到一半就改口、走神；被他说中心事会恼羞成怒地岔开。仍叫“师弟”“臭小子”。肯讲一点小时候和娘的事。',
    '你知道自己喜欢上他了，还嘴硬：拌嘴的话少了，偶尔会说出一句很软的话，说完立刻找补（“就说这一回”“你别多想”）。多数时候叫“师弟”，认真的时候会脱口叫他“云澈”。',
    '你和他之间只差一层窗户纸：说话比平日轻、慢，不再拿玩笑当挡箭牌，肯把害怕和舍不得说出口；常直呼“云澈”。但你不会主动表白，也不替他许诺将来。',
    '你们已经把话说破，是一对了：亲昵、自在，还是爱逗他、爱使唤他，只是每句话里都带着笑意和依赖；叫“云澈”，逗他时还叫“臭小子”。',
    '他已和白芷在一起。你把那点心思收好了，待他仍是最护短的师姐：爽利、坦荡，会打趣他、叮嘱他待白芷好，绝不提自己的委屈。叫他“师弟”。'
  ],
  bai: [
    '你与他相识不久，敬重他救过万竹林：客气、守礼，说话轻而短，三句不离伤势和药理，只称“云少侠”，不谈私事；他问到私事，你会不好意思地绕回医理。',
    '你把他当作可以放心同行的同伴：温和、耐心，会主动问他的伤和睡眠，偶尔讲一点林子里和师父的旧事；称“云少侠”。',
    '你发现自己会不自觉地多看他两眼：说话还是轻声细语，却常常停顿、脸热，拿药理来遮掩；会为他多备一份药、多沏一盏茶。称“云少侠”。',
    '你心里清楚这已经不是医者对病人的关心：话比平日多了些，肯说自己的害怕和盼望，说到要紧处会低下头；多数时候称“云少侠”，极偶尔会轻轻叫出“云澈”又改口。',
    '你与他只差一句话：语气很柔，不再躲闪，肯直呼“云澈”，会说“我在等你”“明天我还在”这样的话。但你不会主动表白，也不替他许诺将来。',
    '你们已经把话说破，是一对了：仍是轻声细语，却安心、亲近，会撒一点很含蓄的娇，会管着他吃药歇息；叫“云澈”。',
    '他已和苏青禾在一起。你把心事收进了药方里，待他仍是最细心的大夫和朋友：温和、有分寸，真心祝福他们，不提自己的失落。称“云少侠”。'
  ]
};
// 一句话的简述：路上几个人随口闲聊时用
const HEART_SHORT = {
  su: ['把他当小师弟使唤、拌嘴', '拌嘴里带着关心', '嘴硬，其实很在意他', '喜欢他，嘴上不认', '与他只差一层窗户纸，说话软了许多', '已与他是一对，亲昵、爱逗他', '把心思收起来了，仍是最护短的师姐'],
  bai: ['客气守礼，只称云少侠', '温和关切', '暗暗在意，容易脸热', '心里有他，话比平日多', '与他只差一句话，肯直呼云澈', '已与他是一对，安心亲近', '把心事收起来了，温和而有分寸']
};
const HEART_OPEN = {
  su: ['大半夜的不睡，找师姐谈心？行，坐。', '又睡不着？坐吧，师姐陪你说会儿话。', '……是你啊。坐。我正好也没睡。', '来了？我就猜你今晚要来。——谁等你了，我是在擦剑。', '云澈？……进来吧，门没闩。给你留着灯呢。', '还知道来？茶都给你晾好了。过来坐。', '是师弟啊。坐。师姐这儿的茶，什么时候都有你一杯。'],
  bai: ['云少侠？……是哪里不舒服吗。请坐，我看看。', '云少侠？……是睡不着吗。我正好在晾药，你坐。', '云少侠来了。……我多沏了一盏茶，正愁没人喝。', '我听见脚步声，就知道是你。……坐吧，药炉边暖和。', '云澈。……我在等你。药凉了可以再热，话凉了就不好说了。', '你来了。……坐到我身边来，今晚不晾药，只陪你。', '云少侠。请坐。……茶是新沏的，不苦。']
};
const HEART_BYE = {
  su: ['行了，睡吧。明早赖床的人背行李。', '回去睡吧。明早我叫你，别赖床。', '……不早了，回去吧。夜里凉，把门带上。', '回去睡吧。……明天，你还走我左边。', '……行了，回去睡吧。明天还要赶路。——云澈，谢了。', '去睡吧。……明早我想喝你煮的粥。', '去吧，早点睡。——师弟，往后好好的。'],
  bai: ['夜深了，云少侠早些歇息。药记得按时吃。', '夜深了，早些歇息吧。明天，我还在。', '夜深了。……明早的药，我给你多放一钱甘草。', '早些歇息。……明天赶路，你走慢些，我跟得上。', '……夜深了。云澈，早些歇息。明天，我还在。', '去睡吧。……明早我叫你，药和粥都在灶上。', '夜深了，云少侠早些歇息。……保重。']
};
// 没开 AI 时说的话：每一档各有几段，轮着来
const HEART = {
  su: [
    // 0 同行之谊
    [[['su', '师弟，你说师父年轻的时候，是不是也像你这么闷？'], ['hero', '师父说他年轻时话很多。'], ['su', '骗人。话多的人，教不出你这种闷葫芦。……不过闷也有闷的好处，起码不会像我一样，说完就后悔。']],
     [['su', '师弟，你包袱里那两个馒头，是不是又留着当明天的干粮？'], ['hero', '……师姐怎么知道。'], ['su', '你那点心思，我闭着眼都猜得到。拿来，分我一个。——下山头一条规矩：师姐饿了，师弟让粮。']]],
    // 1 渐渐熟络
    [[['su', '喂，你老实说。我的剑是不是太急了？'], ['hero', '急。可每回最险的时候，都是这把急剑先到。'], ['su', '……哼。算你会说话。']],
     [['su', '臭小子，今天的伤上药了没有？'], ['hero', '上了。'], ['su', '骗人，药瓶还是满的。坐好——别躲，师姐上药是疼了点，可好得快。']]],
    // 2 暗生在意
    [[['su', '我小时候爬树掏鸟窝，我娘举着锅铲追了我半条街。'], ['hero', '后来呢？'], ['su', '后来她把鸟窝原样放回去了，还垫了一把棉花。——我这脾气，大概是随她。']],
     [['su', '喂，你今天出剑的时候，往我这边偏了半步。'], ['hero', '那一刀是冲着师姐去的。'], ['su', '我躲得开！……下回别这样。你要是挨了刀，我、我回去怎么跟师父交代。']]],
    // 3 心有所属
    [[['su', '等这些事了了，我想学着酿酒。听雨阁的雨水好，酿出来一定不差。'], ['hero', '师姐酿的酒，我头一个喝。'], ['su', '想得美。头一坛要先敬我娘，第二坛敬师父。第三坛……再说。']],
     [['su', '师弟。……算了，没事。'], ['hero', '师姐想说什么？'], ['su', '我想说，你走路老走在我左边，是因为我左肩受过伤吧。别以为我没看出来。……谢了。就说这一回。']]],
    // 4 心照不宣
    [[['su', '今晚的月亮倒是圆。'], ['hero', '师姐从前不看月亮的。'], ['su', '从前没人陪着看。……云澈，等这一路走完，你打算去哪儿？'], ['hero', '师姐去哪儿，我去哪儿。'], ['su', '……傻子。这种话，留着以后再说。我可记下了。']],
     [['su', '我方才做了个梦。梦见听雨阁下雨，你坐在檐下擦剑，我在旁边嫌你擦得慢。'], ['hero', '后来呢？'], ['su', '后来就醒了。醒了一看，你真在外头擦剑。……云澈，别擦了，陪我坐一会儿。']]],
    // 5 两心相许
    [[['su', '喂，臭小子。如今我该叫你什么？师弟？还是……'], ['hero', '师姐想叫什么都行。'], ['su', '那还叫臭小子。叫了十年，改不了口了。——过来，坐近点，又没有外人。']],
     [['su', '师父今天问我，头一坛酒什么时候开。'], ['hero', '师姐怎么说？'], ['su', '我说，等某人学会不把剑穗系错边的那天。……云澈，你可得快点学。']]],
    // 6 各自珍重
    [[['su', '别这么看我，师姐好得很。'], ['hero', '师姐……'], ['su', '白芷是个好姑娘。你要是敢让她受委屈，我头一个不饶你。——行了，喝你的茶。咱们还是师姐弟，这个谁也改不了。']]]
  ],
  bai: [
    // 0 同行之谊
    [[['bai', '云少侠，这么晚了……是伤口疼吗？'], ['hero', '没有，只是睡不着。'], ['bai', '睡不着也是症候。我给你包一撮酸枣仁，回去用温水送服。——诊金就不必了，同行一场。']],
     [['bai', '我在记今天的脉案。苏姑娘脉急，像她的剑；云少侠的脉最稳。'], ['hero', '稳是好事？'], ['bai', '是好事。带路的人脉稳，跟着的人才睡得踏实。……我是说，从医理上讲。']]],
    // 1 渐渐熟络
    [[['bai', '云少侠，你的手伸出来。……果然，虎口又裂了。'], ['hero', '小伤。'], ['bai', '小伤不治，就是大伤。别动，上药的时候会有点疼——我、我轻一点。']],
     [['bai', '师父常说，采药的人要认得回去的路。我从前只认得林子里的路。'], ['hero', '现在呢？'], ['bai', '现在……多认得了几条。有云少侠和苏姑娘走在前头，我不大怕迷路了。']]],
    // 2 暗生在意
    [[['bai', '我在想，等师父回来，我要不要把药庐挪到林子外面去。'], ['hero', '为什么？'], ['bai', '林子里太静了。从前不觉得。跟你们走了这一路，才知道……有人说话的地方，药都熬得快些。']],
     [['bai', '这盏茶……我多放了一味安神的。不是特意给你备的，是、是顺手。'], ['hero', '多谢。'], ['bai', '不、不用谢。你夜里总是最后一个睡，我……我看见过两回。']]],
    // 3 心有所属
    [[['bai', '林子里有一种萤火虫，只在没有瘴气的夏夜出来。师父说，它们是替草木点的灯。'], ['hero', '那等林子好了，就能看见了。'], ['bai', '嗯。到时候……到时候我带你去看。']],
     [['bai', '我今天把大家的脉都记了一遍。苏姑娘脉急，你——'], ['hero', '我怎么？'], ['bai', '你的脉很稳。只是……方才我凑近的时候，它忽然快了几下。大概是我诊错了。']]],
    // 4 心照不宣
    [[['bai', '……云澈。'], ['hero', '嗯？'], ['bai', '没什么。我只是想试试，这样叫你，顺不顺口。'], ['hero', '顺口吗？'], ['bai', '……比“云少侠”少一个字，省力些。往后没有旁人的时候，我就这样叫了。']],
     [['bai', '这味药叫当归。师父说，药名里藏着人的念想。'], ['hero', '那白芷呢？白芷是什么念想？'], ['bai', '白芷……祛风、止痛。不大好听，是不是？'], ['hero', '好听。'], ['bai', '……你这样说，我往后就不嫌它了。']]],
    // 5 两心相许
    [[['bai', '云澈，手给我。'], ['hero', '又要诊脉？'], ['bai', '不诊。就是……想牵一会儿。大夫也有不看病的时候。']],
     [['bai', '师父今天问，药庐门口要不要多摆一张凳子。'], ['hero', '你怎么答的？'], ['bai', '我说，已经摆了。……你若是哪天不来，我就拿它晒药。所以，你要常来。']]],
    // 6 各自珍重
    [[['bai', '云少侠不必觉得亏欠。'], ['hero', '白芷……'], ['bai', '药有君臣佐使，人也各有各的位置。苏姑娘与你，是极好的一对。——我仍是你们的大夫，受了伤，照旧来找我。']]]
  ]
};
async function heartTalk() {
  const ids = ['su', 'bai'].filter(k => S.party.some(m => m.id === k)); if (!ids.length) return;
  const c = await choose('想找谁说说话？', ids.map(k => CHARS[k].name).concat(['算了'])); if (c >= ids.length) return;
  const id = ids[c], F = S.flags, key = 'ht_' + id + '_' + S.chapter, first = !F[key];
  if (typeof AI !== 'undefined' && AI.canTalk(id)) await AI.talk(id);
  else {
    const t = heartTier(id), L = HEART[id][t], i = (F['hti_' + id] = ((F['hti_' + id] || 0) + 1)) % L.length;
    await talk(L[i].concat([[id, HEART_BYE[id][t]]]));
  }
  if (first) { F[key] = 1; if ((F['htn_' + id] || 0) < 3) { F['htn_' + id] = (F['htn_' + id] || 0) + 1; bondAdd(id, 1); } }
}

/* ============ 当铺收东西；广场上的两位街坊 ============ */
// 当铺：用不上的兵刃、护具、饰物、药都可以拿来换钱（按原价五成收；身上穿戴着的和要紧的物件不在此列）
async function pawnDeal() {
  if (G.autoSkip) return;
  const c = await choose('', ['典当用不上的东西', '告辞']);
  if (c === 0) await UI.shop('pawn', '当铺 · 典当', true);
}
MAPS.town.dayNight = true;   // 落霞镇有昼夜：夜里天光变暗，窗里的灯和街上的灯笼亮起来（见 world.js 的 isNight、g3scene.js 的 setNight）
(() => {
  // 广场上站着的两位街坊：可以搭话，顺口指一指城里的去处
  NPCS.sq_auntie = { name: '卖炊饼的大婶', look: { robe: '#b0705a', trim: '#f4e4d0', sash: '#6a3a2e', hair: '#2a2420', hs: 'bun', wp: 'none', f: 1 } };
  NPCS.sq_elder = { name: '晒太阳的老伯', look: { robe: '#7a7a6a', trim: '#d8d8c8', sash: '#4a4a3e', hair: '#d8d8dc', hs: 'bun', beard: 1, wp: 'staff', sz: 0.96 } };
  MAPS.town.npcs.push(
    { who: 'sq_auntie', x: 35, y: 30, talk: 'chat', lines: [
      '炊饼——刚出炉的炊饼！少侠来一个？……哎，今儿的卖完了，明儿请早。',
      '要买兵刃、买药？顺着这条街往北，过了牌坊往西拐，铁匠铺和药铺挨着。',
      '身上有用不上的旧兵器、旧衣甲，拿去北大街最西头的当铺，钱朝奉给现钱。价是压得低了些，总比烂在包袱里强。',
      '往东隔两个门脸就是醉仙楼，再过去是钱庄。往西是悦来客栈和长风镖局。这城里的路，我闭着眼都认得。'] },
    { who: 'sq_elder', x: 40, y: 31, face: -1, talk: 'chat', lines: [
      '这把老骨头，就指着晌午这点太阳了。',
      '年轻人，走路别那么急。这城里的事，急也急不来。',
      '北门外是雪岭，南门外是竹林；东西两面当中的大门，一头去渡口，一头上青岚山道。老汉在这儿坐了四十年，没见谁走错过——除了喝醉的。',
      '两旁的四座小门各通一处城郊：西北演武门上摩云岭，西南栖霞门去稻香村，东北观澜门去藕花村，东南朝阳门外是芸婆婆的撷芳园。',
      '城隍庙在南大街，签灵不灵老汉不敢说，庙祝的茶倒是好茶。'] });
})();

/* ============ 落霞镇四郊：稻香村、藕花村、摩云岭、撷芳园 ============
   东西各三座城门，当中的青岚门、烟雨门照旧通主线；两旁的四座各通一处城郊，每处一桩支线：
     栖霞门（西南）→ 稻香村：茅舍、麦田、油菜地、水田。「会走路的稻草人」——查看三个稻草人，找到藏在谷仓的阿苗，赶走挖仓的贼
     观澜门（东北）→ 藕花村：茅舍、吊脚楼、两口大荷塘。「藕塘水鬼」——问过阿菱，上塘心亭拿下装神弄鬼的水寨逃卒，处置塘底的赈银
     演武门（西北）→ 摩云岭：整张图是一座大山，山路盘上去，深涧和崖外是云海，草木很少。「崖上三问」——读三处崖刻，答岭顶老人三问，再接他一剑
     朝阳门（东南）→ 撷芳园：花圃、花间小径、荷池、花架，树很少，没有对手。「百花酿」——替芸婆婆摘三朵奇花，最后那一盏酒给谁喝
   两个村子和园子里没有随机遭遇；摩云岭有（苍狼、岩甲蜥、岚灵）。
   地图上用到的新写法（world.js 的 buildMap / g3scene.js）：trees 另用一套草木；massif 整张图先是山；dells 山坳；lotus 荷塘；bloom 花海；
   props 里的 crop:* 庄稼、flower:* 花丛、scarecrow / haystack / well / trellis / rockery；liquid: 'cloud' 云海。 */
const GATE_BUSY = () => (S.flags.delivered ? '听雨阁出事了——先赶回青岚山！' : '师命在身，先把信送到镖局吧。');
// 城郊支线里那几场架标了 follow：对手至少跟到队伍的等级（core.js 的 foeLevels），什么时候来都不至于一边倒
(() => {
  // 一块地：x0..x1 × y0..y1 的每一格种上 kind；skip(x, y) 为真的格子留作田埂
  const plot = (out, x0, y0, x1, y1, s, skip) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (!skip || !skip(x, y)) out.push({ x, y, s }); return out; };
  const FL = ['peony', 'rose', 'mum', 'white', 'violet', 'blue', 'peach', 'orange'];
  // 稻香村的田：村中的大田当中是十字田埂，西半边麦子、东半边水稻；西面是油菜地，屋后是菜畦。
  // （田不能贴着地图四边的林子：整天在树影里，水田看上去就是一块黑）
  const fields = [];
  plot(fields, 22, 19, 27, 25, 'crop:wheat', (x, y) => y === 22);
  plot(fields, 29, 19, 34, 25, 'crop:rice', (x, y) => y === 22);
  plot(fields, 11, 19, 18, 25, 'crop:rape', (x, y) => x === 15 || y === 22);
  plot(fields, 33, 5, 38, 7, 'crop:veg');
  // 撷芳园：环池的石板路之外，全是一格宽的花间小径（lanes），小径之间是成片的花圃，一畦一色
  const laneSet = new Set(), lk = (x, y) => x + '_' + y, lanes = [];
  const lane = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (!laneSet.has(lk(x, y))) { laneSet.add(lk(x, y)); lanes.push([x, y, GR.PATH]); } };
  lane(6, 5, 33, 5); lane(6, 26, 33, 26); lane(6, 5, 6, 26); lane(33, 5, 33, 26);         // 外圈
  lane(20, 4, 20, 9); lane(20, 22, 20, 27);                                               // 南北向：北头通到亭子
  lane(7, 8, 19, 8); lane(21, 8, 32, 8); lane(7, 23, 19, 23); lane(21, 23, 32, 23);       // 横向
  lane(10, 6, 10, 14); lane(10, 17, 10, 25); lane(29, 6, 29, 14); lane(29, 17, 29, 25);   // 纵向
  const BEDC = [['white', 'peach', 'mum', 'violet'], ['peony', 'rose', 'blue', 'orange'], ['mum', 'violet', 'peony', 'white'], ['blue', 'orange', 'rose', 'peach']];
  const beds = [];
  for (let y = 6; y <= 25; y++) for (let x = 7; x <= 32; x++) {
    if (laneSet.has(lk(x, y)) || y === 15 || y === 16 || (x >= 14 && x <= 26 && y >= 10 && y <= 21)) continue;   // 小径、东西向的大路、环池的那一圈不种
    beds.push({ x, y, s: 'flower:' + BEDC[y < 8 ? 0 : y < 15 ? 1 : y < 23 ? 2 : 3][x < 10 ? 0 : x < 20 ? 1 : x < 29 ? 2 : 3] });
  }
  for (let i = 0; i < 4; i++) beds.push({ x: 35 + i % 2 * 2, y: 20 + Math.floor(i / 2) * 2, s: 'flower:' + FL[(i * 3 + 1) % FL.length] });
  Object.assign(MAPS, {
    daoxiang: {
      name: '稻香村', sub: '落霞镇西郊 · 秋收时节', theme: 'town', road: 'dirt', w: 46, h: 34, seed: 211, dense: 0.03, scen: false, rimH: 5,
      trees: ['treeA', 'treeG', 'treeA', 'treeR', 'treeG'],
      lakes: [[6, 10, 3.2, 2.4]],
      clear: [[10, 18, 27, 9, 0], [22, 11, 10, 4, 0], [3, 14, 7, 2, 0], [38, 27, 5, 3, 0], [21, 29, 15, 3, 0]],
      paths: [[[45, 16], [8, 16]], [[30, 16], [30, 9], [14, 9]], [[20, 16], [20, 27], [36, 27], [36, 14]], [[8, 16], [8, 26]]],
      builds: [{ x: 15, y: 5, w: 4, h: 3, s: 'hut', s2: 'house1' }, { x: 21, y: 5, w: 4, h: 3, s: 'hut2', s2: 'house1' }, { x: 27, y: 5, w: 4, h: 3, s: 'hut', s2: 'house1' },
        { x: 34, y: 10, w: 5, h: 3, s: 'hut2', s2: 'house1' }, { x: 10, y: 11, w: 4, h: 3, s: 'hut', s2: 'house1' }, { x: 39, y: 21, w: 4, h: 3, s: 'hut2', s2: 'house1' },
        { x: 41, y: 15, w: 1, h: 4, s: 'paifang', pass: true, sign: '稻香村', s2: '' }],
      props: fields.concat([
        { x: 24, y: 20, s: 'scarecrow' }, { x: 17, y: 24, s: 'scarecrow' }, { x: 36, y: 6, s: 'scarecrow:red' }, { x: 24, y: 30, s: 'haystack' }, { x: 27, y: 30, s: 'haystack', sc: 0.85 }, { x: 32, y: 30, s: 'haystack', sc: 0.9 },
        { x: 15, y: 13, s: 'haystack' }, { x: 16, y: 13, s: 'haystack', sc: 0.8 }, { x: 38, y: 21, s: 'haystack' }, { x: 38, y: 22, s: 'haystack', sc: 0.85 }, { x: 43, y: 24, s: 'haystack' }, { x: 20, y: 6, s: 'haystack', sc: 0.8 }, { x: 26, y: 6, s: 'haystack', sc: 0.9 },
        { x: 25, y: 12, s: 'well' }, { x: 29, y: 12, s: 'treeG', sc: 1.5 }, { x: 23, y: 13, s: 'c:hay' }, { x: 12, y: 15, s: 'treeA', sc: 1.2 }, { x: 33, y: 14, s: 'treeR', sc: 1.2 }]),
      exits: [{ x: 45, y: 16, w: 1, h: 2, to: 'town', tx: 2, ty: 45 }],
      npcs: [
        { who: 'dx_elder', x: 35, y: 13, talk: 'dx_elder', mark: s => s.flags.ch1 && (!s.flags.q_scare || s.flags.q_scare === 2) },
        { who: 'dx_wife', x: 23, y: 8, talk: 'chat', lines: ['趁着日头好，把谷子摊开晒透了才好进仓。少侠当心脚下，莫踩了我的谷。', '村东头那座谷仓是全村的口粮。往年夜里有人轮着守，今年……唉，谁还敢去。', '田老爹家在村子东头，门口有棵红叶树的那间就是。'] },
        { who: 'dx_farmer', x: 19, y: 22, talk: 'dx_farmer', face: -1 },
        { who: 'dx_kid', x: 27, y: 13, talk: 'dx_kid' },
        { sprite: 'scarecrow', x: 25, y: 22, talk: 'scarecrow', k: 1, name: '麦田里的稻草人', show: s => s.flags.q_scare === 1 && !s.flags.sc1 },
        { sprite: 'scarecrow', x: 15, y: 22, talk: 'scarecrow', k: 2, name: '油菜地里的稻草人', show: s => s.flags.q_scare === 1 && !s.flags.sc2 },
        { sprite: 'scarecrow', x: 32, y: 22, talk: 'scarecrow', k: 3, name: '水田里的稻草人', show: s => s.flags.q_scare === 1 && !s.flags.sc3 },
        { who: 'dx_miao', x: 40, y: 24, talk: 'dx_miao', show: s => (s.flags.q_scare === 1 && s.flags.scare_clue) || s.flags.q_scare === 2, mark: s => s.flags.q_scare === 1 && !s.flags.scare_met },
        { who: 'dx_miao', x: 34, y: 14, talk: 'dx_miao', show: s => s.flags.q_scare === 3 },
        chestNpc('dx1', 4, 14, [['gold', 260], ['potion1', 3]]),
        chestNpc('dx2', 41, 28, [['mp1', 3], ['ac1', 1]])
      ],
      fixed: [{ x: 37, y: 25, group: ['ratboss', 'bandit', 'archer'], boss: true, follow: 1, show: s => s.flags.q_scare === 1 && s.flags.scare_met, pre: 'rat_pre', post: 'rat_post' }]
    },
    ouhua: {
      name: '藕花村', sub: '落霞镇东郊 · 十里荷塘', theme: 'bamboo', road: 'plank', w: 46, h: 34, seed: 223, dense: 0.05, scen: false, rimH: 4, lotus: 0.62,
      trees: ['treeG', 'treeD', 'bamboo', 'treeD', 'treeG'],
      lakes: [[24, 9.5, 9, 4.6], [30, 26, 8, 4.2], [5, 28, 3, 2.2]],
      clear: [[21, 7, 8, 5, 0]],
      paths: [[[0, 16], [14, 16], [14, 18], [40, 18]], [[24, 18], [24, 12]], [[30, 18], [30, 31], [36, 31]], [[36, 18], [36, 16]], [[8, 16], [8, 14]], [[9, 17], [9, 23]]],
      builds: [{ x: 6, y: 10, w: 4, h: 3, s: 'stilt', s2: 'house1' }, { x: 34, y: 13, w: 4, h: 3, s: 'hut', s2: 'house1' }, { x: 39, y: 13, w: 4, h: 3, s: 'hut2', s2: 'house1' },
        { x: 4, y: 20, w: 4, h: 3, s: 'hut2', s2: 'house1' }, { x: 22, y: 7, w: 2, h: 2, s: 'pavilion', s2: '' }, { x: 3, y: 15, w: 1, h: 4, s: 'paifang', pass: true, sign: '藕花村', s2: '' }],
      props: [{ x: 17, y: 9, s: 'boat' }, { x: 31, y: 11, s: 'boat' }, { x: 35, y: 26, s: 'boat' }, { x: 25, y: 28, s: 'boat' },
        { x: 23, y: 17, s: 'lantern' }, { x: 26, y: 17, s: 'lantern' }, { x: 29, y: 20, s: 'lantern' }, { x: 32, y: 20, s: 'lantern' },
        { x: 33, y: 16, s: 'c:jar' }, { x: 43, y: 16, s: 'c:barrel' }, { x: 11, y: 13, s: 'c:crate' }, { x: 12, y: 15, s: 'treeG', sc: 1.4 }, { x: 40, y: 21, s: 'treeD', sc: 1.3 }],
      exits: [{ x: 0, y: 16, w: 1, h: 2, to: 'town', tx: 73, ty: 17 }],
      npcs: [
        { who: 'oh_elder', x: 35, y: 16, talk: 'oh_elder', mark: s => s.flags.bambooDone && (!s.flags.q_ghost || s.flags.q_ghost === 2) },
        { who: 'oh_ling', x: 17, y: 17, talk: 'oh_ling', mark: s => s.flags.q_ghost === 1 && !s.flags.ghost_clue },
        { who: 'oh_fisher', x: 8, y: 13, talk: 'oh_fisher' },
        { who: 'oh_aunt', x: 41, y: 16, talk: 'chat', face: -1, lines: ['莲蓬要趁青的剥，老了就苦。少侠尝一颗？', '塘心那座亭子，从前是村里人歇晌的地方。如今……唉，没人敢上去了。', '阿菱那丫头，水性比后生们都好。她爹伤了腿，家里全靠她一个人撑船。'] },
        springNpc(11, 21),
        chestNpc('oh1', 38, 31, [['potion2', 3], ['gold', 500]]),
        chestNpc('oh2', 27, 8, [['mp1', 3], ['antidote', 3]])
      ],
      fixed: [{ x: 25, y: 10, group: ['shuigui', 'pirate', 'pirate'], boss: true, follow: 1, show: s => s.flags.q_ghost === 1 && s.flags.ghost_clue, pre: 'ghost_pre', post: 'ghost_post' }]
    },
    moyun: {
      name: '摩云岭', sub: '落霞镇西北 · 云在脚下', theme: 'mist', road: 'gravel', w: 44, h: 40, seed: 229, dense: 0.15, scen: false, massif: true, hillH: 7.5, rimH: 12, rim: { n: 'water' },
      clouds: { sea: 34, drift: 6 },   // 云海上一朵朵飘着的云 34 朵，山间飘过的薄云 6 片（见 g3scene.js 的 cloudsBuild）
      liquid: { liquid: 'cloud', water: '#aab4c0', water2: '#f4f8fc', shore: '#6e746e' },
      trees: ['rock', 'rockM', 'treeD', 'rock', 'pineS', 'rockM'],
      lakes: [[17, 0.5, 11, 2.8], [19, 21, 2.3, 5.5], [40, 9, 3.2, 7]],
      dells: [[8, 33.5, 5, 2.8], [36, 27, 3.5, 2.6], [31, 9.5, 3, 2.4]],
      clear: [[11, 4, 12, 5, GR.STONE]],
      paths: [[[43, 34], [30, 34], [30, 28], [12, 28]], [[12, 28], [12, 20], [26, 20]], [[26, 20], [26, 13], [36, 13]], [[36, 13], [36, 6], [22, 6]], [[12, 26], [10, 26], [10, 33]], [[31, 28], [34, 28]]],
      builds: [{ x: 4, y: 30, w: 4, h: 3, s: 'hut', s2: 'house1' }, { x: 19, y: 4, w: 2, h: 2, s: 'pavilion', s2: '' }, { x: 32, y: 9, w: 2, h: 2, s: 'pavilion', s2: '' },
        { x: 39, y: 33, w: 1, h: 4, s: 'paifang', pass: true, sign: '摩云岭', s2: '' }],
      props: [{ x: 11, y: 8, s: 'lantern' }, { x: 22, y: 8, s: 'lantern' }, { x: 12, y: 4, s: 'pineS', sc: 1.3 }, { x: 14, y: 4, s: 'rockM', sc: 1.2 }, { x: 22, y: 4, s: 'rock', sc: 1.1 },
        { x: 16, y: 19, s: 'lantern' }, { x: 22, y: 19, s: 'lantern' }, { x: 9, y: 31, s: 'c:wood' }, { x: 3, y: 33, s: 'c:hay' }],
      exits: [{ x: 43, y: 34, w: 1, h: 2, to: 'town', tx: 2, ty: 17 }],
      npcs: [
        { who: 'my_hunter', x: 6, y: 33, talk: 'my_hunter', mark: s => s.flags.ferryDone && !s.flags.q_peak },
        { sprite: 'carving', x: 22, y: 27, talk: 'carving', k: 1, name: '崖刻' },
        { sprite: 'carving', x: 28, y: 16, talk: 'carving', k: 2, name: '崖刻' },
        { sprite: 'carving', x: 30, y: 5, talk: 'carving', k: 3, name: '崖刻' },
        { who: 'my_hermit', x: 16, y: 5, talk: 'my_hermit', show: s => !(s.flags.q_peak === 1 && s.flags.peak_pass), mark: s => s.flags.q_peak === 1 || s.flags.q_peak === 2 },
        springNpc(36, 27),
        chestNpc('my1', 12, 35, [['potion2', 3], ['gold', 700]]),
        chestNpc('my2', 30, 10, [['revive', 1], ['mp2', 2]])
      ],
      fixed: [{ x: 16, y: 6, group: ['yashang'], boss: true, follow: 1, show: s => s.flags.q_peak === 1 && s.flags.peak_pass, pre: 'peak_pre', post: 'peak_post' }],
      foes: { n: 6, groups: [['shanlang', 'shanlang'], ['yanxi', 'shanlang'], ['lanling', 'lanling'], ['yanxi', 'lanling'], ['shanlang', 'shanlang', 'lanling']] }
    },
    garden: {
      name: '撷芳园', sub: '落霞镇东南 · 四时花开', theme: 'mountain', road: 'slabFine', w: 40, h: 32, seed: 233, dense: 0.015, scen: false, rimH: 4, lotus: 0.5,
      trees: ['treeP', 'treeP', 'treeG', 'treeP'],
      bloom: { p: 0.72, n: 3, cols: ['#ff8ab8', '#ffe46a', '#ffffff', '#c09aff', '#ff9a8a', '#8ab8ff'] },
      lakes: [[20.5, 15.5, 3.6, 2.8]],
      clear: [[33, 17, 5, 3, 0], [3, 13, 3, 6, 0]],
      paths: [[[0, 15], [14, 15]], [[14, 10], [25, 10], [25, 20], [14, 20], [14, 10]], [[25, 15], [36, 15]]],
      cells: lanes,
      builds: [{ x: 34, y: 11, w: 4, h: 3, s: 'hut2', s2: 'house1' }, { x: 19, y: 2, w: 2, h: 2, s: 'pavilion', s2: '' }, { x: 4, y: 14, w: 1, h: 4, s: 'paifang', pass: true, sign: '撷芳园', s2: '' }],
      props: beds.concat([
        { x: 3, y: 14, s: 'trellis:violet' }, { x: 3, y: 17, s: 'trellis:violet' }, { x: 5, y: 14, s: 'trellis:peach' }, { x: 5, y: 17, s: 'trellis:peach' },
        { x: 16, y: 12, s: 'rockery' }, { x: 24, y: 19, s: 'rockery', sc: 0.85 }, { x: 16, y: 19, s: 'flower:white' }, { x: 24, y: 12, s: 'flower:peony' },
        { x: 8, y: 12, s: 'treeP', sc: 1.15 }, { x: 31, y: 12, s: 'treeP', sc: 1.1 }, { x: 8, y: 20, s: 'treeP', sc: 1.1 }, { x: 31, y: 20, s: 'treeG', sc: 1.15 },
        { x: 16, y: 6, s: 'treeP', sc: 1.1 }, { x: 24, y: 6, s: 'treeG', sc: 1.1 }, { x: 16, y: 25, s: 'treeG', sc: 1.1 }, { x: 24, y: 25, s: 'treeP', sc: 1.15 },
        { x: 34, y: 18, s: 'well' }, { x: 33, y: 14, s: 'c:pot' }, { x: 38, y: 14, s: 'c:pot' }]),
      exits: [{ x: 0, y: 15, w: 1, h: 2, to: 'town', tx: 73, ty: 45 }],
      npcs: [
        { who: 'gd_yun', x: 35, y: 14, talk: 'gd_yun', mark: s => s.flags.ch1 && (!s.flags.q_brew || s.flags.q_brew === 2) },
        { who: 'gd_boy', x: 22, y: 12, talk: 'gd_boy' },
        { who: 'gd_guest', x: 17, y: 19, talk: 'chat', lines: ['“乱花渐欲迷人眼”……好句，好句。可惜是古人的。', '芸婆婆的百花酿，一年只酿一坛，从来不卖。在下来了三年，一口也没讨到。', '兄台也是来赏花的？腰里还挂着剑——煞风景，煞风景。'] },
        { sprite: 'bloom', x: 11, y: 12, talk: 'bloom_pick', item: 'hua1', col: '#ff8ab8', name: '晓妆', show: s => s.flags.q_brew === 1 && !s.items.hua1 },
        { sprite: 'bloom', x: 28, y: 19, talk: 'bloom_pick', item: 'hua2', col: '#f4f6ff', name: '夜光白', show: s => s.flags.q_brew === 1 && !s.items.hua2 },
        { sprite: 'bloom', x: 21, y: 6, talk: 'bloom_pick', item: 'hua3', col: '#b070f0', name: '紫霞', show: s => s.flags.q_brew === 1 && !s.items.hua3 },
        springNpc(22, 19),
        chestNpc('gd1', 36, 18, [['mp1', 3], ['gold', 300]])
      ]
    }
  });
  Object.assign(MAPLV, { moyun: 11 }); MAPS.moyun.lv = MAPLV.moyun;
})();

QUESTS.push(
  { id: 'q_scare', name: '会走路的稻草人', who: '田老爹', where: '落霞镇栖霞门（西南）外 → 稻香村', open: s => s.flags.ch1,
    text: [() => (S.flags.scare_met ? '夜里挖谷仓的是一伙叫“粮耗子”的贼，就在谷仓外的田埂上。把他们赶走。' : S.flags.scare_clue ? '三个稻草人脚下的小脚印，都通向村东头的谷仓。去谷仓看看。'
      : '稻香村的稻草人夜里会自己挪地方，谷仓的谷子一夜少一斗。去田里把三个稻草人挨个看一看。（已看 ' + [1, 2, 3].filter(k => S.flags['sc' + k]).length + ' / 3）'), '挖谷仓的贼已经拿下，回去告诉田老爹。'] },
  { id: 'q_ghost', name: '藕塘水鬼', who: '老藕翁', where: '落霞镇观澜门（东北）外 → 藕花村 · 塘心亭', open: s => s.flags.bambooDone,
    text: [() => (S.flags.ghost_clue ? '“水鬼”是含着芦管换气的人，白天躲在塘心亭。从栈桥走上去，把他们揪出来。' : '藕花村的荷塘闹水鬼，没人敢下塘。阿菱夜里去看过，先去塘南边的路上问问她。'), '“水鬼”已经拿下，塘底的赈银也捞了上来。回去告诉老藕翁。'] },
  { id: 'q_peak', name: '崖上三问', who: '老猎户', where: '落霞镇演武门（西北）外 → 摩云岭 · 岭顶', open: s => s.flags.ferryDone,
    text: [() => (S.flags.peak_pass ? '三问都答上了。岭顶的老人拔了剑——接他一剑。' : '摩云岭顶的老人对带兵器上山的人有三问，答案刻在上山路边的三块石头上。读过崖刻，再上岭顶见他。（已读 ' + [1, 2, 3].filter(k => S.flags['cv' + k]).length + ' / 3）'), '接下了崖上客的剑。再同他说几句话。'] },
  { id: 'q_brew', name: '百花酿', who: '芸婆婆', where: '落霞镇朝阳门（东南）外 → 撷芳园', open: s => s.flags.ch1,
    text: [() => '芸婆婆眼睛不好，托你替她摘园子里的三朵奇花：晓妆、夜光白、紫霞。花会发亮，走近了就看得见。（已得 ' + ['hua1', 'hua2', 'hua3'].filter(k => S.items[k] > 0).length + ' / 3）', '三朵花都齐了，回去交给芸婆婆。'] }
);

// 剧本里夹着同伴的话：谁不在队里，谁的那一句就略过
const withParty = lines => lines.filter(l => !l[0] || !CHARS[l[0]] || l[0] === 'hero' || S.party.some(m => m.id === l[0]));
Object.assign(SCRIPTS, {
  /* ---------- 稻香村 · 会走路的稻草人 ---------- */
  async dx_elder() {
    if (await sideQuest('q_scare')) return;
    const F = S.flags;
    if (F.q_scare === 1) { await say('dx_elder', F.scare_met ? '挖墙的贼就在谷仓外头的田埂上晃。少侠千万当心。' : F.scare_clue ? '脚印往村东的谷仓去了？……那谷仓夜里没人守。少侠快去看看。' : '田里一共三个稻草人：麦田当中一个，油菜地当中一个，东边水田当中一个。少侠挨个看看。'); return; }
    await say('dx_elder', F.q_scare === 3 ? '阿苗这孩子手脚勤快，如今全村的稻草人都归她扎。扎得比老汉还精神。' : '稻香村没什么好东西，就是米香。少侠歇歇脚，喝碗新米粥再走。');
  },
  async q_scare_offer() {
    await talk(withParty([
      ['dx_elder', '少侠是带剑的人，胆子想必大。老汉有桩怪事，说出来怕你笑话。'],
      ['dx_elder', '村里的稻草人——夜里会走路。'],
      ['hero', '走路？'],
      ['dx_elder', '头天傍晚还插在麦田当中，第二天一早，就站到谷仓门口的路上去了。扛回去，隔一夜又挪了地方。一连五六天了。'],
      ['dx_elder', '更邪的是，谷仓里的谷子一夜少一斗。村里人都说稻草人成了精，夜里出来偷粮吃。如今天一擦黑，家家关门，没人敢去守仓。'],
      ['su', '稻草人吃谷子？它连嘴都是画上去的。'],
      ['dx_elder', '老汉也不信邪，可老汉这腿脚，追不动了。少侠若肯帮忙，去田里把那三个稻草人挨个看一看——到底是什么东西在作怪。']
    ]));
  },
  async dx_farmer() {
    const F = S.flags;
    await say('dx_farmer', F.q_scare === 3 ? '那三个后生？割稻子比我还快。早干什么去了。' : F.q_scare ? '稻草人是我亲手插的，插得有一尺深。风吹不倒——除非有人拔。' : '今年的麦子好。再有三个晴天，就能开镰了。');
  },
  async dx_kid() {
    const F = S.flags;
    await say('dx_kid', F.q_scare === 3 ? '阿苗力气可大了！她一个人能扛起一个稻草人，我两只手都抱不动。' : F.q_scare ? '我不怕稻草人！……就是天黑以后有一点点怕。' : '大哥哥，你的剑是真的吗？能不能借我砍一下草？');
  },
  async scarecrow(n) {
    const F = S.flags, k = (n && n.def && n.def.k) || 1;
    if (F.q_scare !== 1 || F['sc' + k]) { await say(null, '一个扎得很结实的稻草人，斗笠压得很低。'); return; }
    Sfx.play('chest');
    if (k === 1) await talk(withParty([[null, '稻草人脚下的泥是新翻的——它被人拔起来又插回去过，不止一回。'], [null, '泥里有一串脚印，很浅，只有巴掌大。'], ['hero', '是孩子的脚。']]));
    else if (k === 2) await talk(withParty([[null, '破褂子的怀里鼓鼓囊囊的。伸手一掏，是半个啃过的冷窝头，用干荷叶仔细包着。'], ['su', '稻草人可不会给自己藏干粮。'], ['hero', '有人把它当成了柜子。']]));
    else { await talk(withParty([[null, '斗笠底下压着一张纸，是炭条画的：两个大人，牵着一个扎小髻的孩子。三个人都画着笑脸。'], [null, '纸的背面，歪歪扭扭写着两个字：等我。']])); give('huagao', 1); }
    F['sc' + k] = 1;
    if (F.sc1 && F.sc2 && F.sc3) { F.scare_clue = 1; await say(null, '三处的小脚印，都朝着同一个方向——村东头的谷仓。'); toast('去村东头的谷仓看看'); }
    World.refresh(); G.save();
  },
  async dx_miao() {
    const F = S.flags;
    if (F.q_scare === 3) { await say('dx_miao', ['大哥哥！我会扎稻草人了。田老爹说，我扎的比他扎的还精神！', '我爹回来的时候，一进村口，就能看见我扎的稻草人。'][(F.miao_i = (F.miao_i || 0) + 1) % 2]); return; }
    if (F.q_scare === 2) { await say('dx_miao', '大哥哥好厉害！……田老爹会不会把我赶走？'); return; }
    if (F.scare_met) { await say('dx_miao', '他们就在外头……大哥哥，你真打得过三个大人？'); return; }
    await talk(withParty([
      [null, '谷仓边的草垛动了一下。一个瘦小的丫头钻出来，怀里死死抱着一只布口袋，转身就要跑。'],
      ['hero', '别跑。稻草人怀里的窝头，是你藏的？'],
      ['dx_miao', '……是我的。我没偷！那是我自己省下来的！'],
      ['hero', '那谷仓里的谷子呢？'],
      ['dx_miao', '我、我就拿了一点点……一天一把。可一夜少一斗的不是我！是那三个大人！'],
      ['dx_miao', '他们半夜来挖谷仓后头的墙，一口袋一口袋往外背。我打不过他们，就把稻草人扛到路当中——天黑，他们以为是守夜的人，就不敢过来了。'],
      ['su', '所以稻草人夜夜挪地方……是你一个人扛的？就你这小身板？'],
      ['dx_miao', '我扛得动！我爹是走镖的，我力气大！……我爹走镖去了，叫我在这儿等他。等了两个秋天了。'],
      [null, '她把那只口袋抱得更紧了。口袋里是一把一把攒下来的谷子，还不到半袋。']
    ]));
    const c = await choose('云澈——', ['把身上的干粮递给她', '「今晚他们还来吗？」']);
    if (c === 0) await talk([[null, '丫头盯着干粮看了很久，一把抓过去，背过身狼吞虎咽地吃了。'], ['dx_miao', '……我叫阿苗。他们今晚还来。领头的尖嘴猴腮，他们管他叫“钻仓鼠”。']]);
    else await say('dx_miao', '来。天天来。领头的尖嘴猴腮，他们管他叫“钻仓鼠”。……我叫阿苗。');
    await say('hero', '阿苗，今晚的稻草人，换我来当。');
    F.scare_met = 1; World.refresh(); toast('挖谷仓的贼出现在谷仓外的田埂上'); G.save();
  },
  async rat_pre() {
    await talk([
      ['ratboss', '咦？今晚的稻草人……怎么还带着剑？'],
      ['hero', '谷仓的墙，是你们挖的？'],
      ['ratboss', '是又怎样！黑风寨散了伙，弟兄们总得吃饭。这村里尽是些老弱，拿他们几斗谷子，是看得起他们！'],
      ['hero', '有个孩子，一天只敢拿一把。你们一夜背走一斗。'],
      ['ratboss', '少废话！弟兄们，把这稻草人给我拆了！']
    ]);
  },
  async rat_post() {
    await say('ratboss', '好汉饶命！谷子都在后山的窑洞里，一粒没敢卖……小的们也是饿怕了！');
    const c = await choose('怎么处置这伙人？', ['绑了，交给落霞镇的秦捕头', '「把谷子背回来，再替村里把这一季稻子收完。」']);
    S.flags.rat_pick = c;
    if (c === 0) await say(null, '三个贼被捆成一串。田老爹叫了两个后生，连夜押往落霞镇。');
    else await talk([['ratboss', '收、收稻子？……成！小的们从前也是种地的，镰刀比刀使得顺手。'], [null, '钻仓鼠愣了半晌，忽然蹲在田埂上，抱着头哭了。']]);
    S.flags.q_scare = 2; World.refresh(); toast('回去告诉田老爹');
  },
  async q_scare_done() {
    const F = S.flags;
    await talk([
      ['dx_elder', '真是人作的怪！老汉活了七十岁，倒叫一伙毛贼拿稻草人唬住了，惭愧，惭愧。'],
      ['dx_elder', F.rat_pick ? '那三个后生干活倒不惜力。老汉说了：收完这一季，愿意留下的，村东还有两亩荒地。' : '秦捕头捎了话来，说衙门有一份赏银，叫老汉转交少侠。'],
      ['hero', '田老爹，那个叫阿苗的孩子——'],
      ['dx_elder', '老汉都听说了。一天一把谷子，还替全村守了五六夜的仓……这哪是贼，这是咱稻香村的守仓人。'],
      ['dx_elder', '她爹的事，老汉托镖局打听过。那趟镖，两年前折在了青岚山道上。这话，老汉还没想好怎么同她讲。'],
      ['dx_elder', '往后她就住老汉家。村里别的没有，多添一双筷子的米，总是有的。'],
      [null, '田老爹从屋里取出一个新稻穗编的结，郑重地递了过来。']
    ]);
    if (S.items.huagao) delete S.items.huagao;
    give('acR', 1); give('gold', F.rat_pick ? 300 : 450); give('potion2', F.rat_pick ? 5 : 3); World.refresh();
  },

  /* ---------- 藕花村 · 藕塘水鬼 ---------- */
  async oh_elder() {
    if (await sideQuest('q_ghost')) return;
    const F = S.flags;
    if (F.q_ghost === 1) { await say('oh_elder', F.ghost_clue ? '是人扮的？！……塘心亭从栈桥就能走上去。少侠当心，那伙人水性极好。' : '阿菱就在塘南边的路上晒莲蓬。那丫头夜里去塘边看过，你们问问她。'); return; }
    await say('oh_elder', F.q_ghost === 3 ? '今年的藕格外粗。少侠再来，老汉给你们炖一锅藕汤。' : !F.bambooDone ? '后生，是来买藕的？今年的藕……唉，还在泥里，没人敢挖。' : '这口塘，养了藕花村十几代人。');
  },
  async q_ghost_offer() {
    await talk(withParty([
      ['oh_elder', '后生，天快黑了就莫往塘边去。这塘里……闹水鬼。'],
      ['hero', '水鬼？'],
      ['oh_elder', '上月起的事。夜里塘心亭那头有绿火，水面上咕嘟咕嘟冒泡，下的鱼篓第二天全是空的。阿菱她爹撑船去看，船叫什么东西从底下顶翻了。人捞上来，腿上五个青指印。'],
      ['oh_elder', '眼下正是采莲挖藕的时节，一村人就指着这口塘过冬。可如今，谁还敢下水？'],
      ['bai', '五个指印……水鬼的手，也分五指么？'],
      ['oh_elder', '这……老汉倒没想过。'],
      ['oh_elder', '阿菱那丫头胆子大，夜里偷偷去塘边看过。少侠若肯管这桩事，先去问问她——就在塘南边的路上晒莲蓬。']
    ]));
  },
  async oh_ling() {
    const F = S.flags;
    if (F.q_ghost === 1 && !F.ghost_clue) {
      await talk(withParty([
        ['oh_ling', '你们是来捉水鬼的？……我见过它。不是一只，是三只。'],
        ['oh_ling', '它们从水里冒头的时候，嘴里都叼着一截芦管。水鬼要是不用喘气，叼芦管做什么？'],
        ['hero', '是人。含着芦管，在水底下换气。'],
        ['oh_ling', '我也这么想！可我同村里人讲，没人信一个丫头的话。'],
        ['oh_ling', '还有，它们总围着塘心亭底下转，像是在水里捞什么东西。白天就躲在亭子后头的荷叶深处，叶子密，船进不去——可是从栈桥能走上亭子。'],
        ['su', '捞东西？这塘底下，还有宝贝不成。'],
        ['oh_ling', '我爹说，去年发大水那阵，有条官船在河口翻了。……我可什么都没说。']
      ]));
      F.ghost_clue = 1; World.refresh(); toast('“水鬼”白天躲在塘心亭'); G.save(); return;
    }
    await say('oh_ling', F.q_ghost === 3 ? '我就说是人吧！往后我说话，看谁还敢不信。……喏，刚剥的莲子，甜的。' : F.q_ghost === 2 ? '真的拿下了？！我、我去告诉我爹！' : F.q_ghost === 1 ? '栈桥就在前面，一直走就是塘心亭。你们……小心些。' : '莲蓬要晒三个日头才好收。客人是城里来的吧？');
  },
  async oh_fisher() {
    const F = S.flags;
    await say('oh_fisher', F.q_ghost === 3 ? '腿好了！明天就下塘。躺了一个月，骨头都要锈了。' : F.q_ghost ? '我这条腿就是叫它拽的。那手劲……说是鬼，倒更像个常年摇橹的。' : '船翻了，腿也伤了。这塘，我是不敢下了。');
  },
  async ghost_pre() {
    await talk(withParty([
      [null, '塘心亭的栏杆上搭着三件湿淋淋的水靠。亭柱上倚着一个精赤上身的汉子，正仰着脖子往嘴里灌酒。'],
      ['shuigui', '啧。绿火也点了，船也掀了，怎么还有不怕死的往这儿凑？'],
      ['hero', '装神弄鬼，掀翻渔船——就为了不让村里人下塘？'],
      ['shuigui', '小子眼不瞎。老子从前在沉舟坞吃饭。去年寨里劫了一条官船，船沉在河口，银子顺着水滚进了这口塘。寨主嫌晦气，不要了；老子可不嫌。'],
      ['bai', '官船上的银子……是赈灾的。'],
      ['shuigui', '到了水底下，就是没主的银子！再捞三天就齐了。你们几个——正好沉下去，给老子压箱底！']
    ]));
  },
  async ghost_post() {
    await talk(withParty([
      ['shuigui', '咳、咳咳……别打了！银子在亭子底下的石墩后头，拿网兜吊着……一共四十锭，都在……'],
      [null, '网兜拽上来，是一只生了青苔的官箱。箱里的银锭底上，都打着一个“赈”字。'],
      ['su', '四十锭。够一个村子吃三年了。']
    ]));
    give('chenyin', 1);
    const c = await choose('这箱银子——', ['交给落霞镇衙门，是谁的还给谁', '「这是下游的救命钱。请老藕翁做主，送去遭了灾的柳溪村。」']);
    S.flags.ghost_pick = c;
    await say('hero', c === 0 ? '银子送去衙门。人，也一并送去。' : '银子送去柳溪。人，送去衙门。');
    S.flags.q_ghost = 2; World.refresh(); toast('回去告诉老藕翁');
  },
  async q_ghost_done() {
    const F = S.flags;
    await talk([
      ['oh_elder', '是人？！……三个大活人，把一村子吓了一个月。老汉这张脸，没处搁了。'],
      ['oh_elder', F.ghost_pick ? '柳溪……那村子去年叫水冲了半边，郎中又让水匪掳了去。这银子本就是拨给他们的。老汉明日亲自撑船送去，一锭也不会少。' : '官银老汉明日就亲自押去落霞镇，交到秦捕头手上。该是谁的，一锭也不会少。'],
      ['oh_elder', '村里没有金银谢少侠。这枚佩是老汉拿塘里的老莲子磨的，戴着清心。再带几包莲子羹走——莫推辞，推辞就是嫌弃。']
    ]);
    if (S.items.chenyin) delete S.items.chenyin;
    give('acO', 1); give('gold', F.ghost_pick ? 500 : 800); give('potion2', F.ghost_pick ? 5 : 3); World.refresh();
  },

  /* ---------- 摩云岭 · 崖上三问 ---------- */
  async my_hunter() {
    const F = S.flags;
    if (!F.q_peak && await sideQuest('q_peak')) return;
    await say('my_hunter', F.q_peak === 3 ? '老头子昨天下到半山，同我喝了一碗酒。三十年，头一回。' : F.q_peak === 2 ? '你……你是自己走下来的？不是滚下来的？！' : F.q_peak === 1 ? '刻了字的石头一共三块，都在上山的路边。老头子的三问，答案就在石头上。' : '这岭上狼多。没有要紧事，莫往上走。');
  },
  async q_peak_offer() {
    await talk(withParty([
      ['my_hunter', '要上岭？路是有的，狼也是有的。还有一样，比狼难缠。'],
      ['my_hunter', '岭顶住着个白胡子老头，三十年没下过山。凡是带着兵器上去的，他都要问三句话。答不上来，一袖子扫下山；答上来了，还得再接他一剑。'],
      ['shi', '答不上来就动手？这规矩我熟。'],
      ['my_hunter', '我年轻时不服气，上去过七回。七回都是滚下来的。'],
      ['hero', '他问些什么？'],
      ['my_hunter', '回回一样，可我听不懂——什么“剑从哪里来”“剑往哪里去”。后来才咂摸出味儿来：上山的路边有三块刻了字的石头，是他自己刻的。答案就在石头上，可惜我不识字。'],
      ['my_hunter', '你们识字，替我上去瞧瞧。那老头……一个人在顶上，三十年了。']
    ]));
  },
  async carving(n) {
    const F = S.flags, k = (n && n.def && n.def.k) || 1;
    await talk([[null, ['石上刻着两行字，笔画里积着青苔：', '路转之处，一方大石朝南的一面被削平了：', '离岭顶不远的石壁上，字迹最新：'][k - 1]], [null, ['「问：剑从何处来。——从不平处来。」', '「问：剑往何处去。——往无剑处去。」', '「问：何时可收剑。——云在脚下时。」'][k - 1]]]);
    if (k === 3 && !F.cv3) await say(null, '字是用剑尖刻的，入石三分。最后一笔收得很轻，像是刻字的人忽然叹了口气。');
    if (!F['cv' + k]) { F['cv' + k] = 1; Sfx.play('ok'); if (F.q_peak === 1) toast('崖刻 ' + [1, 2, 3].filter(i => F['cv' + i]).length + ' / 3'); G.save(); }
  },
  async my_hermit() {
    const F = S.flags;
    if (F.q_peak === 2 && await sideQuest('q_peak')) return;
    if (F.q_peak === 3) { await say('my_hermit', ['云散了。老夫明日下山。', '莫问那小子，守了三十年的台子……也是个痴人。'][(F.hermit_i = (F.hermit_i || 0) + 1) % 2]); return; }
    if (F.q_peak !== 1) { await say('my_hermit', '上来看云的？看吧。看够了就下去，莫碰老夫的石头。'); return; }
    await say('my_hermit', '带着兵器上来的。照规矩，三问。');
    const a = await choose('「剑从何处来？」', ['从师门来', '从不平处来', '从炉火中来']);
    const b = await choose('「剑往何处去？」', ['往无剑处去', '往仇人处去', '往天下第一去']);
    const c = await choose('「何时可收剑？」', ['仇人死尽时', '天下无敌时', '云在脚下时']);
    if (!(a === 1 && b === 0 && c === 2) && !(G.autoSkip && !G.autoPick)) {   // 自动测试里没指定怎么选的，算答对
      await talk([['my_hermit', F.cv1 && F.cv2 && F.cv3 ? '不对。字你是读过了，没往心里去。下去，再读一遍。' : '不对。上山的路边有三块石头，石头上有字。下去。'], [null, '老人袖子一拂，一股柔和的大力把人送出了三丈开外。']]);
      return;
    }
    await talk([
      ['my_hermit', '……三十年，头一个答全的。'],
      ['my_hermit', '可嘴上答得出，不算答得出。那些字是老夫刻的，刻的时候，老夫自己也只信了一半。'],
      ['my_hermit', '拔剑。让老夫看看，你的剑是不是也这么说。']
    ]);
    F.peak_pass = 1; World.refresh(); G.save();
  },
  async peak_pre() {
    await talk([
      [null, '岭顶的风很大。老人解下背后的剑，剑鞘上缠的布条早已褪成了白色。'],
      ['yashang', '老夫只出七分力。接不住，就自己走下去——比滚下去体面。']
    ]);
  },
  async peak_post() {
    await talk([
      ['yashang', '好。……够了。'],
      [null, '老人收了剑，在崖边坐下。云海就在他脚下翻涌。'],
      ['my_hermit', '你的剑里有雨声。听雨阁——顾苍梧的徒弟？'],
      ['hero', '前辈认得家师？'],
      ['my_hermit', '三十年前，问剑台上，老夫同他打过一场。老夫赢了半招，他却笑着下了台。老夫想了三十年，没想明白他笑什么。'],
      ['my_hermit', '今日看见你，明白了。那时候他已经在想“剑往何处去”；老夫还只想着赢。']
    ]);
    S.flags.q_peak = 2; World.refresh(); toast('再同崖上客说几句话');
  },
  async q_peak_done() {
    await talk([
      ['my_hermit', '这块佩跟了老夫半辈子，上头的字是后来添的。拿去。'],
      ['my_hermit', '还有一句话，替老夫带给问剑台守台的莫问。他是老夫的师弟，等老夫回去，等了三十年。'],
      ['my_hermit', '告诉他：台上问剑，不如崖上问心。台子不必守了，上来喝茶。'],
      ['hero', '前辈自己不下山？'],
      ['my_hermit', '下。等云散了就下。……三十年了，也该下去看看，山下的不平处，还剩多少。']
    ]);
    give('acY', 1);
    const m = fixMember(S.party[0]); m.at.agi += 1; toast('<b>' + S.name + '</b> 的身法 +1');
  },

  /* ---------- 撷芳园 · 百花酿 ---------- */
  async gd_yun() {
    if (await sideQuest('q_brew')) return;
    const F = S.flags;
    await say('gd_yun', F.q_brew === 3 ? '今年这一坛封好了。等老头子生辰那天开——你们若是路过，也来喝一盏。' : F.q_brew === 1 ? '三株花：晓妆在西边的小径旁，夜光白在东边，紫霞在北头的亭子边。开得正好的会发亮。' : '随便看，随便走。花是给人看的，只是莫攀折。');
  },
  async q_brew_offer() {
    await talk(withParty([
      ['gd_yun', '脚步声生得很。是头一回来园子的客人吧？随便看，莫攀折就好。'],
      ['gd_yun', '……等等。你身上有铁器的味道，脚步却轻。是使剑的？手稳不稳？'],
      ['hero', '还算稳。'],
      ['gd_yun', '那老婆子求你一件事。园子里有三株花，一年只开这几天：晓妆、夜光白、紫霞。每年这时候，我要亲手摘下来，酿一坛百花酿。'],
      ['gd_yun', '可今年，我这双眼睛连花和叶子都分不清了。小童毛手毛脚，一掐就是一把。摘这三朵花，要像收剑一样——快，轻，不伤根。'],
      ['su', '拿听雨剑法摘花？师父知道了，胡子都要气歪。'],
      ['gd_yun', '三株都在园子里，开得正好的那几朵会发亮，走近了就看得见。摘回来，老婆子请你们喝第一盏。']
    ]));
    World.refresh();
  },
  async gd_boy() {
    const F = S.flags;
    await say('gd_boy', F.q_brew === 3 ? '婆婆说你摘花的手比我稳。……哼，我明年就练好了。' : F.q_brew === 1 ? '晓妆、夜光白、紫霞——那三株婆婆从来不许我碰！凭什么你能摘？' : '别踩花圃！走石板路，石板路！');
  },
  async bloom_pick(n) {
    const id = n.def.item, F = S.flags;
    give(id, 1); Sfx.play('chest'); World.refresh();
    await talk(withParty({
      hua1: [[null, '剑尖贴着花萼轻轻一转，晓妆落进掌心，瓣上的水珠一颗也没有洒。'], ['bai', '花瓣上的不是露水，是它自己沁出来的蜜。……好香。']],
      hua2: [[null, '夜光白离了枝，在手里仍是亮的，像掬着一捧月光。'], ['su', '白成这样，夜里拿来当灯笼都行。']],
      hua3: [[null, '紫霞入手微温，一朵之中由紫入绯，像一小片落下来的晚霞。'], ['shi', '这么小一朵花，比我那口刀还难伺候。']]
    }[id]));
    if (['hua1', 'hua2', 'hua3'].every(k => S.items[k] > 0)) { F.q_brew = 2; toast('三朵花都齐了，回去找芸婆婆'); }
    G.save();
  },
  async q_brew_done() {
    for (const k of ['hua1', 'hua2', 'hua3']) delete S.items[k];
    await talk([
      ['gd_yun', '……一朵都没伤着。好手艺。使剑的人拿剑摘花，老婆子这辈子是第二回见。'],
      ['gd_yun', '头一回是我家老头子。年轻时是个走江湖的剑客，为了讨我欢喜，拿剑学摘花，摘坏了我半园子的芍药。'],
      ['gd_yun', '如今他老糊涂了，住在城里儿子家，连我都认不得。只有喝了这百花酿，才想得起来——想得起这园子，想得起他摘坏的芍药，想得起我叫什么。'],
      ['gd_yun', '一年就这一坛，一坛就管这一天。所以这三朵花，伤不得。'],
      [null, '芸婆婆摸索着把三朵花浸进坛里。不一会儿，满屋都是说不清的香。'],
      ['gd_yun', '去年的还剩最后一盏，说好了请你们。只够一个人喝——给谁？']
    ]);
    const ids = ['hero'].concat(['su', 'bai', 'shi'].filter(k => S.party.some(m => m.id === k)));
    const c = await choose('这一盏百花酿——', ids.map(k => (k === 'hero' ? '自己喝了' : '递给' + CHARS[k].name))), id = ids[c] || 'hero';
    S.flags.brew_to = id;
    if (id === 'su') { await talk([['su', '给我？……算你有良心。'], [null, '她一仰头喝干了，脸一下子红到了耳根。'], ['su', '看什么看！是酒劲。']]); bondAdd('su', 2); }
    else if (id === 'bai') { await talk([['bai', '我……我不大会喝酒。'], [null, '她双手捧着盏，小口小口地抿，像在尝一味新药。'], ['bai', '有十一种花。……不对，十二种。最后那一种，我尝不出来。'], ['gd_yun', '最后那一种不是花，丫头。是等的工夫。']]); bondAdd('bai', 2); }
    else if (id === 'shi') { await talk([['shi', '就这么一小盏？塞牙缝都不够！'], [null, '他一口闷了，咂了咂嘴，半天没说话。'], ['shi', '……好酒。老人家，明年摘花算我一个，我力气大。'], ['gd_yun', '你那双手是抡刀的手。花，还是离你远些。']]); const m = fixMember(S.party.find(x => x.id === 'shi')); m.at.con += 1; toast('<b>' + CHARS.shi.name + '</b> 的根骨 +1'); }
    else { await talk([[null, '酒入喉是凉的，落到丹田，却化成一团暖意。'], ['gd_yun', '尝出来了？最后那一味不是花，是等的工夫。']]); const m = fixMember(S.party[0]); m.at.wis += 1; toast('<b>' + S.name + '</b> 的悟性 +1'); }
    await say('gd_yun', '这个香囊你们带着。里头是园子里一年四季的落花。');
    give('acH', 1); give('gold', 200); World.refresh();
  }
});

/* ============ 备用支线：落霞镇与四郊之间的八桩往来 ============
   落霞镇城里和四郊现有的七桩委托（SPARE_NEED）都办完之后才会出现。每一桩都由城里的一个人牵头、要去找某一处城郊的人，多半还牵着一位同伴的心思：
     新米入城　　　金掌柜　　→ 稻香村 田老爹、阿苗　　（石破军）　跑腿，带不带阿苗进城由你定
     迟到两年的镖　沈长风　　→ 稻香村 田老爹、阿苗　　（苏青禾）　送镖师的遗物，谁来开口由你定
     一味莲心　　　杜大夫　　→ 藕花村 阿菱　　　　　　（白芷）　　在塘边采三个老莲蓬
     漏网的水鬼　　秦捕头　　→ 藕花村 打鱼的汉子　　　　　　　　　南塘对岸拿人（一场架）
     说书人的新书　说书先生　→ 摩云岭 老猎户、崖上客　（云澈）　　两头问话，回来定书名
     师弟的酒　　　莫问　　　→ 摩云岭 崖上客　　　　　（石破军）　山路上狼群截道（一场架），送酒上岭
     一园芍药　　　花娘　　　→ 撷芳园 芸婆婆、小童　　（白芷）　　找回小花锄，换芍药根
     一年只这一天　卖炊饼的大婶 → 撷芳园 芸婆婆　　　　　　　　　　取百花酿，办完再去告诉芸婆婆一声
   触发（spareTick，world.js 的 update 每帧调用）：白天、人在落霞镇（含各屋）或四郊时，从还没做过的里头随机挑一桩，左下角提示谁在找你，那人头上挂出记号；
   去找他接下。办完一桩之后要过一夜（天黑过、再到白天；在客栈歇到天亮或坐到掌灯也算）才来下一桩。八桩都做完就没有了。
   S.flags：spare_cur 当前这一桩的 id；spare_wait 1 = 刚办完、等天黑，2 = 天黑过了、等天亮；各桩自己的进度同别的委托（1 已接 2 可交差 3 已完成）。 */
const SPARE_NEED = ['q_tavern', 'q_lost', 'q_pawn', 'q_scare', 'q_ghost', 'q_peak', 'q_brew'];
const sp = (id, k) => S.flags[id] === (k == null ? 1 : k);
const SPARES = [
  { id: 'sp_rice', name: '新米入城', who: '金掌柜', town: 'jin', at: '醉仙楼', where: '落霞镇栖霞门（西南）外 → 稻香村 · 田老爹',
    text: ['醉仙楼等着稻香村的新米下曲酿酒，今年却迟迟不见送来。去稻香村问问田老爹。', '样米到手，回醉仙楼交给金掌柜。'],
    async offer() {
      await talk(withParty([
        ['jin', '少侠来得正好！小店的“落霞烧”，年年要用稻香村的头茬新米下曲。往年这时候，村里的牛车早进城了，今年却连个信儿都没有。'],
        ['jin', '小店走不开人。劳烦少侠跑一趟，问问田老爹——是收成不好，还是嫌我金某人往年给的价低了？'],
        ['shi', '酿酒的事可耽误不得。走，现在就去。'],
        ['jin', '这位爷是懂行的！酿出来头一坛，小店给几位留着。']
      ]));
    },
    talk: {
      async dx_elder(F) {
        if (!sp('sp_rice')) return false;
        await talk([
          ['dx_elder', '金掌柜急了？哈哈，该他急。米早就备下了，三十石，一粒瘪的都没有。'],
          ['dx_elder', '只是往年押车的两个后生，今年一个娶亲、一个扭了腰。那三个新来的又不认得进城的路……这才耽搁了。'],
          ['dx_miao', '我认得路！我去！田老爹，我还没进过城呢！'],
          ['dx_elder', '你这丫头……少侠，你看呢？']
        ]);
        const c = await choose('阿苗想跟着米车进城——', ['「让她去吧，路上我看着。」', '「路远，等下回赶集再带你去。」']);
        F.sp_rice_pick = c;
        await talk(c === 0 ? [['dx_miao', '真的？！我去拿斗笠！'], ['dx_elder', '也好，叫她见见世面。这袋样米少侠先带给金掌柜，车随后就到。']] : [['dx_miao', '……哦。那你说话算话。'], ['dx_elder', '这袋样米少侠先带给金掌柜，车明日一早就到。']]);
        give('xinmi', 1); F.sp_rice = 2; toast('回醉仙楼交给金掌柜'); return true;
      },
      async dx_miao(F) { if (!sp('sp_rice', 2)) return false; await say('dx_miao', F.sp_rice_pick === 0 ? '城门有多高？比谷仓高吗？有两个谷仓高吗？' : '下回赶集。你说的。我记着呢。'); return true; }
    },
    async done() {
      const F = S.flags;
      await talk(withParty([
        [null, '金掌柜抓起一把米，凑到鼻子底下闻了又闻，又丢了两粒在嘴里嚼。'],
        ['jin', '好米！比去年的还香。田老爹没嫌价低就好——今年每石我再添二钱银子。'],
        F.sp_rice_pick === 0 ? [null, '跟车进城的阿苗站在醉仙楼门口，仰着头数楼有几层，数了三遍。金掌柜叫伙计给她端了一碗桂花圆子。'] : ['jin', '听说村里那个守仓的小丫头想进城？下回叫她来，醉仙楼的桂花圆子管够。'],
        ['shi', '掌柜的，头一坛。'],
        ['jin', '忘不了，忘不了！']
      ]));
      delete S.items.xinmi; give('gold', 500); give('potion2', 4);
    } },
  { id: 'sp_relic', name: '迟到两年的镖', who: '沈长风', town: 'shen', at: '长风镖局', where: '落霞镇栖霞门（西南）外 → 稻香村 · 田老爹',
    text: ['镖局清点旧库，找出了两年前折在青岚山道的镖师陈大勇的遗物。他的女儿阿苗在稻香村。把东西送去，先找田老爹。', '东西送到了。回镖局告诉沈长风。'],
    async offer() {
      await talk([
        ['shen', '小兄弟，有件事……我想了三天，不知道该托谁。'],
        ['shen', '镖局清点旧库，翻出一个包袱。是陈大勇的——两年前折在青岚山道上的那趟镖，他是领头的镖师。腰牌，还有一封没来得及寄的家书。'],
        ['shen', '稻香村的田老爹托人来问过。他的闺女，如今就在那村里。'],
        ['hero', '总镖头不亲自去？'],
        ['shen', '该我去。可我当了三十年总镖头，什么都不怕，就怕敲镖师家的门。……还有这两年的抚恤银，一并带去。']
      ]);
      give('yaopai', 1);
    },
    talk: {
      async dx_elder(F) {
        if (!sp('sp_relic')) return false;
        await talk([
          ['dx_elder', '这包袱……是镖局的？唉。到底是来了。'],
          ['dx_elder', '这话老汉憋了一年，夜夜想着怎么开口。少侠，是你来说，还是老汉来说？']
        ]);
        const c = await choose('阿苗就在院子里扎稻草人——', ['走过去，亲口告诉她', '「您看着她长大的。您来说。」']);
        F.sp_relic_pick = c;
        if (c === 0) await talk(withParty([
          ['hero', '阿苗。你爹托人带东西给你。'],
          ['dx_miao', '我爹？他到哪儿了？是不是快回来了？'],
          ['su', '……我来说吧，师弟。'],
          ['su', '阿苗，姐姐小时候，家也没了。有人把我从火里拎出来，告诉我：往后的路，要自己走了。那天我恨死了说这话的人。'],
          ['su', '你爹走的是最后一趟镖。他护着镖，没有退。这是他的腰牌，这封信，头两个字写的是“苗儿”。'],
          [null, '阿苗没有哭出声。她把腰牌攥在手心里，攥了很久，指节都白了。'],
          ['dx_miao', '……那稻草人，我还扎不扎？'],
          ['su', '扎。扎给过路的人看：这村里有人守着。你爹守镖，你守仓，是一样的。']
        ]));
        else await talk([
          [null, '田老爹拄着拐杖走进院子，在阿苗身边坐下。老人说得很慢，一句话要停三回。'],
          [null, '阿苗手里的稻草掉在了地上。过了很久，她把那块腰牌系在了刚扎好的稻草人腰上。'],
          ['dx_miao', '我爹说，腰牌在，镖就在。……往后它替我爹站在这儿。']
        ]);
        if (c === 0 && S.party.some(m => m.id === 'su')) bondAdd('su', 1);
        delete S.items.yaopai; F.sp_relic = 2; toast('回镖局告诉沈长风'); return true;
      },
      async dx_miao(F) { if (!sp('sp_relic', 2)) return false; await say('dx_miao', '信上说，等我长到灶台高，就带我进城吃桂花圆子。……我已经比灶台高了。'); return true; }
    },
    async done() {
      await talk([
        ['shen', '……她问没问，她爹是怎么走的？'],
        ['hero', '问了。我说，是护着镖走的，没有退。'],
        ['shen', '是。是这么走的。'],
        ['shen', '往后每年秋收，镖局往稻香村送一车盐。不算抚恤——算镖局欠陈大勇的。这点东西，小兄弟收着，别推。']
      ]);
      give('gold', 400); give('revive', 1);
    } },
  { id: 'sp_lotus', name: '一味莲心', who: '杜大夫', town: 'herb', at: '药铺', where: '落霞镇观澜门（东北）外 → 藕花村 · 阿菱',
    text: [() => (S.flags.sp_lotus_a ? '在藕花村的塘边采三个老莲蓬（发着微光）。（已得 ' + (S.items.lianpeng || 0) + ' / 3）' : '入秋燥咳的人多，药铺缺一味莲心。去藕花村找阿菱，问哪里有熟透的老莲蓬。'), '三个老莲蓬都齐了，回药铺交给杜大夫。'],
    async offer() {
      await talk(withParty([
        ['herb', '少侠留步。入了秋，镇上燥咳的人一天比一天多，老朽的方子里缺一味莲心。'],
        ['herb', '莲心要老莲蓬里的才足。藕花村塘里的最好，只是要熟透了、自己垂下头来的那种。三个就够。'],
        ['bai', '莲心苦寒，清心火。……杜大夫，我认得，我去采。'],
        ['herb', '有白姑娘去，老朽就放心了。到了村里先找阿菱，那丫头熟悉塘。']
      ]));
    },
    talk: {
      async oh_ling(F) {
        if (!sp('sp_lotus')) return false;
        if (F.sp_lotus_a) { await say('oh_ling', '垂了头的才是老的。塘北岸一处，南塘口一处，西边小路旁一处。'); return true; }
        await talk(withParty([
          ['oh_ling', '老莲蓬？有，有！往年都没人要，嫌苦，全烂在塘里了。'],
          ['oh_ling', '我指给你们：塘北岸一处，南塘口一处，西边小路旁还有一处。垂了头的才是老的，直挺挺的别摘。'],
          ['bai', '多谢。……莲心取出来要阴干，不能晒。你若是愿意学，我教你。'],
          ['oh_ling', '学了能卖钱吗？能？那我学！']
        ]));
        F.sp_lotus_a = 1; World.refresh(); return true;
      }
    },
    async done() {
      await talk(withParty([
        [null, '白芷洗净了手，把莲蓬一个个掰开。莲子心抽出来，青碧的一小根，整整齐齐码在竹匾上。'],
        ['herb', '白姑娘这手法……是百草翁那一路的。老朽四十年没见过了。'],
        ['bai', '师父说，取莲心的时候心要静。心不静，药就苦得不正。'],
        ['herb', '好，好。这几味成药是铺子里现成的，几位带着路上用。']
      ]));
      delete S.items.lianpeng; if (S.party.some(m => m.id === 'bai')) bondAdd('bai', 1);
      give('antidote', 3); give('potion2', 3); give('gold', 300);
    } },
  { id: 'sp_fugitive', name: '漏网的水鬼', who: '秦捕头', town: 'captain', at: '衙门', where: '落霞镇观澜门（东北）外 → 藕花村 · 打鱼的汉子',
    text: [() => (S.flags.sp_fug_a ? '逃犯躲在南塘对岸的芦苇里。从南边的栈桥走到头，就是南岸。' : '鬼老七一伙押解进城时走脱了一个，往藕花村方向去了。去村里问问打鱼的汉子。'), '逃犯已经拿下，回衙门告诉秦捕头。'],
    async offer() {
      await talk(withParty([
        ['captain', '少侠，丢人的事。鬼老七那一伙押进城那天，过桥的时候走脱了一个。'],
        ['captain', '有人看见他往藕花村那边去了。衙门的人手都在追沉舟坞的余党，我实在分不出人。'],
        ['su', '捉了又跑，跑了再捉。秦捕头，衙门的绳子该换粗些的了。'],
        ['captain', '……苏姑娘教训得是。村西头打鱼的汉子夜夜下网，水面上有什么动静，他最清楚。']
      ]));
    },
    talk: {
      async oh_fisher(F) {
        if (!sp('sp_fugitive')) return false;
        if (F.sp_fug_a) { await say('oh_fisher', '南塘的栈桥走到头就是南岸。我腿刚好，就不陪你们过去了。'); return true; }
        await talk([
          ['oh_fisher', '跑了一个？怪不得。昨夜我下网，南塘对岸的芦苇里有火光，还有人咳嗽。'],
          ['oh_fisher', '船我没敢划过去。从南边那道栈桥走到头，就是南岸。听动静……不止一个人。']
        ]);
        F.sp_fug_a = 1; World.refresh(); toast('逃犯躲在南塘对岸'); return true;
      }
    },
    async done() {
      await talk([
        ['captain', '拿住了？三个？！……走脱一个，倒牵出来两个接应的。少侠这一趟，替衙门省了半年的脚力。'],
        ['captain', '往后藕花村那条水路，衙门每旬巡一趟。这是赏银，照例的。']
      ]);
      give('gold', 700); give('potion2', 3);
    } },
  { id: 'sp_tale', name: '说书人的新书', who: '说书先生', town: 'teller', at: '茶馆', where: '落霞镇演武门（西北）外 → 摩云岭 · 老猎户、崖上客',
    text: [() => '说书先生想把摩云岭顶那位老人的事编成一段新书，托你去问个准话：先听老猎户讲讲' + (S.flags.sp_tale_a ? '（已问）' : '') + '，再问崖上客本人许不许说' + (S.flags.sp_tale_b ? '（已问）' : '') + '。', '两头都问过了，回茶馆告诉说书先生。'],
    async offer() {
      await talk([
        ['teller', '少侠！救救老朽的饭碗。一部《青岚剑侠传》说了三年，底下的客人都会接下句了。'],
        ['teller', '听说摩云岭顶上有位三十年不下山的老先生，凡上去的人都要答他三问——少侠是上去过的！'],
        ['teller', '这段书老朽想说，可不敢乱编。劳烦少侠再上一趟岭：山脚的老猎户知道得多，先听他讲讲；再问问那位老先生本人——这段书，许不许说？']
      ]);
    },
    talk: {
      async my_hunter(F) {
        if (!sp('sp_tale') || F.sp_tale_a) return false;
        await talk([
          ['my_hunter', '说书？说我？……说那老头子啊。'],
          ['my_hunter', '我上去七回。头一回带的是猎叉，他问“剑从何处来”，我说“这是叉”——就下来了。'],
          ['my_hunter', '第七回我什么都没带，空着手上去的。他说：“不带兵器的，不问。坐。”我们俩看了一下午的云，谁也没说话。'],
          ['my_hunter', '后来我想，七回里头，就数那一回是我赢了。这段，叫那先生照实说。']
        ]);
        F.sp_tale_a = 1; if (F.sp_tale_b) { F.sp_tale = 2; toast('回茶馆告诉说书先生'); } return true;
      },
      async my_hermit(F) {
        if (!sp('sp_tale') || F.sp_tale_b) return false;
        await talk([
          ['my_hermit', '说书？把老夫编进书里？'],
          ['hero', '说书先生不敢乱编，叫我来问前辈一句准话。'],
          ['my_hermit', '……倒是个老实人。说可以。有一条：别把老夫说成神仙。'],
          ['my_hermit', '就说，有个老头子，有件事想不通，在山上坐了三十年。后来想通了，也没什么了不起——下山喝茶去了。'],
          [null, '老人扯过一张纸，随手写了四个字，墨还没干就塞了过来。']
        ]);
        give('tizi', 1); F.sp_tale_b = 1; if (F.sp_tale_a) { F.sp_tale = 2; toast('回茶馆告诉说书先生'); } return true;
      }
    },
    async done() {
      await talk([['teller', '许了？！还有题字？……“云在脚下”。好，好字！这四个字，老朽裱起来挂在书案后头。'], ['teller', '新书的名目，少侠替老朽定一个。']]);
      const c = await choose('这段新书叫——', ['《崖上三问》', '《云在脚下》', '《七上摩云岭》']);
      S.flags.sp_tale_pick = c;
      await talk([
        [null, '当天晌午，茶馆的醒木响了。'],
        ['teller', ['“话说落霞镇西北三十里，有岭名摩云。岭上有一老翁，逢人便问三句话——”', '“话说人这一辈子，剑能举多高？有个老头子说：举到云在脚下，就该放下了——”', '“话说摩云岭下有个猎户，生平不识一个字，却上了七回岭，同天下第一等的剑客看过一下午的云——”'][c]],
        [null, '满堂的茶客，没有一个接得上下句。']
      ]);
      delete S.items.tizi; give('gold', 350); give('mp2', 2);
    } },
  { id: 'sp_sword', name: '师弟的酒', who: '莫问', town: 'keeper', at: '问剑台', where: '落霞镇演武门（西北）外 → 摩云岭 · 岭顶',
    text: [() => (S.flags.sp_sword_a ? '狼群赶散了。把酒送上岭顶，交给崖上客。' : '莫问托你把一坛三十年的陈酒送上摩云岭顶，交给他的师兄崖上客。岭上近来有狼群截道。'), '酒送到了。回问剑台告诉莫问。'],
    async offer() {
      await talk(withParty([
        ['keeper', '师兄的话，你带到了。“台子不必守了，上来喝茶。”'],
        ['keeper', '……守台的人，不能离台。这是师父定的规矩。'],
        ['keeper', '台子底下埋着一坛酒，是师父当年埋的，说等我们师兄弟分出高下那天喝。三十年了，没分出来。你替我带上去。'],
        ['shi', '三十年的酒！……我就闻闻。'],
        ['keeper', '岭上近来有狼群截道，专拣带吃食的下手。当心。']
      ]));
      give('chenjiu', 1); World.refresh();
    },
    talk: {
      async my_hermit(F) {
        if (!sp('sp_sword')) return false;
        await talk(withParty([
          [null, '泥封一拍开，酒香就漫了半个岭顶。老人怔了一下。'],
          ['my_hermit', '这是……师父埋的那一坛。他一口没动，留了三十年。'],
          [null, '老人倒了一碗，慢慢喝了。又倒了一碗，放在对面空着的石凳上。'],
          ['my_hermit', '告诉他：酒我喝了一半。剩下一半，等他自己上来喝。'],
          ['my_hermit', '再告诉他：台子是死的，人是活的。师父定规矩的时候，也没想到他这个徒弟这么听话。'],
          ['shi', '前辈，那石凳上的一碗——'],
          ['my_hermit', '那是莫问的。你小子敢动，老夫把你扔下去。']
        ]));
        delete S.items.chenjiu; give('songzhi', 1); F.sp_sword = 2; World.refresh(); toast('回问剑台告诉莫问'); return true;
      }
    },
    async done() {
      await talk([
        [null, '莫问接过那截松枝，看了看断口。平得像镜子。'],
        ['keeper', '……他的剑，比三十年前慢了。慢了，才削得出这样的口子。'],
        ['keeper', '明日，我告一天假。问剑台三十年没关过门，关一天，塌不了。'],
        ['keeper', '这是守台人的一点心意。上面的规矩是：只赠给让守台人下过台的人。']
      ]);
      delete S.items.songzhi; give('gold', 600); give('revive', 1);
      const m = fixMember(S.party[0]); m.at.str += 1; toast('<b>' + S.name + '</b> 的膂力 +1');
    } },
  { id: 'sp_seed', name: '一园芍药', who: '花娘', town: 'huaniang', at: '南巷花娘家', where: '落霞镇朝阳门（东南）外 → 撷芳园 · 芸婆婆',
    text: [() => (S.flags.sp_seed_b ? '小花锄找到了，拿去还给芸婆婆。' : S.flags.sp_seed_a ? '芸婆婆的小花锄叫小童拿去玩丢了。问问小童，把它找回来。' : '花娘想改种芍药，托你带一罐糖桂花去撷芳园，同芸婆婆换几段芍药根。'), '芍药根到手，回去交给花娘。'],
    async offer() {
      await talk([
        ['huaniang', '少侠，后院的栀子今年遭了虫，一棵没剩。我想改种芍药——可全城只有撷芳园有好根。'],
        ['huaniang', '芸婆婆的花不卖，只换。这罐糖桂花是我自己腌的，少侠替我带去，看婆婆肯不肯换。'],
        ['xiaoman', '封口的红纸是我剪的！是一只猫！']
      ]);
      give('tanggui', 1);
    },
    talk: {
      async gd_yun(F) {
        if (!sp('sp_seed')) return false;
        if (F.sp_seed_b) {
          await talk(withParty([
            ['gd_yun', '找着了？这孩子……罢了，锄头没丢就好。'],
            [null, '芸婆婆蹲在花圃边，摸着芍药的老根，三两下分出几段，用湿苔裹好。眼睛看不清，手却一点不乱。'],
            ['bai', '婆婆分根不用看的么？'],
            ['gd_yun', '种了五十年，根长在哪儿，手比眼睛清楚。'],
            ['gd_yun', '告诉花娘：芍药要三年才开。等得起的人，才配种它。']
          ]));
          delete S.items.huachu; give('shaoyao', 1); F.sp_seed = 2; toast('回去交给花娘'); return true;
        }
        if (F.sp_seed_a) { await say('gd_yun', '花锄多半是小童拿去了。你问问他，埋在哪儿了。'); return true; }
        await talk([
          ['gd_yun', '糖桂花……这是城南花娘的手艺。她娘年轻时在我这园子里学过三年，腌的也是这个味。'],
          ['gd_yun', '芍药根我给。只是分根要用的小花锄，叫小童拿去玩，不知丢到哪儿去了。没有它，老婆子下不了手。']
        ]);
        delete S.items.tanggui; F.sp_seed_a = 1; World.refresh(); return true;
      },
      async gd_boy(F) {
        if (!sp('sp_seed') || !F.sp_seed_a || F.sp_seed_b) return false;
        await talk([['gd_boy', '花锄？我、我没丢！我把它种在北边亭子旁边了。'], ['hero', '种？'], ['gd_boy', '婆婆说种什么长什么。我想种一棵结花锄的树，往后一人一把，就不用抢了……']]);
        return true;
      }
    },
    async done() {
      await talk([
        ['huaniang', '换来了！还是老根……婆婆真舍得。'],
        ['huaniang', '三年才开？不怕。小满她爹走的那年我种了一棵石榴，今年头一回结果。日子就是这么等出来的。'],
        ['xiaoman', '三年？那时候我都长大啦！我要戴一朵最大的！']
      ]);
      delete S.items.shaoyao; give('gold', 300); give('potion2', 3);
      const m = fixMember(S.party[0]); m.at.luk += 1; toast('<b>' + S.name + '</b> 的福缘 +1');
    } },
  { id: 'sp_feast', name: '一年只这一天', who: '卖炊饼的大婶', town: 'sq_auntie', at: '中心广场', where: '落霞镇朝阳门（东南）外 → 撷芳园 · 芸婆婆',
    text: ['卖炊饼的大婶是芸婆婆的儿媳。明日是她公公的生辰，一年只这一天要喝百花酿。替她去撷芳园把酒取回来。', '百花酿取到了，送回广场交给卖炊饼的大婶。'],
    async offer() {
      await talk([
        ['sq_auntie', '少侠！你是不是认得城外撷芳园的芸婆婆？……那是我婆婆。'],
        ['sq_auntie', '明日是我公公的生辰。老爷子糊涂好些年了，连我都叫不出名字，一年就这一天，喝了婆婆酿的百花酿，能清醒小半日。'],
        ['sq_auntie', '往年都是我男人出城去取。今年他跟镖出了远门，我这摊子又离不得人……少侠能不能替我跑一趟？']
      ]);
    },
    talk: {
      async gd_yun(F) {
        if (sp('sp_feast')) {
          await talk([
            ['gd_yun', '是来取酒的？……今年换了人来。我儿子出镖去了？唉，这孩子随他爹，脚上没根。'],
            [null, '芸婆婆抱出一只小坛。坛口系着一段褪了色的剑穗。'],
            ['gd_yun', '替老婆子看一眼。他喝了酒，头一句说的是什么——回头路过，告诉我一声。']
          ]);
          give('baihua', 1); F.sp_feast = 2; toast('送回广场交给卖炊饼的大婶'); return true;
        }
        if (sp('sp_feast', 3) && !F.sp_feast_told) {
          await talk([
            ['gd_yun', '……他说了什么？'],
            ['hero', '他说：“芸娘的芍药，该分根了。”'],
            [null, '芸婆婆很久没有说话。风从花圃上吹过去，一园子的花都在点头。'],
            ['gd_yun', '是该分了。……五十年了，他就记得替我的芍药操心。']
          ]);
          F.sp_feast_told = 1; const m = fixMember(S.party[0]); m.at.wis += 1; toast('<b>' + S.name + '</b> 的悟性 +1'); G.save(); return true;
        }
        return false;
      }
    },
    async done() {
      const who = S.flags.brew_to;
      await talk(withParty([
        [null, '当晚，大婶家的小院里摆了一桌菜。老人坐在上首，眼神空空的，谁也不认得。'],
        [null, '百花酿斟了浅浅一盏。老人抿了一口，愣了很久，忽然把背挺直了。'],
        [null, '“芸娘的芍药，该分根了。”他说。又转头看着儿媳：“秀儿，炊饼少放些碱。”'],
        ['sq_auntie', '……爹，您认得我了。'],
        who === 'su' ? ['su', '上回那一盏是我喝的。……早知道是这样的酒，我该留给他。'] : who === 'bai' ? ['bai', '十二种花，加上等的工夫。……这味药，医书上没有。'] : who === 'shi' ? ['shi', '……这酒我喝过一盏。往后再有人说它塞牙缝，我跟他急。'] : [null, '那一盏酒的味道，云澈是记得的。凉的，落下去却是暖的。'],
        ['sq_auntie', '少侠，没什么谢你的，刚出炉的炊饼带上。婆婆那边，你若再去，替我们说一声：爹今年认得人了。']
      ]));
      delete S.items.baihua; give('potion1', 6); give('gold', 200); toast('再去撷芳园，把老人的话告诉芸婆婆');
    } }
];
QUESTS.push.apply(QUESTS, SPARES.map(q => ({ id: q.id, name: q.name, who: q.who, where: q.where, open: s => s.flags.spare_cur === q.id || s.flags[q.id] > 0, text: q.text })));
for (const q of SPARES) { SCRIPTS[q.id + '_offer'] = () => q.offer(); SCRIPTS[q.id + '_done'] = async () => { await q.done(); S.flags.spare_wait = 1; World.refresh(); }; }
// 当前这一桩（已触发、还没办完的）
const spareCur = () => { const id = S && S.flags.spare_cur; return id && S.flags[id] !== 3 ? SPARES.find(q => q.id === id) : null; };
// 触发一桩：id 不写就从没做过的里头随机挑
function spareStart(id) {
  const F = S.flags, left = SPARES.filter(q => !F[q.id]); if (!left.length) return null;
  const q = (id && SPARES.find(x => x.id === id)) || left[Math.floor(Math.random() * left.length)];
  F.spare_cur = q.id; F.spare_wait = 0; if (World.map) World.refresh();
  Sfx.play('ok'); toast('有人托你办事：<b>' + q.who + '</b>在' + q.at + '等你（委托「' + q.name + '」）'); G.save();
  return q;
}
let spareAcc = 0;
function spareTick(dt) {
  if (!S || !World.map) return;
  const F = S.flags;
  if (F.spare_wait === 1 && World.isNight()) F.spare_wait = 2;   // 办完之后，天黑过了
  if ((spareAcc += dt) < 1.5) return; spareAcc = 0;
  const id = World.map.id;
  if (World.isNight() || !(id === 'town' || id.indexOf('in_') === 0 || /^(daoxiang|ouhua|moyun|garden)$/.test(id))) return;
  if (F.spare_wait === 1 || (F.spare_cur && F[F.spare_cur] !== 3) || !SPARE_NEED.every(k => F[k] === 3)) return;
  if (Math.random() < 0.15) spareStart();   // 不是天一亮就来：平均十来秒
}
(() => {
  // 在客栈歇到天亮、坐到掌灯，也算过了一夜
  const st = World.setTime; World.setTime = function (night) { if (S && S.flags.spare_wait === 1) S.flags.spare_wait = 2; return st.apply(this, arguments); };
  // 牵头的人、要找的人：先问问备用支线有没有话说，没有再说他们平常的话
  const hook = (script, fixedWho) => {
    const old = SCRIPTS[script]; if (!old) { console.error('spare quests: no script ' + script); return; }
    SCRIPTS[script] = async function (n) {
      const who = fixedWho || (n && n.def && n.def.who), q = spareCur(), F = S.flags;
      if (q && who) {
        if (q.town === who) { if (await sideQuest(q.id)) return; if (F[q.id] === 1) await say(who, '那件事，就拜托少侠了。'); }   // 说完这句照旧往下（开铺子的还要做生意）
        if (q.talk && q.talk[who] && await q.talk[who](F, n)) { G.save(); return; }
      }
      if (who === 'gd_yun' && F.sp_feast === 3 && !F.sp_feast_told && await SPARES.find(x => x.id === 'sp_feast').talk.gd_yun(F)) return;   // “一年只这一天”办完之后，回来告诉芸婆婆一声
      return old.apply(this, arguments);
    };
  };
  for (const s of ['jin', 'shen', 'herb', 'captain', 'teller', 'huaniang', 'dx_elder', 'dx_miao', 'oh_ling', 'oh_fisher', 'my_hunter', 'my_hermit', 'gd_yun', 'gd_boy']) hook(s, s);
  hook('tower', 'keeper'); hook('chat');
  // 头上的记号：牵头的人在“还没接”和“可以交差”时挂，城郊要找的人在轮到他时挂
  const WANT = { sp_rice: F => (F.sp_rice === 1 ? 'dx_elder' : ''), sp_relic: F => (F.sp_relic === 1 ? 'dx_elder' : ''), sp_lotus: F => (F.sp_lotus === 1 && !F.sp_lotus_a ? 'oh_ling' : ''), sp_fugitive: F => (F.sp_fugitive === 1 && !F.sp_fug_a ? 'oh_fisher' : ''),
    sp_tale: F => (F.sp_tale === 1 ? (F.sp_tale_a ? '' : 'my_hunter') + ',' + (F.sp_tale_b ? '' : 'my_hermit') : ''), sp_sword: F => (F.sp_sword === 1 ? 'my_hermit' : ''), sp_seed: F => (F.sp_seed === 1 ? (F.sp_seed_a && !F.sp_seed_b ? 'gd_boy' : 'gd_yun') : ''), sp_feast: F => (F.sp_feast === 1 ? 'gd_yun' : '') };
  const mark = (who, s) => { const F = s.flags, q = spareCur(); if (who === 'gd_yun' && F.sp_feast === 3 && !F.sp_feast_told) return true; if (!q) return false; return (q.town === who && (!F[q.id] || F[q.id] === 2)) || WANT[q.id](F).split(',').indexOf(who) >= 0; };
  const whos = new Set(['dx_elder', 'oh_ling', 'oh_fisher', 'my_hunter', 'my_hermit', 'gd_yun', 'gd_boy'].concat(SPARES.map(q => q.town)));
  for (const id in MAPS) for (const n of MAPS[id].npcs || []) if (n.who && whos.has(n.who)) { const om = n.mark; n.mark = s => mark(n.who, s) || (om ? !!om(s) : false); }
  // 城郊地图上为这几桩事添的东西：塘边的三个老莲蓬、亭子旁埋着的小花锄、南塘对岸的逃犯、山路上的狼群
  const pick = (map, x, y, o) => MAPS[map].npcs.push(Object.assign({ x, y, talk: 'sp_pick' }, o));
  [[21, 17, 1], [33, 20, 2], [11, 22, 3]].forEach(p => pick('ouhua', p[0], p[1], { sprite: 'herb', name: '老莲蓬', key: 'sp_lotus_p' + p[2], show: s => s.flags.sp_lotus === 1 && s.flags.sp_lotus_a && !s.flags['sp_lotus_p' + p[2]] }));
  pick('garden', 21, 4, { sprite: 'glint', name: '松动的土', key: 'sp_seed_b', show: s => s.flags.sp_seed === 1 && s.flags.sp_seed_a && !s.flags.sp_seed_b });
  MAPS.ouhua.fixed.push({ x: 34, y: 31, group: ['pirate', 'spy', 'pirate'], boss: true, follow: 1, show: s => s.flags.sp_fugitive === 1 && s.flags.sp_fug_a, pre: 'sp_fug_pre', post: 'sp_fug_post' });
  MAPS.moyun.fixed.push({ x: 27, y: 17, group: ['shanlang', 'shanlang', 'yanxi', 'shanlang'], boss: true, follow: 1, show: s => s.flags.sp_sword === 1 && !s.flags.sp_sword_a, pre: 'sp_wolf_pre', post: 'sp_wolf_post' });
})();
Object.assign(SCRIPTS, {
  async sp_pick(n) {
    const F = S.flags, key = n.def.key; F[key] = 1; Sfx.play('chest');
    if (key === 'sp_seed_b') { give('huachu', 1); await talk([[null, '土是新翻的。扒开两寸，一把木柄磨得发亮的小花锄躺在里头，旁边还端端正正浇过一圈水。'], ['hero', '……还真是“种”下去的。']]); toast('拿去还给芸婆婆'); }
    else {
      give('lianpeng', 1);
      const got = S.items.lianpeng || 0;
      await say(null, ['这一个垂着头，莲子粒粒饱满，壳已经发黑了。', '莲蓬藏在大荷叶底下，一碰，里头的莲子哗啦啦地响。', '最老的一个。剥开一粒，莲子心青得发亮。'][Math.min(got, 3) - 1]);
      if (got === 2) await talk(withParty([['bai', '还差一个。……莲蓬的柄有刺，云少侠，我来拿。']]));
      if (got >= 3) { F.sp_lotus = 2; toast('三个老莲蓬都齐了，回药铺交给杜大夫'); }
    }
    World.refresh(); G.save();
  },
  async sp_fug_pre() {
    await talk(withParty([
      [null, '芦苇深处生着一小堆火。三个汉子围着火烤鱼，听见脚步声，齐刷刷抄起了家伙。'],
      ['pirate', '是那天拿老七的那几个！……晦气。弟兄们，拼了，拼出去就是活路！'],
      ['su', '跑的时候挺利索，怎么不接着跑了？'],
      ['pirate', '往哪儿跑！沉舟坞没了，老家回不去——这塘子再待不住，我们就真成水鬼了！']
    ]));
  },
  async sp_fug_post() {
    await talk([
      ['pirate', '不打了……不打了。绑吧。牢里好歹有口热饭。'],
      [null, '三个人被捆成一串。领头的那个回头看了一眼荷塘，没再说话。']
    ]);
    S.flags.sp_fugitive = 2; World.refresh(); toast('回衙门告诉秦捕头');
  },
  async sp_wolf_pre() {
    await talk(withParty([
      [null, '山路转弯处，几双发亮的眼睛从乱石后面浮出来。领头的苍狼抽了抽鼻子，盯住了那坛酒。'],
      ['shi', '嘿，连狼都识货。'],
      ['hero', '护住坛子。别让它们近身。']
    ]));
  },
  async sp_wolf_post() {
    await say(null, '狼群夹着尾巴退进了乱石里。酒坛完好，泥封上只多了两道爪印。');
    S.flags.sp_sword_a = 1; World.refresh(); toast('把酒送上岭顶');
  }
});
