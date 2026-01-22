import { query } from "@/db";

interface Verse {
  id: string;
  number: number;
  words: {
    id: string;
    text: string;
    gloss?: string;
    linkedWords?: string[];
    lemma: string;
    grammar: string;
    footnote?: string;
    nativeLexicon?: string;
  }[];
}

export interface LemmaResource {
  lemmaId: string;
  name: string;
  entry: string;
}

const readingQueryService = {
  async fetchChapterVerses(
    bookId: number,
    chapterId: number,
    code: string,
  ): Promise<Verse[]> {
    const result = await query<Verse>(
      `
        SELECT
          v.id,
          v.number,
          words.words
        FROM verse AS v
        JOIN LATERAL (
            SELECT
              json_agg(json_strip_nulls(json_build_object(
                'id', w.id,
                'text', w.text,
                'gloss', g.gloss,
                'linkedWords', ph.linked_words,
                'footnote', fn.content,
                'lemma', lf.lemma_id,
                'grammar', lf.grammar,
                'nativeLexicon', wl.content
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
            LEFT JOIN word_lexicon AS wl on wl.word_id = w.id
            LEFT JOIN gloss AS g ON g.phrase_id = ph.id AND g.state = 'APPROVED'
            LEFT JOIN footnote AS fn ON fn.phrase_id = ph.id
            JOIN lemma_form AS lf ON lf.id = w.form_id
            WHERE w.verse_id = v.id
        ) AS words ON true
        WHERE v.book_id = $1 AND v.chapter = $2
      `,
      [bookId, chapterId, code],
    );
    return result.rows;
  },

  async fetchResourceForLemmaId(
    lemmaId: string,
  ): Promise<LemmaResource | undefined> {
    const result = await query<LemmaResource>(
      `
        select
          lr.lemma_id as "lemmaId",
          lr.resource_code as name,
          lr.content as entry
        from lemma_resource AS lr
        where lr.lemma_id = $1
        limit 1
      `,
      [lemmaId],
    );

    return result.rows[0];
  },
};
export default readingQueryService;
