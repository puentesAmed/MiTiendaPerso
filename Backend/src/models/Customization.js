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
    schemaVersion: { type: Number, enum: [1, 2], default: undefined },
    clientDocumentId: { type: String, default: null, index: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    guestId: {
      type: String,
    },


    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    orderItemId: { type: mongoose.Schema.Types.ObjectId, default: null },
    productSnapshot: {
      name: { type: String, default: null },
      sku: { type: String, default: null },
      productTemplateId: { type: String, default: null },
      templateRevision: { type: Number, default: null },
    },
    variant: {
      size: { type: String, default: null },
      color: { type: String, default: null },
    },
    quantity: { type: Number, min: 1, default: null },
    designDocument: { type: mongoose.Schema.Types.Mixed, default: null },
    productionSurfaces: [{
      _id: false,
      viewId: { type: String, required: true },
      surfaceId: { type: String, required: true },
      label: { type: String, required: true },
      artwork: {
        storageKey: { type: String, required: true },
        filename: { type: String, required: true },
        mimeType: { type: String, enum: ["image/png"], required: true },
        widthPx: { type: Number, required: true },
        heightPx: { type: Number, required: true },
      },
      preview: {
        storageKey: { type: String, default: null },
        filename: { type: String, default: null },
        mimeType: { type: String, default: null },
        widthPx: { type: Number, default: null },
        heightPx: { type: Number, default: null },
      },
    }],
    productionBundle: {
      zipStorageKey: { type: String, default: null },
      manifestStorageKey: { type: String, default: null },
      generatedAt: { type: Date, default: null },
      version: { type: Number, default: null },
    },
    productionStatus: {
      type: String,
      enum: ["pending", "ready", "in_production", "completed", "issue"],
      default: undefined,
    },
    productionStatusUpdatedAt: { type: Date, default: null },
    productionStatusUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    productionError: { type: String, default: null },

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
      enum: ["pending", "in-production", "completed", "reviewing", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export const Customization = mongoose.model(
  "Customization",
  CustomizationSchema
);
