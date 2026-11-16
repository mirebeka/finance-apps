import React, { useEffect, useState, useMemo } from "react";
import "./SPO_Homepage.css";
import axios from "axios";
import Select from "react-select";
import { BASE_URL, API_URL } from "./config";
import { use } from "react";

const SPOcustomStyles = {
    control: (provided, state) => ({
      ...provided,
      minHeight: "32px",
      height: "32px",
      borderRadius: "6px",
      borderColor: state.isFocused ? "#0d1a3a" : "#d9d9d9",
      boxShadow: state.isFocused ? "0 0 0 1px #0d1a3a" : "none",
      "&:hover": { borderColor: "#0d1a3a" },
      fontSize: "0.85rem",
    }),
    valueContainer: (provided) => ({ ...provided, height: "32px", padding: "0 8px" }),
    indicatorsContainer: (provided) => ({ ...provided, height: "32px" }),
    dropdownIndicator: (provided) => ({ ...provided, padding: "0 6px" }),
    indicatorSeparator: () => ({ display: "none" }),
    menu: (provided) => ({ ...provided, borderRadius: "6px", overflow: "hidden", fontSize: "0.85rem" }),
    menuPortal: (provided) => ({ ...provided, zIndex: 9999 }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected ? "#0d1a3a" : state.isFocused ? "#f2f4f8" : "white",
      color: state.isSelected ? "white" : "#333",
      cursor: "pointer",
    }),
  };

const SPODropdownOptions = [
  { value: "Yes", label: "Yes" },
  { value: "No", label: "No" },
  { value: "CR", label: "CR"},
];

const monthIndex = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

const parseStatementMonth = (s) => {
  const str = (s ?? "").toString().trim();
  const m = str.match(/^(\d{4})\s+([A-Za-z]+)$/);
  if (!m) return { year: 9999, month: 99 };
  const year = Number(m[1]);
  const month = monthIndex[m[2].toLowerCase()] ?? 99;
  return { year, month };
};


function SPO_Homepage() {
  const [rows, setRows] = useState([]);
  const [fullComment, setFullComment] = useState(null);
  const [IsIt0Values, setIsIt0Values] = useState({});
  const [pendingEdits, setPendingEdits] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const [selectedStatementMonth, setSelectedStatementMonth] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [showAutoLogoutWarning, setShowAutoLogoutWarning] = useState(false);
  const [logoutCountdown, setLogoutCountdown] = useState(20);

  const [commentValues, setCommentValues] = useState({});

  // filters

  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [showInvoiceSearch, setShowInvoiceSearch] = useState(false);

  const [statementNameSearch, setStatementNameSearch] = useState("");
  const [showStatementNameSearch, setShowStatementNameSearch] = useState(false);

  const [vendorSearch, setVendorSearch] = useState("");
  const [showVendorSearch, setShowVendorSearch]= useState(false);

  // read the role from the browser
  const userRole = localStorage.getItem("spo_role");
  // admins also see the last two columns
  const isAdmin = userRole === "admin";

  // Logout confirm modal state
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // sort by gross total USD
  const [sortByGrossTotal, setSortByGrossTotal] = useState(null);


  useEffect(() => {
    axios
      .get(API_URL + "/api/spo/load")
      .then((res) => {
        setRows(res.data || []);
        setPendingEdits({});
      })
      .catch((_err) => {});
  }, []);

  
  const toDateOnly = (v) => {
    if (v === null || v === undefined || String(v).trim() === "") return null;
    const d = new Date(v);
    if (isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };


  // AGING COLUMN
  const calcAging = (paymentDueDate, paymentDate) => {
    const due = toDateOnly(paymentDueDate);
    const paid = toDateOnly(paymentDate);
    const today = toDateOnly(new Date());
    const msPerDay = 24 * 60 * 60 * 1000;

    if (paid) {
      const daysAgo = Math.floor((today.getTime() - paid.getTime()) / msPerDay);

        const diff = Math.floor((paid.getTime() - due.getTime()) / msPerDay);


      return {
        value: daysAgo,
        display: `Paid ${daysAgo} days ago`,
        overdue: diff > 0 ? "Yes" : "No",
        isPaid: true,
      };
    }

    if (!due) {
      return {
        value: null,
        display: "",
        overdue: "",
        isPaid: false,
      };
    }

    const daysUntilDue = Math.floor((today.getTime() - due.getTime()) / msPerDay);

    return {
      value: daysUntilDue,
      display: daysUntilDue,
      overdue: daysUntilDue > 0 ? "Yes" : "No",
      isPaid: false,
    };
  };

  const statementMonthOptions = useMemo(() => {
    const unique = Array.from(
      new Set(
        rows
          .map((r) => (r.STATEMENT_MONTH ?? "").toString().trim())
          .filter(Boolean)
      )
    ).sort((a, b) => {
      const A = parseStatementMonth(a);
      const B = parseStatementMonth(b);
      return A.year - B.year || A.month - B.month;
    });

    return unique.map((m) => ({ value: m, label: m }));
  }, [rows]);

  const statusFilterOptions = [
    { value: "RED", label: "Overdue", color: "#e53935" },
    { value: "YELLOW", label: "Getting close", color: "#fbc02d" },
    { value: "GREEN", label: "Paid in SAP", color: "#43a047" },
    { value: "GREY", label: "It is 0/CR", color: "#9e9e9e" },
    { value: "WHITE", label: "Invoice missing from the invoice system", color: "#ffffff" },
  ];

  const formatStatusOption = (option) => (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          backgroundColor: option.color,
          border: option.value === "WHITE" ? "1px solid #ccc" : "none",
        }}
      />
      <span>{option.label}</span>
    </div>
  );

  // sort by gross total
  const toNumber = (v) => {
    if (v === null || v === undefined || v === "") return null;
    const num = Number(String(v).replace(/,/g, ""));
    return isNaN(num) ? null : num;
  };

  // sorting + filtering logic
  const filteredSortedRows = useMemo(() => {
    let filtered = selectedStatementMonth?.value
      ? rows.filter(
          (r) => (r.STATEMENT_MONTH ?? "").toString().trim() === selectedStatementMonth.value
        )
      : rows;

    if (selectedColor?.value) {
      filtered = filtered.filter((row) => {
        const isIt0Value =
          pendingEdits[row.ROW_ID]?.IS_IT_0 ?? IsIt0Values[row.ROW_ID] ?? row.IS_IT_0;

        const isGreyRow = ["yes", "cr"].includes(
            (isIt0Value || "").toString().trim().toLowerCase()
          );

        const isPaidInSap =
          (row.IS_IT_PAID_IN_SAP || "").toString().trim().toLowerCase() === "yes";

        const invoiceTotalNum = Number(
          String(row.INVOICE_TOTAL ?? "").replace(",", ".")
        );
        const isInvoiceZero = !isNaN(invoiceTotalNum) && invoiceTotalNum === 0;

        if (selectedColor.value === "WHITE") return isInvoiceZero;

        if (selectedColor.value === "GREY") return isGreyRow;
        if (isGreyRow) return false;

        if (selectedColor.value === "GREEN") return isPaidInSap;
        if (isPaidInSap) return false;

        const aging = calcAging(row.PAYMENT_DUE_DATE, row.PAYMENT_DATE);

    switch (selectedColor.value) {
      case "RED":
        return aging.value !== null && aging.value > 0;

      case "YELLOW":
        return aging.value !== null && aging.value <= 0 && aging.value >= -10;

      default:
        return true;
    }
      });
    }

    // invoice number search
    if (invoiceSearch.trim()) {
    filtered = filtered.filter((row) =>
      (row.INVOICE_NUMBER || "")
        .toString()
        .toLowerCase()
        .includes(invoiceSearch.toLowerCase())
    );
  }

  

  // statement name search
    if (statementNameSearch.trim()) {
      filtered = filtered.filter((row) =>
        (row.STATEMENT_NAME || "")
          .toString()
          .toLowerCase()
          .includes(statementNameSearch.toLowerCase())
      );
  }

    // vendor search
    if (vendorSearch.trim()) {
      filtered = filtered.filter((row) =>
        (row.VENDOR || "")
          .toString()
          .toLowerCase()
          .includes(vendorSearch.toLowerCase())
      );
  }




    // SORTING
    return [...filtered].sort((a, b) => {
      // sort by gross total
      if (sortByGrossTotal) {
        let aVal = toNumber(a.GROSS_TOTAL_USD) ?? Infinity;
        let bVal = toNumber(b.GROSS_TOTAL_USD) ?? Infinity;

        return sortByGrossTotal === "asc" ? aVal - bVal : bVal - aVal;
      }

      // original: sort by aging
      const aVal = calcAging(a.PAYMENT_DUE_DATE, a.PAYMENT_DATE);
      const bVal = calcAging(b.PAYMENT_DUE_DATE, b.PAYMENT_DATE);


      // PAID (GREEN) ROWS GO TO THE END
      if (aVal.isPaid && !bVal.isPaid) return 1;
      if (!aVal.isPaid && bVal.isPaid) return -1;

      const aNum = aVal.value === null ? Infinity : aVal.value;
      const bNum = bVal.value === null ? Infinity : bVal.value;

      return bNum - aNum;
    });

    // DEPENDENCY ROW
    }, [rows, selectedStatementMonth, selectedColor, pendingEdits, IsIt0Values, sortByGrossTotal, invoiceSearch, statementNameSearch, vendorSearch]);





  const commitEdit = (rowId, patch) => {
    setPendingEdits((prev) => ({
      ...prev,
      [rowId]: { ...(prev[rowId] || {}), ...patch },
    }));
  };

  const isOverdue = (aging) => {
    return aging?.overdue ?? "";
  };

  const formatAging = (aging) => {
    return aging?.display ?? "";
  };



  // HANDLERS

  const handleDownloadDateChange = (rowId, newDate) => {
    setRows((prev) => prev.map((row) => (row.ROW_ID === rowId ? { ...row, DOWNLOAD_DATE: newDate } : row)));
    commitEdit(rowId, { DOWNLOAD_DATE: newDate });
  };

  const handleSave = async () => {
    const user = localStorage.getItem("spo_user");


    const edits = Object.entries(pendingEdits).map(([rowId, patch]) => ({
      ROW_ID: rowId,
      ...patch,
    }));

    if (edits.length === 0) return;

    try {
      setIsSaving(true);
                 const user = localStorage.getItem("spo_user");

          await axios.post(API_URL + "/api/spo/save", {
            edits,
            user,
          });
      setPendingEdits({});
      alert("Saved!");
    } catch (err) {
      console.error(err);
      alert("Save failed. Check backend logs.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleIsIt0Change = (rowKey, selectedValue) => {
    setIsIt0Values((prev) => ({ ...prev, [rowKey]: selectedValue }));
    commitEdit(rowKey, { IS_IT_0: selectedValue });
  };
  const handleCommentChange = (e, rowId) => {
    const newValue = e.target.value;

    setCommentValues((prev) => ({
      ...prev,
      [rowId]: newValue,
    }));

    setRows((prev) =>
      prev.map((row) =>
        row.ROW_ID === rowId ? { ...row, COMMENT: newValue } : row
      )
    );

    commitEdit(rowId, { COMMENT: newValue });
  };

  //  Logout handlers
  const openLogoutConfirm = () => setShowLogoutConfirm(true);
  const closeLogoutConfirm = () => setShowLogoutConfirm(false);

  const doLogout = () => {
    localStorage.removeItem("spo_logged_in");
    sessionStorage.removeItem("spo_logged_in");
    localStorage.removeItem("spo_role");
    localStorage.removeItem("spo_user");
    window.location.href = "/spo/login";
  };

  const confirmLogout = () => {
    doLogout();
  };

  useEffect(() => {
      const INACTIVITY_MS = 10 * 60 * 1000; // 10 min
      const WARNING_MS = INACTIVITY_MS - 20 * 1000; // warn 20 sec before the timeout

      let warningTimeoutId = null;
      let logoutTimeoutId = null;
      let countdownIntervalId = null;

      // stopping the warnings
      const clearTimers = () => {
        if (warningTimeoutId) clearTimeout(warningTimeoutId);
        if (logoutTimeoutId) clearTimeout(logoutTimeoutId);
        if (countdownIntervalId) clearInterval(countdownIntervalId);
        warningTimeoutId = null;
        logoutTimeoutId = null;
        countdownIntervalId = null;
      };

      // closing warning window (countdown reset)
      const hideWarning = () => {
        setShowAutoLogoutWarning(false);
        setLogoutCountdown(20);
        if (countdownIntervalId) {
          clearInterval(countdownIntervalId);
          countdownIntervalId = null;
        }
      };

      // starting countdown
      const startCountdown = () => {
        setShowAutoLogoutWarning(true);
        setLogoutCountdown(20);

        let seconds = 20;
        if (countdownIntervalId) clearInterval(countdownIntervalId);

        countdownIntervalId = setInterval(() => {
          seconds -= 1;
          setLogoutCountdown(seconds);

          if (seconds <= 0) {
            clearInterval(countdownIntervalId);
            countdownIntervalId = null;
            doLogout();
          }
        }, 1000);
      };

      const scheduleTimers = () => {
        clearTimers();
        hideWarning();

        warningTimeoutId = setTimeout(() => {
          startCountdown();
        }, WARNING_MS);

        logoutTimeoutId = setTimeout(() => {
          doLogout();
        }, INACTIVITY_MS);
      };

      // user is active again, restart the timers
      const onActivity = () => {
        scheduleTimers();
      };

      scheduleTimers();

      const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
      events.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));

      // stops each timer
      return () => {
        events.forEach((ev) => window.removeEventListener(ev, onActivity));
        clearTimers();
      };
}, []);

  return (
    <>
      <div className="spo-page">

      <div className="spo-header">

        <div className="spo-header-logos">
          <span className="brand-wordmark spo-header-logo-mountain">fibi</span>


        <span className="spo-header-tagline">Finance<br />Operations</span>

        </div>

        <div className="spo-header-title-wrapper">
          <h1 className="spo-header-title">SPO Table</h1>
        </div>

        <div className="spo-header-controls">

        {isAdmin && (
          <a
            href="/spo/dashboard/open"
            target="_blank"
            rel="noreferrer"
            className="spo-dashboard-button"
          >
            Dashboard
          </a>
          )}

          <div className="spo-period-dropdown">
            <Select
              options={statementMonthOptions}
              value={selectedStatementMonth}
              onChange={setSelectedStatementMonth}
              placeholder="Select period"
              isClearable
              isSearchable
              menuPortalTarget={document.body}
              styles={SPOcustomStyles}
            />
          </div>

          <div className="spo-status-dropdown">
            <Select
              options={statusFilterOptions}
              value={selectedColor}
              onChange={setSelectedColor}
              placeholder="Row status..."
              isClearable
              formatOptionLabel={formatStatusOption}
              styles={SPOcustomStyles}
            />
          </div>

          <div className="spo-header-actions">
            <button
              type="button"
              className="spo-save-button"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save"}
            </button>

            <button
              type="button"
              className="spo-logout-button"
              onClick={openLogoutConfirm}
            >
              Log out
            </button>
          </div>

        </div>

      </div>

        <div className="spo-table-wrapper">
          <table className="spo-table">
            <thead className="spo-thead">
              <tr className="spo-tr-header">
                <th className="spo-th dot-th"></th>
                <th className="spo-th">Is it 0/CR?</th>
                <th className="spo-th statement-header">
                  <div className="statement-header-inner">

                    <span>Statement Name</span>

                    <span
                      className="search-icon"
                      onClick={() => setShowStatementNameSearch((prev) => !prev)}
                    >
                      🔍︎
                    </span>

                        {showStatementNameSearch && (
                          <div className="statement-search-popup">
                            <input
                              type="text"
                              placeholder="Search..."
                              value={statementNameSearch}
                              onChange={(e) => setStatementNameSearch(e.target.value)}
                              autoFocus
                            />

                            <span
                                onClick={() => {
                                  setStatementNameSearch("");
                                  setShowStatementNameSearch(false);
                                }}
                                style={{
                                  marginLeft: "6px",
                                  cursor: "pointer",
                                  fontWeight: "bold",
                                  color: "#666",
                                }}
                              >
                                ✕
                              </span>
                            </div>
                          )}
                        </div>
                      </th>

                  <th className="spo-th invoice-header">
                    <div className="invoice-header-inner">
                      <span>Invoice Number</span>

                      <span
                        className="search-icon"
                        onClick={() => setShowInvoiceSearch((prev) => !prev)}
                      >
                        🔍︎
                      </span>

                      {showInvoiceSearch && (
                        <div className="invoice-search-popup">
                          <input
                            type="text"
                            placeholder="Search..."
                            value={invoiceSearch}
                            onChange={(e) => setInvoiceSearch(e.target.value)}
                            autoFocus
                          /> <span
                              onClick={() => {
                                setInvoiceSearch("");
                                setShowInvoiceSearch(false);
                              }}
                              style={{
                                marginLeft: "6px",
                                cursor: "pointer",
                                fontWeight: "bold",
                                color: "#666"
                              }}
                            >
                              ✕
                            </span>
                        </div>
                      )}
                    </div>
                  </th>

                <th className="spo-th">Statement Month</th>
                <th className="spo-th">Avalibility Date(Invoice Date)</th>

                  <th className="spo-th vendor-header">
                    <div className="vendor-header-inner">
                      <span>Vendor</span>

                      <span
                        className="search-icon"
                        onClick={() => setShowVendorSearch((prev) => !prev)}
                      >
                        🔍︎
                      </span>

                      {showVendorSearch && (
                        <div className="vendor-search-popup">
                          <input
                            type="text"
                            placeholder="Search..."
                            value={vendorSearch}
                            onChange={(e) => setVendorSearch(e.target.value)}
                            autoFocus
                          /> <span
                              onClick={() => {
                                setVendorSearch("");
                                setShowVendorSearch(false);
                              }}
                              style={{
                                marginLeft: "6px",
                                cursor: "pointer",
                                fontWeight: "bold",
                                color: "#666"
                              }}
                            >
                              ✕
                            </span>
                        </div>
                      )}
                    </div>
                  </th>

                <th className="spo-th">Account</th>
                <th className="spo-th">Comment</th>
                <th className="spo-th">Notice</th>
                <th className="spo-th">Download Date</th>
                <th className="spo-th">Scanning Date</th>
                <th className="spo-th">AP clerk</th>
                <th className="spo-th">Pending Time(AP Clerk)</th>
                <th className="spo-th">Latest Comment</th>
                <th className="spo-th">Sub-status</th>
                <th className="spo-th">Company Code</th>
                <th className="spo-th">Supplier Code</th>
                <th className="spo-th">Invoice Date</th>
                <th className="spo-th">Invoice Total</th>
                <th className="spo-th">Currency Code</th>
                <th className="spo-th">Organization Element Name</th>
                <th className="spo-th">Gross Total (Company)</th>
                <th className="spo-th">Payment Due Date</th>
                <th className="spo-th">Payment Date</th>
                <th className="spo-th">Payment is overdue?</th>
                <th className="spo-th">Aging (days)</th>
                <th className="spo-th">Posting Date</th>
                {/* sort by gross total */}
                <th
                    className="spo-th"
                    style={{ cursor: "pointer" }}
                    onClick={() =>
                      setSortByGrossTotal((prev) =>
                        prev === "asc" ? "desc" : prev === "desc" ? null : "asc"
                      )
                    }
                  >
                    Gross total (USD)
                    {sortByGrossTotal === "asc" ? " ▲" : sortByGrossTotal === "desc" ? " ▼" : ""}
                  </th>
                <th className="spo-th">Is it paid in SAP?</th>
                <th className="spo-th">Is it in SAP?</th>
                
                {/* admin-only columns */}
                {isAdmin && <th className="spo-th">Last modified by</th>}
{                isAdmin && <th className="spo-th">Last modified at</th>}
              </tr>
            </thead>

            <tbody>
              {filteredSortedRows.map((row, index) => {
                const isIt0Value = IsIt0Values[row.ROW_ID] ?? row.IS_IT_0;
                const isGreyRow = ["yes", "cr"].includes(
                  (isIt0Value || "").toString().trim().toLowerCase()
                );
                
                const agingNum = calcAging(row.PAYMENT_DUE_DATE, row.PAYMENT_DATE);
                const hasAging = agingNum.value !== null && agingNum.value !== undefined;

                const invoiceTotalNum = Number(row.INVOICE_TOTAL);
                const isInvoiceZero = !isNaN(invoiceTotalNum) && invoiceTotalNum === 0;

                const isPaidInSap = (row.IS_IT_PAID_IN_SAP || "").trim().toLowerCase() === "yes";

                const rowClassName = isGreyRow
                  ? "grey"
                  : isPaidInSap
                  ? "paid-in-sap-row"
                  : `
                      ${hasAging && agingNum.value > 0 ? "aging-red" : ""}
                      ${hasAging && agingNum.value <= 0 && agingNum.value >= -10 ? "aging-yellow" : ""}
                    `;

                return (
                  <tr key={`${row.ROW_ID}-${index}`} className={rowClassName}>
                    <td className="spo-td dot-column">
                     <span
                      className={`status-dot 
                        ${isInvoiceZero ? "dot-white" : ""}
                        ${!isInvoiceZero && isGreyRow ? "dot-grey" : ""}
                        ${!isInvoiceZero && !isGreyRow && isPaidInSap ? "dot-green" : ""}
                        ${!isInvoiceZero && !isGreyRow && !isPaidInSap && hasAging && agingNum.value < 0 ? "dot-red" : ""}
                        ${!isInvoiceZero && !isGreyRow && !isPaidInSap && hasAging && agingNum.value >= 0 && agingNum.value <= 10 ? "dot-yellow" : ""}
                        `}

                        title={
                        isInvoiceZero
                          ? "Invoice is not present in the invoice system."
                          : isGreyRow
                          ? "Invoice is 0."
                          : isPaidInSap
                          ? "Paid in SAP."
                          : agingNum.value < 0
                          ? "Payment due date has passed."
                          : agingNum.value >= 0 && agingNum.value <= 10
                          ? "Aging is between 0–10 days."
                          : ""
                      }
                    />
                    </td>
                    <td className="spo-td freeze-col-2">
                      <div className="is-it0-cell">
                        <Select
                          options={SPODropdownOptions}
                          value={
                            SPODropdownOptions.find(
                              (o) =>
                                o.value ===
                                (pendingEdits[row.ROW_ID]?.IS_IT_0 ??
                                  IsIt0Values[row.ROW_ID] ??
                                  row.IS_IT_0)
                            ) || null
                          }
                          onChange={(selected) => handleIsIt0Change(row.ROW_ID, selected.value)}
                          isSearchable={false}
                          menuPlacement="auto"
                          menuPortalTarget={document.body}
                          styles={SPOcustomStyles}
                        />
                      </div>
                    </td>

                    <td className="spo-td">{row.STATEMENT_NAME}</td>
                    <td className="spo-td">{row.INVOICE_NUMBER}</td>
                    <td className="spo-td">{row.STATEMENT_MONTH}</td>
                    <td className="spo-td">{row.AVAILABILITY_DATE}</td>
                    <td className="spo-td">{row.VENDOR}</td>
                    <td className="spo-td">{row.ACCOUNT}</td>
                    <td className="comment-textarea">
                        <textarea
                          type="text"
                          style={{ width: '100%', height: '100%', boxSizing: 'border-box',resize:"vertical" }}
                          value={commentValues[row.ROW_ID] ?? row.COMMENT ?? ""}
                          onChange={(e) => handleCommentChange(e, row.ROW_ID)}
                        />
                    </td>

                    <td className="spo-td">{row.NOTICE}</td>

                    <td className="spo-td">
                      <input
                        className="spo-date-input"
                        type="date"
                        value={pendingEdits[row.ROW_ID]?.DOWNLOAD_DATE ?? row.DOWNLOAD_DATE ?? ""}
                        onChange={(e) => handleDownloadDateChange(row.ROW_ID, e.target.value)}
                      />
                    </td>

                    <td className="spo-td">{row.SCANNING_DATE}</td>
                    <td className="spo-td">{row.AP_CLERK}</td>
                    <td className="spo-td">{row.PENDING_TIME}</td>

                    <td className="spo-td comment-cell">
                      <div className="comment-preview">{row.LATEST_COMMENT || ""}</div>

                      {row.LATEST_COMMENT && row.LATEST_COMMENT.length > 25 && (
                        <span className="show-comment" onClick={() => setFullComment(row.LATEST_COMMENT)}>
                          Show more
                        </span>
                      )}
                    </td>

                    <td className="spo-td">{row.SUB_STATUS}</td>
                    <td className="spo-td">{row.COMPANY_CODE}</td>
                    <td className="spo-td">{row.SUPPLIER_CODE}</td>
                    <td className="spo-td">{row.INVOICE_DATE}</td>
                    <td className="spo-td">
                      {row.INVOICE_TOTAL
                        ? Number(row.INVOICE_TOTAL).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : ""}
                    </td> 
                    <td className="spo-td">{row.CURRENCY_CODE}</td>
                    <td className="spo-td">{row.ORGANIZATION_ELEMENT_NAME}</td>
                    <td className="spo-td">
                      {row.GROSS_TOTAL
                        ? Number(row.GROSS_TOTAL).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : ""}
                    </td> 
                    <td className="spo-td">{row.PAYMENT_DUE_DATE}</td>
                    <td className="spo-td">{row.PAYMENT_DATE}</td>
                    <td className="spo-td">{isOverdue(agingNum)}</td>
                    <td className="spo-td">{formatAging(agingNum)}</td>
                    <td className="spo-td">{row.POSTING_DATE}</td>
                    <td className="spo-td">
                      {row.GROSS_TOTAL_USD
                        ? Number(row.GROSS_TOTAL_USD).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : ""}
                    </td> 
                    <td className="spo-td">{row.IS_IT_PAID_IN_SAP}</td>
                    <td className="spo-td">{row.IS_IT_IN_SAP}</td>

                    {/* admin-only columns */}

                    {isAdmin && <td className="spo-td">{row.LAST_MODIFIED_BY}</td>}
                    {isAdmin && <td className="spo-td">{row.LAST_MODIFIED_AT}</td>}    
                    
                  </tr>
                );
              })}
            </tbody>
          </table>

      {/* Full comment modal */}
      {fullComment && (
        <div className="comment-modal-overlay" onClick={() => setFullComment(null)}>
          <div className="comment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="comment-modal-header">
              <span>Full Comment</span>
              <span className="close-btn" onClick={() => setFullComment(null)}>
                ✕
              </span>
            </div>
            <div className="comment-modal-body">{fullComment}</div>
          </div>
        </div>
      )}
    </div>
  </div>

      <a className="spo-guide-link"  href={`${BASE_URL}/spo/guide`} target="_blank" rel="noreferrer">
        Guide
      </a>

      {/* Logout confirm modal */}
      {showLogoutConfirm && (
        <div className="spo-logout-modal-overlay" onClick={closeLogoutConfirm}>
          <div className="spo-logout-modal" onClick={(e) => e.stopPropagation()}>
            <div className="spo-logout-modal-title">Are you sure you want to log out?</div>

            <div className="spo-logout-modal-actions">
              <button className="spo-logout-yes" onClick={confirmLogout}>
                Yes
              </button>
              <button className="spo-logout-no" onClick={closeLogoutConfirm}>
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout warning modal */}

       {showAutoLogoutWarning && (
        <div className="spo-autologout-modal-overlay">
          <div className="spo-autologout-modal">
            <div className="spo-autologout-title">
              Logging out in {logoutCountdown} seconds
            </div>
            <div className="spo-autologout-sub">
              Move your mouse / press any key to stay signed in.
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default SPO_Homepage;