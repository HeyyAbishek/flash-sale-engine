import { Queue, Worker } from 'bullmq';
import redis from './redis.js'; 
import * as stockService from './services/stockService.js';
import { Redis } from "ioredis";

// --- 1. THE EXPORT ---
export const orderQueue = new Queue('order-queue', {
  connection: redis.duplicate(),
  defaultJobOptions: {
    removeOnComplete: true, // 🎯 Instantly deletes the job from Redis when done (Saves 30MB Limit)
    removeOnFail: 100       // Only keeps the last 100 failed jobs for debugging
  }
});

console.log('🚀 BullMQ Worker: Max Speed & Auto-Cleanup Active');

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
    // 🎯 Ultra-quiet mode removed! Back to default, lightning-fast background polling.
  }
);

// --- 3. WORKER SYNC LISTENER ---
const redisUrl = (process.env.REDIS_URL || 'redis://localhost:6379').replace(/"/g, '');
const sub = new Redis(redisUrl);

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