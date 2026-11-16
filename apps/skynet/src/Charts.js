import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import "./Charts.css";
import { API_URL } from "./config";


// wrap long labels onto several lines
function splitLabel(text, maxLineLength = 12) {
  const value = String(text || "");
  if (!value) return [""];

  const normalized = value.replace(/-/g, "- ");
  const words = normalized.split(" ");
  const lines = [];
  let currentLine = "";

  // iterate over every word
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;

    if (testLine.length <= maxLineLength) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine.trim());

  return lines;
}

function CustomXAxisTick(props) {
  const { x, y, payload } = props;
  const lines = splitLabel(payload.value, 12);

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={10} textAnchor="middle" fill="#d3d3d3" fontSize={14}>
        {lines.map((line, index) => (
          <tspan key={index} x="0" dy={index === 0 ? 0 : 14}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

// compute the chart width so the labels do not overlap
function getChartMinWidth(dataLength, expanded = false) {
  const minBarSlot = expanded ? 120 : 80;
  const calculated = dataLength * minBarSlot;

  if (expanded) {
    return Math.max(1000, calculated);
  }

  return Math.min(900, Math.max(400, calculated));
}

function Charts() {
  const [statusData, setStatusData] = useState([]);
  const [modificationData, setModificationData] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
  const [savingHourDepartmentData, setSavingHourDepartmentData] = useState([]);
  const [expandedChartType, setExpandedChartType] = useState(null);
  const [departmentList, setDepartmentList] = useState([]);
  const [modificationStatusData, setModificationStatusData] = useState([]);

  const [websiteCount, setWebsiteCount] = useState(null);
  const [websiteCountError, setWebsiteCountError] = useState(false);


  const COLORS = [
  "#4E79A7",
  "#F28E2B",
  "#E15759",
  "#76B7B2",
  "#82ac7d",
  "#B07AA1",
  "#EDC948",
  "#D45087",
  "#9C755F",
  "#2F4B7C",
  "#A05195",
  "#F95D6A",
  "#FF7C43",
  "#FF9DA7",
  "#2CA02C",
  "#17BECF",
  "#9467BD",
  "#8C564B",
  "#BCBD22",
  "#7F7F7F",
  "#1F77B4",
  "#AEC7E8",
  ];

  // each column gets the next colour in the list
  // used by the project status and modification count charts
  function getColorByIndex(index) {
    return COLORS[index % COLORS.length];
  }


  // a department always gets the same colour (department and saving hour charts)
  function getDepartmentColor(departmentName) {
    const index = departmentList.findIndex(
      (dep) => dep.trim() === String(departmentName || "").trim()
    );

    // department not found in the list:
    if (index === -1) return "#888";


      // the modulo wraps around when there are more departments than colours
    return COLORS[index % COLORS.length];
  }

  // BOTTOM SUMMARY ON THE CHARTS PAGE

  // sum up the saved-hours values
  const totalSavedHours = savingHourDepartmentData.reduce((sum, item) => {
    return sum + Number(item.value || 0);
  }, 0);

  // keep only the active projects
  const activeItem = statusData.find(
    (item) => (item.name || item.status || "") === "4 - Active"
  );

  const totalAutomations = Number(activeItem?.value || 0);

  // find the top 10 departments for the department chart
  const topDepartmentData = (() => {
    const sorted = [...departmentData].sort(
      (a, b) => Number(b.value || 0) - Number(a.value || 0)
    );

    const top10 = sorted.slice(0, 10);
    const others = sorted.slice(10);

    const otherValue = others.reduce(
      (sum, item) => sum + Number(item.value || 0),
      0
    );

    if (otherValue > 0) {
      return [...top10, { name: "Other", value: otherValue }];
    }

    return top10;
  })();


  // load the department list
  useEffect(() => {
    axios
      .get(`/departments.txt?timestamp=${Date.now()}`)
      .then((res) => {
        const list = res.data
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);

        setDepartmentList(list);
      })
      .catch(() => setDepartmentList([]));
  }, []);

  // load chart data
  useEffect(() => {
    axios
      .get(API_URL + "/api/Skynet/statistics/chart-status")
      .then((res) => {
        const normalizeStatus = (status) => {
          if (!status) return "";

          return status
            .toString()
            .trim()
            .replace(/\s*-\s*/g, " - ")
            .replace(/\s+/g, " ");
        };

        const grouped = {};

        res.data.forEach((item) => {
          const normalized = normalizeStatus(item.name);

          if (!grouped[normalized]) {
            grouped[normalized] = 0;
          }

          grouped[normalized] += item.value;
        });

        const fixedData = Object.entries(grouped).map(([name, value]) => ({
          name,
          value,
        }));

        setStatusData(fixedData);
      })
      .catch((err) => console.error("Status chart fetch error:", err));

    axios
      .get(API_URL + "/api/Skynet/statistics/chart-modification")
      .then((res) => setModificationData(res.data))
      .catch((err) => console.error("Modification chart fetch error:", err));

    axios
      .get(API_URL +"/api/Skynet/statistics/chart-department")
      .then((res) => setDepartmentData(res.data))
      .catch((err) => console.error("Department chart fetch error:", err));

    axios
      .get(API_URL + "/api/Skynet/statistics/chart-saving-hour-by-department")
      .then((res) => setSavingHourDepartmentData(res.data))
      .catch((err) =>
        console.error("Saving Hour By Department chart fetch error:", err)
      );

    axios
      .get(API_URL + "/api/Skynet/statistics/chart-modification-status")
      .then((res) => setModificationStatusData(res.data))
      .catch((err) =>
        console.error("Modification Status chart fetch error:", err)
      );

    axios
      .get(API_URL + "/api/Skynet/statistics/website-count")
      .then((res) => {
        setWebsiteCount(Number(res.data.total));
        setWebsiteCountError(false);
      })
      .catch((err) => {
        console.error("Website count fetch error:", err);
        setWebsiteCountError(true);
      });
  }, []);


// hover over the bars
function renderTooltip() {
  return (
    <Tooltip
      contentStyle={{
        backgroundColor: "#2c2c2c",
        border: "1px solid #444",
        borderRadius: "10px",
        color: "#fff",
      }}
      labelStyle={{ color: "#c7cfdb" }}
      itemStyle={{ color: "#eaeaff" }}
      cursor={{ fill: "rgba(255,255,255,0.04)" }}
    />
  );
}

// build the bar charts
function renderBarChart(data, colorMode = "index", expanded = false) {
  return (
    <div className={expanded ? "charts-expanded-scroll" : "charts-tile-scroll"}>
      <div
        className="charts-inner-width"
        style={{ width: getChartMinWidth(data.length, expanded) }}
      >
        <ResponsiveContainer width="100%" height={expanded ? 520 : 320}>
          <BarChart
            data={data}
            margin={{
              top: 20,
              right: 20,
              left: 20,
              bottom: expanded ? 85 : 70,
            }}
          >
            <CartesianGrid stroke="#3a3a3a" strokeDasharray="3 3" />

            <XAxis
              dataKey="name"
              interval={0}
              tick={<CustomXAxisTick />}
              height={expanded ? 85 : 70}
            />

            <YAxis tick={{ fill: "#9aa3b2", fontSize: 12 }} />

            {renderTooltip()}

            <Bar dataKey="value">
              {data.map((entry, index) => (
                <Cell
                  key={`bar-cell-${index}`}
                  fill={
                    colorMode === "department"
                      ? getDepartmentColor(entry.name)
                      : getColorByIndex(index)
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// build the pie chart
function renderDepartmentPieChart(expanded = false) {
  return (
    <ResponsiveContainer width="100%" height={expanded ? 520 : 320}>
      <PieChart>
        {renderTooltip()}

        <Pie
          data={topDepartmentData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={expanded ? 170 : 110}
          label={({ name, x, y }) => (
            <text
              x={x}
              y={y}
              fill="#ffffff"
              textAnchor={x > (expanded ? 550 : 250) ? "start" : "end"}
              dominantBaseline="central"
              fontSize={13}
            >
              {name}
            </text>
          )}
        >
          {topDepartmentData.map((entry, index) => (
            <Cell
              key={`department-cell-${index}`}
              fill={getDepartmentColor(entry.name)}
            />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

// card-style presentation of the charts (click to enlarge)
function renderChartCard(type, title, content) {
  return (
    <div className="charts-card" onClick={() => setExpandedChartType(type)}>
      <div className="charts-card-header">
        <h3>{title}</h3>

        <button
          type="button"
          className="charts-expand-btn"
          onClick={(e) => {
            e.stopPropagation();
            setExpandedChartType(type);
          }}
        >
          ↗
        </button>
      </div>

      <div className="charts-card-body">{content}</div>
    </div>
  );
}

  return (
    <div className="charts-page">
      <div className="charts-page-header"></div>

      <div className="charts-grid">
        {renderChartCard(
          "status",
          "Project Status Chart",
          renderBarChart(statusData, "index", false)
        )}

        {renderChartCard(
          "department",
          "Department Chart",
          renderDepartmentPieChart(false)
        )}

        {renderChartCard(
          "modification",
          "Modification Count Chart",
          renderBarChart(modificationData, "index", false)
        )}

        {renderChartCard(
          "modificationStatus",
          "Modification Status Chart",
          renderBarChart(modificationStatusData, "index", false)
        )}

        <div
          className="charts-card charts-card-wide"
          onClick={() => setExpandedChartType("savingHourDepartment")}
        >
          <div className="charts-card-header">
            <h3>Saving Hour by Department Chart</h3>

            <button
              type="button"
              className="charts-expand-btn"
              onClick={(e) => {
                e.stopPropagation();
                setExpandedChartType("savingHourDepartment");
              }}
            >
              ↗
            </button>
          </div>

          <div className="charts-card-body">
            {renderBarChart(savingHourDepartmentData, "department", false)}
          </div>
        </div>
      </div>

      <div className="charts-summary">
        <span className="charts-summary-number">
          {totalAutomations.toLocaleString()}
        </span>{" "}
        operative automations with over{" "}
        <span className="charts-summary-number">
          {Math.round(totalSavedHours).toLocaleString()}
        </span>{" "}
        saved working hours/year
      </div>

      <div className="charts-summary">
        Number of websites:{" "}
        <span className="charts-summary-number">
          {websiteCountError
            ? "Could not load"
            : websiteCount === null
              ? "..."
              : websiteCount.toLocaleString()}
        </span>
      </div>

      {expandedChartType && (
        <div
          className="charts-modal-overlay"
          onClick={() => setExpandedChartType(null)}
        >
          <div className="charts-modal" onClick={(e) => e.stopPropagation()}>
            <div className="charts-modal-header">
              {expandedChartType === "status" && <h2>Status Chart</h2>}

              {expandedChartType === "modification" && (
                <h2>Modification Count Chart</h2>
              )}

              {expandedChartType === "modificationStatus" && (
                <h2>Modification Status Chart</h2>
              )}

              {expandedChartType === "department" && <h2>Department Chart</h2>}

              {expandedChartType === "savingHourDepartment" && (
                <h2>Saving Hour by Department Chart</h2>
              )}

              <button
                type="button"
                className="charts-close-btn"
                onClick={() => setExpandedChartType(null)}
              >
                ×
              </button>
            </div>

            <div className="charts-modal-body">
              {expandedChartType === "status" &&
                renderBarChart(statusData, "index", true)}

              {expandedChartType === "modification" &&
                renderBarChart(modificationData, "index", true)}

              {expandedChartType === "modificationStatus" &&
                renderBarChart(modificationStatusData, "index", true)}

              {expandedChartType === "department" &&
                renderDepartmentPieChart(true)}

              {expandedChartType === "savingHourDepartment" &&
                renderBarChart(savingHourDepartmentData, "department", true)}
            </div>

            <div className="charts-modal-footer">
              <button
                type="button"
                className="charts-close-action"
                onClick={() => setExpandedChartType(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Charts;