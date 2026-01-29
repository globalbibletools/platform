import { getDb } from "@/db";
import { sql } from "kysely";

export interface VerseWordReadModel {
  id: string;
  text: string;
  referenceGloss?: string;
  lemma: string;
  formId: string;
  grammar: string;
  resource?: { name: string; entry: string };
}

export interface VerseWordsReadModel {
  words: VerseWordReadModel[];
}

export async function getVerseWordsReadModel(
  verseId: string,
  code: string,
): Promise<VerseWordsReadModel | undefined> {
  const result = await getDb()
    .selectFrom(
      sql<VerseWordsReadModel>`
        (
          SELECT
            (
              SELECT
                JSON_AGG(JSON_BUILD_OBJECT(
                  'id', w.id, 
                  'text', w.text,
                  'referenceGloss', ph.gloss,
                  'lemma', lf.lemma_id,
                  'formId', lf.id,
                  'grammar', lf.grammar,
                  'resource', lemma_resource.resource
                ) ORDER BY w.id)
              FROM word AS w

              LEFT JOIN LATERAL (
                SELECT g.gloss FROM phrase_word AS phw
                JOIN phrase AS ph ON ph.id = phw.phrase_id
                JOIN gloss AS g ON g.phrase_id = ph.id
                WHERE phw.word_id = w.id
                  AND ph.language_id = (
                    select
                      case when reference_language_id is null then
                        (SELECT id FROM language WHERE code = 'eng')
                      else reference_language_id
                      end
                    from language where code = ${code}
                  )
                  AND ph.deleted_at IS NULL
              ) AS ph ON true

              JOIN lemma_form AS lf ON lf.id = w.form_id
              LEFT JOIN LATERAL (
                SELECT
                  CASE
                    WHEN lr.resource_code IS NOT NULL
                    THEN JSON_BUILD_OBJECT(
                      'name', lr.resource_code,
                      'entry', lr.content
                    )
                    ELSE NULL
                  END AS resource
                FROM lemma_resource AS lr
                WHERE lr.lemma_id = lf.lemma_id
                LIMIT 1
              ) AS lemma_resource ON true
        
              WHERE w.verse_id = v.id
            ) AS words
          FROM verse AS v
          WHERE v.id = ${verseId}
        )
      `.as("result"),
    )
    .selectAll()
    .executeTakeFirst();

  return result;
}
