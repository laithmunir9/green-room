const FOLLOW_UP_TYPES = new Set(["evidence", "specificity", "contradiction", "clarification", "recovery", "none"]);
const IMPORTANCE_LEVELS = new Set(["low", "medium", "high"]);

export function normalizeTurnAnalysis(value, signals = {}) {
  const triggered = Boolean(
    signals.vague ||
    signals.selfContradiction ||
    signals.possibleContradiction ||
    signals.unsupportedClaim ||
    signals.vagueExample ||
    signals.incompleteExplanation ||
    signals.stuckPhrase ||
    signals.offTopic
  );
  const source = value && typeof value === "object" ? value : {};
  const requestedType = FOLLOW_UP_TYPES.has(source.followUpType) ? source.followUpType : "none";
  const followUpType = triggered ? requestedType : "none";
  const reason = followUpType === "none" ? null : cleanText(source.reason, 180) || null;
  const claim = followUpType === "evidence" || followUpType === "specificity"
    ? cleanText(source.claim, 240) || null
    : null;

  return {
    followUpType,
    reason,
    claim,
    answered: typeof source.answered === "boolean" ? source.answered : null,
    importance: followUpType === "none"
      ? "low"
      : (IMPORTANCE_LEVELS.has(source.importance) ? source.importance : "medium"),
  };
}

function cleanText(value, maxLength) {
  return String(value || "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export const TURN_ANALYSIS_FOLLOW_UP_TYPES = [...FOLLOW_UP_TYPES];
