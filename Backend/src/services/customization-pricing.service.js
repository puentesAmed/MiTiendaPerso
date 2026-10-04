import { getProductionTemplate } from "../production/template-catalog.js";

const roundCurrency = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

export class CustomizationPricingError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "CustomizationPricingError";
    this.status = status;
  }
}

function templateSurfaceMap(productTemplateId) {
  const template = getProductionTemplate(productTemplateId);
  if (!template) throw new CustomizationPricingError("El producto no tiene un template personalizable válido");
  return new Map(template.surfaces.map((surface) => [surface.surfaceId, surface]));
}

export function normalizeCustomizationPricing(input, productTemplateId) {
  if (input == null) return null;
  if (typeof input !== "object" || Array.isArray(input)) throw new CustomizationPricingError("Configuración de personalización inválida");
  if (typeof input.enabled !== "boolean") throw new CustomizationPricingError("enabled debe ser booleano");
  const available = templateSurfaceMap(productTemplateId);
  if (!Array.isArray(input.surfaces)) throw new CustomizationPricingError("Las superficies de personalización deben ser un array");
  const seen = new Set();
  const surfaces = input.surfaces.map((surface) => {
    const surfaceId = typeof surface?.surfaceId === "string" ? surface.surfaceId.trim() : "";
    if (!available.has(surfaceId)) throw new CustomizationPricingError(`Superficie no válida: ${surfaceId || "sin id"}`);
    if (seen.has(surfaceId)) throw new CustomizationPricingError(`Superficie duplicada: ${surfaceId}`);
    seen.add(surfaceId);
    if (typeof surface.enabled !== "boolean" || typeof surface.required !== "boolean") throw new CustomizationPricingError(`enabled/required inválidos para: ${surfaceId}`);
    const priceModifier = surface.priceModifier == null ? null : surface.priceModifier;
    if (priceModifier != null && (typeof priceModifier !== "number" || !Number.isFinite(priceModifier) || priceModifier < 0)) {
      throw new CustomizationPricingError(`Modificador inválido para: ${surfaceId}`);
    }
    const enabled = surface.enabled;
    const required = surface.required;
    if (required && (!enabled || priceModifier == null)) throw new CustomizationPricingError(`La superficie obligatoria debe estar disponible y tener precio: ${surfaceId}`);
    return { surfaceId, enabled, required, priceModifier };
  });
  return { enabled: input.enabled, surfaces };
}

export function getPublicCustomizationPricing(product) {
  if (!product?.customizable || !product.customizationPricing?.enabled || !product.productTemplateId) return null;
  const available = templateSurfaceMap(product.productTemplateId);
  const surfaces = (product.customizationPricing.surfaces || [])
    .filter((surface) => surface.enabled && Number.isFinite(surface.priceModifier) && available.has(surface.surfaceId))
    .map((surface) => ({ surfaceId: surface.surfaceId, label: available.get(surface.surfaceId).label, enabled: true, required: Boolean(surface.required), priceModifier: surface.priceModifier }));
  return surfaces.length ? { enabled: true, surfaces } : null;
}

export function resolveCustomizationQuote(product, selectedSurfaceIds) {
  const pricing = getPublicCustomizationPricing(product);
  if (!pricing) throw new CustomizationPricingError("La personalización por superficies todavía no está configurada", 409);
  if (!Array.isArray(selectedSurfaceIds) || selectedSurfaceIds.length === 0) throw new CustomizationPricingError("Selecciona al menos una superficie");
  if (selectedSurfaceIds.some((surfaceId) => typeof surfaceId !== "string" || !surfaceId)) throw new CustomizationPricingError("Selección de superficies inválida");
  if (new Set(selectedSurfaceIds).size !== selectedSurfaceIds.length) throw new CustomizationPricingError("La selección contiene superficies duplicadas");
  const configured = new Map(pricing.surfaces.map((surface) => [surface.surfaceId, surface]));
  for (const surfaceId of selectedSurfaceIds) {
    if (!configured.has(surfaceId)) throw new CustomizationPricingError(`Superficie no disponible: ${surfaceId}`);
  }
  for (const surface of pricing.surfaces) {
    if (surface.required && !selectedSurfaceIds.includes(surface.surfaceId)) throw new CustomizationPricingError(`Falta la superficie obligatoria: ${surface.label}`);
  }
  const selectedSurfaces = pricing.surfaces.filter((surface) => selectedSurfaceIds.includes(surface.surfaceId));
  const basePrice = roundCurrency(Number(product.price));
  const customizationAmount = roundCurrency(selectedSurfaces.reduce((total, surface) => total + surface.priceModifier, 0));
  return {
    basePrice,
    customizationAmount,
    unitPrice: roundCurrency(basePrice + customizationAmount),
    currency: "EUR",
    selectedSurfaceIds: selectedSurfaces.map((surface) => surface.surfaceId),
    selectedSurfaces: selectedSurfaces.map(({ surfaceId, label, required, priceModifier }) => ({ surfaceId, label, required, priceModifier })),
  };
}
