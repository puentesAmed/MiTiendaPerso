/*import fs from "fs";
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

export async function generateCustomizationZip(customizationDoc) {
  const customizationId = customizationDoc._id.toString();
  const outputDir = path.join("uploads", "customizations");

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const zipPath = path.join(outputDir, `${customizationId}.zip`);
  const output = fs.createWriteStream(zipPath);

  const archive = archiver("zip", { zlib: { level: 9 } });

  archive.pipe(output);

  
  archive.append(
    JSON.stringify(customizationDoc.design, null, 2),
    { name: "design.json" }
  );

  
  if (customizationDoc.previewImageHD) {
    const buffer = base64ToBuffer(customizationDoc.previewImageHD);
    archive.append(buffer, { name: "preview.png" });
  }

  
  if (customizationDoc.mockupFront) {
    try {
      const buf = await downloadFile(customizationDoc.mockupFront);
      archive.append(buf, { name: "mockup_front.png" });
    } catch (e) {
      console.warn("⚠ mockupFront no descargado");
    }
  }

  if (customizationDoc.mockupBack) {
    try {
      const buf = await downloadFile(customizationDoc.mockupBack);
      archive.append(buf, { name: "mockup_back.png" });
    } catch (e) {
      console.warn("⚠ mockupBack no descargado");
    }
  }

  
  const sides = customizationDoc.design?.elementsBySide || {};
  const assets = [];

  const collect = (arr = []) =>
    arr.forEach(el => el.type === "image" && el.url && assets.push(el.url));

  collect(sides.front);
  collect(sides.back);

  if (assets.length) {
    archive.append("", { name: "assets/" });

    for (let i = 0; i < assets.length; i++) {
      try {
        const buf = await downloadFile(assets[i]);
        archive.append(buf, { name: `assets/image_${i + 1}.png` });
      } catch {}
    }
  }

 
  await archive.finalize();

  // ⬇️ ESTE ES EL PUNTO CRÍTICO
  await new Promise((resolve, reject) => {
    output.on("close", resolve);
    output.on("error", reject);
  });

  customizationDoc.zipUrl = `/uploads/customizations/${customizationId}.zip`;
  await customizationDoc.save();

  console.log("✅ ZIP generado y cerrado correctamente:", customizationDoc.zipUrl);

  return customizationDoc.zipUrl;
}

*/

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
 * CREA ZIP PROFESIONAL DE PERSONALIZACIÓN
 */
export async function generateCustomizationZip(customizationDoc) {
  const customizationId = customizationDoc._id.toString();
  const outputDir = path.join("uploads", "customizations");

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const zipPath = path.join(outputDir, `${customizationId}.zip`);
  const output = fs.createWriteStream(zipPath);

  const archive = archiver("zip", {
    zlib: { level: 9 },
  });

  archive.pipe(output);

  // 1️⃣ Diseño JSON
  archive.append(
    JSON.stringify(customizationDoc.design, null, 2),
    { name: "design.json" }
  );

  // 2️⃣ Preview HD
  if (customizationDoc.previewImageHD) {
    const buffer = base64ToBuffer(customizationDoc.previewImageHD);
    archive.append(buffer, { name: "preview.png" });
  }

  // 3️⃣ Mockups
  if (customizationDoc.mockupFront) {
    try {
      const buffer = await downloadFile(customizationDoc.mockupFront);
      archive.append(buffer, { name: "mockup_front.png" });
    } catch (e) {
      console.warn("⚠ mockupFront omitido");
    }
  }

  if (customizationDoc.mockupBack) {
    try {
      const buffer = await downloadFile(customizationDoc.mockupBack);
      archive.append(buffer, { name: "mockup_back.png" });
    } catch (e) {
      console.warn("⚠ mockupBack omitido");
    }
  }

  // 4️⃣ Assets originales
  const sides = customizationDoc.design?.elementsBySide || {};
  const assets = [];

  for (const side of ["front", "back"]) {
    for (const el of sides[side] || []) {
      if (el.type === "image" && el.url) assets.push(el.url);
    }
  }

  for (let i = 0; i < assets.length; i++) {
    try {
      const buffer = await downloadFile(assets[i]);
      archive.append(buffer, { name: `assets/image_${i + 1}.png` });
    } catch {
      console.warn("⚠ asset omitido");
    }
  }

  // ⛔ FINALIZAMOS ARCHIVE (NO await)
  archive.finalize();

  // ✅ ESPERAR A QUE EL STREAM TERMINE
  await new Promise((resolve, reject) => {
    output.on("close", resolve);
    archive.on("error", reject);
  });

  // Guardar ruta en Mongo
  customizationDoc.zipUrl = `/uploads/customizations/${customizationId}.zip`;
  await customizationDoc.save();

  console.log("✅ ZIP válido generado:", customizationDoc.zipUrl);
  return customizationDoc.zipUrl;
}
