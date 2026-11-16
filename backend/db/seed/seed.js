const fs = require("fs");
const os = require("os");
const path = require("path");
const { generateAll } = require("./generate");
const schema = require("../schema");

const dry = process.argv.includes("--dry");

(async () => {
  const data = await generateAll();
  const outDir = dry ? path.join(__dirname, "out") : fs.mkdtempSync(path.join(os.tmpdir(), "ops-seed-"));
  fs.mkdirSync(outDir, { recursive: true });

  const files = {};
  for (const [table, rows] of Object.entries(data)) {
    if (!schema[table]) throw new Error(`No schema defined for ${table}`);
    const file = path.join(outDir, `${table}.ndjson`);
    fs.writeFileSync(file, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
    files[table] = file;
    console.log(`${table.padEnd(22)} ${String(rows.length).padStart(5)} rows`);
  }

  if (dry) {
    console.log(`\nDry run: files written to ${outDir}`);
    return;
  }

  const { bigquery, datasetId, projectId } = require("../../src/db/bigquery");
  // load jobs instead of inserts: free, and the rows can be updated right away
  for (const [table, file] of Object.entries(files)) {
    const [job] = await bigquery.dataset(datasetId).table(table).load(file, {
      sourceFormat: "NEWLINE_DELIMITED_JSON",
      writeDisposition: "WRITE_TRUNCATE",
    });
    const errors = job.status && job.status.errors;
    if (errors && errors.length) throw new Error(`Load into ${table} failed: ${JSON.stringify(errors)}`);
    console.log(`Loaded ${table} into ${projectId}.${datasetId}`);
  }
  fs.rmSync(outDir, { recursive: true, force: true });
  console.log("\nSeed finished. Demo logins: admin@example.com / user@example.com, password: DemoPass123!");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
