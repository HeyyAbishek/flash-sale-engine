// api/redis.ts
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// The "Connector"
// We create one shared connection to be used by the Worker and the API.
// 🎯 Removed the 'tls' block because Redis Cloud Free Tier uses standard connections.
const redis = new Redis(process.env.REDIS_URL as string, {
  maxRetriesPerRequest: null // BullMQ requires this!
});

export default redis;