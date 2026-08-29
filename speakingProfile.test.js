import test from "node:test";
import assert from "node:assert/strict";
import { aggregateSpeakingProfile } from "./speakingProfile.js";

const session = (id, flags = {}, date = `2026-08-${String(Number(id) + 1).padStart(2, "0")}`) => ({
  id, status: "completed", startedAt: `${date}T10:00:00Z`, events: [{ type: "turn", signals: flags }],
});
const observation = (id, type, date) => ({ id, status: "completed", startedAt: `${date}T10:00:00Z`, events: [{ type: "turn", turnAnalysis: { followUpType: type, answered: type === "recovery" } }] });

test("requires repeated evidence across sessions", () => {
  assert.deepEqual(aggregateSpeakingProfile([session("1", { vague: true })]).observations, []);
});
test("finds repeated specificity and evidence patterns", () => {
  const profile = aggregateSpeakingProfile([session("1", { vagueExample: true, unsupportedClaim: true }), session("2", { vague: true, unsupportedClaim: true }), session("3", { vague: true, unsupportedClaim: true })]);
  assert.deepEqual(profile.observations.map((x) => x.label), ["Specificity", "Evidence"]);
});
test("describes a pattern as showing up less often", () => {
  const profile = aggregateSpeakingProfile([session("1", { vague: true }), session("2", { vague: true }), session("3", { vague: true }), session("4"), session("5")]);
  assert.equal(profile.observations[0].status, "Showing up less often");
  assert.equal(profile.observations[0].recentDirection, "improving");
});
test("recognizes recovery as a strength", () => {
  const profile = aggregateSpeakingProfile([observation("1", "recovery", "2026-08-01"), observation("2", "recovery", "2026-08-02")]);
  assert.equal(profile.observations[0].label, "Recovery");
  assert.equal(profile.observations[0].status, "Emerging strength");
});
test("aggregates across scenarios and ignores malformed sessions", () => {
  const profile = aggregateSpeakingProfile([session("1", { incompleteExplanation: true }), session("2", { incompleteExplanation: true }), session("3", { incompleteExplanation: true }), null, { id: "bad", status: "completed" }]);
  assert.equal(profile.observations[0].label, "Completeness");
  assert.equal(profile.sessionsAnalyzed, 3);
});
test("bounds input and omits raw session data", () => {
  const profile = aggregateSpeakingProfile(Array.from({ length: 60 }, (_, i) => session(String(i), { selfContradictory: true })), { maxSessions: 50 });
  assert.equal(profile.sessionsAnalyzed, 50);
  assert.equal(Object.keys(profile.observations[0]).sort().join(","), "description,evidenceCount,label,recentDirection,status,type");
  assert.equal(JSON.stringify(profile).includes("studentText"), false);
});
test("does not fabricate observations from clear sessions", () => {
  assert.equal(aggregateSpeakingProfile([session("1", {}), session("2", {}), session("3", {})]).observations.length, 0);
});
