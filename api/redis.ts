import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// The "Connector"
// maxRetriesPerRequest: null is required for BullMQ to function correctly.
const redis = new Redis(process.env.REDIS_URL as string, {
  maxRetriesPerRequest: null 
});

// Basic error handler to prevent the app from crashing on connection blips
redis.on('error', (err) => console.error('Redis Connection Error:', err));

export default redis;