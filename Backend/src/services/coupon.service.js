import { Coupon } from "../models/Coupon.js";
import { Order } from "../models/Order.js";
import { roundCurrency } from "./order-calculation.service.js";

export class CouponError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "CouponError";
    this.status = status;
  }
}

export async function validateCoupon({ code, subtotal, userId, guestEmail }) {
  const normalizedCode = String(code || "").trim().toUpperCase();
  if (!normalizedCode) return null;
  const coupon = await Coupon.findOne({ code: normalizedCode }).lean();
  const now = new Date();
  if (!coupon || !coupon.enabled) throw new CouponError("Cupón no válido");
  if (coupon.startsAt && coupon.startsAt > now) throw new CouponError("El cupón todavía no está activo");
  if (coupon.endsAt && coupon.endsAt < now) throw new CouponError("El cupón ha caducado");
  if (coupon.maxUses && coupon.usageCount >= coupon.maxUses) throw new CouponError("El cupón ha alcanzado su límite de usos");
  if (subtotal < coupon.minimumSubtotal) throw new CouponError(`El cupón requiere un subtotal mínimo de ${coupon.minimumSubtotal} €`);
  if (coupon.firstOrderOnly) {
    const identity = userId ? { userId } : { guestEmail: String(guestEmail || "").trim().toLowerCase() };
    if (!userId && !identity.guestEmail) throw new CouponError("Indica un email para validar este cupón");
    if (await Order.exists(identity)) throw new CouponError("Este cupón solo es válido para el primer pedido");
  }
  const discountAmount = roundCurrency(Math.min(subtotal, subtotal * coupon.percentOff / 100));
  return {
    couponId: coupon._id,
    code: coupon.code,
    type: "percent",
    value: coupon.percentOff,
    discountAmount,
  };
}

export async function consumeCoupon(couponId) {
  if (!couponId) return;
  const result = await Coupon.updateOne(
    { _id: couponId, enabled: true, $or: [{ maxUses: null }, { $expr: { $lt: ["$usageCount", "$maxUses"] } }] },
    { $inc: { usageCount: 1 } }
  );
  if (result.modifiedCount !== 1) throw new CouponError("El cupón ya no está disponible", 409);
}

export async function releaseCoupon(couponId) {
  if (couponId) await Coupon.updateOne({ _id: couponId, usageCount: { $gt: 0 } }, { $inc: { usageCount: -1 } });
}
