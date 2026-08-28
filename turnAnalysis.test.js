import assert from "node:assert/strict";
import test from "node:test";
import { normalizeTurnAnalysis } from "./turnAnalysis.js";

test("normalizes useful follow-up metadata when deterministic signals allow it", () => {
  assert.deepEqual(
    normalizeTurnAnalysis({
      followUpType: "evidence",
      reason: "The claim needs support.",
      claim: "reduces customer acquisition costs",
      answered: false,
      importance: "high",
    }, { vague: true }),
    {
      followUpType: "evidence",
      reason: "The claim needs support.",
      claim: "reduces customer acquisition costs",
      answered: false,
      importance: "high",
    }
  );
});

test("suppresses model-invented follow-up pressure for a clear turn", () => {
  assert.deepEqual(
    normalizeTurnAnalysis({ followUpType: "evidence", reason: "Ask for proof", claim: "a claim", importance: "high" }, {}),
    { followUpType: "none", reason: null, claim: null, answered: null, importance: "low" }
  );
});

test("malformed metadata falls back safely", () => {
  assert.deepEqual(
    normalizeTurnAnalysis({ followUpType: "unknown", reason: "\nunsafe\n", claim: 42, importance: "unknown" }, { stuckPhrase: true }),
    { followUpType: "none", reason: null, claim: null, answered: null, importance: "low" }
  );
});
