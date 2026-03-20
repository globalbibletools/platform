import { query } from "@/db";
import { parseForm } from "@/form-parser";
import { createPolicyMiddleware, Policy } from "@/modules/access";
import { resolveLanguageByCode } from "@/modules/languages";
import { serverActionLogger } from "@/server-action";
import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import * as z from "zod";
import { phraseRepository } from "../data-access/phraseRepository";

const requestSchema = z.object({
  verseId: z.string(),
  languageCode: z.string(),
  phraseId: z.coerce.number().int(),
  note: z.string(),
});

const policy = new Policy({
  languageMember: true,
});

type Request = z.infer<typeof requestSchema>;

export const updateFootnoteAction = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    if (!(data instanceof FormData)) {
      throw new Error("expected FormData");
    }

    return requestSchema.parse(parseForm(data));
  })
  .middleware([
    createPolicyMiddleware({
      policy,
      languageCodeField: "languageCode",
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
      const logger = serverActionLogger("updateFootnote");

      const language = await resolveLanguageByCode(data.languageCode);
      if (!language) {
        logger.error("language not found");
        throw notFound();
      }

      const phraseExists = await phraseRepository.existsWithinLanguage({
        languageId: language.id,
        phraseId: data.phraseId,
      });
      if (!phraseExists) {
        logger.error("phrase not found");
        throw notFound();
      }

      const result = await query<{ state: string; gloss: string }>(
        `INSERT INTO footnote (phrase_id, author_id, timestamp, content)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (phrase_id) DO UPDATE SET
            author_id = EXCLUDED.author_id,
            timestamp = EXCLUDED.timestamp,
            content = EXCLUDED.content
        `,
        [data.phraseId, context.session.user.id, new Date(), data.note],
      );
      if (result.rowCount === 0) {
        logger.error("phrase not found");
        throw notFound();
      }

      const locale = await getLocale();
      revalidatePath(
        `/${locale}/translate/${data.languageCode}/${data.verseId}`,
      );
    },
  );
