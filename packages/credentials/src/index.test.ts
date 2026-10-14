import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FileCredentialStore,
  KeytarCredentialStore,
  resolveCredentialStore,
} from "./index.js";
vi.mock("keytar", () => ({
  default: {
    getPassword: async () => {
      throw new Error("vault unavailable");
    },
  },
}));
let directory: string | undefined;
afterEach(async () => {
  if (directory) await rm(directory, { recursive: true, force: true });
});
describe("credential persistence", () => {
  it("preserves old Codex records and isolates Gemini logout", async () => {
    directory = await mkdtemp(join(tmpdir(), "imagegen-store-"));
    const path = join(directory, "tokens.json");
    const codex = {
      accessToken: "test-access",
      refreshToken: "test-refresh",
      expiresAt: 123,
    };
    await writeFile(path, JSON.stringify({ codex }));
    const store = new FileCredentialStore<{ apiKey: string }>(path);
    await store.save("gemini", { apiKey: "test-key" });
    expect(await store.load("gemini")).toEqual({ apiKey: "test-key" });
    expect(JSON.parse(await readFile(path, "utf8")).codex).toEqual(codex);
    await store.clear("gemini");
    expect(await store.load("gemini")).toBeNull();
    expect(JSON.parse(await readFile(path, "utf8"))).toEqual({ codex });
  });
  it("does not echo corrupt credential contents or overwrite them", async () => {
    directory = await mkdtemp(join(tmpdir(), "imagegen-store-"));
    const path = join(directory, "tokens.json");
    await writeFile(path, "broken fixture-secret");
    const store = new FileCredentialStore(path);
    await expect(store.load("gemini")).rejects.not.toThrow("fixture-secret");
    await expect(store.save("gemini", { apiKey: "new" })).rejects.toThrow();
    expect(await readFile(path, "utf8")).toBe("broken fixture-secret");
  });
  it("uses the original vault service and provider accounts", async () => {
    const records = new Map<string, string>();
    const backend = {
      getPassword: vi.fn(
        async (_s: string, a: string) => records.get(a) ?? null,
      ),
      setPassword: vi.fn(async (_s: string, a: string, v: string) => {
        records.set(a, v);
      }),
      deletePassword: vi.fn(async (_s: string, a: string) => records.delete(a)),
    };
    const store = new KeytarCredentialStore<{ apiKey: string }>(backend);
    await store.save("gemini", { apiKey: "test" });
    expect(await store.load("gemini")).toEqual({ apiKey: "test" });
    await store.clear("gemini");
    expect(await store.load("gemini")).toBeNull();
    expect(backend.setPassword).toHaveBeenCalledWith(
      "ImageGenCli",
      "gemini",
      '{"apiKey":"test"}',
    );
  });
  it("falls back without accessing a real vault", async () =>
    expect((await resolveCredentialStore()).describe().backend).toBe("file"));
});
