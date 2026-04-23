import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { getDb } from "@/db";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { machineGlossRepository } from "./machineGlossRepository";
import { Readable } from "stream";
import { languageFactory } from "@/modules/languages/test-utils/languageFactory";
import type { AIGlossChapter } from "./aiGlossImportService";

initializeDatabase();

describe("updateAllForLanguage", () => {
  beforeEach(async () => {
    await getDb()
      .insertInto("book")
      .values({
        id: 1,
        name: "Genesis",
      })
      .execute();
    await getDb()
      .insertInto("verse")
      .values({
        id: "01001001",
        chapter: 1,
        number: 1,
        book_id: 1,
      })
      .execute();
    await getDb()
      .insertInto("lemma")
      .values({
        id: "H1",
      })
      .execute();
    await getDb()
      .insertInto("lemma_form")
      .values({
        id: "H1-1",
        lemma_id: "H1",
        grammar: "",
      })
      .execute();
    await getDb()
      .insertInto("word")
      .values([
        {
          id: "0100100101",
          verse_id: "01001001",
          text: "word",
          form_id: "H1-1",
        },
        {
          id: "0100100102",
          verse_id: "01001001",
          text: "word",
          form_id: "H1-1",
        },
        {
          id: "0100100103",
          verse_id: "01001001",
          text: "word",
          form_id: "H1-1",
        },
      ])
      .execute();
  });

  test("replaces all machine glosses for a language", async () => {
    const { language: engLanguage } = await languageFactory.build({
      members: [],
    });
    const { language: spaLanguage } = await languageFactory.build({
      members: [],
    });
    const llmImportModel = await getDb()
      .selectFrom("machine_gloss_model")
      .where("code", "=", "llm_import")
      .select("id")
      .executeTakeFirstOrThrow();

    const existingGloss = {
      word_id: "0100100101",
      language_id: engLanguage.id,
      model_id: llmImportModel.id,
      gloss: "Gloss in another language",
    };

    await getDb()
      .insertInto("machine_gloss")
      .values([
        existingGloss,
        {
          word_id: "0100100101",
          language_id: spaLanguage.id,
          model_id: llmImportModel.id,
          gloss: "Existing gloss to be removed",
        },
      ])
      .execute();

    const newGlosses = [
      {
        wordId: "0100100101",
        gloss: "One",
      },
      {
        wordId: "0100100102",
        gloss: "Two",
      },
      {
        wordId: "0100100103",
        gloss: "Three",
      },
      {
        wordId: "0100100199",
        gloss: "Should be dropped",
      },
    ];
    const chapters: Array<AIGlossChapter> = [
      {
        bookId: 1,
        chapterNumber: 1,
        glosses: newGlosses.slice(0, 2),
      },
      {
        bookId: 1,
        chapterNumber: 1,
        glosses: newGlosses.slice(2),
      },
    ];

    await machineGlossRepository.updateAllForLanguage({
      languageId: spaLanguage.id,
      modelCode: "llm_import",
      stream: Readable.from(chapters),
    });

    const insertedGlosses = await getDb()
      .selectFrom("machine_gloss")
      .orderBy("id")
      .selectAll()
      .execute();
    expect(insertedGlosses).toEqual([
      { ...existingGloss, id: 1 },
      ...newGlosses.slice(0, 3).map((g, i) => ({
        id: i + 3,
        word_id: g.wordId,
        gloss: g.gloss,
        language_id: spaLanguage.id,
        model_id: llmImportModel.id,
      })),
    ]);
  });

  test("tracks progress when streaming AI gloss chapters", async () => {
    const { language } = await languageFactory.build({
      members: [],
    });

    const onBookIdChange = vi.fn().mockResolvedValue(undefined);
    const chapterStream: Array<AIGlossChapter> = [
      {
        bookId: 1,
        chapterNumber: 1,
        glosses: [{ wordId: "0100100101", gloss: "One" }],
      },
      {
        bookId: 1,
        chapterNumber: 2,
        glosses: [{ wordId: "0100100102", gloss: "Two" }],
      },
      {
        bookId: 2,
        chapterNumber: 1,
        glosses: [{ wordId: "0100100103", gloss: "Three" }],
      },
    ];

    await machineGlossRepository.updateAllForLanguage({
      languageId: language.id,
      modelCode: "llm_import",
      stream: Readable.from(chapterStream),
      onBookIdChange,
    });

    expect(onBookIdChange).toHaveBeenCalledTimes(2);
    expect(onBookIdChange).toHaveBeenNthCalledWith(1, 1);
    expect(onBookIdChange).toHaveBeenNthCalledWith(2, 2);

    const insertedGlosses = await getDb()
      .selectFrom("machine_gloss")
      .where("language_id", "=", language.id)
      .orderBy("id")
      .select(["word_id", "gloss"])
      .execute();

    expect(insertedGlosses).toEqual([
      { word_id: "0100100101", gloss: "One" },
      { word_id: "0100100102", gloss: "Two" },
      { word_id: "0100100103", gloss: "Three" },
    ]);
  });

  test("errors in tracks progress don't crash the stream", async () => {
    const { language } = await languageFactory.build({
      members: [],
    });

    const onBookIdChange = vi.fn().mockRejectedValue(new Error("test error"));
    const chapterStream: Array<AIGlossChapter> = [
      {
        bookId: 1,
        chapterNumber: 1,
        glosses: [{ wordId: "0100100101", gloss: "One" }],
      },
      {
        bookId: 1,
        chapterNumber: 2,
        glosses: [{ wordId: "0100100102", gloss: "Two" }],
      },
      {
        bookId: 2,
        chapterNumber: 1,
        glosses: [{ wordId: "0100100103", gloss: "Three" }],
      },
    ];

    await machineGlossRepository.updateAllForLanguage({
      languageId: language.id,
      modelCode: "llm_import",
      stream: Readable.from(chapterStream),
      onBookIdChange,
    });

    expect(onBookIdChange).toHaveBeenCalledTimes(2);
    expect(onBookIdChange).toHaveBeenNthCalledWith(1, 1);
    expect(onBookIdChange).toHaveBeenNthCalledWith(2, 2);

    const insertedGlosses = await getDb()
      .selectFrom("machine_gloss")
      .where("language_id", "=", language.id)
      .orderBy("id")
      .select(["word_id", "gloss"])
      .execute();

    expect(insertedGlosses).toEqual([
      { word_id: "0100100101", gloss: "One" },
      { word_id: "0100100102", gloss: "Two" },
      { word_id: "0100100103", gloss: "Three" },
    ]);
  });
});
