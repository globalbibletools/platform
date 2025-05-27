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
import glossRepository from "../data-access/GlossRepository";
import { GlossApprovalMethodRaw, GlossStateRaw } from "../types";
import phraseRepository from "../data-access/PhraseRepository";
import trackingClient from "@/modules/reporting/public/trackingClient";
import languageRepository from "@/modules/languages/data-access/LanguageRepository";

const requestSchema = z.object({
  code: z.string(),
  phrases: z.array(
    z.object({
      id: z.coerce.number(),
      gloss: z.string(),
      method: z.nativeEnum(GlossApprovalMethodRaw).optional(),
    }),
  ),
});

const policy = new Policy({
  languageRoles: [Policy.LanguageRole.Translator],
});

export async function approveAll(formData: FormData): Promise<void> {
  const logger = serverActionLogger("approveAll");

  const request = requestSchema.safeParse(parseForm(formData));
  if (!request.success) {
    logger.error("request parse error");
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

  const phrasesExist = await phraseRepository.existsForLanguage(
    request.data.code,
    request.data.phrases.map((phrase) => phrase.id),
  );
  if (!phrasesExist) {
    logger.error("phrases not found");
    notFound();
  }

  const glosses = await glossRepository.findManyByPhraseId(
    request.data.phrases.map((phrase) => phrase.id),
  );

  await glossRepository.approveMany({
    phrases: request.data.phrases.map((phrase) => ({
      phraseId: phrase.id,
      gloss: phrase.gloss,
    })),
    updatedBy: session!.user.id,
  });

  const language = await languageRepository.findByCode(request.data.code);
  await trackingClient.trackManyEvents(
    request.data.phrases
      .filter((phrase) => {
        if (!phrase.method) return false;

        const gloss = glosses.find((gloss) => gloss.phraseId === phrase.id);
        return !gloss || gloss.state === GlossStateRaw.Unapproved;
      })
      .map((phrase) => ({
        type: "approve_gloss",
        userId: session!.user.id,
        languageId: language?.id,
        method: phrase.method,
      })),
  );

  // TODO: figure out how to replace this.
  // Option 1: query the DB to get the verse ID
  // Option 2: send the verse ID from the client
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
