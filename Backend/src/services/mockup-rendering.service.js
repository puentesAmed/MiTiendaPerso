import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { env } from "../config/env.js";
import { getMockupManifest, resolveMockupTemplatePath } from "../mockups/mockup-manifest.js";
import { inspectPng } from "../mockups/png-validation.js";
import { storageProvider } from "../storage/index.js";

const BRIDGE_PATH = fileURLToPath(new URL("../integrations/mockup-engine/render_mockup.py", import.meta.url));

export class MockupRenderingError extends Error {
  constructor(code, status = 500) {
    super(code);
    this.name = "MockupRenderingError";
    this.code = code;
    this.status = status;
  }
}

function canonicalManifest(manifest) {
  return JSON.stringify({ mockupId: manifest.mockupId, revision: manifest.revision, sourceViewId: manifest.sourceViewId, placement: manifest.placement, output: manifest.output });
}

export function createMockupCacheKey(artwork, manifest) {
  return createHash("sha256").update(artwork).update("\0").update(canonicalManifest(manifest)).digest("hex");
}

export function runPythonProcess({ executable, engineRoot, requestPath, timeoutMs, spawnProcess = spawn }) {
  return new Promise((resolve, reject) => {
    const child = spawnProcess(executable, [BRIDGE_PATH, "--engine-root", engineRoot, "--request", requestPath], { shell: false, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const append = (current, chunk) => (current + chunk.toString("utf8")).slice(-8192);
    child.stdout?.on("data", (chunk) => { stdout = append(stdout, chunk); });
    child.stderr?.on("data", (chunk) => { stderr = append(stderr, chunk); });
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, timeoutMs);
    child.once("error", (error) => { clearTimeout(timer); reject(error); });
    child.once("close", (code) => {
      clearTimeout(timer);
      if (timedOut) reject(new MockupRenderingError("RENDER_TIMEOUT", 504));
      else if (code !== 0) reject(new Error(stderr || `Python terminó con código ${code}`));
      else resolve(stdout);
    });
  });
}

export class MockupRenderingService {
  constructor({ config = env.MOCKUP_ENGINE, storage = storageProvider, processRunner = runPythonProcess, tempRoot = os.tmpdir() } = {}) {
    this.config = config;
    this.storage = storage;
    this.processRunner = processRunner;
    this.tempRoot = tempRoot;
    this.active = 0;
  }

  async renderMockup({ artwork, templateId, mockupId, sourceViewId }) {
    if (!this.config?.enabled || !this.config.root) throw new MockupRenderingError("ENGINE_DISABLED", 503);
    try {
      inspectPng(artwork);
    } catch {
      throw new MockupRenderingError("INVALID_ARTWORK", 400);
    }
    const manifest = getMockupManifest({ templateId, mockupId, sourceViewId });
    if (!manifest) throw new MockupRenderingError("INVALID_MANIFEST", 400);
    if (this.active >= this.config.maxConcurrency) throw new MockupRenderingError("ENGINE_BUSY", 429);
    const cacheKey = createMockupCacheKey(artwork, manifest);
    const storageKey = `designer-v2/mockups/${cacheKey}.png`;
    if (await this.storage.exists(storageKey)) return this.result(manifest, cacheKey, storageKey, await this.storage.read(storageKey), true);

    this.active += 1;
    let temporaryDirectory;
    try {
      temporaryDirectory = await mkdtemp(path.join(this.tempRoot, "mitienda-mockup-"));
      const artworkPath = path.join(temporaryDirectory, "artwork.png");
      const outputPath = path.join(temporaryDirectory, "output.png");
      const requestPath = path.join(temporaryDirectory, "request.json");
      await writeFile(artworkPath, artwork);
      await writeFile(requestPath, JSON.stringify({ artworkPath, outputPath, templatePath: resolveMockupTemplatePath(manifest), placement: manifest.placement }));
      try {
        await this.processRunner({ executable: this.config.python, engineRoot: this.config.root, requestPath, timeoutMs: this.config.timeoutMs });
      } catch (error) {
        if (error instanceof MockupRenderingError) throw error;
        throw new MockupRenderingError("RENDERING_FAILED", 502);
      }
      const output = await readFile(outputPath);
      try {
        inspectPng(output);
      } catch {
        throw new MockupRenderingError("RENDERING_FAILED", 502);
      }
      try {
        await this.storage.save(storageKey, output);
      } catch {
        throw new MockupRenderingError("STORAGE_FAILED", 500);
      }
      return this.result(manifest, cacheKey, storageKey, output, false);
    } finally {
      this.active -= 1;
      if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true });
    }
  }

  result(manifest, cacheKey, storageKey, output, cached) {
    const dimensions = inspectPng(output);
    return { mockupId: manifest.mockupId, sourceViewId: manifest.sourceViewId, manifestRevision: manifest.revision, cacheKey, url: this.storage.getPublicUrl(storageKey), width: dimensions.width, height: dimensions.height, sizeBytes: dimensions.sizeBytes, cached, kind: manifest.kind };
  }
}

export const mockupRenderingService = new MockupRenderingService();

