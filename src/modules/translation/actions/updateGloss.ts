"use server";

import { query } from "@/db";
import { parseForm } from "@/form-parser";
import Policy from "@/modules/access/public/Policy";
import { serverActionLogger } from "@/server-action";
import { verifySession } from "@/session";
import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import * as z from "zod";
import phraseRepository from "../data-access/PhraseRepository";

const requestSchema = z.object({
  phraseId: z.coerce.number().int(),
  state: z.enum(["APPROVED", "UNAPPROVED"]).optional(),
  gloss: z.string().optional(),
});

const policy = new Policy({
  languageRoles: [Policy.LanguageRole.Translator],
});

export async function updateGloss(formData: FormData): Promise<any> {
  const logger = serverActionLogger("updateGloss");

  const request = requestSchema.safeParse(parseForm(formData));
  if (!request.success) {
    logger.error("request parse error");
    return;
  }

  const phrase = await phraseRepository.findById(request.data.phraseId);
  if (!phrase) {
    logger.error("phrase not found");
    notFound();
  }

  const session = await verifySession();
  const authorized = await policy.authorize({
    actorId: session?.user.id,
    languageCode: phrase.languageCode,
  });
  if (!authorized) {
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
      session?.user.id,
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
      `/${locale}/translate/${pathQuery.rows[0].code}/${pathQuery.rows[0].verseId}`,
    );
  }
}
