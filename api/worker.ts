import redis from './redis';   
import * as stockService from './services/stockService.js';
import { Redis } from "ioredis";

console.log('Worker started, listening for purchase requests...');

/**
 * processQueue now returns a Promise so we can await it 
 * in our high-speed while loop.
 */
const processQueue = async () => {
  try {
    // brpop blocks until a job is available
    const result = await redis.brpop('buy_queue', 0);
    
    if (result) {
      const [key, value] = result;
      const job = JSON.parse(value);
      const { productId, userId } = job;
      
      console.log(`Processing purchase for user ${userId} product ${productId}`);
      
      try {
        const purchaseResult = await stockService.purchaseItem(productId);
        
        if (purchaseResult.success) {
          console.log(`Purchase successful for user ${userId}. Remaining: ${purchaseResult.remainingStock}`);
          
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
          console.log(`Purchase failed for user ${userId}: ${purchaseResult.message}`);
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
        console.error(`Database error processing purchase for user ${userId}:`, dbError);
        await redis.publish('worker_notifications', JSON.stringify({
          userId,
          type: 'order_failed',
          payload: {
            success: false,
            message: "System error processing order"
          }
        }));
      }
    }
  } catch (error) {
    console.error('Error processing job:', error);
    // Short sleep on error to prevent CPU spiking if Redis is down
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
};

// --- 🚨 HIGH-SPEED PRODUCTION LOOP ---
// This replaces setImmediate for maximum throughput on Render/Vercel
const startWorker = async () => {
  console.log("🚀 High-speed loop active.");
  while (true) {
    await processQueue();
  }
};

startWorker();

// --- WORKER SYNC LISTENER (For Restocks) ---
const sub = new Redis(process.env.REDIS_URL);
sub.subscribe('worker_notifications');
sub.on('message', (channel, message) => {
  if (channel === 'worker_notifications') {
    const { type, payload } = JSON.parse(message);
    if (type === 'stock-update') {
      console.log(`🚀 Worker syncing stock: ${payload.stock}`);
    }
  }
});