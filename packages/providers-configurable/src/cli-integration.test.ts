import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
const state = vi.hoisted(() => ({
  root: "",
  key: "fixture-secret",
  exits: [] as unknown[],
}));
vi.mock("@imagegencli/credentials", async (original) => ({
  ...(await original<Record<string, unknown>>()),
  defaultCredentialFilePath: () => join(state.root, "tokens.json"),
  resolveCredentialStore: async () => ({
    load: async () => (state.key ? { apiKey: state.key } : null),
    save: async (_name: string, value: { apiKey: string }) => {
      state.key = value.apiKey;
    },
    clear: async () => {
      state.key = "";
    },
    describe: () => ({
      backend: "file",
      location: join(state.root, "tokens.json"),
    }),
  }),
}));
vi.mock("@imagegencli/providers-codex", async (original) => ({
  ...(await original<Record<string, unknown>>()),
  createCodexEntry: () => ({
    provider: { name: "codex" },
    authStatus: async () => ({ name: "codex", configured: false }),
  }),
}));
vi.mock("@imagegencli/providers-google", async (original) => ({
  ...(await original<Record<string, unknown>>()),
  createGeminiEntry: () => ({
    provider: { name: "gemini" },
    authStatus: async () => ({ name: "gemini", configured: false }),
  }),
}));
vi.mock("../../../apps/cli/src/key-input.js", () => ({
  readApiKey: async () => "fixture-secret",
}));
const entry = fileURLToPath(
  new URL("../../../apps/cli/src/index.ts", import.meta.url),
);
const argv = process.argv;
let stdout = "",
  stderr = "";
beforeEach(async () => {
  state.root = await mkdtemp(join(tmpdir(), "imagegen-endpoint-cli-"));
  state.key = "";
});
afterEach(async () => {
  process.argv = argv;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  await rm(state.root, { recursive: true, force: true });
});
async function run(args: string[]) {
  vi.restoreAllMocks();
  vi.resetModules();
  stdout = "";
  stderr = "";
  state.exits = [];
  vi.spyOn(process.stdout, "write").mockImplementation((c) => {
    stdout += String(c);
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation((c) => {
    stderr += String(c);
    return true;
  });
  vi.spyOn(process, "exit").mockImplementation((c) => {
    state.exits.push(c);
    throw new Error("CLI exited");
  });
  process.argv = [process.execPath, entry, ...args];
  await import(entry);
  return JSON.parse(stdout);
}
describe("endpoint CLI", () => {
  it("adds, shows, updates, lists, and removes profiles", async () => {
    const added = await run([
      "providers",
      "add",
      "router",
      "--api",
      "openrouter",
      "--model",
      "example/model",
    ]);
    expect(added.provider.baseUrl).toBe("https://openrouter.ai/api/v1");
    expect((await run(["providers", "show", "router"])).provider.model).toBe(
      "example/model",
    );
    expect(
      (await run(["providers", "update", "router", "--model", "another/model"]))
        .provider.model,
    ).toBe("another/model");
    expect((await run(["providers"])).providers).toContainEqual({
      name: "router",
      configured: false,
    });
    await run(["auth", "router", "login", "--key-stdin"]);
    expect(stdout + stderr).not.toContain("fixture-secret");
    expect(
      (await run(["auth", "router", "status", "--show-path"])).connected,
    ).toBe(true);
    expect((await run(["providers"])).providers).toContainEqual({
      name: "router",
      configured: true,
    });
    await run(["auth", "router", "logout"]);
    expect(state.key).toBe("");
    expect((await run(["providers", "show", "router"])).provider.name).toBe(
      "router",
    );
    await run(["providers", "remove", "router"]);
    expect(
      JSON.parse(await readFile(join(state.root, "providers.json"), "utf8"))
        .profiles,
    ).toEqual([]);
  });
  it("uses auth-none profiles without a key and discovers explicitly", async () => {
    await run([
      "providers",
      "add",
      "local",
      "--api",
      "openai-images",
      "--base-url",
      "http://localhost:1234/v1",
      "--auth",
      "none",
      "--model",
      "test",
    ]);
    expect((await run(["auth", "local", "status"])).auth).toBe("none");
    const fetchImpl = vi.fn(async (_url: unknown) =>
      Response.json({ data: [{ id: "test-model" }] }),
    );
    vi.stubGlobal("fetch", fetchImpl);
    expect((await run(["models", "--provider", "local"])).models).toEqual([
      { id: "test-model", capabilities: "unknown" },
    ]);
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain("/models");
  });
  it("drives a ComfyUI profile end to end without a key", async () => {
    const added = await run([
      "providers",
      "add",
      "local",
      "--api",
      "comfyui",
      "--base-url",
      "http://127.0.0.1:8188",
      "--model",
      "flux3-klein",
      "--start-command",
      "start-comfy --port 8188",
    ]);
    expect(added.provider).toMatchObject({
      auth: "none",
      startCommand: "start-comfy --port 8188",
    });
    const data = await sharp({
      create: { width: 4, height: 3, channels: 3, background: "blue" },
    })
      .png()
      .toBuffer();
    const loaders: Record<string, [string, string[]]> = {
      UNETLoader: ["unet_name", ["flux3-image-klein-int8-convrot.safetensors"]],
      CLIPLoader: [
        "clip_name",
        [
          "qwen3vl_4b_int8_convrot.safetensors",
          "qwen3.5_9b_flux3_prompt_upsampler_w4a8.safetensors",
        ],
      ],
      VAELoader: ["vae_name", ["flux2-vae.safetensors"]],
    };
    const fetchImpl = vi.fn(async (input: unknown) => {
      const url = new URL(String(input));
      if (url.pathname.startsWith("/object_info/")) {
        const node = url.pathname.split("/").pop() ?? "";
        const [name, files] = loaders[node];
        return Response.json({
          [node]: { input: { required: { [name]: [files] } } },
        });
      }
      if (url.pathname === "/prompt")
        return Response.json({ prompt_id: "job" });
      if (url.pathname === "/history/job")
        return Response.json({
          job: {
            status: { status_str: "success", completed: true },
            outputs: {
              caption: { text: ["Expanded caption"] },
              output: { images: [{ filename: "out.png", type: "temp" }] },
            },
          },
        });
      return new Response(new Uint8Array(data));
    });
    vi.stubGlobal("fetch", fetchImpl);
    expect(
      (await run(["models", "--provider", "local"])).models.map(
        (m: { id: string }) => m.id,
      ),
    ).toEqual(["flux3-klein", "flux3-klein-raw"]);
    const out = join(state.root, "local.png");
    const result = await run([
      "generate",
      "--provider",
      "local",
      "--prompt",
      "a red cube",
      "--quality",
      "low",
      "--out",
      out,
    ]);
    expect(result.images[0]).toMatchObject({
      path: out,
      width: 4,
      height: 3,
      prompt: "Expanded caption",
      servedModel: "flux3-image-klein-int8-convrot",
      served: { steps: 4, upsampled: true },
    });
    expect(result.requestedModel).toBe("flux3-klein");
    await expect(
      run([
        "edit",
        "--provider",
        "local",
        "--source",
        out,
        "--mask",
        out,
        "--prompt",
        "brief",
        "--out",
        join(state.root, "edited.png"),
      ]),
    ).rejects.toThrow();
    expect(state.exits[0]).toBe(2);
    expect(stderr).toContain("no mask input");
  });
  it("saves ComfyUI workflow paths as absolute and requires a model", async () => {
    const add = ["providers", "add", "local", "--api", "comfyui"];
    const url = ["--base-url", "http://127.0.0.1:8188"];
    await expect(run([...add, ...url])).rejects.toThrow();
    expect(state.exits[0]).toBe(2);
    expect(stderr).toContain("need --model");
    const added = await run([
      ...add,
      ...url,
      "--model",
      "my-model",
      "--workflow",
      "text.json",
      "--edit-workflow",
      "edit.json",
    ]);
    expect(added.provider).toMatchObject({
      model: "my-model",
      workflow: resolve("text.json"),
      editWorkflow: resolve("edit.json"),
    });
    const updated = await run([
      "providers",
      "update",
      "local",
      "--workflow",
      "other.json",
    ]);
    expect(updated.provider.workflow).toBe(resolve("other.json"));
    expect((await run(["providers", "show", "local"])).provider).toEqual(
      updated.provider,
    );
  });
  it("saves actual raster bytes through generate and edit, preserving source order", async () => {
    await run([
      "providers",
      "add",
      "router",
      "--api",
      "openrouter",
      "--model",
      "test",
    ]);
    await run(["auth", "router", "login"]);
    const data = await sharp({
      create: { width: 4, height: 3, channels: 3, background: "blue" },
    })
      .png()
      .toBuffer();
    const calls: Record<string, unknown>[] = [];
    vi.stubGlobal("fetch", async (_url: unknown, init: RequestInit) => {
      calls.push(JSON.parse(String(init.body)));
      return Response.json({
        data: [{ b64_json: data.toString("base64"), media_type: "image/png" }],
      });
    });
    const out = join(state.root, "new.png");
    const result = await run([
      "generate",
      "--provider",
      "router",
      "--prompt",
      "exact brief",
      "--out",
      out,
    ]);
    expect(result.images[0]).toMatchObject({ width: 4, height: 3, path: out });
    expect(await readFile(out)).toEqual(data);
    const ref = join(state.root, "ref.png");
    await writeFile(ref, data);
    await run([
      "edit",
      "--provider",
      "router",
      "--source",
      out,
      "--reference",
      ref,
      "--prompt",
      "change blue to red",
      "--out",
      join(state.root, "edited.png"),
    ]);
    expect(calls[1].prompt).toBe("change blue to red");
    expect(calls[1].input_references).toHaveLength(2);
  });
  it("reports configuration, auth, and usage failures with meaningful exit codes", async () => {
    await expect(
      run(["providers", "add", "codex", "--api", "openrouter"]),
    ).rejects.toThrow();
    expect(state.exits[0]).toBe(2);
    await run([
      "providers",
      "add",
      "router",
      "--api",
      "openrouter",
      "--model",
      "test",
    ]);
    await run(["auth", "router", "login"]);
    vi.stubGlobal(
      "fetch",
      async () => new Response("fixture-secret", { status: 401 }),
    );
    await expect(
      run([
        "generate",
        "--provider",
        "router",
        "--prompt",
        "brief",
        "--out",
        join(state.root, "out.png"),
      ]),
    ).rejects.toThrow();
    expect(state.exits[0]).toBe(3);
    expect(stderr).not.toContain("fixture-secret");
  });
  it("includes sanitized upstream diagnostics in CLI JSON errors", async () => {
    await run([
      "providers",
      "add",
      "router",
      "--api",
      "openrouter",
      "--model",
      "test",
    ]);
    await run(["auth", "router", "login"]);
    vi.stubGlobal("fetch", async () =>
      Response.json(
        {
          error: {
            message: "Quota exhausted fixture-secret",
            metadata: { provider_name: "Google AI Studio" },
          },
        },
        { status: 429, headers: { "retry-after": "10" } },
      ),
    );
    await expect(
      run([
        "generate",
        "--provider",
        "router",
        "--prompt",
        "brief",
        "--out",
        join(state.root, "out.png"),
      ]),
    ).rejects.toThrow();
    const failure = JSON.parse(stderr.trim().split("\n")[0]);
    expect(failure.error).toMatchObject({
      kind: "provider",
      statusCode: 429,
      upstreamProvider: "Google AI Studio",
      retryAfterSeconds: 10,
    });
    expect(failure.error.message).toContain("upstream's quota");
    expect(stderr).not.toContain("fixture-secret");
    expect(state.exits[0]).toBe(4);
  });
});
