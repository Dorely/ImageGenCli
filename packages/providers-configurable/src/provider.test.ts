import { describe, expect, it, vi, afterEach } from "vitest";
import sharp from "sharp";
import { ConfigurableImageProvider } from "./provider.js";
import { validateProfile } from "./profiles.js";
const router = validateProfile({
  name: "router",
  api: "openrouter",
  model: "test/default",
});
const openai = validateProfile({
  name: "gateway",
  api: "openai-images",
  baseUrl: "https://gateway.example/prefix/v1",
  model: "test/default",
});
const request = { prompt: "User's unchanged brief", out: "unused" };
const bytes = () =>
  sharp({
    create: {
      width: 8,
      height: 6,
      channels: 4,
      background: { r: 0, g: 90, b: 100, alpha: 0.5 },
    },
  })
    .png()
    .toBuffer();
const response = (data: Buffer) =>
  Response.json({
    data: [{ b64_json: data.toString("base64"), media_type: "image/png" }],
  });
afterEach(() => vi.useRealTimers());
describe("configurable image transport", () => {
  it("uses the dedicated OpenRouter API, preserves references and model override, and separates count requests", async () => {
    const data = await bytes();
    const calls: { url: string; init: RequestInit }[] = [];
    let running = 0;
    const fetchImpl: typeof fetch = async (url, init) => {
      expect(running++).toBe(0);
      await Promise.resolve();
      calls.push({ url: String(url), init: init! });
      running--;
      return response(data);
    };
    const p = new ConfigurableImageProvider(router, async () => "fixture-key", {
      fetchImpl,
    });
    const result = await p.generate({
      ...request,
      model: "test/override",
      count: 2,
      size: "16:9",
      referenceImages: [{ data, contentType: "image/png" }],
    });
    expect(calls).toHaveLength(2);
    expect(calls[0].url).toBe("https://openrouter.ai/api/v1/images");
    expect(calls[0].init.headers).toEqual({
      authorization: "Bearer fixture-key",
      "content-type": "application/json",
    });
    expect(JSON.parse(String(calls[0].init.body))).toEqual({
      model: "test/override",
      prompt: request.prompt,
      n: 1,
      aspect_ratio: "16:9",
      input_references: [
        {
          type: "image_url",
          image_url: {
            url: `data:image/png;base64,${data.toString("base64")}`,
          },
        },
      ],
    });
    expect(Buffer.from(result.images[0].data)).toEqual(data);
    expect(result.images[0]).toMatchObject({
      width: 8,
      height: 6,
      prompt: request.prompt,
    });
  });
  it("leaves model-selected dimensions unresolved and reports explicit pixels", () => {
    const p = new ConfigurableImageProvider(router, async () => "key");
    expect(p.sizePolicy.resolveSize("auto")).toEqual({ size: "auto" });
    expect(p.sizePolicy.resolveSize("16:9")).toEqual({ size: "16:9" });
    expect(p.sizePolicy.resolveSize("2000x1000")).toEqual({
      size: "2000x1000",
      width: 2000,
      height: 1000,
      pixels: 2000000,
    });
  });
  it("requires a non-blank key for bearer auth before sending data", async () => {
    const fetchImpl = vi.fn();
    const p = new ConfigurableImageProvider(router, async () => undefined, {
      fetchImpl,
    });
    await expect(p.generate(request)).rejects.toMatchObject({ kind: "auth" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("builds OpenAI JSON requests with no automatic options or discovery", async () => {
    const data = await bytes();
    const fetchImpl = vi.fn(async () => response(data));
    const p = new ConfigurableImageProvider(openai, async () => "key", {
      fetchImpl,
    });
    await p.generate(request);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://gateway.example/prefix/v1/images/generations");
    expect(JSON.parse(String(init.body))).toEqual({
      model: "test/default",
      prompt: request.prompt,
      n: 1,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it("sends multipart edits with ordered source/references, and a mask", async () => {
    const data = await bytes();
    const calls: RequestInit[] = [];
    const p = new ConfigurableImageProvider(openai, async () => "key", {
      fetchImpl: async (url, init) => {
        expect(String(url)).toContain("/images/edits");
        calls.push(init!);
        return response(data);
      },
    });
    await p.edit({
      ...request,
      sourceImage: { data: new Uint8Array([1]), contentType: "image/png" },
      referenceImages: [
        { data: new Uint8Array([2]), contentType: "image/jpeg" },
      ],
      mask: { data, contentType: "image/png" },
      size: "portrait",
      format: "webp",
      quality: "high",
    });
    const form = calls[0].body as FormData;
    expect(calls[0].headers).not.toHaveProperty("content-type");
    expect(form.get("size")).toBe("1024x1536");
    expect(form.get("output_format")).toBe("webp");
    expect(form.get("quality")).toBe("high");
    expect(form.has("mask")).toBe(true);
    expect(
      await Promise.all(
        (form.getAll("image[]") as File[]).map(async (f) =>
          Array.from(new Uint8Array(await f.arrayBuffer())),
        ),
      ),
    ).toEqual([[1], [2]]);
  });
  it("routes generation references through OpenAI edits", async () => {
    const data = await bytes();
    const fetchImpl: typeof fetch = async (url, init) => {
      expect(String(url)).toContain("/images/edits");
      expect((init?.body as FormData).get("image")).toBeInstanceOf(Blob);
      return response(data);
    };
    await new ConfigurableImageProvider(openai, async () => "key", {
      fetchImpl,
    }).generate({
      ...request,
      referenceImages: [{ data, contentType: "image/png" }],
    });
  });
  it("downloads image URLs without auth and converts without resizing", async () => {
    const data = await bytes();
    const calls: { url: string; init: RequestInit }[] = [];
    const p = new ConfigurableImageProvider(
      openai,
      async () => "fixture-secret",
      {
        fetchImpl: async (url, init) => {
          calls.push({ url: String(url), init: init! });
          return calls.length === 1
            ? Response.json({
                data: [{ url: "https://cdn.example/result?signature=example" }],
              })
            : new Response(new Uint8Array(data));
        },
      },
    );
    const result = await p.generate({ ...request, format: "jpeg" });
    expect(calls[1].init.headers).toBeUndefined();
    expect(await sharp(result.images[0].data).metadata()).toMatchObject({
      width: 8,
      height: 6,
      format: "jpeg",
    });
  });
  it("never sends auth for an auth-none profile", async () => {
    const data = await bytes();
    const getKey = vi.fn(async () => "should-not-be-read");
    await new ConfigurableImageProvider({ ...openai, auth: "none" }, getKey, {
      fetchImpl: async (_url, init) => {
        expect(init?.headers).not.toHaveProperty("authorization");
        return response(data);
      },
    }).generate(request);
    expect(getKey).not.toHaveBeenCalled();
  });
  it("rejects unsupported options before network calls", async () => {
    const fetchImpl = vi.fn();
    const p = new ConfigurableImageProvider(router, async () => "key", {
      fetchImpl,
    });
    const image = { data: new Uint8Array(), contentType: "image/png" };
    await expect(
      p.edit({ ...request, sourceImage: image, mask: image }),
    ).rejects.toMatchObject({ kind: "usage" });
    await expect(
      new ConfigurableImageProvider(openai, async () => "key", {
        fetchImpl,
      }).generate({ ...request, size: "16:9" }),
    ).rejects.toMatchObject({ kind: "usage" });
    await expect(
      new ConfigurableImageProvider(
        { ...router, model: undefined },
        async () => "key",
        { fetchImpl },
      ).generate(request),
    ).rejects.toMatchObject({ kind: "usage" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it.each([
    [400, "usage"],
    [401, "auth"],
    [403, "auth"],
    [429, "rate_limit"],
    [503, "server"],
  ])(
    "classifies %s without echoing bodies or retrying",
    async (status, kind) => {
      const fetchImpl = vi.fn(
        async () =>
          new Response("fixture-secret echoed request body", {
            status: Number(status),
          }),
      );
      const p = new ConfigurableImageProvider(
        router,
        async () => "fixture-secret",
        { fetchImpl },
      );
      await expect(p.generate(request)).rejects.toMatchObject({ kind });
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    },
  );
  it("identifies upstream quota exhaustion without blaming gateway credit", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json(
        {
          error: {
            code: 429,
            message: "You exceeded your current quota. fixture-secret",
            metadata: {
              provider_name: "Google AI Studio",
              raw: "fixture-secret request body",
            },
          },
        },
        { status: 429, headers: { "retry-after": "30" } },
      ),
    );
    const p = new ConfigurableImageProvider(
      router,
      async () => "fixture-secret",
      { fetchImpl },
    );
    const failure = await p.generate(request).catch((e) => e);
    expect(failure).toMatchObject({
      kind: "rate_limit",
      statusCode: 429,
      upstreamProvider: "Google AI Studio",
      retryAfterSeconds: 30,
    });
    expect(failure.message).toContain(
      "Upstream Google AI Studio quota is exhausted",
    );
    expect(failure.message).toContain("Gateway credits may still be available");
    expect(JSON.stringify(failure)).not.toContain("fixture-secret");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it("does not reflect a secret or raw metadata as the upstream provider", async () => {
    const p = new ConfigurableImageProvider(
      router,
      async () => "fixture-secret",
      {
        fetchImpl: async () =>
          Response.json(
            {
              error: {
                message: "fixture-secret",
                metadata: {
                  provider_name: "fixture-secret",
                  raw: "fixture-secret",
                },
              },
            },
            { status: 429, headers: { "retry-after": "fixture-secret" } },
          ),
      },
    );
    const failure = await p.generate(request).catch((e) => e);
    expect(failure).toMatchObject({
      kind: "rate_limit",
      upstreamProvider: undefined,
      retryAfterSeconds: undefined,
    });
    expect(JSON.stringify(failure)).not.toContain("fixture-secret");
    expect(failure.message).not.toContain("fixture-secret");
  });
  it("times out while reading an error body and leaves no pending timer", async () => {
    vi.useFakeTimers();
    const p = new ConfigurableImageProvider(router, async () => "key", {
      timeoutSeconds: 1,
      fetchImpl: async (_url, init) =>
        new Response(
          new ReadableStream({
            start(controller) {
              init?.signal?.addEventListener("abort", () =>
                controller.error(new Error("aborted")),
              );
            },
          }),
          { status: 429 },
        ),
    });
    const assertion = expect(p.generate(request)).rejects.toMatchObject({
      kind: "timeout",
    });
    await vi.advanceTimersByTimeAsync(1001);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each([
    {},
    { data: [] },
    { data: [{ b64_json: "invalid" }] },
    { data: [{ url: "file:///secret" }] },
  ])(
    "rejects malformed responses",
    async (body) =>
      await expect(
        new ConfigurableImageProvider(router, async () => "key", {
          fetchImpl: async () => Response.json(body),
        }).generate(request),
      ).rejects.toThrow(),
  );
  it("times out during image downloads and cleans up timers", async () => {
    vi.useFakeTimers();
    let calls = 0;
    const p = new ConfigurableImageProvider(router, async () => "key", {
      timeoutSeconds: 1,
      fetchImpl: async (_url, init) =>
        ++calls === 1
          ? Response.json({ data: [{ url: "https://cdn.example/image" }] })
          : new Response(
              new ReadableStream({
                start(controller) {
                  init?.signal?.addEventListener("abort", () =>
                    controller.error(new Error("aborted")),
                  );
                },
              }),
            ),
    });
    const assertion = expect(p.generate(request)).rejects.toMatchObject({
      kind: "timeout",
    });
    await vi.advanceTimersByTimeAsync(1001);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });
  it("discovers OpenRouter image metadata and labels generic capabilities unknown", async () => {
    const fetchImpl: typeof fetch = async (url) => {
      expect(String(url)).toMatch(/\/(images\/)?models$/);
      return Response.json({
        data: [
          {
            id: "test/model",
            name: "Test",
            supported_parameters: {
              quality: { type: "enum", values: ["high"] },
            },
            architecture: {
              input_modalities: ["text"],
              output_modalities: ["image"],
            },
          },
        ],
      });
    };
    expect(
      await new ConfigurableImageProvider(router, async () => "key", {
        fetchImpl,
      }).models(),
    ).toEqual([
      {
        id: "test/model",
        name: "Test",
        capabilities: "reported",
        supportedParameters: { quality: { type: "enum", values: ["high"] } },
        inputModalities: ["text"],
        outputModalities: ["image"],
      },
    ]);
    expect(
      await new ConfigurableImageProvider(openai, async () => "key", {
        fetchImpl,
      }).models(),
    ).toEqual([{ id: "test/model", name: "Test", capabilities: "unknown" }]);
  });
});
