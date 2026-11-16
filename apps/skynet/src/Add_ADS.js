import React, { useEffect, useState } from "react";
import axios from "axios";
import Select from "react-select";
import "./Add_ADS.css";
import { API_URL } from "./config";



const customStyles = {
  control: (base) => ({
    ...base,
    backgroundColor: '#2c2c2c',
    borderColor: '#888',
    color: 'white',
    fontSize: '0.85rem',
    maxWidth: '100%',
  }),

  menu: (base) => ({
    ...base,
    backgroundColor: '#2c2c2c',
    color: 'white',
    zIndex: 9999,
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused
      ? '#444'
      : state.isSelected
        ? '#555'
        : '#2c2c2c',
    color: 'white',
    cursor: 'pointer',
  }),

  singleValue: (base) => ({
    ...base,
    color: 'white',
  }),
  placeholder: (base) => ({
    ...base,
    color: '#aaa',
  }),
  dropdownIndicator: (base) => ({
    ...base,
    color: '#ccc',
    '&:hover': { color: 'white' },
  }),
  indicatorSeparator: () => ({
    display: 'none',
  }),

  multiValue: (base) => ({
    ...base,
    backgroundColor: '#444',
    borderRadius: '12px',
    padding: '2px 6px',
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: 'white',
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: 'white',
    ':hover': {
      backgroundColor: 'red',
      color: 'white',
    },
  }),

};

function Add_ADS() {
  const [form, setForm] = useState({
    id: "",
    title: "",
    planned_golivedate: "",
    actual_golivedate: "",
    status: "",
    saving_hour: "",
    frequency: "",
    run_date: "",
    developer: [],
    project_manager:"",
    owner: "",
    department: "",
    responsible_manager: "",
    tool: "",
    internal: 0,
    step_by_step: 0,
    website: 0,
    short_desc: "",
  });

  // Open from wishlist X 
  const EMPTY_FORM = {
    id: "",               
    title: "",
    planned_golivedate: "",
    actual_golivedate: "",
    status: "",
    saving_hour: "",
    frequency: "",
    run_date: "",
    developer: [],
    project_manager: "",
    owner: "",
    department: "",
    responsible_manager: "",
    tool: "",
    internal: 0,
    step_by_step: 0,
    website: 0,
    short_desc: "",
};


  const [errors, setErrors] = useState({});   // key: field name, value: error message
  const [loadingId, setLoadingId] = useState(false);  // shown in the UI while the ID is being fetched
  // --- Open from wishlist ---
  const [wishlistOptions, setWishlistOptions] = useState([]);
  const [loadedFromWish, setLoadedFromWish] = useState(null);

  // load options on mount
  useEffect(() => {
    axios
      .get( API_URL + "/api/wishlist/options")
      .then(({ data }) => setWishlistOptions(data))
      .catch(() => setWishlistOptions([]));
  }, []);

  async function loadFromWishlist(id) {
    if (!id) return;
    try {
      const { data } = await axios.get( API_URL + `/api/wishlist/${id}`);
      setForm((p) => ({ ...p, ...data }));     
      setErrors({});                           
      setLoadedFromWish(id);
    } catch (e) {
      alert("Could not load from wishlist.");
    }
  }


  // Developer dropdown
  const [developerOptions, setDeveloperOptions] = useState([]);
  useEffect(() => {
    axios
      .get(`/developers.txt?timestamp=${Date.now()}`)
      .then((response) => {
        const options = response.data
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b))
          .map((d) => ({ value: d, label: d }));
        setDeveloperOptions(options);
      })
      .catch(() => setDeveloperOptions([]));
  }, []);

  // Department dropdown
  const [departmentOptions, setDepartmentOptions] = useState([]);
  useEffect(() => {
    axios
      .get(`/departments.txt?timestamp=${Date.now()}`)
      .then((response) => {
        const options = response.data
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b))
          .map((d) => ({ value: d, label: d }));
        setDepartmentOptions(options);
      })
      .catch(() => setDepartmentOptions([]));
  }, []);

  // Status dropdown
  const [statusOptions, setStatusOptions] = useState([]);
  useEffect(() => {
    axios
      .get(`/status.txt?timestamp=${Date.now()}`)
      .then((response) => {
        const options = response.data
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b))
          .map((s) => ({ value: s, label: s }));
        setStatusOptions(options);
      })
      .catch(() => setStatusOptions([]));
  }, []);

  const handleProjectManagerChange = (opt) => {
  setForm((p) => ({ ...p, project_manager: opt?.value || "" }));
  setErrors((p) => ({ ...p, project_manager: undefined }));
};
  const projectManagerOptions = [
  { value: "Alex Morgan", label: "Alex Morgan" },
  { value: "Jamie Rivera", label: "Jamie Rivera" },
  { value: "Sam Patel", label: "Sam Patel" },
  { value: "Riley Chen", label: "Riley Chen" },
  { value: "Taylor Brooks", label: "Taylor Brooks" },
];

  // HANDLERS 
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? (checked ? 1 : 0) : value, }));
    setErrors((p) => ({ ...p, [name]: undefined })); 
  };

  const handleDepartmentChange = (opt) => {
    setForm((p) => ({ ...p, department: opt?.value || "" }));
    setErrors((p) => ({ ...p, department: undefined }));
  };
  const handleDeveloperChange = (opts) => {
    const values = opts ? opts.map((o) => o.value) : [];
    setForm((p) => ({ ...p, developer: values }));
    setErrors((p) => ({ ...p, developer: undefined }));
  };
  const handleStatusChange = (opt) => {
    setForm((p) => ({ ...p, status: opt?.value || "" }));
    setErrors((p) => ({ ...p, status: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();


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

    


    try {
      const { data } = await axios.post( API_URL + "/api/save-ads", form);

      if (loadedFromWish) {
        try {
          await axios.delete( API_URL + `/api/wishlist/${loadedFromWish}`);
        } catch { }
      }
      const savedId = data?.id != null ? String(data.id) : "";
      const seenId = form?.id != null ? String(form.id) : "";

      if (savedId && savedId !== seenId) {
        alert(
          `Saved, but note:\n` +
          `the suggested ID (${seenId}) became taken meanwhile.\n` +
          `Your project was saved under the next free ID: ${savedId}`
        );
      } else if (savedId) {
        alert(`Saved to database! ID: ${savedId}`);
      } else {
        alert("Saved to database!");
      }

      // reset the form + request a new suggested ID
      setForm({
        id: "",
        title: "",
        planned_golivedate: "",
        actual_golivedate: "",
        status: "",
        saving_hour: "",
        frequency: "",
        run_date: "",
        developer: [],
        owner: "",
        project_manager: "",
        department: "",
        responsible_manager: "",
        tool: "",
        internal: 0,
        step_by_step: 0,
        website: 0,
        short_desc: "",
      });
      await refreshSuggestedId();
      setErrors({});
    } catch (error) {
      console.error("Save error:", error);
      alert(
        "Save unsuccessful: " +
        (error.response?.data?.error || error.message || "Unknown error")
      );
    }

  };

  // clicking the X on "Open from wishlist" clears the filled-in fields
  const handleWishlistChange = async (opt) => {
  if (!opt) {
    setLoadedFromWish(null);   
    setErrors({});
    setForm(prev => ({ ...EMPTY_FORM, id: prev.id }));
    return;
  }

  await loadFromWishlist(opt.value);
};


  /** fetch the next free ID */
  async function refreshSuggestedId() {
    try {
      setLoadingId(true);   // "ID:..."
      const { data } = await axios.get(API_URL + "/api/suggest-id");
      const suggested = data?.suggestedId ?? "";
      setForm((p) => ({ ...p, id: suggested?.toString() || "" }));      // set the suggested ID
      setErrors((p) => ({ ...p, id: undefined }));            // clear the error message
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingId(false);
    }
  }

  /** request an ID automatically on load */
  useEffect(() => {
    refreshSuggestedId();
  }, []);


 return (
  <div className="form-container">
    <div className="form-with-flyout">
      {/* LEFT SIDE: FORM */}
      <form className="form" onSubmit={handleSubmit}>

        <div className="id-row">
          <div className="id-pill">
              ID: {loadingId ? "..." : form.id}
          </div>
        </div>
              
        {/* Title */}
        <label>
          <span className="label-text">
            Title<span className="required" />
          </span>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            className={errors.title ? "error" : ""}
            placeholder="Title"
          />
          {errors.title && (
            <div className="error-message">{errors.title}</div>
          )}
        </label>

        {/* Planned Go Live */}
        <label>
          <span className="label-text">
            Planned Go Live Date<span className="required" />
          </span>
          <input
            type="date"
            name="planned_golivedate"
            value={form.planned_golivedate}
            onChange={handleChange}
            className={errors.planned_golivedate ? "error" : ""}
          />
          {errors.planned_golivedate && (
            <div className="error-message">
              {errors.planned_golivedate}
            </div>
          )}
        </label>

        {/* Actual Go Live */}
        <label>
          <span className="label-text">Actual Go Live Date</span>
          <input
            type="date"
            name="actual_golivedate"
            value={form.actual_golivedate}
            onChange={handleChange}
          />
        </label>

        {/* Status */}
        <label>
          <span className="label-text">
            Status<span className="required" />
          </span>
          <Select
            styles={customStyles}
            value={
              form.status ? { value: form.status, label: form.status } : null
            }
            onChange={handleStatusChange}
            options={statusOptions}
            placeholder="Select..."
          />
          {errors.status && (
            <div className="error-message">{errors.status}</div>
          )}
        </label>

        {/* Saving Hour/Year */}
        <label>
          <span className="label-text">
            Saving Hour/Year<span className="required" />
          </span>
          <input
            name="saving_hour"
            value={form.saving_hour}
            onChange={handleChange}
            className={errors.saving_hour ? "error" : ""}
          />
          {errors.saving_hour && (
            <div className="error-message">{errors.saving_hour}</div>
          )}
        </label>

        {/* Frequency */}
        <label>
          <span className="label-text">
            Frequency<span className="required" />
          </span>
          <input
            name="frequency"
            value={form.frequency}
            onChange={handleChange}
            className={errors.frequency ? "error" : ""}
          />
          {errors.frequency && (
            <div className="error-message">{errors.frequency}</div>
          )}
        </label>

        {/* Run Date */}
        <label>
          <span className="label-text">
            Run Date<span className="required" />
          </span>
          <input
            name="run_date"
            value={form.run_date}
            onChange={handleChange}
            className={errors.run_date ? "error" : ""}
          />
          {errors.run_date && (
            <div className="error-message">{errors.run_date}</div>
          )}
        </label>

        {/* Developer */}
        <label>
          <span className="label-text">
            Developer<span className="required" />
          </span>
          <Select
            isMulti
            styles={customStyles}
            classNamePrefix="dev-select"
            value={form.developer.map((d) => ({ value: d, label: d }))}
            onChange={handleDeveloperChange}
            options={developerOptions}
            placeholder="Select..."
          />
          {errors.developer && (
            <div className="error-message">{errors.developer}</div>
          )}
        </label>

        {/* Owner */}
        <label>
          <span className="label-text">
            Owner<span className="required" />
          </span>
          <input
            name="owner"
            value={form.owner}
            onChange={handleChange}
            className={errors.owner ? "error" : ""}
          />
          {errors.owner && (
            <div className="error-message">{errors.owner}</div>
          )}
        </label>

        {/* Project Manager */}
        <label><span>
           Project Manager<span className="required" />
          </span>
          <Select
            styles={customStyles}
            value={
              form.project_manager
                ? { value: form.project_manager, label: form.project_manager }
                : null
            }
            onChange={handleProjectManagerChange}
            options={projectManagerOptions}
            placeholder="Select..."
          />
        </label>

        {/* Department */}
        <label>
          <span className="label-text">
            Department<span className="required" />
          </span>
          <Select
            styles={customStyles}
            value={
              form.department
                ? { value: form.department, label: form.department }
                : null
            }
            onChange={handleDepartmentChange}
            options={departmentOptions}
            placeholder="Select..."
          />
          {errors.department && (
            <div className="error-message">{errors.department}</div>
          )}
        </label>

        {/* Responsible Line Manager */}
        <label>
          <span className="label-text">Responsible Line Manager</span>
          <input
            name="responsible_manager"
            value={form.responsible_manager}
            onChange={handleChange}
          />
        </label>

        {/* Tool */}
        <label>
          <span className="label-text">Tool</span>
          <input
            name="tool"
            value={form.tool}
            onChange={handleChange}
          />
        </label>

        {/* Short Description */}
        <label>
          <span className="label-text">Short Description</span>
          <textarea
            name="short_desc"
            value={form.short_desc}
            onChange={handleChange}
            rows={2}
          />
        </label>

        {/* checkbox */}
        <div className="checkbox-group">
          <label className="checkbox">
            <input
              type="checkbox"
              name="internal"
              checked={!!form.internal}
              onChange={handleChange}
            />
            <span>Internal?</span>
          </label>

          <label className="checkbox">
            <input
              type="checkbox"
              name="step_by_step"
              checked={!!form.step_by_step}
              onChange={handleChange}
            />
            <span>Is there a Step-by-Step?</span>
          </label>

          <label className="checkbox">
            <input
              type="checkbox"
              name="website"
              checked={Number(form.website) === 1}
              onChange={handleChange}
            />
          <span>Is there a website?</span>
          </label>

        </div>
        {/* button */}
        <div className="form-bottom-row">
          <p className="required-note">* Required fields</p>
          <button type="submit" className="add-button">
            Add
          </button>
        </div>
        </form>


      {/* RIGHT SIDE: OPEN FROM WISHLIST */}
      <aside className="wishlist-flyout">
        <span className="flyout-label">Open from wishlist</span>
        <Select
          styles={customStyles}
          options={wishlistOptions}
          isClearable
          placeholder="Select…"
          onChange={handleWishlistChange}
        />
      </aside>
    </div>
  </div>
);

}


export default Add_ADS;
