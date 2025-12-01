import { Router } from 'express';
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/products.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/admin.middleware.js';

export const productsRouter = Router();

// Público
productsRouter.get('/', getProducts);
productsRouter.get('/:id', getProduct);

// Admin
productsRouter.post('/', requireAuth, requireAdmin, createProduct);
productsRouter.put('/:id', requireAuth, requireAdmin, updateProduct);
productsRouter.delete('/:id', requireAuth, requireAdmin, deleteProduct);
