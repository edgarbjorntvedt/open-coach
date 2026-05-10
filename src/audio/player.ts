import { spawn } from "node:child_process";

const SOX_RAW_PCM_24K_MONO = [
  "-q", "-t", "raw", "-r", "24000", "-b", "16", "-c", "1",
  "-e", "signed-integer", "-L", "-",
];

export interface Player {
  write: (chunk: Buffer) => void;
  stop: () => void;
}

export function startPlayer(): Player {
  const proc = spawn("play", SOX_RAW_PCM_24K_MONO, {
    stdio: ["pipe", "ignore", "ignore"],
  });
  if (!proc.stdin) throw new Error("play spawned without stdin pipe");

  proc.on("error", (err) => {
    console.error("play error:", err.message);
  });

  const stdin = proc.stdin;

  return {
    write: (chunk) => {
      if (!stdin.destroyed && stdin.writable) stdin.write(chunk);
    },
    stop: () => {
      try { stdin.end(); } catch { /* ignore */ }
      try { proc.kill("SIGTERM"); } catch { /* ignore */ }
    },
  };
}
