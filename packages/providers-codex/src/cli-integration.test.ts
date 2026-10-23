import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@imagegencli/providers-google", () => ({ createGeminiEntry: () => ({ provider: { name: "gemini" }, authStatus: async () => ({ name: "gemini", configured: false }) }) }));

vi.mock("@imagegencli/providers-configurable", async (original) => ({ ...await original<Record<string, unknown>>(), ProfileRepository: class { async list() { return []; } } }));

const state = vi.hoisted(() => ({ payloads: [] as { tools: Record<string, unknown>[] }[], revisedPrompt: undefined as string | undefined }));
// A one-pixel PNG fixture for byte-preserving file output.
const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=";

vi.mock("@imagegencli/providers-codex", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./index.js")>();
  const { CodexImageProvider } = await import("./codex-client.js");
  const { CodexTokenManager } = await import("./codex-token-manager.js");
  return {
    ...actual,
    createCodexEntry: () => {
      const token = `test.${Buffer.from(JSON.stringify({ "https://api.openai.com/auth": { chatgpt_account_id: "test-account" } })).toString("base64url")}.test`;
      const tokens = new CodexTokenManager({
        load: async () => ({ accessToken: token, expiresAt: Date.now() + 3_600_000 }),
        save: async () => {}, clear: async () => {},
        describe: () => ({ backend: "file", location: "unused" }),
      });
      return {
        provider: new CodexImageProvider(tokens, {
          fetchImpl: async (_url, init) => {
            state.payloads.push(JSON.parse(String(init?.body)));
            const done = { type: "response.output_item.done", item: { type: "image_generation_call", result: png, revised_prompt: state.revisedPrompt } };
            const completed = { type: "response.completed", response: { id: "resp-1", model: "gpt-6-luna", output: [], usage: { input_tokens: 2248, output_tokens: 33 }, tool_usage: { image_gen: { input_tokens: 20, output_tokens: 429 } } } };
            return new Response(`data: ${JSON.stringify(done)}\n\ndata: ${JSON.stringify(completed)}\n\ndata: [DONE]\n`, {
              headers: { "x-codex-plan-type": "plus", "x-codex-primary-used-percent": "3", "x-codex-primary-window-minutes": "300", "x-codex-turn-state": "opaque" },
            });
          },
        }),
        authStatus: async () => ({ name: "codex", configured: true }),
      };
    },
  };
});

const cliEntry = fileURLToPath(new URL("../../../apps/cli/src/index.ts", import.meta.url));
let directory: string;
let stdout: string;
let stderr: string;
const originalArgv = process.argv;

beforeEach(async () => {
  vi.resetModules();
  vi.stubEnv("IMAGEGEN_CODEX_IMAGE_MODEL", undefined);
  state.payloads.length = 0;
  state.revisedPrompt = undefined;
  stdout = "";
  stderr = "";
  directory = await mkdtemp(join(tmpdir(), "imagegen-cli-test-"));
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => { stdout += String(chunk); return true; });
  vi.spyOn(process.stderr, "write").mockImplementation((chunk) => { stderr += String(chunk); return true; });
  vi.spyOn(process, "exit").mockImplementation((code) => { throw new Error(`exit ${code}`); });
});

afterEach(async () => {
  process.argv = originalArgv;
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  await rm(directory, { recursive: true, force: true });
});

async function run(args: string[]) {
  process.argv = [process.execPath, cliEntry, ...args];
  await import(cliEntry);
}

describe("CLI help", () => {
  it.each([[], ["help"], ["--help"], ["help", "generate"], ["generate", "--help"], ["help", "edit"], ["edit", "--help"]])("documents models and quality usage for %j", async (...args) => {
    await run(args);
    for (const text of ["gpt-image-2.5-flare", "gpt-image-2.5-sunburst", "gpt-image-2", "--model", "xhigh and max", "IMAGEGEN_CODEX_IMAGE_MODEL", "Examples:"]) {
      expect(stdout).toContain(text);
    }
    expect(state.payloads).toHaveLength(0);
    expect(stderr).toBe("");
  });
});

describe("CLI skill installation", () => {
  it("installs the packaged skill in a custom skills directory", async () => {
    await run(["skill", "install", "--target", directory]);
    const result = JSON.parse(stdout);
    const path = join(directory, "imagegen-cli", "SKILL.md");
    expect(result.installed).toEqual([{ target: directory, path, status: "installed" }]);
    expect(await readFile(path, "utf8")).toContain("name: imagegen-cli");
    expect(stderr).toBe("");
  });

  it("preserves a different existing skill unless forced", async () => {
    const path = join(directory, "imagegen-cli", "SKILL.md");
    await mkdir(join(directory, "imagegen-cli"));
    await writeFile(path, "personal edits");
    await expect(run(["skill", "install", "--target", directory])).rejects.toThrow();
    expect(JSON.parse(stderr.split("\n")[0]).error.kind).toBe("usage");
    expect(await readFile(path, "utf8")).toBe("personal edits");

    vi.resetModules();
    stdout = "";
    stderr = "";
    await run(["skill", "install", "--target", directory, "--force"]);
    expect(JSON.parse(stdout).installed[0].status).toBe("updated");
    expect(await readFile(path, "utf8")).toContain("name: imagegen-cli");
    expect(stderr).toBe("");
  });
});

describe("CLI image requests", () => {
  it.each(["generate", "edit"])("forwards %s options and saves PNG bytes unchanged", async (command) => {
    const source = join(directory, "source.png");
    const out = join(directory, "out.png");
    const fixture = Buffer.from(png, "base64");
    await writeFile(source, fixture);
    await run([command, "--prompt", "Draw a blue bicycle", "--out", out, "--model", "gpt-image-2.5-sunburst", "--quality", "max", ...(command === "edit" ? ["--source", source, "--mask", source] : []), "--reference", source]);
    expect(state.payloads[0].tools[0]).toMatchObject({ model: "gpt-image-2.5-sunburst", background: "auto", quality: "max", action: command, output_format: "png" });
    const result = JSON.parse(stdout);
    expect(result.imageModel).toBe("gpt-image-2.5-sunburst");
    expect(result.images[0].path).toBe(out);
    expect(await readFile(out)).toEqual(fixture);
    expect(result.images[0]).toMatchObject({ width: 1, height: 1 });
    expect(result.images[0].revisedPrompt).toBeUndefined();
    expect(stderr).toBe("");
  });

  it("reports a revised prompt and appends a prompt-free usage line when configured", async () => {
    const log = join(directory, "logs", "usage.jsonl");
    vi.stubEnv("IMAGEGEN_USAGE_LOG", log);
    state.revisedPrompt = "Draw a blue bicycle, studio photo";
    await run(["generate", "--prompt", "Draw a blue bicycle", "--out", join(directory, "out.png"), "--size", "1024x1024", "--quality", "low"]);
    expect(JSON.parse(stdout).images[0].revisedPrompt).toBe("Draw a blue bicycle, studio photo");
    const lines = (await readFile(log, "utf8")).trim().split("\n");
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0])).toMatchObject({
      command: "generate",
      provider: "codex",
      requested: { size: "1024x1024", quality: "low", count: 1, references: 0 },
      images: [{ width: 1, height: 1, promptRevised: true, usage: {
        orchestrationModel: "gpt-6-luna",
        orchestration: { input_tokens: 2248, output_tokens: 33 },
        imageGeneration: { input_tokens: 20, output_tokens: 429 },
        planLimits: { planType: "plus", primary: { usedPercent: 3, windowMinutes: 300 } },
      } }],
    });
    expect(lines[0]).not.toContain("bicycle");
    expect(lines[0]).not.toContain("opaque");
    expect(lines[0]).not.toContain("test-account");
  });

  it.each([["--model", ""], ["--model", "   "], ["--background", "transparent"], ["--unknown-option", "value"]])("rejects invalid selection %j before generation", async (...flags) => {
    await expect(run(["generate", "--prompt", "Draw a bicycle", "--out", join(directory, "unused.png"), ...flags])).rejects.toThrow();
    expect(JSON.parse(stderr.split("\n")[0]).error.kind).toBe("usage");
    expect(state.payloads).toHaveLength(0);
    expect(stdout).toBe("");
  });
});
