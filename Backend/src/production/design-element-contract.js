import {
  DEFAULT_DESIGNER_FONT_ID,
  getDesignerFont,
  isDesignerFontWeightAllowed,
} from "../../../shared/designer-v2/fontRegistry.js";
import { isDesignerShape } from "../../../shared/designer-v2/shapeRegistry.js";

const ALLOWED_TYPES = new Set(["text", "image", "shape"]);
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function validateProductionDesignElement(element) {
  const errors = [];
  if (!element || typeof element !== "object") return ["elemento inválido"];
  if (!ALLOWED_TYPES.has(element.type)) errors.push("tipo no soportado");
  if (!element.id || !element.printAreaId) errors.push("identidad incompleta");
  for (const field of ["x", "y", "width", "height", "rotation", "opacity", "zIndex"]) {
    if (!Number.isFinite(element[field])) errors.push(`${field} no es finito`);
  }
  if (Number.isFinite(element.width) && element.width <= 0) errors.push("width no es positivo");
  if (Number.isFinite(element.height) && element.height <= 0) errors.push("height no es positivo");
  if (Number.isFinite(element.opacity) && (element.opacity < 0 || element.opacity > 1)) errors.push("opacity fuera de rango");
  if (element.scale !== undefined && (!Number.isFinite(element.scale?.x) || !Number.isFinite(element.scale?.y))) errors.push("scale inválida");

  if (element.type === "text") {
    const fontId = element.fontId || DEFAULT_DESIGNER_FONT_ID;
    if (typeof element.content !== "string") errors.push("texto sin contenido válido");
    if (!Number.isFinite(element.fontSize) || element.fontSize <= 0) errors.push("fontSize inválido");
    if (!HEX_COLOR.test(element.color || "")) errors.push("color de texto inválido");
    if (!["left", "center", "right"].includes(element.textAlign)) errors.push("alineación inválida");
    if (!getDesignerFont(fontId)) errors.push("fontId no soportado");
    else if (!isDesignerFontWeightAllowed(fontId, element.fontWeight)) errors.push("peso de fuente no soportado");
  }

  if (element.type === "shape") {
    if (!isDesignerShape(element.shapeType)) errors.push("shapeType no soportado");
    if (element.fill !== "none" && !HEX_COLOR.test(element.fill || "")) errors.push("fill inválido");
    if (!HEX_COLOR.test(element.stroke || "")) errors.push("stroke inválido");
    if (!Number.isFinite(element.strokeWidth) || element.strokeWidth < 0) errors.push("strokeWidth inválido");
  }

  return errors;
}

