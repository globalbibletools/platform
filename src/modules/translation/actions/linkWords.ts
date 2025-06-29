"use server";

import * as z from "zod";
import { getLocale } from "next-intl/server";
import { parseForm } from "@/form-parser";
import { notFound } from "next/navigation";
import { verifySession } from "@/session";
import { revalidatePath } from "next/cache";
import Policy from "@/modules/access/public/Policy";
import phraseRepository from "../data-access/PhraseRepository";

const requestSchema = z.object({
  verseId: z.string(),
  code: z.string(),
  wordIds: z.array(z.string()),
});

const policy = new Policy({
  languageRoles: [Policy.LanguageRole.Translator],
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

  await phraseRepository.linkWords({
    code: request.data.code,
    wordIds: request.data.wordIds,
    userId: session!.user.id,
  });

  const locale = await getLocale();
  revalidatePath(
    `/${locale}/translate/${request.data.code}/${request.data.verseId}`,
  );
}
