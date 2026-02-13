import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ProductPage from "./components/ProductPage";
import WaitingRoom from "./components/WaitingRoom";

// Admin Controls Component
function AdminPanel() {
  const toggleSale = async (action: 'open' | 'close') => {
    await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/admin/${action}`, { method: 'POST' });
  };
  
  const handleRestock = async () => {
    await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/restock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: 'sneaker-001', amount: 100 }),
    });
  };

  return (
    <div className="fixed bottom-4 left-4 flex flex-wrap gap-2 z-50">
      <button onClick={() => toggleSale('open')} className="bg-green-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-green-700 text-xs font-bold">
        OPEN SALE 🔓
      </button>
      <button onClick={() => toggleSale('close')} className="bg-red-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-red-700 text-xs font-bold">
        CLOSE SALE 🔒
      </button>
      <button 
        onClick={handleRestock} 
        className="bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-blue-700 text-xs font-bold"
      >
        RESTOCK
      </button>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ProductPage />} />
        <Route path="/waiting-room" element={<WaitingRoom />} />
      </Routes>
      <AdminPanel />
    </Router>
  );
}
