const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });

const { BigQuery } = require("@google-cloud/bigquery");

const clean = (value) => String(value ?? "").trim().replace(/^["']|["']$/g, "");

const projectId = clean(process.env.BIGQUERY_PROJECT_ID);
const datasetId = clean(process.env.BIGQUERY_DATASET) || "finance_apps";
const location = clean(process.env.BIGQUERY_LOCATION) || "US";
// per-query cost cap
const maximumBytesBilled = clean(process.env.BIGQUERY_MAX_BYTES_BILLED) || String(1024 ** 3);
const logQueries = clean(process.env.LOG_QUERIES).toLowerCase() === "true";

if (!projectId) {
  throw new Error("BIGQUERY_PROJECT_ID is missing. Copy backend/.env.example to backend/.env and fill it in.");
}

const keyFilename = clean(process.env.GOOGLE_APPLICATION_CREDENTIALS);

const bigquery = new BigQuery({
  projectId,
  location,
  ...(keyFilename ? { keyFilename: path.resolve(keyFilename) } : {}),
});

const defaultDataset = { projectId, datasetId };

function bqParamType(value) {
  if (typeof value === "string") return "STRING";
  if (typeof value === "boolean") return "BOOL";
  if (typeof value === "number") return Number.isInteger(value) ? "INT64" : "FLOAT64";
  if (value instanceof Date) return "TIMESTAMP";
  return "STRING";
}

const WRAPPER_TYPES = new Set([
  "BigQueryDate",
  "BigQueryDatetime",
  "BigQueryTime",
  "BigQueryTimestamp",
  "BigQueryInt",
]);

// dates/numbers come back wrapped in objects, flatten them
function unwrapBqValue(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object") return value;
  if (Buffer.isBuffer(value)) return value;
  if (Array.isArray(value)) return value.map(unwrapBqValue);

  const isWrapper =
    WRAPPER_TYPES.has(value.constructor && value.constructor.name) ||
    (Object.keys(value).length === 1 && "value" in value && typeof value.value !== "object");
  if (isWrapper) return value.value;

  if (typeof value.toFixed === "function") return Number(value.toString());

  const plain = {};
  for (const [key, nested] of Object.entries(value)) plain[key] = unwrapBqValue(nested);
  return plain;
}

async function executeQuery({ sql, binds = [], types } = {}, systemName = "app") {
  if (!sql) throw new Error("executeQuery was called without an sql string");

  const params = (Array.isArray(binds) ? binds : [binds]).map((v) => (v === undefined ? null : v));

  if (logQueries) logMessage(sql, systemName);

  const request = { query: sql, location, defaultDataset, maximumBytesBilled };
  if (params.length) {
    request.params = params;
    request.types = types || params.map(bqParamType);
  }

  const [rows] = await bigquery.query(request);
  return rows.map(unwrapBqValue);
}

const schemaCache = new Map();

async function getColumnTypes(tableName) {
  if (schemaCache.has(tableName)) return schemaCache.get(tableName);

  const [rows] = await bigquery.query({
    query: `
      SELECT column_name, data_type
      FROM \`${projectId}.${datasetId}.INFORMATION_SCHEMA.COLUMNS\`
      WHERE table_name = ?
    `,
    params: [tableName],
    types: ["STRING"],
    location,
  });

  if (!rows.length) throw new Error(`Table ${tableName} was not found in ${datasetId}`);

  const columns = new Map(
    rows.map((row) => [String(row.column_name).toUpperCase(), { name: row.column_name, type: row.data_type }])
  );
  schemaCache.set(tableName, columns);
  return columns;
}

function placeholderFor(dataType) {
  const type = String(dataType || "STRING").toUpperCase();
  if (type.startsWith("STRING")) return "?";
  return `SAFE_CAST(? AS ${type})`;
}

function logMessage(message, systemName = "app") {
  console.log(`[${new Date().toISOString()}] [${systemName}] ${message}`);
}

module.exports = {
  bigquery,
  projectId,
  datasetId,
  location,
  executeQuery,
  getColumnTypes,
  placeholderFor,
  logMessage,
};
