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

// Values built by code executing inside the vm context carry that
// context's Object/Array prototypes, so assert/strict's deepEqual
// (aliased to deepStrictEqual) reports a mismatch against a host-realm
// literal even when every property is identical. structuredClone
// rebuilds the value with the host realm's intrinsics before comparing.
function clone(value) {
  return structuredClone(value);
}

test("extractSignals pulls delivery and engagement into one flat object", async () => {
  const { extractSignals } = await loadProgress();
  const out = extractSignals({
    delivery: { turnCount: 7, hedgeRate: 0.03, rambleRate: 0.1, avgWpm: 138, pacedTurnCount: 5 },
    engagement: { turnCount: 7, questionRate: 0.2 },
  });
  assert.deepEqual(clone(out), {
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
  assert.deepEqual(clone(rows.map((r) => r.key)), ["pace", "hedging", "turns"]);
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
  assert.deepEqual(clone(pace.band), { from: 120, to: 160 });
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
