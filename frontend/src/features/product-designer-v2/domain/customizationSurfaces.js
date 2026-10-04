import { getProductTemplateById } from "../templates/templateRepository.js";
import { getProductEligibleTemplateIds } from "../templates/templateCatalog.js";

export function getCommercialSurfaces(product) {
  const pricing = product?.customizationPricing;
  if (!pricing?.enabled || !Array.isArray(pricing.surfaces)) return [];
  return pricing.surfaces.filter((surface) => surface?.enabled && Number.isFinite(surface.priceModifier));
}

export function getProductCustomizationState(product) {
  const surfaces = getCommercialSurfaces(product);
  const selectedSurfaceIds = surfaces.filter((surface) => surface.required).map((surface) => surface.surfaceId);
  return {
    surfaces,
    personalizationConfigured: surfaces.length > 0,
    selectedSurfaceIds,
    singleRequiredSurface: surfaces.length === 1 && surfaces[0].required,
  };
}

export function canPersonalizeProduct({ customizationState, canAddToCart, isAliExpress, customizationQuote, quoteLoading }) {
  return Boolean(canAddToCart && !isAliExpress && customizationState.personalizationConfigured && customizationQuote && !quoteLoading);
}

export function normalizeSelectedSurfaceIds(surfaces, selectedSurfaceIds) {
  if (!Array.isArray(selectedSurfaceIds) || selectedSurfaceIds.length === 0) {
    throw new Error("Selecciona al menos una superficie.");
  }
  const selected = new Set(selectedSurfaceIds);
  if (selected.size !== selectedSurfaceIds.length || [...selected].some((id) => typeof id !== "string" || !id)) {
    throw new Error("La selección de superficies no es válida.");
  }
  const available = new Set(surfaces.map((surface) => surface.surfaceId));
  if ([...selected].some((id) => !available.has(id))) throw new Error("La superficie seleccionada no está disponible.");
  if (surfaces.some((surface) => surface.required && !selected.has(surface.surfaceId))) {
    throw new Error("Falta una superficie obligatoria.");
  }
  return surfaces.filter((surface) => selected.has(surface.surfaceId)).map((surface) => surface.surfaceId);
}

export function filterTemplateBySelectedSurfaceIds(template, selectedSurfaceIds) {
  if (selectedSurfaceIds == null) return template;
  const selected = new Set(selectedSurfaceIds);
  if (!Array.isArray(selectedSurfaceIds) || selected.size === 0 || selected.size !== selectedSurfaceIds.length) {
    throw new Error("La selección de superficies no es válida.");
  }
  const printSurfaces = template.printSurfaces.filter((surface) => selected.has(surface.id));
  if (printSurfaces.length !== selected.size) throw new Error("La selección contiene una superficie ajena al template.");
  const selectedIds = new Set(printSurfaces.map((surface) => surface.id));
  return {
    ...template,
    printSurfaces,
    views: template.views.filter((view) => selectedIds.has(view.printSurfaceId)),
  };
}

export function getTemplateSurfaceOptions(templateId) {
  const template = getProductTemplateById(templateId);
  return (template?.printSurfaces || []).map((surface) => ({ surfaceId: surface.id, label: surface.label }));
}

export function getCommercialTemplateOptions() {
  return getProductEligibleTemplateIds().map((templateId) => {
    const template = getProductTemplateById(templateId);
    return { templateId, label: template?.label || templateId };
  });
}
