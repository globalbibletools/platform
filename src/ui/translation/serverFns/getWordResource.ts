import { query } from "@/db";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";

const requestSchema = z.object({
  wordId: z.string(),
});

interface WordResource {
  name: string;
  entry: string;
}

export const getWordResource = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => requestSchema.parse(input))
  .handler(async ({ data }) => {
    const result = await query<WordResource>(
      `
        SELECT
          lr.resource_code AS name,
          lr.content AS entry
        FROM word AS w
        JOIN lemma_form AS lf ON lf.id = w.form_id
        JOIN lemma_resource AS lr ON lr.lemma_id = lf.lemma_id
        WHERE w.id = $1
        ORDER BY lr.resource_code
        LIMIT 1
      `,
      [data.wordId],
    );

    return result.rows[0] ?? null;
  });
