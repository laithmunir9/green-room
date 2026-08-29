function firstSentence(value, maxLength = 90) {
  const trimmed = String(value || "").trim();
  const match = trimmed.match(/^[^.!?]*[.!?]/);
  const sentence = match ? match[0] : trimmed;
  return sentence.length > maxLength ? `${sentence.slice(0, maxLength - 1)}…` : sentence;
}

function serverSessionToHistory(session) {
  if (!session || typeof session !== "object" || !session.id) return null;
  const review = session.review && typeof session.review === "object" ? session.review : {};
  const events = Array.isArray(session.events) ? session.events : [];
  const studentTurns = events
    .filter((event) => event?.type === "turn" && event.studentText)
    .map((event) => String(event.studentText));
  return {
    sessionId: String(session.id),
    templateId: session.templateId || "",
    templateName: session.templateName || "Practice session",
    date: session.endedAt || session.startedAt || session.createdAt || new Date().toISOString(),
    takeaway: firstSentence(review.rubric?.contentCorrespondence || review.rubric?.articulation || ""),
    rubric: review.rubric || null,
    signals: { ...(review.delivery || {}), ...(review.engagement || {}) },
    viaFreeText: false,
    bestLine: review.bestLine || null,
    replayAvailable: events.some((event) => event?.type === "turn" && event.studentText),
    transcript: studentTurns.join(" "),
    questId: session.scenarioContext?.questId || null,
    challengeModifier: session.scenarioContext?.challengeModifier || null,
    contextTitle: session.scenarioContext?.title || null,
  };
}

function mergeSessionHistory(localHistory, serverSessions, limit = 20) {
  const local = Array.isArray(localHistory) ? localHistory : [];
  const merged = new Map(local.map((entry, index) => [
    entry?.sessionId || `legacy:${entry?.date || ""}:${entry?.templateId || ""}:${index}`,
    entry,
  ]));
  for (const session of Array.isArray(serverSessions) ? serverSessions : []) {
    const entry = serverSessionToHistory(session);
    if (!entry) continue;
    merged.set(entry.sessionId, { ...(merged.get(entry.sessionId) || {}), ...entry });
  }
  return [...merged.values()]
    .sort((a, b) => String(b?.date || "").localeCompare(String(a?.date || "")))
    .slice(0, Math.max(1, Math.min(50, Number(limit) || 20)));
}

globalThis.PrelightSessionHistory = { mergeSessionHistory, serverSessionToHistory };
