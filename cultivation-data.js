(function (root, factory) {
  var data = factory();
  if (typeof module === "object" && module.exports) module.exports = data;
  root.CultivationData = data;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var STATS = ["body", "insight", "spirit", "fortune", "heart"];
  var STAT_LABELS = { body: "根骨", insight: "悟性", spirit: "灵力", fortune: "福缘", heart: "道心" };

  var TALENTS = [
    { id: "heaven-root", name: "天灵根", rarity: 5, desc: "吸灵气像火锅吸味，走到哪儿都很入味。", effects: { spirit: 4, insight: 1 } },
    { id: "five-roots", name: "五行杂灵根", rarity: 2, desc: "什么都会一点，突出一个菜单很长。", effects: { body: 1, insight: 1, spirit: 1, fortune: 1, heart: 1 } },
    { id: "sword-heart", name: "先天剑心", rarity: 4, desc: "拿扫帚也有剑意，保洁长老很欣慰。", effects: { insight: 3, heart: 2 }, tags: ["sword"] },
    { id: "iron-stomach", name: "百毒不侵胃", rarity: 3, desc: "丹药好不好另说，反正吃不坏。", effects: { body: 4 }, tags: ["alchemy"] },
    { id: "koi", name: "秘境锦鲤", rarity: 4, desc: "别人踩机关，你踩到前人遗产。", effects: { fortune: 4 } },
    { id: "social", name: "仙门社牛", rarity: 3, desc: "和护山神兽都能聊上两句。", effects: { fortune: 2, heart: 2 } },
    { id: "meditation", name: "坐忘达人", rarity: 3, desc: "发呆也算修炼，终于专业对口。", effects: { spirit: 2, heart: 3 } },
    { id: "body-sage", name: "铜皮铁骨", rarity: 4, desc: "渡劫前先问雷劫吃没吃饭。", effects: { body: 5 } },
    { id: "bookworm", name: "藏经阁钉子户", rarity: 3, desc: "管理员已经默认你住在第三排。", effects: { insight: 4 } },
    { id: "late-bloom", name: "大器晚成", rarity: 4, desc: "前十年像盆栽，后面可能是建木。", effects: { heart: 2 }, flags: ["lateBloom"] },
    { id: "rebirth", name: "残魂护道", rarity: 5, desc: "第一次走火入魔时，有个声音让你关机重启。", effects: { fortune: 1 }, flags: ["secondChance"] },
    { id: "frugal", name: "一块灵石掰两半", rarity: 2, desc: "穷不是缺点，是资源管理流派。", effects: { fortune: 2, spirit: 1 } },
    { id: "beast-friend", name: "灵兽亲和", rarity: 3, desc: "灵兽见你不咬，通常只蹭饭。", effects: { fortune: 2, body: 2 }, tags: ["beast"] },
    { id: "fire-vein", name: "赤炎灵脉", rarity: 4, desc: "炼丹自带灶火，冬天还省炭。", effects: { spirit: 3, body: 1 }, tags: ["alchemy"] },
    { id: "steady", name: "苟道直觉", rarity: 3, desc: "危险来临前，你的腿比神识先知道。", effects: { heart: 3, fortune: 2 }, flags: ["cautious"] },
    { id: "dream", name: "梦中悟道", rarity: 4, desc: "别人熬夜参悟，你睡出了正确答案。", effects: { insight: 3, spirit: 2 } }
  ];

  var PATHS = [
    { id: "sword", name: "问剑峰", desc: "一剑破万法，预算主要花在磨剑石。", primary: "insight", secondary: "heart" },
    { id: "alchemy", name: "丹鼎谷", desc: "把修仙做成可重复实验，偶尔也可重复爆炸。", primary: "spirit", secondary: "insight" },
    { id: "body", name: "金刚门", desc: "法宝会坏，肌肉一般不会申请报废。", primary: "body", secondary: "heart" },
    { id: "formation", name: "阵法院", desc: "打架前先布阵，主打一个让对手先读使用说明。", primary: "spirit", secondary: "fortune" },
    { id: "beast", name: "御兽山", desc: "团队协作，但队友经常掉毛。", primary: "fortune", secondary: "body" },
    { id: "wanderer", name: "散修逍遥", desc: "没有宗门月例，也没有宗门周会。", primary: "heart", secondary: "fortune" }
  ];

  var REALMS = [
    { id: "mortal", name: "凡身", need: 0 },
    { id: "qi", name: "炼气", need: 8 },
    { id: "foundation", name: "筑基", need: 22 },
    { id: "core", name: "金丹", need: 42 },
    { id: "nascent", name: "元婴", need: 68 },
    { id: "spirit", name: "化神", need: 98 },
    { id: "void", name: "炼虚", need: 150 },
    { id: "tribulation", name: "渡劫", need: 205 },
    { id: "immortal", name: "真仙", need: 410 }
  ];

  var EVENTS = [
    { id: "mist", text: "晨雾灵气浓得像粥，你勤快地多吸了两碗。", weight: 6, effects: { spirit: 2 }, progress: 5, tags: ["general"] },
    { id: "wrong-manual", text: "功法拿倒了三个月，意外练出了倒着运气的独门技巧。", weight: 4, effects: { insight: 2, heart: 1 }, progress: 3, tags: ["general"] },
    { id: "elder", text: "长老讲道时跑题两个时辰，跑到了你正好不懂的地方。", weight: 4, min: { heart: 5 }, effects: { insight: 2 }, progress: 6, tags: ["general"] },
    { id: "market", text: "坊市捡漏：摊主说是上古法器，你发现至少很适合压泡菜。", weight: 4, effects: { fortune: 2, spirit: -1 }, progress: 3, tags: ["general", "wanderer"] },
    { id: "sword-rain", text: "你在剑雨里悟出一式，衣服也悟出了很多洞。", weight: 4, min: { body: 5 }, effects: { insight: 2, body: -1 }, progress: 7, tags: ["sword"] },
    { id: "pill", text: "新丹方成功了，副作用只是说话暂时带回声。", weight: 4, effects: { spirit: 3, body: -1 }, progress: 7, tags: ["alchemy"] },
    { id: "waterfall", text: "瀑布下炼体半年，你和附近石头都变得更圆润。", weight: 4, effects: { body: 3, heart: 1 }, progress: 5, tags: ["body"] },
    { id: "printer", text: "阵纹一气呵成，宗门怀疑你私藏了打印机法宝。", weight: 4, effects: { spirit: 2, fortune: 1 }, progress: 6, tags: ["formation"] },
    { id: "cub", text: "灵兽幼崽认你作亲，主要因为你口袋里有肉干。", weight: 4, effects: { fortune: 3, body: 1 }, progress: 4, tags: ["beast"] },
    { id: "cave", text: "你在无名山洞闭关，出关才发现洞口写着“杂物间”。", weight: 4, effects: { heart: 2, insight: 1 }, progress: 6, tags: ["wanderer"] },
    { id: "auction", text: "拍卖会有人抬价，你冷静放手，省下灵石也省下一个仇家。", weight: 3, min: { heart: 8 }, effects: { heart: 2, fortune: 1 }, progress: 2, tags: ["general"] },
    { id: "secret", text: "秘境开启，你顺着“此路危险”的牌子找到了真正入口。", weight: 3, min: { fortune: 8 }, effects: { fortune: 2, spirit: 2 }, progress: 9, tags: ["general"] },
    { id: "demon", text: "心魔问你为何修仙，你答“先延寿再慢慢想”，它沉默了。", weight: 3, effects: { heart: 3, spirit: -2 }, progress: 4, tags: ["general"] },
    { id: "thunder", text: "天雷劈歪了半尺，你与旁边的树都松了口气。", weight: 2, min: { spirit: 12 }, effects: { body: -2, heart: 2 }, progress: 10, tags: ["general"] },
    { id: "debt", text: "法宝分期到期，器灵比债主还会催。", weight: 2, max: { fortune: 4 }, effects: { fortune: -3, heart: -1 }, progress: 1, tags: ["general"] },
    { id: "quiet", text: "平静修炼数载：灵气在涨，头发暂时也还在。", weight: 7, effects: { heart: 1 }, progress: 5, tags: ["general"] }
  ];

  var DECISIONS = [
    { id: "master", turn: 6, title: "两位长老同时想收你为徒", choices: [
      { id: "famous", text: "拜名师，接受高标准和更高音量", effects: { insight: 3, heart: -1 }, progress: 8 },
      { id: "kind", text: "拜闲师，师徒一起研究午睡", effects: { heart: 3, fortune: 2 }, progress: 4 }
    ]},
    { id: "relic", turn: 12, title: "秘境里，传承与受困同门只能先救一个", choices: [
      { id: "rescue", text: "先救人，传承又不会长腿……大概", effects: { heart: 3, fortune: 3 }, progress: 3 },
      { id: "inherit", text: "先取传承，再回来精准救援", effects: { insight: 3, spirit: 2, heart: -2 }, progress: 10, chance: { stat: "fortune", target: 9, success: { heart: 2 }, fail: { fortune: -3, body: -2 } } }
    ]},
    { id: "demon-path", turn: 19, title: "无名残卷可令修为暴涨，但墨迹看着很邪门", choices: [
      { id: "burn", text: "烧掉，顺便用火煮茶", effects: { heart: 4 }, progress: 4 },
      { id: "study", text: "批判性学习，重点落在学习", effects: { spirit: 4, insight: 2, heart: -4 }, progress: 13 }
    ]},
    { id: "war", turn: 27, title: "宗门大战将起，你被请去镇守前线", choices: [
      { id: "guard", text: "守山门，谁也别动我的洞府押金", effects: { body: -2, heart: 3, fortune: 2 }, progress: 11 },
      { id: "retreat", text: "闭死关，出关后再听战报精华版", effects: { spirit: 4, fortune: -2 }, progress: 14 }
    ]},
    { id: "ascension", turn: 33, title: "登仙台将开：现在冲，还是再稳三年？", choices: [
      { id: "now", text: "现在就冲，雷都预约好了", effects: { heart: 2 }, progress: 18, chance: { stat: "body", target: 13, success: { fortune: 3 }, fail: { body: -4, spirit: -3 } } },
      { id: "wait", text: "再打磨根基，仙界又不会关门", effects: { body: 3, spirit: 2 }, progress: 9 }
    ]}
  ];

  var OFFICES = [
    { id: "none", rank: 0, name: "白身散仙", needRealm: 0, progressBonus: 0, riskReduction: 0 },
    { id: "clerk", rank: 1, name: "仙盟录事", needRealm: 2, progressBonus: 1, riskReduction: 0.02 },
    { id: "envoy", rank: 2, name: "巡天使", needRealm: 3, progressBonus: 2, riskReduction: 0.04 },
    { id: "warden", rank: 3, name: "镇域使", needRealm: 4, progressBonus: 3, riskReduction: 0.06 },
    { id: "elder", rank: 4, name: "仙盟长老", needRealm: 5, progressBonus: 4, riskReduction: 0.08 },
    { id: "deputy", rank: 5, name: "副盟主", needRealm: 6, progressBonus: 5, riskReduction: 0.1 },
    { id: "leader", rank: 6, name: "仙盟盟主", needRealm: 7, progressBonus: 7, riskReduction: 0.14 }
  ];

  var EQUIPMENT = [
    { id: "bamboo-sword", slot: "weapon", name: "青竹剑", rarity: "普通", bonuses: { insight: 1 }, progressBonus: 1 },
    { id: "meteor-blade", slot: "weapon", name: "陨星刃", rarity: "稀有", bonuses: { body: 2, spirit: 1 }, progressBonus: 2 },
    { id: "void-sword", slot: "weapon", name: "太虚断界剑", rarity: "传说", bonuses: { insight: 3, spirit: 2 }, progressBonus: 4 },
    { id: "cloud-robe", slot: "armor", name: "流云法袍", rarity: "普通", bonuses: { heart: 1 }, riskReduction: 0.03 },
    { id: "dragon-mail", slot: "armor", name: "蛟鳞玄甲", rarity: "稀有", bonuses: { body: 3 }, riskReduction: 0.07 },
    { id: "phoenix-cloak", slot: "armor", name: "涅槃羽衣", rarity: "传说", bonuses: { body: 2, fortune: 2 }, riskReduction: 0.12 },
    { id: "jade-ring", slot: "accessory", name: "静心玉环", rarity: "普通", bonuses: { heart: 2 }, progressBonus: 1 },
    { id: "star-compass", slot: "accessory", name: "周天星盘", rarity: "稀有", bonuses: { fortune: 2, insight: 1 }, progressBonus: 2 },
    { id: "time-pearl", slot: "accessory", name: "岁月珠", rarity: "传说", bonuses: { spirit: 2, heart: 2 }, progressBonus: 4 },
    { id: "thunder-spear", slot: "weapon", name: "九霄雷枪", rarity: "史诗", bonuses: { body: 2, spirit: 2 }, progressBonus: 3 },
    { id: "mountain-armor", slot: "armor", name: "不周山甲", rarity: "史诗", bonuses: { body: 4, heart: 1 }, riskReduction: 0.1 },
    { id: "koi-seal", slot: "accessory", name: "锦鲤天印", rarity: "史诗", bonuses: { fortune: 4 }, riskReduction: 0.05 }
  ];

  var TECHNIQUES = [
    { id: "breathing", name: "小周天吐纳法", maxLevel: 5, stat: "spirit", progressPerLevel: 1 },
    { id: "sword-scripture", name: "太白剑经", maxLevel: 5, stat: "insight", progressPerLevel: 2, path: "sword" },
    { id: "golden-body", name: "八荒锻体诀", maxLevel: 5, stat: "body", progressPerLevel: 2, path: "body" },
    { id: "pill-fire", name: "离火丹篇", maxLevel: 5, stat: "spirit", progressPerLevel: 2, path: "alchemy" },
    { id: "formation-book", name: "河洛阵书", maxLevel: 5, stat: "insight", progressPerLevel: 2, path: "formation" },
    { id: "beast-language", name: "万兽心语", maxLevel: 5, stat: "fortune", progressPerLevel: 2, path: "beast" },
    { id: "carefree", name: "逍遥游", maxLevel: 5, stat: "heart", progressPerLevel: 2, path: "wanderer" },
    { id: "heart-mirror", name: "明镜心经", maxLevel: 5, stat: "heart", progressPerLevel: 1, riskPerLevel: 0.02 },
    { id: "fate-art", name: "紫微望气术", maxLevel: 5, stat: "fortune", progressPerLevel: 1 },
    { id: "thunder-art", name: "九天御雷真诀", maxLevel: 5, stat: "body", progressPerLevel: 3, riskPerLevel: 0.01 }
  ];

  var COMPANIONS = [
    { id: "jian-shuang", name: "剑霜", age: 126, archetype: "冷面剑君", desc: "成年剑修，惜字如金，但会默默替你磨剑。", bonuses: { insight: 2, heart: 1 }, progressBonus: 2 },
    { id: "dan-xia", name: "丹霞", age: 143, archetype: "妙手丹师", desc: "成年丹师，争吵前习惯先递一颗静心丹。", bonuses: { spirit: 2, body: 1 }, progressBonus: 2 },
    { id: "mo-li", name: "墨璃", age: 118, archetype: "阵法学者", desc: "成年阵师，把约会地点也布成了聚灵阵。", bonuses: { insight: 1, spirit: 2 }, riskReduction: 0.04 },
    { id: "hu-qing", name: "狐青", age: 207, archetype: "灵兽化形", desc: "成年化形大妖，爱开玩笑，也真的会护短。", bonuses: { fortune: 2, heart: 1 }, riskReduction: 0.05 },
    { id: "ye-lan", name: "夜澜", age: 165, archetype: "散修游侠", desc: "成年散修，地图没有的地方偏要去看看。", bonuses: { body: 1, fortune: 2 }, progressBonus: 1 },
    { id: "su-wen", name: "素问", age: 231, archetype: "医道宗师", desc: "成年医修，温柔地禁止你拿渡劫当体检。", bonuses: { body: 2, heart: 2 }, riskReduction: 0.07 }
  ];

  var SPECIAL_ENCOUNTERS = [
    { id: "dragon-tomb", rarity: "legendary", title: "龙墓开门", scene: "万丈龙骨自深渊抬首，沉睡的剑在你掌中发出第一声龙吟。", minTurn: 10, rewardType: "equipment", rewardId: "void-sword", progress: 16, risk: 0.18 },
    { id: "phoenix-fire", rarity: "legendary", title: "凤凰涅槃", scene: "天火烧穿长夜，一根羽毛落下时，整座雪山开始融化。", minTurn: 14, rewardType: "equipment", rewardId: "phoenix-cloak", progress: 18, risk: 0.2 },
    { id: "time-river", rarity: "legendary", title: "岁月长河倒流", scene: "你看见自己千百种结局，并从浪尖捞起一枚不肯变老的明珠。", minTurn: 18, rewardType: "equipment", rewardId: "time-pearl", progress: 20, risk: 0.16 },
    { id: "thunder-palace", rarity: "legendary", title: "雷宫现世", scene: "九重雷门同时洞开，诸天雷霆为你留出一条窄路。", minTurn: 20, rewardType: "technique", rewardId: "thunder-art", progress: 22, risk: 0.24 },
    { id: "immortal-court", rarity: "rare", title: "古仙庭点将", scene: "残破天榜亮起你的名字，十万年前的战鼓再响一声。", minTurn: 12, rewardType: "office", progress: 12, risk: 0.12 },
    { id: "mirror-heart", rarity: "rare", title: "心镜问道", scene: "镜中人问了你三天三夜，最后承认你至少很会坚持。", minTurn: 8, rewardType: "technique", rewardId: "heart-mirror", progress: 10, risk: 0.08 },
    { id: "red-thread", rarity: "rare", title: "月下红线", scene: "月老打了个喷嚏，一根红线跨过群山，恰好落在两位成年修士腕间。", minTurn: 9, rewardType: "companion", progress: 8, risk: 0.04 },
    { id: "star-fall", rarity: "rare", title: "星坠荒原", scene: "群星像雨一样砸向荒原，你在天亮前捡回一块仍会呼吸的星盘。", minTurn: 6, rewardType: "equipment", rewardId: "star-compass", progress: 11, risk: 0.1 }
  ];

  var ENDINGS = [
    { id: "celestial-leader", positive: true, name: "诸天盟主", text: "你执掌仙盟，与道侣并肩定下万界新约，连雷劫都开始预约排号。", minRealm: "tribulation", minOfficeRank: 6, minRelationship: 70, min: { heart: 10 } },
    { id: "artifact-sage", positive: true, name: "万法归藏", text: "神兵与功法在你手中融为一炉，你留下的传承塞满了三座藏经阁。", minRealm: "tribulation", minEquipment: 3, minTechniqueLevels: 12, min: { insight: 15 } },
    { id: "ascended", positive: true, name: "白日飞升", text: "你穿过天门，发现仙界也要登记，不过窗口没有排队。", minRealm: "immortal", min: { heart: 8 } },
    { id: "path-master", positive: true, name: "一代道祖", text: "你没赶上飞升，但开创的道统让后人少走了很多弯路。", minRealm: "tribulation", min: { insight: 18, heart: 14 } },
    { id: "happy-immortal", positive: true, name: "人间逍遥仙", text: "你有长寿、有好友、有闲云，决定不跟雷劫争绩效。", minRealm: "void", min: { fortune: 17, heart: 18 } },
    { id: "fallen", positive: false, name: "道心失守", text: "心魔赢下一局。你留下手札，提醒后来人修仙也要休息。", max: { heart: -8 } },
    { id: "shattered", positive: false, name: "肉身告急", text: "身体明确表示不再配合加班渡劫，你的故事暂告一段落。", max: { body: -9 } },
    { id: "qi-collapse", positive: false, name: "灵脉枯竭", text: "你把丹田用成了欠费账户，只好转世后重新充值。", max: { spirit: -10 } },
    { id: "reincarnate", positive: false, name: "轮回再修", text: "大道漫长，这一世未登天门；好消息是你已经知道新手村怎么走。", fallback: true }
  ];

  return {
    VERSION: 2,
    ALLOCATION_POINTS: 20,
    TALENT_PICK_COUNT: 3,
    DEFAULT_DRAW_COUNT: 10,
    MAX_TURNS: 36,
    STATS: STATS,
    STAT_LABELS: STAT_LABELS,
    TALENTS: TALENTS,
    PATHS: PATHS,
    DIRECTIONS: PATHS,
    REALMS: REALMS,
    EVENTS: EVENTS,
    DECISIONS: DECISIONS,
    OFFICES: OFFICES,
    EQUIPMENT: EQUIPMENT,
    TECHNIQUES: TECHNIQUES,
    COMPANIONS: COMPANIONS,
    SPECIAL_ENCOUNTERS: SPECIAL_ENCOUNTERS,
    ENDINGS: ENDINGS
  };
});
