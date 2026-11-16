import { useEffect, useState } from "react";
import "./PendingApproval.css";
import { API_URL } from "./config";

const ASSETPO_API = `${API_URL}/api/assetpo`;

function PendingApproval() {
  const [reportDates, setReportDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [datesLoading, setDatesLoading] = useState(true);
  const [datesError, setDatesError] = useState("");

  const [filterOptions, setFilterOptions] = useState({
    teams: [],
    segments: [],
    locations: [],
    companies: [],
  });

  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedSegment, setSelectedSegment] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedConversation, setSelectedConversation] = useState("");

  const [filtersLoading, setFiltersLoading] = useState(false);
  const [filtersError, setFiltersError] = useState("");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadReportDates() {
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

      setFilterOptions({
        teams: [],
        segments: [],
        locations: [],
        companies: [],
      });

      try {
        const response = await fetch(
          `${ASSETPO_API}/filter-options?reportDate=${encodeURIComponent(selectedDate)}`,
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
        hasConversation: selectedConversation,
      });

      try {
        const response = await fetch(
          `${ASSETPO_API}/pending-approval?${params.toString()}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Failed to load pending approvals.");
        }

        const data = await response.json();

        if (!controller.signal.aborted) {
          setRows(data);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setError("Failed to load pending approvals.");
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
    selectedConversation,
  ]);

  function handleDateChange(event) {
    setSelectedDate(event.target.value);
    setSelectedTeam("");
    setSelectedSegment("");
    setSelectedLocation("");
    setSelectedCompany("");
    setSelectedConversation("");
  }

  const filtersDisabled =
    !selectedDate || filtersLoading || filtersError !== "";

  function resetFilters() {
    setSelectedDate("");
    setSelectedTeam("");
    setSelectedSegment("");
    setSelectedLocation("");
    setSelectedCompany("");
    setSelectedConversation("");

    setRows([]);
    setError("");
    setFiltersError("");
    setLoading(false);
    setFiltersLoading(false);

    setFilterOptions({
      teams: [],
      segments: [],
      locations: [],
      companies: [],
    });
  }

  return (
    <section className="assetpo-page pending-approval-page">
      <div className="assetpo-page-header">
        <h1>Pending Approval</h1>

        <button
          type="button"
          className="assetpo-reset-filters"
          onClick={resetFilters}
        >
          Reset filters
        </button>
      </div>

      <div className="assetpo-filters pending-approval-filters">
        <div className="pending-approval-filter">
          <label
            htmlFor="assetpo-report-date"
            className="assetpo-report-date-label"
          >
            Report Date
          </label>

          <input
            type="date"
            id="assetpo-report-date"
            className="assetpo-report-date-dropdown"
            value={selectedDate}
            onChange={handleDateChange}
            min={reportDates[reportDates.length - 1]?.REPORT_DATE}
            max={reportDates[0]?.REPORT_DATE}
            disabled={datesLoading || reportDates.length === 0}
          />

          {datesError && <p role="alert">{datesError}</p>}
        </div>

        <div className="pending-approval-filter">
          <label
            htmlFor="assetpo-team"
            className="assetpo-report-date-label"
          >
            Team Responsible
          </label>

          <select
            id="assetpo-team"
            className="assetpo-report-date-dropdown"
            value={selectedTeam}
            onChange={(event) => setSelectedTeam(event.target.value)}
            disabled={filtersDisabled}
          >
            <option value="">All</option>

            {filterOptions.teams.map((team) => (
              <option key={team} value={team}>
                {team}
              </option>
            ))}
          </select>
        </div>

        <div className="pending-approval-filter">
          <label
            htmlFor="assetpo-segment"
            className="assetpo-report-date-label"
          >
            Segment
          </label>

          <select
            id="assetpo-segment"
            className="assetpo-report-date-dropdown"
            value={selectedSegment}
            onChange={(event) => setSelectedSegment(event.target.value)}
            disabled={filtersDisabled}
          >
            <option value="">All</option>

            {filterOptions.segments.map((segment) => (
              <option key={segment} value={segment}>
                {segment}
              </option>
            ))}
          </select>
        </div>

        <div className="pending-approval-filter">
          <label
            htmlFor="assetpo-location"
            className="assetpo-report-date-label"
          >
            Location
          </label>

          <select
            id="assetpo-location"
            className="assetpo-report-date-dropdown"
            value={selectedLocation}
            onChange={(event) => setSelectedLocation(event.target.value)}
            disabled={filtersDisabled}
          >
            <option value="">All</option>

            {filterOptions.locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </div>

        <div className="pending-approval-filter">
          <label
            htmlFor="assetpo-company"
            className="assetpo-report-date-label"
          >
            Company
          </label>

          <select
            id="assetpo-company"
            className="assetpo-report-date-dropdown"
            value={selectedCompany}
            onChange={(event) => setSelectedCompany(event.target.value)}
            disabled={filtersDisabled}
          >
            <option value="">All</option>

            {filterOptions.companies.map((company) => (
              <option key={company} value={company}>
                {company}
              </option>
            ))}
          </select>
        </div>

        <div className="pending-approval-filter">
          <label
            htmlFor="assetpo-conversation"
            className="assetpo-report-date-label"
          >
            Has Conversation
          </label>

          <select
            id="assetpo-conversation"
            className="assetpo-report-date-dropdown"
            value={selectedConversation}
            onChange={(event) =>
              setSelectedConversation(event.target.value)
            }
            disabled={!selectedDate}
          >
            <option value="">All</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>

        {filtersLoading && (
          <p role="status">Loading filter options...</p>
        )}

        {filtersError && <p role="alert">{filtersError}</p>}
      </div>

      <div className="pending-approval-summary">
        <p>Report Date: {selectedDate || "Select a report date."}</p>

        {loading && <p role="status">Loading...</p>}

        {error && <p role="alert">{error}</p>}

        {selectedDate && !loading && !error && (
          <p>Loaded records: {rows.length} </p>
        )}
      </div>

      {selectedDate && !loading && !error && (
        rows.length === 0 ? (
          <p>No pending approvals match the selected filters.</p>
        ) : (
          <div className="assetpo-table-wrapper">
            <table className="assetpo-table">
              <thead>
                <tr>
                  <th>Deal Name</th>
                  <th>Company</th>
                  <th>Segment</th>
                  <th>Date Submitted</th>
                  <th>Finance Lead Approval Status</th>
                  <th>Programming Lead Approval Status</th>
                  <th>Finance Programming Lead</th>
                  <th>Optional Finance Programming Lead</th>
                  <th>Aging (days)</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${row.NUMBER}-${index}`}>
                    <td>{row.DEAL_NAME ?? "—"}</td>
                    <td>{row.COMPANY ?? "—"}</td>
                    <td>{row.SEGMENT ?? "—"}</td>
                    <td>{row.DATE_SUBMITTED ?? "—"}</td>
                    <td>
                      {row.APPROVAL_STATUS__FINANCE_LEAD_ ?? "—"}
                    </td>
                    <td>
                      {row.APPROVAL_STATUS__PROGRAMMING_LEAD_ ?? "—"}
                    </td>
                    <td>{row.FINANCE_PROGRAMMING_LEAD ?? "—"}</td>
                    <td>
                      {row.OPTIONAL_FINANCE_PROGRAMMING_LEAD ?? "—"}
                    </td>
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



export default PendingApproval;