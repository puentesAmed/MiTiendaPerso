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

export function validateEditorPresentation(presentation) {
  if (!presentation) return { valid: true, errors: [] };
  const errors = [];
  if (presentation.type !== "garment") errors.push("editorPresentation.type no soportado.");
  if (!PRODUCT_EDITOR_GUIDES[presentation.guideId] && !presentation.editableMask) errors.push("editorPresentation.guideId no registrado.");
  if (!Number.isFinite(presentation.aspectRatio) || presentation.aspectRatio <= 0) errors.push("editorPresentation.aspectRatio inválido.");
  if (!isNormalizedRect(presentation.guideBounds)) errors.push("editorPresentation.guideBounds inválido.");
  if (!isNormalizedRect(presentation.printSurface)) errors.push("editorPresentation.printSurface inválido.");
  if (isNormalizedRect(presentation.guideBounds) && isNormalizedRect(presentation.printSurface)) {
    const guide = presentation.guideBounds;
    const surface = presentation.printSurface;
    if (surface.x < guide.x || surface.y < guide.y || surface.x + surface.width > guide.x + guide.width || surface.y + surface.height > guide.y + guide.height) errors.push("editorPresentation debe contener la PrintSurface dentro de la guía.");
  }
  return { valid: errors.length === 0, errors };
}

export function getViewEditorPresentation(view) {
  return view?.editorPresentation ?? null;
}

export function getPresentationSurfaceStyle(presentation) {
  const surface = presentation?.printSurface;
  if (!surface) return null;
  return {
    left: `${surface.x * 100}%`,
    top: `${surface.y * 100}%`,
    width: `${surface.width * 100}%`,
    height: `${surface.height * 100}%`,
  };
}
