/* eslint-disable react-refresh/only-export-components */
import { Badge } from "../ui/badge";

const ORDER_STATUSES = {
  created: { label: "Pedido recibido", variant: "secondary" },
  processing: { label: "En preparación", variant: "warning" },
  shipped: { label: "Enviado", variant: "default" },
  delivered: { label: "Entregado", variant: "success" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

const PAYMENT_STATUSES = {
  pending: { label: "Pendiente de pago", variant: "warning" },
  paid: { label: "Pagado", variant: "success" },
  failed: { label: "Fallido", variant: "destructive" },
  refunded: { label: "Reembolsado", variant: "secondary" },
};

const PAYMENT_METHODS = {
  bizum: "Bizum",
  bank_transfer: "Transferencia bancaria",
  transfer: "Transferencia",
  manual: "Pago manual",
  cash: "Efectivo",
  card: "Tarjeta",
  paypal: "PayPal",
  monei: "MONEI",
};

export function getPaymentStatus(order) { return order?.payment?.status || order?.paymentStatus || "pending"; }
export function getPaymentMethod(order) { return order?.payment?.method || order?.paymentMethod || null; }
export function paymentMethodLabel(method) { return PAYMENT_METHODS[method] || method || "No indicado"; }

export function formatOrderDate(value) {
  if (!value) return "Fecha no disponible";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export function OrderStatusBadge({ status }) {
  const presentation = ORDER_STATUSES[status] || { label: status || "Sin estado", variant: "outline" };
  return <Badge variant={presentation.variant}>{presentation.label}</Badge>;
}

export function PaymentStatusBadge({ status }) {
  const presentation = PAYMENT_STATUSES[status] || { label: status || "Sin estado", variant: "outline" };
  return <Badge variant={presentation.variant}>{presentation.label}</Badge>;
}
