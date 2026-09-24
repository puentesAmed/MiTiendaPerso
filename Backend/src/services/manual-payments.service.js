import { env } from "../config/env.js";

const MANUAL_PAYMENT_METHODS = {
  bizum: {
    label: "Bizum",
    isEnabled: () => env.MANUAL_PAYMENTS.bizum.enabled,
  },
  bank_transfer: {
    label: "Transferencia bancaria",
    isEnabled: () => env.MANUAL_PAYMENTS.bankTransfer.enabled,
  },
};

export class ManualPaymentError extends Error {
  constructor(message) {
    super(message);
    this.name = "ManualPaymentError";
    this.status = 400;
  }
}

export function assertManualPaymentMethod(method) {
  if (!MANUAL_PAYMENT_METHODS[method]?.isEnabled()) {
    throw new ManualPaymentError("Método de pago no soportado");
  }
}

export function getEnabledManualPaymentMethods() {
  return Object.entries(MANUAL_PAYMENT_METHODS)
    .filter(([, definition]) => definition.isEnabled())
    .map(([id, definition]) => ({ id, label: definition.label }));
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
