import test from "node:test";
import assert from "node:assert/strict";
import { MUG_CERAMIC_STANDARD_V1_TEMPLATE } from "../templates/mugCeramicStandardV1.js";
import { createDesignDocument } from "../contracts/designDocument.js";
import { getMockupDefinition, isMockupModeAvailable } from "./mockupCatalog.js";
import { createMockupFingerprintInput, deriveMockupStatus, hashMockupFingerprint } from "./mockupState.js";

test("tab Mockup depende del registry declarado por ProductTemplate", () => {
  assert.equal(isMockupModeAvailable(MUG_CERAMIC_STANDARD_V1_TEMPLATE), true);
  assert.equal(isMockupModeAvailable({ mockups: [] }), false);
  assert.equal(getMockupDefinition(MUG_CERAMIC_STANDARD_V1_TEMPLATE).sourceViewId, "wrap");
});

test("fingerprint es estable, hasheable y no recibe session state", async () => {
  const document = createDesignDocument({ template: MUG_CERAMIC_STANDARD_V1_TEMPLATE, productId: "p1" });
  const definition = getMockupDefinition(MUG_CERAMIC_STANDARD_V1_TEMPLATE);
  const input = createMockupFingerprintInput({ document, template: MUG_CERAMIC_STANDARD_V1_TEMPLATE, definition });
  assert.equal(input, createMockupFingerprintInput({ document: structuredClone(document), template: MUG_CERAMIC_STANDARD_V1_TEMPLATE, definition }));
  assert.match(await hashMockupFingerprint(input), /^[a-f0-9]{64}$/);
  assert.doesNotMatch(input, /selection|zoom|pan/);
});

test("cambio documental marca stale y estados loading/error prevalecen", () => {
  const result = { fingerprintInput: "before", url: "mockup.png" };
  assert.equal(deriveMockupStatus({ result, currentFingerprintInput: "before", loading: false, error: "" }), "ready");
  assert.equal(deriveMockupStatus({ result, currentFingerprintInput: "after", loading: false, error: "" }), "stale");
  assert.equal(deriveMockupStatus({ result, currentFingerprintInput: "after", loading: true, error: "" }), "loading");
  assert.equal(deriveMockupStatus({ result, currentFingerprintInput: "after", loading: false, error: "fallo" }), "error");
});

