import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const filesToCheck = [
  "README.md",
  "README.txt",
  "server.js",
  "practiceTemplates.js",
  "elevenLabsVoices.js",
  "public/index.html",
  "public/practice-test.html",
  "public/sessionProgress.js",
  "transcriptAsrCorrections.js",
];
const EM_DASH = "\u2014";

test("app and README text do not use em dashes", () => {
  const offenders = [];
  for (const file of filesToCheck) {
    if (!existsSync(file)) continue;
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (line.includes(EM_DASH)) offenders.push(`${file}:${i + 1}`);
    });
  }
  assert.deepEqual(offenders, []);
});
