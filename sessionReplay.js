const MOMENT_TYPES = new Set(["evidence", "specificity", "contradiction", "clarification", "recovery"]);

const MOMENT_COPY = {
  evidence: {
    label: "Evidence challenge",
    observation: "The facilitator asked you to support the claim with evidence.",
    suggestion: "Lead with the evidence, number, or example first.",
  },
  specificity: {
    label: "Specificity prompt",
    observation: "Your answer stayed broad, so the facilitator asked for a concrete example.",
    suggestion: "Use one concrete situation instead of describing the experience generally.",
  },
  contradiction: {
    label: "Clarification moment",
    observation: "The conversation surfaced two ideas that needed to be reconciled.",
    suggestion: "Clarify the distinction before continuing.",
  },
  clarification: {
    label: "Clarification moment",
    observation: "The facilitator asked you to answer the exact question more directly.",
    suggestion: "Answer the exact question first, then add context.",
  },
  recovery: {
    label: "Strong recovery",
    observation: "You gave a clearer answer after the follow-up.",
    suggestion: "Keep the clearer structure you used in your second answer.",
  },
  incomplete: {
    label: "Incomplete explanation",
    observation: "The explanation needed one more step before moving on.",
    suggestion: "Finish the mechanism before moving to the next idea.",
  },
};

function cleanText(value, max = 2000) {
  return String(value ?? "").replace(/\r/g, "").trim().slice(0, max);
}

function eventTime(event) {
  const time = Date.parse(event?.occurredAt || "");
  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
}

function eventType(event) {
  const analysisType = event?.turnAnalysis?.followUpType;
  if (MOMENT_TYPES.has(analysisType)) return analysisType;
  const signals = event?.signals || {};
  if (signals.unsupportedClaim) return "evidence";
  if (signals.vagueExample || signals.vague) return "specificity";
  if (signals.possibleContradiction || signals.selfContradictory) return "contradiction";
  if (signals.incompleteExplanation) return "incomplete";
  return null;
}

function firstReply(event) {
  return Array.isArray(event?.facilitator)
    ? event.facilitator.map((reply) => cleanText(reply?.text)).find(Boolean) || ""
    : "";
}

function momentFromEvent(event, previousFacilitatorText) {
  const type = eventType(event);
  if (!type) return null;
  const copy = MOMENT_COPY[type];
  const facilitatorText = cleanText(previousFacilitatorText || firstReply(event));
  const userText = cleanText(event.studentText);
  if (!copy || !facilitatorText || !userText) return null;
  return {
    id: `moment-${event.sequence}`,
    sequence: event.sequence,
    type,
    label: copy.label,
    facilitatorText,
    userText,
    observation: copy.observation,
    suggestion: copy.suggestion,
    personaId: Array.isArray(event.facilitator) ? cleanText(event.facilitator[0]?.personaId, 64) || "facilitator" : "facilitator",
    occurredAt: cleanText(event.occurredAt, 64) || null,
    answered: typeof event.turnAnalysis?.answered === "boolean" ? event.turnAnalysis.answered : null,
  };
}

function transcriptFromEvents(events) {
  return events.flatMap((event) => {
    if (event?.type === "facilitator") {
      const text = cleanText(event.text);
      return text ? [{ role: "facilitator", personaId: cleanText(event.personaId, 64) || "facilitator", text }] : [];
    }
    const entries = [];
    const studentText = cleanText(event?.studentText);
    if (studentText) entries.push({ role: "student", text: studentText });
    for (const reply of Array.isArray(event?.facilitator) ? event.facilitator : []) {
      const text = cleanText(reply?.text);
      if (text) entries.push({ role: "facilitator", personaId: cleanText(reply?.personaId, 64) || "facilitator", text });
    }
    return entries;
  });
}

function buildReplayViewModel(session) {
  if (!session || typeof session !== "object") return null;
  const events = Array.isArray(session.events)
    ? session.events.filter((event) => event && typeof event === "object").slice().sort((a, b) => {
      const sequenceDiff = (Number(a.sequence) || 0) - (Number(b.sequence) || 0);
      return sequenceDiff || eventTime(a) - eventTime(b);
    })
    : [];
  const keyMoments = [];
  const seenTypes = new Set();
  let previousFacilitatorText = "";
  for (const event of events) {
    if (event.type === "facilitator") {
      previousFacilitatorText = cleanText(event.text) || previousFacilitatorText;
      continue;
    }
    const moment = momentFromEvent(event, previousFacilitatorText);
    if (moment && !seenTypes.has(moment.type) && keyMoments.length < 5) {
      keyMoments.push(moment);
      seenTypes.add(moment.type);
    }
    const reply = firstReply(event);
    if (reply) previousFacilitatorText = reply;
  }
  return {
    sessionId: cleanText(session.id, 80) || null,
    title: cleanText(session.templateName, 120) || "Practice session",
    scenario: cleanText(session.scenarioDescription) || "",
    context: {
      title: cleanText(session.scenarioContext?.title, 120) || null,
      audience: cleanText(session.scenarioContext?.audience, 160) || null,
    },
    startedAt: cleanText(session.startedAt, 64) || null,
    completedAt: cleanText(session.endedAt || session.startedAt, 64) || null,
    summary: cleanText(session.review?.rubric?.contentCorrespondence || session.review?.rubric?.articulation, 1000) || "",
    bestLine: cleanText(session.review?.bestLine, 1000) || null,
    keyMoments,
    transcript: transcriptFromEvents(events),
  };
}

globalThis.PrelightSessionReplay = { buildReplayViewModel };
