import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { getDb } from "@/db";
import { TRANSLATION_JOB_TYPES } from "@/modules/translation/jobs/jobType";
import { JobStatus } from "@/shared/jobs/model";
import { ulid } from "@/shared/ulid";
import { expect, test } from "vitest";

import { searchLanguagesReadModel } from "@/ui/admin/readModels/searchLanguagesReadModel";
import { languageFactory } from "@/modules/languages/test-utils/languageFactory";

initializeDatabase();

test("returns empty page when there are no languages in the database", async () => {
  const result = await searchLanguagesReadModel({ page: 0, limit: 2 });

  expect(result).toEqual({
    total: 0,
    page: [],
  });
});

test("fetches the first page", async () => {
  const { language: lang1 } = await languageFactory.build({
    code: "eng",
    englishName: "English",
    localName: "English",
  });
  const { language: lang2 } = await languageFactory.build({
    code: "fra",
    englishName: "French",
    localName: "Français",
  });
  await languageFactory.build({
    code: "spa",
    englishName: "Spanish",
    localName: "Español",
  });

  const result = await searchLanguagesReadModel({ page: 0, limit: 2 });

  expect(result).toEqual({
    total: 3,
    page: [
      {
        code: lang1.code,
        englishName: lang1.english_name,
        localName: lang1.local_name,
        otProgress: 0,
        ntProgress: 0,
        aiGlosses: {
          status: "unavailable",
          lastSyncedAt: undefined,
        },
      },
      {
        code: lang2.code,
        englishName: lang2.english_name,
        localName: lang2.local_name,
        otProgress: 0,
        ntProgress: 0,
        aiGlosses: {
          status: "unavailable",
          lastSyncedAt: undefined,
        },
      },
    ],
  });
});

test("fetches the second page", async () => {
  await languageFactory.build({
    code: "deu",
    englishName: "German",
    localName: "Deutsch",
  });
  await languageFactory.build({
    code: "ita",
    englishName: "Italian",
    localName: "Italiano",
  });
  const { language: lang3 } = await languageFactory.build({
    code: "por",
    englishName: "Portuguese",
    localName: "Português",
  });

  const result = await searchLanguagesReadModel({ page: 1, limit: 2 });

  expect(result).toEqual({
    total: 3,
    page: [
      {
        code: lang3.code,
        englishName: lang3.english_name,
        localName: lang3.local_name,
        otProgress: 0,
        ntProgress: 0,
        aiGlosses: {
          status: "unavailable",
          lastSyncedAt: undefined,
        },
      },
    ],
  });
});

test("includes AI glosses availability and sync metadata", async () => {
  const { language: deu } = await languageFactory.build({
    code: "deu",
    englishName: "German",
    localName: "Deutsch",
  });
  const { language: eng } = await languageFactory.build({
    code: "eng",
    englishName: "English",
    localName: "English",
  });
  const { language: fra } = await languageFactory.build({
    code: "fra",
    englishName: "French",
    localName: "Français",
  });
  const { language: spa } = await languageFactory.build({
    code: "spa",
    englishName: "Spanish",
    localName: "Español",
  });

  await getDb()
    .insertInto("ai_gloss_language")
    .values([
      { code: "eng", name: "English" },
      { code: "fra", name: "French" },
      { code: "spa", name: "Spanish" },
    ])
    .execute();

  const engImportedAt = new Date("2026-04-10T00:00:00.000Z");
  const fraImportedAt = new Date("2026-04-05T00:00:00.000Z");
  const fraPendingAt = new Date("2026-04-12T00:00:00.000Z");
  const spaFailedAt = new Date("2026-04-15T00:00:00.000Z");

  await getDb()
    .insertInto("job")
    .values([
      {
        id: ulid(),
        type: TRANSLATION_JOB_TYPES.IMPORT_AI_GLOSSES,
        status: JobStatus.Complete,
        payload: { languageCode: "eng" },
        created_at: engImportedAt,
        updated_at: engImportedAt,
      },
      {
        id: ulid(),
        type: TRANSLATION_JOB_TYPES.IMPORT_AI_GLOSSES,
        status: JobStatus.Complete,
        payload: { languageCode: "fra" },
        created_at: fraImportedAt,
        updated_at: fraImportedAt,
      },
      {
        id: ulid(),
        type: TRANSLATION_JOB_TYPES.IMPORT_AI_GLOSSES,
        status: JobStatus.Pending,
        payload: { languageCode: "fra" },
        created_at: fraPendingAt,
        updated_at: fraPendingAt,
      },
      {
        id: ulid(),
        type: TRANSLATION_JOB_TYPES.IMPORT_AI_GLOSSES,
        status: JobStatus.Failed,
        payload: { languageCode: "spa" },
        created_at: spaFailedAt,
        updated_at: spaFailedAt,
      },
    ])
    .execute();

  const result = await searchLanguagesReadModel({ page: 0, limit: 10 });

  expect(result).toEqual({
    total: 4,
    page: [
      {
        code: eng.code,
        englishName: eng.english_name,
        localName: eng.local_name,
        otProgress: 0,
        ntProgress: 0,
        aiGlosses: {
          status: "imported",
          lastSyncedAt: engImportedAt,
        },
      },
      {
        code: fra.code,
        englishName: fra.english_name,
        localName: fra.local_name,
        otProgress: 0,
        ntProgress: 0,
        aiGlosses: {
          status: "in-progress",
          lastSyncedAt: fraImportedAt,
        },
      },
      {
        code: deu.code,
        englishName: deu.english_name,
        localName: deu.local_name,
        otProgress: 0,
        ntProgress: 0,
        aiGlosses: {
          status: "unavailable",
          lastSyncedAt: undefined,
        },
      },
      {
        code: spa.code,
        englishName: spa.english_name,
        localName: spa.local_name,
        otProgress: 0,
        ntProgress: 0,
        aiGlosses: {
          status: "available",
          lastSyncedAt: undefined,
        },
      },
    ],
  });
});
