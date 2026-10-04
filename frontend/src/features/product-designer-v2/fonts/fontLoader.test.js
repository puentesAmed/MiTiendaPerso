import test from "node:test";
import assert from "node:assert/strict";

import { clearDesignerFontCache, ensureDocumentFonts, getDocumentFontRequests, loadDesignerFont } from "./fontLoader.js";

test("extrae fuentes únicas del DesignDocument con fallback histórico", () => {
  const document = { views: { front: { elements: [
    { type: "text", fontId: "montserrat", fontWeight: 700 },
    { type: "text", fontId: "montserrat", fontWeight: 700 },
    { type: "text", fontWeight: 500 },
    { type: "shape" },
  ] } } };
  assert.deepEqual(getDocumentFontRequests(document), [{ fontId: "montserrat", weight: 700 }, { fontId: "inter", weight: 500 }]);
});

test("carga cada fuente/peso una vez y registra la cara cargada", async () => {
  clearDesignerFontCache();
  let loads = 0;
  class FakeFontFace {
    constructor(family, source, descriptors) { Object.assign(this, { family, source, descriptors }); }
    async load() { loads += 1; return this; }
  }
  const faces = [];
  const options = { FontFaceCtor: FakeFontFace, fontSet: { add: (face) => faces.push(face) } };
  const first = loadDesignerFont("inter", 500, options);
  const second = loadDesignerFont("inter", 500, options);
  assert.equal(first, second);
  await Promise.all([first, second]);
  assert.equal(loads, 1);
  assert.equal(faces.length, 1);
});

test("Poppins usa su WOFF2 por peso sin precargar el resto del catálogo", async () => {
  clearDesignerFontCache();
  const constructed = [];
  class FakeFontFace {
    constructor(family, source, descriptors) { constructed.push({ family, source, descriptors }); }
    async load() { return this; }
  }
  assert.equal(constructed.length, 0);
  await loadDesignerFont("poppins", 600, { FontFaceCtor: FakeFontFace, fontSet: { add() {} } });
  assert.equal(constructed.length, 1);
  assert.match(constructed[0].source, /poppins-600-latin\.woff2/);
  assert.equal(constructed[0].descriptors.weight, "600");
});

test("bloquea handoff si una fuente no pertenece al registro o no carga", async () => {
  clearDesignerFontCache();
  await assert.rejects(() => ensureDocumentFonts({ views: { front: { elements: [{ type: "text", fontId: "remote-css", fontWeight: 400 }] } } }), /catálogo/);
  class BrokenFontFace { async load() { throw new Error("network"); } }
  await assert.rejects(() => loadDesignerFont("pacifico", 400, { FontFaceCtor: BrokenFontFace, fontSet: { add() {} } }), /No se pudo cargar/);
});

