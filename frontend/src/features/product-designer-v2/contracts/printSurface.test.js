import test from "node:test";
import assert from "node:assert/strict";
import { getViewAspectRatio, getViewPrintAreas, validatePrintSurface } from "./printSurface.js";
import { MUG_CERAMIC_STANDARD_V1_TEMPLATE, MUG_WRAP_PRINT_SURFACE } from "../templates/mugCeramicStandardV1.js";

test("PrintSurface de taza unifica ratio, resolución y geometría editable", () => {
  assert.deepEqual(validatePrintSurface(MUG_WRAP_PRINT_SURFACE), { valid: true, errors: [] });
  assert.equal(MUG_WRAP_PRINT_SURFACE.physicalSize, null);
  assert.equal(MUG_WRAP_PRINT_SURFACE.safeArea, null);
  assert.equal(MUG_WRAP_PRINT_SURFACE.bleed, null);
  assert.deepEqual(MUG_WRAP_PRINT_SURFACE.restrictedZones, []);
  const view = MUG_CERAMIC_STANDARD_V1_TEMPLATE.views[0];
  assert.equal(getViewAspectRatio(MUG_CERAMIC_STANDARD_V1_TEMPLATE, view), 2.1);
  assert.deepEqual(getViewPrintAreas(MUG_CERAMIC_STANDARD_V1_TEMPLATE, view).map(({ id, x, y, width, height }) => ({ id, x, y, width, height })), [{ id: "wrap-main", x: 0, y: 0, width: 1, height: 1 }]);
});

test("PrintSurface representa fixtures flat, wrap y panel sin productType", () => {
  for (const topology of ["flat", "wrap", "panel"]) {
    const fixture = { ...MUG_WRAP_PRINT_SURFACE, id: `${topology}-surface`, orientation: { ...MUG_WRAP_PRINT_SURFACE.orientation, topology, front: topology === "wrap" ? "center" : null, seam: topology === "wrap" ? "horizontal-edges" : null } };
    assert.equal(validatePrintSurface(fixture).valid, true);
  }
});

test("PrintSurface rechaza resolución que no respeta su aspect ratio", () => {
  const result = validatePrintSurface({ ...MUG_WRAP_PRINT_SURFACE, previewTextureResolution: { width: 1000, height: 1000 } });
  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /aspectRatio/);
});
