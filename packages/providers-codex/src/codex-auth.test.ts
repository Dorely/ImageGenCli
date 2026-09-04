import { describe, expect, it } from "vitest";
import { isTokenExpired } from "./codex-auth.js";

describe("isTokenExpired", () => {
  it("treats tokens at or past expiry as expired", () => {
    expect(isTokenExpired({ accessToken: "a", expiresAt: 100 }, 100)).toBe(true);
    expect(isTokenExpired({ accessToken: "a", expiresAt: 99 }, 100)).toBe(true);
  });

  it("treats future tokens as valid", () => {
    expect(isTokenExpired({ accessToken: "a", expiresAt: 101 }, 100)).toBe(false);
  });
});
