import { Router } from "express";
import multer from "multer";

import { MAX_ARTWORK_BYTES, inspectPng } from "../mockups/png-validation.js";
import { MockupRenderingError, mockupRenderingService } from "../services/mockup-rendering.service.js";

const messages = {
  ENGINE_DISABLED: "La generación de mockups no está disponible.",
  INVALID_ARTWORK: "El artwork PNG no es válido.",
  INVALID_MANIFEST: "El mockup solicitado no es válido.",
  RENDERING_FAILED: "No se pudo generar el mockup.",
  RENDER_TIMEOUT: "La generación del mockup superó el tiempo permitido.",
  STORAGE_FAILED: "No se pudo almacenar el mockup.",
  ENGINE_BUSY: "El generador está ocupado. Inténtalo de nuevo.",
};

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_ARTWORK_BYTES, files: 1, fields: 4 }, fileFilter: (_req, file, callback) => callback(null, file.mimetype === "image/png") });

export function createDesignerV2MockupsRouter({ service = mockupRenderingService } = {}) {
  const router = Router();
  router.post("/", (req, res) => {
    upload.single("artwork")(req, res, async (uploadError) => {
      if (uploadError || !req.file) return res.status(uploadError?.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ success: false, code: "INVALID_ARTWORK", message: messages.INVALID_ARTWORK });
      try {
        inspectPng(req.file.buffer);
        const mockup = await service.renderMockup({ artwork: req.file.buffer, templateId: req.body.templateId, mockupId: req.body.mockupId, sourceViewId: req.body.sourceViewId });
        return res.json({ success: true, mockup });
      } catch (error) {
        const normalized = error instanceof MockupRenderingError ? error : new MockupRenderingError(error.message === "INVALID_ARTWORK" ? "INVALID_ARTWORK" : "RENDERING_FAILED", error.message === "INVALID_ARTWORK" ? 400 : 500);
        return res.status(normalized.status).json({ success: false, code: normalized.code, message: messages[normalized.code] || messages.RENDERING_FAILED });
      }
    });
  });
  return router;
}

export const designerV2MockupsRouter = createDesignerV2MockupsRouter();

