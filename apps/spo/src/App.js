import { useState } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";

import SPO_Homepage from "./SPO_Homepage";
import SPO_Guide from "./SPO_Guide";
import SPO_Login from "./SPO_Login";
import SPO_Dashboard from "./SPO_Dashboard";

function AccessDenied() {
  return (
    <div style={{ textAlign: "center", padding: "80px 20px" }}>
      <h1>Access Denied</h1>
      <p>You do not have permission to access this page. Administrator access is required.</p>
      <a href="/spo">Back to SPO Table</a>
    </div>
  );
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(localStorage.getItem("spo_logged_in") === "true");
  const isAdmin = localStorage.getItem("spo_role")?.toLowerCase() === "admin";

  const adminOnly = (element) =>
    !loggedIn ? <Navigate to="/spo/login" replace /> : isAdmin ? element : <AccessDenied />;

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/spo" replace />} />
        <Route
          path="/spo/login"
          element={loggedIn ? <Navigate to="/spo" replace /> : <SPO_Login onLoginSuccess={() => setLoggedIn(true)} />}
        />
        <Route path="/spo" element={loggedIn ? <SPO_Homepage /> : <Navigate to="/spo/login" replace />} />
        <Route path="/spo/guide" element={<SPO_Guide />} />
        <Route path="/spo/dashboard/open" element={adminOnly(<SPO_Dashboard />)} />
        <Route path="/spo/dashboard/closed" element={adminOnly(<SPO_Dashboard />)} />
      </Routes>
    </Router>
  );
}
