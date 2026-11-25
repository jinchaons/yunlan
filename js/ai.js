'use strict';
/* ============ AI 人物：与 NPC 自由交谈、同伴之间的随口闲聊 ============
   接法只有一种——直连：在游戏里的“AI 设置”填接口地址、模型和密钥（LiteLLM 网关、OpenAI、DeepSeek、Google Gemini、OpenRouter
   或任何 OpenAI 兼容接口），网页直接请求对方的 /chat/completions。密钥只存在本机浏览器里，只发往所填的地址。
   没有配置、或接口不通时，人物照旧说固定台词。
   原则：AI 只负责“说什么”，不改任何游戏数据；请求失败或超时一律静默退回固定台词。 */
const AI = (() => {
  const st = { on: false, model: '', mode: '' };

  /* ---------- 接入配置（存在浏览器本地，与存档分开） ---------- */
  const PROVIDERS = [
    { id: 'litellm', n: 'LiteLLM 网关', ph: 'https://你的网关地址/v1' },
    { id: 'openai', n: 'OpenAI', base: 'https://api.openai.com/v1', model: 'gpt-5-mini' },
    { id: 'deepseek', n: 'DeepSeek', base: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
    // 以下两家都是 OpenAI 兼容接口，且允许网页直接访问（双击 index.html 打开也能用）。tip 是选中时给玩家看的一句提示
    { id: 'gemini', n: 'Google Gemini', base: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-4-hydrogen', tip: '密钥在 Google AI Studio 申请。模型名可点“获取列表”挑选，带 flash 字样的通常更快、更省。' },
    { id: 'openrouter', n: 'OpenRouter', base: 'https://openrouter.ai/api/v1', model: 'openai/gpt-5.2', tip: '密钥在 openrouter.ai 申请。模型名要带厂商前缀（例如 openai/gpt-5.2），可点“获取列表”挑选。' },
    { id: 'custom', n: '其他（OpenAI 兼容接口）', ph: 'https://接口地址/v1' }
  ];
  const CFG_KEY = 'yunlan_ai';
  // on：总开关；prov：接入方式；keep：是否把密钥记在这台电脑的浏览器里（否则只留到关闭这个标签页）
  const cfg = { on: true, prov: '', base: '', model: '', key: '', keep: true };
  try {
    const o = JSON.parse(localStorage.getItem(CFG_KEY)) || {};
    cfg.on = o.on !== false; cfg.keep = o.keep !== false;
    for (const k of ['prov', 'base', 'model', 'key']) if (typeof o[k] === 'string') cfg[k] = o[k];
    if (!cfg.keep) cfg.key = sessionStorage.getItem(CFG_KEY) || '';
  } catch (e) { }
  function store() {
    const o = { on: cfg.on, prov: cfg.prov, base: cfg.base, model: cfg.model, keep: cfg.keep }; if (cfg.keep) o.key = cfg.key;
    try { localStorage.setItem(CFG_KEY, JSON.stringify(o)); } catch (e) { }
    try { if (cfg.keep || !cfg.key) sessionStorage.removeItem(CFG_KEY); else sessionStorage.setItem(CFG_KEY, cfg.key); } catch (e) { }
  }
  // 把填写的地址整理成接口根地址：补 https://，去掉末尾的 / 和 /chat/completions；只写了域名的补上 /v1
  function apiBase(b) {
    b = String(b || '').trim().replace(/\/+$/, '').replace(/\/chat\/completions$/i, '');
    if (b && !/^[a-z][a-z0-9+.\-]*:\/\//i.test(b)) b = 'https://' + b;
    try { const u = new URL(b); if (!/^https?:$/.test(u.protocol)) return ''; return u.pathname === '/' || u.pathname === '' ? u.origin + '/v1' : b; } catch (e) { return ''; }
  }
  const hostOf = b => { try { return new URL(apiBase(b)); } catch (e) { return null; } };
  const isLocal = b => { const u = hostOf(b); return !!u && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(u.hostname); };   // 本机上的模型服务可以不要密钥
  const sameHost = (a, b) => { const x = hostOf(a), y = hostOf(b); return !!x && !!y && x.origin === y.origin; };
  // 已存的密钥只认原来的那个地址：换了地址就必须重新填，免得把甲家的密钥发给乙家
  const keyFor = d => (d.key || '').trim() || (sameHost(d.base, cfg.base) ? cfg.key : '');
  // 设置面板里的一份填写内容 → 实际发请求用的配置
  const resolve = d => ({ mode: 'direct', base: apiBase(d.base), model: (d.model || '').trim(), key: keyFor(d) });
  const lack = c => (!c.base ? '请填写接口地址，例如 https://api.deepseek.com/v1' : !c.model ? '请填写模型名。' : !c.key && !isLocal(c.base) ? '请填写 API Key。' : '');
  function refresh() {
    const c = resolve(cfg);
    st.mode = cfg.on && !lack(c) ? 'direct' : '';
    st.on = !!st.mode; st.model = st.on ? c.model : '';
    paint();
  }
  const label = () => (st.on ? '已开启' : cfg.on ? '未配置' : '已关闭');
  // 标题画面底部用中文标出 AI 人物的状态
  function paint() { const e = document.getElementById('t-ai'); if (e) e.textContent = '　·　AI 人物：' + label(); }
  const ready = Promise.resolve();   // 配置都在本机，不必等谁；留着这个名字是因为别处在等它（await AI.ready）
  refresh();

  /* ---------- 发请求 ---------- */
  const noEffort = {};   // “地址|模型” → 1：这个模型不收 reasoning_effort（只对 Gemini 试）
  const flavor = {};   // “地址|模型” → 1：这个模型只收 max_completion_tokens、不收 temperature（较新的推理模型），记下来免得每次多试一回
  const redact = (s, key) => { s = String(s); if (key) s = s.split(key).join('***'); return s.replace(/\b(sk|pk|key)-[A-Za-z0-9_\-.]{6,}/g, '$1-***'); };
  async function send(c, path, body, signal) {
    const h = {}; if (body) h['Content-Type'] = 'application/json'; if (c.key) h.Authorization = 'Bearer ' + c.key;
    const r = await fetch(c.base + path, { method: body ? 'POST' : 'GET', headers: h, body: body ? JSON.stringify(body) : undefined, signal, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
    const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) { }
    return { code: r.status, t, j };
  }
  const why = (r, c) => {
    const e = r.j && r.j.error, m = e ? (typeof e === 'string' ? e : e.message || '') : '';
    const head = r.code === 401 || r.code === 403 ? '密钥无效或没有权限' : r.code === 404 ? '接口地址或模型名不对' : r.code === 429 ? '请求太频繁，或额度已用完' : r.code >= 500 ? '对方服务暂时不可用' : '请求被拒绝';
    return head + '（' + r.code + (m ? '：' + redact(m, c.key).slice(0, 160) : '') + '）';
  };
  const textOf = j => { try { let c = j.choices[0].message.content; if (Array.isArray(c)) c = c.map(p => (p && p.text) || '').join(''); return String(c || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim(); } catch (e) { return ''; } };
  async function direct(c, system, messages, max, temp, signal) {
    const msgs = [{ role: 'system', content: String(system) }].concat(messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content) })));
    // Gemini 较新的模型关不掉“思考”，思考用掉的字数也算在额度里：把思考压到最低一档、额度放宽四倍，免得话没说出口额度先用完。
    // 对方不认这个参数时（400）去掉再问一次，并记下来
    const hu = hostOf(c.base), gem = !!hu && /(^|\.)generativelanguage\.googleapis\.com$/.test(hu.hostname);
    const fk = c.base + '|' + c.model, body = n => {
      if (flavor[fk]) return { model: c.model, messages: msgs, max_completion_tokens: n * 6 };
      const b = { model: c.model, messages: msgs, max_tokens: gem ? n * 4 : n, temperature: temp };
      if (gem && !noEffort[fk]) b.reasoning_effort = 'low';
      return b;
    };
    let r = await send(c, '/chat/completions', body(max), signal);
    if (r.code === 400 && gem && !noEffort[fk] && /reasoning/i.test(r.t)) { noEffort[fk] = 1; r = await send(c, '/chat/completions', body(max), signal); }
    if (r.code === 400 && !flavor[fk] && /max_completion_tokens|temperature/.test(r.t)) { flavor[fk] = 1; r = await send(c, '/chat/completions', body(max), signal); }
    if (r.code !== 200) return { err: why(r, c) };
    if (!r.j || !r.j.choices) return { err: '对方返回的不是预期的格式，请检查接口地址。' };
    let text = textOf(r.j);
    // 模型把额度全花在自己的推理上、一个字没写：放宽额度再问一次
    if (!text && r.j.choices[0] && r.j.choices[0].finish_reason === 'length') { r = await send(c, '/chat/completions', body(max * 3), signal); if (r.code === 200) text = textOf(r.j); }
    return text ? { text } : { err: '模型没有返回内容。' };
  }
  // 返回 { text } 或 { err }（err 是给玩家看的中文原因）
  async function request(c, kind, system, messages, opt) {
    opt = opt || {};
    const max = Math.max(16, Math.min(1500, opt.max || 300)), temp = Math.max(0, Math.min(1.2, opt.temp == null ? 0.9 : opt.temp));
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), opt.timeout || 25000);
    try {
      return await direct(c, system, messages, max, temp, ctl.signal);
    } catch (e) {
      return { err: e && e.name === 'AbortError' ? '等待超时，对方没有回应。' : '连不上接口：地址有误、网络不通，或对方不允许网页直接访问。' };
    } finally { clearTimeout(timer); }
  }
  // kind：'talk' | 'banter' | 'boss' | 'event'（只用于日志和测试）。返回回复文本，失败返回 null
  async function chat(kind, system, messages, opt) {
    if (!st.on) return null;
    const r = await request(resolve(cfg), kind, system, messages, opt);
    if (r.err) console.warn('AI: ' + r.err);
    return r.text || null;
  }

  /* ---------- 给设置面板用 ---------- */
  // 当前配置（不含密钥本身，只给出有没有、末四位）
  const config = () => ({ on: cfg.on, prov: cfg.prov || 'litellm', base: cfg.base, model: cfg.model, keep: cfg.keep, mode: st.mode, label: label() });
  const keyTail = base => (cfg.key && sameHost(base, cfg.base) ? cfg.key.slice(-4) : '');
  function setOn(on) { cfg.on = !!on; store(); refresh(); }
  // 保存一份填写内容；有缺项时不保存，返回 { err }
  function save(d) {
    const c = resolve(d), e = lack(c); if (e) return { err: e };
    cfg.prov = d.prov; cfg.keep = d.keep !== false;
    cfg.key = c.key; cfg.base = c.base; cfg.model = c.model;
    store(); refresh(); return { ok: true };
  }
  function forget() { cfg.key = ''; store(); refresh(); }
  function reset() { Object.assign(cfg, { on: true, prov: '', base: '', model: '', key: '', keep: true }); try { localStorage.removeItem(CFG_KEY); sessionStorage.removeItem(CFG_KEY); } catch (e) { } refresh(); }
  // 用一份填写内容（不必先保存）真的问模型一句，看通不通
  async function test(d) {
    const c = resolve(d), e = lack(c); if (e) return { err: e };
    const t0 = performance.now(), r = await request(c, 'talk', '这是一次连通性测试。请只用简体中文回答。', [{ role: 'user', content: '少侠说：请只回答“收到”两个字。' }], { max: 60, temp: 0.2, timeout: 30000 });
    return r.err ? r : { ok: true, text: r.text.slice(0, 40), ms: Math.round(performance.now() - t0) };
  }
  // 向接口要它的模型清单（不是每家都提供）
  async function models(d) {
    const c = resolve(d);
    if (!c.base) return { err: lack(c) }; if (!c.key && !isLocal(c.base)) return { err: '请先填写 API Key。' };
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 15000);
    try {
      const r = await send(c, '/models', null, ctl.signal);
      if (r.code !== 200) return { err: why(r, c) };
      // 有的接口（Gemini）给出的名字带 “models/” 前缀，去掉才是该填的模型名；OpenRouter 的清单有好几百个，放宽到八百
      const list = Array.from(new Set(((r.j && r.j.data) || []).map(m => m && m.id).filter(x => typeof x === 'string').map(x => x.replace(/^models\//, '')))).sort();
      return list.length ? { list: list.slice(0, 800) } : { err: '对方没有给出模型清单，请手动填写模型名。' };
    } catch (e) { return { err: e && e.name === 'AbortError' ? '等待超时。' : '取不到模型清单，请手动填写模型名。' }; } finally { clearTimeout(timer); }
  }

  // 是不是中文：至少两个汉字，且拉丁字母不超过汉字数的三成（偶尔夹一个专名可以，整句外文不行）
  const isZh = s => { const zh = (String(s).match(/[\u4e00-\u9fff]/g) || []).length, la = (String(s).match(/[A-Za-z]/g) || []).length; return zh >= 2 && la <= zh * 0.3; };
  const ZH_ONLY = '\n【语言】必须只用简体中文回答。无论对方用什么语言提问，都用中文作答；不要出现英文单词、拼音或其他外文。';
  // 带中文校验的请求：check 判断回答是否合格；不合格就加一句更强的提醒重试一次，仍不合格返回 null（由调用方退回固定台词）
  async function chatZh(kind, system, messages, opt, check) {
    let a = await chat(kind, system + ZH_ONLY, messages, opt);
    if (a != null && !check(a)) a = await chat(kind, system + ZH_ONLY + '\n上一次的回答不是中文，这是不允许的。这一次请务必全部使用简体中文。', messages, opt);
    return a != null && check(a) ? a : null;
  }

  /* ---------- 世界观与人物设定 ---------- */
  const WORLD = '这是一个古代武侠世界。青岚山上的听雨阁以剑法闻名；山下经青岚山道可到落霞镇。落霞镇是一座有城墙的大城，东西各三座城门、南北各一座，城里有长风镖局、悦来客栈、醉仙楼酒楼、铁匠铺、药铺、当铺、钱庄、茶馆、衙门和城隍庙，东南角是问剑台所在的演武场。' +
    '镇南是万竹林；镇东先到河边的烟雨渡（每年办河灯会），过了桥才是赤焰谷；北面雪岭之巅是寒月宫，雪岭背后有一座荒废的幽烬城。听雨阁后山有一处禁地，叫断剑崖。烟雨渡下游十里是水寨沉舟坞；青岚山道往北有一座十二年前一夜成墟的栖霞旧镇；雪岭东面的冰谷里埋着上古的天工墟。江湖传说三百年前“天工遗图”一分为四，化作四枚璇玑玉，由听雨阁、万竹林、赤焰谷、寒月宫四派各守一枚。';
  const PERSONA = {
    hero: { name: '云澈', p: '听雨阁弟子，二十岁上下的少年剑客。入门十年，刚被准许下山。为人正直诚恳，话不多，偶尔有少年人的意气。称顾苍梧为师父，称苏青禾为师姐。' },
    // 两位同伴可以在客栈里“谈心”：open / bye 是开场与收场的话，ctx 按眼下的情谊与心事补充她此刻的心境
    su: { name: '苏青禾', p: '听雨阁弟子，云澈的师姐，比他早入门两年。明快爽利，爱拌嘴、爱逗师弟，嘴上不饶人，其实处处护着他。使剑。十二年前故乡栖霞镇被毁，母亲林蘅死在那一夜，是师父把她从废墟里带回山上。称云澈“师弟”，气急了叫“臭小子”，只有极认真的时候才叫他的名字。',
      open: () => HEART_OPEN.su[heartTier('su')], bye: () => HEART_BYE.su[heartTier('su')],
      ctx: () => heartCtx('su', '栖霞旧镇的事', S.flags.oldDone ? (S.flags.q_su === 3 ? '你已经和云澈一起把娘的木梳葬在了老桃树下，把旧剑穗系在了他的剑上，这件心事了了。' : '你在栖霞旧镇亲手斩了照着你娘捏出来的“像”，从废墟里找回了她的木梳，还没有安葬，这件事一直压在心里。') : '') },
    bai: { name: '白芷', p: '万竹林的年轻医者，药王一脉的传人，百草翁的弟子。温和安静，说话轻声细语，三句不离药理和病人；看见有人受伤就坐不住。使银针和折扇。平时称云澈“云少侠”，称苏青禾“苏姑娘”，只有心里极近的时候才直呼“云澈”。',
      open: () => HEART_OPEN.bai[heartTier('bai')], bye: () => HEART_BYE.bai[heartTier('bai')],
      ctx: () => heartCtx('bai', '师父的药方', S.flags.dockDone ? (S.flags.q_bai === 3 ? '你已经采齐三味药，把师父留下的半张药方补全了，还把一枚忘忧草香囊给了云澈，这件心事了了。' : '你在沉舟坞得到师父留下的半张药方，背面写着“丫头，莫来寻我”，你想替他把方子配全，还差几味药。') : '') },
    shi: { name: '石破军', p: '赤焰谷首徒，使一口厚背刀。直来直去，嗓门大，好胜，嫌人说话绕弯子；对认可的朋友极讲义气。称谷主烈千山为师父。' },
    gu: { name: '顾苍梧', p: '听雨阁阁主，云澈与苏青禾的师父，六十多岁，须发皆白。说话从容简练，爱用雨、茶、剑打比方；对弟子严而有慈。对幽烬盟主的来历心中有数，却不愿多谈，被问到只会叹息或岔开。',
      open: '坐吧。想问什么，便问。', bye: '去吧。山下风雨大，自己当心。',
      ctx: () => S.flags.cliffOpen ? '你已经把旧事对弟子说破：夜无殇本名顾无殇，是你的亲师兄；二十年前他爱上寒月宫圣女叶疏影，四派以圣女为阵眼送入归墟之门，是你亲手拦下了去救人的师兄，他在后山断剑崖折剑而去。这件事你愧疚了二十年。如今被问起，可以坦白地谈，语气沉痛而克制。' : '' },
    boatman: { name: '船家', p: '烟雨渡摆渡的老汉，五十多岁，戴斗笠，话不多却爱讲两句过来人的道理，熟悉河上的水情和每年灯会的规矩。称对方“后生”。',
      open: '后生，要问水路，还是问灯会？', bye: '慢走。过桥当心脚下。' },
    lampwoman: { name: '卖灯婆婆', p: '烟雨渡上卖了一辈子河灯的老婆婆，七十多岁，手巧，记性好，记得每一年来买灯的人；信“写下名字顺水漂过三座桥，来世还能遇上”的老话。自称“老婆子”，称对方“后生”。',
      open: '后生，买灯，还是听老婆子说说从前的灯会？', bye: '去吧。灯要趁亮着的时候放。',
      ctx: () => S.flags.lampTold ? '你已经认出那半盏烧焦的河灯：二十年前一个剑上系青穗的白衣后生和一个雪山来的姑娘一起买的，第二年后生独自回来，把灯烧了又伸手抢出来。你不知道他们的名字和后来的事。' : '你还没有见过那半盏烧焦的河灯，不要主动提起二十年前的事。' },
    tombkeeper: { name: '忠伯', p: '断剑崖的守冢老仆，七十岁上下，从前是顾无殇的剑童，主人折剑离去后独自守了二十年，每日照旧给崖顶热一份饭。寡言、固执、忠厚，提起“少爷”时语气总是很轻。自称“老奴”，称顾苍梧为“苍梧少爷”，称对方“小少爷”。',
      open: '小少爷想问什么？老奴知道的，都是些旧事了。', bye: '崖上风大，小少爷添件衣裳。' },
    innkeeper: { name: '柳掌柜', p: '落霞镇客栈的女掌柜，三十多岁，精明热络，嘴快，爱打听也爱传闲话，三句话不离生意。对江湖大事只知道客人嘴里听来的传闻，说不准真假。称对方“客官”。',
      open: '客官想聊点什么？这镇上的事，就没有小店不知道的。', bye: '客官慢走，常来啊！' },
    teller: { name: '说书先生', p: '落霞镇茶馆里的说书老人，六十岁上下，山羊胡，一把折扇。说话像说书，爱卖关子、爱讨茶钱，喜欢把传闻讲得半真半假。自称“老朽”，称对方“客官”。',
      open: '客官想听哪一段？先说好，茶钱另算。', bye: '欲知后事如何——客官下回请早。' },
    shen: { name: '沈长风', p: '落霞镇镖局的总镖头，四十多岁，走镖半生，沉稳豪爽，见多识广，与顾苍梧是旧交。熟悉各条山道和江湖规矩，说话直截了当，称对方“小兄弟”。',
      open: '小兄弟有话直说，镖局的人不兴绕弯子。', bye: '路上当心。有事尽管来镖局找我。' },
    disciple: { name: '小石头', p: '听雨阁最小的弟子，十二三岁，活泼话多，崇拜云澈师兄，爱显摆自己刚学会的东西，也爱打听山下的新鲜事。称对方“师兄”。',
      open: '师兄师兄！你要考我功课，还是给我讲山下的事？', bye: '师兄慢走！下回给我带糖葫芦！' },
    kid: { name: '阿豆', p: '落霞镇上七八岁的孩子，天真好动，一心想当大侠，说话颠三倒四，常把大人的话学得走样。称对方“大哥哥”。',
      open: '大哥哥，你的剑能借我摸一下吗？就一下！', bye: '大哥哥再见！我去帮阿娘打酱油啦！' },
    granny: { name: '孙婆婆', p: '落霞镇上的老婆婆，七十多岁，慈祥絮叨，信佛，爱念叨早年的事和镇上各家的长短，总担心年轻人吃不饱穿不暖。称对方“年轻人”。',
      open: '年轻人，坐下歇歇脚。老婆子耳朵背，你说话大点声。', bye: '去吧去吧，记得添件衣裳。' },
    woodman: { name: '樵夫', p: '在青岚山道上砍柴的中年汉子，老实本分，说话朴实，熟悉山里的路、天气和野兽出没的地方，怕山贼。称对方“小兄弟”。',
      open: '小兄弟想问路还是问山里的事？这山我砍了二十年柴了。', bye: '走好啊，天黑前可得下山。' },
    gatherer: { name: '采药老人', p: '常年在万竹林采药的老人，寡言谨慎，认得林中的草药和毒虫，敬重药王一脉和白芷姑娘。称对方“年轻人”。',
      open: '年轻人，想问草药，还是问这林子里的事？', bye: '林子里路滑，脚下留神。' },
    lie: { name: '烈千山', p: '赤焰谷谷主，石破军的师父，五十多岁，性如烈火，说话声如洪钟，护短，嘴硬心热；与寒月宫主有旧，提起来会不自在。称对方“小子”。',
      open: '小子，有屁快放。老夫炉子上还烧着铁。', bye: '滚吧滚吧。……路上别死了。' },
    smith: { name: '铁老三', p: '落霞镇的铁匠，五十岁上下，光头络腮胡，嗓门大、脾气倔，嘴上不饶人，手艺上却一丝不苟，最恨别人糟蹋兵刃。自称“老子”，称对方“小子”。',
      open: '有话快说，老子炉子上还烧着铁。', bye: '走走走，别挡着炉口。' },
    herb: { name: '杜大夫', p: '落霞镇药铺的大夫，五十多岁，清瘦温和，说话慢条斯理，三句不离医理和养生，见不得人讳疾忌医。自称“老朽”，称对方“少侠”。',
      open: '少侠哪里不适？还是想问问药理？', bye: '少侠慢走，记得按时服药。' },
    jin: { name: '金掌柜', p: '落霞镇醉仙楼的掌柜，四十多岁，圆脸微胖，见人三分笑，消息灵通却胆小怕事，爱夸自家的酒“落霞烧”。称对方“客官”或“少侠”。',
      open: '少侠想喝点什么？还是想听点什么？小店两样都有。', bye: '少侠慢走，下回来，酒管够！' },
    qian: { name: '钱朝奉', p: '落霞镇当铺的朝奉，六十岁上下，清瘦、谨慎、说话文绉绉，凡事讲规矩，眼力极好，看一眼便知东西的来历和成色。自称“小号”，称对方“少侠”。',
      open: '少侠是来当东西，还是来问事情？', bye: '少侠走好。小号的门，日落才关。',
      ctx: () => S.flags.q_pawn >= 1 ? '你的当铺丢过一块白玉佩：二十年前一个白衣后生来当的，说“等我从烟雨渡回来就赎”，再没回来；你的先师没忍心变卖。你不知道那后生是谁。' : '' },
    captain: { name: '秦捕头', p: '落霞镇衙门的捕头，三十多岁，干练寡言，公事公办，对江湖人既防备又敬重；手下人手不足，常为城里的治安发愁。自称“秦某”，称对方“少侠”。',
      open: '少侠有事？长话短说，秦某还要巡街。', bye: '城里莫要动刀。告辞。' },
    miaozhu: { name: '庙祝', p: '落霞镇城隍庙的老庙祝，七十多岁，慢条斯理，爱讲因果和签文，说话半文半白，从不把话说死。自称“老朽”，称对方“施主”。',
      open: '施主心里有事。说来听听，老朽替你问问城隍爷。', bye: '施主慢行。心诚则灵。' },
    huaniang: { name: '花娘', p: '落霞镇南巷卖花的妇人，三十岁上下，丈夫是镖师，走镖未归多年，独自带着女儿小满过活。温柔、要强，说起女儿就笑，说起丈夫就岔开话。称对方“少侠”。',
      open: '少侠坐。家里只有粗茶，别嫌弃。', bye: '少侠路上当心。' },
    keeper: { name: '莫问', p: '落霞镇问剑台的守台人，六十上下，来历不明，剑术眼光极高，说话慢条斯理，爱用反问点拨后辈，从不谈自己的过去。称对方“后生”。',
      open: '后生，想问剑，还是想问人？', bye: '去吧。剑上的事，台上见分晓。',
      ctx: () => '你守的问剑台共十二层，一层一拨对手，越往上越强；每逢三、六、九、十二层赠一枚问剑令。这位少侠目前已打过 ' + (S.tower || 0) + ' 层。有人问怎么过关，你只点拨思路（看清对手弱点、练好根基、备足丹药），不替人出手。' }
  };
  // 谈心时她此刻的心境：说话的口吻跟着眼下的情谊走（七档，见 story.js 的 heartTier / HEART_TONE），但不替她表白，也不许诺结局
  function heartCtx(id, topic, note) {
    const t = heartTier(id);
    return '此刻是在客栈里，夜深人静，只有你和云澈两个人说话。' + note +
      '\n【你此刻对云澈的口吻】你与他眼下的情分是“' + HEART_NAME[t] + '”。' + HEART_TONE[id][t] + '务必照这个远近和称呼说话，不要比这更亲，也不要比这更疏。' +
      '\n可以聊心事、聊过去、聊' + topic + '，也可以只是闲话。';
  }
  const lineOf = v => (typeof v === 'function' ? v() : v);
  const isHeart = who => (who === 'su' || who === 'bai') && typeof heartTier === 'function';
  // 眼下已经发生的事（按存档里的剧情标记拼出来），AI 只许谈这些，免得剧透
  function progress() {
    const F = S.flags, a = [];
    a.push(F.spar ? '云澈已被师父准许下山，带着一封信去落霞镇找镖局总镖头沈长风。' : '云澈还在听雨阁，尚未下山。');
    if (F.delivered) a.push('信已送到。沈长风说有一队黑衣人马直奔青岚山去了。');
    if (F.heifeng) a.push('云澈在山道上击败了拦路的山贼头目黑风，从他身上搜出一枚幽烬盟的令牌。');
    if (F.ch1) a.push('幽烬盟袭击了听雨阁，顾苍梧负伤，但青玉保住了。云澈和苏青禾奉命下山，要赶在幽烬盟之前找到另外三枚璇玑玉。');
    if (F.bambooDone) a.push('他们在万竹林深处除掉了千眼蛛母，救出白芷，白芷入队同行。');
    if (F.lantern && !F.ferryDone) a.push('他们在烟雨渡赶上了河灯会，幽烬盟的易容高手千面假扮同伴来骗玉，被识破后逃向栈桥。');
    if (F.ferryDone) a.push('他们在烟雨渡的栈桥上击败了千面。千面留下半盏烧焦的河灯，灯纸上写着“疏影”两个字，没有人知道那是谁。');
    if (F.lampTold) a.push('卖灯婆婆认出那盏灯是二十年前一个剑系青穗的白衣后生和一位雪山来的姑娘一同买的。');
    if (F.dockDone) a.push('他们顺流到了幽烬盟的水寨沉舟坞，击败寨主沉舟，救出几名被掳去熬药的郎中；百草翁已被带往雪岭背后的城里。白芷得到师父留下的半张药方，背面写着“丫头，莫来寻我”。');
    if (F.shiDuel) a.push('在赤焰谷，云澈与石破军比试了一场。');
    if (F.fireDone) a.push('他们击退了来夺赤玉的幽烬盟高手赤魇，石破军入队同行。江湖上已传开：幽烬盟的盟主叫夜无殇，二十年前是个有名的剑客。');
    if (F.cliffOpen) a.push('顾苍梧说出了真相：夜无殇本名顾无殇，是他的亲师兄；二十年前爱上寒月宫圣女叶疏影，圣女被四派送入归墟之门镇守封印，顾苍梧亲手拦下了去救人的师兄。夜无殇要开归墟之门，只是想把她接回来。');
    if (F.cliffDone) a.push('他们上了听雨阁后山的断剑崖，击散了夜无殇当年留下的白衣剑影。剑影最后一击，是苏青禾替云澈挡下的，她肩上受了伤，已无大碍。云澈带走了那柄刻着“无殇”的断剑，并悟出一式“一蓑烟雨”。');
    if (F.oldDone) a.push('他们去了青岚山道北面的栖霞旧镇——苏青禾的故乡，十二年前一夜成墟。废墟的雾里游荡着没有影子的“像”，其中一个是苏青禾母亲的模样；苏青禾亲手斩了它，从断梁下找回了母亲的桃木梳。');
    if (F.snowDone) a.push('他们在寒月宫击败了凌霜——她是叶疏影的弟子，为了接回师父才投了幽烬盟。冰封的弟子得救。' + (F.tgDone ? '' : '凌霜说，关门的法子在雪岭东面冰谷里的天工墟。'));
    if (F.tgDone) a.push('在天工墟，石碑上写着：归墟之门一旦打开，须有一人持“璇玑枢”入内，从里面合上，进去的人出不来——当年叶疏影是自己走进去的。他们击败守图铁俑，拿到了璇玑枢，但谁也不肯让别人去做那个进门的人。' + (F.cityDone ? '' : '眼下要穿过雪岭背后的幽烬城。'));
    if (F.cityDone) a.push('在幽烬城，守城的玄烛告诉他们：从归墟之门里回来的不是原来的人，只是照着念想捏出来的一个“像”；夜无殇明知如此，仍要开门。' + (F.gateOpen ? '' : '眼下只剩最后一步：到归墟之门前拦住他。'));
    if (F.gateOpen && !F.final) a.push('归墟门前，夜无殇败了，门却已经洞开，黑潮把他拖进了门里。他们决定走进门去——门里是照见人心的“心渊”。');
    // 情意只在到了“暗生在意”（第 2 档）之后才写进去；之前只是同行的师姐弟、同伴
    if (S.bond && !F.final && typeof heartTier === 'function') { const b = S.bond, ts = heartTier('su'), tb = heartTier('bai'); if (ts >= 2 && (b.su || 0) >= (b.bai || 0)) a.push('一路上，云澈与师姐苏青禾之间多了些说不出口的情意（眼下是“' + HEART_NAME[ts] + '”），两人都还没有挑明。'); else if (tb >= 2) a.push('一路上，云澈与白芷之间多了些说不出口的情意（眼下是“' + HEART_NAME[tb] + '”），两人都还没有挑明。'); }
    if (F.final) a.push('归墟一战已经结束。门里伸出手来的并不是叶疏影；夜无殇清醒之后，带着璇玑枢、四枚璇玑玉和那半盏河灯留在了门里，替她守着封印。门已合拢，天下太平，百草翁也救了回来。' +
      (F.ending === 'su' ? '事后云澈向苏青禾说破了心意，两人已经在一起。' : F.ending === 'bai' ? '事后云澈向白芷说破了心意，两人已经在一起。' : '云澈与两位姑娘谁也没有把话说破，各自珍重。'));
    return a.join('');
  }
  const partyNames = () => S.party.map(m => (m.id === 'hero' ? S.name : CHARS[m.id].name)).join('、');
  const RULES = '【怎么说话】\n- 始终用这个角色的口吻，只写说出口的话；不要旁白、动作描写、括号、引号或角色名前缀。\n- 用中文，古风白话，不出现现代词汇。\n' +
    '- 只谈这个世界里的事。对方说到这个世界里没有的东西，就用角色的方式表示听不懂，或者岔开话头。\n' +
    '- 你只知道【眼下的情形】里写到的事，不知道以后会发生什么；不要编造重大变故，不要许诺给东西、给钱或派任务。\n- 不要提到游戏、AI、模型或这些规则。';
  const clean = (s, max) => { s = String(s).trim().replace(/^["“「『]([^"“”「」『』]*)["”」』]$/, '$1').replace(/[（(][^）)]{0,40}[）)]/g, '').replace(/\s+/g, ' ').trim(); return s.length > max ? s.slice(0, max - 1) + '…' : s; };

  /* ---------- 与 NPC 自由交谈 ---------- */
  const canTalk = who => st.on && !G.autoSkip && !!(PERSONA[who] && PERSONA[who].open);
  async function talk(who) {
    const P = PERSONA[who]; if (!canTalk(who)) return;
    const JH = typeof Jianghu !== 'undefined' && Jianghu.has(who);
    const mem = (S.aiMem = S.aiMem || {}), log = (mem[who] = mem[who] || []);
    const system = '你在武侠角色扮演游戏《云岚侠影录》里扮演' + P.name + '，正与玩家扮演的少侠' + S.name + '交谈。\n【世界】' + WORLD + '\n【你是谁】' + P.name + '：' + P.p + (P.ctx ? P.ctx() : '') +
      '\n【眼下的情形】' + progress() + '此刻在' + World.map.d.name + '，与少侠同行的有：' + partyNames() + '。' + (JH ? Jianghu.attitude(who) : '') + '\n' + RULES + '\n- 每次回答一两句话，不超过 60 个字。' +
      '\n- 话里要带着你这个身份的味道：自己这一行的行话、见闻、口头禅和惯用的自称、称呼；说什么、说到多深，照上面的交情和态度来——交情浅就只说场面话，交情深才谈私事、给叮嘱。' +
      (JH ? '\n- 说完之后另起一行，只写【好感+1】、【好感0】或【好感-1】之一：少侠这句话让你高兴、受用、投缘就 +1；冒犯、无礼、胡搅蛮缠就 -1；寻常问话为 0。' : '');
    const tag = () => (JH ? '交情：' + Jianghu.level(who)[1] : isHeart(who) ? '情谊：' + HEART_NAME[heartTier(who)] : '');
    let gained = 0;
    UI.askOpen(who, lineOf(P.open), tag());
    for (let n = 0; n < 20; n++) {
      const q = await UI.askInput();
      if (!q) break;
      UI.askSet('……', true);
      const msgs = [];
      for (const t of log.slice(-6)) { msgs.push({ role: 'user', content: '少侠说：' + t.q }); msgs.push({ role: 'assistant', content: t.a }); }
      msgs.push({ role: 'user', content: '少侠说：' + q });
      const a = await chatZh('talk', system, msgs, { max: 500 }, isZh);
      if (a == null) { UI.askSet(lineOf(P.bye), false, true); await new Promise(r => setTimeout(r, 1400)); break; }   // 接口不通：让角色自然收场
      // 取出末尾的好感标记；一次交谈里靠说话最多涨 3 点，免得刷好感
      const mk = /【好感\s*([+＋\-－]?)\s*(\d)】/.exec(a), d = mk ? (/[\-－]/.test(mk[1]) ? -1 : 1) * Math.min(1, +mk[2]) : 0;
      const text = clean(a.replace(/【好感[^】]*】/g, ''), 90);
      log.push({ q, a: text }); if (log.length > 12) log.splice(0, log.length - 12);
      if (JH && d && (d < 0 || gained < 3)) { if (d > 0) gained++; Jianghu.add(who, d, true); }
      UI.askSet(text, false, false, tag() + (d > 0 ? '　♥' : d < 0 ? '　✕' : ''));
    }
    UI.askClose();
  }

  /* ---------- 同伴闲聊：换地图、打完仗之后，队伍里的人随口说上一两句 ---------- */
  let lastBanter = -1e9;
  async function banter(event, force, pair) {
    // 返回有没有真的说出话来（Banter 据此决定要不要改用现成的台词）。
    // pair：这一回轮到哪两个人说话（banter.js 按“每两个人之间聊的回数一样多”定的）；给了就只写这两个人之间的对话
    if (!st.on || G.autoSkip || S.party.length < 2) return false;
    const now = performance.now();
    if (!force && (now - lastBanter < 75000 || Math.random() > 0.55)) return false;
    lastBanter = now;
    const all = S.party.map(m => m.id), ids = pair && pair.every(id => all.indexOf(id) >= 0) ? pair : all;
    // 两位姑娘眼下对云澈的口吻（跟着情谊走）也写进去，闲聊里的远近才对得上
    const cast = ids.map(id => id + '：' + (id === 'hero' ? S.name : PERSONA[id].name) + '。' + PERSONA[id].p + (isHeart(id) ? '眼下对云澈的口吻：' + HEART_SHORT[id][heartTier(id)] + '（' + HEART_NAME[heartTier(id)] + '）。' : '')).join('\n');
    const system = '你在为武侠角色扮演游戏《云岚侠影录》写队伍里几个人路上的随口闲聊。\n【世界】' + WORLD + '\n【队伍里的人】\n' + cast + '\n【眼下的情形】' + progress() +
      (ids.length < all.length ? '\n同行的还有' + all.filter(id => ids.indexOf(id) < 0).map(id => (id === 'hero' ? S.name : PERSONA[id].name)).join('、') + '，这一回他们不开口。' : '') +
      '\n【要求】\n- 根据刚发生的事，写' + (ids.length === 2 ? '这两个人之间的一小段对话：一人一句，互相接话、拌嘴都可以（至多三句）' : '一到两句闲聊，各由一个队员说出，要像这个人会说的话，可以互相接话、拌嘴') + '。\n- 每句不超过 36 个字，古风白话，不要旁白和动作描写。\n- 不要编造重大变故，不要剧透以后的事。\n' +
      '- 苏青禾、白芷同云澈说话（或说起他）时，远近、称呼、肯说到哪一步，必须同上面写的“眼下对云澈的口吻”一致：还生分的，不许亲昵、不许流露情意；已经亲近的，也不要退回客套。云澈回她的话，分寸与此相称。\n' +
      '- 只输出 JSON，不要别的任何文字：{"lines":[{"who":"队员代号","text":"说的话"}]}，who 只能是：' + ids.join('、') + '。';
    const parse = a => { try { const i = a.indexOf('{'), j = a.lastIndexOf('}'), L = JSON.parse(a.slice(i, j + 1)).lines; return Array.isArray(L) ? L.filter(l => l && ids.indexOf(l.who) >= 0 && typeof l.text === 'string' && l.text.trim()) : []; } catch (e) { return []; } };
    const a = await chatZh('banter', system, [{ role: 'user', content: '刚发生的事：' + event }], { max: 600, temp: 1.0 }, x => { const L = parse(x); return L.length > 0 && L.every(l => isZh(l.text)); });
    if (!a) return false;
    if (G.scene !== 'world') return true;   // 话是有了，只是场合已经过去（进了战斗、回了标题），不必再补一段
    const lines = parse(a).slice(0, ids.length === 2 ? 3 : 2).map(l => ({ who: l.who, text: clean(l.text, 44) }));
    if (lines.length) UI.banter(lines);
    return lines.length > 0;
  }

  /* ---------- 路遇奇事的文字：数值和结果由 jianghu.js 定好，这里只让 AI 写叙述和对白 ---------- */
  async function eventText(desc, fields, who) {
    if (!st.on || G.autoSkip) return null;
    const keys = ['intro'].concat(Object.keys(fields));
    const system = '你在为武侠角色扮演游戏《云岚侠影录》写一段“路遇奇事”的文字。\n【世界】' + WORLD + '\n【眼下的情形】' + progress() + '此刻一行人走在' + World.map.d.name + (World.map.d.sub ? '（' + World.map.d.sub + '）' : '') + '，同行的有：' + partyNames() + '。' +
      '\n【要求】\n- 古风白话，简洁有画面感，贴合此地的景物。\n- 标了【旁白】的写成第三人称叙述；其余是“' + who + '”亲口说的话，只写说出口的话，不要引号、括号和称谓前缀。\n- 每段不超过 45 个字。事情的经过和结果必须与说明一致，不要添加说明里没有的赠予、敌人或变故。\n' +
      '- 只输出 JSON，不要别的任何文字，键为：' + keys.join('、') + '。';
    const user = '事情：' + desc + '\n需要写的各段：\nintro：【旁白】少侠遇到这件事的开场，一两句\n' + Object.keys(fields).map(k => k + '：' + fields[k]).join('\n');
    const parse = a => { try { const o = JSON.parse(a.slice(a.indexOf('{'), a.lastIndexOf('}') + 1)), r = {}; for (const k of keys) { if (typeof o[k] !== 'string' || !isZh(o[k])) return null; r[k] = clean(o[k].replace(/【[^】]{0,8}】/g, ''), 70); } return r; } catch (e) { return null; } };
    const a = await chatZh('event', system, [{ role: 'user', content: user }], { max: 900, temp: 1.0 }, x => !!parse(x));
    return a ? parse(a) : null;
  }

  /* ---------- 首领战术：每回合由 AI 在首领自己的招式里挑一招、选目标，并说一句话 ---------- */
  const BOSSP = {
    su_spar: '听雨阁师姐苏青禾，与师弟切磋。出手轻快，点到为止，嘴上爱逗师弟。',
    heifeng: '山贼头目黑风，粗野蛮横，欺软怕硬。爱先拿气血最少的人开刀，占了上风就得意忘形。',
    tiebi: '黑风寨二当家铁臂熊，力大无脑，一心替大哥报仇。认准一个人往死里打，被打疼了会招呼手下鼓劲。',
    zhumu: { mute: 1, p: '千眼蛛母，没有人言，只凭本能捕食：先用毒和蛛丝困住猎物，再咬最虚弱的那个。' },
    zhangmu: { mute: 1, p: '瘴母，一团有了灵智的瘴气。耐心地消磨对手：先削弱防御、让人中毒，自己受伤了就聚瘴恢复。' },
    shi_duel: '赤焰谷首徒石破军，好胜直爽，正与来客比试。喜欢硬碰硬，专挑看起来最能打的那个下手，不屑偷袭弱者。',
    chiyan: '幽烬盟高手赤魇，暴躁狂傲，以烈焰压人。喜欢用范围招式烧遍全场，见谁在疗伤就先烧谁，残血时更加疯狂。',
    yanlong: { mute: 1, p: '熔岩蜥王，凶暴的巨兽。被谁打得最疼就扑向谁，暴怒时用裂地和喷吐横扫全场。' },
    qianmian: '幽烬盟的易容高手千面，女子，自称“妾身”，语气慵懒带笑，爱戏弄人。出手刁钻：先用毒雨和摄心术打乱阵脚，专挑会疗伤的人下手；自己吃紧了就换影脱身、提速周旋。',
    jianying: '断剑崖上的白衣剑影，是夜无殇二十岁时留下的剑意所化，不通人情，只认剑。话极少，偶尔喃喃一个名字“疏影”。剑路凌厉决绝：认准使剑的人反复强攻，气势上来便以旧雨横扫。',
    xuanzhu: '幽烬城的守城人玄烛，枯瘦老者，语气平静悲悯，像在替人守灵。打法稳重老辣：先封住对方出手最重的人，再以万烬焚烧全场；自己气血不足时续烛自守。',
    lingshuang: '寒月宫弟子凌霜，为接回师父叶疏影而投了幽烬盟，冷静孤傲，话极少。精于算计：先冰封最有威胁的人，再集中刺杀会疗伤的；处境不利时凝华自守。',
    langwang: { mute: 1, p: '雪狼王，狡猾的头狼。先撕裂防御最弱的猎物，带着狼群集中扑杀同一个目标。' },
    ye: '幽烬盟主夜无殇，二十年前出身听雨阁的剑客，为接回被送入归墟的爱人叶疏影而来，沉静、疲倦、极其耐心。出手老辣：看准对方的阵眼（疗伤者或输出最高的人）下手，偶尔对昔日同门的剑法流露一丝感慨。',
    moxiang: '归墟魔相，吞没了夜无殇的非人之物，声音空洞，言语像回声。无差别地毁灭一切：频繁用范围招式，残血时不计后果地强攻。',
    chenzhou: '沉舟坞的寨主沉舟，铁塔般的水匪头子，使一支铁桨，粗豪好赌，说话带江湖切口。打法凶蛮：先吆喝手下鼓劲，再抡桨横扫，瞅准站得靠前的人一桨拍晕。',
    chaoying: '栖霞旧镇雾里的人影，是归墟照着苏青禾的念想捏出来的“她娘”，语气温柔，只会反复说几句家常话（唤“禾儿”、叫人回家吃饭）。专挑心神不稳的人下手，先“唤归”削弱一人，再以黑潮漫卷全场。',
    tgguard: '天工墟的守图铁俑，三百年前的机关造物，说话一字一顿、断断续续。按部就班：先锁枢自守，再以千钧重击出手最重的人，隔几回合轮转一次扫遍全场。',
    xx_su: '心渊里照着云澈的念想捏出来的“苏青禾”，语气温柔顺从，句句说的都是他想听的话，这恰恰不像真的她。剑路与苏青禾一模一样，专攻云澈。',
    xx_bai: '心渊里照着云澈的念想捏出来的“白芷”，轻声细语，许诺“再也没有人受伤”。以毒雨和噬魂消磨对手，自己受伤了就“如你所愿”地恢复，专攻云澈。',
    xx_hero: '心渊里的“少年云澈”，十岁刚上山时的模样，天真执拗，只想留在不下雨、没有人会走的地方。使的是最基础的听雨剑法，认准如今的云澈不放。'
  };
  const skillLine = id => {
    const s = SKILLS[id], tg = { one: '单体', all: '全体', rand: '随机', self: '自身', allies: '己方全体' }[s.tgt] || s.tgt;
    let d = id + '：' + s.name + '（' + tg + (s.kind === 'atk' ? '攻击，威力 ' + s.pow + (s.hits > 1 ? '×' + s.hits : '') : s.kind === 'buff' ? '增益' : s.kind);
    if (s.st) d += '，' + Math.round((s.st.ch == null ? 1 : s.st.ch) * 100) + '% 使对方' + STATUS[s.st.id].n;
    if (s.buff) d += '，' + STATUS[s.buff.id].n + ' 三回合'; if (s.heal) d += '，回复自身气血';
    return d + '）';
  };
  const stText = u => Object.keys(u.status).map(k => STATUS[k].n).concat(u.guard ? ['防御中'] : []).join('、') || '无';
  // 返回 { id, target, say } 或 null（由战斗改用内置的随机出招）
  async function bossPlan(u, units, log) {
    if (!st.on || G.autoSkip) return null;
    const B = BOSSP[u.id], per = typeof B === 'string' ? B : B ? B.p : '一方强敌，出手果断。', mute = !!(B && B.mute);
    const ids = (u.ai || [['attack', 1]]).map(a => a[0]), foes = units.filter(x => x.side === 0 && x.hp > 0), pals = units.filter(x => x.side === 1 && x !== u && x.hp > 0);
    const system = '你在武侠回合制角色扮演游戏《云岚侠影录》里扮演首领“' + u.name + '”，决定它这一回合怎么出手。\n【性格与战法】' + per +
      '\n【你的招式】\n' + ids.map(skillLine).join('\n') + '\n【规则】对方“防御中”时受到的伤害减半；对方有人“嘲讽”时，单体招式只能打他；已经在身上的增益不要重复施放；对方被眩晕或冰封时会停手一回合。' +
      '\n【输出】只输出 JSON，不要别的任何文字：{"skill":"招式代号","target":"对手代号","say":"出手时说的话"}。\n- skill 只能是上面列出的代号。\n- target 只在单体攻击时填，只能是：' + foes.map(f => f.id).join('、') + '；其余招式填空字符串。\n' +
      (mute ? '- say 一律填空字符串（它不会说人话）。' : '- say 是它出手时说的一句话，符合性格，不超过 16 个字，不要引号和括号；大约每两回合说一句，其余回合填空字符串。');
    const user = '【你】' + u.name + '：气血 ' + Math.round(u.hp / u.mhp * 100) + '%' + (u.enraged ? '（已狂怒）' : '') + '，状态：' + stText(u) + (pals.length ? '；手下还有：' + pals.map(p => p.name).join('、') : '') +
      '\n【对手】\n' + foes.map(f => f.id + '：' + (f.id === 'hero' ? S.name : f.name) + '，气血 ' + Math.round(f.hp / f.mhp * 100) + '%（' + f.hp + '），状态：' + stText(f) + (f.skills.indexOf('b1') >= 0 ? '，会疗伤' : '') + (f.rage >= 100 ? '，绝招已蓄满' : '')).join('\n') +
      (log && log.length ? '\n【刚才发生的事】\n' + log.slice(-5).join('\n') : '') + '\n现在轮到你出手。';
    const parse = a => { try { const o = JSON.parse(a.slice(a.indexOf('{'), a.lastIndexOf('}') + 1)); if (ids.indexOf(o.skill) < 0) return null; const say = mute || typeof o.say !== 'string' ? '' : clean(o.say, 22); return { id: o.skill, target: foes.find(f => f.id === o.target) || null, say: say && isZh(say) ? say : '' }; } catch (e) { return null; } };
    const a = await chatZh('boss', system, [{ role: 'user', content: user }], { max: 500, temp: 0.8, timeout: 8000 }, x => !!parse(x));
    return a ? parse(a) : null;
  }

  /* ---------- 结局手书：按这一路的经过，替她（或替云澈自己）写一封短信；写不出来就由调用方用固定的那封 ---------- */
  async function letter(ending, facts) {
    if (!st.on || G.autoSkip) return null;
    const who = ending === 'su' ? PERSONA.su : ending === 'bai' ? PERSONA.bai : PERSONA.hero;
    const system = '你在为武侠角色扮演游戏《云岚侠影录》的结局写一封很短的手书。\n【世界】' + WORLD + '\n【写信的人】' + who.name + '：' + who.p + '\n【眼下的情形】' + progress() +
      '\n【这一路上的事】' + (facts.length ? facts.join('；') + '。' : '一路同行，没有特别要提的事。') +
      '\n【要求】\n- ' + (ending === 'solo' ? '这是云澈写给苏青禾和白芷、最后没有寄出的信，克制，有未说出口的话。' : '这是' + who.name + '在两人相守之后，留给云澈的一张日常的字条或短信，语气要像她本人，不要肉麻。') +
      '\n- 从【这一路上的事】里挑一两件自然地带一笔，不要罗列。\n- 古风白话，四到六行，每行不超过 28 个字；第一行是称呼，最后一行只写落款的名字。\n- 只输出 JSON，不要别的任何文字：{"lines":["第一行","第二行"]}';
    const parse = a => { try { const L = JSON.parse(a.slice(a.indexOf('{'), a.lastIndexOf('}') + 1)).lines; return Array.isArray(L) && L.length >= 3 && L.length <= 7 && L.every(x => typeof x === 'string' && x.trim() && x.length <= 40) ? L.map(x => clean(x, 40)) : null; } catch (e) { return null; } };
    const a = await chatZh('event', system, [{ role: 'user', content: '请写这封手书。' }], { max: 700, temp: 0.9, timeout: 20000 }, x => { const L = parse(x); return !!L && L.every(isZh); });
    return a ? parse(a) : null;
  }

  return { ready, state: st, chat, canTalk, talk, banter, eventText, bossPlan, letter, get on() { return st.on; },
    personaOf: who => { const P = PERSONA[who]; return P ? { name: P.name, open: lineOf(P.open), bye: lineOf(P.bye), ctx: P.ctx ? P.ctx() : '' } : null; },   // 开发检视：这个人物此刻的开场白、收场白和心境说明
    providers: () => PROVIDERS.slice(), config, keyTail, setOn, save, forget, reset, test, models, label, paint };
})();
