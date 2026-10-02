import { getViewPrintSurface } from "../contracts/printSurface.js";
import { renderPreviewArtworkCanvas } from "../mockups/ArtworkRenderer.js";
import { canvasToPngBlob } from "../mockups/editableMaskRenderer.js";
import { getPlacementAlignment } from "./alignmentContract.js";

export const PLACEMENT_PROOF_LAYOUT = Object.freeze({
  width: 1200,
  padding: 64,
  headerHeight: 92,
  footerHeight: 64,
  maxSurfaceHeight: 900,
});

export function getPlacementProofGeometry(printSurface) {
  const availableWidth = PLACEMENT_PROOF_LAYOUT.width - PLACEMENT_PROOF_LAYOUT.padding * 2;
  let width = availableWidth;
  let height = width / printSurface.aspectRatio;
  if (height > PLACEMENT_PROOF_LAYOUT.maxSurfaceHeight) {
    height = PLACEMENT_PROOF_LAYOUT.maxSurfaceHeight;
    width = height * printSurface.aspectRatio;
  }
  const canvasHeight = Math.ceil(PLACEMENT_PROOF_LAYOUT.headerHeight + height + PLACEMENT_PROOF_LAYOUT.footerHeight + PLACEMENT_PROOF_LAYOUT.padding);
  return Object.freeze({
    canvasWidth: PLACEMENT_PROOF_LAYOUT.width,
    canvasHeight,
    surfaceRect: Object.freeze({
      x: (PLACEMENT_PROOF_LAYOUT.width - width) / 2,
      y: PLACEMENT_PROOF_LAYOUT.headerHeight,
      width,
      height,
    }),
  });
}

function tracePolygon(context, points, rect) {
  context.beginPath();
  points.forEach(([x, y], index) => context[index ? "lineTo" : "moveTo"](rect.x + x * rect.width, rect.y + y * rect.height));
  context.closePath();
}

function drawGarmentGuide(context, presentation, rect, pathFactory) {
  const outline = presentation?.guide?.outline || presentation?.editableMask?.outline || [];
  context.fillStyle = "#e5e7eb";
  context.strokeStyle = "#64748b";
  context.lineWidth = 3;
  outline.forEach((polygon) => { tracePolygon(context, polygon, rect); context.fill(); context.stroke(); });
  if (presentation?.guide?.neckContour) {
    tracePolygon(context, presentation.guide.neckContour, rect);
    context.fillStyle = "#f8fafc";
    context.fill();
    context.stroke();
  }
  if (pathFactory) {
    context.save();
    context.translate(rect.x, rect.y);
    context.scale(rect.width, rect.height);
    context.fillStyle = "#f8fafc";
    presentation?.guide?.cutoutPaths?.forEach((definition) => { const path = pathFactory(definition); context.fill(path); context.stroke(path); });
    context.restore();
  }
}

function drawWrapReferences(context, rect) {
  context.save();
  context.strokeStyle = "rgba(30, 64, 175, .55)";
  context.setLineDash([10, 8]);
  [0, 0.5, 1].forEach((position) => {
    context.beginPath();
    context.moveTo(rect.x + rect.width * position, rect.y);
    context.lineTo(rect.x + rect.width * position, rect.y + rect.height);
    context.stroke();
  });
  context.restore();
}

export function composePlacementProof({ canvas, artworkCanvas, template, view, productLabel = "Producto", pathFactory = globalThis.Path2D ? (value) => new globalThis.Path2D(value) : null }) {
  const printSurface = getViewPrintSurface(template, view);
  const alignment = getPlacementAlignment(template, view);
  const geometry = getPlacementProofGeometry(printSurface);
  canvas.width = geometry.canvasWidth;
  canvas.height = geometry.canvasHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D no disponible para placement proof.");

  context.fillStyle = "#f8fafc";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#0f172a";
  context.font = "600 28px Inter, ui-sans-serif, sans-serif";
  context.fillText(`${productLabel} · ${view.label}`, PLACEMENT_PROOF_LAYOUT.padding, 42);
  context.fillStyle = "#64748b";
  context.font = "18px Inter, ui-sans-serif, sans-serif";
  context.fillText(`Template ${template.templateId} · rev. ${template.templateRevision}`, PLACEMENT_PROOF_LAYOUT.padding, 72);

  if (view.editorPresentation?.type === "garment") drawGarmentGuide(context, view.editorPresentation, geometry.surfaceRect, pathFactory);
  else {
    context.fillStyle = "#ffffff";
    context.fillRect(geometry.surfaceRect.x, geometry.surfaceRect.y, geometry.surfaceRect.width, geometry.surfaceRect.height);
    context.strokeStyle = "#64748b";
    context.strokeRect(geometry.surfaceRect.x, geometry.surfaceRect.y, geometry.surfaceRect.width, geometry.surfaceRect.height);
  }

  context.drawImage(artworkCanvas, geometry.surfaceRect.x, geometry.surfaceRect.y, geometry.surfaceRect.width, geometry.surfaceRect.height);
  if (view.editorPresentation?.type === "garment") {
    context.strokeStyle = "#334155";
    context.lineWidth = 3;
    (view.editorPresentation.guide?.outline || []).forEach((polygon) => { tracePolygon(context, polygon, geometry.surfaceRect); context.stroke(); });
  } else drawWrapReferences(context, geometry.surfaceRect);

  const footerY = geometry.surfaceRect.y + geometry.surfaceRect.height + 34;
  context.fillStyle = "#475569";
  context.font = "16px Inter, ui-sans-serif, sans-serif";
  const orientation = alignment.orientation;
  const orientationText = orientation.topology === "wrap"
    ? "Izquierda / seam · Centro / frontal · Derecha / seam"
    : `${orientation.horizontal} · ${orientation.vertical}`;
  context.fillText(`${alignment.surfaceId} · ${orientationText}`, PLACEMENT_PROOF_LAYOUT.padding, footerY);
  return { canvas, geometry, alignment };
}

export async function renderPlacementProof({ document, template, view, assetRegistry, productLabel }) {
  const artworkCanvas = await renderPreviewArtworkCanvas({ document, template, sourceViewId: view.id, assetRegistry });
  const canvas = globalThis.document.createElement("canvas");
  composePlacementProof({ canvas, artworkCanvas, template, view, productLabel });
  return canvasToPngBlob(canvas);
}
