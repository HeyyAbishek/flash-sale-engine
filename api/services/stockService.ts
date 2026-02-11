import pool from '../db.js';

export const getStock = async (productId: string): Promise<number> => {
  try {
    const result = await pool.query('SELECT stock_quantity FROM products WHERE id = $1', [productId]);
    if (result.rows.length > 0) {
      return result.rows[0].stock_quantity;
    }
    return 0;
  } catch (error) {
    console.error('Error fetching stock:', error);
    throw error;
  }
};

export const purchaseItem = async (productId: string): Promise<{ success: boolean; remainingStock: number; message?: string }> => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Lock the row for update
    const res = await client.query('SELECT stock_quantity FROM products WHERE id = $1 FOR UPDATE', [productId]);
    
    if (res.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, remainingStock: 0, message: 'Product not found' };
    }
    
    const currentStock = res.rows[0].stock_quantity;
    
    if (currentStock > 0) {
      const newStock = currentStock - 1;
      await client.query('UPDATE products SET stock_quantity = $1 WHERE id = $2', [newStock, productId]);
      await client.query('COMMIT');
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
