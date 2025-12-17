import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { beforeEach, describe, expect, test } from "vitest";
import languageRepository from "./languageRepository";
import { ulid } from "@/shared/ulid";
import { getDb } from "@/db";
import { TextDirectionRaw } from "../model";

initializeDatabase();

describe("existsById", () => {
  const language = {
    id: ulid(),
    code: "spa",
    name: "Spanish",
  };
  beforeEach(async () => {
    await getDb().insertInto("language").values(language).execute();
  });

  test("returns true if language exists", async () => {
    await expect(languageRepository.existsById(language.id)).resolves.toBe(
      true,
    );
  });

  test("returns false if language does not exist", async () => {
    await expect(languageRepository.existsById(ulid())).resolves.toBe(false);
  });
});

describe("existsByCode", () => {
  const language = {
    id: ulid(),
    code: "spa",
    name: "Spanish",
  };
  beforeEach(async () => {
    await getDb().insertInto("language").values(language).execute();
  });

  test("returns true if language exists", async () => {
    await expect(languageRepository.existsByCode(language.code)).resolves.toBe(
      true,
    );
  });

  test("returns false if language does not exists", async () => {
    await expect(languageRepository.existsByCode("zzz")).resolves.toBe(false);
  });
});

describe("findByCode", () => {
  const language = {
    id: ulid(),
    code: "spa",
    name: "Spanish",
  };
  beforeEach(async () => {
    await getDb().insertInto("language").values(language).execute();
  });

  test("returns undefined if language does not exist", async () => {
    await expect(languageRepository.findByCode("zzz")).resolves.toBeUndefined();
  });

  test("returns language model if it exists", async () => {
    await expect(languageRepository.findByCode(language.code)).resolves.toEqual(
      {
        ...language,
        font: "Noto Sans",
        referenceLanguageId: null,
        textDirection: TextDirectionRaw.LTR,
        translationIds: [],
      },
    );
  });
});

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

  test("throws error if language with the same code already exists", async () => {
    const language = {
      id: ulid(),
      code: "spa",
      name: "Spanish",
    };
    await getDb().insertInto("language").values(language).execute();

    await expect(
      languageRepository.create({ ...language, id: ulid() }),
    ).rejects.toThrowError(
      expect.objectContaining({
        message:
          'duplicate key value violates unique constraint "language_code_idx"',
      }),
    );

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

describe("update", () => {
  const language = {
    id: ulid(),
    code: "spa",
    name: "Spanish",
  };
  beforeEach(async () => {
    await getDb().insertInto("language").values(language).execute();
  });

  test("updates language if it exists", async () => {
    const updatedLanguage = {
      code: language.code,
      name: "Spanish changed",
      font: "New font",
      textDirection: TextDirectionRaw.RTL,
      translationIds: ["new"],
      referenceLanguageId: language.id,
    };

    await expect(
      languageRepository.update(updatedLanguage),
    ).resolves.toBeUndefined();

    const dbLanguages = await getDb()
      .selectFrom("language")
      .selectAll()
      .execute();
    expect(dbLanguages).toEqual([
      {
        id: language.id,
        code: language.code,
        name: updatedLanguage.name,
        font: updatedLanguage.font,
        reference_language_id: updatedLanguage.referenceLanguageId,
        text_direction: updatedLanguage.textDirection,
        translation_ids: updatedLanguage.translationIds,
      },
    ]);
  });

  test("makes no change if language does not exist", async () => {
    const updatedLanguage = {
      code: "xxx",
      name: "Spanish changed",
      font: "New font",
      textDirection: TextDirectionRaw.RTL,
      translationIds: ["new"],
      referenceLanguageId: language.id,
    };

    await expect(
      languageRepository.update(updatedLanguage),
    ).resolves.toBeUndefined();

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
