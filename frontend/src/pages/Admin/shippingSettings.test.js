import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const adminSource = readFileSync(new URL("./Admin.jsx", import.meta.url), "utf8");

test("Admin carga y guarda ShippingSettings sin exponer secretos", () => {
  assert.match(adminSource, /\/api\/shipping\/admin\/settings/);
  assert.match(adminSource, /LOCAL_URGENT activo/);
  assert.match(adminSource, /PARCEL_STANDARD activo/);
  assert.match(adminSource, /PICKUP_FREE activo/);
  assert.match(adminSource, /pickupAddress/);
  assert.match(adminSource, /originAddress/);
  assert.match(adminSource, /maxDistanceKm/);
  assert.match(adminSource, /bands/);
  assert.doesNotMatch(adminSource, /ORS_API_KEY|orsApiKey/);
});

test("Admin permite shippingProfile nullable sin inferir taza o camiseta", () => {
  assert.match(adminSource, /Shipping profile JSON/);
  assert.match(adminSource, /Usa solo pesos y medidas verificados/);
  assert.doesNotMatch(adminSource, /fragile:\s*true|weightGrams:\s*\d/);
  assert.match(adminSource, /preparationRequired/);
  assert.match(adminSource, /preparationMinDays/);
  assert.match(adminSource, /preparationMaxDays/);
});
