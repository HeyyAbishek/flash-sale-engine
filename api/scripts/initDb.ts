import pool from '../db.js';

const initDb = async () => {
  const client = await pool.connect();
  try {
    console.log('Initializing database...');

    // Create table
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        stock_quantity INTEGER NOT NULL DEFAULT 0,
        initial_stock INTEGER NOT NULL DEFAULT 0
      );
    `);

    // Insert initial data if not exists
    const checkProduct = await client.query('SELECT * FROM products WHERE id = $1', ['sneaker-001']);
    
    if (checkProduct.rows.length === 0) {
      await client.query(`
        INSERT INTO products (id, name, stock_quantity, initial_stock)
        VALUES ($1, $2, $3, $4)
      `, ['sneaker-001', 'Limited Edition Sneaker', 100, 100]);
      console.log('Inserted initial product data.');
    } else {
      console.log('Product data already exists. Resetting stock to 100 for testing.');
      await client.query(`
        UPDATE products 
        SET stock_quantity = 100, initial_stock = 100 
        WHERE id = $1
      `, ['sneaker-001']);
    }

    console.log('Database initialized successfully.');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    client.release();
    await pool.end();
  }
};

initDb();
