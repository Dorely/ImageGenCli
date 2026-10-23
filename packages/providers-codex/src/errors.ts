export function classifyImageError(message: string): string {
  if (!message.trim()) return "unknown";
  const lowerRate = message.includes("input-images") && message.includes("per min") && message.toLowerCase().includes("gpt-image");
  if (lowerRate) return "codex_image_input_rate_limit";
  if (/usage limit/i.test(message)) return "usage_limit";
  if (/rate limit|429|too many requests|please try again/i.test(message)) return "rate_limit";
  if (/403|forbidden|cloudflare/i.test(message)) return "codex_transport_forbidden";
  if (/invalid_value/i.test(message) && /gpt-image/i.test(message)) return "image_model_invalid";
  return "api_error";
}

// Extracts a readable message from a backend error body without echoing large payloads.
export function readErrorMessage(body: string): string | null {
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
