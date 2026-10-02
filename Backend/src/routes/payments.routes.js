// routes/payments.routes.js
import { Router } from "express";
import {
  createMoneiPayment,
  getManualPaymentMethods,
  markOrderAsPaidForTest,
  moneiWebhook,
  adminGetPaymentSettings,
  adminUpdatePaymentSettings,
} from "../controllers/payments.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/admin.middleware.js";

const router = Router();

router.get("/manual/methods", getManualPaymentMethods);
router.get("/admin/settings", requireAuth, requireAdmin, adminGetPaymentSettings);
router.put("/admin/settings", requireAuth, requireAdmin, adminUpdatePaymentSettings);

// MONEI webhook
router.post("/webhooks/monei", moneiWebhook);

// Create MONEI payment
router.post("/monei/create", createMoneiPayment);

if (process.env.NODE_ENV !== "production") {
  router.post(
    "/test/mark-paid/:orderId",
    markOrderAsPaidForTest
  );
}

export default router;
