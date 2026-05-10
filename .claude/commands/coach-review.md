---
description: Pattern analysis across multiple coach sessions (week / month)
---

Help the user see patterns across multiple sessions. All output you show
must be in the user's configured language (`$LANG` below).

## Config

```bash
STORAGE="${OPEN_COACH_STORAGE:-$HOME/.open-coach}"
LANG="${OPEN_COACH_LANGUAGE:-en}"
SESSIONS="$STORAGE/sessions"
```

## Arguments

- `week` (default) — sessions from the last 7 days
- `month` — sessions from the last 30 days
- `all` — every session

Accept the equivalent word in any language based on intent.

## Flow

1. **Pick the window:** find sessions in `$SESSIONS` whose filenames match
   the time window (filename format is `YYYY-MM-DD-HHMM.md`).
2. **Read summaries** — only the summary section of each file. The header
   is `## Summary` in English files, and the equivalent translation in
   localized files. Do not load the full transcripts; that's too much.
3. **Analyze:**
   - **Recurring themes** — what comes up in 2+ sessions?
   - **Action items — done?** If an action item from an earlier session
     isn't mentioned later, flag it.
   - **Patterns the user has seen** — from the "patterns" field in each
     summary (header name varies by language).
   - **Patterns the user hasn't seen** — things that recur without them
     noticing. Be careful here — mirror rather than diagnose.
   - **Tone arc** — is the mood across sessions getting heavier / lighter?
4. **Output** in `$LANG`. English example:
   ```
   ## Review {week|month} ({N} sessions: {date} to {date})

   ### Recurring themes
   - ...

   ### Action items
   - ✓ Done / mentioned: ...
   - ⏳ Open: ...

   ### What I notice
   - ... (carefully, mirroring)

   ### Suggestions
   - Topic for next session: ...
   - Possible themes.md changes (suggest /coach-themes if several)
   ```
   Translate the headings into the configured language while keeping the
   same shape.

## Rules

- Don't fabricate themes that aren't there. If nothing clearly recurs, say
  so.
- Don't write anything to disk. This is read-only.
- Use the user's own wording from sessions.
