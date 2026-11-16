const express = require('express');
const router = express.Router();

const { executeQuery } = require('../../db/bigquery');
const {
  WISHLIST_TABLE,
  WISHLIST_COLS,
} = require('./consCols');



async function suggestNextWishlistId() {
  // BigQuery does not allow WHERE without FROM, so the first branch
  // selects from a one-element UNNEST.
  const sql = `
    WITH present AS (
      SELECT SAFE_CAST(${WISHLIST_COLS.UNIQUE_ID} AS INT64) AS id
      FROM ${WISHLIST_TABLE}
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
  try {
    const rows = await executeQuery({ sql }, "Skynet");
    return rows?.[0]?.SUGGESTED_ID ?? null;
  } catch (err) {
    console.error("suggestNextWishlistId failed:", err);
    throw err;
  }
}

router.get("/suggest-id", async (_req, res) => {
  try {
    const suggestedId = await suggestNextWishlistId();
    res.json({ suggestedId });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Dropdown: wishlist projects (ID + title)
router.get("/options", async (_req, res) => {
  try {
    const rows = await executeQuery(
      {
        sql: `SELECT ${WISHLIST_COLS.UNIQUE_ID} AS ID, ${WISHLIST_COLS.TITLE} AS TITLE
       FROM ${WISHLIST_TABLE}
       ORDER BY ${WISHLIST_COLS.UNIQUE_ID}`,
      },
      "Skynet"
    );
    const opts = rows.map(r => ({
      value: r.ID,
      label: `${r.TITLE || "(no title)"}`
    }));
    res.json(opts);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Save a new wishlist item
router.post("/", async (req, res) => {
  try {
    const f = req.body || {};
    const nz = (v) => (v === "" || v === undefined || v === null ? null : v);

    // compute the suggested ID at save time
    let id = Number(await suggestNextWishlistId());

    // collision check
    const existsRows = await executeQuery(
      {
        sql: `SELECT 1 FROM ${WISHLIST_TABLE}
               WHERE ${WISHLIST_COLS.UNIQUE_ID} = SAFE_CAST(? AS FLOAT64) LIMIT 1`,
        binds: [id],
      },
      "Skynet"
    );
    if (existsRows.length) {
      return res
        .status(409)
        .json({ error: "ID already exists", suggestedId: await suggestNextWishlistId() });
    }

    const insertSql = `
      INSERT INTO ${WISHLIST_TABLE} (
        ${WISHLIST_COLS.UNIQUE_ID},
        ${WISHLIST_COLS.TITLE},
        ${WISHLIST_COLS.REQUEST_DATE},
        ${WISHLIST_COLS.MANUAL_PROCESS_ESTIMATED_TIME},
        ${WISHLIST_COLS.FREQUENCY_PER_YEAR},
        ${WISHLIST_COLS.PROCESS_OWNER},
        ${WISHLIST_COLS.RUN_DATE},
        ${WISHLIST_COLS.DEPARTMENT},
        ${WISHLIST_COLS.RESPONSIBLE_LINE_MANAGER},
        ${WISHLIST_COLS.SHORT_DESCRIPTION},
        ${WISHLIST_COLS.TEAM},
        ${WISHLIST_COLS.USERNAME}
      )
      VALUES (
        SAFE_CAST(? AS FLOAT64),  -- UNIQUE_ID (FLOAT64 oszlop)
        ?,                        -- TITLE/NAME
        SAFE_CAST(? AS STRING),   -- REQUEST_DATE (STRING column, not DATE)
        SAFE_CAST(? AS STRING),   -- MANUAL_PROCESS_ESTIMATED_TIME (STRING)
        SAFE_CAST(? AS STRING),   -- FREQUENCY_PER_YEAR (STRING)
        ?,                        -- PROCESS_OWNER
        SAFE_CAST(? AS STRING),   -- RUN_DATE (STRING column, not DATE)
        ?,                        -- DEPARTMENT
        ?,                        -- RESPONSIBLE_LINE_MANAGER
        ?,                        -- SHORT_DESCRIPTION
        ?,                        -- TEAM
        ?                         -- USERNAME
      )
    `;

    await executeQuery(
      {
        sql: insertSql,
        binds: [
          id,
          nz(f.TITLE),
          nz(f.REQUEST_DATE),
          nz(f.MANUAL_PROCESS_ESTIMATED_TIME),
          nz(f.FREQUENCY_PER_YEAR),
          nz(f.PROCESS_OWNER),
          nz(f.RUN_DATE),
          nz(f.DEPARTMENT),
          nz(f.RESPONSIBLE_LINE_MANAGER),
          nz(f.SHORT_DESCRIPTION),
          nz(f.TEAM),
          nz(f.USERNAME),
        ],
      },
      "Skynet"
    );

    res.json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// Load one wishlist item into the Add ADS form
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Bad id" });

    const rows = await executeQuery(
      {
        sql: `SELECT
         ${WISHLIST_COLS.TITLE}                         AS TITLE,
         ${WISHLIST_COLS.MANUAL_PROCESS_ESTIMATED_TIME} AS SAVING_HOUR,
         ${WISHLIST_COLS.FREQUENCY_PER_YEAR}            AS FREQUENCY,
         ${WISHLIST_COLS.RUN_DATE}                      AS RUN_DATE,
         ${WISHLIST_COLS.PROCESS_OWNER}                 AS OWNER,
         ${WISHLIST_COLS.DEPARTMENT}                    AS DEPARTMENT,
         ${WISHLIST_COLS.RESPONSIBLE_LINE_MANAGER}      AS RESPONSIBLE_MANAGER,
         ${WISHLIST_COLS.SHORT_DESCRIPTION}             AS SHORT_DESC
       FROM ${WISHLIST_TABLE}
       WHERE ${WISHLIST_COLS.UNIQUE_ID} = SAFE_CAST(? AS FLOAT64)
       LIMIT 1`,
        binds: [id],
      },
      "Skynet"
    );

    const row = rows?.[0];
    if (!row) return res.status(404).json({ error: "Not found" });

    res.json({
      title: row.TITLE || "",
      planned_golivedate: "",
      actual_golivedate: "",
      status: "",
      saving_hour: row.SAVING_HOUR || "",
      frequency: row.FREQUENCY || "",
      run_date: row.RUN_DATE || "",
      developer: [],
      owner: row.OWNER || "",
      department: row.DEPARTMENT || "",
      responsible_manager: row.RESPONSIBLE_MANAGER || "",
      tool: "",
      internal: 0,
      step_by_step: 0,
      short_desc: row.SHORT_DESC || ""
    });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Bad id" });

    await executeQuery(
      {
        sql: `DELETE FROM ${WISHLIST_TABLE}
       WHERE ${WISHLIST_COLS.UNIQUE_ID} = SAFE_CAST(? AS FLOAT64)`,
        binds: [id],
      },
      "Skynet"
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

module.exports = router;
