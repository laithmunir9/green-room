import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

// The active practice keeps the latest 40 conversation messages. Structured
// events are one opener plus one event per student turn, so retain one opener
// and the latest 40 turns without allowing session JSON to grow forever.
export const MAX_SESSION_EVENTS = 41;
export const MAX_SESSION_TEXT = 2000;
export const MAX_SESSION_REVIEW_TEXT = 1000;

const moduleDirectory = dirname(fileURLToPath(import.meta.url));

function dataDirectory() {
  const configured = process.env.PRELIGHT_SESSION_DATA_DIR || process.env.PRELIGHT_DATA_DIR || process.env.GREEN_ROOM_DATA_DIR;
  return configured ? resolve(configured) : join(moduleDirectory, "data");
}

function sessionsPath() {
  return join(dataDirectory(), "practice-sessions.json");
}

function text(value, max = MAX_SESSION_TEXT) {
  return String(value ?? "").replace(/\r/g, "").trim().slice(0, max);
}

function nullableText(value, max = MAX_SESSION_REVIEW_TEXT) {
  const result = text(value, max);
  return result || null;
}

function normalizeSignals(signals) {
  if (!signals || typeof signals !== "object") return {};
  const allowed = [
    "wordCount", "hedgeCount", "hedgeRate", "ramble", "vague", "stuck", "offTopic",
    "selfContradictory", "unsupportedClaim", "vagueExample", "possibleContradiction",
    "incompleteExplanation", "stuckPhrase", "hesitantShort",
  ];
  return Object.fromEntries(allowed
    .filter((key) => typeof signals[key] === "boolean" || (typeof signals[key] === "number" && Number.isFinite(signals[key])))
    .map((key) => [key, signals[key]]));
}

function normalizeAnalysis(analysis) {
  if (!analysis || typeof analysis !== "object") return null;
  const allowedTypes = new Set(["evidence", "specificity", "contradiction", "clarification", "recovery", "none"]);
  const allowedImportance = new Set(["low", "medium", "high"]);
  return {
    followUpType: allowedTypes.has(analysis.followUpType) ? analysis.followUpType : "none",
    reason: nullableText(analysis.reason, 180),
    claim: nullableText(analysis.claim, 240),
    answered: typeof analysis.answered === "boolean" ? analysis.answered : null,
    importance: allowedImportance.has(analysis.importance) ? analysis.importance : "low",
  };
}

function normalizeEvent(event, index) {
  const type = event?.type === "facilitator" ? "facilitator" : "turn";
  const facilitator = Array.isArray(event?.facilitator)
    ? event.facilitator.map((reply) => ({
      personaId: text(reply?.personaId, 64),
      text: text(reply?.text),
    })).filter((reply) => reply.personaId && reply.text)
    : [];
  return {
    type,
    sequence: Number.isInteger(event?.sequence) && event.sequence > 0 ? event.sequence : index + 1,
    occurredAt: text(event?.occurredAt, 64) || new Date().toISOString(),
    ...(type === "facilitator"
      ? { personaId: text(event?.personaId, 64) || "facilitator", text: text(event?.text) }
      : {
        studentText: text(event?.studentText),
        facilitator,
        signals: normalizeSignals(event?.signals),
        turnAnalysis: normalizeAnalysis(event?.turnAnalysis || event?.analysis),
      }),
  };
}

function normalizeReview(review) {
  if (!review || typeof review !== "object") return null;
  const rubric = review.rubric && typeof review.rubric === "object"
    ? {
      articulation: nullableText(review.rubric.articulation),
      engagement: nullableText(review.rubric.engagement),
      contentCorrespondence: nullableText(review.rubric.contentCorrespondence),
    }
    : null;
  const metrics = (value, keys) => value && typeof value === "object"
    ? Object.fromEntries(keys
      .filter((key) => Number.isFinite(value[key]))
      .map((key) => [key, value[key]]))
    : null;
  return {
    rubric,
    bestLine: nullableText(review.bestLine),
    whyItLanded: nullableText(review.whyItLanded),
    delivery: metrics(review.delivery, ["turnCount", "wordCount", "hedgeRate", "rambleRate", "avgWpm", "pacedTurnCount"]),
    engagement: metrics(review.engagement, ["turnCount", "questionRate"]),
  };
}

export function normalizePracticeSession(session) {
  const events = Array.isArray(session?.events)
    ? session.events.map(normalizeEvent).filter((event) => event.type === "facilitator" ? event.text : event.studentText || event.facilitator.length)
    : [];
  return {
    id: text(session?.id, 80),
    studentId: text(session?.studentId, 80),
    templateId: text(session?.templateId, 80),
    templateName: text(session?.templateName, 120),
    scenarioDescription: text(session?.scenarioDescription),
    scenarioContext: session?.scenarioContext && typeof session.scenarioContext === "object"
      ? {
        setupAnswer: nullableText(session.scenarioContext.setupAnswer, 300),
        questId: nullableText(session.scenarioContext.questId, 64),
        challengeModifier: nullableText(session.scenarioContext.challengeModifier, 64),
        scenarioType: nullableText(session.scenarioContext.scenarioType, 40),
        title: nullableText(session.scenarioContext.title, 120),
        audience: nullableText(session.scenarioContext.audience, 160),
        objective: nullableText(session.scenarioContext.objective, 220),
        contextText: nullableText(session.scenarioContext.contextText, 1200),
      }
      : {},
    status: ["active", "completed", "abandoned"].includes(session?.status) ? session.status : "active",
    startedAt: text(session?.startedAt, 64) || new Date().toISOString(),
    endedAt: session?.endedAt ? text(session.endedAt, 64) : null,
    events: events.slice(-MAX_SESSION_EVENTS),
    review: normalizeReview(session?.review),
    createdAt: text(session?.createdAt, 64) || text(session?.startedAt, 64) || new Date().toISOString(),
    updatedAt: text(session?.updatedAt, 64) || new Date().toISOString(),
  };
}

function readLocalSessions() {
  const path = sessionsPath();
  if (!existsSync(path)) return { sessions: {} };
  try {
    const db = JSON.parse(readFileSync(path, "utf8"));
    return db && typeof db.sessions === "object" ? db : { sessions: {} };
  } catch {
    return { sessions: {} };
  }
}

function writeLocalSessions(db) {
  const path = sessionsPath();
  const temporaryPath = `${path}.tmp-${process.pid}`;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(temporaryPath, JSON.stringify(db, null, 2));
  renameSync(temporaryPath, path);
}

export function putPracticeSessionLocal(session) {
  const normalized = normalizePracticeSession(session);
  if (!normalized.id || !normalized.studentId) throw new Error("Practice session identity is required");
  const db = readLocalSessions();
  db.sessions[normalized.id] = normalized;
  writeLocalSessions(db);
  return normalized;
}

export function getPracticeSessionLocal(studentId, id) {
  const session = readLocalSessions().sessions[id];
  return session && session.studentId === studentId ? normalizePracticeSession(session) : null;
}

export function listPracticeSessionsLocal(studentId, limit = 20) {
  return Object.values(readLocalSessions().sessions)
    .filter((session) => session.studentId === studentId && session.status === "completed")
    .sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)))
    .slice(0, Math.max(1, Math.min(50, Number(limit) || 20)))
    .map(normalizePracticeSession);
}
