import assert from "node:assert/strict";
import test from "node:test";
await import("./sessionHistory.js");
const { mergeSessionHistory, serverSessionToHistory } = globalThis.PrelightSessionHistory;

test("history merge deduplicates matching stable session IDs", () => {
  const result = mergeSessionHistory(
    [{ sessionId: "same", templateName: "Old label", date: "2026-08-28T00:00:00.000Z" }],
    [{ id: "same", templateName: "Server label", endedAt: "2026-08-29T00:00:00.000Z" }]
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].templateName, "Server label");
});

test("legacy local entries remain beside server sessions", () => {
  const result = mergeSessionHistory(
    [{ templateId: "pitch", date: "2026-08-28T00:00:00.000Z" }],
    [{ id: "server-session", templateId: "pitch", startedAt: "2026-08-29T00:00:00.000Z" }]
  );
  assert.equal(result.length, 2);
});

test("history merge preserves local history when server data is empty or malformed", () => {
  const local = [{ sessionId: "local", date: "2026-08-29T00:00:00.000Z" }];
  assert.deepEqual(mergeSessionHistory(local, []), local);
  assert.deepEqual(mergeSessionHistory(local, [null, {}, { events: "not-an-array" }]), local);
});

test("history merge sorts newest first and maps session events to the existing card shape", () => {
  const result = mergeSessionHistory([], [
    { id: "older", startedAt: "2026-08-28T00:00:00.000Z", events: [] },
    { id: "newer", endedAt: "2026-08-29T00:00:00.000Z", events: [{ type: "turn", studentText: "A useful answer." }] },
  ]);
  assert.deepEqual(result.map((entry) => entry.sessionId), ["newer", "older"]);
  assert.equal(result[0].transcript, "A useful answer.");
});

test("malformed server session is skipped", () => {
  assert.equal(serverSessionToHistory({ templateId: "pitch" }), null);
});
