import type { TokenSet } from "@imagegencli/core";
import { CLIENT_ID, FLOW_TIMEOUT_MINUTES, TOKEN_ENDPOINT } from "./codex-constants.js";
import { buildAuthorizeUrl, createPkcePair } from "./pkce.js";

export class ReauthRequiredError extends Error {
  constructor(message = "Codex credentials are missing or expired. Run `imagegen auth login` to reconnect.") {
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

function toTokenSet(body: TokenResponse, fallbackRefreshToken?: string): TokenSet {
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token ?? fallbackRefreshToken,
    expiresAt: Date.now() + body.expires_in * 1000,
    scope: body.scope,
  };
}

async function readOAuthErrorCode(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as { error?: unknown };
    return typeof body.error === "string" ? body.error : null;
  } catch {
    return null;
  }
}

async function postTokenRequest(params: Record<string, string>): Promise<TokenSet | null> {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  if (!response.ok) {
    const errorCode = await readOAuthErrorCode(response.clone());
    if (response.status === 401 || (response.status === 400 && (errorCode === "invalid_grant" || errorCode === "invalid_token"))) {
      return null;
    }
    throw new Error(`Token request failed with status ${response.status}.`);
  }
  const body = (await response.json()) as TokenResponse;
  return toTokenSet(body, params["refresh_token"]);
}

export async function exchangeCodeForTokens(args: {
  code: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<TokenSet> {
  const tokens = await postTokenRequest({
    grant_type: "authorization_code",
    client_id: CLIENT_ID,
    code: args.code,
    redirect_uri: args.redirectUri,
    code_verifier: args.codeVerifier,
  });
  if (!tokens) {
    throw new ReauthRequiredError("The authorization code was rejected. Run `imagegen auth login` again.");
  }
  return tokens;
}

export async function refreshTokens(refreshToken: string): Promise<TokenSet | null> {
  return postTokenRequest({
    grant_type: "refresh_token",
    client_id: CLIENT_ID,
    refresh_token: refreshToken,
  });
}

export function isTokenExpired(tokens: TokenSet, now: number = Date.now()): boolean {
  return tokens.expiresAt <= now;
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
