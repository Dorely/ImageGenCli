import { mkdir, open, rm, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { defaultCredentialFilePath } from "@imagegencli/credentials";
import { REFRESH_LOCK_FILE, REFRESH_LOCK_POLL_MS, REFRESH_LOCK_STALE_MS, REFRESH_LOCK_WAIT_MS } from "./codex-constants.js";

export type RefreshLock = <T>(work: () => Promise<T>) => Promise<T>;

export interface RefreshLockOptions {
  path?: string;
  staleMs?: number;
  waitMs?: number;
  pollMs?: number;
}

export function defaultRefreshLockPath(): string {
  return join(dirname(defaultCredentialFilePath()), REFRESH_LOCK_FILE);
}

// Codex refresh tokens are single-use. Every imagegen process is separate, so
// refreshes are serialized through an exclusive lock file; otherwise parallel
// agent calls redeem the same refresh token and OpenAI revokes the login.
export function createRefreshLock(options: RefreshLockOptions = {}): RefreshLock {
  const path = options.path ?? defaultRefreshLockPath();
  const staleMs = options.staleMs ?? REFRESH_LOCK_STALE_MS;
  const waitMs = options.waitMs ?? REFRESH_LOCK_WAIT_MS;
  const pollMs = options.pollMs ?? REFRESH_LOCK_POLL_MS;
  return async (work) => {
    await acquire(path, staleMs, waitMs, pollMs);
    try {
      return await work();
    } finally {
      await rm(path, { force: true });
    }
  };
}

async function acquire(path: string, staleMs: number, waitMs: number, pollMs: number): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const deadline = Date.now() + waitMs;
  for (;;) {
    try {
      const handle = await open(path, "wx");
      try {
        await handle.writeFile(`${process.pid}\n`);
      } finally {
        await handle.close();
      }
      return;
    } catch (error) {
      if (!isContention(error)) throw error;
    }
    // A lock older than any refresh can take was left by a crashed process.
    if (await isStale(path, staleMs)) {
      await rm(path, { force: true });
      continue;
    }
    if (Date.now() >= deadline) {
      throw new Error("Timed out waiting for another imagegen process to refresh Codex credentials.");
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs + Math.random() * pollMs));
  }
}

function isContention(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException).code;
  // Windows reports EPERM while a released lock file is still pending deletion.
  return code === "EEXIST" || (process.platform === "win32" && (code === "EPERM" || code === "EACCES"));
}

async function isStale(path: string, staleMs: number): Promise<boolean> {
  try {
    return Date.now() - (await stat(path)).mtimeMs > staleMs;
  } catch {
    return false;
  }
}
