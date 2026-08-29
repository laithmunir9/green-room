const PROFILE_DIMENSIONS = {
  specificity: {
    label: "Specificity",
    description: "You are working on making broad answers more concrete.",
  },
  evidence: {
    label: "Evidence",
    description: "You are working on supporting important claims with evidence.",
  },
  completeness: {
    label: "Completeness",
    description: "You are working on carrying explanations through to their final step.",
  },
  consistency: {
    label: "Consistency",
    description: "You are working on keeping related ideas aligned as you explain them.",
  },
  recovery: {
    label: "Recovery",
    description: "You often find a clearer answer after a follow-up.",
  },
};

const ISSUE_KEYS = ["specificity", "evidence", "completeness", "consistency"];
const DEFAULT_MAX_SESSIONS = 50;
const DEFAULT_MIN_EVIDENCE = 3;

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function completedSession(session) {
  return isObject(session) && (!session.status || session.status === "completed") && session.id;
}

function dimensionSignals(event) {
  const signals = isObject(event?.signals) ? event.signals : {};
  const analysis = isObject(event?.turnAnalysis) ? event.turnAnalysis : {};
  const types = new Set([analysis.followUpType, analysis.type]);
  return {
    specificity: Boolean(signals.vagueExample || signals.vague || types.has("specificity")),
    evidence: Boolean(signals.unsupportedClaim || types.has("evidence")),
    completeness: Boolean(signals.incompleteExplanation || types.has("completeness") || types.has("clarification") && analysis.reason === "incomplete"),
    consistency: Boolean(signals.possibleContradiction || signals.selfContradictory || types.has("contradiction")),
    recovery: Boolean(types.has("recovery") && analysis.answered === true),
  };
}

function sessionContributions(session) {
  const result = new Set();
  const events = Array.isArray(session?.events) ? session.events : [];
  for (const event of events) {
    if (event?.type !== "turn") continue;
    const signals = dimensionSignals(event);
    Object.entries(signals).forEach(([key, present]) => { if (present) result.add(key); });
  }
  return result;
}

function directionFor(counts, total) {
  const recentStart = Math.max(0, total - 3);
  const recent = counts.slice(recentStart).filter(Boolean).length;
  const earlier = counts.slice(0, recentStart).filter(Boolean).length;
  if (recentStart === 0 || recent === earlier) return { recentDirection: "steady", status: "Still recurring" };
  if (recent < earlier) return { recentDirection: "improving", status: "Showing up less often" };
  return { recentDirection: "recurring", status: "Recurring" };
}

function aggregateSpeakingProfile(sessions, options = {}) {
  const maxSessions = Math.max(1, Math.min(DEFAULT_MAX_SESSIONS, Number(options.maxSessions) || DEFAULT_MAX_SESSIONS));
  const minimumEvidence = Math.max(2, Number(options.minimumEvidence) || DEFAULT_MIN_EVIDENCE);
  const valid = [];
  const seen = new Set();
  for (const session of Array.isArray(sessions) ? sessions : []) {
    if (!completedSession(session) || seen.has(String(session.id))) continue;
    seen.add(String(session.id));
    if (!Array.isArray(session.events)) continue;
    valid.push(session);
  }
  valid.sort((a, b) => String(a.startedAt || a.endedAt || "").localeCompare(String(b.startedAt || b.endedAt || "")));
  const bounded = valid.slice(-maxSessions);
  const contributions = bounded.map(sessionContributions);
  const observations = [];
  for (const key of ISSUE_KEYS) {
    const counts = contributions.map((set) => set.has(key));
    const evidenceCount = counts.filter(Boolean).length;
    if (evidenceCount < minimumEvidence) continue;
    const direction = directionFor(counts, counts.length);
    observations.push({
      type: "recurring-pattern",
      label: PROFILE_DIMENSIONS[key].label,
      status: direction.status,
      evidenceCount,
      recentDirection: direction.recentDirection,
      description: PROFILE_DIMENSIONS[key].description,
    });
  }
  const recoveryCounts = contributions.map((set) => set.has("recovery"));
  const recoveryEvidence = recoveryCounts.filter(Boolean).length;
  if (recoveryEvidence >= 2) {
    observations.push({
      type: "strength",
      label: PROFILE_DIMENSIONS.recovery.label,
      status: recoveryEvidence >= minimumEvidence ? "Strength" : "Emerging strength",
      evidenceCount: recoveryEvidence,
      recentDirection: "strengthening",
      description: PROFILE_DIMENSIONS.recovery.description,
    });
  }
  return {
    sessionsAnalyzed: bounded.length,
    updatedAt: new Date().toISOString(),
    observations,
    emptyState: observations.length ? null : "Keep practicing to build your Speaking Profile.",
  };
}

globalThis.PrelightSpeakingProfile = { aggregateSpeakingProfile };

export { aggregateSpeakingProfile };
