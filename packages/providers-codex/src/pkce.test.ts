import { describe, expect, it } from "vitest";
import { buildAuthorizeUrl, createPkcePair } from "./pkce.js";
import { AUTH_ENDPOINT, CLIENT_ID } from "./codex-constants.js";

describe("createPkcePair", () => {
  it("produces url-safe verifier, challenge, and state", () => {
    const pair = createPkcePair();
    expect(pair.verifier).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(pair.challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(pair.state).toMatch(/^[0-9a-f]{32}$/);
  });

  it("produces unique pairs", () => {
    const first = createPkcePair();
    const second = createPkcePair();
    expect(first.verifier).not.toBe(second.verifier);
    expect(first.state).not.toBe(second.state);
  });
});

describe("buildAuthorizeUrl", () => {
  it("builds the codex authorize url with pkce params", () => {
    const url = buildAuthorizeUrl(
      { verifier: "v", challenge: "c", state: "s" },
      "http://localhost:1455/auth/callback",
    );
    const parsed = new URL(url);
    expect(`${parsed.origin}${parsed.pathname}`).toBe(AUTH_ENDPOINT);
    expect(parsed.searchParams.get("client_id")).toBe(CLIENT_ID);
    expect(parsed.searchParams.get("code_challenge")).toBe("c");
    expect(parsed.searchParams.get("code_challenge_method")).toBe("S256");
    expect(parsed.searchParams.get("state")).toBe("s");
    expect(parsed.searchParams.get("codex_cli_simplified_flow")).toBe("true");
  });
});
