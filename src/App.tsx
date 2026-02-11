import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ProductPage from "@/components/ProductPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ProductPage />} />
      </Routes>
    </Router>
  );
}
