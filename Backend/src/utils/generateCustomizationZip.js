/*

import fs from "fs";
import path from "path";
import archiver from "archiver";
import axios from "axios";


async function downloadFile(url) {
  const response = await axios.get(url, {
    responseType: "arraybuffer",
  });
  return Buffer.from(response.data);
}


function base64ToBuffer(base64String) {
  const clean = base64String.replace(/^data:image\/\w+;base64,/, "");
  return Buffer.from(clean, "base64");
}


function isBase64Image(str) {
  return typeof str === "string" && str.startsWith("data:image");
}


export async function generateCustomizationZip(customizationDoc) {
  try {
    const customizationId = customizationDoc._id.toString();

    // Crear carpeta destino
    const outputDir = path.join("uploads", "customizations");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const zipPath = path.join(outputDir, `${customizationId}.zip`);
    const output = fs.createWriteStream(zipPath);

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(output);

    // 1) Guardar diseño JSON
    const designJson = JSON.stringify(customizationDoc.design, null, 2);
    archive.append(designJson, { name: "design.json" });

    // 2) Guardar preview HD desde "previewImage"
    if (customizationDoc.previewImage) {
      try {
        const buffer = base64ToBuffer(customizationDoc.previewImage);
        archive.append(buffer, { name: "preview.png" });
      } catch (err) {
        console.warn("⚠ Error procesando preview:", err.message);
      }
    }

    // 3) Guardar mockups frontal y trasero
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

    // 4) Guardar imágenes del diseño
    const sides = customizationDoc.design?.elementsBySide || {};
    const assets = [];

    const collectImages = (list) => {
      for (const el of list) {
        if (el.type === "image" && el.url) {
          assets.push(el.url);
        }
      }
    };

    collectImages(sides.front || []);
    collectImages(sides.back || []);

    archive.append("", { name: "assets/" });

    for (let i = 0; i < assets.length; i++) {
      const url = assets[i];

      try {
        let buffer;

        if (isBase64Image(url)) {
          buffer = base64ToBuffer(url);
        } else {
          buffer = await downloadFile(url);
        }

        archive.append(buffer, { name: `assets/image_${i + 1}.png` });
      } catch (err) {
        console.warn("⚠ Error procesando imagen del diseño:", url, err.message);
      }
    }

    // 5) Finalizar ZIP
    await archive.finalize();

    // 6) Guardar ruta del ZIP
    customizationDoc.zipUrl = `/uploads/customizations/${customizationId}.zip`;
    await customizationDoc.save();

    console.log("✅ ZIP generado correctamente:", customizationDoc.zipUrl);
    return customizationDoc.zipUrl;

  } catch (err) {
    console.error("❌ Error generando ZIP:", err);
    throw err;
  }
}
*/

import fs from "fs";
import path from "path";
import archiver from "archiver";
import axios from "axios";

/** Descarga archivo remoto */
async function downloadFile(url) {
  const response = await axios.get(url, { responseType: "arraybuffer" });
  return Buffer.from(response.data);
}

/** Convierte base64 a Buffer */
function base64ToBuffer(base64String) {
  const clean = base64String.replace(/^data:image\/\w+;base64,/, "");
  return Buffer.from(clean, "base64");
}

/**
 * 🔥 Genera ZIP completamente válido
 */
export async function generateCustomizationZip(customizationDoc) {
  return new Promise(async (resolve, reject) => {
    try {
      const customizationId = customizationDoc._id.toString();

      // Carpeta destino
      const outputDir = path.join("uploads", "customizations");
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const zipPath = path.join(outputDir, `${customizationId}.zip`);
      const output = fs.createWriteStream(zipPath);

      const archive = archiver("zip", { zlib: { level: 9 } });

      // Evento que asegura que el ZIP se ha completado
      output.on("close", async () => {
        customizationDoc.zipUrl = `/uploads/customizations/${customizationId}.zip`;
        await customizationDoc.save();
        console.log("✅ ZIP generado y cerrado correctamente:", customizationDoc.zipUrl);
        resolve(customizationDoc.zipUrl);
      });

      archive.on("error", (err) => {
        console.error("❌ Error en ZIP:", err);
        reject(err);
      });

      archive.pipe(output);

      // 1️⃣ Diseño JSON
      archive.append(JSON.stringify(customizationDoc.design, null, 2), {
        name: "design.json",
      });

      // 2️⃣ Preview HD
      if (customizationDoc.previewImage) {
        archive.append(base64ToBuffer(customizationDoc.previewImage), {
          name: "preview.png",
        });
      }

      // 3️⃣ Mockups
      const mockups = [
        { field: "mockupFront", name: "mockup_front.png" },
        { field: "mockupBack", name: "mockup_back.png" },
      ];

      for (const m of mockups) {
        if (customizationDoc[m.field]) {
          try {
            const buffer = await downloadFile(customizationDoc[m.field]);
            archive.append(buffer, { name: m.name });
          } catch (err) {
            console.warn(`⚠ No se pudo descargar ${m.field}:`, err.message);
          }
        }
      }

      // 4️⃣ Imágenes usadas en el diseño
      archive.append("", { name: "assets/" });

      const sides = customizationDoc.design?.elementsBySide || {};
      const assetUrls = [
        ...((sides.front || []).filter((x) => x.type === "image").map((x) => x.url)),
        ...((sides.back || []).filter((x) => x.type === "image").map((x) => x.url)),
      ];

      let counter = 1;
      for (const url of assetUrls) {
        try {
          const buffer = await downloadFile(url);
          archive.append(buffer, { name: `assets/image_${counter}.png` });
          counter++;
        } catch (err) {
          console.warn("⚠ Error descargando imagen de diseño:", err.message);
        }
      }

      // 5️⃣ Finalizar ZIP (NO RESUELVE la promesa)
      archive.finalize();
    } catch (err) {
      reject(err);
    }
  });
}
