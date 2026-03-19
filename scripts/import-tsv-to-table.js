const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { pipeline } = require("stream/promises");
const { Pool } = require("pg");
const { from: copyFrom } = require("pg-copy-streams");

function quoteIdent(identifier) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function normalizeColumnName(name) {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!normalized) {
    throw new Error(`Unable to normalize column name: "${name}"`);
  }

  return /^[0-9]/.test(normalized) ? `_${normalized}` : normalized;
}

function normalizeUniqueColumns(columns) {
  const seen = new Map();

  return columns.map((column) => {
    const base = normalizeColumnName(column);
    const index = seen.get(base) ?? 0;
    seen.set(base, index + 1);
    return index === 0 ? base : `${base}_${index + 1}`;
  });
}

function normalizeTableName(name) {
  const normalized = normalizeColumnName(name);
  return normalized;
}

async function readHeader(filePath) {
  const stream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity,
  });

  try {
    for await (const line of rl) {
      if (line.trim() === "") {
        continue;
      }
      return line;
    }
  } finally {
    rl.close();
    stream.destroy();
  }

  throw new Error(`TSV file is empty: ${filePath}`);
}

async function importTsv({ filePath, tableName }) {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL env var missing");
  }

  const headerLine = await readHeader(filePath);
  const rawColumns = headerLine.split("\t");
  const columns = normalizeUniqueColumns(rawColumns);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  const client = await pool.connect();

  const quotedTable = quoteIdent(tableName);
  const quotedColumns = columns.map(quoteIdent);
  const createColumnsSql = quotedColumns
    .map((column) => `${column} text`)
    .join(", ");

  try {
    await client.query("BEGIN");

    await client.query(`create table ${quotedTable} (${createColumnsSql})`);

    const copySql = `COPY ${quotedTable} (${quotedColumns.join(", ")}) FROM STDIN WITH (FORMAT csv, DELIMITER E'\\t', HEADER true)`;
    const sourceStream = fs.createReadStream(filePath);
    const destinationStream = client.query(copyFrom(copySql));

    await pipeline(sourceStream, destinationStream);

    await client.query("COMMIT");

    const countResult = await client.query(
      `select count(*) as count from ${quotedTable}`,
    );

    const count = Number(countResult.rows[0].count);
    console.log(
      `Imported ${count.toLocaleString("en-US")} rows into table ${tableName}.`,
    );
    console.log(`Columns: ${columns.join(", ")}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

function getArgs() {
  const [, , fileArg, ...flags] = process.argv;

  if (!fileArg) {
    throw new Error(
      "Usage: node scripts/import-tsv-to-table.js <path-to-tsv> [--table=<table_name>]",
    );
  }

  const tableFlag = flags.find((flag) => flag.startsWith("--table="));
  const tableFromFlag = tableFlag ? tableFlag.slice("--table=".length) : null;
  const fileName = path.basename(fileArg, path.extname(fileArg));
  const tableName = normalizeTableName(tableFromFlag ?? fileName);

  return {
    filePath: path.resolve(fileArg),
    tableName,
  };
}

async function run() {
  const args = getArgs();
  await importTsv(args);
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
