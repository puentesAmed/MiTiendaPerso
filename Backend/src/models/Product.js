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
  },
  { timestamps: true }
);

export const Product = mongoose.model("Product", productSchema);
