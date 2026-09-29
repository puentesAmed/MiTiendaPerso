// src/routes/uploads.routes.js
import { Router } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";

import { storageProvider } from "../storage/index.js";

const uploadRouter = Router();
const publicUploadsRouter = Router();
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const IMAGE_EXTENSIONS = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    storageProvider
      .ensureDirectory("customizations")
      .then(() => cb(null, storageProvider.resolve("customizations")))
      .catch(cb);
  },
  filename: (_req, file, cb) => {
    const ext = IMAGE_EXTENSIONS.get(file.mimetype);
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!IMAGE_EXTENSIONS.has(file.mimetype)) {
      return cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "file"));
    }
    cb(null, true);
  },
});

uploadRouter.post("/image", (req, res) => {
  upload.single("file")(req, res, (error) => {
    if (error) {
      const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      return res.status(status).json({
        ok: false,
        message:
          status === 413
            ? "La imagen supera el límite de 10 MB"
            : "Archivo de imagen no válido",
      });
    }

    if (!req.file) {
      return res.status(400).json({ ok: false, message: "Falta la imagen" });
    }

    return res.json({
      ok: true,
      url: storageProvider.getPublicUrl(`customizations/${req.file.filename}`),
    });
  });
});

publicUploadsRouter.get("/customizations/:filename", async (req, res, next) => {
  const { filename } = req.params;
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*\.(?:jpe?g|png|webp)$/i.test(filename)) {
    return res.status(404).json({ ok: false, message: "Archivo no encontrado" });
  }

  try {
    const key = `customizations/${filename}`;
    if (!(await storageProvider.exists(key))) {
      return res.status(404).json({ ok: false, message: "Archivo no encontrado" });
    }
    return res.sendFile(storageProvider.resolve(key), (error) => {
      if (error && !res.headersSent) next(error);
    });
  } catch {
    return res.status(404).json({ ok: false, message: "Archivo no encontrado" });
  }
});

publicUploadsRouter.get("/designer-v2/mockups/:filename", async (req, res, next) => {
  const { filename } = req.params;
  if (!/^[a-f0-9]{64}\.png$/.test(filename)) return res.status(404).json({ ok: false, message: "Archivo no encontrado" });
  try {
    const key = `designer-v2/mockups/${filename}`;
    if (!(await storageProvider.exists(key))) return res.status(404).json({ ok: false, message: "Archivo no encontrado" });
    return res.sendFile(storageProvider.resolve(key), (error) => {
      if (error && !res.headersSent) next(error);
    });
  } catch {
    return res.status(404).json({ ok: false, message: "Archivo no encontrado" });
  }
});

export { publicUploadsRouter, uploadRouter };
