import { ShippingSettings } from "../models/ShippingSettings.js";

let cached = null;
let cachedAt = 0;
const CACHE_TTL_MS = 30_000;

export function defaultShippingSettings() {
  return {
    key: "default",
    version: 1,
    localUrgent: {
      enabled: false,
      label: "Envío urgente local",
      originAddress: "",
      maxDistanceKm: null,
      postalCodes: [],
      provinces: [],
      municipalities: [],
      bands: [],
      freeFrom: null,
    },
    parcelStandard: {
      enabled: false,
      configured: false,
      label: "Envío por paquetería",
      serviceLevel: "standard",
    },
  };
}

const normalizeList = (values) => [...new Set((Array.isArray(values) ? values : [])
  .map((value) => String(value || "").trim())
  .filter(Boolean))];

const hasNumberInput = (value) => value != null
  && !(typeof value === "string" && value.trim() === "");
const normalizeRequiredNumber = (value) => hasNumberInput(value) ? Number(value) : Number.NaN;

export function normalizeShippingSettings(input, current = defaultShippingSettings()) {
  const localInput = input.localUrgent || {};
  const parcelInput = input.parcelStandard || {};
  const local = { ...current.localUrgent, ...localInput };
  const parcel = { ...current.parcelStandard, ...parcelInput };
  local.label = String(local.label || "").trim();
  local.originAddress = String(local.originAddress || "").trim();
  local.postalCodes = normalizeList(local.postalCodes);
  local.provinces = normalizeList(local.provinces);
  local.municipalities = normalizeList(local.municipalities);
  local.maxDistanceKm = local.maxDistanceKm == null || local.maxDistanceKm === "" ? null : Number(local.maxDistanceKm);
  local.freeFrom = local.freeFrom == null || local.freeFrom === "" ? null : Number(local.freeFrom);
  local.bands = (Array.isArray(local.bands) ? local.bands : []).map((band) => {
    const hasEstimatedMin = hasNumberInput(band.estimatedDays?.min);
    const hasEstimatedMax = hasNumberInput(band.estimatedDays?.max);
    return {
      minKm: normalizeRequiredNumber(band.minKm),
      maxKm: normalizeRequiredNumber(band.maxKm),
      amount: normalizeRequiredNumber(band.amount),
      estimatedDays: !hasEstimatedMin && !hasEstimatedMax ? null : {
        min: hasEstimatedMin ? Number(band.estimatedDays.min) : Number.NaN,
        max: hasEstimatedMax ? Number(band.estimatedDays.max) : Number.NaN,
      },
    };
  }).sort((left, right) => left.minKm - right.minKm);
  parcel.label = String(parcel.label || "").trim();
  parcel.serviceLevel = String(parcel.serviceLevel || "standard").trim();
  return { key: "default", version: Number(current.version || 1) + 1, localUrgent: local, parcelStandard: parcel };
}

export function validateShippingSettings(settings) {
  const local = settings.localUrgent;
  if (!local.label) throw new Error("LOCAL_URGENT requiere una etiqueta");
  if (local.enabled && !local.originAddress) throw new Error("LOCAL_URGENT activo requiere origen");
  if (local.enabled && (!Number.isFinite(local.maxDistanceKm) || local.maxDistanceKm <= 0)) throw new Error("LOCAL_URGENT activo requiere distancia máxima válida");
  let previousMax = 0;
  for (const [index, band] of local.bands.entries()) {
    if (![band.minKm, band.maxKm, band.amount].every(Number.isFinite)) throw new Error("Las bandas contienen valores inválidos");
    if (band.minKm < 0 || band.minKm >= band.maxKm || band.amount < 0) throw new Error("Cada banda requiere min < max y amount >= 0");
    if (index > 0 && band.minKm < previousMax) throw new Error("Las bandas no pueden solaparse");
    if (band.estimatedDays != null) {
      if (![band.estimatedDays.min, band.estimatedDays.max].every(Number.isFinite)) throw new Error("El plazo de la banda es inválido");
      if (band.estimatedDays.min < 0 || band.estimatedDays.max < band.estimatedDays.min) throw new Error("El plazo de la banda es inválido");
    }
    previousMax = band.maxKm;
  }
  if (local.enabled && !local.bands.length) throw new Error("LOCAL_URGENT activo requiere bandas");
  if (local.maxDistanceKm != null && local.bands.some((band) => band.maxKm > local.maxDistanceKm)) throw new Error("Las bandas no pueden superar la distancia máxima");
  if (local.freeFrom != null && (!Number.isFinite(local.freeFrom) || local.freeFrom < 0)) throw new Error("El umbral gratuito es inválido");
  if (!settings.parcelStandard.label) throw new Error("PARCEL_STANDARD requiere una etiqueta");
  return settings;
}

export async function getShippingSettings() {
  if (cached && Date.now() - cachedAt < CACHE_TTL_MS) return cached;
  const stored = await ShippingSettings.findOne({ key: "default" }).lean();
  cached = stored || defaultShippingSettings();
  cachedAt = Date.now();
  return cached;
}

export async function updateShippingSettings(input) {
  const next = normalizeShippingSettings(input || {}, await getShippingSettings());
  validateShippingSettings(next);
  const saved = await ShippingSettings.findOneAndUpdate(
    { key: "default" }, { $set: next },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  ).lean();
  cached = saved;
  cachedAt = Date.now();
  return saved;
}

export function clearShippingSettingsCache() {
  cached = null;
  cachedAt = 0;
}
