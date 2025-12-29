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
