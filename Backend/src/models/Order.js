import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        name: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true, min: 0 },

        // NUEVO: info de personalización
        customization: {
          enabled: { type: Boolean, default: false },
          areaCode: { type: String },       // ej: "front", "back"
          imageUrl: { type: String },       // ruta/URL de la imagen subida
          text: { type: String },           // texto que quiere el cliente
          notes: { type: String },          // instrucciones adicionales
          widthMm: { type: Number },        // tamaño solicitado
          heightMm: { type: Number },
        },

      },
    ],
    total: { type: Number, required: true, min: 0 },

    // Estado logístico del pedido
    status: {
      type: String,
      enum: ["pending", "shipped", "delivered", "cancelled"],
      default: "pending",
    },

    // Gestión de pago
    paymentMethod: {
      type: String,
      enum: ["card", "paypal", "cod"], // cod = contra reembolso
      default: "card",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },

    paidAt: { type: Date },

    // Si quieres dirección más adelante, la dejas opcional:
    shippingAddress: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      postalCode: { type: String },
      country: { type: String },
    },
  },
  { timestamps: true }
);

export const Order = mongoose.model("Order", orderSchema);
