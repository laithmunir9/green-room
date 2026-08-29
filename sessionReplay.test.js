import assert from "node:assert/strict";
import test from "node:test";
await import("./sessionReplay.js");
const { buildReplayViewModel } = globalThis.PrelightSessionReplay;

function session(events) {
  return {
    id: "session-1",
    templateName: "Job interview",
    scenarioDescription: "A product role interview",
    endedAt: "2026-08-29T10:05:00.000Z",
    events,
    review: { rubric: { contentCorrespondence: "Relevant answer." }, bestLine: "I changed the onboarding flow." },
  };
}

test("builds one evidence moment from stored signals and analysis", () => {
  const replay = buildReplayViewModel(session([
    { type: "facilitator", sequence: 1, text: "Tell me about your idea." },
    { type: "turn", sequence: 2, studentText: "It will reduce costs.", signals: { unsupportedClaim: true }, turnAnalysis: { followUpType: "evidence" }, facilitator: [{ personaId: "skeptic", text: "What evidence do you have?" }] },
  ]));
  assert.equal(replay.keyMoments.length, 1);
  assert.equal(replay.keyMoments[0].type, "evidence");
  assert.equal(replay.keyMoments[0].facilitatorText, "Tell me about your idea.");
  assert.equal(replay.keyMoments[0].userText, "It will reduce costs.");
});

test("selects specificity, contradiction, and incomplete explanation conservatively", () => {
  const replay = buildReplayViewModel(session([
    { type: "facilitator", sequence: 1, text: "What did you do?" },
    { type: "turn", sequence: 2, studentText: "I helped the team.", signals: { vagueExample: true }, facilitator: [{ personaId: "manager", text: "Can you give me a specific example?" }] },
    { type: "turn", sequence: 3, studentText: "We disagreed about the approach.", signals: { possibleContradiction: true }, turnAnalysis: { followUpType: "clarification" }, facilitator: [{ personaId: "manager", text: "Which approach did you choose?" }] },
    { type: "turn", sequence: 4, studentText: "The process uses a loop.", signals: { incompleteExplanation: true }, facilitator: [{ personaId: "manager", text: "What happens next?" }] },
  ]));
  assert.deepEqual(replay.keyMoments.map((moment) => moment.type), ["specificity", "clarification", "incomplete"]);
});

test("deduplicates adjacent issues and preserves a supported recovery", () => {
  const replay = buildReplayViewModel(session([
    { type: "facilitator", sequence: 1, text: "Give me an example." },
    { type: "turn", sequence: 2, studentText: "Generally, I helped.", signals: { vagueExample: true }, facilitator: [{ personaId: "manager", text: "What specifically happened?" }] },
    { type: "turn", sequence: 3, studentText: "I fixed the signup bug and reduced support requests.", signals: {}, turnAnalysis: { followUpType: "recovery", answered: true }, facilitator: [{ personaId: "manager", text: "That is clearer." }] },
    { type: "turn", sequence: 4, studentText: "I did lots of other work.", signals: { vagueExample: true }, facilitator: [{ personaId: "manager", text: "Can you be more specific?" }] },
  ]));
  assert.deepEqual(replay.keyMoments.map((moment) => moment.type), ["specificity", "recovery"]);
});

test("clear short sessions do not receive fabricated moments", () => {
  const replay = buildReplayViewModel(session([
    { type: "facilitator", sequence: 1, text: "What are you working on?" },
    { type: "turn", sequence: 2, studentText: "I am building a tool for students.", signals: {}, turnAnalysis: { followUpType: "none" }, facilitator: [{ personaId: "manager", text: "Thanks, that is clear." }] },
  ]));
  assert.deepEqual(replay.keyMoments, []);
});

test("orders events and exposes only safe transcript entries", () => {
  const replay = buildReplayViewModel(session([
    { type: "turn", sequence: 3, occurredAt: "2026-08-29T10:03:00.000Z", studentText: "Second answer", facilitator: [{ personaId: "manager", text: "Second response", reason: "internal" }], turnAnalysis: { reason: "private" } },
    { type: "facilitator", sequence: 1, occurredAt: "2026-08-29T10:01:00.000Z", personaId: "facilitator", text: "First question" },
    { type: "turn", sequence: 2, occurredAt: "2026-08-29T10:02:00.000Z", studentText: "First answer", facilitator: [{ personaId: "manager", text: "Follow up" }] },
  ]));
  assert.deepEqual(replay.transcript.map((entry) => `${entry.role}:${entry.text}`), [
    "facilitator:First question",
    "student:First answer",
    "facilitator:Follow up",
    "student:Second answer",
    "facilitator:Second response",
  ]);
  assert.equal("reason" in replay.transcript.at(-1), false);
});

test("malformed and missing session data fail safely", () => {
  assert.equal(buildReplayViewModel(null), null);
  assert.deepEqual(buildReplayViewModel({ id: "empty", events: [null, "bad"] }).keyMoments, []);
});
