// src/routes/orders.routes.js
import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/admin.middleware.js";
import {
  createOrder,
  getOrdersByUser,
  adminGetAllOrders,
  adminUpdateOrderStatus,
} from "../controllers/orders.controller.js";

export const ordersRouter = Router();

// todas requieren estar autenticado
//ordersRouter.use(requireAuth);

// usuario normal
ordersRouter.post("/", createOrder); // público
ordersRouter.get("/mine", requireAuth, getOrdersByUser);

// ADMIN: lista todos los pedidos
ordersRouter.get("/", requireAuth, requireAdmin, adminGetAllOrders);

// ADMIN: actualizar estado de un pedido
ordersRouter.patch("/:id/status", requireAuth, requireAdmin, adminUpdateOrderStatus);


