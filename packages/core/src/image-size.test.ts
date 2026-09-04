import { describe, expect, it } from "vitest";
import { parseAspect, parseSize, resolveAspect, resolveDefault, resolveNearestAspect, resolveNearestPixels, validateAspect } from "./image-size.js";

describe("parseSize", () => {
  it("resolves auto and empty to the square default", () => {
    expect(parseSize("auto").size).toBe(resolveDefault().size);
    expect(parseSize("").size).toBe(resolveDefault().size);
  });

  it("snaps arbitrary dimensions to the aspect-preserving valid raster", () => {
    const exact = parseSize("1024x1024");
    expect(exact.size).toBe("1024x1024");
    const small = parseSize("100x100");
    expect(small.width / small.height).toBeCloseTo(1, 3);
    expect(small.width % 16).toBe(0);
    const odd = parseSize("1000x500");
    expect(odd.width / odd.height).toBeCloseTo(2, 2);
  });

  it("rejects only bad aspect ratios", () => {
    expect(() => parseSize("4000x1000")).toThrow(/1:3/);
    expect(() => parseSize("100x4000")).toThrow(/1:3/);
    expect(() => parseSize("0x100")).toThrow(/positive/);
    expect(() => parseSize("banana")).toThrow(/Invalid size/);
  });

  it("resolves presets and aspects to valid rasters", () => {
    for (const value of ["square", "portrait", "landscape", "wide", "16:9", "4/3"]) {
      const size = parseSize(value);
      expect(size.width % 16).toBe(0);
      expect(size.height % 16).toBe(0);
    }
  });
});

describe("resolveAspect", () => {
  it("rejects out-of-range aspects", () => {
    expect(() => resolveAspect(4)).toThrow(/1:3/);
    expect(() => parseAspect("4:1")).toThrow(/1:3/);
  });
});

describe("resolveNearestPixels", () => {
  it("snaps near-miss dimensions to a valid raster", () => {
    const size = resolveNearestPixels(1000, 1000);
    expect(size.width % 16).toBe(0);
    expect(size.height % 16).toBe(0);
    expect(size.pixels).toBeGreaterThanOrEqual(655_360);
  });
});

describe("resolveNearestAspect", () => {
  it("matches resolveAspect output", () => {
    expect(resolveNearestAspect(1).size).toBe(resolveAspect(1).size);
  });
});

describe("validateAspect", () => {
  it("accepts valid aspects and rejects the rest", () => {
    expect(validateAspect(1024, 1024)).toBe(1);
    expect(() => validateAspect(4000, 1000)).toThrow(/1:3/);
  });
});
