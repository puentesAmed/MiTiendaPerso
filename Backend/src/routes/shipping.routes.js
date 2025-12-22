import { Router } from "express";
import { getShippingQuote } from "../controllers/shipping.controller.js";

export const shippingRoutes = Router();

shippingRoutes.post("/quote", getShippingQuote);


