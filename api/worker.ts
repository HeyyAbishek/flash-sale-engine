import { Queue, Worker } from 'bullmq';
import redis from './redis.js'; 
import * as stockService from './services/stockService.js';
import { Redis } from "ioredis";

// --- 1. THE EXPORT (This fixes the red underline in socket.ts) ---
export const orderQueue = new Queue('order-queue', {
  connection: redis.duplicate(), // BullMQ needs its own connection
});

console.log('🚀 BullMQ Worker started, listening for purchase requests...');

// --- 2. THE PROCESSING LOGIC ---
const worker = new Worker(
  'order-queue', 
  async (job) => {
    const { productId, userId } = job.data;
    console.log(`📦 Processing purchase for user ${userId} | Product: ${productId}`);

    try {
      const purchaseResult = await stockService.purchaseItem(productId);

      if (purchaseResult.success) {
        console.log(`✅ Success for user ${userId}. Remaining: ${purchaseResult.remainingStock}`);

        // Notify the user via Socket.io bridge
        await redis.publish('worker_notifications', JSON.stringify({
          userId,
          type: 'order_confirmed',
          payload: {
            success: true,
            productId,
            remainingStock: purchaseResult.remainingStock,
            message: "You got it! Order confirmed."
          }
        }));
      } else {
        console.log(`❌ Failed for user ${userId}: ${purchaseResult.message}`);
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
      console.error(`🚨 Database error for user ${userId}:`, dbError);
      // If a DB error happens, BullMQ can automatically retry the job!
      throw dbError; 
    }
  }, 
  { 
    connection: redis.duplicate(),
    concurrency: 5 // Process 5 orders at once (adjust based on your DB strength)
  }
);

// --- 3. WORKER SYNC LISTENER (For Restocks) ---
const sub = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
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