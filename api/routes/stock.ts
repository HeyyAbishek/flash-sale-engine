import { Router } from 'express';
import * as stockController from '../controllers/stockController.js';

const router = Router();

router.get('/stock', stockController.getStock);
router.post('/buy', stockController.purchase);

export default router;
