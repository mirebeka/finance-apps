
import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";

import "./SPO_OpenDashboard.css";
import SPO_DashboardFilters from "./SPO_DashboardFilters.js";

function SPO_OpenDashboard({
  data,
  formatCurrency,
  filters,
  setFilters,
  filterOptions,
  onSearch,
  onResetFilters,
  isLoading
}) {
  const invoices = data.invoices || [];

  const filterFields = [
    { key: "supplierCode", label: "Supplier Code", optionsKey: "supplierCodes" },
    { key: "companyCode", label: "Company Code", optionsKey: "companyCodes" },
    { key: "statementMonth", label: "Statement Month", optionsKey: "statementMonths" },
    { key: "processingStatus", label: "Processing Status", optionsKey: "processingStatuses" },
    { key: "agingBucket", label: "Aging Bucket", optionsKey: "agingBuckets" }
  ];

  const getRowSpan = (invoices, startIndex, fields) => {
    let count = 1;

    for (let i = startIndex + 1; i < invoices.length; i++) {
      const isSameGroup = fields.every(
        (field) => invoices[i][field] === invoices[startIndex][field]
      );

      if (!isSameGroup) {
        break;
      }

      count++;
    }

    return count;
  };

  return (
    <div className="spo-open-dashboard">

      <SPO_DashboardFilters
        fields={filterFields}
        options={filterOptions}
        filters={filters}
        setFilters={setFilters}
        onSearch={onSearch}
        onResetFilters={onResetFilters}
        isLoading={isLoading}
      />

      {/* KPI CARDS */}
      <div className="spo-open-kpi-grid">

        <div className="spo-open-kpi-card total-unpaid-exposure">
          <h3>Total unpaid exposure</h3>
          <div className="spo-open-kpi-amount">
            ${formatCurrency(data.kpis.totalUnpaid.amount)}
          </div>
          <div className="spo-open-kpi-count">
            {data.kpis.totalUnpaid.count} invoices
          </div>
        </div>

        <div className="spo-open-kpi-card">
          <h3>Open overdue</h3>
          <div className="spo-open-kpi-amount">
            ${formatCurrency(data.kpis.openOverdue.amount)}
          </div>
          <div className="spo-open-kpi-count">
            {data.kpis.openOverdue.count} invoices booked in SAP
          </div>
        </div>

        <div className="spo-open-kpi-card">
          <h3>Pending overdue</h3>
          <div className="spo-open-kpi-amount">
            ${formatCurrency(data.kpis.pendingOverdue.amount)}
          </div>
          <div className="spo-open-kpi-count">
            {data.kpis.pendingOverdue.count} invoices not in SAP
          </div>
        </div>

        <div className="spo-open-kpi-card">
          <h3>Pending On Time</h3>
          <div className="spo-open-kpi-amount">
            ${formatCurrency(data.kpis.pendingOnTime.amount)}
          </div>
          <div className="spo-open-kpi-count">
            {data.kpis.pendingOnTime.count} invoices not in SAP
          </div>
        </div>

        <div className="spo-open-kpi-card">
          <h3>Open On Time</h3>
          <div className="spo-open-kpi-amount">
            ${formatCurrency(data.kpis.openOnTime.amount)}
          </div>
          <div className="spo-open-kpi-count">
            {data.kpis.openOnTime.count} invoices healthy queue
          </div>
        </div>

      </div>

      {/* PROCESSING STATUS */}
      <div className="spo-processing-status">
        <h2>Processing Status</h2>

        <div className="spo-processing-status-grid">
          {(data.processingStatus || []).map((item) => (
            <div
              className="spo-processing-status-card"
              key={item.status}
            >
              <h3>{item.status}</h3>
              <div className="spo-processing-status-count">
                {item.count}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AGING BUCKET */}
      <div className="spo-aging-section">
        <h2>Aging Bucket</h2>

        <div className="spo-aging-chart">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={data.aging || []}
              layout="vertical"
              margin={{
                top: 15,
                right: 35,
                left: 45,
                bottom: 20
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
              />

              <XAxis
                type="number"
                domain={[0, "dataMax"]}
                ticks={Array.from({ length: 7 }, (_, i) => i * 1000)}
              />

              <YAxis
                type="category"
                dataKey="bucket"
                width={125}
                interval={0}
              />

              <Tooltip
                formatter={(value) => [
                  `$${formatCurrency(value)}`,
                  "Invoice Total"
                ]}
              />

              <Bar
                dataKey="amount"
                fill="#4e79a7"
                barSize={17}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* INVOICE TABLE */}
        <div className="spo-dashboard-table-container">
          <table className="spo-dashboard-table">
            <thead>
              <tr>
                <th>Invoice Status</th>
                <th>Is it In SAP</th>
                <th>Organization Element Name</th>
                <th>Company Code</th>
                <th>Supplier Code</th>
                <th>Invoice Number</th>
                <th>Statement Month</th>
                <th>Payment Due Date</th>
                <th>Payment Date</th>
                <th>Processing Status</th>
                <th>Invoice Total</th>
                <th>Days Overdue</th>
              </tr>
            </thead>

            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={12} className="spo-dashboard-no-results">
                    No results for this search
                  </td>
                </tr>
              ) : (
                invoices.map((invoice, index) => {
                  const previousInvoice = invoices[index - 1];

                  const isFirstOfStatus =
                    index === 0 ||
                    invoice.INVOICE_STATUS !== previousInvoice.INVOICE_STATUS;

                  const isFirstOfSap =
                    index === 0 ||
                    invoice.INVOICE_STATUS !== previousInvoice.INVOICE_STATUS ||
                    invoice.IS_IT_IN_SAP !== previousInvoice.IS_IT_IN_SAP;

                  const isFirstOfOrg =
                    index === 0 ||
                    invoice.INVOICE_STATUS !== previousInvoice.INVOICE_STATUS ||
                    invoice.IS_IT_IN_SAP !== previousInvoice.IS_IT_IN_SAP ||
                    invoice.ORGANIZATION_ELEMENT_NAME !==
                      previousInvoice.ORGANIZATION_ELEMENT_NAME;

                  const isFirstOfCocode =
                    index === 0 ||
                    invoice.INVOICE_STATUS !== previousInvoice.INVOICE_STATUS ||
                    invoice.IS_IT_IN_SAP !== previousInvoice.IS_IT_IN_SAP ||
                    invoice.ORGANIZATION_ELEMENT_NAME !==
                      previousInvoice.ORGANIZATION_ELEMENT_NAME ||
                    invoice.COMPANY_CODE !== previousInvoice.COMPANY_CODE;

                  return (
                    <tr key={invoice.ROW_ID}>

                      {isFirstOfStatus && (
                        <td rowSpan={getRowSpan(invoices, index, ["INVOICE_STATUS"])}>
                          {invoice.INVOICE_STATUS}
                        </td>
                      )}

                      {isFirstOfSap && (
                        <td rowSpan={getRowSpan(invoices, index, ["INVOICE_STATUS", "IS_IT_IN_SAP"])}>
                          {invoice.IS_IT_IN_SAP}
                        </td>
                      )}

                      {isFirstOfOrg && (
                        <td rowSpan={getRowSpan(invoices, index, ["INVOICE_STATUS", "IS_IT_IN_SAP", "ORGANIZATION_ELEMENT_NAME"])}>
                          {invoice.ORGANIZATION_ELEMENT_NAME}
                        </td>
                      )}

                      {isFirstOfCocode && (
                        <td rowSpan={getRowSpan(invoices, index, ["INVOICE_STATUS", "IS_IT_IN_SAP", "ORGANIZATION_ELEMENT_NAME", "COMPANY_CODE"])}>
                          {invoice.COMPANY_CODE}
                        </td>
                      )}

                      <td>{invoice.SUPPLIER_CODE}</td>
                      <td>{invoice.INVOICE_NUMBER}</td>
                      <td>{invoice.STATEMENT_MONTH}</td>
                      <td>{invoice.PAYMENT_DUE_DATE}</td>
                      <td>{invoice.PAYMENT_DATE}</td>
                      <td>{invoice.PROCESSING_STATUS}</td>
                      <td>{formatCurrency(invoice.INVOICE_TOTAL)}</td>
                      <td>{invoice.DAYS_OVERDUE}</td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default SPO_OpenDashboard;
