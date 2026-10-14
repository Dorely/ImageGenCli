import { resolveCredentialStore } from "@imagegencli/credentials";
import type { ITokenStore, TokenSet } from "@imagegencli/core";

export async function resolveTokenStore(): Promise<ITokenStore> {
  const store = await resolveCredentialStore<TokenSet>();
  return {
    ...store,
    load: async (provider) => {
      const value = await store.load(provider);
      if (value === null) return null;
      if (
        typeof value.accessToken !== "string" ||
        typeof value.expiresAt !== "number" ||
        (value.refreshToken !== undefined &&
          typeof value.refreshToken !== "string")
      ) {
        throw new Error(
          "Stored Codex credentials are invalid. Run imagegen auth codex login.",
        );
      }
      return value;
    },
    save: (provider, value) => store.save(provider, value),
    clear: (provider) => store.clear(provider),
    describe: () => store.describe(),
  };
}
