import { describe, expect, it } from "vitest";
import { classifyImageError, readErrorMessage } from "./errors.js";

describe("classifyImageError", () => {
  it("classifies rate and usage limits", () => {
    expect(classifyImageError("Rate limit reached, please try again")).toBe("rate_limit");
    expect(classifyImageError("input-images per min exceeded for gpt-image-2")).toBe("codex_image_input_rate_limit");
    expect(classifyImageError('{"detail":"The usage limit has been reached"}')).toBe("usage_limit");
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

describe("readErrorMessage", () => {
  it("reads detail, message, and nested error messages", () => {
    expect(readErrorMessage('{"detail":"Unauthorized"}')).toBe("Unauthorized");
    expect(readErrorMessage('{"error":{"message":"Invalid value"}}')).toBe("Invalid value");
    expect(readErrorMessage("plain text")).toBe("plain text");
    expect(readErrorMessage("")).toBeNull();
  });
});
