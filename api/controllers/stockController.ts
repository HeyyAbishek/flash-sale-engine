import { Request, Response } from 'express';
import pool from '../db.js';
import { getIo } from '../socket.js';
import * as stockService from '../services/stockService.js';
import redis from '../redis.js';
import { randomUUID } from 'crypto';

// --- Existing Get Stock ---
export const getStock = async (req: Request, res: Response) => {
  try {
    const { productId } = req.query;
    const targetId = typeof productId === 'string' ? productId : 'sneaker-001';

    // Using existing service to fetch stock
    const stock = await stockService.getStock(targetId);
    
    // Maintaining contract with frontend { success: true, remainingStock: number }
    res.json({
      success: true,
      remainingStock: stock
    });
  } catch (error) {
    console.error('Error fetching stock:', error);
    res.status(500).json({ error: 'Failed to fetch stock' });
  }
};

// --- Existing Purchase ---
export const purchase = async (req: Request, res: Response) => {
  const { productId, userId } = req.body;
  const id = productId || "sneaker-001";
  const uid = userId || randomUUID();
  
  try {
    // Rate Limiting Logic
    const rateLimitKey = `rate_limit:${uid}`;
    const isRateLimited = await redis.get(rateLimitKey);

    if (isRateLimited) {
      return res.status(429).json({
        success: false,
        message: "Please wait 5 seconds between requests",
        remainingStock: 0
      });
    }

    // Set rate limit key for 5 seconds
    await redis.set(rateLimitKey, '1', 'EX', 5);

    // Push job to Redis Queue
    const job = { userId: uid, productId: id };
    await redis.lpush('buy_queue', JSON.stringify(job));
    
    // Optimistic response
    const currentStock = await stockService.getStock(id);
    
    res.json({
      success: true,
      message: 'Request Received. Processing...',
      remainingStock: currentStock
    });
  } catch (error) {
    console.error('Redis error:', error);
    res.status(500).json({ success: false, message: "Error queuing purchase request" });
  }
};

// --- NEW: Restock Feature ---
export const restock = async (req: Request, res: Response) => {
  try {
    const { productId, amount } = req.body;
    const targetId = productId || 'sneaker-001';
    const newStock = amount || 100;

    // 1. Update Database
    await pool.query('UPDATE products SET stock_quantity = $1 WHERE id = $2', [newStock, targetId]);

    // 2. Notify Frontend via WebSocket
    try {
      const io = getIo();
      io.emit('stock-update', { productId: targetId, stock: newStock });
    } catch (e) {
      console.warn("Socket notification failed:", e);
    }

    res.json({ success: true, message: `Stock reset to ${newStock}` });
  } catch (error) {
    console.error('Restock failed:', error);
    res.status(500).json({ success: false, error: 'Failed to restock' });
  }
};
