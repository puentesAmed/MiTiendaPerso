import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeCustomizationPayload,
  isDesignerCustomization,
  isValidDesignerCustomization,
  getCustomizationDesignVersion,
  validateDesignerCustomization,
} from "../../src/utils/customizationAdapter.js";

function v2Customization(productId = "693070095d96fe47cd3f2055") {
  return {
    type: "designer",
    schemaVersion: 2,
    designVersion: 2,
    clientId: "client-mug",
    productId,
    selectedSurfaceIds: ["wrap-main"],
    customizationPricing: { unitPrice: 0, selectedSurfaceIds: ["wrap-main"] },
    designDocument: {
      schemaVersion: 1,
      documentId: "document-mug",
      productId,
      templateId: "mug-ceramic-standard-v1",
      templateRevision: 1,
      selectedSurfaceIds: ["wrap-main"],
      assets: {},
      views: { wrap: { elements: [] } },
      metadata: { createdAt: "2026-10-04T08:00:00.000Z", updatedAt: "2026-10-04T08:00:00.000Z" },
    },
    uploads: { assets: {}, surfaces: { wrap: { artworkUploadId: "artwork-id", proofUploadId: "proof-id" } } },
  };
}

test("normalizeCustomizationPayload reconoce v1 sin designVersion", () => {
  const input = {
    type: "designer",
    design: { side: "front", elementsBySide: { front: [], back: [] } },
    previewsBySide: { front: "front-preview", back: null },
  };

  const normalized = normalizeCustomizationPayload(input);
  assert.equal(normalized.type, "designer");
  assert.equal(normalized.designVersion, 1);
  assert.equal(normalized.previewImage, "front-preview");
});

test("normalizeCustomizationPayload reconoce v2 y lo preserva", () => {
  const input = {
    type: "designer",
    designVersion: 2,
    design: { side: "back", elementsBySide: { front: [], back: [] } },
    previewImage: "preview-v2",
  };

  const normalized = normalizeCustomizationPayload(input);
  assert.equal(normalized.type, "designer");
  assert.equal(normalized.designVersion, 2);
  assert.equal(normalized.previewImage, "preview-v2");
  assert.equal(getCustomizationDesignVersion(normalized), 2);
});

test("customization no designer no se trata como diseño", () => {
  const input = { type: "manual", notes: "x" };
  assert.equal(isDesignerCustomization(input), false);
  assert.equal(normalizeCustomizationPayload(input), null);
});

test("validador reconoce el contrato real Designer V2 y el producto correcto", () => {
  const product = { _id: "693070095d96fe47cd3f2055", productTemplateId: "mug-ceramic-standard-v1", customizationPricing: { enabled: true } };
  assert.equal(isValidDesignerCustomization(v2Customization(), product), true);
});

test("validador V2 rechaza payload incompleto, producto, superficies y assets manipulados", () => {
  const product = { _id: "693070095d96fe47cd3f2055", productTemplateId: "mug-ceramic-standard-v1", customizationPricing: { enabled: true } };
  const incomplete = v2Customization();
  delete incomplete.uploads;
  assert.match(validateDesignerCustomization(incomplete, product).reason, /handoff/);

  const wrongProduct = v2Customization("693070095d96fe47cd3f2999");
  assert.match(validateDesignerCustomization(wrongProduct, product).reason, /otro producto/);

  const wrongSurface = v2Customization();
  wrongSurface.selectedSurfaceIds = ["invented"];
  wrongSurface.designDocument.selectedSurfaceIds = ["invented"];
  wrongSurface.customizationPricing.selectedSurfaceIds = ["invented"];
  assert.match(validateDesignerCustomization(wrongSurface, product).reason, /no contratadas/);

  const rejectedAsset = v2Customization();
  rejectedAsset.designDocument.assets.image = { qualityStatus: "rejected" };
  rejectedAsset.uploads.assets.image = "upload-image";
  assert.match(validateDesignerCustomization(rejectedAsset, product).reason, /assets rechazados/);
});

test("validador mantiene compatibilidad con Designer histórico estructurado", () => {
  assert.equal(isValidDesignerCustomization({ type: "designer", design: { elementsBySide: { front: [], back: [] } } }), true);
  assert.equal(isValidDesignerCustomization({ type: "designer" }), false);
});
