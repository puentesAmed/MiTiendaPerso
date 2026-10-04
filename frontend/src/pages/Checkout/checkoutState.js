const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_CHARACTERS = /^[+\d\s().-]+$/;

export function validateCustomerData(customer = {}) {
  const fullName = String(customer.fullName || "").trim();
  const email = String(customer.email || "").trim().toLowerCase();
  const phone = String(customer.phone || "").trim();
  const phoneDigits = phone.replace(/\D/g, "");
  return {
    fullName: fullName ? "" : "Introduce tu nombre y apellidos.",
    email: EMAIL_REGEX.test(email) ? "" : "Introduce un email válido, por ejemplo nombre@correo.com.",
    phone: phone && PHONE_CHARACTERS.test(phone) && phoneDigits.length >= 6 && phoneDigits.length <= 15
      ? ""
      : "Introduce un teléfono válido.",
  };
}

export function isCustomerDataValid(customer) {
  return Object.values(validateCustomerData(customer)).every((error) => !error);
}

export function normalizeCouponCode(value) {
  return String(value || "").trim().toUpperCase();
}

export function canSubmitOrder({
  items,
  linesValid,
  customerValid,
  shippingMethodValid,
  deliveryAddressValid,
  paymentMethodValid,
  termsAccepted,
  quoteReady,
  busy,
}) {
  return Boolean(
    Array.isArray(items) && items.length > 0
    && linesValid
    && customerValid
    && shippingMethodValid
    && deliveryAddressValid
    && paymentMethodValid
    && termsAccepted === true
    && quoteReady
    && !busy
  );
}
