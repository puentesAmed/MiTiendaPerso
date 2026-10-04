import { Router } from 'express';
import {
  getProducts,
  adminGetProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  quoteCustomization,
} from '../controllers/products.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/admin.middleware.js';

export const productsRouter = Router();

// Público
productsRouter.get('/', getProducts);

// Admin
productsRouter.get('/admin', requireAuth, requireAdmin, adminGetProducts);
productsRouter.post('/:id/customization-quote', quoteCustomization);
productsRouter.post('/', requireAuth, requireAdmin, createProduct);
productsRouter.put('/:id', requireAuth, requireAdmin, updateProduct);
productsRouter.delete('/:id', requireAuth, requireAdmin, deleteProduct);

productsRouter.get('/:id', getProduct);
