import { Router } from "express";
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


