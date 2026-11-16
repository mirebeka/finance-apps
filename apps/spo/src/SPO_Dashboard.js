
import React, { useState, useEffect } from "react";
import axios from "axios";
import SPO_OpenDashboard from "./SPO_OpenDashboard.js";
import SPO_ClosedDashboard from "./SPO_ClosedDashboard.js";
import { useLocation, useNavigate } from "react-router-dom";

import { API_URL } from "./config";
import "./SPO_Dashboard.css";

const OPEN_FILTER_FIELDS = ["supplierCode", "companyCode", "statementMonth", "processingStatus", "agingBucket"];
const CLOSED_FILTER_FIELDS = ["statementMonth", "agingBucket"];

const emptyFilters = (fields) => Object.fromEntries(fields.map((field) => [field, []]));

const uniqueValues = (rows, field) => [...new Set(
  rows.map((row) => row[field]).filter((value) => value !== null && value !== undefined && value !== "")
)].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));

// Each dashboard keeps draft filters separate from the filters applied to its API request.
function useDashboardData(endpoint, fields) {
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState(() => emptyFilters(fields));
  const [appliedFilters, setAppliedFilters] = useState(() => emptyFilters(fields));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);



  const onSearch = () => {
    if (!isLoading) setAppliedFilters(Object.fromEntries(fields.map((field) => [field, [...filters[field]]])));
  };
  const onResetFilters = () => {
    const reset = emptyFilters(fields);
    setFilters(reset);
    setAppliedFilters(reset);
  };

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = Object.fromEntries(fields.map((field) => [field, appliedFilters[field].join(",")]));
        const response = await axios.get(API_URL + endpoint, { params, signal: controller.signal });
        if (!controller.signal.aborted) setData(response.data);
      } catch (err) {
        if (!controller.signal.aborted && err.code !== "ERR_CANCELED") {
          console.error(`Error loading ${endpoint}:`, err);
          setError("Could not load dashboard data.");
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [endpoint, appliedFilters, fields]);

  return { data, filters, setFilters, onSearch, onResetFilters, isLoading, error };
}

function SPO_Dashboard() {
  const open = useDashboardData("/api/spo/dashboard/open", OPEN_FILTER_FIELDS);
  const closed = useDashboardData("/api/spo/dashboard/closed", CLOSED_FILTER_FIELDS);

  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = location.pathname.endsWith("/closed") ? "closed" : "open";

    // Capture all Open dropdown choices from the first unfiltered response.
  // Never rebuild them from a filtered result, otherwise choices disappear.
  const [openFilterOptions, setOpenFilterOptions] = useState(null);
  useEffect(() => {
    if (!openFilterOptions && open.data && open.filters &&
        Object.values(open.filters).every((values) => values.length === 0)) {
      const invoices = open.data.invoices || [];
      setOpenFilterOptions({
        supplierCodes: uniqueValues(invoices, "SUPPLIER_CODE"),
        companyCodes: uniqueValues(invoices, "COMPANY_CODE"),
        statementMonths: uniqueValues(invoices, "STATEMENT_MONTH"),
        processingStatuses: uniqueValues(invoices, "PROCESSING_STATUS"),
        agingBuckets: [...new Set((open.data.aging || []).map((item) => item.bucket).filter(Boolean))]
      });
    }
  }, [open.data, open.filters, openFilterOptions]);

  // Closed filter options come from the backend's unfiltered filterOptions payload.
  // Keep the latest known options if a filtered response omits the field.
  const [closedFilterOptions, setClosedFilterOptions] = useState(null);
  useEffect(() => {
    if (closed.data?.filterOptions) {
      setClosedFilterOptions((previous) => previous || {
        ...closed.data.filterOptions,
        agingBuckets: closed.data.filterOptions.agingBuckets || [
          "Null", "0-30 days", "31-60 days", "61-90 days", "90+ days", "Missing Due Date", "Paid On Time"
        ]
      });
    }
  }, [closed.data]);

  // Currency formatting
  const formatCurrency = (value) => {
    return `${Math.round(value || 0).toLocaleString()}`;
  };

  return (
    <div className="spo-dashboard-page">

      {/* HEADER */}
      <div className="spo-dashboard-header">
        <div className="spo-dashboard-logos">
          <span className="brand-wordmark spo-dashboard-logo-mountain">fibi</span>

        <span className="spo-header-tagline">Finance<br />Operations</span>
        </div>

        <h1 className="spo-dashboard-title">
          SPO Dashboard
        </h1>

        <a
          href="/spo"
          className="spo-dashboard-table-button"
        >
          SPO Table
        </a>
      </div>

      {/* DASHBOARD CONTENT */}
      <div className="spo-dashboard-content">

        {/* NAVIGATION */}
        <div className="spo-dashboard-tabs">
          <button
            type="button"
            className={`spo-dashboard-tab ${activeTab === "open" ? "active" : ""}`}
            onClick={() => navigate("/spo/dashboard/open")}
          >
            Open Dashboard
          </button>

          <button
            type="button"
            className={`spo-dashboard-tab ${activeTab === "closed" ? "active" : ""}`}
            onClick={() => navigate("/spo/dashboard/closed")}
          >
            Closed Dashboard
          </button>
        </div>


        {/* OPEN DASHBOARD */}
        {activeTab === "open" && (
          <div>
            {open.isLoading && !open.data && (
              <p>Loading dashboard...</p>
            )}

            {open.error && (
              <p className="spo-dashboard-error">{open.error}</p>
            )}

            {open.data && (
              <SPO_OpenDashboard
                data={open.data}
                formatCurrency={formatCurrency}
                filters={open.filters}
                setFilters={open.setFilters}
                filterOptions={openFilterOptions}
                onSearch={open.onSearch}
                onResetFilters={open.onResetFilters}
                isLoading={open.isLoading}
              />
            )}
          </div>
        )}

        {/* CLOSED DASHBOARD */}
        {activeTab === "closed" && (
          <div>
            {closed.isLoading && !closed.data && (
              <p>Loading dashboard...</p>
            )}

            {closed.error && (
              <p className="spo-dashboard-error">{closed.error}</p>
            )}

            {closed.data && (
              <SPO_ClosedDashboard
                data={closed.data}
                filterOptions={closedFilterOptions || closed.data.filterOptions || {}}
                formatCurrency={formatCurrency}
                filters={closed.filters}
                setFilters={closed.setFilters}
                onSearch={closed.onSearch}
                onResetFilters={closed.onResetFilters}
                isLoading={closed.isLoading}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SPO_Dashboard;
