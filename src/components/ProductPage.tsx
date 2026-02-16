import React, { useState, useEffect, useRef } from 'react';
import { Loader2, ShoppingBag, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

const ProductPage: React.FC = () => {
  const navigate = useNavigate();
  const [stock, setStock] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  
  const socketRef = useRef<Socket | null>(null);
  const PRODUCT_ID = 'bea869fb-e8fe-4d54-bb13-b6c247663380'; 

  const sneakerImage = "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Limited%20edition%20sneaker%2C%20futuristic%20design%2C%20neon%20orange%20accents%2C%20high%20quality%20product%20photography%2C%20white%20background&image_size=square_hd";

  /**
   * 🔄 Aggressive Fetch: Fixes "Loading..." on refresh
   */
  const fetchStock = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/stock/${PRODUCT_ID}?t=${Date.now()}`);
      
      if (!response.ok) throw new Error("Network response was not ok");
      
      const data = await response.json();
      const currentStock = data.remainingStock ?? data.stock ?? data.data?.stock;

      if (currentStock !== undefined && currentStock !== null) {
        setStock(Number(currentStock));
      } else {
        setStock(0); 
      }
    } catch (err) {
      console.error("❌ Failed to fetch initial stock:", err);
      setStock(0); 
    }
  };

  useEffect(() => {
    // 1. Persistent User ID
    let storedUserId = localStorage.getItem('flash_sale_user_id');
    if (!storedUserId) {
      storedUserId = `user_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('flash_sale_user_id', storedUserId);
    }

    // 2. Socket setup with singleton connection
    const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    socketRef.current = io(socketUrl, { transports: ['websocket'] });

    socketRef.current.on('connect', () => {
      console.log('✅ Connected to Socket Server as:', storedUserId);
      socketRef.current?.emit('join', storedUserId);
    });

    socketRef.current.on('order_confirmed', (data: any) => {
      console.log("🔥 SUCCESS! Socket received order confirmation.");
      setStock(data.remainingStock);
      setPurchaseSuccess(true);
      setShowPopup(true);
      setLoading(false);

      // Hide the green banner after 5 seconds
      setTimeout(() => setPurchaseSuccess(false), 5000);
    });

    socketRef.current.on('stock-update', (data: any) => {
      console.log("📢 Global sync: Stock updated to", data.stock);
      setStock(data.stock);
    });

    socketRef.current.on('sale-status-change', (data: any) => {
      if (data.status === 'closed') navigate('/waiting-room');
    });

    fetchStock();
    return () => { socketRef.current?.disconnect(); };
  }, [navigate]);

  const handleBuy = async () => {
    if (stock === 0) return;
    setLoading(true);
    setError(null);

    // Spinner Safety Timeout
    const spinnerGuard = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setError("Request timed out. Please check your stock.");
        fetchStock();
      }
    }, 10000);

    try {
      const userId = localStorage.getItem('flash_sale_user_id');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ productId: PRODUCT_ID, userId: userId }),
      });

      if (!response.ok) {
        clearTimeout(spinnerGuard);
        setLoading(false);
        
        // 🛑 Detect Rate Limit and show the "Whoa!" text
        if (response.status === 429) {
          setError("Whoa! Too fast. Please wait 5s. ⏱️");
        } else {
          setError("Buy request failed.");
        }
      }
    } catch (err) {
      clearTimeout(spinnerGuard);
      setLoading(false);
      setError("Network error.");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4 font-sans text-zinc-900">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden max-w-4xl w-full grid md:grid-cols-2 relative">
        
        {/* 🏆 Secured Popup Overlay */}
        {showPopup && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <div className="bg-white p-8 rounded-2xl shadow-2xl text-center relative max-w-sm mx-4 animate-in zoom-in-95 duration-300">
              <button onClick={() => setShowPopup(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600"><X size={20} /></button>
              <CheckCircle2 className="mx-auto mb-4 text-green-600" size={48} />
              <h3 className="text-2xl font-bold mb-2">Secured!</h3>
              <p className="text-zinc-500 mb-6">Your Neon Runner X is on the way. Check your email for details.</p>
              <button onClick={() => setShowPopup(false)} className="w-full py-3 bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800 transition-colors">Awesome!</button>
            </div>
          </div>
        )}

        {/* Hero Image Section */}
        <div className="relative bg-zinc-100 flex items-center justify-center p-8 group overflow-hidden">
          <img src={sneakerImage} alt="Sneaker" className="w-full drop-shadow-2xl transition-transform duration-500 group-hover:scale-105" />
        </div>

        {/* Product Info Section */}
        <div className="p-8 md:p-12 flex flex-col justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Neon Runner X</h1>
            <p className="text-zinc-500 mb-6 font-medium">By FutureKicks</p>
            <p className="text-zinc-600 leading-relaxed mb-8">
              The future of high-concurrency footwear. Built with adaptive cushioning and a breathable mesh upper, this limited drop handles the heat of any flash sale.
            </p>
            
            {/* Stock Display Container */}
            <div className="flex items-center gap-3 mb-8 p-4 bg-zinc-50 rounded-xl border border-zinc-100">
              <ShoppingBag className={stock === 0 ? 'text-red-600' : 'text-orange-500'} size={24} />
              <div>
                <p className="text-sm text-zinc-500 uppercase font-bold tracking-tight">Stock Remaining</p>
                <p className={`text-2xl font-bold ${stock === 0 ? 'text-red-600' : 'text-zinc-900'}`}>
                  {stock !== null ? `${stock} / 100` : 'Loading...'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* 🛑 RATE LIMIT ALERT */}
            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm animate-in fade-in slide-in-from-top-1">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {/* ✅ SUCCESS BANNER (Behind the popup) */}
            {purchaseSuccess && !showPopup && (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg text-sm animate-in fade-in slide-in-from-top-1">
                <CheckCircle2 size={16} />
                Successfully purchased!
              </div>
            )}

            <button
              onClick={handleBuy}
              disabled={loading || stock === 0}
              className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${stock === 0 ? 'bg-zinc-200 text-zinc-400' : 'bg-[#FF6B35] text-white shadow-lg hover:bg-orange-600'}`}
            >
              {loading ? <><Loader2 className="animate-spin" size={24} />Processing...</> : stock === 0 ? "Sold Out" : "Buy Now - $199"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPage;