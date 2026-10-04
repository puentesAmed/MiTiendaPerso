import test from "node:test";
import assert from "node:assert/strict";
import { createRuntimeAssetRegistry, MAX_IMAGE_BYTES, prepareImageAsset, restoreRuntimeAssets, validateImageFile } from "./runtimeAssetRegistry.js";

test("acepta MIME de imagen permitido dentro del límite", () => {
  assert.equal(validateImageFile({ type: "image/webp", size: 1024 }), true);
});

test("rechaza MIME disfrazado y archivos demasiado grandes", () => {
  assert.throws(() => validateImageFile({ type: "application/octet-stream", size: 1024 }), /JPEG, PNG o WebP/);
  assert.throws(() => validateImageFile({ type: "image/png", size: MAX_IMAGE_BYTES + 1 }), /10 MiB/);
});

test("prepareImageAsset conserva dimensiones y qualityStatus del original", async () => {
  const file = Object.assign(new Blob(["image"], { type: "image/png" }), { name: "foto.png" });
  const revoked = [];
  const prepared = await prepareImageAsset(file, {
    idFactory: () => "asset-quality",
    now: () => "2026-10-04T00:00:00.000Z",
    decode: async () => ({ widthPx: 2000, heightPx: 1000 }),
    urlApi: { createObjectURL: () => "blob:quality", revokeObjectURL: (url) => revoked.push(url) },
  });
  assert.equal(prepared.asset.qualityStatus, "good");
  assert.equal(prepared.asset.widthPx, 2000);
  assert.equal(prepared.asset.heightPx, 1000);
  assert.deepEqual(revoked, ["blob:quality"]);
});

test("archivo corrupto no crea asset y revoca su Object URL", async () => {
  const file = Object.assign(new Blob(["broken"], { type: "image/webp" }), { name: "rota.webp" });
  const revoked = [];
  await assert.rejects(prepareImageAsset(file, {
    decode: async () => { throw new Error("No se pudo decodificar la imagen."); },
    urlApi: { createObjectURL: () => "blob:broken", revokeObjectURL: (url) => revoked.push(url) },
  }), /No se pudo decodificar/);
  assert.deepEqual(revoked, ["blob:broken"]);
});

test("registry regenera una URL por Blob y revoca en lifecycle", async () => {
  const revoked = [];
  let created = 0;
  const registry = createRuntimeAssetRegistry({ urlApi: { createObjectURL: () => `blob:${++created}`, revokeObjectURL: (url) => revoked.push(url) } });
  const blob = new Blob(["image"], { type: "image/png" });
  assert.equal(registry.registerBlob("asset-1", blob), "blob:1");
  assert.equal(registry.registerBlob("asset-1", blob), "blob:1");
  await restoreRuntimeAssets({ assets: { "asset-2": {} } }, { loadAsset: async () => ({ blob }) }, registry);
  assert.equal(registry.get("asset-2"), "blob:2");
  registry.dispose();
  assert.deepEqual(revoked.sort(), ["blob:1", "blob:2"]);
});

test("recovery informa un asset persistido ausente", async () => {
  const registry = createRuntimeAssetRegistry({
    urlApi: { createObjectURL: () => "blob:unused", revokeObjectURL: () => {} },
  });

  await assert.rejects(
    restoreRuntimeAssets({ assets: { "asset-missing": {} } }, { loadAsset: async () => null }, registry),
    /Faltan assets locales necesarios/,
  );
});
