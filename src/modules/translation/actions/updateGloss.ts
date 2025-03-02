"use server";

import { query } from "@/db";
import { parseForm } from "@/form-parser";
import { serverActionLogger } from "@/server-action";
import { verifySession } from "@/session";
import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import * as z from "zod";

const requestSchema = z.object({
  phraseId: z.coerce.number().int(),
  state: z.enum(["APPROVED", "UNAPPROVED"]).optional(),
  gloss: z.string().optional(),
});

export async function updateGloss(formData: FormData): Promise<any> {
  const logger = serverActionLogger("updateGloss");

  const session = await verifySession();
  if (!session?.user) {
    logger.error("unauthorized");
    notFound();
  }

  const request = requestSchema.safeParse(parseForm(formData));
  if (!request.success) {
    logger.error("request parse error");
    return;
  }

  const languageQuery = await query<{ roles: string[] }>(
    `SELECT 
            COALESCE(json_agg(r.role) FILTER (WHERE r.role IS NOT NULL), '[]') AS roles
        FROM language_member_role AS r
        WHERE r.language_id = (SELECT language_id FROM phrase WHERE id = $1) 
            AND r.user_id = $2`,
    [request.data.phraseId, session.user.id],
  );
  const language = languageQuery.rows[0];
  if (
    !language ||
    (!session?.user.roles.includes("ADMIN") &&
      !language.roles.includes("TRANSLATOR"))
  ) {
    logger.error("unauthorized");
    notFound();
  }

  await query(
    `INSERT INTO gloss (phrase_id, state, gloss, updated_at, updated_by, source)
        VALUES ($1, $2, $3, NOW(), $4, 'USER')
        ON CONFLICT (phrase_id) DO UPDATE SET
            state = COALESCE(EXCLUDED.state, gloss.state),
            gloss = COALESCE(EXCLUDED.gloss, gloss.gloss),
            updated_at = EXCLUDED.updated_at,
            updated_by = EXCLUDED.updated_by, 
            source = EXCLUDED.source
            WHERE EXCLUDED.state <> gloss.state OR EXCLUDED.gloss <> gloss.gloss
        `,
    [
      request.data.phraseId,
      request.data.state,
      request.data.gloss,
      session.user.id,
    ],
  );

  const pathQuery = await query<{ code: string; verseId: string }>(
    `SELECT l.code, w.verse_id FROM phrase AS ph
        JOIN language AS l ON l.id = ph.language_id
        JOIN phrase_word AS phw ON phw.phrase_id = ph.id
        JOIN word AS w ON w.id = phw.word_id
        WHERE ph.id = $1
        LIMIT 1`,
    [request.data.phraseId],
  );

  if (pathQuery.rows.length > 0) {
    const locale = await getLocale();
    revalidatePath(
      `/${locale}/translate/${pathQuery.rows[0].code}/${pathQuery.rows[0].code}`,
    );
  }
}
