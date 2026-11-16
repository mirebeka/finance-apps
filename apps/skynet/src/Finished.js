import React, { useState, useEffect, useMemo } from "react";
import "./Finished.css";
import axios from "axios";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { API_URL } from "./config";

function Finished() {
  const [data, setData] = useState([]);
  const [expandedDescriptions, setExpandedDescriptions] = useState({});

  const [filters, setFilters] = useState({
    type: "",
    modifiedBy: "",
    id: "",
    title: "",
    shortDescription: "",
    dueDate: "",
    actualGoLiveDate: "",
  });

  const PIE_COLORS = ["#3f8320", "#e25555"];

  const getTypeLabel = (type) => {
    if (type === "ADS") return "PROJ";
    if (type === "MODIFICATION") return "MOD";
    return type || "";
  };

  const getDiffDays = (dueDate, actualDate) => {
    if (!dueDate || !actualDate) return null;

    const due = new Date(dueDate);
    const actual = new Date(actualDate);

    if (isNaN(due.getTime()) || isNaN(actual.getTime())) return null;

    due.setHours(0, 0, 0, 0);
    actual.setHours(0, 0, 0, 0);

    return Math.floor((due - actual) / (1000 * 60 * 60 * 24));
  };

  const getClampedDiff = (diff) => {
    if (diff === null) return null;
    if (diff > 30) return 30;
    if (diff < -30) return -30;
    return diff;
  };

  const getMarkerPercent = (diff) => {
    const clamped = getClampedDiff(diff);

    if (clamped === null) return 50;

    return ((clamped + 30) / 60) * 100;
  };

  const toggleDescription = (index) => {
    setExpandedDescriptions((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const getShortDescription = (text, index) => {
    if (!text) return "";

    const maxLength = 60;
    const isExpanded = expandedDescriptions[index];

    if (text.length <= maxLength) {
      return text;
    }

    return (
      <div className={isExpanded ? "desc-expanded" : "desc-collapsed"}>
        <span>
          {isExpanded ? text : `${text.slice(0, maxLength)}...`}
        </span>

        <button
          type="button"
          className="show-more-btn"
          onClick={() => toggleDescription(index)}
        >
          {isExpanded ? "Show less" : "Show more..."}
        </button>
      </div>
    );
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      type: "",
      modifiedBy: "",
      id: "",
      title: "",
      shortDescription: "",
      dueDate: "",
      actualGoLiveDate: "",
    });
  };

  const getUniqueOptions = (key, transform = null) => {
    const values = data
      .map((row) => {
        if (transform) return transform(row);
        return row[key];
      })
      .filter(
        (value) =>
          value !== null &&
          value !== undefined &&
          value !== ""
      )
      .map((value) => String(value).trim())
      .filter(Boolean);

    return [...new Set(values)].sort((a, b) => {
      if (key === "ID") {
        return Number(a) - Number(b);
      }

      return a.localeCompare(b);
    });
  };

  const getDeveloperOptions = () => {
    return [
      ...new Set(
        data
          .flatMap((row) =>
            String(row.MODIFIED_BY || "")
              .split(",")
              .map((name) => name.trim())
          )
          .filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b));
  };

  useEffect(() => {
    axios
      .get(API_URL + "/api/Skynet/statistics/finished")
      .then((res) => {
        setData(res.data);

      })
      .catch((err) => {
        console.error("Error with API request:", err);
      });
  }, []);

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      const typeLabel = getTypeLabel(row.TYPE);

      return (
        typeLabel.toLowerCase().includes(filters.type.toLowerCase()) &&

        (
          !filters.modifiedBy ||
          String(row.MODIFIED_BY || "")
            .split(",")
            .map((name) => name.trim().toLowerCase())
            .includes(filters.modifiedBy.toLowerCase())
        ) &&

        (
          !filters.id ||
          String(row.ID || "") === String(filters.id)
        ) &&

        String(row.TITLE || "")
          .toLowerCase()
          .includes(filters.title.toLowerCase()) &&

        String(row.SHORT_DESCRIPTION || "")
          .toLowerCase()
          .includes(filters.shortDescription.toLowerCase()) &&

        (
          !filters.dueDate ||
          String(row.DUE_DATE || "").slice(0, 7) === filters.dueDate
        ) &&

        (
          !filters.actualGoLiveDate ||
          String(row.ACTUAL_GO_LIVE_DATE || "").slice(0, 7) ===
            filters.actualGoLiveDate
        )
      );
    });
  }, [data, filters]);

  const averageFinishStats = useMemo(() => {
    const diffs = filteredData
      .map((row) =>
        getDiffDays(row.DUE_DATE, row.ACTUAL_GO_LIVE_DATE)
      )
      .filter((diff) => diff !== null);

    const onTimeDiffs = diffs.filter((diff) => diff >= 0);
    const lateDiffs = diffs.filter((diff) => diff < 0);

    const avg = (arr) => {
      if (arr.length === 0) return 0;

      return (
        arr.reduce((sum, value) => sum + value, 0) /
        arr.length
      );
    };

    return {
      onTimeAverage: avg(onTimeDiffs),
      lateAverage: avg(lateDiffs),
    };
  }, [filteredData]);

  const pieData = useMemo(() => {
    let onTime = 0;
    let pastDeadline = 0;

    filteredData.forEach((row) => {
      const diff = getDiffDays(
        row.DUE_DATE,
        row.ACTUAL_GO_LIVE_DATE
      );

      if (diff === null) return;

      if (diff >= 0) {
        onTime++;
      } else {
        pastDeadline++;
      }
    });

    return [
      { name: "Finished On Time", value: onTime },
      { name: "Finished Past Deadline", value: pastDeadline },
    ];
  }, [filteredData]);

  return (
        <div
      style={{
        height: "100vh",
        overflowY: "auto",
        overflowX: "auto",
        padding: "10px",
        boxSizing: "border-box",
      }}
      className="finished-container"
    >
      <h2>Finished modifications and Active projects</h2>

      <div className="finished-content">
        <div className="finished-card">
          <div className="finished-table-wrap">
            <table className="finished-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Modified By/Developer</th>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Short Description</th>
                  <th>Due Date</th>
                  <th>Actual Go Live Date</th>
                  <th>Finished deadline indicator</th>
                </tr>

                <tr className="filter-row">
                  <th>
                    <select
                      value={filters.type}
                      onChange={(e) =>
                        handleFilterChange("type", e.target.value)
                      }
                    >
                      <option value="">All</option>

                      {getUniqueOptions("TYPE", (row) =>
                        getTypeLabel(row.TYPE)
                      ).map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </th>

                  <th>
                    <select
                      value={filters.modifiedBy}
                      onChange={(e) =>
                        handleFilterChange("modifiedBy", e.target.value)
                      }
                    >
                      <option value="">All</option>

                      {getDeveloperOptions().map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </th>

                  <th>
                    <select
                      value={filters.id}
                      onChange={(e) =>
                        handleFilterChange("id", e.target.value)
                      }
                    >
                      <option value="">All</option>

                      {getUniqueOptions("ID").map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </th>

                  <th>
                    <input
                      type="text"
                      value={filters.title}
                      onChange={(e) =>
                        handleFilterChange("title", e.target.value)
                      }
                      placeholder="Search title..."
                      className="title-filter-input"
                    />
                  </th>

                  <th></th>

                  <th>
                    <input
                      type="month"
                      value={filters.dueDate}
                      onChange={(e) =>
                        handleFilterChange("dueDate", e.target.value)
                      }
                      className="month-filter-input"
                    />
                  </th>

                  <th>
                    <input
                      type="month"
                      value={filters.actualGoLiveDate}
                      onChange={(e) =>
                        handleFilterChange(
                          "actualGoLiveDate",
                          e.target.value
                        )
                      }
                      className="month-filter-input"
                    />
                  </th>

                  <th className="clear-filter-cell">
                    <button
                      type="button"
                      className="clear-filters-btn"
                      onClick={clearAllFilters}
                    >
                      Clear Filters
                    </button>
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredData.map((row, index) => {
                  const prev = filteredData[index - 1];
                  const isNewGroup =
                    !prev || prev.MODIFIED_BY !== row.MODIFIED_BY;

                  const diff = getDiffDays(
                    row.DUE_DATE,
                    row.ACTUAL_GO_LIVE_DATE
                  );

                  const markerLeft = getMarkerPercent(diff);

                  return (
                    <tr key={index}>
                      <td>{getTypeLabel(row.TYPE)}</td>

                      <td className="bold-font">
                        {isNewGroup ? row.MODIFIED_BY : ""}
                      </td>

                      <td>{row.ID}</td>
                      <td>{row.TITLE}</td>
                      <td>
                        {getShortDescription(
                          row.SHORT_DESCRIPTION,
                          index
                        )}
                      </td>

                      <td>{row.DUE_DATE}</td>
                      <td>{row.ACTUAL_GO_LIVE_DATE}</td>

                      <td>
                        <div className="deadline-cell">
                          <div className="deadline-track">
                            <div className="deadline-zero-line" />

                            {diff !== null && (
                              <div
                                className={`deadline-bar ${
                                  diff < 0
                                    ? "past"
                                    : diff === 0
                                    ? "today"
                                    : "future"
                                }`}
                                style={
                                  diff < 0
                                    ? {
                                        left: `${markerLeft}%`,
                                        width: `${50 - markerLeft}%`,
                                      }
                                    : diff === 0
                                    ? {
                                        left: "50%",
                                        width: "2px",
                                      }
                                    : {
                                        left: "50%",
                                        width: `${markerLeft - 50}%`,
                                      }
                                }
                                title={`${diff} days`}
                              />
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                <tr className="deadline-axis-row">
                  <td colSpan="7"></td>

                  <td>
                    <div className="deadline-axis-shell">
                      <div className="deadline-axis-line" />

                      <div className="deadline-axis-tick tick-1">
                        <span>-20</span>
                      </div>

                      <div className="deadline-axis-tick tick-2">
                        <span>-10</span>
                      </div>

                      <div className="deadline-axis-tick tick-3">
                        <span>0</span>
                      </div>
                      
                                            <div className="deadline-axis-tick tick-4">
                        <span>+10</span>
                      </div>

                      <div className="deadline-axis-tick tick-5">
                        <span>+20</span>
                      </div>

                      <div className="deadline-axis-label">
                        Due Date - Actual Go Live Date
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="finished-chart-card">
          <h3>Deadline percentage</h3>

          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`cell-${entry.name}`}
                    fill={PIE_COLORS[index]}
                  />
                ))}
              </Pie>

              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>

          <div className="average-finish-box">
            <h3>Average finishing time</h3>

            <div className="average-finish-row on-time">
              <span>Finished On Time: </span>

              <strong>
                {averageFinishStats.onTimeAverage.toFixed(2)} days
              </strong>
            </div>

            <div className="average-finish-row late">
              <span>Finished Past Deadline: </span>

              <strong>
                {averageFinishStats.lateAverage.toFixed(2)} days
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Finished;