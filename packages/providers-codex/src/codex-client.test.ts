import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GenerateRequest } from "@imagegencli/core";
import { CodexImageProvider, type CodexClientOptions } from "./codex-client.js";
import { CodexTokenManager } from "./codex-token-manager.js";

const models = ["gpt-image-2.5-flare", "gpt-image-2.5-sunburst", "gpt-image-2"];
const input = { data: new Uint8Array([1, 2, 3]), contentType: "image/png" };
const request: GenerateRequest = { prompt: "Draw a bicycle", out: "unused.png" };
// A one-pixel PNG fixture.
const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=";

function jwt(accountId: string) {
  return `test.${Buffer.from(JSON.stringify({ "https://api.openai.com/auth": { chatgpt_account_id: accountId } })).toString("base64url")}.test`;
}

function success(b64 = png) {
  return new Response(JSON.stringify({ data: [{ b64_json: b64, generation_id: "gen-1" }], size: "1024x1024", quality: "low", background: "opaque", usage: { input_tokens: 20, output_tokens: 429 } }), {
    headers: { "content-type": "application/json", "x-codex-imagegen-request-id": "req-1", "x-codex-active-limit": "imagegen_premium", "x-codex-primary-used-percent": "2", "x-codex-primary-window-minutes": "1440", "x-codex-secondary-window-minutes": "0" },
  });
}

function setup(options: CodexClientOptions = {}) {
  const load = vi.fn(async () => ({ accessToken: jwt("test-account"), expiresAt: Date.now() + 3_600_000 }));
  const tokens = new CodexTokenManager({ load, save: vi.fn(), clear: vi.fn(), describe: () => ({ backend: "file", location: "unused" }) });
  const fetchImpl = vi.fn<typeof fetch>(async () => success());
  const provider = new CodexImageProvider(tokens, { fetchImpl, ...options });
  const payload = (index = 0) => JSON.parse(String(fetchImpl.mock.calls[index][1]?.body));
  const url = (index = 0) => String(fetchImpl.mock.calls[index][0]);
  return { provider, fetchImpl, payload, url, load };
}

beforeEach(() => vi.stubEnv("IMAGEGEN_CODEX_IMAGE_MODEL", undefined));
afterEach(() => vi.unstubAllEnvs());

describe("image model selection", () => {
  it("defaults to Flare with the prompt verbatim and auto options omitted", async () => {
    const { provider, payload, url } = setup();
    expect((await provider.generate(request)).imageModel).toBe(models[0]);
    expect(url()).toBe("https://chatgpt.com/backend-api/codex/images/generations");
    expect(payload()).toEqual({ prompt: "Draw a bicycle", model: models[0], size: expect.stringMatching(/^\d+x\d+$/), background: "auto" });
  });

  it.each(models)("selects %s for generation and editing", async (model) => {
    const { provider, payload } = setup();
    for (const result of [await provider.generate({ ...request, model }), await provider.edit({ ...request, model, sourceImage: input })]) {
      expect(result.imageModel).toBe(model);
    }
    expect(payload().model).toBe(model);
    expect(payload(1).model).toBe(model);
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

  it("surfaces model errors with backend detail and no fallback", async () => {
    const { provider, fetchImpl } = setup();
    fetchImpl.mockResolvedValue(new Response(JSON.stringify({ error: { message: "invalid_value for gpt-image-2.5-flare" } }), { status: 400 }));
    await expect(provider.generate(request)).rejects.toMatchObject({ statusCode: 400, kind: "image_model_invalid", message: expect.stringContaining("invalid_value for gpt-image-2.5-flare") });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("classifies usage limits and reads retry-after", async () => {
    const { provider, fetchImpl } = setup();
    fetchImpl.mockResolvedValue(new Response(JSON.stringify({ detail: "The usage limit has been reached" }), { status: 429, headers: { "retry-after": "120" } }));
    await expect(provider.generate(request)).rejects.toMatchObject({ statusCode: 429, kind: "usage_limit", retryAfterSeconds: 120 });
  });
});

describe("image inputs and options", () => {
  it("sends references to the edits endpoint for generation", async () => {
    const { provider, payload, url } = setup();
    await provider.generate({ ...request, referenceImages: [input] });
    expect(url()).toBe("https://chatgpt.com/backend-api/codex/images/edits");
    expect(payload().images).toEqual([{ image_url: "data:image/png;base64,AQID" }]);
  });

  it("sends the source first, caps input images, and ignores the mask", async () => {
    const { provider, payload, url } = setup();
    const source = { data: new Uint8Array([9]), contentType: "image/jpeg" };
    await provider.edit({ ...request, sourceImage: source, referenceImages: [input, input, input, input, input], mask: input, size: "1024x1024", quality: "high" });
    expect(url()).toBe("https://chatgpt.com/backend-api/codex/images/edits");
    expect(payload().images).toHaveLength(4);
    expect(payload().images[0]).toEqual({ image_url: "data:image/jpeg;base64,CQ==" });
    expect(payload()).toMatchObject({ size: "1024x1024", quality: "high", background: "auto" });
    expect(JSON.stringify(payload())).not.toMatch(/mask/);
  });

  it.each(["png", "jpeg", "webp"])("makes one request per image and delivers %s", async (format) => {
    const { provider, fetchImpl } = setup();
    const result = await provider.generate({ ...request, format, count: 2 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result.images).toHaveLength(2);
    for (const image of result.images) {
      expect(image).toMatchObject({ mimeType: `image/${format}`, width: 1, height: 1, prompt: "Draw a bicycle", responseId: "gen-1" });
    }
    if (format === "png") expect(Buffer.from(result.images[0].data)).toEqual(Buffer.from(png, "base64"));
  });

  it("reports served settings, token usage, and the image allowance", async () => {
    const { provider } = setup();
    const [image] = (await provider.generate(request)).images;
    expect(image.usage).toEqual({
      requestId: "req-1",
      imageGeneration: { input_tokens: 20, output_tokens: 429 },
      served: { size: "1024x1024", quality: "low", background: "opaque" },
      planLimits: { activeLimit: "imagegen_premium", primary: { usedPercent: 2, windowMinutes: 1440 } },
    });
  });

  it.each([["no data", JSON.stringify({ data: [] }), "no_image"], ["corrupt bytes", JSON.stringify({ data: [{ b64_json: Buffer.from("pixels").toString("base64") }] }), "malformed"]])("rejects %s", async (_label, body, kind) => {
    const { provider, fetchImpl } = setup();
    fetchImpl.mockResolvedValue(new Response(body));
    await expect(provider.generate(request)).rejects.toMatchObject({ kind });
  });

  it.each(["xhigh", "max"])("allows %s on new models and rejects it on gpt-image-2", async (quality) => {
    for (const model of models.slice(0, 2)) {
      const { provider, payload } = setup();
      await provider.generate({ ...request, model, quality });
      expect(payload().quality).toBe(quality);
    }
    const { provider, fetchImpl } = setup();
    await expect(provider.edit({ ...request, sourceImage: input, model: models[2], quality })).rejects.toMatchObject({ kind: "usage" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("unauthorized recovery", () => {
  function setupRecovery(statuses: number[]) {
    const tokens = new CodexTokenManager({ load: async () => ({ accessToken: jwt("before"), expiresAt: Date.now() + 3_600_000 }), save: vi.fn(), clear: vi.fn(), describe: () => ({ backend: "file", location: "unused" }) });
    const recover = vi.spyOn(tokens, "recoverFromUnauthorized").mockResolvedValue(jwt("after"));
    const fetchImpl = vi.fn<typeof fetch>(async () => {
      const status = statuses.shift() ?? 200;
      return status === 200 ? success() : new Response(JSON.stringify({ detail: "Unauthorized" }), { status });
    });
    const accounts = () => fetchImpl.mock.calls.map((call) => (call[1]?.headers as Record<string, string>)["chatgpt-account-id"]);
    return { provider: new CodexImageProvider(tokens, { fetchImpl }), recover, fetchImpl, accounts };
  }

  it("retries once with refreshed credentials after a 401", async () => {
    const { provider, recover, accounts } = setupRecovery([401]);
    await expect(provider.generate(request)).resolves.toMatchObject({ images: [{ mimeType: "image/png" }] });
    expect(recover).toHaveBeenCalledTimes(1);
    expect(accounts()).toEqual(["before", "after"]);
  });

  it("surfaces a second 401 without further refreshes", async () => {
    const { provider, recover, fetchImpl } = setupRecovery([401, 401]);
    await expect(provider.generate(request)).rejects.toMatchObject({ statusCode: 401 });
    expect(recover).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
