# Open Coach — Specification

Hands-free AI-coach på norsk med flytende toveis-samtale via OpenAI Realtime API.

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

1. Appen leser `themes.md`, `prep-next.md`, og alle tilgjengelige sesjons-sammendrag fra `$OPEN_COACH_STORAGE`
2. Bygger system prompt med coaching-stil + tema + prep + historikk
3. Kobler til OpenAI Realtime API, sender `session.update` med system prompt
4. Sender `response.create` umiddelbart slik at coachen åpner samtalen
5. Coach åpner kontekstuelt:
   - *"Hei Edgar. Jeg ser du har lagt en lapp om en vanskelig samtale på
     mandag. Vil du starte der, eller har noe annet kommet opp siden?"*

### Under samtalen

- **Helt hands-free** — VAD detekterer når jeg snakker
- Jeg kan **avbryte coachen** ved å begynne å snakke (model interrupt)
- Coachen er instruert til å **bruke pauser bevisst** — fyller ikke all stillhet
- **Live transkripsjon** vises i terminalen (begge sider)
- **Headset anbefalt** — uten får mic-en feedback fra høyttalerne

### Avslutning

Sesjonen avsluttes ved **det første av disse**:

- **Ctrl+C** (manuelt)
- **Hard cap** — `MAX_SESSION_MINUTES` (default 30 min)
- **Inaktivitet** — `INACTIVITY_TIMEOUT_SECONDS` (default 120 sek = 2 min stillhet)

Når sesjonen avsluttes:

- Appen genererer et sammendrag (innsikter, mønstre, action items)
- Lagres som `$OPEN_COACH_STORAGE/sessions/YYYY-MM-DD-HHMM.md` med full
  toveis-transkripsjon + sammendrag på toppen

Appen rører ikke `themes.md` eller `prep-next.md` — vedlikehold (inkl. å
tømme prep etter bruk) er skills sitt ansvar.

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
        │  (OPENAI_REALTIME_MODEL)   │
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

- **Node.js ≥ 20.6** / **TypeScript** (ESM, NodeNext)
- **OpenAI Realtime API** — modell konfigurerbar via `OPENAI_REALTIME_MODEL`
  (default `gpt-4o-realtime-preview`). Realtime API er selve toveis-streaming-laget;
  `sox` er kun OS-audio-glue.
- **Audio inn og ut:** `sox` spawnet som child process — `rec` for mic-capture,
  `play` for avspilling. Cross-platform (Linux/macOS/Windows), ingen native
  npm-bindings, ingen ALSA-/V8-kompileringsproblemer.
- **WebSocket:** `ws` for Realtime-tilkobling
- **Format:** PCM 16-bit, 24kHz mono (Realtime API-krav)
- **Konfig:** Lastes via Nodes innebygde `--env-file=.env`-flag (ingen
  `dotenv`-avhengighet). Se `.env.example` for alle variabler.

### Pris-estimat

- gpt-4o-realtime: ~$0.06/min input + $0.24/min output
- En 30-min sesjon: ~$5-9
- gpt-4o-mini-realtime gir ca 1/4 prisen

---

## Filstruktur

Prosjektet består av to ting:

- **Dette repoet** — kode + generelle prompter
- **En ekstern storage-mappe** — alt personlig: themes, prep, sesjoner

Appen finner storage-mappa via `OPEN_COACH_STORAGE` env-variabel (default
`/tmp/open-coach-storage` slik at appen starter uten oppsett). Hvordan brukeren
backer opp mappa er utenfor appen sitt ansvar.

### Dette repoet

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
│   │   ├── recorder.ts         # mic → PCM stream (sox rec)
│   │   └── player.ts           # PCM stream → speakers (sox play)
│   ├── context.ts              # bygger system prompt fra prompts/ + storage
│   └── session.ts              # transkripsjon + sammendrag-lagring
├── prompts/
│   ├── coaching-system.md      # GROW + sokratiske teknikker (kjerne-prompt)
│   └── session-summary.md      # prompt for å generere sammendrag ved avslutning
├── SPEC.md                     # denne fila
├── README.md
├── package.json
└── tsconfig.json
```

### Storage-mappa (`$OPEN_COACH_STORAGE`)

Forventet layout. Appen oppretter manglende filer/mapper ved første kjøring.

```
$OPEN_COACH_STORAGE/
├── themes.md                   # langvarige tema (manuelt + via /coach-themes)
├── prep-next.md                # prep for neste sesjon (via /coach-prep)
└── sessions/
    └── YYYY-MM-DD-HHMM.md      # full transkripsjon + sammendrag
```

---

## Filer i storage-mappa

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

Frivillig prep før en sesjon. 

```markdown
# Prep for neste sesjon

I dag vil jeg snakke om [...]
```

### `sessions/YYYY-MM-DD-HHMM.md`

Hver sesjon lagres med både **full toveis-transkripsjon** (alt Edgar og coachen
sier) og et generert sammendrag på toppen. Input-transkripsjon gjøres via
Realtime API (`input_audio_transcription`).

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

**Ingen app-side cap på historikk-størrelse.** Hele storage-mappa kan i
prinsippet sendes som kontekst. Det er skills sitt ansvar (`/coach-themes`,
`/coach-review`) å holde `themes.md` skarp og arkivere/komprimere gamle
sesjoner hvis det blir nødvendig.

---

## Project Skills

Alle bor i `.claude/commands/`. Ansvarsdeling: **appen kjører kun samtalen,
skills gjør alt vedlikehold.**

### `/coach-prep`

Eier hele lifecycle for `prep-next.md`: skrive før sesjon, vise hva som ligger
der, eller slette gammelt ikke-relevant innhold. Selve appen rører ikke `prep-next.md`.
`/coach-prep` (eller`/coach-themes` som del av sin post-session-flyt) er det som skriver til `prep-next.md`.

```
> /coach-prep
Hva vil du prepe for neste sesjon?
> Vanskelig samtale med kollega på mandag. Trenger klarhet.
✓ Lagret til $OPEN_COACH_STORAGE/prep-next.md
```

### `/coach-themes`

Leser siste sesjoner, foreslår oppdateringer til `themes.md`, du godkjenner.

```
> /coach-themes
Leser siste 5 sesjoner...

Forslag til endringer:
  + Legg til: "Konflikthåndtering — direkte, ikke-konfronterende samtaler"
    (kommer opp i 3 av 5 sesjoner)
  ~ Oppdater "AI Team reisen": legg til mentoring av juniorer

Godkjenn? [y/n/edit]
```

### `/coach-status`

Vis aktive tema + siste sammendrag i terminalen.

### `/coach-review`

Ukentlig/månedlig mønsteranalyse på tvers av sesjoner.

---

## Implementasjonsplan

Når vi starter koding (i ny sesjon):

1. **Setup:** `npm install` (deps allerede definert: `ws`, `openai` + `tsx`/`typescript`/types). Verifiser at `sox` er installert på systemet (gir både `rec` og `play`). `src/index.ts` må starte med `#!/usr/bin/env node` shebang så `open-coach`-CLI-kommandoen virker etter `npm link`.
2. **Audio I/O:** mic → PCM stream + PCM stream → speakers (verifisere at lyd
   funker før vi kobler til Realtime)
3. **Realtime API client:** WebSocket-tilkobling, audio-streaming, event-håndtering
4. **Context builder:** lese themes + prep + history → bygge system prompt
5. **Session logging:** transkripsjon underveis + sammendrag ved Ctrl+C
6. **Coaching system prompt:** skriv `prompts/coaching-system.md` (GROW + sokratiske teknikker, norsk) og `prompts/session-summary.md`
7. **Project skills:** /coach-prep, /coach-themes, /coach-status, /coach-review
8. **Polish:** terminal-UI med farger, feilhåndtering, headset-warning

### Første milepæl

"Snakk inn i mic → hør coachen svare på norsk → samtalen logges."

Det er 80% av risikoen i prosjektet (audio + Realtime + coaching-prompt).
Resten er filhåndtering og UX-polering.

---

## Åpne spørsmål — utsatt til etter første milepæl

Disse besvares ikke før vi har fått grunnflyten til å fungere ende-til-ende.
Ikke la dem blokkere implementasjon.

- Eksakt format på `themes.md` — vil vi ha YAML-frontmatter for maskinlesing?
- Skal `/coach-review` kobles direkte til life-buddy `/weekly-review`?
- Trenger vi mute-tast likevel hvis noen kommer inn på kontoret?
  (Foreløpig svar: nei, Ctrl+C avslutter.)
- Skal sammendraget lagres som JSON ved siden av markdown for enklere parsing
  i `/coach-review`?
