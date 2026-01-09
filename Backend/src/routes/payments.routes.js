// routes/payments.routes.js
import { Router } from "express";
import { moneiWebhook, createMoneiPayment, markOrderAsPaidForTest } from "../controllers/payments.controller.js";

const router = Router();

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
