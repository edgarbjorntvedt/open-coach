# Open Coach

A hands-free Norwegian AI coach using OpenAI's Realtime API. Speak naturally,
get coached with proven techniques (GROW, Socratic questions, intentional
pauses) — no hotkeys, no typing.

## How it works

```bash
$ open-coach
```

1. Loads your themes, prep notes, and recent session summaries from `$OPEN_COACH_STORAGE`
2. Connects to OpenAI Realtime API
3. Coach opens with a contextual greeting in Norwegian
4. You talk freely — VAD detects when you speak, model handles interrupts
5. Session ends on **Ctrl+C**, **30 min hard cap**, or **2 min of silence** (see configs. whichever first)
6. Generates a summary, saves full transcript + summary to your storage folder

**Headset recommended** — without it, your mic picks up the AI voice and
creates feedback.

## Setup

```bash
# 1. System dep — sox (handles both mic capture and playback, cross-platform)
sudo apt install sox libsox-fmt-all       # Linux
brew install sox                          # macOS

# 2. Install
npm install

# 3. Configure
cp .env.example .env
# Edit .env: set OPENAI_API_KEY, point OPEN_COACH_STORAGE at your storage folder

# 4. Run
npm run dev
# or build + link:
npm run build && npm link && open-coach
```

## Storage

Personal data (themes, prep notes, session transcripts) lives in a folder
pointed to by `OPEN_COACH_STORAGE`. This repo holds only code and generic
prompts — the storage folder is yours to manage (back it up however you like).
See [`SPEC.md`](./SPEC.md) for the expected layout.

## Maintenance commands

The app itself only runs conversations. All maintenance happens via slash
commands in Claude Code (in `.claude/commands/`):

- `/coach-prep` — write a prep note before your next session
- `/coach-themes` — review and update your long-running themes
- `/coach-status` — show active themes + last session summary
- `/coach-review` — pattern analysis across sessions (weekly/monthly)

## Stack

- Node.js ≥ 20.6 / TypeScript (ESM, NodeNext)
- OpenAI Realtime API over WebSocket (`ws`)
- `sox` for both mic capture (`rec`) and playback (`play`) — no native npm bindings

## Status

Spec locked, implementation pending. See [`SPEC.md`](./SPEC.md) for the full
design.
