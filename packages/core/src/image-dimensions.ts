export interface ImageDimensions {
  width: number;
  height: number;
}

// Reads pixel dimensions from PNG, JPEG, or WebP headers without decoding.
// Returns undefined for anything it does not recognize.
export function readImageDimensions(data: Uint8Array): ImageDimensions | undefined {
  const bytes = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  return readPng(bytes) ?? readJpeg(bytes) ?? readWebp(bytes);
}

function valid(width: number, height: number): ImageDimensions | undefined {
  return width > 0 && height > 0 ? { width, height } : undefined;
}

function readPng(bytes: Buffer): ImageDimensions | undefined {
  if (bytes.length < 24 || bytes.readUInt32BE(0) !== 0x89504e47 || bytes.toString("latin1", 12, 16) !== "IHDR") return undefined;
  return valid(bytes.readUInt32BE(16), bytes.readUInt32BE(20));
}

function readJpeg(bytes: Buffer): ImageDimensions | undefined {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return undefined;
  let offset = 2;
  while (offset + 9 <= bytes.length) {
    if (bytes[offset] !== 0xff) return undefined;
    const marker = bytes[offset + 1];
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    const isStartOfFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isStartOfFrame) return valid(bytes.readUInt16BE(offset + 7), bytes.readUInt16BE(offset + 5));
    offset += 2 + bytes.readUInt16BE(offset + 2);
  }
  return undefined;
}

function readWebp(bytes: Buffer): ImageDimensions | undefined {
  if (bytes.length < 30 || bytes.toString("latin1", 0, 4) !== "RIFF" || bytes.toString("latin1", 8, 12) !== "WEBP") return undefined;
  const chunk = bytes.toString("latin1", 12, 16);
  if (chunk === "VP8 ") return valid(bytes.readUInt16LE(26) & 0x3fff, bytes.readUInt16LE(28) & 0x3fff);
  if (chunk === "VP8L") {
    const bits = bytes.readUInt32LE(21);
    return valid((bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1);
  }
  if (chunk === "VP8X") return valid(bytes.readUIntLE(24, 3) + 1, bytes.readUIntLE(27, 3) + 1);
  return undefined;
}
