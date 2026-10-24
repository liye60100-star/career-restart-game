(function (root, factory) {
  var data = factory();
  if (typeof module === "object" && module.exports) module.exports = data;
  root.CareerRestartData = data;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var STATS = ["ability", "people", "energy", "money", "luck"];
  var STAT_LABELS = { ability: "业务力", people: "人脉值", energy: "精力条", money: "存款", luck: "运气" };

  var TALENTS = [
    { id: "excel", name: "Excel 仙人", desc: "别人做表，你做法。", effects: { ability: 3 } },
    { id: "social", name: "饭局雷达", desc: "十米内自动发现团建和报销人。", effects: { people: 3 } },
    { id: "battery", name: "人形充电宝", desc: "加班后仍能保持一种礼貌的活着。", effects: { energy: 3 } },
    { id: "coupon", name: "省钱显微镜", desc: "能看见藏在小字里的满减。", effects: { money: 3 } },
    { id: "koi", name: "工位锦鲤", desc: "抽奖总能抽到公司文化衫。", effects: { luck: 3 } },
    { id: "mouth", name: "汇报型人格", desc: "三分工作，七分结构化表达。", effects: { ability: 1, people: 2 } },
    { id: "nap", name: "带薪冥想", desc: "闭眼五分钟，续航两小时。", effects: { energy: 2, luck: 1 } },
    { id: "side", name: "副业嗅觉", desc: "对第二收入的气味格外敏感。", effects: { money: 2, ability: 1 } },
    { id: "boundary", name: "边界感大师", desc: "会说“不急的话明天再急”。", effects: { energy: 2, people: 1 } },
    { id: "restart", name: "从头再来", desc: "第一次重大失败不会直接出局。", flags: ["secondChance"], effects: { luck: 1 } }
  ];

  var DIRECTIONS = [
    { id: "expert", name: "专业深耕", desc: "把一个技能卷成护城河。", primary: "ability" },
    { id: "manager", name: "管理晋升", desc: "从做事的人变成催做事的人。", primary: "people" },
    { id: "startup", name: "创业突围", desc: "把老板换成投资人和现金流。", primary: "money" },
    { id: "freelance", name: "自由职业", desc: "不打卡，但每个客户都是考勤机。", primary: "ability" },
    { id: "public", name: "稳定上岸", desc: "在确定性里经营自己的小宇宙。", primary: "energy" },
    { id: "life", name: "生活优先", desc: "工作是生活的赞助商，不是总导演。", primary: "energy" }
  ];

  var EVENTS = [
    { id: "rookie", ages: [22, 27], text: "你把“收到”打成“收尸”，群里安静了三分钟。", weight: 5, effects: { ability: 1, people: -1 }, tags: ["general"] },
    { id: "mentor", ages: [22, 35], text: "前辈传来“最终版_真的最终”，你第一次摸到职场传承。", weight: 4, min: { people: 5 }, effects: { ability: 2, people: 1 }, tags: ["general"] },
    { id: "bonus", ages: [23, 49], text: "项目奖金到账，你确认了三遍小数点。", weight: 3, min: { ability: 8 }, effects: { money: 3, energy: -1 }, tags: ["expert", "manager", "public"] },
    { id: "reorg", ages: [25, 49], text: "组织架构又调整了，唯一不变的是你还在原工位。", weight: 3, effects: { energy: -1, luck: -1 }, tags: ["general"] },
    { id: "viral", ages: [22, 49], text: "你随手发的行业吐槽火了，老板点赞后又取消。", weight: 2, min: { luck: 7 }, effects: { people: 2, money: 1 }, tags: ["freelance", "startup", "general"] },
    { id: "client", ages: [24, 49], text: "甲方说“相信你的专业”，然后给了十八条修改意见。", weight: 4, effects: { ability: 1, energy: -1, money: 2 }, tags: ["freelance", "startup"] },
    { id: "promotion", ages: [27, 49], text: "你升职了：会议更多，头像更稳重，头发更自由。", weight: 2, min: { ability: 10, people: 8 }, effects: { people: 2, money: 3, energy: -1 }, tags: ["manager", "expert"] },
    { id: "product", ages: [24, 49], text: "你做的小产品有人付费，不是亲戚，也不是误触。", weight: 2, min: { ability: 9, luck: 5 }, effects: { money: 4, people: 1 }, tags: ["startup", "freelance"] },
    { id: "exam", ages: [22, 38], text: "你通过了关键考试，朋友圈统一回复：吸吸欧气。", weight: 3, min: { energy: 7 }, effects: { ability: 2, luck: 1 }, tags: ["public"] },
    { id: "hobby", ages: [22, 59], text: "你重新捡起爱好，发现自己除了工号还有名字。", weight: 4, effects: { energy: 2, money: -1 }, tags: ["life", "general"] },
    { id: "checkup", ages: [30, 59], text: "体检报告开始使用加粗字体，你决定把养生从收藏夹移到日程表。", weight: 3, effects: { energy: 1, money: -1 }, tags: ["general"] },
    { id: "network", ages: [26, 55], text: "昔日同事递来橄榄枝，顺便问你有没有简历最新版。", weight: 3, min: { people: 9 }, effects: { luck: 2, money: 2 }, tags: ["general"] },
    { id: "bear", ages: [28, 55], text: "行业寒冬来了，公司把空调温度也算进降本增效。", weight: 3, effects: { money: -2, energy: -1 }, tags: ["general"] },
    { id: "quiet", ages: [30, 49], text: "普通的一年：需求改了，咖啡喝了，日子也过了。", weight: 6, effects: { ability: 1, energy: 1 }, tags: ["general"] },

    { id: "midlife_title", ages: [46, 55], text: "年轻同事开始叫你老师，你回头看了看，发现叫的真是你。", weight: 5, effects: { people: 2, ability: 1 }, tags: ["expert", "manager", "general"] },
    { id: "reading_glasses", ages: [46, 60], text: "你把手机字体调大一级，并坚称这是为了提升信息获取效率。", weight: 3, effects: { ability: 1, energy: 1 }, tags: ["general"] },
    { id: "second_curve", ages: [46, 60], text: "你学会一门新工具，速度不快，但再也不会被更新日志吓到。", weight: 4, effects: { ability: 2, luck: 1 }, tags: ["expert", "freelance", "general"] },
    { id: "old_team", ages: [48, 62], text: "十年前的项目群突然有人发红包，你们用表情包完成了一场同学会。", weight: 3, effects: { people: 3, energy: 1 }, tags: ["general"] },
    { id: "consulting", ages: [50, 65], text: "有人付费请你讲经验，你终于确认踩过的坑也算知识产权。", weight: 3, min: { ability: 18 }, effects: { money: 3, people: 2 }, tags: ["expert", "freelance"] },
    { id: "succession", ages: [50, 65], text: "你培养的后辈独当一面，并开始用你听不懂的新黑话。", weight: 3, min: { people: 15 }, effects: { people: 3, energy: 2 }, tags: ["manager", "public"] },
    { id: "midlife_trip", ages: [46, 64], text: "你请了完整的一周假，系统没有崩，公司也没有倒。", weight: 4, effects: { energy: 3, money: -1, luck: 1 }, tags: ["life", "general"] },
    { id: "side_business", ages: [48, 65], text: "你的副业开始稳定进账，主业对此表示沉默。", weight: 2, min: { ability: 16 }, effects: { money: 4, energy: -1 }, tags: ["startup", "freelance"] },
    { id: "parents_group", ages: [45, 62], text: "家庭群比工作群更难管理，你首次尝试对亲戚做需求澄清。", weight: 3, effects: { people: 1, energy: -1 }, tags: ["general"] },
    { id: "expert_obsolete", ages: [46, 61], text: "你苦练多年的工具被新版一键替代，只好把经验升级成判断力。", weight: 2, max: { ability: 25 }, effects: { ability: -2, energy: -2, luck: 1 }, tags: ["expert"] },
    { id: "manager_crisis", ages: [46, 62], text: "核心成员集体提离职，你用三天修复了半年没做的沟通。", weight: 2, effects: { people: -3, energy: -2, ability: 1 }, tags: ["manager"] },
    { id: "startup_cash", ages: [45, 63], text: "大客户延期付款，你第一次觉得“账期”两个字自带低气压。", weight: 3, effects: { money: -6, energy: -2 }, tags: ["startup"] },
    { id: "startup_exit", ages: [48, 65], text: "同行提出收购，你算完数字后发现理想也可以分期到账。", weight: 1, min: { luck: 14 }, effects: { money: 8, energy: 2 }, tags: ["startup"] },
    { id: "freelance_dry", ages: [46, 64], text: "客户同时进入预算冻结期，你的日历突然获得大片留白。", weight: 3, effects: { money: -4, energy: 2, luck: -1 }, tags: ["freelance"] },
    { id: "public_reform", ages: [48, 63], text: "系统改革上线，你成为办公室里唯一看完操作手册的人。", weight: 2, min: { ability: 15 }, effects: { ability: 2, people: 3, energy: -2 }, tags: ["public"] },
    { id: "life_emergency", ages: [46, 64], text: "家里临时需要你，你放下工作，发现缺席的会议照样开完了。", weight: 3, effects: { energy: -2, people: 3, money: -2 }, tags: ["life", "general"] },
    { id: "rare_windfall", ages: [45, 69], text: "一笔几乎忘记的长期投入意外兑现，你终于相信偶尔不折腾也是策略。", weight: 1, min: { luck: 16 }, effects: { money: 9, luck: 1 }, tags: ["general"] },

    { id: "retire_card", ages: [60, 70], text: "你领到退休证，工牌退出群聊，公交卡升级为主角。", weight: 5, effects: { energy: 3, money: 1 }, tags: ["general"] },
    { id: "rehire", ages: [60, 72], text: "老单位返聘你解决疑难问题：退休了，但 bug 没退休。", weight: 3, min: { ability: 20 }, effects: { ability: 1, money: 3, energy: -1 }, tags: ["expert", "public"] },
    { id: "square_dance", ages: [60, 79], text: "你混进广场舞队，凭项目管理经验排出了一套敏捷队形。", weight: 4, effects: { energy: 2, people: 2 }, tags: ["life", "general"] },
    { id: "garden", ages: [60, 82], text: "阳台番茄结果了，你把年度复盘改名为收成总结。", weight: 4, effects: { energy: 2, luck: 1 }, tags: ["life", "general"] },
    { id: "grandchild_it", ages: [62, 82], text: "晚辈请你修电脑，你重启了一次，家庭地位随之提升。", weight: 3, effects: { people: 2, ability: 1 }, tags: ["general"] },
    { id: "senior_university", ages: [61, 78], text: "你报名老年大学，第一次发现同桌比老师资历还深。", weight: 4, effects: { ability: 2, people: 2, energy: 1 }, tags: ["general"] },
    { id: "pension_market", ages: [60, 78], text: "你研究养老金和菜价的相关性，结论是都需要耐心。", weight: 3, effects: { money: 1, ability: 1 }, tags: ["startup", "public", "general"] },
    { id: "memoir_draft", ages: [65, 84], text: "你开始写回忆录，第一章标题是《那些改到第十八版的需求》。", weight: 3, min: { ability: 18 }, effects: { ability: 1, people: 2 }, tags: ["expert", "general"] },
    { id: "retire_scam", ages: [60, 79], text: "一个“稳赚项目”热情联系你，你及时挂断，顺便给全家上了反诈课。", weight: 2, min: { ability: 16 }, effects: { ability: 1, people: 2, luck: 1 }, tags: ["general"] },
    { id: "retire_scam_fail", ages: [60, 79], text: "你为一场包装精美的投资交了学费，从此对“内部名额”过敏。", weight: 1, max: { ability: 15 }, effects: { money: -7, energy: -2 }, tags: ["general"] },
    { id: "health_detour", ages: [62, 82], text: "一次住院让计划暂停，好在你认真康复，出院时比医生还熟悉流程。", weight: 2, effects: { energy: -5, money: -3, people: 2 }, tags: ["general"] },
    { id: "late_bloom", ages: [64, 82], text: "你多年随手记录的经验突然出版，稿费和读者来信一同抵达。", weight: 1, min: { ability: 25, luck: 14 }, effects: { money: 6, people: 5, luck: 1 }, tags: ["expert", "freelance", "general"] },

    { id: "park_ceo", ages: [75, 90], text: "你在公园长椅拥有固定席位，大家尊称你为晨练项目总监。", weight: 4, effects: { people: 2, energy: 1 }, tags: ["manager", "general"] },
    { id: "smart_home", ages: [72, 92], text: "你和智能音箱争论了十分钟，最后双方都假装听懂了。", weight: 4, effects: { ability: 1, luck: 1 }, tags: ["general"] },
    { id: "old_friend", ages: [70, 95], text: "老友来访，你们花半天互相提醒那些已经忘掉的往事。", weight: 5, effects: { people: 3, energy: 2 }, tags: ["life", "general"] },
    { id: "health_walk", ages: [70, 96], text: "你每天按时散步，步数榜上输给了一个负责送货的邻居。", weight: 5, effects: { energy: 2 }, tags: ["general"] },
    { id: "digital_payment", ages: [75, 94], text: "你教同龄人手机支付，收获三声老师和五次误触。", weight: 3, effects: { ability: 1, people: 2 }, tags: ["expert", "general"] },
    { id: "family_archive", ages: [78, 98], text: "你整理旧照片，发现年轻时的自己也曾拥有完整发际线。", weight: 4, effects: { energy: 2, people: 2 }, tags: ["life", "general"] },
    { id: "community_advisor", ages: [72, 92], text: "社区请你当顾问，你用一张表解决了困扰大家半年的排班。", weight: 3, min: { ability: 20 }, effects: { people: 3, luck: 1 }, tags: ["expert", "public"] },
    { id: "old_house", ages: [75, 94], text: "老房子突然要求大修，你望着报价单，确认建筑也有中年危机。", weight: 2, effects: { money: -5, energy: -1 }, tags: ["general"] },
    { id: "family_reunion", ages: [76, 96], text: "多年未见的亲友重新聚齐，你发现最贵的宴席是时间买单。", weight: 2, effects: { people: 5, energy: 2, money: -2 }, tags: ["life", "general"] },
    { id: "rare_recovery", ages: [78, 97], text: "复查结果比预期好，医生说保持现状，你把这当成年终最高评级。", weight: 1, max: { energy: 12 }, effects: { energy: 6, luck: 2 }, tags: ["general"] },

    { id: "century_club", ages: [90, 100], text: "你进入百岁俱乐部候选名单，审核材料只需要本人到场。", weight: 4, effects: { energy: 1, luck: 2 }, tags: ["general"] },
    { id: "four_generations", ages: [90, 100], text: "全家拍合照，你坐在中间，像一枚稳定运行了近百年的服务器。", weight: 4, effects: { people: 3, energy: 1 }, tags: ["life", "general"] },
    { id: "long_view", ages: [90, 100], text: "别人讨论风口，你说上一个风口后来改成了公园。", weight: 4, effects: { ability: 1, luck: 2 }, tags: ["general"] },
    { id: "century_birthday", ages: [99, 100], text: "蜡烛不够插，蛋糕店建议改用数字。你批准了这次降本增效。", weight: 8, effects: { energy: 2, people: 3, luck: 2 }, tags: ["general"] }
  ];

  var DECISIONS = [
    { id: "offer", age: 25, title: "更高薪的陌生赛道发来 offer", choices: [
      { id: "jump", text: "跳，人生就是大型灰度发布", effects: { money: 3, ability: 2, energy: -2 }, chance: { stat: "luck", success: { people: 2 }, fail: { money: -3 } } },
      { id: "stay", text: "留，先把当前地图刷熟", effects: { ability: 2, energy: 1 } }
    ]},
    { id: "lead", age: 30, title: "老板让你带团队，但不保证加薪", choices: [
      { id: "accept", text: "接下，先获得群主权限", effects: { people: 3, energy: -3, ability: 1 } },
      { id: "decline", text: "婉拒，专家路线也能通关", effects: { ability: 3, people: -1, energy: 1 } }
    ]},
    { id: "break", age: 35, title: "存款够你休息一阵，要不要按暂停？", choices: [
      { id: "rest", text: "休息半年，重装人生系统", effects: { money: -4, energy: 5, luck: 1 } },
      { id: "push", text: "继续冲，咖啡还能续杯", effects: { money: 3, ability: 2, energy: -3 } }
    ]},
    { id: "meaning", age: 40, title: "你开始认真思考：这班非上不可吗？", choices: [
      { id: "change", text: "调整方向，把时间还给自己", effects: { energy: 4, money: -2, luck: 2 } },
      { id: "legacy", text: "再做一个能留下来的项目", effects: { ability: 3, people: 2, energy: -2 } }
    ]},
    { id: "midlife", age: 50, title: "五十岁，职业下半场准备怎么开？", choices: [
      { id: "mentor", text: "带后辈，把踩坑史做成避坑指南", effects: { people: 5, ability: 2, energy: 1 }, chance: { stat: "people", success: { people: 3, luck: 1 }, fail: { energy: -2 } } },
      { id: "second", text: "开第二曲线，证明简历还能续页", effects: { ability: 4, money: 3, energy: -2 }, chance: { stat: "luck", success: { money: 5 }, fail: { money: -5, energy: -2 } } }
    ]},
    { id: "retirement", age: 60, title: "退休窗口弹出，你准备点哪个按钮？", choices: [
      { id: "retire", text: "准时下线，把早高峰还给年轻人", effects: { energy: 7, people: 2, money: 1 }, chance: { stat: "money", success: { energy: 2, luck: 1 }, fail: { money: -4 } } },
      { id: "rehire", text: "接受返聘，只处理真正棘手的问题", effects: { ability: 3, money: 5, energy: -3 }, chance: { stat: "ability", success: { money: 3, people: 2 }, fail: { energy: -4 } } }
    ]},
    { id: "seventy", age: 70, title: "七十岁，你决定如何安排新的黄金十年？", choices: [
      { id: "learn", text: "上老年大学，继续更新人生版本", effects: { ability: 3, people: 3, energy: 2 }, chance: { stat: "people", success: { people: 3, luck: 1 }, fail: { money: -2 } } },
      { id: "travel", text: "去看世界，景点不需要写周报", effects: { energy: 4, money: -4, luck: 3 }, chance: { stat: "luck", success: { energy: 3, people: 2 }, fail: { money: -3, energy: -2 } } }
    ]},
    { id: "eightyfive", age: 85, title: "八十五岁，晚辈请你总结长寿秘诀", choices: [
      { id: "humor", text: "少开会，多散步，偶尔假装没听见", effects: { energy: 4, people: 2, luck: 3 }, chance: { stat: "energy", success: { energy: 3 }, fail: { energy: -2 } } },
      { id: "legacy", text: "把一生经验整理成家庭使用说明书", effects: { ability: 2, people: 5, energy: 1 }, chance: { stat: "ability", success: { people: 3, luck: 2 }, fail: { energy: -2 } } }
    ]}
  ];

  var ENDINGS = [
    { id: "century_master", route: "expert", positive: true, lifeEnding: true, name: "百岁知识守夜人", text: "你把一生经验交给后来者，知识没有退休日期。", min: { ability: 42 } },
    { id: "century_leader", route: "manager", positive: true, lifeEnding: true, name: "四代人的好领导", text: "你最骄傲的不是职位，而是许多人因你学会了善待别人。", min: { people: 42 } },
    { id: "century_founder", route: "startup", positive: true, lifeEnding: true, name: "穿越周期的老船长", text: "项目有成有败，但你活成了一家不断迭代的百年公司。", min: { money: 34, luck: 18 } },
    { id: "century_studio", route: "freelance", positive: true, lifeEnding: true, name: "自由一生的创作者", text: "你的作品跨过年代，周二去公园的自由也一直保留。", min: { ability: 34, people: 24 } },
    { id: "century_steady", route: "public", positive: true, lifeEnding: true, name: "人间稳定器", text: "你认真服务过许多人，也安稳照顾好了自己。", min: { energy: 30, ability: 24 } },
    { id: "century_balanced", route: "life", positive: true, lifeEnding: true, name: "百岁人生首席执行官", text: "工作只是漫长人生的一章，而你把整本书都过得有声有色。", min: { energy: 32, people: 22 } },
    { id: "burnout", positive: false, lifeEnding: false, name: "提前强制关机", text: "你的精力长期透支，人生系统要求立刻休息。重开时记得保养硬件。", max: { energy: -22 } },
    { id: "broke", positive: false, lifeEnding: false, name: "现金流紧急停航", text: "余额先于理想清零，你选择战略性回撤。下一局请留一点安全垫。", max: { money: -27 } },
    { id: "century_wanderer", positive: true, lifeEnding: true, name: "人间百岁体验官", text: "你没有活成单一标签，却把工作、家人、朋友与四季都认真体验了一遍。", fallback: true }
  ];

  return {
    VERSION: 1,
    START_AGE: 22,
    END_AGE: 100,
    ALLOCATION_POINTS: 20,
    TALENT_PICK_COUNT: 3,
    STATS: STATS,
    STAT_LABELS: STAT_LABELS,
    TALENTS: TALENTS,
    DIRECTIONS: DIRECTIONS,
    EVENTS: EVENTS,
    DECISIONS: DECISIONS,
    ENDINGS: ENDINGS
  };
});
