---
description: Skriv eller vis prep for neste coach-sesjon
---

Du forvalter prep-fila for Edgars coach-app.

## Storage-path

```bash
STORAGE="${OPEN_COACH_STORAGE:-$HOME/.open-coach}"
PREP="$STORAGE/prep-next.md"
```

Opprett `$STORAGE` hvis den ikke finnes.

## Flyt

1. Hvis `$PREP` finnes — vis innholdet først.
2. Spør: **"Hva vil du prepe for neste sesjon?"** (eller "tøm" for å slette, "behold" for å la den stå).
3. Basert på svaret:
   - **Tekst:** skriv til `$PREP` med format:
     ```markdown
     # Prep for neste sesjon

     {det Edgar sa}
     ```
     Bekreft: `✓ Lagret til $PREP`
   - **"tøm" / "slett":** slett `$PREP`. Bekreft: `✓ Prep tømt.`
   - **"behold":** ikke gjør noe. Bekreft: `→ Beholder eksisterende prep.`

## Regler

- Ikke rør `themes.md` eller noe annet i storage-mappa.
- Ikke parafrasér — skriv det Edgar sa, ordrett. Han kan formatere det selv.
- Hvis Edgar gir flere setninger, behold linjeskiftene.
