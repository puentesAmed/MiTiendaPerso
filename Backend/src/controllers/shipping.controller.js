import {
  OrderCalculationError,
  resolveAuthoritativeOrderLines,
  roundCurrency,
} from "../services/order-calculation.service.js";
import {
  calculateShippingQuote,
  quoteShippingMethods,
  ShippingCalculationError,
} from "../services/shipping.service.js";
import { CouponError, validateCoupon } from "../services/coupon.service.js";
import { getShippingSettings, updateShippingSettings } from "../services/shipping-settings.service.js";


export async function getShippingQuote(req, res) {
  try {
    const { items, shippingAddress, couponCode, email } = req.body;

    if (!items?.length || !shippingAddress) {
      return res.status(400).json({
        ok: false,
        message: "Datos insuficientes para calcular el envío",
      });
    }

    const { lines, subtotal } = await resolveAuthoritativeOrderLines(items);
    const coupon = await validateCoupon({ code: couponCode, subtotal, userId: req.userId || null, guestEmail: email });
    const discountedSubtotal = roundCurrency(subtotal - (coupon?.discountAmount || 0));
    const quote = await calculateShippingQuote({
      authoritativeSubtotal: discountedSubtotal,
      shippingAddress,
    });
    const { methods } = await quoteShippingMethods({ authoritativeSubtotal: discountedSubtotal, shippingAddress, lines });
    const enrichedMethods = methods.map((method) => method.available ? {
      ...method,
      quote: { ...method.quote, total: roundCurrency(discountedSubtotal + method.quote.amount) },
    } : method);

    return res.json({
      ok: true,
      methods: enrichedMethods,
      pricing: {
        subtotal,
        discountAmount: coupon?.discountAmount || 0,
        coupon: coupon ? { code: coupon.code, type: coupon.type, value: coupon.value } : null,
      },
      quote: {
        ...quote,
        subtotal,
        discountAmount: coupon?.discountAmount || 0,
        coupon: coupon ? { code: coupon.code, type: coupon.type, value: coupon.value } : null,
        total: roundCurrency(discountedSubtotal + quote.price),
      },
    });

  } catch (err) {
    if (
      err instanceof OrderCalculationError ||
      err instanceof ShippingCalculationError
      || err instanceof CouponError
    ) {
      return res.status(err.status || 400).json({
        ok: false,
        message: err.message,
        reason: err.reason || "invalid_shipping",
      });
    }
    console.error("Shipping quote error:", err);
    return res.status(500).json({
      ok: false,
      message: "Error al calcular el envío",
    });
  }
}

export async function adminGetShippingSettings(_req, res) {
  return res.json({ ok: true, settings: await getShippingSettings() });
}

export async function adminUpdateShippingSettings(req, res) {
  try {
    return res.json({ ok: true, settings: await updateShippingSettings(req.body || {}) });
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message });
  }
}
