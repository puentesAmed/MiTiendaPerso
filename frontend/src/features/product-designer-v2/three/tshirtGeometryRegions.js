const PANEL_BOUNDS = Object.freeze({
  front: Object.freeze({ uMin: 0.130453, uMax: 0.525539, vMin: 0.401541, vMax: 0.944578 }),
  back: Object.freeze({ uMin: 0.5934, uMax: 0.988417, vMin: 0.381593, vMax: 0.929126 }),
  "sleeve-left": Object.freeze({ uMin: 0.655071, uMax: 0.960998, vMin: 0.207187, vMax: 0.363972 }),
  "sleeve-right": Object.freeze({ uMin: 0.071683, uMax: 0.37761, vMin: 0.183478, vMax: 0.340363 }),
});

const PANEL_IDS = Object.freeze(Object.keys(PANEL_BOUNDS));
const COLLAR_BOUNDS = Object.freeze([
  Object.freeze({ uMin: 0.42805, uMax: 0.622127, vMin: 0.293283, vMax: 0.340255 }),
  Object.freeze({ uMin: 0.460879, uMax: 0.589298, vMin: 0.221149, vMax: 0.260369 }),
]);
const EPSILON = 0.000002;

function triangleIndex(geometry) {
  const position = geometry.getAttribute("position");
  if (!position) throw new Error("La geometría no contiene posiciones.");
  return geometry.index
    ? Array.from(geometry.index.array)
    : Array.from({ length: position.count }, (_, index) => index);
}

function boundsContain(outer, inner) {
  return inner.uMin >= outer.uMin - EPSILON && inner.uMax <= outer.uMax + EPSILON
    && inner.vMin >= outer.vMin - EPSILON && inner.vMax <= outer.vMax + EPSILON;
}

export function deriveConnectedFaceComponents(geometry) {
  const indices = triangleIndex(geometry);
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  const uv = geometry.getAttribute("uv");
  if (!normal || !uv) throw new Error("La geometría de camiseta necesita normal y UV.");
  const trianglesByVertex = Array.from({ length: position.count }, () => []);
  for (let offset = 0; offset < indices.length; offset += 3) {
    const triangle = offset / 3;
    trianglesByVertex[indices[offset]].push(triangle);
    trianglesByVertex[indices[offset + 1]].push(triangle);
    trianglesByVertex[indices[offset + 2]].push(triangle);
  }

  const geometryBounds = { xMin: Infinity, xMax: -Infinity, zMin: Infinity, zMax: -Infinity };
  for (let index = 0; index < position.count; index += 1) {
    geometryBounds.xMin = Math.min(geometryBounds.xMin, position.getX(index));
    geometryBounds.xMax = Math.max(geometryBounds.xMax, position.getX(index));
    geometryBounds.zMin = Math.min(geometryBounds.zMin, position.getZ(index));
    geometryBounds.zMax = Math.max(geometryBounds.zMax, position.getZ(index));
  }
  const centerX = (geometryBounds.xMin + geometryBounds.xMax) / 2;
  const centerZ = (geometryBounds.zMin + geometryBounds.zMax) / 2;
  const visited = new Uint8Array(indices.length / 3);
  const components = [];

  for (let seed = 0; seed < visited.length; seed += 1) {
    if (visited[seed]) continue;
    const stack = [seed];
    const triangleIndices = [];
    const vertexIndices = new Set();
    visited[seed] = 1;
    while (stack.length) {
      const triangle = stack.pop();
      triangleIndices.push(triangle);
      for (let corner = 0; corner < 3; corner += 1) {
        const vertex = indices[triangle * 3 + corner];
        vertexIndices.add(vertex);
        for (const adjacent of trianglesByVertex[vertex]) {
          if (!visited[adjacent]) {
            visited[adjacent] = 1;
            stack.push(adjacent);
          }
        }
      }
    }

    const uvBounds = { uMin: Infinity, uMax: -Infinity, vMin: Infinity, vMax: -Infinity };
    let outwardScore = 0;
    for (const vertex of vertexIndices) {
      const x = position.getX(vertex) - centerX;
      const z = position.getZ(vertex) - centerZ;
      const length = Math.hypot(x, z) || 1;
      outwardScore += normal.getX(vertex) * (x / length) + normal.getZ(vertex) * (z / length);
      uvBounds.uMin = Math.min(uvBounds.uMin, uv.getX(vertex));
      uvBounds.uMax = Math.max(uvBounds.uMax, uv.getX(vertex));
      uvBounds.vMin = Math.min(uvBounds.vMin, uv.getY(vertex));
      uvBounds.vMax = Math.max(uvBounds.vMax, uv.getY(vertex));
    }
    components.push(Object.freeze({
      id: components.length,
      triangleIndices: Object.freeze(triangleIndices),
      vertexCount: vertexIndices.size,
      uvBounds: Object.freeze(uvBounds),
      uvArea: (uvBounds.uMax - uvBounds.uMin) * (uvBounds.vMax - uvBounds.vMin),
      outwardScore: outwardScore / vertexIndices.size,
    }));
  }
  return Object.freeze(components);
}

function classifyFabricComponent(component) {
  const candidate = PANEL_IDS.find((panelId) => boundsContain(PANEL_BOUNDS[panelId], component.uvBounds));
  if (!candidate) return { excluded: COLLAR_BOUNDS.some((bounds) => boundsContain(bounds, component.uvBounds)) ? "collar" : "detail" };
  if (component.uvArea <= 0.000001) return { excluded: "seam" };
  if (component.outwardScore <= 0) return { excluded: "interior" };
  return { panelId: candidate };
}

function allTriangles(geometry) {
  const count = (geometry.index?.count ?? geometry.getAttribute("position").count) / 3;
  return Object.freeze(Array.from({ length: count }, (_, index) => index));
}

export function classifyTshirtScene(scene) {
  const fabric = scene.getObjectByName("TShirtWebMesh");
  const front = scene.getObjectByName("TShirtWebMesh_1");
  const back = scene.getObjectByName("TShirtWebMesh_2");
  if (!fabric?.geometry || !front?.geometry || !back?.geometry) throw new Error("El GLB no contiene los tres meshes esperados de camiseta.");

  const regions = Object.fromEntries(PANEL_IDS.map((panelId) => [panelId, []]));
  regions.front.push(Object.freeze({ meshName: front.name, triangleIndices: allTriangles(front.geometry), source: "printable-material" }));
  regions.back.push(Object.freeze({ meshName: back.name, triangleIndices: allTriangles(back.geometry), source: "printable-material" }));
  const exclusions = [];
  for (const component of deriveConnectedFaceComponents(fabric.geometry)) {
    const classification = classifyFabricComponent(component);
    if (classification.panelId) {
      regions[classification.panelId].push(Object.freeze({ meshName: fabric.name, triangleIndices: component.triangleIndices, componentId: component.id, source: "connected-exterior" }));
    } else {
      exclusions.push(Object.freeze({ meshName: fabric.name, triangleIndices: component.triangleIndices, componentId: component.id, reason: classification.excluded }));
    }
  }
  return Object.freeze({
    regions: Object.freeze(Object.fromEntries(PANEL_IDS.map((panelId) => [panelId, Object.freeze(regions[panelId])]))),
    exclusions: Object.freeze(exclusions),
  });
}

export function resolveRegionTriangles(classification, meshName, panelId) {
  return classification.regions[panelId]
    ?.filter((entry) => entry.meshName === meshName)
    .flatMap((entry) => entry.triangleIndices) ?? [];
}

function triangleOrientationDot(geometry, indices, triangle) {
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  const first = indices[triangle * 3];
  const second = indices[triangle * 3 + 1];
  const third = indices[triangle * 3 + 2];
  const abX = position.getX(second) - position.getX(first);
  const abY = position.getY(second) - position.getY(first);
  const abZ = position.getZ(second) - position.getZ(first);
  const acX = position.getX(third) - position.getX(first);
  const acY = position.getY(third) - position.getY(first);
  const acZ = position.getZ(third) - position.getZ(first);
  const geometricX = abY * acZ - abZ * acY;
  const geometricY = abZ * acX - abX * acZ;
  const geometricZ = abX * acY - abY * acX;
  const geometricLength = Math.hypot(geometricX, geometricY, geometricZ);
  if (!geometricLength) return 1;
  const normalX = (normal.getX(first) + normal.getX(second) + normal.getX(third)) / 3;
  const normalY = (normal.getY(first) + normal.getY(second) + normal.getY(third)) / 3;
  const normalZ = (normal.getZ(first) + normal.getZ(second) + normal.getZ(third)) / 3;
  return (geometricX * normalX + geometricY * normalY + geometricZ * normalZ) / geometricLength;
}

export function analyzeTriangleOrientation(geometry, triangleIndices) {
  const indices = triangleIndex(geometry);
  const inconsistentTriangles = triangleIndices.filter((triangle) => triangleOrientationDot(geometry, indices, triangle) < 0);
  return Object.freeze({ total: triangleIndices.length, inconsistentTriangles: Object.freeze(inconsistentTriangles) });
}

export function createFaceSubsetGeometry(geometry, triangleIndices) {
  const sourceIndices = triangleIndex(geometry);
  const selectedIndices = triangleIndices.flatMap((triangle) => {
    const selected = sourceIndices.slice(triangle * 3, triangle * 3 + 3);
    if (triangleOrientationDot(geometry, sourceIndices, triangle) < 0) [selected[1], selected[2]] = [selected[2], selected[1]];
    return selected;
  });
  const subset = geometry.clone();
  subset.setIndex(selectedIndices);
  subset.clearGroups();
  subset.computeBoundingBox();
  subset.computeBoundingSphere();
  return subset;
}

export const TSHIRT_PANEL_BOUNDS = PANEL_BOUNDS;
