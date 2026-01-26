import "@/tests/vitest/mocks/nextjs";
import { test, expect } from "vitest";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { getLanguageProgressReadModel } from "./getLanguageProgressReadModel";
import { languageFactory } from "../test-utils/factories";

initializeDatabase();

test("returns empty array if the language does not exist", async () => {
  const result = await getLanguageProgressReadModel("nonexistent-code");
  expect(result).toEqual([]);
});

test("returns language progress by code when it exists", async () => {
  const language = await languageFactory.build({
    code: "spa",
    englishName: "Spanish",
    localName: "Español",
  });

  const result = await getLanguageProgressReadModel("spa");

  expect(result).toHaveLength(66);
  expect(result[0]).toHaveProperty("name");
  expect(result[0]).toHaveProperty("wordCount");
  expect(result[0]).toHaveProperty("approvedCount");
  expect(result[0]).toHaveProperty("nextVerse");
});
