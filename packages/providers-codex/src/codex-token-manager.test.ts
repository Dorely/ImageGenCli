import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ITokenStore, TokenSet } from "@imagegencli/core";
import type { TokenOutcome } from "./codex-auth.js";
import { ReauthRequiredError } from "./codex-auth.js";
import { CodexTokenManager } from "./codex-token-manager.js";
import { createRefreshLock } from "./refresh-lock.js";

let directory: string;
let lockPath: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "imagegen-token-test-"));
  lockPath = join(directory, "codex-refresh.lock");
});
afterEach(async () => rm(directory, { recursive: true, force: true }));

const tick = () => new Promise((resolve) => setTimeout(resolve, 1));

// Shared persisted credentials, as seen by every imagegen process.
function sharedStore(initial: TokenSet | null): ITokenStore & { value: TokenSet | null } {
  const store = {
    value: initial,
    load: async () => { await tick(); return store.value && { ...store.value }; },
    save: async (_provider: string, tokens: TokenSet) => { await tick(); store.value = { ...tokens }; },
    clear: async () => { await tick(); store.value = null; },
    describe: () => ({ backend: "file" as const, location: "memory" }),
  };
  return store;
}

// Single-use refresh tokens: redeeming a rotated token is rejected.
function rotatingAuthServer(firstRefreshToken: string) {
  let live = firstRefreshToken;
  let generation = 0;
  return vi.fn(async (refreshToken: string): Promise<TokenOutcome> => {
    await tick();
    if (refreshToken !== live) return { ok: false, reason: "refresh_token_reused" };
    generation += 1;
    live = `refresh-${generation}`;
    return { ok: true, tokens: { accessToken: `access-${generation}`, refreshToken: live, expiresAt: Date.now() + 3_600_000 } };
  });
}

function processes(store: ITokenStore, refresh: ReturnType<typeof rotatingAuthServer>, count: number) {
  return Array.from({ length: count }, () => new CodexTokenManager(store, { refresh, lock: createRefreshLock({ path: lockPath, pollMs: 2 }) }));
}

const expired: TokenSet = { accessToken: "access-0", refreshToken: "refresh-0", expiresAt: Date.now() - 1 };

describe("CodexTokenManager refresh", () => {
  it("redeems the refresh token once across concurrent processes", async () => {
    const store = sharedStore(expired);
    const refresh = rotatingAuthServer("refresh-0");
    const tokens = await Promise.all(processes(store, refresh, 6).map((manager) => manager.getValidAccessToken()));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(new Set(tokens)).toEqual(new Set(["access-1"]));
    expect(store.value).toMatchObject({ accessToken: "access-1", refreshToken: "refresh-1" });
  });

  it("does not refresh valid tokens or take the lock", async () => {
    const store = sharedStore({ accessToken: "a", refreshToken: "r", expiresAt: Date.now() + 3_600_000 });
    const refresh = vi.fn();
    const lock = vi.fn();
    const manager = new CodexTokenManager(store, { refresh, lock });
    await expect(manager.getValidAccessToken()).resolves.toBe("a");
    expect(refresh).not.toHaveBeenCalled();
    expect(lock).not.toHaveBeenCalled();
  });

  it("clears dead credentials and reports the upstream reason", async () => {
    const store = sharedStore(expired);
    const refresh = vi.fn(async (): Promise<TokenOutcome> => ({ ok: false, reason: "refresh_token_invalidated" }));
    const manager = new CodexTokenManager(store, { refresh, lock: createRefreshLock({ path: lockPath }) });
    const error = await manager.getValidAccessToken().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ReauthRequiredError);
    expect((error as Error).message).toContain("refresh_token_invalidated");
    expect(store.value).toBeNull();
  });

  it("refreshes a rejected but unexpired access token once", async () => {
    const store = sharedStore({ ...expired, expiresAt: Date.now() + 3_600_000 });
    const refresh = rotatingAuthServer("refresh-0");
    const [first, second] = processes(store, refresh, 2);
    await expect(first.recoverFromUnauthorized("access-0")).resolves.toBe("access-1");
    // A peer that saw the same rejection adopts the already-rotated token.
    await expect(second.recoverFromUnauthorized("access-0")).resolves.toBe("access-1");
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("reports connection status without exposing tokens", async () => {
    const store = sharedStore(expired);
    const [manager] = processes(store, rotatingAuthServer("refresh-0"), 1);
    const status = await manager.status();
    expect(status).toEqual({ connected: true, expiresAt: store.value?.expiresAt });
    expect(JSON.stringify(status)).not.toContain("access-");
    await expect(new CodexTokenManager(sharedStore(null)).status()).resolves.toEqual({ connected: false });
  });
});
