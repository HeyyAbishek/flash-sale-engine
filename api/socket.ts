import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import redis from './redis.js'; 
import { orderQueue } from './worker.js'; 

let io: Server;

export const initSocket = (httpServer: any) => {
  // --- 1. INITIALIZE SERVER WITH YOUR CLOUD URLS ---
  io = new Server(httpServer, {
    cors: {
      origin: [
        "https://flash-sale-engine-chi.vercel.app", // 🎯 Your Vercel URL
        "http://localhost:5173"                    // Local development
      ],
      credentials: true,
      methods: ["GET", "POST"]
    },
    transports: ['polling', 'websocket'] 
  });

  // --- 2. REDIS ADAPTER ---
  io.adapter(createAdapter(redis.duplicate(), redis.duplicate()));

  // --- 3. THE TELEMETRY HEARTBEAT (Updated with Stickiness) ---
  setInterval(async () => {
    if (io) {
      try {
        // 1. Get the current backlog (Wait + Active)
        const counts = await orderQueue.getJobCounts('wait', 'active');
        const userCount = io.engine.clientsCount;

        // 2. The "Stickiness" Logic: 
        // We check if there are ANY jobs currently in the pipeline.
        // This prevents the UI from flickering to "Idle" too fast for the eye to see.
        const totalBacklog = counts.wait + counts.active;
        const isBusy = totalBacklog > 0;

        // Telemetry pulse
        io.emit('system-telemetry', {
          activeUsers: userCount,
          queueLength: totalBacklog,
          dbStatus: isBusy ? "Writing..." : "Idle"
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

  // --- 5. WORKER NOTIFICATION BRIDGE ---
  const workerListener = redis.duplicate();
  workerListener.subscribe('worker_notifications');

  workerListener.on('message', (channel, message) => {
    if (channel === 'worker_notifications') {
      const data = JSON.parse(message);
      const { userId, type, payload } = data;
      
      if (io) {
        if (userId) {
          io.to(userId).emit(type, payload);
        }

        if (type === 'order_confirmed' || type === 'stock-update') {
          const newStock = payload.remainingStock ?? payload.stock;
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