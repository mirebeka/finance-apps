const express = require("express");
const router = express.Router();

const { executeQuery, logMessage } = require('../../db/bigquery');

router.get("/test", async (req, res) => {
    res.json({
        message: "Asset PO Tracker backend works!",
    });
});

router.get("/test-bigquery", async (req, res) => {
  try {
    const rows = await executeQuery(
      { sql: "SELECT 1 AS connection_test" },
      "AssetPO"
    );

    res.json(rows);
  } catch (error) {
    console.error("AssetPO BigQuery error:", error);

    res.status(500).json({
      error: "Failed to execute BigQuery query.",
    });
  }
});


router.get("/report-dates", async (req, res) => {
  try {
    const rows = await executeQuery(
      {
        sql: `
          SELECT DISTINCT REPORT_DATE
          FROM Asset_PO_Tracker
          WHERE REPORT_DATE IS NOT NULL
          ORDER BY REPORT_DATE DESC
        `,
      },
      "AssetPO"
    );

    res.json(rows);
  } catch (error) {
    console.error("AssetPO report dates error:", error);

    res.status(500).json({
      error: "Failed to load report dates.",
    });
  }
});

// PENDING APPROVAL
router.get("/pending-approval", async (req, res) => {
  const {
    reportDate,
    teamResponsible = "",
    segment = "",
    location = "",
    company = "",
    hasConversation = "",
  } = req.query;

  if (
    typeof reportDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(reportDate)
  ) {
    return res.status(400).json({
      error: "A valid reportDate is required (YYYY-MM-DD).",
    });
  }

  const parsedDate = new Date(`${reportDate}T00:00:00Z`);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== reportDate
  ) {
    return res.status(400).json({
      error: "Invalid report date.",
    });
  }

  const filterValues = [
    teamResponsible,
    segment,
    location,
    company,

    hasConversation,
  ];

  if (filterValues.some((value) => typeof value !== "string")) {
    return res.status(400).json({
      error: "Invalid filter values.",
    });
  }

  if (!["", "Yes", "No"].includes(hasConversation)) {
    return res.status(400).json({
      error: "hasConversation must be Yes, No or empty.",
    });
  }

  const conditions = [
    "REPORT_DATE = CAST(? AS DATE)",
    "STATUS = ?",
  ];

  const binds = [reportDate, "Pending Approval"];

  if (teamResponsible !== "") {
    conditions.push("TEAM_RESPONSIBLE = ?");
    binds.push(teamResponsible);
  }

  if (segment !== "") {
    conditions.push("SEGMENT = ?");
    binds.push(segment);
  }

  if (location !== "") {
    conditions.push("LOCATION = ?");
    binds.push(location);
  }

  if (company !== "") {
    conditions.push("COMPANY = ?");
    binds.push(company);
  }

  if (hasConversation === "Yes") {
    conditions.push("CONVERSATION IS NOT NULL");
  } else if (hasConversation === "No") {
    conditions.push("CONVERSATION IS NULL");
  }

  try {
    const rows = await executeQuery(
      {
        sql: `
          SELECT
            NUMBER,
            REPORT_DATE,
            DEAL_NAME,
            COMPANY,
            SEGMENT,
            DATE_SUBMITTED,
            APPROVAL_STATUS__FINANCE_LEAD_,
            APPROVAL_STATUS__PROGRAMMING_LEAD_,
            FINANCE_PROGRAMMING_LEAD,
            OPTIONAL_FINANCE_PROGRAMMING_LEAD,
            DATE_DIFF(
              REPORT_DATE,
              DATE_SUBMITTED,
              DAY
            ) AS AGING_DAYS
          FROM Asset_PO_Tracker
          WHERE ${conditions.join(" AND ")}
          ORDER BY DEAL_NAME, NUMBER
        `,
        binds,
      },
      "AssetPO"
    );

    res.json(rows);
  } catch (error) {
    console.error("AssetPO pending approval error:", error);

    res.status(500).json({
      error: "Failed to load pending approval data.",
    });
  }
});

router.get("/filter-options", async (req, res) => {
  const { reportDate } = req.query;

  if (
    typeof reportDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(reportDate)
  ) {
    return res.status(400).json({
      error: "A valid reportDate is required (YYYY-MM-DD).",
    });
  }

  const parsedDate = new Date(`${reportDate}T00:00:00Z`);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== reportDate
  ) {
    return res.status(400).json({
      error: "Invalid report date.",
    });
  }

  try {
    const rows = await executeQuery(
      {
        sql: `
          SELECT DISTINCT
            TEAM_RESPONSIBLE,
            SEGMENT,
            LOCATION,
            COMPANY
          FROM Asset_PO_Tracker
          WHERE REPORT_DATE = CAST(? AS DATE)
            AND STATUS = ?
        `,
        binds: [reportDate, "Pending Approval"],
      },
      "AssetPO"
    );

    function getOptions(column) {
      return [...new Set(rows.map((row) => row[column]))]
        .filter((value) => value != null && value !== "")
        .sort((a, b) => a.localeCompare(b));
    }

    res.json({
      teams: getOptions("TEAM_RESPONSIBLE"),
      segments: getOptions("SEGMENT"),
      locations: getOptions("LOCATION"),
      companies: getOptions("COMPANY"),
    });
  } catch (error) {
    console.error("AssetPO filter options error:", error);

    res.status(500).json({
      error: "Failed to load filter options.",
    });
  }
});

// RETURNED
router.get("/returned", async (req, res) => {
  const {
    reportDate,
    teamResponsible = "",
    segment = "",
    location = "",
    company = "",
    hasConversation = "",
  } = req.query;

  if (
    typeof reportDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(reportDate)
  ) {
    return res.status(400).json({
      error: "A valid reportDate is required (YYYY-MM-DD).",
    });
  }

  const parsedDate = new Date(`${reportDate}T00:00:00Z`);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== reportDate
  ) {
    return res.status(400).json({
      error: "Invalid report date.",
    });
  }

  const filterValues = [
    teamResponsible,
    segment,
    location,
    company,
    hasConversation,
  ];

  if (filterValues.some((value) => typeof value !== "string")) {
    return res.status(400).json({
      error: "Invalid filter values.",
    });
  }

  if (!["", "Yes", "No"].includes(hasConversation)) {
    return res.status(400).json({
      error: "hasConversation must be Yes, No or empty.",
    });
  }

  const conditions = [
    "REPORT_DATE = CAST(? AS DATE)",
    "STATUS = ?",
  ];

  const binds = [reportDate, "Returned"];

  if (teamResponsible !== "") {
    conditions.push("TEAM_RESPONSIBLE = ?");
    binds.push(teamResponsible);
  }

  if (segment !== "") {
    conditions.push("SEGMENT = ?");
    binds.push(segment);
  }

  if (location !== "") {
    conditions.push("LOCATION = ?");
    binds.push(location);
  }

  if (company !== "") {
    conditions.push("COMPANY = ?");
    binds.push(company);
  }

  if (hasConversation === "Yes") {
    conditions.push("CONVERSATION IS NOT NULL");
  } else if (hasConversation === "No") {
    conditions.push("CONVERSATION IS NULL");
  }

  try {
    const rows = await executeQuery(
      {
        sql: `
          SELECT
            NUMBER,
            REPORT_DATE,
            DEAL_NAME,
            COMPANY,
            SEGMENT,
            DATE_SUBMITTED,
            APPROVAL_STATUS__FINANCE_LEAD_,
            APPROVAL_STATUS__PROGRAMMING_LEAD_,
            FINANCE_PROGRAMMING_LEAD,
            OPTIONAL_FINANCE_PROGRAMMING_LEAD,
            DATE_DIFF(
              REPORT_DATE,
              DATE_SUBMITTED,
              DAY
            ) AS AGING_DAYS
          FROM Asset_PO_Tracker
          WHERE ${conditions.join(" AND ")}
          ORDER BY DEAL_NAME, NUMBER
        `,
        binds,
      },
      "AssetPO"
    );

    res.json(rows);
  } catch (error) {
    console.error("AssetPO returned error:", error);

    res.status(500).json({
      error: "Failed to load returned data.",
    });
  }
});

router.get("/returned/filter-options", async (req, res) => {
  const { reportDate } = req.query;

  if (
    typeof reportDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(reportDate)
  ) {
    return res.status(400).json({
      error: "A valid reportDate is required (YYYY-MM-DD).",
    });
  }

  const parsedDate = new Date(`${reportDate}T00:00:00Z`);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== reportDate
  ) {
    return res.status(400).json({
      error: "Invalid report date.",
    });
  }

  try {
    const rows = await executeQuery(
      {
        sql: `
          SELECT DISTINCT
            TEAM_RESPONSIBLE,
            SEGMENT,
            LOCATION,
            COMPANY
          FROM Asset_PO_Tracker
          WHERE REPORT_DATE = CAST(? AS DATE)
            AND STATUS = ?
        `,
        binds: [reportDate, "Returned"],
      },
      "AssetPO"
    );

    function getOptions(column) {
      return [...new Set(rows.map((row) => row[column]))]
        .filter((value) => value != null && value !== "")
        .sort((a, b) => a.localeCompare(b));
    }

    res.json({
      teams: getOptions("TEAM_RESPONSIBLE"),
      segments: getOptions("SEGMENT"),
      locations: getOptions("LOCATION"),
      companies: getOptions("COMPANY"),
    });
  } catch (error) {
    console.error("AssetPO filter options error:", error);

    res.status(500).json({
      error: "Failed to load filter options.",
    });
  }
});

// UNASSIGNED REQUESTS
router.get("/unassigned-requests", async (req, res) => {
  const {
    reportDate,
    teamResponsible = "",
    segment = "",
    location = "",
    company = "",
    status = "",
    rtrResponsible = "",
  } = req.query;

  if (
    typeof reportDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(reportDate)
  ) {
    return res.status(400).json({
      error: "A valid reportDate is required (YYYY-MM-DD).",
    });
  }

  const parsedDate = new Date(`${reportDate}T00:00:00Z`);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== reportDate
  ) {
    return res.status(400).json({
      error: "Invalid report date.",
    });
  }

  const filterValues = [
    teamResponsible,
    segment,
    location,
    company,
    status,
    rtrResponsible,
  ];

  if (filterValues.some((value) => typeof value !== "string")) {
    return res.status(400).json({
      error: "Invalid filter values.",
    });
  }


  const conditions = [
    "REPORT_DATE = CAST(? AS DATE)",
  ];

  const binds = [reportDate];

  if (teamResponsible !== "") {
    conditions.push("TEAM_RESPONSIBLE = ?");
    binds.push(teamResponsible);
  }

  if (segment !== "") {
    conditions.push("SEGMENT = ?");
    binds.push(segment);
  }

  if (location !== "") {
    conditions.push("LOCATION = ?");
    binds.push(location);
  }

  if (company !== "") {
    conditions.push("COMPANY = ?");
    binds.push(company);
  }

   if (status !== "") {
    conditions.push("STATUS = ?");
    binds.push(status);
  }

  if (rtrResponsible === "__NULL__") {
    conditions.push("RTR_RESPONSIBLE IS NULL");
  } else if (rtrResponsible !== "") {
    conditions.push("RTR_RESPONSIBLE = ?");
    binds.push(rtrResponsible);
  }


  try {
    const rows = await executeQuery(
      {
        sql: `
          SELECT
            NUMBER,
            REPORT_DATE,
            DEAL_NAME,
            STATUS,
            DATE_SUBMITTED,
            SUBMITTED_BY,
            SEGMENT,
            LOCATION,
            COMPANY,
            TEAM_RESPONSIBLE,
            RTR_RESPONSIBLE,
            DATE_DIFF(
              REPORT_DATE,
              DATE_SUBMITTED,
              DAY
            ) AS AGING_DAYS
          FROM Asset_PO_Tracker
          WHERE ${conditions.join(" AND ")}
          ORDER BY DEAL_NAME, NUMBER
        `,
        binds,
      },
      "AssetPO"
    );

    res.json(rows);
  } catch (error) {
    console.error("AssetPO unassigned requests error:", error);

    res.status(500).json({
      error: "Failed to load unassigned requests data.",
    });
  }
});

router.get("/unassigned-requests/filter-options", async (req, res) => {
  const { reportDate } = req.query;

  if (
    typeof reportDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(reportDate)
  ) {
    return res.status(400).json({
      error: "A valid reportDate is required (YYYY-MM-DD).",
    });
  }

  const parsedDate = new Date(`${reportDate}T00:00:00Z`);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== reportDate
  ) {
    return res.status(400).json({
      error: "Invalid report date.",
    });
  }

  try {
    const rows = await executeQuery(
      {
        sql: `
          SELECT DISTINCT
            TEAM_RESPONSIBLE,
            SEGMENT,
            LOCATION,
            COMPANY,
            STATUS,
            RTR_RESPONSIBLE
          FROM Asset_PO_Tracker
          WHERE REPORT_DATE = CAST(? AS DATE)
        `,
        binds: [reportDate],
      },
      "AssetPO"
    );

    function getOptions(column) {
      return [...new Set(rows.map((row) => row[column]))]
        .filter((value) => value != null && value !== "")
        .sort((a, b) => a.localeCompare(b));
    }

    res.json({
      teams: getOptions("TEAM_RESPONSIBLE"),
      segments: getOptions("SEGMENT"),
      locations: getOptions("LOCATION"),
      companies: getOptions("COMPANY"),
      statuses: getOptions("STATUS"),
      rtrResponsibles: getOptions("RTR_RESPONSIBLE"),
      hasNullRtrResponsible: rows.some(
        (row) => row.RTR_RESPONSIBLE === null
      ),
    });
  } catch (error) {
    console.error("AssetPO filter options error:", error);

    res.status(500).json({
      error: "Failed to load filter options.",
    });
  }
});

// IN PROGRESS

router.get("/in-progress", async (req, res) => {
  const {
    reportDate,
    teamResponsible = "",
    segment = "",
    location = "",
    company = "",
    hasConversation = "",
  } = req.query;

  if (
    typeof reportDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(reportDate)
  ) {
    return res.status(400).json({
      error: "A valid reportDate is required (YYYY-MM-DD).",
    });
  }

  const parsedDate = new Date(`${reportDate}T00:00:00Z`);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== reportDate
  ) {
    return res.status(400).json({
      error: "Invalid report date.",
    });
  }

  const filterValues = [
    teamResponsible,
    segment,
    location,
    company,
    hasConversation,
  ];

  if (filterValues.some((value) => typeof value !== "string")) {
    return res.status(400).json({
      error: "Invalid filter values.",
    });
  }


  const conditions = [
    "REPORT_DATE = CAST(? AS DATE)",
    "STATUS = ?",
  ];

  const binds = [reportDate, "Processing"];

  if (teamResponsible !== "") {
    conditions.push("TEAM_RESPONSIBLE = ?");
    binds.push(teamResponsible);
  }

  if (segment !== "") {
    conditions.push("SEGMENT = ?");
    binds.push(segment);
  }

  if (location !== "") {
    conditions.push("LOCATION = ?");
    binds.push(location);
  }

  if (company !== "") {
    conditions.push("COMPANY = ?");
    binds.push(company);
  }

  if (hasConversation === "Yes") {
    conditions.push("CONVERSATION IS NOT NULL");
  } else if (hasConversation === "No") {
    conditions.push("CONVERSATION IS NULL");
  }
    


  try {
    const rows = await executeQuery(
      {
        sql: `
          SELECT
            NUMBER,
            REPORT_DATE,
            DEAL_NAME,
            STATUS,
            DATE_SUBMITTED,
            SUBMITTED_BY,
            SEGMENT,
            LOCATION,
            COMPANY,
            TEAM_RESPONSIBLE,
            RTR_RESPONSIBLE,
            CASE
              WHEN CONVERSATION IS NULL THEN 'No'
              ELSE 'Yes'
            END AS HAS_CONVERSATION,
            DATE_DIFF(
              REPORT_DATE,
              DATE_SUBMITTED,
              DAY
            ) AS AGING_DAYS
          FROM Asset_PO_Tracker
          WHERE ${conditions.join(" AND ")}
          ORDER BY DATE_SUBMITTED DESC, NUMBER ASC
        `,
        binds,
      },
      "AssetPO"
    );

    res.json(rows);
  } catch (error) {
    console.error("AssetPO unassigned requests error:", error);

    res.status(500).json({
      error: "Failed to load unassigned requests data.",
    });
  }
});

router.get("/in-progress/filter-options", async (req, res) => {
  const { reportDate } = req.query;

  if (
    typeof reportDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(reportDate)
  ) {
    return res.status(400).json({
      error: "A valid reportDate is required (YYYY-MM-DD).",
    });
  }

  const parsedDate = new Date(`${reportDate}T00:00:00Z`);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== reportDate
  ) {
    return res.status(400).json({
      error: "Invalid report date.",
    });
  }

  try {
    const rows = await executeQuery(
      {
        sql: `
          SELECT DISTINCT
            TEAM_RESPONSIBLE,
            SEGMENT,
            LOCATION,
            COMPANY
          FROM Asset_PO_Tracker
          WHERE REPORT_DATE = CAST(? AS DATE)
        `,
        binds: [reportDate, "Processing"],
      },
      "AssetPO"
    );

    function getOptions(column) {
      return [...new Set(rows.map((row) => row[column]))]
        .filter((value) => value != null && value !== "")
        .sort((a, b) => a.localeCompare(b));
    }

    res.json({
      teams: getOptions("TEAM_RESPONSIBLE"),
      segments: getOptions("SEGMENT"),
      locations: getOptions("LOCATION"),
      companies: getOptions("COMPANY"),

    });
  } catch (error) {
    console.error("AssetPO filter options error:", error);

    res.status(500).json({
      error: "Failed to load filter options.",
    });
  }
});

// MANAGEMENT REPORT
router.get("/management-report", async (req, res) => {
  try {
    const rows = await executeQuery(
      {
        sql: `
          SELECT
            FORMAT_DATE('%Y-%m-%d', REPORT_DATE) AS reportDate,
            TEAM_RESPONSIBLE AS teamResponsible,
            COUNT(*) AS recordCount
          FROM Asset_PO_Tracker
          WHERE REPORT_DATE IS NOT NULL
          GROUP BY REPORT_DATE, TEAM_RESPONSIBLE
          ORDER BY REPORT_DATE, TEAM_RESPONSIBLE
        `,
      },
      "AssetPO"
    );

    res.json(rows);
  } catch (error) {
    console.error("AssetPO management report error:", error);

    res.status(500).json({
      error: "Failed to load management report data.",
    });
  }
});


router.get("/management-report/filter-options", async (req, res) => {
  try {
    const rows = await executeQuery(
      {
        sql: `
          SELECT DISTINCT STATUS AS status
          FROM Asset_PO_Tracker
          WHERE STATUS IS NOT NULL
          ORDER BY STATUS
        `,
      },
      "AssetPO"
    );

    res.json({
      statuses: rows.map((row) => row.status),
    });
  } catch (error) {
    console.error("Management report filter options error:", error);

    res.status(500).json({
      error: "Failed to load filter options.",
    });
  }
});

module.exports = router;

