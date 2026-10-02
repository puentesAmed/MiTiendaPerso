import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  enabled: { type: Boolean, default: true },
  percentOff: { type: Number, required: true, min: 1, max: 100 },
  minimumSubtotal: { type: Number, default: 0, min: 0 },
  firstOrderOnly: { type: Boolean, default: false },
  startsAt: { type: Date, default: null },
  endsAt: { type: Date, default: null },
  maxUses: { type: Number, default: null, min: 1 },
  usageCount: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

export const Coupon = mongoose.model("Coupon", couponSchema);
