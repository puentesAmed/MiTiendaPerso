import { getCommercialTemplateOptions, getTemplateSurfaceOptions } from "../../features/product-designer-v2/domain/customizationSurfaces.js";

export { getCommercialTemplateOptions };

export function buildCustomizationSurfaceRows(templateId, pricing = null, currentRows = []) {
  const configured = new Map((pricing?.surfaces || currentRows).map((surface) => [surface.surfaceId, surface]));
  return getTemplateSurfaceOptions(templateId).map((option) => {
    const value = configured.get(option.surfaceId);
    return {
      ...option,
      enabled: Boolean(value?.enabled),
      required: Boolean(value?.required),
      priceModifier: value?.priceModifier == null ? "" : String(value.priceModifier),
    };
  });
}

export function buildCustomizationPricingPayload({ customizable, productTemplateId, customizationSurfaces }) {
  if (!customizable || !productTemplateId) return null;
  return {
    enabled: true,
    surfaces: customizationSurfaces.map((surface) => ({
      surfaceId: surface.surfaceId,
      enabled: Boolean(surface.enabled),
      required: Boolean(surface.enabled && surface.required),
      priceModifier: surface.priceModifier === "" ? null : Number(surface.priceModifier),
    })),
  };
}
