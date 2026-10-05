import { OrderSequence } from "../models/OrderSequence.js";

export async function generateOrderNumber(createdAt = new Date()) {
  const dateKey = createdAt.toISOString().slice(2, 10).replaceAll("-", "");
  await OrderSequence.init();
  const sequence = await OrderSequence.findOneAndUpdate(
    { dateKey },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return `MLG-${dateKey}-${String(sequence.seq).padStart(3, "0")}`;
}

export function displayOrderNumber(order) {
  return order.orderNumber || `LEGACY-${String(order._id).slice(-8)}`;
}
