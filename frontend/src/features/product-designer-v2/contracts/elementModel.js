export const DESIGN_ELEMENT_TYPES = Object.freeze(["text", "image", "shape"]);

export function validateDesignElement(element) {
  const errors = [];
  const finiteFields = ["x", "y", "width", "height", "rotation", "opacity", "zIndex"];

  if (!element || typeof element !== "object") {
    return { valid: false, errors: ["El elemento debe ser un objeto."] };
  }

  if (!element.id) errors.push("El elemento necesita id.");
  if (!DESIGN_ELEMENT_TYPES.includes(element.type)) errors.push("El tipo de elemento no está soportado.");
  if (!element.printAreaId) errors.push("El elemento necesita printAreaId.");
  finiteFields.forEach((field) => {
    if (!Number.isFinite(element[field])) errors.push(`${field} debe ser un número finito.`);
  });
  if (Number.isFinite(element.width) && element.width < 0) errors.push("width no puede ser negativo.");
  if (Number.isFinite(element.height) && element.height < 0) errors.push("height no puede ser negativo.");
  if (!element.scale || !Number.isFinite(element.scale.x) || !Number.isFinite(element.scale.y)) {
    errors.push("scale debe incluir x e y finitos.");
  }
  if (typeof element.locked !== "boolean") errors.push("locked debe ser booleano.");
  if (typeof element.hidden !== "boolean") errors.push("hidden debe ser booleano.");
  if (element.type === "text") {
    if (typeof element.content !== "string") errors.push("Un texto necesita content.");
    if (!Number.isFinite(element.fontSize) || element.fontSize <= 0) errors.push("fontSize debe ser positivo.");
    if (typeof element.color !== "string") errors.push("Un texto necesita color.");
    if (!["left", "center", "right"].includes(element.textAlign)) errors.push("textAlign no soportado.");
    if (![400, 500, 600, 700].includes(element.fontWeight)) errors.push("fontWeight no soportado.");
  }
  if (element.type === "image" && !element.assetId) errors.push("Una imagen necesita assetId.");

  return { valid: errors.length === 0, errors };
}
