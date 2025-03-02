"use server";

import * as z from "zod";
import { getTranslations } from "next-intl/server";
import { parseForm } from "@/form-parser";
import { query } from "@/db";
import { serverActionLogger } from "@/server-action";

const requestSchema = z.object({
  code: z.string(),
  verseId: z.string(),
});

export async function redirectToUnapproved(
  formData: FormData,
): Promise<void | string> {
  const logger = serverActionLogger("redirectToUnapproved");

  const request = requestSchema.safeParse(parseForm(formData));
  if (!request.success) {
    logger.error("request parse error");
    return;
  }

  let result = await query<{ nextUnapprovedVerseId: string }>(
    `
        SELECT w.verse_id as "nextUnapprovedVerseId"
        FROM word AS w
        LEFT JOIN LATERAL (
          SELECT g.state AS state FROM phrase_word AS phw
          JOIN phrase AS ph ON ph.id = phw.phrase_id
          LEFT JOIN gloss AS g ON g.phrase_id = ph.id
          WHERE phw.word_id = w.id
			      AND ph.language_id = (SELECT id FROM language WHERE code = $1)
			      AND ph.deleted_at IS NULL
        ) AS g ON true
        WHERE w.verse_id > $2
          AND (g.state = 'UNAPPROVED' OR g.state IS NULL)
        ORDER BY w.id
        LIMIT 1
        `,
    [request.data.code, request.data.verseId],
  );

  if (result.rows.length === 0) {
    result = await query<{ nextUnapprovedVerseId: string }>(
      `
            SELECT w.verse_id as "nextUnapprovedVerseId"
            FROM word AS w
            LEFT JOIN LATERAL (
              SELECT g.state AS state FROM phrase_word AS phw
              JOIN phrase AS ph ON ph.id = phw.phrase_id
              LEFT JOIN gloss AS g ON g.phrase_id = ph.id
              WHERE phw.word_id = w.id
                      AND ph.language_id = (SELECT id FROM language WHERE code = $1)
                      AND ph.deleted_at IS NULL
            ) AS g ON true
            WHERE (g.state = 'UNAPPROVED' OR g.state IS NULL)
            ORDER BY w.id
            LIMIT 1
            `,
      [request.data.code],
    );

    if (result.rows.length === 0) {
      logger.error("all verses are approved");
      const t = await getTranslations("TranslationToolbar");
      return t("errors.all_approved");
    }
  }
}
