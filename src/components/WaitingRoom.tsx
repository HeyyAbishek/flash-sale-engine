import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

export default function WaitingRoom() {
  const navigate = useNavigate();
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    // Check if sale is ALREADY open
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/status`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'open') navigate('/');
      });

    // Listen for "OPEN" signal
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001');
    socket.on('sale-status-change', (data) => {
      if (data.status === 'open') navigate('/');
    });

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold mb-4">The Drop Hasn't Started</h1>
      <p className="text-yellow-500 font-mono text-2xl">Waiting for signal{dots}</p>
    </div>
  );
}
