"use server";

import * as z from "zod";
import { getLocale } from "next-intl/server";
import { parseForm } from "@/form-parser";
import { notFound } from "next/navigation";
import { query } from "@/db";
import { verifySession } from "@/session";
import { revalidatePath } from "next/cache";
import { serverActionLogger } from "@/server-action";
import Policy from "@/modules/access/public/Policy";

const requestSchema = z.object({
  code: z.string(),
  phrases: z.array(z.object({ id: z.coerce.number(), gloss: z.string() })),
});

const policy = new Policy({
  languageRoles: [Policy.LanguageRole.Translator],
});

export async function approveAll(formData: FormData): Promise<void> {
  const logger = serverActionLogger("approveAll");

  const request = requestSchema.safeParse(parseForm(formData));
  if (!request.success) {
    return;
  }

  const session = await verifySession();
  const authorized = await policy.authorize({
    actorId: session?.user.id,
    languageCode: request.data.code,
  });
  if (!authorized) {
    logger.error("unauthorized");
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
      session!.user.id,
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

  if (pathQuery.rows[0]) {
    const locale = await getLocale();
    revalidatePath(
      `/${locale}/translate/${request.data.code}/${pathQuery.rows[0].verseId}`,
    );
  }
}
