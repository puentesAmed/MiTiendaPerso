import { distanceShippingConfig, zoneShippingRules } from "../config/shipping.config.js";
import { resolveShippingZone } from "../utils/shippingZones.js";
import { roundCurrency } from "./order-calculation.service.js";

const cache = new Map();

export class ShippingCalculationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ShippingCalculationError";
    this.status = 400;
  }
}

function assertInput(authoritativeSubtotal, shippingAddress) {
  const fields = ["fullName", "street", "city", "state", "postalCode", "country"];
  if (!fields.every((field) => String(shippingAddress?.[field] || "").trim()) || !Number.isFinite(authoritativeSubtotal)) {
    throw new ShippingCalculationError("Datos insuficientes para calcular el envío");
  }
}

function quoteFromRule(rule, authoritativeSubtotal, extras) {
  const isFree = Boolean(rule.freeFrom && authoritativeSubtotal >= rule.freeFrom);
  return {
    price: roundCurrency(isFree ? 0 : rule.basePrice),
    isFree,
    freeFrom: rule.freeFrom ?? null,
    estimatedDays: { ...rule.estimatedDays },
    currency: "EUR",
    ...extras,
  };
}

function addressKey(address) {
  return [address.street, address.postalCode, address.city, address.state, address.country]
    .map((value) => String(value || "").trim().toLowerCase()).join("|");
}

async function geocode(address, config) {
  const query = encodeURIComponent([address.street, address.postalCode, address.city, address.state, address.country].join(", "));
  if (config.orsApiKey) {
    const response = await fetch(`https://api.openrouteservice.org/geocode/search?api_key=${encodeURIComponent(config.orsApiKey)}&text=${query}&size=1`);
    if (response.ok) {
      const feature = (await response.json()).features?.[0];
      if (feature) return { lon: feature.geometry.coordinates[0], lat: feature.geometry.coordinates[1] };
    }
  }
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${query}`, { headers: { "User-Agent": "MiTiendaPerso/1.0" } });
  if (!response.ok) throw new Error("Geocodificación no disponible");
  const result = (await response.json())[0];
  if (!result) throw new Error("Dirección no localizada");
  return { lon: Number(result.lon), lat: Number(result.lat) };
}

async function routeDistanceKm(destination, config) {
  if (!config.orsApiKey) throw new Error("Proveedor de rutas no configurado");
  const response = await fetch("https://api.openrouteservice.org/v2/directions/driving-car/geojson", {
    method: "POST",
    headers: { Authorization: config.orsApiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ coordinates: [[config.origin.lon, config.origin.lat], [destination.lon, destination.lat]] }),
  });
  if (!response.ok) throw new Error("Cálculo de ruta no disponible");
  return (await response.json()).features[0].properties.summary.distance / 1000;
}

async function cachedDistance(address, config) {
  const key = addressKey(address);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.createdAt < config.cacheTtlMs) return hit.distanceKm;
  const destination = await geocode(address, config);
  const distanceKm = await routeDistanceKm(destination, config);
  cache.set(key, { distanceKm, createdAt: Date.now() });
  return distanceKm;
}

export async function calculateShippingQuote({ authoritativeSubtotal, shippingAddress }, options = {}) {
  assertInput(authoritativeSubtotal, shippingAddress);
  const zone = resolveShippingZone(shippingAddress);
  const config = options.distanceConfig || distanceShippingConfig;
  if (config.enabled && zone === "peninsula") {
    try {
      const distanceKm = options.distanceProvider
        ? await options.distanceProvider(shippingAddress)
        : await cachedDistance(shippingAddress, config);
      const band = config.bands.find((candidate) => distanceKm <= Number(candidate.maxKm));
      if (band) return quoteFromRule(band, authoritativeSubtotal, { zone, distanceKm: roundCurrency(distanceKm), source: "distance" });
    } catch (error) {
      console.warn("Cálculo de envío por distancia no disponible; usando zona:", error.message);
    }
  }
  return quoteFromRule(zoneShippingRules[zone], authoritativeSubtotal, { zone, source: config.enabled ? "zone-fallback" : "zone" });
}

export function clearShippingDistanceCache() {
  cache.clear();
}
