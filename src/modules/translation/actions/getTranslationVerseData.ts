import { query } from "@/db";
import { translateClient } from "@/google-translate";
import { logger } from "@/logging";
import { createPolicyMiddleware, Policy } from "@/modules/access";
import { MachineGlossStrategy } from "@/modules/languages/model";
import { getCurrentLanguageReadModel } from "@/modules/languages/read-models/getCurrentLanguageReadModel";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";
import { getVerseWordsReadModel } from "../read-models/getVerseWordsReadModel";

const requestSchema = z.object({
  code: z.string(),
  verseId: z.string(),
});

const policy = new Policy({ authenticated: true });
const CHAR_REGEX = /\w/;

export const getTranslationVerseData = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => requestSchema.parse(input))
  .middleware([createPolicyMiddleware({ policy })])
  .handler(async ({ data, context }) => {
    const [language, verse, phrases, suggestions, machineSuggestions] =
      await Promise.all([
        getCurrentLanguageReadModel(data.code, context.session.user.id),
        getVerseWordsReadModel(data.verseId, data.code),
        fetchPhrases(data.verseId, data.code, context.session.user.id),
        fetchSuggestions(data.verseId, data.code),
        fetchMachineSuggestions(data.verseId, data.code),
      ]);

    if (!verse || !language) {
      return { language: null, words: [], phrases: [] };
    }

    const verseWords = verse.words;

    const wordsToTranslate = Array.from(
      new Set(
        verseWords
          .filter(
            (w) =>
              phrases.find((ph) => ph.wordIds.includes(w.id))?.gloss?.state !==
                "APPROVED" &&
              machineSuggestions.every((s) => s.wordId !== w.id) &&
              !suggestions.find((s) => s.formId === w.formId)?.suggestions
                .length &&
              !!w.referenceGloss?.match(CHAR_REGEX),
          )
          .map((w) => (w.referenceGloss ?? "").toLowerCase()),
      ),
    );

    const newMachineSuggestions =
      (
        language.isMember &&
        language.referenceLanguage &&
        language.machineGlossStrategy === MachineGlossStrategy.Google
      ) ?
        await machineTranslate(
          wordsToTranslate,
          data.code,
          language.referenceLanguage,
        )
      : {};

    const words = verseWords.map((w) => ({
      ...w,
      suggestions:
        suggestions.find((s) => s.formId === w.formId)?.suggestions ?? [],
      machineSuggestion:
        machineSuggestions.find((s) => s.wordId === w.id)?.gloss ??
        newMachineSuggestions[w.referenceGloss?.toLowerCase() ?? ""],
    }));

    return {
      language,
      words,
      phrases,
    };
  });

interface Phrase {
  id: number;
  wordIds: string[];
  gloss?: { text: string; state: string };
  hasTranslatorNote: boolean;
  hasFootnote: boolean;
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
            (fn.content is not null and fn.content <> '<p></p>') as "hasFootnote",
            (tn.content is not null and tn.content <> '<p></p>') as "hasTranslatorNote"
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
		LEFT JOIN footnote AS fn ON fn.phrase_id = ph.id
		LEFT JOIN translator_note AS tn ON tn.phrase_id = ph.id
		ORDER BY ph.id
        `,
    [verseId, languageCode],
  );

  return result.rows;
}

interface MachineSuggestion {
  wordId: string;
  gloss: string;
}

async function fetchMachineSuggestions(
  verseId: string,
  languageCode: string,
): Promise<MachineSuggestion[]> {
  const result = await query<MachineSuggestion>(
    `
        SELECT
          w.id AS "wordId",
          mg.gloss
        FROM word AS w
        JOIN machine_gloss AS mg ON mg.word_id = w.id
        WHERE w.verse_id = $1
			AND mg.language_id = (SELECT id FROM language WHERE code = $2)
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

async function machineTranslate(
  words: string[],
  code: string,
  sourceCode: string,
): Promise<Record<string, string>> {
  if (!translateClient || words.length === 0) return {};

  const toCode = code === "test" ? "en" : translateClient.convertISOCode(code);
  const fromCode = translateClient.convertISOCode(sourceCode);
  logger.info({ toCode, fromCode });
  if (!fromCode || !toCode) return {};

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
                (SELECT id FROM machine_gloss_model WHERE code = 'google')
            FROM phrase_word AS phw
            JOIN gloss AS g ON g.phrase_id = phw.phrase_id
            JOIN phrase AS ph ON phw.phrase_id = ph.id
            JOIN UNNEST($2::text[], $3::text[]) data (ref_gloss, machine_gloss)
                ON LOWER(g.gloss) = data.ref_gloss
            WHERE ph.deleted_at IS NULL
                AND ph.language_id = (SELECT id FROM language WHERE code = 'eng')
            ON CONFLICT (language_id, word_id)
            DO UPDATE SET
              gloss = EXCLUDED.gloss,
              model_id = EXCLUDED.model_id
            `,
      [code, referenceGlosses, machineGlosses],
    );
  } catch (error) {
    console.log(`Failed to save machine translations: ${error}`);
  }
}
