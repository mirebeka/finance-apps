
import React, { useState } from "react";
import {
  Bar,
  BarChart,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";

import SPO_DashboardFilters from "./SPO_DashboardFilters.js";
import "./SPO_ClosedDashboard.css";

const CLOSED_FILTER_FIELDS = [
  { key: "statementMonth", label: "Statement Month", optionsKey: "statementMonths" },
  { key: "agingBucket", label: "Aging Bucket", optionsKey: "agingBuckets" }
];

function SPO_ClosedDashboard({
  data,
  filterOptions,
  formatCurrency,
  filters,
  setFilters,
  onSearch,
  onResetFilters,
  isLoading
}) {
  const [agingMetric, setAgingMetric] = useState("amount");

  const paymentDateData = data.paymentDateData || [];
  const agingData = data.aging || [];
  const kpis = data.kpis || {};

  const hasResults =
    Number(kpis.paidLate?.count || 0) +
    Number(kpis.paidOnTime?.count || 0) > 0;

  return (
    <div className="spo-closed-dashboard">
      <SPO_DashboardFilters
        fields={CLOSED_FILTER_FIELDS}
        options={filterOptions}
        filters={filters}
        setFilters={setFilters}
        onSearch={onSearch}
        onResetFilters={onResetFilters}
        isLoading={isLoading}
      />

      {isLoading && (
        <div className="spo-closed-loading">
          <span className="spo-dashboard-spinner" />
          Updating search results...
        </div>
      )}

      {!isLoading && !hasResults && (
        <div className="spo-closed-no-results">
          No results for this search
        </div>
      )}

      <div className="spo-closed-kpi-grid">
        <div className="spo-closed-kpi-card paid-late">
          <h3>Paid Late</h3>
          <div className="spo-closed-kpi-amount">
            ${formatCurrency(kpis.paidLate?.amount || 0)}
          </div>
          <div className="spo-closed-kpi-count">
            {kpis.paidLate?.count || 0} invoices
          </div>
        </div>

        <div className="spo-closed-kpi-card paid-on-time">
          <h3>Paid On Time</h3>
          <div className="spo-closed-kpi-amount">
            ${formatCurrency(kpis.paidOnTime?.amount || 0)}
          </div>
          <div className="spo-closed-kpi-count">
            {kpis.paidOnTime?.count || 0} invoices
          </div>
        </div>

        <div className="spo-closed-kpi-card">
          <h3>Late invoices</h3>
          <div className="spo-closed-kpi-amount">
            {(Number(kpis.lateInvoicesPercentage || 0) * 100).toFixed(0)}%
          </div>
          <div className="spo-closed-kpi-count">
            of all paid invoices were late
          </div>
        </div>

        <div className="spo-closed-kpi-card">
          <h3>Average days late</h3>
          <div className="spo-closed-kpi-amount">
            {Number(kpis.averageDaysLate || 0).toFixed(2)}
          </div>
          <div className="spo-closed-kpi-count">
            paid late invoices only
          </div>
        </div>
      </div>

      <div className="spo-closed-chart-section">
        <h2>Average days overdue per date</h2>
        <div className="spo-chart-container">
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={paymentDateData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="paymentMonth" />
              <YAxis />
              <Tooltip
                formatter={(value) => [
                  Number(value).toFixed(2),
                  "Average Days Overdue"
                ]}
              />
              <Line
                type="linear"
                dataKey="averageDaysOverdue"
                stroke="#4e79a7"
                strokeWidth={2}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="spo-closed-aging-section">
        <div className="spo-closed-aging-header">
          <h2>Aging</h2>

          <div className="spo-closed-metric-switch">
            <button
              type="button"
              className={agingMetric === "amount" ? "active" : ""}
              onClick={() => setAgingMetric("amount")}
            >
              USD amount
            </button>
            <button
              type="button"
              className={agingMetric === "count" ? "active" : ""}
              onClick={() => setAgingMetric("count")}
            >
              Count
            </button>
          </div>
        </div>

        <div className="spo-chart-container">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={agingData}
              layout="vertical"
              margin={{ top: 15, right: 35, left: 45, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={(value) =>
                  value >= 1000 ? `${Math.round(value / 1000)}K` : value
                }
              />
              <YAxis
                type="category"
                dataKey="bucket"
                width={125}
                interval={0}
              />
              <Tooltip
                formatter={(value) => [
                  agingMetric === "amount"
                    ? `$${formatCurrency(value)}`
                    : value,
                  agingMetric === "amount" ? "Invoice Total" : "Invoice Count"
                ]}
              />
              <Bar
                dataKey={agingMetric}
                fill="#4e79a7"
                barSize={17}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default SPO_ClosedDashboard;
