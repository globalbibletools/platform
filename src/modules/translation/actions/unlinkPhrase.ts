"use server";

import * as z from "zod";
import { getLocale } from "next-intl/server";
import { parseForm } from "@/form-parser";
import { notFound } from "next/navigation";
import { verifySession } from "@/session";
import { revalidatePath } from "next/cache";
import phraseRepository from "../data-access/PhraseRepository";
import Policy from "@/modules/access/public/Policy";

const unlinkPhraseSchema = z.object({
  verseId: z.string(),
  code: z.string(),
  phraseId: z.coerce.number(),
});

const policy = new Policy({
  languageMember: true,
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

  const locale = await getLocale();
  revalidatePath(
    `/${locale}/translate/${request.data.code}/${request.data.verseId}`,
  );
}
