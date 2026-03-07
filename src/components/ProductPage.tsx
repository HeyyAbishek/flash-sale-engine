import React, { useState, useEffect } from 'react';
import { Loader2, ShoppingBag, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket'; 

const ProductPage: React.FC = () => {
  const navigate = useNavigate();
  const [stock, setStock] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  
  const PRODUCT_ID = 'bea869fb-e8fe-4d54-bb13-b6c247663380'; 
  const sneakerImage = "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Limited%20edition%20sneaker%2C%20futuristic%20design%2C%20neon%20orange%20accents%2C%20high%20quality%20product%20photography%2C%20white%20background&image_size=square_hd";

  const fetchStock = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/stock/${PRODUCT_ID}?t=${Date.now()}`);
      const data = await response.json();
      const currentStock = data.remainingStock ?? data.stock;
      setStock(currentStock !== undefined ? Number(currentStock) : 0);
    } catch (err) {
      setStock(0); 
    }
  };

  useEffect(() => {
    let storedUserId = localStorage.getItem('flash_sale_user_id');
    if (!storedUserId) {
      storedUserId = `user_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('flash_sale_user_id', storedUserId);
    }

    if (socket.connected) {
      socket.emit('join', storedUserId);
    }

    const onConnect = () => {
      socket.emit('join', storedUserId);
    };

    const onOrderConfirmed = (data: any) => {
      setStock(data.remainingStock);
      setPurchaseSuccess(true);
      setShowPopup(true);
      setLoading(false);
      setTimeout(() => setPurchaseSuccess(false), 5000);
    };

    const onStockUpdate = (data: any) => {
      setStock(data.stock);
      setLoading(false); 
    };

    const onSaleStatusChange = (data: any) => {
      if (data.status === 'closed') navigate('/waiting-room');
    };

    socket.on('connect', onConnect);
    socket.on('order_confirmed', onOrderConfirmed);
    socket.on('stock-update', onStockUpdate);
    socket.on('sale-status-change', onSaleStatusChange);

    fetchStock();

    return () => { 
      socket.off('connect', onConnect);
      socket.off('order_confirmed', onOrderConfirmed);
      socket.off('stock-update', onStockUpdate);
      socket.off('sale-status-change', onSaleStatusChange);
    };
  }, [navigate]);

  const handleBuy = async () => {
    if (stock === 0) return;
    setLoading(true);
    setError(null);

    try {
      const userId = localStorage.getItem('flash_sale_user_id');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/buy`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Idempotency-Key': crypto.randomUUID() 
        },
        body: JSON.stringify({ productId: PRODUCT_ID, userId: userId }),
      });

      if (!response.ok) {
        setLoading(false);
        if (response.status === 429) {
          setError("Whoa! Too fast. Please wait 5s. ⏱️");
          // 🎯 Added: Error disappears after 5 seconds
          setTimeout(() => setError(null), 5000);
        } else {
          setError("Buy request failed.");
          // Also clear standard errors for a clean UI
          setTimeout(() => setError(null), 5000);
        }
      }
    } catch (err) {
      setLoading(false);
      setError("Network error.");
      setTimeout(() => setError(null), 5000);
    }
  };

  return (
    <div className="h-full w-full flex flex-col md:grid md:grid-cols-[1.1fr_0.9fr] relative">
      
      {showPopup && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md">
          <div className="bg-white p-8 rounded-3xl shadow-2xl text-center relative max-w-sm mx-4 animate-in zoom-in-95 duration-300">
            <button onClick={() => setShowPopup(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600"><X size={24} /></button>
            <CheckCircle2 className="mx-auto mb-4 text-green-600" size={56} />
            <h3 className="text-2xl font-bold mb-2">Secured!</h3>
            <p className="text-zinc-500 mb-6 text-base leading-tight">Your Neon Runner X is on the way. Check your email for details.</p>
            <button onClick={() => setShowPopup(false)} className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold text-lg hover:bg-zinc-800 transition-all shadow-xl active:scale-95">Awesome!</button>
          </div>
        </div>
      )}

      {/* LEFT SIDE: Image Container */}
      <div className="relative bg-[#f8f8f8] flex items-center justify-center p-8 group">
        <div className="absolute top-4 left-6">
          <span className="bg-black text-white text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full">Limited Drop</span>
        </div>
        <img 
          src={sneakerImage} 
          alt="Sneaker" 
          className="w-full h-auto max-w-[420px] drop-shadow-[0_25px_25px_rgba(0,0,0,0.12)] transition-transform duration-700 group-hover:scale-105" 
        />
      </div>

      {/* RIGHT SIDE: Details & Controls */}
      <div className="p-8 md:p-12 flex flex-col justify-start gap-8 border-l border-gray-50">
        <div className="space-y-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-black mb-1 tracking-tight leading-none">Neon Runner X</h1>
            <p className="text-orange-500 font-bold tracking-widest uppercase text-xs">By FutureKicks</p>
          </div>
          
          <p className="text-zinc-500 leading-relaxed text-base md:text-lg">
            The future of high-concurrency footwear. Built with adaptive cushioning and a breathable mesh upper, this limited drop is engineered to handle the massive load of any flash sale without missing a step.
          </p>
          
          <div className={`p-6 rounded-2xl border-2 transition-all ${stock === 0 ? 'bg-red-50 border-red-100' : 'bg-orange-50 border-orange-100'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${stock === 0 ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'}`}>
                  <ShoppingBag size={28} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Inventory Status</p>
                  <p className={`text-3xl font-black leading-none ${stock === 0 ? 'text-red-600' : 'text-zinc-900'}`}>
                    {stock !== null ? `${stock} / 100` : 'SYNCING...'}
                  </p>
                </div>
              </div>
              {stock !== null && stock > 0 && (
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-xl text-sm font-bold border border-red-100">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          <button
            onClick={handleBuy}
            disabled={loading || stock === 0}
            className={`group w-full py-6 rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition-all active:scale-[0.96] shadow-xl ${
              stock === 0 
              ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed shadow-none' 
              : 'bg-[#FF6B35] text-white hover:bg-[#e85a24] hover:shadow-orange-200'
            }`}
          >
            {loading ? (
              <><Loader2 className="animate-spin" size={28} /> QUEUING...</>
            ) : stock === 0 ? (
              "OUT OF STOCK"
            ) : (
              <>BUY NOW — $199 <span className="text-orange-200 group-hover:translate-x-1 transition-transform">→</span></>
            )}
          </button>

          {purchaseSuccess && !showPopup && (
            <div className="flex items-center justify-center gap-2 text-green-600 font-bold text-xs uppercase tracking-widest">
              <CheckCircle2 size={16} /> Order Successfully Queued
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductPage;