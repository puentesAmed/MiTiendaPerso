import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("runtime Three, GLTFLoader y OrbitControls usan imports dinámicos", async () => {
  const source = await readFile(new URL("./threeRuntime.js", import.meta.url), "utf8");
  assert.match(source, /import\("three"\)/);
  assert.match(source, /import\("three\/addons\/loaders\/GLTFLoader\.js"\)/);
  assert.match(source, /import\("three\/addons\/controls\/OrbitControls\.js"\)/);
  assert.doesNotMatch(source, /^import .* from "three"/m);
});

test("componente 3D también cruza una frontera lazy y libera el adapter", async () => {
  const shell = await readFile(new URL("../components/DesignerV2Shell.jsx", import.meta.url), "utf8");
  const preview = await readFile(new URL("../components/ThreeProductPreview.jsx", import.meta.url), "utf8");
  assert.match(shell, /lazy\(\(\) => import\("\.\/ThreeProductPreview\.jsx"\)/);
  assert.match(preview, /adapter\?\.dispose\(\)/);
  assert.match(preview, /adapterRef\.current\.updateArtworks/);
  assert.doesNotMatch(preview, /from "three"/);
});

