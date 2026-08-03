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

test("normalizeForMatch converts curly apostrophes to straight ones", () => {
  assert.equal(normalizeForMatch("I’d"), "i'd");
});

test("isVerbatim matches when model returns curly apostrophe and transcript has straight", () => {
  const transcript = ["So I'd get up to speed fast."];
  assert.equal(isVerbatim("So I’d get up to speed fast.", transcript), true);
});

test("isVerbatim matches curly double quotes wrapping and strips them", () => {
  const transcript = ["So I'd get up to speed fast."];
  assert.equal(isVerbatim("“So I’d get up to speed fast.”", transcript), true);
});

test("isVerbatim matches when transcript has curly apostrophe and model returns straight", () => {
  const transcript = ["So I’d get up to speed fast."];
  assert.equal(isVerbatim("So I'd get up to speed fast.", transcript), true);
});
