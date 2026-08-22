import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { beforeEach, expect, test, vitest } from "vitest";
import { languageFactory } from "@/modules/languages/test-utils/languageFactory";
import { phraseFactory } from "@/modules/translation/test-utils/phraseFactory";
import { GlossStateRaw } from "@/modules/translation/types";
import {
  HAGGAI_BOOK_ID,
  bibleFactory,
} from "@/modules/bible-core/test-utils/bibleFactory";
import { getDb } from "@/db";
import { exportGlossesSqliteHandler } from "./exportGlossesSqliteHandler";
import { ExportGlossesSqliteJob } from "./ExportGlossesSqliteJob";
import { exportStorageRepository } from "../data-access/exportStorageRepository";
import Database from "better-sqlite3";
import { Readable } from "stream";

vitest.mock("../data-access/exportStorageRepository", () => ({
  exportStorageRepository: {
    upload: vitest.fn(),
    uploadZip: vitest.fn(),
    streamFiles: vitest.fn(),
    publicUrl: vitest.fn(),
  },
}));

vitest.mock("archiver", () => ({
  ZipArchive: vitest.fn(function () {
    return {
      append: vitest.fn(),
      finalize: vitest.fn(),
    };
  }),
}));

initializeDatabase();

const mockedUploadZip = vitest.mocked(exportStorageRepository.uploadZip);
const mockedUpload = vitest.mocked(exportStorageRepository.upload);

beforeEach(() => {
  mockedUploadZip.mockReset();
  mockedUploadZip.mockImplementation(async ({ key }) => ({
    key,
    size: 1024,
    sha256: "abc123",
    location: `https://assets.globalbibletools.com/${key}`,
  }));
  mockedUpload.mockReset();
  mockedUpload.mockImplementation(async ({ key }) => ({
    key,
    size: 0,
    sha256: "",
    location: "manifest-location",
  }));
});

function extractSqliteBuffer(archive: unknown): Buffer {
  const { append } = archive as {
    append: { mock: { calls: [Buffer, { name: string }][] } };
  };
  return append.mock.calls[0][0];
}

function querySqliteTables(buffer: Buffer) {
  const db = new Database(buffer);
  const verses = db.prepare("select * from verses order by _id").all() as {
    _id: number;
    text: number;
  }[];
  const texts = db.prepare("select * from text order by _id").all() as {
    _id: number;
    text: string;
  }[];
  db.close();
  return { verses, texts };
}

async function readManifestSource(source: Readable): Promise<unknown[]> {
  return source.map((line) => JSON.parse(line)).toArray();
}

test("exports approved glosses for a language as a SQLite database", async () => {
  const { language } = await languageFactory.build({ code: "spa" });

  await getDb()
    .insertInto("book_completion")
    .values({
      language_id: language.id,
      book_id: HAGGAI_BOOK_ID,
      refreshed_at: new Date(),
      updated_at: new Date(),
      completed_at: new Date(),
    })
    .execute();

  const word = await bibleFactory.word();

  await phraseFactory.build({
    languageId: language.id,
    wordIds: [word.id],
    events: true,
    gloss: {
      state: GlossStateRaw.Approved,
      gloss: "test gloss",
    },
  });

  const job = ExportGlossesSqliteJob.create({
    languageCodes: [language.code],
  });

  await exportGlossesSqliteHandler(job);

  expect(mockedUploadZip).toHaveBeenCalledExactlyOnceWith({
    key: `glosses/v1/${language.code}.db.zip`,
    archive: expect.any(Object),
  });

  const buffer = extractSqliteBuffer(mockedUploadZip.mock.calls[0][0].archive);
  const { verses, texts } = querySqliteTables(buffer);

  expect(verses).toEqual([{ _id: Number(word.id), text: 1 }]);
  expect(texts).toEqual([{ _id: 1, text: "test gloss" }]);

  const trackingRows = await getDb()
    .selectFrom("glosses_sqlite_export")
    .selectAll()
    .orderBy("s3_key")
    .execute();
  expect(trackingRows).toEqual([
    {
      language_id: language.id,
      s3_key: `glosses/v1/${language.code}.db.zip`,
      sha256: "abc123",
      size: 1024,
      updated_at: expect.toBeNow(),
    },
  ]);

  expect(mockedUpload).toHaveBeenCalledExactlyOnceWith({
    key: "glosses/v1/manifest.jsonl",
    source: expect.any(Readable),
    type: "application/jsonl",
  });
  const manifest = await readManifestSource(
    mockedUpload.mock.calls[0][0].source as Readable,
  );
  expect(manifest).toEqual([
    {
      id: language.code,
      updatedAt: expect.toBeNow(),
      sha256: "abc123",
      size: 1024,
      url: `glosses/v1/${language.code}.db.zip`,
      resourceName: language.local_name,
    },
  ]);
});

test("skips words with null glosses", async () => {
  const { language } = await languageFactory.build({ code: "hin" });

  await getDb()
    .insertInto("book_completion")
    .values({
      language_id: language.id,
      book_id: HAGGAI_BOOK_ID,
      refreshed_at: new Date(),
      updated_at: new Date(),
      completed_at: new Date(),
    })
    .execute();

  // Create a phrase with unapproved gloss — should not appear in export
  await phraseFactory.build({
    languageId: language.id,
    events: true,
    gloss: "unapproved",
  });

  const job = ExportGlossesSqliteJob.create({
    languageCodes: [language.code],
  });

  await exportGlossesSqliteHandler(job);

  expect(mockedUploadZip).toHaveBeenCalledExactlyOnceWith({
    key: `glosses/v1/${language.code}.db.zip`,
    archive: expect.any(Object),
  });

  const buffer = extractSqliteBuffer(mockedUploadZip.mock.calls[0][0].archive);
  const { verses, texts } = querySqliteTables(buffer);

  expect(verses).toEqual([]);
  expect(texts).toEqual([]);

  expect(mockedUpload).toHaveBeenCalledExactlyOnceWith({
    key: "glosses/v1/manifest.jsonl",
    source: expect.any(Readable),
    type: "application/jsonl",
  });
  const manifest = await readManifestSource(
    mockedUpload.mock.calls[0][0].source as Readable,
  );
  expect(manifest).toEqual([
    {
      id: language.code,
      updatedAt: expect.toBeNow(),
      sha256: "abc123",
      size: 1024,
      url: `glosses/v1/${language.code}.db.zip`,
      resourceName: language.local_name,
    },
  ]);
});

test("skips a language code that does not exist", async () => {
  const job = ExportGlossesSqliteJob.create({
    languageCodes: ["nonexistent"],
  });

  await exportGlossesSqliteHandler(job);

  expect(mockedUploadZip).not.toHaveBeenCalled();

  const trackingRows = await getDb()
    .selectFrom("glosses_sqlite_export")
    .selectAll()
    .execute();
  expect(trackingRows).toEqual([]);

  expect(mockedUpload).toHaveBeenCalledExactlyOnceWith({
    key: "glosses/v1/manifest.jsonl",
    source: expect.any(Readable),
    type: "application/jsonl",
  });
  const manifest = await readManifestSource(
    mockedUpload.mock.calls[0][0].source as Readable,
  );
  expect(manifest).toEqual([]);
});

test("exports multiple languages in separate databases", async () => {
  const { language: language1 } = await languageFactory.build({ code: "spa" });
  const { language: language2 } = await languageFactory.build({ code: "hin" });

  for (const language of [language1, language2]) {
    await getDb()
      .insertInto("book_completion")
      .values({
        language_id: language.id,
        book_id: HAGGAI_BOOK_ID,
        refreshed_at: new Date(),
        updated_at: new Date(),
        completed_at: new Date(),
      })
      .execute();
  }

  const word = await bibleFactory.word();

  await phraseFactory.build({
    languageId: language1.id,
    wordIds: [word.id],
    events: true,
    gloss: {
      state: GlossStateRaw.Approved,
      gloss: "hello",
    },
  });

  await phraseFactory.build({
    languageId: language2.id,
    wordIds: [word.id],
    events: true,
    gloss: {
      state: GlossStateRaw.Approved,
      gloss: "namaste",
    },
  });

  const job = ExportGlossesSqliteJob.create({
    languageCodes: [language1.code, language2.code],
  });

  await exportGlossesSqliteHandler(job);

  expect(mockedUploadZip).toHaveBeenCalledTimes(2);

  const spaArchive = mockedUploadZip.mock.calls[0][0].archive;
  const spaBuffer = extractSqliteBuffer(spaArchive);
  const { verses: spaVerses, texts: spaTexts } = querySqliteTables(spaBuffer);
  expect(spaVerses).toEqual([{ _id: Number(word.id), text: 1 }]);
  expect(spaTexts).toEqual([{ _id: 1, text: "hello" }]);

  const hinArchive = mockedUploadZip.mock.calls[1][0].archive;
  const hinBuffer = extractSqliteBuffer(hinArchive);
  const { verses: hinVerses, texts: hinTexts } = querySqliteTables(hinBuffer);
  expect(hinVerses).toEqual([{ _id: Number(word.id), text: 1 }]);
  expect(hinTexts).toEqual([{ _id: 1, text: "namaste" }]);

  const trackingRows = await getDb()
    .selectFrom("glosses_sqlite_export")
    .selectAll()
    .orderBy("s3_key")
    .execute();
  expect(trackingRows).toEqual([
    {
      language_id: language2.id,
      s3_key: `glosses/v1/${language2.code}.db.zip`,
      sha256: "abc123",
      size: 1024,
      updated_at: expect.toBeNow(),
    },
    {
      language_id: language1.id,
      s3_key: `glosses/v1/${language1.code}.db.zip`,
      sha256: "abc123",
      size: 1024,
      updated_at: expect.toBeNow(),
    },
  ]);

  expect(mockedUpload).toHaveBeenCalledExactlyOnceWith({
    key: "glosses/v1/manifest.jsonl",
    source: expect.any(Readable),
    type: "application/jsonl",
  });
  const manifest = await readManifestSource(
    mockedUpload.mock.calls[0][0].source as Readable,
  );
  // Manifest is ordered by language.code (hin before spa)
  expect(manifest).toEqual([
    {
      id: language2.code,
      updatedAt: expect.toBeNow(),
      sha256: "abc123",
      size: 1024,
      url: `glosses/v1/${language2.code}.db.zip`,
      resourceName: language2.local_name,
    },
    {
      id: language1.code,
      updatedAt: expect.toBeNow(),
      sha256: "abc123",
      size: 1024,
      url: `glosses/v1/${language1.code}.db.zip`,
      resourceName: language1.local_name,
    },
  ]);
});

test("deduplicates gloss text entries", async () => {
  const { language } = await languageFactory.build({ code: "arb" });

  await getDb()
    .insertInto("book_completion")
    .values({
      language_id: language.id,
      book_id: HAGGAI_BOOK_ID,
      refreshed_at: new Date(),
      updated_at: new Date(),
      completed_at: new Date(),
    })
    .execute();

  // Create two phrases with the same gloss text on different words
  const words = await bibleFactory.words({ count: 2 });

  await phraseFactory.build({
    languageId: language.id,
    wordIds: [words[0].id],
    events: true,
    gloss: {
      state: GlossStateRaw.Approved,
      gloss: "same gloss",
    },
  });

  await phraseFactory.build({
    languageId: language.id,
    wordIds: [words[1].id],
    events: true,
    gloss: {
      state: GlossStateRaw.Approved,
      gloss: "same gloss",
    },
  });

  const job = ExportGlossesSqliteJob.create({
    languageCodes: [language.code],
  });

  await exportGlossesSqliteHandler(job);

  const buffer = extractSqliteBuffer(mockedUploadZip.mock.calls[0][0].archive);
  const { verses, texts } = querySqliteTables(buffer);

  expect(verses).toEqual([
    { _id: Number(words[0].id), text: 1 },
    { _id: Number(words[1].id), text: 1 },
  ]);
  expect(texts).toEqual([{ _id: 1, text: "same gloss" }]);

  expect(mockedUpload).toHaveBeenCalledExactlyOnceWith({
    key: "glosses/v1/manifest.jsonl",
    source: expect.any(Readable),
    type: "application/jsonl",
  });
});

test("upserts an existing tracking row instead of creating a duplicate", async () => {
  const { language } = await languageFactory.build({ code: "spa" });

  await getDb()
    .insertInto("glosses_sqlite_export")
    .values({
      language_id: language.id,
      s3_key: "glosses/v1/old.db.zip",
      sha256: "old-hash",
      size: 1,
      updated_at: new Date("2020-01-01"),
    })
    .execute();

  await getDb()
    .insertInto("book_completion")
    .values({
      language_id: language.id,
      book_id: HAGGAI_BOOK_ID,
      refreshed_at: new Date(),
      updated_at: new Date(),
      completed_at: new Date(),
    })
    .execute();

  const word = await bibleFactory.word();

  await phraseFactory.build({
    languageId: language.id,
    wordIds: [word.id],
    events: true,
    gloss: {
      state: GlossStateRaw.Approved,
      gloss: "test gloss",
    },
  });

  const job = ExportGlossesSqliteJob.create({
    languageCodes: [language.code],
  });

  await exportGlossesSqliteHandler(job);

  const trackingRows = await getDb()
    .selectFrom("glosses_sqlite_export")
    .selectAll()
    .execute();
  expect(trackingRows).toEqual([
    {
      language_id: language.id,
      s3_key: `glosses/v1/${language.code}.db.zip`,
      sha256: "abc123",
      size: 1024,
      updated_at: expect.toBeNow(),
    },
  ]);

  expect(mockedUpload).toHaveBeenCalledExactlyOnceWith({
    key: "glosses/v1/manifest.jsonl",
    source: expect.any(Readable),
    type: "application/jsonl",
  });
});
