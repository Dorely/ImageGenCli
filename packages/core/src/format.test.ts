import { describe, expect, it } from "vitest";
import { mimeTypeForFormat, normalizeOutputFormat } from "./format.js";

describe("normalizeOutputFormat", () => {
  it("maps jpg to jpeg", () => {
    expect(normalizeOutputFormat("jpg")).toBe("jpeg");
    expect(normalizeOutputFormat("JPEG")).toBe("jpeg");
  });

  it("passes through jpeg, webp, and png", () => {
    expect(normalizeOutputFormat("jpeg")).toBe("jpeg");
    expect(normalizeOutputFormat("webp")).toBe("webp");
    expect(normalizeOutputFormat("png")).toBe("png");
  });

  it("falls back to png for missing or unknown values", () => {
    expect(normalizeOutputFormat(undefined)).toBe("png");
    expect(normalizeOutputFormat("")).toBe("png");
    expect(normalizeOutputFormat("bmp")).toBe("png");
  });
});

describe("mimeTypeForFormat", () => {
  it("builds image mime types", () => {
    expect(mimeTypeForFormat("png")).toBe("image/png");
    expect(mimeTypeForFormat("jpeg")).toBe("image/jpeg");
    expect(mimeTypeForFormat("webp")).toBe("image/webp");
  });
});
