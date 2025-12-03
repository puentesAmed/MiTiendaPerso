/*import { Router } from 'express';
import {
  createOrder,
  getOrdersByUser,
} from '../controllers/orders.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';


export const ordersRouter = Router();

ordersRouter.use(requireAuth);

ordersRouter.post('/', requireAuth, createOrder);
ordersRouter.get('/mine', requireAuth, getOrdersByUser);
*/


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
ordersRouter.use(requireAuth);

// usuario normal
ordersRouter.post("/", createOrder);
ordersRouter.get("/mine", getOrdersByUser);

// ADMIN: lista todos los pedidos
ordersRouter.get("/", requireAuth, requireAdmin, adminGetAllOrders);

// ADMIN: actualizar estado de un pedido
ordersRouter.patch("/:id/status", requireAuth, requireAdmin, adminUpdateOrderStatus);


