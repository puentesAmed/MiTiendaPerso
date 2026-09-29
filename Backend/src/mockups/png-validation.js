const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
export const MAX_ARTWORK_BYTES = 8 * 1024 * 1024;
export const MAX_ARTWORK_DIMENSION = 4096;
export const MAX_ARTWORK_PIXELS = 16_000_000;

export function inspectPng(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 24 || buffer.length > MAX_ARTWORK_BYTES) throw new Error("INVALID_ARTWORK");
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE) || buffer.toString("ascii", 12, 16) !== "IHDR") throw new Error("INVALID_ARTWORK");
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (!width || !height || width > MAX_ARTWORK_DIMENSION || height > MAX_ARTWORK_DIMENSION || width * height > MAX_ARTWORK_PIXELS) throw new Error("INVALID_ARTWORK");
  return { width, height, sizeBytes: buffer.length };
}

