import { resolveShippingZone } from "../utils/shippingZones.js";
import { roundCurrency } from "./order-calculation.service.js";

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

export class ShippingCalculationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ShippingCalculationError";
    this.status = 400;
  }
}

export function calculateShippingQuote({ authoritativeSubtotal, shippingAddress }) {
  const requiredAddressFields = [
    "fullName",
    "street",
    "city",
    "state",
    "postalCode",
    "country",
  ];
  const isComplete = requiredAddressFields.every(
    (field) => String(shippingAddress?.[field] || "").trim().length > 0
  );

  if (!isComplete || !Number.isFinite(authoritativeSubtotal)) {
    throw new ShippingCalculationError(
      "Datos insuficientes para calcular el envío"
    );
  }

  const zone = resolveShippingZone(shippingAddress);
  const rule = SHIPPING_RULES[zone];
  const isFree = Boolean(
    rule.freeFrom && authoritativeSubtotal >= rule.freeFrom
  );
  const price = isFree ? 0 : rule.basePrice;

  return {
    zone,
    price: roundCurrency(price),
    isFree,
    freeFrom: rule.freeFrom,
    estimatedDays: { ...rule.estimatedDays },
    currency: "EUR",
  };
}
