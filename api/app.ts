import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import stockRoutes from './routes/stock.js';
import { restockItem } from './services/stockService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app: express.Application = express();

// Track sale status (In production, this should be in Redis/DB)
let saleStatus = 'open'; 

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (origin.startsWith('http://localhost')) return callback(null, true);
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    return callback(null, true); 
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 👇 ADD THIS "Health Check" ROUTE HERE (Must be before 404 handler) 👇
app.get('/', (req: Request, res: Response) => {
  res.status(200).send('Server is awake! 🚀');
});

// --- 🛠️ ADMIN & STATUS ROUTES ---

/**
 * Get current sale status (Open/Closed)
 */
app.get('/api/status', (req: Request, res: Response) => {
  res.json({ status: saleStatus });
});

/**
 * Toggle Sale Status (Admin)
 */
app.post('/api/admin/sale', (req: Request, res: Response) => {
  const { status } = req.body;
  saleStatus = status;
  
  const io = app.get('io');
  if (io) {
    console.log(`📡 Broadcasting sale status change: ${status}`);
    io.emit('sale-status-change', { status });
  }
  
  res.json({ success: true, status });
});

/**
 * Restock Route
 */
app.post('/api/restock', async (req: Request, res: Response) => {
  const { productId, amount } = req.body;
  const newStockLevel = amount || 100;
  
  try {
    await restockItem(productId, newStockLevel);
    
    const io = app.get('io'); 
    if (io) {
      console.log(`📡 Shouting stock update: ${newStockLevel}`);
      io.emit('stock-update', { stock: newStockLevel }); 
    }

    res.json({ success: true, message: "Stock restocked successfully" });
  } catch (error) {
    console.error("❌ RESTOCK FAILED:", error);
    res.status(500).json({ success: false, message: "Restock failed" });
  }
});

// --- Standard API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api', stockRoutes);

app.use('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ success: true, message: 'ok' });
});

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