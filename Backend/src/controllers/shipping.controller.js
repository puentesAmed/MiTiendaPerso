import { resolveShippingZone } from "../utils/shippingZones.js";

const FREE_SHIPPING_THRESHOLD = 60;

const SHIPPING_RULES = {
  peninsula: {
    basePrice: 5.99,
    estimatedDays: { min: 2, max: 3 },
    freeFrom: FREE_SHIPPING_THRESHOLD,
  },
  islands: {
    basePrice: 9.99,
    estimatedDays: { min: 3, max: 6 },
    freeFrom: null,
  },
  international: {
    basePrice: 19.99,
    estimatedDays: { min: 5, max: 10 },
    freeFrom: null,
  },
};


export async function getShippingQuote(req, res) {
  try {
    const { items, shippingAddress } = req.body;

    if (!items?.length || !shippingAddress) {
      return res.status(400).json({
        ok: false,
        message: "Datos insuficientes para calcular el envío",
      });
    }

    const zone = resolveShippingZone(shippingAddress);

    
   


   // Calcular subtotal de productos
    const subtotal = items.reduce((acc, item) => {
        return acc + (item.price || 0) * (item.quantity || 1);
        }, 0);

        const rule = SHIPPING_RULES[zone];

        let price = rule.basePrice;
        let isFree = false;

        if (rule.freeFrom && subtotal >= rule.freeFrom) {
        price = 0;
        isFree = true;
        }

        return res.json({
        ok: true,
        quote: {
            zone,
            price,
            isFree,
            freeFrom: rule.freeFrom,
            estimatedDays: rule.estimatedDays,
            currency: "EUR",
        },
    });

  } catch (err) {
    console.error("Shipping quote error:", err);
    return res.status(500).json({
      ok: false,
      message: "Error al calcular el envío",
    });
  }
}
