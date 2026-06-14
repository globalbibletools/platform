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

vitest.mock("../data-access/exportStorageRepository", () => ({
  exportStorageRepository: {
    upload: vitest.fn(),
    publicUrl: vitest.fn(),
  },
}));

initializeDatabase();

const mockedUpload = vitest.mocked(exportStorageRepository.upload);

beforeEach(() => {
  mockedUpload.mockReset();
});

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

  expect(mockedUpload).toHaveBeenCalledExactlyOnceWith({
    key: `glosses/v1/${language.code}.db`,
    source: expect.any(Buffer),
    type: "application/vnd.sqlite3",
  });

  const buffer = mockedUpload.mock.calls[0][0].source as Buffer;
  const { verses, texts } = querySqliteTables(buffer);

  expect(verses).toEqual([{ _id: Number(word.id), text: 1 }]);
  expect(texts).toEqual([{ _id: 1, text: "test gloss" }]);
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

  expect(mockedUpload).toHaveBeenCalledExactlyOnceWith({
    key: `glosses/v1/${language.code}.db`,
    source: expect.any(Buffer),
    type: "application/vnd.sqlite3",
  });

  const buffer = mockedUpload.mock.calls[0][0].source as Buffer;
  const { verses, texts } = querySqliteTables(buffer);

  expect(verses).toEqual([]);
  expect(texts).toEqual([]);
});

test("skips a language code that does not exist", async () => {
  const job = ExportGlossesSqliteJob.create({
    languageCodes: ["nonexistent"],
  });

  await exportGlossesSqliteHandler(job);

  expect(mockedUpload).not.toHaveBeenCalled();
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

  expect(mockedUpload).toHaveBeenCalledTimes(2);

  const spaBuffer = mockedUpload.mock.calls[0][0].source as Buffer;
  const { verses: spaVerses, texts: spaTexts } = querySqliteTables(spaBuffer);
  expect(spaVerses).toEqual([{ _id: Number(word.id), text: 1 }]);
  expect(spaTexts).toEqual([{ _id: 1, text: "hello" }]);

  const hinBuffer = mockedUpload.mock.calls[1][0].source as Buffer;
  const { verses: hinVerses, texts: hinTexts } = querySqliteTables(hinBuffer);
  expect(hinVerses).toEqual([{ _id: Number(word.id), text: 1 }]);
  expect(hinTexts).toEqual([{ _id: 1, text: "namaste" }]);
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

  const buffer = mockedUpload.mock.calls[0][0].source as Buffer;
  const { verses, texts } = querySqliteTables(buffer);

  expect(verses).toEqual([
    { _id: Number(words[0].id), text: 1 },
    { _id: Number(words[1].id), text: 1 },
  ]);
  expect(texts).toEqual([{ _id: 1, text: "same gloss" }]);
});
