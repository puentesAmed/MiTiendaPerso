import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { calculateCartTotals, cartFeedbackReducer, INITIAL_CART_FEEDBACK, scheduleCartPulseExpiry } from "./cartFeedback.js";

test("carrito vacío inicial no anima y el badge deriva del itemCount real", () => {
  assert.equal(INITIAL_CART_FEEDBACK.active, false);
  assert.deepEqual(calculateCartTotals([]), { totalItems: 0, totalAmount: 0 });
  assert.deepEqual(calculateCartTotals([
    { quantity: 2, presentation: { displayPrice: 12.5 } },
    { quantity: 1, presentation: { displayPrice: 5 } },
  ]), { totalItems: 3, totalAmount: 30 });
});

test("alta activa el pulso y el timeout de la generación vigente lo termina", () => {
  let state = cartFeedbackReducer(INITIAL_CART_FEEDBACK, { type: "item-added" });
  let callback;
  const timerId = scheduleCartPulseExpiry(state.generation, (generation) => {
    state = cartFeedbackReducer(state, { type: "pulse-expired", generation });
  }, (scheduled, delay) => {
    assert.equal(delay, 1000);
    callback = scheduled;
    return 7;
  });
  assert.equal(timerId, 7);
  assert.equal(state.active, true);
  callback();
  assert.equal(state.active, false);
});

test("segundo add reinicia la generación e ignora el timeout anterior", () => {
  const first = cartFeedbackReducer(INITIAL_CART_FEEDBACK, { type: "item-added" });
  const second = cartFeedbackReducer(first, { type: "item-added" });
  const staleExpiry = cartFeedbackReducer(second, { type: "pulse-expired", generation: first.generation });
  assert.equal(staleExpiry.active, true);
  assert.equal(staleExpiry.generation, 2);
  assert.equal(cartFeedbackReducer(staleExpiry, { type: "pulse-expired", generation: second.generation }).active, false);
});

test("clearCart durante el pulso lo apaga inmediatamente y cubre finalización de pedido", () => {
  const active = cartFeedbackReducer(INITIAL_CART_FEEDBACK, { type: "item-added" });
  assert.equal(cartFeedbackReducer(active, { type: "cart-empty" }).active, false);
  const cartContext = readFileSync(new URL("./CartContext.jsx", import.meta.url), "utf8");
  const checkout = readFileSync(new URL("../pages/Checkout/Checkout.jsx", import.meta.url), "utf8");
  assert.match(cartContext, /const clearCart[\s\S]*dispatchCartFeedback\(\{ type: "cart-empty" \}\)/);
  assert.match(checkout, /if \(!data\.ok\)[\s\S]*clearCart\(\)/);
});

test("header no deriva animación de itemCount ni conserva listener global", () => {
  const header = readFileSync(new URL("../components/shell/SiteHeader.jsx", import.meta.url), "utf8");
  const flyToCart = readFileSync(new URL("../utils/cartAnimation.js", import.meta.url), "utf8");
  assert.match(header, /cartPulse/);
  assert.match(header, /totalItems > 0/);
  assert.doesNotMatch(header, /cart:item-added|onAnimationEnd/);
  assert.doesNotMatch(header, /totalItems > 0[^\n]*animate-/);
  assert.match(flyToCart, /image\.animate/);
  assert.doesNotMatch(flyToCart, /cart:item-added/);
});
