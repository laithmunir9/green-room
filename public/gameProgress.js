(function (root) {
  var SCENARIO_IDS = ["public_speech", "pitch", "interview", "exam_viva", "casual"];
  var QUEST_STATE_KEY = "greenRoomQuestState";

  function number(value) {
    return typeof value === "number" && isFinite(value) ? value : null;
  }

  function distinctScenarioCount(history) {
    return new Set((history || []).map(function (h) { return h && h.templateId; }).filter(Boolean)).size;
  }

  function firstUnusedScenario(history) {
    var used = new Set((history || []).map(function (h) { return h && h.templateId; }).filter(Boolean));
    return SCENARIO_IDS.find(function (id) { return !used.has(id); }) || "public_speech";
  }

  var QUESTS = [
    { id: "first_rep", label: "Step into the room", skill: "Showing up", description: "Finish one practice session, however short.", scenarioId: "public_speech",
      available: function () { return true; }, complete: function (entry) { return Boolean(entry); } },
    { id: "new_room", label: "Try a new room", skill: "Range", description: "Practice in a room you have not visited yet.", scenarioId: null,
      available: function (history) { return distinctScenarioCount(history) < SCENARIO_IDS.length; }, complete: function (entry, older) {
        return Boolean(entry && entry.templateId && (older || []).length > 0 && !(older || []).some(function (h) { return h.templateId === entry.templateId; }));
      } },
    { id: "plain_speech", label: "Say it plain", skill: "Clarity", description: "Give a substantive answer with almost no hedging.", scenarioId: "public_speech",
      available: function () { return true; }, complete: function (entry) {
        var s = entry && entry.signals || {};
        return number(s.wordCount) >= 50 && number(s.hedgeRate) !== null && s.hedgeRate < 0.02;
      } },
    { id: "conversational_pace", label: "Find your pace", skill: "Pace", description: "Speak one turn inside a clear conversational pace.", scenarioId: "pitch",
      available: function () { return true; }, complete: function (entry) {
        var wpm = number(entry && entry.signals && entry.signals.avgWpm);
        return wpm !== null && wpm >= 120 && wpm <= 160;
      } },
    { id: "hold_the_floor", label: "Hold the floor", skill: "Sustaining an idea", description: "Take ten or more turns and keep the thought moving.", scenarioId: "interview",
      available: function () { return true; }, complete: function (entry) {
        var s = entry && entry.signals || {};
        return number(s.turnCount) >= 10 && number(s.wordCount) >= 100;
      } },
    { id: "own_scenario", label: "Write your own room", skill: "Agency", description: "Describe a real situation and practice it off script.", scenarioId: null,
      available: function () { return true; }, complete: function (entry) { return entry && entry.viaFreeText === true; } },
  ];

  var MODIFIERS = [
    { id: "skeptical_audience", label: "Skeptical audience", desc: "The room asks for proof and specifics.", requires: "range", scenarioId: "public_speech" },
    { id: "follow_up_questions", label: "Follow up questions", desc: "Expect one more question after each answer.", requires: "pace", scenarioId: "interview" },
    { id: "short_answer", label: "Short answer challenge", desc: "Make the point in two clear sentences.", requires: "plain", scenarioId: "pitch" },
    { id: "explain_beginner", label: "Explain it to a beginner", desc: "Trade jargon for a concrete example.", requires: "offscript", scenarioId: "exam_viva" },
    { id: "recover_and_continue", label: "Recover and continue", desc: "Find your thread again after a difficult question.", requires: "floor", scenarioId: "public_speech" },
  ];

  function questById(id) {
    return QUESTS.find(function (q) { return q.id === id; }) || null;
  }

  function modifierById(id) {
    return MODIFIERS.find(function (m) { return m.id === id; }) || null;
  }

  function isQuestComplete(quest, history) {
    if (!quest) return false;
    var entries = history || [];
    return entries.some(function (entry, index) {
      return quest.complete(entry, entries.slice(index + 1));
    });
  }

  function completedQuestIds(history) {
    return QUESTS.filter(function (q) { return isQuestComplete(q, history); }).map(function (q) { return q.id; });
  }

  function dayIndex(date) {
    var d = date instanceof Date ? date : new Date(date || Date.now());
    var start = new Date(d.getFullYear(), 0, 1);
    return Math.floor((d - start) / 86400000);
  }

  function selectDailyQuest(history, date) {
    var entries = history || [];
    var completed = new Set(completedQuestIds(entries));
    var applicable = QUESTS.filter(function (q) { return !completed.has(q.id) && q.available(entries); });
    if (applicable.length) return applicable[0];
    var remaining = QUESTS.filter(function (q) { return !completed.has(q.id); });
    if (remaining.length) return remaining[dayIndex(date) % remaining.length];
    return QUESTS[dayIndex(date) % QUESTS.length];
  }

  function unlockedModifiers(progress) {
    var earned = new Set((progress && progress.milestones || []).filter(function (m) { return m.earned; }).map(function (m) { return m.id; }));
    return MODIFIERS.filter(function (m) { return earned.has(m.requires); }).map(function (m) { return m.id; });
  }

  function modifierState(progress) {
    var unlocked = new Set(unlockedModifiers(progress));
    return MODIFIERS.map(function (m) { return { id: m.id, label: m.label, desc: m.desc, requires: m.requires, scenarioId: m.scenarioId, unlocked: unlocked.has(m.id) }; });
  }

  function readState(storage) {
    try {
      var raw = (storage || root.localStorage).getItem(QUEST_STATE_KEY);
      var value = JSON.parse(raw || "{}");
      return {
        completedQuestIds: Array.isArray(value.completedQuestIds) ? value.completedQuestIds.filter(function (id) { return typeof id === "string"; }) : [],
        unlockedModifierIds: Array.isArray(value.unlockedModifierIds) ? value.unlockedModifierIds.filter(function (id) { return typeof id === "string"; }) : [],
      };
    } catch (_e) {
      return { completedQuestIds: [], unlockedModifierIds: [] };
    }
  }

  function syncState(history, progress, storage) {
    var derivedCompleted = completedQuestIds(history);
    var derivedUnlocked = unlockedModifiers(progress);
    var existing = readState(storage);
    var state = {
      completedQuestIds: Array.from(new Set(existing.completedQuestIds.concat(derivedCompleted))),
      unlockedModifierIds: Array.from(new Set(existing.unlockedModifierIds.concat(derivedUnlocked))),
    };
    try { (storage || root.localStorage).setItem(QUEST_STATE_KEY, JSON.stringify(state)); } catch (_e) {}
    return state;
  }

  root.GreenRoomGame = {
    quests: QUESTS,
    modifiers: MODIFIERS,
    questById: questById,
    modifierById: modifierById,
    isQuestComplete: isQuestComplete,
    completedQuestIds: completedQuestIds,
    selectDailyQuest: selectDailyQuest,
    firstUnusedScenario: firstUnusedScenario,
    distinctScenarioCount: distinctScenarioCount,
    unlockedModifiers: unlockedModifiers,
    modifierState: modifierState,
    readState: readState,
    syncState: syncState,
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
