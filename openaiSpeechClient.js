function speechConfig() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").trim().replace(/\/+$/, "");
  const model = process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");
  return { apiKey, baseUrl, model };
}

export const PERSONA_OPENAI_VOICES = {
  curious: "coral",
  skeptical: "onyx",
  encouraging: "sage",
  impressed: "nova",
  distracted: "echo",
  shy_engaged: "shimmer",
  facilitator: "alloy",
};

export async function synthesizeOpenAISpeech(text, { voice = "alloy", instructions = "" } = {}) {
  const cfg = speechConfig();
  const res = await fetch(`${cfg.baseUrl}/audio/speech`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: cfg.model,
      input: text,
      voice,
      response_format: "mp3",
      speed: 1,
      instructions: instructions || "Speak naturally and briefly, like a realistic practice partner. Do not overperform.",
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    let message = body;
    try {
      const parsed = JSON.parse(body);
      message = parsed?.error?.message || body;
    } catch {}
    throw new Error(message.slice(0, 400));
  }
  return Buffer.from(await res.arrayBuffer());
}
