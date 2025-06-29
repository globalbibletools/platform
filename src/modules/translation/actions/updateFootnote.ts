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
  verseId: z.string(),
  languageCode: z.string(),
  phraseId: z.coerce.number().int(),
  note: z.string(),
});

const policy = new Policy({
  languageRoles: [Policy.LanguageRole.Translator],
});

export async function updateFootnoteAction(formData: FormData): Promise<any> {
  const logger = serverActionLogger("updateFootnote");

  const request = requestSchema.safeParse(parseForm(formData));
  if (!request.success) {
    logger.error("request parse error");
    return;
  }

  const session = await verifySession();
  const authorized = await policy.authorize({
    actorId: session?.user.id,
    languageCode: request.data.languageCode,
  });
  if (!authorized) {
    logger.error("unauthorized");
    notFound();
  }

  const phraseExists = await phraseRepository.existsForLanguage(
    request.data.languageCode,
    [request.data.phraseId],
  );
  if (!phraseExists) {
    logger.error("phrase not found");
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
    [request.data.phraseId, session!.user.id, new Date(), request.data.note],
  );
  if (result.rowCount === 0) {
    logger.error("phrase not found");
    notFound();
  }

  const locale = await getLocale();
  revalidatePath(
    `/${locale}/translate/${request.data.languageCode}/${request.data.verseId}`,
  );
}
