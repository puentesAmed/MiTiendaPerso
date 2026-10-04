import test, { after, before, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import { createApp } from "../../src/app.js";
import { Customization } from "../../src/models/Customization.js";
import { Product } from "../../src/models/Product.js";
import { emailTransporter } from "../../src/services/email.service.js";
import { storageProvider } from "../../src/storage/index.js";
import { clearTestDB, setupTestDB, teardownTestDB } from "../setup/test-db.js";
import { createAdminAuthHeader } from "../setup/test-auth.js";

const app = createApp();
const stagingIds = new Set();

function png(width, height) {
  const buffer = Buffer.alloc(24);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(buffer, 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write("IHDR", 12, "ascii");
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

async function uploadArtwork(width, height) {
  const response = await request(app)
    .post("/api/uploads/designer-v2")
    .attach("file", png(width, height), { filename: "surface.png", contentType: "image/png" });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  stagingIds.add(response.body.uploadId);
  return response.body.uploadId;
}

function orderPayload(product, customization, variant = null) {
  return {
    guestId: "production-guest",
    email: "production@test.com",
    paymentMethod: "bizum",
    items: [{ productId: product._id.toString(), quantity: 2, provider: "local", variant, customization }],
    shippingAddress: { fullName: "Cliente", street: "Calle 1", city: "Madrid", state: "Madrid", postalCode: "28001", country: "España" },
  };
}

function v2Customization(product, templateId, templateRevision, views, uploads, variant = null) {
  return {
    type: "designer",
    schemaVersion: 2,
    designVersion: 2,
    clientId: `client-${templateId}`,
    designDocument: {
      schemaVersion: 1,
      documentId: `document-${templateId}`,
      productId: product._id.toString(),
      templateId,
      templateRevision,
      variant,
      assets: {},
      views: Object.fromEntries(views.map((viewId) => [viewId, { elements: [] }])),
      metadata: { createdAt: "2026-10-02T08:00:00.000Z", updatedAt: "2026-10-02T08:00:00.000Z" },
    },
    uploads: { assets: {}, surfaces: Object.fromEntries(Object.entries(uploads).map(([viewId, artworkUploadId]) => [viewId, { artworkUploadId, proofUploadId: artworkUploadId }])) },
  };
}

async function cleanupArtifacts() {
  const customizations = await Customization.find({}).lean().catch(() => []);
  const keys = customizations.flatMap((customization) => [
    customization.productionBundle?.zipStorageKey,
    customization.productionBundle?.manifestStorageKey,
    ...(customization.productionSurfaces || []).flatMap((surface) => [surface.artwork?.storageKey, surface.preview?.storageKey, surface.placementProof?.storageKey, surface.placementMetadata?.storageKey]),
    ...Object.values(customization.designDocument?.assets || {}).map((asset) => asset.storageKey),
  ]).filter(Boolean);
  await Promise.all([...keys, ...[...stagingIds].map((id) => `designer-v2/staging/${id}`)].map((key) => storageProvider.delete(key).catch(() => {})));
  stagingIds.clear();
}

before(async () => {
  await setupTestDB();
  mock.method(emailTransporter, "sendMail", async () => ({ accepted: [] }));
});

beforeEach(async () => {
  await cleanupArtifacts();
  await clearTestDB();
});

after(async () => {
  await cleanupArtifacts();
  mock.restoreAll();
  await teardownTestDB();
});

test("pedido V2 de taza congela wrap, enlaza order item y protege descargas", async () => {
  const product = await Product.create({ name: "Taza cerámica personalizada", price: 20, stock: 10, active: true, customizable: true, productTemplateId: "mug-ceramic-standard-v1" });
  const customizationPayload = v2Customization(product, "mug-ceramic-standard-v1", 1, ["wrap"], { wrap: await uploadArtwork(1008, 480) });
  const assetUploadId = await uploadArtwork(10, 10);
  customizationPayload.designDocument.assets["asset-1"] = { assetId: "asset-1", kind: "image", mimeType: "image/png", widthPx: 10, heightPx: 10, sizeBytes: 24, createdAt: "2026-10-02T08:00:00.000Z" };
  customizationPayload.designDocument.views.wrap.elements.push({ id: "image-1", type: "image", printAreaId: "wrap-main", assetId: "asset-1", x: 0.62, y: 0.2, width: 0.25, height: 0.3, rotation: 17, opacity: 1, zIndex: 0, hidden: false });
  customizationPayload.uploads.assets["asset-1"] = assetUploadId;
  const response = await request(app).post("/api/orders").send(orderPayload(product, customizationPayload));
  assert.equal(response.status, 201, JSON.stringify(response.body));
  const orderItem = response.body.order.items[0];
  const customization = await Customization.findById(orderItem.customizationId).lean();
  assert.equal(customization.schemaVersion, 2);
  assert.equal(String(customization.orderItemId), String(orderItem._id));
  assert.equal(customization.productionStatus, "ready");
  assert.match(customization.designDocument.assets["asset-1"].storageKey, new RegExp(`^customizations/${customization._id}/assets/`));
  assert.equal(await storageProvider.exists(customization.designDocument.assets["asset-1"].storageKey), true);
  assert.deepEqual(customization.productionSurfaces.map((surface) => surface.viewId), ["wrap"]);
  assert.equal(customization.productionSurfaces[0].artwork.filename, "wrap.png");
  assert.equal(customization.productionSurfaces[0].placementProof.filename, "wrap-placement.png");
  const placement = JSON.parse((await storageProvider.read(customization.productionSurfaces[0].placementMetadata.storageKey)).toString("utf8"));
  assert.equal(placement.coordinateSystem, "normalized");
  assert.deepEqual(placement.elements[0], { id: "image-1", type: "image", printAreaId: "wrap-main", x: 0.62, y: 0.2, width: 0.25, height: 0.3, rotation: 17, opacity: 1, zIndex: 0, hidden: false, assetId: "asset-1" });
  assert.equal(placement.physicalPlacement, null);

  const anonymous = await request(app).get(`/api/customizations/${customization._id}/surfaces/wrap/artwork`);
  assert.equal(anonymous.status, 401);
  const adminAuth = await createAdminAuthHeader();
  const list = await request(app).get("/api/customizations").set("Authorization", adminAuth);
  assert.equal(list.status, 200);
  assert.doesNotMatch(JSON.stringify(list.body), /storageKey|designer-v2\/staging/);
  assert.equal(list.body.customizations[0].productionSurfaces.length, 1);
  const artwork = await request(app).get(`/api/customizations/${customization._id}/surfaces/wrap/artwork`).set("Authorization", adminAuth);
  assert.equal(artwork.status, 200);
  assert.equal(artwork.headers["content-type"], "image/png");
  const proof = await request(app).get(`/api/customizations/${customization._id}/surfaces/wrap/proof`).set("Authorization", adminAuth);
  assert.equal(proof.status, 200);
  const placementResponse = await request(app).get(`/api/customizations/${customization._id}/surfaces/wrap/placement`).set("Authorization", adminAuth);
  assert.equal(placementResponse.status, 200);
  assert.doesNotMatch(placementResponse.text, /storageKey|blob:|data:image|scaleX|viewport/);
  const zip = await request(app).get(`/api/customizations/${customization._id}/zip`).set("Authorization", adminAuth);
  assert.equal(zip.status, 200);
  const zipText = (await storageProvider.read(customization.productionBundle.zipStorageKey)).toString("latin1");
  for (const name of ["manifest.json", "design-document.json", "production/wrap.png", "previews/wrap.png", "proofs/wrap-placement.png", "placement/wrap.json"]) assert.match(zipText, new RegExp(name.replace(".", "\\.")));

  const started = await request(app).patch(`/api/customizations/${customization._id}/status`).set("Authorization", adminAuth).send({ status: "in_production" });
  assert.equal(started.status, 200);
  const completed = await request(app).patch(`/api/customizations/${customization._id}/status`).set("Authorization", adminAuth).send({ status: "completed" });
  assert.equal(completed.status, 200);
  const invalid = await request(app).patch(`/api/customizations/${customization._id}/status`).set("Authorization", adminAuth).send({ status: "ready" });
  assert.equal(invalid.status, 409);
});

test("quality gate acepta good, warning e histórico sin status", async () => {
  const product = await Product.create({ name: "Taza quality gate", price: 20, stock: 10, active: true, customizable: true, productTemplateId: "mug-ceramic-standard-v1" });
  for (const fixture of [
    { label: "good", widthPx: 2000, heightPx: 1000, qualityStatus: "good" },
    { label: "warning", widthPx: 1008, heightPx: 480, qualityStatus: "warning" },
    { label: "legacy", widthPx: 10, heightPx: 10, qualityStatus: undefined },
  ]) {
    const payload = v2Customization(product, "mug-ceramic-standard-v1", 1, ["wrap"], { wrap: await uploadArtwork(1008, 480) });
    const uploadId = await uploadArtwork(fixture.widthPx, fixture.heightPx);
    payload.designDocument.assets[fixture.label] = {
      assetId: fixture.label,
      kind: "image",
      mimeType: "image/png",
      widthPx: fixture.widthPx,
      heightPx: fixture.heightPx,
      sizeBytes: 24,
      createdAt: "2026-10-04T08:00:00.000Z",
      ...(fixture.qualityStatus ? { qualityStatus: fixture.qualityStatus } : {}),
    };
    payload.designDocument.views.wrap.elements.push({ id: `image-${fixture.label}`, type: "image", printAreaId: "wrap-main", assetId: fixture.label, x: 0.1, y: 0.1, width: 0.4, height: 0.4, rotation: 0, opacity: 1, zIndex: 0, hidden: false });
    payload.uploads.assets[fixture.label] = uploadId;
    const response = await request(app).post("/api/orders").send(orderPayload(product, payload));
    assert.equal(response.status, 201, `${fixture.label}: ${JSON.stringify(response.body)}`);
  }
});

test("quality gate rechaza rejected y payload manipulado", async () => {
  const product = await Product.create({ name: "Taza quality gate inválida", price: 20, stock: 10, active: true, customizable: true, productTemplateId: "mug-ceramic-standard-v1" });
  for (const fixture of [
    { qualityStatus: "rejected", widthPx: 300, heightPx: 1000 },
    { qualityStatus: "good", widthPx: 300, heightPx: 1000 },
    { qualityStatus: "good", widthPx: 2000, heightPx: 1000 },
  ]) {
    const payload = v2Customization(product, "mug-ceramic-standard-v1", 1, ["wrap"], { wrap: await uploadArtwork(1008, 480) });
    const uploadId = await uploadArtwork(300, 1000);
    payload.designDocument.assets.image = { assetId: "image", kind: "image", mimeType: "image/png", widthPx: fixture.widthPx, heightPx: fixture.heightPx, qualityStatus: fixture.qualityStatus, sizeBytes: 24, createdAt: "2026-10-04T08:00:00.000Z" };
    payload.designDocument.views.wrap.elements.push({ id: "image-element", type: "image", printAreaId: "wrap-main", assetId: "image", x: 0.1, y: 0.1, width: 0.4, height: 0.4, rotation: 0, opacity: 1, zIndex: 0, hidden: false });
    payload.uploads.assets.image = uploadId;
    const response = await request(app).post("/api/orders").send(orderPayload(product, payload));
    assert.equal(response.status, 400, JSON.stringify(response.body));
    assert.match(response.body.message, /Calidad de imagen no válida|dimensiones del asset no coinciden/);
  }
  assert.equal(await Customization.countDocuments(), 0);
});

test("pedido V2 de camiseta conserva cuatro superficies independientes en ZIP", async () => {
  const product = await Product.create({ name: "Camiseta básica personalizada", price: 25, stock: 10, active: true, customizable: true, productTemplateId: "tshirt-basic-v1", variants: { sizes: ["L"], colors: ["Blanco"] } });
  const dimensions = { front: [754, 1024], back: [747, 1024], "sleeve-left": [1024, 525], "sleeve-right": [1024, 525] };
  const uploads = {};
  for (const [viewId, [width, height]] of Object.entries(dimensions)) uploads[viewId] = await uploadArtwork(width, height);
  const variant = { size: "L", color: "Blanco" };
  const payload = v2Customization(product, "tshirt-basic-v1", 2, Object.keys(dimensions), uploads, variant);
  Object.entries(payload.designDocument.views).forEach(([viewId, view], index) => {
    view.elements.push({ id: `${viewId}-text`, type: "text", printAreaId: dimensions[viewId] ? `tshirt-${viewId}` : viewId, x: 0.08 + index * 0.05, y: 0.12 + index * 0.08, width: 0.3, height: 0.16, rotation: index === 3 ? 35 : 0, opacity: 1, zIndex: 0, hidden: false, content: `Marker ${viewId}`, fontSize: 0.09, color: "#111111", textAlign: "center", fontWeight: 500 });
  });
  const response = await request(app).post("/api/orders").send(orderPayload(product, payload, variant));
  assert.equal(response.status, 201, JSON.stringify(response.body));
  const customization = await Customization.findById(response.body.order.items[0].customizationId).lean();
  assert.deepEqual(customization.productionSurfaces.map((surface) => surface.viewId), Object.keys(dimensions));
  assert.deepEqual(customization.variant, variant);
  const zipBytes = await storageProvider.read(customization.productionBundle.zipStorageKey);
  const zipText = zipBytes.toString("latin1");
  for (const viewId of Object.keys(dimensions)) {
    assert.match(zipText, new RegExp(`production/${viewId}\\.png`));
    assert.match(zipText, new RegExp(`proofs/${viewId}-placement\\.png`));
    assert.match(zipText, new RegExp(`placement/${viewId}\\.json`));
    const surface = customization.productionSurfaces.find((candidate) => candidate.viewId === viewId);
    const metadata = JSON.parse((await storageProvider.read(surface.placementMetadata.storageKey)).toString("utf8"));
    assert.equal(metadata.viewId, viewId);
    assert.equal(metadata.surfaceId, `tshirt-${viewId}`);
    assert.equal(metadata.elements[0].rotation, viewId === "sleeve-right" ? 35 : 0);
  }
});

test("backend rechaza template o surface set V2 incompatibles sin truncar", async () => {
  const product = await Product.create({ name: "Taza", price: 20, stock: 10, active: true, customizable: true, productTemplateId: "mug-ceramic-standard-v1" });
  const uploadId = await uploadArtwork(1008, 480);
  const mismatch = v2Customization(product, "tshirt-basic-v1", 2, ["front", "back", "sleeve-left", "sleeve-right"], { front: uploadId, back: uploadId, "sleeve-left": uploadId, "sleeve-right": uploadId });
  const mismatchResponse = await request(app).post("/api/orders").send(orderPayload(product, mismatch));
  assert.equal(mismatchResponse.status, 400);

  const invalidSurface = v2Customization(product, "mug-ceramic-standard-v1", 1, ["wrap", "front"], { wrap: uploadId, front: uploadId });
  const surfaceResponse = await request(app).post("/api/orders").send(orderPayload(product, invalidSurface));
  assert.equal(surfaceResponse.status, 400);
  assert.equal(await Customization.countDocuments(), 0);
});
