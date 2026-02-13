import React, { useState, useEffect, useRef } from 'react';
import { Loader2, ShoppingBag, AlertCircle, CheckCircle2, X } from 'lucide-react';
import * as api from '../services/api';
import { io, Socket } from 'socket.io-client';

import { useNavigate } from 'react-router-dom';

const ProductPage: React.FC = () => {
  const navigate = useNavigate();
  const [stock, setStock] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [userId, setUserId] = useState<string>('');
  
  // Use a ref for the socket to persist it
  const socketRef = useRef<Socket | null>(null);

  // Image generation URL
  const sneakerImage = "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Limited%20edition%20sneaker%2C%20futuristic%20design%2C%20neon%20orange%20accents%2C%20high%20quality%20product%20photography%2C%20white%20background&image_size=square_hd";

  useEffect(() => {
    // 1. Check Status immediately on load
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/status`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'closed') {
          navigate('/waiting-room'); // 🚪 Kick them out if closed
        }
      });

    // 2. Listen for "CLOSE" signal via WebSocket
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001');
    socket.on('sale-status-change', (data) => {
      if (data.status === 'closed') {
        navigate('/waiting-room');
      }
    });

    // Generate or retrieve a persistent userId
    let storedUserId = localStorage.getItem('flash_sale_user_id');
    if (!storedUserId) {
      storedUserId = `user_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('flash_sale_user_id', storedUserId);
    }
    setUserId(storedUserId);

    // Initialize Socket.io
    const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    socketRef.current = io(socketUrl);

    socketRef.current.on('connect', () => {
      console.log('Connected to socket server');
      // Join the room with our userId
      socketRef.current?.emit('join', storedUserId);
    });

    // Clean up duplicate listener for status change handled above
    // socketRef.current.on('sale-status-change', ... ) is not needed here 
    // because we have a dedicated socket for status checks above or we can reuse this one.
    // For simplicity, let's keep the dedicated logic clean above and just handle stock/orders here.
    
    socketRef.current.on('order_confirmed', (data: any) => {
      console.log('Order confirmed event:', data);
      setLoading(false);
      setPurchaseSuccess(true);
      setStock(data.remainingStock);
      setShowPopup(true);
      // Hide popup after 5 seconds
      setTimeout(() => setShowPopup(false), 5000);
    });

    socketRef.current.on('stock-update', (data: any) => {
      console.log('Stock update event:', data);
      setStock(data.stock);
    });

    socketRef.current.on('order_failed', (data: any) => {
      console.log('Order failed event:', data);
      setLoading(false);
      // Remove loading state and show clear error
      setError(data.message || 'Order Failed');
      // Re-fetch stock just in case
      fetchStock();
    });

    fetchStock();
    // Poll every 5 seconds for live updates (backup to sockets)
    const interval = setInterval(fetchStock, 5000);

    return () => {
      clearInterval(interval);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [navigate]);

  const fetchStock = async () => {
    try {
      const data = await api.getStock();
      if (data.success) {
        setStock(data.remainingStock);
      }
    } catch (err) {
      console.error("Failed to fetch stock", err);
    }
  };

  const handleBuy = async () => {
    if (stock === 0) return;
    
    // 🛑 FIX 1: Clear any previous messages immediately!
    setError(null);
    setPurchaseSuccess(false);

    setLoading(true);
    
    // 1. Create a Timeout Promise (Force stop after 5 seconds)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Request Timed Out")), 5000)
    );

    try {
      const idempotencyKey = crypto.randomUUID();

      // 2. Race the Fetch against the Timeout
      const response = await Promise.race([
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/buy`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey 
          },
          body: JSON.stringify({ productId: 'sneaker-001', userId: userId || 'guest' }),
        }),
        timeoutPromise
      ]) as Response;

      const data = await response.json();
      
      // 🛑 FIX 2: Handle the 429 specifically
      if (response.ok) {
        // We wait for the socket event to confirm success
        // But we can show a "Processing..." message in the UI via the loading state
        console.log("Purchase request sent, waiting for confirmation...");
      } else if (response.status === 429) {
        setError("Whoa! Too fast. Please wait 5s. ⏱️");
      } else if (response.status === 409) {
        setError("Duplicate request blocked!");
      } else {
        setError(data.message || "Failed");
      }
    } catch (err) {
      console.error('Purchase failed:', err);
      // Even if it times out, the Order might still process in the background!
      setError("Request Sent (Check Stock)");
    } finally {
      setLoading(false); // 🛑 Spinner will ALWAYS stop now.
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4 font-sans text-zinc-900">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden max-w-4xl w-full grid md:grid-cols-2 relative">
        
        {/* Success Popup Overlay */}
        {showPopup && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white p-8 rounded-2xl shadow-2xl transform animate-in zoom-in-95 duration-300 max-w-sm w-full mx-4 text-center relative">
              <button 
                onClick={() => setShowPopup(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600"
              >
                <X size={20} />
              </button>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-2xl font-bold text-zinc-900 mb-2">You got it!</h3>
              <p className="text-zinc-500 mb-6">
                Your limited edition Neon Runner X has been secured. Check your email for details.
              </p>
              <button 
                onClick={() => setShowPopup(false)}
                className="w-full py-3 px-4 bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800 transition-colors"
              >
                Awesome!
              </button>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <div className="relative bg-zinc-100 h-96 md:h-auto flex items-center justify-center p-8 group overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-100 to-zinc-200" />
          <img 
            src={sneakerImage} 
            alt="Limited Edition Sneaker" 
            className="relative z-10 w-full h-auto object-cover transform transition-transform duration-500 group-hover:scale-110 drop-shadow-2xl"
          />
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-zinc-800 border border-zinc-200">
            Limited Release
          </div>
        </div>

        {/* Product Details */}
        <div className="p-8 md:p-12 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-2">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-900">
                Neon Runner X
              </h1>
            </div>
            <p className="text-zinc-500 mb-6 font-medium">By FutureKicks</p>
            
            <div className="mb-8">
              <p className="text-zinc-600 leading-relaxed">
                Experience the future of speed with the Neon Runner X. Featuring adaptive cushioning and a breathable mesh upper, this limited edition drop is designed for those who refuse to compromise on style or performance.
              </p>
            </div>

            <div className="flex items-center gap-3 mb-8 p-4 bg-zinc-50 rounded-xl border border-zinc-100">
              <div className={`p-2 rounded-full ${stock === 0 ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-[#FF6B35]'}`}>
                <ShoppingBag size={20} />
              </div>
              <div>
                <p className="text-sm text-zinc-500 font-medium uppercase tracking-wide">Stock Remaining</p>
                {stock === null ? (
                  <div className="h-6 w-16 bg-zinc-200 animate-pulse rounded mt-1"></div>
                ) : (
                  <p className={`text-2xl font-bold ${stock === 0 ? 'text-red-600' : 'text-zinc-900'}`}>
                    {stock} <span className="text-sm font-normal text-zinc-400">/ 100</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm animate-in fade-in slide-in-from-top-1">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
            
            {purchaseSuccess && !showPopup && (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg text-sm animate-in fade-in slide-in-from-top-1">
                <CheckCircle2 size={16} />
                Successfully purchased!
              </div>
            )}

            <button
              onClick={handleBuy}
              disabled={loading || stock === 0}
              className={`
                w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-200 flex items-center justify-center gap-2
                ${stock === 0 
                  ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-[#FF6B35] to-[#FF8C35] text-white shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-[1.02] active:scale-[0.98]'
                }
                ${loading ? 'opacity-90 cursor-wait' : ''}
              `}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={24} />
                  Processing...
                </>
              ) : stock === 0 ? (
                "Sold Out"
              ) : (
                "Buy Now - $199"
              )}
            </button>
            <p className="text-center text-xs text-zinc-400">
              Secure checkout • Free shipping worldwide
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPage;
