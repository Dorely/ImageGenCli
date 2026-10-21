import { afterEach, describe, expect, it, vi } from "vitest";
import { needsRefresh, refreshTokens } from "./codex-auth.js";
import { TOKEN_REFRESH_MARGIN_MS } from "./codex-constants.js";

afterEach(() => vi.unstubAllGlobals());

describe("needsRefresh", () => {
  it("refreshes tokens inside the expiry margin", () => {
    expect(needsRefresh({ accessToken: "a", expiresAt: 100 }, 100)).toBe(true);
    expect(needsRefresh({ accessToken: "a", expiresAt: 100 + TOKEN_REFRESH_MARGIN_MS }, 100)).toBe(true);
  });

  it("keeps tokens beyond the expiry margin", () => {
    expect(needsRefresh({ accessToken: "a", expiresAt: 101 + TOKEN_REFRESH_MARGIN_MS }, 100)).toBe(false);
  });
});

describe("refreshTokens", () => {
  function stubTokenEndpoint(status: number, body: unknown) {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status })));
  }

  it("reports nested OpenAI refresh error codes as rejections", async () => {
    stubTokenEndpoint(401, { error: { code: "refresh_token_reused", message: "already used" } });
    await expect(refreshTokens("r")).resolves.toEqual({ ok: false, reason: "refresh_token_reused" });
  });

  it("reports OAuth invalid_grant as a rejection", async () => {
    stubTokenEndpoint(400, { error: "invalid_grant" });
    await expect(refreshTokens("r")).resolves.toEqual({ ok: false, reason: "invalid_grant" });
  });

  it("treats other failures as transient errors", async () => {
    stubTokenEndpoint(500, { error: { code: "server_error" } });
    await expect(refreshTokens("r")).rejects.toThrow("status 500 (server_error)");
    stubTokenEndpoint(400, { error: "invalid_request" });
    await expect(refreshTokens("r")).rejects.toThrow("status 400");
  });

  it("keeps the previous refresh token when none is rotated", async () => {
    stubTokenEndpoint(200, { access_token: "a2", expires_in: 3600 });
    const outcome = await refreshTokens("r1");
    expect(outcome).toMatchObject({ ok: true, tokens: { accessToken: "a2", refreshToken: "r1" } });
  });
});
