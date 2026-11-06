import { ProviderError, type OutputFormat } from "./types.js";

export function normalizeOutputFormat(value: string | undefined): OutputFormat {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "jpg" || normalized === "jpeg") return "jpeg";
  if (normalized === "webp") return "webp";
  if (normalized === "png" || normalized === "") return "png";
  throw new ProviderError({ kind: "usage", message: "Output format must be png, jpeg, or webp." });
}

export function mimeTypeForFormat(format: OutputFormat): string {
  return `image/${format}`;
}
