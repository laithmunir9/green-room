/** OpenAI-compatible client for K2 Think V2 (hosted at K2THINK_BASE_URL). */

const K2_TIMEOUT_MS = 25000;

function k2Config() {
  const apiKey = process.env.K2THINK_API_KEY;
  const baseUrl = process.env.K2THINK_BASE_URL;
  const model = process.env.K2THINK_MODEL || "MBZUAI-IFM/K2-Think-v2";
  if (!apiKey) throw new Error("Missing K2THINK_API_KEY");
  if (!baseUrl) throw new Error("Missing K2THINK_BASE_URL");
  return { apiKey, baseUrl: baseUrl.replace(/\/+$/, ""), model };
}

export async function aiK2Messages({ system, messages, max_tokens = 400, temperature = 0.6, model } = {}) {
  const cfg = k2Config();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), K2_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model || cfg.model,
        temperature,
        max_tokens,
        messages: system ? [{ role: "system", content: system }, ...messages] : messages,
      }),
      signal: controller.signal,
    });
  } catch (e) {
    if (e.name === "AbortError") throw new Error("K2 Think request timed out");
    throw new Error(`K2 Think request failed: ${e.message || e}`);
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new Error((await res.text()).slice(0, 400));
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

export async function aiK2Json({ system, user, max_tokens = 500, model } = {}) {
  let text = await aiK2Messages({
    system,
    messages: [{ role: "user", content: user }],
    max_tokens,
    model,
  });
  text = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
  const a = text.indexOf("{");
  const b = text.lastIndexOf("}");
  if (a >= 0 && b > a) text = text.slice(a, b + 1);
  return JSON.parse(text);
}
