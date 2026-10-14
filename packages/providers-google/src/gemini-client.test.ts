import { describe, expect, it, vi, afterEach } from "vitest";
import sharp from "sharp";
import { GeminiImageProvider } from "./gemini-client.js";
import { resolveGeminiSize } from "./image-size.js";
const request = { prompt: "Exact user's brief", out: "unused" };
async function fixture(format: "png" | "jpeg" | "webp" = "png") {
  return sharp({
    create: {
      width: 7,
      height: 5,
      channels: 4,
      background: { r: 20, g: 50, b: 90, alpha: 0.5 },
    },
  })
    .toFormat(format)
    .toBuffer();
}
function reply(data: Buffer, mime = "image/png") {
  return Response.json({
    status: "completed",
    id: "test-response",
    steps: [
      { type: "thought", content: [{ type: "image", data: "ignored" }] },
      {
        type: "model_output",
        content: [
          { type: "text", text: "ignored" },
          { type: "image", data: data.toString("base64"), mime_type: mime },
        ],
      },
    ],
  });
}
afterEach(() => vi.useRealTimers());
describe("Gemini transport", () => {
  it("passes the exact stateless payload and preserves bytes", async () => {
    const bytes = await fixture();
    const fetchImpl = vi.fn(async () => reply(bytes));
    const provider = new GeminiImageProvider(async () => "test-secret", {
      fetchImpl,
    });
    const result = await provider.generate({
      ...request,
      size: "16:9",
      count: 2,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
    );
    expect(init.headers).toEqual({
      "content-type": "application/json",
      "x-goog-api-key": "test-secret",
    });
    expect(JSON.parse(String(init.body))).toEqual({
      model: "gemini-nano-banana-2.1",
      store: false,
      stream: false,
      input: [{ type: "text", text: request.prompt }],
      response_format: {
        type: "image",
        delivery: "inline",
        aspect_ratio: "16:9",
        image_size: "1K",
      },
    });
    expect(result.images[0]).toMatchObject({
      width: 7,
      height: 5,
      responseId: "test-response",
      prompt: request.prompt,
    });
    expect(Buffer.from(result.images[0].data)).toEqual(bytes);
  });
  it("orders the edit source before references and forwards model override", async () => {
    const bytes = await fixture();
    const fetchImpl = vi.fn(async () => reply(bytes));
    const provider = new GeminiImageProvider(async () => "key", { fetchImpl });
    await provider.edit({
      ...request,
      model: "gemini-3-pro-image",
      sourceImage: { data: new Uint8Array([1]), contentType: "image/png" },
      referenceImages: [
        { data: new Uint8Array([2]), contentType: "image/jpeg" },
      ],
    });
    const payload = JSON.parse(
      String(
        (fetchImpl.mock.calls[0] as unknown as [unknown, RequestInit])[1].body,
      ),
    );
    expect(payload.model).toBe("gemini-3-pro-image");
    expect(payload.input.slice(1).map((p: { data: string }) => p.data)).toEqual(
      ["AQ==", "Ag=="],
    );
    expect(payload.response_format).toEqual({
      type: "image",
      delivery: "inline",
    });
  });
  it.each(["png", "jpeg", "webp"] as const)(
    "delivers valid %s without resizing",
    async (format) => {
      const bytes = await fixture("jpeg");
      const provider = new GeminiImageProvider(async () => "key", {
        fetchImpl: async () => reply(bytes, "image/jpeg"),
      });
      const result = await provider.generate({ ...request, format });
      expect(await sharp(result.images[0].data).metadata()).toMatchObject({
        format,
        width: 7,
        height: 5,
      });
    },
  );
  it("chooses the last final image and ignores thought images", async () => {
    const bytes = await fixture();
    const provider = new GeminiImageProvider(async () => "key", {
      fetchImpl: async () =>
        Response.json({
          status: "completed",
          steps: [
            {
              type: "model_output",
              content: [
                { type: "image", data: "bad", mime_type: "image/png" },
                {
                  type: "image",
                  data: bytes.toString("base64"),
                  mime_type: "image/png",
                },
                { type: "image", data: "thought", thought: true },
              ],
            },
          ],
        }),
    });
    expect(
      Buffer.from((await provider.generate(request)).images[0].data),
    ).toEqual(bytes);
  });
  it.each([
    [401, "auth"],
    [403, "auth"],
    [429, "rate_limit"],
    [500, "server"],
    [400, "usage"],
  ])(
    "classifies HTTP %s without exposing secrets or retrying",
    async (status, kind) => {
      const fetchImpl = vi.fn(
        async () =>
          new Response("echo secret key and prompt", {
            status: Number(status),
          }),
      );
      const provider = new GeminiImageProvider(async () => "secret", {
        fetchImpl,
      });
      await expect(provider.generate(request)).rejects.toMatchObject({ kind });
      await expect(provider.generate(request)).rejects.not.toThrow("secret");
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    },
  );
  it.each(["incomplete", "failed", "cancelled"])(
    "rejects %s even when an image exists",
    async (status) => {
      const bytes = await fixture();
      const provider = new GeminiImageProvider(async () => "key", {
        fetchImpl: async () =>
          Response.json({
            status,
            steps: [
              {
                type: "model_output",
                content: [
                  {
                    type: "image",
                    data: bytes.toString("base64"),
                    mime_type: "image/png",
                  },
                ],
              },
            ],
          }),
      });
      await expect(provider.generate(request)).rejects.toThrow(
        "did not complete",
      );
    },
  );
  it.each([
    { status: "completed", steps: [] },
    {
      status: "completed",
      steps: [
        {
          type: "model_output",
          content: [{ type: "image", data: "bad", mime_type: "image/png" }],
        },
      ],
    },
    null,
  ])("rejects malformed or empty results", async (body) => {
    const provider = new GeminiImageProvider(async () => "key", {
      fetchImpl: async () => Response.json(body),
    });
    await expect(provider.generate(request)).rejects.toThrow();
  });
  it("keeps the timeout active through response body consumption", async () => {
    vi.useFakeTimers();
    const provider = new GeminiImageProvider(async () => "key", {
      timeoutSeconds: 1,
      fetchImpl: async (_url, init) =>
        new Response(
          new ReadableStream({
            start(c) {
              init?.signal?.addEventListener("abort", () =>
                c.error(new Error("aborted")),
              );
            },
          }),
        ),
    });
    const pending = provider.generate(request);
    const assertion = expect(pending).rejects.toMatchObject({
      kind: "timeout",
    });
    await vi.advanceTimersByTimeAsync(1001);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });
  it("classifies Google's invalid-key reason on HTTP 400 as auth", async () => {
    const provider = new GeminiImageProvider(async () => "fixture-secret", {
      fetchImpl: async () =>
        Response.json(
          {
            error: {
              message: "fixture-secret",
              details: [{ reason: "API_KEY_INVALID" }],
            },
          },
          { status: 400 },
        ),
    });
    await expect(provider.generate(request)).rejects.toMatchObject({
      kind: "auth",
      statusCode: 400,
    });
    await expect(provider.generate(request)).rejects.not.toThrow(
      "fixture-secret",
    );
  });
  it("rejects MIME mismatches", async () => {
    const bytes = await fixture();
    const provider = new GeminiImageProvider(async () => "key", {
      fetchImpl: async () => reply(bytes, "image/jpeg"),
    });
    await expect(provider.generate(request)).rejects.toMatchObject({
      kind: "malformed",
    });
  });
  it("honors configured model precedence without model substitution", async () => {
    const bytes = await fixture();
    const payloads: { model: string }[] = [];
    vi.stubEnv("IMAGEGEN_GEMINI_IMAGE_MODEL", "gemini-3-pro-image");
    const fetchImpl: typeof fetch = async (_url, init) => {
      payloads.push(JSON.parse(String(init?.body)));
      return reply(bytes);
    };
    try {
      await new GeminiImageProvider(async () => "key", { fetchImpl }).generate(
        request,
      );
      const provider = new GeminiImageProvider(async () => "key", {
        fetchImpl,
        imageModel: "gemini-3.1-flash-image",
      });
      await provider.generate(request);
      await provider.generate({ ...request, model: "custom-image-model" });
      expect(payloads.map((p) => p.model)).toEqual([
        "gemini-3-pro-image",
        "gemini-3.1-flash-image",
        "custom-image-model",
      ]);
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it("rejects unsupported options before transport", async () => {
    const fetchImpl = vi.fn();
    const provider = new GeminiImageProvider(async () => "key", { fetchImpl });
    await expect(
      provider.generate({ ...request, quality: "high" }),
    ).rejects.toMatchObject({ kind: "usage" });
    expect(() =>
      provider.edit({
        ...request,
        sourceImage: { data: new Uint8Array(), contentType: "image/png" },
        mask: { data: new Uint8Array(), contentType: "image/png" },
      }),
    ).toThrow("--mask");
    await expect(
      provider.generate({ ...request, format: "gif" }),
    ).rejects.toMatchObject({ kind: "usage" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
describe("Gemini native sizing", () => {
  it("normalizes pixels to ratio and resolution independently", () => {
    expect(resolveGeminiSize("2000x2000")).toMatchObject({
      width: 2048,
      height: 2048,
      imageSize: "2K",
    });
    expect(resolveGeminiSize("8:1")).toMatchObject({
      width: 3072,
      height: 384,
    });
    expect(resolveGeminiSize("wide")).toMatchObject({
      aspectRatio: "16:9",
      imageSize: "1K",
    });
    expect(resolveGeminiSize("auto").aspectRatio).toBeUndefined();
  });
  it("uses model-specific limits", () => {
    expect(
      resolveGeminiSize("512x512", "gemini-3.1-flash-image").imageSize,
    ).toBe("512");
    expect(resolveGeminiSize("16:9", "gemini-2.5-flash-image")).toMatchObject({
      width: 1344,
      height: 768,
      imageSize: undefined,
    });
    expect(resolveGeminiSize("8:1", "gemini-3-pro-image").aspectRatio).toBe(
      "21:9",
    );
  });
  it.each(["0x12", "-1", "garbage", "NaN"])("rejects invalid size %s", (size) =>
    expect(() => resolveGeminiSize(size)).toThrow(),
  );
});
