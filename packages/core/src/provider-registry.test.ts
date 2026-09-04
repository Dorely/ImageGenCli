import { describe, expect, it } from "vitest";
import { ProviderRegistry, type ProviderAuthInfo, type ProviderEntry } from "./provider-registry.js";
import type { IImageProvider } from "./image-provider.js";

function entry(name: string, configured: boolean): ProviderEntry {
  const provider = { name, sizePolicy: { resolveSize: () => ({ width: 1, height: 1, size: "1x1", pixels: 1 }) }, generate: async () => { throw new Error("x"); }, edit: async () => { throw new Error("x"); } } as unknown as IImageProvider;
  const authStatus = async (): Promise<ProviderAuthInfo> => ({ name, configured });
  return { provider, authStatus };
}

describe("ProviderRegistry", () => {
  it("resolves the single configured provider by default", async () => {
    const registry = new ProviderRegistry();
    registry.register(entry("codex", true));
    registry.register(entry("gemini", false));
    const resolved = await registry.resolve(undefined);
    expect(resolved.map((item) => item.provider.name)).toEqual(["codex"]);
  });

  it("fails with the configured list when several are ready", async () => {
    const registry = new ProviderRegistry();
    registry.register(entry("codex", true));
    registry.register(entry("gemini", true));
    await expect(registry.resolve(undefined)).rejects.toThrow(/codex, gemini/);
  });

  it("fails when nothing is configured", async () => {
    const registry = new ProviderRegistry();
    registry.register(entry("codex", false));
    await expect(registry.resolve(undefined)).rejects.toThrow(/No providers are configured/);
  });

  it("resolves explicit multiples and rejects unconfigured ones", async () => {
    const registry = new ProviderRegistry();
    registry.register(entry("codex", true));
    registry.register(entry("gemini", false));
    const resolved = await registry.resolve(["codex"]);
    expect(resolved.map((item) => item.provider.name)).toEqual(["codex"]);
    await expect(registry.resolve(["codex", "gemini"])).rejects.toThrow(/not configured/);
    await expect(registry.resolve(["nope"])).rejects.toThrow(/Unknown provider/);
  });
});
