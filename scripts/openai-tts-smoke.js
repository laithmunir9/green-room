import { existsSync, readFileSync, writeFileSync } from "fs";
import { synthesizeOpenAISpeech } from "../openaiSpeechClient.js";

const envPath = new URL("../.env", import.meta.url);
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const audio = await synthesizeOpenAISpeech("Could you give me one concrete example of that?", {
  voice: "alloy",
});

const outPath = "/tmp/prelight-openai-tts-smoke.mp3";
writeFileSync(outPath, audio);
console.log(outPath);
