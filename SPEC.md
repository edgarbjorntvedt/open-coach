# Open Coach — Specification

Push-to-talk... nei, faktisk **hands-free** AI-coach på norsk med flytende
toveis-samtale.

Status: Spec lukket 2026-05-09. Klar for implementasjon.

---

## Visjon

En personlig AI-coach jeg kan snakke med naturlig — som en telefonsamtale.
Coachen bruker gode coaching-teknikker (GROW, sokratiske spørsmål, bevisste
pauser), husker hva vi har jobbet med, og hjelper meg reflektere uten å
hoppe til løsninger for tidlig.

---

## Brukeropplevelse

### Oppstart

```bash
$ open-coach
```

1. Appen leser `themes.md`, `prep-next.md`, og siste 5 sesjons-sammendrag
2. Bygger system prompt med coaching-stil + tema + prep + historikk
3. Kobler til OpenAI Realtime API
4. Coach åpner samtalen kontekstuelt:
   - *"Hei Edgar. Jeg ser du har lagt en lapp om en vanskelig samtale på
     mandag. Vil du starte der, eller har noe annet kommet opp siden?"*

### Under samtalen

- **Helt hands-free** — VAD detekterer når jeg snakker
- Jeg kan **avbryte coachen** ved å begynne å snakke (model interrupt)
- Coachen er instruert til å **bruke pauser bevisst** — fyller ikke all stillhet
- **Live transkripsjon** vises i terminalen (begge sider)
- **Headset anbefalt** — uten får mic-en feedback fra høyttalerne

### Avslutning

- **Ctrl+C** avslutter sesjonen
- Appen genererer et sammendrag (innsikter, mønstre, action items)
- Lagres som `journal/coach/sessions/YYYY-MM-DD-HHMM.md`
- Tømmer `prep-next.md` hvis den ble brukt

### Hva coachen IKKE gjør

- Avbryter ikke når jeg tenker
- Fyller ikke pauser med småprat
- Gir ikke råd uoppfordret — bruker spørsmål og refleksjon
- Hopper ikke til løsninger for tidlig
- Redigerer ikke themes.md eller prep-next.md (det skjer via skills, utenfor sesjon)

---

## Coaching-stil

System prompt vil kodifisere:

- **GROW-modell** (Goal, Reality, Options, Will) som ramme
- **Sokratiske, åpne spørsmål** ("Hva tenker du om...?", "Hva ville skjedd hvis...?")
- **Speiling og refleksjon** — gjenta kjernen i det jeg sier
- **Stillhet som verktøy** — pauser er ok, ikke fyll dem
- **Ikke-dømmende, varm tone**
- **Norsk språk** gjennom hele samtalen

---

## Arkitektur

```
   Mikrofon ──┐                    ┌── Høyttalere
              │                    │   (helst headset)
              ▼                    ▲
        ┌────────────────────────────┐
        │  OpenAI Realtime API       │
        │  (gpt-4o-realtime)         │
        │                            │
        │  - VAD                     │
        │  - Interrupt handling      │
        │  - Native audio in/out     │
        │  - System prompt: coach    │
        └────────────────────────────┘
              │
              ▼
        Live transkripsjon
        (terminal + lagres til fil)
```

### Hvorfor Realtime API (ikke separat STT/TTS/LLM)

- Bygget for nøyaktig denne use casen (toveis lyd, lav latency)
- VAD og interrupt er innebygd
- Latency 300-800ms — føles som ekte samtale
- Mindre plumbing: én WebSocket
- Tradeoff: vi mister Claude som hjerne, men GPT-4o duger godt for coaching
  med riktig system prompt

### Stack

- **Node.js / TypeScript**
- **OpenAI Realtime API** — `gpt-4o-realtime`
- **Audio:** `sox`/`arecord` for mic, `speaker` npm-pakke eller `ffplay` for output
- **WebSocket:** `ws` for Realtime-tilkobling
- **Format:** PCM 16-bit, 24kHz mono (Realtime API-krav)

### Pris-estimat

- gpt-4o-realtime: ~$0.06/min input + $0.24/min output
- En 30-min sesjon: ~$5-9
- gpt-4o-mini-realtime gir ca 1/4 prisen

---

## Filstruktur

```
open-coach/
├── .claude/
│   └── commands/
│       ├── coach-prep.md       # /coach-prep
│       ├── coach-themes.md     # /coach-themes
│       ├── coach-status.md     # /coach-status
│       └── coach-review.md     # /coach-review
├── src/
│   ├── index.ts                # orchestrator + state machine
│   ├── realtime.ts             # OpenAI Realtime WebSocket client
│   ├── audio/
│   │   ├── recorder.ts         # mic → PCM stream
│   │   └── player.ts           # PCM stream → speakers
│   ├── context.ts              # bygger system prompt fra themes + prep + history
│   ├── session.ts              # transkripsjon + sammendrag-lagring
│   └── coaching-prompt.ts      # GROW + sokratiske teknikker (system prompt)
├── journal/
│   └── coach/
│       ├── themes.md           # langvarige tema (manuelt + via /coach-themes)
│       ├── prep-next.md        # prep for neste sesjon (via /coach-prep)
│       └── sessions/
│           └── YYYY-MM-DD-HHMM.md
├── SPEC.md                     # denne fila
├── README.md
├── package.json
└── tsconfig.json
```

---

## Filer i `journal/coach/`

### `themes.md`

Langvarig dokument Edgar eier. Coach leser hver sesjon.

```markdown
# Tema jeg jobber med

## Aktive
- **AI Team Lead-reisen** — bygge teamet rundt agent-coding
- **Energi og dyp jobbing** — beskytte 7-9am
- **Far/sønn-balanse** — være tilstede med 13- og 15-åringen

## Pause
- ~~Saunaprosjekt~~ — ferdig

## Verdier som styrer
- Progresjon over perfeksjon
- Bashar's 5-stegs formel
- Ikke-dømmende observasjon
```

### `prep-next.md`

Frivillig prep før en sesjon. Tømmes etter bruk.

```markdown
# Prep for neste sesjon

I dag vil jeg snakke om [...]
```

### `sessions/YYYY-MM-DD-HHMM.md`

```markdown
# Coach-sesjon 2026-05-09 19:34

## Sammendrag
- Tema: ...
- Innsikter: ...
- Action items: ...

## Full transkripsjon
Coach: Hei Edgar...
Edgar: ...
```

---

## Project Skills

Alle bor i `.claude/commands/`. Ansvarsdeling: **appen kjører kun samtalen,
skills gjør alt vedlikehold.**

### `/coach-prep`

Skriv prep-notat før neste sesjon.

```
> /coach-prep
Hva vil du prepe for neste sesjon?
> Vanskelig samtale med kollega på mandag. Trenger klarhet.
✓ Lagret til journal/coach/prep-next.md
```

### `/coach-themes`

Leser siste sesjoner, foreslår oppdateringer til `themes.md`, du godkjenner.

```
> /coach-themes
Leser siste 5 sesjoner...

Forslag til endringer:
  + Legg til: "Konflikthåndtering — direkte, ikke-konfronterende samtaler"
    (kommer opp i 3 av 5 sesjoner)
  ~ Oppdater "AI Team Lead-reisen": legg til mentoring av juniorer
  - Flytt "Saunaprosjekt" til Pause (ikke nevnt på 3 uker)

Godkjenn? [y/n/edit]
```

### `/coach-status`

Vis aktive tema + siste sammendrag i terminalen.

### `/coach-review`

Ukentlig/månedlig mønsteranalyse på tvers av sesjoner.
Kan kobles til life-buddy sitt `/weekly-review` senere.

---

## Implementasjonsplan

Når vi starter koding (i ny sesjon):

1. **Setup:** TypeScript + dependencies (ws, openai, sox-wrapper, speaker)
2. **Audio I/O:** mic → PCM stream + PCM stream → speakers (verifisere at lyd
   funker før vi kobler til Realtime)
3. **Realtime API client:** WebSocket-tilkobling, audio-streaming, event-håndtering
4. **Context builder:** lese themes + prep + history → bygge system prompt
5. **Session logging:** transkripsjon underveis + sammendrag ved Ctrl+C
6. **Coaching system prompt:** GROW + sokratiske teknikker, norsk
7. **Project skills:** /coach-prep, /coach-themes, /coach-status, /coach-review
8. **Polish:** terminal-UI med farger, feilhåndtering, headset-warning

### Første milepæl

"Snakk inn i mic → hør coachen svare på norsk → samtalen logges."

Det er 80% av risikoen i prosjektet (audio + Realtime + coaching-prompt).
Resten er filhåndtering og UX-polering.

---

## Åpne spørsmål til neste sesjon

- Eksakt format på `themes.md` — vil vi ha YAML-frontmatter for maskinlesing?
- Skal `/coach-review` kobles direkte til life-buddy `/weekly-review`?
- Trenger vi mute-tast likevel hvis noen kommer inn på kontoret?
  (Foreløpig svar: nei, Ctrl+C avslutter.)
- Skal sammendraget lagres som JSON ved siden av markdown for enklere parsing
  i `/coach-review`?
