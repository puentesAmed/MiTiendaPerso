import { Router } from "express";
import { adminGetShippingSettings, adminUpdateShippingSettings, getShippingQuote } from "../controllers/shipping.controller.js";
import { optionalAuth, requireAuth } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/admin.middleware.js";

export const shippingRoutes = Router();

shippingRoutes.post("/quote", optionalAuth, getShippingQuote);
shippingRoutes.get("/admin/settings", requireAuth, requireAdmin, adminGetShippingSettings);
shippingRoutes.put("/admin/settings", requireAuth, requireAdmin, adminUpdateShippingSettings);


