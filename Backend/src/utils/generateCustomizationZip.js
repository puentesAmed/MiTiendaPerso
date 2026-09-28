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
  const finalKey = `customizations/${customizationId}.zip`;
  const temporaryKey = `customizations/.tmp-${randomUUID()}.zip`;
  const output = await storageProvider.createWriteStream(temporaryKey);
  const archive = archiver("zip", { zlib: { level: 9 } });
  const completed = new Promise((resolve, reject) => {
    output.once("close", resolve);
    output.once("error", reject);
    archive.once("error", reject);
  });
  archive.pipe(output);

  try {
    archive.append(JSON.stringify(customizationDoc.design || {}, null, 2), {
      name: "design.json",
    });

    if (customizationDoc.previewImageHD) {
      const buf = base64ToBuffer(customizationDoc.previewImageHD);
      if (buf) archive.append(buf, { name: "preview.png" });
    }

    if (customizationDoc.previewsBySide?.front) {
      const buf = base64ToBuffer(customizationDoc.previewsBySide.front);
      if (buf) archive.append(buf, { name: "design_front.png" });
    }

    if (customizationDoc.previewsBySide?.back) {
      const buf = base64ToBuffer(customizationDoc.previewsBySide.back);
      if (buf) archive.append(buf, { name: "design_back.png" });
    }

    if (customizationDoc.mockupFront) {
      try {
        const buffer = await downloadFile(customizationDoc.mockupFront);
        archive.append(buffer, { name: "mockup_front.png" });
      } catch (err) {
        console.warn("⚠ No se pudo descargar mockupFront:", err.message);
      }
    }

    if (customizationDoc.mockupBack) {
      try {
        const buffer = await downloadFile(customizationDoc.mockupBack);
        archive.append(buffer, { name: "mockup_back.png" });
      } catch (err) {
        console.warn("⚠ No se pudo descargar mockupBack:", err.message);
      }
    }

    const sides = customizationDoc.design?.elementsBySide || {};
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
    await storageProvider.move(temporaryKey, finalKey);

    customizationDoc.zipUrl = `/api/customizations/${customizationId}/zip`;
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
