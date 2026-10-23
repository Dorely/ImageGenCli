import type { ITokenStore, TokenSet } from "@imagegencli/core";
import { needsRefresh, ReauthRequiredError, exchangeCodeForTokens, refreshTokens } from "./codex-auth.js";
import { PROVIDER_NAME } from "./codex-constants.js";
import { createRefreshLock, type RefreshLock } from "./refresh-lock.js";

export interface CodexTokenManagerOptions {
  lock?: RefreshLock;
  refresh?: typeof refreshTokens;
}

export class CodexTokenManager {
  private pendingRefresh: Promise<string> | null = null;
  private readonly lock: RefreshLock;
  private readonly refresh: typeof refreshTokens;

  constructor(
    private readonly store: ITokenStore,
    options: CodexTokenManagerOptions = {},
  ) {
    this.lock = options.lock ?? createRefreshLock();
    this.refresh = options.refresh ?? refreshTokens;
  }

  async exchangeAndSave(args: { code: string; redirectUri: string; codeVerifier: string }): Promise<TokenSet> {
    const tokens = await exchangeCodeForTokens(args);
    await this.store.save(PROVIDER_NAME, tokens);
    return tokens;
  }

  async status(): Promise<{ connected: boolean; expiresAt?: number }> {
    if (!(await this.store.load(PROVIDER_NAME))) return { connected: false };
    try {
      await this.getValidAccessToken();
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
    if (!needsRefresh(tokens)) return tokens.accessToken;
    return this.refreshFrom(tokens.accessToken);
  }

  // The Codex image endpoint rejected this access token before its recorded expiry.
  async recoverFromUnauthorized(rejectedAccessToken: string): Promise<string> {
    return this.refreshFrom(rejectedAccessToken);
  }

  private refreshFrom(staleAccessToken: string): Promise<string> {
    if (!this.pendingRefresh) {
      this.pendingRefresh = this.lock(() => this.refreshLocked(staleAccessToken)).finally(() => {
        this.pendingRefresh = null;
      });
    }
    return this.pendingRefresh;
  }

  private async refreshLocked(staleAccessToken: string): Promise<string> {
    // Another process may have rotated the single-use refresh token while this
    // one waited for the lock; adopt its result instead of redeeming again.
    const current = await this.store.load(PROVIDER_NAME);
    if (!current) throw new ReauthRequiredError();
    if (current.accessToken !== staleAccessToken && !needsRefresh(current)) return current.accessToken;
    if (!current.refreshToken) {
      await this.store.clear(PROVIDER_NAME);
      throw new ReauthRequiredError();
    }
    const outcome = await this.refresh(current.refreshToken);
    if (!outcome.ok) {
      // Holding the lock means no peer replaced these credentials, so they are dead.
      await this.store.clear(PROVIDER_NAME);
      throw new ReauthRequiredError(
        `Codex rejected the stored refresh token (${outcome.reason}). Run \`imagegen auth codex login\` to reconnect.`,
      );
    }
    await this.store.save(PROVIDER_NAME, outcome.tokens);
    return outcome.tokens.accessToken;
  }
}
