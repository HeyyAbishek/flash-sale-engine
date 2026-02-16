import { Router } from 'express';
import * as stockController from '../controllers/stockController.js';
import { getStock } from '../services/stockService.js';

const router = Router();

/**
 * ✅ GET Stock by ID (Fixes the "Loading..." issue on refresh)
 * This matches the PRODUCT_ID fetch in your ProductPage.tsx
 */
router.get('/stock/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const stock = await getStock(productId);
    
    // 🎯 Sending 'remainingStock' ensures the frontend 'fetchStock' function works
    res.json({ 
      success: true, 
      remainingStock: stock 
    });
  } catch (error) {
    console.error(`❌ Route Error for ID ${req.params.productId}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- Existing Public Routes ---
router.get('/stock', stockController.getStock);
router.post('/buy', stockController.purchase);
router.post('/restock', stockController.restock);

// --- Existing Admin/Status Routes ---
router.get('/status', stockController.getSaleStatus);
router.post('/admin/open', stockController.openSale);
router.post('/admin/close', stockController.closeSale);

export default router;