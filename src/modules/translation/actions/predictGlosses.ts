"use server";

import * as z from "zod";
import { getLocale } from "next-intl/server";
import { parseForm } from "@/form-parser";
import { notFound } from "next/navigation";
import { query } from "@/db";
import { verifySession } from "@/session";
import { revalidatePath } from "next/cache";
import { FormState } from "@/components/Form";
import { predictGlosses as runGlossPrediction } from "@/ai-gloss-prediction";

const requestSchema = z.object({
  code: z.string(),
  verseId: z.string(),
});

interface Word {
  id: string;
  text: string;
  english?: string;
}

export async function predictGlosses(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await verifySession();
  if (!session?.user) {
    notFound();
  }

  const request = requestSchema.safeParse(parseForm(formData));
  if (!request.success) {
    return { state: "error" };
  }

  const languageQuery = await query<{ roles: string[] }>(
    `SELECT 
            COALESCE(json_agg(r.role) FILTER (WHERE r.role IS NOT NULL), '[]') AS roles
        FROM language_member_role AS r
        WHERE r.language_id = (SELECT id FROM language WHERE code = $1) 
            AND r.user_id = $2`,
    [request.data.code, session.user.id],
  );
  const language = languageQuery.rows[0];
  if (
    !language ||
    (!session?.user.roles.includes("ADMIN") &&
      !language.roles.includes("TRANSLATOR"))
  ) {
    notFound();
  }

  const dataQuery = await query<{ languageName: string; words: Word[] }>(
    ` SELECT
            (
                SELECT name FROM language WHERE code = $1
            ) AS "languageName",
            (
                SELECT
                    JSON_AGG(JSON_BUILD_OBJECT(
                        'id', w.id, 
                        'text', w.text,
                        'english', ph.gloss
                    ))
                FROM word AS w

                LEFT JOIN LATERAL (
                    SELECT g.gloss FROM phrase_word AS phw
                    JOIN phrase AS ph ON ph.id = phw.phrase_id
                    JOIN gloss AS g ON g.phrase_id = ph.id
                    WHERE phw.word_id = w.id
                        AND ph.language_id = (SELECT id FROM language WHERE code = 'eng')
                        AND ph.deleted_at IS NULL
                ) AS ph ON true

                WHERE w.verse_id = $2
            ) AS words
        `,
    [request.data.code, request.data.verseId],
  );
  const { languageName, words } = dataQuery.rows[0];

  const result = await runGlossPrediction({ languageName, words });

  await query(
    `
        INSERT INTO machine_gloss (word_id, language_id, model_id, gloss, updated_at, updated_by)
        SELECT
            UNNEST($1::TEXT[]),
            (SELECT id FROM language WHERE code = $3),
            (SELECT id FROM machine_gloss_model WHERE code = 'gpt-4o-mini'),
            UNNEST($2::TEXT[]),
            NOW(),
            $4
        ON CONFLICT ON CONSTRAINT machine_gloss_word_id_language_id_model_id_key
        DO UPDATE SET
            gloss = EXCLUDED.gloss,
            updated_at = EXCLUDED.updated_at,
            updated_by = EXCLUDED.updated_by
        `,
    [
      result.map((r) => r.id),
      result.map((r) => r.translation),
      request.data.code,
      session.user.id,
    ],
  );

  const locale = await getLocale();
  revalidatePath(
    `/${locale}/translate/${request.data.code}/${request.data.verseId}`,
  );

  return { state: "success" };
}
