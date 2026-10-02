import { getPaymentSettings } from "./payment-settings.service.js";

const methodKey = (method) => method === "bank_transfer" ? "bankTransfer" : method;

export class ManualPaymentError extends Error {
  constructor(message) {
    super(message);
    this.name = "ManualPaymentError";
    this.status = 400;
  }
}

export async function assertManualPaymentMethod(method) {
  const settings = await getPaymentSettings();
  const definition = settings[methodKey(method)];
  if (!definition?.enabled) {
    throw new ManualPaymentError("Método de pago no soportado");
  }
  return definition;
}

export async function getEnabledManualPaymentMethods() {
  const settings = await getPaymentSettings();
  return [
    ["bizum", settings.bizum],
    ["bank_transfer", settings.bankTransfer],
  ].filter(([, definition]) => definition.enabled)
    .map(([id, definition]) => ({ id, label: definition.label }));
}

export async function buildManualPaymentInstructions(order) {
  const method = order.payment?.method;
  const definition = order.payment?.instructionsSnapshot || await assertManualPaymentMethod(method);

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
      recipient: definition.recipient,
      instructions: definition.instructions,
    };
  }

  return {
    ...common,
    accountHolder: definition.accountHolder,
    iban: definition.iban,
    instructions: definition.instructions,
  };
}
