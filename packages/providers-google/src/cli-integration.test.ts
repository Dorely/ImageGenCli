import { PassThrough } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
const state = vi.hoisted(() => ({
  key: undefined as string | undefined,
  payloads: [] as unknown[],
  exits: [] as (number | string | null | undefined)[],
}));
vi.mock("@imagegencli/providers-codex", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    createCodexEntry: () => ({
      provider: {
        name: "codex",
        generate: async () => ({
          imageModel: "test-codex",
          images: [
            {
              data: await sharp({
                create: { width: 2, height: 2, channels: 3, background: "red" },
              })
                .png()
                .toBuffer(),
              mimeType: "image/png",
              width: 2,
              height: 2,
              prompt: "test",
            },
          ],
        }),
      },
      authStatus: async () => ({ name: "codex", configured: true }),
    }),
  };
});
vi.mock("@imagegencli/credentials", () => ({
  resolveCredentialStore: async () => ({
    load: async () => (state.key ? { apiKey: state.key } : null),
    save: async (_name: string, v: { apiKey: string }) => {
      state.key = v.apiKey;
    },
    clear: async () => {
      state.key = undefined;
    },
    describe: () => ({ backend: "vault", location: "test-only" }),
  }),
}));
vi.mock("../../../apps/cli/src/key-input.js", async (importOriginal) => ({
  ...(await importOriginal<{
    readApiKey: (
      fromStdin: boolean,
      input?: NodeJS.ReadStream,
      output?: NodeJS.WriteStream,
    ) => Promise<string>;
  }>()),
  readApiKey: async () => "fixture-key",
}));
const entry = fileURLToPath(
  new URL("../../../apps/cli/src/index.ts", import.meta.url),
);
const original = process.argv;
afterEach(() => {
  process.argv = original;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
async function run(args: string[]) {
  vi.resetModules();
  state.exits = [];
  let stdout = "",
    stderr = "";
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
    throw new Error(`exit ${c}`);
  });
  process.argv = [process.execPath, entry, ...args];
  await import(entry);
  return { stdout, stderr };
}
describe("Gemini CLI", () => {
  it("logs in, reports secret-free status, and logs out", async () => {
    state.key = undefined;
    expect(
      JSON.parse(
        (await run(["auth", "gemini", "login", "--key-stdin"])).stdout,
      ),
    ).toEqual({ provider: "gemini", status: "connected" });
    const status = await run(["auth", "gemini", "status", "--show-path"]);
    expect(JSON.parse(status.stdout)).toEqual({
      provider: "gemini",
      connected: true,
      store: { backend: "vault", location: "test-only" },
    });
    expect(status.stdout + status.stderr).not.toContain("fixture-key");
    await run(["auth", "gemini", "logout"]);
    expect(state.key).toBeUndefined();
  });
  it("saves multi-provider outputs and requires selection when both configured", async () => {
    state.key = "fixture-key";
    const directory = await mkdtemp(join(tmpdir(), "imagegen-gemini-"));
    const bytes = await sharp({
      create: { width: 3, height: 4, channels: 3, background: "blue" },
    })
      .png()
      .toBuffer();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url, init) => {
        state.payloads.push(JSON.parse(init.body));
        return Response.json({
          status: "completed",
          steps: [
            {
              type: "model_output",
              content: [
                {
                  type: "image",
                  mime_type: "image/png",
                  data: bytes.toString("base64"),
                },
              ],
            },
          ],
        });
      }),
    );
    try {
      await expect(
        run(["generate", "--prompt", "test", "--out", directory]),
      ).rejects.toThrow();
      expect(state.exits[0]).toBe(2);
      const result = await run([
        "generate",
        "--provider",
        "codex",
        "--provider",
        "gemini",
        "--prompt",
        "test",
        "--out",
        directory,
      ]);
      const lines = result.stdout
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line));
      expect(lines.map((l) => l.provider)).toEqual(["codex", "gemini"]);
      expect(await readFile(join(directory, "gemini-image-1.png"))).toEqual(
        bytes,
      );
      expect(lines[1].images[0]).toMatchObject({ width: 3, height: 4 });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
  it("maps rejected keys to auth exit code", async () => {
    state.key = "fixture-key";
    vi.stubGlobal(
      "fetch",
      async () => new Response("fixture-key", { status: 403 }),
    );
    await expect(
      run([
        "generate",
        "--provider",
        "gemini",
        "--prompt",
        "test",
        "--out",
        "unused.png",
      ]),
    ).rejects.toThrow();
    expect(state.exits[0]).toBe(3);
  });
});
describe("hidden key input", () => {
  it("reads explicit stdin without echo", async () => {
    const actual = await vi.importActual<{
      readApiKey: (
        fromStdin: boolean,
        input?: NodeJS.ReadStream,
        output?: NodeJS.WriteStream,
      ) => Promise<string>;
    }>("../../../apps/cli/src/key-input.js");
    const input = new PassThrough();
    const output = new PassThrough();
    input.end("test-key\n");
    expect(
      await actual.readApiKey(
        true,
        input as unknown as NodeJS.ReadStream,
        output as unknown as NodeJS.WriteStream,
      ),
    ).toBe("test-key\n");
    expect(output.read()).toBeNull();
  });
  it("restores raw mode and stops on cancellation", async () => {
    const actual = await vi.importActual<{
      readApiKey: (
        fromStdin: boolean,
        input?: NodeJS.ReadStream,
        output?: NodeJS.WriteStream,
      ) => Promise<string>;
    }>("../../../apps/cli/src/key-input.js");
    const input = Object.assign(new PassThrough(), {
      isTTY: true,
      isRaw: false,
      setRawMode: vi.fn(),
    });
    const output = new PassThrough();
    const pending = actual.readApiKey(
      false,
      input as unknown as NodeJS.ReadStream,
      output as unknown as NodeJS.WriteStream,
    );
    input.emit("keypress", undefined, { name: "c", ctrl: true });
    await expect(pending).rejects.toThrow("cancelled");
    expect(input.setRawMode.mock.calls).toEqual([[true], [false]]);
    expect(input.listenerCount("keypress")).toBe(0);
  });
  it("refuses implicit piped input", async () => {
    const actual = await vi.importActual<{
      readApiKey: (
        fromStdin: boolean,
        input?: NodeJS.ReadStream,
        output?: NodeJS.WriteStream,
      ) => Promise<string>;
    }>("../../../apps/cli/src/key-input.js");
    await expect(
      actual.readApiKey(
        false,
        new PassThrough() as unknown as NodeJS.ReadStream,
      ),
    ).rejects.toThrow("--key-stdin");
  });
});
