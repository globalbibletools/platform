import { query } from "@/db";
import { TextDirectionRaw } from "@/modules/languages/model";

export interface InterlinearWord {
  id: string;
  text: string;
  gloss?: string;
  linkedWords?: string[];
  lemma: string;
  grammar: string;
  footnote?: string;
}

export interface InterlinearVerse {
  id: string;
  chapter: number;
  number: number;
  words: InterlinearWord[];
}

export interface InterlinearChapterResult {
  language: {
    id: string;
    code: string;
    name: string;
    font: string;
    textDirection: TextDirectionRaw;
  };
  verses: InterlinearVerse[];
}

export interface InterlinearBookResult extends InterlinearChapterResult {
  bookId: number;
  bookName: string;
  chapters: number[];
}

interface InterlinearExportRow {
  bookId: number | null;
  bookName: string | null;
  languageId: string;
  languageCode: string;
  languageName: string;
  languageFont: string;
  languageTextDirection: TextDirectionRaw;
  id: string | null;
  chapter: number | null;
  number: number | null;
  words: InterlinearWord[] | null;
}

const interlinearQueryService = {
  async fetchBooksWithApprovedGlossChapters(
    languageId: string,
  ): Promise<InterlinearBookResult[]> {
    const result = await query<InterlinearExportRow>(
      `
        WITH selected_language AS (
          SELECT
            id,
            code,
            local_name AS name,
            font,
            text_direction AS "textDirection"
          FROM language
          WHERE id = $1
        ),
        covered_chapters AS (
          SELECT DISTINCT
            v.book_id,
            v.chapter
          FROM phrase ph
          JOIN gloss g
            ON g.phrase_id = ph.id
           AND g.state = 'APPROVED'
          JOIN phrase_word phw
            ON phw.phrase_id = ph.id
          JOIN word w
            ON w.id = phw.word_id
          JOIN verse v
            ON v.id = w.verse_id
          WHERE ph.language_id = $1
            AND ph.deleted_at IS NULL
        )
        SELECT
          b.id AS "bookId",
          b.name AS "bookName",
          l.id AS "languageId",
          l.code AS "languageCode",
          l.name AS "languageName",
          l.font AS "languageFont",
          l."textDirection" AS "languageTextDirection",
          v.id,
          v.chapter,
          v.number,
          words.words
        FROM selected_language l
        LEFT JOIN covered_chapters cc ON true
        LEFT JOIN book b ON b.id = cc.book_id
        LEFT JOIN verse v
          ON v.book_id = cc.book_id
         AND v.chapter = cc.chapter
        LEFT JOIN LATERAL (
          SELECT COALESCE(json_agg(json_strip_nulls(json_build_object(
            'id', w.id,
            'text', w.text,
            'gloss', g.gloss,
            'linkedWords', ph.linked_words,
            'footnote', fn.content,
            'lemma', lf.lemma_id,
            'grammar', lf.grammar
          )) ORDER BY w.id), '[]'::json) AS words
          FROM word AS w
          LEFT JOIN LATERAL (
            SELECT ph.id, wds.words AS linked_words FROM phrase_word AS phw
            JOIN phrase AS ph ON ph.id = phw.phrase_id
            LEFT JOIN LATERAL (
              SELECT array_agg(phw2.word_id) AS words FROM phrase_word AS phw2
              WHERE phw2.phrase_id = ph.id
                AND phw2.word_id != phw.word_id
              GROUP BY phw2.phrase_id
            ) AS wds ON true
            WHERE phw.word_id = w.id
              AND ph.deleted_at IS NULL
              AND ph.language_id = $1
          ) AS ph ON true
          LEFT JOIN gloss AS g ON g.phrase_id = ph.id AND g.state = 'APPROVED'
          LEFT JOIN footnote AS fn ON fn.phrase_id = ph.id
          JOIN lemma_form AS lf ON lf.id = w.form_id
          WHERE w.verse_id = v.id
        ) AS words ON v.id IS NOT NULL
        ORDER BY b.id NULLS LAST, v.chapter NULLS LAST, v.number NULLS LAST
      `,
      [languageId],
    );

    if (result.rows.length === 0) {
      throw new Error(`Language ${languageId} not found`);
    }

    const booksById = new Map<number, InterlinearBookResult>();
    for (const row of result.rows) {
      if (
        row.bookId === null ||
        row.bookName === null ||
        row.id === null ||
        row.chapter === null ||
        row.number === null
      ) {
        continue;
      }

      let book = booksById.get(row.bookId);
      if (!book) {
        book = {
          bookId: row.bookId,
          bookName: row.bookName,
          chapters: [],
          language: {
            id: row.languageId,
            code: row.languageCode,
            name: row.languageName,
            font: row.languageFont,
            textDirection: row.languageTextDirection,
          },
          verses: [],
        };
        booksById.set(row.bookId, book);
      }

      book.verses.push({
        id: row.id,
        chapter: row.chapter,
        number: row.number,
        words: row.words ?? [],
      });
    }

    for (const book of booksById.values()) {
      book.chapters = Array.from(
        new Set(book.verses.map((verse) => verse.chapter)),
      ).sort((a, b) => a - b);
    }

    return Array.from(booksById.values());
  },
};

export default interlinearQueryService;
