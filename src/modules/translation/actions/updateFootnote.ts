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
  note: z.string(),
});

export async function updateFootnote(formData: FormData): Promise<any> {
  const logger = serverActionLogger("updateFootnote");

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
  if (!language) {
    logger.error("language not found");
    notFound();
  }
  if (
    !session?.user.roles.includes("ADMIN") &&
    !language.roles.includes("TRANSLATOR")
  ) {
    logger.error("unauthorized");
    notFound();
  }

  const result = await query<{ state: string; gloss: string }>(
    `INSERT INTO footnote (phrase_id, author_id, timestamp, content)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (phrase_id) DO UPDATE SET
            author_id = EXCLUDED.author_id,
            timestamp = EXCLUDED.timestamp,
            content = EXCLUDED.content
        `,
    [request.data.phraseId, session.user.id, new Date(), request.data.note],
  );
  if (result.rowCount === 0) {
    logger.error("phrase not found");
    notFound();
  }

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
