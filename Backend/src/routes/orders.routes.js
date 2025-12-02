import { Router } from 'express';
import {
  createOrder,
  getOrdersByUser,
} from '../controllers/orders.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';


export const ordersRouter = Router();

ordersRouter.use(requireAuth);

ordersRouter.post('/', requireAuth, createOrder);
ordersRouter.get('/mine', requireAuth, getOrdersByUser);
