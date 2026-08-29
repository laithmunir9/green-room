import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const dataDir = await mkdtemp(join(tmpdir(), "prelight-session-storage-"));
process.env.PRELIGHT_SESSION_DATA_DIR = dataDir;

const {
  MAX_SESSION_EVENTS,
  normalizePracticeSession,
  putPracticeSessionLocal,
  getPracticeSessionLocal,
  listPracticeSessionsLocal,
} = await import("./sessionStorage.js");

test.after(async () => rm(dataDir, { recursive: true, force: true }));

test("local session storage preserves ownership, order, and review", () => {
  const session = putPracticeSessionLocal({
    id: "session-one",
    studentId: "student-one",
    templateId: "interview",
    templateName: "Job interview",
    scenarioDescription: "A product role interview",
    startedAt: "2026-08-29T10:00:00.000Z",
    endedAt: "2026-08-29T10:05:00.000Z",
    status: "completed",
    events: [
      { type: "facilitator", sequence: 1, personaId: "facilitator", text: "Tell me about yourself." },
      { type: "turn", sequence: 2, studentText: "I built a useful tool.", facilitator: [{ personaId: "curious", text: "What changed because of it?" }], signals: { vagueExample: true }, turnAnalysis: { followUpType: "specificity", reason: "Needs an outcome", importance: "medium" } },
    ],
    review: { rubric: { articulation: "Clear", engagement: "Present", contentCorrespondence: "Relevant" }, bestLine: "I built a useful tool." },
    token: "must-not-persist",
  });

  assert.equal(session.id, "session-one");
  assert.deepEqual(session.events.map((event) => event.sequence), [1, 2]);
  assert.equal(session.review.bestLine, "I built a useful tool.");
  assert.equal("token" in session, false);
  assert.equal(getPracticeSessionLocal("student-one", "session-one").studentId, "student-one");
  assert.equal(getPracticeSessionLocal("student-two", "session-one"), null);
  assert.equal(listPracticeSessionsLocal("student-one").length, 1);
  assert.equal(listPracticeSessionsLocal("student-two").length, 0);
});

test("upserting a session ID replaces the active record instead of creating a duplicate", () => {
  putPracticeSessionLocal({ id: "same-session", studentId: "student-one", status: "active", startedAt: "2026-08-29T10:00:00.000Z", events: [] });
  putPracticeSessionLocal({ id: "same-session", studentId: "student-one", status: "completed", startedAt: "2026-08-29T10:00:00.000Z", endedAt: "2026-08-29T10:01:00.000Z", events: [], review: { rubric: { articulation: "Done" } } });

  assert.equal(listPracticeSessionsLocal("student-one").filter((session) => session.id === "same-session").length, 1);
  assert.equal(getPracticeSessionLocal("student-one", "same-session").status, "completed");
});

test("session normalization bounds events and removes untrusted fields", () => {
  const events = Array.from({ length: MAX_SESSION_EVENTS + 10 }, (_, index) => ({
    type: "turn",
    sequence: index + 1,
    studentText: "x".repeat(3000),
    facilitator: [{ personaId: "facilitator", text: "y".repeat(3000) }],
    turnAnalysis: { reason: "z".repeat(500) },
    sessionToken: "do-not-store",
  }));
  const normalized = normalizePracticeSession({ id: "bounded", studentId: "student-one", events, secret: "nope" });

  assert.equal(normalized.events.length, MAX_SESSION_EVENTS);
  assert.deepEqual(normalized.events.map((event) => event.sequence), Array.from({ length: MAX_SESSION_EVENTS }, (_, index) => index + 11));
  assert.ok(normalized.events.every((event) => event.studentText.length <= 2000));
  assert.ok(normalized.events.every((event) => event.facilitator.every((reply) => reply.text.length <= 2000)));
  assert.ok(normalized.events.every((event) => !("sessionToken" in event)));
  assert.equal("secret" in normalized, false);
});
