(function (root, factory) {
  var data = root.CultivationData;
  if (typeof module === "object" && module.exports) data = require("./cultivation-data.js");
  var api = factory(data);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.CultivationEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Data) {
  "use strict";
  if (!Data) throw new Error("CultivationData must be loaded before cultivation-engine.js");

  var SAVE_VERSION = 2;
  var DEFAULT_STORAGE_KEY = "career-restart-cultivation-save";

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function byId(list, id) {
    for (var i = 0; i < list.length; i += 1) if (list[i].id === id) return list[i];
    return null;
  }
  function hashSeed(seed) {
    var text = String(seed == null ? Date.now() : seed);
    var h = 2166136261;
    for (var i = 0; i < text.length; i += 1) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0 || 0x9e3779b9;
  }
  function nextRandom(state) {
    var x = state.rngState >>> 0;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    state.rngState = x >>> 0;
    return state.rngState / 4294967296;
  }
  function blankStats() {
    var result = {};
    Data.STATS.forEach(function (key) { result[key] = 0; });
    return result;
  }
  function applyEffects(stats, effects) {
    Object.keys(effects || {}).forEach(function (key) {
      if (Data.STATS.indexOf(key) >= 0) stats[key] += effects[key];
    });
  }
  function meetsLimits(stats, item) {
    var key;
    for (key in item.min || {}) if (stats[key] < item.min[key]) return false;
    for (key in item.max || {}) if (stats[key] > item.max[key]) return false;
    return true;
  }
  function normalizeTalentIds(talents) {
    return (talents || []).map(function (talent) { return typeof talent === "string" ? talent : talent && talent.id; });
  }
  function pathIdOf(options) { return options && (options.path || options.direction || options.sect); }

  function drawTalents(seed, count) {
    count = count == null ? Data.DEFAULT_DRAW_COUNT : Number(count);
    count = Math.max(Data.TALENT_PICK_COUNT, Math.min(Data.TALENTS.length, Math.floor(count) || Data.DEFAULT_DRAW_COUNT));
    var random = { rngState: hashSeed(seed) };
    var pool = Data.TALENTS.slice();
    for (var i = pool.length - 1; i > 0; i -= 1) {
      var j = Math.floor(nextRandom(random) * (i + 1));
      var swap = pool[i]; pool[i] = pool[j]; pool[j] = swap;
    }
    return pool.slice(0, count).map(clone);
  }

  function validateSetup(options) {
    options = options || {};
    var errors = [];
    var stats = options.stats || {};
    var total = 0;
    Data.STATS.forEach(function (key) {
      var value = stats[key];
      if (!Number.isInteger(value) || value < 0) errors.push(Data.STAT_LABELS[key] + "必须是非负整数");
      else total += value;
    });
    if (total !== Data.ALLOCATION_POINTS) errors.push("属性点总和必须为 " + Data.ALLOCATION_POINTS);
    var talents = normalizeTalentIds(options.talents);
    if (talents.length !== Data.TALENT_PICK_COUNT) errors.push("必须选择 " + Data.TALENT_PICK_COUNT + " 个灵根/天赋");
    if (new Set(talents).size !== talents.length) errors.push("灵根/天赋不能重复");
    talents.forEach(function (id) { if (!byId(Data.TALENTS, id)) errors.push("未知天赋：" + id); });
    if (!byId(Data.PATHS, pathIdOf(options))) errors.push("请选择有效的宗门或修行路线");
    if (options.startAge != null && (!Number.isInteger(options.startAge) || options.startAge < 1)) errors.push("起始年龄必须是正整数");
    return { valid: errors.length === 0, errors: errors };
  }

  function realmAt(progress) {
    var result = Data.REALMS[0];
    for (var i = 1; i < Data.REALMS.length; i += 1) {
      if (progress < Data.REALMS[i].need) break;
      result = Data.REALMS[i];
    }
    return { index: Data.REALMS.indexOf(result), id: result.id, name: result.name };
  }
  function syncRealm(state, record) {
    var before = state.realm && state.realm.id;
    state.realm = realmAt(state.cultivation);
    state.realmIndex = state.realm.index;
    state.realmId = state.realm.id;
    state.realmName = state.realm.name;
    if (record && before && before !== state.realm.id) {
      state.history.push({ age: state.age, year: state.cultivationYear, turn: state.turn, type: "realm", id: state.realm.id, text: "突破至「" + state.realm.name + "」！雷云围观了一会儿，决定下次再来。" });
    }
  }

  function createGame(options) {
    options = options || {};
    var checked = validateSetup(options);
    if (!checked.valid) throw new Error(checked.errors.join("；"));
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
    var startAge = options.startAge == null ? 100 : options.startAge;
    var state = {
      version: SAVE_VERSION,
      seed: seed,
      rngState: hashSeed(seed),
      age: startAge,
      startAge: startAge,
      cultivationYear: 1,
      year: 1,
      turn: 1,
      path: pathIdOf(options),
      direction: pathIdOf(options),
      talents: talentIds,
      stats: stats,
      flags: flags,
      cultivation: 0,
      progress: 0,
      realm: null,
      realmIndex: 0,
      realmId: "mortal",
      realmName: "凡身",
      legacy: clone(options.legacy != null ? options.legacy : (options.careerEnding || null)),
      careerEnding: clone(options.careerEnding != null ? options.careerEnding : (options.legacy || null)),
      decisionsMade: {},
      eventCounts: {},
      history: [],
      status: "running",
      pendingDecision: null,
      ending: null,
      lastEvent: null,
      office: clone(Data.OFFICES[0]),
      currentOffice: clone(Data.OFFICES[0]),
      inventory: [],
      equipment: { weapon: null, armor: null, accessory: null },
      techniques: [],
      companion: null,
      relationship: 0,
      recentReward: null,
      specialEncounter: null,
      specialEncountersSeen: {},
      risk: 0.12
    };
    syncRealm(state, false);
    state.history.push({ age: state.age, year: 1, turn: 1, type: "start", id: "cultivation-start", text: "百岁那年，你踏入仙途。别人养老，你开始新手教程。" });
    return state;
  }

  function eligibleEvents(state) {
    return Data.EVENTS.filter(function (event) { return meetsLimits(state.stats, event); });
  }
  function chooseEvent(state) {
    var events = eligibleEvents(state);
    var weights = events.map(function (event) {
      var pathBonus = event.tags.indexOf(state.path) >= 0 ? 2.2 : (event.tags.indexOf("general") >= 0 ? 1 : 0.65);
      var repeatPenalty = 1 / (1 + (state.eventCounts[event.id] || 0) * 0.7);
      return event.weight * pathBonus * repeatPenalty;
    });
    var total = weights.reduce(function (sum, weight) { return sum + weight; }, 0);
    var roll = nextRandom(state) * total;
    for (var i = 0; i < events.length; i += 1) {
      roll -= weights[i];
      if (roll < 0) return events[i];
    }
    return events[events.length - 1];
  }
  function systemBonus(state, field) {
    var total = (state.currentOffice && state.currentOffice[field]) || 0;
    Object.keys(state.equipment || {}).forEach(function (slot) {
      var item = state.equipment[slot];
      if (item) total += item[field] || 0;
    });
    (state.techniques || []).forEach(function (known) {
      var technique = byId(Data.TECHNIQUES, known.id);
      if (technique) {
        total += (technique[field] || 0) * known.level;
        if (field === "riskReduction") total += (technique.riskPerLevel || 0) * known.level;
      }
    });
    if (state.companion) total += state.companion[field] || 0;
    return total;
  }
  function grantEquipment(state, item) {
    if (!item) return null;
    if (!state.inventory.some(function (owned) { return owned.id === item.id; })) state.inventory.push(clone(item));
    var old = state.equipment[item.slot];
    var rarity = { "普通": 1, "稀有": 2, "史诗": 3, "传说": 4 };
    if (!old || rarity[item.rarity] > rarity[old.rarity]) state.equipment[item.slot] = clone(item);
    applyEffects(state.stats, item.bonuses);
    return { type: "equipment", item: clone(item) };
  }
  function learnTechnique(state, technique) {
    if (!technique) return null;
    var known = state.techniques.filter(function (item) { return item.id === technique.id; })[0];
    if (known) known.level = Math.min(technique.maxLevel, known.level + 1);
    else { known = { id: technique.id, name: technique.name, level: 1, maxLevel: technique.maxLevel }; state.techniques.push(known); }
    state.stats[technique.stat] += 1;
    return { type: "technique", technique: clone(known) };
  }
  function promoteOffice(state) {
    var index = Math.min(Data.OFFICES.length - 1, (state.currentOffice.rank || 0) + 1);
    if (Data.OFFICES[index].needRealm > state.realm.index) return null;
    state.office = clone(Data.OFFICES[index]); state.currentOffice = clone(Data.OFFICES[index]);
    return { type: "office", office: clone(state.currentOffice) };
  }
  function meetCompanion(state) {
    var available = Data.COMPANIONS.filter(function (item) { return !state.companion || item.id !== state.companion.id; });
    var person = available[Math.floor(nextRandom(state) * available.length)] || Data.COMPANIONS[0];
    state.companion = clone(person); state.relationship = Math.max(state.relationship, 20);
    applyEffects(state.stats, person.bonuses);
    return { type: "companion", companion: clone(person) };
  }
  function awardRoutineGrowth(state) {
    state.recentReward = null; state.specialEncounter = null;
    if (state.turn % 5 === 0) {
      if (nextRandom(state) < 0.52) {
        var pool = Data.TECHNIQUES.filter(function (item) { return !item.path || item.path === state.path; });
        state.recentReward = learnTechnique(state, pool[Math.floor(nextRandom(state) * pool.length)]);
      } else state.recentReward = grantEquipment(state, Data.EQUIPMENT[Math.floor(nextRandom(state) * Data.EQUIPMENT.length)]);
    }
    if (state.turn % 7 === 0) {
      var promotion = promoteOffice(state);
      if (promotion) state.recentReward = promotion;
    }
    if (state.companion) state.relationship = Math.min(100, state.relationship + 1 + Math.floor(nextRandom(state) * 3));
  }
  function maybeSpecialEncounter(state) {
    var eligible = Data.SPECIAL_ENCOUNTERS.filter(function (item) { return state.turn >= item.minTurn && !state.specialEncountersSeen[item.id]; });
    var chance = Math.min(0.28, 0.055 + state.stats.fortune * 0.004);
    if (!eligible.length || nextRandom(state) >= chance) return 0;
    var encounter = eligible[Math.floor(nextRandom(state) * eligible.length)];
    state.specialEncountersSeen[encounter.id] = true;
    var risk = Math.max(0.03, encounter.risk - systemBonus(state, "riskReduction"));
    var success = nextRandom(state) >= risk;
    var reward = null;
    if (success) {
      if (encounter.rewardType === "equipment") reward = grantEquipment(state, byId(Data.EQUIPMENT, encounter.rewardId));
      else if (encounter.rewardType === "technique") reward = learnTechnique(state, byId(Data.TECHNIQUES, encounter.rewardId));
      else if (encounter.rewardType === "office") reward = promoteOffice(state);
      else if (encounter.rewardType === "companion") reward = meetCompanion(state);
    } else { state.stats.body -= 2; state.stats.heart -= 1; }
    state.specialEncounter = { id: encounter.id, title: encounter.title, scene: encounter.scene, rarity: encounter.rarity, success: success, risk: risk, reward: reward };
    state.recentReward = reward;
    state.history.push({ age: state.age, year: state.year, turn: state.turn, type: "special", id: encounter.id, text: encounter.title + "：" + encounter.scene, success: success, reward: clone(reward) });
    return success ? encounter.progress : 0;
  }
  function turnGain(state, base) {
    var path = byId(Data.PATHS, state.path);
    var skill = state.stats[path.primary] * 0.2 + state.stats[path.secondary] * 0.1;
    var late = state.flags.lateBloom && state.turn >= 18 ? 3 : 0;
    var companion = state.companion ? Math.floor(state.relationship / 35) : 0;
    state.risk = Math.max(0.02, 0.12 - systemBonus(state, "riskReduction"));
    return Math.max(1, Math.round(base + skill + late + systemBonus(state, "progressBonus") + companion));
  }

  function finish(state, ending) {
    state.ending = clone(ending);
    state.status = ending.positive ? "ended" : "failed";
    state.pendingDecision = null;
    state.history.push({ age: state.age, year: state.cultivationYear, turn: state.turn, type: "ending", id: ending.id, text: ending.name + "：" + ending.text });
  }
  function failureEnding(state) {
    for (var i = 0; i < Data.ENDINGS.length; i += 1) {
      var ending = Data.ENDINGS[i];
      if (!ending.positive && !ending.fallback && meetsLimits(state.stats, ending)) return ending;
    }
    return null;
  }
  function checkFailure(state) {
    var ending = failureEnding(state);
    if (!ending) return false;
    if (state.flags.secondChance && !state.flags.secondChanceUsed) {
      state.flags.secondChanceUsed = true;
      state.stats.body = Math.max(2, state.stats.body);
      state.stats.spirit = Math.max(2, state.stats.spirit);
      state.stats.heart = Math.max(2, state.stats.heart);
      state.history.push({ age: state.age, year: state.cultivationYear, turn: state.turn, type: "rescue", id: "secondChance", text: "残魂护道触发：前辈替你按下了“恢复出厂设置（保留修为）”。" });
      return false;
    }
    finish(state, ending);
    return true;
  }
  function finalEnding(state) {
    for (var i = 0; i < Data.ENDINGS.length; i += 1) {
      var ending = Data.ENDINGS[i];
      if (!ending.positive || !ending.minRealm || !meetsLimits(state.stats, ending)) continue;
      if (ending.minOfficeRank && (!state.currentOffice || state.currentOffice.rank < ending.minOfficeRank)) continue;
      if (ending.minRelationship && state.relationship < ending.minRelationship) continue;
      if (ending.minEquipment && Object.keys(state.equipment || {}).filter(function (key) { return state.equipment[key]; }).length < ending.minEquipment) continue;
      if (ending.minTechniqueLevels && (state.techniques || []).reduce(function (sum, item) { return sum + item.level; }, 0) < ending.minTechniqueLevels) continue;
      var required = byId(Data.REALMS, ending.minRealm);
      if (required && state.realm.index >= Data.REALMS.indexOf(required)) return ending;
    }
    return Data.ENDINGS.filter(function (ending) { return ending.fallback; })[0];
  }

  function findPendingDecision(state) {
    return Data.DECISIONS.filter(function (decision) {
      return state.turn === decision.turn && !state.decisionsMade[decision.id];
    })[0] || null;
  }
  function migrateState(input) {
    var state = clone(input);
    if (state.version !== 1 && state.version !== SAVE_VERSION) return state;
    state.version = SAVE_VERSION;
    state.office = state.office || clone(Data.OFFICES[0]);
    state.currentOffice = state.currentOffice || clone(state.office);
    state.inventory = state.inventory || [];
    state.equipment = state.equipment || { weapon: null, armor: null, accessory: null };
    state.techniques = state.techniques || [];
    state.companion = state.companion || null;
    state.relationship = Number.isFinite(state.relationship) ? state.relationship : 0;
    state.recentReward = state.recentReward || null;
    state.specialEncounter = state.specialEncounter || null;
    state.specialEncountersSeen = state.specialEncountersSeen || {};
    state.risk = Number.isFinite(state.risk) ? state.risk : 0.12;
    return state;
  }
  function advanceYear(inputState) {
    var state = migrateState(inputState);
    assertState(state);
    if (state.status === "decision" || state.status !== "running") return state;
    var decision = findPendingDecision(state);
    if (decision) {
      state.status = "decision";
      state.pendingDecision = clone(decision);
      state.lastEvent = null;
      return state;
    }
    var event = chooseEvent(state);
    awardRoutineGrowth(state);
    var specialProgress = maybeSpecialEncounter(state);
    applyEffects(state.stats, event.effects);
    var gain = turnGain(state, event.progress || 0) + specialProgress;
    state.cultivation += gain;
    state.progress = state.cultivation;
    state.eventCounts[event.id] = (state.eventCounts[event.id] || 0) + 1;
    state.lastEvent = { age: state.age, year: state.cultivationYear, turn: state.turn, id: event.id, text: event.text, effects: clone(event.effects), progress: gain };
    state.history.push({ age: state.age, year: state.cultivationYear, turn: state.turn, type: "event", id: event.id, text: event.text, effects: clone(event.effects), progress: gain });
    syncRealm(state, true);
    if (checkFailure(state)) return state;
    if ((state.realm.id === "immortal" && state.turn >= 25) || state.turn >= Data.MAX_TURNS) {
      finish(state, finalEnding(state));
      return state;
    }
    state.turn += 1;
    state.cultivationYear += 1;
    state.year = state.cultivationYear;
    state.age += 1;
    return state;
  }

  function chooseDecision(inputState, choiceId) {
    var state = migrateState(inputState);
    assertState(state);
    if (state.status !== "decision" || !state.pendingDecision) throw new Error("当前没有待处理的仙途抉择");
    var decision = byId(Data.DECISIONS, state.pendingDecision.id);
    var choice = decision && byId(decision.choices, choiceId);
    if (!choice) throw new Error("无效的选择：" + choiceId);
    applyEffects(state.stats, choice.effects);
    var gain = turnGain(state, choice.progress || 0);
    state.cultivation += gain;
    state.progress = state.cultivation;
    var chanceResult = null;
    if (choice.chance) {
      var probability = Math.max(0.15, Math.min(0.9, 0.4 + (state.stats[choice.chance.stat] - choice.chance.target) * 0.035));
      chanceResult = nextRandom(state) < probability ? "success" : "fail";
      applyEffects(state.stats, choice.chance[chanceResult]);
    }
    state.decisionsMade[decision.id] = choice.id;
    state.history.push({ age: state.age, year: state.cultivationYear, turn: state.turn, type: "decision", id: decision.id, choice: choice.id, text: decision.title + " —— " + choice.text, progress: gain, chanceResult: chanceResult });
    state.pendingDecision = null;
    state.status = "running";
    syncRealm(state, true);
    if (checkFailure(state)) return state;
    if (state.realm.id === "immortal" && state.turn >= 25) finish(state, finalEnding(state));
    return state;
  }

  function simulateToEnd(inputState, strategy) {
    var state = clone(inputState);
    var guard = 100;
    while ((state.status === "running" || state.status === "decision") && guard-- > 0) {
      if (state.status === "decision") {
        var choices = state.pendingDecision.choices;
        var choiceId = typeof strategy === "function" ? strategy(clone(state)) : choices[0].id;
        state = chooseDecision(state, choiceId);
      } else state = advanceYear(state);
    }
    if (guard <= 0 && (state.status === "running" || state.status === "decision")) throw new Error("模拟超过安全回合数");
    return state;
  }

  function assertState(state) {
    if (!state || typeof state !== "object") throw new Error("修仙存档内容无效");
    if (state.version !== SAVE_VERSION) throw new Error("不支持的修仙存档版本：" + state.version);
    if (!Number.isInteger(state.turn) || state.turn < 1 || state.turn > Data.MAX_TURNS) throw new Error("存档回合无效");
    if (!Number.isInteger(state.age) || state.age < 1) throw new Error("存档年龄无效");
    if (!byId(Data.PATHS, state.path || state.direction)) throw new Error("存档修行路线无效");
    if (!Number.isFinite(state.cultivation)) throw new Error("存档修为无效");
    Data.STATS.forEach(function (key) { if (!Number.isFinite(state.stats && state.stats[key])) throw new Error("存档属性无效：" + key); });
    return state;
  }
  function serialize(state) {
    state = migrateState(state);
    assertState(state);
    return JSON.stringify({ kind: "cultivation", version: SAVE_VERSION, game: state, savedAt: new Date().toISOString() });
  }
  function deserialize(text) {
    var parsed;
    try { parsed = JSON.parse(text); } catch (error) { throw new Error("修仙存档不是有效 JSON"); }
    var state = migrateState(parsed && parsed.game ? parsed.game : parsed);
    assertState(state);
    return state;
  }
  function getStorage(storage) {
    var result = storage || (typeof localStorage !== "undefined" ? localStorage : null);
    if (!result) throw new Error("当前环境不支持 localStorage");
    return result;
  }
  function saveToStorage(state, key, storage) {
    getStorage(storage).setItem(key || DEFAULT_STORAGE_KEY, serialize(state));
    return true;
  }
  function loadFromStorage(key, storage) {
    var text = getStorage(storage).getItem(key || DEFAULT_STORAGE_KEY);
    return text == null ? null : deserialize(text);
  }
  function removeFromStorage(key, storage) {
    getStorage(storage).removeItem(key || DEFAULT_STORAGE_KEY);
    return true;
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
    loadFromStorage: loadFromStorage,
    removeFromStorage: removeFromStorage
  };
});
