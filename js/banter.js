'use strict';
/* ============ 队员的随口闲聊 ============
   路上、进了新地方、打完仗、天黑天亮、开箱子、喝泉水、买完东西……队伍里的人会随口说上一两句，浮在画面一角，不打断操作。
   说什么看眼下的处境：在哪张图（山道、城里、竹林、火山、雪岭……）、是不是夜里、身边有没有水、有没有人带着伤、
   队伍里有谁、与云澈的情谊到了哪一步、剧情走到了哪里。
   开了 AI：把这些处境写成一句话交给 AI（AI.banter），由它照着人物的口吻现编；AI 没回话就用下面的现成台词。
   没开 AI：从下面的台词里按处境挑，说过的近期不重复。
   节奏：路上大约一分钟一回；各种“事件”触发的闲聊之间至少隔十来秒，各有各的出现机会（见 CHANCE）。 */
const Banter = (() => {
  const GAP_WALK = 50000, GAP_EVENT = 12000;   // 毫秒：路上闲聊离上一回至少这么久；事件闲聊之间至少这么久
  const CHANCE = { enter: 0.8, win: 0.45, bosswin: 1, hurt: 0.85, levelup: 0.9, flee: 0.7, night: 1, dawn: 1, chest: 0.55, spring: 0.7, shop: 0.5, walk: 1 };
  let last = -1e9, steps = 0, need = 30, recent = [];
  const B = { clock: () => performance.now(), log: null };

  // 台词写成 "谁:说的话"；一段里出现的人都得在队伍里才会被挑中。数组的第一项可以是一个条件函数
  const t3 = id => (typeof heartTier === 'function' ? heartTier(id) : 0);
  // 条件：这位姑娘眼下的关系档在 lo~hi 之间（只写 lo 就是恰好这一档）。档位见 story.js 的 heartTier：
  // 0 同行之谊　1 渐渐熟络　2 暗生在意　3 心有所属　4 心照不宣　5 两心相许　6 各自珍重
  const H = (id, lo, hi) => () => { const t = t3(id); return t >= lo && t <= (hi == null ? lo : hi); };
  const WALK = {
    /* 跟着关系档走的话：同一位姑娘，生分的时候、熟了以后、动了心、说破了，路上随口说的不是一种话——
       称呼在变（“云少侠”到“云澈”、“臭小子”到直呼其名），肯说到哪一步也在变。走路时有四成多的机会先从这里挑。 */
    heart: [
      // 苏青禾
      [H('su', 0), 'su:师弟，包袱背稳了。掉了东西，我可不回头捡。', 'hero:是，师姐。'],
      [H('su', 0), 'su:走快些！磨磨蹭蹭的，师父就教出你这么个慢性子？'],
      [H('su', 0), 'su:臭小子，方才那一步踏错了。回山再练一百遍。', 'hero:……记下了。'],
      [H('su', 1), 'su:师弟，早上的干粮我多拿了一个。喏。', 'hero:师姐不吃？', 'su:我吃过了。少废话。'],
      [H('su', 1), 'su:你那剑穗散了，回头我给你重打一个。……别多想，是看着碍眼。'],
      [H('su', 1), 'hero:师姐，肩上还疼吗？', 'su:早好了。……你倒记得。'],
      [H('su', 2), 'su:师弟，你……算了，没什么。', 'hero:师姐想说什么？', 'su:说了没什么！看路！'],
      [H('su', 2), 'su:方才你回头看什么？', 'hero:看师姐跟上没有。', 'su:……我还用你看。'],
      [H('su', 2), 'su:喂，往后打起来，别老挡在我前头。', 'hero:为什么？', 'su:碍事。……也危险。'],
      [H('su', 3), 'su:云澈。', 'hero:师姐？', 'su:……没事。叫顺口了。走吧，师弟。'],
      [H('su', 3), 'su:这条路要是再长些就好了。', 'hero:师姐不是嫌走得累？', 'su:……就说这一回，你别多想。'],
      [H('su', 3), 'su:你走我左边。我右手使剑，左边……得是信得过的人。'],
      [H('su', 4), 'su:云澈，等这一切了了，你想去哪儿？', 'hero:师姐去哪儿，我去哪儿。', 'su:……油嘴滑舌。跟谁学的。'],
      [H('su', 4), 'su:我从前怕的东西不多。如今多了一样。', 'hero:什么？', 'su:不告诉你。'],
      [H('su', 4), 'su:手冷。', 'hero:……给。', 'su:谁、谁要你的手了。……握紧点。'],
      [H('su', 5), 'su:喂，走那么快做什么。', 'hero:师姐不是嫌我慢？', 'su:如今不嫌了。并排走。'],
      [H('su', 5), 'su:云澈，回山以后，你的剑穗、你的包袱、你这个人，都归我管。', 'hero:一直都是。', 'su:……知道就好。'],
      [H('su', 6), 'su:师弟，白芷是个好姑娘。你敢欺负她，我头一个不饶你。', 'hero:师姐……', 'su:行了。走路。'],
      [H('su', 6), 'su:看什么？师姐好得很。——下山的包袱，往后还是我来检查。'],
      // 白芷
      [H('bai', 0), 'bai:云少侠，前面的路请走慢些，我……跟不大上。', 'hero:抱歉。'],
      [H('bai', 0), 'bai:多谢诸位带我同行。我不会给大家添麻烦的。', 'su:客气什么，往后受了伤还指望你呢。'],
      [H('bai', 0), 'bai:云少侠，这是清凉油，赶路时抹在太阳穴上。……苏姑娘也有一份。'],
      [H('bai', 1), 'bai:云少侠，你的水囊空了。我这里有煮过的薄荷水。'],
      [H('bai', 1), 'bai:云少侠总是走在最前面。……后背，其实最容易受伤。', 'hero:有你们在后面。'],
      [H('bai', 1), 'hero:白芷，累了就说。', 'bai:不累。……云少侠问了，就更不累了。'],
      [H('bai', 2), 'bai:云少侠，你、你袖口破了。晚上……我替你缝。', 'su:白芷，你脸红什么？', 'bai:是、是日头晒的。'],
      [H('bai', 2), 'bai:今早我多备了一份药。也不知为什么……就多备了。'],
      [H('bai', 2), 'bai:云少侠，你方才笑了。', 'hero:有吗？', 'bai:有。……很少见，所以我记下了。'],
      [H('bai', 3), 'bai:云少侠，往后受了伤，不许瞒我。', 'hero:小伤而已。', 'bai:小伤也不许。……我会难受的。'],
      [H('bai', 3), 'bai:我从前只怕治不好病人。如今……还怕一个人不回来。'],
      [H('bai', 3), 'bai:前面那段路滑。……手，借我扶一下。'],
      [H('bai', 4), 'bai:……云澈。', 'hero:嗯？', 'bai:没什么。只是想这样叫一声。'],
      [H('bai', 4), 'bai:云澈，你的脉我不必搭也知道。……听脚步就知道。'],
      [H('bai', 4), 'bai:等事情了了，竹林里的萤火，我想同你一起看。'],
      [H('bai', 5), 'bai:云澈，今晚的药我少放了黄连。', 'hero:不苦了？', 'bai:……苦的留给我自己喝。'],
      [H('bai', 5), 'bai:云澈，药庐门口那张凳子，我今早又擦了一遍。', 'hero:我还没回去坐呢。', 'bai:所以才要擦。'],
      [H('bai', 6), 'bai:云少侠，苏姑娘的旧伤逢阴雨会疼。这瓶药油，你替她收着。'],
      [H('bai', 6), 'bai:我很好。……医者的心，分给病人多一些，是应当的。']
    ],
    mountain: [
      ['su:这山道我闭着眼都能走。小时候偷跑下山买糖葫芦，一晚上能来回两趟。', 'hero:师父知道吗？', 'su:你说呢。跪香跪到天亮。'],
      [H('su', 1, 5), 'hero:山里的花开了。', 'su:开了就开了，看路。……等等，折一枝给我。'],
      ['bai:这一带的车前草长得真好，回头得来采些。', 'su:白芷，你眼里是不是只有草？'],
      ['shi:这路太平了，走得人手痒。', 'su:手痒去劈柴。'],
      ['su:师弟，你听，山雀在吵架。', 'hero:师姐怎么知道是吵架？', 'su:调门那么高，还能是说好话？']
    ],
    town: [
      [() => !World.night, 'su:闻见没有？醉仙楼的酱肘子。', 'hero:师姐，盘缠不多了。', 'su:我就闻闻！'],
      [() => !World.night, 'bai:这城里人来人往，倒叫我想起在药铺帮着抓药的日子。'],
      [() => !World.night, 'shi:城里规矩多，刀都不让随便拔。憋得慌。', 'su:忍着。秦捕头可盯着咱们呢。'],
      [() => !World.night, 'hero:落霞镇的晚霞，听说是江湖一绝。', 'su:等事情了了，天天来看。'],
      [() => !World.night, 'su:那边有捏面人的！……算了，办正事。', 'hero:师姐想要哪个？', 'su:谁、谁想要了。'],
      [() => World.night, 'su:入了夜，这街上倒清静。', 'hero:灯都亮着，不像没人。', 'su:人都在屋里热饭呢。走，别在风里站着。'],
      [() => World.night, 'bai:灯笼底下有飞蛾。它们明知是火，也要扑。', 'su:白芷，大晚上的，别说这么瘆人的话。'],
      [() => World.night, 'shi:夜里走城，最怕巷子里有人。——有也好，正愁没处活动筋骨。'],
      [() => World.night, 'hero:夜里的落霞镇，比白天好看。', 'su:难得你也会说句好听的。'],
      [() => World.night, 'bai:家家窗里都亮着灯。……有人等着回去，真好。']
    ],
    bamboo: [
      ['bai:这片竹子比我年纪还大。小时候师父罚我，就让我数竹节。', 'su:数到多少？', 'bai:数到睡着。'],
      ['su:这林子里的雾，吸多了头晕。', 'bai:含一片薄荷叶会好些。给。'],
      ['shi:竹子砍起来倒是痛快。', 'bai:石大哥，请手下留情。'],
      ['hero:有萤火。', 'bai:嗯。瘴气淡的地方，它们才肯出来。'],
      ['su:白芷，你们林子里的人，是不是走路都没有声音？', 'bai:是苏姑娘的脚步太响了。']
    ],
    fire: [
      ['su:热死了。这鬼地方连风都是烫的。', 'shi:这才叫暖和。你们山上那叫阴冷。'],
      ['bai:大家多喝水。汗出得太多，会脱力的。'],
      ['shi:看见那片熔岩没有？我师父年轻时在边上练了三年刀。', 'su:怪不得脾气那么爆。'],
      ['hero:脚底发烫。', 'su:走快点就不烫了。……大概。'],
      ['su:我的剑柄都烫手了。', 'bai:用布缠一圈，别起了泡。']
    ],
    snow: [
      [H('su', 1, 5), 'su:冷……早知道多带一件袄子。', 'hero:师姐，披我的。', 'su:谁要你的。……拿来。'],
      [H('su', 0), 'su:冷就走快些。听雨阁的弟子，这点雪算什么。'],
      ['bai:雪地里走久了伤眼，别总盯着雪看。'],
      ['shi:这鬼天气，刀都冻在鞘里了。', 'su:你不是说赤焰谷的人不怕冷？', 'shi:……我说的是不怕热。'],
      ['hero:雪停了一阵。', 'bai:山上的雪，停不久的。'],
      [H('su', 2, 5), 'su:师弟，你睫毛上结霜了。', 'hero:师姐的也是。', 'su:……别看了，走路。'],
      [H('bai', 3, 5), 'bai:手伸出来。……冻成这样也不说。我替你呵一呵。']
    ],
    abyss: [
      ['su:这地方……连影子都不肯跟着人走。', 'hero:跟紧我。'],
      ['bai:这里没有活物的气息。草、虫、鸟，什么都没有。'],
      ['shi:管它什么鬼地方，有路就走，有东西挡就砍。'],
      ['hero:都别走散。', 'su:这话该我说。']
    ],
    dusk: [
      ['su:河上的风倒是舒服。', 'bai:水边湿气重，苏姑娘当心着凉。'],
      ['hero:河灯都漂远了。', 'su:漂远了才好，说明许的愿有人收。'],
      ['bai:这水里有鱼腥草的味道……上游该有一大片。'],
      ['shi:我不会水。先说好，船翻了你们得捞我。', 'su:捞你？那得三个人。'],
      ['su:师弟，你说河对面的人，这会儿是不是也在看咱们这边？']
    ],
    mist: [
      ['su:这雾里总像有人在看着咱们。', 'hero:是风。', 'su:最好是。'],
      ['bai:雾太大了。大家说话别停，听着声音就不会走散。'],
      ['shi:看不见三步外的东西，憋屈。'],
      ['hero:脚下当心，这里的路不实。']
    ],
    ash: [
      ['su:一座城，烧成这样。', 'hero:烧了很久了。灰都凉透了。'],
      ['bai:这些灰吸进肺里不好。用帕子掩住口鼻。'],
      ['shi:这地方连只耗子都没有。', 'su:有也让你吓跑了。'],
      ['hero:再往前，就是归墟了。']
    ],
    any: [
      ['su:师弟，你走路怎么老看脚尖。', 'hero:看路。', 'su:看我。——看我走哪条路，跟着就是。'],
      [H('bai', 0, 3), 'bai:云少侠，你的步子比昨日沉了些。是不是没歇好？'],
      [H('bai', 4, 5), 'bai:云澈，你的步子比昨日沉。今晚的安神汤，我给你端过去。'],
      ['shi:喂，听雨阁的，有空切磋一场。', 'hero:随时奉陪。'],
      ['su:等这趟走完，我要睡上三天三夜。', 'bai:我给苏姑娘配一副安神的。', 'su:不用药我也睡得着！'],
      ['shi:走了这么久，就没个卖酒的？', 'bai:石大哥，伤口没好全，不能喝酒。', 'shi:……我就问问。'],
      [H('su', 3, 5), 'su:……你走我左边。', 'hero:一直在左边。', 'su:我知道。就是说一声。'],
      [H('su', 2, 4), 'shi:喂，你们师姐弟俩，走路挨得是不是太近了点？', 'su:要你管！'],
      [H('bai', 2, 4), 'su:白芷，你怎么老往师弟那边看？', 'bai:我、我在看他的气色……'],
      // 下面是为了让每两个人之间都有话说补的（原先十段里有七八段是苏青禾同云澈）：云澈—白芷、云澈—石破军、苏青禾—白芷、苏青禾—石破军、白芷—石破军
      ['hero:白芷，你药囊里到底装了多少东西？', 'bai:四十七味药，三套针，还有一包梅子。梅子是哄病人吃药用的。'],
      ['bai:你方才出剑的时候屏着气。练剑的人，气要匀。', 'hero:你连这个都看得出来？', 'bai:医者看人，先看呼吸。'],
      ['hero:走了这半天，你脚上磨没磨出泡？', 'bai:……有一个。我自己会挑。', 'hero:到前面歇脚。'],
      ['bai:路边那株是夏枯草，清肝火的。要不要认一认？', 'hero:认了，下回替你采。'],
      ['shi:喂，你那一式“斜风细雨”，手腕是怎么抖的？', 'hero:想学？', 'shi:谁想学！……就问问。'],
      ['hero:石兄的刀有多重？', 'shi:三十六斤。你拎拎？', 'hero:……还是你背着吧。'],
      ['shi:听雨阁的，你们山上吃什么？', 'hero:青菜豆腐，逢五有鱼。', 'shi:怪不得一个个瘦得像竹竿。'],
      ['hero:石兄走路从不看脚下。', 'shi:看什么脚下！有坑，踩平它。'],
      ['su:白芷，你怎么从来不发火？', 'bai:发过的。……苏姑娘没看见罢了。', 'su:什么时候？我要看！'],
      ['bai:苏姑娘的剑穗松了。我替你系紧。', 'su:哎，你手真巧。'],
      ['su:白芷，教我认两味药。迷药那种。', 'bai:……苏姑娘要迷药做什么？', 'su:防身！你想哪儿去了。'],
      ['shi:喂，使剑的，敢不敢比谁先到前面那棵树？', 'su:幼稚。——预备，跑！'],
      ['su:石破军，你嗓门能不能小点？鸟都叫你吓飞了。', 'shi:我这是天生的！'],
      ['shi:你那剑细得跟柳条似的，能砍柴吗？', 'su:能砍你。要不要试试？'],
      ['bai:石大哥，换药的时辰到了。', 'shi:又换？早上才换过！', 'bai:那是昨天早上。'],
      ['shi:白姑娘，你那针扎人疼不疼？', 'bai:看扎谁。石大哥皮厚，要用最粗的那一根。', 'shi:……当我没问。'],
      ['bai:石大哥背的行李最重，歇一歇吧。', 'shi:这点分量算什么！……不过你说歇，就歇。'],
      ['shi:你们大夫是不是都不吃肉？', 'bai:吃的。只是不像石大哥，一顿三斤。']
    ],
    water: [
      ['su:这水真清。', 'hero:师姐，别又想着摸鱼。', 'su:我是那种人吗！……有鱼吗？'],
      ['bai:水边的草药最嫩。等一等我，就摘两株。'],
      ['shi:这水看着就凉快。', 'su:那你下去泡着，我们先走。']
    ],
    hurt: [
      ['bai:你们的伤不能再拖了。找个地方歇一歇，我来上药。'],
      ['su:喂，脸色这么白，逞什么强。把药吃了。'],
      ['hero:都撑得住吗？前面找个地方歇脚。']
    ]
  };
  const ENTER = {
    tingyu: [['su:还是山上的空气好。', 'hero:师父的茶该煮上了。'], ['su:回来了。——先别让师父看见我的剑，上面有个口子。']],
    road: [['su:下了山，可就没人管咱们了。', 'hero:师父交代的事要紧。'], ['bai:山道上的风，和林子里的不一样。'], ['shi:这条道我熟，从前来落霞镇打过酒。']],
    town: [
      [() => !World.night, 'su:落霞镇到了！先说好，办完正事，我要去看杂耍。'],
      [() => !World.night, 'bai:城里药铺的杜大夫，是我师父的旧识。'],
      [() => !World.night, 'shi:人真多。挤得慌。'],
      [() => World.night, 'su:这个时辰进城，街上都没人了。', 'hero:客栈的灯还亮着。'],
      [() => World.night, 'bai:入夜了。我们脚步轻些，别惊了人家。']
    ],
    bamboo: [['bai:……回来了。', 'su:你家这林子，一进来就觉得凉快。'], ['su:好多竹子。师弟，砍一根给我当鱼竿。'], ['shi:这林子密得很，走路得侧着身。']],
    ferry: [['su:这就是烟雨渡？比说书的讲得还热闹。'], ['bai:河上起雾了。'], ['shi:又是水。我先说，我不上船。']],
    dock: [['su:一股子鱼腥味和酒味。水匪窝没跑了。'], ['bai:这里有人在熬药……方子不对，火也太急。']],
    fire: [['shi:到家了。都跟紧，别踩进岩缝里。'], ['su:我的天，这地方是人住的？'], ['bai:好重的硫磺气。']],
    cliff: [['su:后山……我从来没上来过。师父不让。'], ['hero:风里有剑气。'], ['shi:你们听雨阁的后山，怎么比赤焰谷还瘆人。']],
    oldtown: [['hero:师姐。', 'su:没事。走吧。'], ['bai:这里很久没有人烟了。'], ['shi:……都小声些。']],
    snow: [['su:好大的雪！', 'shi:冷死了。'], ['bai:寒气入骨，大家把领口系紧。'], ['hero:寒月宫就在山顶。']],
    tiangong: [['bai:这些石头上的纹路，像是药碾子的槽……不，更细。'], ['shi:一堆破铜烂铁。', 'su:小声点，万一它们听得见。'], ['hero:这里的东西，都别乱碰。']],
    city: [['su:这就是幽烬城。', 'hero:都当心。'], ['bai:城门上的灰，是新落的。'], ['shi:总算到了。憋了一路的火，正好用上。']],
    abyss: [['hero:门就在前面。'], ['su:走到这儿了，怕也晚了。'], ['bai:我的针在抖。……不，是我的手。']],
    deep: [['bai:这里……像是在谁的梦里。'], ['su:师弟，要是看见什么不该看见的，就叫我一声。'], ['shi:管它是梦是真，砍了再说。']],
    fort: [['su:山寨的味道——汗、酒，还有没洗的靴子。'], ['hero:小心暗哨。', 'su:用你说。'], ['bai:寨墙上晾着带血的布条……这里有人受过伤。']],
    cave: [['su:黑咕隆咚的。师弟，你走前面。', 'hero:好。'], ['bai:洞里瘴气重，呼吸浅一些。'], ['shi:这洞顶太矮，刀都抡不开。']],
    forge: [['shi:这炉子……比谷里的还老。'], ['su:又是火。我跟火是不是有仇。'], ['bai:炉灰里有药渣的味道。有人在这里炼过东西。']],
    icecave: [['su:连呼出的气都要冻住了。'], ['bai:冰下面有东西在动。……大家脚步轻些。'], ['shi:这鬼地方。打完赶紧出去。']],
    daoxiang: [['su:好香！是新米下锅的味道。', 'hero:你方才不是才吃过？'], ['bai:田埂边长着车前草，回头采一些。'], ['shi:这么大一片地，得多少人种啊。'], ['hero:正是秋收的时节，村里人都在田里。']],
    ouhua: [['su:好多荷花！师弟，摘个莲蓬给我。', 'hero:那是人家种的。'], ['bai:荷叶清暑，莲心安神……这一塘都是药。'], ['shi:又是水。我先说，我不下塘。'], ['hero:塘上起了薄雾，倒是清静。']],
    moyun: [['su:这山路……比青岚山陡多了。', 'hero:别往下看。'], ['bai:崖缝里那几株是石斛。……太高了，够不着。'], ['shi:这才叫山！赤焰谷那些只能算土包。'], ['hero:云在脚边走。']],
    garden: [['su:这么多花，我一样都叫不出名字。', 'bai:左手边是芍药，右手边是月季，远处粉的那一片是海棠。'], ['bai:这里的花，一大半都能入药。'], ['shi:香得我直想打喷嚏。'], ['hero:脚下留神，别踩了人家的花。']],
    indoor: [['su:屋里暖和多了。'], ['bai:有药香……不，是茶。'], ['shi:这门框矮了点。']],
    // 到了哪儿都能说的几句（每两个人一段）
    any: [
      ['su:到了。师弟，先看看四周。', 'hero:师姐走前面，我断后。'],
      ['bai:这地方的气味……和别处不一样。', 'hero:跟紧些，别走散。'],
      ['shi:到地方了。有架打没有？', 'hero:先看清楚再说。'],
      ['su:白芷，到了新地方，先别忙着采草。', 'bai:……我只看看。'],
      ['shi:这地方我打头阵。', 'su:行，挨了打别喊疼。'],
      ['bai:石大哥，这里路生，慢些走。', 'shi:知道了知道了。']
    ]
  };
  const EVENT = {
    win: [
      ['su:就这？还不够我热身的。'], ['shi:痛快！再来几个。'], ['bai:都没伤着吧？让我看看。'], ['hero:收剑，赶路。'],
      ['su:师弟，方才那一剑不错。', 'hero:师姐教的。', 'su:知道就好。'],
      ['shi:你们听雨阁的剑，花哨是花哨，倒也管用。', 'su:这叫灵巧。'],
      ['bai:石大哥，你又冲到最前头去了。', 'shi:不冲前头，难道躲你后头？'],
      [H('su', 0, 1), 'su:还行，没给听雨阁丢人。下回出剑再快半分。'],
      [H('su', 3, 5), 'su:方才那一剑真好看。……我是说剑。'],
      [H('bai', 0, 1), 'bai:云少侠没有受伤吧？……那就好。'],
      [H('bai', 2, 5), 'bai:你没事就好。……大家都没事，就好。'],
      ['bai:方才那一下，我的针慢了半分。', 'hero:够快了。下回我替你挡着。'],
      ['shi:你那一剑抢了我的对手！', 'hero:下一个让给石兄。'],
      ['su:白芷，你那把针撒出去，比我的剑还吓人。', 'bai:苏姑娘过奖……我只是怕他们近身。']
    ],
    bosswin: [
      ['su:呼……总算倒了。', 'hero:都还站着吗？'],
      ['bai:先别动，我一个个看伤。这回谁也不许说“小伤”。'],
      ['shi:这才像样！够劲！'],
      ['hero:赢了。……都辛苦了。', 'su:少来这套。回头请吃饭。']
    ],
    hurt: [
      ['bai:你流血了。坐下，别逞强。'], [H('su', 1, 2), 'su:喂，下回别冲那么前。……疼不疼？'], ['shi:啧，挂彩了。不碍事，皮糙肉厚。'],
      ['bai:伤口要先洗净。忍一忍，很快就好。'],
      [H('su', 0), 'su:挂彩了？回去加练。——金创药在包袱左边，自己拿。'],
      [H('su', 3, 5), 'su:你再敢替我挡刀试试！……疼不疼？让我看看。'],
      [H('bai', 0, 1), 'bai:云少侠请坐下，我看看伤口。……失礼了。'],
      [H('bai', 3, 5), 'bai:别动。……你流血的时候，我的手会抖。所以，别再流了。'],
      ['hero:师姐，你胳膊在流血。', 'su:小口子。……你先顾你自己。'],
      ['bai:坐下，把袖子卷起来。', 'hero:小伤。', 'bai:是不是小伤，大夫说了算。'],
      ['hero:石兄，你背上挨了一下。', 'shi:挠痒痒罢了！……嘶，轻点碰。'],
      ['bai:苏姑娘别动，伤口里有碎布。', 'su:疼疼疼——你轻点！', 'bai:已经是最轻的了。'],
      ['su:喂，你流血了。', 'shi:你也是。', 'su:……那扯平了。'],
      ['bai:石大哥，下回别用肩膀去接刀。', 'shi:不接，那刀就砍到你了。']
    ],
    levelup: [
      ['su:咦，方才那一下，手上好像顺了不少。'],
      ['hero:这一路打下来，剑比在山上时快了。', 'su:那是。山上哪有这么多人给你练手。'],
      ['shi:刀越使越顺手了。'],
      ['bai:认穴好像比从前准了些……不算好事，说明伤的人太多了。']
    ],
    flee: [
      ['su:好汉不吃眼前亏！……看什么看，这叫计策。'], ['shi:啧，跑什么！', 'hero:留得青山在。'], ['bai:没人受伤就好。']
    ],
    night: [
      ['su:天黑了。看，灯一盏一盏亮起来了。'], ['bai:掌灯了。夜里露重，大家别着凉。'], ['hero:入夜了。', 'su:找个地方吃饭吧，我饿了。'],
      ['shi:天一黑，街上的人倒散得快。'],
      [H('su', 3, 5), 'su:天黑了。……今晚月亮不错，陪我站一会儿。'],
      [H('bai', 3, 5), 'bai:掌灯了。夜里凉，这件披风……你披着。'],
      ['bai:天黑了。夜里的药气最沉，适合熬膏。', 'hero:先吃饭，再熬药。'],
      ['shi:天黑了正好，找地方喝两碗。', 'hero:只两碗。'],
      ['su:白芷，夜里你怕不怕黑？', 'bai:林子里长大的，不怕。苏姑娘怕？', 'su:谁、谁怕了。'],
      ['shi:夜里我守头一班。', 'su:你那呼噜一响，贼都知道咱们在哪儿。'],
      ['bai:石大哥，夜里露重，把外衣披上。', 'shi:我火气旺，不冷。……行行行，披。']
    ],
    dawn: [
      ['su:天亮了……我好像一宿没合眼。'], ['hero:天亮了，赶路吧。'], ['bai:早上的露水最好。可惜这里是城里。'], ['shi:总算亮了。早点摊子该出来了吧？'],
      [H('su', 4, 5), 'su:早。……看什么，我脸上有东西？'],
      [H('bai', 4, 5), 'bai:早。我熬了粥，趁热。'],
      ['su:师弟，早。剑练了没有？', 'hero:练过一趟了。', 'su:哼，算你勤快。'],
      ['bai:早。昨夜睡得可好？', 'hero:还好。你又早起采露水了？'],
      ['shi:起得真早。来，过两招醒醒神！', 'hero:吃了早饭再说。'],
      ['su:白芷，你眼圈怎么是青的？', 'bai:昨夜抄方子，抄晚了。'],
      ['su:石破军，太阳晒屁股了！', 'shi:……再睡一刻钟。'],
      ['shi:白姑娘，早饭有肉没有？', 'bai:有粥，有咸菜。石大哥的伤，忌荤腥。']
    ],
    chest: [
      ['su:哟，还有这种好事。'], ['shi:谁把东西丢这儿了？归咱们了。'], ['bai:不问自取……罢了，总比落在歹人手里好。'], ['hero:收好，路上用得着。']
    ],
    spring: [
      ['bai:这泉水有灵气，喝一口，气血都顺了。'], ['su:啊——活过来了。'], ['shi:这水倒是解乏。'], ['hero:歇一歇再走。']
    ],
    shop: [
      ['su:钱袋又轻了。师弟，师父给的盘缠还剩多少？', 'hero:……不提也罢。'], ['shi:家伙趁手，心里才踏实。'], ['bai:药备足了，我心里也安稳些。']
    ]
  };

  const party = () => (S && S.party ? S.party.map(m => m.id) : []);
  const themeOf = () => { const d = World.map.d; return d.indoor ? 'indoor' : d.theme; };
  const baseTheme = t => (WALK[t] ? t : (THEMES[t] && THEMES[t].as) || t);
  // 身边几格之内有没有水
  function nearWater() {
    const m = World.map, p = World.p; if (!m || m.d.indoor) return false;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const x = p.x + dx, y = p.y + dy; if (m.inb(x, y) && m.g[m.I(x, y)] === GR.WATER) return true; }
    return false;
  }
  // 队伍里有没有人伤得重（气血不到四成）
  function hurtOne() {
    if (typeof calcStats !== 'function') return null;
    for (const m of S.party) { const st = calcStats(m); if (m.hp > 0 && m.hp < st.mhp * 0.4) return m; }
    return null;
  }
  // 这种场合可用的台词段：按“越贴切的越靠前”排好的几个池子
  function pools(kind) {
    if (kind === 'walk') {
      const out = [];
      if (hurtOne()) out.push(WALK.hurt);
      if (nearWater()) out.push(WALK.water);
      const t = baseTheme(themeOf()), first = Math.random() < 0.45;   // 四成多的机会，先说跟着关系档走的那些话
      if (first) out.push(WALK.heart);
      if (WALK[t]) out.push(WALK[t]);
      if (!first) out.push(WALK.heart);
      out.push(WALK.any);
      return out;
    }
    if (kind === 'enter') { const d = World.map.d, t = baseTheme(d.theme); return [ENTER[d.indoor ? 'indoor' : World.map.id] || [], ENTER.any, d.indoor ? [] : (WALK[t] || []), d.indoor ? [] : WALK.any]; }
    return [EVENT[kind] || []];
  }
  const parse = e => e.filter(x => typeof x === 'string').map(s => { const i = s.indexOf(':'); return { who: s.slice(0, i), text: s.slice(i + 1) }; });
  /* 谁同谁说话：每两个人之间聊的回数要一样多。
     队伍里每两个人算一对（四个人就是六对），各记聊过几回（S.banterN，随存档走）。每回闲聊先定“轮到哪一对”——聊得最少的那一对，
     一样少就随机挑一对——再从这种场合的台词里找这两个人之间的对话；这种场合没有他俩的话，就用不分场合的那些闲话（WALK.any 里每一对都备了几段）。
     于是不管台词表里谁的戏多，六对之间聊的回数最多只差一回。
     轮到的这一对，多数时候是两人一来一往的对话；也可能是其中一人对着另一人说的一句（看见什么、到了哪儿的一句感叹），同样算这一对的一回。 */
  const pairKey = (a, b) => (a < b ? a + '+' + b : b + '+' + a);
  const speakers = e => { const s = []; for (const l of parse(e)) if (s.indexOf(l.who) < 0) s.push(l.who); return s; };
  function order(ids) {
    const N = (S.banterN = S.banterN || {}), out = [];
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) { const k = pairKey(ids[i], ids[j]); out.push({ p: [ids[i], ids[j]], k, n: N[k] || 0, r: Math.random() }); }
    return out.sort((a, b) => a.n - b.n || a.r - b.r);
  }
  const bump = k => { const N = (S.banterN = S.banterN || {}); N[k] = (N[k] || 0) + 1; };
  // 从几个池子里挑一段：近期没说过的优先；贴切的池子优先（七成的机会先从最贴切的里挑）
  function chooseFrom(ps) {
    const all = [].concat.apply([], ps);
    let fresh = all.filter(e => recent.indexOf(e) < 0);
    if (!fresh.length) { recent = recent.filter(e => all.indexOf(e) < 0); fresh = all; }
    const first = ps[0].filter(e => fresh.indexOf(e) >= 0);
    const from = first.length && (ps.length === 1 || Math.random() < 0.7) ? first : fresh;
    const e = from[Math.floor(Math.random() * from.length)];
    recent.push(e); if (recent.length > 24) recent.shift();
    return e;
  }
  // 挑一段：条件满足、说话的人都在队里。want 指定先试哪一对（AI 没回话、改用现成台词时，沿用它那一回定好的那一对）
  function pick(kind, want) {
    const ids = party(), ok = e => { const c = typeof e[0] === 'function' ? e[0] : null; if (c && !c()) return false; const L = parse(e); return L.length > 0 && L.every(l => ids.indexOf(l.who) >= 0); };
    const src = pools(kind), ps = src.map(p => p.filter(ok)), spare = WALK.any.filter(ok);
    let ord = ids.length > 1 ? order(ids) : [];
    if (want) ord = ord.filter(o => o.k === want).concat(ord.filter(o => o.k !== want));
    for (const o of ord) {
      // 这一对能说的：两个人之间的对话；或者其中一人对着另一人说的一句（跟着关系档走的那些单句是说给云澈听的，这一对里得有云澈）
      const both = e => { const s = speakers(e); return s.length === 2 && s.indexOf(o.p[0]) >= 0 && s.indexOf(o.p[1]) >= 0; };
      const one = (e, heart) => { const s = speakers(e); return s.length === 1 && o.p.indexOf(s[0]) >= 0 && (!heart || (s[0] !== 'hero' && o.p.indexOf('hero') >= 0)); };
      const talk = ps.map(p => p.filter(both)).filter(p => p.length), mixed = ps.map((p, i) => p.filter(e => both(e) || one(e, src[i] === WALK.heart))).filter(p => p.length);
      let cand = talk.length && (mixed.length === talk.length && mixed.every((p, i) => p.length === talk[i].length) || Math.random() < 0.65) ? talk : mixed;   // 有对话时，六成五的机会只挑对话
      // 这种场合没有他俩的对话：一半的机会说一句应景的单句，一半的机会改说不分场合的闲话（那是一来一往的）
      const any2 = [spare.filter(both)].filter(p => p.length);
      if (!talk.length && any2.length && (!cand.length || Math.random() < 0.5)) cand = any2;
      if (!cand.length) continue;
      const L = parse(chooseFrom(cand)); bump(o.k); L.pair = o.k;
      return L;
    }
    const solo = ps.filter(p => p.length);   // 一对也凑不出来（比如只有主角一个人）：说一句单人的
    return solo.length ? parse(chooseFrom(solo)) : null;
  }
  // 交给 AI 的那句“眼下的处境”
  function describe(kind, info) {
    const m = World.map, d = m.d, where = d.name + (d.sub ? '（' + d.sub + '）' : ''), h = hurtOne();
    const env = (d.indoor ? '屋里点着灯。' : '') + (World.night ? '此刻是夜里，街上没什么行人，只有窗里的灯和路边的灯笼亮着。' : '') + (!d.indoor && nearWater() ? '身旁就是水边。' : '') +
      (h ? (h.id === 'hero' ? S.name : CHARS[h.id].name) + '身上带着不轻的伤。' : '');
    switch (kind) {
      case 'walk': return '一行人正走在' + where + '。' + env + '没有什么大事，只是赶路时随口聊两句眼前的景物、彼此的习惯或接下来的打算。';
      case 'enter': return '一行人刚走到' + where + '。' + env;
      case 'win': case 'bosswin': return '一行人刚在' + where + '打赢了一场，对手是' + (info && info.names || '几个对手') + (kind === 'bosswin' ? '，是一场恶战。' : '。') + env;
      case 'hurt': return '一行人刚在' + where + '打赢了一场，对手是' + (info && info.names || '几个对手') + '，可是有人伤得不轻。' + env;
      case 'levelup': return '一行人刚在' + where + '打赢了一场，有人觉得自己的功夫又长进了一些。' + env;
      case 'flee': return '一行人刚从一场打不过（或不想打）的遭遇里脱身，退了回来。' + env;
      case 'night': return '一行人正在' + where + '，天黑了下来，城里家家掌起了灯，街上的人都回屋了。';
      case 'dawn': return '一行人正在' + where + '，天亮了，街上又有了人声。';
      case 'chest': return '一行人在' + where + '找到并打开了一只没人要的箱子，得了些东西。' + env;
      case 'spring': return '一行人在' + where + '的一眼灵泉边歇了歇，喝了泉水，伤和乏都消了。' + env;
      case 'shop': return '一行人刚在' + where + '的铺子里添置了些东西，花了些银钱。' + env;
    }
    return '一行人正在' + where + '。' + env;
  }
  async function fire(kind, info) {
    try {
      if (!S || !World.map || G.autoSkip || party().length < 2) return false;
      const now = B.clock();
      if (now - last < (kind === 'walk' ? GAP_WALK : GAP_EVENT)) return false;
      if (Math.random() > (CHANCE[kind] == null ? 0.6 : CHANCE[kind])) return false;
      if (World.map.d.indoor && kind === 'enter' && Math.random() > 0.35) return false;   // 进屋不必回回都有人说话
      last = now; steps = 0; need = 24 + Math.floor(Math.random() * 30);
      if (B.log) B.log(kind);
      // 先定这一回轮到哪两个人；开了 AI 就让它写这两个人之间的话，说成了记一回；没说成，现成台词也先找这一对的
      const turn = order(party())[0];
      if (typeof AI !== 'undefined' && AI.on && await AI.banter(describe(kind, info), true, turn.p)) { bump(turn.k); return true; }
      const L = pick(kind, turn.k);
      if (!L || G.scene !== 'world') return false;
      UI.banter(L); return true;
    } catch (e) { console.warn(e); return false; }
  }
  // 每走一格调用一次：走够了一段路、离上一回闲聊也够久了，就聊一回
  function step() {
    steps++;
    if (steps < need || G.busy || World.map.d.indoor) return;
    if (B.clock() - last < GAP_WALK) return;
    fire('walk');
  }
  B.fire = fire; B.step = step; B.pick = pick; B.describe = describe; B.order = order;
  B.reset = () => { last = -1e9; steps = 0; recent = []; };
  B.count = () => { const n = o => Object.keys(o).reduce((s, k) => s + o[k].length, 0); return { walk: n(WALK), enter: n(ENTER), event: n(EVENT) }; };
  B.all = () => ({ WALK, ENTER, EVENT });
  return B;
})();
