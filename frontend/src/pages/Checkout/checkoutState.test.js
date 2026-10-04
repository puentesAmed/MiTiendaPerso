import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { canSubmitOrder, isCustomerDataValid, normalizeCouponCode, validateCustomerData } from "./checkoutState.js";

const customer = { fullName: "Cliente Test", email: "cliente@test.com", phone: "+34 600 123 123" };
const validState = {
  items: [{ productId: "p1" }],
  linesValid: true,
  customerValid: true,
  shippingMethodValid: true,
  deliveryAddressValid: true,
  paymentMethodValid: true,
  termsAccepted: true,
  quoteReady: true,
  busy: false,
};

test("datos de contacto exigen nombre, email y teléfono razonable", () => {
  assert.equal(isCustomerDataValid(customer), true);
  assert.equal(isCustomerDataValid({ ...customer, fullName: " " }), false);
  assert.match(validateCustomerData({ ...customer, email: "incorrecto" }).email, /email válido/);
  assert.match(validateCustomerData({ ...customer, phone: "12" }).phone, /teléfono válido/);
});

test("canSubmitOrder bloquea términos, cliente, dirección condicional y estados pendientes", () => {
  assert.equal(canSubmitOrder(validState), true);
  for (const field of ["linesValid", "customerValid", "shippingMethodValid", "deliveryAddressValid", "paymentMethodValid", "termsAccepted", "quoteReady"]) {
    assert.equal(canSubmitOrder({ ...validState, [field]: false }), false, field);
  }
  assert.equal(canSubmitOrder({ ...validState, busy: true }), false);
  assert.equal(canSubmitOrder({ ...validState, items: [] }), false);
});

test("cupón se normaliza sin alterar el contrato backend", () => {
  assert.equal(normalizeCouponCode("  ahorro10 "), "AHORRO10");
  assert.equal(normalizeCouponCode(" "), "");
});

test("Checkout muestra contacto siempre, dirección condicional, cupón compacto y usa el gate único", () => {
  const source = readFileSync(new URL("./Checkout.jsx", import.meta.url), "utf8");
  assert.match(source, /Datos de contacto/);
  assert.match(source, /customer-full-name/);
  assert.match(source, /customer-email/);
  assert.match(source, /customer-phone/);
  assert.match(source, /shippingMethodId !== "pickup-free"/);
  assert.match(source, /¿Tienes un cupón\?/);
  assert.match(source, /Añadir código/);
  assert.match(source, /disabled=\{!canSubmit\}/);
  assert.match(source, /termsAccepted: acceptedTerms/);
  assert.doesNotMatch(source, /onChange=\{\(\) => setShippingAddress/);
});
