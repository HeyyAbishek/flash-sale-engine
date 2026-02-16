import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Clock, Lock } from 'lucide-react';

const WaitingRoom = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Check status immediately (in case you refreshed and it's already open)
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/status`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'open') {
          navigate('/');
        }
      });

    // 2. Listen for the "OPEN" signal in real-time
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001', { transports: ['websocket'] });

    socket.on('sale-status-change', (data) => {
      console.log("📢 Sale Status Changed:", data.status);
      if (data.status === 'open') {
        // 🚀 REDIRECT BACK TO PRODUCT PAGE
        navigate('/');
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4 text-white">
      <div className="max-w-md w-full text-center space-y-8 p-8">
        <div className="relative w-24 h-24 mx-auto">
          <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
          <div className="relative bg-zinc-800 rounded-full p-6 border border-zinc-700 shadow-2xl">
            <Lock className="w-12 h-12 text-blue-400" />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-black tracking-tighter bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            SALE PAUSED
          </h1>
          <p className="text-zinc-400 text-lg">
            We are currently restocking our inventory. 
            <br />
            <span className="text-white font-semibold">Please do not refresh.</span>
            <br />
            You will be redirected automatically when the sale resumes.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-zinc-500 text-sm font-mono bg-zinc-800/50 py-2 px-4 rounded-full w-fit mx-auto">
          <Clock size={14} className="animate-spin" />
          <span>WAITING FOR SERVER SIGNAL...</span>
        </div>
      </div>
    </div>
  );
};

export default WaitingRoom;