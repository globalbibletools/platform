import { query } from "@/db";
import { createPolicyMiddleware, Policy } from "@/modules/access";
import { resolveLanguageByCode } from "@/modules/languages";
import { serverActionLogger } from "@/server-action";
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import * as z from "zod";
import { phraseRepository } from "../data-access/phraseRepository";

const requestSchema = z.object({
  languageCode: z.string(),
  phraseId: z.number(),
  note: z.string(),
});

const policy = new Policy({
  languageMember: true,
});

export const updateTranslatorNoteAction = createServerFn({ method: "POST" })
  .inputValidator(requestSchema)
  .middleware([
    createPolicyMiddleware({
      policy,
      languageCodeField: "languageCode",
    }),
  ])
  .handler(async ({ data, context }) => {
    const logger = serverActionLogger("updateTranslatorNote");

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
      `INSERT INTO translator_note (phrase_id, author_id, timestamp, content)
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
  });
