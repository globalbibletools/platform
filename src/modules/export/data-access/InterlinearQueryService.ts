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
  number: number;
  words: InterlinearWord[];
}

export interface InterlinearChapterResult {
  language: {
    id: string;
    code: string;
    name: string;
    textDirection: TextDirectionRaw;
  };
  verses: InterlinearVerse[];
}

const interlinearQueryService = {
  async fetchChapters(
    bookId: number,
    chapters: number[],
    languageCode: string,
  ): Promise<InterlinearChapterResult> {
    const languageResult = await query<{
      id: string;
      code: string;
      name: string;
      textDirection: TextDirectionRaw;
    }>(
      `
        select id, code, name, text_direction as "textDirection"
        from language
        where code = $1
      `,
      [languageCode],
    );

    const language = languageResult.rows[0];
    if (!language) {
      throw new Error(`Language ${languageCode} not found`);
    }

    const versesResult = await query<InterlinearVerse>(
      `
        SELECT
          v.id,
          v.number,
          words.words
        FROM verse AS v
        JOIN LATERAL (
          SELECT json_agg(json_strip_nulls(json_build_object(
            'id', w.id,
            'text', w.text,
            'gloss', g.gloss,
            'linkedWords', ph.linked_words,
            'footnote', fn.content,
            'lemma', lf.lemma_id,
            'grammar', lf.grammar
          )) ORDER BY w.id) AS words
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
              AND ph.language_id = (SELECT id FROM language WHERE code = $3)
          ) AS ph ON true
          LEFT JOIN gloss AS g ON g.phrase_id = ph.id AND g.state = 'APPROVED'
          LEFT JOIN footnote AS fn ON fn.phrase_id = ph.id
          JOIN lemma_form AS lf ON lf.id = w.form_id
          WHERE w.verse_id = v.id
        ) AS words ON true
        WHERE v.book_id = $1 AND v.chapter = ANY($2)
        ORDER BY v.chapter, v.number
      `,
      [bookId, chapters, languageCode],
    );

    return {
      language,
      verses: versesResult.rows,
    };
  },

  async fetchChapter(
    bookId: number,
    chapter: number,
    languageCode: string,
  ): Promise<InterlinearChapterResult> {
    return this.fetchChapters(bookId, [chapter], languageCode);
  },
};

export default interlinearQueryService;
