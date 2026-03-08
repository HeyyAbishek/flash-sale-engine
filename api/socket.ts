import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import redis from './redis.js'; 
import { orderQueue } from './worker.js'; 

let io: Server;

export const initSocket = (httpServer: any) => {
  io = new Server(httpServer, {
    cors: {
      origin: [
        "https://flash-sale-engine-chi.vercel.app", 
        "http://localhost:5173"
      ],
      credentials: true,
      methods: ["GET", "POST"]
    },
    transports: ['polling', 'websocket'] 
  });

  io.adapter(createAdapter(redis.duplicate(), redis.duplicate()));

  // --- THE TELEMETRY HEARTBEAT ---
  setInterval(async () => {
    if (io) {
      try {
        const counts = await orderQueue.getJobCounts('wait', 'active');
        const userCount = io.engine.clientsCount;
        const totalBacklog = counts.wait + counts.active;

        io.emit('system-telemetry', {
          activeUsers: userCount,
          queueLength: totalBacklog,
          dbStatus: totalBacklog > 0 ? "Writing..." : "Idle"
        });
      } catch (err) {
        console.error("Telemetry Error:", err);
      }
    }
  }, 1000); // 🚀 1-second interval for real-time portfolio flex

  io.on('connection', (socket) => {
    console.log('✅ Socket Connection Established:', socket.id);
    socket.on('join', (userId) => { if (userId) socket.join(userId); });
    socket.on('disconnect', () => { console.log('❌ User disconnected:', socket.id); });
  });

  // --- WORKER NOTIFICATION BRIDGE ---
  const workerListener = redis.duplicate();
  workerListener.subscribe('worker_notifications');

  workerListener.on('message', (channel, message) => {
    if (channel === 'worker_notifications') {
      const { userId, type, payload } = JSON.parse(message);
      if (io) {
        if (userId) io.to(userId).emit(type, payload);
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