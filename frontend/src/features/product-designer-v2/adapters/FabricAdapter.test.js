import test from "node:test";
import assert from "node:assert/strict";
import { FabricAdapter } from "./FabricAdapter.js";
import { GENERIC_FLAT_DEMO_TEMPLATE } from "../templates/genericFlatDemo.js";

test("transform image usa escala de objeto uniforme sin zoom ni retina", () => {
  const adapter = Object.create(FabricAdapter.prototype);
  adapter.template = GENERIC_FLAT_DEMO_TEMPLATE;
  adapter.view = GENERIC_FLAT_DEMO_TEMPLATE.views[0];
  adapter.size = { width: 1200, height: 1000 };
  const area = adapter.view.printAreas[0];
  const viewport = {
    x: area.x * adapter.size.width,
    y: area.y * adapter.size.height,
    width: area.width * adapter.size.width,
    height: area.height * adapter.size.height,
  };
  const base = { x: 0.4, y: 0.35, width: 0.2, height: 0.1 };
  const object = {
    data: { elementId: "image-1", printAreaId: area.id, type: "image" },
    width: base.width * viewport.width,
    height: base.height * viewport.height,
    angle: 0,
    getCenterPoint: () => ({
      x: viewport.x + (base.x + base.width / 2) * viewport.width,
      y: viewport.y + (base.y + base.height / 2) * viewport.height,
    }),
    getObjectScaling: () => ({ x: 2, y: 1.25 }),
    getTotalObjectScaling: () => { throw new Error("No debe incluir zoom ni retina."); },
  };

  const update = adapter.transformUpdate(object);
  assert.ok(Math.abs(update.patch.width - 0.4) < 1e-12);
  assert.ok(Math.abs(update.patch.height - 0.2) < 1e-12);
  assert.ok(Math.abs((update.patch.width / update.patch.height) - (base.width / base.height)) < 1e-12);
  assert.deepEqual(update.patch.scale, { x: 1, y: 1 });
});
