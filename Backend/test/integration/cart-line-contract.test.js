import test from "node:test";
import assert from "node:assert/strict";

import {
  addOrMergeCartLine,
  buildCartLineKey,
  buildCartStoragePayload,
  buildGuestCartSession,
  createCartLine,
  normalizeStoredCart,
  normalizeVariant,
  removeCartLine,
  toCheckoutItem,
  updateCartLineCustomization,
  updateCartLineQuantity,
} from "../../../frontend/src/utils/cartLineAdapter.js";

const product = {
  _id: "507f1f77bcf86cd799439011",
  name: "Camiseta",
  price: 20,
  image: "/camiseta.png",
  stock: 10,
  variants: { sizes: ["M", "L"], colors: ["Negro", "Blanco"] },
  customizable: false,
};

function line(overrides = {}) {
  return createCartLine({
    product,
    quantity: 1,
    variant: { size: "M", color: "Negro" },
    customization: null,
    ...overrides,
  });
}

function designer(clientId, design = { elementsBySide: { front: [], back: [] } }) {
  return { type: "designer", designVersion: 1, clientId, design };
}

test("01 misma identidad se fusiona e incrementa cantidad", () => {
  const first = line();
  const result = addOrMergeCartLine([first], line({ quantity: 2 }));
  assert.equal(result.length, 1);
  assert.equal(result[0].quantity, 3);
});

test("02 una talla distinta produce otra línea", () => {
  assert.notEqual(line().lineKey, line({ variant: { size: "L", color: "Negro" } }).lineKey);
});

test("03 un color distinto produce otra línea", () => {
  assert.notEqual(line().lineKey, line({ variant: { size: "M", color: "Blanco" } }).lineKey);
});

test("04 personalizaciones con clientId distinto no colisionan", () => {
  const customProduct = { ...product, customizable: true };
  const a = line({ product: customProduct, customization: designer("design-a") });
  const b = line({ product: customProduct, customization: designer("design-b") });
  assert.notEqual(a.lineKey, b.lineKey);
});

test("05 el orden de propiedades no cambia lineKey", () => {
  const a = buildCartLineKey({ productId: product._id, variant: { size: "M", color: "Negro" }, customization: null });
  const b = buildCartLineKey({ customization: null, variant: { color: "Negro", size: "M" }, productId: product._id });
  assert.equal(a, b);
});

test("06 updateQuantity modifica solo lineKey objetivo", () => {
  const first = line();
  const second = line({ variant: { size: "L", color: "Negro" } });
  const result = updateCartLineQuantity([first, second], second.lineKey, 4);
  assert.equal(result[0].quantity, 1);
  assert.equal(result[1].quantity, 4);
});

test("07 removeItem elimina solo lineKey objetivo", () => {
  const first = line();
  const second = line({ variant: { size: "L", color: "Negro" } });
  assert.deepEqual(removeCartLine([first, second], first.lineKey), [second]);
});

test("08 producto sin variantes usa variant null", () => {
  const simple = createCartLine({ product: { ...product, variants: { sizes: [], colors: [] } } });
  assert.equal(simple.variant, null);
  assert.match(simple.lineKey, /size=-&color=-/);
});

test("09 editar personalización conserva identidad y otra línea", () => {
  const customProduct = { ...product, customizable: true };
  const first = line({ product: customProduct, customization: designer("design-a") });
  const second = line({ product: customProduct, customization: designer("design-b") });
  const result = updateCartLineCustomization(
    [first, second],
    first.lineKey,
    designer("ignored", { elementsBySide: { front: [{ type: "text" }], back: [] } })
  );
  assert.equal(result[0].lineKey, first.lineKey);
  assert.equal(result[0].customization.clientId, "design-a");
  assert.deepEqual(result[1], second);
});

test("10 talla y color válidos producen variante canónica", () => {
  assert.deepEqual(normalizeVariant(product, { color: "Negro", size: "M" }), { size: "M", color: "Negro" });
});

test("11 dimensión requerida ausente se rechaza", () => {
  assert.throws(() => createCartLine({ product, variant: { size: "M" } }), /color/i);
});

test("12 diseñador nuevo genera clientId y la edición lo conserva con variante", () => {
  const customProduct = { ...product, customizable: true };
  const created = createCartLine({
    product: customProduct,
    variant: { size: "M", color: "Negro" },
    customization: { type: "designer", designVersion: 1, design: {} },
    createClientId: () => "generated-id",
  });
  const edited = updateCartLineCustomization([created], created.lineKey, designer("other", { edited: true }));
  assert.equal(created.customization.clientId, "generated-id");
  assert.equal(edited[0].customization.clientId, "generated-id");
  assert.deepEqual(edited[0].variant, created.variant);
});

test("13 payload autenticado v2 restaura líneas y recalcula keys", () => {
  const original = line();
  const payload = buildCartStoragePayload([{ ...original, lineKey: "manipulated" }], "2026-09-24T00:00:00.000Z");
  const restored = normalizeStoredCart(payload);
  assert.equal(payload.version, 2);
  assert.equal(restored.items[0].lineKey, original.lineKey);
});

test("14 guest v2 preserva borrador TTL e identidad", () => {
  const session = buildGuestCartSession(
    { guestId: "guest-1", checkoutDraft: { email: "guest@test.com" }, expiresAt: "future" },
    [line()],
    { guestId: "new-guest", updatedAt: "2026-09-24T00:00:00.000Z" }
  );
  assert.equal(session.cartVersion, 2);
  assert.equal(session.guestId, "guest-1");
  assert.deepEqual(session.checkoutDraft, { email: "guest@test.com" });
  assert.equal(session.expiresAt, "future");
});

test("15 carrito v1 selectedVariant se normaliza", () => {
  const result = normalizeStoredCart({ items: [{ productId: product._id, quantity: 1, selectedVariant: { size: "M", color: "Negro" }, name: "Camiseta", price: 20 }] });
  assert.deepEqual(result.items[0].variant, { size: "M", color: "Negro" });
});

test("16 talla y color legacy en customization se recuperan", () => {
  const result = normalizeStoredCart({ items: [{ productId: product._id, quantity: 1, customization: { talla: "M", color: "Negro" } }] });
  assert.deepEqual(result.items[0].variant, { size: "M", color: "Negro" });
  assert.equal(result.items[0].customization, null);
});

test("17 línea legacy inválida se omite sin borrar las válidas", () => {
  const result = normalizeStoredCart({ items: [{ quantity: 1 }, { productId: product._id, quantity: 1 }] });
  assert.equal(result.items.length, 1);
  assert.equal(result.omittedCount, 1);
});

test("18 DTO de checkout contiene solo contrato mínimo", () => {
  const item = toCheckoutItem(line());
  assert.deepEqual(Object.keys(item), ["productId", "quantity", "variant", "customization"]);
  assert.equal(Object.hasOwn(item, "presentation"), false);
  assert.equal(Object.hasOwn(item, "lineKey"), false);
});
