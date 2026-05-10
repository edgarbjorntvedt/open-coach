# Open Coach

A hands-free voice AI coach using OpenAI's Realtime API. Speak naturally,
get coached with proven techniques (GROW, Socratic questions, intentional
pauses) — no hotkeys, no typing.

Conversation language and your name are configurable, so you can make it
feel personal in whatever language you prefer.

## How it works

```bash
$ open-coach
```

1. Loads your themes, prep notes, and recent session summaries from `$OPEN_COACH_STORAGE`
2. Connects to OpenAI Realtime API with a coaching system prompt in your configured language
3. Coach opens with a contextual greeting
4. You talk freely — VAD detects when you speak, model handles interrupts
5. Session ends on **Ctrl+C**, **30 min hard cap**, or **2 min of audio silence** (whichever fires first)
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
# Edit .env — set at minimum:
#   OPENAI_API_KEY=sk-...
#   OPEN_COACH_STORAGE=/path/to/your/storage
#   OPEN_COACH_LANGUAGE=en          # or 'no' for Norwegian
#   OPEN_COACH_USER_NAME=Your Name  # used in prompts and transcript labels

# 4. Run
npm run dev
# or build + link:
npm run build && npm link && open-coach
```

## Configuration

| Variable                       | Default                           | Purpose                                                                |
|-------------------------------|-----------------------------------|------------------------------------------------------------------------|
| `OPENAI_API_KEY`              | —                                 | Required.                                                              |
| `OPEN_COACH_STORAGE`          | `$HOME/.open-coach`               | Where personal data (themes, prep, sessions) lives.                    |
| `OPEN_COACH_LANGUAGE`         | `en`                              | Conversation language. Ships with `en` and `no`; add more via `i18n.ts`.|
| `OPEN_COACH_USER_NAME`        | (locale-specific generic)         | Coach addresses you by this; transcript uses it as your line label.    |
| `OPENAI_REALTIME_MODEL`       | `gpt-4o-realtime-preview`         | Realtime model.                                                        |
| `OPENAI_SUMMARY_MODEL`        | `gpt-4o-mini`                     | Model used for end-of-session summary.                                 |
| `MAX_SESSION_MINUTES`         | `30`                              | Hard cap on session length.                                            |
| `INACTIVITY_TIMEOUT_SECONDS`  | `120`                             | Cutoff after silence on both sides.                                    |

## Adding a language

The system prompts in `prompts/` are written in English and instruct the model to converse in `{{language}}` (substituted at runtime). To add a new language:

1. Add a new entry in `STRINGS` and extend `resolveLocale` in `src/i18n.ts` with the language name (used in prompts), session-file headers, summary field labels, and default user-name fallback.
2. Set `OPEN_COACH_LANGUAGE=<lang>` in your `.env`.

Unknown locales fall back to `en`.

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

These commands respect `OPEN_COACH_LANGUAGE` — they show you output (and
write file content) in the configured language.

## Stack

- Node.js ≥ 20.6 / TypeScript (ESM, NodeNext)
- OpenAI Realtime API over raw WebSocket (`ws`); summary call via built-in `fetch`. No OpenAI SDK.
- `sox` for both mic capture (`rec`) and playback (`play`) — no native npm bindings
