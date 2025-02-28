import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import ClientReadingView from "./ClientReadingView";
import { query } from "@/db";
import { notFound } from "next/navigation";

export interface ReadingPageProps {
  params: { chapterId: string; code: string };
}

export default async function serverReadingView({ params }: ReadingPageProps) {
  const messages = await getMessages();

  const bookId = parseInt(params.chapterId.slice(0, 2)) || 1;
  const chapterNumber = parseInt(params.chapterId.slice(2, 5)) || 1;
  const [chapterVerses, currentLanguage] = await Promise.all([
    fetchChapterVerses(bookId, chapterNumber, params.code),
    fetchCurrentLanguage(params.code),
  ]);

  if (!currentLanguage) {
    notFound();
  }

  return (
    <NextIntlClientProvider
      messages={{
        ReadingSidebar: messages.ReadingSidebar,
        VersesPreview: messages.VersesPreview,
      }}
    >
      <ClientReadingView
        chapterId={params.chapterId}
        language={currentLanguage}
        verses={chapterVerses}
      />
    </NextIntlClientProvider>
  );
}

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
    resource?: {
      name: string;
      entry: string;
    };
    footnote?: string;
  }[];
}

async function fetchChapterVerses(
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
                'resource', lemma_resource.resource
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
        ) AS words ON true
        WHERE v.book_id = $1 AND v.chapter = $2
        `,
    [bookId, chapterId, code],
  );
  return result.rows;
}

interface CurrentLanguage {
  code: string;
  name: string;
  font: string;
  textDirection: string;
}

// TODO: cache this, it will only change when the language settings are changed or the user roles change on the language.
async function fetchCurrentLanguage(
  code: string,
): Promise<CurrentLanguage | undefined> {
  const result = await query<CurrentLanguage>(
    `
        SELECT
            code, name, font, text_direction AS "textDirection"
        FROM language AS l
        WHERE code = $1
        `,
    [code],
  );
  return result.rows[0];
}
