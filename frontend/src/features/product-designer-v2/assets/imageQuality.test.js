import test from "node:test";
import assert from "node:assert/strict";
import { assertNoRejectedImageAssets, evaluateImageQuality, IMAGE_QUALITY_COPY } from "./imageQuality.js";

test("clasifica imágenes good, warning y rejected sin depender del formato", () => {
  assert.equal(evaluateImageQuality({ widthPx: 2000, heightPx: 1000 }), "good");
  assert.equal(evaluateImageQuality({ widthPx: 1008, heightPx: 480 }), "warning");
  assert.equal(evaluateImageQuality({ widthPx: 300, heightPx: 1000 }), "rejected");
  assert.equal(evaluateImageQuality({ widthPx: 2000, heightPx: 800 }), "good");
});

test("warning permite continuar y rejected bloquea el handoff", () => {
  const document = (qualityStatus) => ({
    assets: { image: { assetId: "image", kind: "image", qualityStatus } },
    views: { front: { elements: [{ id: "element", type: "image", assetId: "image" }] } },
  });
  assert.equal(assertNoRejectedImageAssets(document("good")), true);
  assert.equal(assertNoRejectedImageAssets(document("warning")), true);
  assert.throws(() => assertNoRejectedImageAssets(document("rejected")), new RegExp(IMAGE_QUALITY_COPY.rejected.description));
});

test("assets históricos sin qualityStatus mantienen compatibilidad", () => {
  const document = { assets: { legacy: { assetId: "legacy", kind: "image" } }, views: { wrap: { elements: [{ type: "image", assetId: "legacy" }] } } };
  assert.equal(assertNoRejectedImageAssets(document), true);
});
