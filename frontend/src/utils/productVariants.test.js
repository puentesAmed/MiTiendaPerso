import test from "node:test";
import assert from "node:assert/strict";

import { resolveSelectedVariant, toRequestedProductVariant } from "./productVariants.js";

test("S + Blanco resuelve opciones canónicas y quote recibe solo size/color", () => {
  const product = { variants: { sizes: ["S", "M", "L", "XL"], colors: ["NEGRO", "BLANCO"] } };
  const resolved = resolveSelectedVariant(product, { size: "s", color: "Blanco" });
  assert.deepEqual(resolved, { variantId: '["S","BLANCO"]', size: "S", sizeId: "s", color: "BLANCO", colorId: "white" });
  assert.deepEqual(toRequestedProductVariant(resolved), { size: "S", color: "BLANCO" });
  assert.equal(resolveSelectedVariant(product, { size: "XXL", color: "Blanco" }), null);
});

test("colores no predefinidos conservan valor canónico sin bloquear otros productos", () => {
  const resolved = resolveSelectedVariant({ variants: { sizes: [], colors: ["Turquesa"] } }, { color: "turquesa" });
  assert.deepEqual(resolved, { variantId: '[null,"Turquesa"]', size: null, sizeId: null, color: "Turquesa", colorId: "turquesa" });
});

test("identidad de quote conserva opciones distintas aunque compartan color visual", () => {
  const product = { variants: { colors: ["ROJO", "RED"] } };
  assert.notEqual(resolveSelectedVariant(product, { color: "ROJO" }).variantId, resolveSelectedVariant(product, { color: "RED" }).variantId);
});

test("selecciones pendientes o ambiguas no resuelven una variante", () => {
  const product = { variants: { sizes: ["S", "M"], colors: ["BLANCO"] } };
  assert.equal(resolveSelectedVariant(product, { size: "S" }), null);
  assert.equal(resolveSelectedVariant(product, { color: "BLANCO" }), null);
  assert.equal(resolveSelectedVariant({ variants: { colors: ["Azul", "AZUL"] } }, { color: "azul" }), null);
});
