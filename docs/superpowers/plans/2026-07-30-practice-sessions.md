# Scenario Practice Sessions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generalize the classroom simulation into free-text scenario inference against 5 pre-authored practice templates, drop the mastery tie-in, and add a 3-dimension end-of-session coaching rubric — fully retiring the classroom feature.

**Architecture:** Two new pure/data modules (`practiceClassifier.js`, `practiceTemplates.js`) get built and tested standalone first, alongside the still-working classroom feature. A new inference route is added as a pure addition. Then one task atomically swaps the two classroom routes for their generalized `/api/practice/*` equivalents and deletes every classroom file — server.js is never in a half-migrated state at any commit boundary. A new end-of-session route and a replacement test harness finish it.

**Tech Stack:** Node.js (ESM), Express 5, built-in `fetch`, built-in `node:test` runner (zero new dependencies) — identical stack to the classroom feature this replaces.

## Global Constraints

- Node >=18, ESM modules only (`import`/`export`).
- No new npm dependencies.
- Every outbound AI call goes through the existing `aiK2Json`/`aiK2Messages` (k2Client.js) — already has its own timeout/error handling; no task adds a second layer of it.
- Every piece of model-generated text passes through `cleanStudentText()` before being returned or stored, and every piece of student-supplied free text is capped at 2000 chars (`.slice(0, 2000)`) before use, matching the existing convention (`sanitizeChatHistory`/`normalizeStudyFocus` elsewhere in `server.js`, and the classroom feature's own fix for this).
- **No task leaves server.js in a broken/half-migrated state.** Tasks 1-3 are pure additions (new files, one new route) — the existing classroom feature keeps working throughout. Task 4 is the one atomic swap: remove both classroom routes and every classroom-only file in the same task that adds their replacements.
- **No mastery/reward logic anywhere in this feature.** Fully dropped, not adapted — no `rewardGiven`, no `progress.mastery` writes, no `understood` field in the message-generation JSON contract (it served the now-deleted reward mechanism and has no other purpose).
- **No subjectId/boardId/topicId/subskillId anywhere in this feature.** Fully decoupled from the curriculum data model — `curriculum.js`/`questionBank.js` are not imported by anything new in this plan.
- The model must never be trusted to self-enforce the 5-item template enum in `/api/practice/infer-scenario` — server-side validation with a `casual` fallback is mandatory.
- The existing `/api/topic/exam/*`, diagnose, and learn routes, and every file under `curriculum.js`/`data/questionBank.js`, are out of scope — do not touch them.
- Test harness (`public/practice-test.html`) is fully standalone, same as its classroom predecessor — no shared state with `index.html`'s `S` object.

Spec: `docs/superpowers/specs/2026-07-30-practice-sessions-design.md`

---

### Task 1: `practiceClassifier.js` — generalized classifier + new rubric-signal functions

**Files:**
- Create: `practiceClassifier.js`
- Create: `practiceClassifier.test.js`

**Interfaces:**
- Consumes: nothing (pure functions, no I/O). Does NOT touch `classroomClassifier.js` — that file stays as-is, still used by the still-working classroom routes until Task 4.
- Produces: `buildScenarioKeywordSet(description) => Set<string>`, `classifyStudentMessage(text, { keywordSet, recentStudentMessages }) => signals object` (same fields as the classroom version), `selectResponders(signals, rng = Math.random) => string[]` (role ids, now `facilitator`/`impressed` instead of `teacher`/`quick_learner`), `summarizeDelivery(studentTexts) => { turnCount, hedgeRate, rambleRate }`, `summarizeEngagement(studentTexts) => { turnCount, questionRate }`. Task 4 imports all of these; Task 5 additionally imports the two summarize functions.

- [ ] **Step 1: Write the failing tests**

Write `practiceClassifier.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildScenarioKeywordSet,
  classifyStudentMessage,
  selectResponders,
  summarizeDelivery,
  summarizeEngagement,
} from "./practiceClassifier.js";

test("buildScenarioKeywordSet strips short/stop words and lowercases", () => {
  const set = buildScenarioKeywordSet("I'm pitching a startup about renewable energy storage to investors");
  assert.ok(set.has("pitching"));
  assert.ok(set.has("startup"));
  assert.ok(set.has("renewable"));
  assert.ok(set.has("energy"));
  assert.ok(set.has("storage"));
  assert.ok(set.has("investors"));
  assert.ok(!set.has("about"));
  assert.ok(!set.has("to"));
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

test("selectResponders: stuck phrase brings in the facilitator over encouraging", () => {
  const picks = selectResponders(
    { selfContradiction: false, stuckPhrase: true, hesitantShort: true, offTopic: false, vague: false },
    () => 1
  );
  assert.deepEqual(picks, ["facilitator"]);
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

test("selectResponders: no triggers falls back to impressed", () => {
  const picks = selectResponders(
    { selfContradiction: false, stuckPhrase: false, hesitantShort: false, offTopic: false, vague: false },
    () => 1
  );
  assert.deepEqual(picks, ["impressed"]);
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

test("summarizeDelivery aggregates hedge rate and ramble rate across turns", () => {
  const texts = [
    "I think maybe this is kind of right, I guess.", // hedgy, short
    "The mechanism is straightforward and well established.", // clean
  ];
  const result = summarizeDelivery(texts);
  assert.equal(result.turnCount, 2);
  assert.ok(result.hedgeRate > 0);
  assert.equal(result.rambleRate, 0); // neither turn is long/hedgy enough to be `vague`
});

test("summarizeDelivery returns zero rates for an empty transcript", () => {
  const result = summarizeDelivery([]);
  assert.deepEqual(result, { turnCount: 0, hedgeRate: 0, rambleRate: 0 });
});

test("summarizeEngagement computes question rate across turns", () => {
  const texts = [
    "Does that make sense so far?",
    "Here is the rest of my point, no question here.",
  ];
  const result = summarizeEngagement(texts);
  assert.equal(result.turnCount, 2);
  assert.equal(result.questionRate, 0.5);
});

test("summarizeEngagement returns zero rate for an empty transcript", () => {
  const result = summarizeEngagement([]);
  assert.deepEqual(result, { turnCount: 0, questionRate: 0 });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test practiceClassifier.test.js`
Expected: FAIL — `practiceClassifier.js` does not exist yet.

- [ ] **Step 3: Write the classifier module**

Write `practiceClassifier.js`:

```js
/** Local, deterministic heuristics for scenario-practice agent selection and end-of-session signal summaries. No I/O, no model calls. */

const HEDGE_RE = /\b(kind of|sort of|i think|i guess|maybe|not sure|possibly|probably|i suppose|um+|uh+)\b/gi;
const STUCK_RE = /\b(i don'?t know|not sure|i'?m stuck|confused|no idea|i forget)\b/i;
const ABSOLUTE_RE = /\b(always|never|definitely|certainly|100%|guaranteed)\b/i;
const NEGATION_RE = /\b(not|isn'?t|doesn'?t|never|no longer|wasn'?t|aren'?t)\b/i;
const ENGAGEMENT_RE = /\?|what do you think|does that make sense|any questions|do you agree/i;

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

export function buildScenarioKeywordSet(description) {
  return new Set(significantWords(description || ""));
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
    if (signals.stuckPhrase) add("facilitator");
    else if (signals.hesitantShort) add("encouraging");
  }
  if (picks.length < 3 && signals.offTopic) add("distracted");
  if (picks.length < 3 && signals.vague) add("curious");
  if (picks.length === 0) add("impressed");

  if (picks.length < 3 && !picks.includes("shy_engaged") && rng() < 0.15) {
    add("shy_engaged");
  }

  return picks.slice(0, 3);
}

export function summarizeDelivery(studentTexts) {
  const turnCount = studentTexts.length;
  if (turnCount === 0) return { turnCount: 0, hedgeRate: 0, rambleRate: 0 };
  let totalWords = 0;
  let totalHedges = 0;
  let vagueTurns = 0;
  for (const text of studentTexts) {
    const signals = classifyStudentMessage(text, {});
    totalWords += signals.wordCount;
    totalHedges += signals.hedgeCount;
    if (signals.vague) vagueTurns += 1;
  }
  return {
    turnCount,
    hedgeRate: totalWords > 0 ? totalHedges / totalWords : 0,
    rambleRate: vagueTurns / turnCount,
  };
}

export function summarizeEngagement(studentTexts) {
  const turnCount = studentTexts.length;
  if (turnCount === 0) return { turnCount: 0, questionRate: 0 };
  const engagedTurns = studentTexts.filter((t) => ENGAGEMENT_RE.test(t)).length;
  return {
    turnCount,
    questionRate: engagedTurns / turnCount,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test practiceClassifier.test.js`
Expected: PASS (all 21 tests).

- [ ] **Step 5: Commit**

```bash
git add practiceClassifier.js practiceClassifier.test.js
git commit -m "feat: add generalized practice-session classifier and rubric signal functions"
```

---

### Task 2: `practiceTemplates.js` — 5 scenario templates × 7 personas

**Files:**
- Create: `practiceTemplates.js`
- Create: `practiceTemplates.test.js`

**Interfaces:**
- Consumes: nothing (pure data module). Does NOT touch `classroomPersonas.js` — untouched until Task 4.
- Produces: `PRACTICE_TEMPLATES` (object keyed by 5 template ids, each `{id, name, description, personas: [7 role-tagged persona objects]}`), `TEMPLATE_IDS` (array of the 5 ids), `findPersona(templateId, roleId) => persona object or null`. Task 3 imports `PRACTICE_TEMPLATES`/`TEMPLATE_IDS`; Task 4 imports all three.

- [ ] **Step 1: Write the failing tests**

Write `practiceTemplates.test.js`:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test practiceTemplates.test.js`
Expected: FAIL — `practiceTemplates.js` does not exist yet.

- [ ] **Step 3: Write the template data module**

Write `practiceTemplates.js`:

```js
/** Scenario practice-session templates: 5 fixed scenarios, each with the same 7 roles. */

export const PRACTICE_TEMPLATES = {
  exam_viva: {
    id: "exam_viva",
    name: "Exam viva",
    description: "An oral exam — the student defends an answer to an examiner panel.",
    personas: [
      { id: "curious", name: "Priya", trait: "Probing examiner",
        systemPrompt: "You are Priya, an examiner on a viva panel. You ask genuine, short probing questions when the candidate's answer is vague, incomplete, or skips a step — 'what happens if...?', 'can you go one level deeper on that?'. 1-2 short sentences, professional but not cold. Plain text only, no markdown." },
      { id: "skeptical", name: "Dr. Okafor", trait: "Skeptical examiner",
        systemPrompt: "You are Dr. Okafor, an examiner on a viva panel. When a claim sounds unjustified, too certain without evidence, or contradicts something said earlier, you push back — 'what's your justification for that?'. Firm but fair, never hostile. 1-2 short sentences. Plain text only, no markdown." },
      { id: "encouraging", name: "Sam", trait: "Supportive assistant examiner",
        systemPrompt: "You are Sam, an assistant examiner on a viva panel. When the candidate seems hesitant or stuck, you reassure them and offer a small nudge forward, without giving away the answer. 1-2 short sentences, warm tone. Plain text only, no markdown." },
      { id: "impressed", name: "The Chief Examiner", trait: "Signals a strong answer",
        systemPrompt: "You are the Chief Examiner. When an answer is clear, complete, and well-justified, you say so plainly — 'that's a strong, complete answer' — and may ask one brief follow-up that builds on it. Brief, 1 short sentence usually. Plain text only, no markdown." },
      { id: "distracted", name: "Jordan", trait: "Distracted panel member",
        systemPrompt: "You are Jordan, a panel member who has noticed the candidate has drifted away from the question actually being asked, and you say so — admitting you've lost the thread, or asking them to refocus on the original question. 1 short sentence. Plain text only, no markdown." },
      { id: "shy_engaged", name: "Alex", trait: "Quiet observer",
        systemPrompt: "You are Alex, a quiet observer on the panel. You don't say much, but when you do it's a small, genuine, tentative follow-up question or observation. Very short, understated tone. Plain text only, no markdown." },
      { id: "facilitator", name: "The Chair", trait: "Facilitator",
        systemPrompt: "You are the Chair of the viva panel. Your job is to keep the session productive: offer a concrete next step when the candidate is stuck, redirect if the panel's questions have wandered, and acknowledge clearly when the candidate has demonstrated understanding. Brief, purposeful, 1-3 sentences. Plain text only, no markdown." },
    ],
  },
  pitch: {
    id: "pitch",
    name: "Investor pitch",
    description: "The student pitches an idea to a small group of investors.",
    personas: [
      { id: "curious", name: "Nina", trait: "Detail-seeking investor",
        systemPrompt: "You are Nina, an investor. You ask genuine, short questions when a pitch is vague or skips specifics — market size, numbers, who the customer actually is. 1-2 short sentences, curious tone. Plain text only, no markdown." },
      { id: "skeptical", name: "Marcus", trait: "Skeptical investor",
        systemPrompt: "You are Marcus, an investor. When a claim sounds unjustified or too confident without evidence, you challenge it — 'what's your moat?', 'why hasn't someone else done this?'. Direct but not rude. 1-2 short sentences. Plain text only, no markdown." },
      { id: "encouraging", name: "Ravi", trait: "Encouraging investor",
        systemPrompt: "You are Ravi, a warmer investor. When the founder seems nervous or stuck, you reassure them and gently prompt them to continue, without taking over the pitch. 1-2 short sentences, warm tone. Plain text only, no markdown." },
      { id: "impressed", name: "Elena", trait: "Signals genuine interest",
        systemPrompt: "You are Elena, an investor. When the pitch lands — clear, compelling, well-argued — you say so with genuine enthusiasm and may ask a quick follow-up that shows you're engaged. Brief, upbeat, usually 1 short sentence. Plain text only, no markdown." },
      { id: "distracted", name: "Tom", trait: "Distracted investor",
        systemPrompt: "You are Tom, an investor who's noticed his attention drifted — checking his phone, admitting he lost track of the ask. You say so casually, not accusingly, and ask the founder to recap the core ask. 1 short sentence. Plain text only, no markdown." },
      { id: "shy_engaged", name: "Yuki", trait: "Quiet investor",
        systemPrompt: "You are Yuki, a quieter investor in the room. You don't say much, but when you do it's a small, genuine, tentative question. Very short, understated tone. Plain text only, no markdown." },
      { id: "facilitator", name: "The Moderator", trait: "Facilitator",
        systemPrompt: "You are the Moderator running this pitch session. Your job is to keep it productive: offer a concrete next step when the founder is stuck, redirect if the room's questions have wandered from the pitch, and acknowledge clearly when the founder has made a compelling case. Brief, purposeful, 1-3 sentences. Plain text only, no markdown." },
    ],
  },
  interview: {
    id: "interview",
    name: "Job interview",
    description: "The student answers questions in a job interview.",
    personas: [
      { id: "curious", name: "Grace", trait: "Detail-seeking interviewer",
        systemPrompt: "You are Grace, an interviewer. You ask genuine, short follow-ups when an answer is vague or skips specifics — 'can you walk me through a concrete example of that?'. 1-2 short sentences, professional and curious. Plain text only, no markdown." },
      { id: "skeptical", name: "David", trait: "Skeptical interviewer",
        systemPrompt: "You are David, an interviewer. When an answer sounds rehearsed, overconfident, or has a gap, you probe it — 'what would you have done differently?'. Firm but professional, never hostile. 1-2 short sentences. Plain text only, no markdown." },
      { id: "encouraging", name: "Maria", trait: "Warm interviewer",
        systemPrompt: "You are Maria, a warm interviewer. When the candidate seems nervous or stuck, you reassure them and offer a small prompt to help them continue, without answering for them. 1-2 short sentences, warm tone. Plain text only, no markdown." },
      { id: "impressed", name: "The Hiring Manager", trait: "Signals a strong answer",
        systemPrompt: "You are the Hiring Manager. When an answer is clear, specific, and well-structured, you say so plainly and may ask one brief follow-up that builds on it. Brief, usually 1 short sentence. Plain text only, no markdown." },
      { id: "distracted", name: "Chris", trait: "Distracted interviewer",
        systemPrompt: "You are Chris, an interviewer whose attention drifted mid-answer. You admit it casually and ask the candidate to recap their main point. 1 short sentence. Plain text only, no markdown." },
      { id: "shy_engaged", name: "Leah", trait: "Quiet panel member",
        systemPrompt: "You are Leah, a quieter member of the interview panel. You don't say much, but when you do it's a small, genuine, tentative follow-up. Very short, understated tone. Plain text only, no markdown." },
      { id: "facilitator", name: "The Recruiter", trait: "Facilitator",
        systemPrompt: "You are the Recruiter running this interview. Your job is to keep it productive: offer a concrete next step when the candidate is stuck, redirect if the panel's questions have wandered, and acknowledge clearly when the candidate has given a strong answer. Brief, purposeful, 1-3 sentences. Plain text only, no markdown." },
    ],
  },
  public_speech: {
    id: "public_speech",
    name: "Public speech",
    description: "The student delivers a speech or presentation to an audience.",
    personas: [
      { id: "curious", name: "Devon", trait: "Detail-seeking audience member",
        systemPrompt: "You are Devon, an audience member. You ask a genuine, short question when part of the speech was vague or skipped detail you wanted to hear more about. 1-2 short sentences, curious tone. Plain text only, no markdown." },
      { id: "skeptical", name: "Morgan", trait: "Skeptical audience member",
        systemPrompt: "You are Morgan, an audience member. When a claim in the speech sounds unjustified or too sweeping, you question it politely but directly — 'what's that based on?'. 1-2 short sentences. Plain text only, no markdown." },
      { id: "encouraging", name: "Casey", trait: "Supportive audience member",
        systemPrompt: "You are Casey, a supportive audience member. When the speaker seems to be faltering or losing their train of thought, you offer a small word of encouragement or a gentle prompt. 1-2 short sentences, warm tone. Plain text only, no markdown." },
      { id: "impressed", name: "Robin", trait: "Visibly won over",
        systemPrompt: "You are Robin, an audience member. When a point in the speech really lands — clear, compelling — you say so with genuine enthusiasm. Brief, upbeat, usually 1 short sentence. Plain text only, no markdown." },
      { id: "distracted", name: "Jamie", trait: "Checked-out audience member",
        systemPrompt: "You are Jamie, an audience member who admits their attention wandered and they lost the thread of what the speaker was saying, and asks them to recap. 1 short sentence, not rude, just honest. Plain text only, no markdown." },
      { id: "shy_engaged", name: "Sky", trait: "Quiet audience member",
        systemPrompt: "You are Sky, a quieter audience member. You don't say much, but when you do it's a small, genuine, tentative reaction or question. Very short, understated tone. Plain text only, no markdown." },
      { id: "facilitator", name: "The Host", trait: "Facilitator",
        systemPrompt: "You are the Host/MC for this talk. Your job is to keep things moving: offer a concrete prompt when the speaker is stuck, redirect if audience questions have wandered off the speech's topic, and acknowledge clearly when a point has landed well. Brief, purposeful, 1-3 sentences. Plain text only, no markdown." },
    ],
  },
  casual: {
    id: "casual",
    name: "Casual conversation practice",
    description: "Lower-stakes practice at structuring thoughts out loud with a group of friends.",
    personas: [
      { id: "curious", name: "Beck", trait: "Genuinely curious friend",
        systemPrompt: "You are Beck, a friend. You ask a genuine, short follow-up when something was vague or you want to hear more. Casual, warm, curious. 1-2 short sentences. Plain text only, no markdown." },
      { id: "skeptical", name: "Frankie", trait: "Gently skeptical friend",
        systemPrompt: "You are Frankie, a friend. When something sounds off or too certain, you gently push back — 'wait, really?' — never harshly, just genuinely unconvinced. 1-2 short sentences, casual tone. Plain text only, no markdown." },
      { id: "encouraging", name: "Sage", trait: "Warm, encouraging friend",
        systemPrompt: "You are Sage, a warm friend. When the person seems to be struggling to get their thought out, you reassure them and gently help them continue, without finishing the thought for them. 1-2 short sentences, warm tone. Plain text only, no markdown." },
      { id: "impressed", name: "Milo", trait: "Genuinely engaged friend",
        systemPrompt: "You are Milo, a friend. When someone makes a point that really lands, you say so genuinely — 'oh that's a really good way to put it'. Brief, warm, usually 1 short sentence. Plain text only, no markdown." },
      { id: "distracted", name: "Ollie", trait: "Distracted friend",
        systemPrompt: "You are Ollie, a friend whose mind wandered a bit. You admit it casually — 'sorry, I lost the thread there' — and ask them to recap, no big deal. 1 short sentence. Plain text only, no markdown." },
      { id: "shy_engaged", name: "Wren", trait: "Quieter friend",
        systemPrompt: "You are Wren, a quieter friend in the group. You don't say much, but when you do it's a small, genuine, tentative comment or question. Very short, understated tone. Plain text only, no markdown." },
      { id: "facilitator", name: "Val", trait: "Facilitator",
        systemPrompt: "You are Val, the friend who gently helps the group conversation stay on track — not an authority figure, just someone who notices when the person is stuck and offers a low-key nudge, or notices the conversation has wandered and steers it back with a light touch. Brief, warm, 1-3 sentences. Plain text only, no markdown." },
    ],
  },
};

export const TEMPLATE_IDS = Object.keys(PRACTICE_TEMPLATES);

export function findPersona(templateId, roleId) {
  const template = PRACTICE_TEMPLATES[templateId];
  if (!template) return null;
  return template.personas.find((p) => p.id === roleId) || null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test practiceTemplates.test.js`
Expected: PASS (all 7 tests).

- [ ] **Step 5: Commit**

```bash
git add practiceTemplates.js practiceTemplates.test.js
git commit -m "feat: add 5 scenario practice templates with 7-role persona rosters"
```

---

### Task 3: `POST /api/practice/infer-scenario`

**Files:**
- Modify: `server.js`

**Interfaces:**
- Consumes: `PRACTICE_TEMPLATES`/`TEMPLATE_IDS` (Task 2), `aiK2Json` (already imported in server.js from Task 1 of the classroom plan), existing `getStudent`, `cleanStudentText`.
- Produces: a new live route, `POST /api/practice/infer-scenario`. Does not touch the existing classroom routes/imports — this is a pure addition.

- [ ] **Step 1: Add the import**

In `server.js`, alongside the existing classroom-related imports (near `import { CLASSROOM_PERSONAS, TEACHER_AGENT, findPersona } from "./classroomPersonas.js";`), add:

```js
import { PRACTICE_TEMPLATES, TEMPLATE_IDS } from "./practiceTemplates.js";
```

- [ ] **Step 2: Add the route**

Add this route to `server.js`, after the existing `/api/classroom/message` route (before `app.listen`):

```js
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
    let confidence = parsed.confidence || "medium";
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
```

- [ ] **Step 3: Syntax check**

Run: `node --check server.js`
Expected: no output (exits 0).

- [ ] **Step 4: Manual verification**

Boot the server (`node server.js` in the background), then:

```bash
REG=$(curl -s -X POST http://localhost:3848/api/auth/register -H 'Content-Type: application/json' -d '{"name":"InferVerify"}')
STUDENT=$(echo "$REG" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Expect templateId "pitch", high/medium confidence
curl -s -X POST http://localhost:3848/api/practice/infer-scenario -H 'Content-Type: application/json' \
  -d "{\"studentId\":\"$STUDENT\",\"description\":\"I am pitching my startup idea to a group of investors next week and want to practice.\"}"
echo

# Expect templateId "interview"
curl -s -X POST http://localhost:3848/api/practice/infer-scenario -H 'Content-Type: application/json' \
  -d "{\"studentId\":\"$STUDENT\",\"description\":\"I have a job interview for a software engineering role tomorrow morning.\"}"
echo

# Nonsense input — confirm it still returns a valid templateId from the fixed list, never a 500 or an invented id
curl -s -X POST http://localhost:3848/api/practice/infer-scenario -H 'Content-Type: application/json' \
  -d "{\"studentId\":\"$STUDENT\",\"description\":\"asdkjf qwoeiru zzz nothing coherent here\"}"
echo
```

Expected: each response has a `templateId` that is one of the 5 known ids (verify against `TEMPLATE_IDS` by inspection), a `personas` array of exactly 7 entries, and the two clearly-scenario'd examples land on the intuitively correct template. Kill the backgrounded server when done.

- [ ] **Step 5: Commit**

```bash
git add server.js
git commit -m "feat: add scenario inference endpoint for practice sessions"
```

---

### Task 4: Replace classroom routes with `/api/practice/start` + `/api/practice/message`

**Files:**
- Modify: `server.js`
- Delete: `classroomClassifier.js`, `classroomClassifier.test.js`, `classroomPersonas.js`, `classroomPersonas.test.js`

**Interfaces:**
- Consumes: `buildScenarioKeywordSet`/`classifyStudentMessage`/`selectResponders` (Task 1), `PRACTICE_TEMPLATES`/`findPersona` (Task 2), `aiK2Json`.
- Produces: `POST /api/practice/start` and `POST /api/practice/message`, and the `s.practice` session shape other tasks/the harness rely on:
  ```js
  s.practice = {
    templateId, templateName, description,
    keywords: string[],   // plain array, not a Set
    history: [{ role: "student", text } | { role: "agent", personaId, text }],
    startedAt, endedAt: null,
  };
  ```

**This is the one task that removes the classroom feature. Do it atomically — server.js must not be left in a state where the old routes are gone but the new ones aren't in yet, or vice versa.**

- [ ] **Step 1: Remove the classroom-only imports and add the practice ones**

In `server.js`, remove these two import lines:

```js
import { CLASSROOM_PERSONAS, TEACHER_AGENT, findPersona } from "./classroomPersonas.js";
import { buildTopicKeywordSet, classifyStudentMessage, selectResponders } from "./classroomClassifier.js";
```

Replace with:

```js
import { PRACTICE_TEMPLATES, findPersona } from "./practiceTemplates.js";
import { buildScenarioKeywordSet, classifyStudentMessage, selectResponders } from "./practiceClassifier.js";
```

`PRACTICE_TEMPLATES`/`TEMPLATE_IDS` are already imported from Task 3's
`import { PRACTICE_TEMPLATES, TEMPLATE_IDS } from "./practiceTemplates.js";`.
Merge `findPersona` into that same line rather than adding a second import
of the same module, so it reads exactly:

```js
import { PRACTICE_TEMPLATES, TEMPLATE_IDS, findPersona } from "./practiceTemplates.js";
```

- [ ] **Step 2: Delete the two classroom routes**

Remove the entire `app.post("/api/classroom/start", ...)` route block and the entire `app.post("/api/classroom/message", ...)` route block from `server.js` — every line from `app.post("/api/classroom/start"` through the closing `});` of the message route, including the comment header above them (`// ── Classroom simulation: ... ──`).

- [ ] **Step 3: Add the replacement routes**

Add this in the same location the classroom routes occupied (after the existing `/api/practice/infer-scenario` route, before `app.listen`):

```js
// ── Scenario practice sessions ──

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
    const responses = personas.map((p) => {
      const r = repliesById.get(p.id) || {};
      return {
        personaId: p.id,
        name: p.name,
        reply: cleanStudentText(r.reply || "..."),
      };
    });

    practice.history.push({ role: "student", text });
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
```

- [ ] **Step 4: Delete the classroom-only files**

```bash
git rm classroomClassifier.js classroomClassifier.test.js classroomPersonas.js classroomPersonas.test.js
```

- [ ] **Step 5: Syntax check and full test run**

Run: `node --check server.js`
Expected: no output (exits 0).

Run: `npm test`
Expected: all remaining tests pass (the deleted classroom test files are gone; `practiceClassifier.test.js`/`practiceTemplates.test.js` from Tasks 1-2 still pass).

- [ ] **Step 6: Manual verification**

Boot the server (`node server.js` in the background):

```bash
REG=$(curl -s -X POST http://localhost:3848/api/auth/register -H 'Content-Type: application/json' -d '{"name":"PracticeVerify"}')
STUDENT=$(echo "$REG" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Start — expect a 7-persona roster and the opener
curl -s -X POST http://localhost:3848/api/practice/start -H 'Content-Type: application/json' \
  -d "{\"studentId\":\"$STUDENT\",\"templateId\":\"interview\",\"description\":\"Practicing for a software engineering job interview.\"}"
echo

# Vague answer — expect "curious" among responders
curl -s -X POST http://localhost:3848/api/practice/message -H 'Content-Type: application/json' \
  -d "{\"studentId\":\"$STUDENT\",\"text\":\"So basically I think I am kind of good at, you know, solving problems and stuff, I guess, in general.\"}"
echo

# Clear, confident answer — expect "impressed"
curl -s -X POST http://localhost:3848/api/practice/message -H 'Content-Type: application/json' \
  -d "{\"studentId\":\"$STUDENT\",\"text\":\"In my last role I redesigned our deployment pipeline, cutting release time from two hours to fifteen minutes by parallelizing the build steps.\"}"
echo

# Confirm the old classroom endpoints are gone
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3848/api/classroom/start -H 'Content-Type: application/json' -d '{}'
```

Expected: `responses[].personaId` includes the persona named in each comment (resolved from the `interview` template's roster — e.g. "curious" resolves to Grace, "impressed" resolves to The Hiring Manager); no `reward` field anywhere in either response (confirm by inspecting the raw JSON — the key should not be present at all); the final curl against the old `/api/classroom/start` returns `404` (Express's default for an unmatched route, confirming it's truly gone, not just erroring). Kill the backgrounded server when done.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: replace classroom routes with generalized practice-session routes

Retires the classroom feature entirely: classroomClassifier.js and
classroomPersonas.js (plus their tests) are deleted, replaced by
practiceClassifier.js/practiceTemplates.js from earlier tasks. No
mastery/reward logic carries over — dropped, not adapted."
```

---

### Task 5: `POST /api/practice/end` — end-of-session coaching rubric

**Files:**
- Modify: `server.js`

**Interfaces:**
- Consumes: `summarizeDelivery`/`summarizeEngagement` (Task 1), `findPersona` (Task 2, already imported), `aiK2Json`, `s.practice` (Task 4).
- Produces: `POST /api/practice/end`.

- [ ] **Step 1: Add the import**

In `server.js`, add `summarizeDelivery, summarizeEngagement` to the existing `practiceClassifier.js` import line so it reads:

```js
import { buildScenarioKeywordSet, classifyStudentMessage, selectResponders, summarizeDelivery, summarizeEngagement } from "./practiceClassifier.js";
```

- [ ] **Step 2: Add the route**

Add this route to `server.js`, immediately after `/api/practice/message` (before `app.listen`):

```js
app.post("/api/practice/end", async (req, res) => {
  try {
    const s = getStudent(req.body?.studentId);
    if (!s) return res.status(404).json({ error: "Student not found" });
    if (!s.practice) return res.status(400).json({ error: "No active practice session" });

    const practice = s.practice;
    const studentTexts = practice.history.filter((m) => m.role === "student").map((m) => m.text);
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

    let parsed;
    try {
      parsed = await aiK2Json({ system, user: transcript, max_tokens: 1500 });
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
```

- [ ] **Step 3: Syntax check**

Run: `node --check server.js`
Expected: no output (exits 0).

- [ ] **Step 4: Manual verification**

Boot the server, run a full start → 2-3 messages → end sequence:

```bash
REG=$(curl -s -X POST http://localhost:3848/api/auth/register -H 'Content-Type: application/json' -d '{"name":"EndVerify"}')
STUDENT=$(echo "$REG" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

curl -s -X POST http://localhost:3848/api/practice/start -H 'Content-Type: application/json' \
  -d "{\"studentId\":\"$STUDENT\",\"templateId\":\"public_speech\",\"description\":\"Practicing a 5 minute talk about the benefits of daily walking.\"}" > /dev/null

curl -s -X POST http://localhost:3848/api/practice/message -H 'Content-Type: application/json' \
  -d "{\"studentId\":\"$STUDENT\",\"text\":\"Walking every day is, um, really good for you I think, it helps with a lot of stuff, kind of.\"}" > /dev/null

curl -s -X POST http://localhost:3848/api/practice/message -H 'Content-Type: application/json' \
  -d "{\"studentId\":\"$STUDENT\",\"text\":\"Specifically, a daily 30-minute walk lowers resting heart rate and improves mood by increasing endorphin release. Does that match what you already knew about it?\"}" > /dev/null

curl -s -X POST http://localhost:3848/api/practice/end -H 'Content-Type: application/json' \
  -d "{\"studentId\":\"$STUDENT\"}"
echo

# Confirm ending twice in a row doesn't crash (no active-session state to violate, but check it's a sane error not a 500)
curl -s -X POST http://localhost:3848/api/practice/end -H 'Content-Type: application/json' -d "{\"studentId\":\"$STUDENT\"}"
```

Expected: the first `/end` call returns `rubric` with three non-empty, prose (not numeric) strings, plus `raw.delivery`/`raw.engagement` showing plausible numbers (`hedgeRate` and `rambleRate` should be nonzero given the hedgy first message; `questionRate` should be 0.5 given exactly one of the two messages ends in a question). The second `/end` call should not 500 — `s.practice` still exists (no per-session teardown was specified), so a second call re-runs the same computation over the same history; confirm it returns a normal `rubric` again rather than erroring, and note this in your report as expected v1 behavior (no "already ended" guard was in scope). Kill the backgrounded server when done.

- [ ] **Step 5: Commit**

```bash
git add server.js
git commit -m "feat: add end-of-session coaching rubric for practice sessions"
```

---

### Task 6: Standalone test harness page

**Files:**
- Create: `public/practice-test.html`
- Delete: `public/classroom-test.html`

**Interfaces:**
- Consumes: `/api/auth/register`, `/api/practice/infer-scenario`, `/api/practice/start`, `/api/practice/message`, `/api/practice/end`.
- Produces: a browser-testable page at `/practice-test.html`.

Before writing this file, invoke the `frontend-design:frontend-design` skill briefly to confirm the minimal-effort approach below is appropriate for a throwaway internal test page (it should be — same reasoning as the classroom test page it replaces).

- [ ] **Step 1: Delete the classroom test page**

```bash
git rm public/classroom-test.html
```

- [ ] **Step 2: Write the replacement test harness**

Write `public/practice-test.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Practice Sessions — Test Harness</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 720px; margin: 24px auto; padding: 0 16px; }
  select, input, button, textarea { font: inherit; padding: 6px 8px; }
  textarea { width: 100%; }
  #log { border: 1px solid #ccc; padding: 10px; height: 320px; overflow-y: auto; margin: 12px 0; }
  .msg { margin: 6px 0; }
  .msg b { display: inline-block; min-width: 90px; }
  .msg.student { color: #144; }
  .msg.sys { color: #888; font-style: italic; }
  #composer { display: flex; gap: 8px; }
  #composer input { flex: 1; }
  label { display: block; margin: 8px 0 2px; font-size: 13px; color: #555; }
  fieldset { margin: 10px 0; }
  .rubric-block { border: 1px solid #ccc; border-radius: 6px; padding: 10px; margin: 8px 0; }
  .rubric-block h4 { margin: 0 0 6px; }
  .raw { color: #888; font-size: 12px; }
</style>
</head>
<body>
<h2>Practice Sessions — Test Harness</h2>
<p style="color:#888">Throwaway test page, no shared state with the main app.</p>

<fieldset id="step1">
  <legend>1. Describe your scenario</legend>
  <label>Student name</label>
  <input id="name" value="PracticeTester" />
  <label>Scenario description</label>
  <textarea id="description" rows="3" placeholder="e.g. I'm pitching a startup idea to investors next week"></textarea>
  <div style="margin-top:8px"><button id="inferBtn">Infer scenario</button></div>
</fieldset>

<fieldset id="step2" style="display:none">
  <legend>2. Confirm or override the template</legend>
  <div id="inferResult" class="raw"></div>
  <label>Template</label>
  <select id="template">
    <option value="exam_viva">Exam viva</option>
    <option value="pitch">Investor pitch</option>
    <option value="interview">Job interview</option>
    <option value="public_speech">Public speech</option>
    <option value="casual">Casual conversation practice</option>
  </select>
  <div style="margin-top:8px"><button id="startBtn">Start session</button></div>
</fieldset>

<div id="session" style="display:none">
  <div id="log"></div>
  <div id="composer">
    <input id="text" placeholder="Say your piece..." />
    <button id="sendBtn">Send</button>
  </div>
  <div style="margin-top:10px"><button id="endBtn">End session</button></div>
  <div id="rubric"></div>
</div>

<script>
let token = null;
let description = "";

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

el("inferBtn").onclick = async () => {
  try {
    const name = (el("name").value.trim() || "PracticeTester") + "_" + Date.now();
    const reg = await api("/api/auth/register", { name });
    token = reg.token;
    description = el("description").value.trim();
    if (!description) { alert("Enter a scenario description first"); return; }
    const j = await api("/api/practice/infer-scenario", { studentId: token, description });
    el("inferResult").textContent =
      `Inferred: ${j.templateName} (${j.confidence}) — ${j.reason}`;
    el("template").value = j.templateId;
    el("step2").style.display = "block";
  } catch (e) {
    alert("Infer failed: " + e.message);
  }
};

el("startBtn").onclick = async () => {
  try {
    const templateId = el("template").value;
    const started = await api("/api/practice/start", { studentId: token, templateId, description });
    el("step1").style.display = "none";
    el("step2").style.display = "none";
    el("session").style.display = "block";
    logMsg("System", `Scenario: ${started.practice.templateName}`, "sys");
    logMsg("System", "Roster: " + started.practice.personas.map((p) => `${p.name} (${p.trait})`).join(", "), "sys");
    logMsg("Facilitator", started.opener);
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
    const j = await api("/api/practice/message", { studentId: token, text });
    for (const r of j.responses) logMsg(r.name, r.reply);
  } catch (e) {
    logMsg("System", "Error: " + e.message, "sys");
  }
};
el("text").addEventListener("keydown", (e) => {
  if (e.key === "Enter") el("sendBtn").click();
});

el("endBtn").onclick = async () => {
  try {
    const j = await api("/api/practice/end", { studentId: token });
    const r = j.rubric;
    el("rubric").innerHTML =
      `<div class="rubric-block"><h4>Articulation</h4><div>${r.articulation}</div></div>` +
      `<div class="rubric-block"><h4>Engagement</h4><div>${r.engagement}</div></div>` +
      `<div class="rubric-block"><h4>Content correspondence</h4><div>${r.contentCorrespondence}</div></div>` +
      `<div class="raw">raw: ${JSON.stringify(j.raw)}</div>`;
  } catch (e) {
    alert("End failed: " + e.message);
  }
};
</script>
</body>
</html>
```

- [ ] **Step 3: Manual verification**

Boot the server, open `http://localhost:3848/practice-test.html`, type a scenario description (e.g. "I have a job interview for a marketing role next week"), click Infer scenario, confirm the inferred template looks right and the template `<select>` reflects it, click Start, send 2-3 messages (try a rambling one and a confident one), confirm different named personas from the chosen template respond, click End session, confirm the three rubric paragraphs render as prose (not numbers) and the `raw` line shows plausible signal values.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add standalone practice-session test harness page"
```

---

## Post-implementation

Once all 6 tasks are done, run `superpowers:verification-before-completion` before reporting the feature complete — re-run `node --test`, re-run at least the Task 4 and Task 5 manual verification sequences fresh, and confirm no reference to `classroom` (route, file, or persona) remains anywhere in `server.js` or `public/` before making any success claims.
