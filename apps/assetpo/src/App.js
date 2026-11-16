import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import AssetPO from "./AssetPOHome";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/AssetPO" replace />} />
        <Route path="/AssetPO/*" element={<AssetPO />} />
      </Routes>
    </Router>
  );
}
