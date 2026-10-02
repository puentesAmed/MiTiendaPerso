import { Router } from "express";
import { getShippingQuote } from "../controllers/shipping.controller.js";
import { optionalAuth } from "../middleware/auth.middleware.js";

export const shippingRoutes = Router();

shippingRoutes.post("/quote", optionalAuth, getShippingQuote);


