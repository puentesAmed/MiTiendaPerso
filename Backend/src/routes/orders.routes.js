// routes/orders.routes.js
import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { createOrder, getOrdersByUser } from "../controllers/orders.controller.js";

export const ordersRouter = Router();

ordersRouter.post("/", requireAuth, createOrder);
ordersRouter.get("/", requireAuth, getOrdersByUser);
