import React, { useEffect, useState } from "react";
import axios from "axios";
import Select from "react-select";
import "./Modifications.css";
import { API_URL } from "./config";



const customStyles = {
  control: (base) => ({ ...base, backgroundColor: "#2c2c2c", borderColor: "#888", color: "white", fontSize: "0.85rem", maxWidth: "100%", overflow: "hidden" }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  menu: (base) => ({ ...base, backgroundColor: "#2c2c2c", color: "white", zIndex: 9999 }),
  option: (base, state) => ({ ...base, backgroundColor: state.isFocused ? "#444" : state.isSelected ? "#555" : "#2c2c2c", color: "white", cursor: "pointer" }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? "#444" : state.isSelected ? "#555" : "#2c2c2c",
    color: "white",
    cursor: "pointer",
  }),
  singleValue: (base) => ({ ...base, color: "white" }),
  placeholder: (base) => ({ ...base, color: "#aaa" }),
  dropdownIndicator: (base) => ({ ...base, color: "#ccc", "&:hover": { color: "white" } }),
  indicatorSeparator: () => ({ display: "none" }),
  multiValue: (base) => ({ ...base, backgroundColor: "#444", borderRadius: "12px", padding: "2px 6px" }),
  multiValueLabel: (base) => ({ ...base, color: "white" }),
  multiValueRemove: (base) => ({ ...base, color: "white", ":hover": { backgroundColor: "red", color: "white" } }),
};

const statusOptions = [
  { value: "0 - Backlog", label: "0 - Backlog" },
  { value: "1 - Scripting", label: "1 - Scripting" },
  { value: "2 - Testing", label: "2 - Testing" },
  { value: "3 - Finished", label: "3 - Finished" },
  { value: "N - Not Needed", label: "N - Not needed" },
  { value: "H - On Hold", label: "H - On Hold" },
];

function Modifications() {
  // state of the search side
  const [devOptions, setDevOptions] = useState([]);
  const [selectedDevs, setSelectedDevs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);

  // Find by ID statek
  const [searchId, setSearchId] = useState("");
  const [loadingId, setLoadingId] = useState(false);
  const [idMsg, setIdMsg] = useState("");

  //Filter by department
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [edit, setEdit]= useState(null);
  const [devResults, setDevResults] = useState([]);


  // History modal statek
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyProject, setHistoryProject] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Form / add-edit modification
  const [activeProject, setActiveProject] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingMod, setEditingMod] = useState(null);


  const shortDepartmentNames = {
    "Programming": "Prog",
    "Financial Reporting": "Fin.Rep",
    "Cash Operations": "CashOps",
    "GL Comp&TE": "GL Comp&TE",
    "ICO": "ICO",
    "T&E": "T&E",
    "Fixed Asset": "FixedA",
    "Lease": "Lease",
    "OTC": "OTC",
    "PTP": "PTP",
    "Corporate Accounting": "CorpAcc",
    "Content Marketing": "ContMark",
    "Controllership": "Contr",
    "GL International Revenue (TVM)": "GL IntRev (TVM)",
    "GL International Revenue (DTC)": "GL IntRev (DTC)",
    "International Reporting": "IntRep",
    "MDG": "MDG",
    "FP&A": "FP&A",
    "HR": "HR",
    "Fraud & Audit": "Fraud",
    "Tax": "Tax",
    "GL SG&A": "GL SG&A",
    "Domestic DTC": "Dom DTC",
  };

  const [form, setForm] = useState({
    shortDescription: "",
    detailedDescription: "",
    dueDate: "",
    actualGoLiveDate: "",
    startDate: "",
    status: "",
    pendingOn: "",
    modifiedBy: [],
  });

  // errors for the required fields
  const [errors, setErrors] = useState({});

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const getStatusCode = (status) => {
    const m = String(status || "").match(/^(\d+)/);
    return m ? parseInt(m[1], 10) : 999;            
  };

const [sortid, setSortid]  = useState("desc");
const availableDepartments = [
  ...new Set(
    projects.map((r) => r.DEPARTMENT).filter(Boolean)
  ),
].sort((a, b) => a.localeCompare(b));

const availableDepartmentOptions = availableDepartments.map((department) => ({
  value: department,
  label: department,
}));

const filteredProjects = projects.filter((row) => {
  const departmentOk =
    selectedDepartments.length === 0 ||
    selectedDepartments.includes(row.DEPARTMENT);

  return departmentOk;
});

const sorted = sortid === "desc"
  ? [...filteredProjects].sort((a, b) => b.UNIQUE_ID - a.UNIQUE_ID)
  : [...filteredProjects].sort((a, b) => a.UNIQUE_ID - b.UNIQUE_ID);

  const isDueLocked = !!editingMod && !!editingMod.DUE_DATE;

  // load developers for the dropdown
  useEffect(() => {
    axios
      .get(`/developers.txt?ts=${Date.now()}`)
      .then((res) => {
        const lines = res.data
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));
        const options = lines.map((d) => ({ value: d, label: d }));

        options.push({
          value: "OTHER",
          label: "Other",
        });

        setDevOptions(options);
      })
    .catch(() => setDevOptions([]));
  }, []);

  // find by dev
const handleDevChange = async (selected) => {
  const next = selected || [];
  const values = next.map((opt) => opt.value).filter(Boolean);

  setSearchId("");
  setIdMsg("");

  if (!values.length) {
    setSelectedDevs([]);
    setProjects([]);
    return;
  }

  const hasOthers = values.includes("OTHER");

  let effectiveSelection;
  let BackendFilter;

  if (hasOthers && values.length === 1) {
    effectiveSelection = [{ value: "OTHER", label: "Other" }];
    BackendFilter = ["OTHER"];
  } else {
    effectiveSelection = next.filter((o) => o.value !== "OTHER");
    BackendFilter = effectiveSelection.map((opt) => opt.value);
    
    if (!BackendFilter.length) {
      setSelectedDevs([]);
      setProjects([]);
      return;
    }
  }

  setSelectedDevs(effectiveSelection);

    setLoading(true);
    try {
      const res = await axios.post(API_URL + "/api/modifications/by-devs", 
        { developers: BackendFilter }
      );
      setProjects(res.data || []);
    } catch (err) {
      console.error(err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  // find by ID 
  const handleFindById = async () => {
    const q = (searchId || "").trim();

    if (!q) {
      setIdMsg("");
      setProjects([]);
      return;
    }

    setLoadingId(true);
    setLoading(true);
    setIdMsg("");

    setSelectedDevs([]);

    try {
      const res = await axios.get(API_URL + "/api/modifications/by-id", {
        params: { id: q },
        });


      setProjects([res.data]);
      setIdMsg("");
    } catch (e) {
      console.error(e);

      if (e.response?.status === 404) {
        setIdMsg("noActive");
      } else {
        setIdMsg("err");
      }
      setProjects([]);
    } finally {
      setLoadingId(false);
      setLoading(false);
    }
  };

const handleAddModification = (projectRow) => {
  setEditingMod(null);
  setActiveProject({
    UNIQUE_ID: projectRow.UNIQUE_ID,
    TITLE: projectRow.TITLE,
  });

  setForm({
    shortDescription: "",
    detailedDescription: "",
    startDate: "",
    dueDate: "",
    actualGoLiveDate: "",
    status: "",
    pendingOn: "",
    modifiedBy: [],
  });

  setErrors({});
  setShowAddModal(true);
};


  const handleSaveModification = async () => {
    if (!activeProject) return;

      const required = [
        "shortDescription",
        "detailedDescription",
        "startDate",
        "dueDate",
        "status",
        "modifiedBy",
      ];


    const newErrors = {};
    required.forEach((f) => {
      const v = form[f];
      const emptyArray = Array.isArray(v) && v.length === 0;
      if (v === undefined || v === null || v === "" || emptyArray) {
        newErrors[f] = "Please fill out this field.";
      }
    });

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return; 
    }

    setSaving(true);

    try {
      if (editingMod) {
        await axios.put(API_URL + `/api/modifications/${editingMod.MODIFICATION_ID}`, {
          shortDescription: form.shortDescription,
          detailedDescription: form.detailedDescription,
          startDate: form.startDate || null,  
          dueDate: form.dueDate || null,
          actualGoLiveDate: form.actualGoLiveDate || null,
          status: form.status,
          pendingOn: form.pendingOn || null,
          modifiedBy: form.modifiedBy || [],
      });

      } else {
        await axios.post(API_URL + "/api/modifications/add", {
          projectId: activeProject.UNIQUE_ID,
          projectTitle: activeProject.TITLE,
          shortDescription: form.shortDescription,
          detailedDescription: form.detailedDescription,
          startDate: form.startDate || null,
          dueDate: form.dueDate || null,
          actualGoLiveDate: form.actualGoLiveDate || null,
          status: form.status,
          pendingOn: form.pendingOn || null,
          modifiedBy: form.modifiedBy || [],
        });
      }

      setShowAddModal(false);
      setEditingMod(null);

      const devNames = (selectedDevs || []).map((o) => o.value);
      if (devNames.length) {
        const res = await axios.post(API_URL + "/api/modifications/by-devs",{ developers: devNames });
        setProjects(res.data || []);
      }
    } catch (err) {
      console.error(err);
      alert("Saving failed.");
    } finally {
      setSaving(false);
    }
  };

 // open the history
const handleSeeModifications = async (row) => {
  setHistoryProject(row);
  setHistoryItems([]);
  setShowHistoryModal(true);
  setHistoryLoading(true);
  try {
    const res = await axios.get(API_URL + `/api/modifications/by-project/${row.UNIQUE_ID}`);
    


    let items = Array.isArray(res.data) ? res.data : [];

    items = [...items].sort(
      (a, b) => getStatusCode(a.STATUS) - getStatusCode(b.STATUS)
    );

    setHistoryItems(items);
  } catch (err) {
    console.error(err);
    setHistoryItems([]);
  } finally {
    setHistoryLoading(false);
  }
};


  const handleEditModification = (m) => {
    setEditingMod(m);
    setActiveProject({
      UNIQUE_ID: m.ID,
      TITLE: m.TITLE,
    });

    setForm({
      shortDescription: m.SHORT_DESCRIPTION || "",
      detailedDescription: m.DETAILED_DESCRIPTION || "",
      dueDate: m.DUE_DATE || "",
      actualGoLiveDate: m.ACTUAL_GO_LIVE_DATE || "",
      startDate: m.START_DATE || "",
      status: m.status || m.STATUS || "",
      pendingOn: m.PENDING_ON || "",
      modifiedBy: m.MODIFIED_BY
        ? m.MODIFIED_BY.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
    });
    setErrors({});
    setShowHistoryModal(false);
    setShowAddModal(true);

  };


  return (
  <div className="mod-container">
    {/* LEFT COLUMN: Find by ID + Find by Developer */}
    <div>

      {/* Find by ID - also works with ENTER */}
      <form
        className="tp-search-card"
        onSubmit={(e) => {
          e.preventDefault();   // do not reload the page
          handleFindById();     // same as the Find button
        }}
      >
        <label>
          <span>Find by ID</span>
          <div className="tp-id-wrap">
            <input
              type="text"
              name="searchId"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="Search..."
              className="tp-id-input"
            />
            {searchId && (
              <button
                type="button"          
                className="tp-id-clear"
                aria-label="Clear ID"
                title="Clear"
                onClick={() => {
                  setSearchId("");
                  setIdMsg("");
                  setProjects([]);
                }}
              >
                ×
              </button>
            )}
          </div>
        </label>

        <div className="tp-inline-controls">
          <button
            type="submit"        // <- this makes ENTER submit the form
            className="tp-btn"
          >
            Find
          </button>
          {loadingId && <span className="muted">Loading…</span>}
          {idMsg === "err" && <span className="error">Server error</span>}
        </div>
      </form>

      {/* FILTER BY DEPARTMENT */}
      {!edit && projects.length > 0 && (
        <div className="tp-search-card">
          <label>
            <span>Filter by Department</span>
            <Select
              styles={customStyles}
              value={selectedDepartments.map((department) => ({
                value: department,
                label: department,
              }))}
              isMulti
              onChange={(opts) =>
                setSelectedDepartments(opts ? opts.map((o) => o.value) : [])
              }
              options={availableDepartmentOptions}
              placeholder="Select department..."
              isClearable
            />
          </label>
        </div>
      )}

        <div className="mod-search-card">
          <span>Find by Developer(s)</span>
          <p className="mod-card-sub">Only projects with Active status will be listed.</p>

          <label className="mod-label" htmlFor="dev-select"></label>
          <Select
            inputId="dev-select"
            options={devOptions}
            isMulti
            value={selectedDevs}
            onChange={handleDevChange}
            placeholder="Select one or more developers..."
            styles={customStyles}
          />
        </div>
      </div>

      {/* RIGHT: list - only shown when there is an ID search, a selected developer or a result */}
      {(selectedDevs.length > 0 ||
        projects.length > 0 ||
        (searchId && idMsg)) && (
        <div className="mod-list-card">
          <div className="mod-list-title">
            <span>
              Active projects for developer(s):{" "}
              <strong>
                {Array.isArray(selectedDevs)
                  ? selectedDevs.map((o) => o?.label).filter(Boolean).join(", ")
                  : selectedDevs?.label || "—"}
              </strong>
            </span>
            <span className="mod-count">{sorted.length}</span>
          </div>

          {loading && <p className="muted">Loading...</p>}

          {/* Find by id - no match */}
          {!loading &&
            searchId &&
            projects.length === 0 &&
            idMsg === "noActive" && (
              <p className="muted">
                No active project found with the ID {searchId}.
              </p>
            )}

          {/* Default state */}
          {!loading &&
            !searchId &&
            selectedDevs.length === 0 &&
            projects.length === 0 && (
              <p className="muted">Select at least one developer on the left.</p>
            )}

          {/* Find by dev - no match */}
          {!loading &&
            !searchId &&
            selectedDevs.length > 0 &&
            projects.length === 0 && (
              <p className="muted">
                No Active projects found for the selected developers.
              </p>
            )}

          {!loading && projects.length > 0 && (
            <table className="mod-table">
              <thead>
                <tr>
                  <th style={{ width: 120, cursor: "pointer" }}
                  onClick={() => setSortid(prev => prev === "asc" ? "desc" : "asc")}
                  >
                    ID {sortid === "asc" ?"▲" : "▼"}
                  </th>
                  <th style={{ width: 80 }}>Title</th>
                  <th style={{ minWidth: 120, textAlign: "center" }}>Department</th>
                  <th style={{ minWidth: 100, textAlign: "center" }}>Status</th>

                  <th style={{ minWidth: 100, textAlign: "center" }}>
                    Ongoing mod. count
                  </th>
                  
                  <th style={{ minWidth: 100, textAlign: "center" }}>
                    Modification count
                  </th>
                  
                  <th style={{ width: 100, textAlign: "center" }}>History</th>
                  <th style={{ width: 120, textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => (
                  <tr key={row.UNIQUE_ID} className="mod-row">
                    <td>{row.UNIQUE_ID}</td>
                    <td>{row.TITLE}</td>
                    <td style={{ textAlign: "center" }}>
                      {shortDepartmentNames[row.DEPARTMENT] || row.DEPARTMENT || "—"}
                    </td>
                    <td style={{ textAlign: "center" }}>{row.STATUS}</td>
                    <td style={{ textAlign: "center" }}>{row.ONGOING_MOD_COUNT ?? 0}</td>
                    <td style={{ textAlign: "center" }}>{row.MOD_COUNT ?? 0}</td>
                    <td style={{ textAlign: "center" }}>
                      {(row.MOD_COUNT ?? 0) > 0 && (
                        <button
                          className="mod-action-btn"
                          onClick={() => handleSeeModifications(row)}
                        >
                          See modifications
                        </button>
                      )}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        className="mod-action-btn"
                        onClick={() => handleAddModification(row)}
                      >
                        Add modification
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {showAddModal && (
        <div
          className="mod-modal-backdrop"
          onClick={() => setShowAddModal(false)}
        >
          <div className="mod-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mod-modal-header">
              <h4>{editingMod ? "Edit modification" : "Add modification"}</h4>
              <button
                className="mod-modal-close"
                onClick={() => setShowAddModal(false)}
              >
                ×
              </button>
            </div>

            <div className="mod-modal-body">
              <div
                style={{
                  background: "#232323",
                  border: "1px solid #3a3a3a",
                  borderRadius: 12,
                  padding: "10px 12px",
                  marginBottom: 12,
                  fontSize: "0.95rem",
                }}
              >
                <b>Project:</b> {activeProject?.UNIQUE_ID} —{" "}
                {activeProject?.TITLE}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(220px, 1fr))",
                  gap: "14px 18px",
                }}
              >
                {/* Short description */}
                <label className="mod-label">
                  <span>
                    Short description <span className="required" />
                  </span>
                  <input
                    type="text"
                    className={`mod-input ${
                      errors.shortDescription ? "error" : ""
                    }`}
                    placeholder="Short note..."
                    value={form.shortDescription}
                    onChange={(e) =>
                      setField("shortDescription", e.target.value)
                    }
                  />
                  {errors.shortDescription && (
                    <div className="error-message">
                      {errors.shortDescription}
                    </div>
                  )}
                </label>

                {/* Status */}
                <label className="mod-label">
                  <span>
                    Status <span className="required" />
                  </span>
                  <select
                    className={`mod-input ${errors.status ? "error" : ""}`}
                    value={form.status}
                    onChange={(e) => setField("status", e.target.value)}
                  >
                    <option value="">Select...</option>
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {errors.status && (
                    <div className="error-message">{errors.status}</div>
                  )}
                </label>

                {/* Detailed description */}
                <label
                  className="mod-label"
                  style={{ gridColumn: "1 / span 2" }}
                >
                  <span>
                    Detailed description <span className="required" />
                  </span>
                  <textarea
                    className={`mod-textarea ${
                      errors.detailedDescription ? "error" : ""
                    }`}
                    placeholder="Describe the change..."
                    value={form.detailedDescription}
                    onChange={(e) =>
                      setField("detailedDescription", e.target.value)
                    }
                    rows={4}
                  />
                  {errors.detailedDescription && (
                    <div className="error-message">
                      {errors.detailedDescription}
                    </div>
                  )}
                </label>

                   {/* Start date */}
                <label className="mod-label">
                  <span>
                    Start date<span className="required" />
                  </span>
                  <input
                    type="date"
                    className={`mod-input ${errors.startDate ? "error" : ""}`}
                    value={form.startDate || ""}             
                    onChange={(e) => setField("startDate", e.target.value || "")}
                  />
                  {errors.startDate && (
                    <div className="error-message">{errors.startDate}</div>
                  )}
                </label>


              {/* Due date */}
              <label className="mod-label">
                <span>
                  Due date<span className="required" />
                </span>
                <input
                  type="date"
                  className={`mod-input ${errors.dueDate ? "error" : ""} ${isDueLocked ? "locked" : ""}`}
                  value={form.dueDate}
                  onChange={(e) => setField("dueDate", e.target.value)}
                  disabled={isDueLocked}   
                />
                {errors.dueDate && (
                  <div className="error-message">{errors.dueDate}</div>
                )}
                {isDueLocked && (
                  <small className="muted">
                    Once set, Due date cannot be changed.
                  </small>
                )}
              </label>


                {/* Actual go live date - optional */}
                <label className="mod-label">
                  <span>Actual go live date </span>
                  <input
                    type="date"
                    className="mod-input"
                    value={form.actualGoLiveDate}
                    onChange={(e) =>
                      setField("actualGoLiveDate", e.target.value)
                    }
                  />
                </label>


                {/* Pending on - optional */}
                <label className="mod-label">
                  <span>Pending on </span>
                  <input
                    type="text"
                    className="mod-input"
                    value={form.pendingOn}
                    onChange={(e) => setField("pendingOn", e.target.value)}
                  />
                </label>

                {/* Modified by */}
                <label
                  className="mod-label"
                  style={{ gridColumn: "1 / span 2" }}
                >
                  <span>
                    Modified by <span className="required" />
                  </span>
                  <div className={errors.modifiedBy ? "error" : ""}>
                    <Select
                      isMulti
                      styles={customStyles}
                      options={devOptions}
                      placeholder="Select developer(s)…"
                      value={(form.modifiedBy || []).map((d) => ({
                        value: d,
                        label: d,
                      }))}
                      onChange={(opts) =>
                        setField(
                          "modifiedBy",
                          (opts || []).map((o) => o.value)
                        )
                      }

                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                    />
                  </div>
                  {errors.modifiedBy && (
                    <div className="error-message">
                      {errors.modifiedBy}
                    </div>
                  )}
                </label>
              </div>

              <p
                style={{
                  marginTop: 12,
                  fontSize: "0.8rem",
                  color: "#aaa",
                }}
              >
                <span className="required" /> Required fields.
              </p>
            </div>

            <div className="mod-modal-footer">
              <button
                className="mod-btn-secondary"
                onClick={() => setShowAddModal(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="mod-btn-primary"
                onClick={handleSaveModification}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}
      {showHistoryModal && (
        <div
          className="mod-modal-backdrop"
          onClick={() => setShowHistoryModal(false)}
        >
          <div className="mod-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mod-modal-header">
              <h4>
                Modifications for {historyProject?.UNIQUE_ID}
                {historyProject?.TITLE ? ` — ${historyProject.TITLE}` : ""}
              </h4>
              <button
                className="mod-modal-close"
                onClick={() => setShowHistoryModal(false)}
              >
                ×
              </button>
            </div>

            <div className="mod-modal-body">
              {historyLoading && <p className="muted">Loading…</p>}

              {!historyLoading && historyItems.length === 0 && (
                <p className="muted">No modifications found for this project.</p>
              )}

              {!historyLoading && historyItems.length > 0 && (
              <table className="mod-table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Creation date</th>
                    <th>Status</th>
                    <th>Short description</th>
                    <th>Modified by</th>
                  </tr>
                </thead>
                <tbody>
                  {historyItems.map((m) => (
                                       <tr
                      key={m.MODIFICATION_ID}
                      className="mod-row-clickable"
                      onClick={() => handleEditModification(m)}
                    >
                      <td>{shortDepartmentNames[m.DEPARTMENT] || m.DEPARTMENT}</td>
                      <td>
                        {m.CREATION_DATE
                          ? new Date(m.CREATION_DATE).toISOString().slice(0, 10)
                          : "—"}
                      </td>
                      <td>{m.STATUS}</td>
                      <td>{m.SHORT_DESCRIPTION || "—"}</td>
                      <td>{m.MODIFIED_BY || "—"}</td>
                    </tr>

                  ))}
                </tbody>
              </table>

              )}
            </div>

            <div className="mod-modal-footer">
              <button
                className="mod-btn-secondary"
                onClick={() => setShowHistoryModal(false)}
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

export default Modifications;
