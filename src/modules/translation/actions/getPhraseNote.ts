import { query } from "@/db";
import { createPolicyMiddleware, Policy } from "@/modules/access";
import { resolveLanguageByCode } from "@/modules/languages";
import { serverActionLogger } from "@/server-action";
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import * as z from "zod";
import { phraseRepository } from "../data-access/phraseRepository";

const requestSchema = z.object({
  phraseId: z.coerce.number().int(),
  languageCode: z.string(),
  type: z.enum(["footnote", "translatorNote"]),
});

const policy = new Policy({ authenticated: true });

interface PhraseNote {
  authorName: string;
  timestamp: Date;
  content: string;
}

export const getPhraseNote = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => requestSchema.parse(input))
  .middleware([createPolicyMiddleware({ policy })])
  .handler(async ({ data }) => {
    const logger = serverActionLogger("getPhraseNote");

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

    const notes =
      data.type === "footnote" ?
        await query<PhraseNote>(
          `
            SELECT
              COALESCE(u.name, '') AS "authorName",
              n.timestamp AS timestamp,
              n.content
            FROM footnote AS n
            JOIN users AS u ON u.id = n.author_id
            WHERE n.phrase_id = $1
            `,
          [data.phraseId],
        )
      : await query<PhraseNote>(
          `
            SELECT
              COALESCE(u.name, '') AS "authorName",
              n.timestamp AS timestamp,
              n.content
            FROM translator_note AS n
            JOIN users AS u ON u.id = n.author_id
            WHERE n.phrase_id = $1
            `,
          [data.phraseId],
        );

    return notes.rows[0] ?? null;
  });
