import { describe, expect, it } from "vitest";
import { extractAccountId } from "./account-id.js";

function makeToken(payload: unknown): string {
  const header = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.sig`;
}

describe("extractAccountId", () => {
  it("extracts the chatgpt account id from the jwt claim", () => {
    const token = makeToken({ "https://api.openai.com/auth": { chatgpt_account_id: "acct-123" } });
    expect(extractAccountId(token)).toBe("acct-123");
  });

  it("throws an actionable error for malformed tokens", () => {
    expect(() => extractAccountId("not-a-jwt")).toThrow(/auth login/);
    expect(() => extractAccountId(makeToken({ sub: "x" }))).toThrow(/account id/);
  });
});
