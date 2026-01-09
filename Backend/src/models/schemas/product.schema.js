/*import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {

    externalId: {
      type: String,
      index: true,
    },

    provider: {
          type: String,
          enum: ["local", "aliexpress"],
          default: "local",
          index: true,
    },

    source: {
      type: String,
      enum: ["internal", "dropshipping"],
      default: "internal",
      index: true,
    },


    

    name: { type: String, required: true },
    description: String,

    image: String,
    images: [String],

    category: String,

    price: {
      cost: Number,
      value: Number,
      margin: Number,
      currency: String,
    },

    // 🔹 LOCAL: Number | AFFILIATE: { available: true }

    stock: {
      type: mongoose.Schema.Types.Mixed,
      default: 0, // affiliate no tiene stock real
    },



    affiliate: {
      productId: String,
      promotionLink: String,
      commissionRate: Number,
      shopName: String,
      shopId: String,
    },

    variants: [
      {
        providerSku: String,        // 👈 SKU real (ae_sku_id)
        attributes: {
          color: String,
          size: String,
        },
        price: {
          cost: Number,             // precio proveedor
          value: Number,            // precio venta
          currency: String,
        },
        stock: Number | null,       // null = desconocido
      }
    ],

    shipping: {
      originCountry: String,   // CN, ES, etc.
      deliveryMethods: [String],
      estimatedDeliveryMinDays: Number,
      estimatedDeliveryMaxDays: Number,
    },

    isDropshippable: true,


    published: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastSyncedAt: Date,
  },
  { timestamps: true }
);

export default ProductSchema;
*/

import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    externalId: {
      type: String,
      index: true,
    },

    provider: {
      type: String,
      enum: ["local", "aliexpress"],
      default: "local",
      index: true,
    },

    source: {
      type: String,
      enum: ["internal", "dropshipping"],
      default: "internal",
      index: true,
    },

    name: { type: String, required: true },
    description: String,

    image: String,
    images: [String],

    category: String,

    price: {
      cost: Number,
      value: Number,     // ⚠️ se mantiene por compatibilidad
      margin: Number,
      currency: String,
    },

    // 🔹 LOCAL: Number | ALIEXPRESS: objeto
    stock: {
      type: mongoose.Schema.Types.Mixed,
      default: 0,
    },

    affiliate: {
      productId: String,
      promotionLink: String,
      commissionRate: Number,
      shopName: String,
      shopId: String,
    },

    // ─────────────────────────────────────
    // 🔹 DROPSHIPPING (AÚN NO OBLIGATORIO)
    // ─────────────────────────────────────

    isDropshippable: {
      type: Boolean,
      default: false,
      index: true,
    },

    hasSkuData: {
      type: Boolean,
      default: false,
    },

    // Contenedor reservado (se usará luego)
    variants: {
      type: Array,
      default: undefined, // 👈 clave para no ensuciar afiliado
    },

    shipping: {
      originCountry: String,
      deliveryMethods: [String],
      estimatedDeliveryMinDays: Number,
      estimatedDeliveryMaxDays: Number,
    },

    published: {
      type: Boolean,
      default: true,
      index: true,
    },

    lastSyncedAt: Date,
  },
  { timestamps: true }
);

export default ProductSchema;
