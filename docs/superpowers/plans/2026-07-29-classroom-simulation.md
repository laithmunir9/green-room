# Classroom Simulation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the backend for a text-only classroom simulation — a student explains a topic to 6 AI peer personas plus a teacher-agent, who dynamically respond based on local heuristic triggers, using a newly-wired K2 Think V2 client for reply generation.

**Architecture:** Three new small, dependency-free modules (K2 client, persona data, pure classifier/selection logic) get composed into two new Express routes in `server.js`. Selection of which agents respond is 100% local/deterministic (no model call); K2 Think V2 is only used to generate the chosen personas' in-voice replies in one batched call. A standalone throwaway HTML page exercises the two routes for manual testing.

**Tech Stack:** Node.js (ESM, `"type": "module"`), Express 5, built-in `fetch`, built-in `node:test` runner (zero new dependencies).

## Global Constraints

- Node >=18, ESM modules only (`import`/`export`, matching `package.json`'s `"type": "module"`).
- No new npm dependencies — use built-in `fetch` and the built-in `node:test` runner.
- Every outbound AI call uses an `AbortController` timeout (~25s), matching the pattern already in `server.js`'s `aiMessages`.
- Every piece of model-generated text shown to the student passes through the existing `cleanStudentText()` (server.js) before being returned.
- Never commit `.env` (already gitignored). Update `.env.example` with the new K2 variables for documentation.
- The K2 Think V2 model id is **not known in advance** — Task 1 empirically discovers it with a real API call. Nothing in Task 4 is built until Task 1's smoke test passes with a real completion.
- Agent selection (which 1-3 personas respond) is pure local logic — **no model call** decides this. K2 Think V2 is only invoked to generate the chosen personas' reply text.
- Responder cap is 3 total; the teacher is a candidate responder like any persona, not an always-on 4th voice.
- Mastery reward reuses the exact peer-teach bump formula (`0.35` on first contact else `clamp(cur + 0.1, 0, 1)`), fired at most once per classroom session. No new scoring mechanism.
- The test harness (`public/classroom-test.html`) is fully standalone — it must not import, modify, or share any state with `public/index.html`'s existing `S` object or `render()` machinery.

Spec: `docs/superpowers/specs/2026-07-29-classroom-simulation-design.md`

---

### Task 1: K2 Think V2 client + smoke test (hard gate)

**Files:**
- Create: `k2Client.js`
- Create: `scripts/test-k2-client.js`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `process.env.K2THINK_API_KEY`, `process.env.K2THINK_BASE_URL`, optional `process.env.K2THINK_MODEL`.
- Produces: `aiK2Messages({ system, messages, max_tokens, temperature, model }) => Promise<string>` and `aiK2Json({ system, user, max_tokens, model }) => Promise<object>`, both exported from `k2Client.js`. Later tasks import these two functions only.

- [ ] **Step 1: Create the K2 Think client module**

Write `k2Client.js`:

```js
/** OpenAI-compatible client for K2 Think V2 (hosted at K2THINK_BASE_URL). */

const K2_TIMEOUT_MS = 25000;

function k2Config() {
  const apiKey = process.env.K2THINK_API_KEY;
  const baseUrl = process.env.K2THINK_BASE_URL;
  const model = process.env.K2THINK_MODEL || "LLM360/K2-Think-V2";
  if (!apiKey) throw new Error("Missing K2THINK_API_KEY");
  if (!baseUrl) throw new Error("Missing K2THINK_BASE_URL");
  return { apiKey, baseUrl: baseUrl.replace(/\/+$/, ""), model };
}

export async function aiK2Messages({ system, messages, max_tokens = 400, temperature = 0.6, model } = {}) {
  const cfg = k2Config();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), K2_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model || cfg.model,
        temperature,
        max_tokens,
        messages: system ? [{ role: "system", content: system }, ...messages] : messages,
      }),
      signal: controller.signal,
    });
  } catch (e) {
    if (e.name === "AbortError") throw new Error("K2 Think request timed out");
    throw new Error(`K2 Think request failed: ${e.message || e}`);
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new Error((await res.text()).slice(0, 400));
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

export async function aiK2Json({ system, user, max_tokens = 500, model } = {}) {
  let text = await aiK2Messages({
    system,
    messages: [{ role: "user", content: user }],
    max_tokens,
    model,
  });
  text = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
  const a = text.indexOf("{");
  const b = text.lastIndexOf("}");
  if (a >= 0 && b > a) text = text.slice(a, b + 1);
  return JSON.parse(text);
}
```

Note: env vars are read lazily inside `k2Config()` (called at request time), not at module load time — this matters because `server.js` parses `.env` into `process.env` in its own top-level code, which runs *after* all of `server.js`'s static imports are evaluated. A top-level `const` in `k2Client.js` reading `process.env` at import time would read `undefined`.

- [ ] **Step 2: Document the new env vars**

Add to `.env.example` (after the existing `TUTOR_REPORT_MODEL` line):

```
# K2 Think V2 (classroom simulation)
K2THINK_API_KEY=your-k2think-key-here
K2THINK_BASE_URL=https://api.k2think.ai/v1
# Optional — only set this if the smoke test in scripts/test-k2-client.js
# finds a different working model id than the default.
# K2THINK_MODEL=LLM360/K2-Think-V2
```

- [ ] **Step 3: Write the smoke-test script**

Write `scripts/test-k2-client.js`:

```js
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { aiK2Messages } from "../k2Client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

async function tryModel(model) {
  console.log(`\n--- trying model: ${model} ---`);
  try {
    const reply = await aiK2Messages({
      system: "You are a terse test assistant.",
      messages: [{ role: "user", content: "Reply with exactly one word: pong" }],
      max_tokens: 20,
      model,
    });
    console.log("SUCCESS. Model replied:", JSON.stringify(reply));
    return true;
  } catch (e) {
    console.log("FAILED:", e.message);
    return false;
  }
}

async function main() {
  const base = process.env.K2THINK_BASE_URL;
  const key = process.env.K2THINK_API_KEY;
  console.log("Base URL:", base);
  console.log("API key present:", Boolean(key));

  // Some OpenAI-compatible hosts expose GET {base}/models — check it first,
  // it's the fastest way to discover the real model id string if the
  // defaults below don't work.
  try {
    const res = await fetch(`${String(base).replace(/\/+$/, "")}/models`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (res.ok) {
      const data = await res.json();
      console.log("GET /models →", JSON.stringify(data).slice(0, 1000));
    } else {
      console.log(`GET /models → HTTP ${res.status} (not all hosts support this — not fatal)`);
    }
  } catch (e) {
    console.log("GET /models failed (not fatal):", e.message);
  }

  const candidates = [
    process.env.K2THINK_MODEL,
    "LLM360/K2-Think-V2",
    "K2-Think-V2",
    "k2-think-v2",
    "K2-Think",
  ].filter(Boolean);

  for (const model of candidates) {
    const ok = await tryModel(model);
    if (ok) {
      console.log(`\nWorking model id: "${model}" — set K2THINK_MODEL=${model} in .env if it isn't the default already.`);
      process.exit(0);
    }
  }
  console.log("\nNone of the candidate model ids worked. Check the GET /models output above for the real id, then rerun.");
  process.exit(1);
}

main();
```

- [ ] **Step 4: Run the smoke test and confirm a real completion**

Run: `node scripts/test-k2-client.js`

Expected: one of the candidate models prints `SUCCESS. Model replied: "..."` with actual text (not an auth error, not a 404 model-not-found). If none succeed, read the `GET /models` output printed above it for the real model id, add `K2THINK_MODEL=<that id>` to `.env`, and rerun.

**Do not proceed to Task 4 until this prints a real SUCCESS.** Tasks 2 and 3 don't depend on this and may proceed in parallel if useful, but nothing that actually calls K2 Think gets built until this passes.

- [ ] **Step 5: Commit**

```bash
git add k2Client.js scripts/test-k2-client.js .env.example
git commit -m "feat: add K2 Think V2 client with model-discovery smoke test"
```

---

### Task 2: Persona pool data

**Files:**
- Create: `classroomPersonas.js`
- Create: `classroomPersonas.test.js`
- Modify: `package.json` (add `"test"` script if not already added by a parallel task)

**Interfaces:**
- Consumes: nothing (pure data module).
- Produces: `CLASSROOM_PERSONAS` (array of `{id, name, trait, systemPrompt}`, 6 entries), `TEACHER_AGENT` (single `{id: "teacher", name, trait, systemPrompt}`), `findPersona(id) => persona object or null`. Task 4 imports all three.

- [ ] **Step 1: Add the test runner script (skip if already present)**

In `package.json`, add under `"scripts"`:

```json
"test": "node --test"
```

- [ ] **Step 2: Write the failing test**

Write `classroomPersonas.test.js`:

```js
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test classroomPersonas.test.js`
Expected: FAIL — `classroomPersonas.js` does not exist yet.

- [ ] **Step 4: Write the persona data module**

Write `classroomPersonas.js`:

```js
/** Classroom simulation persona pool. */

export const CLASSROOM_PERSONAS = [
  {
    id: "curious",
    name: "Maya",
    trait: "Curious",
    systemPrompt:
      "You are Maya, a curious classmate. You ask genuine, short clarifying questions when something the presenting student said is vague, incomplete, or skips a step. You're not testing them, you're trying to actually understand. 1-2 short sentences, casual tone. Plain text only, no markdown.",
  },
  {
    id: "skeptical",
    name: "Ben",
    trait: "Skeptical",
    systemPrompt:
      "You are Ben, a mildly skeptical classmate. When something sounds off, contradicts what was said earlier, or seems too certain without justification, you push back gently — 'wait, are you sure about that?' or naming the inconsistency politely. Not hostile, just genuinely unconvinced. 1-2 short sentences. Plain text only, no markdown.",
  },
  {
    id: "encouraging",
    name: "Zoe",
    trait: "Encouraging",
    systemPrompt:
      "You are Zoe, a warm, encouraging classmate. When the presenting student seems hesitant or stuck, you reassure them and gently nudge them forward with a small prompt, without taking over the explanation. 1-2 short sentences, warm tone. Plain text only, no markdown.",
  },
  {
    id: "quick_learner",
    name: "Ari",
    trait: "Quick learner",
    systemPrompt:
      "You are Ari, a quick-learner classmate. When an explanation is clear and lands well, you signal genuine understanding — 'oh that makes sense', a quick connecting question, or building slightly on the idea. Brief, upbeat, usually 1 short sentence. Plain text only, no markdown.",
  },
  {
    id: "distracted",
    name: "Leo",
    trait: "Distracted",
    systemPrompt:
      "You are Leo, a slightly distracted classmate. You've noticed the conversation has drifted away from the topic being explained, and you say so casually, not accusingly — something like admitting you lost the thread or asking if we're still on the same subskill. 1 short sentence. Plain text only, no markdown.",
  },
  {
    id: "shy_engaged",
    name: "Nadia",
    trait: "Shy but engaged",
    systemPrompt:
      "You are Nadia, a shy but engaged classmate. You don't say much, but when you do it's a small, tentative, genuine contribution — a quiet 'yeah, that helped' or a soft, hesitant question. Very short, understated tone. Plain text only, no markdown.",
  },
];

export const TEACHER_AGENT = {
  id: "teacher",
  name: "The Teacher",
  trait: "Facilitator",
  systemPrompt:
    "You are the classroom teacher facilitating this session. Your job is not to react like a peer — it's to keep the discussion productive: offer a concrete next step when the student is stuck, redirect if classroom chatter needs steering back to the topic, and explicitly acknowledge when the student has clearly demonstrated understanding. Brief, purposeful, 1-3 sentences. Plain text only, no markdown.",
};

export function findPersona(personaId) {
  if (personaId === TEACHER_AGENT.id) return TEACHER_AGENT;
  return CLASSROOM_PERSONAS.find((p) => p.id === personaId) || null;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test classroomPersonas.test.js`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add classroomPersonas.js classroomPersonas.test.js package.json
git commit -m "feat: add classroom simulation persona pool"
```

---

### Task 3: Heuristic classifier + agent-selection logic

**Files:**
- Create: `classroomClassifier.js`
- Create: `classroomClassifier.test.js`

**Interfaces:**
- Consumes: nothing (pure functions, no I/O).
- Produces: `buildTopicKeywordSet(topicName, subskillName, siblingSubskillNames = []) => Set<string>`, `classifyStudentMessage(text, { keywordSet, recentStudentMessages }) => signals object` (fields: `wordCount, hedgeCount, stuckPhrase, absoluteLanguage, selfContradiction, onTopic, vague, hesitantShort, offTopic`), `selectResponders(signals, rng = Math.random) => string[]` (1-3 persona ids, `rng` injectable for deterministic tests). Task 4 imports all three.

- [ ] **Step 1: Write the failing tests**

Write `classroomClassifier.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTopicKeywordSet, classifyStudentMessage, selectResponders } from "./classroomClassifier.js";

test("buildTopicKeywordSet strips short/stop words and lowercases", () => {
  const set = buildTopicKeywordSet("Mechanics: Motion", "SUVAT equations", ["Velocity-time graphs"]);
  assert.ok(set.has("mechanics"));
  assert.ok(set.has("motion"));
  assert.ok(set.has("suvat"));
  assert.ok(set.has("equations"));
  assert.ok(set.has("velocity"));
  assert.ok(!set.has("the"));
});

test("classifies a long, hedging explanation as vague", () => {
  const text = "So I think it's kind of like, um, when the object sort of moves and maybe the speed changes a bit over some time, I guess, and that's basically the idea I think, roughly speaking, more or less, in general terms.";
  const signals = classifyStudentMessage(text, { keywordSet: new Set(["motion"]) });
  assert.ok(signals.wordCount > 40);
  assert.equal(signals.vague, true);
});

test("classifies a short hesitant message", () => {
  const signals = classifyStudentMessage("I'm not sure, maybe?", { keywordSet: new Set(["motion"]) });
  assert.equal(signals.hesitantShort, true);
});

test("classifies an explicit stuck phrase", () => {
  const signals = classifyStudentMessage("Honestly I'm stuck, I don't know where to start.", { keywordSet: new Set(["motion"]) });
  assert.equal(signals.stuckPhrase, true);
});

test("flags off-topic when message shares no keywords and has real content", () => {
  const signals = classifyStudentMessage(
    "Anyway, what did everyone have for lunch today, I'm starving.",
    { keywordSet: new Set(["motion", "suvat", "velocity"]) }
  );
  assert.equal(signals.offTopic, true);
});

test("does not flag off-topic for a short acknowledgement", () => {
  const signals = classifyStudentMessage("okay yeah", { keywordSet: new Set(["motion"]) });
  assert.equal(signals.offTopic, false);
});

test("flags self-contradiction against a recent statement covering the same idea", () => {
  const signals = classifyStudentMessage(
    "Actually velocity doesn't change during this at all.",
    { keywordSet: new Set(["motion"]), recentStudentMessages: ["The velocity changes constantly here."] }
  );
  assert.equal(signals.selfContradiction, true);
});

test("flags self-contradiction from absolute language mixed with hedging", () => {
  const signals = classifyStudentMessage("It's always true, I think, that this happens.", { keywordSet: new Set() });
  assert.equal(signals.selfContradiction, true);
});

test("selectResponders: skeptical wins on self-contradiction", () => {
  const picks = selectResponders(
    { selfContradiction: true, stuckPhrase: false, hesitantShort: false, offTopic: false, vague: false },
    () => 1
  );
  assert.deepEqual(picks, ["skeptical"]);
});

test("selectResponders: stuck phrase brings in the teacher over encouraging", () => {
  const picks = selectResponders(
    { selfContradiction: false, stuckPhrase: true, hesitantShort: true, offTopic: false, vague: false },
    () => 1
  );
  assert.deepEqual(picks, ["teacher"]);
});

test("selectResponders: short hedge without stuck phrase brings in encouraging", () => {
  const picks = selectResponders(
    { selfContradiction: false, stuckPhrase: false, hesitantShort: true, offTopic: false, vague: false },
    () => 1
  );
  assert.deepEqual(picks, ["encouraging"]);
});

test("selectResponders: off-topic brings in distracted", () => {
  const picks = selectResponders(
    { selfContradiction: false, stuckPhrase: false, hesitantShort: false, offTopic: true, vague: false },
    () => 1
  );
  assert.deepEqual(picks, ["distracted"]);
});

test("selectResponders: vague brings in curious", () => {
  const picks = selectResponders(
    { selfContradiction: false, stuckPhrase: false, hesitantShort: false, offTopic: false, vague: true },
    () => 1
  );
  assert.deepEqual(picks, ["curious"]);
});

test("selectResponders: no triggers falls back to quick_learner", () => {
  const picks = selectResponders(
    { selfContradiction: false, stuckPhrase: false, hesitantShort: false, offTopic: false, vague: false },
    () => 1
  );
  assert.deepEqual(picks, ["quick_learner"]);
});

test("selectResponders: shy_engaged is added as a bonus when rng rolls low and there's room", () => {
  const picks = selectResponders(
    { selfContradiction: false, stuckPhrase: false, hesitantShort: false, offTopic: false, vague: true },
    () => 0.01
  );
  assert.deepEqual(picks, ["curious", "shy_engaged"]);
});

test("selectResponders: shy_engaged is skipped when rng rolls high", () => {
  const picks = selectResponders(
    { selfContradiction: false, stuckPhrase: false, hesitantShort: false, offTopic: false, vague: true },
    () => 0.99
  );
  assert.deepEqual(picks, ["curious"]);
});

test("selectResponders: caps at 3 responders even if multiple triggers fire", () => {
  const picks = selectResponders(
    { selfContradiction: true, stuckPhrase: true, hesitantShort: false, offTopic: true, vague: true },
    () => 0.01
  );
  assert.equal(picks.length, 3);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test classroomClassifier.test.js`
Expected: FAIL — `classroomClassifier.js` does not exist yet.

- [ ] **Step 3: Write the classifier module**

Write `classroomClassifier.js`:

```js
/** Local, deterministic heuristics for classroom-simulation agent selection. No I/O, no model calls. */

const HEDGE_RE = /\b(kind of|sort of|i think|i guess|maybe|not sure|possibly|probably|i suppose|um+|uh+)\b/gi;
const STUCK_RE = /\b(i don'?t know|not sure|i'?m stuck|confused|no idea|i forget)\b/i;
const ABSOLUTE_RE = /\b(always|never|definitely|certainly|100%|guaranteed)\b/i;
const NEGATION_RE = /\b(not|isn'?t|doesn'?t|never|no longer|wasn'?t|aren'?t)\b/i;

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "be", "been",
  "of", "to", "in", "on", "for", "with", "as", "at", "by", "this", "that", "it",
  "its", "you", "your", "i", "we", "they", "he", "she", "them", "his", "her",
  "so", "than", "then", "there", "here", "what", "which", "who", "when", "how",
  "just", "like", "into", "about", "if", "not", "have", "has", "had", "can",
  "will", "would", "could", "should", "do", "does", "did", "from", "up", "out",
]);

function significantWords(text) {
  return (text.toLowerCase().match(/[a-z']+/g) || []).filter(
    (w) => w.length > 3 && !STOPWORDS.has(w)
  );
}

export function buildTopicKeywordSet(topicName, subskillName, siblingSubskillNames = []) {
  const words = [
    ...significantWords(topicName || ""),
    ...significantWords(subskillName || ""),
    ...siblingSubskillNames.flatMap((n) => significantWords(n || "")),
  ];
  return new Set(words);
}

export function classifyStudentMessage(text, { keywordSet = new Set(), recentStudentMessages = [] } = {}) {
  const trimmed = String(text || "").trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const hedgeCount = (trimmed.match(HEDGE_RE) || []).length;
  const stuckPhrase = STUCK_RE.test(trimmed);
  const absoluteLanguage = ABSOLUTE_RE.test(trimmed);

  const currentSig = new Set(significantWords(trimmed));
  const currentNegates = NEGATION_RE.test(trimmed);
  let selfContradiction = absoluteLanguage && hedgeCount > 0;
  if (!selfContradiction && currentNegates) {
    for (const prior of recentStudentMessages) {
      const priorSig = significantWords(prior);
      const overlaps = priorSig.some((w) => currentSig.has(w));
      if (overlaps) {
        selfContradiction = true;
        break;
      }
    }
  }

  const onTopic = keywordSet.size === 0 || [...currentSig].some((w) => keywordSet.has(w));

  return {
    wordCount,
    hedgeCount,
    stuckPhrase,
    absoluteLanguage,
    selfContradiction,
    onTopic,
    vague: wordCount > 40 || hedgeCount >= 2,
    hesitantShort: wordCount < 8 && hedgeCount > 0,
    offTopic: !onTopic && wordCount >= 4,
  };
}

export function selectResponders(signals, rng = Math.random) {
  const picks = [];
  const add = (id) => {
    if (!picks.includes(id)) picks.push(id);
  };

  if (signals.selfContradiction) add("skeptical");
  if (picks.length < 3) {
    if (signals.stuckPhrase) add("teacher");
    else if (signals.hesitantShort) add("encouraging");
  }
  if (picks.length < 3 && signals.offTopic) add("distracted");
  if (picks.length < 3 && signals.vague) add("curious");
  if (picks.length === 0) add("quick_learner");

  if (picks.length < 3 && !picks.includes("shy_engaged") && rng() < 0.15) {
    add("shy_engaged");
  }

  return picks.slice(0, 3);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test classroomClassifier.test.js`
Expected: PASS (all 16 tests).

- [ ] **Step 5: Commit**

```bash
git add classroomClassifier.js classroomClassifier.test.js
git commit -m "feat: add classroom simulation heuristic classifier and selection logic"
```

---

### Task 4: Wire routes into server.js

**Files:**
- Modify: `server.js`

**Interfaces:**
- Consumes: `aiK2Json` (Task 1), `CLASSROOM_PERSONAS`/`TEACHER_AGENT`/`findPersona` (Task 2), `buildTopicKeywordSet`/`classifyStudentMessage`/`selectResponders` (Task 3), and existing `server.js` internals: `getStudent`, `putStudent`, `getBoard`, `ensureCourse`, `pickTeachTarget`, `normalizeStudyFocus`, `cleanStudentText`, `clamp`, `publicStudent`.
- Produces: `POST /api/classroom/start` and `POST /api/classroom/message`, plus the `s.classroom` session shape (documented below) that Task 5 depends on:
  ```js
  s.classroom = {
    subjectId, boardId, topicId, subskillId, topicName, subskillName,
    keywords: string[],   // NOT a Set — must stay JSON-serializable for students.json
    history: [{ role: "student", text } | { role: "agent", personaId, text }],
    rewardGiven: boolean,
  };
  ```

**Prerequisite: confirm Task 1's smoke test passed with a real completion before starting this task.**

- [ ] **Step 1: Add imports**

In `server.js`, near the top with the other local imports (after `import { pickVisual } from "./diagrams.js";`):

```js
import { aiK2Json } from "./k2Client.js";
import { CLASSROOM_PERSONAS, TEACHER_AGENT, findPersona } from "./classroomPersonas.js";
import { buildTopicKeywordSet, classifyStudentMessage, selectResponders } from "./classroomClassifier.js";
```

- [ ] **Step 2: Add the two routes**

In `server.js`, add this block after the existing `/api/chat` route (right before `app.listen(PORT, ...)`):

```js
// ── Classroom simulation: student explains a topic to AI peers + a teacher ──

app.post("/api/classroom/start", (req, res) => {
  try {
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

    const keywordSet = buildTopicKeywordSet(
      target.topic.name,
      target.sub.name,
      target.topic.subskills.map((ss) => ss.name)
    );

    s.classroom = {
      subjectId,
      boardId,
      topicId: target.topic.id,
      subskillId: target.sub.id,
      topicName: target.topic.name,
      subskillName: target.sub.name,
      keywords: [...keywordSet],
      history: [],
      rewardGiven: false,
    };
    putStudent(s);

    res.json({
      classroom: {
        topicName: target.topic.name,
        subskillName: target.sub.name,
        personas: [...CLASSROOM_PERSONAS, TEACHER_AGENT].map((p) => ({ id: p.id, name: p.name, trait: p.trait })),
      },
      opener: `Alright ${s.name}, go ahead and explain ${target.sub.name} to the class — take your time.`,
    });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.post("/api/classroom/message", async (req, res) => {
  try {
    const s = getStudent(req.body?.studentId);
    if (!s) return res.status(404).json({ error: "Student not found" });
    if (!s.classroom) return res.status(400).json({ error: "No active classroom session — call /api/classroom/start first" });

    const text = cleanStudentText(req.body?.text || "");
    if (!text) return res.status(400).json({ error: "Message required" });

    const classroom = s.classroom;
    const keywordSet = new Set(classroom.keywords || []);
    const recentStudentMessages = classroom.history
      .filter((m) => m.role === "student")
      .slice(-3)
      .map((m) => m.text);

    const signals = classifyStudentMessage(text, { keywordSet, recentStudentMessages });
    const responderIds = selectResponders(signals);

    const personas = responderIds.map((id) => findPersona(id)).filter(Boolean);
    if (!personas.length) return res.status(500).json({ error: "Could not select a responder" });

    const recentTurns = classroom.history.slice(-8).map((m) => {
      const who = m.role === "student" ? "Student" : (findPersona(m.personaId)?.name || m.personaId);
      return `${who}: ${m.text}`;
    });

    const system =
      "You are running a small classroom role-play. Multiple distinct classmates (and sometimes the teacher) " +
      "respond to a student who is explaining a topic out loud. Stay strictly in character for each persona listed " +
      "below — do not blend their voices together. Keep every reply short (1-3 sentences), plain text, no markdown.\n\n" +
      `Topic: ${classroom.topicName}. Sub-topic being explained: ${classroom.subskillName}.\n` +
      (recentTurns.length ? `Recent conversation:\n${recentTurns.join("\n")}\n\n` : "\n") +
      "Personas responding this turn:\n" +
      personas.map((p) => `- ${p.name} (id: "${p.id}"): ${p.systemPrompt}`).join("\n") +
      "\n\nRespond with JSON only: " +
      '{"replies":[{"personaId":"...","reply":"...","understood":false}]} ' +
      "one entry per persona above, in the same order. Set understood=true only for the quick-learner or teacher persona, " +
      "and only when the student's explanation clearly and correctly landed.";

    let parsed;
    try {
      parsed = await aiK2Json({
        system,
        user: text,
        max_tokens: 60 * personas.length + 150,
      });
    } catch (e) {
      console.error("[ai] classroom message generation failed:", e.message || e);
      return res.status(503).json({ error: "Couldn't reach the classroom right now — please try again." });
    }

    const repliesById = new Map((parsed.replies || []).map((r) => [r.personaId, r]));
    const responses = personas.map((p) => {
      const r = repliesById.get(p.id) || {};
      return {
        personaId: p.id,
        name: p.name,
        reply: cleanStudentText(r.reply || "..."),
        understood: Boolean(r.understood),
      };
    });

    classroom.history.push({ role: "student", text });
    for (const r of responses) {
      classroom.history.push({ role: "agent", personaId: r.personaId, text: r.reply });
    }
    classroom.history = classroom.history.slice(-40);

    let reward = null;
    const quickLearnerResponded = responderIds.includes("quick_learner");
    const understoodSignal = responses.some((r) => r.understood);
    if (!classroom.rewardGiven && (quickLearnerResponded || understoodSignal)) {
      const rewardProgress = ensureCourse(s, classroom.subjectId, classroom.boardId);
      const cur = rewardProgress.mastery[classroom.subskillId] ?? 0;
      rewardProgress.mastery[classroom.subskillId] = cur === 0 ? 0.35 : clamp(cur + 0.1, 0, 1);
      classroom.rewardGiven = true;
      reward = {
        masteryBoost: true,
        subskillName: classroom.subskillName,
        message: `The class gets it. +mastery on ${classroom.subskillName}.`,
      };
    }

    putStudent(s);
    res.json({
      responses: responses.map(({ personaId, name, reply }) => ({ personaId, name, reply })),
      reward,
      student: publicStudent(s),
    });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});
```

- [ ] **Step 3: Syntax check**

Run: `node --check server.js`
Expected: no output (exits 0).

- [ ] **Step 4: Manual verification — happy path + each trigger**

Boot the server (`node server.js` in the background), then run each of the following in order (reuse `$STUDENT` across calls):

```bash
REG=$(curl -s -X POST http://localhost:3848/api/auth/register -H 'Content-Type: application/json' -d '{"name":"ClassroomVerify"}')
STUDENT=$(echo "$REG" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
curl -s -X POST http://localhost:3848/api/student/$STUDENT/courses -H 'Content-Type: application/json' -d '{"courses":[{"subjectId":"physics_alevel","boardId":"edexcel"}]}' > /dev/null

# Start — expect a roster of 7 (6 peers + teacher) and a topic/subskill
curl -s -X POST http://localhost:3848/api/classroom/start -H 'Content-Type: application/json' \
  -d "{\"studentId\":\"$STUDENT\",\"subjectId\":\"physics_alevel\",\"boardId\":\"edexcel\",\"topicId\":\"phys_mech_motion\"}"

# Vague/long — expect "curious" among responders
curl -s -X POST http://localhost:3848/api/classroom/message -H 'Content-Type: application/json' \
  -d "{\"studentId\":\"$STUDENT\",\"text\":\"So basically I think it is kind of like when the thing moves and sort of the speed changes a bit over some time, I guess, and that is roughly the idea, more or less, in general terms, if that makes sense.\"}"

# Off-topic — expect "distracted"
curl -s -X POST http://localhost:3848/api/classroom/message -H 'Content-Type: application/json' \
  -d "{\"studentId\":\"$STUDENT\",\"text\":\"Anyway, what did everyone have for lunch today, I am starving right now.\"}"

# Short + hesitant — expect "encouraging"
curl -s -X POST http://localhost:3848/api/classroom/message -H 'Content-Type: application/json' \
  -d "{\"studentId\":\"$STUDENT\",\"text\":\"Um, not sure, maybe?\"}"

# Explicit stuck — expect "teacher"
curl -s -X POST http://localhost:3848/api/classroom/message -H 'Content-Type: application/json' \
  -d "{\"studentId\":\"$STUDENT\",\"text\":\"Honestly I am stuck, I do not know where to start with velocity.\"}"

# Clear/confident — expect "quick_learner", and check the reward fires
curl -s -X POST http://localhost:3848/api/classroom/message -H 'Content-Type: application/json' \
  -d "{\"studentId\":\"$STUDENT\",\"text\":\"Velocity is the rate of change of displacement with time, and acceleration is the rate of change of velocity. On a velocity-time graph, the gradient gives acceleration and the area under the line gives displacement.\"}"
```

Expected: each response's `responses[].personaId` includes the persona named in the comment above it; the last call's JSON includes a non-null `reward` (first time only — resend the same message and confirm `reward` is `null` the second time, proving the one-time-per-session gate works).

- [ ] **Step 5: Commit**

```bash
git add server.js
git commit -m "feat: wire classroom simulation routes into server.js"
```

---

### Task 5: Standalone test harness page

**Files:**
- Create: `public/classroom-test.html`

**Interfaces:**
- Consumes: `/api/catalog`, `/api/auth/register`, `/api/student/:id/courses`, `/api/classroom/start`, `/api/classroom/message` (all from Task 4 and pre-existing routes).
- Produces: a browser-testable page at `/classroom-test.html` (served automatically by the existing `express.static(join(__dirname, "public"))` in `server.js` — no server change needed).

Before writing this file, invoke the `frontend-design:frontend-design` skill briefly to confirm the minimal-effort approach below is appropriate for a throwaway internal test page (it should be — no visual design decisions here beyond basic legibility).

- [ ] **Step 1: Write the test harness**

Write `public/classroom-test.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Classroom Simulation — Test Harness</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 720px; margin: 24px auto; padding: 0 16px; }
  select, input, button { font: inherit; padding: 6px 8px; }
  #log { border: 1px solid #ccc; padding: 10px; height: 360px; overflow-y: auto; margin: 12px 0; }
  .msg { margin: 6px 0; }
  .msg b { display: inline-block; min-width: 90px; }
  .msg.student { color: #144; }
  .msg.sys { color: #888; font-style: italic; }
  #composer { display: flex; gap: 8px; }
  #composer input { flex: 1; }
  label { display: block; margin: 8px 0 2px; font-size: 13px; color: #555; }
  fieldset { margin: 10px 0; }
</style>
</head>
<body>
<h2>Classroom Simulation — Test Harness</h2>
<p style="color:#888">Throwaway test page, no shared state with the main app.</p>

<fieldset id="step1">
  <legend>1. Enroll</legend>
  <label>Student name</label>
  <input id="name" value="ClassroomTester" />
  <label>Subject</label>
  <select id="subject"></select>
  <label>Board</label>
  <select id="board"></select>
  <button id="enrollBtn">Enroll</button>
</fieldset>

<fieldset id="step2" style="display:none">
  <legend>2. Pick a topic and start</legend>
  <label>Topic (blank = weakest, chosen automatically)</label>
  <select id="topic"><option value="">(pick weakest automatically)</option></select>
  <button id="startBtn">Start classroom</button>
</fieldset>

<div id="session" style="display:none">
  <div id="log"></div>
  <div id="composer">
    <input id="text" placeholder="Explain the topic to the class..." />
    <button id="sendBtn">Send</button>
  </div>
</div>

<script>
let token = null;
let catalog = null;
let courseTopics = [];

function el(id) { return document.getElementById(id); }

function logMsg(who, text, cls) {
  const log = el("log");
  const div = document.createElement("div");
  div.className = "msg " + (cls || "");
  div.innerHTML = "<b>" + who + ":</b> " + String(text).replace(/</g, "&lt;");
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

async function api(path, body) {
  const res = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || res.statusText);
  return j;
}

function fillBoards() {
  const subject = catalog.subjects.find((s) => s.id === el("subject").value);
  el("board").innerHTML = (subject?.boards || [])
    .map((b) => `<option value="${b.id}">${b.name}</option>`)
    .join("");
}

async function init() {
  catalog = await api("/api/catalog");
  el("subject").innerHTML = catalog.subjects
    .map((s) => `<option value="${s.id}">${s.name} (${s.level})</option>`)
    .join("");
  fillBoards();
  el("subject").onchange = fillBoards;
}

el("enrollBtn").onclick = async () => {
  try {
    const name = (el("name").value.trim() || "ClassroomTester") + "_" + Date.now();
    const reg = await api("/api/auth/register", { name });
    token = reg.token;
    const subjectId = el("subject").value;
    const boardId = el("board").value;
    const enrolled = await api(`/api/student/${token}/courses`, { courses: [{ subjectId, boardId }] });
    courseTopics = enrolled.student.courses[0]?.topics || [];
    el("topic").innerHTML =
      '<option value="">(pick weakest automatically)</option>' +
      courseTopics.map((t) => `<option value="${t.id}">${t.name}</option>`).join("");
    el("step2").style.display = "block";
  } catch (e) {
    alert("Enroll failed: " + e.message);
  }
};

el("startBtn").onclick = async () => {
  try {
    const subjectId = el("subject").value;
    const boardId = el("board").value;
    const topicId = el("topic").value || undefined;
    const started = await api("/api/classroom/start", { studentId: token, subjectId, boardId, topicId });
    el("step1").style.display = "none";
    el("step2").style.display = "none";
    el("session").style.display = "block";
    logMsg("System", `Topic: ${started.classroom.topicName} — ${started.classroom.subskillName}`, "sys");
    logMsg("System", "Roster: " + started.classroom.personas.map((p) => `${p.name} (${p.trait})`).join(", "), "sys");
    logMsg("Teacher", started.opener);
  } catch (e) {
    alert("Start failed: " + e.message);
  }
};

el("sendBtn").onclick = async () => {
  const input = el("text");
  const text = input.value.trim();
  if (!text || !token) return;
  input.value = "";
  logMsg("You", text, "student");
  try {
    const j = await api("/api/classroom/message", { studentId: token, text });
    for (const r of j.responses) logMsg(r.name, r.reply);
    if (j.reward) logMsg("System", j.reward.message, "sys");
  } catch (e) {
    logMsg("System", "Error: " + e.message, "sys");
  }
};
el("text").addEventListener("keydown", (e) => {
  if (e.key === "Enter") el("sendBtn").click();
});

init();
</script>
</body>
</html>
```

- [ ] **Step 2: Manual verification**

Boot the server (`node server.js`), open `http://localhost:3848/classroom-test.html` in a browser, click through Enroll → pick "Mechanics: Motion" → Start classroom, then send a few messages (a long vague one, an off-topic one, a confident correct one) and confirm the log shows different named personas responding appropriately, and that resending a "clear" message a second time does not show a second reward message.

- [ ] **Step 3: Commit**

```bash
git add public/classroom-test.html
git commit -m "feat: add standalone classroom simulation test harness page"
```

---

## Post-implementation

Once all 5 tasks are done, run `superpowers:verification-before-completion` before reporting the feature complete to the user — re-run `node --test`, re-run the Task 4 manual verification sequence fresh, and confirm the K2 smoke test result is still valid before making any success claims.
