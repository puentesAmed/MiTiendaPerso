import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";

test("header conserva navegación y usa logo/isotipo oficiales con alt", () => {
  const logo = readFileSync(new URL("../common/Logo/Logo.jsx", import.meta.url), "utf8");
  const header = readFileSync(new URL("./SiteHeader.jsx", import.meta.url), "utf8");
  const html = readFileSync(new URL("../../../index.html", import.meta.url), "utf8");
  assert.match(header, /<Link to="\/"[^>]*>\s*<Logo\s*\/>/);
  assert.match(logo, /milugui-logo\.svg" alt="MiLuGui"/);
  assert.match(logo, /milugui-isotipo\.png" alt="MiLuGui"/);
  assert.match(logo, /md:hidden/);
  assert.match(logo, /md:block/);
  assert.match(html, /rel="icon"[^>]*milugui-isotipo\.png/);
  for (const name of ["milugui-logo.svg", "milugui-logo-email.png", "milugui-isotipo.png"]) {
    assert.ok(statSync(new URL(`../../../public/brand/${name}`, import.meta.url)).size > 0);
  }
});
