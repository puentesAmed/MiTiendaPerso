import { Router } from "express";
import { optionalAuth, requireAuth } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/admin.middleware.js";
import { adminCreateCoupon, adminDeleteCoupon, adminListCoupons, adminUpdateCoupon, validateCouponForCart } from "../controllers/coupons.controller.js";

export const couponsRoutes = Router();
couponsRoutes.post("/validate", optionalAuth, validateCouponForCart);
couponsRoutes.get("/admin", requireAuth, requireAdmin, adminListCoupons);
couponsRoutes.post("/admin", requireAuth, requireAdmin, adminCreateCoupon);
couponsRoutes.put("/admin/:id", requireAuth, requireAdmin, adminUpdateCoupon);
couponsRoutes.delete("/admin/:id", requireAuth, requireAdmin, adminDeleteCoupon);
