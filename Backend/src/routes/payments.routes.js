// routes/payments.routes.js
import { Router } from "express";
import {
  createMoneiPayment,
  getManualPaymentMethods,
  markOrderAsPaidForTest,
  moneiWebhook,
} from "../controllers/payments.controller.js";

const router = Router();

router.get("/manual/methods", getManualPaymentMethods);

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
