import "@/tests/vitest/mocks/nextjs";
import { test, expect } from "vitest";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { getLanguageByCodeReadModel } from "./getLanguageByCodeReadModel";
import { languageFactory } from "../test-utils/factories";

initializeDatabase();

test("returns null if the language does not exist", async () => {
  const result = await getLanguageByCodeReadModel("nonexistent-code");
  expect(result).toBeNull();
});

test("returns language by code when it exists", async () => {
  const language = await languageFactory.build({
    code: "spa",
    englishName: "Spanish",
    localName: "Español",
  });

  const result = await getLanguageByCodeReadModel("spa");

  expect(result).toEqual({
    id: language.id,
    code: language.code,
    englishName: language.englishName,
    localName: language.localName,
  });
});
