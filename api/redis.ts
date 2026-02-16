// api/redis.ts
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// The "Connector"
// We create one shared connection to be used by the Worker and the API.
// The 'tls' block is CRITICAL for Upstash.
const redis = new Redis(process.env.REDIS_URL as string, {
  tls: {
    rejectUnauthorized: false
  },
  maxRetriesPerRequest: null 
});

export default redis;