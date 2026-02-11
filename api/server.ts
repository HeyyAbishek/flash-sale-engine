/**
 * Server entry file, optimized for local development and cloud deployment (Render)
 */
import app from './app.js';
import { initSocket } from './socket.js';
import http from 'http';

/**
 * Configure Port and Host
 * Render requires the server to listen on 0.0.0.0 to be accessible from the internet.
 */
const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0'; 

// Create HTTP server manually to attach Socket.io
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Start server with combined configuration
server.listen(Number(PORT), HOST, () => {
  console.log(`Server ready on http://${HOST}:${PORT}`);
  console.log(`Accepting connections from all interfaces via 0.0.0.0`);
});

/**
 * Graceful shutdown handlers
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;