const OPENAI_TRANSCRIPTION_URL = "https://api.openai.com/v1/audio/transcriptions";

function transcriptionConfig() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").trim().replace(/\/+$/, "");
  const model = process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-transcribe";
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");
  return { apiKey, baseUrl, model };
}

export async function transcribeAudioBuffer(buffer, { mimeType = "audio/webm", prompt = "" } = {}) {
  const cfg = transcriptionConfig();
  const form = new FormData();
  const ext = mimeType.includes("mp4") ? "mp4" : mimeType.includes("wav") ? "wav" : "webm";
  form.append("file", new Blob([buffer], { type: mimeType }), `speech.${ext}`);
  form.append("model", cfg.model);
  form.append("response_format", "json");
  form.append("language", "en");
  form.append("temperature", "0");
  form.append(
    "prompt",
    prompt ||
      "Prelight speaking practice. Produce a verbatim transcript. Preserve filler words and disfluencies such as um, uh, like, you know, repeated words, restarts, and false starts. Public speaking, interview, pitch, exam viva, job roles, police officer, firefighter."
  );

  const res = await fetch(`${cfg.baseUrl}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.apiKey}` },
    body: form,
  });
  if (!res.ok) {
    const body = await res.text();
    let message = body;
    try {
      const parsed = JSON.parse(body);
      message = parsed?.error?.message || body;
      if (parsed?.error?.code === "insufficient_quota") {
        message = "OpenAI transcription quota is exhausted. Add billing/credits or type the response instead.";
      }
    } catch {}
    throw new Error(message.slice(0, 400));
  }
  const data = await res.json();
  return String(data.text || "").trim();
}
