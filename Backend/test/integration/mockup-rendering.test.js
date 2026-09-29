import test from "node:test";
import assert from "node:assert/strict";
import { copyFile, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import request from "supertest";
import express from "express";

import { inspectPng, MAX_ARTWORK_BYTES } from "../../src/mockups/png-validation.js";
import { createDesignerV2MockupsRouter } from "../../src/routes/designer-v2-mockups.routes.js";
import { MockupRenderingError, MockupRenderingService } from "../../src/services/mockup-rendering.service.js";

const fixturePath = fileURLToPath(new URL("../../src/mockups/assets/mug-white-basic-v1.png", import.meta.url));

function memoryStorage() {
  const values = new Map();
  return { values, exists: async (key) => values.has(key), read: async (key) => values.get(key), save: async (key, value) => values.set(key, value), getPublicUrl: (key) => `/uploads/${key}` };
}

test("valida firma, dimensiones y tamaño PNG", async () => {
  const png = await readFile(fixturePath);
  assert.deepEqual(inspectPng(png), { width: 1200, height: 900, sizeBytes: png.length });
  assert.throws(() => inspectPng(Buffer.from("not png")), /INVALID_ARTWORK/);
  assert.throws(() => inspectPng(Buffer.alloc(MAX_ARTWORK_BYTES + 1)), /INVALID_ARTWORK/);
});

test("service deshabilitado devuelve error controlado", async () => {
  const service = new MockupRenderingService({ config: { enabled: false } });
  await assert.rejects(service.renderMockup({ artwork: Buffer.alloc(1) }), (error) => error.code === "ENGINE_DISABLED" && error.status === 503);
});

test("service guarda, limpia temporales y reutiliza cache por hash", async (t) => {
  const artwork = await readFile(fixturePath);
  const storage = memoryStorage();
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "mockup-service-test-"));
  t.after(() => rm(tempRoot, { recursive: true, force: true }));
  let runs = 0;
  const service = new MockupRenderingService({
    config: { enabled: true, python: "python", root: "engine", timeoutMs: 1000, maxConcurrency: 1 }, storage, tempRoot,
    processRunner: async ({ requestPath }) => {
      runs += 1;
      const operation = JSON.parse(await readFile(requestPath, "utf8"));
      await copyFile(operation.artworkPath, operation.outputPath);
    },
  });
  const input = { artwork, templateId: "mug-ceramic-standard-v1", mockupId: "mug-white-basic-v1", sourceViewId: "wrap" };
  const first = await service.renderMockup(input);
  const second = await service.renderMockup(input);
  assert.equal(first.cached, false);
  assert.equal(second.cached, true);
  assert.equal(first.cacheKey, second.cacheKey);
  assert.equal(runs, 1);
  assert.deepEqual(await readdir(tempRoot), []);
});

test("service normaliza timeout y limpia temporales", async (t) => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "mockup-timeout-test-"));
  t.after(() => rm(tempRoot, { recursive: true, force: true }));
  const service = new MockupRenderingService({ config: { enabled: true, python: "python", root: "engine", timeoutMs: 1000, maxConcurrency: 1 }, storage: memoryStorage(), tempRoot, processRunner: async () => { throw new MockupRenderingError("RENDER_TIMEOUT", 504); } });
  await assert.rejects(service.renderMockup({ artwork: await readFile(fixturePath), templateId: "mug-ceramic-standard-v1", mockupId: "mug-white-basic-v1", sourceViewId: "wrap" }), (error) => error.code === "RENDER_TIMEOUT");
  assert.deepEqual(await readdir(tempRoot), []);
});

test("service normaliza fallo de storage", async () => {
  const artwork = await readFile(fixturePath);
  const storage = { ...memoryStorage(), save: async () => { throw new Error("disk full"); } };
  const service = new MockupRenderingService({ config: { enabled: true, python: "python", root: "engine", timeoutMs: 1000, maxConcurrency: 1 }, storage, processRunner: async ({ requestPath }) => { const operation = JSON.parse(await readFile(requestPath, "utf8")); await copyFile(operation.artworkPath, operation.outputPath); } });
  await assert.rejects(service.renderMockup({ artwork, templateId: "mug-ceramic-standard-v1", mockupId: "mug-white-basic-v1", sourceViewId: "wrap" }), (error) => error.code === "STORAGE_FAILED");
});

test("endpoint rechaza spoofing y entrega contrato sin paths internos", async () => {
  const fakeResult = { mockupId: "mug-white-basic-v1", url: "/uploads/designer-v2/mockups/a.png" };
  const service = { renderMockup: async () => fakeResult };
  const app = express().use("/api/designer-v2/mockups", createDesignerV2MockupsRouter({ service }));
  const invalid = await request(app).post("/api/designer-v2/mockups").attach("artwork", Buffer.from("fake"), { filename: "art.png", contentType: "image/png" });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.code, "INVALID_ARTWORK");
  const valid = await request(app).post("/api/designer-v2/mockups").field("templateId", "mug-ceramic-standard-v1").field("mockupId", "mug-white-basic-v1").field("sourceViewId", "wrap").attach("artwork", await readFile(fixturePath), { filename: "ignored.exe", contentType: "image/png" });
  assert.equal(valid.status, 200);
  assert.deepEqual(valid.body, { success: true, mockup: fakeResult });
  assert.doesNotMatch(JSON.stringify(valid.body), /mockup-service-test|\\Users|templatePath/);
});

