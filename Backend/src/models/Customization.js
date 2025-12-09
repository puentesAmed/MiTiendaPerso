import mongoose from "mongoose";

const ElementSchema = new mongoose.Schema({
  id: String,
  type: String,     // "text" | "image"
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
      notes: String,
      side: String,
    },

    previewImage: String, // PNG final generado desde Konva

    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },

    status: {
      type: String,
      enum: ["pending", "in-production", "completed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export const Customization = mongoose.model("Customization", CustomizationSchema);
