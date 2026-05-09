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

1. Appen leser `themes.md`, `prep-next.md`, og siste 5 sesjons-sammendrag fra `$OPEN_COACH_STORAGE`
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
- **Audio-inaktivitet** — `INACTIVITY_TIMEOUT_SECONDS` (default 120 sek).
  Definert som ingen audio-aktivitet fra *noen* side. Timer resettes på siste
  bruker-`speech_stopped`-event ELLER siste coach-`response.done`-event —
  det som var sist. Lange tenkepauser midt i en utveksling teller derfor
  ikke alene som inaktivitet; det må være stille i 2 min sammenhengende.
- **WebSocket-drop / nettverksbrudd** — sesjonen avsluttes rent som ved
  Ctrl+C. Ingen automatisk reconnect (state-mismatch på server-side).

#### Krasj-sikker streaming

Transkripsjons-events appendes til `sessions/YYYY-MM-DD-HHMM.md.partial`
underveis (både `conversation.item.input_audio_transcription.completed` og
`response.audio_transcript.delta`). Ved normal avslutning genereres
sammendraget, endelig fil skrives, og `.partial`-fila slettes.

Hvis appen krasjer eller mister strøm midt i en sesjon: `.partial`-fila
overlever på disk og kan promoteres til full sesjon manuelt eller via en
egen skill senere. Aldri en hel sesjon tapt fordi prosessen døde.

#### Lagring

- Endelig fil: `$OPEN_COACH_STORAGE/sessions/YYYY-MM-DD-HHMM.md` med full
  toveis-transkripsjon + sammendrag (innsikter, mønstre, action items) på toppen
- Appen rører ikke `themes.md` eller `prep-next.md` — vedlikehold (inkl. å
  tømme prep etter bruk) er skills sitt ansvar

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

- VAD, interrupt og toveis lyd innebygd — én WebSocket i stedet for tre
- 300-800ms latency føles som ekte samtale
- Tradeoff: ikke Claude, men GPT-4o duger med riktig system prompt

### Stack

- **Node.js ≥ 20.6** / **TypeScript** (ESM, NodeNext)
- **OpenAI Realtime API** — modell konfigurerbar via `OPENAI_REALTIME_MODEL`
  (default `gpt-4o-realtime-preview`). Realtime API er selve toveis-streaming-laget;
  `sox` er kun OS-audio-glue.
- **Audio inn og ut:** `sox` spawnet som child process — `rec` for mic-capture,
  `play` for avspilling. Cross-platform (Linux/macOS/Windows), ingen native
  npm-bindings, ingen ALSA-/V8-kompileringsproblemer.
- **WebSocket:** `ws` direkte mot Realtime-endepunktet (ingen OpenAI-SDK).
  Sammendrags-genereringen ved sesjon-slutt går via Nodes innebygde `fetch`
  mot `/v1/chat/completions`. Bevisst valg for å eie event-shapen og holde
  dependency-flaten flat.
- **Format:** PCM 16-bit, 24kHz mono (Realtime API-krav)
- **Turn detection:** `semantic_vad` med `eagerness: low`. Validert i spike —
  tolererer tenkepauser midt i en setning på norsk uten at coach hopper inn.
- **Konfig:** Lastes via Nodes innebygde `--env-file=.env`-flag (ingen
  `dotenv`-avhengighet). Se `.env.example` for alle variabler.

## Filstruktur

Kode + generelle prompter ligger i dette repoet. Personlig data (themes, prep,
sesjoner) ligger i en ekstern mappe pekt på via `OPEN_COACH_STORAGE` —
default `$HOME/.open-coach`, opprettes ved første kjøring.

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

Langvarig fritekst-markdown Edgar eier. Coach leser hver sesjon. Typisk struktur:
`## Aktive`, `## Pause`, `## Verdier`.

### `prep-next.md`

Frivillig prep før en sesjon. 

```markdown
# Prep for neste sesjon

I dag vil jeg snakke om [...]
```

### `sessions/YYYY-MM-DD-HHMM.md`

Hver sesjon lagres med både **full toveis-transkripsjon** (alt Edgar og coachen
sier) og et generert sammendrag på toppen. Begge sider transkriberes via
Realtime API: bruker via `input_audio_transcription`, coach via
`response.audio_transcript.delta`.

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

Eier hele lifecycle for `prep-next.md` (skrive, vise, slette).

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

0. **Pre-flight checks** (kjøres ved hver oppstart, før noe annet):
   - `which rec && which play` — sox-binærer finnes
   - `OPENAI_API_KEY` satt og ikke-tom (lett HEAD-call mot `/v1/models` for å validere — valgfritt)
   - Storage-path skrivbar (mkdir -p + skriv-test-fil + slett)
   - Mic tilgjengelig (kort stille `rec`-test, < 100ms)
   - Audio-out fungerer (kort "ding" via `play`)
1. **Setup:** `npm install` (eneste runtime-dep er `ws`; resten er TS-toolchain). Verifiser at `sox` er installert (gir både `rec` og `play` — på Linux trengs `libsox-fmt-all`). `src/index.ts` må starte med `#!/usr/bin/env node` shebang så `open-coach`-CLI-kommandoen virker etter `npm link`.
2. **Audio I/O:**
   - **2a:** Sox-loopback-test — `rec | play` direkte (snakk inn, hør deg selv 1-2s senere). Isolerer audio-stack 100% fra Realtime-stack.
   - **2b:** PCM-streams til/fra TypeScript via stdin/stdout pipes på sox-subprosessene.
3. **Realtime API client:** WebSocket-tilkobling (`ws`), audio-streaming, event-håndtering.
4. **Context builder:** lese themes + prep + history → bygge system prompt
5. **Session logging:** ferdigstille `.partial` → endelig sesjon-fil + sammendrag ved avslutning
6. **Coaching system prompt:** skriv `prompts/coaching-system.md` (GROW + sokratiske teknikker, norsk) og `prompts/session-summary.md`
7. **Project skills:** /coach-prep, /coach-themes, /coach-status, /coach-review
8. **Polish:** terminal-UI med farger, feilhåndtering, headset-warning

### Første milepæl

"Snakk inn i mic → hør coachen svare på norsk → samtalen logges."

Det er 80% av risikoen i prosjektet (audio + Realtime + coaching-prompt).
Resten er filhåndtering og UX-polering.

