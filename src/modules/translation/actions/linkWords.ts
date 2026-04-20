import * as z from "zod";
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { createPolicyMiddleware, Policy } from "@/modules/access";
import { phraseRepository } from "../data-access/phraseRepository";
import { resolveLanguageByCode } from "@/modules/languages";
import { kyselyTransaction } from "@/db";
import Phrase from "../model/Phrase";

const requestSchema = z.object({
  code: z.string(),
  wordIds: z.array(z.string()),
});

const policy = new Policy({
  languageMember: true,
});

export const linkWords = createServerFn({ method: "POST" })
  .inputValidator(requestSchema)
  .middleware([
    createPolicyMiddleware({
      policy,
      languageCodeField: "code",
    }),
  ])
  .handler(async ({ data, context }) => {
    const language = await resolveLanguageByCode(data.code);
    if (!language) {
      throw notFound();
    }

    const phraseId = await kyselyTransaction(async (trx) => {
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

      return linkedPhrase.id;
    });

    return { phraseId };
  });
