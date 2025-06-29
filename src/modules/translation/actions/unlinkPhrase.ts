"use server";

import * as z from "zod";
import { getLocale } from "next-intl/server";
import { parseForm } from "@/form-parser";
import { notFound } from "next/navigation";
import { query } from "@/db";
import { verifySession } from "@/session";
import { revalidatePath } from "next/cache";
import phraseRepository from "../data-access/PhraseRepository";
import Policy from "@/modules/access/public/Policy";

const unlinkPhraseSchema = z.object({
  code: z.string(),
  phraseId: z.coerce.number(),
});

const policy = new Policy({
  languageRoles: [Policy.LanguageRole.Translator],
});

export async function unlinkPhrase(formData: FormData): Promise<void> {
  const request = unlinkPhraseSchema.safeParse(parseForm(formData));
  if (!request.success) {
    return;
  }

  const session = await verifySession();
  const authorized = await policy.authorize({
    actorId: session?.user.id,
    languageCode: request.data.code,
  });
  if (!authorized) {
    notFound();
  }

  await phraseRepository.unlink({
    code: request.data.code,
    phraseId: request.data.phraseId,
    userId: session!.user.id,
  });

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
