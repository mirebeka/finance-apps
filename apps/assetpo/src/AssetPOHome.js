import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import "./AssetPOHome.css";
import PendingApproval from "./PendingApproval";

import "./Returned.css";
import Returned from "./Returned";

import "./UnassignedRequests.css";
import UnassignedRequests from "./UnassignedRequests";
import InProgress from "./InProgress";
import ManagementReport from "./ManagementReport";

const pages = [
  { path: "pending-approval", title: "Pending Approval", element: <PendingApproval /> },
  { path: "returned", title: "Returned", element: <Returned /> },
  { path: "in-progress", title: "In Progress", element: <InProgress /> },
  { path: "unassigned-requests", title: "Unassigned Requests", element: <UnassignedRequests /> },
  { path: "management-report", title: "Management Report", element: <ManagementReport /> },
];

function AssetPO() {
  return (
    <div className="assetpo-layout">
      <aside className="assetpo-sidebar">
        <h2 className="assetpo-brand">Asset PO Tracker</h2>
        <nav className="assetpo-menu">
          {pages.map((page) => (
            <NavLink
              key={page.path}
              to={`/AssetPO/${page.path}`}
              className={({ isActive }) =>
                `assetpo-link${isActive ? " assetpo-link-active" : ""}`
              }
            >
              {page.title}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="assetpo-content">
        <Routes>
          <Route
            index
            element={<Navigate to="/AssetPO/pending-approval" replace />}
          />

          {pages.map((page) => (
            <Route key={page.path} path={page.path} element={page.element} />
          ))}
        </Routes>
      </main>
    </div>
  );
}

export default AssetPO;
