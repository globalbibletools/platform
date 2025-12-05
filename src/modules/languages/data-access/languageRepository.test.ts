import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { describe, expect, test } from "vitest";
import languageRepository from "./LanguageRepository";
import { ulid } from "@/shared/ulid";
import { getDb } from "@/db";
import { TextDirectionRaw } from "../model";

initializeDatabase();

describe("create", () => {
  test("creates a new language", async () => {
    const language = {
      id: ulid(),
      code: "spa",
      name: "Spanish",
    };

    await expect(languageRepository.create(language)).resolves.toBeUndefined();

    const dbLanguages = await getDb()
      .selectFrom("language")
      .selectAll()
      .execute();
    expect(dbLanguages).toEqual([
      {
        ...language,
        font: "Noto Sans",
        reference_language_id: null,
        text_direction: TextDirectionRaw.LTR,
        translation_ids: null,
      },
    ]);
  });
});
