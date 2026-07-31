import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

async function loadAccumulator() {
  const source = await readFile(new URL("./public/micTranscriptAccumulator.js", import.meta.url), "utf8");
  const context = {};
  vm.createContext(context);
  vm.runInContext(source, context);
  return context.createMicTranscriptAccumulator;
}

function result(transcript, isFinal = false) {
  const r = [{ transcript }];
  r.isFinal = isFinal;
  return r;
}

test("mic transcript keeps an interim tail when stop happens before Chrome finalizes it", async () => {
  const createMicTranscriptAccumulator = await loadAccumulator();
  const acc = createMicTranscriptAccumulator();

  acc.recordResultEvent({
    resultIndex: 0,
    results: [
      result("I want to compare Claude", true),
      result("and GPT", false),
    ],
  });
  acc.flushSession();

  assert.equal(acc.text(), "I want to compare Claude and GPT");
});

test("mic transcript overwrites interim text with the latest segment text", async () => {
  const createMicTranscriptAccumulator = await loadAccumulator();
  const acc = createMicTranscriptAccumulator();

  acc.recordResultEvent({
    resultIndex: 0,
    results: [result("I want to compare cloud", false)],
  });
  acc.recordResultEvent({
    resultIndex: 0,
    results: [result("I want to compare Claude", true)],
  });
  acc.flushSession();

  assert.equal(acc.text(), "I want to compare Claude");
});

test("mic transcript flushes each native recognition session before indices reset", async () => {
  const createMicTranscriptAccumulator = await loadAccumulator();
  const acc = createMicTranscriptAccumulator();

  acc.recordResultEvent({
    resultIndex: 0,
    results: [result("The opening thought", false)],
  });
  acc.flushSession();

  acc.recordResultEvent({
    resultIndex: 0,
    results: [result("continues after restart", true)],
  });
  acc.flushSession();

  assert.equal(acc.text(), "The opening thought continues after restart");
});
