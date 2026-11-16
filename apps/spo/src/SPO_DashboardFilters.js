import React from "react";
import SPO_MultiSelect from "./SPO_MultiSelect.js";

const MONTH_NUMBERS = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
};

const compareMonthsNewestFirst = (a, b) => {
  const parse = (value) => {
    const match = String(value).trim().match(/^(\d{4})\s+([a-z]+)$/i);
    if (!match) return null;
    const month = MONTH_NUMBERS[match[2].toLowerCase()];
    return month ? Number(match[1]) * 12 + month : null;
  };
  const first = parse(a);
  const second = parse(b);
  if (first !== null && second !== null) return second - first;
  if (first !== null) return -1;
  if (second !== null) return 1;
  return String(a).localeCompare(String(b));
};

function SPO_DashboardFilters({ fields, options, filters, setFilters, onSearch, onResetFilters, isLoading }) {
  const updateFilter = (field, values) => {
    setFilters((previous) => ({ ...previous, [field]: values }));
  };

  return (
    <div className="spo-dashboard-filter-panel">
      <div className="spo-dashboard-filter-grid">
        {fields.map(({ key, label, optionsKey }) => {
          const values = options?.[optionsKey] || [];
          const sortedOptions = key === "statementMonth"
            ? [...values].sort(compareMonthsNewestFirst)
            : values;

          return (
            <SPO_MultiSelect
              key={key}
              label={label}
              options={sortedOptions}
              selected={filters[key] || []}
              onChange={(selected) => updateFilter(key, selected)}
            />
          );
        })}
      </div>
      <div className="spo-dashboard-filter-actions">
        <button type="button" className="spo-dashboard-filter-reset" onClick={onResetFilters}>
          Reset filters
        </button>
        <button type="button" className="spo-dashboard-filter-search" onClick={onSearch} disabled={isLoading}>
          {isLoading ? <><span className="spo-dashboard-spinner" /> Searching...</> : "Search"}
        </button>
      </div>
    </div>
  );
}

export default SPO_DashboardFilters;
