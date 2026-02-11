import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import redis from './redis.js';

// Create a duplicate Redis connection for the pub/sub adapter
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

  // Use Redis Adapter for scalability (if we had multiple server instances)
  io.adapter(createAdapter(pubClient, subClient));

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join user to a room based on their userId
    socket.on('join', (userId) => {
      if (userId) {
        console.log(`Socket ${socket.id} joining room ${userId}`);
        socket.join(userId);
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  return io;
};

// Helper to emit events from anywhere (e.g. worker)
// Note: In a real multi-process setup, the worker would publish to Redis, 
// and the socket server (subscribing via adapter) would emit to clients.
// Since our worker runs in a separate process, we'll use Redis Pub/Sub directly in the worker
// to communicate back to this socket server if needed, OR we can just rely on the worker
// publishing to a Redis channel that the socket.io-redis-adapter listens to.
//
// However, the standard socket.io-redis-adapter handles "server-to-client" broadcasting across nodes.
// For a worker script (which isn't a socket.io server), we need a way to tell the socket server to emit.
//
// STRATEGY:
// The worker will use the `socket.io-emitter` pattern OR simpler:
// The worker will publish a message to a specific Redis channel that our API server listens to,
// and then the API server emits the socket event.
//
// Let's implement a simple custom listener here for the worker communication.

const workerListener = redis.duplicate();
workerListener.subscribe('worker_notifications', (err) => {
  if (err) console.error('Failed to subscribe to worker notifications', err);
});

workerListener.on('message', (channel, message) => {
  if (channel === 'worker_notifications') {
    const data = JSON.parse(message);
    const { userId, type, payload } = data;
    
    if (io && userId) {
      console.log(`Emitting ${type} to user ${userId}`);
      io.to(userId).emit(type, payload);
    }
  }
});

export const getIo = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};
