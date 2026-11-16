import { useEffect, useState } from "react";
import Select from "react-select";
import axios from "axios";
import "./Track_project.css";
import { API_URL } from "./config";

const customStyles = {
  control: (base) => ({
    ...base,
    backgroundColor: "#2c2c2c",
    borderColor: "#888",
    color: "white",
    fontSize: "0.85rem",
    maxWidth: "100%",
    overflow: "hidden",
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: "#2c2c2c",
    color: "white",
    zIndex: 9999,
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused
      ? "#444"
      : state.isSelected
        ? "#555"
        : "#2c2c2c",
    color: "white",
    cursor: "pointer",
  }),
  singleValue: (base) => ({ ...base, color: "white" }),
  placeholder: (base) => ({ ...base, color: "#aaa" }),
  dropdownIndicator: (base) => ({
    ...base,
    color: "#ccc",
    "&:hover": { color: "white" },
  }),
  indicatorSeparator: () => ({ display: "none" }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: "#444",
    borderRadius: "12px",
    padding: "2px 6px",
  }),
  multiValueLabel: (base) => ({ ...base, color: "white" }),
  multiValueRemove: (base) => ({
    ...base,
    color: "white",
    ":hover": { backgroundColor: "red", color: "white" },
  }),
};

function normalizeStatus(status) {
  if (status == null) return "";

  return String(status)
    .trim()
    .replace(/\s*-\s*/g, " - ") // normalise spaces around hyphens
    .replace(/\s+/g, " "); // collapse double spaces
}


/** Translates the raw BigQuery row into a frontend-friendly shape */
function normalizeRow(r) {
  const S = (v) => (v == null ? "" : String(v)); // null/undefined -> empty string, otherwise convert to string
  const devs = S(r.DEVELOPER || r.DEVELOPERS)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    id: r.UNIQUE_ID ?? r.ID ?? "",
    title: r.TITLE ?? "",
    website: r.WEBSITE ?? null,
    planned_golivedate:
      r.PLANNED_GO_LIVE_DATE ??
      r.PLANNED_GOLIVE_DATE ??
      r.PLANNED_GO_LIVE ??
      "",
    actual_golivedate:
      r.ACTUAL_GO_LIVE_DATE ?? r.ACTUAL_GOLIVE_DATE ?? r.ACTUAL_GO_LIVE ?? "",
    status: normalizeStatus(r.STATUS),
    saving_hour: r.SAVING_HOUR ?? r.SAVING_HOURS ?? "",
    frequency: r.FREQUENCY ?? r.FREQUENCY_PER_YEAR ?? "",
    run_date: r.RUN_DATE ?? r.RUN_ON_DATE ?? "",
    developer: devs,
    project_manager: r.PROJECT_MANAGER ?? r.PROJECTMANAGER ?? "",
    owner: r.OWNER ?? r.OWNER_EMPLOYEE ?? r.OWNER_SM ?? "",
    department: r.DEPARTMENT ?? r.DEPT ?? "",
    responsible_manager:
      r.RESP_MANAGER ?? r.RESPONSIBLE_MANAGER ?? r.RESP_MANAGER_EMPLOYEE ?? "",
    tool: r.TOOL ?? "",
    internal: Number(r.INTERNAL ?? 0),
    step_by_step: Number(r.STEP_BY_STEP ?? 0),
    short_desc: r.SHORT_DESCRIPTION ?? r.SHORT_DESC ?? r.ADDITIONAL_NOTE ?? "",
  };
}

function Track_Project() {
  /** search state (left side) */
  const [searchId, setSearchId] = useState("");
  const [searchDev, setSearchDev] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);

  /** right side: list and/or editable record */
  const [devResults, setDevResults] = useState([]);
  const [edit, setEdit] = useState(null);

  const [loadingId, setLoadingId] = useState(false);
  const [loadingDev, setLoadingDev] = useState(false);
  const [err, setErr] = useState("");

  // separate message for each search:
  const [idMsg, setIdMsg] = useState("");
  const [devMsg, setDevMsg] = useState("");

  // Track project - modifications section
  const [tpMods, setTpMods] = useState([]);
  const [tpModDetails, setTpModDetails] = useState(null);

  /** dropdown options */
  const [developerOptions, setDeveloperOptions] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);

  const [showDateInfo, setShowDateInfo] = useState(false);

  const projectManagerOptions = [
    { value: "Alex Morgan", label: "Alex Morgan" },
    { value: "Jamie Rivera", label: "Jamie Rivera" },
    { value: "Sam Patel", label: "Sam Patel" },
    { value: "Riley Chen", label: "Riley Chen" },
    { value: "Taylor Brooks", label: "Taylor Brooks" },
  ];


// DRAG AND DROP

  const [attachments, setAttachments] = useState([]);
  const [sopFiles, setSopFiles] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [showDragDrop, setShowDragDrop] = useState(false);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);

    setAttachments((prev) => [...prev, ...selectedFiles]);

    e.target.value = "";
  };

  const removeFile = (indexToRemove) => {
    setAttachments((prev) =>
      prev.filter((_, index) => index !== indexToRemove)
    );
  };

  const handleDrop = (e) => {
    e.preventDefault();

    const droppedFiles = Array.from(e.dataTransfer.files);

    setAttachments((prev) => [...prev, ...droppedFiles]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const loadSopFiles = async (projectId) => {
    if (projectId == null) {
      setSopFiles([]);
      return;
    }

    try {
      const res = await axios.get(
        API_URL + `/api/sop/files/${projectId}`,
      );
      setSopFiles(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("loadSopFiles error:", err);
      setSopFiles([]);
    }
  };

  const handleUploadFiles = async () => {
    if (!edit || attachments.length === 0) return;

    const formData = new FormData();
    attachments.forEach((file) => formData.append("files", file));

    setUploadingFiles(true);
    try {
      await axios.post(
        API_URL + `/api/sop/upload/${edit.id}`,
        formData,
      );
      setAttachments([]);
      await loadSopFiles(edit.id);
      setShowDragDrop(false);
    } catch (e) {
      console.error(e);
      alert("File upload failed: " + (e.response?.data?.details || e.message));
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleDeleteSopFile = async (filename) => {
    if (!edit) return;

    try {
      await axios.delete(
        API_URL + `/api/sop/files/${edit.id}/${encodeURIComponent(filename)}`,
      );
      await loadSopFiles(edit.id);
    } catch (e) {
      console.error(e);
      alert("File delete failed: " + (e.response?.data?.details || e.message));
    }
  };


  // remember which statuses are ticked
  const [selectedStatuses, setSelectedStatuses] = useState([]);

  const [sortid, setSortid] = useState("desc");

  
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



  const availableDepartments = [
    ...new Set(
      devResults.map((r) => r.department).filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b));

    const availableDepartmentOptions = availableDepartments.map((department) => ({
      value: department,
      label: department,
    }));

  // collect the distinct statuses from the rows shown after a developer search, sorted
  const availableStatuses = [
    ...new Set(
      devResults.map((r) => normalizeStatus(r.status)).filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b));


  const filteredResults = devResults.filter((r) => {
    const statusOk =
      selectedStatuses.length === 0 ||
      selectedStatuses.includes(normalizeStatus(r.status));

    const departmentOk =
      selectedDepartments.length === 0 ||
      selectedDepartments.includes(r.department);

    return statusOk && departmentOk;
  });

  const sorted =
    sortid === "desc"
      ? [...filteredResults].sort((a, b) => Number(b.id) - Number(a.id))
      : [...filteredResults].sort((a, b) => Number(a.id) - Number(b.id));

    /** load options */
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

          setDeveloperOptions(options);
        })
        .catch(() => setDeveloperOptions([]));
    }, []);

    useEffect(() => {
      axios
        .get(`/departments.txt?ts=${Date.now()}`)
        .then((res) => {
          const lines = res.data
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b));
          setDepartmentOptions(lines.map((d) => ({ value: d, label: d })));
        })
        .catch(() => setDepartmentOptions([]));
    }, []);

    useEffect(() => {
      axios
        .get(`/status.txt?ts=${Date.now()}`)
        .then((res) => {
          const lines = res.data
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b));
          setStatusOptions(lines.map((s) => ({ value: s, label: s })));
        })
        .catch(() => setStatusOptions([]));
    }, []);

    /** find-by-ID search */
  const handleFindById = async () => {
    const q = (searchId || "").trim();

    if (!q) {
      setIdMsg("");
      setEdit(null);
      setDevResults([]);
      setTpMods([]);
      return;
    }

    setLoadingId(true);
    setIdMsg("");

    try {
      const { data } = await axios.get(API_URL + "/api/track/by-id", {
        params: { id: q },
      });

      const normalized = normalizeRow ? normalizeRow(data) : data;

      setEdit(normalized);
      setDevResults([]);
      loadModifications(normalized.id);
      loadSopFiles(normalized.id);
      setAttachments([]);
      setShowDragDrop(false);
      setIdMsg("");
    } catch (e) {
      console.error(e);
      if (e.response?.status === 404) {
        setIdMsg("no");
      } else {
        setIdMsg("err");
      }
      setEdit(null);
      setDevResults([]);
      setTpMods([]);
    } finally {
      setLoadingId(false);
    }
  };

  /** Find by dev */
  const handleDevSelectChange = async (opts) => {
    const next = opts || [];
    const values = next.map((o) => o.value).filter(Boolean);

    if (values.length === 0) {
      setSearchDev([]);
      setDevMsg("");
      setDevResults([]);
      setEdit(null);
      setSelectedStatuses([]);
      return;
    }

    const hasOthers = values.includes("OTHER");

    let SelectedOptions;
    let BackendFilter;

    if (hasOthers && values.length === 1) {
      SelectedOptions = [{ value: "OTHER_", label: "Other" }];
      BackendFilter = ["OTHER_"];
    } else {
      SelectedOptions = next.filter((o) => o.value !== "OTHER");
      BackendFilter = SelectedOptions.map((o) => o.value);

      if (BackendFilter.length === 0) {
        setSearchDev([]);
        setDevMsg("");
        setDevResults([]);
        setEdit(null);
        return;
      }
    }

    setSearchDev(SelectedOptions);
    setLoadingDev(true);
    setDevMsg("");
    setEdit(null);
    setSelectedStatuses([]);

    try {
      const { data } = await axios.post(API_URL + "/api/track/by-devs", {
        developers: BackendFilter,
      });
      const list = (Array.isArray(data) ? data : []).map((r) =>
        normalizeRow(r),
      );

      if (list.length === 0) {
        setDevMsg("no");
        setDevResults([]);
      } else {
        setDevMsg("");
        setDevResults(
          list.map((x) => ({
            id: x.id,
            title: x.title,
            website: x.website,
            status: x.status,
            department: x.department,
            developerText: (x.developer || []).join(", "),
            _full: x,
          })),
        );
      }
    } catch (e) {
      console.error(e);
      setDevMsg("err");
      setDevResults([]);
    } finally {
      setLoadingDev(false);
    }
  };


  /** Save */
  const handleSave = async () => {
    if (!edit) return;

    const required = [
      "title",
      "planned_golivedate",
      "status",
      "saving_hour",
      "frequency",
      "run_date",
      "developer",
      "owner",
      "department",
      "project_manager",
    ];
    const missing = required.filter((k) => {
      const v = edit[k];
      const emptyArray = Array.isArray(v) && v.length === 0;
      return v === undefined || v === null || v === "" || emptyArray;
    });
    if (missing.length) {
      alert("Please fill out all required fields: " + missing.join(", "));
      return;
    }


    try {
      await axios.put(API_URL + `/api/projects/${edit.id}`, {
        ...edit,
        developer: edit.developer || [],
      });

      alert("Saved!");
    } catch (e) {
      console.error(e);
      alert("Save failed: " + (e.response?.data?.details || e.message));
    }
  };
  const handleBack = () => {
    setEdit(null);
    setAttachments([]);
    setSopFiles([]);
    setShowDragDrop(false);
  };


  /** form change handlers */
  const changeField = (name) => (e) => {
    const { value, type, checked } = e.target;
    setEdit((p) => ({
      ...p,
      [name]: type === "checkbox" ? (checked ? 1 : 0) : value,
    }));
  };
  const changeSelect = (name) => (opt) =>
    setEdit((p) => ({ ...p, [name]: opt?.value || "" }));
  const changeMultiDevs = (opts) => {
    const values = opts ? opts.map((o) => o.value) : [];
    setEdit((p) => ({ ...p, developer: values }));
  };

  // checkbox handling
  const toggleStatus = (status) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status],
    );
  };

  const toggleDepartment = (department) => {
  setSelectedDepartments((prev) =>
    prev.includes(department)
      ? prev.filter((d) => d !== department)
      : [...prev, department]
  );
};

  // --- Track_project.js ---
  const loadModifications = async (projectId) => {
    if (projectId == null) {
      setTpMods([]);
      return;
    }

    try {
      const res = await axios.get(
        API_URL + `/api/modifications/by-project/${projectId}`,
      );

      let mods = Array.isArray(res.data) ? res.data : [];

      const getStatusCode = (status) => {
        const m = String(status || "").match(/^(\d+)/);
        return m ? parseInt(m[1], 10) : 999;
      };

      mods = [...mods].sort(
        (a, b) => getStatusCode(a.STATUS) - getStatusCode(b.STATUS),
      );

      setTpMods(mods);
    } catch (err) {
      console.error("loadModifications error:", err);
      setTpMods([]);
    }
  };

  return (
    <div className="track-container">
      {/* LEFT SIDE - searches */}
      <div>
        {/* Find by ID */}
        <form
          className="tp-search-card"
          onSubmit={(e) => {
            e.preventDefault();
            handleFindById();
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
                  onClick={() => {
                    setSearchId("");
                    setIdMsg("");
                    setEdit(null);
                    setDevResults([]);
                    setTpMods([]);
                  }}
                >
                  ×
                </button>
              )}
            </div>
          </label>

          <div className="tp-inline-controls">
            <button type="submit" className="tp-btn">
              Find
            </button>
            {loadingId && <span className="muted">Loading…</span>}
            {idMsg === "no" && <span className="muted">No result</span>}
            {idMsg === "err" && <span className="error">Server error</span>}
          </div>
        </form>

      {/* FILTER BY DEPARTMENT */}
      {!edit && devResults.length > 0 && (
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

        {/* Find by Developer */}
        <form
          className="tp-search-card"
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <label>
            <span>Find by Developer(s)</span>
            <Select
              styles={customStyles}
              value={searchDev}
              isMulti
              onChange={handleDevSelectChange}
              options={developerOptions}
              placeholder="Select one or more developers…"
              isClearable
            />
          </label>

          <div className="tp-inline-controls">
            {loadingDev && <span className="muted">Loading…</span>}
            {devMsg === "no" && <span className="muted">No result</span>}
            {devMsg === "err" && <span className="error">Server error</span>}
          </div>
        </form>

        

        {/* FILTER BY STATUS */}

        {!edit && devResults.length > 0 && (
          <div className="tp-search-card">
            <label>
              <span>Filter by Status</span>
            </label>

            <div className="tp-status-filter-box">
              {availableStatuses.map((status) => (
                <label key={status} className="tp-status-option">
                  <input
                    type="checkbox"
                    checked={selectedStatuses.includes(status)}
                    onChange={() => toggleStatus(status)}
                  />
                  <span>{status}</span>
                </label>
              ))}

              {selectedStatuses.length > 0 && (
                <button
                  type="button"
                  className="tp-btn tp-status-clear"
                  onClick={() => setSelectedStatuses([])}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* shared error on the left */}
        {err && <div className="error">{err}</div>}
      </div>

      {/* RIGHT SIDE - developer results list (when not editing) */}
      {!edit && devResults.length > 0 && (
        <div className="tp-list-card">
          <div className="tp-list-title">
            <span>
            Results for developer(s):{" "}
            <strong>
              {Array.isArray(searchDev)
                ? searchDev.map((o) => o?.label).filter(Boolean).join(", ")
                : searchDev?.label || "—"}
            </strong>
            </span>

            <span className="tp-count">{sorted.length}</span>
          </div>

          <table className="tp-table">
            <thead>
             <tr>
              <th
                style={{ width: 100, cursor: "pointer" }}
                onClick={() =>
                  setSortid((prev) => (prev === "asc" ? "desc" : "asc"))
                }
              >
                ID {sortid === "asc" ? "▲" : "▼"}
              </th>
              <th>Title</th>
              <th>Department</th>
              <th>Status</th>
              <th>Website</th>
            </tr>
            </thead>

            <tbody>
              {sorted.map((r) => (
                <tr
                  key={r.id}
                  className="tp-row"
                  onClick={() => {
                    const projectId = r._full.id || r._full.UNIQUE_ID || r.id;
                    setEdit(r._full);
                    loadModifications(projectId);
                    loadSopFiles(projectId);
                    setAttachments([]);
                    setShowDragDrop(false);
                  }}
                  title="Open details"
                >
                  <td>{r.id}</td>
                  <td>{r.title}</td>
                  <td>{shortDepartmentNames[r.department] || r.department || "—"}</td>
                  <td>{r.status}</td>
                  <td>
                    {r.website === null || r.website === undefined
                      ? "—"
                      : Number(r.website) === 1
                        ? "Yes"
                        : "No"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/*  ==== MAIN AREA  ==== */}
      {edit && (
        <div className="tp-mod-area">
          {/* LEFT - project form */}
          <div className="tp-form-container">
            <form
              className="tp-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}
            >
              <div className="tp-id-row">
                <span className="tp-id-label">ID:</span>
                <span className="tp-id-pill">{edit.id}</span>
              </div>

              {/* Title */}
              <label>
                <span className="tp-label-text">Title *</span>
                <input
                  name="title"
                  value={edit.title || ""}
                  onChange={changeField("title")}
                />
              </label>

              {/* Planned Go Live Date */}
              <label>
                <span className="tp-label-text">Planned Go Live Date *</span>
                <input
                  type="date"
                  name="planned_golivedate"
                  value={edit.planned_golivedate || ""}
                  onChange={changeField("planned_golivedate")}
                />
              </label>

              {/* Actual Go Live Date */}
              <label>
                <span className="tp-label-text">Actual Go Live Date</span>
                <input
                  type="date"
                  name="actual_golivedate"
                  value={edit.actual_golivedate || ""}
                  onChange={changeField("actual_golivedate")}
                />
              </label>

              {/* Status */}
              <label>
                <span className="tp-label-text">Status *</span>
                <Select
                  styles={customStyles}
                  value={
                    edit.status
                      ? { value: edit.status, label: edit.status }
                      : null
                  }
                  onChange={changeSelect("status")}
                  options={statusOptions}
                  placeholder="Select..."
                />
              </label>

              {/* Saving Hour/Year */}
              <label>
                <span className="tp-label-text">Saving Hour/Year *</span>
                <input
                  name="saving_hour"
                  value={edit.saving_hour || ""}
                  onChange={changeField("saving_hour")}
                />
              </label>

              {/* Frequency */}
              <label>
                <span className="tp-label-text">Frequency *</span>
                <input
                  name="frequency"
                  value={edit.frequency || ""}
                  onChange={changeField("frequency")}
                />
              </label>

              {/* Run Date */}
              <label>
                <span className="tp-label-text">Run Date *</span>
                <input
                  name="run_date"
                  value={edit.run_date || ""}
                  onChange={changeField("run_date")}
                />
              </label>

              {/* Developer */}
              <label>
                <span className="tp-label-text">Developer *</span>
                <Select
                  isMulti
                  styles={customStyles}
                  value={(edit.developer || []).map((d) => ({
                    value: d,
                    label: d,
                  }))}
                  onChange={changeMultiDevs}
                  options={developerOptions}
                  placeholder="Select..."
                />
              </label>

              {/* Owner */}
              <label>
                <span className="tp-label-text">Owner *</span>
                <input
                  name="owner"
                  value={edit.owner || ""}
                  onChange={changeField("owner")}
                />
              </label>

              {/* Project Manager */}
              <label>
                <span className="tp-label-text">Project Manager</span>
                <Select
                  styles={customStyles}
                  value={
                    edit.project_manager
                      ? {
                          value: edit.project_manager,
                          label: edit.project_manager,
                        }
                      : null
                  }
                  onChange={changeSelect("project_manager")}
                  options={projectManagerOptions}
                  placeholder="Select..."
                />
              </label>

              {/* Department */}
              <label>
                <span className="tp-label-text">Department *</span>
                <Select
                  styles={customStyles}
                  value={
                    edit.department
                      ? { value: edit.department, label: edit.department }
                      : null
                  }
                  onChange={changeSelect("department")}
                  options={departmentOptions}
                  placeholder="Select..."
                />
              </label>

              {/* Responsible Line Manager */}
              <label>
                <span className="tp-label-text">Responsible Line Manager</span>
                <input
                  name="responsible_manager"
                  value={edit.responsible_manager || ""}
                  onChange={changeField("responsible_manager")}
                />
              </label>

              {/* Tool */}
              <label>
                <span className="tp-label-text">Tool</span>
                <input
                  name="tool"
                  value={edit.tool || ""}
                  onChange={changeField("tool")}
                />
              </label>

              {/* Short Description */}
              <label>
                <span className="tp-label-text">Short Description</span>
                <textarea
                  name="short_desc"
                  value={edit.short_desc || ""}
                  onChange={changeField("short_desc")}
                  rows={2}
                />
              </label>

              {/* Checkboxes */}
              <div className="tp-checkbox-group">
                <label className="tp-checkbox">
                  <input
                    type="checkbox"
                    checked={!!edit.internal}
                    onChange={changeField("internal")}
                  />
                  <span>Internal?</span>
                </label>

                <label className="tp-checkbox">
                  <input
                    type="checkbox"
                    checked={!!edit.step_by_step}
                    onChange={changeField("step_by_step")}
                  />
                  <span>Is there a Step-by-Step?</span>
                </label>

                <label className="tp-checkbox">
                  <input
                    type="checkbox"
                    checked={Number(edit.website) === 1}
                    onChange={changeField("website")}
                  />
                  <span>Is there a website?</span>
                </label>

              </div>

              {/* Footer Buttons */}
              <div className="tp-form-footer">
                <button
                  type="button"
                  className="tp-btn back"
                  onClick={handleBack}
                >
                  Back
                </button>
                <button type="submit" className="tp-btn save">
                  Save
                </button>
              </div>
            </form>
          </div>

          <div className="tp-right-side">
              {/* FIle uploads */}


          <div className="file-uploads-container">
            <div className="file-uploads-card">

              {sopFiles.length > 0 && (
                <div className="tp-list-title">
                  <span>Uploaded files</span>
                  <button
                    type="button"
                    className="tp-btn tp-upload-more-toggle"
                    onClick={() => setShowDragDrop((prev) => !prev)}
                  >
                    {showDragDrop ? "Check uploaded files" : "Upload additional files"}
                  </button>
                </div>
              )}

              {sopFiles.length > 0 && !showDragDrop ? (
                <div className="uploaded-files-list">
                  {sopFiles.map((filename) => (
                    <div className="uploaded-file-item" key={filename}>
                      <a
                        href={`${API_URL}/api/sop/download/${edit.id}/${encodeURIComponent(filename)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {filename}
                      </a>

                      <button
                        type="button"
                        className="remove-file-button"
                        onClick={() => handleDeleteSopFile(filename)}
                        title="Delete"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div
                    className="drag-drop-area"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                  >
                    <label className="drag-drop-label">

                      <input
                        type="file"
                        multiple
                        hidden
                        onChange={handleFileChange}
                      />

                      <strong>Drag & Drop files here  or click to browse</strong>

                    </label>
                  </div>

                  {attachments.length > 0 && (
                    <div className="uploaded-files-list">
                      {attachments.map((file, index) => (
                        <div
                          className="uploaded-file-item"
                          key={`${file.name}-${index}`}
                        >
                          <span>{file.name}</span>

                          <button
                            type="button"
                            className="remove-file-button"
                            onClick={() => removeFile(index)}
                          >
                            ×
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        className="tp-btn"
                        onClick={handleUploadFiles}
                        disabled={uploadingFiles}
                      >
                        {uploadingFiles ? "Uploading…" : "Upload"}
                      </button>
                    </div>
                  )}
                </>
              )}

            </div>
          </div>



              {/*  modifications LIST (table) */}
              <div className="tp-mod-list">
                <div className="tp-list-card tp-mod-list-card">
                  <div className="tp-list-title">
                    <span>
                      Modifications for project <strong>{edit.id}</strong>
                    </span>
                    <span className="tp-count">{tpMods.length}</span>
                  </div>

                  {tpMods.length === 0 ? (
                    <p className="muted">No modifications for this project.</p>
                  ) : (
                    <table className="tp-table tp-mod-table">
                      <thead>
                        <tr>
                          <th>
                            <div
                              className="tp-date-header"
                              onMouseEnter={() => setShowDateInfo(true)}
                              onMouseLeave={() => setShowDateInfo(false)}
                            >
                              Date
                              <span className="tp-info-icon">i</span>
                              {showDateInfo && (
                                <div className="tp-date-tooltip">
                                  If the status is finished this counts as the
                                  "Actual go live date", if it's not finished this
                                  counts as the "Due Date".
                                </div>
                              )}
                            </div>
                          </th>
                          <th>Status</th>
                          <th>Short description</th>
                          <th>Modified by</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tpMods.map((m) => {
                          const statusText = (m.STATUS || "").toLowerCase();
                          const isFinished = statusText.includes("finished");

                          const dateValue = isFinished
                            ? m.ACTUAL_GO_LIVE_DATE
                              ? String(m.ACTUAL_GO_LIVE_DATE).slice(0, 10)
                              : "—"
                            : m.DUE_DATE
                              ? String(m.DUE_DATE).slice(0, 10)
                              : "—";

                          return (
                            <tr
                              key={m.MODIFICATION_ID}
                              className="tp-row"
                              onClick={() => setTpModDetails(m)}
                              title="Show all details"
                            >
                              <td>{dateValue}</td>
                              <td style={{ textAlign: "center" }}>{m.STATUS}</td>
                              <td title={m.SHORT_DESCRIPTION || ""}>
                                {m.SHORT_DESCRIPTION || "—"}
                              </td>
                              <td>{m.MODIFIED_BY || "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
          )}

      {/* All details */}
      {tpModDetails && (
        <div className="tp_mod-details-overlay">
          <div className="tp_mod-details-modal">
            <div className="tp_mod-details-header">
              <div className="tp_mod-details-title">
                Modification #{tpModDetails.MODIFICATION_ID} —{" "}
                {tpModDetails.TITLE}
              </div>
              <button
                type="button"
                className="tp_mod-details-close"
                onClick={() => setTpModDetails(null)}
              >
                ×
              </button>
            </div>

            <div className="tp_mod-details-body">
              <div className="tp_mod-details-field">
                <span className="tp_mod-details-label">Project:</span>
                <span className="tp_mod-details-value">
                  {tpModDetails.ID} — {tpModDetails.TITLE}
                </span>
              </div>

              <div className="tp_mod-details-field">
                <span className="tp_mod-details-label">Creation date:</span>
                <span className="tp_mod-details-value">
                  {tpModDetails.CREATION_DATE
                    ? new Date(tpModDetails.CREATION_DATE)
                        .toISOString()
                        .slice(0, 10)
                    : "—"}
                </span>
              </div>

              <div className="tp_mod-details-field">
                <span className="tp_mod-details-label">Status:</span>
                <span className="tp_mod-details-value">
                  {tpModDetails.STATUS || "—"}
                </span>
              </div>

              <div className="tp_mod-details-field">
                <span className="tp_mod-details-label">Short description:</span>
                <span className="tp_mod-details-value">
                  {tpModDetails.SHORT_DESCRIPTION || "—"}
                </span>
              </div>

              <div className="tp_mod-details-field">
                <span className="tp_mod-details-label">
                  Detailed description:
                </span>
                <div className="tp_mod-details-multiline">
                  {tpModDetails.DETAILED_DESCRIPTION || "—"}
                </div>
              </div>

              <div className="tp_mod-details-field">
                <span className="tp_mod-details-label">Start date:</span>
                <span className="tp_mod-details-value">
                  {tpModDetails.START_DATE
                    ? String(tpModDetails.START_DATE).slice(0, 10)
                    : "—"}
                </span>
              </div>

              <div className="tp_mod-details-field">
                <span className="tp_mod-details-label">Due date:</span>
                <span className="tp_mod-details-value">
                  {tpModDetails.DUE_DATE
                    ? String(tpModDetails.DUE_DATE).slice(0, 10)
                    : "—"}
                </span>
              </div>

              <div className="tp_mod-details-field">
                <span className="tp_mod-details-label">
                  Actual go live date:
                </span>
                <span className="tp_mod-details-value">
                  {tpModDetails.ACTUAL_GO_LIVE_DATE
                    ? String(tpModDetails.ACTUAL_GO_LIVE_DATE).slice(0, 10)
                    : "—"}
                </span>
              </div>

              <div className="tp_mod-details-field">
                <span className="tp_mod-details-label">Pending on:</span>
                <span className="tp_mod-details-value">
                  {tpModDetails.PENDING_ON || "—"}
                </span>
              </div>

              <div className="tp_mod-details-field">
                <span className="tp_mod-details-label">Project Manager:</span>
                <span className="tp_mod-details-value">
                  {tpModDetails.PROJECT_MANAGER || "—"}
                </span>
              </div>

              <div className="tp_mod-details-field">
                <span className="tp_mod-details-label">Modified by:</span>
                <span className="tp_mod-details-value">
                  {tpModDetails.MODIFIED_BY || "—"}
                </span>
              </div>
            </div>

            <div className="tp_mod-details-footer">
              <button
                type="button"
                className="tp-btn"
                onClick={() => setTpModDetails(null)}
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

export default Track_Project;
