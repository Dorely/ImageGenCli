import { normalizeOutputFormat, ProviderError, type EditRequest, type GenerateRequest, type ImageInput, type OutputFormat, type ProviderResult } from "@imagegencli/core";
import { extractAccountId } from "./account-id.js";
import {
  DEFAULT_IMAGE_MODEL,
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
  private readonly model: string;
  private readonly imageModel: string;
  private readonly timeoutSeconds: number;
  private readonly partialImages: number;
  private readonly fetchImpl: typeof fetch;

  constructor(
    private readonly tokens: CodexTokenManager,
    options: CodexClientOptions = {},
  ) {
    this.model = options.model ?? process.env["IMAGEGEN_CODEX_MODEL"] ?? "";
    this.imageModel = options.imageModel ?? process.env["IMAGEGEN_CODEX_IMAGE_MODEL"] ?? DEFAULT_IMAGE_MODEL;
    this.timeoutSeconds = options.timeoutSeconds ?? REQUEST_TIMEOUT_SECONDS;
    this.partialImages = options.partialImages ?? PARTIAL_IMAGES;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private requireModel(): string {
    if (!this.model.trim()) {
      throw new ProviderError({
        kind: "configuration",
        message: "Codex orchestration model is not configured. Set IMAGEGEN_CODEX_MODEL to the model your account uses for Codex responses.",
      });
    }
    return this.model;
  }

  async generate(request: GenerateRequest): Promise<ProviderResult> {
    const model = this.requireModel();
    const format = normalizeOutputFormat(request.format);
    return this.runAll({
      format,
      count: normalizeCount(request.count),
      model,
      build: () =>
        buildPayload({
          model,
          prompt: request.prompt,
          references: request.referenceImages ?? [],
          tool: baseImageTool({
            size: request.size,
            quality: request.quality ?? DEFAULT_QUALITY,
            outputFormat: format,
            imageModel: this.imageModel,
            action: "generate",
            partialImages: this.partialImages,
          }),
        }),
    });
  }

  async edit(request: EditRequest): Promise<ProviderResult> {
    const model = this.requireModel();
    const format = normalizeOutputFormat(request.format);
    const references: ImageInput[] = [request.sourceImage, ...(request.referenceImages ?? [])];
    return this.runAll({
      format,
      count: normalizeCount(request.count),
      model,
      build: () => {
        const tool = baseImageTool({
          size: request.size,
          quality: request.quality ?? DEFAULT_QUALITY,
          outputFormat: format,
          imageModel: this.imageModel,
          action: "edit",
          partialImages: this.partialImages,
        });
        if (request.mask) {
          tool["input_image_mask"] = { image_url: toDataUrl(request.mask) };
        }
        return buildPayload({
          model,
          prompt: request.prompt,
          references,
          tool,
        });
      },
    });
  }

  private async runAll(args: { format: OutputFormat; count: number; model: string; build: () => Record<string, unknown> }): Promise<ProviderResult> {
    const images: ProviderResult["images"] = [];
    for (let i = 0; i < args.count; i += 1) {
      images.push(await this.sendOnce(args.build(), args.format));
    }
    return { provider: this.name, model: args.model, imageModel: this.imageModel, images };
  }

  private async sendOnce(payload: Record<string, unknown>, format: OutputFormat): Promise<ProviderResult["images"][number]> {
    const accessToken = await this.tokens.getValidAccessToken();
    const accountId = extractAccountId(accessToken);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutSeconds * 1000);
    let response: Response;
    try {
      response = await this.fetchImpl(RESPONSES_ENDPOINT, {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "chatgpt-account-id": accountId,
          "OpenAI-Beta": "responses=experimental",
          originator: "pi",
          "user-agent": USER_AGENT,
          accept: "text/event-stream",
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    const requestId =
      response.headers.get("x-request-id") ??
      response.headers.get("openai-request-id") ??
      response.headers.get("request-id") ??
      undefined;

    if (!response.ok || !response.body) {
      const body = await response.text().catch(() => "");
      const kind = classifyImageError(body);
      const detail = readErrorMessage(body);
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
      revisedPrompt: parsed.revisedPrompt,
      responseId: parsed.responseId,
      callId: parsed.callId,
    };
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
