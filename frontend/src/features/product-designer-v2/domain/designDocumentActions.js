import { validateDesignElement } from "../contracts/elementModel.js";

const DEFAULT_NOW = () => new Date().toISOString();
const DEFAULT_ID = () => globalThis.crypto.randomUUID();

function getView(document, viewId) {
  const view = document.views?.[viewId];
  if (!view || !Array.isArray(view.elements)) throw new Error(`Vista ${viewId} no disponible en DesignDocument.`);
  return view;
}

function nextZIndex(elements) {
  return elements.reduce((highest, element) => Math.max(highest, element.zIndex), -1) + 1;
}

export function normalizeZIndices(elements) {
  return [...elements]
    .sort((left, right) => left.zIndex - right.zIndex)
    .map((element, zIndex) => ({ ...element, zIndex }));
}

function commitView(document, viewId, elements, now = DEFAULT_NOW, assets = document.assets) {
  return {
    ...document,
    assets,
    views: { ...document.views, [viewId]: { ...document.views[viewId], elements } },
    metadata: { ...document.metadata, updatedAt: now() },
  };
}

function assertElement(element) {
  const validation = validateDesignElement(element);
  if (!validation.valid) throw new Error(`Elemento inválido: ${validation.errors.join(" ")}`);
}

export function addText(document, { viewId, printAreaId, idFactory = DEFAULT_ID, now = DEFAULT_NOW } = {}) {
  const elements = getView(document, viewId).elements;
  const element = {
    id: idFactory(),
    type: "text",
    printAreaId,
    x: 0.25,
    y: 0.4,
    width: 0.5,
    height: 0.16,
    scale: { x: 1, y: 1 },
    rotation: 0,
    opacity: 1,
    zIndex: nextZIndex(elements),
    locked: false,
    hidden: false,
    content: "Tu texto",
    fontSize: 0.09,
    color: "#18181b",
    textAlign: "center",
    fontWeight: 500,
  };
  assertElement(element);
  return { document: commitView(document, viewId, [...elements, element], now), element };
}

export function addImage(document, {
  viewId,
  printAreaId,
  asset,
  aspectRatio,
  printAreaAspectRatio = 1,
  idFactory = DEFAULT_ID,
  now = DEFAULT_NOW,
} = {}) {
  if (!asset?.assetId || asset.kind !== "image") throw new Error("Asset de imagen inválido.");
  const elements = getView(document, viewId).elements;
  let width = 0.5;
  let height = width * Math.max(printAreaAspectRatio, 0.01) / Math.max(aspectRatio || 1, 0.01);
  if (height > 0.5) {
    height = 0.5;
    width = height * Math.max(aspectRatio || 1, 0.01) / Math.max(printAreaAspectRatio, 0.01);
  }
  const element = {
    id: idFactory(),
    type: "image",
    printAreaId,
    assetId: asset.assetId,
    x: (1 - width) / 2,
    y: (1 - height) / 2,
    width,
    height,
    scale: { x: 1, y: 1 },
    rotation: 0,
    opacity: 1,
    zIndex: nextZIndex(elements),
    locked: false,
    hidden: false,
  };
  assertElement(element);
  return {
    document: commitView(document, viewId, [...elements, element], now, {
      ...document.assets,
      [asset.assetId]: asset,
    }),
    element,
  };
}

export function updateElement(document, { viewId, elementId, patch, now = DEFAULT_NOW } = {}) {
  const elements = getView(document, viewId).elements;
  const index = elements.findIndex((element) => element.id === elementId);
  if (index < 0) return { document, element: null };
  const element = { ...elements[index], ...patch, id: elements[index].id, type: elements[index].type };
  assertElement(element);
  const next = elements.slice();
  next[index] = element;
  return { document: commitView(document, viewId, next, now), element };
}

export function updateElements(document, { viewId, updates, now = DEFAULT_NOW } = {}) {
  const elements = getView(document, viewId).elements;
  const patches = new Map(updates.map(({ elementId, patch }) => [elementId, patch]));
  if (!patches.size) return { document, elements: [] };
  const updated = [];
  const next = elements.map((current) => {
    const patch = patches.get(current.id);
    if (!patch) return current;
    const element = { ...current, ...patch, id: current.id, type: current.type };
    assertElement(element);
    updated.push(element);
    return element;
  });
  return updated.length ? { document: commitView(document, viewId, next, now), elements: updated } : { document, elements: [] };
}

export function moveElementLayer(document, { viewId, elementId, direction, now = DEFAULT_NOW } = {}) {
  const ordered = normalizeZIndices(getView(document, viewId).elements);
  const index = ordered.findIndex((element) => element.id === elementId);
  const target = direction === "forward" ? index + 1 : index - 1;
  if (index < 0 || target < 0 || target >= ordered.length) return { document, moved: null };
  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
  const elements = ordered.map((element, zIndex) => ({ ...element, zIndex }));
  return { document: commitView(document, viewId, elements, now), moved: elements[target] };
}

export function deleteElement(document, { viewId, elementId, now = DEFAULT_NOW } = {}) {
  const elements = getView(document, viewId).elements;
  const removed = elements.find((element) => element.id === elementId);
  if (!removed) return { document, removed: null };
  const nextElements = elements.filter((element) => element.id !== elementId);
  let assets = document.assets;
  if (removed.assetId) {
    const stillReferenced = Object.values(document.views).some((view) =>
      view.elements.some((element) => element.id !== elementId && element.assetId === removed.assetId),
    );
    if (!stillReferenced) {
      assets = { ...document.assets };
      delete assets[removed.assetId];
    }
  }
  return { document: commitView(document, viewId, nextElements, now, assets), removed };
}

export function deleteElements(document, { viewId, elementIds, now = DEFAULT_NOW } = {}) {
  const ids = new Set(elementIds);
  const elements = getView(document, viewId).elements;
  const removed = elements.filter((element) => ids.has(element.id));
  if (!removed.length) return { document, removed: [] };
  const nextElements = normalizeZIndices(elements.filter((element) => !ids.has(element.id)));
  const referencedAssetIds = new Set(Object.entries(document.views).flatMap(([candidateViewId, view]) =>
    view.elements
      .filter((element) => candidateViewId !== viewId || !ids.has(element.id))
      .map((element) => element.assetId)
      .filter(Boolean),
  ));
  const assets = Object.fromEntries(Object.entries(document.assets).filter(([assetId]) => referencedAssetIds.has(assetId)));
  return { document: commitView(document, viewId, nextElements, now, assets), removed };
}

export function duplicateElement(document, {
  viewId,
  elementId,
  idFactory = DEFAULT_ID,
  now = DEFAULT_NOW,
} = {}) {
  const elements = getView(document, viewId).elements;
  const source = elements.find((element) => element.id === elementId);
  if (!source) return { document, element: null };
  const element = {
    ...source,
    id: idFactory(),
    x: source.x + 0.03,
    y: source.y + 0.03,
    zIndex: nextZIndex(elements),
  };
  assertElement(element);
  return { document: commitView(document, viewId, [...elements, element], now), element };
}

export function isElementOutOfBounds(element) {
  const radians = (element.rotation * Math.PI) / 180;
  const halfWidth = element.width / 2;
  const halfHeight = element.height / 2;
  const extentX = Math.abs(Math.cos(radians)) * halfWidth + Math.abs(Math.sin(radians)) * halfHeight;
  const extentY = Math.abs(Math.sin(radians)) * halfWidth + Math.abs(Math.cos(radians)) * halfHeight;
  const centerX = element.x + halfWidth;
  const centerY = element.y + halfHeight;
  return centerX - extentX < 0 || centerY - extentY < 0 || centerX + extentX > 1 || centerY + extentY > 1;
}
