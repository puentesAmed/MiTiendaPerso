import { createHash } from "node:crypto";
import { DEFAULT_DESIGNER_FONT_ID } from "../../../shared/designer-v2/fontRegistry.js";

export const PLACEMENT_SCHEMA_VERSION = 1;

export function normalizedElementToSurfacePixels(element, surface) {
  const width = element.width * surface.widthPx;
  const height = element.height * surface.heightPx;
  return {
    x: element.x * surface.widthPx,
    y: element.y * surface.heightPx,
    width,
    height,
    centerX: element.x * surface.widthPx + width / 2,
    centerY: element.y * surface.heightPx + height / 2,
    rotation: element.rotation,
  };
}

function placementElement(element) {
  const base = {
    id: element.id,
    type: element.type,
    printAreaId: element.printAreaId,
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
    rotation: element.rotation,
    opacity: element.opacity,
    zIndex: element.zIndex,
    hidden: Boolean(element.hidden),
  };
  if (element.type === "image") return { ...base, assetId: element.assetId };
  if (element.type === "text") {
    return {
      ...base,
      text: {
        contentSha256: createHash("sha256").update(element.content || "").digest("hex"),
        length: String(element.content || "").length,
        fontId: element.fontId || DEFAULT_DESIGNER_FONT_ID,
        fontSize: element.fontSize,
        color: element.color,
        textAlign: element.textAlign,
        fontWeight: element.fontWeight,
      },
    };
  }
  if (element.type === "shape") {
    return {
      ...base,
      shape: {
        shapeType: element.shapeType,
        fill: element.fill,
        stroke: element.stroke,
        strokeWidth: element.strokeWidth,
      },
    };
  }
  return base;
}

export function buildPlacementMetadata({ document, template, surface }) {
  const elements = [...(document.views[surface.viewId]?.elements || [])]
    .sort((left, right) => left.zIndex - right.zIndex)
    .map(placementElement);
  return {
    schemaVersion: PLACEMENT_SCHEMA_VERSION,
    viewId: surface.viewId,
    surfaceId: surface.surfaceId,
    templateId: template.templateId,
    templateRevision: template.templateRevision,
    coordinateSystem: "normalized",
    logicalSize: { widthPx: surface.widthPx, heightPx: surface.heightPx },
    physicalSize: surface.physicalSize ?? null,
    safeArea: surface.safeArea ?? null,
    bleed: surface.bleed ?? null,
    orientation: surface.orientation,
    physicalPlacement: null,
    elements,
  };
}
