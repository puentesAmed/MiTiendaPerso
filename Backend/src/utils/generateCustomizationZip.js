import fs from "fs";
import path from "path";
import archiver from "archiver";
import axios from "axios";

/** Descarga un archivo remoto y devuelve un Buffer */
async function downloadFile(url) {
  const response = await axios.get(url, {
    responseType: "arraybuffer",
  });
  return Buffer.from(response.data);
}

/** Convierte Base64 → Buffer */
function base64ToBuffer(base64String) {
  const clean = base64String.replace(/^data:image\/\w+;base64,/, "");
  return Buffer.from(clean, "base64");
}

/**
 * 👉 CREA UN ZIP PARA UNA PERSONALIZACIÓN
 * Recibe: customizationDoc (documento Mongoose)
 * Devuelve: ruta del ZIP (string)
 */
export async function generateCustomizationZip(customizationDoc) {
  try {
    const customizationId = customizationDoc._id.toString();

    // 📁 Carpeta destino
    const outputDir = path.join("uploads", "customizations");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 📦 Ruta final del ZIP
    const zipPath = path.join(outputDir, `${customizationId}.zip`);
    const output = fs.createWriteStream(zipPath);

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(output);

    // ---------------------------------------------------------
    // 1️⃣ Guardar diseño JSON
    // ---------------------------------------------------------
    const designJson = JSON.stringify(customizationDoc.design, null, 2);
    archive.append(designJson, { name: "design.json" });

    // ---------------------------------------------------------
    // 2️⃣ Guardar preview en HD si existe
    // ---------------------------------------------------------
    if (customizationDoc.previewImageHD) {
      const buffer = base64ToBuffer(customizationDoc.previewImageHD);
      archive.append(buffer, { name: "preview.png" });
    }

    // ---------------------------------------------------------
    // 3️⃣ Guardar mockups frontal y trasero
    // ---------------------------------------------------------
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

    // ---------------------------------------------------------
    // 4️⃣ Guardar imágenes originales del diseño
    // ---------------------------------------------------------
    const sides = customizationDoc.design?.elementsBySide || {};
    const assets = [];

    const collectImages = (sideArray) => {
      for (const el of sideArray) {
        if (el.type === "image" && el.url) assets.push(el.url);
      }
    };

    collectImages(sides.front || []);
    collectImages(sides.back || []);

    archive.append("", { name: "assets/" });

    for (let i = 0; i < assets.length; i++) {
      try {
        const assetBuffer = await downloadFile(assets[i]);
        archive.append(assetBuffer, { name: `assets/image_${i + 1}.png` });
      } catch (err) {
        console.warn("⚠ Error descargando imagen del diseño:", err.message);
      }
    }

    // ---------------------------------------------------------
    // 5️⃣ Finalizamos ZIP
    // ---------------------------------------------------------
    await archive.finalize();

    // ---------------------------------------------------------
    // 6️⃣ Guardar ruta del ZIP en MongoDB
    // ---------------------------------------------------------
    customizationDoc.zipUrl = `/uploads/customizations/${customizationId}.zip`;
    await customizationDoc.save();

    console.log("✅ ZIP generado correctamente:", customizationDoc.zipUrl);
    return customizationDoc.zipUrl;

  } catch (err) {
    console.error("❌ Error generando ZIP:", err);
    throw err;
  }
}
