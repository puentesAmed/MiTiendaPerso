import { DESIGN_ELEMENT_TYPES } from "./elementModel.js";
import { validatePrintSurface } from "./printSurface.js";
import { validateEditorPresentation } from "../domain/editorPresentation.js";

export const PRODUCT_TEMPLATE_SCHEMA_VERSION = 1;

function isFiniteNumber(value) {
  return Number.isFinite(value);
}

function validatePrintArea(printArea, viewId) {
  const errors = [];
  const prefix = `Vista ${viewId}, print area ${printArea?.id || "sin id"}`;

  if (!printArea?.id) errors.push(`${prefix}: falta id.`);
  if (!printArea?.label) errors.push(`${prefix}: falta label.`);
  ["x", "y", "width", "height"].forEach((field) => {
    if (!isFiniteNumber(printArea?.[field])) errors.push(`${prefix}: ${field} debe ser numérico.`);
  });
  if (isFiniteNumber(printArea?.x) && (printArea.x < 0 || printArea.x > 1)) errors.push(`${prefix}: x debe estar entre 0 y 1.`);
  if (isFiniteNumber(printArea?.y) && (printArea.y < 0 || printArea.y > 1)) errors.push(`${prefix}: y debe estar entre 0 y 1.`);
  if (isFiniteNumber(printArea?.width) && (printArea.width <= 0 || printArea.width > 1)) errors.push(`${prefix}: width debe estar entre 0 y 1.`);
  if (isFiniteNumber(printArea?.height) && (printArea.height <= 0 || printArea.height > 1)) errors.push(`${prefix}: height debe estar entre 0 y 1.`);
  if (isFiniteNumber(printArea?.x) && isFiniteNumber(printArea?.width) && printArea.x + printArea.width > 1) errors.push(`${prefix}: el área excede el ancho de la vista.`);
  if (isFiniteNumber(printArea?.y) && isFiniteNumber(printArea?.height) && printArea.y + printArea.height > 1) errors.push(`${prefix}: el área excede el alto de la vista.`);
  if (!printArea?.shape?.type) errors.push(`${prefix}: falta shape.type.`);
  if (typeof printArea?.clip?.enabled !== "boolean") errors.push(`${prefix}: clip.enabled debe ser booleano.`);
  if (!("safeArea" in (printArea || {}))) errors.push(`${prefix}: falta safeArea.`);
  if (!("bleed" in (printArea || {}))) errors.push(`${prefix}: falta bleed.`);
  if (!("physicalSize" in (printArea || {}))) errors.push(`${prefix}: falta physicalSize.`);
  if (!printArea?.constraints || !Array.isArray(printArea.constraints.allowedElementTypes)) {
    errors.push(`${prefix}: faltan constraints.allowedElementTypes.`);
  } else if (printArea.constraints.allowedElementTypes.some((type) => !DESIGN_ELEMENT_TYPES.includes(type))) {
    errors.push(`${prefix}: contiene tipos de elemento no soportados.`);
  }

  return errors;
}

export function validateProductTemplate(template) {
  const errors = [];

  if (!template || typeof template !== "object") {
    return { valid: false, errors: ["ProductTemplate debe ser un objeto."] };
  }
  if (template.schemaVersion !== PRODUCT_TEMPLATE_SCHEMA_VERSION) errors.push("schemaVersion de ProductTemplate no soportado.");
  if (!template.templateId) errors.push("Falta templateId.");
  if (!Number.isInteger(template.templateRevision) || template.templateRevision < 1) errors.push("templateRevision debe ser un entero positivo.");
  if (!template.productType) errors.push("Falta productType.");
  if (!template.label) errors.push("Falta label.");
  if (template.editor?.coordinateSystem !== "normalized-print-area") errors.push("editor.coordinateSystem debe ser normalized-print-area.");
  const printSurfaceIds = new Set();
  if (template.printSurfaces !== undefined) {
    if (!Array.isArray(template.printSurfaces) || template.printSurfaces.length === 0) errors.push("printSurfaces debe contener superficies.");
    else template.printSurfaces.forEach((surface) => {
      errors.push(...validatePrintSurface(surface).errors.map((error) => `PrintSurface ${surface?.id || "sin id"}: ${error}`));
      if (printSurfaceIds.has(surface?.id)) errors.push(`PrintSurface duplicada: ${surface.id}.`);
      printSurfaceIds.add(surface?.id);
    });
  }
  if (!Array.isArray(template.views) || template.views.length === 0) {
    errors.push("ProductTemplate necesita al menos una vista.");
  } else {
    const viewIds = new Set();
    template.views.forEach((view) => {
      if (!view?.id) errors.push("Todas las vistas necesitan id.");
      if (!view?.label) errors.push(`Vista ${view?.id || "sin id"}: falta label.`);
      if (viewIds.has(view?.id)) errors.push(`Vista duplicada: ${view.id}.`);
      viewIds.add(view?.id);
      if (view?.printSurfaceId) {
        if (!printSurfaceIds.has(view.printSurfaceId)) errors.push(`Vista ${view?.id || "sin id"}: PrintSurface no registrada.`);
        errors.push(...validateEditorPresentation(view.editorPresentation).errors.map((error) => `Vista ${view?.id || "sin id"}: ${error}`));
      } else if (!Number.isFinite(view?.canvas?.aspectRatio) || view.canvas.aspectRatio <= 0) errors.push(`Vista ${view?.id || "sin id"}: aspectRatio inválido.`);
      if (view?.printSurfaceId) {
        if (view.printAreas || view.canvas) errors.push(`Vista ${view.id}: no debe duplicar geometría de PrintSurface.`);
      } else if (!Array.isArray(view?.printAreas) || view.printAreas.length === 0) {
        errors.push(`Vista ${view?.id || "sin id"}: necesita al menos un print area.`);
      } else {
        view.printAreas.forEach((printArea) => errors.push(...validatePrintArea(printArea, view.id)));
      }
    });
  }
  if (!Array.isArray(template.mockups)) errors.push("mockups debe ser un array.");
  if (!("threeD" in template)) errors.push("Falta threeD.");
  else if (template.threeD !== null && (typeof template.threeD !== "object" || typeof template.threeD.profileId !== "string" || !template.threeD.profileId.trim())) errors.push("threeD.profileId debe ser un identificador registrado.");

  return { valid: errors.length === 0, errors };
}

export function assertValidProductTemplate(template) {
  const result = validateProductTemplate(template);
  if (!result.valid) {
    const error = new Error(`ProductTemplate inválido: ${result.errors.join(" ")}`);
    error.validationErrors = result.errors;
    throw error;
  }
  return template;
}
