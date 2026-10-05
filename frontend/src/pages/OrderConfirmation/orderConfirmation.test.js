import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { displayOrderNumber } from "../../utils/orderNumber.js";

test("referencia comercial visible y fallback histórico estable", () => {
  assert.equal(displayOrderNumber({ orderNumber: "MLG-261005-042", _id: "6ac300000000000000000001" }), "MLG-261005-042");
  assert.equal(displayOrderNumber({ _id: "6ac300000000000000000001" }), "LEGACY-00000001");
});

test("confirmación web muestra número comercial y remite instrucciones sensibles al email", () => {
  const confirmation = readFileSync(new URL("./OrderConfirmation.jsx", import.meta.url), "utf8");
  const checkout = readFileSync(new URL("../Checkout/Checkout.jsx", import.meta.url), "utf8");
  assert.match(confirmation, /Pedido: <strong[^>]*>\{orderNumber\}/);
  assert.match(confirmation, /Te hemos enviado las instrucciones de pago por email\./);
  assert.match(confirmation, /Usa la referencia de pedido indicada en el correo\./);
  assert.doesNotMatch(confirmation, /paymentInstructions|Destinatario Bizum|\bIBAN\b|accountHolder|recipient|#\{orderId\}/);
  assert.doesNotMatch(checkout, /paymentInstructions: data\.paymentInstructions/);
});

test("admin puede buscar orderNumber y las vistas de pedido lo muestran", () => {
  const admin = readFileSync(new URL("../Admin/Admin.jsx", import.meta.url), "utf8");
  assert.match(admin, /\[order\.orderNumber, order\._id,/);
  for (const page of ["../MyOrders/MyOrders.jsx", "../OrderDetail/OrderDetail.jsx", "../OrderTracking/OrderTracking.jsx"]) {
    assert.match(readFileSync(new URL(page, import.meta.url), "utf8"), /displayOrderNumber\(order\)/);
  }
});
