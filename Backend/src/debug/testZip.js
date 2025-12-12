import fs from "fs";
import archiver from "archiver";

export async function testZip() {
  const output = fs.createWriteStream("test_ok.zip");
  const archive = archiver("zip", { zlib: { level: 9 } });

  archive.pipe(output);

  archive.append("Hola mundo", { name: "hola.txt" });

  archive.finalize();

  await new Promise((resolve, reject) => {
    output.on("close", resolve);
    archive.on("error", reject);
  });

  console.log("ZIP de prueba creado correctamente");
}
