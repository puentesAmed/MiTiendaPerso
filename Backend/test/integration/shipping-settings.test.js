import test from "node:test";
import assert from "node:assert/strict";
import {
  defaultShippingSettings,
  normalizeShippingSettings,
  validateShippingSettings,
} from "../../src/services/shipping-settings.service.js";

const validBands = [
  { minKm: 0, maxKm: 10, amount: 5 },
  { minKm: 10, maxKm: 20, amount: 8 },
  { minKm: 20, maxKm: 30, amount: 12 },
  { minKm: 30, maxKm: 40, amount: 18 },
];

function settingsWithBands(bands, maxDistanceKm = 40) {
  return normalizeShippingSettings({
    localUrgent: {
      enabled: true,
      label: "Urgente local",
      originAddress: "Origen",
      maxDistanceKm,
      bands,
    },
  }, defaultShippingSettings());
}

test("normaliza estimatedDays ausente como null y acepta bandas adyacentes", () => {
  const settings = settingsWithBands(validBands);
  assert.doesNotThrow(() => validateShippingSettings(settings));
  assert.deepEqual(settings.localUrgent.bands.map((band) => band.estimatedDays), [null, null, null, null]);
});

test("acepta minKm y amount igual a cero", () => {
  const settings = settingsWithBands([{ minKm: 0, maxKm: 10, amount: 0 }], 10);
  assert.doesNotThrow(() => validateShippingSettings(settings));
});

test("rechaza números obligatorios ausentes, vacíos, no finitos o negativos", () => {
  const invalidBands = [
    { minKm: null, maxKm: 10, amount: 5 },
    { minKm: "", maxKm: 10, amount: 5 },
    { minKm: " ", maxKm: 10, amount: 5 },
    { minKm: Number.NaN, maxKm: 10, amount: 5 },
    { minKm: -1, maxKm: 10, amount: 5 },
    { minKm: 0, maxKm: null, amount: 5 },
    { minKm: 0, maxKm: "", amount: 5 },
    { minKm: 0, maxKm: 10, amount: null },
    { minKm: 0, maxKm: 10, amount: "" },
    { minKm: 0, maxKm: 10, amount: -1 },
  ];
  for (const band of invalidBands) {
    assert.throws(() => validateShippingSettings(settingsWithBands([band])), /inválid|min < max/);
  }
});

test("rechaza maxKm menor o igual que minKm, solapamientos y exceso de distancia", () => {
  assert.throws(() => validateShippingSettings(settingsWithBands([{ minKm: 10, maxKm: 10, amount: 1 }])), /min < max/);
  assert.throws(() => validateShippingSettings(settingsWithBands([
    { minKm: 0, maxKm: 10, amount: 1 },
    { minKm: 9, maxKm: 20, amount: 2 },
  ])), /solaparse/);
  assert.throws(() => validateShippingSettings(settingsWithBands([{ minKm: 0, maxKm: 41, amount: 1 }])), /distancia máxima/);
});

test("estimatedDays es opcional pero, si aparece, debe ser completo y válido", () => {
  assert.doesNotThrow(() => validateShippingSettings(settingsWithBands([
    { minKm: 0, maxKm: 10, amount: 1, estimatedDays: { min: 0, max: 0 } },
  ])));
  const invalidEstimates = [
    { min: 1 },
    { max: 2 },
    { min: "", max: 2 },
    { min: 1, max: "" },
    { min: -1, max: 2 },
    { min: 2, max: 1 },
    { min: Number.NaN, max: 2 },
  ];
  for (const estimatedDays of invalidEstimates) {
    assert.throws(() => validateShippingSettings(settingsWithBands([
      { minKm: 0, maxKm: 10, amount: 1, estimatedDays },
    ])), /plazo/);
  }
});
