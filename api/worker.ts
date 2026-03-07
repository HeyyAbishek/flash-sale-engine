import { Queue, Worker } from 'bullmq';
import redis from './redis.js'; 
import * as stockService from './services/stockService.js';
import { Redis } from "ioredis";

// --- 1. THE EXPORT ---
export const orderQueue = new Queue('order-queue', {
  connection: redis.duplicate(),
});

console.log('🚀 BullMQ Worker: 40s Ultra-Quiet Mode Active');

// --- 2. THE PROCESSING LOGIC ---
const worker = new Worker(
  'order-queue', 
  async (job) => {
    const { productId, userId } = job.data;
    console.log(`📦 Processing purchase for user ${userId}`);

    try {
      const purchaseResult = await stockService.purchaseItem(productId);

      if (purchaseResult.success) {
        await redis.publish('worker_notifications', JSON.stringify({
          userId,
          type: 'order_confirmed',
          payload: {
            success: true,
            productId,
            remainingStock: purchaseResult.remainingStock,
            message: "Order confirmed!"
          }
        }));
      } else {
        await redis.publish('worker_notifications', JSON.stringify({
          userId,
          type: 'order_failed',
          payload: {
            success: false,
            message: purchaseResult.message || "Order Failed"
          }
        }));
      }
    } catch (dbError) {
      console.error(`🚨 Database error:`, dbError);
      throw dbError; 
    }
  }, 
  { 
    connection: redis.duplicate(),
    concurrency: 5,
    // 🎯 ULTRA-QUIET SETTINGS (40 Seconds)
    stalledInterval: 40000, // Checks for crashed jobs every 40s
    lockDuration: 60000,    // Keep the lock for 60s
    maxStalledCount: 1,     // Don't waste commands on repeat retries
  }
);

// --- 3. WORKER SYNC LISTENER ---
const sub = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
sub.on('error', (err) => console.log('Redis Sub Error:', err.message));

sub.subscribe('worker_notifications');
sub.on('message', (channel, message) => {
  if (channel === 'worker_notifications') {
    const { type, payload } = JSON.parse(message);
    if (type === 'stock-update') {
      console.log(`🚀 Worker syncing stock: ${payload.stock}`);
    }
  }
});

export default worker;