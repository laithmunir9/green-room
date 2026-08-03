# Progress Spine & Curtain Call Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make practice progress visible without introducing grades, and end each session by quoting the student's own best sentence back to them.

**Architecture:** Two new pure-logic modules carry all the testable work — `curtainCall.js` (server-side ESM, imported by `server.js`) and `public/sessionProgress.js` (browser IIFE loaded by a plain `<script src>` tag, following the existing `public/micTranscriptAccumulator.js` pattern). `public/index.html` keeps only rendering and DOM wiring. The server already computes every signal this feature needs and returns it in `raw`; the client currently discards it, so no new endpoint or request is added.

**Tech Stack:** Node 18+ ESM, Express 5, vanilla browser JS in a single HTML file, `node --test` with `node:vm` for browser-module tests, inline SVG for charts.

**Spec:** `docs/superpowers/specs/2026-08-02-progress-spine-design.md`

## Global Constraints

- **The wording rule (spec §"The wording rule"):** every number shown to a student describes what happened; no number ranks the student. Allowed: "Between 128 and 147 wpm across your last 5 spoken sessions." Not allowed: "Your pace improved," "3/5," "above average," "needs work." This applies to every string added by this plan.
- The server instruction `"Never output a numeric score or grade. "` at `server.js:409` stays in the prompt, unmodified.
- The review-screen copy `"Here's how your practice session went — no scores, just notes to build on."` at `public/index.html:1706` stays, unmodified.
- No new colors and no new typefaces. Only existing tokens: `--rm-teal`, `--rm-teal-dark`, `--rm-sage`, `--rm-tan`, `--rm-ink`, `--rm-muted`, `--rm-panel`, `--rm-input-bg`, `--rm-line`, `--ink`. Both themes come free because these flip in the dark-mode block at `public/index.html:186-195`.
- Fraunces is used only for headings, names, and the student's quoted words. It must not appear in the trend panel.
- No entrance, draw-on, or transition animation on any trend chart, under any motion preference.
- localStorage remains the store of record. No server-side history, no Supabase.
- Tests are run with `npm test` (`node --test *.test.js`, root-level files only).
- Commit after every task.

## File Structure

| File | Responsibility |
|---|---|
| `curtainCall.js` (new) | Pure functions: verbatim validation and the minimum-substance gate. No I/O, no Express. |
| `curtainCall.test.js` (new) | Tests for the above. |
| `public/sessionProgress.js` (new) | Pure functions: signal extraction, trend series and sentences, milestone predicates. Browser IIFE attaching one global. No DOM access. |
| `sessionProgress.test.js` (new) | Tests for the above, loaded via `node:vm` like `micTranscriptAccumulator.test.js`. |
| `server.js` (modify) | Prompt fields; calls into `curtainCall.js`; returns the two new response fields. |
| `public/index.html` (modify) | Persistence, rendering, CSS. No business logic — it calls the two modules. |

`practiceClassifier.js` is **not** modified. It already produces every signal consumed here.

---

### Task 1: Curtain call validation module

Pure logic, no dependencies on anything else in this plan. Start here.

**Files:**
- Create: `curtainCall.js`
- Test: `curtainCall.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `normalizeForMatch(text: string) => string`
  - `hasEnoughSubstance(studentTexts: string[]) => boolean`
  - `isVerbatim(bestLine: string|null, studentTexts: string[]) => boolean`
  - `resolveCurtainCall({ bestLine, whyItLanded, studentTexts }) => { bestLine: string|null, whyItLanded: string|null, rejected: boolean }`
  - `rejected` is `true` only when the model returned a non-empty `bestLine` that failed verbatim validation. It is `false` when the substance gate fired or the model returned nothing. Task 2 uses it to decide whether to log.

- [ ] **Step 1: Write the failing test**

Create `curtainCall.test.js`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { hasEnoughSubstance, isVerbatim, normalizeForMatch, resolveCurtainCall } from "./curtainCall.js";

const LONG_TURNS = [
  "I don't have three years in this stack, but I shipped the migration at my last job in six weeks.",
  "So I'd get up to speed fast.",
];

test("normalizeForMatch lowercases, collapses whitespace, and strips edge quotes and punctuation", () => {
  assert.equal(normalizeForMatch('  "I Shipped   The Migration."  '), "i shipped the migration");
});

test("normalizeForMatch returns an empty string for null and undefined", () => {
  assert.equal(normalizeForMatch(null), "");
  assert.equal(normalizeForMatch(undefined), "");
});

test("isVerbatim accepts an exact quote from the student's turns", () => {
  assert.equal(isVerbatim("So I'd get up to speed fast.", LONG_TURNS), true);
});

test("isVerbatim accepts case, whitespace, wrapping-quote, and trailing-punctuation differences", () => {
  assert.equal(isVerbatim('"so   i\'d get up to SPEED fast"', LONG_TURNS), true);
});

test("isVerbatim rejects a paraphrase the student never said", () => {
  assert.equal(isVerbatim("I would get up to speed very quickly.", LONG_TURNS), false);
});

test("isVerbatim rejects null, empty, and punctuation-only lines", () => {
  assert.equal(isVerbatim(null, LONG_TURNS), false);
  assert.equal(isVerbatim("", LONG_TURNS), false);
  assert.equal(isVerbatim("...", LONG_TURNS), false);
});

test("isVerbatim rejects everything when the transcript is empty", () => {
  assert.equal(isVerbatim("anything at all", []), false);
});

test("hasEnoughSubstance rejects fewer than two turns", () => {
  assert.equal(hasEnoughSubstance(["one turn but it is definitely more than fifteen words long right here now"]), false);
});

test("hasEnoughSubstance rejects fewer than fifteen words", () => {
  assert.equal(hasEnoughSubstance(["yeah", "I guess so"]), false);
});

test("hasEnoughSubstance passes at exactly two turns and exactly fifteen words", () => {
  const turns = ["one two three four five six seven", "eight nine ten eleven twelve thirteen fourteen fifteen"];
  assert.equal(turns.join(" ").split(/\s+/).length, 15);
  assert.equal(hasEnoughSubstance(turns), true);
});

test("hasEnoughSubstance ignores blank and whitespace-only turns when counting turns", () => {
  assert.equal(hasEnoughSubstance(["   ", "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen"]), false);
});

test("hasEnoughSubstance handles null input", () => {
  assert.equal(hasEnoughSubstance(null), false);
});

test("resolveCurtainCall returns the trimmed pair when the quote is verbatim", () => {
  const out = resolveCurtainCall({
    bestLine: "  So I'd get up to speed fast.  ",
    whyItLanded: "  You answered the gap head-on.  ",
    studentTexts: LONG_TURNS,
  });
  assert.deepEqual(out, {
    bestLine: "So I'd get up to speed fast.",
    whyItLanded: "You answered the gap head-on.",
    rejected: false,
  });
});

test("resolveCurtainCall nulls a paraphrase and flags it as rejected", () => {
  const out = resolveCurtainCall({
    bestLine: "I would get up to speed very quickly.",
    whyItLanded: "Nice recovery.",
    studentTexts: LONG_TURNS,
  });
  assert.deepEqual(out, { bestLine: null, whyItLanded: null, rejected: true });
});

test("resolveCurtainCall nulls without flagging when the session is too short", () => {
  const out = resolveCurtainCall({
    bestLine: "yeah",
    whyItLanded: "Good.",
    studentTexts: ["yeah", "I guess"],
  });
  assert.deepEqual(out, { bestLine: null, whyItLanded: null, rejected: false });
});

test("resolveCurtainCall nulls without flagging when the model returned nothing", () => {
  const out = resolveCurtainCall({ bestLine: null, whyItLanded: null, studentTexts: LONG_TURNS });
  assert.deepEqual(out, { bestLine: null, whyItLanded: null, rejected: false });
});

test("resolveCurtainCall keeps a valid quote when whyItLanded is missing", () => {
  const out = resolveCurtainCall({ bestLine: "So I'd get up to speed fast.", whyItLanded: "", studentTexts: LONG_TURNS });
  assert.equal(out.bestLine, "So I'd get up to speed fast.");
  assert.equal(out.whyItLanded, null);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module` / `curtainCall.js` does not exist.

- [ ] **Step 3: Write the implementation**

Create `curtainCall.js`:

```js
const MIN_TURNS = 2;
const MIN_WORDS = 15;

export function normalizeForMatch(text) {
  return String(text ?? "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/^[\s"'`]+/, "")
    .replace(/[\s"'`.,!?;:]+$/, "")
    .trim();
}

function cleanTurns(studentTexts) {
  return (Array.isArray(studentTexts) ? studentTexts : [])
    .map((t) => String(t ?? "").trim())
    .filter(Boolean);
}

export function hasEnoughSubstance(studentTexts) {
  const turns = cleanTurns(studentTexts);
  if (turns.length < MIN_TURNS) return false;
  const words = turns.join(" ").split(/\s+/).filter(Boolean).length;
  return words >= MIN_WORDS;
}

export function isVerbatim(bestLine, studentTexts) {
  const needle = normalizeForMatch(bestLine);
  if (!needle) return false;
  const haystack = normalizeForMatch(cleanTurns(studentTexts).join(" "));
  if (!haystack) return false;
  return haystack.includes(needle);
}

export function resolveCurtainCall({ bestLine, whyItLanded, studentTexts }) {
  const none = { bestLine: null, whyItLanded: null, rejected: false };
  const offered = String(bestLine ?? "").trim();
  if (!offered) return none;
  if (!hasEnoughSubstance(studentTexts)) return none;
  if (!isVerbatim(offered, studentTexts)) return { bestLine: null, whyItLanded: null, rejected: true };
  const why = String(whyItLanded ?? "").trim();
  return { bestLine: offered, whyItLanded: why || null, rejected: false };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all `curtainCall.test.js` tests green, all pre-existing tests still green.

- [ ] **Step 5: Commit**

```bash
git add curtainCall.js curtainCall.test.js
git commit -m "Add curtain call verbatim validation and substance gate"
```

---

### Task 2: Wire the curtain call into the end-of-session endpoint

**Files:**
- Modify: `server.js:9` (import line region), `server.js:405-421` (system prompt), `server.js:436-446` (response assembly)

**Interfaces:**
- Consumes: `resolveCurtainCall` from Task 1.
- Produces: `POST /api/practice/end` response gains two fields — `bestLine: string|null` and `whyItLanded: string|null`. The existing `rubric` and `raw` fields are unchanged. Task 6 consumes all four.

- [ ] **Step 1: Add the import**

At the top of `server.js`, alongside the existing local imports (near `server.js:9`), add:

```js
import { resolveCurtainCall } from "./curtainCall.js";
```

- [ ] **Step 2: Extend the system prompt**

In the `system` string starting at `server.js:405`, replace this line:

```js
      "Respond with JSON only: " +
      '{"articulation":"...","engagement":"...","contentCorrespondence":"..."} ' +
      "Plain text only, no markdown.";
```

with:

```js
      "Also pick the single strongest sentence the student actually said and copy it into bestLine " +
      "EXACTLY as it appears in the transcript — character for character. Do not paraphrase it, tidy it, " +
      "fix its grammar, merge two sentences, or compose a new one. If you cannot copy a sentence exactly, " +
      "set bestLine to null. In whyItLanded, write one sentence on what made that line work. " +
      "If the student said too little for any sentence to stand out, set both bestLine and whyItLanded to null.\n\n" +
      "Respond with JSON only: " +
      '{"articulation":"...","engagement":"...","contentCorrespondence":"...","bestLine":"...","whyItLanded":"..."} ' +
      "Plain text only, no markdown.";
```

Leave `"Never output a numeric score or grade. "` at `server.js:409` exactly as it is.

- [ ] **Step 3: Resolve and return the curtain call**

In the handler after `parsed` is assigned and before `res.json`, replace the response block at `server.js:436-446`:

```js
    practice.endedAt = new Date().toISOString();
    putStudent(s);

    const curtain = resolveCurtainCall({
      bestLine: parsed.bestLine,
      whyItLanded: parsed.whyItLanded,
      studentTexts,
    });
    if (curtain.rejected) {
      console.warn("[ai] curtain call dropped: bestLine was not verbatim from the transcript");
    }

    res.json({
      rubric: {
        articulation: cleanStudentText(parsed.articulation || ""),
        engagement: cleanStudentText(parsed.engagement || ""),
        contentCorrespondence: cleanStudentText(parsed.contentCorrespondence || ""),
      },
      bestLine: curtain.bestLine,
      whyItLanded: curtain.whyItLanded,
      raw: { delivery, engagement },
    });
```

Note: `bestLine` deliberately does **not** pass through `cleanStudentText` — it must reach the client byte-identical to what the student said, and it has already been validated against the transcript. `whyItLanded` is coach prose and also skips it, matching the fact that it is generated fresh rather than echoed.

`studentTexts` is already in scope; it is the same array passed to `summarizeDelivery` at `server.js:395`.

- [ ] **Step 4: Verify the server still starts and the suite still passes**

Run: `npm test`
Expected: PASS — no test covers the endpoint directly, so this confirms nothing regressed.

Run: `node --check server.js`
Expected: no output (syntax valid).

- [ ] **Step 5: Commit**

```bash
git add server.js
git commit -m "Return a validated curtain call from the end-of-session endpoint"
```

---

### Task 3: Progress module — signals and trend rows

**Files:**
- Create: `public/sessionProgress.js`
- Test: `sessionProgress.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: a single browser global `GreenRoomProgress` exposing, after this task:
  - `extractSignals(raw) => { turnCount, hedgeRate, rambleRate, avgWpm, pacedTurnCount, questionRate }` — every value a finite number or `null`
  - `seriesFor(history, key) => number[]` — oldest→newest, finite values only
  - `trendRows(history) => Row[]` where `Row = { key, label, ready, values, sentence, band? }` and `band = { from, to }` on the pace row only
  - `MIN_TREND_SESSIONS = 3`

  Task 4 adds more exports to the same global. Task 7 consumes `trendRows`; Task 6 consumes `extractSignals`.

**Note on the module format:** this file uses the browser-IIFE-attaching-a-global pattern of `public/micTranscriptAccumulator.js`, loaded by a plain `<script src>` tag (`public/index.html:521`), **not** ESM. The page is not a module and the tests load the file through `node:vm`, so `export` statements would break both.

- [ ] **Step 1: Write the failing test**

Create `sessionProgress.test.js`:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

async function loadProgress() {
  const source = await readFile(new URL("./public/sessionProgress.js", import.meta.url), "utf8");
  const context = {};
  vm.createContext(context);
  vm.runInContext(source, context);
  return context.GreenRoomProgress;
}

// History is stored newest-first (pushSessionHistory uses unshift).
function entry(signals, extra = {}) {
  return { templateId: "interview", templateName: "Job Interview", date: "2026-08-01T00:00:00.000Z", signals, ...extra };
}

test("extractSignals pulls delivery and engagement into one flat object", async () => {
  const { extractSignals } = await loadProgress();
  const out = extractSignals({
    delivery: { turnCount: 7, hedgeRate: 0.03, rambleRate: 0.1, avgWpm: 138, pacedTurnCount: 5 },
    engagement: { turnCount: 7, questionRate: 0.2 },
  });
  assert.deepEqual(out, {
    turnCount: 7, hedgeRate: 0.03, rambleRate: 0.1, avgWpm: 138, pacedTurnCount: 5, questionRate: 0.2,
  });
});

test("extractSignals maps missing, null, and non-finite values to null", async () => {
  const { extractSignals } = await loadProgress();
  const out = extractSignals({ delivery: { turnCount: 4, avgWpm: null }, engagement: {} });
  assert.equal(out.turnCount, 4);
  assert.equal(out.avgWpm, null);
  assert.equal(out.hedgeRate, null);
  assert.equal(out.questionRate, null);
});

test("extractSignals handles a missing raw object entirely", async () => {
  const { extractSignals } = await loadProgress();
  const out = extractSignals(undefined);
  assert.equal(out.turnCount, null);
  assert.equal(out.avgWpm, null);
});

test("seriesFor returns values oldest-first from newest-first history", async () => {
  const { seriesFor } = await loadProgress();
  const history = [entry({ turnCount: 9 }), entry({ turnCount: 6 }), entry({ turnCount: 3 })];
  assert.deepEqual(seriesFor(history, "turnCount"), [3, 6, 9]);
});

test("seriesFor skips entries with no signals and entries with a null metric", async () => {
  const { seriesFor } = await loadProgress();
  const history = [entry({ avgWpm: 140 }), { templateId: "old", date: "x" }, entry({ avgWpm: null }), entry({ avgWpm: 130 })];
  assert.deepEqual(seriesFor(history, "avgWpm"), [130, 140]);
});

test("trendRows marks rows not ready below three qualifying sessions", async () => {
  const { trendRows } = await loadProgress();
  const rows = trendRows([entry({ avgWpm: 140, hedgeRate: 0.02, turnCount: 8 }), entry({ avgWpm: 130, hedgeRate: 0.03, turnCount: 6 })]);
  assert.deepEqual(rows.map((r) => r.key), ["pace", "hedging", "turns"]);
  assert.equal(rows.every((r) => r.ready === false), true);
  assert.equal(rows.every((r) => r.values.length === 0), true);
  assert.match(rows[0].sentence, /Speak in a few more sessions/);
  assert.match(rows[1].sentence, /hedging pattern will show up here/);
  assert.match(rows[2].sentence, /turn-taking will show up here/);
});

test("the pace row reports its range, its count, and a conversational band", async () => {
  const { trendRows } = await loadProgress();
  const rows = trendRows([entry({ avgWpm: 147 }), entry({ avgWpm: 133 }), entry({ avgWpm: 128 })]);
  const pace = rows.find((r) => r.key === "pace");
  assert.equal(pace.ready, true);
  assert.deepEqual(pace.values, [128, 133, 147]);
  assert.deepEqual(pace.band, { from: 120, to: 160 });
  assert.equal(pace.sentence, "Between 128 and 147 wpm across your last 3 spoken sessions.");
});

test("the pace row counts only spoken sessions", async () => {
  const { trendRows } = await loadProgress();
  const rows = trendRows([
    entry({ avgWpm: 150 }), entry({ avgWpm: null }), entry({ avgWpm: 140 }), entry({ avgWpm: 130 }),
  ]);
  assert.match(rows.find((r) => r.key === "pace").sentence, /across your last 3 spoken sessions\.$/);
});

test("the hedging row reports a mean percentage to one decimal", async () => {
  const { trendRows } = await loadProgress();
  const rows = trendRows([entry({ hedgeRate: 0.04 }), entry({ hedgeRate: 0.02 }), entry({ hedgeRate: 0.03 })]);
  const hedging = rows.find((r) => r.key === "hedging");
  assert.equal(hedging.ready, true);
  assert.equal(hedging.sentence, "Hedge words — kind of, maybe, I think — were about 3.0% of what you said.");
  assert.equal(hedging.band, undefined);
});

test("the turn-taking row reports the latest session against the average", async () => {
  const { trendRows } = await loadProgress();
  const rows = trendRows([entry({ turnCount: 9 }), entry({ turnCount: 5 }), entry({ turnCount: 4 })]);
  const turns = rows.find((r) => r.key === "turns");
  assert.equal(turns.sentence, "You spoke 9 times last session; your average is 6.");
});

test("no trend sentence ranks the student", async () => {
  const { trendRows } = await loadProgress();
  const rows = trendRows([
    entry({ avgWpm: 147, hedgeRate: 0.04, turnCount: 9 }),
    entry({ avgWpm: 133, hedgeRate: 0.02, turnCount: 5 }),
    entry({ avgWpm: 128, hedgeRate: 0.03, turnCount: 4 }),
  ]);
  const banned = /\b(improv|better|worse|good|bad|poor|excellent|above average|below average|score|grade|rank)/i;
  for (const row of rows) assert.equal(banned.test(row.sentence), false, `ranking language in: ${row.sentence}`);
});

test("trendRows handles empty history without throwing", async () => {
  const { trendRows } = await loadProgress();
  const rows = trendRows([]);
  assert.equal(rows.length, 3);
  assert.equal(rows.every((r) => r.ready === false), true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `ENOENT` reading `public/sessionProgress.js`.

- [ ] **Step 3: Write the implementation**

Create `public/sessionProgress.js`:

```js
(function (root) {
  var MIN_TREND_SESSIONS = 3;
  var PACE_BAND = { from: 120, to: 160 };

  function numOrNull(value) {
    return typeof value === "number" && isFinite(value) ? value : null;
  }

  function extractSignals(raw) {
    var d = (raw && raw.delivery) || {};
    var e = (raw && raw.engagement) || {};
    return {
      turnCount: numOrNull(d.turnCount),
      hedgeRate: numOrNull(d.hedgeRate),
      rambleRate: numOrNull(d.rambleRate),
      avgWpm: numOrNull(d.avgWpm),
      pacedTurnCount: numOrNull(d.pacedTurnCount),
      questionRate: numOrNull(e.questionRate),
    };
  }

  // Stored history is newest-first; every series is returned oldest-first.
  function seriesFor(history, key) {
    return (history || [])
      .slice()
      .reverse()
      .map(function (h) { return h && h.signals ? numOrNull(h.signals[key]) : null; })
      .filter(function (v) { return v !== null; });
  }

  function mean(values) {
    return values.reduce(function (a, b) { return a + b; }, 0) / values.length;
  }

  function row(key, label, values, sentence, band) {
    var out = { key: key, label: label, ready: true, values: values, sentence: sentence };
    if (band) out.band = band;
    return out;
  }

  function pending(key, label, sentence) {
    return { key: key, label: label, ready: false, values: [], sentence: sentence };
  }

  function paceRow(history) {
    var values = seriesFor(history, "avgWpm");
    if (values.length < MIN_TREND_SESSIONS) {
      return pending("pace", "Pace", "Speak in a few more sessions and your pace will show up here.");
    }
    var lo = Math.round(Math.min.apply(null, values));
    var hi = Math.round(Math.max.apply(null, values));
    return row("pace", "Pace", values,
      "Between " + lo + " and " + hi + " wpm across your last " + values.length + " spoken sessions.",
      PACE_BAND);
  }

  function hedgingRow(history) {
    var values = seriesFor(history, "hedgeRate");
    if (values.length < MIN_TREND_SESSIONS) {
      return pending("hedging", "Hedging", "A few more sessions and your hedging pattern will show up here.");
    }
    return row("hedging", "Hedging", values,
      "Hedge words — kind of, maybe, I think — were about " + (mean(values) * 100).toFixed(1) + "% of what you said.");
  }

  function turnRow(history) {
    var values = seriesFor(history, "turnCount");
    if (values.length < MIN_TREND_SESSIONS) {
      return pending("turns", "Turn-taking", "A few more sessions and your turn-taking will show up here.");
    }
    return row("turns", "Turn-taking", values,
      "You spoke " + values[values.length - 1] + " times last session; your average is " + Math.round(mean(values)) + ".");
  }

  function trendRows(history) {
    return [paceRow(history), hedgingRow(history), turnRow(history)];
  }

  root.GreenRoomProgress = {
    MIN_TREND_SESSIONS: MIN_TREND_SESSIONS,
    extractSignals: extractSignals,
    seriesFor: seriesFor,
    trendRows: trendRows,
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all `sessionProgress.test.js` tests green.

- [ ] **Step 5: Commit**

```bash
git add public/sessionProgress.js sessionProgress.test.js
git commit -m "Add session progress module with signal extraction and trend rows"
```

---

### Task 4: Progress module — milestone predicates

**Files:**
- Modify: `public/sessionProgress.js` (add to the same IIFE)
- Modify: `sessionProgress.test.js` (append tests)

**Interfaces:**
- Consumes: `seriesFor` from Task 3 (same file, already in scope).
- Produces, added to the `GreenRoomProgress` global:
  - `distinctTemplates(history) => Set<string>`
  - `milestoneProgress(history) => { milestones: Milestone[], earned: number, total: number, next: Milestone|null }` where `Milestone = { id, label, desc, earned: boolean }`

  Task 8 consumes both.

- [ ] **Step 1: Write the failing test**

Append to `sessionProgress.test.js`:

```js
function spoken(wpm) {
  return entry({ avgWpm: wpm, turnCount: 4, hedgeRate: 0.05 });
}

test("distinctTemplates counts unique templates and ignores entries with neither field", async () => {
  const { distinctTemplates } = await loadProgress();
  const history = [
    { templateId: "interview" }, { templateId: "interview" }, { templateId: "pitch" },
    { templateName: "Casual chat" }, { date: "x" },
  ];
  assert.equal(distinctTemplates(history).size, 3);
});

test("First rep is earned by a single session", async () => {
  const { milestoneProgress } = await loadProgress();
  const byId = (h, id) => milestoneProgress(h).milestones.find((m) => m.id === id);
  assert.equal(byId([], "first_rep").earned, false);
  assert.equal(byId([entry({})], "first_rep").earned, true);
});

test("Range builder needs three different templates", async () => {
  const { milestoneProgress } = await loadProgress();
  const byId = (h) => milestoneProgress(h).milestones.find((m) => m.id === "range").earned;
  assert.equal(byId([{ templateId: "a" }, { templateId: "b" }]), false);
  assert.equal(byId([{ templateId: "a" }, { templateId: "b" }, { templateId: "c" }]), true);
});

test("Found your pace needs three adjacent in-band spoken sessions", async () => {
  const { milestoneProgress } = await loadProgress();
  const earned = (h) => milestoneProgress(h).milestones.find((m) => m.id === "pace").earned;
  assert.equal(earned([spoken(130), spoken(140), spoken(135)]), true);
  assert.equal(earned([spoken(130), spoken(190), spoken(135)]), false);
  assert.equal(earned([spoken(120), spoken(160), spoken(140)]), true, "band edges are inclusive");
});

test("Found your pace is not broken by typed sessions between spoken ones", async () => {
  const { milestoneProgress } = await loadProgress();
  const history = [spoken(135), entry({ avgWpm: null, turnCount: 3 }), spoken(140), spoken(130)];
  assert.equal(milestoneProgress(history).milestones.find((m) => m.id === "pace").earned, true);
});

test("Said it plain needs one session under a two percent hedge rate", async () => {
  const { milestoneProgress } = await loadProgress();
  const earned = (h) => milestoneProgress(h).milestones.find((m) => m.id === "plain").earned;
  assert.equal(earned([entry({ hedgeRate: 0.02 })]), false, "the threshold is exclusive");
  assert.equal(earned([entry({ hedgeRate: 0.019 })]), true);
  assert.equal(earned([entry({ hedgeRate: null })]), false);
});

test("Held the floor needs one session of ten or more turns", async () => {
  const { milestoneProgress } = await loadProgress();
  const earned = (h) => milestoneProgress(h).milestones.find((m) => m.id === "floor").earned;
  assert.equal(earned([entry({ turnCount: 9 })]), false);
  assert.equal(earned([entry({ turnCount: 10 })]), true);
});

test("Went off-script requires an explicit viaFreeText flag", async () => {
  const { milestoneProgress } = await loadProgress();
  const earned = (h) => milestoneProgress(h).milestones.find((m) => m.id === "offscript").earned;
  assert.equal(earned([entry({})]), false, "entries predating the flag must not earn it");
  assert.equal(earned([entry({}, { viaFreeText: true })]), true);
});

test("milestoneProgress reports counts and the first unearned milestone", async () => {
  const { milestoneProgress } = await loadProgress();
  const p = milestoneProgress([entry({ turnCount: 12 })]);
  assert.equal(p.total, 6);
  assert.equal(p.earned, 2);
  assert.equal(p.next.id, "range");
});

test("milestoneProgress reports next as null when everything is earned", async () => {
  const { milestoneProgress } = await loadProgress();
  const history = [
    entry({ avgWpm: 130, turnCount: 12, hedgeRate: 0.01 }, { templateId: "a", viaFreeText: true }),
    entry({ avgWpm: 140, turnCount: 4, hedgeRate: 0.05 }, { templateId: "b" }),
    entry({ avgWpm: 135, turnCount: 4, hedgeRate: 0.05 }, { templateId: "c" }),
  ];
  const p = milestoneProgress(history);
  assert.equal(p.earned, 6);
  assert.equal(p.next, null);
});

test("milestoneProgress handles empty history without throwing", async () => {
  const { milestoneProgress } = await loadProgress();
  const p = milestoneProgress([]);
  assert.equal(p.earned, 0);
  assert.equal(p.next.id, "first_rep");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `distinctTemplates is not a function` / `milestoneProgress is not a function`.

- [ ] **Step 3: Write the implementation**

In `public/sessionProgress.js`, insert before the `root.GreenRoomProgress = {` assignment:

```js
  function distinctTemplates(history) {
    var ids = (history || [])
      .map(function (h) { return (h && (h.templateId || h.templateName)) || ""; })
      .filter(Boolean);
    return new Set(ids);
  }

  function hasPaceRun(history) {
    var values = seriesFor(history, "avgWpm");
    var run = 0;
    for (var i = 0; i < values.length; i++) {
      run = values[i] >= PACE_BAND.from && values[i] <= PACE_BAND.to ? run + 1 : 0;
      if (run >= 3) return true;
    }
    return false;
  }

  function anySignal(history, key, test) {
    return (history || []).some(function (h) {
      var v = h && h.signals ? numOrNull(h.signals[key]) : null;
      return v !== null && test(v);
    });
  }

  var MILESTONES = [
    { id: "first_rep", label: "First rep", desc: "Finish any practice session.",
      earned: function (h) { return (h || []).length >= 1; } },
    { id: "range", label: "Range builder", desc: "Practice three different rooms.",
      earned: function (h) { return distinctTemplates(h).size >= 3; } },
    { id: "pace", label: "Found your pace", desc: "Three sessions running inside a conversational pace.",
      earned: hasPaceRun },
    { id: "plain", label: "Said it plain", desc: "Finish a session with almost no hedging.",
      earned: function (h) { return anySignal(h, "hedgeRate", function (v) { return v < 0.02; }); } },
    { id: "floor", label: "Held the floor", desc: "Take ten or more turns in one session.",
      earned: function (h) { return anySignal(h, "turnCount", function (v) { return v >= 10; }); } },
    { id: "offscript", label: "Went off-script", desc: "Describe your own scenario instead of picking one.",
      earned: function (h) { return (h || []).some(function (e) { return e && e.viaFreeText === true; }); } },
  ];

  function milestoneProgress(history) {
    var milestones = MILESTONES.map(function (m) {
      return { id: m.id, label: m.label, desc: m.desc, earned: m.earned(history) };
    });
    var earned = milestones.filter(function (m) { return m.earned; }).length;
    var next = milestones.find(function (m) { return !m.earned; }) || null;
    return { milestones: milestones, earned: earned, total: milestones.length, next: next };
  }
```

Then extend the export object:

```js
  root.GreenRoomProgress = {
    MIN_TREND_SESSIONS: MIN_TREND_SESSIONS,
    extractSignals: extractSignals,
    seriesFor: seriesFor,
    trendRows: trendRows,
    distinctTemplates: distinctTemplates,
    milestoneProgress: milestoneProgress,
  };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/sessionProgress.js sessionProgress.test.js
git commit -m "Add evidence-based milestone predicates to the progress module"
```

---

### Task 5: Remove the "Recently" strip from the practice picker

Independent of every other task. Small and self-contained.

**Files:**
- Modify: `public/index.html:296-308` (CSS), `public/index.html:910-923` (function), `public/index.html:998` (call site)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing. `sessionHistoryHtml` ceases to exist; no other task may reference it.

- [ ] **Step 1: Delete the strip CSS**

Delete `public/index.html:296-308` — exactly these rules and nothing else:

```
.rm-history { ... }
.rm-history-label { ... }
.rm-history-row { ... }
.rm-history-row::before { ... }
.rm-history-row b { ... }
.rm-history-row .date { ... }
.rm-history-row .takeaway { ... }
```

**Do not touch `public/index.html:341-354.`** `.rm-history-list` and the `.rm-history-card*` rules are the History tab and must survive. The class prefixes are nearly identical and over-deletion is the likeliest error in this task. Note in particular that `.rm-history-card::before` shares its rule with `.rm-empty-state::before` at `public/index.html:343`; that rule stays.

- [ ] **Step 2: Delete the function**

Delete the whole `sessionHistoryHtml()` function at `public/index.html:910-923`.

- [ ] **Step 3: Delete the call site**

In `practicePickerHtml()`, the closing template literal currently ends:

```js
      <div id="err"></div>
    </div>
    ${sessionHistoryHtml()}`;
```

Change it to:

```js
      <div id="err"></div>
    </div>`;
```

- [ ] **Step 4: Verify**

Run: `grep -n "sessionHistoryHtml\|rm-history-row\|rm-history-label" public/index.html`
Expected: **no output.** Any hit means a reference or rule survived.

Run: `grep -c "rm-history-card" public/index.html`
Expected: a non-zero count — the History tab styles are intact.

Run: `npm start`, sign in, and confirm the picker ends on the freeform box with no strip below it, and that the History tab still renders styled cards.

- [ ] **Step 5: Commit**

```bash
git add public/index.html
git commit -m "Remove the redundant Recently strip from the practice picker"
```

---

### Task 6: Persist signals, viaFreeText, and bestLine

**Files:**
- Modify: `public/index.html:521` (script tag), `public/index.html:1679-1697` (`endPracticeSession`)

**Interfaces:**
- Consumes: `GreenRoomProgress.extractSignals` (Task 3); the `bestLine` / `whyItLanded` response fields (Task 2).
- Produces: history entries gaining `signals`, `viaFreeText`, and `bestLine`. Tasks 7, 8, and 9 all read these.

- [ ] **Step 1: Load the progress module**

At `public/index.html:521`, beside the existing accumulator tag, add:

```html
<script src="/micTranscriptAccumulator.js"></script>
<script src="/sessionProgress.js"></script>
```

Order matters only in that both must precede the main inline `<script>` at `public/index.html:522`.

- [ ] **Step 2: Persist the new fields**

In `endPracticeSession()` (`public/index.html:1679`), replace the `pushSessionHistory` call:

```js
    pushSessionHistory({
      templateId: S.practiceTemplate?.templateId || "",
      templateName: S.practiceTemplate?.templateName || "Practice session",
      date: new Date().toISOString(),
      takeaway: firstSentence(j.rubric?.contentCorrespondence || j.rubric?.articulation || "", 90),
      rubric: j.rubric,
      signals: GreenRoomProgress.extractSignals(j.raw),
      viaFreeText: S.viaFreeText === true,
      bestLine: j.bestLine || null,
    });
```

Also store the curtain call on state for the review screen, alongside `S.rubric = j.rubric;`:

```js
    S.rubric = j.rubric;
    S.bestLine = j.bestLine || null;
    S.whyItLanded = j.whyItLanded || null;
```

`takeaway` continues to be computed and stored unconditionally, so no history card can render empty when `bestLine` is null.

- [ ] **Step 3: Clear the new state on session reset**

`S.bestLine` and `S.whyItLanded` must not leak from one session into the next. Add both to the reset list in `logout()` beside `S.rubric = null;` (`public/index.html:650`):

```js
  S.rubric = null;
  S.bestLine = null;
  S.whyItLanded = null;
```

And in the `#again` handler at `public/index.html:1717`, beside the existing resets:

```js
    S.bestLine = null;
    S.whyItLanded = null;
```

- [ ] **Step 4: Verify**

Run: `npm test`
Expected: PASS (nothing here is unit-tested; this confirms no regression).

Run: `npm start`, complete a short spoken practice session, then in DevTools:

```js
JSON.parse(localStorage.getItem("greenRoomSessionHistory"))[0]
```

Expected: the entry has a `signals` object with numeric `turnCount` and `hedgeRate`, a boolean `viaFreeText`, and a `bestLine` that is either a string or `null`.

- [ ] **Step 5: Commit**

```bash
git add public/index.html
git commit -m "Persist measured signals, free-text flag, and best line to history"
```

---

### Task 7: Trend panel in the History tab

**Files:**
- Modify: `public/index.html` (CSS near line 341, `fullHistoryHtml` at `public/index.html:1024`)

**Interfaces:**
- Consumes: `GreenRoomProgress.trendRows` (Task 3); persisted `signals` (Task 6).
- Produces: `sparklineSvg(row) => string` and `trendPanelHtml(history) => string`, both local to the inline script.

- [ ] **Step 1: Add the CSS**

Add `.rm-trends::before` to the existing shared panel rule at `public/index.html:343` so the sketch treatment stays in one place:

```css
    .rm-history-card::before, .rm-empty-state::before, .rm-trends::before {
      content: ""; position: absolute; inset: 0; z-index: -1; border-radius: 16px;
      background: var(--rm-panel); border: 2px solid var(--ink); filter: url(#sketchWobble);
    }
```

Then add the new rules immediately after `public/index.html:341` (`.rm-history-list`):

```css
    .rm-trends { position: relative; z-index: 0; display: grid; gap: 16px; max-width: 860px; padding: 20px; margin-bottom: 14px; }
    .rm-trend-row { display: grid; grid-template-columns: 150px 1fr; gap: 18px; align-items: center; }
    .rm-trend-meta { display: grid; gap: 6px; }
    .rm-trend-label { font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--rm-muted); }
    .rm-trend-sentence { margin: 0; font-size: 13.5px; line-height: 1.45; color: var(--rm-ink); }
    .rm-trend-row.pending .rm-trend-sentence { color: var(--rm-muted); }
    .rm-spark { display: block; }
```

And add to the existing mobile block near `public/index.html:481`:

```css
      .rm-trend-row { grid-template-columns: 1fr; gap: 8px; }
```

No `font-family` is declared anywhere above, so the panel inherits IBM Plex. Fraunces must not be introduced here.

- [ ] **Step 2: Add the sparkline renderer**

Add above `fullHistoryHtml` (`public/index.html:1024`):

```js
function sparklineSvg(row) {
  const w = 140, h = 36, pad = 4;
  const vs = row.values;
  const lo = Math.min(...vs), hi = Math.max(...vs);
  const span = (hi - lo) || 1;
  const top = hi + span * 0.1, bottom = lo - span * 0.1;
  const x = (i) => pad + (i * (w - pad * 2)) / Math.max(1, vs.length - 1);
  const y = (v) => h - pad - ((v - bottom) / (top - bottom)) * (h - pad * 2);
  const pts = vs.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  let band = "";
  if (row.band) {
    const yTop = y(Math.min(top, row.band.to));
    const yBot = y(Math.max(bottom, row.band.from));
    if (yBot > yTop) {
      band = `<rect x="0" y="${yTop.toFixed(1)}" width="${w}" height="${(yBot - yTop).toFixed(1)}" fill="var(--rm-sage)" opacity="0.15" />`;
    }
  }
  return `<svg class="rm-spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(row.sentence)}">
    ${band}
    <polyline points="${pts}" fill="none" stroke="var(--rm-teal)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" filter="url(#sketchWobble)" />
    <circle cx="${x(vs.length - 1).toFixed(1)}" cy="${y(vs[vs.length - 1]).toFixed(1)}" r="3" fill="var(--rm-tan)" />
  </svg>`;
}

function trendPanelHtml(history) {
  const rows = GreenRoomProgress.trendRows(history);
  return `<div class="rm-trends">
    ${rows.map((r) => `<div class="rm-trend-row ${r.ready ? "" : "pending"}">
      <div class="rm-trend-meta">
        <div class="rm-trend-label">${esc(r.label)}</div>
        ${r.ready ? sparklineSvg(r) : ""}
      </div>
      <p class="rm-trend-sentence">${esc(r.sentence)}</p>
    </div>`).join("")}
  </div>`;
}
```

The `sketchWobble` filter is defined in a document-level `<defs>` (`public/index.html:488`), so `url(#sketchWobble)` resolves from any SVG on the page. There is no animation in this markup and none is to be added.

- [ ] **Step 3: Render the panel**

In `fullHistoryHtml` (`public/index.html:1024`), leave the empty-state early return exactly as it is — when there are no entries at all the empty state renders alone with no trend panel — and prepend the panel to the card list:

```js
  return `${trendPanelHtml(history)}
  <div class="rm-history-list">
    ${history.map((h) => `<article class="rm-history-card">
```

- [ ] **Step 4: Verify in the browser**

Run: `npm start`, then in DevTools seed history and open the History tab:

```js
// 5 spoken sessions
localStorage.setItem("greenRoomSessionHistory", JSON.stringify(
  [147, 133, 128, 141, 136].map((wpm, i) => ({
    templateId: "interview", templateName: "Job Interview",
    date: new Date(Date.now() - i * 864e5).toISOString(),
    takeaway: "Test entry.", rubric: { articulation: "a", engagement: "b", contentCorrespondence: "c" },
    signals: { turnCount: 6 + i, hedgeRate: 0.02 + i * 0.005, rambleRate: 0.1, avgWpm: wpm, pacedTurnCount: 4, questionRate: 0.2 },
  }))
));
```

Expected: three rows, each with a wobbling line; a faint sage band on the pace row only; sentences matching the data; no labels or axes on any chart; nothing animates on tab switch.

Then set the array to only two entries and confirm all three rows show their below-threshold sentence with no chart. Then set it to `[]` and confirm the empty state renders alone.

Check both light and dark mode, and at a 375px viewport width.

- [ ] **Step 5: Commit**

```bash
git add public/index.html
git commit -m "Add hand-drawn trend panel to the History tab"
```

---

### Task 8: Rebuild Career Path on evidence

**Files:**
- Modify: `public/index.html:868-875` (`CAREER_MILESTONES`), `public/index.html:884-904` (`getCareerLevel`, `distinctTemplates`, `careerProgress`), `public/index.html:938-942` (level card), `public/index.html:1001-1022` (`careerPathHtml`)

**Interfaces:**
- Consumes: `GreenRoomProgress.milestoneProgress` and `GreenRoomProgress.distinctTemplates` (Task 4).
- Produces: `careerProgress(history) => { count, uniqueTemplates, earned, total, milestones, next }`.

- [ ] **Step 1: Delete the count-based logic**

Delete `CAREER_MILESTONES` (`public/index.html:868-875`), `getCareerLevel` (`public/index.html:884-886`), and the local `distinctTemplates` (`public/index.html:888-890`) — the module now owns that function.

- [ ] **Step 2: Rewrite careerProgress**

Replace `careerProgress` (`public/index.html:892-904`) with:

```js
function careerProgress(history = getSessionHistory()) {
  const p = GreenRoomProgress.milestoneProgress(history);
  return {
    count: getSessionCount(),
    uniqueTemplates: GreenRoomProgress.distinctTemplates(history).size,
    earned: p.earned,
    total: p.total,
    milestones: p.milestones,
    next: p.next,
  };
}
```

`getSessionCount()` (`public/index.html:575`) stays the source for the session tally. It can exceed `history.length` because history caps at 20; milestone predicates read history only, never this counter.

- [ ] **Step 3: Update the level card**

At `public/index.html:938`, replace the level card block:

```js
        <div class="rm-level-card">
          <span>Badges</span>
          <b>${progress.earned}</b>
          <em>of ${progress.total}</em>
        </div>
```

No CSS change — `.rm-level-card` styles `span`, `b`, and `em` by element.

- [ ] **Step 4: Rewrite careerPathHtml**

Replace `careerPathHtml` (`public/index.html:1001-1022`) with:

```js
function careerPathHtml(history, progress) {
  return `
    <div class="rm-path-panel">
      <div class="rm-path-stats">
        <div><b>${progress.count}</b><span>sessions</span></div>
        <div><b>${progress.uniqueTemplates}</b><span>modes tried</span></div>
        <div><b>${progress.earned}</b><span>badges</span></div>
      </div>
      <div class="rm-path">
        ${progress.milestones.map((m) => {
          const current = progress.next && m.id === progress.next.id;
          return `<div class="rm-path-node ${m.earned ? "done" : ""} ${current ? "current" : ""}">
            <span class="dot">${m.earned ? "✓" : ""}</span>
            <b>${esc(m.label)}</b>
            <em>${esc(m.desc)}</em>
          </div>`;
        }).join("")}
      </div>
      <p class="rm-next-step">${progress.next
        ? `Not yet: ${esc(progress.next.label)} — ${esc(progress.next.desc)}`
        : "Every milestone earned. Keep practicing."}</p>
    </div>`;
}
```

The ordinal `${i + 1}` is gone: these milestones can be earned in any order, and numbering them would tell the student a sequence exists when it does not. The dot is a checkmark when earned and empty otherwise. `.rm-path` remains `repeat(6, ...)` at `public/index.html:323` and there are still exactly 6 milestones, so no grid change is needed.

- [ ] **Step 5: Verify**

Run: `grep -n "getCareerLevel\|CAREER_MILESTONES" public/index.html`
Expected: **no output.**

Run: `npm start` and open the Career Path tab with the seeded history from Task 7. Expected: 6 nodes; earned nodes show ✓ with the sage dot; the first unearned node shows the tan dot and an empty circle; the stats row reads sessions / modes tried / badges; the footer line begins "Not yet:". Seed a history that earns all six and confirm the footer reads "Every milestone earned. Keep practicing."

Confirm no string on this screen ranks the student.

**Expected, not a bug:** an account with existing history will usually show
*fewer* badges than its old level number — the old level was `sessions / 3`,
and most of the new milestones need signal data that older entries do not
have. Do not "fix" this by loosening a predicate or backfilling data.

- [ ] **Step 6: Commit**

```bash
git add public/index.html
git commit -m "Rebuild Career Path milestones on evidence instead of attendance"
```

---

### Task 9: Curtain call on the review screen

**Files:**
- Modify: `public/index.html:857-865` (`CARD_TEMPLATES`), CSS near `public/index.html:447`, `renderPracticeEnd` at `public/index.html:1699`

**Interfaces:**
- Consumes: `S.bestLine` / `S.whyItLanded` (Task 6); `CARD_TEMPLATES`.
- Produces: `curtainCallHtml() => string` — returns `""` when there is no valid quote.

- [ ] **Step 1: Add the listener field**

Add a `listener` string to each entry in `CARD_TEMPLATES` (`public/index.html:857`):

| template id | `listener` |
|---|---|
| `exam_viva` | `examiner` |
| `pitch` | `investor` |
| `interview` | `hiring manager` |
| `public_speech` | `room` |
| `casual` | `person across from you` |

Example, for the `interview` entry:

```js
  { id: "interview", icon: "💼", label: "Job Interview", desc: "Answer questions, one on one.", defaultDescription: "Practicing for a job interview.", listener: "hiring manager",
```

Keep every other property on each entry unchanged.

- [ ] **Step 2: Add the CSS**

Add after `public/index.html:447` (the last `.rm-rubric` rule):

```css
    .rm-curtain { position: relative; z-index: 0; max-width: 640px; margin: 0 auto 18px; padding: 22px 24px; }
    .rm-curtain::before {
      content: ""; position: absolute; inset: 0; z-index: -1; border-radius: 16px;
      background: var(--rm-panel); border: 2.5px solid var(--ink); filter: url(#sketchWobbleBold);
    }
    .rm-curtain-eyebrow { font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--rm-muted); margin-bottom: 14px; }
    .rm-curtain-quote {
      margin: 0; font-family: Fraunces, Georgia, serif; font-weight: 600; font-size: 22px;
      line-height: 1.35; color: var(--rm-teal-dark); border-left: 3px solid var(--rm-tan); padding-left: 16px;
    }
    .rm-curtain-why { margin: 14px 0 0; font-size: 13.5px; line-height: 1.5; color: var(--rm-muted); }
    @media (max-width: 640px) { .rm-curtain-quote { font-size: 19px; } }
```

- [ ] **Step 3: Add the renderer**

Add above `renderPracticeEnd` (`public/index.html:1699`):

```js
function curtainCallHtml() {
  const line = (S.bestLine || "").trim();
  if (!line) return "";
  const tpl = CARD_TEMPLATES.find((t) => t.id === S.practiceTemplate?.templateId);
  const listener = tpl?.listener || "room";
  const why = (S.whyItLanded || "").trim();
  return `<div class="rm-curtain">
    <div class="rm-curtain-eyebrow">What the ${esc(listener)} heard</div>
    <blockquote class="rm-curtain-quote">“${esc(line)}”</blockquote>
    ${why ? `<p class="rm-curtain-why">${esc(why)}</p>` : ""}
  </div>`;
}
```

Free-text sessions and any template without a `listener` fall back to "What the room heard".

- [ ] **Step 4: Render it above the rubric**

In `renderPracticeEnd` (`public/index.html:1702`), insert the call between the subtitle and the rubric grid:

```js
      <p class="rm-sub">Here's how your practice session went — no scores, just notes to build on.</p>
      ${curtainCallHtml()}
      <div class="rm-rubric">
```

Leave the `rm-sub` copy exactly as written. When `curtainCallHtml()` returns `""` the screen renders exactly as it does today — no message, no empty state, no placeholder.

- [ ] **Step 5: Show the quote on history cards**

In `fullHistoryHtml` (`public/index.html:1038`), replace the takeaway paragraph:

```js
      <p>${esc(h.bestLine ? `“${h.bestLine}”` : (h.takeaway || "Session completed."))}</p>
```

- [ ] **Step 6: Verify**

Run: `npm start` and complete a real spoken session of at least two substantial turns.

Expected: the curtain call renders above the rubric with the eyebrow naming the right listener; the quote is a sentence you actually said, word for word.

Then force each fallback and confirm the screen degrades silently:

```js
// no quote
S.bestLine = null; render();
// quote without a reason
S.bestLine = "Something I said."; S.whyItLanded = ""; render();
```

Then complete a two-word session and confirm the substance gate suppresses the card.

Check both themes and a 375px viewport.

- [ ] **Step 7: Commit**

```bash
git add public/index.html
git commit -m "Add curtain call to the review screen and history cards"
```

---

### Task 10: Full verification pass

**Files:** none modified unless a defect is found.

**Interfaces:**
- Consumes: everything.
- Produces: a green suite and a walked-through app.

- [ ] **Step 1: Run the suite**

Run: `npm test`
Expected: PASS — `curtainCall.test.js`, `sessionProgress.test.js`, and all four pre-existing test files green. Record the actual pass/fail counts; do not claim success without reading the output.

- [ ] **Step 2: Walk the seven spec scenarios**

Run `npm start` and confirm each, in **both light and dark mode**:

1. History with 0 entries → empty state alone, no trend panel.
2. History with 2 entries → panel renders, all three below-threshold lines, no charts.
3. History with 5+ spoken entries → three charts, sentences match the data, sage band on the pace row only.
4. Mixed history where older entries have no `signals` → charts render from newer entries; older ones still appear as cards.
5. Typed-only sessions → the pace row stays below-threshold while hedging and turn-taking chart.
6. One session ending with a valid curtain call and one ending with `bestLine: null` → the second renders today's screen unchanged.
7. The practice picker shows no strip; the History tab cards still render with full styling.

- [ ] **Step 3: Check the responsive and accessibility floor**

- At 375px width: no horizontal page scroll on any tab; trend rows stack; the curtain call quote drops to 19px.
- Tab through the History and Career Path tabs: focus outlines remain visible, and no new focusable elements were introduced.
- Inspect a sparkline: it carries `role="img"` and an `aria-label` equal to its visible sentence.

- [ ] **Step 4: Audit for ranking language**

Run: `grep -n "improv\|better\|worse\|above average\|below average\|out of 5\|score" public/sessionProgress.js public/index.html`

Review every hit. Pre-existing coach prose in the rubric is fine; any **new** string this plan added that ranks the student violates the global wording rule and must be rewritten. Confirm `"Never output a numeric score or grade. "` is still present in `server.js` and `"no scores, just notes to build on"` is still present in `public/index.html`.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "Fix issues found in verification pass"
```

If nothing needed fixing, skip the commit and say so explicitly rather than committing an empty change.
