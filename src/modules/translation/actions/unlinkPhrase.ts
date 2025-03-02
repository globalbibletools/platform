"use server";

import * as z from "zod";
import { getLocale } from "next-intl/server";
import { parseForm } from "@/form-parser";
import { notFound } from "next/navigation";
import { query } from "@/db";
import { verifySession } from "@/session";
import { revalidatePath } from "next/cache";

const unlinkPhraseSchema = z.object({
  code: z.string(),
  phraseId: z.coerce.number(),
});

export async function unlinkPhrase(formData: FormData): Promise<void> {
  const session = await verifySession();
  if (!session?.user) {
    notFound();
  }

  const request = unlinkPhraseSchema.safeParse(parseForm(formData));
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

  await query(
    `
        UPDATE phrase AS ph
            SET
                deleted_at = NOW(),
                deleted_by = $3
        WHERE ph.language_id = (SELECT id FROM language WHERE code = $1)
            AND ph.id = $2
        `,
    [request.data.code, request.data.phraseId, session.user.id],
  );

  const pathQuery = await query<{ verseId: string }>(
    `
        SELECT w.verse_id FROM phrase AS ph
        JOIN phrase_word AS phw ON phw.phrase_id = ph.id
        JOIN word AS w ON w.id = phw.word_id
        WHERE ph.id = $1
        LIMIT 1
        `,
    [request.data.phraseId],
  );

  const locale = await getLocale();
  revalidatePath(
    `/${locale}/translate/${request.data.code}/${pathQuery.rows[0].verseId}`,
  );
}
