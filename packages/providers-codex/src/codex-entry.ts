import type { ProviderAuthInfo, ProviderEntry } from "@imagegencli/core";
import { ReauthRequiredError, consumeVerifier, startPkceFlow } from "./codex-auth.js";
import { LoopbackError } from "./loopback-server.js";
import { CodexImageProvider } from "./codex-client.js";
import { CodexTokenManager } from "./codex-token-manager.js";
import { DEFAULT_REDIRECT_URI, LOOPBACK_PORT, PROVIDER_NAME } from "./codex-constants.js";
import { waitForOAuthCallback } from "./loopback-server.js";
import { resolveTokenStore } from "./token-store.js";

export function createCodexEntry(): ProviderEntry {
  const buildProvider = async (): Promise<CodexImageProvider> => {
    const store = await resolveTokenStore();
    return new CodexImageProvider(new CodexTokenManager(store));
  };
  const authStatus = async (): Promise<ProviderAuthInfo> => {
    const store = await resolveTokenStore();
    const manager = new CodexTokenManager(store);
    const status = await manager.status();
    return {
      name: PROVIDER_NAME,
      configured: status.connected,
      detail: status.connected ? undefined : "Run `imagegen auth codex login` to connect.",
    };
  };
  let sizePolicy: CodexImageProvider["sizePolicy"] | undefined;
  return {
    provider: {
      name: PROVIDER_NAME,
      get sizePolicy() {
        if (!sizePolicy) throw new Error("Codex provider is not initialized.");
        return sizePolicy;
      },
      generate: async (request) => {
        const provider = await buildProvider();
        sizePolicy = provider.sizePolicy;
        return provider.generate(request);
      },
      edit: async (request) => {
        const provider = await buildProvider();
        sizePolicy = provider.sizePolicy;
        return provider.edit(request);
      },
    },
    authStatus,
  };
}

export {
  CodexImageProvider,
  CodexTokenManager,
  DEFAULT_REDIRECT_URI,
  LOOPBACK_PORT,
  PROVIDER_NAME,
  ReauthRequiredError,
  LoopbackError,
  consumeVerifier,
  resolveTokenStore,
  startPkceFlow,
  waitForOAuthCallback,
};
export type { ProviderAuthInfo, ProviderEntry };