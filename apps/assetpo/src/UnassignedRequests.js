import { useEffect, useState } from "react";
import "./UnassignedRequests.css";
import { API_URL } from "./config";

const ASSETPO_API = `${API_URL}/api/assetpo`;

const EMPTY_FILTER_OPTIONS = {
  teams: [],
  segments: [],
  locations: [],
  companies: [],
  statuses: [],
  rtrResponsibles: [],
  hasNullRtrResponsible: false,
};

function UnassignedRequests() {
  const [reportDates, setReportDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [datesLoading, setDatesLoading] = useState(true);
  const [datesError, setDatesError] = useState("");

  const [filterOptions, setFilterOptions] = useState(EMPTY_FILTER_OPTIONS);


  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedSegment, setSelectedSegment] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedRtrResponsible, setSelectedRtrResponsible] = useState("");

  const [filtersLoading, setFiltersLoading] = useState(false);
  const [filtersError, setFiltersError] = useState("");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadReportDates() {
      setDatesLoading(true);
      setDatesError("");

      try {
        const response = await fetch(`${ASSETPO_API}/report-dates`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to load report dates.");
        }

        const data = await response.json();

        if (!controller.signal.aborted) {
          setReportDates(data);
          setSelectedDate(data[0]?.REPORT_DATE ?? "");
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setDatesError("Failed to load report dates.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setDatesLoading(false);
        }
      }
    }

    loadReportDates();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedDate) return;

    const controller = new AbortController();

    async function loadFilterOptions() {
      setFiltersLoading(true);
      setFiltersError("");
      setFilterOptions(EMPTY_FILTER_OPTIONS);

      try {
        const response = await fetch(
          `${ASSETPO_API}/unassigned-requests/filter-options?reportDate=${encodeURIComponent(selectedDate)}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Failed to load filter options.");
        }

        const data = await response.json();

        if (!controller.signal.aborted) {
          setFilterOptions({
            teams: data.teams ?? [],
            segments: data.segments ?? [],
            locations: data.locations ?? [],
            companies: data.companies ?? [],
            statuses: data.statuses ?? [],
            rtrResponsibles: data.rtrResponsibles ?? [],
            hasNullRtrResponsible:
              data.hasNullRtrResponsible ?? false,
          });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setFiltersError("Failed to load filter options.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setFiltersLoading(false);
        }
      }
    }

    loadFilterOptions();

    return () => controller.abort();
  }, [selectedDate]);

  useEffect(() => {
    if (!selectedDate) return;

    const controller = new AbortController();

    async function loadData() {
      setLoading(true);
      setError("");
      setRows([]);

      const params = new URLSearchParams({
        reportDate: selectedDate,
        teamResponsible: selectedTeam,
        segment: selectedSegment,
        location: selectedLocation,
        company: selectedCompany,
        status: selectedStatus,
        rtrResponsible: selectedRtrResponsible,
      });

      try {
        const response = await fetch(
          `${ASSETPO_API}/unassigned-requests?${params.toString()}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Failed to load unassigned requests.");
        }

        const data = await response.json();

        if (!controller.signal.aborted) {
          setRows(data);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setError("Failed to load unassigned requests.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => controller.abort();
  }, [
    selectedDate,
    selectedTeam,
    selectedSegment,
    selectedLocation,
    selectedCompany,
    selectedStatus,
    selectedRtrResponsible,
  ]);

  function handleDateChange(event) {
    setSelectedDate(event.target.value);
    setSelectedTeam("");
    setSelectedSegment("");
    setSelectedLocation("");
    setSelectedCompany("");
    setSelectedStatus("");
    setSelectedRtrResponsible("");
    setRows([]);
    setError("");
  }

  const filtersDisabled =
    !selectedDate || filtersLoading || filtersError !== "";

  const dropdownFilters = [
    {
      id: "team",
      label: "Team Responsible",
      value: selectedTeam,
      setValue: setSelectedTeam,
      options: filterOptions.teams,
    },
    {
      id: "segment",
      label: "Segment",
      value: selectedSegment,
      setValue: setSelectedSegment,
      options: filterOptions.segments,
    },
    {
      id: "location",
      label: "Location",
      value: selectedLocation,
      setValue: setSelectedLocation,
      options: filterOptions.locations,
    },
    {
      id: "company",
      label: "Company",
      value: selectedCompany,
      setValue: setSelectedCompany,
      options: filterOptions.companies,
    },
    {
      id: "status",
      label: "Status",
      value: selectedStatus,
      setValue: setSelectedStatus,
      options: filterOptions.statuses,
    },
    {
      id: "rtr-responsible",
      label: "RTR Responsible",
      value: selectedRtrResponsible,
      setValue: setSelectedRtrResponsible,
      options: filterOptions.rtrResponsibles,
      showNull: filterOptions.hasNullRtrResponsible,
    },
  ];

  function resetFilters() {
    setSelectedDate("");
    setSelectedTeam("");
    setSelectedSegment("");
    setSelectedLocation("");
    setSelectedCompany("");
    setSelectedStatus("");
    setSelectedRtrResponsible("");

    setRows([]);
    setError("");
    setFiltersError("");
    setLoading(false);
    setFiltersLoading(false);
    setFilterOptions(EMPTY_FILTER_OPTIONS);
  }

  return (
    <section className="assetpo-page unassigned-requests-page">
        <div className="assetpo-page-header">
            <h1>Unassigned Requests</h1>

            <button
                type="button"
                className="assetpo-reset-filters"
                onClick={resetFilters}
            >
                Reset filters
            </button>
            </div>

      <div className="assetpo-filters unassigned-requests-filters">
        <div className="unassigned-requests-filter">
          <label
            htmlFor="unassigned-report-date"
            className="assetpo-report-date-label"
          >
            Report Date
          </label>

          <input
            type="date"
            id="unassigned-report-date"
            className="assetpo-report-date-dropdown"
            value={selectedDate}
            onChange={handleDateChange}
            min={reportDates[reportDates.length - 1]?.REPORT_DATE}
            max={reportDates[0]?.REPORT_DATE}
            disabled={datesLoading || reportDates.length === 0}
          />

          {datesLoading && <p role="status">Loading dates...</p>}

          {datesError && <p role="alert">{datesError}</p>}

          {!datesLoading && !datesError && reportDates.length === 0 && (
            <p>No dates available.</p>
          )}
        </div>

        {dropdownFilters.map((filter) => (
          <div
            key={filter.id}
            className="unassigned-requests-filter"
          >
            <label
              htmlFor={`unassigned-${filter.id}`}
              className="assetpo-report-date-label"
            >
              {filter.label}
            </label>

            <select
              id={`unassigned-${filter.id}`}
              className="assetpo-report-date-dropdown"
              value={filter.value}
              onChange={(event) =>
                filter.setValue(event.target.value)
              }
              disabled={filtersDisabled}
            >
              <option value="">All</option>

              {filter.showNull && (
                <option value="__NULL__">Null</option>
              )}

              {filter.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        ))}

        {filtersLoading && (
          <p role="status">Loading filter options...</p>
        )}

        {filtersError && <p role="alert">{filtersError}</p>}
      </div>

      <div className="unassigned-requests-summary">
        <p>Report Date: {selectedDate || "Select a report date."}</p>

        {loading && <p role="status">Loading...</p>}

        {error && <p role="alert">{error}</p>}

        {selectedDate && !loading && !error && (
          <p>Loaded records: {rows.length}</p>
        )}
      </div>

      {selectedDate && !loading && !error && (
        rows.length === 0 ? (
          <p>No unassigned requests match the selected filters.</p>
        ) : (
          <div className="assetpo-table-wrapper">
            <table className="assetpo-table">
              <thead>
                <tr>
                  <th>Deal Name</th>
                  <th>Status</th>
                  <th>Date Submitted</th>
                  <th>Submitted By</th>
                  <th>Segment</th>
                  <th>Location</th>
                  <th>Company</th>
                  <th>Team Responsible</th>
                  <th>Aging (days)</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${row.NUMBER}-${index}`}>
                    <td>{row.DEAL_NAME ?? "—"}</td>
                    <td>{row.STATUS ?? "—"}</td>
                    <td>{row.DATE_SUBMITTED ?? "—"}</td>
                    <td>{row.SUBMITTED_BY ?? "—"}</td>
                    <td>{row.SEGMENT ?? "—"}</td>
                    <td>{row.LOCATION ?? "—"}</td>
                    <td>{row.COMPANY ?? "—"}</td>
                    <td>{row.TEAM_RESPONSIBLE ?? "—"}</td>
                    <td>{row.AGING_DAYS ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </section>
  );
}

export default UnassignedRequests;