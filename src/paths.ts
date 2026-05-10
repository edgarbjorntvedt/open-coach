import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));

export const REPO_ROOT = join(HERE, "..");
export const PROMPTS_DIR = join(REPO_ROOT, "prompts");
