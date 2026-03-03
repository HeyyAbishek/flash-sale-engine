import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import redis from './redis.js'; // Using your existing redis import
import { Redis } from "ioredis";

// --- 1. REDIS ADAPTER SETUP (For Multi-Server Scaling) ---
const pubClient = redis.duplicate();
const subClient = redis.duplicate();

let io: Server;

export const initSocket = (httpServer: any) => {
  // --- 2. INITIALIZE SERVER WITH SECURE CORS ---
  io = new Server(httpServer, {
    cors: {
      origin: true, // Dynamically allows your Vercel/Render frontend
      credentials: true,
      methods: ["GET", "POST"]
    }
  });

  // 🚨 THE SCALING FIX: Attach the Redis Adapter
  io.adapter(createAdapter(pubClient, subClient));

  io.on('connection', (socket) => {
    console.log('✅ Socket Connection Established:', socket.id);

    socket.on('join', (userId) => {
      if (userId) {
        console.log(`👤 User ${userId} joined room`);
        socket.join(userId);
      }
    });

    socket.on('disconnect', () => {
      console.log('❌ User disconnected:', socket.id);
    });
  });

  // --- 3. 🛠️ THE WORKER BRIDGE (Direct Messaging & Global Sync) ---
  const workerListener = redis.duplicate();
  workerListener.subscribe('worker_notifications');

  workerListener.on('message', (channel, message) => {
    if (channel === 'worker_notifications') {
      const data = JSON.parse(message);
      const { userId, type, payload } = data;
      
      if (io) {
        // 🎯 Direct Message to the Buyer (Stops the blue spinner)
        if (userId) {
          console.log(`👤 DM to User ${userId}: ${type}`);
          io.to(userId).emit(type, payload);
        }

        // 📢 GLOBAL BROADCAST (Syncs stock for all users)
        if (type === 'order_confirmed' || type === 'stock-update') {
          const newStock = payload.remainingStock ?? payload.stock;
          console.log(`📢 GLOBAL BROADCAST: Stock is now ${newStock}`);
          
          // Emit 'stock-update' to match ProductPage.tsx listener
          io.emit('stock-update', { stock: newStock });
        }
      }
    }
  });

  return io;
};

export const getIo = () => {
  if (!io) throw new Error('Socket.io not initialized!');
  return io;
};