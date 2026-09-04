import type { ITokenStore, TokenSet } from "@imagegencli/core";
import { isTokenExpired, ReauthRequiredError, exchangeCodeForTokens, refreshTokens } from "./codex-auth.js";
import { PROVIDER_NAME } from "./codex-constants.js";

export class CodexTokenManager {
  private pendingRefresh: Promise<string> | null = null;

  constructor(private readonly store: ITokenStore) {}

  async exchangeAndSave(args: { code: string; redirectUri: string; codeVerifier: string }): Promise<TokenSet> {
    const tokens = await exchangeCodeForTokens(args);
    await this.store.save(PROVIDER_NAME, tokens);
    return tokens;
  }

  async status(): Promise<{ connected: boolean; expiresAt?: number }> {
    const tokens = await this.store.load(PROVIDER_NAME);
    if (!tokens) return { connected: false };
    if (!isTokenExpired(tokens)) return { connected: true, expiresAt: tokens.expiresAt };
    if (!tokens.refreshToken) return { connected: false };
    try {
      const refreshed = await this.getValidAccessToken();
      void refreshed;
      const current = await this.store.load(PROVIDER_NAME);
      return { connected: true, expiresAt: current?.expiresAt };
    } catch {
      return { connected: false };
    }
  }

  async logout(): Promise<void> {
    await this.store.clear(PROVIDER_NAME);
  }

  async getValidAccessToken(): Promise<string> {
    const tokens = await this.store.load(PROVIDER_NAME);
    if (!tokens) throw new ReauthRequiredError();
    if (!isTokenExpired(tokens)) return tokens.accessToken;
    if (!tokens.refreshToken) {
      await this.store.clear(PROVIDER_NAME);
      throw new ReauthRequiredError();
    }
    if (!this.pendingRefresh) {
      this.pendingRefresh = this.performRefresh(tokens.refreshToken).finally(() => {
        this.pendingRefresh = null;
      });
    }
    return this.pendingRefresh;
  }

  private async performRefresh(refreshToken: string): Promise<string> {
    const refreshed = await refreshTokens(refreshToken);
    if (!refreshed) {
      await this.store.clear(PROVIDER_NAME);
      throw new ReauthRequiredError();
    }
    await this.store.save(PROVIDER_NAME, refreshed);
    return refreshed.accessToken;
  }
}
