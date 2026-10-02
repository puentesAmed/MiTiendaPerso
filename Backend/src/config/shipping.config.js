import { env } from "./env.js";

export const zoneShippingRules = Object.freeze({
  peninsula: { basePrice: 5.99, estimatedDays: { min: 2, max: 3 }, freeFrom: 60 },
  islands: { basePrice: 9.99, estimatedDays: { min: 3, max: 6 }, freeFrom: null },
  international: { basePrice: 19.99, estimatedDays: { min: 5, max: 10 }, freeFrom: null },
});

export const distanceShippingConfig = env.SHIPPING_DISTANCE;
