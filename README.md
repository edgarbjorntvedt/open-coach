# Open Coach

A hands-free Norwegian AI coach using OpenAI's Realtime API. Speak naturally,
get coached with proven techniques (GROW, Socratic questions, intentional
pauses) — no hotkeys, no typing.

## How it works

```bash
$ open-coach
```

1. Loads your themes, prep notes, and recent session summaries
2. Connects to OpenAI Realtime API (`gpt-4o-realtime`)
3. Coach opens with a contextual greeting in Norwegian
4. You talk freely — VAD detects when you speak, model handles interrupts
5. **Ctrl+C** ends the session, generates a summary, saves to `journal/coach/`

**Headset recommended** — without it, your mic picks up the AI voice and
creates feedback.

## Maintenance commands

The app itself only runs conversations. All maintenance happens via slash
commands in Claude Code (in `.claude/commands/`):

- `/coach-prep` — write a prep note before your next session
- `/coach-themes` — review and update your long-running themes
- `/coach-status` — show active themes + last session summary
- `/coach-review` — pattern analysis across sessions (weekly/monthly)

## Stack

- Node.js / TypeScript
- OpenAI Realtime API (`gpt-4o-realtime`) over WebSocket
- `sox` for mic capture, `speaker` for audio output
- Requires `OPENAI_API_KEY` in `.env`

## Status

Spec locked, implementation pending. See [`SPEC.md`](./SPEC.md) for the full
design.
