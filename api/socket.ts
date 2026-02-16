import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import redis from './redis.js';

const pubClient = redis.duplicate();
const subClient = redis.duplicate();

let io: Server;

export const initSocket = (httpServer: any) => {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

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

  // --- 🛠️ THE WORKER BRIDGE (Now with Global Broadcast) ---
  const workerListener = redis.duplicate();
  workerListener.subscribe('worker_notifications');

  workerListener.on('message', (channel, message) => {
    if (channel === 'worker_notifications') {
      const data = JSON.parse(message);
      const { userId, type, payload } = data;
      
      if (io) {
        // 1. 🎯 Direct Message to the Buyer (Stops the blue spinner)
        if (userId) {
          console.log(`👤 DM to User ${userId}: ${type}`);
          io.to(userId).emit(type, payload);
        }

        // 2. 📢 GLOBAL BROADCAST (Syncs all other tabs)
        // If a purchase succeeded or an admin restocked, tell everyone.
        if (type === 'order_confirmed' || type === 'stock-update') {
          const newStock = payload.remainingStock ?? payload.stock;
          console.log(`📢 GLOBAL BROADCAST: Stock is now ${newStock}`);
          
          // We emit 'stock-update' because ProductPage.tsx is already listening for it
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