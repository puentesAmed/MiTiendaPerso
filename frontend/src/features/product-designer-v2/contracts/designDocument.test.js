import test from "node:test";
import assert from "node:assert/strict";
import { createDesignDocument, validateDesignDocument } from "./designDocument.js";
import { GENERIC_FLAT_DEMO_TEMPLATE } from "../templates/genericFlatDemo.js";

test("createDesignDocument crea referencias, variante y vistas vacías", () => {
  const document = createDesignDocument({
    template: GENERIC_FLAT_DEMO_TEMPLATE,
    productId: "product-1",
    variant: { size: "M", color: "Negro" },
    idFactory: () => "document-1",
    now: () => "2026-09-28T00:00:00.000Z",
  });

  assert.equal(document.documentId, "document-1");
  assert.equal(document.templateId, "generic-flat-demo");
  assert.deepEqual(document.variant, { size: "M", color: "Negro" });
  assert.deepEqual(Object.keys(document.views), ["primary", "secondary"]);
  assert.deepEqual(document.views.primary.elements, []);
  assert.equal(validateDesignDocument(document, GENERIC_FLAT_DEMO_TEMPLATE).valid, true);
  assert.equal(Object.hasOwn(document, "zoom"), false);
  assert.equal(Object.hasOwn(document, "selection"), false);
  assert.equal(Object.hasOwn(document, "previewImage"), false);
});

test("createDesignDocument rechaza template inválido", () => {
  assert.throws(
    () => createDesignDocument({ template: {}, productId: "product-1" }),
    /ProductTemplate inválido/,
  );
});
