import test from "node:test";
import assert from "node:assert/strict";

import { validateDesignElement } from "./elementModel.js";

const base = { id: "element-1", printAreaId: "area-1", x: 0.2, y: 0.2, width: 0.3, height: 0.3, scale: { x: 1, y: 1 }, rotation: 0, opacity: 1, zIndex: 0, locked: false, hidden: false };

test("texto valida fontId y pesos del registro y conserva fallback histórico", () => {
  const text = { ...base, type: "text", content: "Hola", fontId: "playfair-display", fontSize: 0.09, color: "#18181b", textAlign: "center", fontWeight: 600 };
  assert.equal(validateDesignElement(text).valid, true);
  assert.equal(validateDesignElement({ ...text, fontId: "arbitrary-url" }).valid, false);
  assert.equal(validateDesignElement({ ...text, fontId: "pacifico", fontWeight: 700 }).valid, false);
  const legacy = { ...text };
  delete legacy.fontId;
  assert.equal(validateDesignElement({ ...legacy, fontWeight: 500 }).valid, true);
});

test("shape rechaza catálogo, colores y números manipulados", () => {
  const shape = { ...base, type: "shape", shapeType: "heart", fill: "#6d5dfc", stroke: "#18181b", strokeWidth: 0.003 };
  assert.equal(validateDesignElement(shape).valid, true);
  for (const invalid of [
    { shapeType: "svg" },
    { fill: "url(https://example.test/a.svg)" },
    { strokeWidth: Number.NaN },
    { strokeWidth: -1 },
    { opacity: 1.1 },
  ]) assert.equal(validateDesignElement({ ...shape, ...invalid }).valid, false);
});

