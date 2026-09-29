function assertNormalizedPoint(point) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) throw new Error("Punto normalizado inválido.");
}

function rotateAroundCenter(point, radians) {
  if (!radians) return { ...point };
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const x = point.x - 0.5;
  const y = point.y - 0.5;
  return { x: x * cosine - y * sine + 0.5, y: x * sine + y * cosine + 0.5 };
}

export function normalizedToTexturePoint(point, printSurface) {
  assertNormalizedPoint(point);
  const { width, height } = printSurface.previewTextureResolution;
  return { x: point.x * width, y: point.y * height };
}

export function textureToNormalizedPoint(point, printSurface) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) throw new Error("Punto de textura inválido.");
  const { width, height } = printSurface.previewTextureResolution;
  return { x: point.x / width, y: point.y / height };
}

export function normalizedRectToTextureRect(rect, printSurface) {
  if (!rect || !["x", "y", "width", "height"].every((key) => Number.isFinite(rect[key]))) throw new Error("Rectángulo normalizado inválido.");
  const { width, height } = printSurface.previewTextureResolution;
  return { x: rect.x * width, y: rect.y * height, width: rect.width * width, height: rect.height * height };
}

export function textureRectToNormalizedRect(rect, printSurface) {
  if (!rect || !["x", "y", "width", "height"].every((key) => Number.isFinite(rect[key]))) throw new Error("Rectángulo de textura inválido.");
  const { width, height } = printSurface.previewTextureResolution;
  return { x: rect.x / width, y: rect.y / height, width: rect.width / width, height: rect.height / height };
}

export function normalizedToUvPoint(point, uvMapping) {
  assertNormalizedPoint(point);
  const rotated = rotateAroundCenter(point, uvMapping.rotation);
  const uRange = uvMapping.uMax - uvMapping.uMin;
  const vRange = uvMapping.vMax - uvMapping.vMin;
  return {
    u: uvMapping.flipU ? uvMapping.uMax - rotated.x * uRange : uvMapping.uMin + rotated.x * uRange,
    v: uvMapping.flipV ? uvMapping.vMax - rotated.y * vRange : uvMapping.vMin + rotated.y * vRange,
  };
}

export function uvToNormalizedPoint(point, uvMapping) {
  if (!point || !Number.isFinite(point.u) || !Number.isFinite(point.v)) throw new Error("Punto UV inválido.");
  const uRange = uvMapping.uMax - uvMapping.uMin;
  const vRange = uvMapping.vMax - uvMapping.vMin;
  const rotated = {
    x: uvMapping.flipU ? (uvMapping.uMax - point.u) / uRange : (point.u - uvMapping.uMin) / uRange,
    y: uvMapping.flipV ? (uvMapping.vMax - point.v) / vRange : (point.v - uvMapping.vMin) / vRange,
  };
  return rotateAroundCenter(rotated, -uvMapping.rotation);
}
