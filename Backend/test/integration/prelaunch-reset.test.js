import test, { before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { Product } from "../../src/models/Product.js";
import { Order } from "../../src/models/Order.js";
import { OrderSequence } from "../../src/models/OrderSequence.js";
import { EmailNotification } from "../../src/models/EmailNotification.js";
import { Customization } from "../../src/models/Customization.js";
import { PaymentSettings } from "../../src/models/PaymentSettings.js";
import { ShippingSettings } from "../../src/models/ShippingSettings.js";
import { User } from "../../src/models/User.js";
import { auditPrelaunchOrders, deleteOrderData, executionRequested, nextOrderNumberAfterReset, orderOwnedKeys } from "../../scripts/reset-prelaunch-orders.js";
import { setupTestDB, clearTestDB, teardownTestDB } from "../setup/test-db.js";

before(setupTestDB);
beforeEach(clearTestDB);
after(teardownTestDB);

test("la ejecución exige ambas confirmaciones exactas y el siguiente número simulado es -001", () => {
  assert.equal(executionRequested([]), false);
  assert.throws(() => executionRequested(["--execute"]), /requieren/);
  assert.throws(() => executionRequested(["--confirm=RESET_PRELAUNCH"]), /requieren/);
  assert.throws(() => executionRequested(["--execute", "--confirm=RESET_PRELAUNCHX"]), /Argumento desconocido/);
  assert.throws(() => executionRequested(["--execute", "--confirm=RESET_PRELAUNCH"]), /--database/);
  assert.throws(() => executionRequested(["--execute", "--confirm=RESET_PRELAUNCH", "--database=otra"], "test"), /no coincide/);
  assert.equal(executionRequested(["--execute", "--confirm=RESET_PRELAUNCH", "--database=test"], "test"), true);
  assert.equal(nextOrderNumberAfterReset(new Date("2026-10-05T10:00:00Z")), "MLG-261005-001");
});

test("dry-run detecta relaciones y posible stock sin mutar pedidos, configuración ni drafts", async () => {
  const product = await Product.create({ name: "Camiseta test", price: 20, stock: 17, image: "/products/keep.png" });
  const order = await Order.create({
    orderNumber: "MLG-261005-003", guestId: "test", items: [{ productId: product._id, name: "Camiseta test", quantity: 3, price: 20 }],
    total: 60, shipping: { price: 0 },
  });
  await EmailNotification.create({ orderId: order._id, event: "ORDER_RECEIVED", recipient: "test@example.com", idempotencyKey: "test" });
  const linked = await Customization.create({ productId: product._id, orderId: order._id, schemaVersion: 2,
    productionBundle: { zipStorageKey: "customizations/temporary/bundle.zip" },
    designDocument: { assets: { original: { storageKey: "shared/source.png" } } },
  });
  linked.productionBundle.zipStorageKey = `customizations/${linked._id}/bundle.zip`;
  await linked.save();
  const draft = await Customization.create({ productId: product._id, schemaVersion: 2,
    designDocument: { assets: { original: { storageKey: "shared/source.png" } } },
  });
  const orphan = await Customization.create({ productId: product._id, orderId: new mongoose.Types.ObjectId(), schemaVersion: 2 });
  await PaymentSettings.create({ bizum: { label: "Bizum" }, bankTransfer: { label: "Transferencia" } });
  await ShippingSettings.create({});
  await User.create({ name: "Admin", email: "admin@example.test", passwordHash: "test", role: "admin" });
  await OrderSequence.create({ dateKey: "261005", seq: 3 });
  const storage = { exists: async () => true };
  const audit = await auditPrelaunchOrders({ Order, EmailNotification, Customization, OrderSequence, Product }, storage);
  assert.equal(audit.orders.length, 1);
  assert.equal(audit.notifications.length, 1);
  assert.equal(audit.customizations.length, 1);
  assert.equal(audit.orphanCustomizations.length, 1);
  assert.equal(audit.stock[0].possibleQuantity, 3);
  assert.equal(audit.stock[0].verifiedReversal, null);
  assert.deepEqual(audit.files, [`customizations/${linked._id}/bundle.zip`]);
  assert.deepEqual(audit.ambiguousKeys, ["shared/source.png"]);
  assert.equal(audit.sequences[0].seq, 3);
  assert.equal(await Order.countDocuments(), 1);
  assert.equal(await EmailNotification.countDocuments(), 1);
  assert.equal(await Customization.countDocuments(), 3);
  assert.equal((await Product.findById(product._id)).stock, 17);
  assert.ok(await Customization.findById(draft._id));
  assert.ok(await Customization.findById(orphan._id));
  assert.equal(await OrderSequence.countDocuments(), 1);
  assert.equal(await PaymentSettings.countDocuments(), 1);
  assert.equal(await ShippingSettings.countDocuments(), 1);
  assert.equal(await User.countDocuments(), 1);
});

test("la limpieza en Mongo efímero borra pedidos y secuencia sin alterar stock, ajustes, usuarios ni draft", async () => {
  const product = await Product.create({ name: "Taza test", price: 12, stock: 7 });
  const order = await Order.create({ orderNumber: "MLG-261005-001", guestId: "test", items: [{ productId: product._id, name: "Taza test", quantity: 2, price: 12 }], total: 24, shipping: { price: 0 } });
  await EmailNotification.create({ orderId: order._id, event: "ORDER_RECEIVED", recipient: "test@example.com", idempotencyKey: "cleanup-test" });
  await Customization.create({ productId: product._id, orderId: order._id, schemaVersion: 2 });
  const draft = await Customization.create({ productId: product._id, schemaVersion: 2 });
  await OrderSequence.create({ dateKey: "261005", seq: 1 });
  await PaymentSettings.create({ bizum: { label: "Bizum" }, bankTransfer: { label: "Transferencia" } });
  await ShippingSettings.create({});
  await User.create({ name: "Admin", email: "preserve@example.test", passwordHash: "test", role: "admin" });
  const audit = await auditPrelaunchOrders({ Order, EmailNotification, Customization, OrderSequence, Product }, { exists: async () => false });
  assert.equal(audit.stock[0].possibleQuantity, 2);
  await deleteOrderData(audit, { Order, EmailNotification, Customization, OrderSequence });
  assert.equal(await Order.countDocuments(), 0);
  assert.equal(await EmailNotification.countDocuments(), 0);
  assert.equal(await OrderSequence.countDocuments(), 0);
  assert.equal(await Customization.countDocuments(), 1);
  assert.ok(await Customization.findById(draft._id));
  assert.equal((await Product.findById(product._id)).stock, 7);
  assert.equal(await PaymentSettings.countDocuments(), 1);
  assert.equal(await ShippingSettings.countDocuments(), 1);
  assert.equal(await User.countDocuments(), 1);
  assert.equal(nextOrderNumberAfterReset(new Date("2026-10-05T10:00:00Z")), "MLG-261005-001");
});

test("solo claves derivadas de una personalización son borrables; uploads compartidos se conservan", () => {
  const id = new mongoose.Types.ObjectId();
  const keys = orderOwnedKeys({ _id: id, schemaVersion: 2,
    productionBundle: { zipStorageKey: `customizations/${id}/bundle.zip` },
    designDocument: { assets: { shared: { storageKey: "designer-v2/uploads/original.png" } } },
  });
  assert.deepEqual(keys.exclusive, [`customizations/${id}/bundle.zip`]);
  assert.deepEqual(keys.ambiguous, ["designer-v2/uploads/original.png"]);
});
