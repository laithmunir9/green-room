import { existsSync, readFileSync } from "fs";
import { aiOpenAIJson } from "../openaiChatClient.js";

const envPath = new URL("../.env", import.meta.url);
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const result = await aiOpenAIJson({
  system: 'Respond with JSON only: {"replies":[{"personaId":"impressed","reply":"..."}]}',
  user: "Student: I am a software engineer.",
  max_tokens: 150,
  temperature: 0.2,
});

console.log(JSON.stringify(result));
