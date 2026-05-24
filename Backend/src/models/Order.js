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

        provider: { type: String, enum: ["local", "aliexpress"], default: "local" },
        externalId: { type: String, default: null },     // AliExpress product_id
        providerSku: { type: String, default: null },    // AliExpress ae_sku_id (CRÍTICO)


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
        enum: ["manual", "cash", "transfer", "bizum", "card", "paypal", "monei", null],
        default: null,
      },
      provider: {
        type: String,
        default: null,
      },
      status: {
        type: String,
        enum: ["pending", "paid", "failed", "refunded"],
        default: "pending",
      },
      confirmedAt: {
        type: Date,
        default: null,
      },
      confirmedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      providerPaymentId: {
        type: String,
        default: null,
      },
      metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
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

    dropshipping: {
      sent: { type: Boolean, default: false },
      sentAt: { type: Date, default: null },
    },


    shippingAddress: { type: addressSchema, required: true },
    billingAddress: { type: addressSchema, required: false },

    notes: { type: String },

  },
  { timestamps: true }
);

export const Order = mongoose.model("Order", orderSchema);
