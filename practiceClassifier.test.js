import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildScenarioKeywordSet,
  classifyStudentMessage,
  scenarioFollowUpPolicy,
  selectResponders,
  summarizeDelivery,
  summarizeEngagement,
} from "./practiceClassifier.js";

test("buildScenarioKeywordSet strips short/stop words and lowercases", () => {
  const set = buildScenarioKeywordSet("I'm pitching a startup about renewable energy storage to investors");
  assert.ok(set.has("pitching"));
  assert.ok(set.has("startup"));
  assert.ok(set.has("renewable"));
  assert.ok(set.has("energy"));
  assert.ok(set.has("storage"));
  assert.ok(set.has("investors"));
  assert.ok(!set.has("about"));
  assert.ok(!set.has("to"));
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

test("selectResponders: stuck phrase brings in the facilitator over encouraging", () => {
  const picks = selectResponders(
    { selfContradiction: false, stuckPhrase: true, hesitantShort: true, offTopic: false, vague: false },
    () => 1
  );
  assert.deepEqual(picks, ["facilitator"]);
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

test("selectResponders: no triggers falls back to impressed", () => {
  const picks = selectResponders(
    { selfContradiction: false, stuckPhrase: false, hesitantShort: false, offTopic: false, vague: false },
    () => 1
  );
  assert.deepEqual(picks, ["impressed"]);
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

test("a substantive on-topic answer with no scenario keyword overlap is not off-topic", () => {
  const signals = classifyStudentMessage(
    "I led the migration of our billing service from a monolith to microservices over six months.",
    { keywordSet: new Set(["practicing", "software", "engineering", "interview"]) }
  );
  assert.equal(signals.offTopic, false);
  const picks = selectResponders(signals, () => 1);
  assert.deepEqual(picks, ["impressed"]);
});

test("an explicit topic-shift phrase is flagged off-topic even when it echoes scenario keywords", () => {
  const signals = classifyStudentMessage(
    "Anyway, forget the interview stuff, what's for lunch?",
    { keywordSet: new Set(["interview"]) }
  );
  assert.equal(signals.offTopic, true);
});

test("flags an unsupported impact claim without calling it false", () => {
  const signals = classifyStudentMessage("Our product cuts customer acquisition costs by a lot.", { scenarioId: "pitch" });
  assert.equal(signals.unsupportedClaim, true);
  assert.equal(selectResponders(signals, () => 1, "pitch").includes("skeptical"), true);
});

test("does not flag an impact claim that includes supporting detail", () => {
  const signals = classifyStudentMessage("We reduced onboarding time by 40% in a pilot with 18 users.", { scenarioId: "pitch" });
  assert.equal(signals.unsupportedClaim, false);
});

test("flags a generic answer to an example question", () => {
  const signals = classifyStudentMessage(
    "I've done leadership things at school and it went pretty well.",
    { scenarioId: "interview", previousQuestion: "Tell me about a time you led a team." }
  );
  assert.equal(signals.vagueExample, true);
  assert.deepEqual(selectResponders(signals, () => 1, "interview"), ["curious"]);
});

test("does not flag a concrete example with an observable result", () => {
  const signals = classifyStudentMessage(
    "In our service club fundraiser, I coordinated five volunteers, changed the outreach plan, and we raised $8,000 more than the previous event.",
    { scenarioId: "interview", previousQuestion: "Tell me about a time you led a team." }
  );
  assert.equal(signals.vagueExample, false);
});

test("flags an obvious launch-status contradiction but allows beta users before public launch", () => {
  const contradictory = classifyStudentMessage("We haven't launched yet.", {
    recentStudentMessages: ["We have 500 users."],
    scenarioId: "pitch",
  });
  assert.equal(contradictory.possibleContradiction, true);

  const compatible = classifyStudentMessage("We haven't launched publicly yet.", {
    recentStudentMessages: ["We have 500 beta users."],
    scenarioId: "pitch",
  });
  assert.equal(compatible.possibleContradiction, false);
});

test("flags a short multi-part exam explanation as possibly incomplete", () => {
  const signals = classifyStudentMessage("Mitosis makes two cells, and the chromosomes separate.", {
    scenarioId: "exam_viva",
    previousQuestion: "Explain two mechanisms involved in this process.",
  });
  assert.equal(signals.incompleteExplanation, true);
  assert.deepEqual(selectResponders(signals, () => 1, "exam_viva"), ["curious"]);
});

test("keeps casual conversation from escalating ordinary vagueness", () => {
  const signals = classifyStudentMessage("That was pretty good.", {
    scenarioId: "casual",
    previousQuestion: "What did you think of the movie?",
  });
  assert.equal(signals.vagueExample, false);
  assert.deepEqual(selectResponders(signals, () => 1, "casual"), ["impressed"]);
  assert.deepEqual(scenarioFollowUpPolicy("casual"), {
    evidence: "low", specificity: "low", contradiction: "low", completeness: "low",
  });
});

test("keeps a clear interview answer free of forced follow-up signals", () => {
  const signals = classifyStudentMessage(
    "At university I led a four person robotics team, split the work, resolved a supplier delay, and we delivered the prototype two weeks early.",
    { scenarioId: "interview", previousQuestion: "Tell me about a time you led a team." }
  );
  assert.equal(signals.unsupportedClaim, false);
  assert.equal(signals.vagueExample, false);
  assert.equal(signals.incompleteExplanation, false);
  assert.deepEqual(selectResponders(signals, () => 1, "interview"), ["impressed"]);
});

test("summarizeDelivery aggregates hedge rate and ramble rate across turns", () => {
  const texts = [
    "I think maybe this is kind of right, I guess.", // hedgy, short
    "The mechanism is straightforward and well established.", // clean
  ];
  const result = summarizeDelivery(texts);
  assert.equal(result.turnCount, 2);
  assert.ok(result.hedgeRate > 0);
  assert.equal(result.rambleRate, 0.5); // first turn is vague (4 hedges >= 2), second is clean
});

test("summarizeDelivery returns zero rates for an empty transcript", () => {
  const result = summarizeDelivery([]);
  assert.deepEqual(result, { turnCount: 0, wordCount: 0, hedgeRate: 0, rambleRate: 0, avgWpm: null, pacedTurnCount: 0 });
});

test("summarizeDelivery computes real wpm from voice turn word counts and durations", () => {
  const texts = ["This is a spoken turn with exactly eight words."];
  // 8 words in 4 seconds = 120 words/minute
  const result = summarizeDelivery(texts, [{ wordCount: 8, durationSec: 4 }]);
  assert.equal(result.avgWpm, 120);
  assert.equal(result.pacedTurnCount, 1);
});

test("summarizeDelivery leaves avgWpm null when no voice turns were recorded", () => {
  const texts = ["A typed turn, never spoken aloud."];
  const result = summarizeDelivery(texts, []);
  assert.equal(result.avgWpm, null);
  assert.equal(result.pacedTurnCount, 0);
});

test("summarizeEngagement computes question rate across turns", () => {
  const texts = [
    "Does that make sense so far?",
    "Here is the rest of my point, no question here.",
  ];
  const result = summarizeEngagement(texts);
  assert.equal(result.turnCount, 2);
  assert.equal(result.questionRate, 0.5);
});

test("summarizeEngagement returns zero rate for an empty transcript", () => {
  const result = summarizeEngagement([]);
  assert.deepEqual(result, { turnCount: 0, questionRate: 0 });
});
