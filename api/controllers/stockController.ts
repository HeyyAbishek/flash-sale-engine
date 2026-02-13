import { type Request, type Response } from 'express';
// Note: Adjust imports if your file structure is different (e.g. ../db/index.js)
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
    const stock = await stockService.getStock(targetId);
    res.json({ success: true, remainingStock: stock });
  } catch (error) {
    console.error('Error fetching stock:', error);
    res.status(500).json({ error: 'Failed to fetch stock' });
  }
};

// --- MERGED: Purchase with Idempotency + Rate Limiting ---
export const purchase = async (req: Request, res: Response) => {
  try {
    const { productId, userId } = req.body;
    // Get the key from headers
    const idempotencyKey = req.headers['idempotency-key'] as string;

    // 🛑 1. IDEMPOTENCY VALIDATION (Must have a key)
    if (!idempotencyKey) {
       res.status(400).json({ error: 'Missing Idempotency-Key header' });
       return;
    }

    const id = productId || "sneaker-001";
    const uid = userId || randomUUID();

    // 🛑 2. IDEMPOTENCY GATEKEEPER (The "Double Click" Blocker)
    // Tries to set key. If it exists, it fails.
    const isNewRequest = await redis.set(
      `req:${idempotencyKey}`,
      'processing',
      'EX',
      10, // 10 seconds lockout
      'NX'
    );

    if (!isNewRequest) {
      console.log(`Duplicate request blocked: ${idempotencyKey}`);
      res.status(409).json({
        success: false,
        message: 'Duplicate request detected. Don\'t double click!'
      });
      return;
    }

    // 🛑 3. RATE LIMITING (The "Spam" Blocker)
    const rateLimitKey = `rate_limit:${uid}`;
    const isRateLimited = await redis.get(rateLimitKey);

    if (isRateLimited) {
       res.status(429).json({
         success: false,
         message: "Please wait 5 seconds between requests",
         remainingStock: 0
       });
       return;
    }

    // Set rate limit for next 5 seconds
    await redis.set(rateLimitKey, '1', 'EX', 5);

    // ✅ 4. SUCCESS: Push to Redis Queue
    const job = { userId: uid, productId: id };
    await redis.lpush('buy_queue', JSON.stringify(job));
    
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

// --- Existing Restock ---
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
    console.error('Restock failed:', error);
    res.status(500).json({ success: false, error: 'Failed to restock' });
  }
};

// GET /api/status
export const getSaleStatus = async (req: Request, res: Response) => {
  try {
    // 🛑 CHANGE: Default to 'open' so new users see the product immediately
    const status = await redis.get('sale_status') || 'open';
    res.json({ status });
  } catch (error) {
    console.error('Status check failed:', error);
    // Fallback to open so the site doesn't break
    res.status(500).json({ status: 'open' });
  }
};

// POST /api/admin/open (The "God Mode" Switch)
export const openSale = async (req: Request, res: Response) => {
  try {
    // 1. Set status to OPEN in Redis
    await redis.set('sale_status', 'open');
    
    // 2. Scream it to everyone connected via WebSocket
    const io = getIo();
    io.emit('sale-status-change', { status: 'open' }); // <-- This triggers the redirect!
    
    res.json({ success: true, message: 'THE GATES ARE OPEN! 🚀' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to open sale' });
  }
};

// POST /api/admin/close (Reset)
export const closeSale = async (req: Request, res: Response) => {
  await redis.set('sale_status', 'closed');
  const io = getIo();
  io.emit('sale-status-change', { status: 'closed' });
  res.json({ success: true, message: 'Sale closed.' });
};
