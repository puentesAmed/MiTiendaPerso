const polygon = (points) => Object.freeze(points.map((point) => Object.freeze(point)));
const FULL_RECT = Object.freeze({ x: 0, y: 0, width: 1, height: 1 });

// Generated from classified UV triangles. Three clips with exact triangle indices;
// these reduced contours only present the real panel shape in the editor.
const FRONT_PANEL = polygon([[0, 0.3612], [0.0349, 0.0811], [0.0953, 0.0587], [0.2031, 0.0285], [0.3133, 0], [0.6867, 0], [0.81, 0.0319], [0.9181, 0.0632], [0.9651, 0.0811], [1, 0.3611], [0.9905, 1], [0.0096, 1]]);
const BACK_PANEL = polygon([[0, 0.3664], [0.0182, 0.0726], [0.0981, 0.0468], [0.1879, 0.0257], [0.3021, 0], [0.6979, 0], [0.8558, 0.0355], [0.9244, 0.0533], [0.9817, 0.0726], [1, 0.3664], [0.9905, 1], [0.0095, 1]]);
const LEFT_SLEEVE_PANEL = polygon([[0, 0.6181], [0.338, 0.1224], [0.3679, 0.0829], [0.4065, 0.044], [0.4501, 0.0152], [0.4961, 0.001], [0.5079, 0], [0.555, 0.008], [0.6116, 0.0422], [0.6565, 0.0867], [0.697, 0.1425], [1, 0.6181], [0.9446, 0.9999], [0.644, 1], [0.0554, 0.9999]]);
const RIGHT_SLEEVE_PANEL = polygon([[0, 0.6177], [0.3387, 0.1215], [0.3773, 0.0722], [0.428, 0.0276], [0.4842, 0.0023], [0.5079, 0], [0.5666, 0.0129], [0.6271, 0.0557], [0.6681, 0.1011], [0.7061, 0.1569], [1, 0.6177], [0.9446, 0.9993], [0.5311, 1], [0.0554, 0.9993]]);
const FRONT_GUIDE = polygon([[0.127267, 0.180663], [0.150868, 0.16098], [0.188118, 0.142121], [0.359998, 0.089525], [0.654643, 0.090717], [0.820517, 0.141359], [0.852267, 0.156491], [0.886287, 0.183033], [0.800819, 0.91346], [0.209673, 0.916112]]);
const BACK_GUIDE = polygon([[0.125538, 0.182221], [0.185569, 0.143538], [0.367836, 0.087587], [0.646482, 0.088884], [0.825612, 0.143939], [0.855069, 0.158572], [0.888269, 0.183327], [0.803449, 0.917077], [0.706004, 0.924379], [0.275433, 0.926357], [0.206574, 0.920223]]);
const FRONT_NECK = polygon([[0.359783, 0.093509], [0.361187, 0.088567], [0.387084, 0.07411], [0.626547, 0.076206], [0.653305, 0.089909], [0.654842, 0.094735], [0.638797, 0.114798], [0.60751, 0.129897], [0.565701, 0.140562], [0.506807, 0.145168], [0.455759, 0.141352], [0.406079, 0.129059], [0.37524, 0.11387]]);
const BACK_NECK = polygon([[0.361274, 0.08846], [0.392759, 0.073549], [0.621256, 0.075285], [0.651337, 0.089262], [0.506774, 0.10014], [0.430372, 0.097136]]);

const uvRect = (uMin, uMax, vMin, vMax, flipU = false) => Object.freeze({ uMin, uMax, vMin, vMax, flipU, flipV: true });
const region = (id, label, editorPolygon, target, mapping) => Object.freeze({
  id, label, editorPolygon, editorRect: FULL_RECT, target: Object.freeze(target), uvMapping: mapping, geometryRegionId: id,
});

const DEFINITIONS = Object.freeze({
  front: Object.freeze({ surfaceId: "tshirt-front", polygon: FRONT_PANEL, guideOutline: FRONT_GUIDE, neckContour: FRONT_NECK, region: region("front", "Panel frontal", FRONT_PANEL, { meshName: "TShirtWebMesh_1", materialName: "TShirtFrontPrintable" }, uvRect(0.130453, 0.525539, 0.055422, 0.598459)) }),
  back: Object.freeze({ surfaceId: "tshirt-back", polygon: BACK_PANEL, guideOutline: BACK_GUIDE, neckContour: BACK_NECK, region: region("back", "Panel trasero", BACK_PANEL, { meshName: "TShirtWebMesh_2", materialName: "TShirtBackPrintable" }, uvRect(0.5934, 0.988417, 0.070874, 0.618407, true)) }),
  "sleeve-left": Object.freeze({ surfaceId: "tshirt-sleeve-left", polygon: LEFT_SLEEVE_PANEL, region: region("sleeve-left", "Manga izquierda", LEFT_SLEEVE_PANEL, { meshName: "TShirtWebMesh", materialName: "TShirtFabric" }, uvRect(0.655071, 0.960998, 0.636028, 0.792813)) }),
  "sleeve-right": Object.freeze({ surfaceId: "tshirt-sleeve-right", polygon: RIGHT_SLEEVE_PANEL, region: region("sleeve-right", "Manga derecha", RIGHT_SLEEVE_PANEL, { meshName: "TShirtWebMesh", materialName: "TShirtFabric" }, uvRect(0.071683, 0.37761, 0.659637, 0.816522, true)) }),
});

function calibration(definition) {
  const shape = Object.freeze({ id: definition.region.id, label: definition.region.label, polygon: definition.polygon });
  return Object.freeze({
    guide: Object.freeze({ source: "orthographic XY projection from tshirt-web.glb", outline: Object.freeze([definition.guideOutline || definition.polygon]), neckContour: definition.neckContour || null }),
    mask: Object.freeze({ id: definition.surfaceId, source: "classified UV triangles from tshirt-web.glb; frontend/scripts/derive-tshirt-surface-calibration.mjs", include: Object.freeze([shape]), exclude: Object.freeze([]), outline: Object.freeze([definition.polygon]) }),
    regions: Object.freeze([definition.region]),
  });
}

export const TSHIRT_SURFACE_CALIBRATION = Object.freeze({
  revision: 2,
  sourceModel: "tshirt-web.glb",
  atlasSize: 2048,
  front: calibration(DEFINITIONS.front),
  back: calibration(DEFINITIONS.back),
  "sleeve-left": calibration(DEFINITIONS["sleeve-left"]),
  "sleeve-right": calibration(DEFINITIONS["sleeve-right"]),
});

function pointInPolygon(point, points) {
  let inside = false;
  for (let index = 0, previous = points.length - 1; index < points.length; previous = index, index += 1) {
    const [x, y] = points[index];
    const [previousX, previousY] = points[previous];
    if ((y > point.y) !== (previousY > point.y) && point.x < ((previousX - x) * (point.y - y)) / (previousY - y) + x) inside = !inside;
  }
  return inside;
}

export function editableMaskContains(maskDefinition, point) {
  const included = maskDefinition.include.some((shape) => pointInPolygon(point, shape.polygon));
  return included && !maskDefinition.exclude.some((shape) => pointInPolygon(point, shape.polygon));
}

export function editorialToUvPoint(point, regionDefinition) {
  const { editorRect, uvMapping } = regionDefinition;
  const localX = (point.x - editorRect.x) / editorRect.width;
  const localY = (point.y - editorRect.y) / editorRect.height;
  return {
    u: uvMapping.flipU ? uvMapping.uMax - localX * (uvMapping.uMax - uvMapping.uMin) : uvMapping.uMin + localX * (uvMapping.uMax - uvMapping.uMin),
    v: uvMapping.flipV ? uvMapping.vMax - localY * (uvMapping.vMax - uvMapping.vMin) : uvMapping.vMin + localY * (uvMapping.vMax - uvMapping.vMin),
  };
}

export function editorialPointToGarmentRegions(calibrationDefinition, point) {
  if (!editableMaskContains(calibrationDefinition.mask, point)) return [];
  return calibrationDefinition.regions
    .filter((regionDefinition) => pointInPolygon(point, regionDefinition.editorPolygon))
    .map((regionDefinition) => Object.freeze({ regionId: regionDefinition.id, uv: editorialToUvPoint(point, regionDefinition) }));
}

export function uvToEditorialPoint(point, regionDefinition) {
  const { editorRect, uvMapping } = regionDefinition;
  const localX = uvMapping.flipU ? (uvMapping.uMax - point.u) / (uvMapping.uMax - uvMapping.uMin) : (point.u - uvMapping.uMin) / (uvMapping.uMax - uvMapping.uMin);
  const localY = uvMapping.flipV ? (uvMapping.vMax - point.v) / (uvMapping.vMax - uvMapping.vMin) : (point.v - uvMapping.vMin) / (uvMapping.vMax - uvMapping.vMin);
  return { x: editorRect.x + localX * editorRect.width, y: editorRect.y + localY * editorRect.height };
}

export function uvRectToAtlasPixels(uvMapping, atlasSize) {
  return { x: uvMapping.uMin * atlasSize, y: (1 - uvMapping.vMax) * atlasSize, width: (uvMapping.uMax - uvMapping.uMin) * atlasSize, height: (uvMapping.vMax - uvMapping.vMin) * atlasSize };
}
