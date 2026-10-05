import test from "node:test";
import assert from "node:assert/strict";
import { MUG_CERAMIC_STANDARD_V1_TEMPLATE } from "../templates/mugCeramicStandardV1.js";
import { TSHIRT_BASIC_V1_TEMPLATE } from "../templates/tshirtBasicV1.js";
import { isThreeDModeAvailable } from "../three/threeModelRegistry.js";
import { filterTemplateBySelectedSurfaceIds } from "../domain/customizationSurfaces.js";
import { createDesignDocument } from "../contracts/designDocument.js";
import { getMockupDefinition, getAvailableDesignerModes, isMockupModeAvailable } from "./mockupCatalog.js";
import { createMockupFingerprintInput, deriveMockupStatus, hashMockupFingerprint } from "./mockupState.js";

test("preview 2D de desarrollo no habilita modo Mockup", () => {
  assert.equal(isMockupModeAvailable(MUG_CERAMIC_STANDARD_V1_TEMPLATE), false);
  assert.equal(isMockupModeAvailable({ mockups: [] }), false);
  assert.equal(getMockupDefinition(MUG_CERAMIC_STANDARD_V1_TEMPLATE).sourceViewId, "wrap");
});

test("modos declaran Design y capacidades 2D/3D en orden", () => {
  const modesFor = (template) => getAvailableDesignerModes({ has2DPreview: isMockupModeAvailable(template), has3DProfile: isThreeDModeAvailable(template) });
  assert.deepEqual(modesFor(MUG_CERAMIC_STANDARD_V1_TEMPLATE), ["design", "three-d"]);
  assert.deepEqual(modesFor(TSHIRT_BASIC_V1_TEMPLATE), ["design", "three-d"]);
  assert.deepEqual(modesFor(filterTemplateBySelectedSurfaceIds(TSHIRT_BASIC_V1_TEMPLATE, ["tshirt-front", "tshirt-back", "tshirt-sleeve-left"])), ["design", "three-d"]);
  assert.deepEqual(getAvailableDesignerModes({ has2DPreview: true, has3DProfile: true }), ["design", "mockup", "three-d"]);
  assert.deepEqual(getAvailableDesignerModes({ has2DPreview: true, has3DProfile: false }), ["design", "mockup"]);
  assert.deepEqual(getAvailableDesignerModes({ has2DPreview: false, has3DProfile: false }), ["design"]);
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

