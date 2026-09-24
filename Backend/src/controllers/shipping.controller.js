import {
  OrderCalculationError,
  resolveAuthoritativeOrderLines,
  roundCurrency,
} from "../services/order-calculation.service.js";
import {
  calculateShippingQuote,
  ShippingCalculationError,
} from "../services/shipping.service.js";


export async function getShippingQuote(req, res) {
  try {
    const { items, shippingAddress } = req.body;

    if (!items?.length || !shippingAddress) {
      return res.status(400).json({
        ok: false,
        message: "Datos insuficientes para calcular el envío",
      });
    }

    const { subtotal } = await resolveAuthoritativeOrderLines(items);
    const quote = calculateShippingQuote({
      authoritativeSubtotal: subtotal,
      shippingAddress,
    });

    return res.json({
      ok: true,
      quote: {
        ...quote,
        subtotal,
        total: roundCurrency(subtotal + quote.price),
      },
    });

  } catch (err) {
    if (
      err instanceof OrderCalculationError ||
      err instanceof ShippingCalculationError
    ) {
      return res.status(err.status || 400).json({
        ok: false,
        message: err.message,
      });
    }
    console.error("Shipping quote error:", err);
    return res.status(500).json({
      ok: false,
      message: "Error al calcular el envío",
    });
  }
}
