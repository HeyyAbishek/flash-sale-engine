import pool from '../db.js';
import redis from '../redis.js'; // Ensure the .js extension is there for ESM

/**
 * Fetches the current stock level
 */
export const getStock = async (productId: string): Promise<number> => {
  try {
    // 1. Try to get from Redis first for speed
    const cachedStock = await redis.get(`stock:${productId}`);
    if (cachedStock !== null) {
      return parseInt(cachedStock, 10);
    }

    // 2. Fallback to Neon Database
    const result = await pool.query('SELECT stock FROM "Product" WHERE id = $1', [productId]);
    if (result.rows.length > 0) {
      const stock = result.rows[0].stock;
      // Update cache so next time is faster
      await redis.set(`stock:${productId}`, stock.toString(), 'EX', 60); 
      return stock;
    }
    return 0;
  } catch (error) {
    console.error('Error fetching stock:', error);
    throw error;
  }
};

/**
 * High-concurrency purchase logic
 */
export const purchaseItem = async (productId: string): Promise<{ success: boolean; remainingStock: number; message?: string }> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query('SELECT stock FROM "Product" WHERE id = $1 FOR UPDATE', [productId]);
    
    if (res.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, remainingStock: 0, message: 'Product not found' };
    }
    
    const currentStock = res.rows[0].stock;
    if (currentStock > 0) {
      const newStock = currentStock - 1;
      await client.query('UPDATE "Product" SET stock = $1 WHERE id = $2', [newStock, productId]);
      await client.query('COMMIT');

      // 🧹 Sync Redis immediately after purchase
      await redis.set(`stock:${productId}`, newStock.toString(), 'EX', 60);

      return { success: true, remainingStock: newStock, message: 'Purchase successful' };
    } else {
      await client.query('ROLLBACK');
      return { success: false, remainingStock: 0, message: 'Out of stock' };
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error purchasing item:', error);
    return { success: false, remainingStock: 0, message: 'Transaction failed' };
  } finally {
    client.release();
  }
};

/**
 * 🛠️ Admin Restock Utility (Postgres + Redis Sync)
 */
export const restockItem = async (productId: string, amount: number = 100): Promise<void> => {
  console.log("--------------------------------------------------");
  console.log(`🛠️ SERVICE: Restocking product ${productId} to ${amount}...`);
  
  try {
    // 1. Update Neon Postgres
    const result = await pool.query('UPDATE "Product" SET stock = $1 WHERE id = $2', [amount, productId]);
    
    if (result.rowCount === 0) {
      console.error(`⚠️ SERVICE ERROR: ID ${productId} not found in Database.`);
      throw new Error("Product ID not found");
    }

    // 2. 🧹 CLEAR REDIS CACHE
    // This forces getStock to fetch the fresh 100 from the Database
    await redis.del(`stock:${productId}`); 
    
    console.log(`✅ SERVICE SUCCESS: Database updated & Redis cache cleared.`);
    console.log("--------------------------------------------------");
  } catch (error) {
    console.error('❌ RESTOCK SERVICE CRITICAL ERROR:', error);
    throw error;
  }
};