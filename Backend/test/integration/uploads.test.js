import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import { createApp } from "../../src/app.js";
import { storageProvider } from "../../src/storage/index.js";

const app = createApp();

test("upload acepta una imagen soportada y normaliza su extensión", async (t) => {
  const response = await request(app)
    .post("/api/uploads/image")
    .attach("file", Buffer.from("test-image"), {
      filename: "preview.exe",
      contentType: "image/png",
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.match(
    response.body.url,
    /^\/uploads\/customizations\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.png$/
  );

  const key = response.body.url.replace(/^\/uploads\//, "");
  t.after(() => storageProvider.delete(key).catch(() => {}));
  assert.equal(await storageProvider.exists(key), true);

  const served = await request(app).get(response.body.url);
  assert.equal(served.status, 200);
  assert.equal(served.headers["content-type"], "image/png");
});

test("upload rechaza MIME no soportado", async () => {
  const response = await request(app)
    .post("/api/uploads/image")
    .attach("file", Buffer.from("not-an-image"), {
      filename: "payload.txt",
      contentType: "text/plain",
    });

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, {
    ok: false,
    message: "Archivo de imagen no válido",
  });
});

test("upload limita imágenes a 10 MB", async () => {
  const response = await request(app)
    .post("/api/uploads/image")
    .attach("file", Buffer.alloc(10 * 1024 * 1024 + 1), {
      filename: "large.png",
      contentType: "image/png",
    });

  assert.equal(response.status, 413);
  assert.deepEqual(response.body, {
    ok: false,
    message: "La imagen supera el límite de 10 MB",
  });
});

test("archivo inexistente devuelve 404 sin exponer paths", async () => {
  const response = await request(app).get(
    "/uploads/customizations/00000000-0000-4000-8000-000000000000.png"
  );

  assert.equal(response.status, 404);
  assert.deepEqual(response.body, {
    ok: false,
    message: "Archivo no encontrado",
  });
  assert.doesNotMatch(JSON.stringify(response.body), /STORAGE_ROOT|uploads\\|:\\Users/i);
});
