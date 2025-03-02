"use server";

import * as z from "zod";
import { parseForm } from "@/form-parser";
import { notFound } from "next/navigation";
import { query } from "@/db";
import { verifySession } from "@/session";
import { translateClient } from "@/google-translate";
import languageMap from "@/data/locale-mapping.json";

const requestSchema = z.object({
  code: z.string(),
  verseId: z.string(),
});

type SanityCheckResult =
  | { state: "idle" }
  | { state: "error"; error?: string }
  | { state: "success"; data: { translation: string; phraseId: number }[] };

export async function sanityCheck(
  _prev: SanityCheckResult,
  formData: FormData,
): Promise<SanityCheckResult> {
  const session = await verifySession();
  if (!session?.user.roles.includes("ADMIN")) {
    notFound();
  }

  const request = requestSchema.safeParse(parseForm(formData));
  if (!request.success) {
    return { state: "error" };
  }

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
    [request.data.code, request.data.verseId],
  );
  const glosses = glossesQuery.rows;

  const translations = await backtranslate(
    request.data.code,
    glosses.filter((g): g is { gloss: string; phraseId: number } => !!g.gloss),
  );

  return { state: "success", data: translations };
}

async function backtranslate(
  code: string,
  glosses: { gloss: string; phraseId: number }[],
): Promise<{ translation: string; phraseId: number }[]> {
  const languageCode = languageMap[code as keyof typeof languageMap];
  if (
    !languageCode ||
    languageCode === "en" ||
    !translateClient ||
    glosses.length === 0
  )
    return [];

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
