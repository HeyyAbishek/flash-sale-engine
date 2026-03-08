import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import redis from './redis.js'; 
import { orderQueue } from './worker.js'; 

let io: Server;

export const initSocket = (httpServer: any) => {
  // --- 1. INITIALIZE SERVER ---
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

  /**
   * 🎯 REDIS ADAPTER (Connections #4 & #5)
   * This allows Socket.io to scale across multiple server instances.
   */
  io.adapter(createAdapter(redis.duplicate(), redis.duplicate()));

  /**
   * 🎯 1s TELEMETRY HEARTBEAT
   * Since Redis Cloud has unlimited commands, we provide real-time updates 
   * every second to show recruiters the live state of your engine.
   */
  setInterval(async () => {
    if (io) {
      try {
        const counts = await orderQueue.getJobCounts('wait', 'active');
        const totalBacklog = counts.wait + counts.active;

        io.emit('system-telemetry', {
          activeUsers: io.engine.clientsCount,
          queueLength: totalBacklog,
          dbStatus: totalBacklog > 0 ? "Writing..." : "Idle"
        });
      } catch (err) { 
        console.error("🚀 Telemetry Heartbeat Error:", err); 
      }
    }
  }, 1000); 

  // --- 2. CONNECTION LOGIC ---
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

  /**
   * 🎯 WORKER NOTIFICATION BRIDGE (Connection #6)
   * Listens for completed jobs from the BullMQ worker and sends 
   * instant updates to the specific user via their Socket.io room.
   */
  const sub = redis.duplicate(); 
  sub.subscribe('worker_notifications');

  sub.on('message', (channel, message) => {
    if (channel === 'worker_notifications' && io) {
      const { userId, type, payload } = JSON.parse(message);
      
      // Personal notifications (Success/Failure) happen INSTANTLY
      if (userId) {
        io.to(userId).emit(type, payload);
      }

      // Stock updates happen INSTANTLY for everyone to see
      if (type === 'order_confirmed' || type === 'stock-update') {
        const newStock = payload.remainingStock ?? payload.stock;
        io.emit('stock-update', { stock: newStock });
      }
    }
  });

  return io;
};

export const getIo = () => {
  if (!io) throw new Error('Socket.io not initialized!');
  return io;
};