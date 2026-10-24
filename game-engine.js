(function (root, factory) {
  var data = root.CareerRestartData;
  if (typeof module === "object" && module.exports) data = require("./game-data.js");
  var api = factory(data);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.CareerRestartEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Data) {
  "use strict";
  if (!Data) throw new Error("CareerRestartData must be loaded before game-engine.js");

  var SAVE_VERSION = 1;

  function hashSeed(seed) {
    var text = String(seed == null ? Date.now() : seed);
    var h = 2166136261;
    for (var i = 0; i < text.length; i += 1) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0 || 0x6d2b79f5;
  }

  function nextRandom(state) {
    var x = state.rngState >>> 0;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    state.rngState = x >>> 0;
    return state.rngState / 4294967296;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function byId(list, id) {
    for (var i = 0; i < list.length; i += 1) if (list[i].id === id) return list[i];
    return null;
  }

  function blankStats() {
    var stats = {};
    Data.STATS.forEach(function (key) { stats[key] = 0; });
    return stats;
  }

  function applyEffects(stats, effects) {
    Object.keys(effects || {}).forEach(function (key) {
      if (Data.STATS.indexOf(key) >= 0) stats[key] += effects[key];
    });
  }

  function hasLimits(stats, item) {
    var key;
    for (key in item.min || {}) if (stats[key] < item.min[key]) return false;
    for (key in item.max || {}) if (stats[key] > item.max[key]) return false;
    return true;
  }

  function normalizeTalentIds(talents) {
    return (talents || []).map(function (item) {
      return typeof item === "string" ? item : item && item.id;
    });
  }

  function validateSetup(options) {
    options = options || {};
    var errors = [];
    var stats = options.stats || {};
    var sum = 0;
    Data.STATS.forEach(function (key) {
      var value = stats[key];
      if (!Number.isInteger(value) || value < 0) errors.push(Data.STAT_LABELS[key] + "必须是非负整数");
      else sum += value;
    });
    if (sum !== Data.ALLOCATION_POINTS) errors.push("属性点总和必须为 " + Data.ALLOCATION_POINTS);

    var ids = normalizeTalentIds(options.talents);
    if (ids.length !== Data.TALENT_PICK_COUNT) errors.push("必须选择 " + Data.TALENT_PICK_COUNT + " 个天赋");
    if (new Set(ids).size !== ids.length) errors.push("天赋不能重复");
    ids.forEach(function (id) { if (!byId(Data.TALENTS, id)) errors.push("未知天赋：" + id); });
    if (!byId(Data.DIRECTIONS, options.direction)) errors.push("请选择有效的发展方向");
    return { valid: errors.length === 0, errors: errors };
  }

  function drawTalents(seed, count) {
    count = count == null ? 10 : Math.max(Data.TALENT_PICK_COUNT, Math.min(count, Data.TALENTS.length));
    var temp = { rngState: hashSeed(seed) };
    var pool = Data.TALENTS.slice();
    for (var i = pool.length - 1; i > 0; i -= 1) {
      var j = Math.floor(nextRandom(temp) * (i + 1));
      var swap = pool[i]; pool[i] = pool[j]; pool[j] = swap;
    }
    return pool.slice(0, count).map(clone);
  }

  function createGame(options) {
    var check = validateSetup(options);
    if (!check.valid) throw new Error(check.errors.join("；"));
    var seed = String(options.seed == null ? Date.now() : options.seed);
    var stats = blankStats();
    Data.STATS.forEach(function (key) { stats[key] = options.stats[key]; });
    var talentIds = normalizeTalentIds(options.talents);
    var flags = {};
    talentIds.forEach(function (id) {
      var talent = byId(Data.TALENTS, id);
      applyEffects(stats, talent.effects);
      (talent.flags || []).forEach(function (flag) { flags[flag] = true; });
    });
    return {
      version: SAVE_VERSION,
      seed: seed,
      rngState: hashSeed(seed),
      age: Data.START_AGE,
      direction: options.direction,
      talents: talentIds,
      stats: stats,
      flags: flags,
      decisionsMade: {},
      history: [],
      status: "running",
      pendingDecision: null,
      ending: null,
      lastEvent: null
    };
  }

  function eligibleEvents(state) {
    return Data.EVENTS.filter(function (event) {
      return state.age >= event.ages[0] && state.age <= event.ages[1] && hasLimits(state.stats, event);
    });
  }

  function chooseEvent(state) {
    var events = eligibleEvents(state);
    var weights = events.map(function (event) {
      var routeBonus = event.tags.indexOf(state.direction) >= 0 ? 2 : 1;
      return event.weight * routeBonus;
    });
    var total = weights.reduce(function (a, b) { return a + b; }, 0);
    var roll = nextRandom(state) * total;
    for (var i = 0; i < events.length; i += 1) {
      roll -= weights[i];
      if (roll < 0) return events[i];
    }
    return events[events.length - 1];
  }

  function failureEnding(state) {
    for (var i = 0; i < Data.ENDINGS.length; i += 1) {
      var ending = Data.ENDINGS[i];
      if (ending.positive || ending.fallback) continue;
      if (hasLimits(state.stats, ending)) return ending;
    }
    return null;
  }

  function finalEnding(state) {
    var candidates = Data.ENDINGS.filter(function (ending) {
      return ending.positive && ending.route === state.direction && hasLimits(state.stats, ending);
    });
    if (candidates.length) return candidates[0];
    return Data.ENDINGS.filter(function (ending) { return ending.fallback; })[0];
  }

  function cultivationAssessment(state, ending) {
    var total = Data.STATS.reduce(function (sum, key) {
      return sum + Math.max(0, state.stats[key]);
    }, 0);
    var requirements = {
      reachedCentury: state.age >= Data.END_AGE,
      positiveLife: !!ending.positive,
      foundation: total >= 240,
      vitality: state.stats.energy >= 40,
      insight: state.stats.ability >= 48,
      fortune: state.stats.luck >= 30
    };
    var eligible = requirements.reachedCentury && requirements.positiveLife && requirements.foundation &&
      requirements.vitality && requirements.insight && requirements.fortune;
    var missing = [];
    if (!requirements.reachedCentury) missing.push("尚未走完百岁人生");
    if (!requirements.positiveLife) missing.push("人生结局尚未圆满");
    if (!requirements.foundation) missing.push("五维积累不足 240");
    if (!requirements.vitality) missing.push("精力低于 40");
    if (!requirements.insight) missing.push("业务力低于 48");
    if (!requirements.fortune) missing.push("运气低于 30");
    return {
      eligible: eligible,
      reason: eligible ? "百岁功德圆满，精、识、运三项根基俱足，可开启修仙模式。" : missing.join("；") + "，暂未取得修仙资格。",
      score: total,
      requirements: requirements
    };
  }

  function finish(state, ending) {
    state.ending = clone(ending);
    state.status = ending.positive ? "ended" : "failed";
    state.pendingDecision = null;
    if (state.age >= Data.END_AGE) {
      state.cultivation = cultivationAssessment(state, ending);
      state.ending.cultivationEligible = state.cultivation.eligible;
      state.ending.cultivationReason = state.cultivation.reason;
    }
    state.history.push({ age: state.age, type: "ending", id: ending.id, text: ending.name + "：" + ending.text });
  }

  function checkFailure(state) {
    var ending = failureEnding(state);
    if (!ending) return false;
    if (state.flags.secondChance && !state.flags.secondChanceUsed) {
      state.flags.secondChanceUsed = true;
      state.stats.energy = Math.max(8, state.stats.energy);
      state.stats.money = Math.max(0, state.stats.money);
      state.history.push({ age: state.age, type: "rescue", id: "secondChance", text: "“从头再来”触发：你战略性躺平后重新上线。" });
      return false;
    }
    finish(state, ending);
    return true;
  }

  function advanceYear(inputState) {
    var state = clone(inputState);
    if (state.status === "decision") return state;
    if (state.status !== "running") return state;

    var decision = Data.DECISIONS.filter(function (item) {
      return item.age === state.age && !state.decisionsMade[item.id];
    })[0];
    if (decision) {
      state.status = "decision";
      state.pendingDecision = clone(decision);
      state.lastEvent = null;
      return state;
    }

    var event = chooseEvent(state);
    applyEffects(state.stats, event.effects);
    state.lastEvent = { age: state.age, id: event.id, text: event.text, effects: clone(event.effects) };
    state.history.push({ age: state.age, type: "event", id: event.id, text: event.text, effects: clone(event.effects) });
    if (checkFailure(state)) return state;

    if (state.age >= Data.END_AGE) {
      finish(state, finalEnding(state));
      return state;
    }
    state.age += 1;
    return state;
  }

  function chooseDecision(inputState, choiceId) {
    var state = clone(inputState);
    if (state.status !== "decision" || !state.pendingDecision) throw new Error("当前没有待处理的关键选择");
    var decision = byId(Data.DECISIONS, state.pendingDecision.id);
    var choice = decision && byId(decision.choices, choiceId);
    if (!choice) throw new Error("无效的选择：" + choiceId);

    applyEffects(state.stats, choice.effects);
    var chanceResult = null;
    if (choice.chance) {
      var probability = Math.max(0.15, Math.min(0.85, 0.35 + state.stats[choice.chance.stat] * 0.035));
      chanceResult = nextRandom(state) < probability ? "success" : "fail";
      applyEffects(state.stats, choice.chance[chanceResult]);
    }
    state.decisionsMade[decision.id] = choice.id;
    state.history.push({
      age: state.age,
      type: "decision",
      id: decision.id,
      choice: choice.id,
      text: decision.title + " —— " + choice.text,
      chanceResult: chanceResult
    });
    state.pendingDecision = null;
    state.status = "running";
    checkFailure(state);
    return state;
  }

  function simulateToEnd(inputState, strategy) {
    var state = clone(inputState);
    var guard = Math.max(100, (Data.END_AGE - Data.START_AGE + Data.DECISIONS.length + 10) * 2);
    while ((state.status === "running" || state.status === "decision") && guard-- > 0) {
      if (state.status === "decision") {
        var choices = state.pendingDecision.choices;
        var id = typeof strategy === "function" ? strategy(clone(state)) : choices[0].id;
        state = chooseDecision(state, id);
      } else state = advanceYear(state);
    }
    return state;
  }

  function assertState(state) {
    if (!state || typeof state !== "object") throw new Error("存档内容无效");
    if (state.version !== SAVE_VERSION) throw new Error("不支持的存档版本：" + state.version);
    if (!Number.isInteger(state.age) || state.age < Data.START_AGE || state.age > Data.END_AGE) throw new Error("存档年龄无效");
    if (!byId(Data.DIRECTIONS, state.direction)) throw new Error("存档路线无效");
    Data.STATS.forEach(function (key) {
      if (!Number.isFinite(state.stats && state.stats[key])) throw new Error("存档属性无效：" + key);
    });
    state.flags = state.flags || {};
    state.decisionsMade = state.decisionsMade || {};
    state.history = Array.isArray(state.history) ? state.history : [];
    state.pendingDecision = state.pendingDecision || null;
    state.lastEvent = state.lastEvent || null;
    return state;
  }

  function serialize(state) {
    assertState(state);
    return JSON.stringify({ game: state, savedAt: new Date().toISOString() });
  }

  function deserialize(text) {
    var parsed;
    try { parsed = JSON.parse(text); } catch (error) { throw new Error("存档不是有效 JSON"); }
    return clone(assertState(parsed && parsed.game ? parsed.game : parsed));
  }

  function saveToStorage(state, key, storage) {
    storage = storage || (typeof localStorage !== "undefined" ? localStorage : null);
    if (!storage) throw new Error("当前环境不支持 localStorage");
    storage.setItem(key || "career-restart-save", serialize(state));
    return true;
  }

  function loadFromStorage(key, storage) {
    storage = storage || (typeof localStorage !== "undefined" ? localStorage : null);
    if (!storage) throw new Error("当前环境不支持 localStorage");
    var text = storage.getItem(key || "career-restart-save");
    return text == null ? null : deserialize(text);
  }

  return {
    VERSION: SAVE_VERSION,
    data: Data,
    drawTalents: drawTalents,
    validateSetup: validateSetup,
    createGame: createGame,
    advanceYear: advanceYear,
    chooseDecision: chooseDecision,
    simulateToEnd: simulateToEnd,
    serialize: serialize,
    deserialize: deserialize,
    saveToStorage: saveToStorage,
    loadFromStorage: loadFromStorage
  };
});
