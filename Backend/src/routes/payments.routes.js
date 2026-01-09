// routes/payments.routes.js
import { Router } from "express";
import { moneiWebhook, createMoneiPayment } from "../controllers/payments.controller.js";

const router = Router();

// MONEI webhook
router.post("/webhooks/monei", moneiWebhook);

// Create MONEI payment
router.post("/monei/create", createMoneiPayment);

export default router;
