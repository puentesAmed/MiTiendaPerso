import mongoose from "mongoose";

const estimatedDaysSchema = new mongoose.Schema({
  min: { type: Number, required: true, min: 0 },
  max: { type: Number, required: true, min: 0 },
}, { _id: false });

const bandSchema = new mongoose.Schema({
  minKm: { type: Number, required: true, min: 0 },
  maxKm: { type: Number, required: true, min: 0 },
  amount: { type: Number, required: true, min: 0 },
  estimatedDays: { type: estimatedDaysSchema, default: null },
}, { _id: false });

const shippingSettingsSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: "default", immutable: true },
  version: { type: Number, default: 1, min: 1 },
  localUrgent: {
    enabled: { type: Boolean, default: false },
    label: { type: String, default: "Envío urgente local", trim: true },
    originAddress: { type: String, default: "", trim: true },
    maxDistanceKm: { type: Number, default: null, min: 0 },
    postalCodes: [{ type: String, trim: true }],
    provinces: [{ type: String, trim: true }],
    municipalities: [{ type: String, trim: true }],
    bands: { type: [bandSchema], default: [] },
    freeFrom: { type: Number, default: null, min: 0 },
  },
  parcelStandard: {
    enabled: { type: Boolean, default: false },
    configured: { type: Boolean, default: false },
    label: { type: String, default: "Envío por paquetería", trim: true },
    serviceLevel: { type: String, default: "standard", trim: true },
  },
}, { timestamps: true });

export const ShippingSettings = mongoose.model("ShippingSettings", shippingSettingsSchema);
