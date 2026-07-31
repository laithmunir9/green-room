const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";

function openAIConfig() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const baseUrl = (process.env.OPENAI_BASE_URL || DEFAULT_OPENAI_BASE_URL).trim().replace(/\/+$/, "");
  const model = process.env.OPENAI_CHAT_MODEL || "gpt-4.1-mini";
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");
  return { apiKey, baseUrl, model };
}

function cleanJsonText(text) {
  let cleaned = String(text || "").replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
  const a = cleaned.indexOf("{");
  const b = cleaned.lastIndexOf("}");
  if (a >= 0 && b > a) cleaned = cleaned.slice(a, b + 1);
  if (!cleaned) throw new Error("OpenAI returned an empty JSON response");
  if (a < 0 || b <= a) throw new Error(`OpenAI returned non-JSON content: ${cleaned.slice(0, 120)}`);
  return cleaned;
}

export async function aiOpenAIMessages({ system, messages, max_tokens = 500, temperature = 0.4, model } = {}) {
  const cfg = openAIConfig();
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model || cfg.model,
      temperature,
      max_tokens,
      response_format: { type: "json_object" },
      messages: system ? [{ role: "system", content: system }, ...messages] : messages,
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
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

export async function aiOpenAIJson({ system, user, max_tokens = 500, model, temperature } = {}) {
  const text = await aiOpenAIMessages({
    system,
    messages: [{ role: "user", content: user }],
    max_tokens,
    model,
    temperature,
  });
  return JSON.parse(cleanJsonText(text));
}
