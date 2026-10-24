(function () {
  "use strict";

  var Engine = window.CareerRestartEngine;
  var Data = window.CareerRestartData;
  var CultivationEngine = window.CultivationEngine;
  var CultivationData = window.CultivationData;
  if (!Engine || !Data || !CultivationEngine || !CultivationData) {
    document.body.innerHTML = '<p class="noscript">游戏组件加载失败，请刷新页面重试。</p>';
    return;
  }

  var SAVE_KEY = "career-restart-save";
  var LAST_CAREER_KEY = "career-restart-last-career";
  var HISTORY_KEY = "career-restart-history";
  var CULTIVATION_SAVE_KEY = "career-restart-cultivation-save";
  var CULTIVATION_NOTICE_KEY = "career-restart-cultivation-notice";
  var screenOrder = ["landing", "talents", "stats", "direction", "play", "ending"];
  var draft = emptyCareerDraft();
  var cultivationDraft = emptyCultivationDraft();
  var game = null;
  var cultivationGame = null;
  var currentScreen = "landing";

  var careerStatMeta = {
    ability: { label: "业务力", glyph: "能", desc: "把“我会一点”变成“这事我负责”" },
    people: { label: "人脉值", glyph: "人", desc: "通讯录里有多少人真的会回消息" },
    energy: { label: "精力条", glyph: "精", desc: "决定你下班后还能不能拥有灵魂" },
    money: { label: "存款", glyph: "钱", desc: "理想需要现金流，摸鱼也需要底气" },
    luck: { label: "运气", glyph: "运", desc: "有时选择很重要，有时电梯刚好没关" }
  };
  var cultivationStatMeta = {
    body: { glyph: "骨", desc: "抗雷、抗揍，也抗闭关久坐" },
    insight: { glyph: "悟", desc: "参悟功法与突破效率" },
    spirit: { glyph: "灵", desc: "境界成长与术法根基" },
    fortune: { glyph: "缘", desc: "奇遇、秘境与捡漏概率" },
    heart: { glyph: "心", desc: "心魔抵抗与风险承受" }
  };
  var roleNames = {
    expert: ["职场新人", "业务骨干", "资深专家", "行业顾问", "荣誉顾问", "行业前辈", "知识传承者"],
    manager: ["项目成员", "小组负责人", "部门经理", "组织掌舵人", "治理顾问", "资深理事", "组织智囊"],
    startup: ["机会观察员", "创业合伙人", "公司负责人", "现金流驯兽师", "连续创业者", "产业导师", "商业前辈"],
    freelance: ["自由新人", "独立顾问", "个人品牌主理人", "一人有限公司", "资深创作者", "自由顾问", "从容手艺人"],
    public: ["基层新人", "可靠骨干", "资深业务负责人", "稳定系统核心", "荣誉骨干", "公共事务顾问", "社区前辈"],
    life: ["边界练习生", "生活经营者", "从容职业人", "人生首席执行官", "半退休生活家", "时间富翁", "百岁生活家"]
  };

  function el(selector, root) { return (root || document).querySelector(selector); }
  function all(selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }
  function byId(list, id) { return list.filter(function (item) { return item.id === id; })[0] || null; }
  function escapeHtml(value) { return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }
  function setText(selector, value) { var node = el(selector); if (node) node.textContent = value; }
  function setHtml(selector, value) { var node = el(selector); if (node) node.innerHTML = value; }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function emptyStats(keys) { var stats = {}; keys.forEach(function (key) { stats[key] = 0; }); return stats; }
  function emptyCareerDraft() { return { talents: [], stats: emptyStats(Data.STATS), direction: null, draw: [], seed: null }; }
  function emptyCultivationDraft() { return { talents: [], stats: emptyStats(CultivationData.STATS), path: null, draw: [], seed: null }; }
  function effectsHtml(effects, labels) {
    return Object.keys(effects || {}).map(function (key) {
      var n = effects[key];
      return '<span class="event-tag ' + (n >= 0 ? "event-tag--good" : "event-tag--bad") + '">' + escapeHtml(labels[key] || key) + " " + (n >= 0 ? "+" : "") + n + "</span>";
    }).join("");
  }
  function toast(message) {
    var node = el("#toast");
    if (!node) return;
    node.textContent = message; node.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { node.hidden = true; }, 2400);
  }
  function hideAllScreens() {
    all("[data-screen], [data-cultivation-screen]").forEach(function (node) {
      node.hidden = true;
      node.classList.remove("is-active");
    });
  }
  function activateScreen(node) {
    if (!node) return;
    node.hidden = false;
    node.classList.add("is-active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function showScreen(name) {
    currentScreen = name;
    hideAllScreens();
    activateScreen(el('[data-screen="' + name + '"]'));
  }
  function showCultivationScreen(name) {
    currentScreen = "cultivation-" + name;
    hideAllScreens();
    activateScreen(el('[data-cultivation-screen="' + name + '"]'));
  }

  function renderTalents() {
    setHtml("#talent-grid", draft.draw.map(function (talent, index) {
      var selected = draft.talents.indexOf(talent.id) >= 0;
      var effect = Object.keys(talent.effects || {}).map(function (key) { return Data.STAT_LABELS[key] + " +" + talent.effects[key]; }).join(" · ") || "特殊效果";
      return '<button class="talent-card" type="button" data-talent="' + talent.id + '" aria-pressed="' + selected + '"><span class="card-index">' + String(index + 1).padStart(2, "0") + '</span><span class="talent-icon" aria-hidden="true">' + escapeHtml(talent.name.charAt(0)) + '</span><strong>' + escapeHtml(talent.name) + '</strong><small>' + escapeHtml(effect) + '</small><p>' + escapeHtml(talent.desc) + '</p><span class="check" aria-hidden="true">✓</span></button>';
    }).join(""));
    setText("#talent-count", draft.talents.length);
    setText("[data-remaining=talents]", Math.max(0, Data.TALENT_PICK_COUNT - draft.talents.length));
    el("#talents-next-btn").disabled = draft.talents.length !== Data.TALENT_PICK_COUNT;
  }
  function prepareStatsUI() {
    all("#stat-allocation .stat-row").forEach(function (row, index) {
      var key = Data.STATS[index];
      var meta = careerStatMeta[key];
      row.dataset.stat = key;
      var glyph = el(".stat-glyph", row); if (glyph) glyph.textContent = meta.glyph;
      var heading = el("h3", row); if (heading) heading.textContent = meta.label;
      var description = el(".stat-heading p", row); if (description) description.textContent = meta.desc;
      el('[data-action="decrease-stat"]', row).setAttribute("aria-label", "减少" + meta.label);
      el('[data-action="increase-stat"]', row).setAttribute("aria-label", "增加" + meta.label);
    });
    renderStats();
  }
  function renderStats() {
    var used = Data.STATS.reduce(function (sum, key) { return sum + draft.stats[key]; }, 0);
    all("#stat-allocation .stat-row").forEach(function (row) {
      var value = draft.stats[row.dataset.stat];
      el("[data-stat-value]", row).textContent = value;
      el("[data-stat-bar]", row).style.width = value * 10 + "%";
      el('[data-action="decrease-stat"]', row).disabled = value <= 0;
      el('[data-action="increase-stat"]', row).disabled = value >= 10 || used >= Data.ALLOCATION_POINTS;
    });
    setText("#points-left", Data.ALLOCATION_POINTS - used);
    el("#stats-next-btn").disabled = used !== Data.ALLOCATION_POINTS;
  }
  function renderDirections() {
    setHtml("#direction-list", Data.DIRECTIONS.map(function (route, index) {
      var selected = draft.direction === route.id;
      return '<button class="direction-card" type="button" role="radio" aria-checked="' + selected + '" data-direction="' + route.id + '"><span class="direction-no">路线 ' + String(index + 1).padStart(2, "0") + '</span><span class="direction-symbol" aria-hidden="true">' + ["◎", "△", "↑", "✦", "□", "○"][index] + '</span><span class="direction-copy"><strong>' + escapeHtml(route.name) + '</strong><small>' + escapeHtml(route.id.toUpperCase()) + ' TRACK</small><p>' + escapeHtml(route.desc) + '</p></span><span class="risk"><b>主属性</b> ' + escapeHtml(Data.STAT_LABELS[route.primary]) + '</span><span class="radio-mark" aria-hidden="true"></span></button>';
    }).join(""));
    el("#direction-next-btn").disabled = !draft.direction;
    setText("#direction-hint", draft.direction ? "路线可以转弯，档案不能空白" : "请选择一条起始路线");
  }
  function startDraft() {
    var seed = Date.now() + "-" + Math.random();
    draft = emptyCareerDraft();
    draft.seed = seed;
    draft.draw = Engine.drawTalents(seed, 10);
    renderTalents(); prepareStatsUI(); renderDirections(); showScreen("talents");
  }
  function beginGame() {
    try {
      game = Engine.createGame({ talents: draft.talents, stats: draft.stats, direction: draft.direction, seed: draft.seed });
      Engine.saveToStorage(game, SAVE_KEY);
      renderGame(); showScreen("play");
    } catch (error) { toast(error.message); }
  }
  function careerProgress() { return Math.round((game.age - Data.START_AGE) / (Data.END_AGE - Data.START_AGE) * 100); }
  function currentRole() {
    var names = roleNames[game.direction] || ["职业探索者"];
    var progress = (game.age - Data.START_AGE) / Math.max(1, Data.END_AGE - Data.START_AGE);
    return names[Math.min(names.length - 1, Math.floor(progress * names.length))];
  }
  function careerSalary() { return Math.max(60000, 80000 + game.stats.money * 12000 + game.stats.ability * 5000); }
  function renderCareerTimeline() {
    var timeline = el("#career-timeline");
    var recent = game.history.slice(-18).reverse();
    timeline.innerHTML = recent.length ? recent.map(function (item, index) {
      var title = item.type === "decision" ? "关键选择" : item.type === "rescue" ? "职业急救" : item.type === "ending" ? "生涯结案" : "年度经历";
      return '<li class="timeline-item ' + (index === 0 ? "is-current" : "is-past") + '"><time>' + item.age + ' 岁</time><div><h3>' + title + '</h3><p>' + escapeHtml(item.text) + '</p>' + effectsHtml(item.effects, Data.STAT_LABELS) + '</div></li>';
    }).join("") : '<li class="timeline-item is-current"><time>' + Data.START_AGE + ' 岁</time><div><h3>工牌新鲜出炉</h3><p>你站在职场入口，尚未学会在群里回复“收到”。</p></div></li>';
  }
  function renderGame() {
    if (!game) return;
    var route = byId(Data.DIRECTIONS, game.direction);
    setText("#career-year", game.age + " 岁");
    setText("#career-title", currentRole());
    setText("#profile-role", currentRole());
    setText("#profile-direction", route.name + "路线");
    var progress = careerProgress();
    el("#career-progress-bar").style.width = progress + "%";
    el(".progress-track").setAttribute("aria-valuenow", progress);
    setHtml(".career-progress b", '<span id="current-year">' + game.age + "</span> / " + Data.END_AGE + " 岁");
    setText("#salary-value", careerSalary().toLocaleString("zh-CN"));
    setText("#salary-change", game.age >= 65 ? "生涯资产估值 · 含退休后的选择权" : "当前职业估值 · 仅供摸鱼参考");
    all("#live-stats > div").forEach(function (row, index) {
      var key = Data.STATS[index]; var value = game.stats[key];
      row.dataset.liveStat = key;
      el("dt", row).textContent = Data.STAT_LABELS[key];
      el("b", row).textContent = value;
      el("i", row).style.width = clamp(value, 2, 100) + "%";
    });
    renderCareerTimeline();
    var deciding = game.status === "decision";
    el("#choice-panel").hidden = !deciding;
    el("#next-year-btn").hidden = deciding;
    if (deciding) {
      setText("#choice-title", game.pendingDecision.title);
      setHtml("#choice-options", game.pendingDecision.choices.map(function (choice, index) {
        return '<button type="button" data-choice="' + choice.id + '"><b>' + String.fromCharCode(65 + index) + '</b><span><strong>' + escapeHtml(choice.text) + '</strong><small>选择会改变这条宇宙线</small></span><i>关键决定</i></button>';
      }).join(""));
    }
    if (game.status === "ended" || game.status === "failed") finishGame();
  }
  function advanceCareer() {
    game = Engine.advanceYear(game);
    if (game.status === "running" || game.status === "decision") Engine.saveToStorage(game, SAVE_KEY);
    renderGame();
  }
  function chooseCareer(choiceId) {
    try {
      game = Engine.chooseDecision(game, choiceId);
      if (game.status === "running" || game.status === "decision") Engine.saveToStorage(game, SAVE_KEY);
      renderGame();
    } catch (error) { toast(error.message); }
  }

  function getHistory() { try { var value = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); return Array.isArray(value) ? value : []; } catch (_) { return []; } }
  function saveHistory(record) {
    var history = getHistory();
    if (!history.some(function (item) { return item.id === record.id; })) history.unshift(record);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 20)));
  }
  function persistLastCareer() {
    try { localStorage.setItem(LAST_CAREER_KEY, Engine.serialize(game)); } catch (_) { /* Storage is optional. */ }
  }
  function renderCultivationEligibility() {
    var assessment = game && game.cultivation;
    var eligible = !!(assessment && assessment.eligible);
    var reason = assessment && assessment.reason ? assessment.reason : "需要完整走完百岁人生后，才能核验仙缘。";
    var transition = el("#cultivation-transition");
    var button = el("#cultivation-enter-btn");
    var badge = el("#cultivation-eligibility-badge");
    if (transition) transition.hidden = false;
    setText("#cultivation-eligibility-text", reason);
    if (badge) {
      badge.dataset.cultivationEligible = eligible ? "true" : "false";
      badge.textContent = eligible ? "仙缘已认证" : "仙缘未达标";
    }
    if (button) {
      button.disabled = !eligible;
      button.title = eligible ? "开启百岁之后的仙途" : reason;
      button.setAttribute("aria-disabled", String(!eligible));
    }
  }
  function finishGame() {
    var ending = game.ending;
    var positive = game.status === "ended";
    var total = Data.STATS.reduce(function (sum, key) { return sum + Math.max(0, game.stats[key]); }, 0);
    var grade = positive ? (total >= 300 ? "S" : total >= 220 ? "A" : "B") : "R";
    var route = byId(Data.DIRECTIONS, game.direction);
    setHtml("#ending-title", (positive ? "你成为了<br><em>" : "本次档案：<br><em>") + escapeHtml(ending.name) + "</em>");
    setText("#ending-summary", ending.text);
    setText("#ending-grade", grade);
    setText(".grade-seal span", positive ? "百岁档案" : "建议重开");
    setText("#final-salary", careerSalary().toLocaleString("zh-CN"));
    setText("#final-position", currentRole());
    setText("#final-reputation", clamp(Math.round(game.stats.ability + game.stats.people * 0.8), 0, 100));
    setText("#final-happiness", clamp(Math.round(35 + game.stats.energy * 0.7 + game.stats.luck * 0.3), 0, 100));
    setText("#ending-review", positive ? "此人走完百岁人生，既经受过 KPI，也学会了把时间还给自己。凡间档案已封存，是否另开仙籍，静候核验。" : "这次不是输，只是职业宇宙提交了一份需要修改的初稿。休息一下，换套天赋再来。");
    setText("#report-id", "CR-" + game.seed.slice(-6).replace(/\W/g, "") + "-" + game.age);
    setHtml("#ending-radar", Data.STATS.map(function (key, index) { return '<span class="r' + (index + 1) + '">' + Data.STAT_LABELS[key] + " " + game.stats[key] + "</span>"; }).join("") + '<div class="radar-shape"></div>');
    setHtml("#achievement-list", '<span>本次关键词</span><b>「' + escapeHtml(route.name) + '」</b><b>「百岁人生」</b><b>「' + escapeHtml(ending.name) + '」</b>');
    saveHistory({ id: game.seed + "-" + game.age, date: new Date().toLocaleDateString("zh-CN"), ending: ending.name, route: route.name, grade: grade, salary: careerSalary(), positive: positive });
    localStorage.removeItem(SAVE_KEY);
    persistLastCareer();
    renderCultivationEligibility();
    renderHistory();
    showScreen("ending");
  }
  function renderHistory() {
    var history = getHistory().slice(0, 20);
    var list = el("#history-list");
    if (!history.length) {
      list.innerHTML = '<div class="history-empty"><span aria-hidden="true">空</span><h3>档案柜还是空的</h3><p>完成一次职业生涯后，结局会保存在这里。</p></div>';
      return;
    }
    list.innerHTML = history.map(function (item) {
      return '<article class="history-item"><time>' + escapeHtml(item.date) + '</time><div><strong>' + escapeHtml(item.ending) + '</strong><span>' + escapeHtml(item.route) + " · 评级 " + escapeHtml(item.grade) + '</span></div><b>¥' + Math.round(item.salary / 10000) + "万</b></article>";
    }).join("");
  }
  function openHistory() { renderHistory(); var dialog = el("#history-dialog"); if (dialog.showModal) dialog.showModal(); else dialog.setAttribute("open", ""); }

  function cultivationEffects(talent) {
    return Object.keys(talent.effects || {}).map(function (key) { return CultivationData.STAT_LABELS[key] + " +" + talent.effects[key]; }).join(" · ") || "特殊仙缘";
  }
  function renderCultivationTalents() {
    setHtml("#cultivation-talent-grid", cultivationDraft.draw.map(function (talent) {
      var selected = cultivationDraft.talents.indexOf(talent.id) >= 0;
      return '<button type="button" class="cultivation-talent-card" data-cultivation-talent="' + talent.id + '" aria-pressed="' + selected + '"><span>' + escapeHtml(talent.name.charAt(0)) + '</span><strong>' + escapeHtml(talent.name) + '</strong><small>' + escapeHtml(cultivationEffects(talent)) + '</small><p>' + escapeHtml(talent.desc) + '</p><i aria-hidden="true">✓</i></button>';
    }).join(""));
    setText("#cultivation-talent-count", cultivationDraft.talents.length);
    updateCultivationSetupState();
  }
  function renderCultivationStats() {
    setHtml("#cultivation-stat-allocation", CultivationData.STATS.map(function (key) {
      var meta = cultivationStatMeta[key];
      var value = cultivationDraft.stats[key];
      var used = CultivationData.STATS.reduce(function (sum, stat) { return sum + cultivationDraft.stats[stat]; }, 0);
      return '<article data-cultivation-stat="' + key + '"><div><span>' + meta.glyph + '</span><strong>' + CultivationData.STAT_LABELS[key] + '</strong><small>' + meta.desc + '</small></div><div class="cultivation-stepper-control"><button type="button" data-cultivation-action="decrease-stat" aria-label="减少' + CultivationData.STAT_LABELS[key] + '"' + (value <= 0 ? " disabled" : "") + '>−</button><output data-cultivation-stat-value>' + value + '</output><button type="button" data-cultivation-action="increase-stat" aria-label="增加' + CultivationData.STAT_LABELS[key] + '"' + (value >= 10 || used >= CultivationData.ALLOCATION_POINTS ? " disabled" : "") + '>＋</button></div></article>';
    }).join(""));
    var total = CultivationData.STATS.reduce(function (sum, key) { return sum + cultivationDraft.stats[key]; }, 0);
    setText("#cultivation-points-left", CultivationData.ALLOCATION_POINTS - total);
    updateCultivationSetupState();
  }
  function renderCultivationPaths() {
    setHtml("#cultivation-path-list", CultivationData.PATHS.map(function (path) {
      var selected = cultivationDraft.path === path.id;
      return '<button type="button" data-cultivation-path="' + path.id + '" role="radio" aria-checked="' + selected + '"><b>' + escapeHtml(path.name.charAt(0)) + '</b><span><strong>' + escapeHtml(path.name) + '</strong><small>' + escapeHtml(path.desc) + '</small></span><i></i></button>';
    }).join(""));
    updateCultivationSetupState();
  }
  function cultivationSetupValid() {
    var points = CultivationData.STATS.reduce(function (sum, key) { return sum + cultivationDraft.stats[key]; }, 0);
    return cultivationDraft.talents.length === CultivationData.TALENT_PICK_COUNT && points === CultivationData.ALLOCATION_POINTS && !!cultivationDraft.path;
  }
  function updateCultivationSetupState() {
    var button = el("#cultivation-start-btn");
    if (button) button.disabled = !cultivationSetupValid();
    var points = CultivationData.STATS.reduce(function (sum, key) { return sum + cultivationDraft.stats[key]; }, 0);
    var parts = [];
    if (cultivationDraft.talents.length !== 3) parts.push("选满 3 项天赋");
    if (points !== 20) parts.push("分配完 20 点根骨");
    if (!cultivationDraft.path) parts.push("确定修行道路");
    setText("#cultivation-setup-hint", parts.length ? parts.join("、") + "后即可启程。" : "仙籍资料齐全，可以启程。");
  }
  function startCultivationDraft() {
    if (!game || !game.cultivation || !game.cultivation.eligible) {
      toast(game && game.cultivation ? game.cultivation.reason : "尚无可衔接的百岁职业档案");
      return;
    }
    cultivationDraft = emptyCultivationDraft();
    cultivationDraft.seed = game.seed + "-cultivation-" + Date.now();
    cultivationDraft.draw = CultivationEngine.drawTalents(cultivationDraft.seed, CultivationData.DEFAULT_DRAW_COUNT);
    renderCultivationTalents(); renderCultivationStats(); renderCultivationPaths();
    showCultivationScreen("setup");
  }
  function createCultivationGame() {
    try {
      cultivationGame = CultivationEngine.createGame({
        talents: cultivationDraft.talents,
        stats: cultivationDraft.stats,
        path: cultivationDraft.path,
        seed: cultivationDraft.seed,
        startAge: game ? game.age : 100,
        careerEnding: game ? { ending: game.ending, stats: game.stats, direction: game.direction, cultivation: game.cultivation } : null
      });
      CultivationEngine.saveToStorage(cultivationGame, CULTIVATION_SAVE_KEY);
      renderCultivationGame(); showCultivationScreen("play");
    } catch (error) { toast(error.message); }
  }
  function nextRealmInfo() {
    var next = CultivationData.REALMS[cultivationGame.realmIndex + 1];
    return next ? { label: cultivationGame.cultivation + " / " + next.need, ratio: cultivationGame.cultivation / next.need } : { label: cultivationGame.cultivation + " / 已圆满", ratio: 1 };
  }
  function cultivationRisk() {
    if (Number.isFinite(cultivationGame.risk)) return clamp(Math.round(cultivationGame.risk * 100), 2, 99);
    var base = 16 + cultivationGame.realmIndex * 7;
    return clamp(Math.round(base - cultivationGame.stats.body * 0.7 - cultivationGame.stats.heart * 0.8 + cultivationGame.turn * 0.25), 3, 92);
  }
  function rarityClass(rarity) {
    return ({ "普通": "common", "稀有": "rare", "史诗": "epic", "传说": "legendary", rare: "rare", legendary: "legendary" })[rarity] || "common";
  }
  function equipmentBonusText(item) {
    if (!item) return "空槽位";
    var parts = Object.keys(item.bonuses || {}).map(function (key) { return CultivationData.STAT_LABELS[key] + " +" + item.bonuses[key]; });
    if (item.progressBonus) parts.push("修为 +" + item.progressBonus);
    if (item.riskReduction) parts.push("风险 -" + Math.round(item.riskReduction * 100) + "%");
    return parts.join(" · ") || item.rarity;
  }
  function rewardDetails(reward) {
    if (!reward) return { name: "机缘擦肩而过", detail: "虽未获得宝物，但至少完整地回来了。", rarity: "rare" };
    if (reward.type === "equipment") return { name: reward.item.name, detail: reward.item.rarity + "装备 · " + equipmentBonusText(reward.item), rarity: rarityClass(reward.item.rarity) };
    if (reward.type === "technique") return { name: reward.technique.name, detail: "功法已修至 " + reward.technique.level + " / " + reward.technique.maxLevel + " 重", rarity: reward.technique.level >= 4 ? "legendary" : "rare" };
    if (reward.type === "office") return { name: reward.office.name, detail: "仙盟官阶提升至第 " + reward.office.rank + " 阶", rarity: reward.office.rank >= 5 ? "legendary" : "rare" };
    if (reward.type === "companion") return { name: reward.companion.name, detail: reward.companion.archetype + " · 成年修士，与你结伴同行", rarity: "rare" };
    return { name: "未知仙缘", detail: "天机暂不可泄露。", rarity: "rare" };
  }
  function cultivationNoticeId() {
    if (!cultivationGame) return null;
    if (cultivationGame.specialEncounter) return cultivationGame.seed + ":special:" + cultivationGame.specialEncounter.id;
    var reward = cultivationGame.recentReward;
    if (!reward) return null;
    var rewardId = reward.item && reward.item.id || reward.technique && reward.technique.id || reward.office && reward.office.id || reward.companion && reward.companion.id || reward.type;
    return cultivationGame.seed + ":reward:" + cultivationGame.turn + ":" + rewardId;
  }
  function closeEncounter() {
    var overlay = el("#encounter-overlay");
    if (overlay) overlay.hidden = true;
    var id = cultivationNoticeId();
    if (id) sessionStorage.setItem(CULTIVATION_NOTICE_KEY, id);
  }
  function renderEncounterOverlay() {
    var overlay = el("#encounter-overlay");
    if (!overlay || !cultivationGame) return;
    var id = cultivationNoticeId();
    if (!id || sessionStorage.getItem(CULTIVATION_NOTICE_KEY) === id) { overlay.hidden = true; return; }
    var encounter = cultivationGame.specialEncounter;
    var details = rewardDetails(encounter ? encounter.reward : cultivationGame.recentReward);
    var success = !encounter || encounter.success;
    var rarity = encounter ? rarityClass(encounter.rarity) : details.rarity;
    overlay.className = "encounter-overlay " + rarity;
    overlay.dataset.rarity = rarity;
    setText("#encounter-kicker", rarity === "legendary" ? "传说奇遇" : encounter ? "稀有奇遇" : "修行奖励");
    setText("#encounter-title", encounter ? encounter.title : "仙缘入袋");
    setText("#encounter-text", encounter ? encounter.scene + (success ? "" : " 你及时退回，虽受轻伤，却保住了仙籍。") : "日常修行忽有所得，乾坤袋又沉了一点。");
    setHtml("#encounter-reward", '<span>' + (success ? "获得奖励" : "本次未获奖励") + '</span><strong>' + escapeHtml(details.name) + '</strong><small>' + escapeHtml(details.detail) + '</small>');
    var close = el('[data-cultivation-action="close-encounter"]', overlay);
    if (close) close.textContent = success ? "收入乾坤袋" : "整顿后继续修行";
    overlay.hidden = false;
  }
  function renderCultivationSystems() {
    var office = cultivationGame.currentOffice || cultivationGame.office || CultivationData.OFFICES[0];
    setText("#cultivation-alliance-title", office.name);
    setText("#cultivation-alliance-name", "九霄仙盟 · 官阶 " + office.rank + " · 修为增益 +" + (office.progressBonus || 0));
    var realm = CultivationData.REALMS[cultivationGame.realmIndex] || CultivationData.REALMS[0];
    var next = CultivationData.REALMS[cultivationGame.realmIndex + 1];
    setText("#cultivation-realm-stars", Array(Math.min(5, cultivationGame.realmIndex + 1)).fill("✦").join(" "));
    setText("#cultivation-realm-detail", cultivationGame.realmName + " · 第 " + (cultivationGame.realmIndex + 1) + " 境");
    setText("#cultivation-realm-bonus", next ? "距下一境还需 " + Math.max(0, next.need - cultivationGame.cultivation) + " 修为" : "大道圆满 · 天门已开");
    var slotNames = { weapon: "武器", armor: "护甲", accessory: "饰品" };
    Object.keys(slotNames).forEach(function (slot) {
      var item = cultivationGame.equipment && cultivationGame.equipment[slot];
      var button = el('[data-cultivation-equipment="' + slot + '"]');
      if (!button) return;
      button.className = "cultivation-item-slot " + rarityClass(item && item.rarity);
      button.dataset.rarity = rarityClass(item && item.rarity);
      button.setAttribute("aria-label", slotNames[slot] + "：" + (item ? item.name + "，" + item.rarity + "品质" : "未装备"));
      var name = el("strong", button); if (name) name.textContent = item ? item.name : "未装备";
      button.title = item ? equipmentBonusText(item) : "尚未获得此部位装备";
    });
    var inventory = cultivationGame.inventory || [];
    setText("#cultivation-inventory-count", inventory.length + " / 24 格");
    setHtml("#cultivation-inventory-grid", inventory.length ? inventory.map(function (item) {
      return '<button class="' + rarityClass(item.rarity) + '" type="button" data-cultivation-item="' + item.id + '" title="' + escapeHtml(equipmentBonusText(item)) + '"><b>' + escapeHtml(item.name.charAt(0)) + '</b><span>' + escapeHtml(item.name) + '</span><small>' + escapeHtml(item.rarity) + '</small></button>';
    }).join("") : '<p>乾坤袋尚空，正适合装下未来。</p>');
    var techniques = cultivationGame.techniques || [];
    setHtml("#cultivation-technique-list", techniques.length ? techniques.map(function (known) {
      var source = byId(CultivationData.TECHNIQUES, known.id) || known;
      var rank = known.level >= 4 ? "legendary" : known.level >= 2 ? "epic" : "rare";
      return '<li class="' + rank + '" data-cultivation-technique="' + known.id + '"><b>' + escapeHtml(source.name.charAt(0)) + '</b><span><strong>' + escapeHtml(source.name) + '</strong><small>已修 ' + known.level + ' / ' + known.maxLevel + ' 重 · ' + escapeHtml(CultivationData.STAT_LABELS[source.stat] || "修为") + '增益</small></span></li>';
    }).join("") : '<li><span><strong>尚未习得功法</strong><small>每五年可能获得或精进一门功法</small></span></li>');
    var companion = cultivationGame.companion;
    setText("#cultivation-partner-name", companion ? companion.name : "尚未结缘");
    setText("#cultivation-partner-bond", companion ? companion.archetype + " · 成年 " + companion.age + " 岁 · 默契 " + cultivationGame.relationship : "仙途漫长，缘分尚在路上");
    setText("#cultivation-partner-bonus", companion ? companion.desc : "独自闭关收益稳定");
    var avatar = el(".cultivation-partner-avatar"); if (avatar) avatar.textContent = companion ? companion.name.charAt(0) : "缘";
  }
  function lifespanEstimate() {
    var totalLife = 55 + cultivationGame.realmIndex * 28 + Math.max(0, cultivationGame.stats.body) * 2 + Math.max(0, cultivationGame.stats.heart);
    return { total: totalLife, remaining: Math.max(0, totalLife - (cultivationGame.age - cultivationGame.startAge)) };
  }
  function renderCultivationTimeline() {
    var recent = cultivationGame.history.slice(-16).reverse();
    setHtml("#cultivation-timeline", recent.map(function (item, index) {
      var title = item.type === "realm" ? "境界突破" : item.type === "decision" ? "仙途抉择" : item.type === "ending" ? "仙途结案" : item.type === "start" ? "踏入仙途" : item.type === "rescue" ? "残魂护道" : "修行纪事";
      return '<li class="' + (index === 0 ? "is-current" : "") + '"><time>仙龄 ' + Math.max(0, item.year - 1) + ' 年 · ' + item.age + ' 岁</time><div><h3>' + title + '</h3><p>' + escapeHtml(item.text) + '</p>' + effectsHtml(item.effects, CultivationData.STAT_LABELS) + (item.progress ? '<span class="event-tag event-tag--choice">修为 +' + item.progress + "</span>" : "") + '</div></li>';
    }).join(""));
  }
  function renderCultivationGame() {
    if (!cultivationGame) return;
    var path = byId(CultivationData.PATHS, cultivationGame.path);
    setText("#cultivation-age", cultivationGame.age + " 岁");
    setText("#cultivation-realm", cultivationGame.realmName);
    setText("#cultivation-sect-name", path.name);
    setText("#cultivation-path-name", path.desc);
    all("#cultivation-live-stats > div").forEach(function (row, index) {
      var key = CultivationData.STATS[index]; var value = cultivationGame.stats[key];
      row.dataset.cultivationLiveStat = key;
      el("dt", row).textContent = CultivationData.STAT_LABELS[key];
      el("b", row).textContent = value;
      el("i", row).style.width = clamp(value * 5, 2, 100) + "%";
    });
    var lifespan = lifespanEstimate();
    setText("#cultivation-lifespan-value", lifespan.remaining);
    el("#cultivation-lifespan-bar").style.width = clamp(lifespan.remaining / lifespan.total * 100, 0, 100) + "%";
    el("#cultivation-lifespan-bar").parentElement.setAttribute("aria-valuenow", Math.round(lifespan.remaining / lifespan.total * 100));
    var risk = cultivationRisk();
    setText("#cultivation-risk-value", risk + "%");
    el("#cultivation-risk-bar").style.width = risk + "%";
    el("#cultivation-risk-bar").parentElement.setAttribute("aria-valuenow", risk);
    setText("#cultivation-risk-note", risk < 25 ? "当前天象平稳，适合低调积累。" : risk < 55 ? "雷云正在考勤，突破前记得检查根基。" : "风险偏高，道心和根骨都需要加固。");
    var progress = nextRealmInfo();
    setText("#cultivation-progress-value", progress.label);
    setText("#cultivation-tribulation-count", cultivationGame.history.filter(function (item) { return item.type === "realm"; }).length);
    renderCultivationSystems();
    renderCultivationTimeline();
    var deciding = cultivationGame.status === "decision";
    el("#cultivation-decision-panel").hidden = !deciding;
    el("#cultivation-annual-action").hidden = deciding;
    if (deciding) {
      setText("#cultivation-decision-title", cultivationGame.pendingDecision.title);
      setHtml("#cultivation-decision-options", cultivationGame.pendingDecision.choices.map(function (choice, index) {
        return '<button type="button" data-cultivation-choice="' + choice.id + '"><b>' + String.fromCharCode(65 + index) + '</b><span><strong>' + escapeHtml(choice.text) + '</strong><small>选择会被写入仙籍</small></span></button>';
      }).join(""));
    }
    if (cultivationGame.status === "ended" || cultivationGame.status === "failed") finishCultivationGame();
    else renderEncounterOverlay();
  }
  function advanceCultivation() {
    cultivationGame = CultivationEngine.advanceYear(cultivationGame);
    if (cultivationGame.status === "running" || cultivationGame.status === "decision") CultivationEngine.saveToStorage(cultivationGame, CULTIVATION_SAVE_KEY);
    renderCultivationGame();
  }
  function chooseCultivation(choiceId) {
    try {
      cultivationGame = CultivationEngine.chooseDecision(cultivationGame, choiceId);
      if (cultivationGame.status === "running" || cultivationGame.status === "decision") CultivationEngine.saveToStorage(cultivationGame, CULTIVATION_SAVE_KEY);
      renderCultivationGame();
    } catch (error) { toast(error.message); }
  }
  function finishCultivationGame() {
    var ending = cultivationGame.ending;
    var path = byId(CultivationData.PATHS, cultivationGame.path);
    var positive = cultivationGame.status === "ended";
    var heart = clamp(Math.round(50 + cultivationGame.stats.heart * 2), 0, 100);
    var breakthroughs = cultivationGame.history.filter(function (item) { return item.type === "realm"; }).length;
    var office = cultivationGame.currentOffice || cultivationGame.office || CultivationData.OFFICES[0];
    var gearCount = Object.keys(cultivationGame.equipment || {}).filter(function (slot) { return cultivationGame.equipment[slot]; }).length;
    var techniqueLevels = (cultivationGame.techniques || []).reduce(function (sum, known) { return sum + known.level; }, 0);
    var legacy = "官职「" + office.name + "」，神装 " + gearCount + " 件，功法共 " + techniqueLevels + " 重" + (cultivationGame.companion ? "，与「" + cultivationGame.companion.name + "」默契 " + cultivationGame.relationship : "，此生独行亦从容");
    setHtml("#cultivation-ending-title", "你最终成为<br><em>" + escapeHtml(ending.name) + "</em>");
    setText("#cultivation-ending-summary", ending.text + " " + legacy + "。");
    setText("#cultivation-final-realm", cultivationGame.realmName);
    setText("#cultivation-ending-grade", positive ? (cultivationGame.realmIndex >= 7 ? "仙品" : "上品") : "待转世");
    setText("#cultivation-final-age", cultivationGame.age);
    setText("#cultivation-final-sect", path.name);
    setText("#cultivation-final-tribulations", breakthroughs);
    setText("#cultivation-final-heart", heart);
    setText("#cultivation-ending-review", positive ? "此修士履历完整，道心尚稳，偶尔把闭关叫作深度工作。准予保留仙籍。" : "大道漫长，此次修行先告一段落。仙籍保留失败记录，转世后可少走几个弯路。");
    setText("#cultivation-report-id", "XR-" + cultivationGame.seed.slice(-7).replace(/\W/g, "") + "-" + cultivationGame.age);
    CultivationEngine.removeFromStorage(CULTIVATION_SAVE_KEY);
    showCultivationScreen("ending");
  }

  document.addEventListener("click", function (event) {
    var target = event.target.closest("button, a[data-action], a[data-cultivation-action]");
    if (!target) return;
    var action = target.dataset.action;
    var cultivationAction = target.dataset.cultivationAction;

    if (target.dataset.cultivationTalent) {
      var cultivationTalentId = target.dataset.cultivationTalent;
      var cultivationTalentIndex = cultivationDraft.talents.indexOf(cultivationTalentId);
      if (cultivationTalentIndex >= 0) cultivationDraft.talents.splice(cultivationTalentIndex, 1);
      else if (cultivationDraft.talents.length < CultivationData.TALENT_PICK_COUNT) cultivationDraft.talents.push(cultivationTalentId);
      else return toast("最多选择 3 项修仙天赋");
      return renderCultivationTalents();
    }
    if (target.dataset.cultivationPath) {
      cultivationDraft.path = target.dataset.cultivationPath;
      return renderCultivationPaths();
    }
    if (target.dataset.cultivationChoice) return chooseCultivation(target.dataset.cultivationChoice);
    if (target.dataset.cultivationItem) {
      var owned = (cultivationGame && cultivationGame.inventory || []).filter(function (item) { return item.id === target.dataset.cultivationItem; })[0];
      return toast(owned ? owned.name + "：" + equipmentBonusText(owned) : "该物品已不在乾坤袋中");
    }
    if (target.dataset.cultivationEquipment) {
      var equipped = cultivationGame && cultivationGame.equipment && cultivationGame.equipment[target.dataset.cultivationEquipment];
      return toast(equipped ? equipped.name + "：" + equipmentBonusText(equipped) : "此装备位目前为空");
    }
    if (cultivationAction === "close-encounter") return closeEncounter();
    if (cultivationAction === "enter") return startCultivationDraft();
    if (cultivationAction === "start") return createCultivationGame();
    if (cultivationAction === "advance-year") return advanceCultivation();
    if (cultivationAction === "restart") return startCultivationDraft();
    if (cultivationAction === "back-to-career" || cultivationAction === "back-to-career-ending") {
      if (game && game.ending) { renderCultivationEligibility(); return showScreen("ending"); }
      return showScreen("landing");
    }
    if (cultivationAction === "increase-stat" || cultivationAction === "decrease-stat") {
      var cultivationRow = target.closest("[data-cultivation-stat]");
      var cultivationKey = cultivationRow.dataset.cultivationStat;
      var cultivationUsed = CultivationData.STATS.reduce(function (sum, key) { return sum + cultivationDraft.stats[key]; }, 0);
      if (cultivationAction === "increase-stat" && cultivationDraft.stats[cultivationKey] < 10 && cultivationUsed < CultivationData.ALLOCATION_POINTS) cultivationDraft.stats[cultivationKey] += 1;
      if (cultivationAction === "decrease-stat" && cultivationDraft.stats[cultivationKey] > 0) cultivationDraft.stats[cultivationKey] -= 1;
      return renderCultivationStats();
    }

    if (target.dataset.talent) {
      var talentId = target.dataset.talent;
      var talentIndex = draft.talents.indexOf(talentId);
      if (talentIndex >= 0) draft.talents.splice(talentIndex, 1);
      else if (draft.talents.length < Data.TALENT_PICK_COUNT) draft.talents.push(talentId);
      else return toast("最多选择 3 个天赋");
      return renderTalents();
    }
    if (target.dataset.direction) { draft.direction = target.dataset.direction; return renderDirections(); }
    if (target.dataset.choice) return chooseCareer(target.dataset.choice);
    if (action === "start-game" || action === "restart") return startDraft();
    if (action === "go-home") { event.preventDefault(); return showScreen("landing"); }
    if (action === "open-history") return openHistory();
    if (action === "clear-history") { localStorage.removeItem(HISTORY_KEY); renderHistory(); return toast("历史档案已清空"); }
    if (action === "advance-year") return advanceCareer();
    if (action === "increase-stat" || action === "decrease-stat") {
      var row = target.closest("[data-stat]"); var key = row.dataset.stat;
      var used = Data.STATS.reduce(function (sum, stat) { return sum + draft.stats[stat]; }, 0);
      if (action === "increase-stat" && draft.stats[key] < 10 && used < Data.ALLOCATION_POINTS) draft.stats[key] += 1;
      if (action === "decrease-stat" && draft.stats[key] > 0) draft.stats[key] -= 1;
      return renderStats();
    }
    if (action === "randomize-stats") {
      draft.stats = emptyStats(Data.STATS);
      for (var i = 0; i < Data.ALLOCATION_POINTS; i += 1) {
        var choices = Data.STATS.filter(function (key) { return draft.stats[key] < 10; });
        draft.stats[choices[Math.floor(Math.random() * choices.length)]] += 1;
      }
      return renderStats();
    }
    if (action === "next") {
      if (currentScreen === "talents" && draft.talents.length === Data.TALENT_PICK_COUNT) return showScreen("stats");
      if (currentScreen === "stats") return showScreen("direction");
      if (currentScreen === "direction") return beginGame();
    }
    if (action === "back") {
      var screenIndex = screenOrder.indexOf(currentScreen);
      return showScreen(screenOrder[Math.max(0, screenIndex - 1)]);
    }
    if (action === "share-result" && game) {
      var text = "我的百岁职业结局是「" + game.ending.name + "」——" + game.ending.text;
      if (navigator.share) navigator.share({ title: "重启职业生涯", text: text }).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { toast("结局文案已复制"); });
      else toast(text);
    }
  });

  function addResumeButton(label, click) {
    var actions = el(".landing-actions");
    if (!actions) return;
    var button = document.createElement("button");
    button.className = "button button--ghost";
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", click);
    actions.appendChild(button);
  }
  function restoreLastCareer() {
    try {
      var text = localStorage.getItem(LAST_CAREER_KEY);
      if (text) game = Engine.deserialize(text);
    } catch (_) { localStorage.removeItem(LAST_CAREER_KEY); }
  }

  prepareStatsUI(); renderDirections(); renderHistory(); restoreLastCareer();
  try {
    var savedCareer = Engine.loadFromStorage(SAVE_KEY);
    if (savedCareer && (savedCareer.status === "running" || savedCareer.status === "decision")) {
      game = savedCareer;
      addResumeButton("继续百岁人生", function () { renderGame(); showScreen("play"); });
    }
  } catch (_) { localStorage.removeItem(SAVE_KEY); }
  try {
    var savedCultivation = CultivationEngine.loadFromStorage(CULTIVATION_SAVE_KEY);
    if (savedCultivation && (savedCultivation.status === "running" || savedCultivation.status === "decision")) {
      cultivationGame = savedCultivation;
      addResumeButton("继续上次仙途", function () { renderCultivationGame(); showCultivationScreen("play"); });
    }
  } catch (_) { localStorage.removeItem(CULTIVATION_SAVE_KEY); }
})();
