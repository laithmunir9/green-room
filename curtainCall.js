const MIN_TURNS = 2;
const MIN_WORDS = 15;
const MIN_QUOTE_WORDS = 3;

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

/** A turn contributes itself plus each of its sentences. Quoting is whole-sentence
 *  only: a substring of a sentence can carry the student's words while inverting
 *  their meaning ("we should ship this" out of "I do not think we should ship this"). */
function quotableFrom(turn) {
  return [turn, ...turn.split(/(?<=[.!?])\s+/)]
    .map(normalizeForMatch)
    .filter(Boolean);
}

export function isVerbatim(bestLine, studentTexts) {
  const needle = normalizeForMatch(bestLine);
  if (!needle) return false;
  if (needle.split(" ").filter(Boolean).length < MIN_QUOTE_WORDS) return false;
  return cleanTurns(studentTexts).some((turn) => quotableFrom(turn).includes(needle));
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
