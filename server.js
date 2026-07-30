import express from "express";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { randomUUID } from "crypto";
import { aiK2Json } from "./k2Client.js";
import { PRACTICE_TEMPLATES, TEMPLATE_IDS, findPersona } from "./practiceTemplates.js";
import { buildScenarioKeywordSet, classifyStudentMessage, selectResponders, summarizeDelivery, summarizeEngagement } from "./practiceClassifier.js";

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

function newStudent(name) {
  return {
    id: randomUUID(),
    name: (name || "Learner").slice(0, 48),
    password: "", // optional simple gate
    createdAt: new Date().toISOString(),
  };
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
  return { id: s.id, name: s.name };
}

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.static(join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
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

// ── Scenario practice sessions ──

app.post("/api/practice/infer-scenario", async (req, res) => {
  try {
    const s = getStudent(req.body?.studentId);
    if (!s) return res.status(404).json({ error: "Student not found" });
    const description = cleanStudentText(req.body?.description || "").slice(0, 2000);
    if (!description) return res.status(400).json({ error: "Scenario description required" });

    const templateSummaries = TEMPLATE_IDS.map(
      (id) => `- "${id}": ${PRACTICE_TEMPLATES[id].description}`
    ).join("\n");

    const system =
      "You classify a student's free-text scenario description into exactly one practice-session template. " +
      "Choose the single best match from this fixed list, never invent a new one:\n" +
      templateSummaries +
      "\n\nRespond with JSON only: " +
      '{"templateId":"...","confidence":"high"|"medium"|"low","reason":"..."} ' +
      "reason is one short sentence explaining the match. Plain text only, no markdown.";

    let parsed;
    try {
      parsed = await aiK2Json({ system, user: description, max_tokens: 800 });
    } catch (e) {
      console.error("[ai] scenario inference failed:", e.message || e);
      return res.status(503).json({ error: "Couldn't classify that scenario right now — please try again." });
    }

    let templateId = parsed.templateId;
    let confidence = ["high", "medium", "low"].includes(parsed.confidence) ? parsed.confidence : "medium";
    let reason = cleanStudentText(parsed.reason || "");
    if (!TEMPLATE_IDS.includes(templateId)) {
      templateId = "casual";
      confidence = "low";
      reason = "Couldn't confidently match a specific template — defaulting to casual conversation practice.";
    }

    const template = PRACTICE_TEMPLATES[templateId];
    res.json({
      templateId,
      templateName: template.name,
      confidence,
      reason,
      personas: template.personas.map((p) => ({ id: p.id, name: p.name, trait: p.trait })),
    });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.post("/api/practice/start", (req, res) => {
  try {
    const s = getStudent(req.body?.studentId);
    if (!s) return res.status(404).json({ error: "Student not found" });
    const { templateId } = req.body || {};
    const template = PRACTICE_TEMPLATES[templateId];
    if (!template) return res.status(400).json({ error: "Unknown template" });
    const description = cleanStudentText(req.body?.description || "").slice(0, 2000);
    if (!description) return res.status(400).json({ error: "Scenario description required" });

    const keywordSet = buildScenarioKeywordSet(description);
    const opener = `Alright ${s.name}, whenever you're ready — go ahead.`;

    s.practice = {
      templateId: template.id,
      templateName: template.name,
      description,
      keywords: [...keywordSet],
      history: [{ role: "agent", personaId: "facilitator", text: opener }],
      studentTurns: [],
      startedAt: new Date().toISOString(),
      endedAt: null,
    };
    putStudent(s);

    res.json({
      practice: {
        templateId: template.id,
        templateName: template.name,
        personas: template.personas.map((p) => ({ id: p.id, name: p.name, trait: p.trait })),
      },
      opener,
    });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.post("/api/practice/message", async (req, res) => {
  try {
    const s = getStudent(req.body?.studentId);
    if (!s) return res.status(404).json({ error: "Student not found" });
    if (!s.practice) return res.status(400).json({ error: "No active practice session — call /api/practice/start first" });

    const text = cleanStudentText(req.body?.text || "").slice(0, 2000);
    if (!text) return res.status(400).json({ error: "Message required" });

    const practice = s.practice;
    const template = PRACTICE_TEMPLATES[practice.templateId];
    if (!template) return res.status(500).json({ error: "Unknown template for this session" });

    const keywordSet = new Set(practice.keywords || []);
    const recentStudentMessages = practice.history
      .filter((m) => m.role === "student")
      .slice(-3)
      .map((m) => m.text);

    const signals = classifyStudentMessage(text, { keywordSet, recentStudentMessages });
    const responderIds = selectResponders(signals);

    const personas = responderIds.map((id) => findPersona(practice.templateId, id)).filter(Boolean);
    if (!personas.length) return res.status(500).json({ error: "Could not select a responder" });

    const recentTurns = practice.history.slice(-8).map((m) => {
      const who = m.role === "student" ? "Student" : (findPersona(practice.templateId, m.personaId)?.name || m.personaId);
      return `${who}: ${m.text}`;
    });

    const system =
      "You are running a short scenario role-play. " + template.description + " " +
      "Multiple distinct characters respond to the student in character. Stay strictly in character for each " +
      "persona listed below — do not blend their voices together. Keep every reply short (1-3 sentences), plain text, no markdown.\n\n" +
      (recentTurns.length ? `Recent conversation:\n${recentTurns.join("\n")}\n\n` : "\n") +
      "Characters responding this turn:\n" +
      personas.map((p) => `- ${p.name} (id: "${p.id}"): ${p.systemPrompt}`).join("\n") +
      "\n\nRespond with JSON only: " +
      '{"replies":[{"personaId":"...","reply":"..."}]} ' +
      "one entry per character above, in the same order.";

    // K2-Think-V2 spends tokens on hidden reasoning before emitting content —
    // budget generously so replies aren't silently truncated.
    let parsed;
    try {
      parsed = await aiK2Json({
        system,
        user: text,
        max_tokens: 400 * personas.length + 600,
      });
    } catch (e) {
      console.error("[ai] practice message generation failed:", e.message || e);
      return res.status(503).json({ error: "Couldn't reach the session right now — please try again." });
    }

    const repliesById = new Map((parsed.replies || []).map((r) => [r.personaId, r]));
    const responses = personas
      .map((p) => {
        const r = repliesById.get(p.id);
        const reply = cleanStudentText(r?.reply || "");
        return reply ? { personaId: p.id, name: p.name, reply } : null;
      })
      .filter(Boolean);

    practice.history.push({ role: "student", text });
    practice.studentTurns.push(text);
    for (const r of responses) {
      practice.history.push({ role: "agent", personaId: r.personaId, text: r.reply });
    }
    practice.history = practice.history.slice(-40);

    putStudent(s);
    res.json({
      responses,
      student: publicStudent(s),
    });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.post("/api/practice/end", async (req, res) => {
  try {
    const s = getStudent(req.body?.studentId);
    if (!s) return res.status(404).json({ error: "Student not found" });
    if (!s.practice) return res.status(400).json({ error: "No active practice session" });

    const practice = s.practice;
    const studentTexts = practice.studentTurns || [];
    if (!studentTexts.length) {
      return res.status(400).json({ error: "Nothing to review yet — send at least one message first" });
    }

    const delivery = summarizeDelivery(studentTexts);
    const engagement = summarizeEngagement(studentTexts);

    const transcript = practice.history
      .map((m) => {
        const who = m.role === "student" ? "Student" : (findPersona(practice.templateId, m.personaId)?.name || m.personaId);
        return `${who}: ${m.text}`;
      })
      .join("\n");

    const system =
      "You are a warm, encouraging speaking/communication coach reviewing a completed practice session. " +
      `Scenario the student described: "${practice.description}". ` +
      "You will be given the full transcript and two measured signal summaries. Write short (2-4 sentence), " +
      "specific, encouraging coaching feedback for each of three dimensions. Never output a numeric score or grade. " +
      "For content correspondence, judge whether what the student actually said stayed relevant and accurate to " +
      "their stated scenario — you are the only one checking this, read the transcript carefully.\n\n" +
      `Measured delivery signals (informational — use as context, don't just restate the numbers): ${JSON.stringify(delivery)}\n` +
      `Measured engagement signals (informational — use as context, don't just restate the numbers): ${JSON.stringify(engagement)}\n\n` +
      "Respond with JSON only: " +
      '{"articulation":"...","engagement":"...","contentCorrespondence":"..."} ' +
      "Plain text only, no markdown.";

    // K2-Think-V2 spends tokens on hidden reasoning before emitting content —
    // scale with transcript length so longer sessions don't get silently truncated.
    let parsed;
    try {
      parsed = await aiK2Json({ system, user: transcript, max_tokens: 1200 + Math.floor(transcript.length / 3) });
    } catch (e) {
      console.error("[ai] practice end-of-session rubric failed:", e.message || e);
      return res.status(503).json({ error: "Couldn't put together your feedback right now — please try again." });
    }

    practice.endedAt = new Date().toISOString();
    putStudent(s);

    res.json({
      rubric: {
        articulation: cleanStudentText(parsed.articulation || ""),
        engagement: cleanStudentText(parsed.engagement || ""),
        contentCorrespondence: cleanStudentText(parsed.contentCorrespondence || ""),
      },
      raw: { delivery, engagement },
    });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Green Room → http://localhost:${PORT}`);
});

process.on("uncaughtException", (e) => console.error("[uncaught]", e?.message || e));
process.on("unhandledRejection", (e) => console.error("[rejection]", e?.message || e));
