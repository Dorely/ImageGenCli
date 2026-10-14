import { ProviderError } from "@imagegencli/core";
export const DEFAULT_IMAGE_MODEL = "gemini-nano-banana-2.1";
const native: Record<string, [number, number]> = {
  "1:1": [1024, 1024],
  "1:4": [512, 2048],
  "1:8": [384, 3072],
  "2:3": [848, 1264],
  "3:2": [1264, 848],
  "3:4": [896, 1200],
  "4:1": [2048, 512],
  "4:3": [1200, 896],
  "4:5": [928, 1152],
  "5:4": [1152, 928],
  "8:1": [3072, 384],
  "9:16": [768, 1376],
  "16:9": [1376, 768],
  "21:9": [1584, 672],
};
const legacy: Record<string, [number, number]> = {
  "1:1": [1024, 1024],
  "2:3": [832, 1248],
  "3:2": [1248, 832],
  "3:4": [864, 1184],
  "4:3": [1184, 864],
  "4:5": [896, 1152],
  "5:4": [1152, 896],
  "9:16": [768, 1344],
  "16:9": [1344, 768],
  "21:9": [1536, 672],
};
export function resolveGeminiSize(
  size: string | undefined,
  model = DEFAULT_IMAGE_MODEL,
) {
  const value = (size ?? "auto").trim().toLowerCase();
  const table = model === "gemini-2.5-flash-image" ? legacy : native;
  const restricted =
    model === "gemini-3-pro-image" || model === "nano-banana-pro-preview";
  const ratios = Object.keys(table).filter(
    (r) => !restricted || !["1:4", "4:1", "1:8", "8:1"].includes(r),
  );
  const presets: Record<string, string> = {
    square: "1:1",
    portrait: "2:3",
    landscape: "3:2",
    wide: "16:9",
    widescreen: "16:9",
  };
  const normalized = presets[value] ?? value;
  const pixels = /^(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)$/.exec(normalized);
  const ratio = /^(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)$/.exec(normalized);
  const auto = normalized === "auto" || normalized === "";
  const width = Number(pixels?.[1] ?? ratio?.[1] ?? (auto ? 1 : normalized));
  const height = Number(pixels?.[2] ?? ratio?.[2] ?? 1);
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new ProviderError({
      kind: "usage",
      message:
        "Invalid Gemini size. Use WIDTHxHEIGHT, an aspect ratio, preset, or auto.",
    });
  }
  const aspect = width / height;
  const selected = ratios.sort((a, b) => {
    const number = (r: string) => {
      const [x, y] = r.split(":").map(Number);
      return x / y;
    };
    return (
      Math.abs(Math.log(number(a) / aspect)) -
      Math.abs(Math.log(number(b) / aspect))
    );
  })[0];
  const scales =
    model === "gemini-2.5-flash-image" ||
    model === "gemini-3.1-flash-lite-image"
      ? [1]
      : model === "gemini-3.1-flash-image"
        ? [0.5, 1, 2, 4]
        : [1, 2, 4];
  const candidates = scales.map((scale) => ({
    width: table[selected][0] * scale,
    height: table[selected][1] * scale,
    scale,
  }));
  const chosen = pixels
    ? candidates.sort(
        (a, b) =>
          (a.width - width) ** 2 +
            (a.height - height) ** 2 -
            ((b.width - width) ** 2 + (b.height - height) ** 2) ||
          a.scale - b.scale,
      )[0]
    : candidates.find((c) => c.scale === 1)!;
  return {
    ...chosen,
    size: `${chosen.width}x${chosen.height}`,
    pixels: chosen.width * chosen.height,
    aspectRatio: auto ? undefined : selected,
    imageSize:
      auto || model === "gemini-2.5-flash-image"
        ? undefined
        : chosen.scale === 0.5
          ? "512"
          : `${chosen.scale}K`,
  };
}
