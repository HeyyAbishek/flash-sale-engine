import { Queue, Worker } from 'bullmq';
import redis from './redis.js'; 
import * as stockService from './services/stockService.js';
import { Redis } from "ioredis";

// --- 1. THE QUEUE ---
// Optimized: Uses redis.duplicate() only once here
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
    
    /**
     * 🎯 MEMORY PROTECTOR: 
     * Logging thousands of lines to stdout during a sale can cause Render 
     * to hit its 512MB RAM limit. We keep this disabled for production.
     */
    // console.log(`📦 Processing purchase for user ${userId}`);

    try {
      const purchaseResult = await stockService.purchaseItem(productId);

      /**
       * 🎯 CONNECTION SAVER: 
       * We use the MAIN 'redis' connection here for publishing notifications.
       * This avoids creating extra unnecessary connections.
       */
      await redis.publish('worker_notifications', JSON.stringify({
        userId,
        type: purchaseResult.success ? 'order_confirmed' : 'order_failed',
        payload: {
          success: purchaseResult.success,
          productId,
          remainingStock: purchaseResult.remainingStock,
          message: purchaseResult.success ? "Order confirmed!" : (purchaseResult.message || "Order Failed")
        }
      }));
    } catch (dbError) {
      /**
       * 🎯 ERROR LOGGING:
       * We keep error logs enabled so you can still debug critical failures.
       */
      console.error(`🚨 Database error:`, dbError);
      throw dbError; 
    }
  }, 
  { 
    /**
     * 🎯 Worker requires its own connection(s) for the blocking 'BRPOPLPUSH' command.
     * This takes up 2 slots in your Redis Cloud 30-connection limit.
     */
    connection: redis.duplicate(),
    concurrency: 5,
  }
);

// --- 3. WORKER SYNC LISTENER ---
// Stripping quotes from Render env variables to prevent connection crashes
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