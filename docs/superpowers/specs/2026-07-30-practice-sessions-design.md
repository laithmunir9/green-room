# Scenario Practice Sessions — Design Spec

Status: Approved
Date: 2026-07-30

## Goal

Generalize the classroom simulation into scenario-based "practice sessions."
The student describes a scenario in free text; the system infers the nearest
pre-authored template, the student confirms or overrides it, then practices
against that template's persona roster. No mastery tie-in — sessions are
scored at the end against a 3-dimension coaching rubric instead. This fully
retires the classroom feature (routes, persona pool, test page) rather than
running both side by side.

## A. Roles (generalized from classroom, same trigger semantics)

Same 7-slot structure as the classroom persona pool, two ids renamed for
domain generality — trigger logic is otherwise byte-identical to
`classroomClassifier.js`'s `selectResponders`:

| role id | classroom equivalent | trigger (unchanged) |
|---|---|---|
| `curious` | `curious` | vague/long explanation |
| `skeptical` | `skeptical` | self-contradiction / shaky claim |
| `encouraging` | `encouraging` | short + hesitant |
| `impressed` | `quick_learner` (renamed — not learner-specific) | clear/strong, or classifier's no-signal fallback (same gating as the classroom fix) |
| `distracted` | `distracted` | off-topic |
| `shy_engaged` | `shy_engaged` | ~15% ambient bonus, unchanged |
| `facilitator` | `teacher` (renamed) | explicit stuck/confused phrasing |

This only touches `classroomClassifier.js`'s two hardcoded id strings
(`"teacher"` → `"facilitator"`, `"quick_learner"` → `"impressed"`) and the
file's own two tests that assert those ids. The file is renamed
`practiceClassifier.js`. No other logic in the file changes — it was already
scenario-agnostic (it only ever produced role ids, never referenced anything
classroom-specific in its own code, only in the persona data files it didn't
own).

## B. Templates

5 fixed templates, each supplying a name/personality for all 7 roles. Full
persona prose for all 5 gets authored at plan time (same density as the
classroom pool — real system prompts, not placeholders). One fully worked
example here to set the pattern and tone:

**`exam_viva`** — oral exam / defending an answer to an examiner panel:
- `curious` — an examiner probing for missing detail ("what happens if...?")
- `skeptical` — an examiner pushing back on an unjustified claim
- `encouraging` — a supportive assistant examiner, nudges without solving it for them
- `impressed` — the chief examiner, signals a strong/complete answer
- `distracted` — a panel member who admits they lost the thread, asks to refocus
- `shy_engaged` — a quiet observer, a small tentative follow-up
- `facilitator` — the chair, keeps the viva moving, offers a concrete next step when the candidate is stuck

The other 4, one-line concept each (full rosters authored in the plan,
identical 7-role pattern):
- **`pitch`** — pitching an idea to investors (curious/skeptical/encouraging
  investors, an impressed one, a distracted one checking their phone, a
  quiet one, a moderator)
- **`interview`** — job interview (interviewer panel across the same 7 roles)
- **`public_speech`** — presenting to an audience (audience members across
  the same 7 roles, a host/MC as facilitator)
- **`casual`** — lower-stakes conversational practice, e.g. structuring
  thoughts out loud to a friend group (friends across the same 7 roles; the
  facilitator role reframed as gentle rather than authoritative — "the
  friend helping you find your words," not a chair/examiner figure)

Data shape (`practiceTemplates.js`):
```js
export const PRACTICE_TEMPLATES = {
  exam_viva: {
    id: "exam_viva",
    name: "Exam viva",
    description: "Defending an answer to an examiner panel.",
    personas: [
      { id: "curious", name: "...", trait: "...", systemPrompt: "..." },
      // ...all 7 roles
    ],
  },
  // pitch, interview, public_speech, casual — same shape
};

export const TEMPLATE_IDS = Object.keys(PRACTICE_TEMPLATES);

export function findPersona(templateId, roleId) { /* PRACTICE_TEMPLATES[templateId]?.personas.find(p => p.id === roleId) ?? null */ }
```

## C. Scenario inference

**`POST /api/practice/infer-scenario`**
Body: `{ studentId, description }`.
One `aiK2Json` call — system prompt lists the 5 template ids + one-line
concepts, instructs the model to pick exactly one and explain briefly:
```json
{"templateId":"...", "confidence":"high"|"medium"|"low", "reason":"..."}
```
**Never trust the model to self-enforce the enum**: after parsing, if
`templateId` isn't in `TEMPLATE_IDS`, fall back to `"casual"` (safest
generic default), force `confidence: "low"`, and replace `reason` with a
fixed string explaining the fallback (e.g. "Couldn't confidently match a
specific template — defaulting to casual conversation practice.") rather
than surfacing whatever the model said about a template that doesn't exist.
Response to client includes
the resolved template's name and full persona roster (id/name/trait) so the
student can see who they'd be talking to before confirming, plus the raw
inferred `templateId`/`confidence`/`reason` for display. The student may
call `/api/practice/start` with this `templateId` or a different one they
pick themselves — the inference is advisory, never binding.

## D. Generalized start/message

**`POST /api/practice/start`**
Body: `{ studentId, templateId, description }`. Validates `templateId` is a
real template. No `subjectId`/`boardId`/`topicId`/`subskillId` anywhere in
this feature — fully decoupled from the curriculum data model, per the
approved design call (mastery is gone, and 4 of 5 templates have nothing to
do with exam subjects anyway).

```js
s.practice = {
  templateId,
  templateName,
  description,               // the student's original free-text scenario
  keywords: string[],        // built from `description`, plain array (not a Set)
  history: [],                // same {role, personaId?, text} shape as classroom
  startedAt: new Date().toISOString(),
  endedAt: null,
};
```

**`POST /api/practice/message`**
Body: `{ studentId, text }`. Identical pipeline to
`/api/classroom/message` (classify → select 1-3 responders → one batched
`aiK2Json` call → `cleanStudentText` everywhere → append to history,
capped), except:
- Responders resolve via `findPersona(s.practice.templateId, roleId)`
  instead of the fixed classroom pool.
- The on/off-topic keyword set is built once at `/start` via
  `buildScenarioKeywordSet(description)` — a new small wrapper in
  `practiceClassifier.js` that reuses the exact same tokenizer
  (`significantWords`) the classroom keyword-builder used, just fed from
  free text instead of curriculum topic/subskill names.
- **No mastery/reward logic at all** — that entire block from
  `/api/classroom/message` is deleted, not adapted.

## E. Session end + rubric

**`POST /api/practice/end`**
Body: `{ studentId }`. Requires `s.practice` to exist and have at least one
student turn in history (400 otherwise). No per-turn scoring exists anywhere
in this feature — everything below happens once, here.

**Local, deterministic signals** (new pure functions in
`practiceClassifier.js`, computed by re-running the existing per-turn
classifier over every stored student message in history — no new per-turn
state tracking needed during the session):

```js
export function summarizeDelivery(studentTexts) {
  // studentTexts: string[] — every student turn's raw text
  // aggregates classifyStudentMessage()'s existing hedgeCount/wordCount/vague
  // per message; returns { hedgeRate, rambleRate, turnCount } where
  // hedgeRate = total hedge matches / total words across all turns,
  // rambleRate = fraction of turns where `vague` was true
}

export function summarizeEngagement(studentTexts) {
  // returns { questionRate, turnCount } where questionRate = fraction of
  // turns containing "?" or an invitation phrase
  // (/\?|what do you think|does that make sense|any questions|do you agree/i)
}
```

**Content correspondence** — the "silent evaluator": not a heuristic, a
model judgment. It never appears in the live conversation; it only runs
once, here, reading the *full transcript* plus the original `description`.

**One combined `aiK2Json` call** produces all three dimensions together —
transcript + `description` + the two local signal objects as grounding
inputs, instructed to write short (2-4 sentence), warm, coaching-voice
feedback per dimension, explicitly told not to output any numeric grade:

```json
{"articulation":"...", "engagement":"...", "contentCorrespondence":"..."}
```

Response to client: `{ rubric: {...the three strings...}, raw: {delivery, engagement} }`
(`raw` included for the test harness to display alongside the prose, useful
for judging whether the heuristics feel sane — not shown as a "grade" to a
real end user in any future frontend).

`s.practice.endedAt` is set; the session is not deletable/restartable via
this endpoint (starting a new `/api/practice/start` simply overwrites
`s.practice`, same one-active-session-per-student model as classroom/peer-chat).

## F. What gets removed vs. left alone

Removed entirely: `classroomPersonas.js`, the two `/api/classroom/*` routes
in `server.js`, `public/classroom-test.html`. `classroomClassifier.js` is
renamed to `practiceClassifier.js` (role-id renames + two new summarize
functions added, everything else unchanged) rather than deleted-and-rewritten.
`classroomClassifier.test.js`/`classroomPersonas.test.js` are renamed and
updated accordingly (two test assertions' expected ids change from
`teacher`/`quick_learner` to `facilitator`/`impressed`).

Untouched: the existing `/api/topic/exam/*` MCQ-based "exam practice"
system, diagnose, learn, curriculum.js, questionBank.js — a different,
pre-existing feature, despite the naming overlap with "practice."

## G. Test harness

`public/practice-test.html` replaces `classroom-test.html`. Flow: free-text
scenario box → call `/api/practice/infer-scenario` → show inferred template
name + roster with a "Start" button and a template-override `<select>` →
`/api/practice/start` → same message-loop UI pattern as before → an "End
session" button → `/api/practice/end` → render the 3 rubric paragraphs (and
the raw signal numbers, for your own judgment of whether they feel right).
Standalone, no shared state with `index.html`, same as before.

## Out of scope for this pass

- Real speech/audio (still text-only; "pacing" is explicitly not simulated —
  delivery scoring uses only the text-based proxies above, per the approved
  design call)
- Any curriculum/subject linkage for any template, including exam_viva
- Numeric scoring anywhere in the rubric output
- Backward compatibility with the classroom endpoints (fully retired)
