import type { TokenSet } from "@imagegencli/core";
import { CLIENT_ID, FLOW_TIMEOUT_MINUTES, TOKEN_ENDPOINT, TOKEN_REFRESH_MARGIN_MS, TOKEN_REQUEST_TIMEOUT_MS } from "./codex-constants.js";
import { buildAuthorizeUrl, createPkcePair } from "./pkce.js";

export class ReauthRequiredError extends Error {
  constructor(message = "Codex credentials are missing or expired. Run `imagegen auth codex login` to reconnect.") {
    super(message);
    this.name = "ReauthRequiredError";
  }
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

export type TokenOutcome = { ok: true; tokens: TokenSet } | { ok: false; reason: string };

function toTokenSet(body: TokenResponse, fallbackRefreshToken?: string): TokenSet {
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token ?? fallbackRefreshToken,
    expiresAt: Date.now() + body.expires_in * 1000,
    scope: body.scope,
  };
}

const REJECTED_GRANT_CODES = new Set([
  "invalid_grant",
  "invalid_token",
  "refresh_token_expired",
  "refresh_token_reused",
  "refresh_token_invalidated",
]);

// OpenAI returns either `{ error: "invalid_grant" }` or
// `{ error: { code: "refresh_token_reused", ... } }`.
async function readOAuthErrorCode(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body.error === "string") return body.error;
    if (typeof body.error === "object" && body.error !== null) {
      const code = (body.error as Record<string, unknown>)["code"];
      if (typeof code === "string") return code;
    }
    return null;
  } catch {
    return null;
  }
}

async function postTokenRequest(params: Record<string, string>): Promise<TokenOutcome> {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
    signal: AbortSignal.timeout(TOKEN_REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    const errorCode = await readOAuthErrorCode(response.clone());
    if (response.status === 401 || (errorCode !== null && REJECTED_GRANT_CODES.has(errorCode))) {
      return { ok: false, reason: errorCode ?? `status ${response.status}` };
    }
    throw new Error(`Token request failed with status ${response.status}${errorCode ? ` (${errorCode})` : ""}.`);
  }
  const body = (await response.json()) as TokenResponse;
  return { ok: true, tokens: toTokenSet(body, params["refresh_token"]) };
}

export async function exchangeCodeForTokens(args: {
  code: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<TokenSet> {
  const outcome = await postTokenRequest({
    grant_type: "authorization_code",
    client_id: CLIENT_ID,
    code: args.code,
    redirect_uri: args.redirectUri,
    code_verifier: args.codeVerifier,
  });
  if (!outcome.ok) {
    throw new ReauthRequiredError(`The authorization code was rejected (${outcome.reason}). Run \`imagegen auth codex login\` again.`);
  }
  return outcome.tokens;
}

export async function refreshTokens(refreshToken: string): Promise<TokenOutcome> {
  return postTokenRequest({
    grant_type: "refresh_token",
    client_id: CLIENT_ID,
    refresh_token: refreshToken,
  });
}

// Refresh shortly before expiry so long image requests never start with a
// token that lapses mid-flight.
export function needsRefresh(tokens: TokenSet, now: number = Date.now()): boolean {
  return tokens.expiresAt - TOKEN_REFRESH_MARGIN_MS <= now;
}

const pendingVerifiers = new Map<string, { verifier: string; createdAt: number }>();

export function startPkceFlow(redirectUri: string): { url: string; state: string } {
  const pair = createPkcePair();
  prunePendingVerifiers();
  pendingVerifiers.set(pair.state, { verifier: pair.verifier, createdAt: Date.now() });
  return { url: buildAuthorizeUrl(pair, redirectUri), state: pair.state };
}

export function consumeVerifier(state: string): string | null {
  const entry = pendingVerifiers.get(state);
  pendingVerifiers.delete(state);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > FLOW_TIMEOUT_MINUTES * 60 * 1000) return null;
  return entry.verifier;
}

function prunePendingVerifiers(): void {
  const cutoff = Date.now() - FLOW_TIMEOUT_MINUTES * 60 * 1000;
  for (const [state, entry] of pendingVerifiers) {
    if (entry.createdAt < cutoff) pendingVerifiers.delete(state);
  }
}
