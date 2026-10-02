import { PRODUCT_EDITOR_GUIDES } from "../domain/editorPresentation.js";

function polygonPath(points) {
  return points.map(([x, y], index) => `${index ? "L" : "M"}${x} ${y}`).join(" ") + " Z";
}

export function ProductEditorGuide({ guideId, baseColor, detailColor, guideDefinition, editableMask, debug = false }) {
  if (guideDefinition || editableMask) {
    const outline = guideDefinition?.outline || editableMask.outline;
    return (
      <svg className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 1 1" preserveAspectRatio="none" role="presentation" aria-hidden="true" focusable="false" data-editor-guide={guideId}>
        {outline.map((points, index) => <path key={index} d={polygonPath(points)} fill={baseColor} stroke={detailColor} strokeWidth="0.004" vectorEffect="non-scaling-stroke" />)}
        {guideDefinition?.cutoutPaths?.map((path) => <path key={path} d={path} fill="var(--muted)" stroke={detailColor} strokeWidth="0.004" vectorEffect="non-scaling-stroke" data-guide-armhole="true" />)}
        {guideDefinition?.neckContour ? <path d={polygonPath(guideDefinition.neckContour)} fill="var(--muted)" stroke={detailColor} strokeWidth="0.004" vectorEffect="non-scaling-stroke" data-guide-neck="true" /> : null}
        {debug ? editableMask.include.map((shape) => <g key={shape.id}><path d={polygonPath(shape.polygon)} fill="none" stroke="#f97316" strokeWidth="0.003" strokeDasharray="0.01 0.006" /><text x={shape.polygon[0][0]} y={shape.polygon[0][1]} fill="#f97316" fontSize="0.025">{shape.label}</text></g>) : null}
      </svg>
    );
  }
  const guide = PRODUCT_EDITOR_GUIDES[guideId];
  if (!guide) return null;
  return (
    <svg className="pointer-events-none absolute inset-0 size-full" viewBox={guide.viewBox} role="presentation" aria-hidden="true" focusable="false" data-editor-guide={guideId}>
      <path d={guide.bodyPath} fill={baseColor} stroke={detailColor} strokeOpacity="0.42" strokeWidth="5" strokeLinejoin="round" />
      {guide.detailPaths.map((path) => <path key={path} d={path} fill="none" stroke={detailColor} strokeOpacity="0.32" strokeWidth="4" strokeLinecap="round" />)}
    </svg>
  );
}

export function ProductEditorMaskOverlay({ editableMask }) {
  if (!editableMask) return null;
  const maskId = `garment-mask-${editableMask.id}`;
  const garmentPath = editableMask.outline.map(polygonPath).join(" ");
  const collarPath = editableMask.exclude.map(({ polygon }) => polygonPath(polygon)).join(" ");
  return (
    <svg className="pointer-events-none absolute inset-0 z-20 size-full" viewBox="0 0 1 1" preserveAspectRatio="none" role="presentation" aria-hidden="true">
      <defs><mask id={maskId}><rect width="1" height="1" fill="white" /><path d={garmentPath} fill="black" /><path d={collarPath} fill="white" /></mask></defs>
      <rect width="1" height="1" fill="var(--muted)" mask={`url(#${maskId})`} />
    </svg>
  );
}
