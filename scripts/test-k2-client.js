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
    // K2 Think V2 is a reasoning model — it spends completion tokens on an
    // internal "reasoning" field before emitting "content". A low max_tokens
    // (e.g. 20) can exhaust the budget mid-reasoning and leave content empty,
    // so this needs enough headroom to actually reach a final answer.
    const reply = await aiK2Messages({
      system: "You are a terse test assistant.",
      messages: [{ role: "user", content: "Reply with exactly one word: pong" }],
      max_tokens: 300,
      model,
    });
    if (!reply.trim()) {
      console.log("FAILED: model returned empty content (likely truncated mid-reasoning)");
      return false;
    }
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
    "MBZUAI-IFM/K2-Think-v2",
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
