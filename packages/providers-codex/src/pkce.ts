import { createHash, randomBytes } from "node:crypto";
import { AUTH_ENDPOINT, CLIENT_ID, SCOPE } from "./codex-constants.js";

export interface PkcePair {
  verifier: string;
  challenge: string;
  state: string;
}

export function base64UrlEncode(data: Uint8Array): string {
  return Buffer.from(data).toString("base64url");
}

export function createPkcePair(): PkcePair {
  const verifier = base64UrlEncode(randomBytes(32));
  const challenge = base64UrlEncode(createHash("sha256").update(verifier, "ascii").digest());
  const state = randomBytes(16).toString("hex");
  return { verifier, challenge, state };
}

export function buildAuthorizeUrl(pair: PkcePair, redirectUri: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    scope: SCOPE,
    state: pair.state,
    code_challenge: pair.challenge,
    code_challenge_method: "S256",
    id_token_add_organizations: "true",
    codex_cli_simplified_flow: "true",
    originator: "pi",
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}
