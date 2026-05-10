import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { PROMPTS_DIR } from "./paths.js";
import type { I18nStrings } from "./i18n.js";

export interface ContextOptions {
  storageDir: string;
  strings: I18nStrings;
  userName: string;
}

export async function buildSystemPrompt(opts: ContextOptions): Promise<string> {
  const corePrompt = await loadPrompt("coaching-system.md");
  const filled = substitute(corePrompt, {
    userName: opts.userName,
    language: opts.strings.languageName,
  });

  const themes = await readIfExists(join(opts.storageDir, "themes.md"));
  const prep = await readIfExists(join(opts.storageDir, "prep-next.md"));
  const recent = await readRecentSummaries(join(opts.storageDir, "sessions"), 5);

  let out = filled.trim();

  if (themes && themes.trim()) {
    out += `\n\n---\n\n${opts.strings.activeThemesHeader}\n\n${themes.trim()}`;
  }
  if (prep && prep.trim()) {
    out += `\n\n---\n\n${opts.strings.prepHeader}\n\n${prep.trim()}`;
  }
  if (recent.length > 0) {
    out += `\n\n---\n\n${opts.strings.recentSessionsHeader}\n\n${recent.join("\n\n")}`;
  }

  return out;
}

export async function loadPrompt(name: string): Promise<string> {
  return await readFile(join(PROMPTS_DIR, name), "utf8");
}

export function substitute(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, value);
  }
  return out;
}

async function readIfExists(path: string): Promise<string | null> {
  try { return await readFile(path, "utf8"); } catch { return null; }
}

async function readRecentSummaries(sessionsDir: string, limit: number): Promise<string[]> {
  let files: string[];
  try { files = await readdir(sessionsDir); } catch { return []; }

  const md = files
    .filter((f) => f.endsWith(".md") && !f.endsWith(".partial"))
    .sort()
    .reverse()
    .slice(0, limit);

  const out: string[] = [];
  for (const f of md) {
    const content = await readIfExists(join(sessionsDir, f));
    if (!content) continue;
    out.push(extractSummary(f, content));
  }
  return out;
}

function extractSummary(filename: string, content: string): string {
  // Look for a "## Summary" / "## Sammendrag" header. Match either to support
  // sessions written before locale config existed, or by users who switched
  // locale mid-stream.
  const headers = ["## Sammendrag", "## Summary"];
  let start = -1;
  for (const h of headers) {
    const idx = content.indexOf(h);
    if (idx >= 0) { start = idx; break; }
  }
  if (start < 0) return `### ${filename}\n${content.slice(0, 500).trim()}`;

  const after = content.slice(start);
  const transcriptHeaders = ["## Full transkripsjon", "## Full transcript"];
  let end = -1;
  for (const h of transcriptHeaders) {
    const idx = after.indexOf(h);
    if (idx >= 0) { end = idx; break; }
  }
  const body = (end < 0 ? after : after.slice(0, end)).trim();
  return `### ${filename}\n${body}`;
}
