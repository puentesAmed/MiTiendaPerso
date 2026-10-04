import { createHash } from "node:crypto";

import { Customization } from "../models/Customization.js";
import { getProductionTemplate } from "../production/template-catalog.js";
import { readPngDimensions } from "../production/png.js";
import { buildPlacementMetadata } from "../production/placement-contract.js";
import { storageProvider } from "../storage/index.js";
import { generateCustomizationZip } from "../utils/generateCustomizationZip.js";
import { validateAssetQuality } from "./image-quality.service.js";

const UPLOAD_ID = /^[0-9a-f-]{36}$/i;
const ALLOWED_ASSET_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);

function detectImageMime(bytes) {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

export class ProductionCustomizationError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "ProductionCustomizationError";
    this.status = status;
  }
}

function assertNoLocalReferences(document) {
  const serialized = JSON.stringify(document);
  if (/\bblob:/i.test(serialized) || /data:image\//i.test(serialized)) {
    throw new ProductionCustomizationError("DesignDocument contiene referencias locales no persistentes");
  }
  const forbiddenKeys = new Set(["fabric", "fabricJson", "previewImage", "mockups", "png", "zoom", "selection", "viewport"]);
  const pending = [document];
  while (pending.length) {
    const value = pending.pop();
    if (!value || typeof value !== "object") continue;
    for (const [key, child] of Object.entries(value)) {
      if (forbiddenKeys.has(key)) throw new ProductionCustomizationError(`DesignDocument no puede contener ${key}`);
      pending.push(child);
    }
  }
}

function assertSameVariant(documentVariant, lineVariant) {
  for (const key of ["size", "color"]) {
    if ((documentVariant?.[key] || null) !== (lineVariant?.[key] || null)) {
      throw new ProductionCustomizationError(`La variante del diseño no coincide (${key})`);
    }
  }
}

function sameSelection(left, right) {
  return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((surfaceId, index) => surfaceId === right[index]);
}

function safeAssetFilename(assetId, mimeType) {
  const extension = mimeType === "image/png" ? "png" : mimeType === "image/jpeg" ? "jpg" : "webp";
  return `${createHash("sha256").update(assetId).digest("hex")}.${extension}`;
}

async function readUpload(uploadId) {
  if (!UPLOAD_ID.test(uploadId || "")) throw new ProductionCustomizationError("Referencia de upload inválida");
  const key = `designer-v2/staging/${uploadId}`;
  if (!(await storageProvider.exists(key))) throw new ProductionCustomizationError("Falta un artifact persistente del diseño");
  return storageProvider.read(key);
}

export async function createProductionCustomization({ owner, product, line, payload, orderId, orderItemId }) {
  const document = payload?.designDocument;
  if (payload?.schemaVersion !== 2 || !document || document.schemaVersion !== 1) {
    throw new ProductionCustomizationError("Customization V2 o DesignDocument no soportado");
  }
  const template = getProductionTemplate(product.productTemplateId);
  if (!template) throw new ProductionCustomizationError("Producto sin template productivo soportado");
  if (String(document.productId) !== String(product._id)) throw new ProductionCustomizationError("El producto del diseño no coincide");
  if (document.templateId !== template.templateId) throw new ProductionCustomizationError("El template del diseño no coincide");
  if (document.templateRevision !== template.templateRevision) throw new ProductionCustomizationError("La revisión del template no es compatible");
  if (!document.documentId || !document.views || !document.assets) throw new ProductionCustomizationError("DesignDocument incompleto");
  assertNoLocalReferences(document);
  assertSameVariant(document.variant, line.variant);

  const authoritativeSurfaceIds = line.customizationPricing?.selectedSurfaceIds || null;
  const payloadSurfaceIds = payload?.selectedSurfaceIds;
  const documentSurfaceIds = document.selectedSurfaceIds;
  if (authoritativeSurfaceIds) {
    if (!sameSelection(documentSurfaceIds, authoritativeSurfaceIds) || !sameSelection(payloadSurfaceIds, authoritativeSurfaceIds)) {
      throw new ProductionCustomizationError("La selección de superficies no coincide con el precio autorizado");
    }
  } else if (payloadSurfaceIds != null || documentSurfaceIds != null) {
    throw new ProductionCustomizationError("La selección de superficies no tiene pricing autorizado");
  }
  const selectedSurfaces = authoritativeSurfaceIds
    ? template.surfaces.filter((surface) => authoritativeSurfaceIds.includes(surface.surfaceId))
    : template.surfaces;

  const actualViews = Object.keys(document.views).sort();
  const expectedViews = selectedSurfaces.map((item) => item.viewId).sort();
  if (JSON.stringify(actualViews) !== JSON.stringify(expectedViews)) {
    throw new ProductionCustomizationError("Las superficies del diseño no coinciden con el template");
  }
  for (const viewId of expectedViews) {
    if (!Array.isArray(document.views[viewId]?.elements)) throw new ProductionCustomizationError(`Vista inválida: ${viewId}`);
    for (const element of document.views[viewId].elements) {
      if (!["x", "y", "width", "height", "rotation", "opacity", "zIndex"].every((field) => Number.isFinite(element?.[field]))) {
        throw new ProductionCustomizationError(`La vista ${viewId} contiene coordenadas de dominio inválidas`);
      }
      if (element?.type === "image" && (!element.assetId || !document.assets[element.assetId])) {
        throw new ProductionCustomizationError(`La vista ${viewId} referencia un asset inexistente`);
      }
    }
  }

  const customization = new Customization({
    schemaVersion: 2,
    clientDocumentId: document.documentId,
    userId: owner.userId,
    guestId: owner.guestId,
    productId: product._id,
    orderId,
    orderItemId,
    productSnapshot: {
      name: product.name,
      sku: null,
      productTemplateId: template.templateId,
      templateRevision: template.templateRevision,
    },
    variant: line.variant || null,
    quantity: line.quantity,
    selectedSurfaceIds: authoritativeSurfaceIds || [],
    customizationPricing: line.customizationPricing || null,
    productionStatus: "pending",
    productionStatusUpdatedAt: new Date(),
  });
  const id = customization._id.toString();
  const frozenDocument = structuredClone(document);
  const persistedKeys = [];
  const consumedUploads = new Set();

  try {
    for (const [assetId, metadata] of Object.entries(frozenDocument.assets)) {
      const quality = validateAssetQuality(metadata);
      if (!quality.valid) throw new ProductionCustomizationError(`Calidad de imagen no válida: ${assetId}`);
      const uploadId = payload?.uploads?.assets?.[assetId];
      if (!uploadId || !ALLOWED_ASSET_MIME.has(metadata?.mimeType)) {
        throw new ProductionCustomizationError(`Asset no persistido o MIME inválido: ${assetId}`);
      }
      const bytes = await readUpload(uploadId);
      consumedUploads.add(uploadId);
      const detectedMime = detectImageMime(bytes);
      if (detectedMime !== metadata.mimeType) throw new ProductionCustomizationError(`El contenido del asset no coincide con su MIME: ${assetId}`);
      if (Number.isFinite(metadata.sizeBytes) && metadata.sizeBytes !== bytes.length) throw new ProductionCustomizationError(`El tamaño del asset no coincide: ${assetId}`);
      if (detectedMime === "image/png") {
        const dimensions = readPngDimensions(bytes);
        if (dimensions.width !== metadata.widthPx || dimensions.height !== metadata.heightPx) {
          throw new ProductionCustomizationError(`Las dimensiones del asset no coinciden: ${assetId}`);
        }
      }
      const filename = safeAssetFilename(assetId, metadata.mimeType);
      const storageKey = `customizations/${id}/assets/${filename}`;
      await storageProvider.save(storageKey, bytes);
      persistedKeys.push(storageKey);
      frozenDocument.assets[assetId] = { ...metadata, storageKey };
    }

    const productionSurfaces = [];
    for (const expected of selectedSurfaces) {
      const uploadId = payload?.uploads?.surfaces?.[expected.viewId]?.artworkUploadId;
      const proofUploadId = payload?.uploads?.surfaces?.[expected.viewId]?.proofUploadId;
      const bytes = await readUpload(uploadId);
      const proofBytes = await readUpload(proofUploadId);
      consumedUploads.add(uploadId);
      consumedUploads.add(proofUploadId);
      const dimensions = readPngDimensions(bytes);
      const proofDimensions = readPngDimensions(proofBytes);
      if (dimensions.width !== expected.widthPx || dimensions.height !== expected.heightPx) {
        throw new ProductionCustomizationError(`Resolución productiva inválida para ${expected.viewId}`);
      }
      const artworkKey = `customizations/${id}/production/${expected.filename}`;
      const previewKey = `customizations/${id}/previews/${expected.filename}`;
      const proofFilename = `${expected.viewId}-placement.png`;
      const proofKey = `customizations/${id}/proofs/${proofFilename}`;
      const placementFilename = `${expected.viewId}.json`;
      const placementKey = `customizations/${id}/placement/${placementFilename}`;
      const placement = buildPlacementMetadata({ document: frozenDocument, template, surface: expected });
      await storageProvider.save(artworkKey, bytes);
      await storageProvider.save(previewKey, bytes);
      await storageProvider.save(proofKey, proofBytes);
      await storageProvider.save(placementKey, Buffer.from(JSON.stringify(placement, null, 2)));
      persistedKeys.push(artworkKey, previewKey, proofKey, placementKey);
      productionSurfaces.push({
        viewId: expected.viewId,
        surfaceId: expected.surfaceId,
        label: expected.label,
        artwork: { storageKey: artworkKey, filename: expected.filename, mimeType: "image/png", widthPx: dimensions.width, heightPx: dimensions.height },
        preview: { storageKey: previewKey, filename: expected.filename, mimeType: "image/png", widthPx: dimensions.width, heightPx: dimensions.height },
        placementProof: { storageKey: proofKey, filename: proofFilename, mimeType: "image/png", widthPx: proofDimensions.width, heightPx: proofDimensions.height },
        placementMetadata: { storageKey: placementKey, filename: placementFilename, mimeType: "application/json", schemaVersion: placement.schemaVersion },
      });
    }

    customization.designDocument = frozenDocument;
    customization.productionSurfaces = productionSurfaces;
    customization.previewImage = `/api/customizations/${id}/surfaces/${template.primaryViewId}/preview`;
    await customization.save();
    try {
      await generateCustomizationZip(customization);
    } catch {
      customization.productionStatus = "issue";
      customization.productionStatusUpdatedAt = new Date();
      customization.productionError = "No se pudo generar el bundle productivo";
      await customization.save();
    }
    await Promise.all([...consumedUploads].map((uploadId) => storageProvider.delete(`designer-v2/staging/${uploadId}`).catch(() => {})));
    return customization;
  } catch (error) {
    await Promise.all(persistedKeys.map((key) => storageProvider.delete(key).catch(() => {})));
    if (!customization.isNew) {
      customization.productionStatus = "issue";
      customization.productionStatusUpdatedAt = new Date();
      customization.productionError = "No se pudieron generar los artifacts productivos";
      await customization.save().catch(() => {});
    }
    throw error;
  }
}
