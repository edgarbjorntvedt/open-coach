---
description: Write or show prep for the next coach session
---

You manage the prep file for the user's coach app. All output you show the
user — questions, confirmations, and any text written to disk — must be in
the user's configured language (`$LANG` below). Use the user's configured
name where natural.

## Config

```bash
STORAGE="${OPEN_COACH_STORAGE:-$HOME/.open-coach}"
LANG="${OPEN_COACH_LANGUAGE:-en}"
USER_NAME="${OPEN_COACH_USER_NAME:-}"
PREP="$STORAGE/prep-next.md"
```

Create `$STORAGE` if it does not exist.

## Flow

1. If `$PREP` exists — show its contents first.
2. Ask the user what they want to prep for the next session, in `$LANG`.
   Also tell them they can ask to clear it (delete) or keep it as-is.
   English example: "What do you want to prep for the next session? (or
   'clear' / 'keep')". Translate equivalently for other languages.
3. Interpret the user's answer based on intent (in any language):
   - **Free text:** write to `$PREP` with a heading in `$LANG`. English
     example of the file contents:
     ```markdown
     # Prep for next session

     {what the user said}
     ```
     Translate the heading for the configured language. Confirm in `$LANG`
     (e.g. `✓ Saved to $PREP`).
   - **Clear / delete intent:** delete `$PREP`. Confirm in `$LANG`.
   - **Keep intent:** do nothing. Confirm in `$LANG`.

## Rules

- Don't touch `themes.md` or anything else in the storage folder.
- Don't paraphrase — write what the user said, verbatim. They can format it
  themselves.
- If the user gives multiple sentences, preserve line breaks.
