---
description: Mønsteranalyse på tvers av flere coach-sesjoner (uke/måned)
---

Hjelp Edgar se mønstre på tvers av flere sesjoner.

## Storage-path

```bash
STORAGE="${OPEN_COACH_STORAGE:-$HOME/.open-coach}"
SESSIONS="$STORAGE/sessions"
```

## Argumenter

- `uke` (default) — siste 7 dagers sesjoner
- `måned` — siste 30 dagers sesjoner
- `alle` — alle sesjoner

## Flyt

1. **Velg vindu:** finn sesjoner i `$SESSIONS` som matcher tidsvinduet (filnavn er `YYYY-MM-DD-HHMM.md`).
2. **Les sammendragene** (kun `## Sammendrag`-seksjonen, ikke full transkripsjon — det blir for mye).
3. **Analyser:**
   - **Gjentakende tema** — hva kommer opp i 2+ sesjoner?
   - **Action items — fullført?** Hvis et action item fra en tidlig sesjon ikke er nevnt senere, flagg det.
   - **Mønstre Edgar selv har sett** — fra `Mønstre`-feltet i sammendrag.
   - **Mønstre Edgar IKKE har sett** — ting som gjentar seg uten at han har lagt merke til det. Vær varsom her — speil heller enn å diagnostisere.
   - **Tone-utvikling** — er stemningen i sesjonene tyngre/lettere over tid?
4. **Output:**
   ```
   ## Review {uke|måned} ({N} sesjoner: {dato} til {dato})

   ### Gjentakende tema
   - ...

   ### Action items
   - ✓ Fullført / nevnt: ...
   - ⏳ Åpne: ...

   ### Det jeg legger merke til
   - ... (forsiktig, speilende)

   ### Forslag
   - Tema å ta opp neste sesjon: ...
   - Eventuelle endringer til themes.md (foreslå /coach-themes hvis flere)
   ```

## Regler

- Ikke fabrikér tema som ikke er der. Hvis ingenting tydelig gjentar seg, si det.
- Ikke skriv noe til disk. Dette er kun en lese-/analyse-kommando.
- Bruk Edgars eget språk fra sesjonene.
