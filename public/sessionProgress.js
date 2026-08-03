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

  function distinctTemplates(history) {
    var ids = (history || [])
      .map(function (h) { return (h && (h.templateId || h.templateName)) || ""; })
      .filter(Boolean);
    return new Set(ids);
  }

  function hasPaceRun(history) {
    var values = seriesFor(history, "avgWpm");
    var run = 0;
    for (var i = 0; i < values.length; i++) {
      run = values[i] >= PACE_BAND.from && values[i] <= PACE_BAND.to ? run + 1 : 0;
      if (run >= 3) return true;
    }
    return false;
  }

  function anySignal(history, key, test) {
    return (history || []).some(function (h) {
      var v = h && h.signals ? numOrNull(h.signals[key]) : null;
      return v !== null && test(v);
    });
  }

  var MILESTONES = [
    { id: "first_rep", label: "First rep", desc: "Finish any practice session.",
      earned: function (h) { return (h || []).length >= 1; } },
    { id: "range", label: "Range builder", desc: "Practice three different rooms.",
      earned: function (h) { return distinctTemplates(h).size >= 3; } },
    { id: "pace", label: "Found your pace", desc: "Three sessions running inside a conversational pace.",
      earned: hasPaceRun },
    { id: "plain", label: "Said it plain", desc: "Finish a session with almost no hedging.",
      earned: function (h) { return anySignal(h, "hedgeRate", function (v) { return v < 0.02; }); } },
    { id: "floor", label: "Held the floor", desc: "Take ten or more turns in one session.",
      earned: function (h) { return anySignal(h, "turnCount", function (v) { return v >= 10; }); } },
    { id: "offscript", label: "Went off-script", desc: "Describe your own scenario instead of picking one.",
      earned: function (h) { return (h || []).some(function (e) { return e && e.viaFreeText === true; }); } },
  ];

  function milestoneProgress(history) {
    var milestones = MILESTONES.map(function (m) {
      return { id: m.id, label: m.label, desc: m.desc, earned: m.earned(history) };
    });
    var earned = milestones.filter(function (m) { return m.earned; }).length;
    var next = milestones.find(function (m) { return !m.earned; }) || null;
    return { milestones: milestones, earned: earned, total: milestones.length, next: next };
  }

  root.GreenRoomProgress = {
    MIN_TREND_SESSIONS: MIN_TREND_SESSIONS,
    extractSignals: extractSignals,
    seriesFor: seriesFor,
    trendRows: trendRows,
    distinctTemplates: distinctTemplates,
    milestoneProgress: milestoneProgress,
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
