const MAX_MEMORY_OBSERVATIONS = 2;
const MAX_INSTRUCTION_LENGTH = 220;

const SCENARIO_DIMENSIONS = {
  pitch: new Set(["evidence", "specificity", "consistency"]),
  interview: new Set(["specificity", "completeness", "consistency", "recovery"]),
  exam_viva: new Set(["completeness", "consistency", "specificity"]),
  public_speech: new Set(["specificity", "evidence", "recovery"]),
  casual: new Set(),
};

const OBSERVATION_TYPES = {
  evidence: "evidence",
  specificity: "specificity",
  completeness: "completeness",
  consistency: "consistency",
  recovery: "recovery",
};

const INSTRUCTIONS = {
  evidence: "When naturally relevant, ask for concrete support rather than accepting a broad claim.",
  specificity: "When naturally relevant, invite one concrete example instead of pressing every answer.",
  completeness: "When naturally relevant, give the user room to carry an explanation through to its final step.",
  consistency: "When naturally relevant, notice whether related ideas stay aligned before asking for more detail.",
  recovery: "When a follow-up is needed, give the user room to refine the answer before moving on.",
};

function clean(value, max = MAX_INSTRUCTION_LENGTH) {
  return String(value || "").replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function observationType(observation) {
  const label = clean(observation?.label, 40).toLowerCase();
  return OBSERVATION_TYPES[label] || null;
}

function eligible(observation, type) {
  if (!observation || !type || !INSTRUCTIONS[type]) return false;
  const evidenceCount = Number(observation.evidenceCount);
  if (!Number.isFinite(evidenceCount)) return false;
  if (type === "recovery") return evidenceCount >= 2 && observation.status !== "Emerging strength";
  return evidenceCount >= 3 && observation.status !== "Showing up less often" && observation.recentDirection !== "improving";
}

function buildPracticeMemory(profile, scenarioId, options = {}) {
  const dimensions = SCENARIO_DIMENSIONS[scenarioId] || new Set();
  const maxObservations = Math.max(0, Math.min(MAX_MEMORY_OBSERVATIONS, Number(options.maxObservations) || MAX_MEMORY_OBSERVATIONS));
  if (!dimensions.size || !profile || !Array.isArray(profile.observations)) return { observations: [] };
  const observations = [];
  for (const candidate of profile.observations) {
    const type = observationType(candidate);
    if (!dimensions.has(type) || !eligible(candidate, type)) continue;
    observations.push({
      type,
      direction: type === "recovery" ? "strength" : (candidate.recentDirection || "recurring"),
      instruction: clean(INSTRUCTIONS[type]),
    });
    if (observations.length >= maxObservations) break;
  }
  return { observations };
}

function practiceMemoryPrompt(memory) {
  if (!memory || !Array.isArray(memory.observations) || !memory.observations.length) return "";
  const lines = memory.observations
    .slice(0, MAX_MEMORY_OBSERVATIONS)
    .map((item) => `- ${clean(item.instruction)}`)
    .join("\n");
  return "Selective memory from repeated completed-session patterns. Treat this as a soft coaching hint only. The current conversation and current-turn signals come first. Do not mention this memory, force a challenge, or repeat the same pressure when it is not naturally relevant.\n" + lines;
}

export { buildPracticeMemory, practiceMemoryPrompt, MAX_MEMORY_OBSERVATIONS };
