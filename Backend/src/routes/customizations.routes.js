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

/* ---------------------------------------------------------
 * ADMIN: descargar ZIP de personalización (CRÍTICO)
 * --------------------------------------------------------- */
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
      const key = `customizations/${id}.zip`;
      if (!(await storageProvider.exists(key))) {
        return res.status(404).json({ ok: false, message: "ZIP no encontrado" });
      }

      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename=custom_${id}.zip`);
      return res.sendFile(storageProvider.resolve(key), (error) => {
        if (error && !res.headersSent) next(error);
      });
    } catch {
      return res.status(404).json({ ok: false, message: "ZIP no encontrado" });
    }
  }
);
