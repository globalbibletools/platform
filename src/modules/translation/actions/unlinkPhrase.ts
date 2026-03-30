import * as z from "zod";
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { phraseRepository } from "../data-access/phraseRepository";
import { createPolicyMiddleware, Policy } from "@/modules/access";
import { kyselyTransaction } from "@/db";
import { resolveLanguageByCode } from "@/modules/languages";

const unlinkPhraseSchema = z.object({
  code: z.string(),
  phraseId: z.coerce.number(),
});

const policy = new Policy({
  languageMember: true,
});

type Request = z.infer<typeof unlinkPhraseSchema>;

export const unlinkPhrase = createServerFn({ method: "POST" })
  .inputValidator(unlinkPhraseSchema)
  .middleware([
    createPolicyMiddleware({
      policy,
      languageCodeField: "code",
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
        const phrase = await phraseRepository.findWithinLanguage({
          phraseId: data.phraseId,
          languageId: language.id,
          trx,
        });
        if (!phrase) {
          throw notFound();
        }

        phrase.delete(context.session.user.id);

        await phraseRepository.commit(phrase, trx);
      });
    },
  );
