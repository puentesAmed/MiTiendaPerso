import { normalizedElementToSurfacePixels } from "../production/alignmentContract.js";

function assertViewport(viewport) {
  if (!viewport || viewport.width <= 0 || viewport.height <= 0) throw new Error("Print area viewport inválido.");
}

export function fabricTransformToDomain(transform, printAreaViewport) {
  assertViewport(printAreaViewport);
  const width = transform.width * transform.scaleX;
  const height = transform.height * transform.scaleY;
  return {
    x: (transform.centerX - width / 2 - printAreaViewport.x) / printAreaViewport.width,
    y: (transform.centerY - height / 2 - printAreaViewport.y) / printAreaViewport.height,
    width: width / printAreaViewport.width,
    height: height / printAreaViewport.height,
    scale: { x: 1, y: 1 },
    rotation: transform.rotation,
  };
}

export function keepElementReachable(bounds, minimumVisible = 0.04) {
  const radians = ((bounds.rotation || 0) * Math.PI) / 180;
  const extentX = (Math.abs(Math.cos(radians)) * bounds.width + Math.abs(Math.sin(radians)) * bounds.height) / 2;
  const extentY = (Math.abs(Math.sin(radians)) * bounds.width + Math.abs(Math.cos(radians)) * bounds.height) / 2;
  const visibleWidth = Math.min(extentX * 2, Math.max(minimumVisible, extentX * 2 * 0.12));
  const visibleHeight = Math.min(extentY * 2, Math.max(minimumVisible, extentY * 2 * 0.12));
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  const reachableCenterX = Math.min(1 + extentX - visibleWidth, Math.max(-extentX + visibleWidth, centerX));
  const reachableCenterY = Math.min(1 + extentY - visibleHeight, Math.max(-extentY + visibleHeight, centerY));
  return {
    ...bounds,
    x: reachableCenterX - bounds.width / 2,
    y: reachableCenterY - bounds.height / 2,
  };
}

export function domainElementToFabricRect(element, printAreaViewport) {
  assertViewport(printAreaViewport);
  const pixels = normalizedElementToSurfacePixels(element, printAreaViewport);
  return {
    centerX: printAreaViewport.x + pixels.centerX,
    centerY: printAreaViewport.y + pixels.centerY,
    width: pixels.width,
    height: pixels.height,
    rotation: element.rotation,
  };
}
