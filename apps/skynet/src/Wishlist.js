import "./Wishlist.css";
import { useState, useEffect } from "react";
import Select from "react-select";
import axios from "axios";
import { API_URL } from "./config";


const customStyles = {
  control: (base) => ({
    ...base,
    backgroundColor: "#2c2c2c",
    borderColor: "#888",
    color: "white",
    fontSize: "0.85rem",
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: "#2c2c2c",
    color: "white",
    zIndex: 9999,
  }),
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

function Wishlist() {
  const [form, setForm] = useState({
    title: "",
    date: "",
    saving_hour: "",
    frequency: "",
    owner: "",
    runDate: "",
    department: "",
    manager: "",
    shortDesc: "",
    username: "",
  });



  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);



  useEffect(() => {
    axios
      .get("/departments.txt")
      .then((response) => {
        const lines = response.data
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));
        const options = lines.map((department) => ({ value: department, label: department }));
        setDepartmentOptions(options);
      })
      .catch((err) => console.error("Error loading departments:", err));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleDepartmentChange = (selectedOption) => {
    setForm((p) => ({ ...p, department: selectedOption?.value || "" }));
  };

  // helper: empty -> null
  const nz = (v) => (v === "" || v === undefined || v === null ? null : v);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const payload = {
        TITLE: form.title,
        REQUEST_DATE: form.date,                           
        MANUAL_PROCESS_ESTIMATED_TIME: form.saving_hour,
        FREQUENCY_PER_YEAR: form.frequency,
        PROCESS_OWNER: form.owner,
        RUN_DATE: form.runDate,                            
        DEPARTMENT: form.department,
        RESPONSIBLE_LINE_MANAGER: form.manager,
        SHORT_DESCRIPTION: form.shortDesc,
        TEAM: null,                                        
        USERNAME: nz(form.username),
      };

      await axios.post(API_URL + "/api/wishlist", payload);
      setSaved(true);
      setForm({
        title: "",
        date: "",
        saving_hour: "",
        frequency: "",
        owner: "",
        runDate: "",
        department: "",
        manager: "",
        shortDesc: "",
        username: "",
      });
    } catch (err) {
      const msg = err?.response?.data?.error || String(err);
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="wishlist-container">
      <form className="wishlist-form" onSubmit={onSubmit}>

        <label>
          <span className="label-text">Title</span>
          <input name="title" value={form.title} onChange={handleChange} />
        </label>

        <label>
          <span className="label-text">Date</span>
          <input type="date" name="date" value={form.date} onChange={handleChange} />
        </label>

        <label>
          <span className="label-text">Saving Hour</span>
          <input type="number" name="saving_hour" value={form.saving_hour} onChange={handleChange} />
        </label>

        <label>
          <span className="label-text">Frequency</span>
          <input type="number" name="frequency" value={form.frequency} onChange={handleChange} />
        </label>

        <label>
          <span className="label-text">Owner</span>
          <input name="owner" value={form.owner} onChange={handleChange} />
        </label>

        <label>
          <span className="label-text">Run Date</span>
          <input type="date" name="runDate" value={form.runDate} onChange={handleChange} />
        </label>

        <label>
          <span className="label-text">Department</span>
          <Select
            options={departmentOptions}
            value={departmentOptions.find((opt) => opt.value === form.department) || null}
            onChange={handleDepartmentChange}
            styles={customStyles}
          />
        </label>

        <label>
          <span className="label-text">Responsible Line Manager</span>
          <input name="manager" value={form.manager} onChange={handleChange} />
        </label>

        <label>
          <span className="label-text">Short Description</span>
          <textarea name="shortDesc" value={form.shortDesc} onChange={handleChange} />
        </label>

        <label>
          <span className="label-text">Username</span>
          <input name="username" value={form.username} onChange={handleChange} placeholder="(optional)" />
        </label>

        {error && <div className="err" style={{ color: "salmon" }}>{error}</div>}
        {saved && <div className="ok" style={{ color: "lightgreen" }}>Saved to wishlist</div>}

        <div className="form-footer">
          <button type="submit" className="add-button" disabled={saving}>
            {saving ? "Saving..." : "Add"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Wishlist;
