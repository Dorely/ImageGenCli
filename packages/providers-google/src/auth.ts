import {
  resolveCredentialStore,
  type CredentialStore,
} from "@imagegencli/credentials";
import { ProviderError } from "@imagegencli/core";
export interface GeminiCredential {
  apiKey: string;
}
export function validateKey(value: string): string {
  const key = value.trim();
  if (!key || /\s/.test(key))
    throw new ProviderError({
      kind: "auth",
      message: "Enter a non-empty Gemini API key without whitespace.",
    });
  return key;
}
export async function geminiStore(): Promise<
  CredentialStore<GeminiCredential>
> {
  return resolveCredentialStore<GeminiCredential>();
}
export async function storedKey(
  store: CredentialStore<GeminiCredential>,
): Promise<string> {
  const value = await store.load("gemini");
  if (!value || typeof value.apiKey !== "string")
    throw new ProviderError({
      kind: "auth",
      message: "Run imagegen auth gemini login to configure an API key.",
    });
  return validateKey(value.apiKey);
}
