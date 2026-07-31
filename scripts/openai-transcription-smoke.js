import { existsSync, readFileSync } from "fs";
import { transcribeAudioBuffer } from "../openaiTranscriptionClient.js";

const envPath = new URL("../.env", import.meta.url);
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const audioPath = process.argv[2] || "/tmp/green-room-transcription-smoke.wav";
const text = await transcribeAudioBuffer(readFileSync(audioPath), {
  mimeType: "audio/wav",
  prompt: "Green Room speaking practice. The speaker says: I used to be a policeman and I am very strong.",
});

console.log(text);
