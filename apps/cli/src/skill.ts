import { readFile } from "node:fs/promises";

export async function skillText(): Promise<string> {
  return readFile(new URL("../skill/SKILL.md", import.meta.url), "utf8");
}
