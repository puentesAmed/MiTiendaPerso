import assert from "node:assert/strict";
import test from "node:test";
import { buildCustomizationPricingPayload, buildCustomizationSurfaceRows } from "./customizationPricingForm.js";

test("Admin usa superficies del template y conserva modificador cero", () => {
  const rows = buildCustomizationSurfaceRows("tshirt-basic-v1", { surfaces: [{ surfaceId: "tshirt-front", enabled: true, required: true, priceModifier: 0 }] });
  assert.equal(rows.length, 4);
  assert.deepEqual(rows[0], { surfaceId: "tshirt-front", label: "Área frontal", enabled: true, required: true, priceModifier: "0" });
  const payload = buildCustomizationPricingPayload({ customizable: true, productTemplateId: "tshirt-basic-v1", customizationSurfaces: rows });
  assert.equal(payload.surfaces[0].priceModifier, 0);
  assert.equal(payload.surfaces[1].priceModifier, null);
});
