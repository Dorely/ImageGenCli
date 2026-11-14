import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { ProviderError } from "@imagegencli/core";
import { defaultCredentialFilePath } from "@imagegencli/credentials";

// CLI settings live in config.json next to providers.json and the credential
// file, managed by `imagegen config`. The CLI reads no settings from the environment.
export const CONFIG_KEYS = ["usage-log"] as const;
export type ConfigKey = (typeof CONFIG_KEYS)[number];

export interface CliConfig {
  usageLog?: string;
}

export type ConfigView = Record<ConfigKey, string | null>;

function usage(message: string): ProviderError {
  return new ProviderError({ kind: "usage", message });
}

export function configPath(): string {
  return join(dirname(defaultCredentialFilePath()), "config.json");
}

export function parseConfigKey(key: string | undefined): ConfigKey {
  const match = CONFIG_KEYS.find((known) => known === key);
  if (!match) throw usage(`Unknown config key. Available: ${CONFIG_KEYS.join(", ")}.`);
  return match;
}

export function configView(config: CliConfig): ConfigView {
  return { "usage-log": config.usageLog ?? null };
}

export async function loadConfig(path = configPath()): Promise<CliConfig> {
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw new ProviderError({ kind: "io", message: "Could not read CLI configuration." });
  }
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch {
    throw usage("CLI configuration is invalid JSON. Repair or delete config.json before retrying.");
  }
  const value = doc as { version?: unknown; usageLog?: unknown } | null;
  if (!value || typeof value !== "object" || value.version !== 1) {
    throw usage("CLI configuration requires version 1. Repair or delete config.json before retrying.");
  }
  if (value.usageLog !== undefined && (typeof value.usageLog !== "string" || !value.usageLog.trim())) {
    throw usage("CLI configuration has an invalid usageLog. Run imagegen config unset usage-log.");
  }
  return value.usageLog === undefined ? {} : { usageLog: value.usageLog };
}

async function saveConfig(config: CliConfig, path: string): Promise<void> {
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(temporary, `${JSON.stringify({ version: 1, ...config }, null, 2)}\n`, { mode: 0o600 });
    await rename(temporary, path);
  } catch {
    throw new ProviderError({ kind: "io", message: "Could not save CLI configuration." });
  } finally {
    await rm(temporary, { force: true }).catch(() => {});
  }
}

export async function setConfig(key: ConfigKey, value: string, path = configPath()): Promise<ConfigView> {
  const trimmed = value.trim();
  if (!trimmed) throw usage(`Config value for ${key} must not be blank.`);
  const config = await loadConfig(path);
  // A relative log path is fixed against the directory where it was set.
  config.usageLog = resolve(trimmed);
  await saveConfig(config, path);
  return configView(config);
}

export async function unsetConfig(key: ConfigKey, path = configPath()): Promise<ConfigView> {
  const config = await loadConfig(path);
  if (key === "usage-log") delete config.usageLog;
  await saveConfig(config, path);
  return configView(config);
}
