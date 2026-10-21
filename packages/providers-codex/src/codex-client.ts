import { normalizeOutputFormat, parseSize, ProviderError, type EditRequest, type GenerateRequest, type ImageInput, type ImageSize, type ImageSizePolicy, type OutputFormat, type ProviderResult } from "@imagegencli/core";
import { extractAccountId } from "./account-id.js";
import {
  DEFAULT_IMAGE_MODEL,
  DEFAULT_ORCHESTRATION_MODEL,
  DEFAULT_QUALITY,
  MAX_IMAGE_COUNT,
  MAX_REFERENCE_IMAGES,
  MIN_IMAGE_COUNT,
  PARTIAL_IMAGES,
  PROVIDER_NAME,
  REQUEST_TIMEOUT_SECONDS,
  RESPONSES_ENDPOINT,
  USER_AGENT,
} from "./codex-constants.js";
import type { CodexTokenManager } from "./codex-token-manager.js";
import { classifyImageError, parseImageStreamEvents } from "./sse.js";

export interface CodexClientOptions {
  model?: string;
  imageModel?: string;
  timeoutSeconds?: number;
  partialImages?: number;
  fetchImpl?: typeof fetch;
}

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

function baseImageTool(args: {
  size?: string;
  quality?: string;
  outputFormat: OutputFormat;
  outputCompression?: number;
  imageModel: string;
  action: "generate" | "edit";
  partialImages: number;
}): Record<string, unknown> {
  const tool: Record<string, unknown> = {
    type: "image_generation",
    model: args.imageModel,
    action: args.action,
    size: args.size && args.size.trim() ? args.size.trim() : "auto",
    output_format: args.outputFormat,
    background: "auto",
  };
  if (args.partialImages > 0) tool["partial_images"] = Math.min(3, Math.max(0, args.partialImages));
  if (args.quality && args.quality.trim() && args.quality.trim().toLowerCase() !== "auto") {
    tool["quality"] = args.quality.trim();
  }
  if (args.outputFormat === "jpeg" && typeof args.outputCompression === "number") {
    tool["output_compression"] = Math.min(100, Math.max(0, Math.trunc(args.outputCompression)));
  }
  return tool;
}

function buildPayload(args: {
  model: string;
  prompt: string;
  references: ImageInput[];
  tool: Record<string, unknown>;
}): Record<string, unknown> {
  const content: Record<string, unknown>[] = [{ type: "input_text", text: args.prompt }];
  for (const reference of args.references.slice(0, MAX_REFERENCE_IMAGES)) {
    content.push({ type: "input_image", image_url: toDataUrl(reference), detail: "auto" });
  }
  return {
    model: args.model,
    input: [{ role: "user", content }],
    tools: [args.tool],
    tool_choice: { type: "image_generation" },
    stream: true,
    store: false,
  };
}

export class CodexImageProvider {
  readonly name = PROVIDER_NAME;
  readonly sizePolicy = { resolveSize: (size: string | undefined) => resolveSize(size) } satisfies ImageSizePolicy;
  private readonly orchestrationModel: string;
  private readonly imageModel: string;
  private readonly timeoutSeconds: number;
  private readonly partialImages: number;
  private readonly fetchImpl: typeof fetch;

  constructor(
    private readonly tokens: CodexTokenManager,
    options: CodexClientOptions = {},
  ) {
    // API quirk: the Codex Responses endpoint requires an orchestration model
    // field on every request even though the image_generation tool does all the
    // work. This value never touches the caller's prompt and is not exposed in
    // output; keep it in provider config, not in CLI surface or contracts.
    this.orchestrationModel = options.model ?? process.env["IMAGEGEN_CODEX_MODEL"] ?? DEFAULT_ORCHESTRATION_MODEL;
    this.imageModel = options.imageModel ?? process.env["IMAGEGEN_CODEX_IMAGE_MODEL"] ?? DEFAULT_IMAGE_MODEL;
    this.timeoutSeconds = options.timeoutSeconds ?? REQUEST_TIMEOUT_SECONDS;
    this.partialImages = options.partialImages ?? PARTIAL_IMAGES;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async generate(request: GenerateRequest): Promise<ProviderResult> {
    const format = normalizeOutputFormat(request.format);
    const size = this.sizePolicy.resolveSize(request.size);
    const imageModel = this.resolveImageModel(request);
    return this.runAll({
      format,
      imageModel,
      count: normalizeCount(request.count),
      prompt: request.prompt,
      size,
      build: () =>
        buildPayload({
          model: this.orchestrationModel,
          prompt: request.prompt,
          references: request.referenceImages ?? [],
          tool: baseImageTool({
            size: size.size,
            quality: request.quality ?? DEFAULT_QUALITY,
            outputFormat: format,
            imageModel,
            action: "generate",
            partialImages: this.partialImages,
          }),
        }),
    });
  }

  async edit(request: EditRequest): Promise<ProviderResult> {
    const format = normalizeOutputFormat(request.format);
    const size = this.sizePolicy.resolveSize(request.size);
    const imageModel = this.resolveImageModel(request);
    const references: ImageInput[] = [request.sourceImage, ...(request.referenceImages ?? [])];
    return this.runAll({
      format,
      imageModel,
      count: normalizeCount(request.count),
      prompt: request.prompt,
      size,
      build: () => {
        const tool = baseImageTool({
          size: size.size,
          quality: request.quality ?? DEFAULT_QUALITY,
          outputFormat: format,
          imageModel,
          action: "edit",
          partialImages: this.partialImages,
        });
        if (request.mask) {
          tool["input_image_mask"] = { image_url: toDataUrl(request.mask) };
        }
        return buildPayload({
          model: this.orchestrationModel,
          prompt: request.prompt,
          references,
          tool,
        });
      },
    });
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

  private async runAll(args: { imageModel: string; format: OutputFormat; count: number; prompt: string; size: ImageSize; build: () => Record<string, unknown> }): Promise<ProviderResult> {
    const images: ProviderResult["images"] = [];
    for (let i = 0; i < args.count; i += 1) {
      images.push(await this.sendOnce(args.build(), args.format, args.prompt, args.size));
    }
    return { provider: this.name, imageModel: args.imageModel, images };
  }

  private async sendOnce(payload: Record<string, unknown>, format: OutputFormat, prompt: string, size: ImageSize): Promise<ProviderResult["images"][number]> {
    const body = JSON.stringify(payload);
    let accessToken = await this.tokens.getValidAccessToken();
    let response = await this.post(accessToken, body);
    if (response.status === 401) {
      // Retry once with refreshed credentials; refresh rejection surfaces as a reauth error.
      await response.body?.cancel();
      accessToken = await this.tokens.recoverFromUnauthorized(accessToken);
      response = await this.post(accessToken, body);
    }

    const requestId =
      response.headers.get("x-request-id") ??
      response.headers.get("openai-request-id") ??
      response.headers.get("request-id") ??
      undefined;

    if (!response.ok || !response.body) {
      const errorText = await response.text().catch(() => "");
      const kind = classifyImageError(errorText);
      const detail = readErrorMessage(errorText);
      throw new ProviderError({
        kind,
        message: detail ? `Codex image request returned ${response.status} (${kind}): ${detail}` : `Codex image request returned ${response.status} (${kind}).`,
        statusCode: response.status,
        requestId,
      });
    }

    const lines = await readSseLines(response.body);
    let parsed: ReturnType<typeof parseImageStreamEvents>;
    try {
      parsed = parseImageStreamEvents(lines);
    } catch (error) {
      throw toProviderError(error, requestId);
    }
    return {
      data: parsed.data,
      mimeType: `image/${format}`,
      width: size.width,
      height: size.height,
      prompt,
      responseId: parsed.responseId,
      callId: parsed.callId,
    };
  }
  private async post(accessToken: string, body: string): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutSeconds * 1000);
    try {
      return await this.fetchImpl(RESPONSES_ENDPOINT, {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "chatgpt-account-id": extractAccountId(accessToken),
          "OpenAI-Beta": "responses=experimental",
          originator: "pi",
          "user-agent": USER_AGENT,
          accept: "text/event-stream",
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

async function readSseLines(body: ReadableStream<Uint8Array>): Promise<string[]> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const lines: string[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let index = buffer.indexOf("\n");
    while (index >= 0) {
      const line = buffer.slice(0, index);
      buffer = buffer.slice(index + 1);
      if (line.startsWith("data:")) lines.push(line);
      index = buffer.indexOf("\n");
    }
  }
  if (buffer.startsWith("data:")) lines.push(buffer);
  return lines;
}

function readErrorMessage(body: string): string | null {
  if (!body.trim()) return null;
  try {
    const parsed = JSON.parse(body) as unknown;
    if (typeof parsed === "object" && parsed !== null) {
      const record = parsed as Record<string, unknown>;
      if (typeof record["message"] === "string") return record["message"];
      if (typeof record["detail"] === "string") return record["detail"];
      const error = record["error"];
      if (typeof error === "object" && error !== null && typeof (error as Record<string, unknown>)["message"] === "string") {
        return (error as Record<string, unknown>)["message"] as string;
      }
    }
  } catch {
    return body.slice(0, 500);
  }
  return null;
}

function toProviderError(error: unknown, requestId: string | undefined): ProviderError {
  const message = error instanceof Error ? error.message : String(error);
  const separator = message.indexOf(":");
  const kind = separator > 0 ? message.slice(0, separator) : "api_error";
  return new ProviderError({ kind, message, requestId });
}
