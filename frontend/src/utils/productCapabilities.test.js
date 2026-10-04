import assert from "node:assert/strict";
import test from "node:test";
import { canQuickAdd, getProductCardAction, isCustomizableProduct } from "./productCapabilities.js";

const customizable = (name, variants = { sizes: [], colors: [] }) => ({ _id: name, name, customizable: true, variants });

test("cards de taza, camiseta y sudadera personalizables navegan sin quick-add", () => {
  const fixtures = [
    customizable("Taza cerámica personalizada"),
    customizable("Camiseta básica personalizada", { sizes: ["M"], colors: ["Blanco"] }),
    customizable("Sudadera con capucha personalizada", { sizes: ["M"], colors: [] }),
  ];
  assert.deepEqual(fixtures.map((product) => getProductCardAction(product)), [
    { type: "navigate", label: "Personalizar" },
    { type: "navigate", label: "Elegir opciones" },
    { type: "navigate", label: "Elegir opciones" },
  ]);
  fixtures.forEach((product) => {
    assert.equal(isCustomizableProduct(product), true);
    assert.equal(canQuickAdd(product), false);
  });
});

test("producto normal mantiene Añadir y detalle comparte canQuickAdd", () => {
  const simple = { _id: "normal", customizable: false, variants: { sizes: [], colors: [] } };
  const withOptions = { ...simple, variants: { sizes: ["M"], colors: [] } };
  assert.deepEqual(getProductCardAction(simple), { type: "quick-add", label: "Añadir" });
  assert.equal(canQuickAdd(simple), true);
  assert.equal(canQuickAdd(withOptions), false);
  assert.equal(canQuickAdd(withOptions, { optionsResolved: true }), true);
});
