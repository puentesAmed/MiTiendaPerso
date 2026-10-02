/*import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/admin.middleware.js";

import {
  getCustomizationsByOrder,
  getAllCustomizations,
  updateCustomizationStatus
} from "../controllers/customizations.controller.js";

export const customizationRoutes = Router();

// ADMIN: ver todas las personalizaciones
customizationRoutes.get("/", requireAuth , requireAdmin, getAllCustomizations);

// ADMIN: ver personalizaciones de un pedido
customizationRoutes.get("/order/:orderId", requireAuth , requireAdmin, getCustomizationsByOrder);

// ADMIN: actualizar estado
customizationRoutes.patch("/:id/status", requireAuth , requireAdmin, updateCustomizationStatus);


*/

import { Router } from "express";
import mongoose from "mongoose";

import { requireAuth } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/admin.middleware.js";
import { storageProvider } from "../storage/index.js";
import { Customization } from "../models/Customization.js";
import { generateCustomizationZip } from "../utils/generateCustomizationZip.js";

import {
  getCustomizationsByOrder,
  getAllCustomizations,
  updateCustomizationStatus,
} from "../controllers/customizations.controller.js";

export const customizationRoutes = Router();

/* ---------------------------------------------------------
 * ADMIN: ver todas las personalizaciones
 * --------------------------------------------------------- */
customizationRoutes.get(
  "/",
  requireAuth,
  requireAdmin,
  getAllCustomizations
);

/* ---------------------------------------------------------
 * ADMIN: ver personalizaciones de un pedido
 * --------------------------------------------------------- */
customizationRoutes.get(
  "/order/:orderId",
  requireAuth,
  requireAdmin,
  getCustomizationsByOrder
);

/* ---------------------------------------------------------
 * ADMIN: actualizar estado
 * --------------------------------------------------------- */
customizationRoutes.patch(
  "/:id/status",
  requireAuth,
  requireAdmin,
  updateCustomizationStatus
);

customizationRoutes.post(
  "/:id/bundle",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ ok: false, message: "Personalización no encontrada" });
    const customization = await Customization.findById(req.params.id);
    if (!customization || customization.schemaVersion !== 2) return res.status(404).json({ ok: false, message: "Personalización V2 no encontrada" });
    try {
      await generateCustomizationZip(customization);
      return res.json({ ok: true, productionStatus: customization.productionStatus, zipUrl: customization.zipUrl });
    } catch {
      customization.productionStatus = "issue";
      customization.productionStatusUpdatedAt = new Date();
      customization.productionError = "No se pudo regenerar el bundle productivo";
      await customization.save().catch(() => {});
      return res.status(500).json({ ok: false, message: "No se pudo regenerar el bundle" });
    }
  }
);

/* ---------------------------------------------------------
 * ADMIN: descargar ZIP de personalización (CRÍTICO)
 * --------------------------------------------------------- */
customizationRoutes.get(
  "/:id/surfaces/:surfaceId/:kind(artwork|preview|proof|placement)",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const { id, surfaceId, kind } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(404).json({ ok: false, message: "Artifact no encontrado" });
    const customization = await Customization.findById(id).lean();
    const surface = customization?.schemaVersion === 2
      ? customization.productionSurfaces?.find((item) => item.viewId === surfaceId || item.surfaceId === surfaceId)
      : null;
    const artifact = kind === "proof"
      ? surface?.placementProof
      : kind === "placement"
        ? surface?.placementMetadata
        : surface?.[kind];
    if (!artifact?.storageKey || !(await storageProvider.exists(artifact.storageKey))) {
      return res.status(404).json({ ok: false, message: "Artifact no encontrado" });
    }
    res.setHeader("Content-Type", artifact.mimeType || (kind === "placement" ? "application/json" : "image/png"));
    res.setHeader("Content-Disposition", `${["preview", "proof"].includes(kind) ? "inline" : "attachment"}; filename="${artifact.filename}"`);
    return res.end(await storageProvider.read(artifact.storageKey));
  }
);

customizationRoutes.get(
  "/:id/zip",
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ ok: false, message: "ZIP no encontrado" });
    }

    try {
      const legacyKey = `customizations/${id}.zip`;
      let key = (await storageProvider.exists(legacyKey)) ? legacyKey : null;
      if (!key) {
        const customization = await Customization.findById(id).select("schemaVersion productionBundle.zipStorageKey").lean();
        key = customization?.schemaVersion === 2 ? customization.productionBundle?.zipStorageKey : null;
      }
      if (!key) return res.status(404).json({ ok: false, message: "ZIP no encontrado" });
      if (!(await storageProvider.exists(key))) {
        return res.status(404).json({ ok: false, message: "ZIP no encontrado" });
      }

      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename=custom_${id}.zip`);
      return res.end(await storageProvider.read(key));
    } catch {
      return res.status(404).json({ ok: false, message: "ZIP no encontrado" });
    }
  }
);
