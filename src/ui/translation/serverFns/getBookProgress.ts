import { query } from "@/db";
import { createPolicyMiddleware, Policy } from "@/modules/access";
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import * as z from "zod";

const requestSchema = z.object({
  bookId: z.coerce.number().int().positive(),
  code: z.string(),
});

const policy = new Policy({ authenticated: true });

interface BookProgress {
  wordCount: number;
  approvedCount: number;
}

export const getBookProgress = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => requestSchema.parse(input))
  .middleware([createPolicyMiddleware({ policy, languageCodeField: "code" })])
  .handler(async ({ data }) => {
    const bookProgress = await fetchBookProgress(data.bookId, data.code);
    if (!bookProgress) {
      throw notFound();
    }

    return bookProgress;
  });

async function fetchBookProgress(
  bookId: number,
  languageCode: string,
): Promise<BookProgress | undefined> {
  const result = await query<BookProgress>(
    `
        SELECT
            (
                SELECT
                    COUNT(*)
                FROM verse AS v
                JOIN word AS w ON w.verse_id = v.id
                WHERE v.book_id = b.id
            ) AS "wordCount",
            (
                SELECT COUNT(*) FROM phrase AS ph
                LEFT JOIN gloss AS g ON g.phrase_id = ph.id
                JOIN phrase_word AS phw ON phw.phrase_id = ph.id
                JOIN word AS w ON w.id = phw.word_id
                JOIN verse AS v ON v.id = w.verse_id
                WHERE ph.language_id = (SELECT id FROM language WHERE code = $2)
                    AND ph.deleted_at IS NULL
                    AND v.book_id = b.id
                    AND g.state = 'APPROVED'
            ) AS "approvedCount"
        FROM book AS b
        WHERE b.id = $1
        `,
    [bookId, languageCode],
  );

  return result.rows[0];
}
