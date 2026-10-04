import { distanceShippingConfig, zoneShippingRules } from "../config/shipping.config.js";
import { quoteParcelWithProvider } from "../integrations/shipping/parcel-provider.adapter.js";
import { resolveShippingZone } from "../utils/shippingZones.js";
import { getShippingSettings } from "./shipping-settings.service.js";
import { planPackaging } from "./packaging-planner.service.js";
import { roundCurrency } from "./order-calculation.service.js";

export const SHIPPING_METHOD_IDS = Object.freeze({ LOCAL_URGENT: "local-urgent", PARCEL_STANDARD: "parcel-standard" });
const routeCache = new Map();

export class ShippingCalculationError extends Error {
  constructor(message, reason = "invalid_shipping", status = 400) {
    super(message);
    this.name = "ShippingCalculationError";
    this.reason = reason;
    this.status = status;
  }
}

export function normalizeShippingDestination(address) {
  const text = (value) => String(value || "").trim().replace(/\s+/g, " ");
  return {
    country: text(address?.country), postalCode: text(address?.postalCode).toUpperCase(),
    province: text(address?.state || address?.province), locality: text(address?.city || address?.locality),
    address: text(address?.street || address?.address), fullName: text(address?.fullName),
  };
}

function assertInput(authoritativeSubtotal, shippingAddress) {
  const destination = normalizeShippingDestination(shippingAddress);
  if (![destination.fullName, destination.address, destination.locality, destination.province, destination.postalCode, destination.country].every(Boolean)
    || !Number.isFinite(authoritativeSubtotal)) throw new ShippingCalculationError("Datos insuficientes para calcular el envío", "invalid_address");
  return destination;
}

function quoteFromRule(rule, authoritativeSubtotal, extras) {
  const isFree = Boolean(rule.freeFrom && authoritativeSubtotal >= rule.freeFrom);
  return { price: roundCurrency(isFree ? 0 : rule.basePrice), isFree, freeFrom: rule.freeFrom ?? null, estimatedDays: { ...rule.estimatedDays }, currency: "EUR", ...extras };
}

const normalizeKeyPart = (value) => String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
function destinationKey(destination) {
  return [destination.address, destination.postalCode, destination.locality, destination.province, destination.country].map(normalizeKeyPart).join("|");
}

async function geocode(query, config) {
  const raw = typeof query === "string" ? query : [query.address || query.street, query.postalCode, query.locality || query.city, query.province || query.state, query.country].filter(Boolean).join(", ");
  const encoded = encodeURIComponent(raw);
  if (config.orsApiKey) {
    const response = await fetch(`https://api.openrouteservice.org/geocode/search?api_key=${encodeURIComponent(config.orsApiKey)}&text=${encoded}&size=1`);
    if (response.ok) {
      const feature = (await response.json()).features?.[0];
      if (feature) return { lon: feature.geometry.coordinates[0], lat: feature.geometry.coordinates[1] };
    }
  }
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encoded}`, { headers: { "User-Agent": "MiTiendaPerso/1.0" } });
  if (!response.ok) throw new Error("Geocodificación no disponible");
  const result = (await response.json())[0];
  if (!result) throw new ShippingCalculationError("Dirección no localizada", "invalid_address", 422);
  return { lon: Number(result.lon), lat: Number(result.lat) };
}

async function routeDistanceKm(origin, destination, config) {
  if (!config.orsApiKey) throw new Error("Proveedor de rutas no configurado");
  const response = await fetch("https://api.openrouteservice.org/v2/directions/driving-car/geojson", {
    method: "POST", headers: { Authorization: config.orsApiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ coordinates: [[origin.lon, origin.lat], [destination.lon, destination.lat]] }),
  });
  if (!response.ok) throw new Error("Cálculo de ruta no disponible");
  return (await response.json()).features[0].properties.summary.distance / 1000;
}

async function cachedLegacyDistance(address, config) {
  const destination = normalizeShippingDestination(address);
  const key = `legacy:${config.origin.lon},${config.origin.lat}|${destinationKey(destination)}`;
  const hit = routeCache.get(key);
  if (hit && Date.now() - hit.createdAt < config.cacheTtlMs) return hit.distanceKm;
  const coordinates = await geocode(destination, config);
  const distanceKm = await routeDistanceKm(config.origin, coordinates, config);
  routeCache.set(key, { distanceKm, createdAt: Date.now() });
  return distanceKm;
}

async function cachedLocalDistance(originAddress, destination, config) {
  if (!config.orsApiKey) throw new Error("Proveedor de rutas no configurado");
  const key = `local:${normalizeKeyPart(originAddress)}|${destinationKey(destination)}`;
  const hit = routeCache.get(key);
  if (hit && Date.now() - hit.createdAt < config.cacheTtlMs) return hit.distanceKm;
  const [origin, target] = await Promise.all([geocode(originAddress, config), geocode(destination, config)]);
  const distanceKm = await routeDistanceKm(origin, target, config);
  routeCache.set(key, { distanceKm, createdAt: Date.now() });
  return distanceKm;
}

async function cachedProvidedDistance(originAddress, destination, provider, ttlMs) {
  const key = `local:${normalizeKeyPart(originAddress)}|${destinationKey(destination)}`;
  const hit = routeCache.get(key);
  if (hit && Date.now() - hit.createdAt < ttlMs) return hit.distanceKm;
  const distanceKm = await provider({ originAddress, destination });
  routeCache.set(key, { distanceKm, createdAt: Date.now() });
  return distanceKm;
}

function coverageMatch(local, destination) {
  const groups = [[local.postalCodes, destination.postalCode], [local.provinces, destination.province], [local.municipalities, destination.locality]]
    .filter(([values]) => Array.isArray(values) && values.length);
  if (!groups.length) return { declared: false, matches: true };
  return { declared: true, matches: groups.some(([values, current]) => values.some((value) => normalizeKeyPart(value) === normalizeKeyPart(current))) };
}

async function quoteLocalUrgent({ authoritativeSubtotal, destination, settings, options }) {
  const local = settings.localUrgent;
  const base = { methodId: SHIPPING_METHOD_IDS.LOCAL_URGENT, type: "LOCAL_URGENT", label: local.label, enabled: Boolean(local.enabled), serviceLevel: "urgent" };
  if (!local.enabled) return { ...base, available: false, reason: "service_disabled" };
  const coverage = coverageMatch(local, destination);
  if (!coverage.matches) return { ...base, available: false, reason: "outside_coverage" };
  let distanceKm;
  try {
    distanceKm = options.distanceProvider
      ? await cachedProvidedDistance(local.originAddress, destination, options.distanceProvider, options.cacheTtlMs || distanceShippingConfig.cacheTtlMs)
      : await cachedLocalDistance(local.originAddress, destination, options.distanceConfig || distanceShippingConfig);
  } catch (error) {
    if (error instanceof ShippingCalculationError && error.reason === "invalid_address") return { ...base, available: false, reason: "invalid_address" };
    if (coverage.declared) {
      const zone = resolveShippingZone({ state: destination.province, country: destination.country });
      const fallback = quoteFromRule(zoneShippingRules[zone], authoritativeSubtotal, {});
      return { ...base, available: true, reason: null, quote: { amount: fallback.price, currency: fallback.currency, estimatedDays: fallback.estimatedDays, isFree: fallback.isFree, freeFrom: fallback.freeFrom, quoteSource: "zone_fallback", distanceKm: null, zone } };
    }
    return { ...base, available: false, reason: "routing_unavailable" };
  }
  if (!Number.isFinite(distanceKm) || distanceKm < 0) return { ...base, available: false, reason: "routing_unavailable" };
  if (distanceKm > local.maxDistanceKm) return { ...base, available: false, reason: "outside_coverage", distanceKm: roundCurrency(distanceKm) };
  const band = local.bands.find((candidate, index) => {
    const isLastBand = index === local.bands.length - 1;
    return distanceKm >= candidate.minKm
      && (distanceKm < candidate.maxKm || (isLastBand && distanceKm <= candidate.maxKm));
  });
  if (!band) return { ...base, available: false, reason: "outside_coverage", distanceKm: roundCurrency(distanceKm) };
  const isFree = local.freeFrom != null && authoritativeSubtotal >= local.freeFrom;
  return { ...base, available: true, reason: null, quote: { amount: roundCurrency(isFree ? 0 : band.amount), currency: "EUR", estimatedDays: band.estimatedDays ? { ...band.estimatedDays } : null, isFree, freeFrom: local.freeFrom ?? null, quoteSource: "routing", distanceKm: roundCurrency(distanceKm), zone: "local" } };
}

async function quoteParcelStandard({ destination, lines, settings, options }) {
  const parcel = settings.parcelStandard;
  const base = { methodId: SHIPPING_METHOD_IDS.PARCEL_STANDARD, type: "PARCEL_STANDARD", label: parcel.label, enabled: Boolean(parcel.enabled), serviceLevel: parcel.serviceLevel || "standard" };
  if (!parcel.enabled) return { ...base, available: false, reason: "service_disabled" };
  if (!parcel.configured) return { ...base, available: false, reason: "rates_not_configured" };
  const plan = planPackaging(lines);
  if (plan.status !== "ready") return { ...base, available: false, reason: plan.status, incompleteItemRefs: plan.incompleteItemRefs };
  let providerQuote;
  try {
    providerQuote = await quoteParcelWithProvider({ provider: options.parcelProvider, destination, parcels: plan.parcels, serviceLevel: base.serviceLevel });
  } catch {
    return { ...base, available: false, reason: "provider_unavailable" };
  }
  if (!providerQuote || !Number.isFinite(providerQuote.amount) || providerQuote.amount < 0) return { ...base, available: false, reason: "provider_unavailable" };
  return { ...base, available: true, reason: null, quote: { amount: roundCurrency(providerQuote.amount), currency: providerQuote.currency || "EUR", estimatedDays: providerQuote.estimatedDays || null, isFree: false, freeFrom: null, quoteSource: "provider", providerId: providerQuote.providerId, serviceId: providerQuote.serviceId, parcels: plan.parcels } };
}

export async function quoteShippingMethods({ authoritativeSubtotal, shippingAddress, lines = [] }, options = {}) {
  const destination = assertInput(authoritativeSubtotal, shippingAddress);
  const settings = options.settings || await getShippingSettings();
  const [local, parcel] = await Promise.all([
    quoteLocalUrgent({ authoritativeSubtotal, destination, settings, options }),
    quoteParcelStandard({ destination, lines, settings, options }),
  ]);
  return { destination, methods: [local, parcel] };
}

export async function calculateSelectedShippingQuote(input, options = {}) {
  const { methods } = await quoteShippingMethods(input, options);
  const method = methods.find((candidate) => candidate.methodId === input.shippingMethodId);
  if (!method) throw new ShippingCalculationError("Método de envío inválido", "invalid_method");
  if (!method.available || !method.quote) throw new ShippingCalculationError("El método de envío seleccionado no está disponible", method.reason || "method_unavailable");
  return {
    methodId: method.methodId, label: method.label, type: method.type, serviceLevel: method.serviceLevel,
    price: method.quote.amount, currency: method.quote.currency, isFree: Boolean(method.quote.isFree),
    freeFrom: method.quote.freeFrom ?? null, estimatedDays: method.quote.estimatedDays,
    quoteSource: method.quote.quoteSource, distanceKm: method.quote.distanceKm ?? null,
    zone: method.quote.zone || "peninsula", providerId: method.quote.providerId || null,
    serviceId: method.quote.serviceId || null, parcels: method.quote.parcels || undefined,
  };
}

// Adapter temporal para clientes anteriores a SPEC-021A.
export async function calculateShippingQuote({ authoritativeSubtotal, shippingAddress }, options = {}) {
  assertInput(authoritativeSubtotal, shippingAddress);
  const zone = resolveShippingZone(shippingAddress);
  const config = options.distanceConfig || distanceShippingConfig;
  if (config.enabled && zone === "peninsula") {
    try {
      const distanceKm = options.distanceProvider ? await options.distanceProvider(shippingAddress) : await cachedLegacyDistance(shippingAddress, config);
      const band = config.bands.find((candidate) => distanceKm <= Number(candidate.maxKm));
      if (band) return quoteFromRule(band, authoritativeSubtotal, { zone, distanceKm: roundCurrency(distanceKm), source: "distance" });
    } catch (error) {
      console.warn("Cálculo de envío por distancia no disponible; usando zona:", error.message);
    }
  }
  return quoteFromRule(zoneShippingRules[zone], authoritativeSubtotal, { zone, source: config.enabled ? "zone-fallback" : "zone" });
}

export function clearShippingDistanceCache() { routeCache.clear(); }
