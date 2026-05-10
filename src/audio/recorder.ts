import { spawn } from "node:child_process";
import type { Readable } from "node:stream";

// PCM 16-bit signed, 24 kHz, mono, little-endian — required by Realtime API.
const SOX_RAW_PCM_24K_MONO = [
  "-q", "-t", "raw", "-r", "24000", "-b", "16", "-c", "1",
  "-e", "signed-integer", "-L", "-",
];

export interface Recorder {
  stream: Readable;
  stop: () => void;
}

export function startRecorder(): Recorder {
  const proc = spawn("rec", SOX_RAW_PCM_24K_MONO, {
    stdio: ["ignore", "pipe", "ignore"],
  });
  if (!proc.stdout) throw new Error("rec spawned without stdout pipe");

  proc.on("error", (err) => {
    console.error("rec error:", err.message);
  });

  return {
    stream: proc.stdout,
    stop: () => {
      try { proc.kill("SIGTERM"); } catch { /* already dead */ }
    },
  };
}
