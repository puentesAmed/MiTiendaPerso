import test from "node:test";
import assert from "node:assert/strict";
import { evaluateImageQuality, validateAssetQuality } from "../../src/services/image-quality.service.js";

test("backend comparte clasificación objetiva de calidad", () => {
  assert.equal(evaluateImageQuality({ widthPx: 2000, heightPx: 1000 }), "good");
  assert.equal(evaluateImageQuality({ widthPx: 1008, heightPx: 480 }), "warning");
  assert.equal(evaluateImageQuality({ widthPx: 300, heightPx: 1000 }), "rejected");
});

test("backend acepta histórico y rechaza status manipulado", () => {
  assert.deepEqual(validateAssetQuality({ widthPx: 10, heightPx: 10 }), { valid: true, historical: true });
  assert.equal(validateAssetQuality({ widthPx: 2000, heightPx: 1000, qualityStatus: "good" }).valid, true);
  assert.equal(validateAssetQuality({ widthPx: 1008, heightPx: 480, qualityStatus: "warning" }).valid, true);
  assert.deepEqual(validateAssetQuality({ widthPx: 300, heightPx: 1000, qualityStatus: "rejected" }), { valid: false, reason: "rejected" });
  assert.deepEqual(validateAssetQuality({ widthPx: 300, heightPx: 1000, qualityStatus: "good" }), { valid: false, reason: "status_mismatch" });
});
