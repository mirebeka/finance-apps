const express = require('express');
const router = express.Router();

const { executeQuery} = require('../../db/bigquery');
const {
  PROJECTS_TABLE,
  WISHLIST_TABLE,
  MODIFICATIONS_TABLE,
  PROJECTS_COLS,
  WISHLIST_COLS,
  OTHER_DEVS_LIST,
} = require('./consCols');

// Project Status Chart 
router.get("/chart-status", async (req, res) => {
  try {
    const sql = `
      SELECT STATUS, COUNT(*) AS TOTAL
      FROM SKYNET_DATA
      WHERE STATUS IS NOT NULL
      GROUP BY STATUS
      ORDER BY STATUS
    `;

    const result = await executeQuery({sql},"Skynet");

    const normalizeStatus = (value) => {
      if (!value) return "";

      return value
        .toString()
        .trim()
        .replace(/\s*\/\s*/g, "/")   
        .replace(/\s*-\s*/g, " - ")  
        .replace(/\s+/g, " ");       
    };

    const grouped = {};

    result.forEach((row) => {
      const normalizedStatus = normalizeStatus(row.STATUS);
      const total = Number(row.TOTAL) || 0;

      if (!grouped[normalizedStatus]) {
        grouped[normalizedStatus] = 0;
      }

      grouped[normalizedStatus] += total;
    });

    const formatted = Object.entries(grouped).map(([name, value]) => ({
      name,
      value,
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Chart data error:", error);
    res.status(500).json({ error: "Failed to load status chart data" });
  }
});

// Modification Count Chart
router.get("/chart-modification", async (req, res) => {
  try {
    const sql = `
      SELECT MODIFIED_BY, COUNT(*) AS TOTAL
      FROM SKYNET_MODIFICATIONS
      WHERE MODIFIED_BY IS NOT NULL
        AND TRIM(MODIFIED_BY) <> ''
        AND (
          STATUS IS NULL
          OR REPLACE(LOWER(TRIM(STATUS)), ' ', '') <> 'h-onhold'
        )
      GROUP BY MODIFIED_BY
      ORDER BY MODIFIED_BY
    `;

    const result = await executeQuery({sql}, "Skynet");

    const grouped = {};

    result.forEach((row) => {
      const total = Number(row.TOTAL) || 0;

      const developers = String(row.MODIFIED_BY || "")
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean);

      developers.forEach((developer) => {
        if (!grouped[developer]) {
          grouped[developer] = 0;
        }

        grouped[developer] += total;
      });
    });


    const formatted = Object.entries(grouped).map(([name, value]) => ({
      name,
      value,
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Chart data error:", error);
    res.status(500).json({ error: "Failed to load modification chart data" });
  }
});

// Department Chart
router.get("/chart-department", async (req, res) => {
  try {
    const sql = `
      SELECT DEPARTMENT, COUNT(*) AS TOTAL
      FROM SKYNET_DATA
      WHERE DEPARTMENT IS NOT NULL
      GROUP BY DEPARTMENT
      ORDER BY TOTAL DESC
    `;

    const result = await executeQuery({sql},"Skynet");


    const formatted = result.map((row) => ({
      name: row.DEPARTMENT,
      value: Number(row.TOTAL),
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Department data error:", error);
    res.status(500).json({ error: "Failed to load chart data" });
  }
});

// Modification Status Chart
router.get("/chart-modification-status", async (req, res) => {
  try {
    const sql = `
      SELECT STATUS, COUNT(*) AS TOTAL
      FROM SKYNET_MODIFICATIONS
      WHERE STATUS IS NOT NULL
        AND TRIM(STATUS) <> ''
      GROUP BY STATUS
      ORDER BY STATUS
      
    `;


    const result = await executeQuery({sql}, "Skynet");

    const formatted = result.map((row) => ({
      name: row.STATUS,
      value: Number(row.TOTAL) || 0,
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Modification status chart error:", error);
    res.status(500).json({
      error: "Failed to load modification status chart data",
    });
  }
});

// Saving Hour by Department Chart
router.get("/chart-saving-hour-by-department", async (req, res) => {
  try {
    // SAFE_CAST returns NULL for malformed values instead of raising an error.
    const sql = `
      SELECT
        DEPARTMENT,
        SUM(SAFE_CAST(TRIM(SAVING_HOUR) AS FLOAT64)) AS TOTAL
        FROM SKYNET_DATA
        WHERE DEPARTMENT IS NOT NULL
          AND TRIM(DEPARTMENT) <> ''
          AND SAFE_CAST(TRIM(SAVING_HOUR) AS FLOAT64) IS NOT NULL
          AND REPLACE(TRIM(STATUS), ' ', '') = '4-Active'
        GROUP BY DEPARTMENT
        ORDER BY TOTAL DESC
            `;

    const result = await executeQuery({sql},"Skynet");

    const formatted = result.map((row) => ({
      name: row.DEPARTMENT,
      value: Number(row.TOTAL) || 0,
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Saving hour by department chart error:", error);
    res.status(500).json({ error: "Failed to load saving hour by department chart data" });
  }
});

// ONGOING
router.get("/ongoing", async (req, res) => {
  try {
    const sql = `
      SELECT
        'MODIFICATION' AS TYPE,
        m.MODIFIED_BY AS MODIFIED_BY,
        m.ID,
        m.TITLE,
        m.SHORT_DESCRIPTION,
        m.START_DATE,
        m.DUE_DATE,
        m.STATUS,
        m.PENDING_ON,
        NULL AS PROJECT_MANAGER
      FROM ${MODIFICATIONS_TABLE} m
      WHERE m.STATUS IS NOT NULL
        AND LOWER(m.STATUS) NOT LIKE '%finished%'
        AND LOWER(m.STATUS) NOT LIKE '%needed%'
        AND LOWER(m.STATUS) NOT LIKE '%hold%'

      UNION ALL

      SELECT
        'ADS' AS TYPE,
        d.${PROJECTS_COLS.DEVELOPER} AS MODIFIED_BY,
        d.${PROJECTS_COLS.UNIQUE_ID} AS ID,
        d.${PROJECTS_COLS.TITLE} AS TITLE,
        d.${PROJECTS_COLS.SHORT_DESCRIPTION} AS SHORT_DESCRIPTION,
        d.${PROJECTS_COLS.PLANNED_GO_LIVE_DATE} AS START_DATE,
        d.${PROJECTS_COLS.PLANNED_GO_LIVE_DATE} AS DUE_DATE,
        d.${PROJECTS_COLS.STATUS} AS STATUS,
        NULL AS PENDING_ON,
       d.${PROJECTS_COLS.PROJECT_MANAGER} AS PROJECT_MANAGER
      FROM ${PROJECTS_TABLE} d
      WHERE REPLACE(TRIM(d.${PROJECTS_COLS.STATUS}), ' ', '') LIKE '1-%'
         OR REPLACE(TRIM(d.${PROJECTS_COLS.STATUS}), ' ', '') LIKE '2-%'
         OR REPLACE(TRIM(d.${PROJECTS_COLS.STATUS}), ' ', '') LIKE '3-%'

      ORDER BY TYPE, MODIFIED_BY, ID
    `;

    const rows = await executeQuery({sql}, "Skynet");
    res.json(rows);
  } catch (err) {
    console.error("Error loading ongoing data:", err);
    res.status(500).json({
      error: "Failed to load ongoing data",
      details: String(err?.message || err),
    });
  }
});

// FINISHED
router.get("/finished", async (req, res) => {
  try {
    const sql = `
      SELECT
        'MODIFICATION' AS TYPE,
        m.MODIFIED_BY AS MODIFIED_BY,
        m.ID,
        m.TITLE,
        m.SHORT_DESCRIPTION,
        m.DUE_DATE,
        m.ACTUAL_GO_LIVE_DATE,
        m.STATUS
      FROM ${MODIFICATIONS_TABLE} m
      WHERE m.STATUS IS NOT NULL
        AND LOWER(m.STATUS) LIKE '%finished%'

      UNION ALL

      SELECT
        'ADS' AS TYPE,
        d.${PROJECTS_COLS.DEVELOPER} AS MODIFIED_BY,
        d.${PROJECTS_COLS.UNIQUE_ID} AS ID,
        d.${PROJECTS_COLS.TITLE} AS TITLE,
        d.${PROJECTS_COLS.SHORT_DESCRIPTION} AS SHORT_DESCRIPTION,
        d.${PROJECTS_COLS.PLANNED_GO_LIVE_DATE} AS DUE_DATE,
        d.${PROJECTS_COLS.ACTUAL_GO_LIVE_DATE} AS ACTUAL_GO_LIVE_DATE,
        d.${PROJECTS_COLS.STATUS} AS STATUS
      FROM ${PROJECTS_TABLE} d
      WHERE d.${PROJECTS_COLS.STATUS} IS NOT NULL
        AND REPLACE(LOWER(TRIM(d.${PROJECTS_COLS.STATUS})), ' ', '') = '4-active'

      ORDER BY TYPE, MODIFIED_BY, ID
    `;

    const rows = await executeQuery({sql},"Skynet");
    res.json(rows);
  } catch (err) {
     console.error("Error loading finished data:", err);
      res.status(500).json({
      error: "Failed to load finished data",
      details: String(err?.message || err),
    });
   }
});

// Number of websites 
router.get("/website-count", async (req, res) => {
  try {
    const sql = `
      SELECT COUNT(*) AS TOTAL
      FROM ${PROJECTS_TABLE}
      WHERE ${PROJECTS_COLS.WEBSITE} = '1'
    `;

    const rows = await executeQuery({ sql }, "Skynet");

    res.json({
      total: Number(rows[0]?.TOTAL ?? 0),
    });
  } catch (error) {
    console.error("Website count error:", error);

    res.status(500).json({
      error: "Failed to load website count",
    });
  }
});

module.exports = router;