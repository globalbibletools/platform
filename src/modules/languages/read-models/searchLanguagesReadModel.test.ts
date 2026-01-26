import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { expect, test } from "vitest";
import { searchLanguagesReadModel } from "./searchLanguagesReadModel";
import { languageFactory } from "@/modules/languages/test-utils/factories";

initializeDatabase();

test("returns empty page when there are no languages in the database", async () => {
  const result = await searchLanguagesReadModel({ page: 0, limit: 2 });

  expect(result).toEqual({
    total: 0,
    page: [],
  });
});

test("fetches the first page", async () => {
  const lang1 = await languageFactory.build({
    code: "eng",
    englishName: "English",
    localName: "English",
  });
  const lang2 = await languageFactory.build({
    code: "fra",
    englishName: "French",
    localName: "Français",
  });
  const lang3 = await languageFactory.build({
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
        englishName: lang1.englishName,
        localName: lang1.localName,
        otProgress: 0,
        ntProgress: 0,
      },
      {
        code: lang2.code,
        englishName: lang2.englishName,
        localName: lang2.localName,
        otProgress: 0,
        ntProgress: 0,
      },
    ],
  });
});

test("fetches the second page", async () => {
  const lang1 = await languageFactory.build({
    code: "deu",
    englishName: "German",
    localName: "Deutsch",
  });
  const lang2 = await languageFactory.build({
    code: "ita",
    englishName: "Italian",
    localName: "Italiano",
  });
  const lang3 = await languageFactory.build({
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
        englishName: lang3.englishName,
        localName: lang3.localName,
        otProgress: 0,
        ntProgress: 0,
      },
    ],
  });
});
