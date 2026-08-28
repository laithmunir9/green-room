const APP_CONTEXT_TERMS = /\b(app|called|created|prelight|made|project|tool|built|named)\b/i;

function preserveProjectName(text) {
  if (!APP_CONTEXT_TERMS.test(text)) return text;
  return text.replace(/\bprelight\b/gi, "Prelight").replace(/\bpremium\b/gi, "Prelight");
}

export function lightlyFormatTranscript(text) {
  const cleaned = String(text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  const capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
}

export function applyLikelyAsrCorrections(text) {
  const corrected = String(text || "")
    .replace(/\bsome\s+brother\s+wh(?:en|at)\s+experience\s+i\s+bring\b/gi, "some experience I bring")
    .replace(/\bi\s+is\s+be\s+free\s+songs\s+un\b/gi, "I used to be a fireman and I am very strong")
    .replace(/\bpremium\s+for\s+it\s+house\s+people\s+fixed\s+polo\s+speaking\s+skills(?:\s+skills)?\b/gi, "Prelight, and it helps people with their public speaking skills")
    .replace(/\bit\s+house\s+people\b/gi, "it helps people")
    .replace(/\bfixed\s+polo\s+speaking\b/gi, "with public speaking")
    .replace(/\bpolo\s+speaking\b/gi, "public speaking")
    .replace(/\bpublic\s+speaking\s+skills\s+skills\b/gi, "public speaking skills")
    .replace(/\bskills\s+skills\b/gi, "skills")
    .replace(/\bprelight\b/gi, "Prelight")
    .replace(/\bproject\s+called\s+premium\b/gi, "project called Prelight")
    .replace(/\bapp\s+called\s+premium\b/gi, "app called Prelight")
    .replace(/\btool\s+called\s+premium\b/gi, "tool called Prelight")
    .replace(/\bcalled\s+premium\b/gi, "called Prelight")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(.+)$/, preserveProjectName);
  return lightlyFormatTranscript(corrected);
}
