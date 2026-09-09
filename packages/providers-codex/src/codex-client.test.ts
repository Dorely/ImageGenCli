import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GenerateRequest, ImageBackground } from "@imagegencli/core";
import { CodexImageProvider, type CodexClientOptions } from "./codex-client.js";
import { CodexTokenManager } from "./codex-token-manager.js";

const models = ["gpt-image-2.5-flare", "gpt-image-2.5-sunburst", "gpt-image-2"];
const input = { data: new Uint8Array([1, 2, 3]), contentType: "image/png" };
const request: GenerateRequest = { prompt: "Draw a bicycle", out: "unused.png" };

function setup(options: CodexClientOptions = {}) {
  const token = `test.${Buffer.from(JSON.stringify({ "https://api.openai.com/auth": { chatgpt_account_id: "test-account" } })).toString("base64url")}.test`;
  const load = vi.fn(async () => ({ accessToken: token, expiresAt: Date.now() + 3_600_000 }));
  const tokens = new CodexTokenManager({ load, save: vi.fn(), clear: vi.fn(), describe: () => ({ backend: "file", location: "unused" }) });
  const fetchImpl = vi.fn<typeof fetch>(async () => new Response(`data: ${JSON.stringify({ type: "response.output_item.done", item: { type: "image_generation_call", result: Buffer.from("pixels").toString("base64") } })}\n\ndata: [DONE]\n`));
  const provider = new CodexImageProvider(tokens, { fetchImpl, ...options });
  const payload = (index = 0) => JSON.parse(String(fetchImpl.mock.calls[index][1]?.body));
  return { provider, fetchImpl, payload, load };
}

beforeEach(() => {
  vi.stubEnv("IMAGEGEN_CODEX_IMAGE_MODEL", undefined);
  vi.stubEnv("IMAGEGEN_CODEX_MODEL", undefined);
});
afterEach(() => vi.unstubAllEnvs());

describe("image model selection", () => {
  it("defaults to Flare while retaining orchestration and auto options", async () => {
    const { provider, payload } = setup();
    expect((await provider.generate(request)).imageModel).toBe(models[0]);
    expect(payload().model).toBe("gpt-5.6-luna");
    expect(payload().tools[0]).toMatchObject({ model: models[0], background: "auto", output_format: "png" });
    expect(payload().tools[0].quality).toBeUndefined();
  });

  it.each(models)("selects %s for generation and editing with accurate results", async (model) => {
    const { provider, payload } = setup();
    for (const result of [await provider.generate({ ...request, model }), await provider.edit({ ...request, model, sourceImage: input })]) {
      expect(result.imageModel).toBe(model);
    }
    expect(payload().tools[0]).toMatchObject({ model, action: "generate" });
    expect(payload(1).tools[0]).toMatchObject({ model, action: "edit" });
  });

  it("prioritizes request, constructor, environment, then default without leaking overrides", async () => {
    vi.stubEnv("IMAGEGEN_CODEX_IMAGE_MODEL", models[2]);
    expect((await setup().provider.generate(request)).imageModel).toBe(models[2]);
    const { provider } = setup({ imageModel: models[1] });
    expect((await provider.generate({ ...request, model: models[0] })).imageModel).toBe(models[0]);
    expect((await provider.generate(request)).imageModel).toBe(models[1]);
    expect((await provider.generate({ ...request, model: "custom-model" })).imageModel).toBe("custom-model");
  });

  it.each(["", "   "])("rejects blank request models before credentials or network", async (model) => {
    const { provider, fetchImpl, load } = setup();
    await expect(provider.generate({ ...request, model })).rejects.toMatchObject({ kind: "usage" });
    expect(load).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("surfaces model errors without fallback", async () => {
    const { provider, fetchImpl } = setup();
    fetchImpl.mockResolvedValue(new Response(JSON.stringify({ error: { message: "invalid_value for gpt-image-2.5-flare" } }), { status: 400 }));
    await expect(provider.generate(request)).rejects.toMatchObject({ statusCode: 400 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("backgrounds and quality", () => {
  it.each(["auto", "opaque", "transparent"] as const)("forwards %s on generate and edit", async (background) => {
    const { provider, payload } = setup();
    await provider.generate({ ...request, background });
    await provider.edit({ ...request, background, sourceImage: input });
    expect(payload().tools[0].background).toBe(background);
    expect(payload(1).tools[0].background).toBe(background);
  });

  it.each(["", "  ", "clear"])("rejects invalid background %j at the provider boundary", async (background) => {
    const { provider, fetchImpl } = setup();
    await expect(provider.generate({ ...request, background: background as ImageBackground })).rejects.toMatchObject({ kind: "usage" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each(["jpeg", "jpg", "JPEG"])("rejects transparent %s before credentials or network", async (format) => {
    const { provider, fetchImpl, load } = setup();
    await expect(provider.generate({ ...request, format, background: "transparent" })).rejects.toMatchObject({ kind: "usage" });
    await expect(provider.edit({ ...request, format, background: "transparent", sourceImage: input })).rejects.toMatchObject({ kind: "usage" });
    expect(load).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each(["png", "webp"])("preserves references, masks and options for multiple transparent %s images", async (format) => {
    const { provider, payload, fetchImpl } = setup();
    const result = await provider.edit({ ...request, model: models[1], sourceImage: input, referenceImages: [input], mask: input, background: "transparent", format, count: 2 });
    expect(result.images).toHaveLength(2);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    for (let i = 0; i < 2; i++) {
      expect(payload(i).tools[0]).toMatchObject({ model: models[1], background: "transparent", output_format: format, action: "edit", input_image_mask: { image_url: "data:image/png;base64,AQID" } });
      expect(payload(i).input[0].content).toHaveLength(3);
      expect(result.images[i].mimeType).toBe(`image/${format}`);
    }
  });

  it.each(["xhigh", "max"])("allows %s on new models and rejects it on gpt-image-2", async (quality) => {
    for (const model of models.slice(0, 2)) {
      const { provider, payload } = setup();
      await provider.generate({ ...request, model, quality });
      expect(payload().tools[0].quality).toBe(quality);
    }
    const { provider, fetchImpl } = setup();
    await expect(provider.edit({ ...request, sourceImage: input, model: models[2], quality })).rejects.toMatchObject({ kind: "usage" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
