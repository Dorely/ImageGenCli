export function extractAccountId(token: string): string {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("OAuth token is not a valid JWT. Run `imagegen auth login` to reconnect.");
  }
  let payload: unknown;
  try {
    const decoded = Buffer.from(parts[1], "base64url").toString("utf8");
    payload = JSON.parse(decoded) as unknown;
  } catch {
    throw new Error("OAuth token payload could not be decoded. Run `imagegen auth login` to reconnect.");
  }
  const accountId =
    typeof payload === "object" &&
    payload !== null &&
    "https://api.openai.com/auth" in payload &&
    typeof (payload as Record<string, unknown>)["https://api.openai.com/auth"] === "object" &&
    (payload as Record<string, unknown>)["https://api.openai.com/auth"] !== null
      ? ((payload as Record<string, Record<string, unknown>>)["https://api.openai.com/auth"]["chatgpt_account_id"])
      : undefined;
  if (typeof accountId !== "string" || accountId.length === 0) {
    throw new Error("OAuth token does not contain a ChatGPT account id. Run `imagegen auth login` to reconnect.");
  }
  return accountId;
}
