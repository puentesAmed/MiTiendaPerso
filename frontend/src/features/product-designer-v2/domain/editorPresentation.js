const NORMALIZED_RECT_FIELDS = ["x", "y", "width", "height"];

export const PRODUCT_EDITOR_GUIDES = Object.freeze({
  "basic-tshirt-front": Object.freeze({
    viewBox: "0 0 820 1000",
    bodyPath: "M246 118 92 188 18 350l104 55 55-91v565c151 45 335 45 466 0V314l55 91 104-55-74-162-154-70c-36 54-82 76-164 76s-128-22-164-76Z",
    detailPaths: Object.freeze(["M246 118c23 95 305 95 328 0", "M177 314 122 405", "M643 314l55 91"]),
  }),
  "basic-tshirt-back": Object.freeze({
    viewBox: "0 0 820 1000",
    bodyPath: "M246 118 92 188 18 350l104 55 55-91v565c151 45 335 45 466 0V314l55 91 104-55-74-162-154-70c-42 34-91 50-164 50s-122-16-164-50Z",
    detailPaths: Object.freeze(["M246 118c48 66 280 66 328 0", "M177 314 122 405", "M643 314l55 91", "M410 168v42"]),
  }),
});

function isNormalizedRect(rect) {
  return Boolean(rect) && NORMALIZED_RECT_FIELDS.every((field) => Number.isFinite(rect[field]))
    && rect.x >= 0 && rect.y >= 0 && rect.width > 0 && rect.height > 0
    && rect.x + rect.width <= 1 && rect.y + rect.height <= 1;
}

function pointOnSegment([pointX, pointY], [startX, startY], [endX, endY]) {
  const cross = (pointY - startY) * (endX - startX) - (pointX - startX) * (endY - startY);
  if (Math.abs(cross) > 1e-9) return false;
  return pointX >= Math.min(startX, endX) - 1e-9 && pointX <= Math.max(startX, endX) + 1e-9
    && pointY >= Math.min(startY, endY) - 1e-9 && pointY <= Math.max(startY, endY) + 1e-9;
}

function polygonContainsPoint(polygon, point) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    if (pointOnSegment(point, polygon[previous], polygon[index])) return true;
    const [x, y] = polygon[index];
    const [previousX, previousY] = polygon[previous];
    if ((y > point[1]) !== (previousY > point[1]) && point[0] < ((previousX - x) * (point[1] - y)) / (previousY - y) + x) inside = !inside;
  }
  return inside;
}

export function editorialGuideContainsMask(guideDefinition, maskDefinition) {
  const outlines = guideDefinition?.outline || [];
  return Boolean(outlines.length && maskDefinition?.include?.length)
    && maskDefinition.include.every(({ polygon }) => polygon.every((point) => outlines.some((outline) => polygonContainsPoint(outline, point))));
}

export function validateEditorPresentation(presentation) {
  if (!presentation) return { valid: true, errors: [] };
  const errors = [];
  if (presentation.type !== "garment") errors.push("editorPresentation.type no soportado.");
  if (!PRODUCT_EDITOR_GUIDES[presentation.guideId] && !presentation.editableMask) errors.push("editorPresentation.guideId no registrado.");
  if (!Number.isFinite(presentation.aspectRatio) || presentation.aspectRatio <= 0) errors.push("editorPresentation.aspectRatio inválido.");
  if (presentation.displayFit && (![presentation.displayFit.maxWidthRatio, presentation.displayFit.maxHeightRatio].every((value) => Number.isFinite(value) && value > 0 && value <= 1))) errors.push("editorPresentation.displayFit inválido.");
  if (!isNormalizedRect(presentation.guideBounds)) errors.push("editorPresentation.guideBounds inválido.");
  if (!isNormalizedRect(presentation.printSurface)) errors.push("editorPresentation.printSurface inválido.");
  if (isNormalizedRect(presentation.guideBounds) && isNormalizedRect(presentation.printSurface)) {
    const guide = presentation.guideBounds;
    const surface = presentation.printSurface;
    if (surface.x < guide.x || surface.y < guide.y || surface.x + surface.width > guide.x + guide.width || surface.y + surface.height > guide.y + guide.height) errors.push("editorPresentation debe contener la PrintSurface dentro de la guía.");
  }
  if (presentation.guide && presentation.editableMask && !editorialGuideContainsMask(presentation.guide, presentation.editableMask)) errors.push("La guía editorial debe contener la máscara editable.");
  return { valid: errors.length === 0, errors };
}

export function getViewEditorPresentation(view) {
  return view?.editorPresentation ?? null;
}

export function getPresentationSurfaceStyle(presentation) {
  const surface = presentation?.printSurface;
  if (!surface) return null;
  const percentage = (value) => `${Number((value * 100).toFixed(6))}%`;
  return {
    left: percentage(surface.x),
    top: percentage(surface.y),
    width: percentage(surface.width),
    height: percentage(surface.height),
  };
}
