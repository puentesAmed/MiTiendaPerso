import {
  DEFAULT_DESIGNER_FONT_ID,
  getDesignerFont,
  getDesignerFontSource,
  isDesignerFontWeightAllowed,
} from "../../../../../shared/designer-v2/fontRegistry.js";

const loadCache = new Map();

export function getDocumentFontRequests(document) {
  const requests = new Map();
  Object.values(document?.views || {}).forEach((view) => {
    (view.elements || []).forEach((element) => {
      if (element.type !== "text") return;
      const fontId = element.fontId || DEFAULT_DESIGNER_FONT_ID;
      requests.set(`${fontId}:${element.fontWeight}`, { fontId, weight: element.fontWeight });
    });
  });
  return [...requests.values()];
}

export function loadDesignerFont(fontId, weight, {
  FontFaceCtor = globalThis.FontFace,
  fontSet = globalThis.document?.fonts,
} = {}) {
  const font = getDesignerFont(fontId);
  const source = getDesignerFontSource(fontId, weight);
  if (!font || !source || !isDesignerFontWeightAllowed(fontId, weight)) {
    return Promise.reject(new Error("La fuente o el peso no pertenecen al catálogo del diseñador."));
  }
  const key = `${fontId}:${weight}`;
  if (loadCache.has(key)) return loadCache.get(key);
  if (!FontFaceCtor || !fontSet?.add) return Promise.reject(new Error("Este navegador no permite cargar la fuente del diseño."));
  const promise = new FontFaceCtor(font.family, `url(${source}) format("woff2")`, {
    style: "normal",
    weight: String(weight),
    display: "swap",
  }).load().then((face) => {
    fontSet.add(face);
    return font;
  }).catch((error) => {
    loadCache.delete(key);
    throw new Error(`No se pudo cargar la fuente ${font.label}.`, { cause: error });
  });
  loadCache.set(key, promise);
  return promise;
}

export async function ensureDocumentFonts(document, options) {
  await Promise.all(getDocumentFontRequests(document).map(({ fontId, weight }) => loadDesignerFont(fontId, weight, options)));
}

export function clearDesignerFontCache() {
  loadCache.clear();
}

