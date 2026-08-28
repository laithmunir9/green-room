import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

async function loadGame() {
  const source = await readFile(new URL("./public/gameProgress.js", import.meta.url), "utf8");
  const context = {};
  vm.createContext(context);
  vm.runInContext(source, context);
  return context.GreenRoomGame;
}

function session(templateId, signals = {}, extra = {}) {
  return { templateId, signals, ...extra };
}

test("daily quest starts with the first rep and moves to a new room", async () => {
  const game = await loadGame();
  assert.equal(game.selectDailyQuest([], new Date("2026-08-28")).id, "first_rep");
  const history = [session("public_speech", { turnCount: 3, wordCount: 40 })];
  assert.equal(game.selectDailyQuest(history, new Date("2026-08-28")).id, "new_room");
});

test("quest completion uses the current session evidence", async () => {
  const game = await loadGame();
  const quest = game.questById("plain_speech");
  assert.equal(game.isQuestComplete(quest, [session("pitch", { wordCount: 60, hedgeRate: 0.01 })]), true);
  assert.equal(game.isQuestComplete(quest, [session("pitch", { wordCount: 60, hedgeRate: 0.04 })]), false);
});

test("new room quest compares a session with older history", async () => {
  const game = await loadGame();
  const quest = game.questById("new_room");
  assert.equal(game.isQuestComplete(quest, [session("pitch"), session("public_speech")]), true);
  assert.equal(game.isQuestComplete(quest, [session("pitch"), session("pitch")]), false);
});

test("completed quests do not reappear until the catalog is exhausted", async () => {
  const game = await loadGame();
  const history = [
    session("public_speech", {}, { questId: "first_rep" }),
    session("pitch", {}, { questId: "new_room" }),
    session("interview", { wordCount: 60, hedgeRate: 0.01 }, { questId: "plain_speech" }),
  ];
  const quest = game.selectDailyQuest(history, new Date("2026-08-28"));
  assert.equal(quest.id, "conversational_pace");
  assert.equal(game.selectDailyQuest(history, new Date("2026-08-29")).id, "conversational_pace");
});

test("milestones unlock the matching challenge modifiers", async () => {
  const game = await loadGame();
  const state = game.modifierState({ milestones: [
    { id: "range", earned: true },
    { id: "pace", earned: false },
    { id: "plain", earned: true },
    { id: "offscript", earned: false },
    { id: "floor", earned: false },
  ] });
  assert.equal(state.find((m) => m.id === "skeptical_audience").unlocked, true);
  assert.equal(state.find((m) => m.id === "short_answer").unlocked, true);
  assert.equal(state.find((m) => m.id === "follow_up_questions").unlocked, false);
});

test("state sync tolerates invalid storage and preserves derived progress", async () => {
  const game = await loadGame();
  const values = new Map([["greenRoomQuestState", "not json"]]);
  const storage = {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  };
  const state = game.syncState(
    [session("public_speech")],
    { milestones: [{ id: "range", earned: true }] },
    storage,
  );
  assert.equal(state.completedQuestIds.includes("first_rep"), true);
  assert.equal(state.unlockedModifierIds.includes("skeptical_audience"), true);
  assert.doesNotThrow(() => JSON.parse(values.get("greenRoomQuestState")));
});
