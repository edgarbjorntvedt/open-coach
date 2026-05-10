---
description: Vis aktive tema og siste sesjons-sammendrag
---

Vis Edgar status på coachen.

## Storage-path

```bash
STORAGE="${OPEN_COACH_STORAGE:-$HOME/.open-coach}"
```

## Flyt

1. **Themes:** Les `$STORAGE/themes.md` og vis seksjonen `## Aktive`. Hvis fila ikke finnes, si `Ingen themes.md ennå.`
2. **Prep:** Hvis `$STORAGE/prep-next.md` finnes, vis innholdet under overskriften "**Prep for neste sesjon:**". Hvis ikke, hopp over.
3. **Siste sesjon:** Finn nyeste fil i `$STORAGE/sessions/*.md` (sortert), og vis kun `## Sammendrag`-seksjonen. Hvis ingen sesjoner finnes, si `Ingen sesjoner enda.`

Format output i terminalen, lett å lese. Ikke send noe til disk.
