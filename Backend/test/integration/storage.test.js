import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import request from "supertest";

import { createApp } from "../../src/app.js";
import { LocalStorageProvider } from "../../src/storage/local-storage.provider.js";
import { storageProvider } from "../../src/storage/index.js";
import { generateCustomizationZip } from "../../src/utils/generateCustomizationZip.js";

test("provider local usa root configurable y soporta save/read/exists/delete", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "mitiendaperso-provider-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const provider = new LocalStorageProvider(root);

  const key = await provider.save("customizations/example.png", Buffer.from("image"));
  assert.equal(key, "customizations/example.png");
  assert.equal(provider.resolve(key).startsWith(root), true);
  assert.equal(await provider.exists(key), true);
  assert.deepEqual(await provider.read(key), Buffer.from("image"));
  assert.equal(provider.getPublicUrl(key), "/uploads/customizations/example.png");

  await provider.delete(key);
  assert.equal(await provider.exists(key), false);
});

test("provider local bloquea traversal y paths absolutos Windows/POSIX", () => {
  const provider = new LocalStorageProvider(path.join(os.tmpdir(), "storage-root"));

  for (const unsafeKey of ["../secret", "customizations/../../secret", "/etc/passwd", "C:\\secret.txt"] ) {
    assert.throws(() => provider.resolve(unsafeKey), /Storage key/);
  }
});

test("ZIP se guarda de forma regenerable y solo se descarga con admin", async (t) => {
  const id = new mongoose.Types.ObjectId();
  const customization = {
    _id: id,
    design: { elementsBySide: { front: [], back: [] } },
    previewsBySide: { front: "data:image/png;base64,QUFB", back: null },
    zipUrl: null,
    async save() {},
  };
  const key = `customizations/${id}.zip`;
  t.after(() => storageProvider.delete(key).catch(() => {}));

  const zipUrl = await generateCustomizationZip(customization);
  assert.equal(zipUrl, `/api/customizations/${id}/zip`);
  assert.equal(await storageProvider.exists(key), true);
  const storedNames = await readdir(storageProvider.resolve("customizations"));
  assert.equal(storedNames.some((name) => name.startsWith(".tmp-")), false);

  const app = createApp();
  const anonymous = await request(app).get(zipUrl);
  assert.equal(anonymous.status, 401);

  const token = jwt.sign(
    { sub: new mongoose.Types.ObjectId().toString(), role: "admin", email: "admin@test.com" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
  const admin = await request(app).get(zipUrl).set("Authorization", `Bearer ${token}`);
  assert.equal(admin.status, 200);
  assert.equal(admin.headers["content-type"], "application/zip");
  assert.match(admin.headers["content-disposition"], new RegExp(`custom_${id}\\.zip`));
});

test("fallo al persistir zipUrl limpia ZIP final y temporal", async () => {
  const id = new mongoose.Types.ObjectId();
  const key = `customizations/${id}.zip`;
  const customization = {
    _id: id,
    design: { elementsBySide: { front: [], back: [] } },
    previewsBySide: {},
    async save() {
      throw new Error("fallo Mongo simulado");
    },
  };

  await assert.rejects(generateCustomizationZip(customization), /fallo Mongo simulado/);
  assert.equal(await storageProvider.exists(key), false);
  const storedNames = await readdir(storageProvider.resolve("customizations"));
  assert.equal(storedNames.some((name) => name.startsWith(".tmp-")), false);
});
