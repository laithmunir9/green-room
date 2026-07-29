# Classroom Simulation — Design Spec

Status: Approved
Date: 2026-07-29

## Goal

Student explains a topic out loud (text-only) to a simulated classroom of AI
peers plus a teacher-agent, who respond dynamically based on what the student
says. Backend logic only for this pass — no speech, no frontend polish. A
throwaway test page is enough to judge whether agent selection *feels* right.

## A. K2 Think V2 client

`.env` already has:
- `K2THINK_API_KEY`
- `K2THINK_BASE_URL=https://api.k2think.ai/v1`

Add a new wrapper in a separate `k2Client.js` module (not inside server.js
itself), exporting `aiK2Messages()`, alongside the existing `aiMessages()` in
server.js (OpenRouter). Same shape: OpenAI-compatible
`POST {base}/chat/completions`, `Authorization: Bearer <key>`, same
`AbortController` timeout pattern already added to `aiMessages`. A parallel
`aiK2Json()` reuses the same fence-stripping/JSON-extraction logic as the
existing `aiJson()`.

Model id: the K2-Think-V2 model card's own example
(`LLM360/K2-Think-V2`, self-hosted vLLM) does not match what the hosted
`api.k2think.ai` endpoint expects — `GET /v1/models` on that host returns
exactly one model, `MBZUAI-IFM/K2-Think-v2`, which is the real default.
Override via a new `K2THINK_MODEL` env var if a different host is ever used.

**Before building anything else**: one throwaway script/route makes a single
real `aiK2Messages()` call and prints the raw response. Implementation does
not proceed past this until it returns a real completion (not an auth/model
error).

## B. Persona pool

New file or section (co-located in curriculum.js style) defining:

```js
export const CLASSROOM_PERSONAS = [
  { id: "curious", name: "Maya", trait: "Curious",
    systemPrompt: "You are Maya, a curious classmate. You ask genuine, short clarifying questions when something the presenting student said is vague, incomplete, or skips a step. You're not testing them, you're trying to actually understand. 1-2 short sentences, casual tone." },
  { id: "skeptical", name: "Ben", trait: "Skeptical",
    systemPrompt: "You are Ben, a mildly skeptical classmate. When something sounds off, contradicts what was said earlier, or seems too certain without justification, you push back gently — 'wait, are you sure about that?' or naming the inconsistency politely. Not hostile, just genuinely unconvinced. 1-2 short sentences." },
  { id: "encouraging", name: "Zoe", trait: "Encouraging",
    systemPrompt: "You are Zoe, a warm, encouraging classmate. When the presenting student seems hesitant or stuck, you reassure them and gently nudge them forward with a small prompt, without taking over the explanation. 1-2 short sentences, warm tone." },
  { id: "quick_learner", name: "Ari", trait: "Quick learner",
    systemPrompt: "You are Ari, a quick-learner classmate. When an explanation is clear and lands well, you signal genuine understanding — 'oh that makes sense', a quick connecting question, or building slightly on the idea. Brief, upbeat, usually 1 short sentence." },
  { id: "distracted", name: "Leo", trait: "Distracted",
    systemPrompt: "You are Leo, a slightly distracted classmate. You've noticed the conversation has drifted away from the topic being explained, and you say so casually, not accusingly — 'wait weren't we talking about {subskillName}?' or admitting you lost the thread. 1 short sentence." },
  { id: "shy_engaged", name: "Nadia", trait: "Shy but engaged",
    systemPrompt: "You are Nadia, a shy but engaged classmate. You don't say much, but when you do it's a small, tentative, genuine contribution — a quiet 'yeah, that helped' or a soft, hesitant question. Very short, understated tone." },
];

export const TEACHER_AGENT = {
  id: "teacher", name: "The Teacher", trait: "Facilitator",
  systemPrompt: "You are the classroom teacher facilitating this session. Your job is not to react like a peer — it's to keep the discussion productive: offer a concrete next step when the student is stuck, redirect if classroom chatter needs steering back to the topic, and explicitly acknowledge when the student has clearly demonstrated understanding. Brief, purposeful, 1-3 sentences."
};
```

Exact wording is refinable during implementation; the trigger mapping and
intent per persona is fixed.

## C. Selection logic — local heuristics, no model call

`classifyStudentMessage(text, ctx)` where `ctx` carries the topic/subskill
keyword set and the last few student messages in this classroom session.
Pure functions, no I/O, easily unit-testable.

Computed signals:
- `wordCount`
- `hedgeCount` — matches against `/\b(kind of|sort of|i think|i guess|maybe|not sure|possibly|probably|i suppose|um+|uh+)\b/gi`
- `stuckPhrase` — `/\b(i don'?t know|not sure|i'?m stuck|confused|no idea|i forget)\b/i`
- `absoluteLanguage` — `/\b(always|never|definitely|certainly|100%|guaranteed)\b/i`
- `selfContradiction` — naive: does this message negate (`not|isn't|doesn't|never|no longer`) something keyword-overlapping with the student's own last 1-3 messages in this session?
- `onTopic` — does the message share any significant word (length > 3, stopwords stripped) with the keyword set built from the focused topic name + subskill name + sibling subskill names in that topic?

Flags derived (priority order, first-match-wins for the *primary* slot, but
multiple can combine up to the 3-responder cap):

1. **shaky** = `selfContradiction` OR (`absoluteLanguage` AND `hedgeCount > 0`) → **skeptical**
2. **hesitant** = `stuckPhrase` (→ **teacher**) OR (`wordCount < 8` AND `hedgeCount > 0`) (→ **encouraging**)
3. **off-topic** = NOT `onTopic` AND `wordCount >= 4` (avoid false-triggering on short acks like "ok"/"yeah") → **distracted**
4. **vague** = `wordCount > 40` OR `hedgeCount >= 2` → **curious**
5. else → **clear/strong** → **quick_learner**

The teacher is a candidate responder like any persona above — it fills one
of the up-to-3 slots, it isn't an always-on 4th voice.

After the priority pick(s), **shy_engaged** has an independent ~15% chance of
being added as a bonus voice (if there's still room under the 3-responder
cap and it isn't already selected) — ambient texture, not trigger-driven, per
your instruction.

**Known limitation, stated plainly**: `shaky`/`selfContradiction` is a
keyword/negation proxy, not real fact-checking — there's no domain-fact
database to check claims against. It'll catch obvious self-contradiction
within the conversation, not subject-matter errors.

## D. Reply generation — one batched K2 call

Once responder persona ids are chosen (1-3 + teacher when triggered), a
single `aiK2Json()` call — system prompt lists each selected persona's
`systemPrompt` plus shared context (topic, subskill, recent conversation
turns), user content is the student's latest message — returns:

```json
{"replies":[{"personaId":"curious","reply":"...","understood":false}]}
```

`understood` mirrors the existing peer-teach JSON contract
(`{"reply":...,"understood":...}` in `/api/chat` peer mode) — quick_learner
and teacher are instructed they may set it `true` when the explanation
clearly lands. This reuses an established pattern rather than inventing a
new signal.

## E. Session & context

`s.classroom` on the student record (parallel to `s.chatPeer`, not the
linear `s.session` queue machine used by assess/learn/exam):

```js
s.classroom = {
  subjectId, boardId, topicId, subskillId,
  topicName, subskillName,
  keywords: string[],  // plain array, not a Set — must stay JSON-serializable
  history: [ { role: "student"|"agent", personaId, text } ],  // capped, like sanitizeChatHistory
  rewardGiven: false,
};
```

`/api/classroom/start` accepts the same `focus`/`normalizeStudyFocus` shape
already used by `/api/chat/peer/start`, so the eventual frontend just reuses
`trackStudyContext()` unchanged — no new context-tracking mechanism.

## F. Mastery tie-in

Reuses the peer-teach reward block's bump formula (`0.35` on first contact,
else `clamp(cur + 0.1, 0, 1)`) and one-time `rewardGiven` flag on
`s.classroom`. Fires when any responder (teacher included) returns
`understood: true`, or when `quick_learner` responds as a genuine signal —
which requires at least 2 student turns in the session so far and the
classifier not simultaneously detecting the student as stuck or vague on this
turn, since `quick_learner` is also the classifier's no-signal fallback and a
bare fallback shouldn't by itself grant mastery. No new scoring mechanism, no
technique-weight side effects (that's peer-chat-specific, not part of this
ask).

## G. Endpoints

**`POST /api/classroom/start`**
Body: `{ studentId, subjectId, boardId, topicId?, subskillId?, focus? }`
Resolves target subskill (reuse `pickTeachTarget`-style logic — weakest
subskill if not specified). Initializes `s.classroom`. Returns the persona
roster (id/name/trait, for the test page to label speakers) and an opening
teacher line.

**`POST /api/classroom/message`**
Body: `{ studentId, text }`
Loads `s.classroom` (400 if none) → append to history → classify → select
1-3 responders → one batched K2 call → clean text
(`cleanStudentText`) → apply mastery reward if triggered → append responses
to history → respond:
```json
{ "responses": [{"personaId":"...","name":"...","reply":"..."}], "reward": null, "student": { ... } }
```

## H. Test harness

`public/classroom-test.html` — standalone, no shared state with the main
SPA's `S` object. Registers a fresh throwaway test student on every use, held
in an in-memory variable only — does not read or write the `tutorToken`
`localStorage` key `index.html` uses, keeping this page fully standalone.
Populates subject/board/topic/subskill
`<select>`s from `/api/catalog` + `/api/student/:id`. A "Start classroom"
button, then a text input and a scrolling log tagged by persona name —
enough to run a real back-and-forth and judge whether selection feels right.
Thrown away in the eventual React migration.

## Out of scope for this pass

- Speech / audio
- Frontend polish or integration into the main SPA
- Technique-weight side effects (peer-chat-specific)
- Any real fact-checking for the "shaky" trigger
