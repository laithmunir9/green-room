/** Local, deterministic heuristics for scenario-practice agent selection and end-of-session signal summaries. No I/O, no model calls. */

const HEDGE_RE = /\b(kind of|sort of|i think|i guess|maybe|not sure|possibly|probably|i suppose|um+|uh+)\b/gi;
const STUCK_RE = /\b(i don'?t know|not sure|i'?m stuck|confused|no idea|i forget)\b/i;
const ABSOLUTE_RE = /\b(always|never|definitely|certainly|100%|guaranteed)\b/i;
const NEGATION_RE = /\b(not|isn'?t|doesn'?t|never|no longer|wasn'?t|aren'?t)\b/i;
const ENGAGEMENT_RE = /\?|what do you think|does that make sense|any questions|do you agree/i;
const TOPIC_SHIFT_RE = /\b(anyway|by the way|off[\s-]?topic|unrelated|different subject|switching topics|speaking of something else|change the subject|changing the subject|not related to this)\b/i;
const IMPACT_CLAIM_RE = /\b(significantly|much better|dramatically|more efficient|improves?|reduces?|increases?|cuts?|faster|cheaper|stronger|higher|lower|better)\b/i;
const QUANTITATIVE_CLAIM_RE = /(?:\b\d[\d,.]*\s*%?|\b\d[\d,.]*\s+(?:users?|customers?|clients?|participants?|cases?|trials?)\b)/i;
const SUPPORTING_DETAIL_RE = /\b(?:in a (?:pilot|study|test|trial)|with \d[\d,.]*\s+(?:users?|customers?|clients?|participants?)|measured|observed|recorded|according to|based on|our data|experiment|from .+ to .+|over \d+\s+(?:days?|weeks?|months?))\b/i;
const VAGUE_EXAMPLE_PROMPT_RE = /\b(?:give|provide|share|tell me about|describe)\b.{0,40}\b(?:example|time|situation|instance)\b/i;
const VAGUE_NOUN_RE = /\b(?:things|stuff|some work|activities|experience|leadership things|projects)\b/i;
const VAGUE_OUTCOME_RE = /\b(?:went well|was good|worked out|helped a lot|pretty well|made a difference)\b/i;
const CONCRETE_ACTION_RE = /\b(?:led|built|created|organized|coordinated|changed|resolved|delivered|launched|designed|implemented|managed|negotiated|planned|improved|raised|reduced|increased)\b/i;
const OBSERVABLE_OUTCOME_RE = /\b(?:\d[\d,.]*\s*%?|\$\s*\d|raised|saved|reduced|increased|delivered|completed|won|promoted|ahead|behind|on time)\b/i;
const MULTI_PART_RE = /\b(?:two|three|both|each|multiple|steps?|mechanisms?|reasons?|ways?|parts?)\b/i;
const EXPLICIT_PART_RE = /\b(?:first|second|third|another|also|additionally|respectively)\b/i;
const NOT_LAUNCHED_RE = /\b(?:haven't|have not|hasn't|has not|not yet)\s+(?:publicly\s+)?launched\b|\bpre[- ]launch\b/i;
const LAUNCHED_RE = /\b(?:launched|live|in production|publicly available)\b/i;
const USER_SCALE_RE = /\b(?:have|has|with|serve|serving)\s+\d[\d,.]*\s+(?:users?|customers?|clients?|accounts?)\b|\b\d[\d,.]*\s+(?:users?|customers?|clients?|accounts?)\b/i;

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "be", "been",
  "of", "to", "in", "on", "for", "with", "as", "at", "by", "this", "that", "it",
  "its", "you", "your", "i", "we", "they", "he", "she", "them", "his", "her",
  "so", "than", "then", "there", "here", "what", "which", "who", "when", "how",
  "just", "like", "into", "about", "if", "not", "have", "has", "had", "can",
  "will", "would", "could", "should", "do", "does", "did", "from", "up", "out",
]);

function significantWords(text) {
  return (text.toLowerCase().match(/[a-z']+/g) || []).filter(
    (w) => w.length > 3 && !STOPWORDS.has(w)
  );
}

export function buildScenarioKeywordSet(description) {
  return new Set(significantWords(description || ""));
}

export function scenarioFollowUpPolicy(scenarioId, scenarioDescription = "") {
  const technical = scenarioId === "exam_viva" || /research|defen[cs]e|thesis|dissertation|technical reviewer/i.test(scenarioDescription);
  const policy = {
    evidence: "medium",
    specificity: "medium",
    contradiction: "medium",
    completeness: technical ? "high" : "low",
  };
  if (scenarioId === "pitch") {
    policy.evidence = "high";
    policy.specificity = "high";
  } else if (scenarioId === "interview") {
    policy.specificity = "high";
  } else if (scenarioId === "public_speech") {
    policy.evidence = "medium";
  } else if (scenarioId === "casual") {
    policy.evidence = "low";
    policy.specificity = "low";
    policy.contradiction = "low";
    policy.completeness = "low";
  }
  return policy;
}

function detectsCrossTurnContradiction(trimmed, recentStudentMessages) {
  const notLaunched = NOT_LAUNCHED_RE.test(trimmed);
  const launched = LAUNCHED_RE.test(trimmed);
  for (const prior of recentStudentMessages) {
    const priorText = String(prior || "");
    if (notLaunched && USER_SCALE_RE.test(priorText) && !(priorText.match(/\bbeta\b/i) && /\bpublicly\b/i.test(trimmed))) return true;
    if (notLaunched && LAUNCHED_RE.test(priorText) && !/\bpublicly\b/i.test(trimmed)) return true;
    if (launched && NOT_LAUNCHED_RE.test(priorText) && !/\bpublicly\b/i.test(trimmed)) return true;
  }
  return false;
}

export function classifyStudentMessage(text, {
  keywordSet = new Set(),
  recentStudentMessages = [],
  scenarioId = "",
  scenarioDescription = "",
  previousQuestion = "",
} = {}) {
  const trimmed = String(text || "").trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const hedgeCount = (trimmed.match(HEDGE_RE) || []).length;
  const stuckPhrase = STUCK_RE.test(trimmed);
  const absoluteLanguage = ABSOLUTE_RE.test(trimmed);

  const currentSig = new Set(significantWords(trimmed));
  const currentNegates = NEGATION_RE.test(trimmed);
  const possibleContradiction = detectsCrossTurnContradiction(trimmed, recentStudentMessages);
  let selfContradiction = possibleContradiction || (absoluteLanguage && hedgeCount > 0);
  if (!selfContradiction && currentNegates) {
    for (const prior of recentStudentMessages) {
      const priorSig = significantWords(prior);
      const overlaps = priorSig.some((w) => currentSig.has(w));
      if (overlaps) {
        selfContradiction = true;
        break;
      }
    }
  }

  const onTopic = !TOPIC_SHIFT_RE.test(trimmed);
  const unsupportedClaim = (IMPACT_CLAIM_RE.test(trimmed) || QUANTITATIVE_CLAIM_RE.test(trimmed)) && !SUPPORTING_DETAIL_RE.test(trimmed);
  const asksForExample = VAGUE_EXAMPLE_PROMPT_RE.test(previousQuestion);
  const vagueExample = asksForExample &&
    (VAGUE_NOUN_RE.test(trimmed) || VAGUE_OUTCOME_RE.test(trimmed)) &&
    !CONCRETE_ACTION_RE.test(trimmed) &&
    !OBSERVABLE_OUTCOME_RE.test(trimmed);
  const technicalScenario = scenarioId === "exam_viva" || /research|defen[cs]e|thesis|dissertation|technical reviewer/i.test(scenarioDescription);
  const incompleteExplanation = technicalScenario && MULTI_PART_RE.test(previousQuestion) &&
    words.length < 35 && !EXPLICIT_PART_RE.test(trimmed);

  return {
    wordCount,
    hedgeCount,
    stuckPhrase,
    absoluteLanguage,
    selfContradiction,
    possibleContradiction,
    unsupportedClaim,
    vagueExample,
    incompleteExplanation,
    onTopic,
    vague: wordCount > 40 || hedgeCount >= 2,
    hesitantShort: wordCount < 8 && hedgeCount > 0,
    offTopic: !onTopic,
  };
}

export function selectResponders(signals, rng = Math.random, scenarioId = "") {
  const picks = [];
  const add = (id) => {
    if (!picks.includes(id)) picks.push(id);
  };
  const policy = scenarioFollowUpPolicy(scenarioId);

  if (signals.selfContradiction && policy.contradiction !== "low") add("skeptical");
  if (picks.length < 3) {
    if (signals.stuckPhrase) add("facilitator");
    else if (signals.hesitantShort) add("encouraging");
  }
  if (picks.length < 3 && signals.offTopic) add("distracted");
  if (picks.length < 3 && signals.incompleteExplanation && policy.completeness !== "low") add("curious");
  if (picks.length < 3 && signals.unsupportedClaim && policy.evidence !== "low") add("skeptical");
  if (picks.length < 3 && signals.vagueExample && policy.specificity !== "low") add("curious");
  if (picks.length < 3 && signals.vague && policy.specificity !== "low") add("curious");
  if (picks.length === 0) add("impressed");

  if (picks.length < 3 && !picks.includes("shy_engaged") && rng() < 0.15) {
    add("shy_engaged");
  }

  return picks.slice(0, 3);
}

export function summarizeDelivery(studentTexts, voiceTurns = []) {
  const turnCount = studentTexts.length;
  if (turnCount === 0) return { turnCount: 0, wordCount: 0, hedgeRate: 0, rambleRate: 0, avgWpm: null, pacedTurnCount: 0 };
  let totalWords = 0;
  let totalHedges = 0;
  let vagueTurns = 0;
  for (const text of studentTexts) {
    const signals = classifyStudentMessage(text, {});
    totalWords += signals.wordCount;
    totalHedges += signals.hedgeCount;
    if (signals.vague) vagueTurns += 1;
  }
  let avgWpm = null;
  if (voiceTurns.length) {
    const totalVoiceWords = voiceTurns.reduce((sum, t) => sum + t.wordCount, 0);
    const totalVoiceMinutes = voiceTurns.reduce((sum, t) => sum + t.durationSec, 0) / 60;
    avgWpm = totalVoiceMinutes > 0 ? Math.round(totalVoiceWords / totalVoiceMinutes) : null;
  }
  return {
    turnCount,
    wordCount: totalWords,
    hedgeRate: totalWords > 0 ? totalHedges / totalWords : 0,
    rambleRate: vagueTurns / turnCount,
    avgWpm,
    pacedTurnCount: voiceTurns.length,
  };
}

export function summarizeEngagement(studentTexts) {
  const turnCount = studentTexts.length;
  if (turnCount === 0) return { turnCount: 0, questionRate: 0 };
  const engagedTurns = studentTexts.filter((t) => ENGAGEMENT_RE.test(t)).length;
  return {
    turnCount,
    questionRate: engagedTurns / turnCount,
  };
}
