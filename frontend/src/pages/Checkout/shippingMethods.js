export const SHIPPING_REASON_LABELS = Object.freeze({
  service_disabled: "Servicio no habilitado",
  outside_coverage: "Dirección fuera de cobertura",
  rates_not_configured: "Tarifas todavía no configuradas",
  incomplete_profile: "Faltan datos logísticos de algún producto",
  provider_unavailable: "Agencia temporalmente no disponible",
  routing_unavailable: "No se pudo calcular la ruta",
  invalid_address: "No se pudo validar la dirección",
  quote_required: "Completa la dirección para cotizar",
});

export function isShippingMethodSelectable(method) {
  return Boolean(method?.available || (method?.enabled && ["invalid_address", "quote_required"].includes(method.reason)));
}

export function selectShippingMethodId(methods, current = "") {
  const selectable = (methods || []).filter(isShippingMethodSelectable);
  return selectable.some((method) => method.methodId === current) ? current : (selectable[0]?.methodId || "");
}

const normalizePart = (value) => String(value || "").trim().replace(/\s+/g, " ");

export function normalizeDeliveryAddress(address = {}) {
  const source = address || {};
  return {
    fullName: normalizePart(source.fullName),
    street: normalizePart(source.street),
    city: normalizePart(source.city),
    state: normalizePart(source.state),
    postalCode: normalizePart(source.postalCode).toUpperCase(),
    country: normalizePart(source.country),
  };
}

export function isDeliveryAddressReady(address) {
  const normalized = normalizeDeliveryAddress(address);
  return normalized.street.length >= 5
    && /^[A-Z0-9][A-Z0-9 -]{2,9}$/.test(normalized.postalCode)
    && normalized.city.length >= 2
    && normalized.state.length >= 2
    && normalized.country.length >= 2;
}

export function buildShippingQuoteRequestKey({ items, address, methodId, couponCode, email }) {
  const normalizedAddress = normalizeDeliveryAddress(address);
  return JSON.stringify({
    items: (items || []).map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      variant: item.variant || null,
      customization: item.customization ? {
        clientId: item.customization.clientId || null,
        schemaVersion: item.customization.schemaVersion || null,
        productId: item.customization.productId || null,
        selectedSurfaceIds: item.customization.selectedSurfaceIds || item.customization.designDocument?.selectedSurfaceIds || null,
        documentId: item.customization.designDocument?.documentId || null,
        updatedAt: item.customization.designDocument?.metadata?.updatedAt || null,
      } : null,
    })),
    address: methodId && methodId !== "pickup-free" ? {
      street: normalizedAddress.street,
      city: normalizedAddress.city,
      state: normalizedAddress.state,
      postalCode: normalizedAddress.postalCode,
      country: normalizedAddress.country,
    } : null,
    methodId: methodId || "pickup-free",
    couponCode: normalizePart(couponCode).toUpperCase(),
    email: normalizePart(email).toLowerCase(),
  });
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
