import redis from './redis';   
import * as stockService from './services/stockService.js';

console.log('Worker started, listening for purchase requests...');

const processQueue = async () => {
  try {
    // brpop returns [key, value]
    // 0 means block indefinitely
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
          
          // Notify API server to emit socket event
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
          
          // Notify failure via Redis/Socket
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
        
        // Notify failure due to exception
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
    // Sleep a bit to avoid tight loop on error
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Loop
  setImmediate(processQueue);
};

processQueue();
