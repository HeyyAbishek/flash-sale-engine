import { type Request, type Response } from 'express';
import pool from '../db.js';
import { getIo } from '../socket.js';
import * as stockService from '../services/stockService.js';
import redis from '../redis.js';
import { orderQueue } from '../worker.js'; // 🎯 The fix starts here

// --- Existing Get Stock ---
export const getStock = async (req: Request, res: Response) => {
  try {
    const { productId } = req.query;
    const targetId = typeof productId === 'string' ? productId : 'sneaker-001';
    const stock = await stockService.getStock(targetId);
    res.json({ success: true, remainingStock: stock });
  } catch (error) {
    console.error('Error fetching stock:', error);
    res.status(500).json({ error: 'Failed to fetch stock' });
  }
};

// --- 🚀 OPTIMIZED PURCHASE (Now with BullMQ Telemetry) ---
export const purchase = async (req: Request, res: Response) => {
  try {
    const { productId, userId } = req.body;
    const idempotencyKey = req.headers['idempotency-key'] as string;

    // 1. Idempotency Check
    if (!idempotencyKey) {
       res.status(400).json({ error: 'Missing Idempotency-Key header' });
       return;
    }

    // 2. Gatekeeper (Redis)
    const isNewRequest = await redis.set(
      `req:${idempotencyKey}`,
      'processing',
      'EX',
      10,
      'NX'
    );

    if (!isNewRequest) {
      res.status(409).json({
        success: false,
        message: 'Duplicate request detected.'
      });
      return;
    }

    // 3. Rate Limiting
    const uid = userId || "guest";
    const rateLimitKey = `rate_limit:${uid}`;
    const isRateLimited = await redis.get(rateLimitKey);

    if (isRateLimited) {
       res.status(429).json({
         success: false,
         message: "Please wait 5 seconds."
       });
       return;
    }
    await redis.set(rateLimitKey, '1', 'EX', 5);

    // 4. THE FIX: Using BullMQ instead of raw LPUSH 🚀
    // This allows our Telemetry dashboard to actually "see" the jobs
    await orderQueue.add(
      'purchase-job', 
      { 
        userId: uid, 
        productId: productId || "sneaker-001" 
      },
      {
        removeOnComplete: true, // Keep Redis memory clean
        attempts: 3,            // Retry if DB locks during high traffic
        backoff: 1000           // Wait 1s before retrying
      }
    );
    
    // Respond immediately to the user
    res.status(202).json({
      success: true,
      message: 'Order Queued!',
    });

  } catch (error) {
    console.error('Queue error:', error);
    res.status(500).json({ success: false, message: "Error queuing request" });
  }
};

// --- Existing Restock / Admin Functions ---
export const restock = async (req: Request, res: Response) => {
  try {
    const { productId, amount } = req.body;
    const targetId = productId || 'sneaker-001';
    const newStock = amount || 100;
    await pool.query('UPDATE products SET stock_quantity = $1 WHERE id = $2', [newStock, targetId]);
    try {
      const io = getIo();
      io.emit('stock-update', { productId: targetId, stock: newStock });
    } catch (e) {
      console.warn("Socket notification failed:", e);
    }
    res.json({ success: true, message: `Stock reset to ${newStock}` });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to restock' });
  }
};

export const getSaleStatus = async (req: Request, res: Response) => {
  const status = await redis.get('sale_status') || 'open';
  res.json({ status });
};

export const openSale = async (req: Request, res: Response) => {
  await redis.set('sale_status', 'open');
  getIo().emit('sale-status-change', { status: 'open' });
  res.json({ success: true, message: 'THE GATES ARE OPEN! 🚀' });
};

export const closeSale = async (req: Request, res: Response) => {
  await redis.set('sale_status', 'closed');
  getIo().emit('sale-status-change', { status: 'closed' });
  res.json({ success: true, message: 'Sale closed.' });
};