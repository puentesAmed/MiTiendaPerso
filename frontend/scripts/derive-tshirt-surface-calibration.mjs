import { readFile } from "node:fs/promises";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { analyzeTriangleOrientation, classifyTshirtScene, TSHIRT_PANEL_BOUNDS } from "../src/features/product-designer-v2/three/tshirtGeometryRegions.js";

const MODEL_URL = new URL("../public/models/tshirt-web.glb", import.meta.url);
const GARMENT_BOUNDS = Object.freeze({ xMin: -0.1220520213, xMax: 0.1193298697, yMin: 0.3928181827, yMax: 0.6724150181 });
const COLLAR_UV = Object.freeze({ front: [0.42805, 0.622127, 0.293283, 0.340255], back: [0.460879, 0.589298, 0.221149, 0.260369] });

function convexHull(points) {
  const unique = [...new Map(points.map((point) => [point.join(":"), point])).values()].sort((first, second) => first[0] - second[0] || first[1] - second[1]);
  const cross = (origin, first, second) => (first[0] - origin[0]) * (second[1] - origin[1]) - (first[1] - origin[1]) * (second[0] - origin[0]);
  const half = (values) => {
    const result = [];
    for (const point of values) {
      while (result.length >= 2 && cross(result.at(-2), result.at(-1), point) <= 0) result.pop();
      result.push(point);
    }
    return result;
  };
  return [...half(unique).slice(0, -1), ...half([...unique].reverse()).slice(0, -1)];
}

function simplifyClosed(points, tolerance = 0.003) {
  const squaredTolerance = tolerance ** 2;
  const distanceToSegment = (point, start, end) => {
    let x = start[0];
    let y = start[1];
    let dx = end[0] - x;
    let dy = end[1] - y;
    if (dx || dy) {
      const ratio = ((point[0] - x) * dx + (point[1] - y) * dy) / (dx * dx + dy * dy);
      if (ratio > 1) { x = end[0]; y = end[1]; } else if (ratio > 0) { x += dx * ratio; y += dy * ratio; }
    }
    dx = point[0] - x;
    dy = point[1] - y;
    return dx * dx + dy * dy;
  };
  const simplify = (values) => {
    let maximum = squaredTolerance;
    let split = 0;
    for (let index = 1; index < values.length - 1; index += 1) {
      const distance = distanceToSegment(values[index], values[0], values.at(-1));
      if (distance > maximum) { maximum = distance; split = index; }
    }
    if (!split) return [values[0], values.at(-1)];
    return [...simplify(values.slice(0, split + 1)).slice(0, -1), ...simplify(values.slice(split))];
  };
  return simplify([...points, points[0]]).slice(0, -1);
}

function projectedPoint(position, index) {
  const modelAspect = (GARMENT_BOUNDS.xMax - GARMENT_BOUNDS.xMin) / (GARMENT_BOUNDS.yMax - GARMENT_BOUNDS.yMin);
  const height = (754 / 1024) / modelAspect;
  return [
    (position.getX(index) - GARMENT_BOUNDS.xMin) / (GARMENT_BOUNDS.xMax - GARMENT_BOUNDS.xMin),
    (1 - height) / 2 + ((GARMENT_BOUNDS.yMax - position.getY(index)) / (GARMENT_BOUNDS.yMax - GARMENT_BOUNDS.yMin)) * height,
  ].map((value) => Number(value.toFixed(6)));
}

function projectedHull(geometry, triangleIndices) {
  const position = geometry.getAttribute("position");
  const indices = geometry.index.array;
  const points = triangleIndices.flatMap((triangle) => [0, 1, 2].map((corner) => projectedPoint(position, indices[triangle * 3 + corner])));
  return simplifyClosed(convexHull(points));
}

function collarHull(geometry, bounds) {
  const position = geometry.getAttribute("position");
  const uv = geometry.getAttribute("uv");
  const points = [];
  for (let index = 0; index < uv.count; index += 1) {
    const u = uv.getX(index);
    const v = uv.getY(index);
    if (u >= bounds[0] && u <= bounds[1] && v >= bounds[2] && v <= bounds[3]) points.push(projectedPoint(position, index));
  }
  return simplifyClosed(convexHull(points));
}

async function loadModel() {
  globalThis.ProgressEvent ||= class ProgressEvent {};
  globalThis.self ||= globalThis;
  globalThis.createImageBitmap ||= async () => ({ width: 1, height: 1, close() {} });
  const buffer = await readFile(MODEL_URL);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  return new Promise((resolve, reject) => new GLTFLoader().parse(arrayBuffer, "", resolve, reject));
}

const gltf = await loadModel();
const classification = classifyTshirtScene(gltf.scene);
const ownership = new Map();

function register(meshName, triangleIndices, owner) {
  for (const triangle of triangleIndices) {
    const key = `${meshName}:${triangle}`;
    const owners = ownership.get(key) || [];
    owners.push(owner);
    ownership.set(key, owners);
  }
}

const panels = Object.fromEntries(Object.entries(classification.regions).map(([panelId, entries]) => {
  entries.forEach((entry) => register(entry.meshName, entry.triangleIndices, panelId));
  const orientationCorrections = entries.reduce((total, entry) => total + analyzeTriangleOrientation(gltf.scene.getObjectByName(entry.meshName).geometry, entry.triangleIndices).inconsistentTriangles.length, 0);
  return [panelId, {
    anatomicalSide: panelId === "sleeve-left" ? "wearer left / model +X" : panelId === "sleeve-right" ? "wearer right / model -X" : null,
    uvBounds: TSHIRT_PANEL_BOUNDS[panelId],
    triangles: entries.reduce((total, entry) => total + entry.triangleIndices.length, 0),
    orientationCorrections,
    components: entries.map((entry) => ({ meshName: entry.meshName, componentId: entry.componentId ?? null, triangles: entry.triangleIndices.length, source: entry.source })),
  }];
}));

classification.exclusions.forEach((entry) => register(entry.meshName, entry.triangleIndices, `excluded:${entry.reason}`));
const meshes = ["TShirtWebMesh", "TShirtWebMesh_1", "TShirtWebMesh_2"].map((meshName) => {
  const geometry = gltf.scene.getObjectByName(meshName).geometry;
  return { meshName, triangles: (geometry.index?.count ?? geometry.getAttribute("position").count) / 3 };
});
const expectedFaces = meshes.reduce((total, mesh) => total + mesh.triangles, 0);
const orphanFaces = meshes.flatMap(({ meshName, triangles }) => Array.from({ length: triangles }, (_, triangle) => `${meshName}:${triangle}`).filter((key) => !ownership.has(key)));
const overlappingFaces = [...ownership.entries()].filter(([, owners]) => owners.length !== 1);
const fabricGeometry = gltf.scene.getObjectByName("TShirtWebMesh").geometry;
const guideContours = Object.fromEntries(["front", "back"].map((panelId) => {
  const entries = classification.regions[panelId];
  const primary = entries.find((entry) => entry.meshName !== "TShirtWebMesh");
  return [panelId, {
    outerGarmentContour: projectedHull(gltf.scene.getObjectByName(primary.meshName).geometry, primary.triangleIndices),
    neckContour: collarHull(fabricGeometry, COLLAR_UV[panelId]),
    panelSilhouette: "UV contour persisted in tshirtSurfaceCalibration.js",
  }];
}));

console.log(JSON.stringify({
  sourceModel: MODEL_URL.pathname,
  rule: "whole connected exterior components inside exact panel UV islands; no per-face normal threshold",
  panels,
  guideContours,
  exclusions: classification.exclusions.reduce((summary, entry) => ({ ...summary, [entry.reason]: (summary[entry.reason] || 0) + entry.triangleIndices.length }), {}),
  validation: { expectedFaces, classifiedFaces: ownership.size, orphanFaces: orphanFaces.length, overlappingFaces: overlappingFaces.length, valid: ownership.size === expectedFaces && orphanFaces.length === 0 && overlappingFaces.length === 0 },
}, null, 2));
