import { Request, Response } from 'express';
import * as stockService from '../services/stockService.js';
import redis from '../redis.js';
import { randomUUID } from 'crypto';

export const getStock = async (req: Request, res: Response) => {
  const { productId } = req.query;
  const id = (productId as string) || "sneaker-001"; 
  try {
    const stock = await stockService.getStock(id);
    res.json({
      success: true,
      remainingStock: stock
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching stock" });
  }
};

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
        remainingStock: 0 // Placeholder, or fetch actual stock if needed
      });
    }

    // Set rate limit key for 5 seconds
    await redis.set(rateLimitKey, '1', 'EX', 5);

    // Push job to Redis Queue
    const job = { userId: uid, productId: id };
    await redis.lpush('buy_queue', JSON.stringify(job));
    
    // Immediately return success response
    // Note: In a real async system, we might return a jobId to poll for status.
    // For this demo, we return success to satisfy the optimistic UI requirement.
    // We fetch current stock just to return a valid number, though it won't reflect this purchase yet.
    const currentStock = await stockService.getStock(id);
    
    res.json({
      success: true,
      message: 'Request Received. Processing...',
      remainingStock: currentStock // The UI will update eventually via polling
    });
  } catch (error) {
    console.error('Redis error:', error);
    res.status(500).json({ success: false, message: "Error queuing purchase request" });
  }
};
