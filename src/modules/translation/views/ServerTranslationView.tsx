import { query } from "@/db";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { verifySession } from "@/session";
import ClientTranslateView from "./ClientTranslationView";
import { translateClient } from "@/google-translate";
import languageMap from "@/data/locale-mapping.json";

interface Props {
  params: { code: string; verseId: string };
}

const CHAR_REGEX = /\w/;

export default async function InterlinearView({ params }: Props) {
  const messages = await getMessages();

  const session = await verifySession();

  const [language, verse, phrases, suggestions, machineSuggestions] =
    await Promise.all([
      fetchCurrentLanguage(params.code, session?.user.id),
      fetchVerse(params.verseId, params.code),
      fetchPhrases(params.verseId, params.code, session?.user.id),
      fetchSuggestions(params.verseId, params.code),
      fetchMachineSuggestions(params.verseId, params.code),
    ]);

  if (!verse || !language) {
    notFound();
  }

  // We only want to machine translate words that
  // 1. Don't have an approved gloss
  // 2. Already have a machine gloss
  // 3. Have no suggestions from other verses
  // 4. Have a reference gloss in English to translate from.
  const wordsToTranslate = Array.from(
    new Set(
      verse.words
        .filter(
          (w) =>
            phrases.find((ph) => ph.wordIds.includes(w.id))?.gloss?.state !==
              "APPROVED" &&
            machineSuggestions.every(
              (s) =>
                s.wordId !== w.id ||
                s.suggestions.every((sug) => sug.model !== "google-translate"),
            ) &&
            !suggestions.find((s) => s.formId === w.formId)?.suggestions
              .length &&
            !!w.referenceGloss?.match(CHAR_REGEX),
        )
        .map((w) => (w.referenceGloss ?? "").toLowerCase()),
    ),
  );

  const newMachineSuggestions =
    language.roles.includes("TRANSLATOR") ?
      await machineTranslate(
        wordsToTranslate,
        params.code,
        language.referenceLanguage,
      )
    : {};

  const words = verse.words.map((w) => ({
    ...w,
    suggestions:
      suggestions.find((s) => s.formId === w.formId)?.suggestions ?? [],
    machineSuggestions: [
      ...(machineSuggestions.find((s) => s.wordId === w.id)?.suggestions ?? []),
      ...(newMachineSuggestions[w.referenceGloss?.toLowerCase() ?? ""] ?
        [
          {
            model: "google-translate",
            gloss: newMachineSuggestions[w.referenceGloss?.toLowerCase() ?? ""],
          },
        ]
      : []),
    ],
  }));

  return (
    <NextIntlClientProvider
      messages={{
        TranslateWord: messages.TranslateWord,
        TranslationSidebar: messages.TranslationSidebar,
        RichTextInput: messages.RichTextInput,
        VersesPreview: messages.VersesPreview,
      }}
    >
      <ClientTranslateView
        verseId={params.verseId}
        words={words}
        phrases={phrases}
        language={language}
      />
    </NextIntlClientProvider>
  );
}

interface Phrase {
  id: number;
  wordIds: string[];
  gloss?: { text: string; state: string };
  translatorNote?: { authorName: string; timestamp: string; content: string };
  footnote?: { authorName: string; timestamp: string; content: string };
}

async function fetchPhrases(
  verseId: string,
  languageCode: string,
  userId?: string,
): Promise<Phrase[]> {
  await query(
    `
            WITH phw AS (
              INSERT INTO phrase_word (phrase_id, word_id)
              SELECT
                nextval(pg_get_serial_sequence('phrase', 'id')),
                w.id
              FROM word AS w
              LEFT JOIN (
                SELECT * FROM phrase_word AS phw
                JOIN phrase AS ph ON ph.id = phw.phrase_id
                WHERE ph.language_id = (SELECT id FROM language WHERE code = $1)
                  AND ph.deleted_at IS NULL
              ) ph ON ph.word_id = w.id
              WHERE w.verse_id = $2 AND ph.id IS NULL
              RETURNING phrase_id, word_id
            )
            INSERT INTO phrase (id, language_id, created_at, created_by)
            SELECT phw.phrase_id, (SELECT id FROM language WHERE code = $1), now(), $3::uuid FROM phw
        `,
    [languageCode, verseId, userId],
  );
  const result = await query<Phrase>(
    `
        SELECT
			ph.id,
			ph.word_ids AS "wordIds",
			CASE
				WHEN g.phrase_id IS NOT NULL
				THEN JSON_BUILD_OBJECT(
				  'text', g.gloss,
				  'state', g.state
				)
				ELSE NULL
			END AS gloss,
			fn.note AS "footnote",
			tn.note AS "translatorNote"
		FROM (
			SELECT ph.id, ARRAY_AGG(phw.word_id ORDER BY phw.word_id) AS word_ids FROM phrase AS ph
			JOIN phrase_word AS phw ON phw.phrase_id = ph.id
			WHERE ph.language_id = (SELECT id FROM language WHERE code = $2)
				AND ph.deleted_at IS NULL
				AND EXISTS (
					SELECT FROM word AS w
					JOIN phrase_word AS phw2 ON phw2.word_id = w.id
					WHERE w.id = phw.word_id
						AND w.verse_id = $1
						AND phw2.phrase_id = ph.id
				)
			GROUP BY ph.id
		) AS ph
		
		LEFT JOIN gloss AS g ON g.phrase_id = ph.id
		LEFT JOIN (
			SELECT
				n.phrase_id,
				JSON_BUILD_OBJECT(
				  'timestamp', n.timestamp,
				  'content', n.content,
				  'authorName', COALESCE(u.name, '')
				) AS note
			FROM footnote AS n
			JOIN users AS u ON u.id = n.author_id
		) AS fn ON fn.phrase_id = ph.id
		LEFT JOIN LATERAL (
			SELECT
				n.phrase_id,
				JSON_BUILD_OBJECT(
				  'timestamp', n.timestamp,
				  'content', n.content,
				  'authorName', COALESCE(u.name, '')
				) AS note
			FROM translator_note AS n
			JOIN users AS u ON u.id = n.author_id
		) AS tn ON tn.phrase_id = ph.id
		ORDER BY ph.id
        `,
    [verseId, languageCode],
  );
  return result.rows;
}

interface ModelSuggestion {
  model: string;
  gloss: string;
}

interface MachineSuggestion {
  wordId: string;
  suggestions: ModelSuggestion[];
}

async function fetchMachineSuggestions(
  verseId: string,
  languageCode: string,
): Promise<MachineSuggestion[]> {
  const result = await query<MachineSuggestion>(
    `
        SELECT w.id AS "wordId", JSON_AGG(JSON_BUILD_OBJECT('model', model.code, 'gloss', mg.gloss)) AS suggestions
        FROM word AS w
        JOIN machine_gloss AS mg ON mg.word_id = w.id
        JOIN machine_gloss_model AS model ON mg.model_id = model.id
        WHERE w.verse_id = $1
			AND mg.language_id = (SELECT id FROM language WHERE code = $2)
        GROUP BY w.id
        `,
    [verseId, languageCode],
  );
  return result.rows;
}

interface FormSuggestion {
  formId: string;
  suggestions: string[];
}

async function fetchSuggestions(
  verseId: string,
  languageCode: string,
): Promise<FormSuggestion[]> {
  const result = await query<FormSuggestion>(
    `
        SELECT 
            sc.form_id AS "formId",
            ARRAY_AGG(sc.gloss ORDER BY sc.count DESC) AS suggestions
        FROM lemma_form_suggestion AS sc
        JOIN (
            SELECT DISTINCT form_id AS id FROM word
            WHERE verse_id = $1
        ) AS form ON form.id = sc.form_id
        WHERE sc.language_id = (SELECT id FROM language WHERE code = $2)
            AND sc.count > 0
        GROUP BY sc.form_id
        `,
    [verseId, languageCode],
  );
  return result.rows;
}

interface VerseWord {
  id: string;
  text: string;
  referenceGloss?: string;
  lemma: string;
  formId: string;
  grammar: string;
  resource?: { name: string; entry: string };
}

interface Verse {
  words: VerseWord[];
}

// TODO: cache this, it should almost never change
async function fetchVerse(
  verseId: string,
  code: string,
): Promise<Verse | undefined> {
  const result = await query<Verse>(
    `
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
                            from language where code = $2
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
        WHERE v.id = $1
        `,
    [verseId, code],
  );

  return result.rows[0];
}

async function machineTranslate(
  words: string[],
  code: string,
  sourceCode: string,
): Promise<Record<string, string>> {
  const toCode = languageMap[code as keyof typeof languageMap];
  const fromCode = languageMap[sourceCode as keyof typeof languageMap];
  if (!fromCode || !translateClient || words.length === 0) return {};

  const start = performance.now();
  const machineGlosses = await translateClient.translate(
    words,
    toCode,
    fromCode,
  );
  const duration = performance.now() - start;
  const wordMap = Object.fromEntries(
    words.map((word, i) => [word, machineGlosses[i]]),
  );

  console.log(
    `Finished translating ${words.length} words (${duration.toFixed(0)}) ms`,
  );
  Object.entries(wordMap).forEach(([ref, gloss]) =>
    console.log(`Translated to ${code}: ${ref} --> ${gloss}`),
  );

  // We do not await this so that the request can return quickly. It is not needed to finish the request.
  saveMachineTranslations(code, words, machineGlosses);

  return wordMap;
}

async function saveMachineTranslations(
  code: string,
  referenceGlosses: string[],
  machineGlosses: string[],
) {
  try {
    await query(
      `
            INSERT INTO machine_gloss (word_id, gloss, language_id, model_id)
            SELECT
                phw.word_id, data.machine_gloss,
                (SELECT id FROM language WHERE code = $1),
                (SELECT id FROM machine_gloss_model WHERE code = 'google-translate')
            FROM phrase_word AS phw
            JOIN gloss AS g ON g.phrase_id = phw.phrase_id
            JOIN phrase AS ph ON phw.phrase_id = ph.id
            JOIN UNNEST($2::text[], $3::text[]) data (ref_gloss, machine_gloss)
                ON LOWER(g.gloss) = data.ref_gloss
            WHERE ph.deleted_at IS NULL
                AND ph.language_id = (SELECT id FROM language WHERE code = 'eng')
            ON CONFLICT ON CONSTRAINT machine_gloss_word_id_language_id_model_id_key
            DO UPDATE SET gloss = EXCLUDED.gloss
            `,
      [code, referenceGlosses, machineGlosses],
    );
  } catch (error) {
    console.log(`Failed to save machine translations: ${error}`);
  }
}

interface CurrentLanguage {
  code: string;
  name: string;
  font: string;
  textDirection: string;
  translationIds: string[];
  roles: string[];
  referenceLanguage: string;
}

async function fetchCurrentLanguage(
  code: string,
  userId?: string,
): Promise<CurrentLanguage | undefined> {
  const result = await query<CurrentLanguage>(
    `
        SELECT
            code, name, font, text_direction AS "textDirection", translation_ids AS "translationIds",
            ( select code from language where id = l.reference_language_id) as "referenceLanguage",
            (
                SELECT COALESCE(JSON_AGG(r."role"), '[]') FROM language_member_role AS r
                WHERE r.language_id = l.id
                    AND r.user_id = $2
            ) AS roles
        FROM language AS l
        WHERE code = $1
        `,
    [code, userId],
  );
  return result.rows[0];
}
