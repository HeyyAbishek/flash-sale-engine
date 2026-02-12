/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import stockRoutes from './routes/stock.js'

// for esm mode
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// load env
dotenv.config()

const app: express.Application = express()

/**
 * 🛡️ CORS Configuration: The "Silver Bullet"
 * This allows localhost (for you) and ANY Vercel deployment automatically.
 */
app.use(cors({
  origin: (origin, callback) => {
    // 1. Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    // 2. Allow Localhost (for development)
    if (origin.startsWith('http://localhost')) return callback(null, true);

    // 3. Allow ANY Vercel Deployment (Production, Preview, & Branch URLs)
    // This fixes the error where Vercel generates a unique URL that wasn't in your list
    if (origin.endsWith('.vercel.app')) return callback(null, true);

    // 4. Block everything else
    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    return callback(new Error(msg), false);
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api', stockRoutes)

/**
 * health
 */
app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server Error:', error); // Log the actual error for debugging in Render logs
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app