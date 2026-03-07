import { io } from 'socket.io-client';

// Use the environment variable for your API URL, or default to localhost:3001
const URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const socket = io(URL, {
  withCredentials: true,
  // 🎯 Forces 'polling' first to bypass strict WebSocket handshakes, 
  // then upgrades to 'websocket' for high-speed telemetry.
  transports: ['polling', 'websocket'], 
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  autoConnect: true,
});