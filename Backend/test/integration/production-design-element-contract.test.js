import test from "node:test";
import assert from "node:assert/strict";

import { validateProductionDesignElement } from "../../src/production/design-element-contract.js";

const base = { id: "element-1", printAreaId: "wrap-main", x: 0.2, y: 0.2, width: 0.3, height: 0.3, scale: { x: 1, y: 1 }, rotation: 0, opacity: 1, zIndex: 0, locked: false, hidden: false };

test("producción acepta fuentes y shapes del catálogo", () => {
  const text = { ...base, type: "text", content: "Producción", fontId: "poppins", fontSize: 0.09, color: "#18181b", textAlign: "center", fontWeight: 700 };
  const shape = { ...base, id: "shape-1", type: "shape", shapeType: "star", fill: "#6d5dfc", stroke: "#18181b", strokeWidth: 0.003 };
  assert.deepEqual(validateProductionDesignElement(text), []);
  assert.deepEqual(validateProductionDesignElement(shape), []);
});

test("producción rechaza tipos, fuentes, shapes y números manipulados", () => {
  const shape = { ...base, type: "shape", shapeType: "heart", fill: "#6d5dfc", stroke: "#18181b", strokeWidth: 0.003 };
  const text = { ...base, type: "text", content: "X", fontId: "inter", fontSize: 0.09, color: "#18181b", textAlign: "center", fontWeight: 500 };
  for (const element of [
    { ...base, type: "svg" },
    { ...text, fontId: "https://example.test/font.woff2" },
    { ...text, fontId: "pacifico", fontWeight: 700 },
    { ...text, fontId: "poppins", fontWeight: 900 },
    { ...shape, shapeType: "custom-path" },
    { ...shape, opacity: Number.NaN },
    { ...shape, opacity: -0.1 },
    { ...shape, strokeWidth: Number.POSITIVE_INFINITY },
    { ...shape, strokeWidth: -1 },
  ]) assert.notDeepEqual(validateProductionDesignElement(element), []);
});

