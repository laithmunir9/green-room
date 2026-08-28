import assert from "node:assert/strict";
import test from "node:test";
import { applyLikelyAsrCorrections } from "./transcriptAsrCorrections.js";

test("corrects the Prelight demo transcript failure", () => {
  const raw = "hi there some brother when experience I bring is that I just made this project called Premium for it house people fixed Polo speaking skills skills";

  assert.equal(
    applyLikelyAsrCorrections(raw),
    "Hi there some experience I bring is that I just made this project called Prelight, and it helps people with their public speaking skills."
  );
});

test("only maps Premium to Prelight when the transcript has project context", () => {
  assert.equal(
    applyLikelyAsrCorrections("the premium plan is useful"),
    "The premium plan is useful."
  );
  assert.equal(
    applyLikelyAsrCorrections("I built an app called Premium"),
    "I built an app called Prelight."
  );
});

test("deduplicates repeated skills without changing unrelated wording", () => {
  assert.equal(
    applyLikelyAsrCorrections("I want better public speaking skills skills"),
    "I want better public speaking skills."
  );
});

test("corrects the short bad browser transcript seen in the interview demo", () => {
  assert.equal(
    applyLikelyAsrCorrections("I is be free songs un"),
    "I used to be a fireman and I am very strong."
  );
});
