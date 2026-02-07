import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { getDb } from "@/db";
import { createScenario } from "@/tests/scenarios";
import { beforeEach, describe, expect, test } from "vitest";
import { machineGlossRepository } from "./machineGlossRepository";
import { Readable } from "stream";

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
    const scenario = await createScenario({
      languages: {
        eng: {},
        spa: {},
      },
    });

    const existingGloss = {
      word_id: "0100100101",
      language_id: scenario.languages.eng.id,
      gloss: "Gloss in another language",
    };

    await getDb()
      .insertInto("machine_gloss")
      .values([
        existingGloss,
        {
          word_id: "0100100101",
          language_id: scenario.languages.spa.id,
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
    ];

    await machineGlossRepository.updateAllForLanguage({
      languageId: scenario.languages.spa.id,
      stream: Readable.from(newGlosses),
    });

    const insertedGlosses = await getDb()
      .selectFrom("machine_gloss")
      .orderBy("id")
      .selectAll()
      .execute();
    expect(insertedGlosses).toEqual([
      { ...existingGloss, id: 1 },
      ...newGlosses.map((g, i) => ({
        id: i + 3,
        word_id: g.wordId,
        gloss: g.gloss,
        language_id: scenario.languages.spa.id,
      })),
    ]);
  });
});
