import { getDb } from "@/db";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { describe, expect, test } from "vitest";
import { aiGlossLanguageRepository } from "./aiGlossLanguageRepository";

initializeDatabase();

describe("upsertAll", () => {
  test("inserts all provided languages", async () => {
    await aiGlossLanguageRepository.upsertAll([
      { code: "eng", name: "English" },
      { code: "spa", name: "Spanish" },
    ]);

    const languages = await getDb()
      .selectFrom("ai_gloss_language")
      .orderBy("code")
      .selectAll()
      .execute();

    expect(languages).toEqual([
      {
        code: "eng",
        name: "English",
        created_at: expect.toBeNow(),
      },
      {
        code: "spa",
        name: "Spanish",
        created_at: expect.toBeNow(),
      },
    ]);
  });

  test("updates existing names while preserving created_at", async () => {
    await aiGlossLanguageRepository.upsertAll([
      { code: "eng", name: "English" },
    ]);

    const inserted = await getDb()
      .selectFrom("ai_gloss_language")
      .where("code", "=", "eng")
      .selectAll()
      .executeTakeFirstOrThrow();

    await aiGlossLanguageRepository.upsertAll([
      { code: "eng", name: "English Updated" },
    ]);

    const updated = await getDb()
      .selectFrom("ai_gloss_language")
      .where("code", "=", "eng")
      .selectAll()
      .executeTakeFirstOrThrow();

    expect(updated).toEqual({
      code: "eng",
      name: "English Updated",
      created_at: inserted.created_at,
    });
  });

  test("does nothing for empty input", async () => {
    await aiGlossLanguageRepository.upsertAll([]);

    const languages = await getDb()
      .selectFrom("ai_gloss_language")
      .selectAll()
      .execute();

    expect(languages).toEqual([]);
  });
});
