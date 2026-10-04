import test from "node:test";
import assert from "node:assert/strict";

import {
  DESIGNER_FONTS,
  DESIGNER_FONT_CATEGORIES,
  getDesignerFont,
  getDesignerFontSource,
  isDesignerFontWeightAllowed,
} from "../../../../../shared/designer-v2/fontRegistry.js";

test("selector consume las doce familias habilitadas y agrupadas", () => {
  assert.equal(DESIGNER_FONTS.length, 12);
  assert.equal(DESIGNER_FONTS.every((font) => font.enabled === true), true);
  assert.deepEqual(DESIGNER_FONT_CATEGORIES, ["Modernas", "Elegantes", "Decorativas / manuscritas", "Display"]);
  assert.deepEqual(new Set(DESIGNER_FONTS.map((font) => font.category)), new Set(DESIGNER_FONT_CATEGORIES));
});

test("registra las nuevas familias requeridas con licencia y WOFF2 locales", () => {
  for (const fontId of ["poppins", "roboto", "open-sans", "merriweather", "libre-baskerville", "dancing-script", "caveat"]) {
    const font = getDesignerFont(fontId);
    assert.ok(font, fontId);
    assert.match(font.license, /^\/fonts\/designer\/.+-OFL\.txt$/);
    for (const weight of font.weights) assert.match(getDesignerFontSource(fontId, weight), /^\/fonts\/designer\/.+\.woff2$/);
  }
});

test("Poppins resuelve un asset real por peso y rechaza pesos inexistentes", () => {
  assert.match(getDesignerFontSource("poppins", 400), /poppins-400-latin\.woff2$/);
  assert.match(getDesignerFontSource("poppins", 700), /poppins-700-latin\.woff2$/);
  assert.equal(isDesignerFontWeightAllowed("poppins", 700), true);
  assert.equal(isDesignerFontWeightAllowed("poppins", 900), false);
  assert.equal(getDesignerFontSource("poppins", 900), null);
});

test("Merriweather, Dancing Script y Caveat conservan los pesos publicados", () => {
  assert.deepEqual(getDesignerFont("merriweather").weights, [400, 700]);
  assert.deepEqual(getDesignerFont("dancing-script").weights, [400, 500, 600, 700]);
  assert.deepEqual(getDesignerFont("caveat").weights, [400, 500, 600, 700]);
});

