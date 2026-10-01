import test from "node:test";
import assert from "node:assert/strict";
import { buildDesignerV2Location, createDesignerVariantContext, resolveDesignerVariantContext, sameDesignerVariant } from "./variantContext.js";
import { resolveVariantPresentation } from "./variantColors.js";

const product = { variants: { sizes: ["S", "M"], colors: ["Blanco", "Negro"] } };

test("ProductDetail genera contexto estable y URL refrescable", () => {
  const context = createDesignerVariantContext(product, { size: "M", color: "Negro" });
  assert.deepEqual(context, { variantId: "black", size: "M", sizeId: "m", color: "Negro", colorId: "black" });
  assert.equal(buildDesignerV2Location("shirt-1", context), "/personalizar-v2/shirt-1?size=m&color=black");
  assert.deepEqual(resolveDesignerVariantContext(product, { search: "?size=m&color=black" }), context);
});

test("ProductDetail y Designer resuelven blanco/negro desde el mismo colorId", () => {
  const white = createDesignerVariantContext(product, { size: "M", color: "Blanco" });
  const black = createDesignerVariantContext(product, { size: "M", color: "Negro" });
  assert.deepEqual(resolveVariantPresentation(white), { colorId: "white", colorLabel: "Blanco", baseColor: "#ffffff" });
  assert.deepEqual(resolveVariantPresentation(black), { colorId: "black", colorLabel: "Negro", baseColor: "#111111" });
  assert.notEqual(resolveVariantPresentation(white).baseColor, resolveVariantPresentation(black).baseColor);
});

test("solo acepta opciones presentes en el producto", () => {
  assert.equal(createDesignerVariantContext(product, { size: "XL", color: "Negro" }), null);
  assert.equal(createDesignerVariantContext(product, { size: "M", color: "Rojo" }), null);
});

test("la compatibilidad de draft distingue color y talla", () => {
  const whiteM = createDesignerVariantContext(product, { size: "M", color: "Blanco" });
  assert.equal(sameDesignerVariant(whiteM, { ...whiteM }), true);
  assert.equal(sameDesignerVariant(whiteM, createDesignerVariantContext(product, { size: "S", color: "Blanco" })), false);
  assert.equal(sameDesignerVariant(whiteM, createDesignerVariantContext(product, { size: "M", color: "Negro" })), false);
});
