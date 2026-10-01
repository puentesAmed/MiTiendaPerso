import { classifyTshirtScene } from "./tshirtGeometryRegions.js";

const CLASSIFIERS = Object.freeze({
  "tshirt-web-v1": classifyTshirtScene,
});

export function classifyGeometryRegions(classifierId, scene) {
  if (!classifierId) return null;
  const classifier = CLASSIFIERS[classifierId];
  if (!classifier) throw new Error(`Clasificador geométrico no registrado: ${classifierId}.`);
  return classifier(scene);
}
