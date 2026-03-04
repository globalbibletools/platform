import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { expect, test } from "vitest";
import { searchLanguagesReadModel } from "./searchLanguagesReadModel";
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
      },
      {
        code: lang2.code,
        englishName: lang2.english_name,
        localName: lang2.local_name,
        otProgress: 0,
        ntProgress: 0,
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
      },
    ],
  });
});
