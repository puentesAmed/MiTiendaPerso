import { createWriteStream } from "node:fs";
import {
  access,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

export class LocalStorageProvider {
  constructor(root) {
    if (!root || typeof root !== "string") {
      throw new Error("Storage root no configurado");
    }
    this.root = path.resolve(root);
  }

  normalizeKey(key) {
    if (
      typeof key !== "string" ||
      key.length === 0 ||
      key.includes("\0") ||
      path.isAbsolute(key) ||
      path.win32.isAbsolute(key)
    ) {
      throw new Error("Storage key no válida");
    }

    const slashKey = key.replaceAll("\\", "/");
    const segments = slashKey.split("/");
    if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
      throw new Error("Storage key no válida");
    }

    return segments.join("/");
  }

  resolve(key) {
    const normalizedKey = this.normalizeKey(key);
    const resolved = path.resolve(this.root, ...normalizedKey.split("/"));
    const relative = path.relative(this.root, resolved);

    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error("Storage key fuera del directorio permitido");
    }

    return resolved;
  }

  async ensureDirectory(key) {
    await mkdir(this.resolve(key), { recursive: true });
  }

  async ensureParent(key) {
    await mkdir(path.dirname(this.resolve(key)), { recursive: true });
  }

  async save(key, data) {
    await this.ensureParent(key);
    await writeFile(this.resolve(key), data);
    return this.normalizeKey(key);
  }

  async read(key) {
    return readFile(this.resolve(key));
  }

  async exists(key) {
    try {
      await access(this.resolve(key));
      return true;
    } catch (error) {
      if (error?.code === "ENOENT") return false;
      throw error;
    }
  }

  async delete(key) {
    await rm(this.resolve(key), { force: true });
  }

  async createWriteStream(key) {
    await this.ensureParent(key);
    return createWriteStream(this.resolve(key), { flags: "wx" });
  }

  async move(sourceKey, destinationKey) {
    await this.ensureParent(destinationKey);
    await rename(this.resolve(sourceKey), this.resolve(destinationKey));
  }

  getPublicUrl(key) {
    const encodedKey = this.normalizeKey(key)
      .split("/")
      .map(encodeURIComponent)
      .join("/");
    return `/uploads/${encodedKey}`;
  }
}
