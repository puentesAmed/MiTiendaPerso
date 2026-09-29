import { FabricAdapter } from "../adapters/FabricAdapter.js";

export function getArtworkExportGeometry(view, previewWidth) {
  const canvasWidth = previewWidth;
  const canvasHeight = Math.round(canvasWidth / view.canvas.aspectRatio);
  const area = view.printAreas[0];
  return {
    canvasWidth,
    canvasHeight,
    crop: { left: area.x * canvasWidth, top: area.y * canvasHeight, width: area.width * canvasWidth, height: area.height * canvasHeight },
  };
}

export async function renderPreviewArtwork({ document, template, sourceViewId, assetRegistry, previewWidth = 1200 }) {
  const view = template.views.find((candidate) => candidate.id === sourceViewId);
  if (!view) throw new Error("La vista fuente del mockup no existe.");
  const canvasElement = globalThis.document.createElement("canvas");
  let renderError = "";
  const adapter = new FabricAdapter(canvasElement, { onError: (message) => { renderError = message; } });
  const geometry = getArtworkExportGeometry(view, previewWidth);
  try {
    adapter.resize(geometry.canvasWidth, geometry.canvasHeight);
    await adapter.reconcile(document, sourceViewId, template, assetRegistry);
    if (renderError) throw new Error(renderError);
    return await adapter.exportPng(geometry.crop);
  } finally {
    await adapter.dispose();
  }
}

export async function renderPreviewArtworkCanvas({ document, template, sourceViewId, assetRegistry, previewWidth = 1200 }) {
  const view = template.views.find((candidate) => candidate.id === sourceViewId);
  if (!view) throw new Error("La vista fuente 3D no existe.");
  const canvasElement = globalThis.document.createElement("canvas");
  let renderError = "";
  const adapter = new FabricAdapter(canvasElement, { onError: (message) => { renderError = message; } });
  const geometry = getArtworkExportGeometry(view, previewWidth);
  try {
    adapter.resize(geometry.canvasWidth, geometry.canvasHeight);
    await adapter.reconcile(document, sourceViewId, template, assetRegistry);
    if (renderError) throw new Error(renderError);
    return adapter.exportCanvas(geometry.crop);
  } finally {
    await adapter.dispose();
  }
}

