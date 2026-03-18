import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { describe, expect, test } from "vitest";
import { query } from "@/db";
import { ulid } from "@/shared/ulid";
import interlinearCoverageQueryService from "./InterlinearCoverageQueryService";

initializeDatabase();

describe("interlinearCoverageQueryService", () => {
  test("returns chapters with approved glosses only", async () => {
    const languageRow = await query<{ id: string }>(
      `
        insert into language (id, code, english_name, local_name)
        values ($1, $2, $3, $4)
        returning id
      `,
      [ulid(), "tst", "Test Language", "Test Language"],
    );
    const languageId = languageRow.rows[0].id;

    await query(
      `insert into book (id, name) values (1, 'Book One'), (2, 'Book Two')`,
      [],
    );
    await query(
      `
        insert into verse (id, number, book_id, chapter)
        values
          ('1-1-1', 1, 1, 1),
          ('1-2-1', 1, 1, 2),
          ('2-1-1', 1, 2, 1)
      `,
      [],
    );
    await query(`insert into lemma (id) values ('l1')`, []);
    await query(
      `insert into lemma_form (id, grammar, lemma_id) values ('f1', 'g', 'l1')`,
      [],
    );
    await query(
      `
        insert into word (id, text, verse_id, form_id)
        values
          ('w1', 'a', '1-1-1', 'f1'),
          ('w2', 'b', '1-2-1', 'f1'),
          ('w3', 'c', '2-1-1', 'f1')
      `,
      [],
    );

    const phrase1 = await query<{ id: number }>(
      `insert into phrase (language_id, created_at) values ($1, now()) returning id`,
      [languageId],
    );
    await query(
      `insert into phrase_word (phrase_id, word_id) values ($1, $2)`,
      [phrase1.rows[0].id, "w1"],
    );
    await query(
      `insert into gloss (gloss, state, phrase_id, updated_at) values ($1, $2, $3, now())`,
      ["hello", "APPROVED", phrase1.rows[0].id],
    );

    const phrase2 = await query<{ id: number }>(
      `insert into phrase (language_id, created_at) values ($1, now()) returning id`,
      [languageId],
    );
    await query(
      `insert into phrase_word (phrase_id, word_id) values ($1, $2)`,
      [phrase2.rows[0].id, "w2"],
    );
    await query(
      `insert into gloss (gloss, state, phrase_id, updated_at) values ($1, $2, $3, now())`,
      ["hello", "APPROVED", phrase2.rows[0].id],
    );

    const phrase3 = await query<{ id: number }>(
      `insert into phrase (language_id, created_at) values ($1, now()) returning id`,
      [languageId],
    );
    await query(
      `insert into phrase_word (phrase_id, word_id) values ($1, $2)`,
      [phrase3.rows[0].id, "w3"],
    );
    await query(
      `insert into gloss (gloss, state, phrase_id, updated_at) values ($1, $2, $3, now())`,
      ["draft", "UNAPPROVED", phrase3.rows[0].id],
    );

    const phrase4 = await query<{ id: number }>(
      `
        insert into phrase (language_id, created_at, deleted_at)
        values ($1, now(), now())
        returning id
      `,
      [languageId],
    );
    await query(
      `insert into phrase_word (phrase_id, word_id) values ($1, $2)`,
      [phrase4.rows[0].id, "w3"],
    );
    await query(
      `insert into gloss (gloss, state, phrase_id, updated_at) values ($1, $2, $3, now())`,
      ["deleted", "APPROVED", phrase4.rows[0].id],
    );

    const result =
      await interlinearCoverageQueryService.findChaptersWithApprovedGlosses(
        languageId,
      );

    expect(result).toEqual([{ bookId: 1, chapters: [1, 2] }]);
  });
});
