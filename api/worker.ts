import { Queue, Worker } from 'bullmq';
import redis from './redis.js'; 
import * as stockService from './services/stockService.js';
import { Redis } from "ioredis";

// --- 1. THE EXPORT ---
export const orderQueue = new Queue('order-queue', {
  connection: redis.duplicate(),
});

console.log('🚀 BullMQ Worker: 5-Minute Ultra-Quiet Mode Active');

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
    // 🎯 MAXIMUM COMMAND SAVINGS (5 Minutes)
    // This only affects how long we wait to retry a CRASHED job.
    // It has NO effect on the speed of a normal purchase.
    stalledInterval: 300000, // 5 minutes (300,000ms)
    lockDuration: 360000,    // Lock duration must be slightly longer than the interval
    maxStalledCount: 1,      
  }
);

// --- 3. WORKER SYNC LISTENER ---
// 🎯 Added a .replace() here to strip any accidental quotes from Render!
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