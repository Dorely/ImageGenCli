export interface StreamImage {
  data: Uint8Array;
  revisedPrompt?: string;
  responseId?: string;
  callId?: string;
  responseModel?: string;
  // Orchestration-model token usage and image-tool usage from response.completed.
  usage?: unknown;
  imageUsage?: unknown;
}

export function classifyImageError(message: string): string {
  if (!message.trim()) return "unknown";
  const lowerRate = message.includes("input-images") && message.includes("per min") && message.toLowerCase().includes("gpt-image");
  if (lowerRate) return "codex_image_input_rate_limit";
  if (/rate limit|429|too many requests|please try again/i.test(message)) return "rate_limit";
  if (/403|forbidden|cloudflare/i.test(message)) return "codex_transport_forbidden";
  if (/invalid_value/i.test(message) && /gpt-image/i.test(message)) return "image_model_invalid";
  return "api_error";
}

function readString(value: unknown, property: string): string | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const candidate = (value as Record<string, unknown>)[property];
  return typeof candidate === "string" ? candidate : undefined;
}

function readEventError(event: unknown): string | undefined {
  const direct = readString(event, "message");
  if (direct) return direct;
  if (typeof event !== "object" || event === null) return undefined;
  const record = event as Record<string, unknown>;
  const nested = record["error"];
  if (typeof nested === "object" && nested !== null) {
    const message = readString(nested, "message");
    if (message) return message;
  }
  const response = record["response"];
  if (typeof response === "object" && response !== null) {
    const responseError = (response as Record<string, unknown>)["error"];
    if (typeof responseError === "object" && responseError !== null) {
      return readString(responseError, "message");
    }
  }
  return undefined;
}

function tryReadImageItem(item: unknown): { data: Uint8Array; revisedPrompt?: string; callId?: string } | null {
  if (readString(item, "type") !== "image_generation_call") return null;
  const result = readString(item, "result");
  if (!result) return null;
  let data: Uint8Array;
  try {
    data = Buffer.from(result, "base64");
  } catch {
    throw new Error("invalid_image_result: Codex returned an image result that was not valid base64.");
  }
  return { data, revisedPrompt: readString(item, "revised_prompt"), callId: readString(item, "id") };
}

export function parseImageStreamEvents(events: string[]): StreamImage & { eventCount: number; lastEventType?: string } {
  let eventCount = 0;
  let lastEventType: string | undefined;
  let responseId: string | undefined;
  let image: ReturnType<typeof tryReadImageItem> = null;
  let completed: Record<string, unknown> | undefined;

  for (const raw of events) {
    const line = raw.trim();
    if (!line.startsWith("data:")) continue;
    const payload = line.slice("data:".length).trim();
    if (payload === "[DONE]") break;
    let event: unknown;
    try {
      event = JSON.parse(payload) as unknown;
    } catch {
      continue;
    }
    const type = readString(event, "type");
    lastEventType = type ?? lastEventType;
    eventCount += 1;
    if (type === "response.created" && typeof event === "object" && event !== null) {
      const inner = (event as Record<string, unknown>)["response"];
      const id = readString(inner, "id");
      if (id) responseId = id;
    }
    if (type === "response.failed" || type === "error") {
      throw new Error(`${classifyImageError(readEventError(event) ?? "")}: ${readEventError(event) ?? "Codex image generation failed."}`);
    }
    if (type === "response.output_item.done" && typeof event === "object" && event !== null) {
      image ??= tryReadImageItem((event as Record<string, unknown>)["item"]);
    }
    if (type === "response.completed" && typeof event === "object" && event !== null) {
      const response = (event as Record<string, unknown>)["response"];
      if (typeof response === "object" && response !== null) {
        // Keep reading past the image: usage only arrives on response.completed.
        completed = response as Record<string, unknown>;
        const id = readString(completed, "id");
        if (id) responseId = id;
        const output = completed["output"];
        if (Array.isArray(output)) {
          for (const item of output) image ??= tryReadImageItem(item);
        }
      }
    }
  }

  if (!image) {
    throw new Error(
      `stream_completed_without_image: Codex image generation completed without returning an image. ` +
      `responseId=${responseId ?? "unknown"}, events=${eventCount}, lastEvent=${lastEventType ?? "none"}.`,
    );
  }
  const toolUsage = completed?.["tool_usage"];
  return {
    ...image,
    responseId,
    responseModel: readString(completed, "model"),
    usage: completed?.["usage"],
    imageUsage: typeof toolUsage === "object" && toolUsage !== null ? (toolUsage as Record<string, unknown>)["image_gen"] : undefined,
    eventCount,
    lastEventType,
  };
}

export function splitSseLines(chunk: string): string[] {
  return chunk.split("\n").filter((line) => line.startsWith("data:"));
}
