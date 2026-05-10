#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import { startRecorder } from "./audio/recorder.js";
import { startPlayer } from "./audio/player.js";
import { connectRealtime } from "./realtime.js";
import { buildSystemPrompt } from "./context.js";
import { SessionLogger } from "./session.js";

async function main(): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_REALTIME_MODEL ?? "gpt-4o-realtime-preview";
  const storageDir = process.env.OPEN_COACH_STORAGE ?? join(homedir(), ".open-coach");
  const maxMinutes = parsePositiveInt(process.env.MAX_SESSION_MINUTES, 30);
  const inactivitySec = parsePositiveInt(process.env.INACTIVITY_TIMEOUT_SECONDS, 120);

  await preflight(apiKey, storageDir);

  const instructions = await buildSystemPrompt(storageDir);
  const startedAt = new Date();
  const session = new SessionLogger(storageDir, startedAt);
  await session.start();

  console.log("→ Headset anbefalt — uten får mic-en feedback fra høyttalerne.");
  console.log(`→ Kobler til ${model} ...`);

  const player = startPlayer();
  const recorder = startRecorder();

  let lastActivity = Date.now();
  const touchActivity = () => { lastActivity = Date.now(); };

  let shuttingDown = false;
  const shutdown = async (reason: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n→ Avslutter (${reason}) ...`);
    clearInterval(activityInterval);
    clearTimeout(maxTimer);
    recorder.stop();
    player.stop();
    rt.close();
    try {
      const final = await session.finish(apiKey!);
      console.log(`✓ Lagret: ${final}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`✗ Klarte ikke å fullføre sesjons-fil: ${msg}`);
    }
    process.exit(0);
  };

  const rt = connectRealtime({
    apiKey: apiKey!,
    model,
    instructions,
    events: {
      onReady: () => {
        console.log("✓ Tilkoblet. Snakk i veien. Ctrl+C for å avslutte.\n");
        touchActivity();
      },
      onAudio: (chunk) => {
        player.write(chunk);
      },
      onUserTranscript: (text) => {
        process.stdout.write(`\nDu: ${text}\n`);
        session.appendUser(text);
      },
      onCoachTranscriptDelta: (delta) => {
        process.stdout.write(delta);
        session.appendCoachDelta(delta);
      },
      onCoachTranscriptDone: () => {
        process.stdout.write("\n");
        session.endCoachUtterance();
      },
      onUserSpeechStopped: () => {
        session.noteUserSpeechStopped();
        touchActivity();
      },
      onCoachResponseDone: touchActivity,
      onError: (err) => {
        console.error("\nAPI-feil:", err);
      },
      onClose: (code, reason) => {
        if (!shuttingDown) {
          void shutdown(`WebSocket lukket (${code})${reason ? ` ${reason}` : ""}`);
        }
      },
    },
  });

  recorder.stream.on("data", (chunk: Buffer) => rt.appendAudio(chunk));
  recorder.stream.on("error", (err) => {
    console.error("rec stream error:", err.message);
  });

  const maxTimer = setTimeout(
    () => void shutdown(`hard cap ${maxMinutes} min`),
    maxMinutes * 60 * 1000,
  );

  const activityInterval = setInterval(() => {
    if (Date.now() - lastActivity > inactivitySec * 1000) {
      void shutdown(`inaktivitet ${inactivitySec}s`);
    }
  }, 5_000);

  process.on("SIGINT", () => void shutdown("Ctrl+C"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function die(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

async function preflight(apiKey: string | undefined, storageDir: string): Promise<void> {
  // 1. sox binaries on PATH
  for (const bin of ["rec", "play"]) {
    const r = spawnSync("which", [bin], { stdio: "ignore" });
    if (r.status !== 0) {
      die(`Mangler '${bin}' i PATH. Installer sox: 'sudo apt install sox libsox-fmt-all' (Linux) eller 'brew install sox' (macOS).`);
    }
  }

  // 2. API key
  if (!apiKey || !apiKey.trim()) {
    die("OPENAI_API_KEY er ikke satt. Kjør med 'npm run dev' eller 'node --env-file=.env dist/index.js'.");
  }

  // 3. Storage path writable
  try {
    await mkdir(join(storageDir, "sessions"), { recursive: true });
    const probe = join(storageDir, ".write-probe");
    await writeFile(probe, "ok");
    await unlink(probe);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    die(`Kan ikke skrive til OPEN_COACH_STORAGE (${storageDir}): ${msg}`);
  }

  // 4. Mic available — 50 ms silent capture, discard.
  const micTest = spawnSync("rec", ["-q", "-n", "trim", "0", "0.05"], { stdio: "ignore" });
  if (micTest.status !== 0) {
    console.warn("⚠ Mic-test feilet — fortsetter, men sjekk audio-input hvis sesjonen ikke hører deg.");
  }

  // 5. Audio out — 50 ms tone.
  const playTest = spawnSync("play", ["-q", "-n", "synth", "0.05", "sine", "800"], { stdio: "ignore" });
  if (playTest.status !== 0) {
    console.warn("⚠ Audio-out-test feilet — fortsetter, men sjekk audio-output hvis du ikke hører coachen.");
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
