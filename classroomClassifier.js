/** Local, deterministic heuristics for classroom-simulation agent selection. No I/O, no model calls. */

const HEDGE_RE = /\b(kind of|sort of|i think|i guess|maybe|not sure|possibly|probably|i suppose|um+|uh+)\b/gi;
const STUCK_RE = /\b(i don'?t know|not sure|i'?m stuck|confused|no idea|i forget)\b/i;
const ABSOLUTE_RE = /\b(always|never|definitely|certainly|100%|guaranteed)\b/i;
const NEGATION_RE = /\b(not|isn'?t|doesn'?t|never|no longer|wasn'?t|aren'?t)\b/i;

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

export function buildTopicKeywordSet(topicName, subskillName, siblingSubskillNames = []) {
  const words = [
    ...significantWords(topicName || ""),
    ...significantWords(subskillName || ""),
    ...siblingSubskillNames.flatMap((n) => significantWords(n || "")),
  ];
  return new Set(words);
}

export function classifyStudentMessage(text, { keywordSet = new Set(), recentStudentMessages = [] } = {}) {
  const trimmed = String(text || "").trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const hedgeCount = (trimmed.match(HEDGE_RE) || []).length;
  const stuckPhrase = STUCK_RE.test(trimmed);
  const absoluteLanguage = ABSOLUTE_RE.test(trimmed);

  const currentSig = new Set(significantWords(trimmed));
  const currentNegates = NEGATION_RE.test(trimmed);
  let selfContradiction = absoluteLanguage && hedgeCount > 0;
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

  const onTopic = keywordSet.size === 0 || [...currentSig].some((w) => keywordSet.has(w));

  return {
    wordCount,
    hedgeCount,
    stuckPhrase,
    absoluteLanguage,
    selfContradiction,
    onTopic,
    vague: wordCount > 40 || hedgeCount >= 2,
    hesitantShort: wordCount < 8 && hedgeCount > 0,
    offTopic: !onTopic && wordCount >= 4,
  };
}

export function selectResponders(signals, rng = Math.random) {
  const picks = [];
  const add = (id) => {
    if (!picks.includes(id)) picks.push(id);
  };

  if (signals.selfContradiction) add("skeptical");
  if (picks.length < 3) {
    if (signals.stuckPhrase) add("teacher");
    else if (signals.hesitantShort) add("encouraging");
  }
  if (picks.length < 3 && signals.offTopic) add("distracted");
  if (picks.length < 3 && signals.vague) add("curious");
  if (picks.length === 0) add("quick_learner");

  if (picks.length < 3 && !picks.includes("shy_engaged") && rng() < 0.15) {
    add("shy_engaged");
  }

  return picks.slice(0, 3);
}
