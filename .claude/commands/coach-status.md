---
description: Show active themes and the most recent session summary
---

Show the user the current state of the coach. All output must be in the
user's configured language (`$LANG` below).

## Config

```bash
STORAGE="${OPEN_COACH_STORAGE:-$HOME/.open-coach}"
LANG="${OPEN_COACH_LANGUAGE:-en}"
```

## Flow

1. **Themes:** Read `$STORAGE/themes.md` and show the active section. The
   English heading is `## Active`; localized files use the equivalent
   translation. If the file does not exist, say so in `$LANG`.
2. **Prep:** If `$STORAGE/prep-next.md` exists, show its contents under a
   localized "Prep for next session" heading. If not, skip.
3. **Latest session:** Find the newest file in `$STORAGE/sessions/*.md`
   (sorted), and show only the summary section. The English heading is
   `## Summary`; localized files use the equivalent translation. If no
   sessions exist, say so in `$LANG`.

Format the terminal output to be easy to scan. Don't write anything to disk.
All headings and any commentary you add must be in `$LANG`.
