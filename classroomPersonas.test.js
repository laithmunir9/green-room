import { test } from "node:test";
import assert from "node:assert/strict";
import { CLASSROOM_PERSONAS, TEACHER_AGENT, findPersona } from "./classroomPersonas.js";

test("has exactly 6 peer personas with the expected ids", () => {
  const ids = CLASSROOM_PERSONAS.map((p) => p.id).sort();
  assert.deepEqual(ids, [
    "curious",
    "distracted",
    "encouraging",
    "quick_learner",
    "shy_engaged",
    "skeptical",
  ]);
});

test("every persona has a non-empty name, trait, and systemPrompt", () => {
  for (const p of [...CLASSROOM_PERSONAS, TEACHER_AGENT]) {
    assert.equal(typeof p.name, "string");
    assert.ok(p.name.length > 0);
    assert.equal(typeof p.trait, "string");
    assert.ok(p.trait.length > 0);
    assert.equal(typeof p.systemPrompt, "string");
    assert.ok(p.systemPrompt.length > 20);
  }
});

test("persona ids are unique, teacher id does not collide with a peer id", () => {
  const ids = CLASSROOM_PERSONAS.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(!ids.includes(TEACHER_AGENT.id));
});

test("findPersona resolves peers and the teacher, returns null for unknown ids", () => {
  assert.equal(findPersona("curious").name, "Maya");
  assert.equal(findPersona("teacher").name, "The Teacher");
  assert.equal(findPersona("nonexistent_id"), null);
});
