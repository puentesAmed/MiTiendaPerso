import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("layout móvil mantiene toolbar fuera del canvas y reserva el warning", async () => {
  const shell = await readFile(new URL("./DesignerV2Shell.jsx", import.meta.url), "utf8");
  const stage = await readFile(new URL("./EditableDesignStage.jsx", import.meta.url), "utf8");
  assert.match(shell, /data-mobile-toolbar="outside-canvas"/);
  assert.doesNotMatch(shell, /className="sticky bottom-2[^"]*"[^>]*aria-label="Herramientas móviles"/);
  assert.match(stage, /data-mobile-canvas-layout="contained"/);
  assert.match(stage, /aspectRatio: garmentPresentation\?\.aspectRatio \|\| getViewAspectRatio\(template, view\)/);
  assert.match(stage, /width: `min\(100%, calc\(clamp/);
  assert.match(stage, /data-editor-presentation/);
  assert.match(stage, /className="mt-2 min-h-5"/);
  assert.doesNotMatch(stage, /absolute left-3 top-3[^\n]+view\.surface/);
});
