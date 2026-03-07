import React, { useState, useEffect } from 'react';
import { socket } from '../socket'; 

const ArchitecturePanel = () => {
  const [activeUsers, setActiveUsers] = useState(0);
  const [queueLength, setQueueLength] = useState(0);
  const [dbStatus, setDbStatus] = useState("Idle");

  useEffect(() => {
    // 🎧 Listen for real data from the backend 'system-telemetry' heartbeat
    socket.on('system-telemetry', (data: any) => {
      // 🕵️‍♂️ DEBUG LOG: Check your browser console (F12)
      console.log("📡 FRONTEND RECEIVED:", data); 

      setActiveUsers(data.activeUsers);
      setQueueLength(data.queueLength);
      setDbStatus(data.dbStatus);
    });

    return () => {
      socket.off('system-telemetry');
    };
  }, []);

  return (
    <div className="hidden lg:flex flex-col w-full max-w-md bg-gray-900 rounded-2xl p-6 text-white shadow-2xl border border-gray-800 font-mono">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold tracking-tight text-green-400">
          Live System Telemetry
        </h3>
        <span className="flex h-3 w-3 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
          <p className="text-gray-400 text-xs mb-1 uppercase tracking-wider">Active Sockets</p>
          <p className="text-3xl font-bold text-blue-400">{activeUsers}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
          <p className="text-gray-400 text-xs mb-1 uppercase tracking-wider">Avg Latency</p>
          <p className="text-3xl font-bold text-yellow-400">42ms</p>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-sm text-gray-400 uppercase tracking-widest border-b border-gray-700 pb-2 mb-4">
          Transaction Pipeline
        </h4>

        <div className="flex items-center justify-between bg-gray-800 p-3 rounded-lg border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/20 p-2 rounded text-blue-400">🌐</div>
            <span className="font-semibold text-sm">Node.js API</span>
          </div>
          <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded">Online</span>
        </div>

        <div className="w-0.5 h-4 bg-gray-700 mx-auto"></div>

        <div className="flex items-center justify-between bg-gray-800 p-3 rounded-lg border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="bg-red-500/20 p-2 rounded text-red-400">⚡</div>
            <div>
              <p className="font-semibold text-sm">Redis / BullMQ</p>
              <p className="text-xs text-gray-400">Job Queue</p>
            </div>
          </div>
          <span className="text-xs font-bold text-white bg-gray-700 px-2 py-1 rounded transition-all">
            {queueLength} Jobs
          </span>
        </div>

        <div className="w-0.5 h-4 bg-gray-700 mx-auto"></div>

        <div className="flex items-center justify-between bg-gray-800 p-3 rounded-lg border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="bg-purple-500/20 p-2 rounded text-purple-400">🗄️</div>
            <div>
              <p className="font-semibold text-sm">PostgreSQL</p>
              <p className="text-xs text-gray-400">ACID Locks</p>
            </div>
          </div>
          <span className={`text-xs px-2 py-1 rounded transition-colors ${
            dbStatus === "Writing..." ? "bg-purple-400 text-black font-bold animate-pulse" : "bg-purple-400/10 text-purple-400"
          }`}>
            {dbStatus}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ArchitecturePanel;