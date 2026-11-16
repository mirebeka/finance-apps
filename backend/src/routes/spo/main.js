const express = require('express');
const router = express.Router();

const { executeQuery, getColumnTypes, placeholderFor } = require('../../db/bigquery');

router.get("/load", async (_req, res) => {
  try {
    const rows = await executeQuery({sql:`SELECT * FROM SPO_DATABASE;`}, "SPO");
    res.json(rows);
  } catch (err) {
    console.error("Error in /api/load:", err);
    res.status(500).json({ error: String(err?.message || err) });
  }
});

const dashboardBaseQuery = `
  WITH invoice_data AS (
    SELECT
      *,

      -- INVOICE STATUS
      CASE
        WHEN PAYMENT_DUE_DATE IS NULL
          OR LENGTH(CAST(PAYMENT_DUE_DATE AS STRING)) != 10
        THEN 'Missing Due Date'

        WHEN PAYMENT_DATE IS NOT NULL
          AND SAFE_CAST(PAYMENT_DATE AS DATE) > SAFE_CAST(PAYMENT_DUE_DATE AS DATE)
        THEN 'Paid Late'

        WHEN PAYMENT_DATE IS NOT NULL
          AND SAFE_CAST(PAYMENT_DATE AS DATE) <= SAFE_CAST(PAYMENT_DUE_DATE AS DATE)
        THEN 'Paid On Time'

        WHEN (
          IS_IT_IN_SAP = 'NO'
          OR IS_IT_0 = 'CR'
          OR IS_IT_0 = 'No'
          OR TRIM(COALESCE(IS_IT_0, '')) = ''
        )
          AND PAYMENT_DATE IS NULL
          AND SAFE_CAST(PAYMENT_DUE_DATE AS DATE) < CURRENT_DATE()
        THEN 'Pending Overdue'

        WHEN (
          IS_IT_IN_SAP = 'NO'
          OR IS_IT_0 = 'CR'
          OR IS_IT_0 = 'No'
          OR TRIM(COALESCE(IS_IT_0, '')) = ''
        )
          AND PAYMENT_DATE IS NULL
          AND SAFE_CAST(PAYMENT_DUE_DATE AS DATE) >= CURRENT_DATE()
        THEN 'Pending On Time'

        WHEN PAYMENT_DATE IS NULL
          AND SAFE_CAST(PAYMENT_DUE_DATE AS DATE) < CURRENT_DATE()
        THEN 'Open Overdue'

        WHEN PAYMENT_DATE IS NULL
          AND SAFE_CAST(PAYMENT_DUE_DATE AS DATE) >= CURRENT_DATE()
        THEN 'Open On Time'

        ELSE 'Check'
      END AS INVOICE_STATUS,

      -- DAYS OVERDUE
      CASE
        WHEN PAYMENT_DUE_DATE IS NULL
          OR LENGTH(CAST(PAYMENT_DUE_DATE AS STRING)) != 10
        THEN NULL

        WHEN PAYMENT_DATE IS NULL
          AND SAFE_CAST(PAYMENT_DUE_DATE AS DATE) < CURRENT_DATE()
        THEN DATE_DIFF(
          CURRENT_DATE(),
          SAFE_CAST(PAYMENT_DUE_DATE AS DATE),
          DAY
        )

        WHEN PAYMENT_DATE IS NOT NULL
          AND SAFE_CAST(PAYMENT_DATE AS DATE) > SAFE_CAST(PAYMENT_DUE_DATE AS DATE)
        THEN DATE_DIFF(
          SAFE_CAST(PAYMENT_DATE AS DATE),
          SAFE_CAST(PAYMENT_DUE_DATE AS DATE),
          DAY
        )

        ELSE 0
      END AS DAYS_OVERDUE,

      -- PROCESSING STATUS
      CASE
        WHEN PAYMENT_DATE IS NOT NULL
        THEN 'Processed'

        WHEN (
          IS_IT_0 = 'No'
          OR IS_IT_0 = 'CR'
        )
          AND DOWNLOAD_DATE IS NOT NULL
          AND PAYMENT_DATE IS NULL
        THEN 'Processing'

        WHEN TRIM(COALESCE(IS_IT_0, '')) = ''
        THEN 'Unprocessed'

        WHEN IS_IT_0 = 'Yes'
        THEN 'Processed'

        ELSE 'Processing'
      END AS PROCESSING_STATUS

    FROM SPO_DATABASE
  ),

  dashboard_data AS (
    SELECT
      *,

      CASE
        WHEN INVOICE_STATUS = 'Missing Due Date'
        THEN 'Missing Due Date'

        WHEN INVOICE_STATUS = 'Pending On Time'
        THEN 'Pending On Time'

        WHEN INVOICE_STATUS IN ('Pending Overdue', 'Open Overdue')
          AND DAYS_OVERDUE BETWEEN 0 AND 30
        THEN '0-30 days'

        WHEN INVOICE_STATUS IN ('Pending Overdue', 'Open Overdue')
          AND DAYS_OVERDUE BETWEEN 31 AND 60
        THEN '31-60 days'

        WHEN INVOICE_STATUS IN ('Pending Overdue', 'Open Overdue')
          AND DAYS_OVERDUE BETWEEN 61 AND 90
        THEN '61-90 days'

        WHEN INVOICE_STATUS IN ('Pending Overdue', 'Open Overdue')
          AND DAYS_OVERDUE > 90
        THEN '90+ days'

        ELSE NULL
      END AS AGING_BUCKET

    FROM invoice_data
  )
`;

router.get("/dashboard/open", async (req, res) => {
  try {
    const {
      supplierCode,
      companyCode,
      statementMonth,
      processingStatus,
      agingBucket
    } = req.query;

    // Convert comma-separated query params into arrays
    const supplierCodes = supplierCode ? supplierCode.split(",") : [];
    const companyCodes = companyCode ? companyCode.split(",") : [];
    const statementMonths = statementMonth ? statementMonth.split(",") : [];
    const processingStatuses = processingStatus ? processingStatus.split(",") : [];
    const agingBuckets = agingBucket ? agingBucket.split(",") : [];

    // Build common filter conditions
    const filterConditions = [];
    const binds = [];

    if (supplierCodes.length > 0) {
      const placeholders = supplierCodes.map(() => "?").join(",");
      filterConditions.push(`SUPPLIER_CODE IN (${placeholders})`);
      binds.push(...supplierCodes);
    }

    if (companyCodes.length > 0) {
      const placeholders = companyCodes.map(() => "?").join(",");
      filterConditions.push(`CAST(COMPANY_CODE AS STRING) IN (${placeholders})`);
      binds.push(...companyCodes);
    }

    if (statementMonths.length > 0) {
      const placeholders = statementMonths.map(() => "?").join(",");
      filterConditions.push(`STATEMENT_MONTH IN (${placeholders})`);
      binds.push(...statementMonths);
    }

    if (processingStatuses.length > 0) {
      const placeholders = processingStatuses.map(() => "?").join(",");
      filterConditions.push(`PROCESSING_STATUS IN (${placeholders})`);
      binds.push(...processingStatuses);
    }

    if (agingBuckets.length > 0) {
      const placeholders = agingBuckets.map(() => "?").join(",");
      filterConditions.push(`AGING_BUCKET IN (${placeholders})`);
      binds.push(...agingBuckets);
    }

    const filterWhere =
      filterConditions.length > 0
        ? `WHERE ${filterConditions.join(" AND ")}`
        : "";

    const filterAnd =
      filterConditions.length > 0
        ? `AND ${filterConditions.join(" AND ")}`
        : "";

    // KPI DATA
    const kpiRows = await executeQuery(
      {
        sql: `
          ${dashboardBaseQuery}

          SELECT
            SUM(
              CASE
                WHEN INVOICE_STATUS IN (
                  'Open Overdue',
                  'Pending Overdue',
                  'Pending On Time',
                  'Open On Time'
                )
                THEN INVOICE_TOTAL
                ELSE 0
              END
            ) AS TOTAL_UNPAID_AMOUNT,

            COUNTIF(
              INVOICE_STATUS IN (
                'Open Overdue',
                'Pending Overdue',
                'Pending On Time',
                'Open On Time'
              )
            ) AS TOTAL_UNPAID_COUNT,

            SUM(
              CASE
                WHEN INVOICE_STATUS = 'Open Overdue'
                THEN INVOICE_TOTAL
                ELSE 0
              END
            ) AS OPEN_OVERDUE_AMOUNT,

            COUNTIF(
              INVOICE_STATUS = 'Open Overdue'
            ) AS OPEN_OVERDUE_COUNT,

            SUM(
              CASE
                WHEN INVOICE_STATUS = 'Pending Overdue'
                THEN INVOICE_TOTAL
                ELSE 0
              END
            ) AS PENDING_OVERDUE_AMOUNT,

            COUNTIF(
              INVOICE_STATUS = 'Pending Overdue'
            ) AS PENDING_OVERDUE_COUNT,

            SUM(
              CASE
                WHEN INVOICE_STATUS = 'Pending On Time'
                THEN INVOICE_TOTAL
                ELSE 0
              END
            ) AS PENDING_ON_TIME_AMOUNT,

            COUNTIF(
              INVOICE_STATUS = 'Pending On Time'
            ) AS PENDING_ON_TIME_COUNT,

            SUM(
              CASE
                WHEN INVOICE_STATUS = 'Open On Time'
                THEN INVOICE_TOTAL
                ELSE 0
              END
            ) AS OPEN_ON_TIME_AMOUNT,

            COUNTIF(
              INVOICE_STATUS = 'Open On Time'
            ) AS OPEN_ON_TIME_COUNT

          FROM dashboard_data

          ${filterWhere};
        `,
        binds
      },
      "SPO"
    );

    // PROCESSING STATUS
    const processingRows = await executeQuery(
      {
        sql: `
          ${dashboardBaseQuery}

          SELECT
            PROCESSING_STATUS,
            COUNT(*) AS INVOICE_COUNT

          FROM dashboard_data

          ${filterWhere}

          GROUP BY PROCESSING_STATUS

          ORDER BY
            CASE PROCESSING_STATUS
              WHEN 'Processed' THEN 1
              WHEN 'Processing' THEN 2
              WHEN 'Unprocessed' THEN 3
              ELSE 99
            END;
        `,
        binds
      },
      "SPO"
    );

    // AGING BUCKET
    const agingRows = await executeQuery(
      {
        sql: `
          ${dashboardBaseQuery}

          SELECT
            AGING_BUCKET,
            COUNT(*) AS INVOICE_COUNT,
            SUM(INVOICE_TOTAL) AS INVOICE_TOTAL

          FROM dashboard_data

          WHERE AGING_BUCKET IS NOT NULL
          ${filterAnd}

          GROUP BY AGING_BUCKET

          ORDER BY
            CASE AGING_BUCKET
              WHEN 'Missing Due Date' THEN 1
              WHEN 'Pending On Time' THEN 2
              WHEN '0-30 days' THEN 3
              WHEN '31-60 days' THEN 4
              WHEN '61-90 days' THEN 5
              WHEN '90+ days' THEN 6
              ELSE 99
            END;
        `,
        binds
      },
      "SPO"
    );

    // INVOICE TABLE
    const invoiceRows = await executeQuery(
      {
        sql: `
          ${dashboardBaseQuery}

          SELECT
            ROW_ID,
            INVOICE_STATUS,
            IS_IT_IN_SAP,
            ORGANIZATION_ELEMENT_NAME,
            COMPANY_CODE,
            SUPPLIER_CODE,
            INVOICE_NUMBER,
            STATEMENT_MONTH,
            PAYMENT_DUE_DATE,
            PAYMENT_DATE,
            PROCESSING_STATUS,
            INVOICE_TOTAL,
            DAYS_OVERDUE

          FROM dashboard_data

          ${filterWhere}

          ORDER BY
            INVOICE_STATUS,
            IS_IT_IN_SAP,
            ORGANIZATION_ELEMENT_NAME,
            COMPANY_CODE,
            SUPPLIER_CODE,
            INVOICE_NUMBER;
        `,
        binds
      },
      "SPO"
    );

    // BUILD RESPONSE
    const kpi = kpiRows[0] || {};

    const response = {
      kpis: {
        totalUnpaid: {
          amount: kpi.TOTAL_UNPAID_AMOUNT || 0,
          count: kpi.TOTAL_UNPAID_COUNT || 0
        },

        openOverdue: {
          amount: kpi.OPEN_OVERDUE_AMOUNT || 0,
          count: kpi.OPEN_OVERDUE_COUNT || 0
        },

        pendingOverdue: {
          amount: kpi.PENDING_OVERDUE_AMOUNT || 0,
          count: kpi.PENDING_OVERDUE_COUNT || 0
        },

        pendingOnTime: {
          amount: kpi.PENDING_ON_TIME_AMOUNT || 0,
          count: kpi.PENDING_ON_TIME_COUNT || 0
        },

        openOnTime: {
          amount: kpi.OPEN_ON_TIME_AMOUNT || 0,
          count: kpi.OPEN_ON_TIME_COUNT || 0
        }
      },

      processingStatus: processingRows.map((row) => ({
        status: row.PROCESSING_STATUS,
        count: row.INVOICE_COUNT
      })),

      aging: agingRows.map((row) => ({
        bucket: row.AGING_BUCKET,
        count: row.INVOICE_COUNT,
        amount: row.INVOICE_TOTAL || 0
      })),

      invoices: invoiceRows
    };

    res.json(response);

  } catch (err) {
    console.error(
      "Error in /api/spo/dashboard/open:",
      err
    );

    res.status(500).json({
      error: String(err?.message || err)
    });
  }
});


router.get("/dashboard/closed", async (req, res) => {
  try {
    const { statementMonth, agingBucket } = req.query;

    const statementMonths = statementMonth
      ? String(statementMonth).split(",").filter(Boolean)
      : [];

    const agingBuckets = agingBucket
      ? String(agingBucket).split(",").filter(Boolean)
      : [];

    const filterConditions = [];
    const binds = [];

    if (statementMonths.length > 0) {
      const placeholders = statementMonths.map(() => "?").join(",");
      filterConditions.push(`STATEMENT_MONTH IN (${placeholders})`);
      binds.push(...statementMonths);
    }

    if (agingBuckets.length > 0) {
      const placeholders = agingBuckets.map(() => "?").join(",");
      filterConditions.push(`CLOSED_AGING_BUCKET IN (${placeholders})`);
      binds.push(...agingBuckets);
    }

    const filterWhere = filterConditions.length
      ? `WHERE ${filterConditions.join(" AND ")}`
      : "";

    // Closed dashboard uses its own aging categories.
    // Keep the base dashboard query unchanged.
    const closedBaseQuery = `
      ${dashboardBaseQuery},

      closed_data AS (
        SELECT
          *,
          CASE
            WHEN INVOICE_STATUS = 'Paid On Time'
              THEN 'Paid On Time'
            WHEN INVOICE_STATUS = 'Paid Late'
              AND DAYS_OVERDUE BETWEEN 0 AND 30
              THEN '0-30 days'
            WHEN INVOICE_STATUS = 'Paid Late'
              AND DAYS_OVERDUE BETWEEN 31 AND 60
              THEN '31-60 days'
            WHEN INVOICE_STATUS = 'Paid Late'
              AND DAYS_OVERDUE BETWEEN 61 AND 90
              THEN '61-90 days'
            WHEN INVOICE_STATUS = 'Paid Late'
              AND DAYS_OVERDUE > 90
              THEN '90+ days'
            ELSE 'Null'
          END AS CLOSED_AGING_BUCKET
        FROM dashboard_data
        WHERE INVOICE_STATUS IN ('Paid Late', 'Paid On Time')
      ),

      filtered_closed_data AS (
        SELECT *
        FROM closed_data
        ${filterWhere}
      )
    `;

    // KPI DATA
    const kpiRows = await executeQuery(
      {
        sql: `
          ${closedBaseQuery}

          SELECT
            COALESCE(SUM(
              CASE WHEN INVOICE_STATUS = 'Paid Late'
                THEN INVOICE_TOTAL ELSE 0 END
            ), 0) AS PAID_LATE_AMOUNT,

            COUNTIF(INVOICE_STATUS = 'Paid Late')
              AS PAID_LATE_COUNT,

            COALESCE(SUM(
              CASE WHEN INVOICE_STATUS = 'Paid On Time'
                THEN INVOICE_TOTAL ELSE 0 END
            ), 0) AS PAID_ON_TIME_AMOUNT,

            COUNTIF(INVOICE_STATUS = 'Paid On Time')
              AS PAID_ON_TIME_COUNT,

            SAFE_DIVIDE(
              COUNTIF(INVOICE_STATUS = 'Paid Late'),
              COUNT(*)
            ) AS LATE_INVOICE_PERCENTAGE,

            AVG(
              CASE WHEN INVOICE_STATUS = 'Paid Late'
                THEN DAYS_OVERDUE ELSE NULL END
            ) AS AVERAGE_DAYS_LATE

          FROM filtered_closed_data;
        `,
        binds
      },
      "SPO"
    );

    // AVERAGE DAYS OVERDUE PER PAYMENT MONTH
    const paymentDateRows = await executeQuery(
      {
        sql: `
          ${closedBaseQuery}

          SELECT
            DATE_TRUNC(
              SAFE_CAST(PAYMENT_DATE AS DATE),
              MONTH
            ) AS PAYMENT_MONTH,

            AVG(DAYS_OVERDUE) AS AVERAGE_DAYS_OVERDUE

          FROM filtered_closed_data

          WHERE INVOICE_STATUS = 'Paid Late'
            AND PAYMENT_DATE IS NOT NULL

          GROUP BY PAYMENT_MONTH
          ORDER BY PAYMENT_MONTH;
        `,
        binds
      },
      "SPO"
    );

    // CLOSED AGING CHART
    const closedAgingRows = await executeQuery(
      {
        sql: `
          ${closedBaseQuery},

          bucket_scaffold AS (
            SELECT 'Null' AS BUCKET, 1 AS SORT_ORDER
            UNION ALL SELECT '0-30 days', 2
            UNION ALL SELECT '31-60 days', 3
            UNION ALL SELECT '61-90 days', 4
            UNION ALL SELECT '90+ days', 5
            UNION ALL SELECT 'Missing Due Date', 6
            UNION ALL SELECT 'Paid On Time', 7
          )

          SELECT
            s.BUCKET,
            COUNT(a.CLOSED_AGING_BUCKET) AS INVOICE_COUNT,
            COALESCE(SUM(a.INVOICE_TOTAL), 0) AS INVOICE_TOTAL

          FROM bucket_scaffold s

          LEFT JOIN filtered_closed_data a
            ON s.BUCKET = a.CLOSED_AGING_BUCKET

          GROUP BY s.BUCKET, s.SORT_ORDER
          ORDER BY s.SORT_ORDER;
        `,
        binds
      },
      "SPO"
    );

    // Filter options must not depend on selected filters.
    const filterOptionRows = await executeQuery(
      {
        sql: `
          ${dashboardBaseQuery}

          SELECT DISTINCT STATEMENT_MONTH
          FROM dashboard_data
          WHERE STATEMENT_MONTH IS NOT NULL
            AND TRIM(CAST(STATEMENT_MONTH AS STRING)) != ''
          ORDER BY STATEMENT_MONTH

        `
      },
      "SPO"
    );

    const kpi = kpiRows[0] || {};

    res.json({
      kpis: {
        paidLate: {
          amount: Number(kpi.PAID_LATE_AMOUNT) || 0,
          count: Number(kpi.PAID_LATE_COUNT) || 0
        },
        paidOnTime: {
          amount: Number(kpi.PAID_ON_TIME_AMOUNT) || 0,
          count: Number(kpi.PAID_ON_TIME_COUNT) || 0
        },
        lateInvoicesPercentage:
          Number(kpi.LATE_INVOICE_PERCENTAGE) || 0,
        averageDaysLate:
          Number(kpi.AVERAGE_DAYS_LATE) || 0
      },

      paymentDateData: paymentDateRows.map((row) => ({
        paymentMonth: row.PAYMENT_MONTH
          ? String(row.PAYMENT_MONTH).slice(0, 10)
          : "",
        averageDaysOverdue:
          Number(row.AVERAGE_DAYS_OVERDUE) || 0
      })),

      aging: closedAgingRows.map((row) => ({
        bucket: row.BUCKET,
        count: Number(row.INVOICE_COUNT) || 0,
        amount: Number(row.INVOICE_TOTAL) || 0
      })),

      filterOptions: {
        statementMonths: filterOptionRows.map(
          (row) => row.STATEMENT_MONTH
        )
      }
    });
  } catch (err) {
    console.error("Error in /api/spo/dashboard/closed:", err);
    res.status(500).json({
      error: String(err?.message || err)
    });
  }
});


router.post("/save", async (req, res) => {
  const { edits } = req.body;
  const user = req.body.user;

  if (!edits || !Array.isArray(edits) || edits.length === 0) {
    return res.status(400).json({ error: "No modifications." });
  }

  try {
    // Column types are needed: BigQuery does not coerce automatically,
    // so a string cannot simply be written into a FLOAT64 / DATE column.
    const columns = await getColumnTypes("SPO_DATABASE");

    for (const edit of edits) {
      const { ROW_ID, ...fields } = edit;
      if (!ROW_ID) continue;

      const sets = [];
      const binds = [];

      Object.entries(fields).forEach(([key, value]) => {
        if (key === "ROW_ID") return;
        if (key === "LAST_MODIFIED_BY" || key === "LAST_MODIFIED_AT") return;

        // Only accept columns that really exist (also a safeguard: the key comes
        // from the request body and ends up in the SQL).
        const column = columns.get(String(key).toUpperCase());
        if (!column) return;

        const isStringColumn = String(column.type).toUpperCase().startsWith("STRING");

        // Backticks, not double quotes: in BigQuery "..." is a string literal.
        sets.push(`\`${column.name}\` = ${placeholderFor(column.type)}`);
        binds.push(
          isStringColumn && value !== null && value !== undefined ? String(value) : value
        );
      });

      if (sets.length === 0) continue;

      sets.push("LAST_MODIFIED_BY = ?");
      binds.push(user === undefined ? null : String(user));

      sets.push("LAST_MODIFIED_AT = CURRENT_TIMESTAMP()");

      binds.push(ROW_ID);

      // ROW_ID is FLOAT64 but the bind may be a string -> cast.
      const sql = `
        UPDATE SPO_DATABASE
        SET ${sets.join(", ")}
        WHERE ROW_ID = SAFE_CAST(? AS FLOAT64)
      `;

      await executeQuery({ sql, binds }, "SPO");
    }

    res.json({ message: "Succesfully saved to BigQuery." });
  } catch (err) {
  console.error("SPO SAVE ERROR MESSAGE:", err.message);
  console.error("SPO SAVE FULL ERROR:", err);

  res.status(500).json({
    error: "Couldn't save the data.",
    details: err.message,
  });
}
});



module.exports = router;