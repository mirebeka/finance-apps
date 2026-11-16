import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";

export default function SkynetLayout() {
  const [showStatisticsMenu, setShowStatisticsMenu] = useState(false);

  return (
    <div className="app-container">
      <div className="sidebar">
        <div className="logo-container">
          <span className="brand-wordmark">fibi</span>
        </div>

        <nav className="menu-buttons">
          <NavLink to="/skynet/add-ads" className="menu-button">Add ADS</NavLink>
          <NavLink to="/skynet/track-project" className="menu-button">Track a project</NavLink>
          <NavLink to="/skynet/modifications" className="menu-button">Modifications</NavLink>
          <NavLink to="/skynet/wishlist" className="menu-button">Add to Wishlist</NavLink>

          <div className="menu-button statistics-button" onClick={() => setShowStatisticsMenu((prev) => !prev)}>
            <span className="statistics-text">Statistics</span>
            <span className={`statistics-arrow ${showStatisticsMenu ? "open" : ""}`}>▼</span>
          </div>

          <div className="statistics-slot">
            <div className={`statistics-extra ${showStatisticsMenu ? "open" : ""}`}>
              <NavLink to="/skynet/charts" className="menu-button">Charts</NavLink>
              <NavLink to="/skynet/ongoing" className="menu-button">Ongoing</NavLink>
              <NavLink to="/skynet/finished" className="menu-button">Finished</NavLink>
            </div>
          </div>
        </nav>

        <div className="skynet-footer">SKYNET</div>
      </div>

      <div className="content">
        <Outlet />
      </div>
    </div>
  );
}
