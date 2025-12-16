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

/**
 * 🔥 MODELO DEFINITIVO DE PERSONALIZACIÓN
 * Compatible con:
 * - Editor Konva
 * - Preview HD
 * - Preview 360
 * - ZIP profesional
 */
const CustomizationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    // 🎨 Diseño editable
    design: {
      elementsBySide: {
        front: [ElementSchema],
        back: [ElementSchema],
      },
      notes: { type: String, default: "" },
      side: { type: String, default: "front" },
    },

    /**
     * 🖼 Preview HD general (opcional)
     * (por ejemplo el que se genera desde Stage.toDataURL)
     */
    previewImage: {
      type: String,
      default: null,
    },

    /**
     * 🧠 PREVIEWS FINALES POR LADO (🔥 CLAVE 🔥)
     * Estos son EXACTAMENTE los PNG que ve el cliente en el 360
     * y los que se meten en el ZIP:
     *
     * - design_front.png
     * - design_back.png
     */
    previewsBySide: {
      front: { type: String, default: null }, // base64 PNG
      back: { type: String, default: null },  // base64 PNG
    },

    // 🧥 Mockups base del producto (URLs absolutas)
    mockupFront: { type: String, default: null },
    mockupBack: { type: String, default: null },

    // 📦 ZIP generado automáticamente por backend
    zipUrl: { type: String, default: null },

    // 🔗 Relación con pedido
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },

    // 🚦 Estado del flujo de producción
    status: {
      type: String,
      enum: ["pending", "in-production", "completed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export const Customization = mongoose.model(
  "Customization",
  CustomizationSchema
);
