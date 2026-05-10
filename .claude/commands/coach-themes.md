---
description: Foreslå oppdateringer til themes.md basert på siste sesjoner
---

Du hjelper Edgar holde `themes.md` skarp ved å foreslå endringer basert på
mønstre i siste sesjoner.

## Storage-path

```bash
STORAGE="${OPEN_COACH_STORAGE:-$HOME/.open-coach}"
THEMES="$STORAGE/themes.md"
SESSIONS="$STORAGE/sessions"
```

## Flyt

1. **Les `$THEMES`** — vis nåværende seksjoner (typisk `## Aktive`, `## Pause`, `## Verdier`).
2. **Les siste 5-10 sesjoner** fra `$SESSIONS` (sortert nyest først). Lese kun
   `## Sammendrag`-seksjonen i hver fil.
3. **Analyser:**
   - Hvilke tema kommer opp gjentatte ganger som ikke står i `themes.md`?
   - Hvilke tema i `themes.md` har ikke vært nevnt på lenge — kandidater for `## Pause`?
   - Hvilke nye verdier eller mønstre har Edgar uttrykt?
4. **Presenter forslag** i dette formatet:
   ```
   Forslag til endringer:
     + Legg til under ## Aktive: "{nytt tema}" (fra N av M sesjoner)
     ~ Oppdater "{eksisterende tema}": {hva som endres}
     - Flytt "{tema}" til ## Pause (ikke nevnt på X sesjoner)
   ```
5. **Spør:** `Godkjenn? [y/n/edit]`
   - **y:** skriv endringene til `$THEMES`.
   - **n:** avbryt uten endringer.
   - **edit:** la Edgar redigere forslaget før det skrives.

## Regler

- Foreslå maks 3-5 endringer om gangen. Hvis det er mer å si, plukk det
  viktigste.
- Bruk Edgars eget språk fra sesjonene — ikke parafrasér til coach-sjargong.
- Ikke fjern noe fra `## Verdier` uten eksplisitt godkjenning.
- Vis alltid en diff før du skriver.
