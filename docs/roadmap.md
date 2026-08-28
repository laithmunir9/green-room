# Prelight Roadmap

## Near-Term Polish

- Add a Presence feedback section to the end-of-session review.
- Keep camera tracking optional and frame it gently: posture, face visibility, and looking-forward estimates, not precise eye tracking.
- Show clear fallback copy when camera tracking is off or unavailable.

## Publishing

- Push the app to GitHub as the source of truth.
- Deploy the current Express app on Render first because it matches the existing server shape.
- Keep Vercel as a future option if the app moves toward a serverless or Next.js-style structure.

## Cloud History

- Add Supabase when session history needs to work across devices and browsers.
- Move students, practice sessions, rubrics, and future presence metrics out of local JSON/localStorage.
- Keep localStorage for lightweight UI preferences such as theme, sound-check status, and selected tab.

## AI Cost Control

- Add a future provider switch instead of hard-migrating away from OpenAI:

```env
AI_PROVIDER=openai
# or
AI_PROVIDER=gemini
```

- Use Gemini Flash or Flash Lite as a cost-saver option for roleplay replies, transcript cleanup, and rubric feedback.
- Keep OpenAI as the quality/fallback provider while comparing output quality.
- Treat speech separately: OpenAI TTS/transcription may stay in place, be disabled for low-cost demos, or be replaced later with browser speech or another provider.
- Document free-tier limits and data-handling differences before enabling Gemini in production.
