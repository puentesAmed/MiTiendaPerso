import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeCustomizationPayload,
  isDesignerCustomization,
  getCustomizationDesignVersion,
} from "../../src/utils/customizationAdapter.js";

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
