// src/utils/generateCustomizationZip.js
import { randomUUID } from "node:crypto";
import archiver from "archiver";
import axios from "axios";

import { storageProvider } from "../storage/index.js";

/** Descarga un archivo remoto y devuelve un Buffer */
async function downloadFile(url) {
  const response = await axios.get(url, { responseType: "arraybuffer" });
  return Buffer.from(response.data);
}

/** Convierte DataURL/Base64 → Buffer (soporta data:image/...;base64, y base64 pelado) */
function base64ToBuffer(input) {
  if (!input || typeof input !== "string") return null;

  const idx = input.indexOf("base64,");
  const base64 = idx !== -1 ? input.slice(idx + "base64,".length) : input;

  try {
    return Buffer.from(base64, "base64");
  } catch {
    return null;
  }
}

/**
 * CREA ZIP PROFESIONAL DE PERSONALIZACIÓN
 */
export async function generateCustomizationZip(customizationDoc) {
  const customizationId = customizationDoc._id.toString();
  const isV2 = customizationDoc.schemaVersion === 2;
  if (isV2 && customizationDoc.productionBundle?.zipStorageKey && await storageProvider.exists(customizationDoc.productionBundle.zipStorageKey)) {
    customizationDoc.zipUrl ||= `/api/customizations/${customizationId}/zip`;
    return customizationDoc.zipUrl;
  }
  const finalKey = isV2
    ? `customizations/${customizationId}/bundle.zip`
    : `customizations/${customizationId}.zip`;
  const temporaryKey = isV2
    ? `customizations/${customizationId}/.tmp-${randomUUID()}.zip`
    : `customizations/.tmp-${randomUUID()}.zip`;
  const output = await storageProvider.createWriteStream(temporaryKey);
  const archive = archiver("zip", { zlib: { level: 9 } });
  const completed = new Promise((resolve, reject) => {
    output.once("close", resolve);
    output.once("error", reject);
    archive.once("error", reject);
  });
  archive.pipe(output);

  try {
    if (isV2) {
      const manifest = buildProductionManifest(customizationDoc);
      const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2));
      const manifestStorageKey = `customizations/${customizationId}/manifest.json`;
      await storageProvider.save(manifestStorageKey, manifestBytes);
      archive.append(manifestBytes, { name: "manifest.json" });
      archive.append(JSON.stringify(customizationDoc.designDocument || {}, null, 2), {
        name: "design-document.json",
      });
      for (const surface of customizationDoc.productionSurfaces || []) {
        archive.append(await storageProvider.read(surface.artwork.storageKey), {
          name: `production/${surface.artwork.filename}`,
        });
        if (surface.preview?.storageKey) {
          archive.append(await storageProvider.read(surface.preview.storageKey), {
            name: `previews/${surface.preview.filename}`,
          });
        }
        if (surface.placementProof?.storageKey) {
          archive.append(await storageProvider.read(surface.placementProof.storageKey), {
            name: `proofs/${surface.placementProof.filename}`,
          });
        }
        if (surface.placementMetadata?.storageKey) {
          archive.append(await storageProvider.read(surface.placementMetadata.storageKey), {
            name: `placement/${surface.placementMetadata.filename}`,
          });
        }
      }
      customizationDoc.productionBundle = {
        ...(customizationDoc.productionBundle?.toObject?.() || customizationDoc.productionBundle || {}),
        manifestStorageKey,
      };
    } else {
      archive.append(JSON.stringify(customizationDoc.design || {}, null, 2), {
        name: "design.json",
      });
    }

    if (!isV2 && customizationDoc.previewImageHD) {
      const buf = base64ToBuffer(customizationDoc.previewImageHD);
      if (buf) archive.append(buf, { name: "preview.png" });
    }

    if (!isV2 && customizationDoc.previewsBySide?.front) {
      const buf = base64ToBuffer(customizationDoc.previewsBySide.front);
      if (buf) archive.append(buf, { name: "design_front.png" });
    }

    if (!isV2 && customizationDoc.previewsBySide?.back) {
      const buf = base64ToBuffer(customizationDoc.previewsBySide.back);
      if (buf) archive.append(buf, { name: "design_back.png" });
    }

    if (!isV2 && customizationDoc.mockupFront) {
      try {
        const buffer = await downloadFile(customizationDoc.mockupFront);
        archive.append(buffer, { name: "mockup_front.png" });
      } catch (err) {
        console.warn("⚠ No se pudo descargar mockupFront:", err.message);
      }
    }

    if (!isV2 && customizationDoc.mockupBack) {
      try {
        const buffer = await downloadFile(customizationDoc.mockupBack);
        archive.append(buffer, { name: "mockup_back.png" });
      } catch (err) {
        console.warn("⚠ No se pudo descargar mockupBack:", err.message);
      }
    }

    const sides = !isV2 ? customizationDoc.design?.elementsBySide || {} : {};
    const assets = [];
    for (const side of ["front", "back"]) {
      for (const element of sides[side] || []) {
        if (element?.type === "image" && element?.url) assets.push(element.url);
      }
    }

    if (assets.length) {
      archive.append("", { name: "assets/" });
      for (let index = 0; index < assets.length; index += 1) {
        try {
          const buffer = await downloadFile(assets[index]);
          archive.append(buffer, { name: `assets/image_${index + 1}.png` });
        } catch (err) {
          console.warn("⚠ Error descargando asset:", err.message);
        }
      }
    }

    await archive.finalize();
    await completed;
    await storageProvider.delete(finalKey).catch(() => {});
    await storageProvider.move(temporaryKey, finalKey);

    customizationDoc.zipUrl = `/api/customizations/${customizationId}/zip`;
    if (isV2) {
      customizationDoc.productionBundle = {
        ...(customizationDoc.productionBundle?.toObject?.() || customizationDoc.productionBundle || {}),
        zipStorageKey: finalKey,
        generatedAt: new Date(),
        version: 2,
      };
      customizationDoc.productionStatus = "ready";
      customizationDoc.productionStatusUpdatedAt = new Date();
      customizationDoc.productionError = null;
    }
    try {
      await customizationDoc.save();
    } catch (error) {
      await storageProvider.delete(finalKey);
      throw error;
    }

    console.log("ZIP de personalización generado");
    return customizationDoc.zipUrl;
  } catch (error) {
    archive.abort();
    output.destroy();
    if (!output.closed) {
      await new Promise((resolve) => output.once("close", resolve));
    }
    await storageProvider.delete(temporaryKey).catch(() => {});
    throw error;
  }
}

export function buildProductionManifest(customizationDoc) {
  if (customizationDoc.schemaVersion !== 2) throw new Error("Manifest disponible solo para Customization V2");
  const product = customizationDoc.productSnapshot || {};
  return {
    schemaVersion: 2,
    customizationId: String(customizationDoc._id),
    orderId: customizationDoc.orderId ? String(customizationDoc.orderId) : null,
    orderItemId: customizationDoc.orderItemId ? String(customizationDoc.orderItemId) : null,
    product: {
      productId: String(customizationDoc.productId),
      name: product.name,
      templateId: product.productTemplateId,
      templateRevision: product.templateRevision,
    },
    variant: customizationDoc.variant || null,
    quantity: customizationDoc.quantity,
    surfaces: (customizationDoc.productionSurfaces || []).map((surface) => ({
      viewId: surface.viewId,
      surfaceId: surface.surfaceId,
      label: surface.label,
      artworkFile: `production/${surface.artwork.filename}`,
      previewFile: surface.preview?.filename ? `previews/${surface.preview.filename}` : undefined,
      placementProofFile: surface.placementProof?.filename ? `proofs/${surface.placementProof.filename}` : undefined,
      placementMetadataFile: surface.placementMetadata?.filename ? `placement/${surface.placementMetadata.filename}` : undefined,
      widthPx: surface.artwork.widthPx,
      heightPx: surface.artwork.heightPx,
      mimeType: surface.artwork.mimeType,
    })),
    createdAt: customizationDoc.createdAt || new Date(),
  };
}
