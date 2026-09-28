function assertRect(rect, label) {
  if (!rect || ["x", "y", "width", "height"].some((field) => !Number.isFinite(rect[field]))) {
    throw new TypeError(`${label} debe contener x, y, width y height numéricos.`);
  }
  if (rect.width <= 0 || rect.height <= 0) throw new RangeError(`${label} necesita dimensiones positivas.`);
}

export function normalizedRectToViewport(rect, printAreaViewport) {
  assertRect(rect, "El rectángulo normalizado");
  assertRect(printAreaViewport, "El viewport del print area");
  return {
    x: printAreaViewport.x + rect.x * printAreaViewport.width,
    y: printAreaViewport.y + rect.y * printAreaViewport.height,
    width: rect.width * printAreaViewport.width,
    height: rect.height * printAreaViewport.height,
  };
}

export function viewportRectToNormalized(rect, printAreaViewport) {
  assertRect(rect, "El rectángulo de viewport");
  assertRect(printAreaViewport, "El viewport del print area");
  return {
    x: (rect.x - printAreaViewport.x) / printAreaViewport.width,
    y: (rect.y - printAreaViewport.y) / printAreaViewport.height,
    width: rect.width / printAreaViewport.width,
    height: rect.height / printAreaViewport.height,
  };
}
