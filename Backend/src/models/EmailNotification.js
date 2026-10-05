import mongoose from "mongoose";

const emailNotificationSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
  event: { type: String, required: true },
  recipient: { type: String, required: true, lowercase: true, trim: true },
  status: { type: String, enum: ["pending", "sent", "failed"], required: true, default: "pending" },
  attempts: { type: Number, default: 0 },
  providerMessageId: { type: String, default: null },
  idempotencyKey: { type: String, required: true },
  sentAt: { type: Date, default: null },
  lastError: { type: String, default: null },
}, { timestamps: true });

emailNotificationSchema.index({ orderId: 1, event: 1, recipient: 1 }, { unique: true });

export const EmailNotification = mongoose.model("EmailNotification", emailNotificationSchema);
