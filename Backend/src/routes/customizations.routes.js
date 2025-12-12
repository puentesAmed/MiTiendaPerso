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
import path from "path";
import fs from "fs";

import { requireAuth } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/admin.middleware.js";

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
  (req, res) => {
    const { id } = req.params;

    const zipPath = path.resolve(
      "uploads",
      "customizations",
      `${id}.zip`
    );

    if (!fs.existsSync(zipPath)) {
      return res.status(404).json({
        ok: false,
        message: "ZIP no encontrado",
      });
    }

    // Headers CORRECTOS → ZIP NO SE CORROMPE
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=custom_${id}.zip`
    );

    return res.sendFile(zipPath);
  }
);
