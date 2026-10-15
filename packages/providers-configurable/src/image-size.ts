import { usage, type ApiFormat } from "./profiles.js";
export function imageSize(
  value: string | undefined,
  api: ApiFormat,
): Record<string, string> {
  const size = (value ?? "auto").trim().toLowerCase();
  if (!size || size === "auto") return {};
  const presets: Record<string, string> = {
    square: "1024x1024",
    portrait: "1024x1536",
    landscape: "1536x1024",
    wide: "1536x864",
    widescreen: "1536x864",
  };
  if (presets[size]) return { size: presets[size] };
  const pixels = /^(\d+)\s*x\s*(\d+)$/.exec(size);
  if (
    pixels &&
    Number.isSafeInteger(Number(pixels[1])) &&
    Number.isSafeInteger(Number(pixels[2])) &&
    Number(pixels[1]) > 0 &&
    Number(pixels[2]) > 0
  )
    return { size: `${Number(pixels[1])}x${Number(pixels[2])}` };
  const ratio = /^(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)$/.exec(size);
  if (
    api === "openrouter" &&
    ratio &&
    Number(ratio[1]) > 0 &&
    Number(ratio[2]) > 0 &&
    Number.isFinite(Number(ratio[1]) / Number(ratio[2]))
  )
    return { aspect_ratio: `${Number(ratio[1])}:${Number(ratio[2])}` };
  throw usage(
    api === "openai-images"
      ? "This API format requires WIDTHxHEIGHT or a preset; arbitrary aspect-only sizes are unsupported."
      : "Use WIDTHxHEIGHT, an aspect ratio, preset, or auto.",
  );
}
