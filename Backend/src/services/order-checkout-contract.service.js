const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_CHARACTERS = /^[+\d\s().-]+$/;

export class OrderCheckoutContractError extends Error {
  constructor(message) {
    super(message);
    this.name = "OrderCheckoutContractError";
    this.status = 400;
  }
}

export function normalizeOrderCustomer(customer) {
  if (!customer || typeof customer !== "object" || Array.isArray(customer)) {
    throw new OrderCheckoutContractError("Los datos de contacto son obligatorios");
  }

  const fullName = typeof customer.fullName === "string" ? customer.fullName.trim() : "";
  const email = typeof customer.email === "string" ? customer.email.trim().toLowerCase() : "";
  const phone = typeof customer.phone === "string" ? customer.phone.trim().replace(/\s+/g, " ") : "";
  const phoneDigits = phone.replace(/\D/g, "");

  if (!fullName) throw new OrderCheckoutContractError("El nombre y apellidos son obligatorios");
  if (!EMAIL_REGEX.test(email)) throw new OrderCheckoutContractError("El email de contacto no es válido");
  if (!phone || !PHONE_CHARACTERS.test(phone) || phoneDigits.length < 6 || phoneDigits.length > 15) {
    throw new OrderCheckoutContractError("El teléfono de contacto no es válido");
  }

  return { fullName, email, phone };
}

export function assertTermsAccepted(termsAccepted) {
  if (termsAccepted !== true) {
    throw new OrderCheckoutContractError("Debes aceptar los Términos y Condiciones para continuar");
  }
}
