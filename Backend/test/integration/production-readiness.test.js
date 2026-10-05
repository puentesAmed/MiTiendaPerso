import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import request from "supertest";

import { createApp } from "../../src/app.js";
import { env } from "../../src/config/env.js";

const CONFIG_KEYS = [
  "CORS_ORIGINS",
  "FRONTEND_URL",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USER",
  "SMTP_PASS",
  "EMAIL_FROM",
  "ADMIN_EMAIL",
  "TRANSACTIONAL_EMAIL_ENABLED",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "RESEND_FROM_NAME",
  "ADMIN_NOTIFICATION_EMAIL",
  "STORAGE_PROVIDER",
  "STORAGE_ROOT",
];

function loadProductionConfig(overrides = {}) {
  const childEnv = { ...process.env };
  for (const key of CONFIG_KEYS) delete childEnv[key];

  Object.assign(childEnv, {
    DOTENV_CONFIG_PATH: path.join(process.cwd(), "test", "fixtures", "missing-production.env"),
    NODE_ENV: "production",
    MONGO_URI: "mongodb://127.0.0.1/mitiendaperso-config-only",
    JWT_SECRET: "test-only-secret-with-at-least-32-characters",
    FRONTEND_URL: "https://shop.example.test",
    STORAGE_PROVIDER: "local",
    STORAGE_ROOT: path.join(process.cwd(), "test-storage-config-only"),
    ...overrides,
  });

  return spawnSync(
    process.execPath,
    ["--input-type=module", "--eval", "import('./src/config/env.js').then(() => console.log('ok'))"],
    { cwd: process.cwd(), env: childEnv, encoding: "utf8" }
  );
}

test("health es barato y helmet aplica cabeceras seguras", async () => {
  const response = await request(createApp()).get("/health");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { status: "ok" });
  assert.equal(response.headers["x-content-type-options"], "nosniff");
  assert.equal(response.headers["cross-origin-resource-policy"], "cross-origin");
});

test("CORS de staging permite origen exacto y Authorization sin wildcard", async () => {
  const originalOrigins = [...env.CORS_ORIGINS];
  env.CORS_ORIGINS.splice(0, env.CORS_ORIGINS.length, "https://staging-shop.netlify.app");

  try {
    const allowed = await request(createApp())
      .get("/health")
      .set("Origin", "https://staging-shop.netlify.app");
    assert.equal(allowed.headers["access-control-allow-origin"], "https://staging-shop.netlify.app");

    const rejected = await request(createApp())
      .get("/health")
      .set("Origin", "https://untrusted.example");
    assert.equal(rejected.headers["access-control-allow-origin"], undefined);

    const preflight = await request(createApp())
      .options("/api/uploads/image")
      .set("Origin", "https://staging-shop.netlify.app")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "authorization,content-type");
    assert.equal(preflight.status, 204);
    assert.match(preflight.headers["access-control-allow-headers"], /authorization/i);
  } finally {
    env.CORS_ORIGINS.splice(0, env.CORS_ORIGINS.length, ...originalOrigins);
  }
});

test("producción arranca con configuración mínima segura", () => {
  const result = loadProductionConfig();
  assert.equal(result.status, 0, result.stderr);
});

test("producción rechaza JWT corto", () => {
  const result = loadProductionConfig({ JWT_SECRET: "short" });
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /JWT_SECRET/);
});

test("producción rechaza CORS wildcard", () => {
  const result = loadProductionConfig({ CORS_ORIGINS: "*" });
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /CORS_ORIGINS/);
});

test("producción exige FRONTEND_URL", () => {
  const result = loadProductionConfig({ FRONTEND_URL: "" });
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /FRONTEND_URL/);
});

test("producción exige STORAGE_ROOT", () => {
  const result = loadProductionConfig({ STORAGE_ROOT: "" });
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /STORAGE_ROOT/);
});

test("SMTP parcial impide arrancar", () => {
  const result = loadProductionConfig({ SMTP_HOST: "smtp.example.test" });
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /SMTP/);
});

test("Resend habilitado sin configuración informa sin derribar ecommerce", () => {
  const result = loadProductionConfig({ TRANSACTIONAL_EMAIL_ENABLED: "true" });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /config_incomplete/);
  assert.doesNotMatch(result.stderr, /Bearer|re_/);
});
