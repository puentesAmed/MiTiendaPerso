import test from "node:test";
import assert from "node:assert/strict";
import { MAX_IMAGE_BYTES, validateImageFile } from "./runtimeAssetRegistry.js";

test("acepta MIME de imagen permitido dentro del límite", () => {
  assert.equal(validateImageFile({ type: "image/webp", size: 1024 }), true);
});

test("rechaza MIME disfrazado y archivos demasiado grandes", () => {
  assert.throws(() => validateImageFile({ type: "application/octet-stream", size: 1024 }), /JPEG, PNG o WebP/);
  assert.throws(() => validateImageFile({ type: "image/png", size: MAX_IMAGE_BYTES + 1 }), /10 MiB/);
});
