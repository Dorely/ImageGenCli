import { describe, expect, it } from "vitest";
import { parseAspect, parseSize, resolveAspect, resolveDefault, resolveNearestAspect, resolveNearestPixels } from "./image-size.js";

describe("parseSize", () => {
  it("resolves auto and empty to the square default", () => {
    expect(parseSize("auto").size).toBe(resolveDefault().size);
    expect(parseSize("").size).toBe(resolveDefault().size);
  });

  it("accepts exact valid rasters", () => {
    expect(parseSize("1024x1024").size).toBe("1024x1024");
  });

  it("rejects rasters outside provider limits", () => {
    expect(() => parseSize("100x100")).toThrow(/divisible/);
    expect(() => parseSize("4000x100")).toThrow(/divisible|exceed/);
    expect(() => parseSize("4000x4000")).toThrow();
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
