import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { PROMPTS_DIR } from "./paths.js";

export async function buildSystemPrompt(storageDir: string): Promise<string> {
  const corePrompt = await readFile(join(PROMPTS_DIR, "coaching-system.md"), "utf8");

  const themes = await readIfExists(join(storageDir, "themes.md"));
  const prep = await readIfExists(join(storageDir, "prep-next.md"));
  const recent = await readRecentSummaries(join(storageDir, "sessions"), 5);

  let out = corePrompt.trim();

  if (themes && themes.trim()) {
    out += "\n\n---\n\n## Aktive tema\n\n" + themes.trim();
  }
  if (prep && prep.trim()) {
    out += "\n\n---\n\n## Prep for denne sesjonen\n\n" + prep.trim();
  }
  if (recent.length > 0) {
    out += "\n\n---\n\n## Siste sesjoner\n\n" + recent.join("\n\n");
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
  const start = content.indexOf("## Sammendrag");
  if (start < 0) return `### ${filename}\n${content.slice(0, 500).trim()}`;

  const after = content.slice(start);
  const end = after.indexOf("## Full transkripsjon");
  const body = (end < 0 ? after : after.slice(0, end)).trim();
  return `### ${filename}\n${body}`;
}
