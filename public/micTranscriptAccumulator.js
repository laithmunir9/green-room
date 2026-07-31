(function (root) {
  function resultText(result) {
    return (result && result[0] && result[0].transcript ? result[0].transcript : "").trim();
  }

  function createMicTranscriptAccumulator() {
    let sessionSegments = {};
    let transcriptParts = [];

    function reset() {
      sessionSegments = {};
      transcriptParts = [];
    }

    function recordResultEvent(event) {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        sessionSegments[i] = resultText(event.results[i]);
      }
    }

    function flushSession() {
      const indices = Object.keys(sessionSegments).map(Number).sort((a, b) => a - b);
      for (const i of indices) {
        const text = sessionSegments[i];
        if (text) transcriptParts.push(text);
      }
      sessionSegments = {};
    }

    function text() {
      return transcriptParts.join(" ").trim();
    }

    return { reset, recordResultEvent, flushSession, text };
  }

  root.createMicTranscriptAccumulator = createMicTranscriptAccumulator;
})(typeof globalThis !== "undefined" ? globalThis : window);
