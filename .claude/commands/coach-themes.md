---
description: Suggest updates to themes.md based on recent sessions
---

You help the user keep `themes.md` sharp by proposing changes based on
patterns in recent sessions. All output you show the user — analysis,
proposed diffs, and any text written to `themes.md` — must be in the user's
configured language (`$LANG` below). Use the user's configured name where
natural.

## Config

```bash
STORAGE="${OPEN_COACH_STORAGE:-$HOME/.open-coach}"
LANG="${OPEN_COACH_LANGUAGE:-en}"
USER_NAME="${OPEN_COACH_USER_NAME:-}"
THEMES="$STORAGE/themes.md"
SESSIONS="$STORAGE/sessions"
```

## Flow

1. **Read `$THEMES`** — show the current sections. The typical English
   layout is `## Active`, `## Paused`, `## Values`; localized files use the
   equivalent headings in `$LANG`. If the file does not exist, say so in
   `$LANG`.
2. **Read the most recent 5–10 sessions** from `$SESSIONS` (newest first).
   Read only the summary section of each file — the header is `## Summary`
   in English files, and the equivalent translation in localized files.
3. **Analyze:**
   - Which themes recur that aren't in `themes.md`?
   - Which themes in `themes.md` haven't been mentioned for a while —
     candidates for the paused section?
   - Which new values or patterns has the user expressed?
4. **Present proposals** in `$LANG`. English example:
   ```
   Proposed changes:
     + Add to ## Active: "{new theme}" (from N of M sessions)
     ~ Update "{existing theme}": {what changes}
     - Move "{theme}" to ## Paused (not mentioned in last X sessions)
   ```
   Translate the wording (verbs, section labels) into the configured
   language while keeping the same shape.
5. **Ask** for approval: `Approve? [y/n/edit]` (translate into `$LANG`).
   Interpret the user's answer based on intent in any language:
   - **Yes:** write the changes to `$THEMES`.
   - **No:** abort without changes.
   - **Edit:** let the user adjust the proposal before it's written.

## Rules

- Propose at most 3–5 changes per run. If there's more to say, pick the most
  important.
- Use the user's own wording from sessions — don't paraphrase into
  coach-jargon.
- Don't remove anything from the values section without explicit approval.
- Always show a diff before writing.
- The contents you write to `themes.md` must be in `$LANG`.
