const fs = require("fs");
const pg = require("pg");
const QueryStream = require("pg-query-stream");
const { pipeline } = require("stream/promises");
const { Transform, Writable } = require("stream");

const NORMALIZE_REGEX = "[ ⇔\\[\\]()\\-<>!''·?\":.˚¶;,]";
const VALID_TRANSFORMATION_TYPES = ["addition", "deletion", "transformation"];

function createEmptyTotalsByType() {
  return {
    addition: { count: 0, wordsRemoved: 0, wordsAdded: 0 },
    deletion: { count: 0, wordsRemoved: 0, wordsAdded: 0 },
    transformation: { count: 0, wordsRemoved: 0, wordsAdded: 0 },
  };
}

function parseArgs() {
  const flags = process.argv.slice(2);

  const fromFlag = flags.find((flag) => flag.startsWith("--from="));
  const fromVerse = fromFlag ? fromFlag.slice("--from=".length) : "40001001";
  const verseFlag = flags.find((flag) => flag.startsWith("--verse="));
  const verse = verseFlag ? verseFlag.slice("--verse=".length) : null;
  const prettyFlag = flags.find(
    (flag) => flag === "--pretty" || flag.startsWith("--pretty="),
  );
  const pretty =
    !prettyFlag ? null
    : prettyFlag === "--pretty" ? "minimal"
    : prettyFlag.slice("--pretty=".length);

  if (pretty !== null && pretty !== "minimal" && pretty !== "full") {
    throw new Error(
      "--pretty must be either --pretty=minimal or --pretty=full",
    );
  }

  const fuzzyFlag = flags.find((flag) => flag.startsWith("--fuzzy="));
  const fuzzy =
    fuzzyFlag ? Number.parseInt(fuzzyFlag.slice("--fuzzy=".length), 10) : 0;
  if (Number.isNaN(fuzzy) || fuzzy < 0) {
    throw new Error("--fuzzy must be a non-negative integer");
  }

  const typesFlag = flags.find((flag) => flag.startsWith("--types="));
  const types =
    !typesFlag ?
      [...VALID_TRANSFORMATION_TYPES]
    : typesFlag
        .slice("--types=".length)
        .split(",")
        .map((type) => type.trim())
        .filter(Boolean);

  const invalidTypes = types.filter(
    (type) => !VALID_TRANSFORMATION_TYPES.includes(type),
  );
  if (invalidTypes.length > 0) {
    throw new Error(
      `Invalid --types values: ${invalidTypes.join(", ")}. Valid values: ${VALID_TRANSFORMATION_TYPES.join(", ")}`,
    );
  }

  const dryRun = flags.includes("--dry-run");
  const sqlOutFlag = flags.find((flag) => flag.startsWith("--sql-out="));
  const sqlOutPath = sqlOutFlag ? sqlOutFlag.slice("--sql-out=".length) : null;

  return {
    fromVerse,
    verse,
    pretty,
    fuzzy,
    types,
    dryRun,
    sqlOutPath,
  };
}

function levenshteinDistanceWithinLimit(a, b, limit) {
  if (a === b) {
    return 0;
  }

  const lengthDifference = Math.abs(a.length - b.length);
  if (lengthDifference >= limit) {
    return limit;
  }

  let previous = new Array(b.length + 1);
  let current = new Array(b.length + 1);

  for (let j = 0; j <= b.length; j++) {
    previous[j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    current[0] = i;
    let minInRow = current[0];

    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;

      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost,
      );

      if (current[j] < minInRow) {
        minInRow = current[j];
      }
    }

    if (minInRow >= limit) {
      return limit;
    }

    const tmp = previous;
    previous = current;
    current = tmp;
  }

  return previous[b.length];
}

function wordsMatch(ourWord, srWord, fuzzy) {
  if (ourWord.normalized === srWord.normalized) {
    return true;
  }

  if (fuzzy <= 0) {
    return false;
  }

  return (
    levenshteinDistanceWithinLimit(
      ourWord.normalized,
      srWord.normalized,
      fuzzy,
    ) < fuzzy
  );
}

function findNextMatch(ourWords, srWords, ourIndex, srIndex, fuzzy) {
  const ourRemaining = ourWords.length - ourIndex - 1;
  const srRemaining = srWords.length - srIndex - 1;
  const maxDistance = ourRemaining + srRemaining;

  for (let distance = 1; distance <= maxDistance; distance++) {
    for (let advanceOur = 0; advanceOur <= distance; advanceOur++) {
      const advanceSr = distance - advanceOur;
      const i = ourIndex + advanceOur;
      const j = srIndex + advanceSr;

      if (i >= ourWords.length || j >= srWords.length) {
        continue;
      }

      if (wordsMatch(ourWords[i], srWords[j], fuzzy)) {
        return { ourIndex: i, srIndex: j };
      }
    }
  }

  return null;
}

function createTransformation(ourSegment, srSegment) {
  if (ourSegment.length === 0 && srSegment.length === 0) {
    return null;
  }

  const type =
    ourSegment.length === 0 ? "addition"
    : srSegment.length === 0 ? "deletion"
    : "transformation";

  return {
    type,
    ourStartPosition: ourSegment[0]?.position ?? null,
    srStartPosition: srSegment[0]?.position ?? null,
    our: ourSegment.map((word) => word.normalized).join(" "),
    sr: srSegment.map((word) => word.normalized).join(" "),
    wordsRemoved: ourSegment.length,
    wordsAdded: srSegment.length,
    ourPositions: ourSegment.map((word) => word.position),
    srPositions: srSegment.map((word) => word.position),
  };
}

function calculateTotalsByType(transformations) {
  const totalsByType = createEmptyTotalsByType();

  for (const transformation of transformations) {
    const bucket = totalsByType[transformation.type];
    bucket.count += 1;
    bucket.wordsRemoved += transformation.wordsRemoved;
    bucket.wordsAdded += transformation.wordsAdded;
  }

  return totalsByType;
}

function addTotals(targetTotals, sourceTotals) {
  for (const type of VALID_TRANSFORMATION_TYPES) {
    targetTotals[type].count += sourceTotals[type].count;
    targetTotals[type].wordsRemoved += sourceTotals[type].wordsRemoved;
    targetTotals[type].wordsAdded += sourceTotals[type].wordsAdded;
  }
}

function formatWordList(words, highlightedPositions = new Set()) {
  return words
    .map((word) => {
      const token = `${word.position},${word.normalized}`;
      return highlightedPositions.has(word.position) ? `[${token}]` : token;
    })
    .join(" ");
}

function escapeSqlString(value) {
  return value.replace(/'/g, "''");
}

function mapEsnToLemmaId(esnRaw) {
  const esn = String(esnRaw ?? "").trim();
  if (!esn) {
    throw new Error(`Missing ESN value`);
  }

  const digits = esn.replace(/[^0-9]/g, "");
  if (!digits) {
    throw new Error(`Invalid ESN value: ${esn}`);
  }

  const base = digits.length > 1 ? digits.slice(0, -1) : "0";
  const suffix = digits.slice(-1);
  const padded = base.padStart(4, "0");
  return suffix === "0" ? `G${padded}` : `G${padded}.${suffix}`;
}

class PlanBuilder {
  constructor({ pretty, fuzzy, types }) {
    this.pretty = pretty;
    this.fuzzy = fuzzy;
    this.types = new Set(types);

    this.summary = {
      verses: 0,
      versesWithTransformations: 0,
      versesEmitted: 0,
      totalTransformations: 0,
      totalsByType: createEmptyTotalsByType(),
      wordsToInsertOrUpdate: 0,
      wordsToDelete: 0,
      lemmasToInsert: 0,
      lemmaFormsToInsert: 0,
    };

    this.verseReports = [];
    this.removeWordIds = new Set();
    this.wordsById = new Map();
    this.anchorCounters = new Map();

    this.lemmaByEsn = new Map();
    this.lemmaFormsByEsn = new Map();
    this.formIdByEsnGrammar = new Map();
  }

  addSrWordToLemmaIndexes(word) {
    const esn = String(word.esn ?? "").trim();
    const role = String(word.role ?? "").trim();
    const morphology = String(word.morphology ?? "").trim();
    const grammar = `${role}${morphology}`;

    if (!esn) {
      throw new Error(`Missing ESN for SR word in verse ${word.verse}`);
    }

    if (!this.lemmaByEsn.has(esn)) {
      this.lemmaByEsn.set(esn, {
        id: mapEsnToLemmaId(esn),
        esn,
        lemma: String(word.lemma ?? "").trim(),
      });
    }

    if (!this.lemmaFormsByEsn.has(esn)) {
      this.lemmaFormsByEsn.set(esn, new Set());
    }
    this.lemmaFormsByEsn.get(esn).add(grammar);
  }

  ensureAnchorCounter(anchor) {
    if (!this.anchorCounters.has(anchor)) {
      this.anchorCounters.set(anchor, 0);
    }
  }

  normalizeInsertionAnchor(wordId) {
    if (!wordId) {
      return null;
    }

    return wordId.replace(/-\d{2}$/, "");
  }

  nextInsertedWordId(verse, previousWordId) {
    const anchor =
      this.normalizeInsertionAnchor(previousWordId) ?? `${verse}00`;
    this.ensureAnchorCounter(anchor);
    const next = this.anchorCounters.get(anchor) + 1;
    this.anchorCounters.set(anchor, next);
    return `${anchor}-${String(next).padStart(2, "0")}`;
  }

  setWordState(wordId, srWord) {
    const esn = String(srWord.esn ?? "").trim();
    const role = String(srWord.role ?? "").trim();
    const morphology = String(srWord.morphology ?? "").trim();
    const grammar = `${role}${morphology}`;

    this.wordsById.set(wordId, {
      id: wordId,
      verseId: srWord.verse,
      text: srWord.word,
      formLookupKey: `${esn}|${grammar}`,
      formId: null,
    });
  }

  buildLemmaAndFormRows() {
    const lemmaRows = [...this.lemmaByEsn.values()].sort((a, b) =>
      a.id.localeCompare(b.id),
    );

    const lemmaFormRows = [];

    for (const lemma of lemmaRows) {
      const grammars = [...(this.lemmaFormsByEsn.get(lemma.esn) ?? [])].sort();
      let index = 0;
      for (const grammar of grammars) {
        index += 1;
        const id = `${lemma.id}-${String(index).padStart(3, "0")}`;
        this.formIdByEsnGrammar.set(`${lemma.esn}|${grammar}`, id);
        lemmaFormRows.push({ id, lemmaId: lemma.id, grammar });
      }
    }

    return { lemmaRows, lemmaFormRows };
  }

  resolveWordFormIds() {
    for (const word of this.wordsById.values()) {
      const formId = this.formIdByEsnGrammar.get(word.formLookupKey);
      if (!formId) {
        throw new Error(
          `Missing form id for ESN/grammar ${word.formLookupKey}`,
        );
      }
      word.formId = formId;
    }
  }

  compareVerse(verse, ourWords, srWords) {
    this.summary.verses += 1;

    for (const srWord of srWords) {
      this.addSrWordToLemmaIndexes(srWord);
    }

    let ourIndex = 0;
    let srIndex = 0;
    let previousMappedWordId = null;
    const transformations = [];

    const collectAndMap = (ourSegment, srSegment) => {
      const transformation = createTransformation(ourSegment, srSegment);
      if (transformation) {
        transformations.push(transformation);
      }

      for (const word of ourSegment) {
        this.removeWordIds.add(word.id);
      }

      for (const srWord of srSegment) {
        const insertedId = this.nextInsertedWordId(verse, previousMappedWordId);
        this.setWordState(insertedId, srWord);
        previousMappedWordId = insertedId;
      }
    };

    while (ourIndex < ourWords.length && srIndex < srWords.length) {
      const ourWord = ourWords[ourIndex];
      const srWord = srWords[srIndex];

      if (wordsMatch(ourWord, srWord, this.fuzzy)) {
        this.setWordState(ourWord.id, srWord);
        previousMappedWordId = ourWord.id;
        ourIndex += 1;
        srIndex += 1;
        continue;
      }

      const next = findNextMatch(
        ourWords,
        srWords,
        ourIndex,
        srIndex,
        this.fuzzy,
      );

      if (!next) {
        collectAndMap(ourWords.slice(ourIndex), srWords.slice(srIndex));
        ourIndex = ourWords.length;
        srIndex = srWords.length;
        break;
      }

      collectAndMap(
        ourWords.slice(ourIndex, next.ourIndex),
        srWords.slice(srIndex, next.srIndex),
      );
      ourIndex = next.ourIndex;
      srIndex = next.srIndex;
    }

    collectAndMap(ourWords.slice(ourIndex), srWords.slice(srIndex));

    if (transformations.length === 0) {
      return;
    }

    const filteredTransformations = transformations.filter((t) =>
      this.types.has(t.type),
    );
    if (filteredTransformations.length === 0) {
      return;
    }

    const totalsByType = calculateTotalsByType(filteredTransformations);
    this.summary.versesWithTransformations += 1;
    this.summary.versesEmitted += 1;
    this.summary.totalTransformations += filteredTransformations.length;
    addTotals(this.summary.totalsByType, totalsByType);

    this.verseReports.push({
      verse,
      transformations: filteredTransformations,
      totalsByType,
      ourWords,
      srWords,
    });
  }

  formatTransformation(t) {
    const left =
      t.ourStartPosition === null ? "our@-" : `our@${t.ourStartPosition}`;
    const right =
      t.srStartPosition === null ? "sr@-" : `sr@${t.srStartPosition}`;
    const fromWords = t.our.length > 0 ? t.our : "<empty>";
    const toWords = t.sr.length > 0 ? t.sr : "<empty>";
    return `${t.type} ${left} ${right}: ${fromWords} -> ${toWords}`;
  }

  renderVerseReports() {
    if (this.pretty === null) {
      return this.verseReports
        .map((report) =>
          JSON.stringify({
            verse: report.verse,
            totalsByType: report.totalsByType,
            transformations: report.transformations,
          }),
        )
        .join("\n");
    }

    return this.verseReports
      .map((report) => {
        const totals = `totals: addition(count=${report.totalsByType.addition.count},removed=${report.totalsByType.addition.wordsRemoved},added=${report.totalsByType.addition.wordsAdded}) deletion(count=${report.totalsByType.deletion.count},removed=${report.totalsByType.deletion.wordsRemoved},added=${report.totalsByType.deletion.wordsAdded}) transformation(count=${report.totalsByType.transformation.count},removed=${report.totalsByType.transformation.wordsRemoved},added=${report.totalsByType.transformation.wordsAdded})`;

        const transformLines = report.transformations
          .map((t) => this.formatTransformation(t))
          .join("\n");

        if (this.pretty === "minimal") {
          return `${report.verse}\n${totals}\n${transformLines}`;
        }

        const ourMarked = new Set();
        const srMarked = new Set();
        for (const t of report.transformations) {
          for (const pos of t.ourPositions) {
            ourMarked.add(pos);
          }
          for (const pos of t.srPositions) {
            srMarked.add(pos);
          }
        }

        return `${report.verse}\n${totals}\n${transformLines}\nour_full: ${formatWordList(report.ourWords, ourMarked)}\nsr_full: ${formatWordList(report.srWords, srMarked)}`;
      })
      .join("\n\n");
  }
}

class VerseCollectorTransform extends Transform {
  constructor(planBuilder) {
    super({ writableObjectMode: true, readableObjectMode: false });
    this.planBuilder = planBuilder;
  }

  _transform(row, _encoding, callback) {
    try {
      const verse = row.verse;
      const ourWords = row.our_words ?? [];
      const srWords = row.sr_words ?? [];
      this.planBuilder.compareVerse(verse, ourWords, srWords);
      callback();
    } catch (error) {
      callback(error);
    }
  }
}

function buildSqlScript({
  words,
  removeWordIds,
  lemmaRows,
  lemmaFormRows,
  expectedGreekLemmaIds,
}) {
  const sql = [];
  sql.push("begin;");
  sql.push("");

  sql.push("-- Stage rebuilt Greek lemmas and forms");
  sql.push("create temporary table tmp_new_lemma (id text primary key);");
  sql.push(
    "create temporary table tmp_new_lemma_form (id text primary key, lemma_id text not null, grammar text not null);",
  );
  sql.push(
    "create temporary table tmp_new_word (id text primary key, verse_id text not null, text text not null, form_id text not null);",
  );
  sql.push("create temporary table tmp_remove_word (id text primary key);");
  sql.push("");

  if (lemmaRows.length > 0) {
    sql.push("insert into tmp_new_lemma (id) values");
    sql.push(
      lemmaRows.map((row) => `('${escapeSqlString(row.id)}')`).join(",\n") +
        ";",
    );
  }

  if (lemmaFormRows.length > 0) {
    sql.push("insert into tmp_new_lemma_form (id, lemma_id, grammar) values");
    sql.push(
      lemmaFormRows
        .map(
          (row) =>
            `('${escapeSqlString(row.id)}', '${escapeSqlString(row.lemmaId)}', '${escapeSqlString(row.grammar)}')`,
        )
        .join(",\n") + ";",
    );
  }

  if (words.length > 0) {
    sql.push("insert into tmp_new_word (id, verse_id, text, form_id) values");
    sql.push(
      words
        .map(
          (row) =>
            `('${escapeSqlString(row.id)}', '${escapeSqlString(row.verseId)}', '${escapeSqlString(row.text.replace("¶", "").replace("˚", ""))}', '${escapeSqlString(row.formId)}')`,
        )
        .join(",\n") + ";",
    );
  }

  if (removeWordIds.length > 0) {
    sql.push("insert into tmp_remove_word (id) values");
    sql.push(
      removeWordIds.map((id) => `('${escapeSqlString(id)}')`).join(",\n") + ";",
    );
  }

  sql.push("");
  sql.push("-- Remove rows that reference deleted words");
  sql.push(
    "delete from phrase_word where word_id in (select id from tmp_remove_word);",
  );
  sql.push(
    "delete from gloss_event where word_id in (select id from tmp_remove_word);",
  );
  sql.push(
    "delete from machine_gloss where word_id in (select id from tmp_remove_word);",
  );
  sql.push(
    "delete from word_lexicon where word_id in (select id from tmp_remove_word);",
  );
  sql.push("delete from word where id in (select id from tmp_remove_word);");
  sql.push("");

  sql.push("-- Rebuild Greek lemmas and forms (G*)");
  sql.push("alter table word drop constraint word_form_id_fkey;");
  sql.push(
    "alter table lemma_resource drop constraint lemma_resource_lemma_id_fkey;",
  );
  sql.push("delete from lemma_form_suggestion where form_id like 'G%';");
  sql.push("delete from lemma_form where id like 'G%';");
  sql.push("delete from lemma where id like 'G%';");
  sql.push("insert into lemma (id) select id from tmp_new_lemma;");
  sql.push(
    "insert into lemma_form (id, grammar, lemma_id) select id, grammar, lemma_id from tmp_new_lemma_form;",
  );
  sql.push("");

  sql.push("-- Insert missing verses");
  sql.push(
    "insert into verse (id, book_id, chapter, number) values ('64001015', 64, 1, 15),('66012018', 66, 12, 18);",
  );

  sql.push("-- Upsert words to final SR-based state");
  sql.push(
    "insert into word (id, text, verse_id, form_id) select id, text, verse_id, form_id from tmp_new_word on conflict (id) do update set text = excluded.text, verse_id = excluded.verse_id, form_id = excluded.form_id;",
  );
  sql.push("");

  sql.push(
    "alter table word add constraint word_form_id_fkey foreign key (form_id) references lemma_form(id) on update cascade on delete restrict not valid;",
  );
  sql.push("alter table word validate constraint word_form_id_fkey;");
  sql.push(
    "do $$ begin if exists (select 1 from word w left join lemma_form lf on lf.id = w.form_id where w.verse_id >= '40001001' and lf.id is null) then raise exception 'Word rows are orphaned from lemma_form after rebuild'; end if; end $$;",
  );

  sql.push("-- Sanity checks");
  sql.push(
    `do $$ begin if (select count(*) from lemma where id like 'G%') <> ${expectedGreekLemmaIds} then raise exception 'Greek lemma count mismatch after rebuild'; end if; end $$;`,
  );
  sql.push("commit;");
  sql.push("");

  return sql.join("\n");
}

async function getDryRunCounts(client, removeWordIds, expectedGreekLemmaIds) {
  const counts = {
    phrase_word: 0,
    gloss_event: 0,
    machine_gloss: 0,
    word_lexicon: 0,
    word: removeWordIds.length,
    greekLemmaExisting: 0,
    greekLemmaFormExisting: 0,
    greekLemmaResourceRows: 0,
    projectedGreekLemmaResourceOrphans: 0,
  };

  if (removeWordIds.length > 0) {
    const params = [removeWordIds];
    const queries = [
      [
        "phrase_word",
        "select count(*)::int as count from phrase_word where word_id = any($1::text[])",
      ],
      [
        "gloss_event",
        "select count(*)::int as count from gloss_event where word_id = any($1::text[])",
      ],
      [
        "machine_gloss",
        "select count(*)::int as count from machine_gloss where word_id = any($1::text[])",
      ],
      [
        "word_lexicon",
        "select count(*)::int as count from word_lexicon where word_id = any($1::text[])",
      ],
    ];

    for (const [key, sql] of queries) {
      const result = await client.query(sql, params);
      counts[key] = result.rows[0].count;
    }
  }

  const lemmaCount = await client.query(
    "select count(*)::int as count from lemma where id like 'G%'",
  );
  counts.greekLemmaExisting = lemmaCount.rows[0].count;

  const lemmaFormCount = await client.query(
    "select count(*)::int as count from lemma_form where id like 'G%'",
  );
  counts.greekLemmaFormExisting = lemmaFormCount.rows[0].count;

  const resourceCount = await client.query(
    "select count(*)::int as count from lemma_resource where lemma_id like 'G%'",
  );
  counts.greekLemmaResourceRows = resourceCount.rows[0].count;

  const orphanCount = await client.query(
    "select count(*)::int as count from lemma_resource lr left join lemma l on l.id = lr.lemma_id where lr.lemma_id like 'G%' and l.id is null",
  );
  counts.projectedGreekLemmaResourceOrphans = orphanCount.rows[0].count;
  counts.expectedGreekLemmaIds = expectedGreekLemmaIds;

  return counts;
}

async function run() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL env var missing");
  }

  const args = parseArgs();
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 2,
  });
  const client = await pool.connect();

  try {
    const planBuilder = new PlanBuilder(args);

    const verseWhereSql = args.verse ? "= $1" : ">= $1";
    const verseParam = args.verse ?? args.fromVerse;

    const sql = `
with our_w as (
  select
    row_number() over (partition by w.verse_id order by w.id) as position,
    w.verse_id as verse,
    w.id,
    w.text as word,
    regexp_replace(lower(unaccent(w.text)), '${NORMALIZE_REGEX}', '', 'g') as normalized
  from word w
  where w.verse_id ${verseWhereSql}
),
sr_w as (
  select
    row_number() over (partition by s.verse) as position,
    s.verse,
    s.modern as word,
    s.lemma,
    s.esn,
    s.role,
    s.morphology,
    regexp_replace(lower(unaccent(s.modern)), '${NORMALIZE_REGEX}', '', 'g') as normalized
  from sr s
  where s.verse ${verseWhereSql}
),
our_v as (
  select
    our_w.verse,
    jsonb_agg(
      jsonb_build_object(
        'position', our_w.position,
        'id', our_w.id,
        'word', our_w.word,
        'normalized', our_w.normalized
      )
      order by our_w.position
    ) as our_words
  from our_w
  group by our_w.verse
),
sr_v as (
  select
    sr_w.verse,
    jsonb_agg(
      jsonb_build_object(
        'position', sr_w.position,
        'verse', sr_w.verse,
        'word', sr_w.word,
        'lemma', sr_w.lemma,
        'esn', sr_w.esn,
        'role', sr_w.role,
        'morphology', sr_w.morphology,
        'normalized', sr_w.normalized
      )
      order by sr_w.position
    ) as sr_words
  from sr_w
  group by sr_w.verse
)
select
  coalesce(our_v.verse, sr_v.verse) as verse,
  coalesce(our_v.our_words, '[]'::jsonb) as our_words,
  coalesce(sr_v.sr_words, '[]'::jsonb) as sr_words
from our_v
full outer join sr_v on sr_v.verse = our_v.verse
order by 1
`;

    const queryStream = client.query(new QueryStream(sql, [verseParam]));
    const collector = new VerseCollectorTransform(planBuilder);
    const sink = new Writable({
      write(_chunk, _enc, callback) {
        callback();
      },
    });

    await pipeline(queryStream, collector, sink);

    const { lemmaRows, lemmaFormRows } = planBuilder.buildLemmaAndFormRows();
    planBuilder.resolveWordFormIds();

    for (const word of planBuilder.wordsById.values()) {
      if (!word.formId || !word.verseId) {
        throw new Error(`Missing form_id for word ${word.id}`);
      }
    }

    const words = [...planBuilder.wordsById.values()].sort((a, b) =>
      a.id.localeCompare(b.id),
    );
    const removeWordIds = [...planBuilder.removeWordIds].sort((a, b) =>
      a.localeCompare(b),
    );

    planBuilder.summary.wordsToInsertOrUpdate = words.length;
    planBuilder.summary.wordsToDelete = removeWordIds.length;
    planBuilder.summary.lemmasToInsert = lemmaRows.length;
    planBuilder.summary.lemmaFormsToInsert = lemmaFormRows.length;

    const verseReportOutput = planBuilder.renderVerseReports();
    if (verseReportOutput) {
      process.stderr.write(`${verseReportOutput}\n`);
    }

    if (args.dryRun) {
      const dryRunCounts = await getDryRunCounts(
        client,
        removeWordIds,
        lemmaRows.length,
      );

      const payload = {
        mode: "dry-run",
        summary: planBuilder.summary,
        deletes: dryRunCounts,
      };
      process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
      process.stderr.write(`${JSON.stringify(planBuilder.summary)}\n`);
      return;
    }

    const script = buildSqlScript({
      words,
      removeWordIds,
      lemmaRows,
      lemmaFormRows,
      expectedGreekLemmaIds: lemmaRows.length,
    });

    if (args.sqlOutPath) {
      fs.writeFileSync(args.sqlOutPath, script, "utf8");
      process.stdout.write(`Wrote SQL script to ${args.sqlOutPath}\n`);
    } else {
      process.stdout.write(script);
    }

    process.stderr.write(`${JSON.stringify(planBuilder.summary)}\n`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
