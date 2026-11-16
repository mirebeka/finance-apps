import React, { useState, useRef, useEffect } from "react";
import "./SPO_MultiSelect.css";

function SPO_MultiSelect({ label, options, selected, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  const filteredOptions = options.filter((option) =>
    String(option).toLowerCase().includes(search.toLowerCase())
  );

  const handleOptionChange = (option) => {
    if (selected.includes(option)) {
      onChange(selected.filter((item) => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const handleSelectAll = () => {
    if (selected.length === options.length) {
      onChange([]);
    } else {
      onChange([...options]);
    }
  };

  const handleClear = () => {
    onChange([]);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getDisplayValue = () => {
    if (selected.length === 0) {
      return "All";
    }

    if (selected.length === 1) {
      return selected[0];
    }

    return `${selected.length} selected`;
  };

  return (
    <div className="spo-multiselect" ref={dropdownRef}>
      <label>{label}</label>

      <button
        type="button"
        className="spo-multiselect-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{getDisplayValue()}</span>
        <span className="spo-multiselect-arrow">
          {isOpen ? "▲" : "▼"}
        </span>
      </button>

      {isOpen && (
        <div className="spo-multiselect-dropdown">
          <input
            type="text"
            className="spo-multiselect-search"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="spo-multiselect-actions">
            <button type="button" onClick={handleSelectAll}>
              Select all
            </button>

            <button type="button" onClick={handleClear}>
              Clear
            </button>
          </div>

          <div className="spo-multiselect-options">
            {filteredOptions.map((option) => (
              <label
                className="spo-multiselect-option"
                key={option}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(option)}
                  onChange={() => handleOptionChange(option)}
                />

                <span>{option}</span>
              </label>
            ))}

            {filteredOptions.length === 0 && (
              <div className="spo-multiselect-empty">
                No results
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SPO_MultiSelect;