import { createHash } from "node:crypto";
import { distanceShippingConfig, zoneShippingRules } from "../config/shipping.config.js";
import { quoteParcelWithProvider } from "../integrations/shipping/parcel-provider.adapter.js";
import { resolveShippingZone } from "../utils/shippingZones.js";
import { getShippingSettings } from "./shipping-settings.service.js";
import { planPackaging } from "./packaging-planner.service.js";
import { roundCurrency } from "./order-calculation.service.js";

export const SHIPPING_METHOD_IDS = Object.freeze({
  PICKUP_FREE: "pickup-free",
  LOCAL_URGENT: "local-urgent",
  PARCEL_STANDARD: "parcel-standard",
});
const routeCache = new Map();

class OrsStageError extends Error {
  constructor(reason, stage, message, status = null, options = {}) {
    super(message);
    this.name = "OrsStageError";
    this.reason = reason;
    this.stage = stage;
    this.status = status;
    this.addressInvalid = Boolean(options.addressInvalid);
  }
}

const isDevelopment = () => process.env.NODE_ENV === "development";
function logOrs(message, metadata = {}, level = "info") {
  if (!isDevelopment()) return;
  const logger = level === "error" ? console.warn : console.info;
  logger(`[shipping][ors] ${message}`, metadata);
}

export function resolveOrsEndpoints(config = {}) {
  const configuredBaseUrl = String(config.orsBaseUrl || "https://api.openrouteservice.org").trim().replace(/\/+$/, "");
  let apiRoot = configuredBaseUrl.replace(/\/v2$/i, "");
  try {
    const parsed = new URL(apiRoot);
    if (parsed.hostname === "api.heigit.org" && parsed.pathname.replace(/\/+$/, "") === "/openrouteservice") {
      apiRoot = "https://api.openrouteservice.org";
    }
  } catch {
    // fetch devolverá un error sanitizado para una base inválida.
  }
  return {
    geocoding: `${apiRoot}/geocode/search`,
    routing: `${apiRoot}/v2/directions/driving-car/geojson`,
  };
}

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
  if (!isShippingDestinationComplete(destination)
    || !Number.isFinite(authoritativeSubtotal)) throw new ShippingCalculationError("Datos insuficientes para calcular el envío", "invalid_address");
  return destination;
}

export function isShippingDestinationComplete(address) {
  const destination = normalizeShippingDestination(address);
  return [destination.address, destination.locality, destination.province, destination.postalCode, destination.country].every(Boolean);
}

function quoteFromRule(rule, authoritativeSubtotal, extras) {
  const isFree = Boolean(rule.freeFrom && authoritativeSubtotal >= rule.freeFrom);
  return { price: roundCurrency(isFree ? 0 : rule.basePrice), isFree, freeFrom: rule.freeFrom ?? null, estimatedDays: { ...rule.estimatedDays }, currency: "EUR", ...extras };
}

const normalizeKeyPart = (value) => String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
function destinationKey(destination) {
  return [destination.address, destination.postalCode, destination.locality, destination.province, destination.country].map(normalizeKeyPart).join("|");
}

function coordinatesFromFeature(feature) {
  const lon = Number(feature?.geometry?.coordinates?.[0]);
  const lat = Number(feature?.geometry?.coordinates?.[1]);
  return Number.isFinite(lon) && Number.isFinite(lat) ? { lon, lat } : null;
}

async function geocode(query, config, stage) {
  const raw = typeof query === "string" ? query : [query.address || query.street, query.postalCode, query.locality || query.city, query.province || query.state, query.country].filter(Boolean).join(", ");
  const encoded = encodeURIComponent(raw);
  const endpoint = resolveOrsEndpoints(config).geocoding;
  let orsError = null;
  logOrs(`geocoding ${stage}...`);
  if (config.orsApiKey) {
    try {
      const response = await fetch(`${endpoint}?api_key=${encodeURIComponent(config.orsApiKey)}&text=${encoded}&size=1`);
      if (response.ok) {
        const coordinates = coordinatesFromFeature((await response.json()).features?.[0]);
        if (coordinates) {
          logOrs(`${stage} coordinates resolved`);
          return coordinates;
        }
        orsError = new OrsStageError(`${stage}_geocoding_failed`, stage, "ORS geocoding returned no valid coordinates", response.status, { addressInvalid: true });
      } else {
        orsError = new OrsStageError(`${stage}_geocoding_failed`, stage, `ORS geocoding responded HTTP ${response.status}`, response.status);
      }
    } catch {
      orsError = new OrsStageError(`${stage}_geocoding_failed`, stage, "ORS geocoding request failed");
    }
  }
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encoded}`, { headers: { "User-Agent": "MiTiendaPerso/1.0" } });
    if (!response.ok) throw new Error("Nominatim unavailable");
    const result = (await response.json())[0];
    const coordinates = result ? { lon: Number(result.lon), lat: Number(result.lat) } : null;
    if (coordinates && Number.isFinite(coordinates.lon) && Number.isFinite(coordinates.lat)) {
      logOrs(`${stage} coordinates resolved`, { provider: "nominatim" });
      return coordinates;
    }
    throw new OrsStageError(`${stage}_geocoding_failed`, stage, "Address geocoding returned no valid coordinates", orsError?.status, { addressInvalid: true });
  } catch (error) {
    if (error instanceof OrsStageError) throw error;
    throw orsError || new OrsStageError(`${stage}_geocoding_failed`, stage, "Address geocoding request failed");
  }
}

async function routeDistanceKm(origin, destination, config) {
  if (!config.orsApiKey) throw new OrsStageError("ors_not_configured", "config", "ORS API key is not configured");
  logOrs("routing...");
  let response;
  try {
    response = await fetch(resolveOrsEndpoints(config).routing, {
      method: "POST", headers: { Authorization: config.orsApiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ coordinates: [[origin.lon, origin.lat], [destination.lon, destination.lat]] }),
    });
  } catch {
    throw new OrsStageError("routing_failed", "routing", "ORS routing request failed");
  }
  if (!response.ok) throw new OrsStageError("routing_failed", "routing", `ORS routing responded HTTP ${response.status}`, response.status);
  let distanceKm;
  try {
    distanceKm = Number((await response.json()).features?.[0]?.properties?.summary?.distance) / 1000;
  } catch {
    throw new OrsStageError("routing_invalid_response", "routing", "ORS routing returned invalid JSON", response.status);
  }
  if (!Number.isFinite(distanceKm) || distanceKm < 0) throw new OrsStageError("routing_invalid_response", "routing", "ORS routing returned no valid distance", response.status);
  logOrs(`distanceKm=${distanceKm}`);
  return distanceKm;
}

function routingConfigKey(config) {
  const keyFingerprint = createHash("sha256").update(String(config.orsApiKey || "")).digest("hex").slice(0, 12);
  return `${resolveOrsEndpoints(config).routing}|${keyFingerprint}`;
}

async function cachedLegacyDistance(address, config) {
  const destination = normalizeShippingDestination(address);
  const key = `legacy:${routingConfigKey(config)}|${config.origin.lon},${config.origin.lat}|${destinationKey(destination)}`;
  const hit = routeCache.get(key);
  if (hit && Date.now() - hit.createdAt < config.cacheTtlMs) return hit.distanceKm;
  const coordinates = await geocode(destination, config, "destination");
  const distanceKm = await routeDistanceKm(config.origin, coordinates, config);
  routeCache.set(key, { distanceKm, createdAt: Date.now() });
  return distanceKm;
}

async function cachedLocalDistance(originAddress, destination, config) {
  if (!config.orsApiKey) throw new OrsStageError("ors_not_configured", "config", "ORS API key is not configured");
  const key = `local:${routingConfigKey(config)}|${normalizeKeyPart(originAddress)}|${destinationKey(destination)}`;
  const hit = routeCache.get(key);
  if (hit && Date.now() - hit.createdAt < config.cacheTtlMs) return hit.distanceKm;
  const origin = await geocode(originAddress, config, "origin");
  const target = await geocode(destination, config, "destination");
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

function quotePickupFree(settings) {
  const pickup = settings.pickupFree || { enabled: false, label: "Recogida gratuita", pickupAddress: "", instructions: "", availabilityText: "" };
  const base = { methodId: SHIPPING_METHOD_IDS.PICKUP_FREE, type: "PICKUP_FREE", label: pickup.label, enabled: Boolean(pickup.enabled), serviceLevel: "pickup" };
  if (!pickup.enabled) return { ...base, available: false, reason: "service_disabled" };
  return {
    ...base,
    available: true,
    reason: null,
    quote: {
      amount: 0,
      currency: "EUR",
      estimatedDays: null,
      isFree: true,
      freeFrom: null,
      quoteSource: "pickup",
      pickupAddress: pickup.pickupAddress,
      instructions: pickup.instructions,
      availabilityText: pickup.availabilityText,
    },
  };
}

function deferredAddressMethod(settings, methodId) {
  if (methodId === SHIPPING_METHOD_IDS.LOCAL_URGENT) {
    const local = settings.localUrgent;
    const base = { methodId, type: "LOCAL_URGENT", label: local.label, enabled: Boolean(local.enabled), serviceLevel: "urgent" };
    return local.enabled ? { ...base, available: false, reason: "quote_required" } : { ...base, available: false, reason: "service_disabled" };
  }
  const parcel = settings.parcelStandard;
  const base = { methodId, type: "PARCEL_STANDARD", label: parcel.label, enabled: Boolean(parcel.enabled), serviceLevel: parcel.serviceLevel || "standard" };
  if (!parcel.enabled) return { ...base, available: false, reason: "service_disabled" };
  return parcel.configured ? { ...base, available: false, reason: "quote_required" } : { ...base, available: false, reason: "rates_not_configured" };
}

async function quoteLocalUrgent({ authoritativeSubtotal, destination, settings, options }) {
  const local = settings.localUrgent;
  const base = { methodId: SHIPPING_METHOD_IDS.LOCAL_URGENT, type: "LOCAL_URGENT", label: local.label, enabled: Boolean(local.enabled), serviceLevel: "urgent" };
  if (!local.enabled) return { ...base, available: false, reason: "service_disabled" };
  if (!isShippingDestinationComplete(destination)) return { ...base, available: false, reason: "invalid_address" };
  const coverage = coverageMatch(local, destination);
  if (!coverage.matches) return { ...base, available: false, reason: "outside_coverage" };
  let distanceKm;
  try {
    distanceKm = options.distanceProvider
      ? await cachedProvidedDistance(local.originAddress, destination, options.distanceProvider, options.cacheTtlMs || distanceShippingConfig.cacheTtlMs)
      : await cachedLocalDistance(local.originAddress, destination, options.distanceConfig || distanceShippingConfig);
  } catch (error) {
    const fallbackReason = error instanceof OrsStageError ? error.reason : "routing_failed";
    logOrs(`ORS FAILED → ${fallbackReason} → ${coverage.declared ? "zone_fallback" : "routing_unavailable"}`, {
      stage: error instanceof OrsStageError ? error.stage : "routing",
      status: error instanceof OrsStageError ? error.status : null,
      message: error instanceof OrsStageError ? error.message : "Shipping routing failed",
    }, "error");
    if ((error instanceof ShippingCalculationError && error.reason === "invalid_address") || error?.addressInvalid) {
      return { ...base, available: false, reason: "invalid_address", ...(process.env.NODE_ENV !== "production" ? { fallbackReason } : {}) };
    }
    if (coverage.declared) {
      const zone = resolveShippingZone({ state: destination.province, country: destination.country });
      const fallback = quoteFromRule(zoneShippingRules[zone], authoritativeSubtotal, {});
      return { ...base, available: true, reason: null, quote: { amount: fallback.price, currency: fallback.currency, estimatedDays: fallback.estimatedDays, isFree: fallback.isFree, freeFrom: fallback.freeFrom, quoteSource: "zone_fallback", distanceKm: null, zone, ...(process.env.NODE_ENV !== "production" ? { fallbackReason } : {}) } };
    }
    return { ...base, available: false, reason: "routing_unavailable", ...(process.env.NODE_ENV !== "production" ? { fallbackReason } : {}) };
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
  return { ...base, available: true, reason: null, quote: { amount: roundCurrency(isFree ? 0 : band.amount), currency: "EUR", estimatedDays: band.estimatedDays ? { ...band.estimatedDays } : null, isFree, freeFrom: local.freeFrom ?? null, quoteSource: "routing", distanceKm: roundCurrency(distanceKm), band: { minKm: band.minKm, maxKm: band.maxKm }, zone: "local" } };
}

async function quoteParcelStandard({ destination, lines, settings, options }) {
  const parcel = settings.parcelStandard;
  const base = { methodId: SHIPPING_METHOD_IDS.PARCEL_STANDARD, type: "PARCEL_STANDARD", label: parcel.label, enabled: Boolean(parcel.enabled), serviceLevel: parcel.serviceLevel || "standard" };
  if (!parcel.enabled) return { ...base, available: false, reason: "service_disabled" };
  if (!parcel.configured) return { ...base, available: false, reason: "rates_not_configured" };
  if (!isShippingDestinationComplete(destination)) return { ...base, available: false, reason: "invalid_address" };
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
  if (!Number.isFinite(authoritativeSubtotal)) throw new ShippingCalculationError("Subtotal inválido", "invalid_shipping");
  const destination = normalizeShippingDestination(shippingAddress);
  const settings = options.settings || await getShippingSettings();
  const requestedMethodId = options.requestedMethodId || null;
  const [local, parcel] = await Promise.all([
    !requestedMethodId || requestedMethodId === SHIPPING_METHOD_IDS.LOCAL_URGENT
      ? quoteLocalUrgent({ authoritativeSubtotal, destination, settings, options })
      : deferredAddressMethod(settings, SHIPPING_METHOD_IDS.LOCAL_URGENT),
    !requestedMethodId || requestedMethodId === SHIPPING_METHOD_IDS.PARCEL_STANDARD
      ? quoteParcelStandard({ destination, lines, settings, options })
      : deferredAddressMethod(settings, SHIPPING_METHOD_IDS.PARCEL_STANDARD),
  ]);
  return { destination, methods: [quotePickupFree(settings), local, parcel] };
}

export async function calculateSelectedShippingQuote(input, options = {}) {
  if (input.shippingMethodId === SHIPPING_METHOD_IDS.PICKUP_FREE) {
    const settings = options.settings || await getShippingSettings();
    const method = quotePickupFree(settings);
    if (!method.available || !method.quote) throw new ShippingCalculationError("El método de envío seleccionado no está disponible", method.reason || "method_unavailable");
    return {
      methodId: method.methodId, label: method.label, type: method.type, serviceLevel: method.serviceLevel,
      price: method.quote.amount, currency: method.quote.currency, isFree: true, freeFrom: null,
      estimatedDays: null, quoteSource: method.quote.quoteSource, distanceKm: null, band: null,
      normalizedDestination: null, zone: null, pickupAddress: method.quote.pickupAddress || null,
      instructions: method.quote.instructions || null, availabilityText: method.quote.availabilityText || null,
      providerId: null, serviceId: null, parcels: undefined,
    };
  }
  const { methods, destination } = await quoteShippingMethods(input, { ...options, requestedMethodId: input.shippingMethodId });
  const method = methods.find((candidate) => candidate.methodId === input.shippingMethodId);
  if (!method) throw new ShippingCalculationError("Método de envío inválido", "invalid_method");
  if (!method.available || !method.quote) throw new ShippingCalculationError("El método de envío seleccionado no está disponible", method.reason || "method_unavailable");
  return {
    methodId: method.methodId, label: method.label, type: method.type, serviceLevel: method.serviceLevel,
    price: method.quote.amount, currency: method.quote.currency, isFree: Boolean(method.quote.isFree),
    freeFrom: method.quote.freeFrom ?? null, estimatedDays: method.quote.estimatedDays,
    quoteSource: method.quote.quoteSource, distanceKm: method.quote.distanceKm ?? null,
    band: method.quote.band || null, normalizedDestination: method.type === "LOCAL_URGENT" ? destination : null,
    zone: method.quote.zone || null, pickupAddress: method.quote.pickupAddress || null,
    instructions: method.quote.instructions || null, availabilityText: method.quote.availabilityText || null,
    providerId: method.quote.providerId || null,
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
