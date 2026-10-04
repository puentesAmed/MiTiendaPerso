import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import { Coupon } from "../src/models/Coupon.js";
import { PaymentSettings } from "../src/models/PaymentSettings.js";
import { ShippingSettings } from "../src/models/ShippingSettings.js";
import { env } from "../src/config/env.js";

await connectDB();
await PaymentSettings.updateOne({ key: "default" }, { $setOnInsert: {
  key: "default",
  bizum: { enabled: env.MANUAL_PAYMENTS.bizum.enabled, label: "Bizum", recipient: env.MANUAL_PAYMENTS.bizum.recipient || "", instructions: env.MANUAL_PAYMENTS.bizum.instructions || "" },
  bankTransfer: { enabled: env.MANUAL_PAYMENTS.bankTransfer.enabled, label: "Transferencia bancaria", accountHolder: env.MANUAL_PAYMENTS.bankTransfer.accountHolder || "", iban: env.MANUAL_PAYMENTS.bankTransfer.iban || "", instructions: env.MANUAL_PAYMENTS.bankTransfer.instructions || "" },
} }, { upsert: true });
await ShippingSettings.updateOne({ key: "default" }, { $setOnInsert: {
  key: "default",
  version: 1,
  pickupFree: { enabled: false, label: "Recogida gratuita", pickupAddress: "", instructions: "", availabilityText: "" },
  localUrgent: { enabled: false, label: "Envío urgente local", originAddress: "", maxDistanceKm: null, postalCodes: [], provinces: [], municipalities: [], bands: [], freeFrom: null },
  parcelStandard: { enabled: false, configured: false, label: "Envío por paquetería", serviceLevel: "standard" },
} }, { upsert: true });
await Coupon.updateOne({ code: "PRIMER10" }, { $setOnInsert: { code: "PRIMER10", enabled: true, percentOff: 10, firstOrderOnly: true } }, { upsert: true });
console.log("Configuración comercial inicializada de forma idempotente.");
await mongoose.disconnect();
