#!/usr/bin/env node

const fs = require("node:fs/promises");
const path = require("node:path");
const { Client } = require("pg");

const MAQAF = "־";
const PASEQ = "׀";

const SPI_TO_SYMBOL = {
  "spi-pe2": "פ",
  "spi-pe3": "פ",
  "spi-samekh2": "ס",
  "spi-samekh3": "ס",
  "spi-invnun": "׆",
};

const CHRISTIAN_OT_BOOK_ORDER = [
  "Gen",
  "Exod",
  "Lev",
  "Num",
  "Deut",
  "Josh",
  "Judg",
  "Ruth",
  "1Sam",
  "2Sam",
  "1Kgs",
  "2Kgs",
  "1Chr",
  "2Chr",
  "Ezra",
  "Neh",
  "Esth",
  "Job",
  "Ps",
  "Prov",
  "Eccl",
  "Song",
  "Isa",
  "Jer",
  "Lam",
  "Ezek",
  "Dan",
  "Hos",
  "Joel",
  "Amos",
  "Obad",
  "Jonah",
  "Mic",
  "Nah",
  "Hab",
  "Zeph",
  "Hag",
  "Zech",
  "Mal",
];

const BOOK_NUMBER_BY_OSIS = new Map(
  CHRISTIAN_OT_BOOK_ORDER.map((book, index) => [book, index + 1]),
);

function toNumericVerseId(osisID) {
  const match = /^([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)$/u.exec(osisID);
  if (!match) {
    throw new Error(`Invalid verse osisID format: ${osisID}`);
  }

  const [, book, chapter, verse] = match;
  const bookNumber = BOOK_NUMBER_BY_OSIS.get(book);

  if (!bookNumber) {
    throw new Error(`Unknown book in osisID: ${osisID}`);
  }

  return `${String(bookNumber).padStart(2, "0")}${chapter.padStart(3, "0")}${verse.padStart(3, "0")}`;
}

function parseArgs(argv) {
  const args = {
    inputDir: path.join(process.cwd(), "src/data/mam-hebrew"),
    out: path.join(process.cwd(), "mam-hebrew-words.jsonl"),
    format: "jsonl",
    toDb: false,
    table: "mam",
    truncate: true,
    noFile: false,
    batchSize: 5000,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--input-dir") {
      args.inputDir = path.resolve(argv[i + 1]);
      i += 1;
      continue;
    }

    if (arg === "--out") {
      args.out = path.resolve(argv[i + 1]);
      i += 1;
      continue;
    }

    if (arg === "--format") {
      args.format = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === "--to-db") {
      args.toDb = true;
      continue;
    }

    if (arg === "--table") {
      args.table = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === "--no-truncate") {
      args.truncate = false;
      continue;
    }

    if (arg === "--no-file") {
      args.noFile = true;
      continue;
    }

    if (arg === "--batch-size") {
      args.batchSize = Number(argv[i + 1]);
      i += 1;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (args.format !== "jsonl" && args.format !== "csv") {
    throw new Error(`Unsupported format: ${args.format}`);
  }

  if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(args.table)) {
    throw new Error(`Invalid table name: ${args.table}`);
  }

  if (!Number.isInteger(args.batchSize) || args.batchSize <= 0) {
    throw new Error(`Invalid batch size: ${args.batchSize}`);
  }

  if (args.noFile && !args.toDb) {
    throw new Error("Nothing to do: --no-file requires --to-db");
  }

  return args;
}

function printHelp() {
  process.stdout.write(
    [
      "Flatten MAM Hebrew JSON into verse-word rows.",
      "",
      "Usage:",
      "  node src/data/mam-hebrew/flattenMamHebrew.js [options]",
      "",
      "Options:",
      "  --input-dir <path>   Directory with MAM JSON files",
      "  --out <path>         Output file path",
      "  --format <jsonl|csv> Output format (default: jsonl)",
      "  --to-db              Insert rows into PostgreSQL",
      "  --table <name>       Target table name (default: mam)",
      "  --no-truncate        Keep existing rows in target table",
      "  --batch-size <n>     Insert batch size (default: 5000)",
      "  --no-file            Skip file output",
      "  -h, --help           Show this message",
      "",
    ].join("\n"),
  );
}

function tokenize(text) {
  if (!text) {
    return [];
  }

  return text
    .split(/\s+/u)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function csvEscape(value) {
  const stringValue = String(value);
  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replace(/\"/g, '""')}"`;
  }

  return stringValue;
}

function isVerseNode(node) {
  return (
    node &&
    typeof node === "object" &&
    !Array.isArray(node) &&
    typeof node.osisID === "string" &&
    node.type === undefined &&
    (Object.hasOwn(node, "text") || Object.hasOwn(node, "contents"))
  );
}

function extractPlainText(node) {
  if (!node || typeof node !== "object") {
    return "";
  }

  if (Array.isArray(node)) {
    return node.map(extractPlainText).join(" ");
  }

  if (typeof node.text === "string") {
    return node.text;
  }

  if (Array.isArray(node.contents)) {
    return node.contents.map(extractPlainText).join(" ");
  }

  return "";
}

function extractContinuousText(node) {
  if (!node || typeof node !== "object") {
    return "";
  }

  if (Array.isArray(node)) {
    return node.map(extractContinuousText).join("");
  }

  let text = "";

  if (typeof node.text === "string") {
    text += node.text;
  }

  if (Array.isArray(node.contents)) {
    text += node.contents.map(extractContinuousText).join("");
  }

  return text;
}

function appendMaqafInsideWrapper(word) {
  if (word.startsWith("[") && word.endsWith("]")) {
    return `[${word.slice(1, -1)}${MAQAF}]`;
  }

  if (word.startsWith("(") && word.endsWith(")")) {
    return `(${word.slice(1, -1)}${MAQAF})`;
  }

  return `${word}${MAQAF}`;
}

function flattenVerse(osisID, verseNode) {
  const verseID = toNumericVerseId(osisID);
  const rows = [];

  function pushToken(word, sourceType, isGoodEnding = false) {
    rows.push({
      verse_id: verseID,
      word,
      shirah_space: 0,
      is_good_ending: isGoodEnding,
      source_type: sourceType,
    });
  }

  function getLastRow() {
    if (rows.length === 0) {
      return null;
    }

    return rows[rows.length - 1];
  }

  function emitText(text, sourceType, isGoodEnding = false) {
    for (const token of tokenize(text)) {
      pushToken(token, sourceType, isGoodEnding);
    }
  }

  function emitWrappedText(text, opening, closing, sourceType) {
    const tokens = tokenize(text);
    for (const token of tokens) {
      pushToken(`${opening}${token}${closing}`, sourceType);
    }
  }

  function emitSpi(type) {
    const symbol = SPI_TO_SYMBOL[type];
    if (!symbol) {
      return;
    }

    if (type === "spi-invnun") {
      const lastRow = getLastRow();
      if (lastRow && lastRow.source_type.startsWith("spi-")) {
        lastRow.word = `${lastRow.word}${symbol}`;
        return;
      }
    }

    pushToken(symbol, type);
  }

  function appendPaseq() {
    const lastRow = getLastRow();
    if (!lastRow) {
      return;
    }

    lastRow.word = `${lastRow.word} ${PASEQ}`;
  }

  function appendMaqafToLast() {
    const lastRow = getLastRow();
    if (!lastRow) {
      return;
    }

    lastRow.word = appendMaqafInsideWrapper(lastRow.word);
  }

  function setShirahSpace() {
    const lastRow = getLastRow();
    if (!lastRow) {
      return;
    }

    lastRow.shirah_space = 1;
  }

  function walk(node, isGoodEnding = false) {
    if (!node) {
      return;
    }

    if (Array.isArray(node)) {
      for (const child of node) {
        walk(child, isGoodEnding);
      }
      return;
    }

    if (typeof node !== "object") {
      return;
    }

    const type = node.type;

    if (type === "sdt-note") {
      return;
    }

    if (type === "scrdfftar") {
      walk(node.contents, isGoodEnding);
      return;
    }

    if (type === "text") {
      emitText(node.text, "text", isGoodEnding);
      return;
    }

    if (type === "good-ending") {
      if (typeof node.text === "string") {
        emitText(node.text, "good-ending", true);
      }
      walk(node.contents, true);
      return;
    }

    if (type === "lp-paseq" || type === "lp-legarmeih") {
      appendPaseq();
      return;
    }

    if (type === "implicit-maqaf") {
      appendMaqafToLast();
      return;
    }

    if (type === "shirah-space") {
      setShirahSpace();
      return;
    }

    if (type === "kq") {
      const ketivNode =
        Array.isArray(node.contents) ?
          node.contents.find((child) => child?.type === "kq-k")
        : null;
      const qereNode =
        Array.isArray(node.contents) ?
          node.contents.find((child) => child?.type === "kq-q")
        : null;

      emitWrappedText(extractPlainText(ketivNode), "[", "]", "kq-k");
      emitWrappedText(extractPlainText(qereNode), "(", ")", "kq-q");
      return;
    }

    if (type === "kq-trivial") {
      emitText(node.text, "kq-trivial", isGoodEnding);
      return;
    }

    if (type === "kq-q-velo-k") {
      emitWrappedText(node.text, "(", ")", "kq-q-velo-k");
      return;
    }

    if (type === "kq-k-velo-q") {
      emitWrappedText(node.text, "[", "]", "kq-k-velo-q");
      return;
    }

    if (type === "kq-k-velo-q-maq") {
      appendMaqafToLast();
      return;
    }

    if (type === "cant-all-three") {
      if (Array.isArray(node.contents)) {
        const alefBranch = node.contents.find(
          (child) => child?.type === "cant-alef",
        );
        walk(alefBranch, isGoodEnding);
      }
      return;
    }

    if (type === "slh-word") {
      emitText(extractContinuousText(node), "slh-word", isGoodEnding);
      return;
    }

    if (
      type === "cant-alef" ||
      type === "cant-bet" ||
      type === "cant-combined" ||
      type === "letter-large" ||
      type === "letter-small" ||
      type === "letter-hung" ||
      type === "sdt-target"
    ) {
      if (typeof node.text === "string") {
        emitText(node.text, type, isGoodEnding);
      }
      walk(node.contents, isGoodEnding);
      return;
    }

    if (type && Object.hasOwn(SPI_TO_SYMBOL, type)) {
      emitSpi(type);
      return;
    }

    if (typeof node.text === "string") {
      emitText(node.text, type ?? "text", isGoodEnding);
    }

    if (Array.isArray(node.contents)) {
      walk(node.contents, isGoodEnding);
    }
  }

  if (typeof verseNode.text === "string") {
    emitText(verseNode.text, "verse-text");
  }

  if (Array.isArray(verseNode.contents)) {
    walk(verseNode.contents);
  }

  for (let i = 0; i < rows.length; i += 1) {
    rows[i].word_index = i + 1;
  }

  return rows;
}

function collectVerses(node, callback) {
  if (!node) {
    return;
  }

  if (Array.isArray(node)) {
    for (const child of node) {
      collectVerses(child, callback);
    }
    return;
  }

  if (typeof node !== "object") {
    return;
  }

  if (isVerseNode(node)) {
    callback(node.osisID, node);
    return;
  }

  for (const value of Object.values(node)) {
    collectVerses(value, callback);
  }
}

async function flattenAllFiles(inputDir) {
  const entries = await fs.readdir(inputDir);
  const jsonFiles = entries
    .filter((entry) => entry.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b));

  const allRows = [];

  for (const fileName of jsonFiles) {
    const filePath = path.join(inputDir, fileName);
    const raw = await fs.readFile(filePath, "utf8");
    const data = JSON.parse(raw);

    collectVerses(data, (verseID, verseNode) => {
      const verseRows = flattenVerse(verseID, verseNode);
      allRows.push(...verseRows);
    });
  }

  return allRows;
}

async function writeOutput(rows, outputPath, format) {
  if (format === "jsonl") {
    const body = rows.map((row) => JSON.stringify(row)).join("\n");
    await fs.writeFile(outputPath, `${body}\n`, "utf8");
    return;
  }

  const header = [
    "verse_id",
    "word_index",
    "word",
    "shirah_space",
    "is_good_ending",
    "source_type",
  ];
  const lines = [header.join(",")];

  for (const row of rows) {
    const values = [
      row.verse_id,
      row.word_index,
      row.word,
      row.shirah_space,
      row.is_good_ending,
      row.source_type,
    ];
    lines.push(values.map(csvEscape).join(","));
  }

  await fs.writeFile(outputPath, `${lines.join("\n")}\n`, "utf8");
}

async function insertRowsIntoDatabase(rows, tableName, batchSize, truncate) {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL env var missing");
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  try {
    await client.query("begin");

    await client.query(`
      create table if not exists ${tableName} (
        verse_id text not null,
        word_index integer not null,
        word text not null,
        shirah_space integer not null default 0,
        is_good_ending boolean not null default false,
        source_type text not null
      )
    `);

    if (truncate) {
      await client.query(`truncate table ${tableName}`);
    }

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);

      await client.query(
        `
          insert into ${tableName} (
            verse_id,
            word_index,
            word,
            shirah_space,
            is_good_ending,
            source_type
          )
          select *
          from unnest(
            $1::text[],
            $2::integer[],
            $3::text[],
            $4::integer[],
            $5::boolean[],
            $6::text[]
          )
        `,
        [
          batch.map((row) => row.verse_id),
          batch.map((row) => row.word_index),
          batch.map((row) => row.word),
          batch.map((row) => row.shirah_space),
          batch.map((row) => row.is_good_ending),
          batch.map((row) => row.source_type),
        ],
      );
    }

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rows = await flattenAllFiles(args.inputDir);

  if (!args.noFile) {
    await writeOutput(rows, args.out, args.format);
    process.stdout.write(
      `Wrote ${rows.length} rows to ${args.out} (${args.format})\n`,
    );
  }

  if (args.toDb) {
    await insertRowsIntoDatabase(
      rows,
      args.table,
      args.batchSize,
      args.truncate,
    );
    process.stdout.write(
      `Inserted ${rows.length} rows into table ${args.table}\n`,
    );
  }
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
});
