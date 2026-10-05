import test from "node:test";
import assert from "node:assert/strict";

import { createCustomizationQuoteCoordinator, createCustomizationQuoteKey } from "./customizationQuoteRequest.js";
import { resolveSelectedVariant, toRequestedProductVariant } from "./productVariants.js";
import { canPersonalizeProduct, getProductCustomizationState, normalizeSelectedSurfaceIds } from "../features/product-designer-v2/domain/customizationSurfaces.js";

test("quote key usa producto, variante canónica y superficies ordenadas", () => {
  assert.equal(createCustomizationQuoteKey({ productId: "shirt-1", canonicalVariantId: "s~white", selectedSurfaceIds: ["back", "front"] }), "shirt-1|s~white|back~front");
  assert.equal(createCustomizationQuoteKey({ productId: "shirt-1", canonicalVariantId: "s~white", selectedSurfaceIds: [] }), null);
});

test("deduplica quote concurrente y rerender sin cambios", async () => {
  const coordinator = createCustomizationQuoteCoordinator();
  let requests = 0;
  const request = async () => { requests += 1; return { unitPrice: 19.9 }; };
  const key = "shirt-1|s~white|front";
  const first = coordinator.request(key, request);
  const duplicate = coordinator.request(key, request);
  assert.equal(first, duplicate);
  assert.deepEqual(await first, { unitPrice: 19.9 });
  assert.deepEqual(await coordinator.request(key, request), { unitPrice: 19.9 });
  assert.equal(requests, 1);
});

test("una combinación válida distinta genera exactamente un quote nuevo", async () => {
  const coordinator = createCustomizationQuoteCoordinator();
  let requests = 0;
  const request = async () => { requests += 1; return requests; };
  assert.equal(await coordinator.request("shirt-1|s~white|front", request), 1);
  assert.equal(await coordinator.request("shirt-1|m~white|front", request), 2);
  assert.equal(requests, 2);
});

test("un error backend no provoca requests idénticos en rerenders", async () => {
  const coordinator = createCustomizationQuoteCoordinator();
  let requests = 0;
  const request = async () => { requests += 1; throw new Error("Backend unavailable"); };
  await assert.rejects(coordinator.request("same-key", request), /Backend unavailable/);
  await assert.rejects(coordinator.request("same-key", request), /Backend unavailable/);
  assert.equal(requests, 1);
  coordinator.reset();
  await assert.rejects(coordinator.request("same-key", request), /Backend unavailable/);
  assert.equal(requests, 2);
});

test("S + Blanco + Frontal produce un payload canónico, un quote y habilita Personalizar", async () => {
  const product = {
    variants: { sizes: ["S", "M", "L", "XL"], colors: ["NEGRO", "BLANCO"] },
    customizationPricing: { enabled: true, surfaces: [{ surfaceId: "tshirt-front", enabled: true, required: true, priceModifier: 0 }] },
  };
  const variant = resolveSelectedVariant(product, { size: "S", color: "Blanco" });
  const customizationState = getProductCustomizationState(product);
  const selectedSurfaceIds = normalizeSelectedSurfaceIds(customizationState.surfaces, ["tshirt-front"]);
  const key = createCustomizationQuoteKey({ productId: "693070095d96fe47cd3f2053", canonicalVariantId: variant.variantId, selectedSurfaceIds });
  const coordinator = createCustomizationQuoteCoordinator();
  let requests = 0;
  const request = async () => {
    requests += 1;
    assert.deepEqual({ variant: toRequestedProductVariant(variant), selectedSurfaceIds }, { variant: { size: "S", color: "BLANCO" }, selectedSurfaceIds: ["tshirt-front"] });
    return { basePrice: 19.9, customizationAmount: 0, unitPrice: 19.9 };
  };
  const quote = await coordinator.request(key, request);
  await coordinator.request(key, request);
  assert.equal(requests, 1);
  assert.equal(canPersonalizeProduct({ customizationState, canAddToCart: true, isAliExpress: false, customizationQuote: quote, quoteLoading: false }), true);
  assert.throws(() => normalizeSelectedSurfaceIds(customizationState.surfaces, ["unknown"]), /no está disponible/);
});
