import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

/**
 * 🎯 The "Connector"
 * We use .replace() to strip any accidental double quotes that can occur 
 * when copying/pasting environment variables into the Render dashboard.
 */
const redisUrl = (process.env.REDIS_URL as string || 'redis://localhost:6379').replace(/"/g, '');

const redis = new Redis(redisUrl, {
  /**
   * 🎯 maxRetriesPerRequest: null is STRICTLY REQUIRED for BullMQ.
   * Without this, BullMQ will throw an error on startup.
   */
  maxRetriesPerRequest: null 
});

// Basic error handler to prevent the app from crashing on connection blips.
redis.on('error', (err) => {
  console.error('🚀 Redis Connection Error:', err.message);
});

export default redis;