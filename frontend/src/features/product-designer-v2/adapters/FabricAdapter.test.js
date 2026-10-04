import test from "node:test";
import assert from "node:assert/strict";
import { FabricImage } from "fabric";
import { createFabricShape, FabricAdapter } from "./FabricAdapter.js";
import { GENERIC_FLAT_DEMO_TEMPLATE } from "../templates/genericFlatDemo.js";
import { calculateInitialImageBounds } from "../domain/designDocumentActions.js";

function closeTo(actual, expected, tolerance = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} no coincide con ${expected}`);
}

function createAdapterHarness() {
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
  return { adapter, area, viewport };
}

test("transform image usa escala de objeto uniforme sin zoom ni retina", () => {
  const { adapter, area, viewport } = createAdapterHarness();
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

for (const fixture of [
  { label: "small", widthPx: 200, heightPx: 400 },
  { label: "large", widthPx: 4000, heightPx: 3000 },
]) {
  test(`round-trip ${fixture.label}: intrinsic estable y rendered size idéntico tras resize/reconcile`, () => {
    const { adapter, area, viewport } = createAdapterHarness();
    const bounds = calculateInitialImageBounds({
      ...fixture,
      printAreaAspectRatio: viewport.width / viewport.height,
      printAreaPixelSize: { width: viewport.width, height: viewport.height },
    });
    const element = { id: `image-${fixture.label}`, type: "image", printAreaId: area.id, assetId: `asset-${fixture.label}`, ...bounds, rotation: 0, opacity: 1, hidden: false, locked: false };
    const source = { width: fixture.widthPx, height: fixture.heightPx, naturalWidth: fixture.widthPx, naturalHeight: fixture.heightPx };
    const image = new FabricImage(source);

    adapter.applyElement(image, element);
    assert.equal(image.width, fixture.widthPx);
    assert.equal(image.height, fixture.heightPx);
    assert.equal(image.cropX, 0);
    assert.equal(image.cropY, 0);
    assert.equal(image.hasCrop(), false);

    image.set({ scaleX: image.scaleX * 2, scaleY: image.scaleY * 2 });
    image.setCoords();
    const renderedBeforeCommit = { width: image.getScaledWidth(), height: image.getScaledHeight() };
    const boundingBeforeCommit = image.getBoundingRect();
    closeTo(boundingBeforeCommit.width, renderedBeforeCommit.width);
    closeTo(boundingBeforeCommit.height, renderedBeforeCommit.height);

    const update = adapter.transformUpdate(image);
    adapter.applyElement(image, { ...element, ...update.patch });

    assert.equal(image.width, fixture.widthPx);
    assert.equal(image.height, fixture.heightPx);
    closeTo(image.getScaledWidth(), renderedBeforeCommit.width);
    closeTo(image.getScaledHeight(), renderedBeforeCommit.height);
    assert.equal(image.hasCrop(), false);

    image.set({ scaleX: image.scaleX * 0.5, scaleY: image.scaleY * 0.5 });
    image.setCoords();
    closeTo(image.getScaledWidth(), renderedBeforeCommit.width * 0.5);
    closeTo(image.getScaledHeight(), renderedBeforeCommit.height * 0.5);
  });
}

test("round-trip de imagen rotada conserva tamaño visual sin convertir bounding box en crop", () => {
  const { adapter, area, viewport } = createAdapterHarness();
  const bounds = calculateInitialImageBounds({ widthPx: 4000, heightPx: 2000, printAreaAspectRatio: viewport.width / viewport.height, printAreaPixelSize: { width: viewport.width, height: viewport.height } });
  const element = { id: "image-rotated", type: "image", printAreaId: area.id, assetId: "asset-rotated", ...bounds, rotation: 32, opacity: 1, hidden: false, locked: false };
  const image = new FabricImage({ width: 4000, height: 2000, naturalWidth: 4000, naturalHeight: 2000 });
  adapter.applyElement(image, element);
  image.set({ scaleX: image.scaleX * 1.5, scaleY: image.scaleY * 1.5 });
  image.setCoords();
  const rendered = { width: image.getScaledWidth(), height: image.getScaledHeight() };
  const update = adapter.transformUpdate(image);

  adapter.applyElement(image, { ...element, ...update.patch });

  closeTo(image.getScaledWidth(), rendered.width);
  closeTo(image.getScaledHeight(), rendered.height);
  assert.equal(image.angle, 32);
  assert.equal(image.width, 4000);
  assert.equal(image.height, 2000);
  assert.equal(image.hasCrop(), false);
});

test("FabricAdapter crea y dimensiona las seis shapes declarativas", () => {
  const { adapter, area, viewport } = createAdapterHarness();
  adapter.template = GENERIC_FLAT_DEMO_TEMPLATE;
  adapter.view = GENERIC_FLAT_DEMO_TEMPLATE.views[0];
  for (const shapeType of ["rectangle", "circle", "triangle", "star", "heart", "line"]) {
    const object = createFabricShape(shapeType);
    assert.ok(object, shapeType);
    const element = { id: `shape-${shapeType}`, type: "shape", shapeType, printAreaId: area.id, x: 0.2, y: 0.3, width: 0.4, height: shapeType === "line" ? 0.04 : 0.25, scale: { x: 1, y: 1 }, rotation: 12, opacity: 0.75, zIndex: 0, locked: false, hidden: false, fill: shapeType === "line" ? "none" : "#6d5dfc", stroke: "#18181b", strokeWidth: 0.005 };
    adapter.applyElement(object, element);
    closeTo(object.width * object.scaleX, element.width * viewport.width, 1e-6);
    closeTo(object.height * object.scaleY, element.height * viewport.height, 1e-6);
    assert.equal(object.strokeUniform, true);
    assert.equal(object.data.type, "shape");
  }
});

test("texto usa la familia resuelta por fontId, no un string recibido del cliente", () => {
  const { adapter, area } = createAdapterHarness();
  const object = { width: 1, height: 1, set(values) { Object.assign(this, values); }, setCoords() {} };
  adapter.applyElement(object, { id: "text-1", type: "text", printAreaId: area.id, x: 0.2, y: 0.3, width: 0.4, height: 0.2, scale: { x: 1, y: 1 }, rotation: 0, opacity: 1, zIndex: 0, locked: false, hidden: false, content: "Hola", fontId: "montserrat", fontSize: 0.08, color: "#18181b", textAlign: "center", fontWeight: 700, fontFamily: "Injected" });
  assert.match(object.fontFamily, /MiTienda Montserrat/);
  assert.doesNotMatch(object.fontFamily, /Injected/);
});
