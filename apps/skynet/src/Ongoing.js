import { useEffect, useState } from "react";
import './Ongoing.css';
import axios from "axios";
import { API_URL } from "./config";

function Ongoing() {
  const [data, setData] = useState([]);
  const [expandedDescriptions, setExpandedDescriptions] = useState({});

  useEffect(() => {
    axios.get(API_URL + "/api/Skynet/statistics/ongoing")
      .then((res) => {

        setData(res.data);

      })
      .catch((err) => {
        console.error("Error with API request:", err);
      });
  }, []);


  const [filters, setFilters] = useState({
      type: "",
      modifiedBy: "",
      id: "",
      title: "",
      shortDescription: "",
      startDate: "",
      dueDate: "",
      status: "",
      project_manager: "",
      pendingOn: "",
    });

  const getDiffDays = (dueDate) => {
    if (!dueDate) return null;

    const due = new Date(dueDate);
    const today = new Date();

    due.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    return Math.floor((due - today) / (1000 * 60 * 60 * 24));
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
    <>
      {isExpanded ? text : `${text.slice(0, maxLength)}...`}
      <button
        type="button"
        className="show-more-btn"
        onClick={() => toggleDescription(index)}
      >
        {isExpanded ? "Show less" : "Show more..."}
      </button>
    </>
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
    startDate: "",
    dueDate: "",
    status: "",
    project_manager: "",
    pendingOn: "",
  });
};

const getTypeLabel = (type) => {
  if (type === "ADS") return "PROJ";
  if (type === "MODIFICATION") return "MOD";
  return type || "";
};

const getUniqueOptions = (key, transform = null) => {
  const values = data
    .map((row) => {
      if (transform) return transform(row);
      return row[key];
    })
    .filter((value) => value !== null && value !== undefined && value !== "")
    .map((value) => String(value).trim())
    .filter(Boolean);

  return [...new Set(values)].sort((a, b) => {
    if (key === "ID") {
      return Number(a) - Number(b);
    }

    return a.localeCompare(b)
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

const filteredData = data.filter((row) => {
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

    String(row.TITLE || "").toLowerCase().includes(filters.title.toLowerCase()) &&
   
    String(row.SHORT_DESCRIPTION || "").toLowerCase().includes(filters.shortDescription.toLowerCase()) &&
    (!filters.startDate ||
      String(row.START_DATE || "").slice(0, 7) === filters.startDate
    ) &&

    (!filters.dueDate ||
      String(row.DUE_DATE || "").slice(0, 7) === filters.dueDate
    ) &&
    String(row.STATUS || "").toLowerCase().includes(filters.status.toLowerCase()) &&

    String(row.PROJECT_MANAGER || "")
      .toLowerCase()
      .includes(filters.project_manager.toLowerCase()) &&
        
    String(row.PENDING_ON || "").toLowerCase().includes(filters.pendingOn.toLowerCase())
    );
});

  return (
    <div
      style={{
        height: "100vh",
        overflowY: "auto",
        overflowX: "auto",
        padding: "10px",
        boxSizing: "border-box",
      }}
      className="ongoing-container"
    >
     <h2>Ongoing modifications + Not yet Active projects </h2>

< div className="ongoing-card">
  <div className="ongoing-table-wrap">



    <table className="ongoing-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Modified By/Developer</th>
            <th>ID</th>
            <th>Title</th>
            <th>Short Description</th>
            <th>Start Date</th>
            <th>Due Date</th>
            <th>Status</th>
            <th>Project Manager</th>
            <th>Pending On</th>
            <th>Deadline indicator</th>
          </tr>

            <tr className="filter-row">
              <th>
                <select
                  value={filters.type}
                  onChange={(e) => handleFilterChange("type", e.target.value)}
                >
                  <option value="">All</option>
                  {getUniqueOptions("TYPE", (row) => getTypeLabel(row.TYPE)).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </th>

              <th>
                <select
                  value={filters.modifiedBy}
                  onChange={(e) => handleFilterChange("modifiedBy", e.target.value)}
                >
                  <option value="">All</option>
                  {getDeveloperOptions().map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </th>

              <th>
                <select
                  value={filters.id}
                  onChange={(e) => handleFilterChange("id", e.target.value)}
                >
                  <option value="">All</option>
                  {getUniqueOptions("ID").map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </th>

              <th>
              <input
                type="text"
                value={filters.title}
                onChange={(e) => handleFilterChange("title", e.target.value)}
                placeholder="Search title..."
                className="title-filter-input"
              />
            </th>

              <th>
              </th>

            <th>
              <input
                type="month"
                value={filters.startDate}
                onChange={(e) =>
                  handleFilterChange("startDate", e.target.value)
                }
                className="month-filter-input"
              />
            </th>

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
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                >
                  <option value="">All</option>
                  {getUniqueOptions("STATUS").map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </th>

                 <th>
                    <select
                      value={filters.project_manager}
                      onChange={(e) =>
                        handleFilterChange("project_manager", e.target.value)
                      }
                    >
                      <option value="">All</option>

                      {getUniqueOptions("PROJECT_MANAGER").map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                 </th>

              <th>
                <select
                  value={filters.pendingOn}
                  onChange={(e) => handleFilterChange("pendingOn", e.target.value)}
                >
                  <option value="">All</option>
                  {getUniqueOptions("PENDING_ON").map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
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
            const prev = data[index - 1];
            const isNewGroup = !prev || prev.MODIFIED_BY !== row.MODIFIED_BY;

            const diff = getDiffDays(row.DUE_DATE);
            const markerLeft = getMarkerPercent(diff);

            const getTypeLabel = (type) => {
              if (type === "ADS") return "PROJ";
              if (type === "MODIFICATION") return "MOD";
              return type;
            };

            return (
             <tr key={index}>
              <td>{getTypeLabel(row.TYPE)}</td>

                <td className="bold-font">
                  {isNewGroup ? row.MODIFIED_BY : ""}
                </td>

              <td>{row.ID}</td>
              <td>{row.TITLE}</td>
              <td>{getShortDescription(row.SHORT_DESCRIPTION, index)}</td>              
              <td>{row.START_DATE}</td>
              <td>{row.DUE_DATE}</td>
              <td>{row.STATUS}</td>
              <td>{row.PROJECT_MANAGER}</td>
              <td>{row.PENDING_ON}</td>

              <td>
                <div className="deadline-cell">
                  <div className="deadline-track">
                    <div className="deadline-zero-line" />
                    {diff !== null && (
                      <div
                        className={`deadline-bar ${
                          diff < 0 ? "past" : diff === 0 ? "today" : "future"
                        }`}
                        style={
                          diff < 0
                            ? { left: `${markerLeft}%`, width: `${50 - markerLeft}%` }
                            : diff === 0
                            ? { left: "50%", width: "2px" }
                            : { left: "50%", width: `${markerLeft - 50}%` }
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
            <td colSpan="10"></td>
            <td>
              <div className="deadline-axis-shell">
                <div className="deadline-axis-line" />
                <div className="deadline-axis-tick tick-0"><span>-30</span></div>
                <div className="deadline-axis-tick tick-1"><span>-20</span></div>
                <div className="deadline-axis-tick tick-2"><span>-10</span></div>
                <div className="deadline-axis-tick tick-3"><span>0</span></div>
                <div className="deadline-axis-tick tick-4"><span>+10</span></div>
                <div className="deadline-axis-tick tick-5"><span>+20</span></div>
                <div className="deadline-axis-tick tick-6"><span>+30</span></div>

                <div className="deadline-axis-label">Due Date - current date diff</div>
              </div>
            </td>
          </tr>
        </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

export default Ongoing;