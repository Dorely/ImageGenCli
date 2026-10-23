import { describe, expect, it } from "vitest";
import { readImageDimensions } from "./image-dimensions.js";

function png(width: number, height: number): Uint8Array {
  const bytes = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes, 0);
  bytes.writeUInt32BE(13, 8);
  bytes.write("IHDR", 12, "latin1");
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return bytes;
}

function jpeg(width: number, height: number): Uint8Array {
  const app0 = Buffer.from([0xff, 0xe0, 0x00, 0x10, ...Buffer.from("JFIF\0"), 1, 1, 0, 0, 1, 0, 1, 0, 0]);
  const sof = Buffer.alloc(19);
  sof.writeUInt16BE(0xffc2, 0);
  sof.writeUInt16BE(17, 2);
  sof[4] = 8;
  sof.writeUInt16BE(height, 5);
  sof.writeUInt16BE(width, 7);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app0, sof]);
}

function webp(chunk: string, body: (bytes: Buffer) => void): Uint8Array {
  const bytes = Buffer.alloc(40);
  bytes.write("RIFF", 0, "latin1");
  bytes.write("WEBP", 8, "latin1");
  bytes.write(chunk, 12, "latin1");
  body(bytes);
  return bytes;
}

describe("readImageDimensions", () => {
  it("reads PNG headers", () => {
    expect(readImageDimensions(png(1374, 1145))).toEqual({ width: 1374, height: 1145 });
  });

  it("reads JPEG frame headers after other segments", () => {
    expect(readImageDimensions(jpeg(1536, 1024))).toEqual({ width: 1536, height: 1024 });
  });

  it("reads lossy, lossless, and extended WebP headers", () => {
    const lossy = webp("VP8 ", (b) => { b.writeUInt16LE(800, 26); b.writeUInt16LE(600, 28); });
    const lossless = webp("VP8L", (b) => b.writeUInt32LE((1024 - 1) | ((768 - 1) << 14), 21));
    const extended = webp("VP8X", (b) => { b.writeUIntLE(2048 - 1, 24, 3); b.writeUIntLE(1152 - 1, 27, 3); });
    expect(readImageDimensions(lossy)).toEqual({ width: 800, height: 600 });
    expect(readImageDimensions(lossless)).toEqual({ width: 1024, height: 768 });
    expect(readImageDimensions(extended)).toEqual({ width: 2048, height: 1152 });
  });

  it("returns undefined for unrecognized data", () => {
    expect(readImageDimensions(Buffer.from("pixels"))).toBeUndefined();
    expect(readImageDimensions(new Uint8Array())).toBeUndefined();
  });
});
