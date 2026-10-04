import { DEFAULT_DESIGNER_FONT_ID, getDesignerFont, isDesignerFontWeightAllowed } from "../../../../../shared/designer-v2/fontRegistry.js";
import { isDesignerShape } from "../../../../../shared/designer-v2/shapeRegistry.js";

export const DESIGN_ELEMENT_TYPES = Object.freeze(["text", "image", "shape"]);

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

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
    const fontId = element.fontId || DEFAULT_DESIGNER_FONT_ID;
    if (typeof element.content !== "string") errors.push("Un texto necesita content.");
    if (!Number.isFinite(element.fontSize) || element.fontSize <= 0) errors.push("fontSize debe ser positivo.");
    if (!HEX_COLOR.test(element.color || "")) errors.push("Un texto necesita un color hexadecimal válido.");
    if (!["left", "center", "right"].includes(element.textAlign)) errors.push("textAlign no soportado.");
    if (!getDesignerFont(fontId)) errors.push("fontId no soportado.");
    else if (!isDesignerFontWeightAllowed(fontId, element.fontWeight)) errors.push("fontWeight no soportado por la fuente.");
  }
  if (element.type === "image" && !element.assetId) errors.push("Una imagen necesita assetId.");
  if (element.type === "shape") {
    if (!isDesignerShape(element.shapeType)) errors.push("shapeType no soportado.");
    if (element.width <= 0 || element.height <= 0) errors.push("Una forma necesita dimensiones positivas.");
    if (element.fill !== "none" && !HEX_COLOR.test(element.fill || "")) errors.push("fill debe ser un color hexadecimal o none.");
    if (!HEX_COLOR.test(element.stroke || "")) errors.push("stroke debe ser un color hexadecimal válido.");
    if (!Number.isFinite(element.strokeWidth) || element.strokeWidth < 0) errors.push("strokeWidth debe ser finito y no negativo.");
  }

  if (Number.isFinite(element.opacity) && (element.opacity < 0 || element.opacity > 1)) errors.push("opacity debe estar entre 0 y 1.");

  return { valid: errors.length === 0, errors };
}
