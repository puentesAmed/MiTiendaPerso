import { FabricAdapter } from "../adapters/FabricAdapter.js";
import { getViewByPrintSurfaceId, getViewPrintSurface } from "../contracts/printSurface.js";
import { applyEditableMask, canvasToPngBlob } from "./editableMaskRenderer.js";

export function getArtworkExportGeometry(template, view, previewWidth = 1200) {
  const printSurface = getViewPrintSurface(template, view);
  if (printSurface) {
    const { width, height } = printSurface.previewTextureResolution;
    return { canvasWidth: width, canvasHeight: height, crop: { left: 0, top: 0, width, height } };
  }
  const canvasWidth = previewWidth;
  const canvasHeight = Math.round(canvasWidth / view.canvas.aspectRatio);
  const area = view.printAreas[0];
  return {
    canvasWidth,
    canvasHeight,
    crop: { left: area.x * canvasWidth, top: area.y * canvasHeight, width: area.width * canvasWidth, height: area.height * canvasHeight },
  };
}

function resolveArtworkView(template, { sourceViewId, printSurfaceId }) {
  return printSurfaceId ? getViewByPrintSurfaceId(template, printSurfaceId) : template.views.find((candidate) => candidate.id === sourceViewId);
}

export async function renderPreviewArtwork({ document, template, sourceViewId, printSurfaceId, assetRegistry, previewWidth = 1200 }) {
  const view = resolveArtworkView(template, { sourceViewId, printSurfaceId });
  if (!view) throw new Error("La vista fuente del mockup no existe.");
  const canvasElement = globalThis.document.createElement("canvas");
  let renderError = "";
  const adapter = new FabricAdapter(canvasElement, { onError: (message) => { renderError = message; } });
  const geometry = getArtworkExportGeometry(template, view, previewWidth);
  try {
    adapter.resize(geometry.canvasWidth, geometry.canvasHeight);
    await adapter.reconcile(document, view.id, template, assetRegistry);
    if (renderError) throw new Error(renderError);
    const artworkCanvas = adapter.exportCanvas(geometry.crop);
    applyEditableMask(artworkCanvas, getViewPrintSurface(template, view)?.editableMask);
    return await canvasToPngBlob(artworkCanvas);
  } finally {
    await adapter.dispose();
  }
}

export async function renderPreviewArtworkCanvas({ document, template, sourceViewId, printSurfaceId, assetRegistry, previewWidth = 1200 }) {
  const view = resolveArtworkView(template, { sourceViewId, printSurfaceId });
  if (!view) throw new Error("La vista fuente 3D no existe.");
  const canvasElement = globalThis.document.createElement("canvas");
  let renderError = "";
  const adapter = new FabricAdapter(canvasElement, { onError: (message) => { renderError = message; } });
  const geometry = getArtworkExportGeometry(template, view, previewWidth);
  try {
    adapter.resize(geometry.canvasWidth, geometry.canvasHeight);
    await adapter.reconcile(document, view.id, template, assetRegistry);
    if (renderError) throw new Error(renderError);
    return applyEditableMask(adapter.exportCanvas(geometry.crop), getViewPrintSurface(template, view)?.editableMask);
  } finally {
    await adapter.dispose();
  }
}

