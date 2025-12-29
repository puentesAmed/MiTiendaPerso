import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    guestId: { type: String},
    guestEmail: { type: String},
    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        name: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true, min: 0 },
        selectedVariant: {
          size: { type: String, default: null },
          color: { type: String, default: null },
        },
        customizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Customization" },

        // NUEVO: info de personalización
       /* customization: {
          enabled: { type: Boolean, default: false },
          areaCode: { type: String },       // ej: "front", "back"
          imageUrl: { type: String },       // ruta/URL de la imagen subida
          text: { type: String },           // texto que quiere el cliente
          notes: { type: String },          // instrucciones adicionales
          widthMm: { type: Number },        // tamaño solicitado
          heightMm: { type: Number },
        },*/

      },
    ],
    total: { type: Number, required: true, min: 0 },

    // Estado logístico del pedido
    status: {
      type: String,
      enum: ["created", "processing", "shipped", "delivered", "cancelled"],
      default: "created",
    },

    // Gestión de pago
    payment: {
      method: {
        type: String,
        enum: ["card", "paypal", "monei", null],
        default: null,
      },
      status: {
        type: String,
        enum: ["pending", "paid", "failed", "refunded"],
        default: "pending",
      },
      paidAt: {
        type: Date,
        default: null,
      },
      transactionId: {
        type: String,
        default: null,
      },
    },

    // Información logística y de entrega
    shipping: {
      zone: {
        type: String,
        enum: ["peninsula", "islands", "international"],
        required: true,
      },

      price: {
        type: Number,
        required: true,
        min: 0,
      },

      isFree: {
        type: Boolean,
        default: false,
      },

      estimatedDays: {
        min: { type: Number, required: true },
        max: { type: Number, required: true },
      },

      // 🆕 Fecha estimada calculada automáticamente
      estimatedDeliveryDate: {
        type: Date,
        required: true,
      },

      // 🆕 Fecha confirmada manualmente por admin
      confirmedDeliveryDate: {
        type: Date,
        default: null,
      },

      // 🆕 Estado de la entrega
      deliveryStatus: {
        type: String,
        enum: ["estimated", "confirmed", "delayed"],
        default: "estimated",
      },
    },



    shippingAddress: { type: addressSchema, required: true },
    billingAddress: { type: addressSchema, required: false },

    notes: { type: String },

  },
  { timestamps: true }
);

export const Order = mongoose.model("Order", orderSchema);
