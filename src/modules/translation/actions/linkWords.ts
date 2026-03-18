import * as z from "zod";
import { getLocale } from "next-intl/server";
import { parseForm } from "@/form-parser";
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { revalidatePath } from "next/cache";
import {
  createPolicyMiddleware,
  Policy,
  PolicyOptions,
} from "@/modules/access";
import { phraseRepository } from "../data-access/phraseRepository";
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

type Request = z.infer<typeof requestSchema>;

export const linkWords = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    if (!(data instanceof FormData)) {
      throw new Error("expected FormData");
    }

    return requestSchema.parse(parseForm(data));
  })
  .middleware([
    createPolicyMiddleware<Request, PolicyOptions>({
      policy,
      getLanguageCode: (data) => data.code,
    }),
  ])
  .handler(
    async ({
      data,
      context,
    }: {
      data: Request;
      context: { session: { user: { id: string } } };
    }) => {
      const language = await resolveLanguageByCode(data.code);
      if (!language) {
        throw notFound();
      }

      await kyselyTransaction(async (trx) => {
        const oldPhrases = await phraseRepository.findByWordIdsWithinLanguage({
          languageId: language.id,
          wordIds: data.wordIds,
          trx,
        });

        for (const phrase of oldPhrases) {
          phrase.delete(context.session.user.id);
          await phraseRepository.commit(phrase, trx);
        }

        const linkedPhrase = Phrase.create({
          languageId: language.id,
          userId: context.session.user.id,
          wordIds: data.wordIds,
        });
        await phraseRepository.commit(linkedPhrase, trx);
      });

      const locale = await getLocale();
      revalidatePath(`/${locale}/translate/${data.code}/${data.verseId}`);
    },
  );
