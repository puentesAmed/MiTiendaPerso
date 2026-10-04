// models/Product.js
import mongoose from "mongoose";

const customizationAreaSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },   // Ej: "Pecho", "Espalda"
    code: { type: String, required: true },   // Ej: "front", "back"
    maxWidthMm: { type: Number, required: true },
    maxHeightMm: { type: Number, required: true },
    notes: { type: String },
  },
  { _id: false }
);

const shippingProfileSchema = new mongoose.Schema({
  weightGrams: { type: Number, default: null, min: 0 },
  package: {
    lengthCm: { type: Number, default: null, min: 0 },
    widthCm: { type: Number, default: null, min: 0 },
    heightCm: { type: Number, default: null, min: 0 },
  },
  fragile: { type: Boolean, default: null },
  stackable: { type: Boolean, default: null },
  shippingClass: { type: String, default: null, trim: true },
}, { _id: false });

const fulfillmentProfileSchema = new mongoose.Schema({
  preparationRequired: { type: Boolean, required: true },
  preparationMinDays: {
    type: Number,
    default: null,
    validate: { validator: (value) => value == null || (Number.isInteger(value) && value >= 0), message: "preparationMinDays inválido" },
  },
  preparationMaxDays: {
    type: Number,
    default: null,
    validate: { validator: (value) => value == null || (Number.isInteger(value) && value >= 0), message: "preparationMaxDays inválido" },
  },
}, { _id: false });

fulfillmentProfileSchema.pre("validate", function validateRange(next) {
  const hasMin = this.preparationMinDays != null;
  const hasMax = this.preparationMaxDays != null;
  if (hasMin !== hasMax || (hasMin && this.preparationMaxDays < this.preparationMinDays)) {
    this.invalidate("preparationMaxDays", "El plazo de preparación debe incluir un rango válido");
  }
  next();
});

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    image: { type: String },
    images: [{ type: String }],
    stock: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    category: { type: String },
    variants: {
      sizes: [{ type: String }],
      colors: [{ type: String }],
    },



    // NUEVO: personalización
    customizable: { type: Boolean, default: false },
    productTemplateId: { type: String, default: null, trim: true },
    customizationAreas: [customizationAreaSchema],
    customizationType: { type: String, enum: ["tshirt", "hoodie", "mug"], default: "tshirt" },
    shippingProfile: { type: shippingProfileSchema, default: null },
    fulfillmentProfile: { type: fulfillmentProfileSchema, default: null },
  },
  { timestamps: true }
);

export const Product = mongoose.model("Product", productSchema);
