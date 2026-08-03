const MIN_TURNS = 2;
const MIN_WORDS = 15;

export function normalizeForMatch(text) {
  return String(text ?? "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/^[\s"‘’“”`]+/, "")
    .replace(/[\s"‘’“”`.,!?;:]+$/, "")
    .trim();
}

function cleanTurns(studentTexts) {
  return (Array.isArray(studentTexts) ? studentTexts : [])
    .map((t) => String(t ?? "").trim())
    .filter(Boolean);
}

export function hasEnoughSubstance(studentTexts) {
  const turns = cleanTurns(studentTexts);
  if (turns.length < MIN_TURNS) return false;
  const words = turns.join(" ").split(/\s+/).filter(Boolean).length;
  return words >= MIN_WORDS;
}

export function isVerbatim(bestLine, studentTexts) {
  const needle = normalizeForMatch(bestLine);
  if (!needle) return false;
  const haystack = normalizeForMatch(cleanTurns(studentTexts).join(" "));
  if (!haystack) return false;
  return haystack.includes(needle);
}

export function resolveCurtainCall({ bestLine, whyItLanded, studentTexts }) {
  const none = { bestLine: null, whyItLanded: null, rejected: false };
  const offered = String(bestLine ?? "").trim();
  if (!offered) return none;
  if (!hasEnoughSubstance(studentTexts)) return none;
  if (!isVerbatim(offered, studentTexts)) return { bestLine: null, whyItLanded: null, rejected: true };
  const why = String(whyItLanded ?? "").trim();
  return { bestLine: offered, whyItLanded: why || null, rejected: false };
}
