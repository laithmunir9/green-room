import test from "node:test";
import assert from "node:assert/strict";
import { buildPracticeMemory, practiceMemoryPrompt } from "./practiceMemory.js";

const profile = (...observations) => ({ observations });
const issue = (label, extra = {}) => ({ label, evidenceCount: 3, status: "Recurring", recentDirection: "recurring", ...extra });

test("returns no memory without a profile or with casual conversation", () => {
  assert.deepEqual(buildPracticeMemory(null, "pitch"), { observations: [] });
  assert.deepEqual(buildPracticeMemory(profile(issue("Evidence")), "casual"), { observations: [] });
});

test("selects relevant recurring pitch evidence", () => {
  const memory = buildPracticeMemory(profile(issue("Evidence"), issue("Completeness")), "pitch");
  assert.deepEqual(memory.observations.map((item) => item.type), ["evidence"]);
  assert.match(memory.observations[0].instruction, /concrete support/);
});

test("filters irrelevant observations by scenario", () => {
  const memory = buildPracticeMemory(profile(issue("Evidence")), "exam_viva");
  assert.deepEqual(memory.observations, []);
});

test("deprioritizes improving and emerging patterns", () => {
  const memory = buildPracticeMemory(profile(
    issue("Evidence", { status: "Showing up less often", recentDirection: "improving" }),
    issue("Recovery", { evidenceCount: 2, status: "Emerging strength" }),
  ), "pitch");
  assert.deepEqual(memory.observations, []);
});

test("allows a repeated recovery strength in interview practice", () => {
  const memory = buildPracticeMemory(profile(issue("Recovery", { evidenceCount: 3, status: "Strength" })), "interview");
  assert.equal(memory.observations[0].type, "recovery");
  assert.match(memory.observations[0].instruction, /refine/);
});

test("bounds memory and prompt text", () => {
  const memory = buildPracticeMemory(profile(issue("Evidence"), issue("Specificity"), issue("Consistency")), "pitch");
  assert.equal(memory.observations.length, 2);
  const prompt = practiceMemoryPrompt(memory);
  assert.ok(prompt.length < 700);
  assert.equal(prompt.includes("studentText"), false);
});

test("malformed profile data is ignored safely", () => {
  assert.deepEqual(buildPracticeMemory({ observations: [{ label: "Evidence", evidenceCount: "bad" }, null] }, "pitch"), { observations: [] });
  assert.equal(practiceMemoryPrompt(null), "");
});
