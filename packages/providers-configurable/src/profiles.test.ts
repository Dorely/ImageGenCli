import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { FileCredentialStore } from "@imagegencli/credentials";
import { ProfileRepository, validateProfile } from "./profiles.js";
let directory: string | undefined;
afterEach(async () => {
  if (directory) await rm(directory, { recursive: true, force: true });
});
async function setup() {
  directory = await mkdtemp(join(tmpdir(), "imagegen-profiles-"));
  const store = new FileCredentialStore<{ apiKey: string }>(
    join(directory, "tokens.json"),
  );
  return {
    store,
    repository: new ProfileRepository(
      join(directory, "providers.json"),
      async () => store,
    ),
  };
}
describe("endpoint profiles", () => {
  it("persists non-secret profiles with defaults and model changes", async () => {
    const { repository } = await setup();
    const p = await repository.add({ name: "router", api: "openrouter" });
    expect(p).toEqual({
      name: "router",
      api: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      auth: "bearer",
    });
    await repository.update("router", { model: "test/model" });
    expect((await repository.get("router")).model).toBe("test/model");
    expect(JSON.parse(await readFile(repository.path, "utf8"))).toEqual({
      version: 1,
      profiles: [{ ...p, model: "test/model" }],
    });
    await expect(
      repository.add({ name: "router", api: "openrouter" }),
    ).rejects.toThrow("already exists");
  });
  it("clears credentials on origin changes and removal, preserves other accounts", async () => {
    const { repository, store } = await setup();
    await repository.add({
      name: "test",
      api: "openai-images",
      baseUrl: "https://a.example/v1",
    });
    await store.save("test", { apiKey: "fixture-secret" });
    await store.save("gemini", { apiKey: "gemini-fixture" });
    await repository.update("test", { baseUrl: "https://a.example/v2" });
    expect(await store.load("test")).not.toBeNull();
    await repository.update("test", { baseUrl: "https://b.example/v1" });
    expect(await store.load("test")).toBeNull();
    await store.save("test", { apiKey: "fixture-secret" });
    await repository.remove("test");
    expect(await store.load("test")).toBeNull();
    expect(await store.load("gemini")).toEqual({ apiKey: "gemini-fixture" });
    expect(await repository.list()).toEqual([]);
  });
  it("clears credentials when changing auth mode", async () => {
    const { repository, store } = await setup();
    await repository.add({ name: "test", api: "openrouter" });
    await store.save("test", { apiKey: "fixture" });
    await repository.update("test", { auth: "none" });
    expect(await store.load("test")).toBeNull();
  });
  it.each(["codex", "gemini", "../path", "Invalid", "with space"])(
    "rejects invalid name %s",
    (name) =>
      expect(() => validateProfile({ name, api: "openrouter" })).toThrow(),
  );
  it.each([
    "http://remote.example/v1",
    "https://user:secret@example.com/v1",
    "https://a.example?key=secret",
    "https://a.example/#secret",
  ])("rejects unsafe base URL %s", (baseUrl) =>
    expect(() =>
      validateProfile({ name: "test", api: "openai-images", baseUrl }),
    ).toThrow(),
  );
  it.each([
    "http://localhost:1234/v1",
    "http://127.0.0.1:1234/v1",
    "http://[::1]:1234/v1",
  ])("accepts loopback %s", (baseUrl) =>
    expect(
      validateProfile({
        name: "local",
        api: "openai-images",
        baseUrl,
        auth: "none",
      }).baseUrl,
    ).toBe(baseUrl),
  );
  it("refuses secret fields, missing base URLs, and corrupt config without overwriting", async () => {
    expect(() =>
      validateProfile({ name: "test", api: "openrouter", apiKey: "secret" }),
    ).toThrow("store keys");
    expect(() =>
      validateProfile({ name: "test", api: "openai-images" }),
    ).toThrow("base-url");
    const { repository } = await setup();
    await writeFile(repository.path, "fixture-secret broken json");
    await expect(repository.list()).rejects.not.toThrow("fixture-secret");
    await expect(
      repository.add({ name: "test", api: "openrouter" }),
    ).rejects.toThrow();
    expect(await readFile(repository.path, "utf8")).toBe(
      "fixture-secret broken json",
    );
  });
  it("does not remove the profile when credential deletion fails", async () => {
    const { repository } = await setup();
    await repository.add({ name: "test", api: "openrouter" });
    const failing = new ProfileRepository(repository.path, async () => ({
      load: vi.fn(),
      save: vi.fn(),
      clear: async () => {
        throw new Error("store unavailable");
      },
      describe: () => ({ backend: "vault", location: "test" }),
    }));
    await expect(failing.remove("test")).rejects.toThrow();
    expect(await repository.get("test")).toBeDefined();
  });
});
