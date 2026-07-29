import express from "express";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { randomUUID } from "crypto";
import { TECHNIQUES, CATALOG, listSubjects, getBoard, getTopic } from "./curriculum.js";
import { getBankQuestions, putBankQuestion, bankSize, getExamQuestions } from "./data/questionBank.js";
import { pickVisual } from "./diagrams.js";



// Seed a minimum of ready questions for every syllabus cell (keeps adaptive loop fast)
(function seedReadyQuestions() {
  for (const subject of Object.values(CATALOG)) {
    for (const board of Object.values(subject.boards || {})) {
      for (const topic of board.topics || []) {
        for (const sub of topic.subskills || []) {
          for (const level of ["easy", "medium", "hard"]) {
            const existing = getBankQuestions({
              subjectId: subject.id,
              boardId: board.id,
              topicId: topic.id,
              subskillId: sub.id,
              level,
              count: 1,
            });
            if (existing.length) continue;
            putBankQuestion({
              subjectId: subject.id,
              boardId: board.id,
              topicId: topic.id,
              subskillId: sub.id,
              level,
              question: {
                prompt: `[${subject.name} · ${board.name}]\n\nYou are revising “${sub.name}” within the topic “${topic.name}”.\n\nWhich statement is the most accurate for exam success on this idea?`,
                choices: [
                  `You should be able to define it, apply it in methods, and use correct units where needed`,
                  `It is never assessed on ${board.name} papers`,
                  `It only matters in group discussion, not individual exams`,
                  `Memorising one final number is enough for every question on it`,
                ],
                answerIndex: 0,
                explanation: `${sub.name} is examinable content inside ${topic.name}. High marks come from clear definitions, methods and units.`,
                hint: "Think about what the specification expects you to do, not just recognise.",
                source: "seed",
                difficulty: level,
              },
            });
            if (level === "hard" || level === "medium") {
              putBankQuestion({
                subjectId: subject.id,
                boardId: board.id,
                topicId: topic.id,
                subskillId: sub.id,
                level,
                question: {
                  prompt: `[${subject.name} · ${board.name} · ${topic.name}]\n\nA student is stuck on a multi-step problem involving “${sub.name}”.\n\nWhat is the best next action?`,
                  choices: [
                    "Write the knowns with units, state the relevant principle, then choose a method",
                    "Guess between the options without organising the data",
                    "Ignore the command word and write anything memorised",
                    "Skip units because they rarely carry marks",
                  ],
                  answerIndex: 0,
                  explanation: "Structured method beats guessing — especially on multi-step exam questions.",
                  hint: "",
                  source: "seed",
                  difficulty: level,
                },
              });
            }

          }
        }
      }
    }
  }
})();



const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, ".env");
const dataDir = join(__dirname, "data");
const dbPath = join(dataDir, "students.json");

if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

const PORT = Number(process.env.PORT || 3848);
const API_KEY = process.env.OPENROUTER_API_KEY;
const MODELS = {
  fast: process.env.TUTOR_FAST_MODEL || "qwen/qwen3.6-flash",
  report: process.env.TUTOR_REPORT_MODEL || "x-ai/grok-4.3",
};

function loadDb() {
  if (!existsSync(dbPath)) return { students: {} };
  try {
    return JSON.parse(readFileSync(dbPath, "utf8"));
  } catch {
    return { students: {} };
  }
}
function saveDb(db) {
  writeFileSync(dbPath, JSON.stringify(db, null, 2));
}
function getStudent(id) {
  return loadDb().students[id] || null;
}

function putStudent(s) {
  const db = loadDb();
  db.students[s.id] = s;
  saveDb(db);
  return s;
}

function courseKey(subjectId, boardId) {
  return `${subjectId}::${boardId}`;
}

function emptyTechniqueWeights() {
  const o = {};
  for (const t of TECHNIQUES) o[t.id] = 1;
  return o;
}

function initCourseProgress(subjectId, boardId) {
  const pack = getBoard(subjectId, boardId);
  if (!pack) return null;
  const mastery = {};
  for (const topic of pack.board.topics) {
    // 0 until the student is actually assessed / taught on the sub-skill
    for (const sub of topic.subskills) mastery[sub.id] = 0;
  }
  return {
    subjectId,
    boardId,
    mastery,
    techniques: emptyTechniqueWeights(),
    topicAssessed: {},
    stats: { taught: 0, correct: 0, wrong: 0 },
  };
}

function newStudent(name) {
  return {
    id: randomUUID(),
    name: (name || "Learner").slice(0, 48),
    password: "", // optional simple gate
    createdAt: new Date().toISOString(),
    courses: [], // { subjectId, boardId }
    progress: {}, // keyed courseKey
    session: null, // active teach/assess session
  };
}

function ensureCourse(student, subjectId, boardId) {
  const key = courseKey(subjectId, boardId);
  if (!student.progress[key]) {
    const p = initCourseProgress(subjectId, boardId);
    if (!p) throw new Error("Unknown subject/board");
    student.progress[key] = p;
  }
  if (!student.courses.some((c) => c.subjectId === subjectId && c.boardId === boardId)) {
    student.courses.push({ subjectId, boardId });
  }
  return student.progress[key];
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function topicMastery(progress, topic) {
  const assessed = Boolean(progress?.topicAssessed?.[topic.id]);
  const vals = topic.subskills.map((s) => Number(progress.mastery[s.id] ?? 0));
  const anyReal = vals.some((v) => v > 0);
  // Never show a default band — unassessed / untouched topics stay at 0
  if (!assessed && !anyReal) return 0;
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function pickWeakSubskill(progress, topic) {
  // Prefer untested / weakest; untouched (0) counts as needs work
  return [...topic.subskills]
    .map((s) => ({ ...s, m: progress.mastery[s.id] ?? 0 }))
    .sort((a, b) => a.m - b.m)[0];
}

function pickTechnique(progress, exploreRate = 0.2) {
  if (Math.random() < exploreRate) {
    return TECHNIQUES[Math.floor(Math.random() * TECHNIQUES.length)].id;
  }
  let best = TECHNIQUES[0].id;
  let wBest = -1;
  for (const t of TECHNIQUES) {
    const w = progress.techniques[t.id] ?? 1;
    if (w > wBest) {
      wBest = w;
      best = t.id;
    }
  }
  return best;
}

function updateMastery(progress, subId, correct) {
  const cur = progress.mastery[subId] ?? 0;
  // First contact: leave neutral-ish band so a lucky first hit isn't 100%
  if (cur === 0) {
    progress.mastery[subId] = correct ? 0.45 : 0.15;
    return;
  }
  progress.mastery[subId] = clamp(cur + (correct ? 0.14 : -0.11), 0, 1);
}

function updateTechnique(progress, techId, good, perfect = false) {
  const cur = progress.techniques[techId] ?? 1;
  progress.techniques[techId] = clamp(cur + (good ? (perfect ? 0.4 : 0.22) : -0.2), 0.15, 5);
}

const AI_TIMEOUT_MS = 25000;

async function aiMessages({ model, system, messages, max_tokens = 900, temperature = 0.35 }) {
  if (!API_KEY) throw new Error("Missing OPENROUTER_API_KEY");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  let res;
  try {
    res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": `http://localhost:${PORT}`,
        "X-Title": "Adaptive Tutor",
      },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens,
        messages: [{ role: "system", content: system }, ...messages],
      }),
      signal: controller.signal,
    });
  } catch (e) {
    if (e.name === "AbortError") throw new Error("AI request timed out");
    throw new Error(`AI request failed: ${e.message || e}`);
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new Error((await res.text()).slice(0, 400));
  return (await res.json()).choices?.[0]?.message?.content || "";
}

async function aiJson({ model, system, user, max_tokens = 900 }) {
  let text = await aiMessages({
    model,
    system,
    messages: [{ role: "user", content: user }],
    max_tokens,
  });
  text = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
  const a = text.indexOf("{");
  const b = text.lastIndexOf("}");
  if (a >= 0 && b > a) text = text.slice(a, b + 1);
  return JSON.parse(text);
}

function sanitizeChatHistory(raw, limit = 16) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && String(m.content || "").trim())
    .slice(-limit)
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 2500) }));
}

function pickTeachTarget(progress, pack, topicId, subskillId) {
  const topics = pack.board.topics || [];
  let topic = topicId ? topics.find((t) => t.id === topicId) : null;
  if (!topic) {
    topic =
      [...topics]
        .map((t) => ({ t, m: topicMastery(progress, t) }))
        .sort((a, b) => a.m - b.m)[0]?.t || topics[0];
  }
  if (!topic) return null;
  let sub = subskillId ? topic.subskills.find((s) => s.id === subskillId) : null;
  if (!sub) sub = pickWeakSubskill(progress, topic);
  return { topic, sub };
}

function normalizeStudyFocus(body = {}, pack = null) {
  const focus = body.focus && typeof body.focus === "object" ? body.focus : {};
  const topicId = body.topicId || focus.topicId || null;
  const subskillId = body.subskillId || focus.subskillId || null;
  let topicName = cleanStudentText(focus.topicName || body.topicName || "");
  let subskillName = cleanStudentText(focus.subskillName || body.subskillName || "");
  if (pack && topicId) {
    const t = pack.board.topics.find((x) => x.id === topicId);
    if (t) {
      topicName = topicName || t.name;
      if (subskillId) {
        const ss = t.subskills.find((x) => x.id === subskillId);
        if (ss) subskillName = subskillName || ss.name;
      }
    }
  }
  const q = focus.question || body.question || null;
  let question = null;
  if (q && (q.prompt || typeof q === "string")) {
    question = {
      prompt: cleanStudentText(typeof q === "string" ? q : q.prompt).slice(0, 1200),
      choices: Array.isArray(q.choices)
        ? q.choices.map((c) => cleanStudentText(c).slice(0, 240)).slice(0, 6)
        : [],
      activity: cleanStudentText(focus.activity || body.activity || q.activity || "").slice(0, 40),
    };
  }
  return {
    activity: cleanStudentText(focus.activity || body.activity || "").slice(0, 40) || null,
    topicId,
    topicName: topicName || null,
    subskillId,
    subskillName: subskillName || null,
    question,
  };
}

function contextPack(subjectId, boardId, topic) {
  const pack = getBoard(subjectId, boardId);
  return {
    subject: pack.subject.name,
    level: pack.subject.level,
    board: pack.board.name,
    textbookHint: pack.board.textbookHint,
    topic: topic.name,
    subskills: topic.subskills.map((s) => s.name),
  };
}

async function genQuestion({ ctx, subskill, purpose, level = "medium" }) {
  return aiJson({
    model: MODELS.fast,
    max_tokens: 650,
    system:
      "Create ONE clear exam-aligned multiple choice question. JSON only: " +
      '{"prompt":"...","choices":["A","B","C","D"],"answerIndex":0,"hint":"...","explanation":"..."}. ' +
      "Write a FULL stem: set the physical/mathematical situation in 2–4 short sentences, give data with units, then ask one precise question. " +
      "For hard/stretch difficulty include multi-step reasoning. " +
      "answerIndex 0-3. Plain text only — never use markdown asterisks or LaTeX $ signs.",
    user: JSON.stringify({ ...ctx, subskill: subskill.name, purpose, difficulty: level }),
  });
}


async function genLesson({ ctx, subskill, technique }) {
  const tech = TECHNIQUES.find((t) => t.id === technique) || TECHNIQUES[0];
  return aiJson({
    model: MODELS.fast,
    max_tokens: 950,
    system:
      "You are a polished subject tutor for a premium learning product. SHORT lesson using the named technique. JSON only: " +
      '{"title":"...","body":"plain text lesson max 200 words","worked":"optional plain-text example","focusPoints":["..."]}. ' +
      "Align to exam board language. " +
      "CRITICAL: plain text only. Do NOT use markdown. Do NOT use ** or * for emphasis. Do NOT use # headings. Do NOT use $ or LaTeX. Use clear sentences and short paragraphs.",
    user: JSON.stringify({ ...ctx, subskill: subskill.name, technique: tech }),
  });
}

async function genChecks({ ctx, subskill, lessonBody, count = 3 }) {
  return aiJson({
    model: MODELS.fast,
    max_tokens: 850,
    system:
      'JSON only: {"checks":[{"prompt":"...","choices":["A","B","C","D"],"answerIndex":0,"explanation":"..."}]} ' +
      "Plain text only — no markdown asterisks, no LaTeX.",
    user: `Create ${count} MCQs testing: ${subskill.name}. Context: ${JSON.stringify(ctx)}\nLesson:\n${lessonBody}`,
  });
}

async function genTopicReport({ ctx, masteryList, techniques }) {
  try {
    return await aiJson({
      model: MODELS.report,
      max_tokens: 650,
      system:
        "Student topic report for a premium learning app. JSON only: " +
        '{"headline":"...","strengths":["..."],"weaknesses":["..."],"howYouLearn":"...","nextSteps":["..."]}. ' +
        "Warm, clear, student-facing. No markdown asterisks. No developer jargon.",
      user: JSON.stringify({ ctx, masteryList, techniques }),
    });
  } catch {
    return {
      headline: `Your ${ctx.topic} snapshot`,
      strengths: masteryList.filter((m) => m.m >= 0.55).map((m) => m.name).slice(0, 3),
      weaknesses: masteryList.filter((m) => m.m < 0.45).map((m) => m.name).slice(0, 4),
      howYouLearn: "We’ll keep adapting how this topic is taught for you.",
      nextSteps: ["Review the weakest points", "Take another short lesson"],
    };
  }
}

function cleanStudentText(s) {
  return String(s ?? "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(^|[^\w])\*([^*\n]+)\*(?!\w)/g, "$1$2")
    .replace(/`+/g, "")
    .replace(/\$\$[\s\S]*?\$\$/g, (m) => m.replace(/\$/g, ""))
    .replace(/\$([^$]+)\$/g, "$1")
    .replace(/#{1,6}\s*/g, "")
    .replace(/\r/g, "")
    .trim();
}


function publicStudent(s) {
  const courses = s.courses.map((c) => {
    const pack = getBoard(c.subjectId, c.boardId);
    const prog = s.progress[courseKey(c.subjectId, c.boardId)];
    const topics = (pack?.board.topics || []).map((t) => ({
      id: t.id,
      name: t.name,
      mastery: prog ? topicMastery(prog, t) : 0,
      assessed: Boolean(prog?.topicAssessed?.[t.id]),
      subskills: t.subskills.map((ss) => ({
        id: ss.id,
        name: ss.name,
        mastery: prog?.mastery?.[ss.id] ?? 0,
      })),
    }));
    const topicCount = topics.length || 1;
    const assessedCount = topics.filter((t) => t.assessed).length;
    const passedCount = topics.filter((t) => t.mastery >= 0.6).length;
    // Course completion: 50% for covering topics (diagnosed) + 50% for average mastery
    const coverage = assessedCount / topicCount;
    const avgMastery = topics.reduce((a, t) => a + (t.mastery || 0), 0) / topicCount;
    const completion = Math.round((0.45 * coverage + 0.55 * avgMastery) * 100);
    const tech = TECHNIQUES.map((t) => ({
      ...t,
      weight: prog?.techniques?.[t.id] ?? 1,
    })).sort((a, b) => b.weight - a.weight);
    return {
      subjectId: c.subjectId,
      boardId: c.boardId,
      subjectName: pack?.subject.name || c.subjectId,
      boardName: pack?.board.name || c.boardId,
      level: pack?.subject.level,
      icon: pack?.subject.icon,
      topics,
      techniques: tech,
      stats: prog?.stats || { taught: 0, correct: 0, wrong: 0 },
      completion: {
        percent: completion,
        assessedCount,
        passedCount,
        topicCount,
        avgMastery: Math.round(avgMastery * 100),
        coverage: Math.round(coverage * 100),
      },
    };
  });
  const overall =
    courses.length > 0
      ? Math.round(courses.reduce((a, c) => a + c.completion.percent, 0) / courses.length)
      : 0;
  return {
    id: s.id,
    name: s.name,
    courses,
    overallCompletion: overall,
    session: s.session
      ? {
          type: s.session.type,
          subjectId: s.session.subjectId,
          boardId: s.session.boardId,
          topicId: s.session.topicId,
          step: s.session.step,
          target: s.session.target,
          techniqueId: s.session.techniqueId,
          hasLesson: Boolean(s.session.lesson),
        }
      : null,
  };
}

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.static(join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    models: MODELS,
    subjectCount: Object.keys(CATALOG).length,
    questionBank: bankSize(),
  });
});


app.get("/api/catalog", (_req, res) => {
  res.json({ subjects: listSubjects(), techniques: TECHNIQUES });
});

app.post("/api/auth/register", (req, res) => {
  const name = String(req.body?.name || "").trim().slice(0, 48);
  if (!name) return res.status(400).json({ error: "Name required" });
  const s = newStudent(name);
  const pass = String(req.body?.password || "");
  if (pass) s.password = pass;
  putStudent(s);
  res.json({ student: publicStudent(s), token: s.id });
});

app.post("/api/auth/login", (req, res) => {
  const name = String(req.body?.name || "").trim();
  const pass = String(req.body?.password || "");
  const db = loadDb();
  const found = Object.values(db.students).find(
    (s) => s.name.toLowerCase() === name.toLowerCase() && (!s.password || s.password === pass)
  );
  if (!found) return res.status(401).json({ error: "No matching account (check name/password)" });
  res.json({ student: publicStudent(found), token: found.id });
});

app.get("/api/student/:id", (req, res) => {
  const s = getStudent(req.params.id);
  if (!s) return res.status(404).json({ error: "not found" });
  res.json({ student: publicStudent(s) });
});

app.post("/api/student/:id/courses", (req, res) => {
  const s = getStudent(req.params.id);
  if (!s) return res.status(404).json({ error: "not found" });
  const list = Array.isArray(req.body?.courses) ? req.body.courses : [];
  if (!list.length) return res.status(400).json({ error: "Pick at least one subject + exam board" });
  s.courses = [];
  // rebuild selected only
  const nextProgress = {};
  for (const c of list) {
    if (!getBoard(c.subjectId, c.boardId)) continue;
    const key = courseKey(c.subjectId, c.boardId);
    nextProgress[key] = s.progress[key] || initCourseProgress(c.subjectId, c.boardId);
    s.courses.push({ subjectId: c.subjectId, boardId: c.boardId });
  }
  s.progress = { ...s.progress, ...nextProgress };
  // keep old progress for unselected but don't list them
  putStudent(s);
  res.json({ student: publicStudent(s) });
});

/**
 * `getBankQuestions` may fall back to a different subskill (or any subskill in
 * the topic) than the one requested. Tag the returned item with whichever
 * subskill it actually came from, falling back to the requested one only if
 * the bank couldn't identify a real match.
 */
function resolveSubskillTag(pack, item, requestedSub) {
  const real = item.subskillId ? pack.topic.subskills.find((s) => s.id === item.subskillId) : null;
  const sub = real || requestedSub;
  return { ...item, subskillId: sub.id, subskillName: sub.name };
}

async function ensureQuestion({ subjectId, boardId, topicId, subskill, level, purpose }) {
  const pack = getTopic(subjectId, boardId, topicId);
  const cached = getBankQuestions({
    subjectId,
    boardId,
    topicId,
    subskillId: subskill.id,
    level,
    count: 1,
  });
  if (cached[0]) return resolveSubskillTag(pack, cached[0], subskill);

  const ctx = contextPack(subjectId, boardId, pack.topic);
  const q = await genQuestion({ ctx, subskill, purpose, level });
  const stored = putBankQuestion({
    subjectId,
    boardId,
    topicId,
    subskillId: subskill.id,
    level,
    question: { ...q, source: "ai-cache" },
  });
  return {
    ...stored,
    subskillId: subskill.id,
    subskillName: subskill.name,
  };
}

/** Sync bank-only queue (instant). */
function buildAssessQueueFromBank(student, subjectId, boardId, topicId, target) {
  const pack = getTopic(subjectId, boardId, topicId);
  const progress = ensureCourse(student, subjectId, boardId);
  const queue = [];
  const usedIds = new Set();
  const usedFp = new Set();
  const subs = [...pack.topic.subskills].sort(
    (a, b) => (progress.mastery[a.id] ?? 0) - (progress.mastery[b.id] ?? 0)
  );
  const diffLadder = ["medium", "medium", "hard", "hard", "stretch", "easy"];
  let guard = 0;
  while (queue.length < target && guard < target * 10) {
    guard++;
    const sub = subs[queue.length % Math.max(subs.length, 1)];
    const want = diffLadder[Math.min(queue.length, diffLadder.length - 1)];
    const batch = getBankQuestions({
      subjectId,
      boardId,
      topicId,
      subskillId: sub.id,
      level: want,
      count: 1,
      excludeIds: usedIds,
      excludeFingerprints: usedFp,
      difficultyPreference: want,
    });
    if (!batch[0]) {
      // try another subskill
      const alt = subs.find((s) => s.id !== sub.id) || sub;
      const batch2 = getBankQuestions({
        subjectId,
        boardId,
        topicId,
        subskillId: alt.id,
        level: want,
        count: 1,
        excludeIds: usedIds,
        excludeFingerprints: usedFp,
        difficultyPreference: want,
      });
      if (!batch2[0]) break;
      usedIds.add(batch2[0].id);
      if (batch2[0].fingerprint) usedFp.add(batch2[0].fingerprint);
      queue.push(resolveSubskillTag(pack, batch2[0], alt));
      continue;
    }
    usedIds.add(batch[0].id);
    if (batch[0].fingerprint) usedFp.add(batch[0].fingerprint);
    queue.push(resolveSubskillTag(pack, batch[0], sub));
  }
  return queue;
}

async function fillAssessQueue(student, subjectId, boardId, topicId, target, existing = []) {
  const pack = getTopic(subjectId, boardId, topicId);
  const progress = ensureCourse(student, subjectId, boardId);
  const queue = [...existing];
  const usedIds = new Set(queue.map((q) => q.id).filter(Boolean));
  const usedFp = new Set(queue.map((q) => q.fingerprint).filter(Boolean));
  const subs = [...pack.topic.subskills].sort(
    (a, b) => (progress.mastery[a.id] ?? 0) - (progress.mastery[b.id] ?? 0)
  );
  const diffLadder = ["medium", "hard", "stretch", "hard", "medium", "stretch"];

  while (queue.length < target) {
    const sub = subs[queue.length % Math.max(subs.length, 1)];
    const want = diffLadder[Math.min(queue.length, diffLadder.length - 1)];
    const fromBank = getBankQuestions({
      subjectId,
      boardId,
      topicId,
      subskillId: sub.id,
      level: want,
      count: 1,
      excludeIds: usedIds,
      excludeFingerprints: usedFp,
      difficultyPreference: want,
    });
    if (fromBank[0]) {
      usedIds.add(fromBank[0].id);
      if (fromBank[0].fingerprint) usedFp.add(fromBank[0].fingerprint);
      queue.push(resolveSubskillTag(pack, fromBank[0], sub));
      continue;
    }
    try {
      const q = await ensureQuestion({
        subjectId,
        boardId,
        topicId,
        subskill: sub,
        level: want === "stretch" ? "hard" : want,
        purpose: "topic diagnostic - varied detailed stem",
      });
      if (usedFp.has(q.fingerprint) || usedIds.has(q.id)) break;
      usedIds.add(q.id);
      if (q.fingerprint) usedFp.add(q.fingerprint);
      queue.push(q);
    } catch {
      break;
    }
  }
  return queue;
}



/** Topic diagnostic (assessment inside a topic) */
app.post("/api/topic/assess/start", async (req, res) => {
  try {
    const s = getStudent(req.body?.studentId);
    if (!s) return res.status(404).json({ error: "not found" });
    const { subjectId, boardId, topicId } = req.body || {};
    const pack = getTopic(subjectId, boardId, topicId);
    if (!pack) return res.status(400).json({ error: "Unknown topic" });
    ensureCourse(s, subjectId, boardId);

    const target = Math.min(6, Math.max(4, pack.topic.subskills.length));

    // Instant: pull ready items from memory bank
    let queue = buildAssessQueueFromBank(s, subjectId, boardId, topicId, target);

    // If bank is thin, fill remainder (AI/cache) so the session has a full path
    // Prefer bank-first so Q1 is never empty when bank has content.
    if (queue.length < target) {
      queue = await fillAssessQueue(s, subjectId, boardId, topicId, target, queue);
    }
    if (!queue.length) throw new Error("No questions available");

    s.session = {
      type: "assess",
      subjectId,
      boardId,
      topicId,
      step: 0,
      target: queue.length,
      queue,
      history: [],
      level: 2,
      usedIds: queue.map((q) => q.id),
    };
    putStudent(s);

    const first = queue[0];
    res.json({
      ok: true,
      ready: true,
      student: publicStudent(s),
      topic: { id: pack.topic.id, name: pack.topic.name },
      firstQuestion: {
        done: false,
        step: 1,
        target: queue.length,
        subskill: { id: first.subskillId, name: first.subskillName },
        question: {
          prompt: first.prompt,
          choices: first.choices,
          hint: first.hint || "",
        },
        source: first.source || "bank",
        visuals: pickVisual({
          topicName: pack.topic.name,
          subskillName: first.subskillName || "",
          subjectName: pack.subject.name,
        }),
      },

    });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});


app.post("/api/topic/assess/next", async (req, res) => {
  try {
    const s = getStudent(req.body?.studentId);
    if (!s?.session || s.session.type !== "assess") return res.status(400).json({ error: "No active assessment" });
    if (s.session.step >= s.session.target) return res.json({ done: true });

    const item = s.session.queue[s.session.step];
    if (!item) return res.json({ done: true });

    // If somehow still a hole, fill sync from more bank / fallback
    if (!item.prompt) {
      const pack = getTopic(s.session.subjectId, s.session.boardId, s.session.topicId);
      const sub = pack.topic.subskills[0];
      try {
        const q = await ensureQuestion({
          subjectId: s.session.subjectId,
          boardId: s.session.boardId,
          topicId: s.session.topicId,
          subskill: sub,
          level: "medium",
          purpose: "topic diagnostic",
        });
        Object.assign(item, q);
        putStudent(s);
      } catch (e) {
        console.error("[ai] assess/next question generation failed:", e.message || e);
        return res.status(503).json({ error: "Couldn't prepare the next question right now — please try again." });
      }
    }

    const pack = getTopic(s.session.subjectId, s.session.boardId, s.session.topicId);
    res.json({
      done: false,
      step: s.session.step + 1,
      target: s.session.target,
      subskill: { id: item.subskillId, name: item.subskillName },
      question: {
        prompt: item.prompt,
        choices: item.choices,
        hint: item.hint || "",
      },
      source: item.source || "bank",
      visuals: pickVisual({
        topicName: pack?.topic?.name || "",
        subskillName: item.subskillName || "",
        subjectName: pack?.subject?.name || "",
      }),
    });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.post("/api/topic/assess/answer", async (req, res) => {
  try {
    const s = getStudent(req.body?.studentId);
    if (!s?.session || s.session.type !== "assess") return res.status(400).json({ error: "No question" });
    const progress = ensureCourse(s, s.session.subjectId, s.session.boardId);
    const item = s.session.queue[s.session.step];
    if (!item) return res.status(400).json({ error: "No active item" });

    const correct = Number(req.body?.choiceIndex) === Number(item.answerIndex);
    updateMastery(progress, item.subskillId, correct);
    if (correct) progress.stats.correct += 1;
    else progress.stats.wrong += 1;
    s.session.history.push({ subskillId: item.subskillId, correct });
    s.session.step += 1;
    s.session.level = clamp(s.session.level + (correct ? 0.35 : -0.4), 1, 3.5);

    // Adaptive path:
    // - wrong → inject easier reinforcement (no duplicate prompts)
    // - right → inject harder/stretch if available
    if (s.session.step < s.session.target) {
      const pack = getTopic(s.session.subjectId, s.session.boardId, s.session.topicId);
      const weak = pack.topic.subskills.find((x) => x.id === item.subskillId) || pack.topic.subskills[0];
      const excludeIds = new Set(s.session.queue.map((q) => q.id).filter(Boolean));
      const excludeFingerprints = new Set(s.session.queue.map((q) => q.fingerprint).filter(Boolean));
      const want = correct ? (s.session.level >= 2.8 ? "stretch" : "hard") : "easy";
      const extra = getBankQuestions({
        subjectId: s.session.subjectId,
        boardId: s.session.boardId,
        topicId: s.session.topicId,
        subskillId: weak.id,
        level: want,
        count: 1,
        excludeIds,
        excludeFingerprints,
        difficultyPreference: want,
      });
      if (extra[0]) {
        const rest = s.session.queue.slice(s.session.step);
        // Avoid ending up immediately repeating by fingerprint against the item just answered
        if (extra[0].fingerprint !== item.fingerprint) {
          s.session.queue = [
            ...s.session.queue.slice(0, s.session.step),
            resolveSubskillTag(pack, extra[0], weak),
            ...rest,
          ];
          s.session.target = s.session.queue.length;
        }
      }
    }


    let finished = s.session.step >= s.session.target;
    let report = null;
    let nextQuestion = null;
    if (finished) {
      const pack = getTopic(s.session.subjectId, s.session.boardId, s.session.topicId);
      progress.topicAssessed[s.session.topicId] = true;
      const masteryList = pack.topic.subskills.map((ss) => ({
        name: ss.name,
        m: progress.mastery[ss.id] ?? 0,
      }));
      const techniques = TECHNIQUES.map((t) => ({ name: t.name, weight: progress.techniques[t.id] }));
      report = await genTopicReport({
        ctx: contextPack(s.session.subjectId, s.session.boardId, pack.topic),
        masteryList,
        techniques,
      });
      s.session = null;
    } else {
      const n = s.session.queue[s.session.step];
      nextQuestion = {
        done: false,
        step: s.session.step + 1,
        target: s.session.target,
        subskill: { id: n.subskillId, name: n.subskillName },
        question: { prompt: n.prompt, choices: n.choices, hint: n.hint || "" },
        source: n.source || "bank",
        visuals: pickVisual({
          topicName: getTopic(s.session.subjectId, s.session.boardId, s.session.topicId)?.topic?.name || "",
          subskillName: n.subskillName || "",
          subjectName: getBoard(s.session.subjectId, s.session.boardId)?.subject?.name || "",
        }),
      };
    }
    putStudent(s);
    res.json({
      correct,
      explanation: item.explanation,
      finished,
      report,
      nextQuestion,
      student: publicStudent(s),
    });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

/** PMT-style exam practice for a topic (past-paper style, harder stems) */
app.post("/api/topic/exam/start", async (req, res) => {
  try {
    const s = getStudent(req.body?.studentId);
    if (!s) return res.status(404).json({ error: "not found" });
    const { subjectId, boardId, topicId } = req.body || {};
    const pack = getTopic(subjectId, boardId, topicId);
    if (!pack) return res.status(400).json({ error: "Unknown topic" });
    ensureCourse(s, subjectId, boardId);

    let queue = getExamQuestions({
      subjectId,
      boardId,
      topicId,
      count: 5,
    }).map((x) => {
      // Only credit a subskill if the bank actually knows which one this question
      // tests. Topic-wide multi-part exam items carry no subskillId — leave them
      // unattributed rather than crediting mastery to an arbitrary subskill.
      const sub = x.subskillId ? pack.topic.subskills.find((s) => s.id === x.subskillId) : null;
      return {
        ...x,
        subskillId: sub?.id || null,
        subskillName: sub?.name || pack.topic.name,
      };
    });

    // Fill with hard bank items if exam set is short
    if (queue.length < 4) {
      const used = new Set(queue.map((q) => q.fingerprint || q.id));
      for (const sub of pack.topic.subskills) {
        if (queue.length >= 5) break;
        const more = getBankQuestions({
          subjectId,
          boardId,
          topicId,
          subskillId: sub.id,
          level: "hard",
          count: 2,
          excludeFingerprints: used,
          difficultyPreference: "hard",
        });
        for (const m of more) {
          if (queue.length >= 5) break;
          used.add(m.fingerprint || m.id);
          queue.push({ ...resolveSubskillTag(pack, m, sub), style: "exam" });
        }
      }
    }

    // Last resort: generate 1–2 hard exam-style items and cache
    while (queue.length < 3) {
      const sub = pack.topic.subskills[queue.length % pack.topic.subskills.length];
      try {
        const q = await ensureQuestion({
          subjectId,
          boardId,
          topicId,
          subskill: sub,
          level: "hard",
          purpose:
            "PMT-style past paper practice: long clear stem, multi-step, exam command words, detailed plausible options",
        });
        // ensureQuestion already resolves and tags the real subskill (cache hit or
        // freshly generated for `sub`) — don't clobber it with the loop variable.
        queue.push({ ...q, style: "exam" });
      } catch {
        break;
      }
    }

    if (!queue.length) throw new Error("No exam questions available for this topic yet");

    s.session = {
      type: "exam",
      subjectId,
      boardId,
      topicId,
      step: 0,
      target: queue.length,
      queue,
      history: [],
      level: 3,
    };
    putStudent(s);
    const first = queue[0];
    res.json({
      ok: true,
      mode: "exam",
      topic: { id: pack.topic.id, name: pack.topic.name },
      firstQuestion: {
        done: false,
        step: 1,
        target: queue.length,
        subskill: { id: first.subskillId, name: first.subskillName },
        question: {
          prompt: first.prompt,
          choices: first.choices,
          hint: first.hint || "",
        },
        source: first.source || "exam-bank",
        style: "exam",
        marks: first.marks || null,
      },
      student: publicStudent(s),
    });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.post("/api/topic/exam/answer", async (req, res) => {
  try {
    const s = getStudent(req.body?.studentId);
    if (!s?.session || s.session.type !== "exam") return res.status(400).json({ error: "No exam session" });
    const progress = ensureCourse(s, s.session.subjectId, s.session.boardId);
    const item = s.session.queue[s.session.step];
    if (!item) return res.status(400).json({ error: "No active item" });

    const correct = Number(req.body?.choiceIndex) === Number(item.answerIndex);
    if (item.subskillId) updateMastery(progress, item.subskillId, correct);
    if (correct) progress.stats.correct += 1;
    else progress.stats.wrong += 1;
    s.session.history.push({ correct, id: item.id });
    s.session.step += 1;

    const finished = s.session.step >= s.session.target;
    let nextQuestion = null;
    let summary = null;
    if (finished) {
      const ok = s.session.history.filter((h) => h.correct).length;
      const total = s.session.history.length;
      progress.topicAssessed[s.session.topicId] = true;
      summary = {
        correct: ok,
        total,
        message:
          ok / total >= 0.7
            ? "Strong exam-style performance on this topic. Keep mixing timed practice with weaker areas."
            : "Useful exam practice — review the explanations, then retry Diagnose or Learn on the weakest ideas.",
      };
      s.session = null;
    } else {
      const n = s.session.queue[s.session.step];
      nextQuestion = {
        done: false,
        step: s.session.step + 1,
        target: s.session.target,
        subskill: { id: n.subskillId, name: n.subskillName },
        question: { prompt: n.prompt, choices: n.choices, hint: n.hint || "" },
        source: n.source || "exam-bank",
        style: "exam",
        marks: n.marks || null,
      };
    }
    putStudent(s);
    res.json({
      correct,
      explanation: cleanStudentText(item.explanation || ""),
      finished,
      nextQuestion,
      summary,
      student: publicStudent(s),
    });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

/** Learning lesson — prefer cached/bank checks; generate lesson once */
app.post("/api/topic/learn/start", async (req, res) => {

  try {
    const s = getStudent(req.body?.studentId);
    if (!s) return res.status(404).json({ error: "not found" });
    const { subjectId, boardId, topicId, techniqueId } = req.body || {};
    const pack = getTopic(subjectId, boardId, topicId);
    if (!pack) return res.status(400).json({ error: "Unknown topic" });
    const progress = ensureCourse(s, subjectId, boardId);
    const sub = pickWeakSubskill(progress, pack.topic) || pack.topic.subskills[0];
    const explore = progress.stats.taught < 3 ? 0.5 : 0.18;
    const technique = techniqueId || pickTechnique(progress, explore);
    const techMeta = TECHNIQUES.find((t) => t.id === technique);
    const ctx = contextPack(subjectId, boardId, pack.topic);

    // Instant check questions from bank while lesson generates
    let checks = getBankQuestions({
      subjectId,
      boardId,
      topicId,
      subskillId: sub.id,
      level: "medium",
      count: 3,
    }).map((c) => ({
      prompt: c.prompt,
      choices: c.choices,
      answerIndex: c.answerIndex,
      explanation: c.explanation,
      source: c.source,
    }));

    const lessonPromise = genLesson({ ctx, subskill: sub, technique });
    if (checks.length < 3) {
      try {
        const checksRaw = await genChecks({
          ctx,
          subskill: sub,
          lessonBody: `Practice ${sub.name} in ${pack.topic.name}`,
          count: 3 - checks.length,
        });
        for (const c of checksRaw.checks || []) {
          putBankQuestion({
            subjectId,
            boardId,
            topicId,
            subskillId: sub.id,
            level: "medium",
            question: c,
          });
          checks.push(c);
        }
      } catch {
        /* keep what we have */
      }
    }
    // pad from topic bank
    if (checks.length < 3) {
      checks = checks.concat(
        getBankQuestions({
          subjectId,
          boardId,
          topicId,
          subskillId: sub.id,
          level: "easy",
          count: 3 - checks.length,
        })
      );
    }
    checks = checks.slice(0, 3);
    if (!checks.length) throw new Error("Could not build checks");

    let lesson;
    try {
      lesson = await lessonPromise;
    } catch (e) {
      console.error("[ai] lesson generation failed:", e.message || e);
      return res.status(503).json({ error: "Couldn't build the lesson right now — please try again." });
    }
    const cleanLesson = {
      title: cleanStudentText(lesson.title),
      body: cleanStudentText(lesson.body),
      worked: cleanStudentText(lesson.worked || ""),
      focusPoints: (lesson.focusPoints || []).map(cleanStudentText),
      techniqueName: techMeta?.name,
      subskillName: sub.name,
      visuals: pickVisual({
        topicName: pack.topic.name,
        subskillName: sub.name,
        subjectName: pack.subject.name,
      }),
    };

    progress.stats.taught += 1;
    s.session = {
      type: "learn",
      subjectId,
      boardId,
      topicId,
      techniqueId: technique,
      subskillId: sub.id,
      lesson: cleanLesson,
      checks: checks.map((c) => ({
        prompt: cleanStudentText(c.prompt),
        choices: (c.choices || []).map(cleanStudentText),
        answerIndex: c.answerIndex,
        explanation: cleanStudentText(c.explanation),
      })),
      checkIndex: 0,
      results: [],
    };
    putStudent(s);
    res.json({
      lesson: s.session.lesson,
      technique: techMeta,
      skill: { id: sub.id, name: sub.name },
      topic: { id: pack.topic.id, name: pack.topic.name },
      student: publicStudent(s),
      checksReady: s.session.checks.length,
    });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});


app.post("/api/topic/learn/check", (req, res) => {
  const s = getStudent(req.body?.studentId);
  if (!s?.session || s.session.type !== "learn") return res.status(400).json({ error: "No lesson" });
  const idx = s.session.checkIndex;
  if (idx >= s.session.checks.length) return res.json({ done: true });
  const item = s.session.checks[idx];
  const pack = getTopic(s.session.subjectId, s.session.boardId, s.session.topicId);
  res.json({
    done: false,
    index: idx + 1,
    total: s.session.checks.length,
    question: { prompt: item.prompt, choices: item.choices },
    visuals: pickVisual({
      topicName: pack?.topic?.name || s.session.lesson?.subskillName || "",
      subskillName: s.session.lesson?.subskillName || "",
      subjectName: pack?.subject?.name || "",
    }),
  });
});

app.post("/api/topic/learn/answer", (req, res) => {
  const s = getStudent(req.body?.studentId);
  if (!s?.session || s.session.type !== "learn") return res.status(400).json({ error: "No lesson" });
  const progress = ensureCourse(s, s.session.subjectId, s.session.boardId);
  const item = s.session.checks[s.session.checkIndex];
  if (!item) return res.json({ done: true, student: publicStudent(s) });

  const correct = Number(req.body?.choiceIndex) === Number(item.answerIndex);
  s.session.results.push(correct);
  updateMastery(progress, s.session.subskillId, correct);
  if (correct) progress.stats.correct += 1;
  else progress.stats.wrong += 1;
  s.session.checkIndex += 1;

  let finished = s.session.checkIndex >= s.session.checks.length;
  let summary = null;
  if (finished) {
    const ok = s.session.results.filter(Boolean).length;
    const total = s.session.results.length;
    const rate = ok / total;
    updateTechnique(progress, s.session.techniqueId, rate >= 0.67, rate === 1);
    summary = {
      correct: ok,
      total,
      rate,
      techniqueId: s.session.techniqueId,
      message:
        rate >= 0.67
          ? "This approach worked well for you. We'll use more of it on this course."
          : "That approach was less effective this time. We'll try a different style next.",

    };
    s.session = null;
  }
  putStudent(s);
  res.json({
    correct,
    explanation: item.explanation,
    finished,
    summary,
    student: publicStudent(s),
  });
});

// ── Chat: AI teacher + teachable peer student (does not replace diagnose/learn) ──

app.post("/api/chat/peer/start", (req, res) => {
  const s = getStudent(req.body?.studentId);
  if (!s) return res.status(404).json({ error: "Student not found" });
  const { subjectId, boardId } = req.body || {};
  if (!subjectId || !boardId) return res.status(400).json({ error: "subjectId and boardId required" });
  const pack = getBoard(subjectId, boardId);
  if (!pack) return res.status(400).json({ error: "Unknown course" });
  const progress = ensureCourse(s, subjectId, boardId);
  const focus = normalizeStudyFocus(req.body || {}, pack);
  const target = pickTeachTarget(progress, pack, focus.topicId, focus.subskillId);
  if (!target?.sub) return res.status(400).json({ error: "No topic available" });

  const names = ["Sam", "Jordan", "Alex", "Riley", "Casey", "Morgan", "Quinn", "Avery"];
  const peerName = names[Math.floor(Math.random() * names.length)];
  const struggles = [
    "mix up definitions with methods",
    "skip units and lose easy marks",
    "jump to the answer without a clear structure",
    "confuse similar-sounding ideas",
    "freeze when the question is multi-step",
  ];
  const struggle = struggles[Math.floor(Math.random() * struggles.length)];
  const mastery = Math.round((progress.mastery[target.sub.id] ?? 0) * 100);

  const peer = {
    name: peerName,
    subjectId,
    boardId,
    subjectName: pack.subject.name,
    boardName: pack.board.name,
    level: pack.subject.level,
    topicId: target.topic.id,
    topicName: target.topic.name,
    subskillId: target.sub.id,
    subskillName: target.sub.name,
    struggle,
    activity: focus.activity,
    questionPrompt: focus.question?.prompt || null,
    yourMastery: mastery,
    rewardGiven: false,
  };

  let opener = `Hi, I'm ${peerName}. Can you help me with ${target.sub.name}? I keep getting stuck — I ${struggle}.`;
  if (focus.question?.prompt) {
    opener += ` We're looking at this question: "${focus.question.prompt.slice(0, 220)}${focus.question.prompt.length > 220 ? "…" : ""}" How would you start?`;
  } else {
    opener += ` Explain it simply, then check I follow.`;
  }

  s.chatPeer = peer;
  putStudent(s);

  res.json({
    peer,
    opener,
    focus: {
      topicName: peer.topicName,
      subskillName: peer.subskillName,
      activity: peer.activity,
    },
    tip: "Teach this sub-topic in small steps. A clear explanation from you locks it into your own memory.",
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const s = getStudent(req.body?.studentId);
    if (!s) return res.status(404).json({ error: "Student not found" });

    const mode = req.body?.mode === "peer" ? "peer" : "teacher";
    const history = sanitizeChatHistory(req.body?.messages);
    if (!history.length) return res.status(400).json({ error: "Message required" });
    const lastUser = [...history].reverse().find((m) => m.role === "user");
    if (!lastUser) return res.status(400).json({ error: "Send a user message" });

    const subjectId = req.body?.subjectId || s.chatPeer?.subjectId;
    const boardId = req.body?.boardId || s.chatPeer?.boardId;
    let pack = null;
    let progress = null;
    if (subjectId && boardId) {
      pack = getBoard(subjectId, boardId);
      if (pack) progress = ensureCourse(s, subjectId, boardId);
    }
    const focus = normalizeStudyFocus(req.body || {}, pack);
    if (!focus.topicName && s.chatPeer?.topicName) focus.topicName = s.chatPeer.topicName;
    if (!focus.subskillName && s.chatPeer?.subskillName) focus.subskillName = s.chatPeer.subskillName;

    let weakAreas = [];
    if (pack && progress && focus.topicId) {
      const topic = pack.board.topics.find((t) => t.id === focus.topicId);
      if (topic) {
        weakAreas = topic.subskills
          .map((ss) => ({ name: ss.name, mastery: Math.round((progress.mastery[ss.id] ?? 0) * 100) }))
          .sort((a, b) => a.mastery - b.mastery)
          .slice(0, 5);
      }
    }

    const liveFocus = {
      studentName: s.name,
      subject: pack?.subject?.name || null,
      level: pack?.subject?.level || null,
      board: pack?.board?.name || null,
      activity: focus.activity,
      topic: focus.topicName,
      subskill: focus.subskillName,
      currentQuestion: focus.question
        ? {
            prompt: focus.question.prompt,
            choices: focus.question.choices,
          }
        : null,
      weakAreas,
    };

    if (mode === "teacher") {
      const system =
        "You are a brief in-app study coach sitting beside the student while they work. " +
        "You ALWAYS know their live focus (topic, sub-topic, and current question if any). Lead with that context. " +
        "If a currentQuestion is present, coach the method — hints and structure — but do NOT give the answer letter until they have tried or clearly ask to check their reasoning. " +
        "Keep replies short (max ~90 words). Plain text only: no markdown stars, no headings, no LaTeX. " +
        "Warm, specific, exam-board aware when board is known. " +
        `Live focus JSON: ${JSON.stringify(liveFocus)}`;

      let replyRaw;
      try {
        replyRaw = await aiMessages({
          model: MODELS.fast,
          system,
          messages: history,
          max_tokens: 320,
          temperature: 0.35,
        });
      } catch (e) {
        console.error("[ai] chat teacher failed:", e.message || e);
        return res.status(503).json({ error: "Couldn't reach the AI tutor right now — please try again." });
      }
      const reply = cleanStudentText(replyRaw);
      return res.json({ mode: "teacher", reply, focus: liveFocus, student: publicStudent(s) });
    }

    const peer = s.chatPeer;
    if (!peer) return res.status(400).json({ error: "Start a peer session first" });

    const qBit = peer.questionPrompt
      ? ` They are looking at this question with you: "${String(peer.questionPrompt).slice(0, 400)}". Ask about how to start it if helpful.`
      : "";

    const system =
      "You are a classmate who is stuck. The USER is teaching YOU. Stay as a peer student, never a teacher. " +
      `Name: ${peer.name}. Course: ${peer.level} ${peer.subjectName} (${peer.boardName}). ` +
      `Topic: ${peer.topicName}. Sub-topic you must learn: ${peer.subskillName}. Struggle: you ${peer.struggle}.` +
      qBit +
      " Short casual replies (1–3 sentences). Show confusion or partial understanding. " +
      "Only gradually get it if they teach clearly. Never lecture the syllabus yourself. " +
      "Plain text in reply. JSON only: " +
      '{"reply":"...","confusion":0.0,"understood":false,"encouragement":""} ' +
      "confusion 0=clear to 1=lost. understood=true only when the core of the sub-topic clicks.";

    let raw;
    try {
      raw = await aiMessages({
        model: MODELS.fast,
        system,
        messages: history,
        max_tokens: 320,
        temperature: 0.55,
      });
    } catch (e) {
      console.error("[ai] chat peer failed:", e.message || e);
      return res.status(503).json({ error: "Couldn't reach the AI peer right now — please try again." });
    }

    let parsed;
    try {
      let text = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
      const a = text.indexOf("{");
      const b = text.lastIndexOf("}");
      if (a >= 0 && b > a) text = text.slice(a, b + 1);
      parsed = JSON.parse(text);
    } catch {
      parsed = { reply: cleanStudentText(raw), confusion: 0.5, understood: false };
    }

    const reply = cleanStudentText(parsed.reply || "Can you say that more simply?");
    const confusion = clamp(Number(parsed.confusion ?? 0.5), 0, 1);
    let understood = Boolean(parsed.understood) && confusion <= 0.35;
    const userTurns = history.filter((m) => m.role === "user").length;
    if (userTurns < 2) understood = false;

    let reward = null;
    if (understood && !peer.rewardGiven) {
      const prog = ensureCourse(s, peer.subjectId, peer.boardId);
      const cur = prog.mastery[peer.subskillId] ?? 0;
      if (cur === 0) prog.mastery[peer.subskillId] = 0.35;
      else prog.mastery[peer.subskillId] = clamp(cur + 0.1, 0, 1);
      updateTechnique(prog, "analogy", true, false);
      updateTechnique(prog, "socratic", true, false);
      prog.stats.taught = (prog.stats.taught || 0) + 1;
      peer.rewardGiven = true;
      s.chatPeer = peer;
      putStudent(s);
      reward = {
        masteryBoost: true,
        subskillName: peer.subskillName,
        message: `${peer.name} gets it. +mastery on ${peer.subskillName}.`,
      };
    } else {
      putStudent(s);
    }

    res.json({
      mode: "peer",
      reply,
      confusion,
      understood,
      encouragement: understood ? cleanStudentText(parsed.encouragement || "") : "",
      peer,
      reward,
      focus: liveFocus,
      student: publicStudent(s),
    });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Adaptive Tutor → http://localhost:${PORT}`);
  console.log(`Subjects: ${Object.keys(CATALOG).length} · Fast: ${MODELS.fast} · Report: ${MODELS.report}`);
});

process.on("uncaughtException", (e) => console.error("[uncaught]", e?.message || e));
process.on("unhandledRejection", (e) => console.error("[rejection]", e?.message || e));
