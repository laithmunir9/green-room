(function (root) {
  var MIN_TREND_SESSIONS = 3;
  var PACE_BAND = { from: 120, to: 160 };

  function numOrNull(value) {
    return typeof value === "number" && isFinite(value) ? value : null;
  }

  function extractSignals(raw) {
    var d = (raw && raw.delivery) || {};
    var e = (raw && raw.engagement) || {};
    return {
      turnCount: numOrNull(d.turnCount),
      hedgeRate: numOrNull(d.hedgeRate),
      rambleRate: numOrNull(d.rambleRate),
      avgWpm: numOrNull(d.avgWpm),
      pacedTurnCount: numOrNull(d.pacedTurnCount),
      questionRate: numOrNull(e.questionRate),
    };
  }

  // Stored history is newest-first; every series is returned oldest-first.
  function seriesFor(history, key) {
    return (history || [])
      .slice()
      .reverse()
      .map(function (h) { return h && h.signals ? numOrNull(h.signals[key]) : null; })
      .filter(function (v) { return v !== null; });
  }

  function mean(values) {
    return values.reduce(function (a, b) { return a + b; }, 0) / values.length;
  }

  function row(key, label, values, sentence, band) {
    var out = { key: key, label: label, ready: true, values: values, sentence: sentence };
    if (band) out.band = band;
    return out;
  }

  function pending(key, label, sentence) {
    return { key: key, label: label, ready: false, values: [], sentence: sentence };
  }

  function paceRow(history) {
    var values = seriesFor(history, "avgWpm");
    if (values.length < MIN_TREND_SESSIONS) {
      return pending("pace", "Pace", "Speak in a few more sessions and your pace will show up here.");
    }
    var lo = Math.round(Math.min.apply(null, values));
    var hi = Math.round(Math.max.apply(null, values));
    return row("pace", "Pace", values,
      "Between " + lo + " and " + hi + " wpm across your last " + values.length + " spoken sessions.",
      PACE_BAND);
  }

  function hedgingRow(history) {
    var values = seriesFor(history, "hedgeRate");
    if (values.length < MIN_TREND_SESSIONS) {
      return pending("hedging", "Hedging", "A few more sessions and your hedging pattern will show up here.");
    }
    return row("hedging", "Hedging", values,
      "Hedge words — kind of, maybe, I think — were about " + (mean(values) * 100).toFixed(1) + "% of what you said.");
  }

  function turnRow(history) {
    var values = seriesFor(history, "turnCount");
    if (values.length < MIN_TREND_SESSIONS) {
      return pending("turns", "Turn-taking", "A few more sessions and your turn-taking will show up here.");
    }
    return row("turns", "Turn-taking", values,
      "You spoke " + values[values.length - 1] + " times last session; your average is " + Math.round(mean(values)) + ".");
  }

  function trendRows(history) {
    return [paceRow(history), hedgingRow(history), turnRow(history)];
  }

  root.GreenRoomProgress = {
    MIN_TREND_SESSIONS: MIN_TREND_SESSIONS,
    extractSignals: extractSignals,
    seriesFor: seriesFor,
    trendRows: trendRows,
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
