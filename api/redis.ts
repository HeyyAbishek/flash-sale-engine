import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// 🛑 THE FIX: Explicitly allow Render's self-signed certificate
const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  tls: redisUrl.startsWith('rediss://') 
    ? { rejectUnauthorized: false } 
    : undefined
});

redis.on('connect', () => console.log('✅ Redis Connected'));
redis.on('error', (err) => console.error('❌ Redis Error:', err));

export default redis;