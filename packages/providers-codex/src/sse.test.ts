import { describe, expect, it } from "vitest";
import { classifyImageError, parseImageStreamEvents } from "./sse.js";

function dataEvent(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}`;
}

describe("classifyImageError", () => {
  it("classifies rate limits", () => {
    expect(classifyImageError("Rate limit reached, please try again")).toBe("rate_limit");
    expect(classifyImageError("input-images per min exceeded for gpt-image-2")).toBe("codex_image_input_rate_limit");
  });

  it("classifies transport and model errors", () => {
    expect(classifyImageError("403 Forbidden by Cloudflare")).toBe("codex_transport_forbidden");
    expect(classifyImageError("invalid_value for gpt-image-2")).toBe("image_model_invalid");
  });

  it("falls back to api_error", () => {
    expect(classifyImageError("something else")).toBe("api_error");
    expect(classifyImageError("")).toBe("unknown");
  });
});

describe("parseImageStreamEvents", () => {
  it("returns the image from output_item.done", () => {
    const image = Buffer.from("pixels").toString("base64");
    const result = parseImageStreamEvents([
      dataEvent({ type: "response.created", response: { id: "resp-1" } }),
      dataEvent({ type: "response.output_item.done", item: { type: "image_generation_call", id: "call-1", result: image, revised_prompt: "rev" } }),
      "data: [DONE]",
    ]);
    expect(Buffer.from(result.data).toString()).toBe("pixels");
    expect(result.responseId).toBe("resp-1");
    expect(result.callId).toBe("call-1");
    expect(result.revisedPrompt).toBe("rev");
  });

  it("reads usage from response.completed after the image item", () => {
    const image = Buffer.from("pixels").toString("base64");
    const result = parseImageStreamEvents([
      dataEvent({ type: "response.output_item.done", item: { type: "image_generation_call", result: image } }),
      dataEvent({ type: "response.completed", response: { id: "resp-2", model: "gpt-6-luna", output: [], usage: { output_tokens: 33 }, tool_usage: { image_gen: { output_tokens: 429 } } } }),
      "data: [DONE]",
    ]);
    expect(Buffer.from(result.data).toString()).toBe("pixels");
    expect(result).toMatchObject({ responseId: "resp-2", responseModel: "gpt-6-luna", usage: { output_tokens: 33 }, imageUsage: { output_tokens: 429 } });
  });

  it("throws classified errors on failure events", () => {
    expect(() =>
      parseImageStreamEvents([dataEvent({ type: "response.failed", response: { error: { message: "Rate limit" } } })]),
    ).toThrow(/rate_limit/);
  });

  it("throws when the stream ends without an image", () => {
    expect(() => parseImageStreamEvents(["data: [DONE]"])).toThrow(/stream_completed_without_image/);
  });
});
