import { query } from "@/db";

export const translationQueryService = {
  async fetchUpdatedLanguages(): Promise<string[]> {
    const result = await query<{ code: string }>(
      `SELECT DISTINCT lang.code FROM gloss
        JOIN phrase ph ON ph.id = gloss.phrase_id
        JOIN language lang ON lang.id = ph.language_id
        WHERE gloss.updated_at >= NOW() - INTERVAL '8 days'
            OR ph.deleted_at >= NOW() - INTERVAL '8 days'
        ORDER BY lang.code
        `,
      [],
    );
    return result.rows.map((row) => row.code);
  },
};
