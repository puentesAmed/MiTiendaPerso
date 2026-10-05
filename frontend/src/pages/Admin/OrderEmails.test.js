import test from "node:test";
import assert from "node:assert/strict";
import { getOrderEmailRows } from "./orderEmailRows.js";

test("email rows show pickup or shipping and failed state", () => {
  const order = { shipping: { methodId: "pickup-free" }, payment: { method: "bizum" } };
  const rows = getOrderEmailRows(order, [{ event: "PAYMENT_PENDING", status: "failed" }]);
  assert.equal(rows.find((row) => row.event === "PAYMENT_PENDING").email.status, "failed");
  assert.ok(rows.some((row) => row.event === "ORDER_READY_FOR_PICKUP"));
  assert.ok(!rows.some((row) => row.event === "ORDER_SHIPPED"));
  const shippingRows = getOrderEmailRows({ shipping: { methodId: "local-urgent" }, payment: { method: "bank_transfer" } }, []);
  assert.ok(shippingRows.some((row) => row.event === "ORDER_SHIPPED"));
  assert.ok(!shippingRows.some((row) => row.event === "ORDER_READY_FOR_PICKUP"));
});
