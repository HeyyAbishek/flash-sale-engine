import app from './app.js';
import { initSocket } from './socket.js';
import http from 'http';

const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0'; 

/**
 * 🎯 NOTE: The /health route is now in app.ts for better 
 * route priority and to protect Neon compute hours.
 */

// Create the HTTP server using the imported Express app
const server = http.createServer(app);

// 1. Initialize Socket.io and start the Redis listener
const io = initSocket(server);

// 2. Attach io to the app instance for use in routes
app.set('io', io); 

// Start the server
server.listen(Number(PORT), HOST, () => {
  console.log(`🚀 API Server ready on http://localhost:${PORT}`);
});

/**
 * Graceful shutdown for cloud environments
 */
const gracefulShutdown = (signal: string) => {
  console.log(`${signal} received. Closing server...`);
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;