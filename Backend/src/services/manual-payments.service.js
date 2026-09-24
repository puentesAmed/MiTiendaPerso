import { env } from "../config/env.js";

export const ACTIVE_MANUAL_PAYMENT_METHODS = new Set([
  "bizum",
  "bank_transfer",
]);

export class ManualPaymentError extends Error {
  constructor(message) {
    super(message);
    this.name = "ManualPaymentError";
    this.status = 400;
  }
}

export function assertManualPaymentMethod(method) {
  if (!ACTIVE_MANUAL_PAYMENT_METHODS.has(method)) {
    throw new ManualPaymentError("Método de pago no soportado");
  }
}

export function buildManualPaymentInstructions(order) {
  const method = order.payment?.method;
  assertManualPaymentMethod(method);

  const common = {
    method,
    status: order.payment.status,
    amount: order.total,
    currency: "EUR",
    reference: `PEDIDO-${order._id}`,
  };

  if (method === "bizum") {
    return {
      ...common,
      recipient: env.MANUAL_PAYMENTS.bizum.recipient,
      instructions: env.MANUAL_PAYMENTS.bizum.instructions,
    };
  }

  return {
    ...common,
    accountHolder: env.MANUAL_PAYMENTS.bankTransfer.accountHolder,
    iban: env.MANUAL_PAYMENTS.bankTransfer.iban,
    instructions: env.MANUAL_PAYMENTS.bankTransfer.instructions,
  };
}
