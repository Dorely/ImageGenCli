import { access, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRefreshLock } from "./refresh-lock.js";

let directory: string;
let path: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "imagegen-lock-test-"));
  path = join(directory, "nested", "codex-refresh.lock");
});
afterEach(async () => rm(directory, { recursive: true, force: true }));

const exists = (file: string) => access(file).then(() => true, () => false);

describe("createRefreshLock", () => {
  it("runs work exclusively across lock instances", async () => {
    let active = 0;
    let peak = 0;
    const work = async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 20));
      active -= 1;
    };
    // Separate instances share only the lock file, like separate processes.
    await Promise.all(Array.from({ length: 5 }, () => createRefreshLock({ path, pollMs: 5 })(work)));
    expect(peak).toBe(1);
    expect(await exists(path)).toBe(false);
  });

  it("releases the lock when work fails", async () => {
    await expect(createRefreshLock({ path })(async () => { throw new Error("boom"); })).rejects.toThrow("boom");
    expect(await exists(path)).toBe(false);
  });

  it("reclaims a lock abandoned by a crashed process", async () => {
    await createRefreshLock({ path })(async () => {});
    await writeFile(path, "1\n");
    const old = new Date(Date.now() - 120_000);
    await utimes(path, old, old);
    await expect(createRefreshLock({ path, staleMs: 60_000, waitMs: 0 })(async () => "ran")).resolves.toBe("ran");
  });

  it("times out while a live lock is held", async () => {
    await createRefreshLock({ path })(async () => {});
    await writeFile(path, "1\n");
    await expect(createRefreshLock({ path, waitMs: 30, pollMs: 5 })(async () => "ran")).rejects.toThrow("Timed out");
  });
});
