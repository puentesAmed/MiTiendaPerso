export const SHIPPING_REASON_LABELS = Object.freeze({
  service_disabled: "Servicio no habilitado",
  outside_coverage: "Dirección fuera de cobertura",
  rates_not_configured: "Tarifas todavía no configuradas",
  incomplete_profile: "Faltan datos logísticos de algún producto",
  provider_unavailable: "Agencia temporalmente no disponible",
  routing_unavailable: "No se pudo calcular la ruta",
  invalid_address: "No se pudo validar la dirección",
});

export function selectShippingMethodId(methods, current = "") {
  const available = (methods || []).filter((method) => method.available);
  return available.some((method) => method.methodId === current) ? current : (available[0]?.methodId || "");
}

export function buildSelectedShippingQuote(methods, pricing, methodId) {
  const method = (methods || []).find((candidate) => candidate.methodId === methodId && candidate.available);
  if (!method?.quote || !pricing) return null;
  return {
    ...method.quote,
    price: method.quote.amount,
    subtotal: pricing.subtotal,
    discountAmount: pricing.discountAmount,
    coupon: pricing.coupon,
    total: method.quote.total,
  };
}
