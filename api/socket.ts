import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import redis from './redis.js'; 
import { orderQueue } from './worker.js'; // Ensure this matches your worker's exported queue

let io: Server;

export const initSocket = (httpServer: any) => {
  // --- 1. INITIALIZE SERVER WITH EXPLICIT CORS & TRANSPORTS ---
  io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:5173", // Hardcoded for Vite local dev
      credentials: true,
      methods: ["GET", "POST"]
    },
    transports: ['polling', 'websocket'] // Force polling first for stability
  });

  // --- 2. REDIS ADAPTER ---
  io.adapter(createAdapter(redis.duplicate(), redis.duplicate()));

  // --- 3. THE TELEMETRY HEARTBEAT (With Debug Log) ---
  setInterval(async () => {
    if (io) {
      try {
        const counts = await orderQueue.getJobCounts('wait', 'active');
        const userCount = io.engine.clientsCount;

        // 🕵️‍♂️ Debug Log to confirm backend is actually pulsing
        console.log(`📡 TELEMETRY: Users: ${userCount} | Queue: ${counts.wait + counts.active} | DB: ${counts.active > 0 ? 'Writing' : 'Idle'}`);

        io.emit('system-telemetry', {
          activeUsers: userCount,
          queueLength: counts.wait + counts.active,
          dbStatus: counts.active > 0 ? "Writing..." : "Idle"
        });
      } catch (err) {
        console.error("Telemetry Error:", err);
      }
    }
  }, 1000);

  // --- 4. CONNECTION LOGIC ---
  io.on('connection', (socket) => {
    console.log('✅ Socket Connection Established:', socket.id);

    socket.on('join', (userId) => {
      if (userId) {
        socket.join(userId);
      }
    });

    socket.on('disconnect', () => {
      console.log('❌ User disconnected:', socket.id);
    });
  });

  // --- 5. WORKER BRIDGE (UNTOUCHED) ---
  const workerListener = redis.duplicate();
  workerListener.subscribe('worker_notifications');

  workerListener.on('message', (channel, message) => {
    if (channel === 'worker_notifications') {
      const data = JSON.parse(message);
      const { userId, type, payload } = data;
      
      if (io) {
        if (userId) {
          console.log(`👤 DM to User ${userId}: ${type}`);
          io.to(userId).emit(type, payload);
        }

        if (type === 'order_confirmed' || type === 'stock-update') {
          const newStock = payload.remainingStock ?? payload.stock;
          console.log(`📢 GLOBAL BROADCAST: Stock is now ${newStock}`);
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