// src/routes/orders.routes.js
import { Router } from "express";
import { requireAuth, optionalAuth } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/admin.middleware.js";
import {
  createOrder,
  getOrdersByUser,
  getOrderByIdForUser,
  adminGetAllOrders,
  adminUpdateOrderStatus,
  trackOrderByEmail,
  adminConfirmDeliveryDate,
  markOrderAsPaid,
  adminGetOrderEmails,
  adminRetryOrderEmail,
} from "../controllers/orders.controller.js";

export const ordersRouter = Router();

//Pedidos
ordersRouter.get("/track", trackOrderByEmail);
// todas requieren estar autenticado
//ordersRouter.use(requireAuth);

// usuario normal
ordersRouter.post("/", optionalAuth, createOrder); // público
ordersRouter.get("/mine", requireAuth, getOrdersByUser);
ordersRouter.get("/mine/:id", requireAuth, getOrderByIdForUser);
ordersRouter.post("/:id/mark-paid", requireAuth, requireAdmin, markOrderAsPaid);
ordersRouter.get("/:id/emails", requireAuth, requireAdmin, adminGetOrderEmails);
ordersRouter.post("/:id/emails/:event/retry", requireAuth, requireAdmin, adminRetryOrderEmail);

// ADMIN: lista todos los pedidos
ordersRouter.get("/", requireAuth, requireAdmin, adminGetAllOrders);

// ADMIN: actualizar estado de un pedido
ordersRouter.patch("/:id/status", requireAuth, requireAdmin, adminUpdateOrderStatus);

// Admin: actualizar fecha de entrega
ordersRouter.put("/admin/:id/delivery", requireAuth, requireAdmin, adminConfirmDeliveryDate);


