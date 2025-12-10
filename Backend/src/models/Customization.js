// src/models/Customization.js
import mongoose from "mongoose";

const ElementSchema = new mongoose.Schema({
  id: String,
  type: String, // "text" | "image"
  text: String,
  url: String,
  x: Number,
  y: Number,
  fontSize: Number,
  fontFamily: String,
  fill: String,
  rotation: Number,
  scaleX: Number,
  scaleY: Number,
});

const CustomizationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },

    design: {
      elementsBySide: {
        front: [ElementSchema],
        back: [ElementSchema],
      },
      notes: { type: String, default: "" },
      side: { type: String, default: "front" },
    },

    // Imagen PNG en base64 → SIEMPRE debe ser un string
    previewImage: { type: String, default: null },

    // Mockups en URL → string simples
    mockupFront: { type: String, default: null },
    mockupBack: { type: String, default: null },

    // ZIP generado por el backend
    zipUrl: { type: String, default: null },

    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },

    status: {
      type: String,
      enum: ["pending", "in-production", "completed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export const Customization = mongoose.model("Customization", CustomizationSchema);
