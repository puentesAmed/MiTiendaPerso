import path from "node:path";
import { fileURLToPath } from "node:url";

const MOCKUP_ASSET_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "assets");
const ALIGNMENTS = new Set(["top_left", "top_center", "top_right", "center_left", "center", "center_right", "bottom_left", "bottom_center", "bottom_right"]);
const SCALE_MODES = new Set(["fit", "fill", "stretch", "none"]);

const manifests = Object.freeze({
  "mug-white-basic-v1": Object.freeze({
    schemaVersion: 1,
    revision: 1,
    mockupId: "mug-white-basic-v1",
    kind: "development",
    templateId: "mug-ceramic-standard-v1",
    template: Object.freeze({ assetId: "mug-white-basic-v1", filename: "mug-white-basic-v1.png" }),
    sourceViewId: "wrap",
    placement: Object.freeze({
      bbox: Object.freeze([210, 300, 690, 900]),
      width: 600,
      height: 480,
      rotation: 0,
      center: Object.freeze([600, 450]),
      alignment: "center",
      scaleMode: "fit",
    }),
    output: Object.freeze({ format: "png", sizeMode: "template", quality: null }),
  }),
});

export function validateMockupManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== "object") return { valid: false, errors: ["manifest ausente"] };
  if (manifest.schemaVersion !== 1) errors.push("schemaVersion no soportado");
  if (!Number.isInteger(manifest.revision) || manifest.revision < 1) errors.push("revision inválida");
  if (typeof manifest.mockupId !== "string" || !manifest.mockupId) errors.push("mockupId inválido");
  if (typeof manifest.templateId !== "string" || !manifest.templateId) errors.push("templateId inválido");
  if (typeof manifest.sourceViewId !== "string" || !manifest.sourceViewId) errors.push("sourceViewId inválido");
  if (!manifest.template || typeof manifest.template.filename !== "string" || !/^[a-z0-9][a-z0-9-]*\.png$/.test(manifest.template.filename)) errors.push("template registrado inválido");
  const placement = manifest.placement || {};
  if (!Array.isArray(placement.bbox) || placement.bbox.length !== 4 || placement.bbox.some((value) => !Number.isInteger(value) || value < 0) || placement.bbox?.[2] <= placement.bbox?.[0] || placement.bbox?.[3] <= placement.bbox?.[1]) errors.push("bbox inválido");
  if (!Number.isInteger(placement.width) || placement.width <= 0 || !Number.isInteger(placement.height) || placement.height <= 0) errors.push("width/height inválidos");
  if (typeof placement.rotation !== "number" || !Number.isFinite(placement.rotation)) errors.push("rotation inválida");
  if (!Array.isArray(placement.center) || placement.center.length !== 2 || placement.center.some((value) => !Number.isFinite(value))) errors.push("center inválido");
  if (!ALIGNMENTS.has(placement.alignment)) errors.push("alignment inválido");
  if (!SCALE_MODES.has(placement.scaleMode)) errors.push("scaleMode inválido");
  if (manifest.output?.format !== "png" || manifest.output?.sizeMode !== "template") errors.push("output inválido");
  return { valid: errors.length === 0, errors };
}

export function getMockupManifest({ templateId, mockupId, sourceViewId }) {
  const manifest = manifests[mockupId];
  if (!manifest || manifest.templateId !== templateId || manifest.sourceViewId !== sourceViewId) return null;
  const validation = validateMockupManifest(manifest);
  if (!validation.valid) throw new Error(`MockupManifest inválido: ${validation.errors.join(", ")}`);
  return manifest;
}

export function resolveMockupTemplatePath(manifest) {
  const resolved = path.resolve(MOCKUP_ASSET_ROOT, manifest.template.filename);
  const relative = path.relative(MOCKUP_ASSET_ROOT, resolved);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Template fuera del registry permitido");
  return resolved;
}

export const mockupRegistry = manifests;

