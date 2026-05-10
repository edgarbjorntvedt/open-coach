import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { createWriteStream, type WriteStream } from "node:fs";
import { join } from "node:path";
import { PROMPTS_DIR } from "./paths.js";

export class SessionLogger {
  private readonly storageDir: string;
  private readonly startedAt: Date;
  private readonly partialPath: string;
  private readonly finalPath: string;
  private writeStream: WriteStream | null = null;
  private coachBuffer = "";
  // Coach-replikk som venter på at parets user-transcript skal komme.
  // Realtime-modellen begynner å svare før Whisper er ferdig å transkribere
  // brukeren, så uten dette ender fila opp med Coach-linje før Edgar-linje.
  private pendingCoachLine: string | null = null;
  // Settes når VAD detekterer slutt på en bruker-tur — vi vet da at en
  // user-transcript er på vei og bør skrives før neste coach-replikk.
  private expectingUserTranscript = false;

  constructor(storageDir: string, startedAt: Date) {
    this.storageDir = storageDir;
    this.startedAt = startedAt;
    const stamp = formatStamp(startedAt);
    const sessionsDir = join(storageDir, "sessions");
    this.partialPath = join(sessionsDir, `${stamp}.md.partial`);
    this.finalPath = join(sessionsDir, `${stamp}.md`);
  }

  async start(): Promise<void> {
    await mkdir(join(this.storageDir, "sessions"), { recursive: true });
    this.writeStream = createWriteStream(this.partialPath, { flags: "a" });
    this.writeLine(`# Coach-sesjon ${formatHuman(this.startedAt)}`);
    this.writeLine("");
    this.writeLine("## Full transkripsjon");
    this.writeLine("");
  }

  noteUserSpeechStopped(): void {
    this.expectingUserTranscript = true;
  }

  appendUser(text: string): void {
    // Hvis coach-deltas er midt i flight når user-transcript kommer (f.eks.
    // bruker avbrøt, eller .done-eventet kom etter user-transcript), avslutt
    // den replikken først.
    if (this.coachBuffer.trim().length > 0) this.endCoachUtterance();

    this.expectingUserTranscript = false;

    const trimmed = text.trim();
    if (trimmed.length > 0) {
      this.writeLine(`Edgar: ${trimmed}`);
      this.writeLine("");
    }
    this.flushPendingCoach();
  }

  appendCoachDelta(delta: string): void {
    this.coachBuffer += delta;
  }

  endCoachUtterance(): void {
    const text = this.coachBuffer.trim();
    this.coachBuffer = "";
    if (text.length === 0) return;

    if (this.expectingUserTranscript) {
      // En user-transcript er på vei. Hold coach-replikken til den er skrevet,
      // så fila får riktig samtaleflyt (Edgar -> Coach).
      if (this.pendingCoachLine !== null) {
        // Skal i praksis ikke skje — to coach-replikker uten user-tur imellom.
        // Bevar dataen ved å skrive den forrige før vi overskriver.
        this.writeCoach(this.pendingCoachLine);
      }
      this.pendingCoachLine = text;
      return;
    }

    // Ingen user-transcript ventet — coach-opener eller whisper allerede landet.
    this.writeCoach(text);
  }

  private flushPendingCoach(): void {
    if (this.pendingCoachLine === null) return;
    this.writeCoach(this.pendingCoachLine);
    this.pendingCoachLine = null;
  }

  private writeCoach(text: string): void {
    this.writeLine(`Coach: ${text}`);
    this.writeLine("");
  }

  private writeLine(s: string): void {
    if (!this.writeStream) return;
    this.writeStream.write(s + "\n");
  }

  async finish(apiKey: string): Promise<string> {
    // Tøm eventuelt in-flight coach-buffer (avbrutt midt i replikk), så
    // tøm pending coach-linje (dukker opp hvis user-transcript aldri kom).
    this.endCoachUtterance();
    this.flushPendingCoach();
    if (this.writeStream) {
      const ws = this.writeStream;
      this.writeStream = null;
      await new Promise<void>((resolve) => ws.end(() => resolve()));
    }

    const partial = await readFile(this.partialPath, "utf8");
    const transcriptStart = partial.indexOf("## Full transkripsjon");
    const transcriptOnly = transcriptStart >= 0 ? partial.slice(transcriptStart) : partial;

    let summarySection: string;
    try {
      const summary = await generateSummary(apiKey, transcriptOnly);
      summarySection = summary.trim().length > 0
        ? summary.trim() + "\n\n"
        : "## Sammendrag\n\n*(Tom transkripsjon — ingen sammendrag.)*\n\n";
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      summarySection = `## Sammendrag\n\n*(Sammendrag-generering feilet: ${msg})*\n\n`;
    }

    const headerLine = `# Coach-sesjon ${formatHuman(this.startedAt)}`;
    const final = `${headerLine}\n\n${summarySection}${transcriptOnly}`;

    await writeFile(this.finalPath, final, "utf8");
    try { await unlink(this.partialPath); } catch { /* ignore */ }
    return this.finalPath;
  }
}

function formatStamp(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function formatHuman(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function generateSummary(apiKey: string, transcript: string): Promise<string> {
  const systemPrompt = await readFile(join(PROMPTS_DIR, "session-summary.md"), "utf8");
  const summaryModel = process.env.OPENAI_SUMMARY_MODEL ?? "gpt-4o-mini";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: summaryModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: transcript },
      ],
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${await res.text()}`);
  }

  const json = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content ?? "";
}
