import test from "node:test";
import assert from "node:assert/strict";
import { createDesignDocument, validateDesignDocument } from "./designDocument.js";
import { GENERIC_FLAT_DEMO_TEMPLATE } from "../templates/genericFlatDemo.js";
import { MUG_CERAMIC_STANDARD_V1_TEMPLATE } from "../templates/mugCeramicStandardV1.js";
import { TSHIRT_BASIC_V1_TEMPLATE } from "../templates/tshirtBasicV1.js";

test("createDesignDocument crea referencias, variante y vistas vacías", () => {
  const document = createDesignDocument({
    template: GENERIC_FLAT_DEMO_TEMPLATE,
    productId: "product-1",
    variant: { variantId: "black", size: "M", sizeId: "m", color: "Negro", colorId: "black" },
    idFactory: () => "document-1",
    now: () => "2026-09-28T00:00:00.000Z",
  });

  assert.equal(document.documentId, "document-1");
  assert.equal(document.templateId, "generic-flat-demo");
  assert.deepEqual(document.variant, { variantId: "black", size: "M", sizeId: "m", color: "Negro", colorId: "black" });
  assert.deepEqual(Object.keys(document.views), ["primary", "secondary"]);
  assert.deepEqual(document.views.primary.elements, []);
  assert.equal(validateDesignDocument(document, GENERIC_FLAT_DEMO_TEMPLATE).valid, true);
  assert.equal(Object.hasOwn(document, "zoom"), false);
  assert.equal(Object.hasOwn(document, "selection"), false);
  assert.equal(Object.hasOwn(document, "previewImage"), false);
});

test("producto piloto crea DesignDocument real con vista wrap", () => {
  const document = createDesignDocument({
    template: MUG_CERAMIC_STANDARD_V1_TEMPLATE,
    productId: "693070095d96fe47cd3f2055",
    variant: { color: "Blanco" },
    idFactory: () => "document-mug",
    now: () => "2026-09-29T00:00:00.000Z",
  });

  assert.equal(document.productId, "693070095d96fe47cd3f2055");
  assert.equal(document.templateId, "mug-ceramic-standard-v1");
  assert.equal(document.templateRevision, 1);
  assert.deepEqual(document.variant, { variantId: null, size: null, sizeId: null, color: "Blanco", colorId: null });
  assert.deepEqual(Object.keys(document.views), ["wrap"]);
  assert.deepEqual(document.views.wrap.elements, []);
  assert.deepEqual(document.assets, {});
});

test("createDesignDocument rechaza template inválido", () => {
  assert.throws(
    () => createDesignDocument({ template: {}, productId: "product-1" }),
    /ProductTemplate inválido/,
  );
});

test("camiseta inicializa cuatro vistas independientes", () => {
  const document = createDesignDocument({ template: TSHIRT_BASIC_V1_TEMPLATE, productId: "shirt-1", idFactory: () => "shirt-document", now: () => "2026-10-01T00:00:00.000Z" });
  assert.equal(document.templateRevision, 2);
  assert.deepEqual(Object.keys(document.views), ["front", "back", "sleeve-left", "sleeve-right"]);
  Object.values(document.views).forEach((view) => assert.deepEqual(view.elements, []));
  assert.equal(validateDesignDocument(document, TSHIRT_BASIC_V1_TEMPLATE).valid, true);
});
