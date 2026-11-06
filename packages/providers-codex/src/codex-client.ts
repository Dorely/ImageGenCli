import sharp from "sharp";
import { normalizeOutputFormat, parseSize, ProviderError, type EditRequest, type GenerateRequest, type ImageInput, type ImageSize, type ImageSizePolicy, type OutputFormat, type ProviderResult } from "@imagegencli/core";
import { extractAccountId } from "./account-id.js";
import {
  DEFAULT_IMAGE_MODEL,
  DEFAULT_QUALITY,
  IMAGES_ENDPOINT,
  MAX_IMAGE_COUNT,
  MAX_REFERENCE_IMAGES,
  MIN_IMAGE_COUNT,
  PROVIDER_NAME,
  REQUEST_TIMEOUT_SECONDS,
  USER_AGENT,
} from "./codex-constants.js";
import type { CodexTokenManager } from "./codex-token-manager.js";
import { classifyImageError, readErrorMessage } from "./errors.js";

export interface CodexClientOptions {
  imageModel?: string;
  timeoutSeconds?: number;
  fetchImpl?: typeof fetch;
}

type ImageEndpoint = "generations" | "edits";

function toDataUrl(image: ImageInput): string {
  return `data:${image.contentType};base64,${Buffer.from(image.data).toString("base64")}`;
}

function normalizeCount(count: number | undefined): number {
  if (!count) return 1;
  return Math.min(MAX_IMAGE_COUNT, Math.max(MIN_IMAGE_COUNT, Math.trunc(count)));
}

function resolveSize(size: string | undefined): ImageSize {
  try {
    return parseSize(size ?? "auto");
  } catch (error) {
    throw new ProviderError({
      kind: "usage",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

// The endpoint always returns PNG; output format is converted locally. Background
// stays on auto so a prompt asking for real alpha transparency can produce it.
function buildBody(args: { prompt: string; model: string; size: ImageSize; quality: string; images: ImageInput[] }): Record<string, unknown> {
  const body: Record<string, unknown> = {
    prompt: args.prompt,
    model: args.model,
    size: args.size.size,
    background: "auto",
  };
  const quality = args.quality.trim();
  if (quality && quality.toLowerCase() !== "auto") body["quality"] = quality;
  if (args.images.length > 0) body["images"] = args.images.map((image) => ({ image_url: toDataUrl(image) }));
  return body;
}

const MASK_INSTRUCTION =
  "The last image is an edit mask, not content to reproduce. Apply the requested change only where the mask is transparent. Keep every area where the mask is opaque exactly as it is in the first image.";

// Transparent mask pixels mark the edit area. The mask is re-encoded as opaque
// white with a transparent black edit area so it still reads if alpha is dropped.
async function normalizeMask(mask: ImageInput, source: ImageInput): Promise<ImageInput> {
  const usage = (message: string) => new ProviderError({ kind: "usage", message });
  let pixels: Buffer;
  let width: number;
  let height: number;
  let sourceWidth: number | undefined;
  let sourceHeight: number | undefined;
  try {
    const decoded = await sharp(mask.data).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    ({ width, height } = decoded.info);
    pixels = decoded.data;
    ({ width: sourceWidth, height: sourceHeight } = await sharp(source.data).metadata());
  } catch {
    throw usage("Mask and source must be readable PNG, JPEG, or WebP images.");
  }
  if (width !== sourceWidth || height !== sourceHeight) {
    throw usage(`Mask is ${width}x${height} but the source is ${sourceWidth}x${sourceHeight}; they must match.`);
  }
  let editable = false;
  for (let i = 0; i < pixels.length; i += 4) {
    const edit = pixels[i + 3] < 128;
    editable ||= edit;
    pixels.fill(edit ? 0 : 255, i, i + 4);
  }
  if (!editable) throw usage("Mask has no transparent pixels; make the area to edit transparent.");
  const data = await sharp(pixels, { raw: { width, height, channels: 4 } }).png().toBuffer();
  return { data, contentType: "image/png" };
}

export class CodexImageProvider {
  readonly name = PROVIDER_NAME;
  readonly sizePolicy = { resolveSize: (size: string | undefined) => resolveSize(size) } satisfies ImageSizePolicy;
  private readonly imageModel: string;
  private readonly timeoutSeconds: number;
  private readonly fetchImpl: typeof fetch;

  constructor(
    private readonly tokens: CodexTokenManager,
    options: CodexClientOptions = {},
  ) {
    this.imageModel = options.imageModel ?? process.env["IMAGEGEN_CODEX_IMAGE_MODEL"] ?? DEFAULT_IMAGE_MODEL;
    this.timeoutSeconds = options.timeoutSeconds ?? REQUEST_TIMEOUT_SECONDS;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async generate(request: GenerateRequest): Promise<ProviderResult> {
    // Reference images require the edits endpoint; generations takes text only.
    const references = (request.referenceImages ?? []).slice(0, MAX_REFERENCE_IMAGES);
    return this.runAll(request, references.length > 0 ? "edits" : "generations", references);
  }

  async edit(request: EditRequest): Promise<ProviderResult> {
    const images = [request.sourceImage, ...(request.referenceImages ?? [])];
    if (!request.mask) return this.runAll(request, "edits", images.slice(0, MAX_REFERENCE_IMAGES));
    // The images endpoint drops any mask field, so the mask travels as the last
    // edit image and a fixed instruction tells the model how to read it.
    if (images.length + 1 > MAX_REFERENCE_IMAGES) {
      throw new ProviderError({ kind: "usage", message: `Codex accepts at most ${MAX_REFERENCE_IMAGES} edit images; a mask uses one, leaving room for ${MAX_REFERENCE_IMAGES - 2} --reference images.` });
    }
    const mask = await normalizeMask(request.mask, request.sourceImage);
    return this.runAll(request, "edits", [...images, mask], `${request.prompt}\n\n${MASK_INSTRUCTION}`);
  }

  private resolveImageModel(request: GenerateRequest): string {
    const model = (request.model ?? this.imageModel).trim();
    if (!model) throw new ProviderError({ kind: "usage", message: "Image model must not be blank." });
    const quality = request.quality?.trim().toLowerCase();
    if (model === "gpt-image-2" && (quality === "xhigh" || quality === "max")) {
      throw new ProviderError({ kind: "usage", message: "gpt-image-2 supports quality auto, low, medium, or high. Use Flare or Sunburst for xhigh or max." });
    }
    return model;
  }

  private async runAll(request: GenerateRequest, endpoint: ImageEndpoint, images: ImageInput[], modelPrompt = request.prompt): Promise<ProviderResult> {
    const format = normalizeOutputFormat(request.format);
    const size = this.sizePolicy.resolveSize(request.size);
    const requestedModel = this.resolveImageModel(request);
    const body = JSON.stringify(buildBody({ prompt: modelPrompt, model: requestedModel, size, quality: request.quality ?? DEFAULT_QUALITY, images }));
    const results: ProviderResult["images"] = [];
    // The endpoint returns one image per call regardless of `n`.
    for (let i = 0, count = normalizeCount(request.count); i < count; i += 1) {
      results.push(await this.sendOnce(endpoint, body, format, request.prompt));
    }
    return { provider: this.name, requestedModel, images: results };
  }

  private async sendOnce(endpoint: ImageEndpoint, body: string, format: OutputFormat, prompt: string): Promise<ProviderResult["images"][number]> {
    let accessToken = await this.tokens.getValidAccessToken();
    let response = await this.post(endpoint, accessToken, body);
    if (response.status === 401) {
      // Retry once with refreshed credentials; refresh rejection surfaces as a reauth error.
      await response.body?.cancel();
      accessToken = await this.tokens.recoverFromUnauthorized(accessToken);
      response = await this.post(endpoint, accessToken, body);
    }

    const requestId =
      response.headers.get("x-codex-imagegen-request-id") ??
      response.headers.get("x-oai-request-id") ??
      response.headers.get("x-request-id") ??
      undefined;

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      const kind = classifyImageError(errorText);
      const detail = readErrorMessage(errorText);
      const retryAfter = Number(response.headers.get("retry-after"));
      throw new ProviderError({
        kind,
        message: detail ? `Codex image request returned ${response.status} (${kind}): ${detail}` : `Codex image request returned ${response.status} (${kind}).`,
        statusCode: response.status,
        requestId,
        ...(Number.isFinite(retryAfter) && retryAfter > 0 ? { retryAfterSeconds: retryAfter } : {}),
      });
    }

    const payload = record(await response.json().catch(() => null));
    const item = Array.isArray(payload["data"]) ? record(payload["data"][0]) : {};
    if (typeof item["b64_json"] !== "string" || !item["b64_json"]) {
      throw new ProviderError({ kind: "no_image", message: "Codex image request returned no image data.", requestId });
    }

    let data: Buffer = Buffer.from(item["b64_json"], "base64");
    let width: number;
    let height: number;
    try {
      const metadata = await sharp(data).metadata();
      if (!metadata.width || !metadata.height || !["png", "jpeg", "webp"].includes(metadata.format ?? "")) throw new Error();
      // Decode to verify that a valid header is not concealing truncated pixels.
      await sharp(data).stats();
      if (metadata.format !== format) data = await sharp(data).toFormat(format).toBuffer();
      width = metadata.width;
      height = metadata.height;
    } catch {
      throw new ProviderError({ kind: "malformed", message: "Codex returned an invalid raster image.", requestId });
    }

    return {
      data,
      mimeType: `image/${format}`,
      width,
      height,
      prompt,
      responseId: typeof item["generation_id"] === "string" ? item["generation_id"] : undefined,
      // The endpoint accepts any requested model and currently names none in its response.
      servedModel: typeof payload["model"] === "string" ? payload["model"] : undefined,
      usage: {
        requestId,
        imageGeneration: payload["usage"],
        // What the backend actually rendered; it may override requested size and quality.
        served: { size: payload["size"], quality: payload["quality"], background: payload["background"] },
        planLimits: readPlanLimits(response.headers),
      },
    };
  }

  private async post(endpoint: ImageEndpoint, accessToken: string, body: string): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutSeconds * 1000);
    try {
      return await this.fetchImpl(`${IMAGES_ENDPOINT}/${endpoint}`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "chatgpt-account-id": extractAccountId(accessToken),
          originator: "pi",
          "user-agent": USER_AGENT,
          accept: "application/json",
          "content-type": "application/json",
        },
        body,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

// ChatGPT plan usage windows reported on every Codex response. Only the named
// numeric/plan fields are read; other x-codex headers are skipped.
function readPlanLimits(headers: Headers): Record<string, unknown> | undefined {
  const number = (name: string): number | undefined => {
    const value = headers.get(`x-codex-${name}`);
    const parsed = value === null ? Number.NaN : Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };
  const window = (name: "primary" | "secondary") => {
    const usedPercent = number(`${name}-used-percent`);
    const windowMinutes = number(`${name}-window-minutes`);
    // A zero-minute window is an unused slot, not a limit.
    if (usedPercent === undefined || !windowMinutes) return undefined;
    return { usedPercent, windowMinutes, resetAt: number(`${name}-reset-at`) };
  };
  const limits = {
    planType: headers.get("x-codex-plan-type") ?? undefined,
    activeLimit: headers.get("x-codex-active-limit") ?? undefined,
    primary: window("primary"),
    secondary: window("secondary"),
  };
  return Object.values(limits).some((value) => value !== undefined) ? limits : undefined;
}
