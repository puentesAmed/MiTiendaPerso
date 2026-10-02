import mongoose from "mongoose";

const methodSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  label: { type: String, required: true, trim: true },
  instructions: { type: String, default: "", trim: true },
  recipient: { type: String, default: "", trim: true },
  accountHolder: { type: String, default: "", trim: true },
  iban: { type: String, default: "", trim: true },
}, { _id: false });

const paymentSettingsSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: "default", immutable: true },
  bizum: { type: methodSchema, required: true },
  bankTransfer: { type: methodSchema, required: true },
}, { timestamps: true });

export const PaymentSettings = mongoose.model("PaymentSettings", paymentSettingsSchema);
