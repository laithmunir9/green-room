# Progress Spine & Curtain Call — Design Spec

Status: Approved
Date: 2026-08-02
Branch: `feat/progress-spine-curtain-call`

## Goal

Make progress visible without introducing grades, and give the end of a
session one memorable moment.

Three changes, one causal chain:

1. Persist the measured signals the server already computes and the client
   currently discards.
2. Rebuild the History tab around those signals, and rebuild Career Path
   milestones on evidence instead of attendance.
3. Add a "curtain call" card to the end-of-session review that quotes the
   student's own best sentence back to them.

Plus one removal: the redundant "Recently" strip on the practice picker.

## Non-Goals

- No numeric scores, grades, or rankings anywhere. See "The wording rule."
- No server-side history storage. localStorage stays the store of record for
  this change; Supabase remains a separate future project per `docs/roadmap.md`.
- No public landing page, facilitator view, or pacing settings. Those were
  scoped out as a later project ("Open the doors").
- No changes to the practice loop itself — mic, camera, slides, personas, and
  the three-dimension rubric prose are untouched.

## The wording rule

**Every number surfaced to a student describes what happened. No number
ranks the student.**

- Allowed: "Between 128 and 147 wpm across your last 5 spoken sessions."
- Not allowed: "Your pace improved," "3/5," "above average," "needs work."

This is what lets the review screen keep printing *"no scores, just notes to
build on"* (`public/index.html:1706`) honestly while charts exist elsewhere in
the app. It also preserves the existing server instruction *"Never output a
numeric score or grade"* (`server.js:409`), which stays in the prompt unchanged.

Any future copy added to the trend panel must satisfy this rule.

## A. Signal persistence

`/api/practice/end` already returns `raw: { delivery, engagement }`
(`server.js:445`). `endPracticeSession()` (`public/index.html:1679`) reads
`j.rubric` and drops `j.raw`.

`pushSessionHistory()` gains one field:

```js
signals: {
  turnCount:      j.raw?.delivery?.turnCount      ?? null,
  hedgeRate:      j.raw?.delivery?.hedgeRate      ?? null,
  rambleRate:     j.raw?.delivery?.rambleRate     ?? null,
  avgWpm:         j.raw?.delivery?.avgWpm         ?? null,
  pacedTurnCount: j.raw?.delivery?.pacedTurnCount ?? null,
  questionRate:   j.raw?.engagement?.questionRate ?? null,
}
```

Notes:

- `turnCount` is present in both summaries with the same value; take
  `delivery`'s.
- `rambleRate` and `questionRate` are persisted but not charted in this
  project. They are stored so a later change can use them without a data gap.
- No server change. No new request.

### Ordering

`pushSessionHistory` uses `unshift` (`public/index.html:670`), so the stored
array is **newest-first**. All charts render oldest → newest left to right and
must reverse before plotting. The existing 20-entry cap is unchanged; trends
therefore cover at most the last 20 sessions.

### Migration

Entries written before this change have no `signals` key.

- Every trend filters to entries where its own metric is a finite number.
  Older entries fall out of charts and keep rendering as history cards.
- `avgWpm` is `null` whenever the student typed instead of speaking
  (`practiceClassifier.js:104`), so the pace trend counts spoken sessions only.
- A trend row renders its chart at **3 or more qualifying sessions**. Below
  that the row renders its label and a single line stating what will appear
  there — never an empty or single-point chart.

No migration script. No version field. Absence of `signals` is the only
signal needed.

## B. History tab

`fullHistoryHtml()` (`public/index.html:1024`) gains a trend panel above the
existing card list. The card list itself is unchanged except as noted in
section D.

Three rows. Each row is a label, a sparkline, and one sentence.

| Row | Metric | Sentence shape |
|---|---|---|
| Pace | `avgWpm` | "Between {min} and {max} wpm across your last {n} spoken sessions." |
| Hedging | `hedgeRate` | "Hedge words — *kind of*, *maybe*, *I think* — were about {pct}% of what you said." |
| Turn-taking | `turnCount` | "You spoke {last} times last session; your average is {mean}." |

Below-threshold copy, per row:

| Row | Copy when fewer than 3 qualifying sessions |
|---|---|
| Pace | "Speak in a few more sessions and your pace will show up here." |
| Hedging | "A few more sessions and your hedging pattern will show up here." |
| Turn-taking | "A few more sessions and your turn-taking will show up here." |

Empty state: when **no** row qualifies and there are no history entries at
all, the existing `rm-empty-state` block (`public/index.html:1026`) renders
alone and the trend panel is omitted entirely. When there are entries but no
row qualifies, the panel renders with all three below-threshold lines.

`pct` is `hedgeRate * 100` rounded to one decimal. `mean` is rounded to the
nearest whole number.

## C. Career Path

`getCareerLevel()` (`public/index.html:884`), `careerProgress()`
(`public/index.html:892`), and `CAREER_MILESTONES` (`public/index.html:868`)
are replaced. Four of the six current milestones test attendance only — a
student who abandoned eight sessions after two minutes each earns "Pressure
proof."

New milestones. Each is a predicate over the history array:

| Label | Description shown | Predicate |
|---|---|---|
| First rep | Finish any practice session. | `history.length >= 1` |
| Range builder | Practice three different rooms. | `distinctTemplates(history).size >= 3` |
| Found your pace | Three sessions running inside a conversational pace. | filter history to spoken entries (`avgWpm` is a finite number), order chronologically, then look for 3 adjacent entries in *that filtered list* all with `avgWpm` between 120 and 160 inclusive. Typed sessions in between do not break the run. |
| Said it plain | Finish a session with almost no hedging. | any entry with `hedgeRate < 0.02` |
| Held the floor | Take ten or more turns in one session. | any entry with `turnCount >= 10` |
| Went off-script | Describe your own scenario instead of picking one. | any entry with `viaFreeText === true` |

`distinctTemplates()` (`public/index.html:888`) is reused as-is.

### Two supporting changes

**`viaFreeText` must be persisted.** `S.viaFreeText` exists in client state
(`public/index.html:651`) but is not written to history. Add it to the
`pushSessionHistory` call. Entries predating this change lack the field;
`=== true` treats them as false, which is correct — it under-counts rather
than fabricating a badge.

**Milestones are unordered.** The current UI numbers nodes `1..n` and treats
them as a sequence (`public/index.html:1010-1018`), which the new predicates
do not form — "Said it plain" can land before "Range builder." The node
marker becomes ✓ when earned and an empty circle when not. Remove the ordinal
number; it would encode an order that does not exist.

`rm-next-step` (`public/index.html:1020`) shows the first unearned milestone in
list order, phrased as an invitation rather than a sequence position:
"Not yet: {label} — {desc}". If all are earned it shows
"Every milestone earned. Keep practicing."

### Level card

The picker header level card (`public/index.html:938`) currently shows
`Math.floor(sessions / 3) + 1`. It becomes the earned-badge count:

```
Badges
{earned}
of {total}
```

`getSessionCount()` / `incrementSessionCount()`
(`public/index.html:575-582`) stay as they are — the header user stat still
counts sessions, and that counter can exceed `history.length` because history
caps at 20. Milestone predicates read history, never the counter.

**Expected consequence:** after this change a returning student may show fewer
badges than their old level number. This is intended — the new number reflects
things they did rather than times they showed up — but it is a visible
regression in the number on first load, and should not be treated as a bug.

## D. Curtain call

### Server

The end-of-session system prompt (`server.js:405`) gains a request for two
additional JSON fields, and the response shape becomes:

```json
{"articulation":"...","engagement":"...","contentCorrespondence":"...",
 "bestLine":"...","whyItLanded":"..."}
```

- `bestLine` — the single strongest sentence the student actually said,
  copied **verbatim** from their turns in the transcript.
- `whyItLanded` — one sentence, in the coach's voice, on what made it work.

The prompt instructs that `bestLine` must be copied exactly and never
paraphrased, tidied, or composed, and that both fields must be `null` when the
student said too little for any sentence to stand out.

### Two safeguards

**1. Verbatim validation (server-side, after parsing).** Normalize both the
returned `bestLine` and the concatenated student turns — lowercase, collapse
whitespace, strip surrounding quotes and trailing punctuation — then confirm
the normalized `bestLine` occurs as a substring of the normalized transcript.
If it does not, set `bestLine` and `whyItLanded` to `null` and log a warning.

Rationale: showing a student a polished sentence they never said, in a product
whose purpose is confidence in their own voice, is a worse outcome than
omitting the feature. Validation failure is silent to the student.

**2. Minimum substance.** If the student produced fewer than 2 turns, or fewer
than 15 words total across all their turns, the server sets `bestLine` and
`whyItLanded` to `null` regardless of what the model returned. There is no best
line in "yeah" and "I guess."

This is a post-response override, not a second prompt variant: the rubric and
the curtain call come from the same single model call, and the prompt always
requests all five fields. The gate is evaluated on the student's turns before
the response is assembled, and short sessions simply never reach validation.

The three rubric fields are unaffected by either safeguard. A `null` curtain
call never blocks or degrades the rubric response.

### Client

`renderPracticeEnd()` (`public/index.html:1699`) renders the card above the
rubric blocks when `bestLine` is a non-empty string, and renders exactly
today's screen otherwise. No error message, no empty state, no placeholder.

Layout:

```
┌────────────────────────────────────────────┐
│  WHAT THE HIRING MANAGER HEARD             │  eyebrow
│                                            │
│  "I don't have three years in this         │  Fraunces 22px
│   stack, but I shipped the migration       │
│   at my last job in six weeks."            │
│                                            │
│  You answered the gap head-on instead      │  Plex 13.5px
│  of talking around it.                     │
└────────────────────────────────────────────┘
```

The eyebrow names who was in the room, derived from the practice template —
e.g. "What the hiring manager heard," "What the panel heard." Each entry in
`CARD_TEMPLATES` (`public/index.html:857`) gains a `listener` string, and the
eyebrow reads `What the ${listener} heard`. Free-text sessions and any template
without a `listener` fall back to "What the room heard." Client-side only; no
change to `practiceTemplates.js`.

`bestLine` is also persisted to history. The History card
(`public/index.html:1033`) leads with the quote when present and falls back to
the existing `takeaway` otherwise. `takeaway` continues to be computed and
stored either way, so no card can render empty.

## E. Practice picker cleanup

- Delete `sessionHistoryHtml()` (`public/index.html:910-923`).
- Delete its call site, the trailing `${sessionHistoryHtml()}` in
  `practicePickerHtml()` (`public/index.html:998`).
- Delete CSS `public/index.html:296-308` only — `.rm-history`,
  `.rm-history-label`, `.rm-history-row`, and the `::before` and child
  selectors within that range.

**Do not delete `public/index.html:341-354.`** `.rm-history-list` and
`.rm-history-card*` are the History tab and must survive. The near-identical
class prefixes make over-deletion the likeliest error in this task. Note that
`.rm-history-card::before` shares a rule with `.rm-empty-state::before`
(`public/index.html:343`); that rule stays.

Nothing replaces the strip. The picker ends on the freeform box.

## F. Visual direction

Works inside the existing token system. No new colors, no new typefaces.
`--rm-teal`, `--rm-sage`, `--rm-tan` on `--rm-bg`; Fraunces for names and
quoted voice, IBM Plex for everything else. Both themes are already covered
because every value below is an existing token that flips in the dark-mode
block (`public/index.html:186-195`).

### Signature: charts drawn by a shaky hand

Trend polylines route through the existing `sketchWobble` turbulence filter
(`public/index.html:488`) already used on buttons and panel borders.

The argument: a crisp analytics line tells a student they are being measured;
a line that wobbles tells them practice is imperfect, which is the premise of
the product. The medium carries the thesis. This is the one deliberate
aesthetic risk in the project and the boldness budget is spent here.

### Sparkline spec

- Inline SVG, ~140 × 36px, single `polyline`.
- Stroke `var(--rm-teal)`, 2px, `fill: none`, `filter: url(#sketchWobble)`.
- **No axes, no gridlines, no tick labels, no value labels.**
- Final data point: `circle` r=3, filled `var(--rm-tan)` — where you are now.
- Pace row only: a `rect` spanning the 120–160 wpm range, `var(--rm-sage)` at
  ~0.15 opacity, behind the line. A band, not a target line — a target line is
  a grade with extra steps. It carries no label; the sentence explains it.
- Y range is the min/max of the plotted series with ~10% padding, computed per
  row. Not a fixed scale.

### Restraint rules

- **The chart shows shape; the sentence gives the numbers.** Neither repeats
  the other. This is what keeps the panel from reading as a dashboard.
- **No draw-on or entrance animation**, on any row, under any motion
  preference. Three lines animating in on tab switch is the clearest tell of a
  machine-made page. Nothing here animates, so there is no
  `prefers-reduced-motion` branch to write for the charts.
- **Fraunces does not appear in the trend panel.** It is the voice of headings
  and of the student's own quoted words; letting it into data dilutes what it
  signals. Row labels reuse the existing utility style — 11.5px, weight 700,
  uppercase, `.08em` tracking, `--rm-muted`. Sentences are Plex 13.5px,
  `--rm-ink`.

### Curtain call styling

The one place type gets loud. Quote in Fraunces ~22px on `--rm-panel` with the
existing sketch border treatment, `--rm-tan` as accent. Eyebrow in the utility
label style. `whyItLanded` in Plex 13.5px, `--rm-muted`.

### Accessibility

- Each sparkline SVG carries `role="img"` and an `aria-label` equal to its
  sentence. The visual encodes nothing the sentence does not, so screen reader
  users lose no information.
- The trend panel is static content, introducing no new focusable elements and
  no changes to existing keyboard behavior.
- Contrast: `--rm-teal` on `--rm-panel` and `--rm-ink` on `--rm-panel` are
  already in use for text at these sizes in both themes.

## Testing

Existing suite is `node --test *.test.js` over root-level modules. Client code
lives in a single HTML file and is not currently unit-tested; this project does
not change that.

**Extract to a testable module:** `curtainCall.js` at the repo root, following
the pattern of `transcriptAsrCorrections.js`. It exports two pure functions —
one that validates a `bestLine` against the student's turns, one that decides
whether a transcript clears the substance gate — and `server.js` imports both.

`curtainCall.test.js` covers:

- Validation: exact match; case and whitespace differences; surrounding quotes;
  trailing punctuation; a paraphrase that must fail; `null` input; empty
  transcript.
- Substance gate: under 2 turns; under 15 words; and the boundaries at exactly
  2 turns and exactly 15 words, both of which pass.

**Manual verification** for the rest, in both light and dark mode:

1. History with 0 entries — empty state only, no trend panel.
2. History with 2 entries — panel renders, all three below-threshold lines.
3. History with 5+ spoken entries — three charts, sentences match the data,
   pace band visible.
4. Mixed history where older entries lack `signals` — charts render from the
   newer entries, older ones still appear as cards.
5. Typed-only sessions — pace row stays below-threshold while the other two
   rows chart.
6. A session ending with a valid curtain call, and one ending with `bestLine`
   null — second renders today's screen unchanged.
7. Practice picker no longer shows the strip; History tab cards still render
   with full styling.

## Files touched

| File | Change |
|---|---|
| `public/index.html` | Signal + `viaFreeText` + `bestLine` persistence; trend panel; milestone rewrite; level card; curtain call card; `listener` on `CARD_TEMPLATES`; strip removal; CSS for trends and curtain call |
| `server.js` | Prompt fields; calls into `curtainCall.js` for validation and gating |
| `curtainCall.js` (new) | Verbatim validation + substance gating, extracted for tests |
| `curtainCall.test.js` (new) | Tests for the above |

`practiceClassifier.js` is not modified — it already produces every signal
this project consumes.
