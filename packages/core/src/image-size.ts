export const SIZE_MULTIPLE = 16;
export const MINIMUM_PIXELS = 655_360;
export const MAXIMUM_PIXELS = 8_294_400;
export const MAXIMUM_EDGE = 3840;
export const TARGET_PIXELS = 1_572_864;
export const MAXIMUM_ASPECT_RATIO = 3;
export const PREFERRED_ASPECT_ERROR = 0.001;

export interface ImageSize {
  width: number;
  height: number;
  size: string;
  pixels: number;
}

export class SizeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SizeError";
  }
}

function toSize(width: number, height: number): ImageSize {
  return { width, height, size: `${width}x${height}`, pixels: width * height };
}

function targetAspect(width: number, height: number): number {
  return validatedAspect(width / height);
}

export function validateAspect(width: number, height: number): number {
  return targetAspect(width, height);
}

export function parseSize(value: string): ImageSize {
  const normalized = value.trim().toLowerCase();
  if (normalized === "" || normalized === "auto") return resolveDefault();
  if (normalized === "square") return resolveAspect(1);
  if (normalized === "portrait") return resolveAspect(2 / 3);
  if (normalized === "landscape") return resolveAspect(3 / 2);
  if (normalized === "wide" || normalized === "widescreen") return resolveAspect(16 / 9);
  const match = /^(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)$/.exec(normalized);
  if (match) {
    return resolveNearestPixels(Number(match[1]), Number(match[2]));
  }
  const aspect = parseAspect(normalized);
  return resolveNearestAspect(aspect);
}

export function parseAspect(value: string): number {
  const normalized = value.trim().toLowerCase();
  const ratio = /^(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)$/.exec(normalized);
  if (ratio) {
    const width = Number(ratio[1]);
    const height = Number(ratio[2]);
    if (width > 0 && height > 0) return validatedAspect(width / height);
  }
  const decimal = Number(normalized);
  if (Number.isFinite(decimal) && decimal > 0) return validatedAspect(decimal);
  throw new SizeError(`Invalid size '${value}'. Use WIDTHxHEIGHT, an aspect like 16:9, a preset (square, portrait, landscape, wide), or auto.`);
}

function validatedAspect(aspect: number): number {
  if (!Number.isFinite(aspect) || aspect < 1 / MAXIMUM_ASPECT_RATIO || aspect > MAXIMUM_ASPECT_RATIO) {
    throw new SizeError("Image aspect ratio must be between 1:3 and 3:1.");
  }
  return aspect;
}

export function resolveDefault(): ImageSize {
  return resolveAspect(1);
}

export function resolveAspect(aspect: number): ImageSize {
  const valid = validatedAspect(aspect);
  const candidates: { width: number; height: number; aspectError: number; areaDistance: number }[] = [];
  for (let width = SIZE_MULTIPLE; width <= MAXIMUM_EDGE; width += SIZE_MULTIPLE) {
    const nearestHeight = Math.round(width / valid / SIZE_MULTIPLE) * SIZE_MULTIPLE;
    for (let offset = -1; offset <= 1; offset += 1) {
      const height = nearestHeight + offset * SIZE_MULTIPLE;
      if (height <= 0 || height > MAXIMUM_EDGE) continue;
      const pixels = width * height;
      if (pixels < MINIMUM_PIXELS || pixels > MAXIMUM_PIXELS) continue;
      const actualAspect = width / height;
      if (actualAspect < 1 / MAXIMUM_ASPECT_RATIO || actualAspect > MAXIMUM_ASPECT_RATIO) continue;
      candidates.push({
        width,
        height,
        aspectError: Math.abs(Math.log(actualAspect / valid)),
        areaDistance: Math.abs(pixels - TARGET_PIXELS),
      });
    }
  }
  if (candidates.length === 0) {
    throw new SizeError("Could not derive a valid raster size for the requested aspect ratio.");
  }
  const exact = candidates.filter((candidate) => candidate.aspectError <= 1e-10);
  const pool = exact.length > 0 ? exact : candidates.filter((candidate) => candidate.aspectError <= PREFERRED_ASPECT_ERROR);
  const ranked = (pool.length > 0 ? pool : candidates).sort(
    (a, b) => a.areaDistance - b.areaDistance || a.aspectError - b.aspectError || a.width - b.width || a.height - b.height,
  );
  const selected = ranked[0];
  return toSize(selected.width, selected.height);
}

export function resolveNearestAspect(aspect: number): ImageSize {
  return resolveAspect(aspect);
}

export function resolveNearestPixels(width: number, height: number): ImageSize {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new SizeError("Desired image pixels must be finite positive values.");
  }
  const aspect = targetAspect(width, height);
  const candidates: { width: number; height: number; aspectError: number; distance: number }[] = [];
  for (let candidateWidth = SIZE_MULTIPLE; candidateWidth <= MAXIMUM_EDGE; candidateWidth += SIZE_MULTIPLE) {
    const nearestHeight = Math.round(candidateWidth / aspect / SIZE_MULTIPLE) * SIZE_MULTIPLE;
    for (let offset = -1; offset <= 1; offset += 1) {
      const candidateHeight = nearestHeight + offset * SIZE_MULTIPLE;
      if (candidateHeight <= 0 || candidateHeight > MAXIMUM_EDGE) continue;
      const pixels = candidateWidth * candidateHeight;
      if (pixels < MINIMUM_PIXELS || pixels > MAXIMUM_PIXELS) continue;
      const actualAspect = candidateWidth / candidateHeight;
      const aspectError = Math.abs(Math.log(actualAspect / aspect));
      if (aspectError > PREFERRED_ASPECT_ERROR) continue;
      candidates.push({
        width: candidateWidth,
        height: candidateHeight,
        aspectError,
        distance: Math.round((candidateWidth - width) ** 2 + (candidateHeight - height) ** 2),
      });
    }
  }
  if (candidates.length === 0) {
    throw new SizeError("Could not derive a provider-valid raster near the requested pixel dimensions.");
  }
  const ranked = candidates.sort(
    (a, b) => a.distance - b.distance || a.aspectError - b.aspectError || a.width - b.width || a.height - b.height,
  );
  const selected = ranked[0];
  return toSize(selected.width, selected.height);
}
