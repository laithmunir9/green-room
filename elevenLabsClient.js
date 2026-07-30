/** ElevenLabs text-to-speech client. */

const EL_TIMEOUT_MS = 20000;

function elConfig() {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) throw new Error("Missing ELEVENLABS_API_KEY");
  return { apiKey };
}

export async function synthesizeSpeech(text, voiceId) {
  const { apiKey } = elConfig();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EL_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.45, similarity_boost: 0.75 },
      }),
      signal: controller.signal,
    });
  } catch (e) {
    if (e.name === "AbortError") throw new Error("ElevenLabs request timed out");
    throw new Error(`ElevenLabs request failed: ${e.message || e}`);
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new Error((await res.text()).slice(0, 400));
  return Buffer.from(await res.arrayBuffer());
}
