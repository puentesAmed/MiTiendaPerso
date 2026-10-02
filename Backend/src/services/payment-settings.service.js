import { env } from "../config/env.js";
import { PaymentSettings } from "../models/PaymentSettings.js";

let cached = null;
let cachedAt = 0;
const CACHE_TTL_MS = 30_000;

function envSettings() {
  return {
    key: "default",
    bizum: {
      enabled: env.MANUAL_PAYMENTS.bizum.enabled,
      label: "Bizum",
      recipient: env.MANUAL_PAYMENTS.bizum.recipient || "",
      instructions: env.MANUAL_PAYMENTS.bizum.instructions || "",
      accountHolder: "",
      iban: "",
    },
    bankTransfer: {
      enabled: env.MANUAL_PAYMENTS.bankTransfer.enabled,
      label: "Transferencia bancaria",
      recipient: "",
      accountHolder: env.MANUAL_PAYMENTS.bankTransfer.accountHolder || "",
      iban: env.MANUAL_PAYMENTS.bankTransfer.iban || "",
      instructions: env.MANUAL_PAYMENTS.bankTransfer.instructions || "",
    },
  };
}

function validate(settings) {
  if (settings.bizum.enabled && (!settings.bizum.recipient || !settings.bizum.instructions)) {
    throw new Error("Bizum activo requiere destinatario e instrucciones");
  }
  if (settings.bankTransfer.enabled && (!settings.bankTransfer.accountHolder || !settings.bankTransfer.iban || !settings.bankTransfer.instructions)) {
    throw new Error("La transferencia activa requiere titular, IBAN e instrucciones");
  }
}

export async function getPaymentSettings() {
  if (cached && Date.now() - cachedAt < CACHE_TTL_MS) return cached;
  const stored = await PaymentSettings.findOne({ key: "default" }).lean();
  if (!stored) return envSettings();
  cached = stored;
  cachedAt = Date.now();
  return stored;
}

export async function updatePaymentSettings(input) {
  const current = await getPaymentSettings();
  const next = {
    key: "default",
    bizum: { ...current.bizum, ...(input.bizum || {}) },
    bankTransfer: { ...current.bankTransfer, ...(input.bankTransfer || {}) },
  };
  validate(next);
  const saved = await PaymentSettings.findOneAndUpdate(
    { key: "default" },
    { $set: next },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  ).lean();
  cached = saved;
  cachedAt = Date.now();
  return saved;
}

export function clearPaymentSettingsCache() {
  cached = null;
  cachedAt = 0;
}
