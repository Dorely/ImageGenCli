import { ProviderError, type ImageBackground, type OutputFormat } from "./types.js";

export function normalizeImageBackground(value: string | undefined, format: OutputFormat): ImageBackground {
  const background = value === undefined ? "auto" : value.trim().toLowerCase();
  if (background !== "auto" && background !== "opaque" && background !== "transparent") {
    throw new ProviderError({ kind: "usage", message: "--background must be auto, opaque, or transparent." });
  }
  if (background === "transparent" && format === "jpeg") {
    throw new ProviderError({ kind: "usage", message: "Transparent backgrounds require PNG or WebP. Choose --format png or --format webp." });
  }
  return background;
}

export function normalizeOutputFormat(value: string | undefined): OutputFormat {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "jpg" || normalized === "jpeg") return "jpeg";
  if (normalized === "webp") return "webp";
  return "png";
}

export function mimeTypeForFormat(format: OutputFormat): string {
  return `image/${format}`;
}
