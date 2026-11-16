import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";

import SkynetLayout from "./SkynetLayout";
import Add_ADS from "./Add_ADS";
import Wishlist from "./Wishlist";
import Track_Project from "./Track_project";
import Modifications from "./Modifications";
import Chart from "./Charts";
import Ongoing from "./Ongoing";
import Finished from "./Finished";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/skynet" replace />} />
        <Route path="/skynet" element={<SkynetLayout />}>
          <Route index element={<Navigate to="track-project" replace />} />
          <Route path="add-ads" element={<Add_ADS />} />
          <Route path="track-project" element={<Track_Project />} />
          <Route path="wishlist" element={<Wishlist />} />
          <Route path="modifications" element={<Modifications />} />
          <Route path="charts" element={<Chart />} />
          <Route path="ongoing" element={<Ongoing />} />
          <Route path="finished" element={<Finished />} />
        </Route>
      </Routes>
    </Router>
  );
}
