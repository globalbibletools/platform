import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { expect, test } from "vitest";
import { getAllLanguagesReadModel } from "./getAllLanguagesReadModel";
import { languageFactory } from "@/modules/languages/test-utils/languageFactory";

initializeDatabase();

test("returns empty array when there are no languages in the database", async () => {
  const result = await getAllLanguagesReadModel();

  expect(result).toEqual([]);
});

test("returns all languages ordered by their english name", async () => {
  const { language: lang1 } = await languageFactory.build({
    code: "spa",
    englishName: "Spanish",
    localName: "Español",
  });
  const { language: lang2 } = await languageFactory.build({
    code: "eng",
    englishName: "English",
    localName: "English",
  });
  const { language: lang3 } = await languageFactory.build({
    code: "fra",
    englishName: "French",
    localName: "Français",
  });

  const result = await getAllLanguagesReadModel();

  expect(result).toEqual([
    {
      id: lang2.id,
      code: lang2.code,
      englishName: lang2.english_name,
      localName: lang2.local_name,
    },
    {
      id: lang3.id,
      code: lang3.code,
      englishName: lang3.english_name,
      localName: lang3.local_name,
    },
    {
      id: lang1.id,
      code: lang1.code,
      englishName: lang1.english_name,
      localName: lang1.local_name,
    },
  ]);
});
