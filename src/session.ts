import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { createWriteStream, type WriteStream } from "node:fs";
import { join } from "node:path";
import { loadPrompt, substitute } from "./context.js";
import type { I18nStrings } from "./i18n.js";

export interface SessionOptions {
  storageDir: string;
  startedAt: Date;
  strings: I18nStrings;
  userPromptName: string;
  userTranscriptLabel: string;
}

export class SessionLogger {
  private readonly opts: SessionOptions;
  private readonly partialPath: string;
  private readonly finalPath: string;
  private writeStream: WriteStream | null = null;
  private coachBuffer = "";
  // Coach utterance waiting for the paired user transcript to arrive.
  // The Realtime model starts answering before Whisper finishes the user
  // transcription, so without this the file ends up with Coach line before
  // the user's line.
  private pendingCoachLine: string | null = null;
  // Set when VAD detects the end of a user turn — we know a user transcript
  // is on the way and should be written before the next coach utterance.
  private expectingUserTranscript = false;

  constructor(opts: SessionOptions) {
    this.opts = opts;
    const stamp = formatStamp(opts.startedAt);
    const sessionsDir = join(opts.storageDir, "sessions");
    this.partialPath = join(sessionsDir, `${stamp}.md.partial`);
    this.finalPath = join(sessionsDir, `${stamp}.md`);
  }

  async start(): Promise<void> {
    await mkdir(join(this.opts.storageDir, "sessions"), { recursive: true });
    this.writeStream = createWriteStream(this.partialPath, { flags: "a" });
    this.writeLine(`# ${this.opts.strings.sessionTitlePrefix} ${formatHuman(this.opts.startedAt)}`);
    this.writeLine("");
    this.writeLine(this.opts.strings.transcriptHeader);
    this.writeLine("");
  }

  noteUserSpeechStopped(): void {
    this.expectingUserTranscript = true;
  }

  appendUser(text: string): void {
    // If coach deltas are mid-flight when user-transcript lands (e.g. user
    // interrupted, or .done event fired after user-transcript), close out
    // that utterance first.
    if (this.coachBuffer.trim().length > 0) this.endCoachUtterance();

    this.expectingUserTranscript = false;

    const trimmed = text.trim();
    if (trimmed.length > 0) {
      this.writeLine(`${this.opts.userTranscriptLabel}: ${trimmed}`);
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
      // A user transcript is on the way. Hold the coach utterance until it's
      // written, so the file shows the natural flow (user → coach).
      if (this.pendingCoachLine !== null) {
        // In practice shouldn't happen — two coach utterances without a user
        // turn in between. Preserve data by writing the previous one first.
        this.writeCoach(this.pendingCoachLine);
      }
      this.pendingCoachLine = text;
      return;
    }

    // No user transcript expected — coach opener, or whisper already landed.
    this.writeCoach(text);
  }

  private flushPendingCoach(): void {
    if (this.pendingCoachLine === null) return;
    this.writeCoach(this.pendingCoachLine);
    this.pendingCoachLine = null;
  }

  private writeCoach(text: string): void {
    this.writeLine(`${this.opts.strings.coachLabel}: ${text}`);
    this.writeLine("");
  }

  private writeLine(s: string): void {
    if (!this.writeStream) return;
    this.writeStream.write(s + "\n");
  }

  async finish(apiKey: string): Promise<string> {
    // Flush any in-flight coach buffer (interrupted mid-utterance), then any
    // pending coach line (kept around if the user transcript never landed).
    this.endCoachUtterance();
    this.flushPendingCoach();
    if (this.writeStream) {
      const ws = this.writeStream;
      this.writeStream = null;
      await new Promise<void>((resolve) => ws.end(() => resolve()));
    }

    const partial = await readFile(this.partialPath, "utf8");
    const transcriptStart = partial.indexOf(this.opts.strings.transcriptHeader);
    const transcriptOnly = transcriptStart >= 0 ? partial.slice(transcriptStart) : partial;

    let summarySection: string;
    try {
      const summary = await generateSummary({
        apiKey,
        transcript: transcriptOnly,
        strings: this.opts.strings,
        userName: this.opts.userPromptName,
      });
      summarySection = summary.trim().length > 0
        ? summary.trim() + "\n\n"
        : `${this.opts.strings.summaryHeader}\n\n${this.opts.strings.emptySummary}\n\n`;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      summarySection = `${this.opts.strings.summaryHeader}\n\n${this.opts.strings.summaryErrorTemplate(msg)}\n\n`;
    }

    const headerLine = `# ${this.opts.strings.sessionTitlePrefix} ${formatHuman(this.opts.startedAt)}`;
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

interface SummaryRequest {
  apiKey: string;
  transcript: string;
  strings: I18nStrings;
  userName: string;
}

async function generateSummary(req: SummaryRequest): Promise<string> {
  const raw = await loadPrompt("session-summary.md");
  const systemPrompt = substitute(raw, {
    userName: req.userName,
    language: req.strings.languageName,
    summaryHeader: req.strings.summaryHeader,
    topicLabel: req.strings.summaryTopicLabel,
    insightsLabel: req.strings.summaryInsightsLabel,
    patternsLabel: req.strings.summaryPatternsLabel,
    actionItemsLabel: req.strings.summaryActionItemsLabel,
  });
  const summaryModel = process.env.OPENAI_SUMMARY_MODEL ?? "gpt-4o-mini";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${req.apiKey}`,
    },
    body: JSON.stringify({
      model: summaryModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: req.transcript },
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
