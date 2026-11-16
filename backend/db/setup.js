const { bigquery, projectId, datasetId, location } = require("../src/db/bigquery");
const schema = require("./schema");

(async () => {
  const dataset = bigquery.dataset(datasetId);
  const [exists] = await dataset.exists();
  if (!exists) {
    await bigquery.createDataset(datasetId, { location });
    console.log(`Created dataset ${projectId}.${datasetId} (${location})`);
  }

  for (const [name, fields] of Object.entries(schema)) {
    const table = dataset.table(name);
    const [tableExists] = await table.exists();
    if (tableExists) await table.delete();
    await dataset.createTable(name, { schema: { fields } });
    console.log(`Created table ${name} (${fields.length} columns)`);
  }
  console.log("Done. Next: npm run db:seed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
