export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope?: string;
}

export interface TokenStoreInfo {
  backend: "vault" | "file";
  location: string;
}

export interface ITokenStore {
  load(provider: string): Promise<TokenSet | null>;
  save(provider: string, tokens: TokenSet): Promise<void>;
  clear(provider: string): Promise<void>;
  describe(): TokenStoreInfo;
}
