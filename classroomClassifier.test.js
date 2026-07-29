import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTopicKeywordSet, classifyStudentMessage, selectResponders } from "./classroomClassifier.js";

test("buildTopicKeywordSet strips short/stop words and lowercases", () => {
  const set = buildTopicKeywordSet("Mechanics: Motion", "SUVAT equations", ["Velocity-time graphs"]);
  assert.ok(set.has("mechanics"));
  assert.ok(set.has("motion"));
  assert.ok(set.has("suvat"));
  assert.ok(set.has("equations"));
  assert.ok(set.has("velocity"));
  assert.ok(!set.has("the"));
});

test("classifies a long, hedging explanation as vague", () => {
  const text = "So I think it's kind of like, um, when the object sort of moves and maybe the speed changes a bit over some time, I guess, and that's basically the idea I think, roughly speaking, more or less, in general terms.";
  const signals = classifyStudentMessage(text, { keywordSet: new Set(["motion"]) });
  assert.ok(signals.wordCount > 40);
  assert.equal(signals.vague, true);
});

test("classifies a short hesitant message", () => {
  const signals = classifyStudentMessage("I'm not sure, maybe?", { keywordSet: new Set(["motion"]) });
  assert.equal(signals.hesitantShort, true);
});

test("classifies an explicit stuck phrase", () => {
  const signals = classifyStudentMessage("Honestly I'm stuck, I don't know where to start.", { keywordSet: new Set(["motion"]) });
  assert.equal(signals.stuckPhrase, true);
});

test("flags off-topic when message shares no keywords and has real content", () => {
  const signals = classifyStudentMessage(
    "Anyway, what did everyone have for lunch today, I'm starving.",
    { keywordSet: new Set(["motion", "suvat", "velocity"]) }
  );
  assert.equal(signals.offTopic, true);
});

test("does not flag off-topic for a short acknowledgement", () => {
  const signals = classifyStudentMessage("okay yeah", { keywordSet: new Set(["motion"]) });
  assert.equal(signals.offTopic, false);
});

test("flags self-contradiction against a recent statement covering the same idea", () => {
  const signals = classifyStudentMessage(
    "Actually velocity doesn't change during this at all.",
    { keywordSet: new Set(["motion"]), recentStudentMessages: ["The velocity changes constantly here."] }
  );
  assert.equal(signals.selfContradiction, true);
});

test("flags self-contradiction from absolute language mixed with hedging", () => {
  const signals = classifyStudentMessage("It's always true, I think, that this happens.", { keywordSet: new Set() });
  assert.equal(signals.selfContradiction, true);
});

test("selectResponders: skeptical wins on self-contradiction", () => {
  const picks = selectResponders(
    { selfContradiction: true, stuckPhrase: false, hesitantShort: false, offTopic: false, vague: false },
    () => 1
  );
  assert.deepEqual(picks, ["skeptical"]);
});

test("selectResponders: stuck phrase brings in the teacher over encouraging", () => {
  const picks = selectResponders(
    { selfContradiction: false, stuckPhrase: true, hesitantShort: true, offTopic: false, vague: false },
    () => 1
  );
  assert.deepEqual(picks, ["teacher"]);
});

test("selectResponders: short hedge without stuck phrase brings in encouraging", () => {
  const picks = selectResponders(
    { selfContradiction: false, stuckPhrase: false, hesitantShort: true, offTopic: false, vague: false },
    () => 1
  );
  assert.deepEqual(picks, ["encouraging"]);
});

test("selectResponders: off-topic brings in distracted", () => {
  const picks = selectResponders(
    { selfContradiction: false, stuckPhrase: false, hesitantShort: false, offTopic: true, vague: false },
    () => 1
  );
  assert.deepEqual(picks, ["distracted"]);
});

test("selectResponders: vague brings in curious", () => {
  const picks = selectResponders(
    { selfContradiction: false, stuckPhrase: false, hesitantShort: false, offTopic: false, vague: true },
    () => 1
  );
  assert.deepEqual(picks, ["curious"]);
});

test("selectResponders: no triggers falls back to quick_learner", () => {
  const picks = selectResponders(
    { selfContradiction: false, stuckPhrase: false, hesitantShort: false, offTopic: false, vague: false },
    () => 1
  );
  assert.deepEqual(picks, ["quick_learner"]);
});

test("selectResponders: shy_engaged is added as a bonus when rng rolls low and there's room", () => {
  const picks = selectResponders(
    { selfContradiction: false, stuckPhrase: false, hesitantShort: false, offTopic: false, vague: true },
    () => 0.01
  );
  assert.deepEqual(picks, ["curious", "shy_engaged"]);
});

test("selectResponders: shy_engaged is skipped when rng rolls high", () => {
  const picks = selectResponders(
    { selfContradiction: false, stuckPhrase: false, hesitantShort: false, offTopic: false, vague: true },
    () => 0.99
  );
  assert.deepEqual(picks, ["curious"]);
});

test("selectResponders: caps at 3 responders even if multiple triggers fire", () => {
  const picks = selectResponders(
    { selfContradiction: true, stuckPhrase: true, hesitantShort: false, offTopic: true, vague: true },
    () => 0.01
  );
  assert.equal(picks.length, 3);
});
