import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";

const MANUAL_PAYMENT_KEYS = [
  "MANUAL_PAYMENT_BIZUM_ENABLED",
  "MANUAL_PAYMENT_BIZUM_RECIPIENT",
  "MANUAL_PAYMENT_BIZUM_INSTRUCTIONS",
  "MANUAL_PAYMENT_BANK_TRANSFER_ENABLED",
  "MANUAL_PAYMENT_BANK_ACCOUNT_HOLDER",
  "MANUAL_PAYMENT_BANK_IBAN",
  "MANUAL_PAYMENT_BANK_INSTRUCTIONS",
];

function loadConfig(overrides = {}) {
  const childEnv = {
    ...process.env,
    DOTENV_CONFIG_PATH: path.join(
      process.cwd(),
      "test",
      "fixtures",
      "missing-manual-payments.env"
    ),
    MONGO_URI: "mongodb://127.0.0.1/mitiendaperso-config-only",
    JWT_SECRET: "test-jwt-secret",
    NODE_ENV: "test",
  };

  for (const key of MANUAL_PAYMENT_KEYS) delete childEnv[key];
  Object.assign(childEnv, overrides);

  return spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      "import('./src/config/env.js').then(({ env }) => console.log(JSON.stringify(env.MANUAL_PAYMENTS)))",
    ],
    {
      cwd: process.cwd(),
      env: childEnv,
      encoding: "utf8",
    }
  );
}

const validBizum = {
  MANUAL_PAYMENT_BIZUM_ENABLED: "true",
  MANUAL_PAYMENT_BIZUM_RECIPIENT: "test-recipient",
  MANUAL_PAYMENT_BIZUM_INSTRUCTIONS: "test-instructions",
};

const validBankTransfer = {
  MANUAL_PAYMENT_BANK_TRANSFER_ENABLED: "true",
  MANUAL_PAYMENT_BANK_ACCOUNT_HOLDER: "Test Holder",
  MANUAL_PAYMENT_BANK_IBAN: "ES00TEST0000000000000000",
  MANUAL_PAYMENT_BANK_INSTRUCTIONS: "test-bank-instructions",
};

test("ambos métodos apagados permiten arrancar sin su configuración", () => {
  const result = loadConfig();

  assert.equal(result.status, 0, result.stderr);
  const manualPayments = JSON.parse(result.stdout.trim());
  assert.equal(manualPayments.bizum.enabled, false);
  assert.equal(manualPayments.bankTransfer.enabled, false);
});

test("Bizum activo y completo es válido", () => {
  const result = loadConfig(validBizum);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout.trim()).bizum.enabled, true);
});

test("Bizum activo e incompleto produce error explícito", () => {
  const result = loadConfig({
    MANUAL_PAYMENT_BIZUM_ENABLED: "true",
    MANUAL_PAYMENT_BIZUM_RECIPIENT: "test-recipient",
  });

  assert.notEqual(result.status, 0);
  assert.match(
    `${result.stdout}\n${result.stderr}`,
    /MANUAL_PAYMENT_BIZUM_INSTRUCTIONS/
  );
});

test("transferencia activa y completa es válida", () => {
  const result = loadConfig(validBankTransfer);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout.trim()).bankTransfer.enabled, true);
});

test("transferencia activa e incompleta produce error explícito", () => {
  const result = loadConfig({
    MANUAL_PAYMENT_BANK_TRANSFER_ENABLED: "true",
    MANUAL_PAYMENT_BANK_ACCOUNT_HOLDER: "Test Holder",
    MANUAL_PAYMENT_BANK_IBAN: "ES00TEST0000000000000000",
  });

  assert.notEqual(result.status, 0);
  assert.match(
    `${result.stdout}\n${result.stderr}`,
    /MANUAL_PAYMENT_BANK_INSTRUCTIONS/
  );
});

test("ambos métodos activos y completos quedan disponibles", () => {
  const result = loadConfig({ ...validBizum, ...validBankTransfer });

  assert.equal(result.status, 0, result.stderr);
  const manualPayments = JSON.parse(result.stdout.trim());
  assert.equal(manualPayments.bizum.enabled, true);
  assert.equal(manualPayments.bankTransfer.enabled, true);
});
