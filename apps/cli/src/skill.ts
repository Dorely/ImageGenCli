import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

const SKILL_NAME = "imagegen-cli";

export class SkillExistsError extends Error {
  constructor(path: string) {
    super(`Skill differs at ${path}. Re-run with --force to replace it.`);
    this.name = "SkillExistsError";
  }
}

export interface SkillInstallResult {
  target: string;
  path: string;
  status: "installed" | "updated" | "up-to-date";
}

export async function skillText(): Promise<string> {
  return readFile(new URL("../skill/SKILL.md", import.meta.url), "utf8");
}

function targetPath(target: string): string {
  const root = target === "claude"
    ? join(homedir(), ".claude", "skills")
    : target === "codex"
      ? join(homedir(), ".agents", "skills")
      : resolve(target);
  return join(root, SKILL_NAME, "SKILL.md");
}

async function existingText(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

export async function installSkill(targets: string[], force: boolean): Promise<SkillInstallResult[]> {
  const content = await skillText();
  const planned = new Map<string, SkillInstallResult>();
  for (const target of targets) {
    const path = targetPath(target);
    if (planned.has(path)) continue;
    const existing = await existingText(path);
    if (existing !== undefined && existing !== content && !force) throw new SkillExistsError(path);
    planned.set(path, {
      target,
      path,
      status: existing === undefined ? "installed" : existing === content ? "up-to-date" : "updated",
    });
  }
  for (const item of planned.values()) {
    if (item.status === "up-to-date") continue;
    await mkdir(dirname(item.path), { recursive: true });
    await writeFile(item.path, content, { encoding: "utf8", flag: item.status === "installed" ? "wx" : "w" });
  }
  return [...planned.values()];
}
