import { Router } from 'express';
import * as stockController from '../controllers/stockController.js';

const router = Router();

// Public Routes
router.get('/stock', stockController.getStock);
router.post('/buy', stockController.purchase);
router.post('/restock', stockController.restock);

// ✅ NEW ROUTES
router.get('/status', stockController.getSaleStatus);
router.post('/admin/open', stockController.openSale);
router.post('/admin/close', stockController.closeSale);

export default router;