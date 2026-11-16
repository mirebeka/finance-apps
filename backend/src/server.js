const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const express = require("express");
const cors = require("cors");

const { projectId, datasetId, location, executeQuery } = require("./db/bigquery");

const app = express();
const port = Number(process.env.PORT) || 5000;

const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:3001,http://localhost:3002,http://localhost:3003")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "1mb" }));

app.use("/api/spo", require("./routes/spo/login"));
app.use("/api/spo", require("./routes/spo/main"));

app.use("/api/modifications", require("./routes/skynet/modifications"));
app.use("/api/Skynet/statistics", require("./routes/skynet/statistics"));
app.use("/api/wishlist", require("./routes/skynet/Wishlist"));
app.use("/api", require("./routes/skynet/ADS"));
app.use("/api", require("./routes/skynet/SOP"));

app.use("/api/assetpo", require("./routes/assetpo/assetPORoutes"));

app.get("/api/health", async (_req, res) => {
  try {
    await executeQuery({ sql: "SELECT 1 AS ok" }, "health");
    res.json({ status: "ok", bigquery: `${projectId}.${datasetId} (${location})` });
  } catch (err) {
    res.status(503).json({ status: "error", message: String(err?.message || err) });
  }
});

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
  console.log(`BigQuery target: ${projectId}.${datasetId} (${location})`);
});
