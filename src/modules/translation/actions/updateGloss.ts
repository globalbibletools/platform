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
import glossRepository, {
  GlossSourceRaw,
  GlossStateRaw,
} from "../data-access/GlossRepository";

const requestSchema = z.object({
  phraseId: z.coerce.number().int(),
  state: z.nativeEnum(GlossStateRaw).optional(),
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

  await glossRepository.update({
    phraseId: phrase.id,
    gloss: request.data.gloss,
    state: request.data.state,
    updatedBy: session!.user.id,
    source: GlossSourceRaw.User,
  });

  // TODO: figure out how to replace this.
  // Option 1: query the DB to get the verse ID
  // Option 2: send the verse ID from the client
  const pathQuery = await query<{ code: string; verseId: string }>(
    `SELECT w.verse_id FROM phrase AS ph
        JOIN phrase_word AS phw ON phw.phrase_id = ph.id
        JOIN word AS w ON w.id = phw.word_id
        WHERE ph.id = $1
        LIMIT 1`,
    [request.data.phraseId],
  );

  if (pathQuery.rows.length > 0) {
    const locale = await getLocale();
    revalidatePath(
      `/${locale}/translate/${phrase.languageCode}/${pathQuery.rows[0].verseId}`,
    );
  }
}
