const express = require('express');
const router = express.Router();

const { executeQuery, logMessage } = require('../../db/bigquery');
const {
  PROJECTS_TABLE,
  PROJECTS_COLS,
  OTHER_DEVS_LIST,
} = require('./consCols');

// Look up a project by UNIQUE_ID (all columns)
router.get("/track/by-id", async (req, res) => {
  try {
    const id = String(req.query.id ?? "").trim();
    if (!id) return res.status(400).json({ error: "Missing id" });

    const rows = await executeQuery(
      {
        // UNIQUE_ID is FLOAT64 but the parameter arrives as a string -> cast.
        sql: `SELECT * FROM ${PROJECTS_TABLE} WHERE ${PROJECTS_COLS.UNIQUE_ID} = SAFE_CAST(? AS FLOAT64)`,
        binds: [id],
      },
      "Skynet"
    );
    if (!rows.length) return res.status(404).json({ error: "No record found" });

    res.json(rows[0]); // raw BigQuery row (the frontend normalises it)
  } catch (e) {
    console.error("Error in /api/track/by-id:", e);
    res.status(500).json({ error: "BigQuery query failed", details: String(e?.message || e) });
  }
});


// Find by developers
router.post("/track/by-devs", async (req, res) => {
  try {
    const developers = Array.isArray(req.body.developers)
      ? req.body.developers.filter(Boolean)
      : [];

    if (!developers.length) {
      return res.status(400).json({ error: "Missing developers array" });
    }

        const useOthers = developers.length === 1 && developers[0] === "OTHER";

      // "OTHER" selected: build the filter from the OTHER_DEVS_LIST
      if (useOthers) {
        // BigQuery has no ILIKE, so use LOWER(...) LIKE LOWER(...).
        const otherDevelopersFilter  = OTHER_DEVS_LIST
          .map(() => `LOWER(TRIM(${PROJECTS_COLS.DEVELOPER})) LIKE LOWER(?)`)
          .join(" OR ");

        const whereCond = `
          (
            ${PROJECTS_COLS.DEVELOPER} IS NULL
            OR TRIM(${PROJECTS_COLS.DEVELOPER}) = ''
            OR (${otherDevelopersFilter })
          )
        `;

        // values bound to the '?' placeholders:
        const binds = OTHER_DEVS_LIST.map((name) => `%${name}%`);

        // the full SELECT
        const rows = await executeQuery(
          {
            sql: `SELECT * FROM ${PROJECTS_TABLE} WHERE ${whereCond}`,
            binds,
          },
          "Skynet"
        );
        return res.json(rows);
      }

    // A regular developer selection:
    const cond = developers
    .map(() => `LOWER(${PROJECTS_COLS.DEVELOPER}) LIKE LOWER(?)`)
    .join(" AND ");

    const binds = developers.map((d) => `%${d}%`);

    const rows = await executeQuery(
      {
        sql: `SELECT * FROM ${PROJECTS_TABLE} WHERE ${cond}`,
        binds,
      },
      "Skynet"
    );

    res.json(rows);
  } catch (err) {
    console.error("Error in /api/track/by-devs:", err);
    res.status(500).json({
      error: "BigQuery query failed",
      details: String(err && err.message || err),
    });
  }
});

// Save the Track project form
router.put("/projects/:id", async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ error: "Missing id param" });

    const b = req.body || {};     // fields sent by the form

    const developerCsv = Array.isArray(b.developer) ? b.developer.join(", ") : (b.developer || "");

    const sets = [];
    const binds = [];

    const set = (expr, val) => { sets.push(expr); binds.push(val); };

    // DATE columns receive a "YYYY-MM-DD" string; empty values become NULL.
    const setDate = (col, val) => {
      sets.push(`${col} = SAFE.PARSE_DATE('%Y-%m-%d', NULLIF(?, ''))`);
      binds.push(val ?? null);
    };


    set(`${PROJECTS_COLS.TITLE} = ?`, b.title ?? null);
    setDate(PROJECTS_COLS.PLANNED_GO_LIVE_DATE, b.planned_golivedate);
    setDate(PROJECTS_COLS.ACTUAL_GO_LIVE_DATE, b.actual_golivedate);
    set(`${PROJECTS_COLS.STATUS} = ?`, b.status ?? null);
    // These are STRING columns, but the form may send numbers -> cast.
    set(`${PROJECTS_COLS.SAVING_HOUR} = SAFE_CAST(? AS STRING)`, b.saving_hour ?? null);
    set(`${PROJECTS_COLS.FREQUENCY_PER_YEAR} = SAFE_CAST(? AS STRING)`, b.frequency ?? null);
    set(`${PROJECTS_COLS.RUN_DATE} = SAFE_CAST(? AS STRING)`, b.run_date ?? null);
    set(`${PROJECTS_COLS.DEVELOPER} = ?`, developerCsv);
    set(`${PROJECTS_COLS.OWNER_EMPLOYEE} = ?`, b.owner ?? null);
    set(`${PROJECTS_COLS.PROJECT_MANAGER} = ?`, b.project_manager ?? null);
    set(`${PROJECTS_COLS.DEPARTMENT} = ?`, b.department ?? null);
    set(`${PROJECTS_COLS.RESP_MANAGER} = ?`, b.responsible_manager ?? null);
    set(`${PROJECTS_COLS.TOOL} = ?`, b.tool ?? null);
    set(`${PROJECTS_COLS.INTERNAL} = ?`, b.internal ? "1" : "0");
    set(`${PROJECTS_COLS.STEP_BY_STEP} = ?`, b.step_by_step ? "1" : "0");
    set(`${PROJECTS_COLS.WEBSITE} = ?`,Number(b.website) === 1 ? "1" : "0");
    set(`${PROJECTS_COLS.SHORT_DESCRIPTION} = ?`, b.short_desc ?? null);

    sets.push(
      `${PROJECTS_COLS.TIME_STAMP} = FORMAT_TIMESTAMP('%Y-%m-%d %H:%M:%S', CURRENT_TIMESTAMP())`
    );

    if (!sets.length) return res.status(400).json({ error: "No updatable fields provided" });

    const sql = `
      UPDATE ${PROJECTS_TABLE}
         SET ${sets.join(", ")}
       WHERE ${PROJECTS_COLS.UNIQUE_ID} = SAFE_CAST(? AS FLOAT64)
    `;
    binds.push(id);

    await executeQuery({ sql, binds }, "Skynet");

    const rows = await executeQuery(
      {
        sql: `SELECT * FROM ${PROJECTS_TABLE}
               WHERE ${PROJECTS_COLS.UNIQUE_ID} = SAFE_CAST(? AS FLOAT64) LIMIT 1`,
        binds: [id],
      },
      "Skynet"
    );
    res.json(rows?.[0] ?? null);
  } catch (err) {
    console.error("Error in PUT /api/projects/:id:", err);
    res.status(500).json({ error: "Update failed", details: String(err?.message || err) });
  }
});


// --- ADD ADS ROUTES ---

// ADD_ADS: lowest free ID
async function suggestNextId() {
  // BigQuery does not allow WHERE without FROM, so the first branch
  // selects from a one-element UNNEST. The alias is upper-case because BigQuery
  // returns field names exactly as written.
  const sql = `
    WITH present AS (
      SELECT SAFE_CAST(${PROJECTS_COLS.UNIQUE_ID} AS INT64) AS id FROM ${PROJECTS_TABLE}
      ),
     candidates AS (
      SELECT 1 AS candidate
      FROM UNNEST([1])
      WHERE NOT EXISTS (SELECT 1 FROM present WHERE id = 1)
      UNION ALL

      SELECT MIN(p.id) + 1
      FROM present p
      LEFT JOIN present p2 ON p2.id = p.id + 1
      WHERE p2.id IS NULL
      UNION ALL

      SELECT COALESCE(MAX(id) + 1, 1) FROM present
    )
    SELECT MIN(candidate) AS SUGGESTED_ID FROM candidates
  `;
  const rows = await executeQuery({ sql }, "Skynet");
  return rows?.[0]?.SUGGESTED_ID ?? null;
}

// ID suggestion for the "Get Next ID" field
router.get("/suggest-id", async (_req, res) => {
  try {
    const suggestedId = await suggestNextId();
    res.json({ suggestedId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
  
});



// Save into SKYNET_DATA; empty dates are stored as NULL
router.post("/save-ads", async (req, res) => {
  try {
    const f = req.body;

    // empty field -> NULL
    const nz = (v) =>
      (v === "" || v === undefined || v === null ? null : v);

    const id = Number(await suggestNextId());

    // guards against two users picking the same ID at once:
    const existsRows = await executeQuery(
      {
        sql: `SELECT 1 FROM ${PROJECTS_TABLE}
               WHERE ${PROJECTS_COLS.UNIQUE_ID} = SAFE_CAST(? AS FLOAT64) LIMIT 1`,
        binds: [id],
      },
      "Skynet"
    );
    if (existsRows.length) {
      return res
        .status(409)
        .json({ error: "ID already exists.", suggestedId: await suggestNextId() });
    }


    // several developers -> "A,B" string
    const developerStr = Array.isArray(f.developer)
      ? f.developer.join(",")   // if array
      : nz(f.developer);        // otherwise

    // STRING columns receive '0' / '1'
    const internal = f.internal ? "1" : "0";
    const stepByStep = f.step_by_step ? "1" : "0";
    const website = Number(f.website) === 1 ? "1" : "0";


    const insertSql = `
      INSERT INTO ${PROJECTS_TABLE} (
        ${PROJECTS_COLS.UNIQUE_ID},
        ${PROJECTS_COLS.TITLE},
        ${PROJECTS_COLS.PLANNED_GO_LIVE_DATE},
        ${PROJECTS_COLS.ACTUAL_GO_LIVE_DATE},
        ${PROJECTS_COLS.STATUS},
        ${PROJECTS_COLS.SAVING_HOUR},
        ${PROJECTS_COLS.FREQUENCY_PER_YEAR},
        ${PROJECTS_COLS.RUN_DATE},
        ${PROJECTS_COLS.DEVELOPER},
        ${PROJECTS_COLS.OWNER_EMPLOYEE},
        ${PROJECTS_COLS.PROJECT_MANAGER},
        ${PROJECTS_COLS.DEPARTMENT},
        ${PROJECTS_COLS.RESP_MANAGER},
        ${PROJECTS_COLS.TOOL},
        ${PROJECTS_COLS.INTERNAL},
        ${PROJECTS_COLS.STEP_BY_STEP},
        ${PROJECTS_COLS.WEBSITE},
        ${PROJECTS_COLS.SHORT_DESCRIPTION},
        ${PROJECTS_COLS.TIME_STAMP}
      )
      VALUES (
        SAFE_CAST(? AS FLOAT64),                        -- UNIQUE_ID (FLOAT64)
        ?,                                              -- TITLE
        SAFE.PARSE_DATE('%Y-%m-%d', NULLIF(?, '')),     -- PLANNED_GO_LIVE_DATE (DATE vagy NULL)
        SAFE.PARSE_DATE('%Y-%m-%d', NULLIF(?, '')),     -- ACTUAL_GO_LIVE_DATE  (DATE vagy NULL)
        ?,                                              -- STATUS
        SAFE_CAST(? AS STRING), SAFE_CAST(? AS STRING), -- SAVING_HOUR, FREQUENCY_PER_YEAR (STRING oszlopok)
        SAFE_CAST(? AS STRING),                         -- RUN_DATE (STRING oszlop)
        ?, ?, ?, ?, ?,                                  -- DEVELOPER, OWNER_EMPLOYEE, PROJECT_MANAGER, DEPARTMENT, RESP_MANAGER
        ?,                                              -- TOOL
        ?, ?, ?,                                        -- INTERNAL, STEP_BY_STEP, WEBSITE (STRING "0"/"1")
        ?,                                              -- SHORT_DESCRIPTION
        FORMAT_TIMESTAMP('%Y-%m-%d %H:%M:%S', CURRENT_TIMESTAMP()) -- TIME_STAMP
      )
    `;


    await executeQuery(
      {
        sql: insertSql,
        binds: [
          id,
          nz(f.title),
          nz(f.planned_golivedate),   // DATE or NULL
          nz(f.actual_golivedate),    // DATE or NULL
          nz(f.status),
          nz(f.saving_hour),
          nz(f.frequency),
          nz(f.run_date),             // STRING, NULL when empty
          developerStr,
          nz(f.owner),                // OWNER_EMPLOYEE
          nz(f.project_manager),
          nz(f.department),
          nz(f.responsible_manager),  // RESP_MANAGER
          nz(f.tool),
          internal,
          stepByStep,
          website,
          nz(f.short_desc),
        ],
      },
      "Skynet"
    );

    res.json({ ok: true, id });
  } catch (e) {
    logMessage("Save error: " + e.message, "Skynet");
    res.status(500).json({ error: e.message });
  }
});


module.exports = router;
