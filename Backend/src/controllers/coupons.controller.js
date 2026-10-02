import { Coupon } from "../models/Coupon.js";
import { resolveAuthoritativeOrderLines } from "../services/order-calculation.service.js";
import { validateCoupon } from "../services/coupon.service.js";

export async function validateCouponForCart(req, res) {
  try {
    const { subtotal } = await resolveAuthoritativeOrderLines(req.body.items);
    const coupon = await validateCoupon({
      code: req.body.code,
      subtotal,
      userId: req.userId || null,
      guestEmail: req.body.email,
    });
    return res.json({ ok: true, subtotal, coupon });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({ ok: false, message: error.message });
  }
}

export async function adminListCoupons(_req, res) {
  return res.json({ ok: true, coupons: await Coupon.find().sort({ createdAt: -1 }).lean() });
}

export async function adminCreateCoupon(req, res) {
  try {
    const coupon = await Coupon.create(req.body);
    return res.status(201).json({ ok: true, coupon });
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.code === 11000 ? "El código ya existe" : error.message });
  }
}

export async function adminUpdateCoupon(req, res) {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!coupon) return res.status(404).json({ ok: false, message: "Cupón no encontrado" });
    return res.json({ ok: true, coupon });
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message });
  }
}

export async function adminDeleteCoupon(req, res) {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) return res.status(404).json({ ok: false, message: "Cupón no encontrado" });
  return res.json({ ok: true });
}
