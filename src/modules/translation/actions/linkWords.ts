"use server";

import * as z from "zod";
import { getLocale } from "next-intl/server";
import { parseForm } from "@/form-parser";
import { notFound } from "next/navigation";
import { query, transaction } from "@/db";
import { verifySession } from "@/session";
import { revalidatePath } from "next/cache";

const requestSchema = z.object({
  code: z.string(),
  wordIds: z.array(z.string()),
});

export async function linkWords(formData: FormData): Promise<void> {
  const session = await verifySession();
  if (!session?.user) {
    notFound();
  }

  const request = requestSchema.safeParse(parseForm(formData));
  if (!request.success) {
    return;
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

  await transaction(async (query) => {
    const phrasesQuery = await query(
      `
            SELECT FROM phrase AS ph
            JOIN phrase_word AS phw ON phw.phrase_id = ph.id
            JOIN LATERAL (
                SELECT COUNT(*) AS count FROM phrase_word AS phw
                WHERE phw.phrase_id = ph.id
            ) AS words ON true
            WHERE ph.language_id = (SELECT id FROM language WHERE code = $1)
                AND ph.deleted_at IS NULL
                AND phw.word_id = ANY($2::text[])
                AND words.count > 1
            `,
      [request.data.code, request.data.wordIds],
    );
    if (phrasesQuery.rows.length > 0) {
      throw new Error("Words already linked");
    }

    await query(
      `
            UPDATE phrase AS ph
                SET deleted_at = NOW(),
                    deleted_by = $3
            FROM phrase_word AS phw
            WHERE phw.phrase_id = ph.id
                AND phw.word_id = ANY($2::text[])
                AND ph.deleted_at IS NULL
                AND ph.language_id = (SELECT id FROM language WHERE code = $1)
            `,
      [request.data.code, request.data.wordIds, session.user.id],
    );

    await query(
      `
                WITH phrase AS (
                    INSERT INTO phrase (language_id, created_by, created_at)
                    VALUES ((SELECT id FROM language WHERE code = $1), $3, NOW())
                    RETURNING id
                )
                INSERT INTO phrase_word (phrase_id, word_id)
                SELECT phrase.id, UNNEST($2::text[]) FROM phrase
            `,
      [request.data.code, request.data.wordIds, session.user.id],
    );
  });

  const pathQuery = await query<{ verseId: string }>(
    `
        SELECT w.verse_id FROM word AS w
        WHERE w.id = $1
        `,
    [request.data.wordIds[0]],
  );

  const locale = await getLocale();
  revalidatePath(
    `/${locale}/translate/${request.data.code}/${pathQuery.rows[0].verseId}`,
  );
}
