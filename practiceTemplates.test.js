import { test } from "node:test";
import assert from "node:assert/strict";
import { PRACTICE_TEMPLATES, TEMPLATE_IDS, findPersona } from "./practiceTemplates.js";

const EXPECTED_TEMPLATE_IDS = ["exam_viva", "pitch", "interview", "public_speech", "casual"];
const EXPECTED_ROLE_IDS = ["curious", "skeptical", "encouraging", "impressed", "distracted", "shy_engaged", "facilitator"].sort();

test("has exactly the 5 expected template ids", () => {
  assert.deepEqual([...TEMPLATE_IDS].sort(), [...EXPECTED_TEMPLATE_IDS].sort());
  assert.deepEqual(Object.keys(PRACTICE_TEMPLATES).sort(), [...EXPECTED_TEMPLATE_IDS].sort());
});

test("every template has a non-empty name and description", () => {
  for (const id of TEMPLATE_IDS) {
    const t = PRACTICE_TEMPLATES[id];
    assert.equal(t.id, id);
    assert.equal(typeof t.name, "string");
    assert.ok(t.name.length > 0);
    assert.equal(typeof t.description, "string");
    assert.ok(t.description.length > 0);
  }
});

test("every template defines exactly the 7 expected roles, no duplicates, no extras", () => {
  for (const id of TEMPLATE_IDS) {
    const roleIds = PRACTICE_TEMPLATES[id].personas.map((p) => p.id).sort();
    assert.deepEqual(roleIds, EXPECTED_ROLE_IDS, `template ${id} role ids`);
  }
});

test("every persona in every template has a non-empty name, trait, and systemPrompt", () => {
  for (const id of TEMPLATE_IDS) {
    for (const p of PRACTICE_TEMPLATES[id].personas) {
      assert.equal(typeof p.name, "string");
      assert.ok(p.name.length > 0, `${id}/${p.id} name`);
      assert.equal(typeof p.trait, "string");
      assert.ok(p.trait.length > 0, `${id}/${p.id} trait`);
      assert.equal(typeof p.systemPrompt, "string");
      assert.ok(p.systemPrompt.length > 20, `${id}/${p.id} systemPrompt`);
    }
  }
});

test("findPersona resolves a real template+role combination", () => {
  const p = findPersona("exam_viva", "skeptical");
  assert.ok(p);
  assert.equal(p.id, "skeptical");
});

test("findPersona returns null for an unknown template", () => {
  assert.equal(findPersona("not_a_template", "curious"), null);
});

test("findPersona returns null for an unknown role in a real template", () => {
  assert.equal(findPersona("exam_viva", "not_a_role"), null);
});
