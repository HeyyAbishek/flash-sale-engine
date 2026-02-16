import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ProductPage from "./components/ProductPage";
import WaitingRoom from "./components/WaitingRoom";
import toast, { Toaster } from 'react-hot-toast';

function AdminPanel() {
  const toggleSale = async (action: 'open' | 'close') => {
    try {
      const url = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/admin/sale`;
      await fetch(url, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action === 'open' ? 'open' : 'closed' }) 
      });
      
      // 🍞 Professional Toast instead of Alert
      if (action === 'open') {
        toast.success("Sale is now OPEN 🔓");
      } else {
        toast.error("Sale is now CLOSED 🔒");
      }
    } catch (err) {
      toast.error("Failed to update sale status");
    }
  };
  
  const handleRestock = async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/restock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: 'bea869fb-e8fe-4d54-bb13-b6c247663380', amount: 100 }),
      });
      
      // 👟 Clean success toast
      toast.success("👟 Stock Restocked to 100!");
    } catch (err) {
      toast.error("Restock failed");
    }
  };

  return (
    <div className="fixed bottom-4 left-4 flex gap-2 z-50">
      <button 
        onClick={() => toggleSale('open')} 
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full text-xs font-bold transition-colors shadow-lg"
      >
        OPEN 🔓
      </button>
      <button 
        onClick={() => toggleSale('close')} 
        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full text-xs font-bold transition-colors shadow-lg"
      >
        CLOSE 🔒
      </button>
      <button 
        onClick={handleRestock} 
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full text-xs font-bold transition-colors shadow-lg"
      >
        RESTOCK 👟
      </button>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      {/* 🛑 Toaster component must be inside the Router but outside Routes */}
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
          },
        }}
      />
      <Routes>
        <Route path="/" element={<ProductPage />} />
        <Route path="/waiting-room" element={<WaitingRoom />} />
      </Routes>
      <AdminPanel />
    </Router>
  );
}