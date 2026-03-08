import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import stockRoutes from './routes/stock.js';
import { restockItem } from './services/stockService.js';
import { getIo } from './socket.js'; 
import redis from './redis.js'; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app: express.Application = express();

// --- 🎯 THE NEON PROTECTOR (FIRST PRIORITY) ---
/**
 * This keeps Render & BullMQ awake WITHOUT waking up Neon.
 * This MUST be before any other routes or middleware.
 */
app.get('/health', (req: Request, res: Response) => {
  res.status(200).send('Engine is Purring');
});

// Track sale status
let saleStatus = 'open'; 

// 1. Updated CORS for Production Stability
app.use(cors({
  origin: true, 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 2. Base Health Check (Optional, but kept for legacy)
app.get('/', (req: Request, res: Response) => {
  res.status(200).send('Server is awake! 🚀');
});

// --- 🛠️ ADMIN & STATUS ROUTES ---

app.get('/api/status', (req: Request, res: Response) => {
  res.json({ status: saleStatus });
});

app.post('/api/admin/sale', (req: Request, res: Response) => {
  const { status } = req.body;
  saleStatus = status;
  
  const io = getIo();
  if (io) {
    console.log(`📡 Broadcasting sale status change: ${status}`);
    io.emit('sale-status-change', { status });
  }
  
  res.json({ success: true, status });
});

app.post('/api/restock', async (req: Request, res: Response) => {
  const { productId, amount } = req.body;
  const newStockLevel = amount || 100;
  
  try {
    await restockItem(productId, newStockLevel);
    
    const io = getIo(); 
    if (io) {
      console.log(`📡 Shouting stock update: ${newStockLevel}`);
      io.emit('stock-update', { stock: newStockLevel }); 
    }

    await redis.publish('worker_notifications', JSON.stringify({
      type: 'stock-update',
      payload: { stock: newStockLevel }
    }));

    res.json({ success: true, message: "Stock restocked successfully" });
  } catch (error) {
    console.error("Restock Error:", error);
    res.status(500).json({ success: false, message: "Restock failed" });
  }
});

// --- Standard API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api', stockRoutes);

// --- Error Handling ---
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server Error:', error);
  res.status(500).json({ success: false, error: 'Server internal error' });
});

// 404 Handler (Must be last)
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API not found' });
});

export default app;