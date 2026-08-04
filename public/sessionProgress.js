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
      wordCount: numOrNull(d.wordCount),
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

  // A milestone is a claim about something the student did, so it needs evidence
  // that they actually spoke. These mirror the curtain call's substance gate: a
  // session of "hi" / "ok" has a hedge rate of 0, but nothing was said plainly
  // because nothing was said. A session with no wordCount (written before the
  // field existed) cannot be verified, so it fails closed.
  var MIN_SESSION_TURNS = 2;
  var MIN_SESSION_WORDS = 15;
  // A rate is only meaningful once its denominator is.
  var MIN_RATE_WORDS = 50;
  // "Held the floor" claims sustained speech, not ten one-word turns.
  var MIN_FLOOR_WORDS = 100;

  function isSubstantive(entry) {
    var s = entry && entry.signals;
    if (!s) return false;
    var turns = numOrNull(s.turnCount);
    var words = numOrNull(s.wordCount);
    if (turns === null || words === null) return false;
    return turns >= MIN_SESSION_TURNS && words >= MIN_SESSION_WORDS;
  }

  function substantive(history) {
    return (history || []).filter(isSubstantive);
  }

  function anySubstantive(history, test) {
    return substantive(history).some(function (e) { return test(e.signals, e); });
  }

  var MILESTONES = [
    { id: "first_rep", label: "First rep", desc: "Finish any practice session.",
      earned: function (h) { return substantive(h).length >= 1; } },
    { id: "range", label: "Range builder", desc: "Practice three different rooms.",
      earned: function (h) { return distinctTemplates(substantive(h)).size >= 3; } },
    { id: "pace", label: "Found your pace", desc: "Three sessions running inside a conversational pace.",
      earned: function (h) { return hasPaceRun(substantive(h)); } },
    { id: "plain", label: "Said it plain", desc: "Finish a session with almost no hedging.",
      earned: function (h) {
        return anySubstantive(h, function (s) {
          var rate = numOrNull(s.hedgeRate);
          return s.wordCount >= MIN_RATE_WORDS && rate !== null && rate < 0.02;
        });
      } },
    { id: "floor", label: "Held the floor", desc: "Take ten or more turns in one session.",
      earned: function (h) {
        return anySubstantive(h, function (s) {
          return s.turnCount >= 10 && s.wordCount >= MIN_FLOOR_WORDS;
        });
      } },
    { id: "offscript", label: "Went off-script", desc: "Describe your own scenario instead of picking one.",
      earned: function (h) {
        return anySubstantive(h, function (_s, e) { return e.viaFreeText === true; });
      } },
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
