"use server";

import * as z from "zod";
import { getLocale } from "next-intl/server";
import { parseForm } from "@/form-parser";
import { notFound } from "next/navigation";
import { query } from "@/db";
import { verifySession } from "@/session";
import { revalidatePath } from "next/cache";

const requestSchema = z.object({
  code: z.string(),
  phrases: z.array(z.object({ id: z.coerce.number(), gloss: z.string() })),
});

export async function approveAll(formData: FormData): Promise<void> {
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

  await query<{ phraseId: number; gloss: string; state: string }>(
    `
        INSERT INTO gloss (phrase_id, gloss, state, updated_at, updated_by, source)
        SELECT ph.id, data.gloss, 'APPROVED', NOW(), $3, 'USER'
        FROM UNNEST($1::integer[], $2::text[]) data (phrase_id, gloss)
        JOIN phrase AS ph ON ph.id = data.phrase_id
        WHERE ph.deleted_at IS NULL
        ON CONFLICT (phrase_id)
            DO UPDATE SET
                gloss = COALESCE(EXCLUDED.gloss, gloss.gloss),
                state = EXCLUDED.state,
                updated_at = EXCLUDED.updated_at,
                updated_by = EXCLUDED.updated_by, 
                source = EXCLUDED.source
                WHERE EXCLUDED.state <> gloss.state OR EXCLUDED.gloss <> gloss.gloss
        `,
    [
      request.data.phrases.map((ph) => ph.id),
      request.data.phrases.map((ph) => ph.gloss),
      session.user.id,
    ],
  );

  const pathQuery = await query<{ verseId: string }>(
    `
        SELECT w.verse_id FROM phrase AS ph
        JOIN phrase_word AS phw ON phw.phrase_id = ph.id
        JOIN word AS w ON w.id = phw.word_id
        WHERE ph.id = $1
        LIMIT 1
        `,
    [request.data.phrases[0].id],
  );

  const locale = await getLocale();
  revalidatePath(
    `/${locale}/translate/${request.data.code}/${pathQuery.rows[0].verseId}`,
  );
}
