import type { OutputFormat } from "./types.js";

export function normalizeOutputFormat(value: string | undefined): OutputFormat {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "jpg" || normalized === "jpeg") return "jpeg";
  if (normalized === "webp") return "webp";
  return "png";
}

export function mimeTypeForFormat(format: OutputFormat): string {
  return `image/${format}`;
}
