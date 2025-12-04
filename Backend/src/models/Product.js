/*import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    price: { type: Number, required: true, min: 0 },
    image: { type: String },
    stock: { type: Number, required: true, min: 0 },
    active: { type: Boolean, default: true },
    category: { type: String, trim: true },

    customizable: { type: Boolean, default: false },
    customizationAreas: [
      {
        name: { type: String, required: true },          // ej: "Pecho", "Espalda", "Frontal"
        code: { type: String, required: true },          // ej: "front", "back", "left_sleeve"
        maxWidthMm: { type: Number, required: true },    // ancho máximo en mm
        maxHeightMm: { type: Number, required: true },   // alto máximo en mm
        notes: { type: String },                         // texto informativo para el usuario
      },
    ],



  },
  { timestamps: true },
);

export const Product = mongoose.model('Product', productSchema);
*/

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
    stock: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    category: { type: String },

    // NUEVO: personalización
    customizable: { type: Boolean, default: false },
    customizationAreas: [customizationAreaSchema],
    customizationType: { type: String, enum: ["tshirt", "hoodie", "mug"], default: "tshirt" },
  },
  { timestamps: true }
);

export const Product = mongoose.model("Product", productSchema);
