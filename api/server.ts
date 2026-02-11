/**
 * local server entry file, for local development
 */
import app from './app.js';
import { initSocket } from './socket.js';
import http from 'http';

/**
 * start server with port
 */
const PORT = process.env.PORT || 3001;

// Create HTTP server manually to attach Socket.io
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

server.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
});

/**
 * close server
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
