// src/utils/generateCustomizationZip.js
import fs from "fs";
import path from "path";
import archiver from "archiver";
import axios from "axios";

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

  const outputDir = path.join("uploads", "customizations");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const zipFsPath = path.join(outputDir, `${customizationId}.zip`);
  const output = fs.createWriteStream(zipFsPath);

  const archive = archiver("zip", { zlib: { level: 9 } });

  // Manejo de errores duro
  archive.on("error", (err) => {
    throw err;
  });

  archive.pipe(output);

  // 1) Diseño JSON
  archive.append(JSON.stringify(customizationDoc.design || {}, null, 2), {
    name: "design.json",
  });

  // 2) Preview HD (si existe en el doc)
  if (customizationDoc.previewImageHD) {
    const buf = base64ToBuffer(customizationDoc.previewImageHD);
    if (buf) archive.append(buf, { name: "preview.png" });
  }

  // 3) PREVIEWS FINALES (LOS QUE VE EL CLIENTE EN 360)
  // Guardamos como PNG separados
  if (customizationDoc.previewsBySide?.front) {
    const buf = base64ToBuffer(customizationDoc.previewsBySide.front);
    if (buf) archive.append(buf, { name: "design_front.png" });
  }

  if (customizationDoc.previewsBySide?.back) {
    const buf = base64ToBuffer(customizationDoc.previewsBySide.back);
    if (buf) archive.append(buf, { name: "design_back.png" });
  }

  // 4) Mockups (si son URL válidas)
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

  // 5) Assets originales (imágenes usadas en el diseño)
  const sides = customizationDoc.design?.elementsBySide || {};
  const assets = [];

  for (const side of ["front", "back"]) {
    for (const el of sides[side] || []) {
      if (el?.type === "image" && el?.url) assets.push(el.url);
    }
  }

  if (assets.length) {
    // crea carpeta lógica
    archive.append("", { name: "assets/" });

    for (let i = 0; i < assets.length; i++) {
      try {
        const buffer = await downloadFile(assets[i]);
        archive.append(buffer, { name: `assets/image_${i + 1}.png` });
      } catch (err) {
        console.warn("⚠ Error descargando asset:", err.message);
      }
    }
  }

  // FINALIZAR (no await) y ESPERAR AL CIERRE DEL STREAM
  archive.finalize();

  await new Promise((resolve, reject) => {
    output.on("close", resolve);
    output.on("error", reject);
    archive.on("error", reject);
  });

  // Guardar URL del ZIP en Mongo
  customizationDoc.zipUrl = `/uploads/customizations/${customizationId}.zip`;
  await customizationDoc.save();

  console.log("✅ ZIP válido generado:", customizationDoc.zipUrl);
  return customizationDoc.zipUrl;
}
