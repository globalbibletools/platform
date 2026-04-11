import * as z from "zod";
import { createServerFn } from "@tanstack/react-start";
import { query } from "@/db";
import { translateClient } from "@/google-translate";
import { createPolicyMiddleware, Policy } from "@/modules/access";

const requestSchema = z.object({
  code: z.string(),
  verseId: z.string(),
});

const policy = new Policy({ systemRoles: [Policy.SystemRole.Admin] });

export const sanityCheck = createServerFn({ method: "POST" })
  .inputValidator(requestSchema)
  .middleware([createPolicyMiddleware({ policy })])
  .handler(async ({ data }) => {
    const request = data;

    const glossesQuery = await query<{
      phraseId: number;
      gloss: string | null;
    }>(
      `SELECT
            ph.id as "phraseId",
            g.gloss
        FROM gloss g
        JOIN phrase ph ON ph.id = g.phrase_id
        WHERE ph.deleted_at IS NULL
            AND ph.language_id = (SELECT id FROM language WHERE code = $1)
            AND EXISTS (
                SELECT FROM phrase_word phw
                JOIN word w ON w.id = phw.word_id
                WHERE phw.phrase_id = ph.id
                    AND w.verse_id = $2
            )
        `,
      [request.code, request.verseId],
    );
    const glosses = glossesQuery.rows;

    const translations = await backtranslate(
      request.code,
      glosses.filter(
        (g): g is { gloss: string; phraseId: number } => !!g.gloss,
      ),
    );

    return translations;
  });

async function backtranslate(
  code: string,
  glosses: { gloss: string; phraseId: number }[],
): Promise<{ translation: string; phraseId: number }[]> {
  if (!translateClient || glosses.length === 0) return [];

  const languageCode = translateClient?.convertISOCode(code);
  if (!languageCode || languageCode === "en") return [];

  const translations = await translateClient.translate(
    glosses.map((g) => g.gloss),
    "en",
    languageCode,
  );
  return translations.map((t, i) => ({
    phraseId: glosses[i].phraseId,
    translation: t,
  }));
}
