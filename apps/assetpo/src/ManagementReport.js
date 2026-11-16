import { useEffect, useState } from "react";
import "./ManagementReport.css";

import { API_URL } from "./config";
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

const ASSETPO_API = `${API_URL}/api/assetpo`;

const colors = [
  "#45bdb9",
  "#43bde3",
  "#1a70b1",
  "#5a6571",
  "#000309",
];

function ManagementReport() {
  const [chartData, setChartData] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedStatus, setSelectedStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [statuses, setStatuses] = useState([]);
  const [statusesError, setStatusesError] = useState("");
  const [statusesLoading, setStatusesLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function loadReport() {
      setLoading(true);
      setError("");
      setChartData([]);
      setTeams([]);

      if (startDate && endDate && startDate > endDate) {
        setError("The start date must be on or before the end date.");
        setLoading(false);
        return;
      }

      const params = new URLSearchParams();

      if (selectedStatus) {
        params.set("status", selectedStatus);
      }

      if (startDate) {
        params.set("startDate", startDate);
      }

      if (endDate) {
        params.set("endDate", endDate);
      }

      try {
        const response = await fetch(
          `${ASSETPO_API}/management-report?${params.toString()}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Failed to load management report.");
        }

        const rows = await response.json();

        if (!Array.isArray(rows)) {
          throw new Error("Unexpected management report response.");
        }

        const groupedDates = new Map();
        const teamNames = new Set();

        rows.forEach((row) => {
          if (
            !row ||
            typeof row.reportDate !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(row.reportDate) ||
            (row.teamResponsible != null &&
              typeof row.teamResponsible !== "string") ||
            row.recordCount == null ||
            row.recordCount === "" ||
            !Number.isFinite(Number(row.recordCount))
          ) {
            throw new Error("Unexpected management report row format.");
          }

          const team = row.teamResponsible ?? "(Unassigned)";
          teamNames.add(team);

          if (!groupedDates.has(row.reportDate)) {
            groupedDates.set(row.reportDate, {
              reportDate: row.reportDate,
              values: Object.create(null),
            });
          }

          const dateEntry = groupedDates.get(row.reportDate);
          dateEntry.values[team] = Number(row.recordCount);
        });

        const formattedData = [...groupedDates.values()].sort((a, b) =>
          a.reportDate.localeCompare(b.reportDate)
        );

        if (!controller.signal.aborted) {
          setChartData(formattedData);
          setTeams([...teamNames].sort());
        }
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadReport();

    return () => controller.abort();
  }, [selectedStatus, startDate, endDate]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadStatuses() {
      setStatusesLoading(true);
      setStatusesError("");

      try {
        const response = await fetch(
          `${ASSETPO_API}/management-report/filter-options`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Failed to load statuses.");
        }

        const data = await response.json();

        if (
          !Array.isArray(data.statuses) ||
          data.statuses.some((status) => typeof status !== "string")
        ) {
          throw new Error("Unexpected status options response.");
        }

        if (!controller.signal.aborted) {
          setStatuses(
            [...new Set(data.statuses)]
              .filter((status) => status !== "")
              .sort()
          );
        }
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setStatusesError(loadError.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setStatusesLoading(false);
        }
      }
    }

    loadStatuses();

    return () => controller.abort();
  }, []);

  function resetFilters() {
    setSelectedStatus("");
    setStartDate("");
    setEndDate("");
  }

  return (
    <section className="assetpo-page management-report">
      <div className="assetpo-page-header">
        <h1>Management Report</h1>

        <button
          type="button"
          className="assetpo-reset-filters"
          onClick={resetFilters}
        >
          Reset filters
        </button>
      </div>

      <div className="management-report-filters">
        <label>
          Report Date – From
          <input
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </label>

        <label>
          Report Date – To
          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </label>

        <label>
          Status
          <select
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value)}
            disabled={statusesLoading || Boolean(statusesError)}
          >
            <option value="">
              {statusesLoading ? "Loading statuses..." : "All"}
            </option>

            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </div>

      {statusesError && <p role="alert">{statusesError}</p>}

      {loading && <p role="status">Loading management report...</p>}

      {error && <p role="alert">{error}</p>}

      {!loading && !error && chartData.length === 0 && (
        <p role="status">
          No data available for the selected filters.
        </p>
      )}

      {!loading && !error && chartData.length > 0 && (
        <div className="management-report-chart">
          <ResponsiveContainer width="100%" height={500}>
            <LineChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 10,
                bottom: 20,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis
                dataKey="reportDate"
                minTickGap={40}
              />

              <YAxis allowDecimals={false} />

              <Tooltip />
              <Legend />

              {teams.map((team, index) => (
                <Line
                  key={team}
                  type="linear"
                  dataKey={(point) => point.values[team]}
                  name={team}
                  stroke={colors[index]}
                  strokeWidth={1}
                  dot={chartData.length === 1}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

export default ManagementReport;