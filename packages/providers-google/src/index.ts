import { type ProviderEntry } from "@imagegencli/core";
import { GeminiImageProvider } from "./gemini-client.js";
import { geminiStore, storedKey } from "./auth.js";
export * from "./auth.js";
export * from "./gemini-client.js";
export * from "./image-size.js";
export function createGeminiEntry(): ProviderEntry {
  return {
    provider: new GeminiImageProvider(async () =>
      storedKey(await geminiStore()),
    ),
    authStatus: async () => {
      const store = await geminiStore();
      let configured = false;
      try {
        await storedKey(store);
        configured = true;
      } catch {
        /* Local status only; no network request. */
      }
      return {
        name: "gemini",
        configured,
        detail: configured
          ? undefined
          : "Run imagegen auth gemini login to configure an API key.",
      };
    },
  };
}
