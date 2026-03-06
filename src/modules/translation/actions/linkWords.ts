"use server";

import * as z from "zod";
import { getLocale } from "next-intl/server";
import { parseForm } from "@/form-parser";
import { notFound } from "next/navigation";
import { verifySession } from "@/session";
import { revalidatePath } from "next/cache";
import { Policy } from "@/modules/access";
import phraseRepository from "../data-access/PhraseRepository";
import { resolveLanguageByCode } from "@/modules/languages";
import { kyselyTransaction } from "@/db";
import Phrase from "../model/Phrase";

const requestSchema = z.object({
  verseId: z.string(),
  code: z.string(),
  wordIds: z.array(z.string()),
});

const policy = new Policy({
  languageMember: true,
});

export async function linkWords(formData: FormData): Promise<void> {
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
    notFound();
  }

  const language = await resolveLanguageByCode(request.data.code);
  if (!language) {
    notFound();
  }

  await kyselyTransaction(async (trx) => {
    const oldPhrases = await phraseRepository.findByWordIdsWithinLanguage({
      languageId: language.id,
      wordIds: request.data.wordIds,
      trx,
    });

    for (const phrase of oldPhrases) {
      phrase.delete(session!.user.id);
      await phraseRepository.commit(phrase, trx);
    }

    const linkedPhrase = Phrase.create({
      languageId: language.id,
      userId: session!.user.id,
      wordIds: request.data.wordIds,
    });
    await phraseRepository.commit(linkedPhrase, trx);
  });

  const locale = await getLocale();
  revalidatePath(
    `/${locale}/translate/${request.data.code}/${request.data.verseId}`,
  );
}
