import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ProductPage from "@/components/ProductPage";

export default function App() {
  const handleRestock = async () => {
    await fetch(`${import.meta.env.VITE_API_URL}/api/restock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: 'sneaker-001', amount: 100 }),
    });
  };

  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<ProductPage />} />
        </Routes>
      </Router>
      <button 
        onClick={handleRestock} 
        className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-red-700 transition-all z-50"
      >
        ADMIN: RESTOCK
      </button>
    </>
  );
}
