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

router.post("/by-devs", async (req, res) => {
  try {
    const developers = Array.isArray(req.body.developers)
      ? req.body.developers.filter(Boolean)
      : [];

    if (!developers.length) {
      return res.status(400).json({ error: "Missing developers array" });
    }
    
    const useOthers = developers.length === 1 && developers[0] === "OTHER";

    // BigQuery has no ILIKE, so use LOWER(...) LIKE LOWER(...).
    // Both branches build the same whereCond.
    let whereCond;
    let binds = [];

    if (useOthers) {
      const otherDevelopersFilter  = OTHER_DEVS_LIST
        .map(() => `LOWER(TRIM(p.${PROJECTS_COLS.DEVELOPER})) LIKE LOWER(?)`)
        .join(" OR ");


      whereCond = `
        (
          p.${PROJECTS_COLS.DEVELOPER} IS NULL
          OR TRIM(p.${PROJECTS_COLS.DEVELOPER}) = ''
          ${OTHER_DEVS_LIST.length ? `OR (${otherDevelopersFilter })` : ""}
        )
      `;

      binds = OTHER_DEVS_LIST.map((name) => `%${name}%`);



    } else {
    whereCond = developers
      .map(() => `LOWER(TRIM(p.${PROJECTS_COLS.DEVELOPER})) LIKE LOWER(?)`)
      .join(" AND ");
     binds = developers.map((d) => `%${String(d).trim()}%`);
    }

    // Join projects with their modifications
    const query = `
      SELECT
        p.${PROJECTS_COLS.UNIQUE_ID},
        p.${PROJECTS_COLS.TITLE},
        p.${PROJECTS_COLS.DEVELOPER},
        REGEXP_REPLACE(TRIM(p.${PROJECTS_COLS.STATUS}), r'\s*-\s*', ' - ') AS ${PROJECTS_COLS.STATUS},
        p.${PROJECTS_COLS.DEPARTMENT},
        p.${PROJECTS_COLS.TOOL},
        p.${PROJECTS_COLS.TIME_STAMP},
        SUM(
          CASE
            WHEN m.STATUS <> '3 - Finished'
            THEN 1
            ELSE 0
          END
        ) AS ONGOING_MOD_COUNT,
        COALESCE(COUNT(m.MODIFICATION_ID), 0) AS MOD_COUNT
        FROM ${PROJECTS_TABLE} p
        LEFT JOIN ${MODIFICATIONS_TABLE} m
          ON m.ID = p.${PROJECTS_COLS.UNIQUE_ID}
        WHERE (${whereCond})
          AND REPLACE(TRIM(p.${PROJECTS_COLS.STATUS}), ' ', '') = '4-Active'
        GROUP BY
        p.${PROJECTS_COLS.UNIQUE_ID},
        p.${PROJECTS_COLS.TITLE},
        p.${PROJECTS_COLS.DEVELOPER},
        p.${PROJECTS_COLS.STATUS},
        p.${PROJECTS_COLS.DEPARTMENT},
        p.${PROJECTS_COLS.TOOL},
        p.${PROJECTS_COLS.TIME_STAMP}
      ORDER BY p.${PROJECTS_COLS.TIME_STAMP} DESC
    `;

    const rows = await executeQuery({sql: query, binds},"Skynet");
    res.json(rows);
  } catch (err) {
    console.error("Error in /api/modifications/by-devs:", err);
    res.status(500).json({
      error: "BigQuery query failed",
      details: String(err?.message || err),
    });
  }
});

// New modification
router.post("/add", async (req, res) => {
  try {
    const body = req.body || {};


    const {
      projectId,
      projectTitle,
      shortDescription,
      detailedDescription,
      status,
      pendingOn,
      modifiedBy,
      startDate,
      dueDate,
      actualGoLiveDate,
    } = body;

    if (projectId == null) {
      return res.status(400).json({ error: "Missing projectId" });
    }
    if (!status) {
      return res.status(400).json({ error: "Missing status" });
    }

    const idNum = Number(projectId);
    if (!Number.isFinite(idNum)) {
      return res.status(400).json({ error: "Bad projectId" });
    }

    const modifiedByStr = Array.isArray(modifiedBy)
      ? modifiedBy.join(", ")
      : (modifiedBy || null);

    const insertSql = `
      INSERT INTO ${MODIFICATIONS_TABLE}
        (MODIFICATION_ID,
         ID,
         TITLE,
         START_DATE,
         SHORT_DESCRIPTION,
         DETAILED_DESCRIPTION,
         DUE_DATE,
         ACTUAL_GO_LIVE_DATE,
         STATUS,
         PENDING_ON,
         MODIFIED_BY,
         CREATION_DATE)
      SELECT
        COALESCE(MAX(MODIFICATION_ID), 0) + 1,
        SAFE_CAST(? AS FLOAT64),                     -- ID (FLOAT64 oszlop)
        ?,                                           -- TITLE
        SAFE.PARSE_DATE('%Y-%m-%d', NULLIF(?, '')),  -- START_DATE
        ?,                                           -- SHORT_DESCRIPTION
        ?,                                           -- DETAILED_DESCRIPTION
        SAFE.PARSE_DATE('%Y-%m-%d', NULLIF(?, '')),  -- DUE_DATE
        SAFE.PARSE_DATE('%Y-%m-%d', NULLIF(?, '')),  -- ACTUAL_GO_LIVE_DATE
        ?,                                           -- STATUS
        ?,                                           -- PENDING_ON
        ?,                                           -- MODIFIED_BY
        CURRENT_DATE()
      FROM ${MODIFICATIONS_TABLE}
    `;

    const binds = [
      idNum,
      projectTitle || "",
      startDate || null,
      shortDescription || "",
      detailedDescription || "",
      dueDate || null,
      actualGoLiveDate || null,
      status,
      pendingOn || null,
      modifiedByStr || null,
    ];

    await executeQuery({sql: insertSql, binds}, "Skynet");
    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Error in /api/modifications/add:", err);
    res.status(500).json({
      error: "BigQuery insert failed",
      details: String(err?.message || err),
    });
  }
});


// DELETE Mod.
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: "Missing modification ID." });
  }

  try {
    await executeQuery(
      {
        sql: `DELETE FROM ${MODIFICATIONS_TABLE} WHERE MODIFICATION_ID = SAFE_CAST(? AS INT64)`,
        binds: [id],
      },
      "Skynet"
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting modification:", err);
    res.status(500).json({ error: "Failed to delete modification." });
  }
});


// Return the full modification history of a project
router.get("/by-project/:id", async (req, res) => {
  try {
    const rawId = req.params.id;
    const id = Number(rawId);

    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Bad id" });
    }

const rows = await executeQuery(
  {sql:`
  SELECT
    m.MODIFICATION_ID,
    m.ID,
    m.TITLE,
    m.START_DATE,
    m.SHORT_DESCRIPTION,
    m.DETAILED_DESCRIPTION,
    m.DUE_DATE,
    m.ACTUAL_GO_LIVE_DATE,
    m.STATUS,
    m.PENDING_ON,
    m.MODIFIED_BY,
    m.CREATION_DATE,
    p.PROJECT_MANAGER
  FROM ${MODIFICATIONS_TABLE} m
  LEFT JOIN ${PROJECTS_TABLE} p
    ON p.${PROJECTS_COLS.UNIQUE_ID} = m.ID
  WHERE m.ID = SAFE_CAST(? AS FLOAT64)
  ORDER BY m.CREATION_DATE DESC, m.MODIFICATION_ID DESC
  `,
  binds:[id]},
  "Skynet"
);
    res.json(rows);
  } catch (err) {
    console.error("❌ Error in /api/modifications/by-project/:id:", err);
    res.status(500).json({
      error: "BigQuery query failed",
      details: err?.message || String(err),
    });
  }

});


// Update modification
router.put("/:modId", async (req, res) => {
  try {
    const modId = Number(req.params.modId);
    if (!Number.isFinite(modId)) {
      return res.status(400).json({ error: "Bad modification id" });
    }

    const {
      shortDescription,
      detailedDescription,
      startDate,
      dueDate,
      actualGoLiveDate,
      status,
      modifiedBy,
      pendingOn,
    } = req.body || {};

    if (!status) {
      return res.status(400).json({ error: "Missing status" });
    }

    const modifiedByStr = Array.isArray(modifiedBy)
      ? modifiedBy.join(", ")
      : (modifiedBy || null);

    const sql = `
      UPDATE ${MODIFICATIONS_TABLE}
      SET
        SHORT_DESCRIPTION      = ?,
        DETAILED_DESCRIPTION   = ?,
        START_DATE             = SAFE.PARSE_DATE('%Y-%m-%d', NULLIF(?, '')),
        DUE_DATE               = SAFE.PARSE_DATE('%Y-%m-%d', NULLIF(?, '')),
        ACTUAL_GO_LIVE_DATE    = SAFE.PARSE_DATE('%Y-%m-%d', NULLIF(?, '')),
        STATUS                 = ?,
        MODIFIED_BY            = ?,
        PENDING_ON             = ?
      WHERE MODIFICATION_ID    = SAFE_CAST(? AS INT64)
    `;

    const binds = [
      shortDescription || "",
      detailedDescription || "",
      startDate || null,   
      dueDate || null,
      actualGoLiveDate || null,
      status,
      modifiedByStr,
      pendingOn || null,
      modId,
    ];

    await executeQuery({sql, binds},"Skynet");
    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Error in PUT /api/modifications/:modId:", err);
    res.status(500).json({
      error: "BigQuery update failed",
      details: String(err?.message || err),
    });
  }
});

// Find by ID 
router.get("/by-id", async (req, res) => {
  try {
    const rawId = (req.query.id || "").toString().trim();
    const idNum = Number(rawId);

    if (!Number.isFinite(idNum)) {
      return res.status(400).json({ error: "Bad id" });
    }

    const sql = `
      SELECT
        p.${PROJECTS_COLS.UNIQUE_ID},
        p.${PROJECTS_COLS.TITLE},
        p.${PROJECTS_COLS.DEVELOPER},
        REGEXP_REPLACE(TRIM(p.${PROJECTS_COLS.STATUS}), r'\s*-\s*', ' - ') AS ${PROJECTS_COLS.STATUS},
        p.${PROJECTS_COLS.DEPARTMENT},
        p.${PROJECTS_COLS.TOOL},
        p.${PROJECTS_COLS.TIME_STAMP},
        SUM(
          CASE
            WHEN m.STATUS <> '3 - Finished'
            THEN 1
            ELSE 0
          END
        ) AS ONGOING_MOD_COUNT,
        COALESCE(COUNT(m.MODIFICATION_ID), 0) AS MOD_COUNT
      FROM ${PROJECTS_TABLE} p
      LEFT JOIN ${MODIFICATIONS_TABLE} m
        ON m.ID = p.${PROJECTS_COLS.UNIQUE_ID}
      WHERE p.${PROJECTS_COLS.UNIQUE_ID} = SAFE_CAST(? AS FLOAT64)
        AND REPLACE(TRIM(p.${PROJECTS_COLS.STATUS}), ' ', '') = '4-Active'
      GROUP BY
        p.${PROJECTS_COLS.UNIQUE_ID},
        p.${PROJECTS_COLS.TITLE},
        p.${PROJECTS_COLS.DEVELOPER},
        p.${PROJECTS_COLS.STATUS},
        p.${PROJECTS_COLS.DEPARTMENT},
        p.${PROJECTS_COLS.TOOL},
        p.${PROJECTS_COLS.TIME_STAMP}
    `;

    const rows = await executeQuery({sql,binds: [idNum]},"Skynet");

    if (!rows.length) {
      // no active project with this ID
      return res.status(404).json({ error: "No active project" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Error in /api/modifications/by-id:", err);
    res.status(500).json({
      error: "BigQuery query failed",
      details: String(err?.message || err),
    });
  }
});



module.exports = router;