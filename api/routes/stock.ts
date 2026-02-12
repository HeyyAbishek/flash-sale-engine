import { Router } from 'express';
import * as stockController from '../controllers/stockController.js';

const router = Router();

// Public Routes
router.get('/stock', stockController.getStock);
router.post('/buy', stockController.purchase);
router.post('/restock', stockController.restock);

export default router;